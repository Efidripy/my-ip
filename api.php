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

$raw_xff       = safe_server('HTTP_X_FORWARDED_FOR');
$tls_cipher_raw = safe_server('SSL_CIPHER') ?: safe_server('HTTP_X_SSL_CIPHER');
$cipher_grade  = classify_tls_cipher($tls_cipher_raw);
$asn_type      = classify_asn_type($geo['org']);

// Compute server-info exposure level
$exposure_issues = [];
if (check_bogon_in_xff($raw_xff))                                     $exposure_issues[] = 'private_ip_in_xff';
if ($tls_cipher_raw !== '' && $cipher_grade === 'legacy')             $exposure_issues[] = 'legacy_tls_cipher';
if ($tls_cipher_raw !== '')                                           $exposure_issues[] = 'tls_cipher_visible';

$exposure_level = 'green';
if (in_array('private_ip_in_xff', $exposure_issues, true) || in_array('legacy_tls_cipher', $exposure_issues, true)) {
    $exposure_level = 'red';
} elseif (!empty($exposure_issues)) {
    $exposure_level = 'yellow';
}

$client = [
    'ip'                   => $ip,
    'reverse_dns'          => $rdns,
    'x_forwarded_for'      => mask_private_in_xff($raw_xff),
    'x_real_ip'            => safe_server('HTTP_X_REAL_IP'),
    'https'                => $https,
    'http_version'         => safe_server('SERVER_PROTOCOL'),
    'accept_language'      => safe_server('HTTP_ACCEPT_LANGUAGE'),
    'accept_encoding'      => safe_server('HTTP_ACCEPT_ENCODING'),
    'dnt'                  => safe_server('HTTP_DNT'),
    'referer_present'      => safe_server('HTTP_REFERER') !== '',
    'origin_present'       => safe_server('HTTP_ORIGIN') !== '',
    'sec_ch_ua_present'    => safe_server('HTTP_SEC_CH_UA') !== '',
    'country'              => $geo['country'],
    'city'                 => $geo['city'],
    'region'               => $geo['region'],
    'geo_timezone'         => $geo['timezone'],
    'asn'                  => $geo['asn'],
    'as_org'               => $geo['org'],
    'asn_type'             => $asn_type,
    'vpn_hosting_risk'     => $geo['vpn_hosting_risk'],
    'vpn_hosting_reason'   => $geo['vpn_hosting_reason'],
    'is_tor'               => $geo['tor'],
    'geo_accuracy_radius'  => $geo['accuracy_radius'],
    'bogon_in_xff'         => check_bogon_in_xff($raw_xff),
    'dnsbl_listed'         => $dnsbl['listed'],
    'dnsbl_total'          => $dnsbl['total'],
    'dnsbl_blacklists'     => $dnsbl['blacklists'],
    'sec_ch_ua'            => safe_server('HTTP_SEC_CH_UA'),
    'sec_gpc'              => safe_server('HTTP_SEC_GPC'),
    'sec_fetch_site'       => safe_server('HTTP_SEC_FETCH_SITE'),
    'sec_fetch_mode'       => safe_server('HTTP_SEC_FETCH_MODE'),
    'sec_fetch_dest'       => safe_server('HTTP_SEC_FETCH_DEST'),
    'sec_fetch_user'       => safe_server('HTTP_SEC_FETCH_USER'),
    'tls_version'          => safe_server('SSL_PROTOCOL') ?: safe_server('HTTP_X_SSL_PROTOCOL'),
    'tls_cipher'           => $tls_cipher_raw,
    'tls_cipher_grade'     => $cipher_grade,
    'client_ip_version'    => (strpos($ip, ':') !== false ? 'IPv6' : 'IPv4'),
    'server_info_exposure' => [
        'level'  => $exposure_level,
        'issues' => $exposure_issues,
    ],
    'all_request_headers' => getallheaders() ?: [],
];

$visitId = null;
try {
    $pdo = db();
    $now = gmdate('c');
    $stmt = $pdo->prepare('INSERT INTO visits (created_at, updated_at, ip, reverse_dns, x_real_ip, x_forwarded_for, scheme, http_version, accept_language, dnt, user_agent, referer_present, origin_present, sec_ch_ua_present, sec_ch_ua, geo_country, geo_city, geo_region, geo_timezone, asn, as_org, vpn_hosting_risk, vpn_hosting_reason, is_tor) VALUES (:created_at, :updated_at, :ip, :reverse_dns, :x_real_ip, :x_forwarded_for, :scheme, :http_version, :accept_language, :dnt, :user_agent, :referer_present, :origin_present, :sec_ch_ua_present, :sec_ch_ua, :geo_country, :geo_city, :geo_region, :geo_timezone, :asn, :as_org, :vpn_hosting_risk, :vpn_hosting_reason, :is_tor)');
    $stmt->execute([
        ':created_at' => $now,
        ':updated_at' => $now,
        ':ip' => $ip,
        ':reverse_dns' => $rdns,
        ':x_real_ip' => safe_server('HTTP_X_REAL_IP'),
        ':x_forwarded_for' => $raw_xff,
        ':scheme' => $https ? 'https' : 'http',
        ':http_version' => safe_server('SERVER_PROTOCOL'),
        ':accept_language' => safe_server('HTTP_ACCEPT_LANGUAGE'),
        ':dnt' => safe_server('HTTP_DNT'),
        ':user_agent' => safe_server('HTTP_USER_AGENT'),
        ':referer_present' => safe_server('HTTP_REFERER') !== '' ? 1 : 0,
        ':origin_present' => safe_server('HTTP_ORIGIN') !== '' ? 1 : 0,
        ':sec_ch_ua_present' => safe_server('HTTP_SEC_CH_UA') !== '' ? 1 : 0,
        ':sec_ch_ua' => safe_server('HTTP_SEC_CH_UA'),
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
