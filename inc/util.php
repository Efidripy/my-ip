<?php
declare(strict_types=1);

function h(string $v): string {
    return htmlspecialchars($v, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function json_response(array $data, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('Pragma: no-cache');
    header('Expires: 0');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    exit;
}

function first_forwarded_ip(?string $xff): string {
    if (!$xff) return '';
    $parts = explode(',', $xff);
    return trim((string)($parts[0] ?? ''));
}

function safe_server(string $key, string $default = ''): string {
    return isset($_SERVER[$key]) ? (string)$_SERVER[$key] : $default;
}

function get_client_ip(): string {
    $candidates = [
        safe_server('HTTP_X_REAL_IP'),
        first_forwarded_ip(safe_server('HTTP_X_FORWARDED_FOR')),
        safe_server('REMOTE_ADDR'),
    ];
    foreach ($candidates as $ip) {
        if ($ip !== '' && filter_var($ip, FILTER_VALIDATE_IP)) {
            return $ip;
        }
    }
    return 'unknown';
}

function get_reverse_dns(string $ip): string {
    if (!filter_var($ip, FILTER_VALIDATE_IP)) return '';
    $rdns = @gethostbyaddr($ip);
    if (!$rdns || $rdns === $ip) return '';
    return (string)$rdns;
}

function is_https_request(): bool {
    return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || safe_server('REQUEST_SCHEME') === 'https' || safe_server('HTTP_X_FORWARDED_PROTO') === 'https';
}

function detect_risk_level(int $score): string {
    if ($score >= 80) return 'green';
    if ($score >= 55) return 'yellow';
    return 'red';
}

function is_bogon_ip(string $ip): bool {
    if (!filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
        return false;
    }
    $parts = explode('.', $ip);
    $a = (int)$parts[0];
    $b = (int)$parts[1];
    if ($a === 0) return true;                                 // 0.0.0.0/8
    if ($a === 10) return true;                                // 10.0.0.0/8 RFC 1918
    if ($a === 100 && $b >= 64 && $b <= 127) return true;     // 100.64.0.0/10 RFC 6598 CGN
    if ($a === 127) return true;                               // 127.0.0.0/8 loopback
    if ($a === 169 && $b === 254) return true;                 // 169.254.0.0/16 link-local
    if ($a === 172 && $b >= 16 && $b <= 31) return true;      // 172.16.0.0/12 RFC 1918
    if ($a === 192 && $b === 0) return true;                   // 192.0.0.0/24, 192.0.2.0/24
    if ($a === 192 && $b === 168) return true;                 // 192.168.0.0/16 RFC 1918
    if ($a === 198 && $b === 51) return true;                  // 198.51.100.0/24 TEST-NET-2
    if ($a === 203 && $b === 0) return true;                   // 203.0.113.0/24 TEST-NET-3
    if ($a >= 240) return true;                                // 240.0.0.0/4 reserved
    return false;
}

function check_bogon_in_xff(string $xff): bool {
    if ($xff === '') {
        return false;
    }
    foreach (explode(',', $xff) as $part) {
        if (is_bogon_ip(trim($part))) {
            return true;
        }
    }
    return false;
}

function is_admin_authorized(): bool {
    $cfg = app_config();
    $token = $cfg['admin_token'] ?? '';
    if ($token === '') {
        return false;
    }
    $provided = $_GET['token'] ?? $_SERVER['HTTP_X_ADMIN_TOKEN'] ?? '';
    return hash_equals((string)$token, (string)$provided);
}

function require_admin(): void {
    if (!is_admin_authorized()) {
        http_response_code(403);
        echo '<!doctype html><meta charset="utf-8"><title>403</title><body style="font-family:sans-serif;background:#0b1220;color:#fff;padding:32px">403 — access denied.</body>';
        exit;
    }
}

/**
 * Return the XFF header with private/bogon IPv4 addresses replaced by «a.x.x.b»
 * so internal proxy hops are not forwarded verbatim to the end-user.
 */
function mask_private_in_xff(string $xff): string {
    if ($xff === '') return '';
    $parts = explode(',', $xff);
    $masked = [];
    foreach ($parts as $part) {
        $ip = trim($part);
        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4) && is_bogon_ip($ip)) {
            $octets = explode('.', $ip);
            $masked[] = $octets[0] . '.x.x.' . $octets[3];
        } else {
            $masked[] = $ip;
        }
    }
    return implode(', ', $masked);
}

/**
 * Classify a TLS cipher string as «modern», «transitional», or «legacy».
 * Returns empty string when no cipher is provided.
 */
function classify_tls_cipher(string $cipher): string {
    if ($cipher === '') return '';
    $c = strtolower($cipher);
    // Clearly broken
    if (str_contains($c, 'rc4') || str_contains($c, '3des') || str_contains($c, 'des-')
        || str_contains($c, 'null') || str_contains($c, 'export') || str_contains($c, 'md5')) {
        return 'legacy';
    }
    // Modern: ECDHE + AEAD (GCM or ChaCha20)
    if (str_contains($c, 'ecdhe') && (str_contains($c, 'gcm') || str_contains($c, 'chacha20'))) {
        return 'modern';
    }
    return 'transitional';
}

/**
 * Guess whether an ASN organisation is a datacenter, mobile carrier, or residential ISP.
 */
function classify_asn_type(string $org): string {
    if ($org === '') return 'unknown';
    $o = strtolower($org);
    $mobileSignals = [
        'mobile', 'cellular', 'wireless', 'gsm', 'lte', 'mts ', 'megafon',
        'beeline', 'verizon wireless', "at&t mobility", 't-mobile',
    ];
    foreach ($mobileSignals as $m) {
        if (str_contains($o, $m)) return 'mobile';
    }
    $datacenterSignals = [
        'amazon', 'aws', 'google cloud', 'digitalocean', 'microsoft', 'azure',
        'ovh', 'hetzner', 'vultr', 'linode', 'oracle', 'contabo', 'scaleway',
        'leaseweb', 'choopa', 'server', 'hosting', 'datacenter', 'colo', 'cloud',
        'vpn', 'proxy', 'cdn', 'fastly', 'cloudflare', 'akamai',
    ];
    foreach ($datacenterSignals as $d) {
        if (str_contains($o, $d)) return 'datacenter';
    }
    return 'residential';
}
