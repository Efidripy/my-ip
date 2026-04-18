const $ = (id) => document.getElementById(id);
let lastJSON = '';
let currentVisitId = null;

function txt(v) { return (v === undefined || v === null || v === '') ? '—' : String(v); }
function setText(id, value) { const el = $(id); if (el) el.textContent = txt(value); }
function renderLevelText(id, cssClass, label) {
  const el = $(id);
  if (!el) return;
  el.replaceChildren();
  const span = document.createElement('span');
  span.className = cssClass;
  span.textContent = label;
  el.appendChild(span);
}

function detectBrowser(ua='') {
  const s = ua.toLowerCase();
  if (s.includes('edg/')) return 'Microsoft Edge';
  if (s.includes('opr/') || s.includes('opera')) return 'Opera';
  if (s.includes('chrome/') && !s.includes('edg/') && !s.includes('opr/')) return 'Google Chrome';
  if (s.includes('firefox/')) return 'Mozilla Firefox';
  if (s.includes('safari/') && !s.includes('chrome/')) return 'Safari';
  return 'Unknown';
}
function detectOS(ua='') {
  const s = ua.toLowerCase();
  if (s.includes('windows nt')) return 'Windows';
  if (s.includes('android')) return 'Android';
  if (s.includes('iphone') || s.includes('ipad') || s.includes('ipod')) return 'iOS';
  if (s.includes('mac os x') || s.includes('macintosh')) return 'macOS';
  if (s.includes('linux')) return 'Linux';
  return 'Unknown';
}
function detectDevice(ua='') {
  const s = ua.toLowerCase();
  if (s.includes('ipad') || s.includes('tablet')) return 'Планшет';
  if (s.includes('mobile') || s.includes('iphone') || s.includes('android')) return 'Мобильное';
  return 'Десктоп';
}
function detectEngine(ua='') {
  const s = ua.toLowerCase();
  if ((s.includes('chrome') || s.includes('edg') || s.includes('opr')) && s.includes('safari')) return 'Blink';
  if (s.includes('firefox')) return 'Gecko';
  if (s.includes('safari') && !s.includes('chrome')) return 'WebKit';
  return 'Unknown';
}

async function sha256(text) {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2,'0')).join('').slice(0, 24);
}

function canvasHash() {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 280; canvas.height = 60;
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '16px Arial';
    ctx.fillStyle = '#f60'; ctx.fillRect(10, 10, 120, 30);
    ctx.fillStyle = '#069'; ctx.fillText('KLEVA canvas fp', 14, 18);
    return canvas.toDataURL();
  } catch { return 'unsupported'; }
}

async function audioHash() {
  try {
    const Ctx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!Ctx) return 'unsupported';
    const ctx = new Ctx(1, 44100, 44100);
    const osc = ctx.createOscillator();
    osc.type = 'triangle'; osc.frequency.value = 1000;
    const comp = ctx.createDynamicsCompressor();
    osc.connect(comp); comp.connect(ctx.destination); osc.start(0);
    const rendered = await ctx.startRendering();
    const data = rendered.getChannelData(0).slice(4500, 4600);
    return Array.from(data).reduce((a,b)=>a+b,0).toFixed(6);
  } catch { return 'unsupported'; }
}

function getWebGLInfo() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return 'unsupported';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    if (!ext) return 'available';
    const vendor = gl.getParameter(ext.UNMASKED_VENDOR_WEBGL);
    const renderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
    return `${vendor} / ${renderer}`;
  } catch { return 'unsupported'; }
}

async function detectWebRTC() {
  const result = { supported: false, local: [], public: [], mdns: [] };
  const RTCPeer = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
  if (!RTCPeer) return result;
  result.supported = true;
  return new Promise(async (resolve) => {
    const ips = new Set(), mdns = new Set();
    try {
      const pc = new RTCPeer({ iceServers: [] });
      pc.createDataChannel('x');
      pc.onicecandidate = (e) => {
        if (!e.candidate || !e.candidate.candidate) return;
        const cand = e.candidate.candidate;
        const m = cand.match(/([0-9]{1,3}(?:\.[0-9]{1,3}){3}|[a-f0-9:]+|[a-z0-9-]+\.local)/i);
        if (!m) return;
        const v = m[1];
        if (v.endsWith('.local')) mdns.add(v); else ips.add(v);
      };
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      setTimeout(() => {
        for (const ip of ips) {
          if (/^10\.|^192\.168\.|^172\.(1[6-9]|2\d|3[0-1])\.|^127\.|^169\.254\./.test(ip) || ip === '::1' || ip.startsWith('fe80:') || ip.startsWith('fc') || ip.startsWith('fd')) result.local.push(ip); else result.public.push(ip);
        }
        result.mdns = [...mdns];
        try { pc.close(); } catch {}
        resolve(result);
      }, 1800);
    } catch { resolve(result); }
  });
}

async function collectClientSignals() {
  const ua = navigator.userAgent || '';
  const canvas = canvasHash();
  const audio = await audioHash();
  const webgl = getWebGLInfo();
  const webrtc = await detectWebRTC();
  const client = {
    user_agent: ua,
    browser: detectBrowser(ua),
    os: detectOS(ua),
    device: detectDevice(ua),
    engine: detectEngine(ua),
    language: navigator.language || '',
    languages: navigator.languages || [],
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
    screen: `${screen.width} × ${screen.height}`,
    viewport: `${window.innerWidth} × ${window.innerHeight}`,
    dpr: window.devicePixelRatio || 1,
    hardware_concurrency: navigator.hardwareConcurrency || null,
    device_memory: navigator.deviceMemory || null,
    color_depth: screen.colorDepth || null,
    cookie_enabled: !!navigator.cookieEnabled,
    touch: ('ontouchstart' in window || navigator.maxTouchPoints > 0),
    webdriver: !!navigator.webdriver,
    canvas_hash: await sha256(canvas),
    audio_hash: await sha256(String(audio)),
    webgl,
    webrtc,
  };
  const fpSource = JSON.stringify([client.browser, client.os, client.device, client.engine, client.language, client.languages, client.timezone, client.screen, client.viewport, client.dpr, client.hardware_concurrency, client.device_memory, client.color_depth, client.canvas_hash, client.audio_hash, client.webgl]);
  client.fingerprint_hash = await sha256(fpSource);
  return client;
}

function badgeNode(level) {
  const span = document.createElement('span');
  span.className = `badge ${level}`;
  span.textContent = level === 'red' ? 'красный' : level === 'yellow' ? 'жёлтый' : 'зелёный';
  return span;
}
function textClass(level) { return level === 'red' ? 'red-text' : level === 'yellow' ? 'yellow-text' : 'green-text'; }

function buildLeakItems(server, client) {
  const leaks = [];
  leaks.push({ title: 'IP-адрес', value: server.ip, level: 'red', why: 'Любой сайт видит твой публичный IP и может связать его с сетью, регионом и историей активности.' });
  if (server.reverse_dns) leaks.push({ title: 'Reverse DNS', value: server.reverse_dns, level: 'yellow', why: 'По reverse DNS нередко видно провайдера, тип сети или хостинг.' });
  if (server.accept_language) leaks.push({ title: 'Языки браузера', value: server.accept_language, level: 'yellow', why: 'Язык помогает сузить профиль пользователя и страну/регион.' });
  if (server.x_forwarded_for) leaks.push({ title: 'X-Forwarded-For', value: server.x_forwarded_for, level: 'yellow', why: 'Если есть прокси-цепочка, сайт может увидеть дополнительные адреса.' });
  if (server.x_real_ip) leaks.push({ title: 'X-Real-IP', value: server.x_real_ip, level: 'yellow', why: 'Прокси может пробрасывать исходный IP клиента отдельным заголовком.' });
  if (client.webrtc.public.length) leaks.push({ title: 'WebRTC public leak', value: client.webrtc.public.join(', '), level: 'red', why: 'Браузер раскрыл публичные адреса через WebRTC.' });
  else if (client.webrtc.local.length || client.webrtc.mdns.length) leaks.push({ title: 'WebRTC local leak', value: [...client.webrtc.local, ...client.webrtc.mdns].join(', '), level: 'yellow', why: 'WebRTC раскрыл локальные или mDNS-кандидаты.' });
  if (client.canvas_hash && client.canvas_hash !== 'unsupported') leaks.push({ title: 'Canvas fingerprint', value: client.canvas_hash, level: 'yellow', why: 'Canvas помогает строить стабильный browser fingerprint.' });
  if (client.audio_hash && client.audio_hash !== 'unsupported') leaks.push({ title: 'Audio fingerprint', value: client.audio_hash, level: 'yellow', why: 'Audio stack даёт ещё один стабильный сигнал для отпечатка.' });
  if (client.webgl && client.webgl !== 'unsupported') leaks.push({ title: 'WebGL renderer', value: client.webgl, level: 'yellow', why: 'GPU/vendor часто достаточно уникальны для трекинга.' });
  if (client.webdriver) leaks.push({ title: 'WebDriver', value: 'true', level: 'red', why: 'Флаг webdriver часто говорит о браузерной автоматизации.' });
  if (server.is_tor) leaks.push({ title: 'Tor exit node', value: 'detected', level: 'yellow', why: 'IP найден в локальном списке Tor exit nodes.' });
  if (server.vpn_hosting_risk === 'medium' || server.vpn_hosting_risk === 'high') leaks.push({ title: 'Hosting/VPN heuristics', value: server.vpn_hosting_reason, level: server.vpn_hosting_risk === 'high' ? 'red' : 'yellow', why: 'ASN или rDNS похожи на датацентр, VPS, VPN или прокси.' });
  return leaks;
}

function calculateScore(server, client, leaks) {
  return calculateScoreBreakdown(server, client, leaks).score;
}

function calculateScoreBreakdown(server, client, leaks) {
  const items = [];
  let score = 100;
  for (const l of leaks) {
    const pts = l.level === 'red' ? 18 : l.level === 'yellow' ? 8 : 2;
    score -= pts;
    items.push({ name: l.title, deduction: pts, level: l.level });
  }
  const extras = [
    { check: !server.dnt,                                    name: 'Нет DNT заголовка',      pts: 4 },
    { check: client.cookie_enabled,                          name: 'Cookies включены',        pts: 4 },
    { check: server.referer_present,                         name: 'Referer заголовок',       pts: 5 },
    { check: server.origin_present,                          name: 'Origin заголовок',        pts: 4 },
    { check: server.sec_ch_ua_present,                       name: 'Client Hints',            pts: 3 },
    { check: (client.languages?.length ?? 0) > MAX_SAFE_LANGUAGES,
      name: `Много языков (${client.languages?.length ?? 0})`, pts: 3 },
  ];
  for (const e of extras) {
    if (e.check) { score -= e.pts; items.push({ name: e.name, deduction: e.pts, level: 'yellow' }); }
  }
  return { score: Math.max(0, Math.min(100, score)), items };
}

// Constants
const MAX_SAFE_LANGUAGES = 2;
const BREAKDOWN_BAR_SCALE = 5.5;
const MAX_SCORE_HISTORY = 20;
function renderBreakdown(items) {
  const grid = $('breakdown-grid');
  if (!grid) return;
  grid.replaceChildren();
  if (!items.length) {
    const el = document.createElement('div');
    el.className = 'empty';
    el.textContent = 'Нет факторов снижения.';
    grid.appendChild(el);
    return;
  }
  items.forEach((item, i) => {
    const card = document.createElement('div');
    card.className = 'bd-item';
    card.style.animationDelay = `${i * 35}ms`;

    const name = document.createElement('div');
    name.className = 'bd-name';
    name.textContent = item.name;

    const cls = item.level === 'red' ? 'danger' : item.level === 'green' ? 'safe' : 'warn';
    const pts = document.createElement('div');
    pts.className = `bd-pts ${cls}`;
    pts.textContent = `−${item.deduction}`;

    const bar = document.createElement('div');
    bar.className = 'bd-mini-bar';
    const fill = document.createElement('span');
    fill.className = cls;
    fill.style.width = `${Math.min(100, item.deduction * BREAKDOWN_BAR_SCALE)}%`;
    bar.appendChild(fill);

    card.appendChild(name);
    card.appendChild(pts);
    card.appendChild(bar);
    grid.appendChild(card);
  });
}

// --- Score count-up animation ---
function animateCountUp(elementId, target, duration = 750) {
  const el = $(elementId);
  if (!el) return;
  const t0 = performance.now();
  const step = (now) => {
    const p = Math.min(1, (now - t0) / duration);
    const e = 1 - Math.pow(1 - p, 3);
    el.textContent = `${Math.round(target * e)}/100`;
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// --- Sparkline / score history ---
const _HIST_KEY = 'myip_score_hist';
function _saveHist(score) {
  const h = _getHist();
  h.push(score);
  if (h.length > MAX_SCORE_HISTORY) h.splice(0, h.length - MAX_SCORE_HISTORY);
  try { localStorage.setItem(_HIST_KEY, JSON.stringify(h)); } catch {}
}
function _getHist() {
  try { return JSON.parse(localStorage.getItem(_HIST_KEY) || '[]'); } catch { return []; }
}
function renderSparkline(canvasId, scores) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !canvas.getContext) {
    if (canvas) canvas.style.display = 'none';
    return;
  }
  const ctx2d = canvas.getContext('2d');
  if (!ctx2d) {
    canvas.style.display = 'none';
    return;
  }
  if (scores.length < 2) { canvas.style.display = 'none'; return; }
  canvas.style.display = 'block';
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.offsetWidth || 220;
  const H = 48;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx2d.scale(dpr, dpr);
  ctx2d.clearRect(0, 0, W, H);
  const ctx = ctx2d;
  const pad = 5;
  const uw = W - pad * 2, uh = H - pad * 2;
  const pts = scores.map((s, i) => [pad + (i / (scores.length - 1)) * uw, pad + (1 - s / 100) * uh]);
  // Fill area
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    const mx = (pts[i - 1][0] + pts[i][0]) / 2;
    ctx.bezierCurveTo(mx, pts[i - 1][1], mx, pts[i][1], pts[i][0], pts[i][1]);
  }
  ctx.lineTo(pts[pts.length - 1][0], H);
  ctx.lineTo(pts[0][0], H);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, 'rgba(104,170,255,.28)');
  g.addColorStop(1, 'rgba(104,170,255,0)');
  ctx.fillStyle = g;
  ctx.fill();
  // Line
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    const mx = (pts[i - 1][0] + pts[i][0]) / 2;
    ctx.bezierCurveTo(mx, pts[i - 1][1], mx, pts[i][1], pts[i][0], pts[i][1]);
  }
  ctx.strokeStyle = 'rgba(104,170,255,.9)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Last dot
  const last = pts[pts.length - 1], ls = scores[scores.length - 1];
  ctx.beginPath();
  ctx.arc(last[0], last[1], 3, 0, Math.PI * 2);
  ctx.fillStyle = ls >= 80 ? '#7cf29a' : ls >= 55 ? '#ffd166' : '#ff6b6b';
  ctx.fill();
}

function explainScore(score) {
  if (score >= 80) return 'Профиль относительно аккуратный: сигналы есть, но без жёстких утечек.';
  if (score >= 55) return 'Средний уровень палевности: обычный сайт и трекер увидят о тебе уже довольно много.';
  return 'Шумный профиль: адрес, fingerprint и дополнительные сигналы делают тебя хорошо различимым.';
}

function fillSummary(server, client, leaks, score, risk, breakdownItems) {
  setText('main-ip', server.ip);
  setText('geo-country', server.country || '—');
  setText('geo-city', [server.city, server.region].filter(Boolean).join(', ') || '—');
  setText('geo-asn', [server.asn ? 'AS' + server.asn : '', server.as_org].filter(Boolean).join(' • ') || '—');

  // Animated score count-up
  animateCountUp('privacy-score', score);

  // Threat indicator
  const threatEl = $('threat-indicator');
  if (threatEl) {
    threatEl.className = `threat-indicator ${risk}`;
    const iconEl = $('threat-icon');
    if (iconEl) iconEl.textContent = risk === 'red' ? '🔴' : risk === 'yellow' ? '🟡' : '🟢';
  }
  const threatVal = $('risk-level');
  if (threatVal) {
    threatVal.textContent = risk === 'red' ? 'HIGH' : risk === 'yellow' ? 'MEDIUM' : 'LOW';
  }

  // VPN / WebRTC sub-stats via DOM (no innerHTML)
  renderLevelText('vpn-risk', textClass(server.vpn_hosting_risk === 'high' ? 'red' : server.vpn_hosting_risk === 'medium' ? 'yellow' : 'green'), txt(server.vpn_hosting_risk));
  renderLevelText('webrtc-status', textClass(client.webrtc.public.length ? 'red' : (client.webrtc.local.length || client.webrtc.mdns.length) ? 'yellow' : 'green'), client.webrtc.public.length ? 'public leak' : (client.webrtc.local.length || client.webrtc.mdns.length) ? 'local leak' : 'safe');

  // Scorebar — reset to 0, then animate to target
  const fill = $('scorebar-fill');
  if (fill) {
    fill.style.transition = 'none';
    fill.style.width = '0';
    fill.style.background = risk === 'red' ? 'linear-gradient(90deg,#ff6b6b,#ffd166)' : risk === 'yellow' ? 'linear-gradient(90deg,#ffd166,#68aaff)' : 'linear-gradient(90deg,#7cf29a,#68ffd5)';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        fill.style.transition = '';
        fill.style.width = `${score}%`;
      });
    });
  }

  setText('score-explain', explainScore(score));
  setText('chip-browser', `Браузер: ${client.browser}`);
  setText('chip-os', `OS: ${client.os}`);
  setText('chip-device', `Устройство: ${client.device}`);
  setText('chip-engine', `Движок: ${client.engine}`);
  setText('chip-lang', `Язык: ${client.language || '—'}`);
  setText('chip-tz', `TZ: ${client.timezone || '—'}`);
  setText('updated-at', new Date().toLocaleTimeString());

  // Leak list
  const box = $('leak-list');
  if (box) {
    box.replaceChildren();
    for (const item of leaks) {
      const article = document.createElement('article');
      article.className = 'leak-item';

      const top = document.createElement('div');
      top.className = 'leak-top';

      const title = document.createElement('strong');
      title.textContent = txt(item.title);
      top.appendChild(title);
      top.appendChild(badgeNode(item.level));

      const value = document.createElement('div');
      value.className = 'leak-value';
      value.textContent = txt(item.value);

      const why = document.createElement('div');
      why.className = 'muted';
      why.textContent = txt(item.why);

      article.appendChild(top);
      article.appendChild(value);
      article.appendChild(why);
      box.appendChild(article);
    }
  }

  // Score breakdown
  renderBreakdown(breakdownItems || []);

  // Sparkline
  _saveHist(score);
  renderSparkline('score-sparkline', _getHist());
}

function fillClientDetails(server, client) {
  setText('kv-ip', server.ip);
  setText('kv-rdns', server.reverse_dns || '—');
  setText('kv-xff', server.x_forwarded_for || '—');
  setText('kv-xreal', server.x_real_ip || '—');
  setText('kv-https', server.https ? 'true' : 'false');
  setText('kv-http', server.http_version || '—');
  setText('kv-lang', server.accept_language || '—');
  setText('kv-dnt', server.dnt || '—');
  setText('kv-referer', server.referer_present ? 'yes' : 'no');
  setText('kv-origin', server.origin_present ? 'yes' : 'no');
  setText('kv-ch', server.sec_ch_ua_present ? 'yes' : 'no');
  setText('kv-geo-tz', server.geo_timezone || '—');
  setText('kv-org', server.as_org || '—');
  setText('kv-tor', server.is_tor ? 'yes' : 'no');

  setText('fp-browser', client.browser);
  setText('fp-os', client.os);
  setText('fp-device', client.device);
  setText('fp-engine', client.engine);
  setText('fp-language', client.language || '—');
  setText('fp-languages', (client.languages || []).join(', ') || '—');
  setText('fp-timezone', client.timezone || '—');
  setText('fp-screen', client.screen || '—');
  setText('fp-viewport', client.viewport || '—');
  setText('fp-dpr', client.dpr || '—');
  setText('fp-threads', client.hardware_concurrency || '—');
  setText('fp-memory', client.device_memory ? `${client.device_memory} GB` : '—');
  setText('fp-color', client.color_depth || '—');
  setText('fp-cookies', client.cookie_enabled ? 'enabled' : 'disabled');
  setText('fp-touch', client.touch ? 'yes' : 'no');
  setText('fp-webdriver', client.webdriver ? 'true' : 'false');
  setText('fp-canvas', client.canvas_hash || '—');
  setText('fp-audio', client.audio_hash || '—');
  setText('fp-webgl', client.webgl || '—');
  setText('fp-hash', client.fingerprint_hash || '—');

  setText('webrtc-supported', client.webrtc.supported ? 'supported' : 'not supported');
  setText('webrtc-local', client.webrtc.local.length ? client.webrtc.local.join(', ') : '—');
  setText('webrtc-public', client.webrtc.public.length ? client.webrtc.public.join(', ') : '—');
  setText('webrtc-mdns', client.webrtc.mdns.length ? client.webrtc.mdns.join(', ') : '—');
}

async function sendCollect(visitId, client, score, risk, server) {
  try {
    await fetch('./collect.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        visit_id: visitId,
        client,
        fingerprint_hash: client.fingerprint_hash,
        privacy_score: score,
        risk_level: risk,
        notes: server.vpn_hosting_reason || ''
      })
    });
  } catch {}
}

async function loadAll() {
  const statusDot = $('status-dot');
  const statusText = $('api-status');
  if (statusDot) statusDot.className = 'dot loading';
  if (statusText) statusText.textContent = 'Загрузка…';
  try {
    const apiRes = await fetch('./api.php', { cache: 'no-store' });
    if (!apiRes.ok) throw new Error('HTTP ' + apiRes.status);
    const apiData = await apiRes.json();
    currentVisitId = apiData.visit_id || null;
    const server = apiData.client || {};
    const client = await collectClientSignals();
    const leaks = buildLeakItems(server, client);
    const { score, items: breakdownItems } = calculateScoreBreakdown(server, client, leaks);
    const risk = score >= 80 ? 'green' : score >= 55 ? 'yellow' : 'red';

    fillSummary(server, client, leaks, score, risk, breakdownItems);
    fillClientDetails(server, client);

    const combined = {
      timestamp_iso8601: apiData.timestamp_iso8601,
      visit_id: currentVisitId,
      client_server_view: server,
      client_browser_view: client,
      privacy_score: score,
      risk_level: risk,
      leaks,
    };
    lastJSON = JSON.stringify(combined, null, 2);
    setText('raw-json', lastJSON);
    if (statusDot) statusDot.className = 'dot';
    if (statusText) statusText.textContent = 'API online';

    if (currentVisitId) {
      await sendCollect(currentVisitId, client, score, risk, server);
    }
  } catch (err) {
    console.error(err);
    if (statusDot) { statusDot.className = 'dot error'; }
    if (statusText) statusText.textContent = 'API error';
    setText('raw-json', String(err));
  }
}

document.addEventListener('DOMContentLoaded', () => {
  $('refresh-btn')?.addEventListener('click', loadAll);
  $('copy-btn')?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(lastJSON || '');
      $('copy-btn').textContent = 'Скопировано';
      setTimeout(() => $('copy-btn').textContent = 'Скопировать JSON', 1200);
    } catch {
      $('copy-btn').textContent = 'Ошибка';
      setTimeout(() => $('copy-btn').textContent = 'Скопировать JSON', 1200);
    }
  });
  loadAll();
});
