<?php
declare(strict_types=1);
require __DIR__ . '/inc/db.php';
require __DIR__ . '/inc/util.php';
require_admin();
$id = (int)($_GET['id'] ?? 0);
$pdo = db();
$stmt = $pdo->prepare('SELECT * FROM visits WHERE id = :id LIMIT 1');
$stmt->execute([':id' => $id]);
$row = $stmt->fetch();
if (!$row) { http_response_code(404); exit('Not found'); }
?><!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Visit <?= (int)$row['id'] ?></title><style>body{margin:0;background:#0b1220;color:#fff;font-family:Inter,system-ui,sans-serif;padding:24px}.card{background:#111a2e;border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:18px;margin-bottom:18px}.mono{font-family:ui-monospace,monospace}pre{white-space:pre-wrap;word-break:break-word}</style></head><body>
<a href="admin.php?token=<?= h((string)($_GET['token'] ?? '')) ?>" style="color:#8dc3ff">← back</a>
<h1>Visit #<?= (int)$row['id'] ?></h1>
<div class="card"><pre><?= h(json_encode($row, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)) ?></pre></div>
<?php if (!empty($row['client_json'])): ?><div class="card"><h2>Client JSON</h2><pre><?= h((string)$row['client_json']) ?></pre></div><?php endif; ?>
</body></html>
