<?php
declare(strict_types=1);
require __DIR__ . '/inc/db.php';
require __DIR__ . '/inc/util.php';
require_admin();

$pdo = db();
$rows = $pdo->query('SELECT * FROM visits ORDER BY created_at DESC LIMIT 200')->fetchAll();
$total = (int)$pdo->query('SELECT COUNT(*) FROM visits')->fetchColumn();
$uniqueIps = (int)$pdo->query('SELECT COUNT(DISTINCT ip) FROM visits')->fetchColumn();
$uniqueHashes = (int)$pdo->query("SELECT COUNT(DISTINCT client_hash) FROM visits WHERE client_hash IS NOT NULL AND client_hash != ''")->fetchColumn();
?>
<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>My-IP Admin</title>
<style>
body{margin:0;background:#0b1220;color:#fff;font-family:Inter,system-ui,sans-serif;padding:24px}a{color:#8dc3ff}table{width:100%;border-collapse:collapse;font-size:14px}th,td{padding:10px;border-bottom:1px solid rgba(255,255,255,.08);vertical-align:top}th{text-align:left;color:#9fb0cc}.card{background:#111a2e;border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:18px;margin-bottom:18px}.mono{font-family:ui-monospace,monospace}.g{color:#4ade80}.y{color:#facc15}.r{color:#f87171}</style></head><body>
<h1>Admin panel</h1>
<div class="card">Всего визитов: <strong><?= $total ?></strong> • Уникальных IP: <strong><?= $uniqueIps ?></strong> • Уникальных fingerprint hash: <strong><?= $uniqueHashes ?></strong> • <a href="export.php?token=<?= h((string)($_GET['token'] ?? '')) ?>&format=json">Экспорт JSON</a> • <a href="export.php?token=<?= h((string)($_GET['token'] ?? '')) ?>&format=csv">Экспорт CSV</a></div>
<div class="card"><table><thead><tr><th>ID</th><th>Time</th><th>IP</th><th>Geo</th><th>ASN/Org</th><th>Risk</th><th>Score</th><th>Fingerprint</th><th>Client</th></tr></thead><tbody>
<?php foreach ($rows as $row): ?>
<tr>
<td><?= (int)$row['id'] ?></td>
<td class="mono"><?= h((string)$row['created_at']) ?></td>
<td class="mono"><?= h((string)$row['ip']) ?><br><small><?= h((string)$row['reverse_dns']) ?></small></td>
<td><?= h(trim(($row['geo_country'] ?: '') . ' ' . ($row['geo_city'] ?: ''))) ?></td>
<td><?= h(trim(($row['asn'] ?: '') . ' ' . ($row['as_org'] ?: ''))) ?></td>
<td class="<?= $row['risk_level'] === 'red' ? 'r' : ($row['risk_level'] === 'yellow' ? 'y' : 'g') ?>"><?= h((string)($row['vpn_hosting_risk'] ?: $row['risk_level'])) ?></td>
<td><?= h((string)$row['privacy_score']) ?></td>
<td class="mono"><?= h((string)$row['client_hash']) ?></td>
<td><a href="visit.php?id=<?= (int)$row['id'] ?>&token=<?= h((string)($_GET['token'] ?? '')) ?>">open</a></td>
</tr>
<?php endforeach; ?>
</tbody></table></div></body></html>
