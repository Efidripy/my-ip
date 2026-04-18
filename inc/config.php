<?php
return [
    'app_name' => 'KLEVA My-IP PRO',
    'base_path' => __DIR__ . '/..',
    'db_path' => __DIR__ . '/../data/myip.sqlite',
    'admin_token' => 'CHANGE_ME_STRONG_TOKEN',
    'geo_city_db' => __DIR__ . '/../data/GeoLite2-City.mmdb',
    'geo_asn_db' => __DIR__ . '/../data/GeoLite2-ASN.mmdb',
    'tor_exit_nodes_file' => __DIR__ . '/../data/tor_exit_nodes.txt',
    'max_log_rows' => 5000,
];
