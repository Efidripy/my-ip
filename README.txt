KLEVA My-IP PRO

════════════════════════════════════════════
  БЫСТРАЯ УСТАНОВКА (Ubuntu / Debian)
════════════════════════════════════════════

1. Скачать проект с GitHub:

   git clone https://github.com/Efidripy/my-ip.git
   cd my-ip

2. Запустить интерактивный установщик:

   sudo bash install.sh

Скрипт спросит путь установки, URL-префикс, сокет PHP-FPM,
установит зависимости, настроит nginx, сгенерирует токен и
предложит скачать базы GeoIP и список Tor-нод.

Если в выбранной директории уже есть признаки установленного
проекта, установщик предложит выбор:
  - Update existing install (обновить код, сохранив data/, .env и inc/config.php)
  - Install over it (полная переустановка поверх существующих файлов)

════════════════════════════════════════════
  ФАЙЛЫ ПРОЕКТА
════════════════════════════════════════════

  index.php   — главная страница
  api.php     — серверный API (IP / гео / заголовки)
  collect.php — принимает client-side fingerprint
  admin.php   — панель последних визитов
  visit.php   — карточка визита
  export.php  — экспорт JSON/CSV
  assets/     — style.css, app.js
  inc/        — config.php, db.php, util.php, geo.php, dnsbl.php
  data/       — SQLite-база и опциональные mmdb/txt-файлы
  install.sh  — интерактивный установщик

════════════════════════════════════════════
  РУЧНАЯ УСТАНОВКА (шаги)
════════════════════════════════════════════

1) sudo apt update && sudo apt install -y \
       php-fpm php-cli php-sqlite3 sqlite3 mmdb-bin unzip curl git

2) Скачать проект с GitHub и скопировать в нужный каталог:
   git clone https://github.com/Efidripy/my-ip.git
   sudo cp -r my-ip /var/www/my-ip

3) Создать директорию данных:
   sudo mkdir -p /var/www/my-ip/data
   sudo chown -R www-data:www-data /var/www/my-ip
   sudo find /var/www/my-ip -type d -exec chmod 755 {} \;
   sudo find /var/www/my-ip -type f -exec chmod 644 {} \;
   sudo chmod 775 /var/www/my-ip/data

4) Задать admin-токен (рекомендуется через переменную окружения):
   MY_IP_ADMIN_TOKEN=<случайная_строка>
   Или прописать напрямую в inc/config.php → 'admin_token'.

5) Положить в data/ (опционально, нужны для геолокации):
   - GeoLite2-City.mmdb
   - GeoLite2-ASN.mmdb
   - tor_exit_nodes.txt (https://check.torproject.org/torbulkexitlist)

════════════════════════════════════════════
  NGINX — snippet-конфиг (sub-path /my-ip)
════════════════════════════════════════════

  Скрипт install.sh создаёт готовые snippets автоматически.
  Вручную добавить в server{} блок:

    include /etc/nginx/snippets/my-ip-location.conf;
    include /etc/nginx/snippets/my-ip-php.conf;

  Содержимое snippets (пример для prefix /my-ip):

  # my-ip-location.conf
  # port_in_redirect off prevents nginx from adding the listen port
  # (e.g. :7445) to redirect URLs when running behind a reverse proxy.
  port_in_redirect off;

  location = /my-ip {
      return 301 /my-ip/;
  }

  location /my-ip/ {
      alias /var/www/my-ip/;
      index index.php;
      try_files $uri $uri/ /my-ip/index.php?$query_string;
  }

  # my-ip-php.conf
  # IMPORTANT: do NOT use "include snippets/fastcgi-php.conf" here — it contains
  # "try_files $fastcgi_script_name =404" which checks against the server $document_root
  # (e.g. /var/www/kleva.ru), not the aliased app directory, causing false 404 errors.
  location ~ ^/my-ip/(.+\.php)$ {
      include fastcgi_params;
      fastcgi_param SCRIPT_FILENAME /var/www/my-ip/$1;
      fastcgi_param SCRIPT_NAME /my-ip/$1;
      fastcgi_param HTTP_X_REAL_IP $remote_addr;
      fastcgi_param HTTP_X_FORWARDED_FOR $proxy_add_x_forwarded_for;
      fastcgi_pass unix:/run/php/php-fpm.sock;
  }

  # ── If nginx uses PROXY protocol on its listen directive ───────────────
  # When traffic arrives via PROXY protocol (e.g. HAProxy → nginx),
  # $remote_addr is the proxy's address (127.0.0.1) instead of the real
  # client IP. Add these two lines inside the location block above so that
  # nginx's realip module replaces $remote_addr with the PROXY protocol address:
  #
  #     real_ip_header    proxy_protocol;
  #     set_real_ip_from  0.0.0.0/0;
  #
  # The installer automatically adds these lines when you answer "y" to the
  # "Does nginx use PROXY protocol?" question.
  # ────────────────────────────────────────────────────────────────────────

  sudo nginx -t && sudo systemctl reload nginx

════════════════════════════════════════════
  ADMIN-ПАНЕЛЬ
════════════════════════════════════════════

  https://yourdomain/my-ip/admin.php?token=YOUR_TOKEN
