#!/usr/bin/env bash
# =============================================================================
#  KLEVA My-IP PRO — one-click installer
#  Tested on Ubuntu 22.04 / 24.04 and Debian 12
#  Usage:  sudo bash install.sh
# =============================================================================
set -euo pipefail

# ── colour helpers ────────────────────────────────────────────────────────────
RED='\033[0;31m'; YELLOW='\033[1;33m'; GREEN='\033[0;32m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
info()  { echo -e "${CYAN}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
die()   { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }
ask()   { echo -e "${BOLD}$*${NC}"; }

# ── root check ────────────────────────────────────────────────────────────────
[[ $EUID -eq 0 ]] || die "Run with sudo:  sudo bash install.sh"

# ── source dir (where install.sh lives) ──────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}    KLEVA My-IP PRO — installer / updater             ${NC}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo

detect_existing_project() {
    local dir="$1"
    [[ -f "$dir/index.php" && -f "$dir/api.php" && -f "$dir/inc/config.php" ]]
}

# ── interactive questions ─────────────────────────────────────────────────────
ask "Install directory [/var/www/my-ip]: "
read -r INSTALL_DIR
INSTALL_DIR="${INSTALL_DIR:-/var/www/my-ip}"

MODE="install"
if detect_existing_project "$INSTALL_DIR"; then
    warn "Detected existing My-IP project in ${INSTALL_DIR}"
    ask "Choose action: [U]pdate existing install or [I]nstall over it [U]: "
    read -r ACTION_ANSWER
    if [[ "${ACTION_ANSWER,,}" == "i" ]]; then
        MODE="install"
        warn "Install mode selected — project files will be overwritten."
    else
        MODE="update"
        ok "Update mode selected — preserving data/, .env and inc/config.php"
    fi
fi

ask "URL sub-path prefix (e.g. /my-ip or / for root) [/my-ip]: "
read -r URL_PREFIX
URL_PREFIX="${URL_PREFIX:-/my-ip}"
# Normalise: ensure leading slash, strip trailing slash unless "/"
[[ "$URL_PREFIX" != /* ]] && URL_PREFIX="/$URL_PREFIX"
[[ "$URL_PREFIX" != "/" ]] && URL_PREFIX="${URL_PREFIX%/}"

ask "PHP-FPM socket path [/run/php/php-fpm.sock]: "
read -r FPM_SOCK
FPM_SOCK="${FPM_SOCK:-/run/php/php-fpm.sock}"

ask "Nginx snippets directory [/etc/nginx/snippets]: "
read -r NGINX_SNIPPETS
NGINX_SNIPPETS="${NGINX_SNIPPETS:-/etc/nginx/snippets}"

ask "Does nginx use PROXY protocol on its listen directive? [y/N]: "
read -r PROXY_PROTO_ANSWER
USE_PROXY_PROTO=false
[[ "${PROXY_PROTO_ANSWER,,}" == "y" ]] && USE_PROXY_PROTO=true

echo

# ── detect PHP version early so we can suggest the right socket ──────────────
detect_php_version() {
    php -r 'echo PHP_MAJOR_VERSION.".".PHP_MINOR_VERSION;' 2>/dev/null || true
}

# ── 1. System packages ────────────────────────────────────────────────────────
info "Updating apt and installing PHP + dependencies…"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq \
    php-fpm php-cli php-sqlite3 sqlite3 \
    mmdb-bin unzip curl jq 2>/dev/null || \
apt-get install -y -qq \
    php-fpm php-cli php-sqlite3 sqlite3 \
    mmdb-bin unzip curl
ok "System packages installed"

PHP_VER="$(detect_php_version)"
# If socket still at default and versioned socket exists, use it
if [[ "$FPM_SOCK" == "/run/php/php-fpm.sock" && -S "/run/php/php${PHP_VER}-fpm.sock" ]]; then
    FPM_SOCK="/run/php/php${PHP_VER}-fpm.sock"
    info "Auto-detected PHP-FPM socket: $FPM_SOCK"
fi

# ── 2. Copy / update application files ────────────────────────────────────────
if [[ "$MODE" == "update" ]]; then
    info "Updating application in ${INSTALL_DIR}…"
else
    info "Copying application to ${INSTALL_DIR}…"
fi
mkdir -p "$INSTALL_DIR"
if [[ "$MODE" == "update" ]]; then
    tar -C "$SCRIPT_DIR" \
        --exclude='.git' --exclude='install.sh' --exclude='data' \
        --exclude='.env' --exclude='inc/config.php' \
        -cf - . | tar -C "$INSTALL_DIR" -xf -
else
    tar -C "$SCRIPT_DIR" \
        --exclude='.git' --exclude='install.sh' --exclude='data' \
        -cf - . | tar -C "$INSTALL_DIR" -xf -
fi

# Ensure data directory exists with correct permissions
mkdir -p "$INSTALL_DIR/data"
if [[ "$MODE" == "update" ]]; then
    ok "Files updated"
else
    ok "Files copied"
fi

# ── 3. Permissions ────────────────────────────────────────────────────────────
info "Setting permissions…"
WEB_USER="$(ps aux | awk '/php-fpm.*worker/ {print $1; exit}' || echo www-data)"
WEB_USER="${WEB_USER:-www-data}"
chown -R "$WEB_USER":"$WEB_USER" "$INSTALL_DIR"
find "$INSTALL_DIR" -type d -exec chmod 755 {} \;
find "$INSTALL_DIR" -type f -exec chmod 644 {} \;
chmod 775 "$INSTALL_DIR/data"
ok "Permissions set (owner: $WEB_USER)"

# ── 4. Admin token ────────────────────────────────────────────────────────────
ENV_FILE="$INSTALL_DIR/.env"
if [[ -f "$ENV_FILE" ]]; then
    EXISTING_TOKEN="$(grep '^MY_IP_ADMIN_TOKEN=' "$ENV_FILE" 2>/dev/null | cut -d= -f2- || true)"
fi

if [[ -z "${EXISTING_TOKEN:-}" ]]; then
    ADMIN_TOKEN="$(openssl rand -hex 32)"
    {
        echo "MY_IP_ADMIN_TOKEN=$ADMIN_TOKEN"
    } > "$ENV_FILE"
    chown "$WEB_USER":"$WEB_USER" "$ENV_FILE"
    chmod 600 "$ENV_FILE"
    ok "Admin token generated and saved to $ENV_FILE"
else
    ADMIN_TOKEN="$EXISTING_TOKEN"
    ok "Existing admin token kept"
fi

# ── 5. Nginx snippets ─────────────────────────────────────────────────────────
info "Creating nginx snippet files in ${NGINX_SNIPPETS}…"
mkdir -p "$NGINX_SNIPPETS"

SNIPPET_LOC="$NGINX_SNIPPETS/my-ip-location.conf"
SNIPPET_PHP="$NGINX_SNIPPETS/my-ip-php.conf"

# Build real-IP directives: when PROXY protocol is active $remote_addr is the
# upstream proxy (127.0.0.1), so we tell nginx to extract the real client IP
# from the PROXY protocol header instead.
if $USE_PROXY_PROTO; then
    REAL_IP_BLOCK="    # PROXY protocol: expose real client IP via nginx realip module
    real_ip_header    proxy_protocol;
    set_real_ip_from  0.0.0.0/0;"
else
    REAL_IP_BLOCK=""
fi

if [[ "$URL_PREFIX" == "/" ]]; then
    # Root install — serve directly from INSTALL_DIR
    cat > "$SNIPPET_LOC" <<NGINX_LOC
# KLEVA My-IP PRO — root location
location / {
    root ${INSTALL_DIR};
    index index.php;
    try_files \$uri \$uri/ /index.php?\$query_string;
}
NGINX_LOC

    cat > "$SNIPPET_PHP" <<NGINX_PHP
# KLEVA My-IP PRO — PHP handler (root)
location ~ \.php$ {
    root ${INSTALL_DIR};
${REAL_IP_BLOCK}
    include snippets/fastcgi-php.conf;
    fastcgi_param SCRIPT_FILENAME \${INSTALL_DIR}\$fastcgi_script_name;
    fastcgi_param HTTP_X_REAL_IP \$remote_addr;
    fastcgi_param HTTP_X_FORWARDED_FOR \$proxy_add_x_forwarded_for;
    fastcgi_pass unix:${FPM_SOCK};
}
NGINX_PHP
else
    STRIPPED="${URL_PREFIX#/}"   # e.g. "my-ip"

    cat > "$SNIPPET_LOC" <<NGINX_LOC
# KLEVA My-IP PRO — sub-path location
# Needed when nginx listens on a non-standard port behind a reverse proxy:
# prevents nginx from appending the real listen port to redirect URLs.
port_in_redirect off;

location = /${STRIPPED} {
    return 301 /${STRIPPED}/;
}

location /${STRIPPED}/ {
    alias ${INSTALL_DIR}/;
    index index.php;
    try_files \$uri \$uri/ /${STRIPPED}/index.php?\$query_string;
}
NGINX_LOC

    cat > "$SNIPPET_PHP" <<NGINX_PHP
# KLEVA My-IP PRO — PHP handler (sub-path)
# NOTE: we do NOT use "include snippets/fastcgi-php.conf" here because that
# snippet contains "try_files \$fastcgi_script_name =404" which resolves against
# \$document_root (the server root, e.g. /var/www/kleva.ru) rather than the
# aliased app directory, producing a false 404 for every PHP request.
location ~ ^/${STRIPPED}/(.+\.php)$ {
${REAL_IP_BLOCK}
    include fastcgi_params;
    fastcgi_param SCRIPT_FILENAME ${INSTALL_DIR}/\$1;
    fastcgi_param SCRIPT_NAME /${STRIPPED}/\$1;
    fastcgi_param HTTP_X_REAL_IP \$remote_addr;
    fastcgi_param HTTP_X_FORWARDED_FOR \$proxy_add_x_forwarded_for;
    fastcgi_pass unix:${FPM_SOCK};
}
NGINX_PHP
fi

ok "Nginx snippets written:"
ok "  $SNIPPET_LOC"
ok "  $SNIPPET_PHP"

# ── 6. Optional: Tor exit nodes ───────────────────────────────────────────────
echo
ask "Download fresh Tor exit-node list? [y/N]: "
read -r TOR_ANSWER
if [[ "${TOR_ANSWER,,}" == "y" ]]; then
    TOR_FILE="$INSTALL_DIR/data/tor_exit_nodes.txt"
    info "Downloading Tor exit nodes…"
    if curl -fsSL --max-time 30 \
        "https://check.torproject.org/torbulkexitlist" \
        -o "$TOR_FILE" 2>/dev/null; then
        chown "$WEB_USER":"$WEB_USER" "$TOR_FILE"
        LINE_COUNT="$(wc -l < "$TOR_FILE")"
        ok "Tor exit-node list saved ($LINE_COUNT entries): $TOR_FILE"
    else
        warn "Failed to download Tor exit-node list (no network or rate-limited). Skipping."
    fi
else
    info "Skipped Tor exit-node list."
fi

# ── 7. Geo databases: db-ip.com (free, no registration) ──────────────────────
echo
ask "Download free db-ip.com geo databases? (No registration, no key required) [Y/n]: "
read -r DBIP_ANSWER
GEO_INSTALLED=false
if [[ "${DBIP_ANSWER,,}" != "n" ]]; then
    DATA_DIR="$INSTALL_DIR/data"
    DBIP_MONTH="$(date +%Y-%m)"

    # Try current month, fall back to previous month if not yet published
    dbip_try_month() {
        local month="$1" edition="$2" dest_name="$3"
        local dest="$DATA_DIR/${dest_name}.mmdb"
        local url="https://download.db-ip.com/free/${edition}-${month}.mmdb.gz"
        local tmp_gz
        tmp_gz="$(mktemp /tmp/dbip_XXXXXX.mmdb.gz)"
        if curl -fsSL --max-time 120 "$url" -o "$tmp_gz" 2>/dev/null \
                && [[ -s "$tmp_gz" ]]; then
            if gunzip -c "$tmp_gz" > "$dest" 2>/dev/null && [[ -s "$dest" ]]; then
                chown "$WEB_USER":"$WEB_USER" "$dest"
                chmod 644 "$dest"
                ok "${dest_name}.mmdb (${month}) installed → $dest"
                rm -f "$tmp_gz"
                return 0
            else
                rm -f "$dest"
            fi
        fi
        rm -f "$tmp_gz"
        return 1
    }

    download_dbip() {
        local edition="$1"
        local dest_name="$2"
        info "Downloading ${edition} from db-ip.com…"
        if dbip_try_month "$DBIP_MONTH" "$edition" "$dest_name"; then
            return
        fi
        # Previous month (compatible with both GNU and BSD date)
        local prev_month
        prev_month="$(date -d 'last month' +%Y-%m 2>/dev/null \
                   || date -v-1m +%Y-%m 2>/dev/null || true)"
        if [[ -n "$prev_month" ]] && dbip_try_month "$prev_month" "$edition" "$dest_name"; then
            return
        fi
        warn "Could not download ${edition} from db-ip.com. Skipping."
    }

    download_dbip "dbip-city-lite" "GeoLite2-City"
    download_dbip "dbip-asn-lite"  "GeoLite2-ASN"
    GEO_INSTALLED=true
else
    info "Skipped db-ip.com databases."
fi

# ── 7b. Optional: MaxMind GeoLite2 (alternative / supplement, requires free account) ──
echo
ask "Also download MaxMind GeoLite2 databases? Requires a free MaxMind account."
ask "Enter your MaxMind license key (or press Enter to skip): "
read -r MM_KEY
if [[ -n "$MM_KEY" ]]; then
    DATA_DIR="$INSTALL_DIR/data"
    BASE_URL="https://download.maxmind.com/app/geoip_download"

    download_mmdb() {
        local edition="$1"
        local dest="$DATA_DIR/${edition}.mmdb"
        local tmp_zip
        tmp_zip="$(mktemp /tmp/mmdb_XXXXXX.tar.gz)"
        info "Downloading ${edition}…"
        if curl -fsSL --max-time 120 \
            "${BASE_URL}?edition_id=${edition}&license_key=${MM_KEY}&suffix=tar.gz" \
            -o "$tmp_zip" 2>/dev/null; then
            local inner
            inner="$(tar -tzf "$tmp_zip" 2>/dev/null | grep '\.mmdb$' | head -1)"
            if [[ -n "$inner" ]]; then
                tar -xzf "$tmp_zip" -C /tmp --strip-components=1 "$inner" 2>/dev/null || \
                    tar -xzf "$tmp_zip" -C /tmp 2>/dev/null
                local extracted_file
                extracted_file="$(find /tmp -maxdepth 2 -name "${edition}.mmdb" | head -1)"
                if [[ -f "$extracted_file" ]]; then
                    mv "$extracted_file" "$dest"
                    chown "$WEB_USER":"$WEB_USER" "$dest"
                    chmod 644 "$dest"
                    ok "${edition}.mmdb installed → $dest"
                    GEO_INSTALLED=true
                else
                    warn "Could not extract ${edition}.mmdb from archive."
                fi
            else
                warn "Downloaded archive seems empty or invalid for ${edition}."
            fi
        else
            warn "Download failed for ${edition} (check license key / network)."
        fi
        rm -f "$tmp_zip"
    }

    download_mmdb "GeoLite2-City"
    download_mmdb "GeoLite2-ASN"
else
    info "Skipped MaxMind databases."
fi

if [[ "$GEO_INSTALLED" == false ]]; then
    info "No local geo databases installed. The app will fall back to the ip-api.com HTTP API"
    info "(no setup needed — works out of the box, up to 45 requests/min)."
    info "To enable offline lookups later, place GeoLite2-City.mmdb and GeoLite2-ASN.mmdb in ${INSTALL_DIR}/data/"
fi

# ── 8. Reload nginx ───────────────────────────────────────────────────────────
echo
ask "Reload nginx now? [Y/n]: "
read -r NGINX_ANSWER
if [[ "${NGINX_ANSWER,,}" != "n" ]]; then
    if command -v nginx &>/dev/null; then
        if nginx -t 2>/dev/null; then
            systemctl reload nginx
            ok "nginx reloaded"
        else
            warn "nginx config test failed — not reloading. Run 'nginx -t' to see errors."
            warn "Don't forget to add the following lines to your server{} block:"
            echo
            echo "    include ${SNIPPET_LOC};"
            echo "    include ${SNIPPET_PHP};"
        fi
    else
        warn "nginx not found — skipping reload."
    fi
else
    info "Skipped nginx reload."
fi

# ── 9. Summary ────────────────────────────────────────────────────────────────
echo
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
if [[ "$MODE" == "update" ]]; then
    echo -e "${GREEN}${BOLD}  Update complete!${NC}"
else
    echo -e "${GREEN}${BOLD}  Installation complete!${NC}"
fi
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo
echo -e "  App directory : ${CYAN}${INSTALL_DIR}${NC}"
echo -e "  URL prefix    : ${CYAN}${URL_PREFIX}${NC}"
echo -e "  Admin token   : ${YELLOW}${ADMIN_TOKEN}${NC}"
echo
echo -e "  Admin panel   : ${CYAN}https://yourdomain${URL_PREFIX}/admin.php?token=${ADMIN_TOKEN}${NC}"
echo
echo -e "${BOLD}Next steps:${NC}"
echo -e "  1. Add to your nginx server{} block:"
echo -e "       ${CYAN}include ${SNIPPET_LOC};${NC}"
echo -e "       ${CYAN}include ${SNIPPET_PHP};${NC}"
echo -e "  2. Run: ${CYAN}sudo nginx -t && sudo systemctl reload nginx${NC}"
echo
echo -e "  The admin token is also stored in ${YELLOW}${ENV_FILE}${NC}"
echo -e "  Make sure nginx/PHP-FPM is configured to pass MY_IP_ADMIN_TOKEN"
echo -e "  (or set it directly in ${CYAN}${INSTALL_DIR}/inc/config.php${NC})."
echo
