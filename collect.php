<?php
declare(strict_types=1);
require __DIR__ . '/inc/db.php';
require __DIR__ . '/inc/util.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['ok' => false, 'error' => 'POST required'], 405);
}

$body = file_get_contents('php://input') ?: '';
$data = json_decode($body, true);
if (!is_array($data)) {
    json_response(['ok' => false, 'error' => 'Invalid JSON'], 400);
}

$visitId = isset($data['visit_id']) ? (int)$data['visit_id'] : 0;
if ($visitId <= 0) {
    json_response(['ok' => false, 'error' => 'visit_id required'], 400);
}

$clientJson = json_encode($data['client'] ?? [], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
$clientHash = (string)($data['fingerprint_hash'] ?? '');
$privacyScore = isset($data['privacy_score']) ? (int)$data['privacy_score'] : null;
$riskLevel = (string)($data['risk_level'] ?? '');
$vpnReason = (string)($data['vpn_reason'] ?? '');

try {
    $pdo = db();
    $stmt = $pdo->prepare('UPDATE visits SET updated_at = :updated_at, client_json = :client_json, client_hash = :client_hash, privacy_score = :privacy_score, risk_level = :risk_level, vpn_reason = :vpn_reason WHERE id = :id');
    $stmt->execute([
        ':updated_at' => gmdate('c'),
        ':client_json' => $clientJson,
        ':client_hash' => $clientHash,
        ':privacy_score' => $privacyScore,
        ':risk_level' => $riskLevel,
        ':vpn_reason' => $vpnReason,
        ':id' => $visitId,
    ]);

    $prevVisit = null;
    if ($clientHash !== '') {
        $currentIp = get_client_ip();
        $prevStmt = $pdo->prepare(
            'SELECT id, created_at, ip FROM visits WHERE client_hash = :hash AND id != :id ORDER BY created_at DESC LIMIT 1'
        );
        $prevStmt->execute([':hash' => $clientHash, ':id' => $visitId]);
        $prev = $prevStmt->fetch();
        if ($prev) {
            $daysDiff = (int)round((time() - (int)strtotime((string)$prev['created_at'])) / 86400);
            $prevVisit = [
                'days_ago' => max(0, $daysDiff),
                'same_ip'  => (string)$prev['ip'] === $currentIp,
            ];
        }

        // Fingerprint uniqueness: how many sessions / unique IPs share this hash
        $uStmt = $pdo->prepare(
            'SELECT COUNT(*) as total_sessions, COUNT(DISTINCT ip) as unique_ips FROM visits WHERE client_hash = :hash'
        );
        $uStmt->execute([':hash' => $clientHash]);
        $uRow = $uStmt->fetch();
        if ($uRow) {
            $uniqueness = [
                'total_sessions' => (int)$uRow['total_sessions'],
                'unique_ips'     => (int)$uRow['unique_ips'],
            ];
        }

        // Last 10 visits with this hash for timeline display
        $tlStmt = $pdo->prepare(
            'SELECT created_at, ip, geo_country, geo_city FROM visits WHERE client_hash = :hash ORDER BY created_at DESC LIMIT 10'
        );
        $tlStmt->execute([':hash' => $clientHash]);
        $visitTimeline = $tlStmt->fetchAll() ?: [];
    }
} catch (Throwable $e) {
    error_log('collect.php: ' . $e->getMessage());
    json_response(['ok' => false, 'error' => 'internal_error'], 500);
}

json_response(['ok' => true, 'prev_visit' => $prevVisit, 'uniqueness' => $uniqueness ?? null, 'visit_timeline' => $visitTimeline ?? []]);
