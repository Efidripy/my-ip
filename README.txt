KLEVA My-IP PRO v4

Файлы:
- index.php — главная страница
- api.php — серверный API (только данные клиента)
- collect.php — принимает client-side fingerprint и дописывает лог визита
- admin.php — панель последних визитов
- visit.php — карточка визита
- export.php — экспорт JSON/CSV
- assets/style.css, assets/app.js
- inc/config.php, db.php, util.php, geo.php
- data/ — база SQLite и опциональные локальные базы

Установка на Ubuntu:
1) sudo apt update
2) sudo apt install -y php-fpm php-cli php-sqlite3 sqlite3 mmdb-bin unzip
3) скопировать проект в любую директорию, например /var/www/my-ip
4) установить переменную окружения админ-токена (рекомендуется):
   - MY_IP_ADMIN_TOKEN=сложный_случайный_токен

Опционально для GeoIP:
- положить GeoLite2-City.mmdb в data/
- положить GeoLite2-ASN.mmdb в data/
- положить tor_exit_nodes.txt в data/

Права:
APP_DIR=/var/www/my-ip
sudo chown -R www-data:www-data "$APP_DIR"
sudo find "$APP_DIR" -type d -exec chmod 755 {} \;
sudo find "$APP_DIR" -type f -exec chmod 644 {} \;
sudo chmod 775 "$APP_DIR/data"

Admin token:
- задать MY_IP_ADMIN_TOKEN (предпочтительно)
- или явно прописать admin_token в inc/config.php
- открывать admin.php?token=YOUR_TOKEN

Nginx (через snippets):
1) создать snippet с маршрутом приложения, например /etc/nginx/snippets/my-ip-location.conf:
   location /my-ip/ {
       alias /var/www/my-ip/;
       index index.php;
       try_files $uri $uri/ /my-ip/index.php?$query_string;
   }

2) создать snippet для PHP-обработки внутри приложения, например /etc/nginx/snippets/my-ip-php.conf:
   location ~ ^/my-ip/(.+\.php)$ {
       alias /var/www/my-ip/$1;
       include snippets/fastcgi-php.conf;
       fastcgi_param SCRIPT_FILENAME /var/www/my-ip/$1;
       fastcgi_param HTTP_X_REAL_IP $remote_addr;
       fastcgi_param HTTP_X_FORWARDED_FOR $proxy_add_x_forwarded_for;
       fastcgi_pass unix:/run/php/php-fpm.sock;
   }

3) подключить snippets в нужном server{} (обычно две строки include). Это единственное место в server-блоке.
4) проверить и применить конфиг:
   sudo nginx -t && sudo systemctl reload nginx
