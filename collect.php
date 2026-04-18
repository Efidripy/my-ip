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
$notes = (string)($data['notes'] ?? '');

try {
    $pdo = db();
    $stmt = $pdo->prepare('UPDATE visits SET updated_at = :updated_at, client_json = :client_json, client_hash = :client_hash, privacy_score = :privacy_score, risk_level = :risk_level, notes = :notes WHERE id = :id');
    $stmt->execute([
        ':updated_at' => gmdate('c'),
        ':client_json' => $clientJson,
        ':client_hash' => $clientHash,
        ':privacy_score' => $privacyScore,
        ':risk_level' => $riskLevel,
        ':notes' => $notes,
        ':id' => $visitId,
    ]);
} catch (Throwable $e) {
    json_response(['ok' => false, 'error' => $e->getMessage()], 500);
}

json_response(['ok' => true]);
