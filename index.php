<?php declare(strict_types=1); require __DIR__ . '/inc/db.php'; ?>
<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>KLEVA My-IP PRO</title>
  <link rel="icon" href="data:,">
  <link rel="stylesheet" href="assets/style.css?v=7">
  <script defer src="assets/app.js?v=7"></script>
</head>
<body>
  <div class="bg-glow"></div>
  <main class="wrap">
    <header class="hero-head glass">
      <div>
        <div class="eyebrow">KLEVA • client-only intelligence</div>
        <h1>My IP • Privacy • Fingerprint</h1>
        <p>Показываем только то, что сайты и трекеры видят о посетителе. Без данных о сервере.</p>
      </div>
      <div class="hero-pills">
        <div class="pill"><span class="dot" id="status-dot"></span> <span id="api-status">Загрузка…</span></div>
        <div class="pill">Обновлено: <span id="updated-at">—</span></div>
      </div>
    </header>

    <div id="prev-visit-banner" class="prev-visit-banner" style="display:none"></div>

    <section class="grid">
      <div class="left-col">
        <section class="card glass summary-card">
          <div class="card-head">
            <div>
              <h2>Сводка соединения</h2>
              <p>Главные признаки, которые выдают посетителя наружу.</p>
            </div>
            <span class="pill subtle">client-side + server-side</span>
          </div>

          <div class="summary-grid">
            <div class="big-panel">
              <div class="mini-label">Основной IP клиента</div>
              <div class="ip-big mono" id="main-ip">Загрузка…</div>
              <div class="mini-stats">
                <div class="mini-box"><span>Страна</span><strong id="geo-country">—</strong></div>
                <div class="mini-box"><span>Город</span><strong id="geo-city">—</strong></div>
                <div class="mini-box"><span>ASN / Org</span><strong id="geo-asn">—</strong></div>
              </div>
              <div class="chip-row">
                <span class="chip" id="chip-browser">Браузер: …</span>
                <span class="chip" id="chip-os">OS: …</span>
                <span class="chip" id="chip-device">Устройство: …</span>
                <span class="chip" id="chip-engine">Движок: …</span>
                <span class="chip" id="chip-lang">Язык: …</span>
                <span class="chip" id="chip-tz">TZ: …</span>
              </div>
            </div>

            <div class="side-panel">
              <div class="score-threat-row">
                <div class="stat-box score-stat">
                  <span>Privacy score</span>
                  <strong id="privacy-score">—</strong>
                </div>
                <div class="threat-indicator" id="threat-indicator">
                  <span class="threat-icon" id="threat-icon">—</span>
                  <div class="threat-text">
                    <div class="threat-label">Threat level</div>
                    <div class="threat-value" id="risk-level">—</div>
                  </div>
                </div>
              </div>
              <div class="scorebar"><span id="scorebar-fill"></span></div>
              <div class="sparkline-wrap">
                <div class="sparkline-label">История score</div>
                <canvas id="score-sparkline" class="sparkline" height="48"></canvas>
              </div>
              <div class="sub-stats-row">
                <div class="sub-stat"><span>VPN / hosting</span><strong id="vpn-risk">—</strong></div>
                <div class="sub-stat"><span>WebRTC</span><strong id="webrtc-status">—</strong></div>
              </div>
              <p class="muted" id="score-explain">Оцениваем, сколько данных посетитель светит обычному сайту и продвинутому трекеру.</p>
              <div class="actions">
                <button type="button" class="btn primary" id="refresh-btn">Обновить</button>
                <button type="button" class="btn" id="copy-btn">Скопировать JSON</button>
              </div>
            </div>
          </div>
        </section>

        <section class="card glass">
          <div class="card-head">
            <div>
              <h2>Что именно ты палишь наружу</h2>
              <p>Зелёный — слабый сигнал, жёлтый — заметный, красный — сильный.</p>
            </div>
          </div>
          <div class="leak-list" id="leak-list">
            <div class="empty">Собираем сигналы…</div>
          </div>
        </section>

        <section class="card glass">
          <div class="card-head">
            <div>
              <h2>Разбивка score</h2>
              <p>Что и сколько очков снизило твой privacy score.</p>
            </div>
          </div>
          <div class="breakdown-grid" id="breakdown-grid">
            <div class="empty">Анализируем…</div>
          </div>
        </section>

        <section class="card glass">
          <div class="card-head">
            <div>
              <h2>Подробные данные клиента</h2>
              <p>Только клиентские признаки, без адресов и параметров сервера.</p>
            </div>
          </div>
          <div class="kv-grid">
            <div class="kv"><span>IP</span><strong class="mono" id="kv-ip">—</strong></div>
            <div class="kv"><span>Reverse DNS</span><strong class="mono" id="kv-rdns">—</strong></div>
            <div class="kv"><span>X-Forwarded-For</span><strong class="mono" id="kv-xff">—</strong></div>
            <div class="kv"><span>X-Real-IP</span><strong class="mono" id="kv-xreal">—</strong></div>
            <div class="kv"><span>HTTPS</span><strong id="kv-https">—</strong></div>
            <div class="kv"><span>HTTP version</span><strong id="kv-http">—</strong></div>
            <div class="kv"><span>Accept-Language</span><strong id="kv-lang">—</strong></div>
            <div class="kv"><span>DNT</span><strong id="kv-dnt">—</strong></div>
            <div class="kv"><span>Referer present</span><strong id="kv-referer">—</strong></div>
            <div class="kv"><span>Origin present</span><strong id="kv-origin">—</strong></div>
            <div class="kv"><span>Client Hints present</span><strong id="kv-ch">—</strong></div>
            <div class="kv"><span>Гео timezone</span><strong id="kv-geo-tz">—</strong></div>
            <div class="kv"><span>ASN org</span><strong id="kv-org">—</strong></div>
            <div class="kv"><span>Tor</span><strong id="kv-tor">—</strong></div>
            <div class="kv"><span>DNSBL</span><strong id="kv-dnsbl">—</strong></div>
            <div class="kv"><span>Accept-Encoding</span><strong id="kv-accept-encoding">—</strong></div>
            <div class="kv"><span>Bogon в XFF</span><strong id="kv-bogon-xff">—</strong></div>
            <div class="kv"><span>Точность геолокации</span><strong id="kv-geo-accuracy">—</strong></div>
          </div>
        </section>

        <section class="card glass">
          <div class="card-head">
            <div>
              <h2>Риски по категориям</h2>
              <p>Вклад сетевых, браузерных, поведенческих и протокольных сигналов.</p>
            </div>
          </div>
          <div id="risk-cats" class="cat-container">
            <div class="empty">Анализируем…</div>
          </div>
        </section>

        <section class="card glass">
          <div class="card-head">
            <div>
              <h2>Дрифт параметров</h2>
              <p>Изменения fingerprint между текущим и прошлым визитом.</p>
            </div>
          </div>
          <div id="drift-list" class="drift-list">
            <div class="empty">Собираем…</div>
          </div>
        </section>

        <section class="card glass">
          <div class="card-head">
            <div>
              <h2>Рекомендации</h2>
              <p>Персональный чеклист с приоритетом влияния на приватность.</p>
            </div>
          </div>
          <div id="recs-list" class="recs-list">
            <div class="empty">Анализируем…</div>
          </div>
        </section>
      </div>

      <div class="right-col">
        <section class="card glass">
          <div class="card-head">
            <div>
              <h2>Browser / Fingerprint</h2>
              <p>Клиентские признаки, которые даёт сам браузер.</p>
            </div>
          </div>
          <div class="kv-grid">
            <div class="kv"><span>Browser</span><strong id="fp-browser">—</strong></div>
            <div class="kv"><span>OS</span><strong id="fp-os">—</strong></div>
            <div class="kv"><span>Device</span><strong id="fp-device">—</strong></div>
            <div class="kv"><span>Engine</span><strong id="fp-engine">—</strong></div>
            <div class="kv"><span>Language</span><strong id="fp-language">—</strong></div>
            <div class="kv"><span>Languages</span><strong id="fp-languages">—</strong></div>
            <div class="kv"><span>Timezone</span><strong id="fp-timezone">—</strong></div>
            <div class="kv"><span>Screen</span><strong id="fp-screen">—</strong></div>
            <div class="kv"><span>Viewport</span><strong id="fp-viewport">—</strong></div>
            <div class="kv"><span>DPR</span><strong id="fp-dpr">—</strong></div>
            <div class="kv"><span>CPU threads</span><strong id="fp-threads">—</strong></div>
            <div class="kv"><span>Device memory</span><strong id="fp-memory">—</strong></div>
            <div class="kv"><span>Color depth</span><strong id="fp-color">—</strong></div>
            <div class="kv"><span>Cookies</span><strong id="fp-cookies">—</strong></div>
            <div class="kv"><span>Touch</span><strong id="fp-touch">—</strong></div>
            <div class="kv"><span>WebDriver</span><strong id="fp-webdriver">—</strong></div>
            <div class="kv"><span>Canvas hash</span><strong class="mono" id="fp-canvas">—</strong></div>
            <div class="kv"><span>Audio hash</span><strong class="mono" id="fp-audio">—</strong></div>
            <div class="kv"><span>WebGL</span><strong id="fp-webgl">—</strong></div>
            <div class="kv"><span>Fingerprint hash</span><strong class="mono" id="fp-hash">—</strong></div>
            <div class="kv"><span>Incognito</span><strong id="fp-incognito">—</strong></div>
            <div class="kv"><span>Battery</span><strong id="fp-battery">—</strong></div>
            <div class="kv"><span>Network</span><strong id="fp-network">—</strong></div>
            <div class="kv"><span>System locale</span><strong id="fp-locale">—</strong></div>
            <div class="kv"><span>Fonts found</span><strong id="fp-fonts-count">—</strong></div>
            <div class="kv"><span>UA brands</span><strong id="fp-ua-brands">—</strong></div>
            <div class="kv"><span>Outer/Inner diff</span><strong id="fp-outer-diff">—</strong></div>
            <div class="kv"><span>Screen orientation</span><strong id="fp-orientation">—</strong></div>
            <div class="kv"><span>PDF viewer</span><strong id="fp-pdf-viewer">—</strong></div>
            <div class="kv"><span>OffscreenCanvas</span><strong id="fp-offscreen-canvas">—</strong></div>
            <div class="kv"><span>Max touch points</span><strong id="fp-max-touch">—</strong></div>
            <div class="kv"><span>DNT (JS)</span><strong id="fp-dnt-js">—</strong></div>
            <div class="kv"><span>CSS media</span><strong id="fp-css-media">—</strong></div>
            <div class="kv"><span>JS Heap</span><strong id="fp-perf-memory">—</strong></div>
            <div class="kv"><span>Clock resolution</span><strong id="fp-clock-res">—</strong></div>
            <div class="kv"><span>TZ offset</span><strong id="fp-tz-offset">—</strong></div>
            <div class="kv"><span>Media devices</span><strong id="fp-media-devices">—</strong></div>
            <div class="kv"><span>AudioContext</span><strong id="fp-audio-ctx">—</strong></div>
            <div class="kv"><span>Browser APIs</span><strong id="fp-browser-apis">—</strong></div>
          </div>
        </section>

        <section class="card glass">
          <div class="card-head">
            <div>
              <h2>WebRTC leak</h2>
              <p>Локальные / публичные адреса, которые может раскрыть браузер.</p>
            </div>
          </div>
          <div class="kv-grid">
            <div class="kv"><span>Status</span><strong id="webrtc-supported">—</strong></div>
            <div class="kv"><span>Local candidates</span><strong class="mono" id="webrtc-local">—</strong></div>
            <div class="kv"><span>Public candidates</span><strong class="mono" id="webrtc-public">—</strong></div>
            <div class="kv"><span>mDNS candidates</span><strong class="mono" id="webrtc-mdns">—</strong></div>
            <div class="kv"><span>Proxy ports</span><strong class="mono" id="webrtc-proxy-ports">—</strong></div>
          </div>
        </section>

        <section class="card glass">
          <div class="card-head">
            <div>
              <h2>UA-CH профиль</h2>
              <p>Высокоточные Client Hints и соответствие User-Agent.</p>
            </div>
            <span class="pill subtle" id="ua-ch-status">—</span>
          </div>
          <div class="kv-grid">
            <div class="kv"><span>Platform</span><strong id="ua-ch-platform">—</strong></div>
            <div class="kv"><span>Platform version</span><strong id="ua-ch-platformversion">—</strong></div>
            <div class="kv"><span>Architecture</span><strong id="ua-ch-architecture">—</strong></div>
            <div class="kv"><span>Bitness</span><strong id="ua-ch-bitness">—</strong></div>
            <div class="kv"><span>Mobile</span><strong id="ua-ch-mobile">—</strong></div>
            <div class="kv"><span>Model</span><strong id="ua-ch-model">—</strong></div>
            <div class="kv"><span>Full version</span><strong id="ua-ch-uafullversion">—</strong></div>
            <div class="kv"><span>Brand list</span><strong id="ua-ch-brands">—</strong></div>
            <div class="kv"><span>UA vs UA-CH</span><strong id="ua-ch-consistency">—</strong></div>
          </div>
        </section>

        <section class="card glass">
          <div class="card-head">
            <div>
              <h2>Разрешения браузера</h2>
              <p>Статус доступа к устройствам: granted / prompt / denied.</p>
            </div>
          </div>
          <div id="perms-grid" class="kv-grid">
            <div class="empty">Запрашиваем…</div>
          </div>
        </section>

        <section class="card glass">
          <div class="card-head">
            <div>
              <h2>Хранилища и Service Worker</h2>
              <p>Доступность cookies, localStorage, IndexedDB, SW, Cache API и квота.</p>
            </div>
          </div>
          <div class="kv-grid">
            <div class="kv"><span>Cookies</span><strong id="store-cookies">—</strong></div>
            <div class="kv"><span>localStorage</span><strong id="store-local">—</strong></div>
            <div class="kv"><span>sessionStorage</span><strong id="store-session">—</strong></div>
            <div class="kv"><span>IndexedDB</span><strong id="store-idb">—</strong></div>
            <div class="kv"><span>Квота хранилища</span><strong id="store-quota">—</strong></div>
            <div class="kv"><span>Service Worker</span><strong id="store-sw">—</strong></div>
            <div class="kv"><span>Cache API</span><strong id="store-cache">—</strong></div>
          </div>
        </section>

        <section class="card glass">
          <div class="card-head">
            <div>
              <h2>Network Privacy</h2>
              <p>GPC, AdBlock, Referrer-Policy, quality сети, IP стек.</p>
            </div>
          </div>
          <div class="kv-grid">
            <div class="kv"><span>GPC (сервер)</span><strong id="np-gpc-server">—</strong></div>
            <div class="kv"><span>GPC (JS)</span><strong id="np-gpc-js">—</strong></div>
            <div class="kv"><span>AdBlock</span><strong id="np-adblock">—</strong></div>
            <div class="kv"><span>Cookie test</span><strong id="np-cookie-test">—</strong></div>
            <div class="kv"><span>Referrer-Policy</span><strong id="np-referrer-policy">—</strong></div>
            <div class="kv"><span>IP стек</span><strong id="np-ip-version">—</strong></div>
            <div class="kv"><span>Network type</span><strong id="np-net-type">—</strong></div>
            <div class="kv"><span>RTT</span><strong id="np-net-rtt">—</strong></div>
            <div class="kv"><span>Downlink</span><strong id="np-net-downlink">—</strong></div>
            <div class="kv"><span>Save-Data</span><strong id="np-save-data">—</strong></div>
          </div>
        </section>

        <section class="card glass">
          <div class="card-head">
            <div>
              <h2>Request Context &amp; TLS</h2>
              <p>Sec-Fetch-* заголовки, TLS версия и протокол HTTP.</p>
            </div>
          </div>
          <div class="kv-grid">
            <div class="kv"><span>Sec-Fetch-Site</span><strong id="sf-site">—</strong></div>
            <div class="kv"><span>Sec-Fetch-Mode</span><strong id="sf-mode">—</strong></div>
            <div class="kv"><span>Sec-Fetch-Dest</span><strong id="sf-dest">—</strong></div>
            <div class="kv"><span>Sec-Fetch-User</span><strong id="sf-user">—</strong></div>
            <div class="kv"><span>Sec-GPC (сервер)</span><strong id="sf-gpc">—</strong></div>
            <div class="kv"><span>TLS версия</span><strong id="sf-tls">—</strong></div>
            <div class="kv"><span>TLS cipher</span><strong id="sf-cipher">—</strong></div>
            <div class="kv"><span>HTTP протокол</span><strong id="sf-http-proto">—</strong></div>
          </div>
        </section>

        <section class="card glass">
          <div class="card-head">
            <div>
              <h2>Заголовки безопасности</h2>
              <p>CSP, COOP, COEP и другие HTTP-заголовки ответа.</p>
            </div>
          </div>
          <div class="kv-grid">
            <div class="kv"><span>Content-Security-Policy</span><strong id="sec-csp">—</strong></div>
            <div class="kv"><span>Cross-Origin-Opener-Policy</span><strong id="sec-coop">—</strong></div>
            <div class="kv"><span>Cross-Origin-Embedder-Policy</span><strong id="sec-coep">—</strong></div>
            <div class="kv"><span>X-Frame-Options</span><strong id="sec-xfo">—</strong></div>
            <div class="kv"><span>Strict-Transport-Security</span><strong id="sec-hsts">—</strong></div>
          </div>
        </section>

        <section class="card glass">
          <div class="card-head">
            <div>
              <h2>Сравнение с эталоном</h2>
              <p>Сколько пунктов идеального privacy-профиля выполнено.</p>
            </div>
            <span class="pill subtle" id="compare-score">—</span>
          </div>
          <div id="compare-grid" class="compare-grid">
            <div class="empty">Анализируем…</div>
          </div>
        </section>

        <section class="card glass">
          <div class="card-head">
            <div>
              <h2>Сырые данные</h2>
              <p>JSON, который собрался на этой странице.</p>
            </div>
          </div>
          <pre id="raw-json" class="raw-box">Инициализация…</pre>
        </section>
      </div>
    </section>

    <section class="card glass export-card">
      <div class="card-head">
        <div>
          <h2>Экспорт отчёта</h2>
          <p>Скачать полный или краткий отчёт для самоаудита.</p>
        </div>
      </div>
      <div class="actions">
        <button type="button" class="btn primary" id="export-json-btn">⬇ Скачать JSON</button>
        <button type="button" class="btn" id="export-txt-btn">⬇ Скачать TXT</button>
      </div>
    </section>
  </main>
</body>
</html>
