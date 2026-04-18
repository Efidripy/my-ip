<?php
declare(strict_types=1);
require __DIR__ . '/inc/util.php';

// Minimal endpoint that returns the connecting IP.
// If the server supports IPv6 and the client connects over it, this reveals the IPv6 address.
$ip = get_client_ip();
json_response([
    'ok'      => true,
    'ip'      => $ip,
    'version' => strpos($ip, ':') !== false ? 'IPv6' : 'IPv4',
]);
