<?php
declare(strict_types=1);

function normalize_ip(string $ip): string {
    $normalized = trim($ip);
    if ($normalized === '') {
        return '';
    }
    return filter_var($normalized, FILTER_VALIDATE_IP) ? $normalized : '';
}

function mmdb_lookup_value(string $dbFile, string $ip, array $path): ?string {
    if (!is_file($dbFile)) return null;
    $safeIp = normalize_ip($ip);
    if ($safeIp === '') {
        return null;
    }
    $safePath = [];
    foreach ($path as $part) {
        if (!is_string($part) || !preg_match('/^[a-zA-Z0-9_]+$/', $part)) {
            return null;
        }
        $safePath[] = $part;
    }
    $cmd = array_merge(['mmdblookup', '--file', $dbFile, '--ip', $safeIp], $safePath);
    $descriptors = [1 => ['pipe', 'w'], 2 => ['pipe', 'w']];
    $proc = @proc_open($cmd, $descriptors, $pipes);
    if (!is_resource($proc)) return null;
    $stdout = stream_get_contents($pipes[1]);
    $stderr = stream_get_contents($pipes[2]);
    fclose($pipes[1]);
    fclose($pipes[2]);
    proc_close($proc);
    if (!$stdout || stripos($stdout, 'not found') !== false || $stderr) {
        // stderr often empty; ignore if stdout useful.
    }
    if (!preg_match('/"([^"]+)"\s*<utf8_string>|([0-9]+)\s*<uint(?:16|32)>/m', $stdout, $m)) {
        return null;
    }
    return $m[1] !== '' ? $m[1] : $m[2];
}

function geo_lookup(string $ip): array {
    $cfg = app_config();
    $out = [
        'country' => '',
        'city' => '',
        'region' => '',
        'timezone' => '',
        'asn' => '',
        'org' => '',
        'tor' => false,
        'vpn_hosting_risk' => 'unknown',
        'vpn_hosting_reason' => 'Нет локальных баз или недостаточно данных.',
    ];

    $safeIp = normalize_ip($ip);
    if ($safeIp === '') {
        return $out;
    }

    $cityDb = $cfg['geo_city_db'];
    $asnDb = $cfg['geo_asn_db'];

    $out['country'] = mmdb_lookup_value($cityDb, $safeIp, ['country', 'names', 'en']) ?? '';
    $out['city'] = mmdb_lookup_value($cityDb, $safeIp, ['city', 'names', 'en']) ?? '';
    $out['region'] = mmdb_lookup_value($cityDb, $safeIp, ['subdivisions', '0', 'names', 'en']) ?? '';
    $out['timezone'] = mmdb_lookup_value($cityDb, $safeIp, ['location', 'time_zone']) ?? '';
    $out['asn'] = mmdb_lookup_value($asnDb, $safeIp, ['autonomous_system_number']) ?? '';
    $out['org'] = mmdb_lookup_value($asnDb, $safeIp, ['autonomous_system_organization']) ?? '';

    $torFile = $cfg['tor_exit_nodes_file'];
    if (is_file($torFile)) {
        $lines = @file($torFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
        $set = array_flip(array_map('trim', $lines));
        $out['tor'] = isset($set[$safeIp]);
    }

    $org = strtolower($out['org']);
    $rdns = strtolower(get_reverse_dns($safeIp));
    $signals = [
        'amazon', 'aws', 'google cloud', 'digitalocean', 'microsoft', 'azure', 'ovh', 'hetzner', 'vultr', 'linode', 'oracle cloud',
        'choopa', 'server', 'hosting', 'datacenter', 'colo', 'cloud', 'vpn', 'proxy', 'tor', 'contabo', 'scaleway', 'leaseweb', 'iq network',
    ];

    $matched = [];
    foreach ($signals as $s) {
        if (($org && str_contains($org, $s)) || ($rdns && str_contains($rdns, $s))) {
            $matched[] = $s;
        }
    }

    if ($out['tor']) {
        $out['vpn_hosting_risk'] = 'high';
        $out['vpn_hosting_reason'] = 'IP найден в локальном списке Tor exit nodes.';
    } elseif ($matched) {
        $out['vpn_hosting_risk'] = 'medium';
        $out['vpn_hosting_reason'] = 'Сработали эвристики по ASN/rDNS: ' . implode(', ', array_unique($matched));
    } elseif ($out['org']) {
        $out['vpn_hosting_risk'] = 'low';
        $out['vpn_hosting_reason'] = 'Есть ASN-организация, но признаков VPN/hosting по эвристикам нет.';
    }

    return $out;
}
