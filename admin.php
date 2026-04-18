<?php
declare(strict_types=1);
require __DIR__ . '/inc/db.php';
require __DIR__ . '/inc/util.php';
require_admin();

$pdo = db();

$total        = (int)$pdo->query('SELECT COUNT(*) FROM visits')->fetchColumn();
$uniqueIps    = (int)$pdo->query('SELECT COUNT(DISTINCT ip) FROM visits')->fetchColumn();
$uniqueHashes = (int)$pdo->query("SELECT COUNT(DISTINCT client_hash) FROM visits WHERE client_hash IS NOT NULL AND client_hash != ''")->fetchColumn();
$todayCount   = (int)$pdo->query("SELECT COUNT(*) FROM visits WHERE date(created_at) = date('now')")->fetchColumn();
$highRisk     = (int)$pdo->query("SELECT COUNT(*) FROM visits WHERE risk_level = 'red'")->fetchColumn();
$avgScore     = (int)round((float)$pdo->query("SELECT COALESCE(AVG(privacy_score),0) FROM visits WHERE privacy_score IS NOT NULL")->fetchColumn());

// Chart: visits per day for last 14 days
$chartRows = $pdo->query(
    "SELECT date(created_at) as day, COUNT(*) as cnt,
            COALESCE(CAST(AVG(CASE WHEN privacy_score IS NOT NULL THEN privacy_score END) AS INTEGER),0) as avg_score
     FROM visits WHERE created_at >= datetime('now','-14 days')
     GROUP BY day ORDER BY day ASC"
)->fetchAll();

$chartByDay = [];
for ($i = 13; $i >= 0; $i--) {
    $d = date('Y-m-d', strtotime("-{$i} days"));
    $chartByDay[$d] = ['cnt' => 0, 'avg_score' => 0];
}
foreach ($chartRows as $r) {
    $chartByDay[$r['day']] = ['cnt' => (int)$r['cnt'], 'avg_score' => (int)$r['avg_score']];
}
$chartJson = json_encode(array_map(
    fn($d, $v) => ['day' => substr($d, 5), 'cnt' => $v['cnt'], 'avg_score' => $v['avg_score']],
    array_keys($chartByDay), $chartByDay
));

$rows = $pdo->query('SELECT * FROM visits ORDER BY created_at DESC LIMIT 200')->fetchAll();
$tok  = h((string)($_GET['token'] ?? ''));
?><!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>My-IP Admin</title>
<style>
:root{--bg:#07111f;--bg2:#0c172a;--line:rgba(255,255,255,.09);--text:#ebf2ff;--muted:#94a9c9;--accent:#68aaff;--red:#ff6b6b;--yellow:#ffd166;--green:#7cf29a;--sans:Inter,system-ui,sans-serif;--mono:ui-monospace,monospace}
*{box-sizing:border-box}body{margin:0;font-family:var(--sans);color:var(--text);background:radial-gradient(900px 600px at 5% 0%,rgba(104,170,255,.12),transparent 60%),linear-gradient(180deg,var(--bg),var(--bg2));min-height:100vh;padding-bottom:48px}
a{color:var(--accent);text-decoration:none}a:hover{text-decoration:underline}
.wrap{max-width:1400px;margin:0 auto;padding:24px 18px}
/* Header */
.admin-header{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:28px;padding:18px 24px;background:rgba(255,255,255,.03);border:1px solid var(--line);border-radius:20px}
.admin-logo{font-size:19px;font-weight:700;letter-spacing:-.02em;color:var(--text)}.admin-logo span{color:var(--accent)}
.admin-nav{display:flex;gap:8px;flex-wrap:wrap}.admin-nav a{padding:7px 13px;border-radius:11px;border:1px solid var(--line);background:rgba(255,255,255,.04);font-size:13px;color:var(--text)}.admin-nav a:hover{background:rgba(255,255,255,.09);text-decoration:none}
/* Stat cards */
.stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:13px;margin-bottom:22px}
.stat-card{background:rgba(255,255,255,.03);border:1px solid var(--line);border-radius:18px;padding:18px 20px;transition:background .2s}.stat-card:hover{background:rgba(255,255,255,.05)}
.sc-label{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.1em;margin-bottom:8px}
.sc-value{font-size:30px;font-weight:700;line-height:1}.sc-sub{font-size:12px;color:var(--muted);margin-top:4px}
.sc-blue .sc-value{color:var(--accent)}.sc-green .sc-value{color:var(--green)}.sc-yellow .sc-value{color:var(--yellow)}.sc-red .sc-value{color:var(--red)}
/* Chart */
.chart-card{background:rgba(255,255,255,.03);border:1px solid var(--line);border-radius:18px;padding:20px 22px;margin-bottom:22px}
.chart-title{font-size:16px;font-weight:600;margin:0 0 14px}
/* Table */
.table-card{background:rgba(255,255,255,.03);border:1px solid var(--line);border-radius:18px;overflow:hidden}
.table-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:18px 22px 14px;border-bottom:1px solid var(--line)}
.table-head h2{margin:0;font-size:16px;font-weight:600}
.tbl-actions{display:flex;gap:8px}.tbl-actions a{padding:6px 12px;border-radius:10px;border:1px solid var(--line);background:rgba(255,255,255,.04);font-size:12px;color:var(--text)}.tbl-actions a:hover{background:rgba(255,255,255,.09);text-decoration:none}
.tbl-scroll{overflow-x:auto}
table{width:100%;border-collapse:collapse;font-size:13.5px}th,td{padding:11px 14px;border-bottom:1px solid var(--line);vertical-align:middle;text-align:left}th{color:var(--muted);font-weight:500;font-size:11px;text-transform:uppercase;letter-spacing:.06em;background:rgba(255,255,255,.015)}tr:last-child td{border-bottom:0}tr:hover td{background:rgba(255,255,255,.025)}
.mono{font-family:var(--mono)}
.risk-badge{display:inline-block;padding:4px 9px;border-radius:999px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.04em}
.risk-badge.red{background:rgba(255,107,107,.15);color:var(--red);border:1px solid rgba(255,107,107,.3)}
.risk-badge.yellow{background:rgba(255,209,102,.12);color:var(--yellow);border:1px solid rgba(255,209,102,.25)}
.risk-badge.green{background:rgba(124,242,154,.1);color:var(--green);border:1px solid rgba(124,242,154,.2)}
.risk-badge.unknown{background:rgba(255,255,255,.06);color:var(--muted);border:1px solid var(--line)}
.score-chip{display:inline-block;padding:3px 9px;border-radius:999px;font-size:12px;font-weight:600;border:1px solid var(--line);background:rgba(255,255,255,.04)}
.open-link{padding:5px 10px;border-radius:9px;border:1px solid var(--line);background:rgba(255,255,255,.05);font-size:12px;color:var(--accent)}.open-link:hover{background:rgba(255,255,255,.09);text-decoration:none}
</style>
</head>
<body>
<div class="wrap">
  <header class="admin-header">
    <div class="admin-logo">KLEVA <span>Admin</span></div>
    <nav class="admin-nav">
      <a href="export.php?token=<?= $tok ?>&format=json">Экспорт JSON</a>
      <a href="export.php?token=<?= $tok ?>&format=csv">Экспорт CSV</a>
      <a href="index.php">← Главная</a>
    </nav>
  </header>

  <div class="stats-grid">
    <div class="stat-card sc-blue">
      <div class="sc-label">Всего визитов</div>
      <div class="sc-value"><?= $total ?></div>
    </div>
    <div class="stat-card">
      <div class="sc-label">Сегодня</div>
      <div class="sc-value"><?= $todayCount ?></div>
    </div>
    <div class="stat-card sc-green">
      <div class="sc-label">Уникальных IP</div>
      <div class="sc-value"><?= $uniqueIps ?></div>
    </div>
    <div class="stat-card sc-yellow">
      <div class="sc-label">Ср. score</div>
      <div class="sc-value"><?= $avgScore ?></div>
      <div class="sc-sub">из 100</div>
    </div>
    <div class="stat-card sc-red">
      <div class="sc-label">Высокий риск</div>
      <div class="sc-value"><?= $highRisk ?></div>
      <div class="sc-sub">red level</div>
    </div>
    <div class="stat-card">
      <div class="sc-label">Уник. fp hash</div>
      <div class="sc-value"><?= $uniqueHashes ?></div>
    </div>
  </div>

  <div class="chart-card">
    <p class="chart-title">Визиты за последние 14 дней</p>
    <canvas id="admin-chart" style="width:100%;height:130px;display:block"></canvas>
  </div>

  <div class="table-card">
    <div class="table-head">
      <h2>Последние визиты <span style="color:var(--muted);font-size:13px;font-weight:400">(<?= count($rows) ?> из <?= $total ?>)</span></h2>
      <div class="tbl-actions">
        <a href="export.php?token=<?= $tok ?>&format=json">JSON</a>
        <a href="export.php?token=<?= $tok ?>&format=csv">CSV</a>
      </div>
    </div>
    <div class="tbl-scroll">
    <table>
      <thead>
        <tr>
          <th>#</th><th>Время</th><th>IP</th><th>Гео</th><th>Org / ASN</th><th>Risk</th><th>Score</th><th>Hash</th><th></th>
        </tr>
      </thead>
      <tbody>
<?php foreach ($rows as $row):
    $riskClass = match((string)($row['risk_level'] ?? '')) {
        'red' => 'red', 'yellow' => 'yellow', 'green' => 'green', default => 'unknown'
    };
    $vpn = (string)($row['vpn_hosting_risk'] ?: $row['risk_level'] ?: '—');
    $scoreVal = $row['privacy_score'] !== null ? (int)$row['privacy_score'] : null;
    $scoreColor = $scoreVal === null ? '' : ($scoreVal >= 80 ? 'color:var(--green)' : ($scoreVal >= 55 ? 'color:var(--yellow)' : 'color:var(--red)'));
?>
        <tr>
          <td style="color:var(--muted);font-size:12px"><?= (int)$row['id'] ?></td>
          <td class="mono" style="font-size:12px;color:var(--muted);white-space:nowrap"><?= h(substr((string)$row['created_at'], 0, 19)) ?></td>
          <td class="mono"><?= h((string)$row['ip']) ?><?php if ($row['reverse_dns']): ?><br><small style="color:var(--muted);font-size:11px"><?= h((string)$row['reverse_dns']) ?></small><?php endif; ?></td>
          <td><?= h(trim(($row['geo_country'] ?: '') . ' ' . ($row['geo_city'] ?: ''))) ?: '—' ?></td>
          <td style="max-width:170px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="<?= h((string)$row['as_org']) ?>"><?= h(trim(($row['asn'] ? 'AS' . $row['asn'] . ' ' : '') . ($row['as_org'] ?: ''))) ?: '—' ?></td>
          <td><span class="risk-badge <?= $riskClass ?>"><?= h($vpn) ?></span></td>
          <td><span class="score-chip" style="<?= $scoreColor ?>"><?= $scoreVal !== null ? $scoreVal : '—' ?></span></td>
          <td class="mono" style="font-size:11px;color:var(--muted)"><?= $row['client_hash'] ? h(substr((string)$row['client_hash'], 0, 12)) . '…' : '—' ?></td>
          <td><a href="visit.php?id=<?= (int)$row['id'] ?>&token=<?= $tok ?>" class="open-link">open</a></td>
        </tr>
<?php endforeach; ?>
      </tbody>
    </table>
    </div>
  </div>
</div>

<script>
(function () {
  const data = <?= $chartJson ?>;
  const canvas = document.getElementById('admin-chart');
  if (!canvas || !data.length) return;
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.offsetWidth || 700;
  const H = 130;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  const maxCnt = Math.max(...data.map(d => d.cnt), 1);
  const pL = 4, pR = 4, pT = 16, pB = 34;
  const uw = W - pL - pR, uh = H - pT - pB;
  const bw = uw / data.length;
  const gap = Math.max(2, bw * 0.2);
  // Grid
  ctx.strokeStyle = 'rgba(255,255,255,.06)';
  ctx.lineWidth = 1;
  for (let g = 0; g <= 4; g++) {
    const y = pT + uh * (1 - g / 4);
    ctx.beginPath(); ctx.moveTo(pL, y); ctx.lineTo(W - pR, y); ctx.stroke();
  }
  data.forEach((d, i) => {
    const x = pL + i * bw + gap / 2;
    const bW = bw - gap;
    const bH = d.cnt > 0 ? Math.max(4, (d.cnt / maxCnt) * uh) : 2;
    const y = pT + uh - bH;
    ctx.fillStyle = d.cnt === 0 ? 'rgba(255,255,255,.06)' :
                    d.avg_score >= 80 ? 'rgba(124,242,154,.55)' :
                    d.avg_score >= 55 ? 'rgba(255,209,102,.55)' : 'rgba(255,107,107,.55)';
    const r = Math.min(5, bW / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + bW - r, y);
    ctx.quadraticCurveTo(x + bW, y, x + bW, y + r);
    ctx.lineTo(x + bW, y + bH); ctx.lineTo(x, y + bH);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath(); ctx.fill();
    if (d.cnt > 0) {
      ctx.fillStyle = 'rgba(255,255,255,.8)';
      ctx.font = `bold ${Math.max(9, Math.min(12, bW * 0.5))}px Inter,system-ui,sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(d.cnt, x + bW / 2, y - 4);
    }
    ctx.fillStyle = 'rgba(255,255,255,.38)';
    ctx.font = `${Math.max(9, Math.min(11, bW * 0.45))}px Inter,system-ui,sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(d.day, x + bW / 2, H - pB + 16);
  });
})();
</script>
</body>
</html>
