<?php
declare(strict_types=1);

/**
 * Check an IPv4 address against popular DNS-based blacklists (DNSBL).
 * IPv6 addresses are skipped — DNSBL support for IPv6 is inconsistent.
 *
 * @return array{listed:int, total:int, blacklists:list<string>}
 */
function dnsbl_check(string $ip): array
{
    $result = ['listed' => 0, 'total' => 0, 'blacklists' => []];

    if (!filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
        return $result;
    }

    $reversed = implode('.', array_reverse(explode('.', $ip)));

    $lists = [
        'zen.spamhaus.org',
        'bl.spamcop.net',
        'dnsbl.sorbs.net',
    ];

    $result['total'] = count($lists);

    foreach ($lists as $list) {
        $lookup = $reversed . '.' . $list;
        $resolved = @gethostbyname($lookup);
        // gethostbyname() returns the hostname unchanged on NXDOMAIN/error.
        // If it resolved to an actual IP, the address is listed.
        if ($resolved !== $lookup && filter_var($resolved, FILTER_VALIDATE_IP)) {
            $result['listed']++;
            $result['blacklists'][] = $list;
        }
    }

    return $result;
}
