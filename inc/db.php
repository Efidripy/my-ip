<?php
declare(strict_types=1);

function app_config(): array {
    static $cfg = null;
    if ($cfg === null) {
        $cfg = require __DIR__ . '/config.php';
    }
    return $cfg;
}

function db(): PDO {
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $cfg = app_config();
    $dir = dirname($cfg['db_path']);
    if (!is_dir($dir)) {
        mkdir($dir, 0775, true);
    }

    $pdo = new PDO('sqlite:' . $cfg['db_path']);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    $pdo->exec('PRAGMA journal_mode=WAL;');
    $pdo->exec('PRAGMA synchronous=NORMAL;');

    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS visits (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            ip TEXT,
            reverse_dns TEXT,
            x_real_ip TEXT,
            x_forwarded_for TEXT,
            scheme TEXT,
            http_version TEXT,
            accept_language TEXT,
            dnt TEXT,
            user_agent TEXT,
            referer_present INTEGER DEFAULT 0,
            origin_present INTEGER DEFAULT 0,
            sec_ch_ua_present INTEGER DEFAULT 0,
            sec_ch_ua TEXT,
            geo_country TEXT,
            geo_city TEXT,
            geo_region TEXT,
            geo_timezone TEXT,
            asn TEXT,
            as_org TEXT,
            vpn_hosting_risk TEXT,
            vpn_hosting_reason TEXT,
            is_tor INTEGER DEFAULT 0,
            client_json TEXT,
            client_hash TEXT,
            privacy_score INTEGER,
            risk_level TEXT,
            vpn_reason TEXT
        );'
    );

    $pdo->exec('CREATE INDEX IF NOT EXISTS idx_visits_created_at ON visits(created_at DESC);');
    $pdo->exec('CREATE INDEX IF NOT EXISTS idx_visits_ip ON visits(ip);');
    $pdo->exec('CREATE INDEX IF NOT EXISTS idx_visits_hash ON visits(client_hash);');

    // Migrations for existing databases — each ALTER TABLE is silently skipped if column already exists
    $migrations = [
        'ALTER TABLE visits ADD COLUMN x_real_ip TEXT',
        'ALTER TABLE visits ADD COLUMN referer_present INTEGER DEFAULT 0',
        'ALTER TABLE visits ADD COLUMN origin_present INTEGER DEFAULT 0',
        'ALTER TABLE visits ADD COLUMN sec_ch_ua_present INTEGER DEFAULT 0',
        'ALTER TABLE visits ADD COLUMN sec_ch_ua TEXT',
        'ALTER TABLE visits ADD COLUMN geo_region TEXT',
        'ALTER TABLE visits ADD COLUMN geo_timezone TEXT',
        'ALTER TABLE visits ADD COLUMN asn TEXT',
        'ALTER TABLE visits ADD COLUMN as_org TEXT',
        'ALTER TABLE visits ADD COLUMN vpn_hosting_risk TEXT',
        'ALTER TABLE visits ADD COLUMN vpn_hosting_reason TEXT',
        'ALTER TABLE visits ADD COLUMN is_tor INTEGER DEFAULT 0',
        'ALTER TABLE visits ADD COLUMN client_json TEXT',
        'ALTER TABLE visits ADD COLUMN client_hash TEXT',
        'ALTER TABLE visits ADD COLUMN privacy_score INTEGER',
        'ALTER TABLE visits ADD COLUMN risk_level TEXT',
        'ALTER TABLE visits ADD COLUMN vpn_reason TEXT',
    ];
    foreach ($migrations as $sql) {
        try { $pdo->exec($sql); } catch (Throwable) {}
    }

    return $pdo;
}

function cleanup_old_rows(): void {
    $cfg = app_config();
    $max = (int)($cfg['max_log_rows'] ?? 5000);
    $pdo = db();
    $count = (int)$pdo->query('SELECT COUNT(*) FROM visits')->fetchColumn();
    if ($count <= $max) return;
    $toDelete = $count - $max;
    $stmt = $pdo->prepare('DELETE FROM visits WHERE id IN (SELECT id FROM visits ORDER BY created_at ASC LIMIT :limit)');
    $stmt->bindValue(':limit', $toDelete, PDO::PARAM_INT);
    $stmt->execute();
}
