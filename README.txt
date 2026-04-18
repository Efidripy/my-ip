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

Опционально для GeoIP:
- положить GeoLite2-City.mmdb в data/
- положить GeoLite2-ASN.mmdb в data/
- положить tor_exit_nodes.txt в data/

Права:
sudo chown -R www-data:www-data /var/www/kleva.ru/my-ip
sudo find /var/www/kleva.ru/my-ip -type d -exec chmod 755 {} \;
sudo find /var/www/kleva.ru/my-ip -type f -exec chmod 644 {} \;
sudo chmod 775 /var/www/kleva.ru/my-ip/data

Admin token:
- поменять admin_token в inc/config.php
- открывать admin.php?token=YOUR_TOKEN

Nginx:
- добавить index.php в index
- для /my-ip/ направлять fallback на /my-ip/index.php
- для PHP внутри /my-ip/ включить fastcgi_pass и проброс client IP
