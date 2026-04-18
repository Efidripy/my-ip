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
        echo '<!doctype html><meta charset="utf-8"><title>403</title><body style="font-family:sans-serif;background:#0b1220;color:#fff;padding:32px">403 — admin token required.<br>Установи <code>MY_IP_ADMIN_TOKEN</code> (или задай <code>admin_token</code> в <code>inc/config.php</code>) и открой страницу как <code>?token=YOUR_TOKEN</code>.</body>';
        exit;
    }
}
