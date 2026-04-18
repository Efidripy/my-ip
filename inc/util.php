<?php
declare(strict_types=1);

function h(string $v): string {
    return htmlspecialchars($v, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function json_response(array $data, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('Pragma: no-cache');
    header('Expires: 0');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    exit;
}

function first_forwarded_ip(?string $xff): string {
    if (!$xff) return '';
    $parts = explode(',', $xff);
    return trim((string)($parts[0] ?? ''));
}

function safe_server(string $key, string $default = ''): string {
    return isset($_SERVER[$key]) ? (string)$_SERVER[$key] : $default;
}

function get_client_ip(): string {
    $candidates = [
        safe_server('HTTP_X_REAL_IP'),
        first_forwarded_ip(safe_server('HTTP_X_FORWARDED_FOR')),
        safe_server('REMOTE_ADDR'),
    ];
    foreach ($candidates as $ip) {
        if ($ip !== '' && filter_var($ip, FILTER_VALIDATE_IP)) {
            return $ip;
        }
    }
    return 'unknown';
}

function get_reverse_dns(string $ip): string {
    if (!filter_var($ip, FILTER_VALIDATE_IP)) return '';
    $rdns = @gethostbyaddr($ip);
    if (!$rdns || $rdns === $ip) return '';
    return (string)$rdns;
}

function is_https_request(): bool {
    return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || safe_server('REQUEST_SCHEME') === 'https' || safe_server('HTTP_X_FORWARDED_PROTO') === 'https';
}

function detect_risk_level(int $score): string {
    if ($score >= 80) return 'green';
    if ($score >= 55) return 'yellow';
    return 'red';
}

function is_bogon_ip(string $ip): bool {
    if (!filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
        return false;
    }
    $parts = explode('.', $ip);
    $a = (int)$parts[0];
    $b = (int)$parts[1];
    if ($a === 0) return true;                                 // 0.0.0.0/8
    if ($a === 10) return true;                                // 10.0.0.0/8 RFC 1918
    if ($a === 100 && $b >= 64 && $b <= 127) return true;     // 100.64.0.0/10 RFC 6598 CGN
    if ($a === 127) return true;                               // 127.0.0.0/8 loopback
    if ($a === 169 && $b === 254) return true;                 // 169.254.0.0/16 link-local
    if ($a === 172 && $b >= 16 && $b <= 31) return true;      // 172.16.0.0/12 RFC 1918
    if ($a === 192 && $b === 0) return true;                   // 192.0.0.0/24, 192.0.2.0/24
    if ($a === 192 && $b === 168) return true;                 // 192.168.0.0/16 RFC 1918
    if ($a === 198 && $b === 51) return true;                  // 198.51.100.0/24 TEST-NET-2
    if ($a === 203 && $b === 0) return true;                   // 203.0.113.0/24 TEST-NET-3
    if ($a >= 240) return true;                                // 240.0.0.0/4 reserved
    return false;
}

function check_bogon_in_xff(string $xff): bool {
    if ($xff === '') {
        return false;
    }
    foreach (explode(',', $xff) as $part) {
        if (is_bogon_ip(trim($part))) {
            return true;
        }
    }
    return false;
}

function is_admin_authorized(): bool {
    $cfg = app_config();
    $token = $cfg['admin_token'] ?? '';
    if ($token === '') {
        return false;
    }
    $provided = $_GET['token'] ?? $_SERVER['HTTP_X_ADMIN_TOKEN'] ?? '';
    return hash_equals((string)$token, (string)$provided);
}

function require_admin(): void {
    if (!is_admin_authorized()) {
        http_response_code(403);
        echo '<!doctype html><meta charset="utf-8"><title>403</title><body style="font-family:sans-serif;background:#0b1220;color:#fff;padding:32px">403 — access denied.</body>';
        exit;
    }
}
