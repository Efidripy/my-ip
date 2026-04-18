<?php
declare(strict_types=1);

/**
 * Load a single variable from the .env file in the application root.
 * Only lines matching KEY=VALUE are parsed; comments and blanks are ignored.
 * Returns an empty string when the file is missing or the key is not found.
 */
function _read_dotenv_key(string $key): string {
    $envFile = __DIR__ . '/../.env';
    if (!is_file($envFile)) {
        return '';
    }
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines === false) {
        return '';
    }
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#') {
            continue;
        }
        $eqPos = strpos($line, '=');
        if ($eqPos === false) {
            continue;
        }
        if (substr($line, 0, $eqPos) === $key) {
            return trim(substr($line, $eqPos + 1));
        }
    }
    return '';
}

$_adminToken = (string)($_ENV['MY_IP_ADMIN_TOKEN'] ?? $_SERVER['MY_IP_ADMIN_TOKEN'] ?? '');
if ($_adminToken === '') {
    $_adminToken = _read_dotenv_key('MY_IP_ADMIN_TOKEN');
}

return [
    'app_name' => 'KLEVA My-IP PRO',
    'base_path' => __DIR__ . '/..',
    'db_path' => __DIR__ . '/../data/myip.sqlite',
    'admin_token' => $_adminToken,
    'geo_city_db' => __DIR__ . '/../data/GeoLite2-City.mmdb',
    'geo_asn_db' => __DIR__ . '/../data/GeoLite2-ASN.mmdb',
    'tor_exit_nodes_file' => __DIR__ . '/../data/tor_exit_nodes.txt',
    'max_log_rows' => 5000,
];
