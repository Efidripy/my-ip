const $ = (id) => document.getElementById(id);
let lastJSON = '';
let currentVisitId = null;

function txt(v) { return (v === undefined || v === null || v === '') ? '—' : String(v); }
function setText(id, value) { const el = $(id); if (el) el.textContent = txt(value); }
function setHTML(id, value) { const el = $(id); if (el) el.innerHTML = value; }

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

function badge(level) { return `<span class="badge ${level}">${level === 'red' ? 'красный' : level === 'yellow' ? 'жёлтый' : 'зелёный'}</span>`; }
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
  let score = 100;
  for (const l of leaks) {
    if (l.level === 'red') score -= 18;
    else if (l.level === 'yellow') score -= 8;
    else score -= 2;
  }
  if (!server.dnt) score -= 4;
  if (client.cookie_enabled) score -= 4;
  if (server.referer_present) score -= 5;
  if (server.origin_present) score -= 4;
  if (server.sec_ch_ua_present) score -= 3;
  if (client.languages && client.languages.length > 2) score -= 3;
  return Math.max(0, Math.min(100, score));
}

function explainScore(score) {
  if (score >= 80) return 'Профиль относительно аккуратный: сигналы есть, но без жёстких утечек.';
  if (score >= 55) return 'Средний уровень палевности: обычный сайт и трекер увидят о тебе уже довольно много.';
  return 'Шумный профиль: адрес, fingerprint и дополнительные сигналы делают тебя хорошо различимым.';
}

function fillSummary(server, client, leaks, score, risk) {
  setText('main-ip', server.ip);
  setText('geo-country', server.country || '—');
  setText('geo-city', [server.city, server.region].filter(Boolean).join(', ') || '—');
  setText('geo-asn', [server.asn ? 'AS' + server.asn : '', server.as_org].filter(Boolean).join(' • ') || '—');
  setText('privacy-score', `${score}/100`);
  setHTML('risk-level', `<span class="${textClass(risk)}">${risk === 'red' ? 'high' : risk === 'yellow' ? 'medium' : 'low'}</span>`);
  setHTML('vpn-risk', `<span class="${textClass(server.vpn_hosting_risk === 'high' ? 'red' : server.vpn_hosting_risk === 'medium' ? 'yellow' : 'green')}">${txt(server.vpn_hosting_risk)}</span>`);
  setHTML('webrtc-status', `<span class="${textClass(client.webrtc.public.length ? 'red' : (client.webrtc.local.length || client.webrtc.mdns.length) ? 'yellow' : 'green')}">${client.webrtc.public.length ? 'public leak' : (client.webrtc.local.length || client.webrtc.mdns.length) ? 'local leak' : 'safe'}</span>`);
  $('scorebar-fill').style.width = `${score}%`;
  $('scorebar-fill').style.background = risk === 'red' ? 'linear-gradient(90deg,#ff6b6b,#ffd166)' : risk === 'yellow' ? 'linear-gradient(90deg,#ffd166,#68aaff)' : 'linear-gradient(90deg,#7cf29a,#68ffd5)';
  setText('score-explain', explainScore(score));
  setText('chip-browser', `Браузер: ${client.browser}`);
  setText('chip-os', `OS: ${client.os}`);
  setText('chip-device', `Устройство: ${client.device}`);
  setText('chip-engine', `Движок: ${client.engine}`);
  setText('chip-lang', `Язык: ${client.language || '—'}`);
  setText('chip-tz', `TZ: ${client.timezone || '—'}`);
  setText('updated-at', new Date().toLocaleTimeString());

  const box = $('leak-list');
  box.innerHTML = leaks.map(item => `
    <article class="leak-item">
      <div class="leak-top"><strong>${item.title}</strong>${badge(item.level)}</div>
      <div class="leak-value">${txt(item.value)}</div>
      <div class="muted">${item.why}</div>
    </article>
  `).join('');
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
  $('api-status').textContent = 'API loading…';
  try {
    const apiRes = await fetch('./api.php', { cache: 'no-store' });
    if (!apiRes.ok) throw new Error('HTTP ' + apiRes.status);
    const apiData = await apiRes.json();
    currentVisitId = apiData.visit_id || null;
    const server = apiData.client || {};
    const client = await collectClientSignals();
    const leaks = buildLeakItems(server, client);
    const score = calculateScore(server, client, leaks);
    const risk = score >= 80 ? 'green' : score >= 55 ? 'yellow' : 'red';

    fillSummary(server, client, leaks, score, risk);
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
    $('api-status').textContent = 'API online';

    if (currentVisitId) {
      await sendCollect(currentVisitId, client, score, risk, server);
    }
  } catch (err) {
    console.error(err);
    $('api-status').textContent = 'API error';
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
