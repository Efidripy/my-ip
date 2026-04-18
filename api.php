<?php
declare(strict_types=1);
require __DIR__ . '/inc/db.php';
require __DIR__ . '/inc/util.php';
require __DIR__ . '/inc/geo.php';
require __DIR__ . '/inc/dnsbl.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$ip = get_client_ip();
$rdns = get_reverse_dns($ip);
$https = is_https_request();
$geo = geo_lookup($ip);
$dnsbl = dnsbl_check($ip);

$client = [
    'ip' => $ip,
    'reverse_dns' => $rdns,
    'x_forwarded_for' => safe_server('HTTP_X_FORWARDED_FOR'),
    'x_real_ip' => safe_server('HTTP_X_REAL_IP'),
    'scheme' => $https ? 'https' : 'http',
    'https' => $https,
    'http_version' => safe_server('SERVER_PROTOCOL'),
    'accept_language' => safe_server('HTTP_ACCEPT_LANGUAGE'),
    'accept_encoding' => safe_server('HTTP_ACCEPT_ENCODING'),
    'dnt' => safe_server('HTTP_DNT'),
    'referer_present' => safe_server('HTTP_REFERER') !== '',
    'origin_present' => safe_server('HTTP_ORIGIN') !== '',
    'sec_ch_ua_present' => safe_server('HTTP_SEC_CH_UA') !== '',
    'country' => $geo['country'],
    'city' => $geo['city'],
    'region' => $geo['region'],
    'geo_timezone' => $geo['timezone'],
    'asn' => $geo['asn'],
    'as_org' => $geo['org'],
    'vpn_hosting_risk' => $geo['vpn_hosting_risk'],
    'vpn_hosting_reason' => $geo['vpn_hosting_reason'],
    'is_tor' => $geo['tor'],
    'geo_accuracy_radius' => $geo['accuracy_radius'],
    'bogon_in_xff' => check_bogon_in_xff(safe_server('HTTP_X_FORWARDED_FOR')),
    'dnsbl_listed' => $dnsbl['listed'],
    'dnsbl_total' => $dnsbl['total'],
    'dnsbl_blacklists' => $dnsbl['blacklists'],
    'sec_ch_ua' => safe_server('HTTP_SEC_CH_UA'),
];

$visitId = null;
try {
    $pdo = db();
    $now = gmdate('c');
    $stmt = $pdo->prepare('INSERT INTO visits (created_at, updated_at, ip, reverse_dns, x_real_ip, x_forwarded_for, scheme, http_version, accept_language, dnt, user_agent, referer_present, origin_present, sec_ch_ua_present, geo_country, geo_city, geo_region, geo_timezone, asn, as_org, vpn_hosting_risk, vpn_hosting_reason, is_tor) VALUES (:created_at, :updated_at, :ip, :reverse_dns, :x_real_ip, :x_forwarded_for, :scheme, :http_version, :accept_language, :dnt, :user_agent, :referer_present, :origin_present, :sec_ch_ua_present, :geo_country, :geo_city, :geo_region, :geo_timezone, :asn, :as_org, :vpn_hosting_risk, :vpn_hosting_reason, :is_tor)');
    $stmt->execute([
        ':created_at' => $now,
        ':updated_at' => $now,
        ':ip' => $ip,
        ':reverse_dns' => $rdns,
        ':x_real_ip' => safe_server('HTTP_X_REAL_IP'),
        ':x_forwarded_for' => safe_server('HTTP_X_FORWARDED_FOR'),
        ':scheme' => $https ? 'https' : 'http',
        ':http_version' => safe_server('SERVER_PROTOCOL'),
        ':accept_language' => safe_server('HTTP_ACCEPT_LANGUAGE'),
        ':dnt' => safe_server('HTTP_DNT'),
        ':user_agent' => safe_server('HTTP_USER_AGENT'),
        ':referer_present' => safe_server('HTTP_REFERER') !== '' ? 1 : 0,
        ':origin_present' => safe_server('HTTP_ORIGIN') !== '' ? 1 : 0,
        ':sec_ch_ua_present' => safe_server('HTTP_SEC_CH_UA') !== '' ? 1 : 0,
        ':geo_country' => $geo['country'],
        ':geo_city' => $geo['city'],
        ':geo_region' => $geo['region'],
        ':geo_timezone' => $geo['timezone'],
        ':asn' => $geo['asn'],
        ':as_org' => $geo['org'],
        ':vpn_hosting_risk' => $geo['vpn_hosting_risk'],
        ':vpn_hosting_reason' => $geo['vpn_hosting_reason'],
        ':is_tor' => $geo['tor'] ? 1 : 0,
    ]);
    $visitId = (int)$pdo->lastInsertId();
    cleanup_old_rows();
} catch (Throwable $e) {
    // keep API alive even if logging fails
}

json_response([
    'ok' => true,
    'visit_id' => $visitId,
    'timestamp_iso8601' => gmdate('c'),
    'client' => $client,
]);
