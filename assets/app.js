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
    if (!gl) return { renderer: 'unsupported' };
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = ext
      ? `${gl.getParameter(ext.UNMASKED_VENDOR_WEBGL)} / ${gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)}`
      : 'available';
    const maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    const exts = (gl.getSupportedExtensions() || []).length;
    return {
      renderer,
      max_texture_size: maxTex || null,
      extensions_count: exts,
    };
  } catch { return { renderer: 'unsupported' }; }
}

function getWebGLDetailedInfo() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return null;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const anisExt = gl.getExtension('EXT_texture_filter_anisotropic');
    const allExt = gl.getSupportedExtensions() || [];
    const vf = gl.getShaderPrecisionFormat(gl.VERTEX_SHADER, gl.HIGH_FLOAT);
    const ff = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
    const NOTABLE = ['EXT_color_buffer_float','OES_texture_float','WEBGL_depth_texture',
                     'OES_standard_derivatives','ANGLE_instanced_arrays','EXT_disjoint_timer_query',
                     'WEBGL_debug_renderer_info','OES_vertex_array_object'];
    return {
      vendor:               ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : null,
      renderer:             ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'available',
      version:              gl.getParameter(gl.VERSION),
      shading_language:     gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
      max_texture_size:     gl.getParameter(gl.MAX_TEXTURE_SIZE),
      max_renderbuffer:     gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
      max_cube_map:         gl.getParameter(gl.MAX_CUBE_MAP_TEXTURE_SIZE),
      max_anisotropy:       anisExt ? gl.getParameter(anisExt.MAX_TEXTURE_MAX_ANISOTROPY_EXT) : null,
      vertex_precision:     vf ? vf.precision : null,
      fragment_precision:   ff ? ff.precision : null,
      extensions_count:     allExt.length,
      extensions_notable:   allExt.filter(e => NOTABLE.includes(e)),
    };
  } catch { return null; }
}

function getCssSupportFeatures() {
  const sup = (q) => { try { return CSS.supports(q); } catch { return false; } };
  return {
    grid_subgrid:        sup('grid-template-rows: subgrid'),
    container_queries:   sup('container-type: inline-size'),
    color_mix:           sup('color: color-mix(in srgb, red, blue)'),
    has_selector:        sup('selector(:has(a))'),
    dvh_units:           sup('height: 1dvh'),
    logical_properties:  sup('margin-inline: 0'),
    oklch_color:         sup('color: oklch(50% 0.2 120)'),
    p3_color:            sup('color: color(display-p3 1 0 0)'),
    cascade_layers:      typeof CSSLayerBlockRule !== 'undefined',
    scroll_timeline:     sup('animation-timeline: scroll()'),
    anchor_positioning:  sup('anchor-name: --foo'),
    nesting:             sup('& { color: red }'),
  };
}

function getSystemColors() {
  try {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:absolute;left:-9999px;visibility:hidden';

    const chk = document.createElement('input');
    chk.type = 'checkbox';
    wrap.appendChild(chk);

    const sel = document.createElement('select');
    const opt = document.createElement('option');
    opt.textContent = 'x';
    sel.appendChild(opt);
    wrap.appendChild(sel);

    const btn = document.createElement('button');
    btn.textContent = 'x';
    wrap.appendChild(btn);

    document.body.appendChild(wrap);
    const chkSt = getComputedStyle(chk);
    const selSt = getComputedStyle(sel);
    const btnSt = getComputedStyle(btn);
    const result = {
      accent_color:       chkSt.accentColor || null,
      color_scheme:       getComputedStyle(document.documentElement).colorScheme || null,
      checkbox_bg:        chkSt.backgroundColor || null,
      checkbox_border:    chkSt.borderColor || null,
      select_bg:          selSt.backgroundColor || null,
      select_color:       selSt.color || null,
      button_bg:          btnSt.backgroundColor || null,
      button_border:      btnSt.borderColor || null,
      scrollbar_color:    getComputedStyle(document.documentElement).scrollbarColor || null,
    };
    document.body.removeChild(wrap);
    return result;
  } catch { return null; }
}

function getExtendedApis() {
  const has = (obj, key) => !!(obj && key in obj);
  return {
    bluetooth:             has(navigator, 'bluetooth'),
    usb:                   has(navigator, 'usb'),
    serial:                has(navigator, 'serial'),
    hid:                   has(navigator, 'hid'),
    nfc:                   has(navigator, 'nfc'),
    keyboard:              has(navigator, 'keyboard'),
    contacts:              has(navigator, 'contacts'),
    presentation:          has(navigator, 'presentation'),
    wake_lock:             has(navigator, 'wakeLock'),
    scheduling:            has(navigator, 'scheduling'),
    ink:                   has(navigator, 'ink'),
    gamepads:              typeof navigator.getGamepads === 'function',
    midi:                  has(navigator, 'requestMIDIAccess'),
    file_system_access:    typeof window.showOpenFilePicker === 'function',
    eye_dropper:           typeof window.EyeDropper !== 'undefined',
    screen_capture:        has(navigator.mediaDevices || {}, 'getDisplayMedia'),
    window_management:     typeof window.getScreenDetails === 'function',
  };
}

function getMathFingerprint() {
  try {
    return {
      tan:   Math.tan(-1e300),
      sin:   Math.sin(Math.PI),
      cos:   Math.cos(Math.PI),
      acos:  Math.acos(0.123456789),
      atan2: Math.atan2(90, 15),
      exp:   Math.exp(1),
      log:   Math.log(Math.PI),
      sinh:  Math.sinh(1),
      cosh:  Math.cosh(1),
      tanh:  Math.tanh(1),
      sqrt2: Math.SQRT2,
    };
  } catch { return null; }
}

async function getSpeechVoices() {
  try {
    if (!window.speechSynthesis) return null;
    let voices = window.speechSynthesis.getVoices();
    if (!voices.length) {
      await new Promise((res) => {
        const tid = setTimeout(res, 500);
        window.speechSynthesis.onvoiceschanged = () => { clearTimeout(tid); res(); };
      });
      voices = window.speechSynthesis.getVoices();
    }
    return {
      count: voices.length,
      sample: voices.slice(0, 6).map(v => v.name),
      langs: [...new Set(voices.map(v => v.lang).filter(Boolean))].slice(0, 8),
    };
  } catch { return null; }
}

function getPluginsInfo() {
  try {
    const plugins = Array.from(navigator.plugins || []);
    return {
      count: plugins.length,
      names: plugins.slice(0, 6).map(p => p.name).filter(Boolean),
    };
  } catch { return null; }
}

async function detectIPv6() {
  try {
    const res = await fetch('./ipv6.php', { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

// ============================================================
// NEW COLLECTORS — v12
// ============================================================

function getCodecFingerprint() {
  const result = { video: {}, audio: {}, media_capabilities: null };
  try {
    const v = document.createElement('video');
    const videoTests = {
      h264:   'video/mp4; codecs="avc1.42E01E"',
      h265:   'video/mp4; codecs="hev1.1.6.L93.B0"',
      vp8:    'video/webm; codecs="vp8"',
      vp9:    'video/webm; codecs="vp9"',
      av1:    'video/mp4; codecs="av01.0.05M.08"',
      theora: 'video/ogg; codecs="theora"',
    };
    for (const [name, type] of Object.entries(videoTests)) {
      result.video[name] = v.canPlayType(type) || 'no';
    }
    const a = document.createElement('audio');
    const audioTests = {
      mp3:        'audio/mpeg',
      aac:        'audio/aac',
      ogg_vorbis: 'audio/ogg; codecs="vorbis"',
      opus:       'audio/ogg; codecs="opus"',
      flac:       'audio/flac',
      wav:        'audio/wav; codecs="1"',
    };
    for (const [name, type] of Object.entries(audioTests)) {
      result.audio[name] = a.canPlayType(type) || 'no';
    }
  } catch {}
  return result;
}

async function getCodecCapabilities() {
  const result = {};
  try {
    if (!navigator.mediaCapabilities?.decodingInfo) return result;
    const [h264, av1] = await Promise.all([
      navigator.mediaCapabilities.decodingInfo({
        type: 'file',
        video: { contentType: 'video/mp4; codecs="avc1.42E01E"', width: 1920, height: 1080, bitrate: 4000000, framerate: 30 },
      }).catch(() => null),
      navigator.mediaCapabilities.decodingInfo({
        type: 'file',
        video: { contentType: 'video/mp4; codecs="av01.0.05M.08"', width: 1920, height: 1080, bitrate: 4000000, framerate: 30 },
      }).catch(() => null),
    ]);
    if (h264) result.h264_1080p = { supported: h264.supported, smooth: h264.smooth, power_efficient: h264.powerEfficient };
    if (av1)  result.av1_1080p  = { supported: av1.supported,  smooth: av1.smooth,  power_efficient: av1.powerEfficient  };
  } catch {}
  return result;
}

async function getWebGPUInfo() {
  try {
    if (!navigator.gpu) return { supported: false };
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) return { supported: true, adapter_available: false };
    const info = adapter.info || await adapter.requestAdapterInfo().catch(() => null);
    const limitKeys = ['maxTextureDimension2D', 'maxBufferSize', 'maxVertexBuffers', 'maxColorAttachments', 'maxBindGroups'];
    const limits = {};
    for (const k of limitKeys) {
      if (adapter.limits && adapter.limits[k] !== undefined) limits[k] = adapter.limits[k];
    }
    return {
      supported: true,
      adapter_available: true,
      vendor:       info?.vendor       || null,
      architecture: info?.architecture || null,
      device:       info?.device       || null,
      description:  info?.description  || null,
      is_fallback:  adapter.isFallbackAdapter ?? null,
      features:     [...(adapter.features || [])].sort().slice(0, 20),
      limits,
    };
  } catch { return { supported: false }; }
}

async function getWorkerConsistency() {
  if (!window.Worker || !window.URL || !window.Blob) return { supported: false };
  const src = `self.onmessage=function(){
var r={};
try{r.timezone=Intl.DateTimeFormat().resolvedOptions().timeZone;}catch(e){}
try{r.language=navigator.language||'';}catch(e){}
try{r.hardware_concurrency=navigator.hardwareConcurrency||null;}catch(e){}
try{r.device_memory=navigator.deviceMemory||null;}catch(e){}
try{r.math_tan=Math.tan(-1e300);r.math_sin=Math.sin(Math.PI);}catch(e){}
var Ctx=(typeof OfflineAudioContext!=='undefined')?OfflineAudioContext:(typeof webkitOfflineAudioContext!=='undefined'?webkitOfflineAudioContext:null);
if(Ctx){try{var ctx=new Ctx(1,44100,44100);var osc=ctx.createOscillator();osc.type='triangle';osc.frequency.value=1000;var comp=ctx.createDynamicsCompressor();osc.connect(comp);comp.connect(ctx.destination);osc.start(0);ctx.startRendering().then(function(buf){var d=buf.getChannelData(0);var s=0;for(var i=4500;i<4600;i++)s+=d[i];r.audio_sum=s.toFixed(6);self.postMessage(r);}).catch(function(){self.postMessage(r);});}catch(e){self.postMessage(r);}}else{self.postMessage(r);}};`;
  try {
    const blob = new Blob([src], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    return await new Promise((resolve) => {
      let done = false;
      const timer = setTimeout(() => {
        if (done) return; done = true;
        try { w.terminate(); URL.revokeObjectURL(url); } catch {}
        resolve({ supported: true, timeout: true });
      }, 3500);
      const w = new Worker(url);
      w.onmessage = (e) => {
        if (done) return; done = true;
        clearTimeout(timer);
        try { w.terminate(); URL.revokeObjectURL(url); } catch {}
        resolve({ supported: true, result: e.data });
      };
      w.onerror = () => {
        if (done) return; done = true;
        clearTimeout(timer);
        try { w.terminate(); URL.revokeObjectURL(url); } catch {}
        resolve({ supported: true, error: 'worker_error' });
      };
      w.postMessage(null);
    });
  } catch { return { supported: false }; }
}

function analyzeWorkerConsistency(workerRaw, client) {
  if (!workerRaw?.result) return { mismatches: [], spoof_suspected: false };
  const w = workerRaw.result;
  const mismatches = [];
  if (w.timezone && client.timezone && w.timezone !== client.timezone)
    mismatches.push({ field: 'timezone', main: client.timezone, worker: w.timezone });
  if (w.language && client.language && w.language !== client.language)
    mismatches.push({ field: 'language', main: client.language, worker: w.language });
  if (w.hardware_concurrency != null && client.hardware_concurrency != null
      && w.hardware_concurrency !== client.hardware_concurrency)
    mismatches.push({ field: 'hardwareConcurrency', main: String(client.hardware_concurrency), worker: String(w.hardware_concurrency) });
  if (w.math_tan != null && client.math_fp?.tan != null
      && Math.abs(w.math_tan - client.math_fp.tan) > 1e-14)
    mismatches.push({ field: 'Math.tan', main: String(client.math_fp.tan), worker: String(w.math_tan) });
  if (w.math_sin != null && client.math_fp?.sin != null
      && Math.abs(w.math_sin - client.math_fp.sin) > 1e-14)
    mismatches.push({ field: 'Math.sin', main: String(client.math_fp.sin), worker: String(w.math_sin) });
  return { mismatches, spoof_suspected: mismatches.length > 0 };
}

function getTimezoneLocaleIntegrity() {
  try {
    const dtf = Intl.DateTimeFormat().resolvedOptions();
    const numf = Intl.NumberFormat().resolvedOptions();
    const relTf = Intl.RelativeTimeFormat ? new Intl.RelativeTimeFormat().resolvedOptions() : null;
    const langFromNav = navigator.language || '';
    const localeFromIntl = dtf.locale || '';
    const langBase = langFromNav.split('-')[0].toLowerCase();
    const localeBase = localeFromIntl.split('-')[0].toLowerCase();
    const langLocaleMatch = langBase && localeBase ? langBase === localeBase : null;
    // Sample formatted date — reveals locale/calendar quirks
    const sampleDate = new Intl.DateTimeFormat(undefined, { dateStyle: 'short' }).format(new Date(2024, 0, 15));
    // hourCycle from explicit query
    let hourCycle12 = null;
    try { hourCycle12 = Intl.DateTimeFormat(langFromNav || undefined, { hour: 'numeric' }).resolvedOptions().hourCycle; } catch {}
    // Supported calendars hint
    let calendars = [];
    try { calendars = Intl.supportedValuesOf('calendar').slice(0, 8); } catch {}
    let numberingSystems = [];
    try { numberingSystems = Intl.supportedValuesOf('numberingSystem').slice(0, 8); } catch {}
    return {
      timezone: dtf.timeZone,
      tz_offset_minutes: new Date().getTimezoneOffset(),
      locale: localeFromIntl,
      calendar: dtf.calendar,
      numbering_system: numf.numberingSystem || dtf.numberingSystem,
      hour_cycle: dtf.hourCycle,
      hour_cycle_explicit: hourCycle12,
      lang_locale_match: langLocaleMatch,
      sample_date: sampleDate,
      calendars_supported: calendars,
      numbering_systems: numberingSystems,
      relative_time_locale: relTf?.locale || null,
    };
  } catch { return null; }
}

function getCanvasTextMetrics() {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const result = {};
    const samples = [
      ['latin',    '14px Arial',           'The quick brown fox'],
      ['cyrillic', '14px Arial',           'Привет мир'],
      ['emoji',    '14px serif',           '🎉🔒🌍'],
      ['arabic',   '14px Arial',           'مرحبا'],
      ['mixed',    '14px sans-serif',      'Hello Мир 🌍'],
      ['numbers',  '14px monospace',       '0123456789'],
    ];
    for (const [name, font, text] of samples) {
      try {
        ctx.font = font;
        const m = ctx.measureText(text);
        result[name] = {
          width:   Math.round(m.width * 100) / 100,
          asc:     m.fontBoundingBoxAscent  != null ? Math.round(m.fontBoundingBoxAscent  * 100) / 100 : null,
          desc:    m.fontBoundingBoxDescent != null ? Math.round(m.fontBoundingBoxDescent * 100) / 100 : null,
          em_asc:  m.emHeightAscent  != null ? Math.round(m.emHeightAscent  * 100) / 100 : null,
        };
      } catch {}
    }
    return result;
  } catch { return null; }
}

function getJsRuntimeFingerprint() {
  const r = {};
  try {
    // Stack trace engine signature
    const err = new Error('fp');
    const stack = err.stack || '';
    r.stack_engine = stack.includes(' at ') ? 'v8/chakra' : stack.includes('@') ? 'spidermonkey' : 'webkit/other';
    r.stack_first_line = (stack.split('\n')[0] || '').slice(0, 80);
    // Function.prototype.toString normalisation
    r.fn_str_normalized = /\bfunction\b/.test(function(){}.toString());
    // Feature probes (help distinguish engine versions)
    r.has_error_cause     = (() => { try { return new Error('x', {cause:'y'}).cause === 'y'; } catch { return false; } })();
    r.has_array_at        = typeof [].at === 'function';
    r.has_object_hasown   = typeof Object.hasOwn === 'function';
    r.has_structured_clone = typeof structuredClone === 'function';
    r.has_array_group_by  = typeof (Object.groupBy ?? Map.groupBy) === 'function';
    r.has_promise_any     = typeof Promise.any === 'function';
    r.has_string_replaceall = typeof ''.replaceAll === 'function';
    r.regex_unicode_props = (() => { try { return /\p{L}/u.test('a'); } catch { return false; } })();
    r.regex_dotall        = (() => { try { return /a.b/s.test('a\nb'); } catch { return false; } })();
    // Numeric edge cases (varies by JS engine float implementation)
    r.num_0_1_plus_0_2_len = (0.1 + 0.2).toString().length;
    r.max_safe_int = Number.MAX_SAFE_INTEGER === 9007199254740991;
    // Error name override
    const e2 = new Error('x'); e2.name = 'Custom';
    r.error_name_overridable = e2.toString().startsWith('Custom');
  } catch {}
  return r;
}

function computeSectionEntropyScores(client, server) {
  const s = [];
  // Canvas / Audio / WebGL — up to ~28 bits in practice
  let fp = 0;
  if (client.canvas_hash && client.canvas_hash !== 'unsupported') fp += 10;
  if (client.audio_hash  && client.audio_hash  !== 'unsupported') fp += 8;
  if (client.webgl?.renderer && client.webgl.renderer !== 'unsupported') fp += 7;
  if (client.math_fp) fp += 3;
  s.push({ name: '🎨 Canvas / Audio / WebGL', bits: fp, max: 28 });
  // Screen + hardware
  let hw = 0;
  if (client.screen) hw += 4;
  if (client.dpr && client.dpr !== 1) hw += 2;
  if (client.hardware_concurrency) hw += 2;
  if (client.device_memory) hw += 2;
  if (client.color_depth) hw += 1;
  s.push({ name: '🖥 Экран / Железо', bits: hw, max: 11 });
  // Language + timezone
  let loc = 0;
  if (client.timezone) loc += 4;
  if (client.language) loc += 3;
  if ((client.languages || []).length > 1) loc += 2;
  if (client.system_locale) loc += 2;
  s.push({ name: '🌍 Язык / Таймзона', bits: loc, max: 11 });
  // Fonts
  const fc = client.fonts_count || 0;
  const fontBits = fc > 20 ? 8 : fc > 10 ? 5 : fc > 0 ? 2 : 0;
  s.push({ name: '🔤 Шрифты / Голоса', bits: fontBits + ((client.speech_voices?.count || 0) > 0 ? 2 : 0), max: 10 });
  // UA / UA-CH
  let ua = 0;
  if (client.browser !== 'Unknown') ua += 3;
  if ((client.ua_brands || []).length > 0) ua += 3;
  if (client.client_hints?.platformVersion) ua += 3;
  s.push({ name: '🔍 User-Agent / UA-CH', bits: ua, max: 9 });
  // Codecs + WebGPU (new)
  let codec = 0;
  const vf = client.codec_fp?.video || {};
  if (Object.keys(vf).length > 0) codec += 2;
  if (vf.av1 === 'probably') codec += 1;
  if (vf.h265 === 'probably') codec += 1;
  if (client.webgpu?.vendor) codec += 2;
  s.push({ name: '🎬 Кодеки / WebGPU', bits: codec, max: 6 });
  // Network / IP
  let net = 0;
  if (server.asn_type === 'datacenter') net += 3;
  if ((server.dnsbl_listed || 0) > 0) net += 2;
  if (server.is_tor) net += 3;
  s.push({ name: '🌐 Сеть / IP', bits: net, max: 8 });
  return s;
}

function detectFonts() {
  const list = [
    'Arial', 'Arial Black', 'Arial Narrow', 'Calibri', 'Cambria', 'Candara',
    'Century Gothic', 'Comic Sans MS', 'Consolas', 'Constantia', 'Corbel',
    'Courier New', 'Franklin Gothic Medium', 'Garamond', 'Georgia', 'Helvetica',
    'Impact', 'Lucida Console', 'Lucida Sans Unicode', 'MS Sans Serif',
    'MS Serif', 'Palatino Linotype', 'Segoe UI', 'Tahoma', 'Times New Roman',
    'Trebuchet MS', 'Verdana', 'Wingdings', 'Futura', 'Gill Sans', 'Optima',
    'Baskerville', 'Monaco', 'Menlo', 'Rockwell', 'Copperplate', 'Webdings',
  ];
  const available = [];
  try {
    for (const f of list) {
      if (document.fonts.check(`12px "${f}"`)) available.push(f);
    }
  } catch {}
  return available;
}

async function detectIncognito() {
  try {
    if (navigator.storage && navigator.storage.estimate) {
      const { quota } = await navigator.storage.estimate();
      if (typeof quota === 'number' && quota < 150 * 1024 * 1024) {
        return { detected: true, method: 'storage-quota' };
      }
    }
  } catch {}
  try {
    const k = '_iq_' + Math.random();
    localStorage.setItem(k, '1');
    localStorage.removeItem(k);
  } catch {
    return { detected: true, method: 'localstorage-blocked' };
  }
  return { detected: false, method: 'storage-quota' };
}

async function getBatteryInfo() {
  try {
    if (!navigator.getBattery) return null;
    const b = await navigator.getBattery();
    return {
      level: Math.round(b.level * 100),
      charging: b.charging,
      charging_time: Number.isFinite(b.chargingTime) ? b.chargingTime : null,
      discharging_time: Number.isFinite(b.dischargingTime) ? b.dischargingTime : null,
    };
  } catch { return null; }
}

function getNetworkInfo() {
  const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!c) return null;
  return {
    type: c.type || null,
    effective_type: c.effectiveType || null,
    rtt: c.rtt ?? null,
    downlink: c.downlink ?? null,
    save_data: c.saveData || false,
  };
}

function getSystemLocale() {
  try {
    return {
      number: new Intl.NumberFormat().resolvedOptions().locale,
      collator: new Intl.Collator().resolvedOptions().locale,
    };
  } catch { return null; }
}

function getUaBrands() {
  try {
    const uad = navigator.userAgentData;
    if (!uad) return [];
    return (uad.brands || []).map(b => b.brand).filter(b => b && !b.toLowerCase().includes('not'));
  } catch { return []; }
}

function getHeadlessSignals() {
  return {
    outer_inner_width_diff: window.outerWidth - window.innerWidth,
    outer_inner_height_diff: window.outerHeight - window.innerHeight,
    pdf_viewer_enabled: !!navigator.pdfViewerEnabled,
    java_enabled: typeof navigator.javaEnabled === 'function' ? navigator.javaEnabled() : false,
    orientation_type: screen.orientation?.type || null,
    avail_width_diff: screen.width - screen.availWidth,
    avail_height_diff: screen.height - screen.availHeight,
    offscreen_canvas: typeof OffscreenCanvas !== 'undefined',
    max_touch_points: navigator.maxTouchPoints || 0,
  };
}

function getCssMediaFeatures() {
  const mq = (q) => { try { return window.matchMedia(q).matches; } catch { return null; } };
  return {
    prefers_dark: mq('(prefers-color-scheme: dark)'),
    prefers_light: mq('(prefers-color-scheme: light)'),
    prefers_reduced_motion: mq('(prefers-reduced-motion: reduce)'),
    forced_colors: mq('(forced-colors: active)'),
    pointer_fine: mq('(pointer: fine)'),
    pointer_coarse: mq('(pointer: coarse)'),
    any_pointer_coarse: mq('(any-pointer: coarse)'),
    display_standalone: mq('(display-mode: standalone)'),
    hdr: mq('(dynamic-range: high)'),
    color_gamut_p3: mq('(color-gamut: p3)'),
  };
}

async function getMediaDevicesCount() {
  try {
    if (!navigator.mediaDevices?.enumerateDevices) return null;
    const devices = await navigator.mediaDevices.enumerateDevices();
    let cameras = 0, microphones = 0, speakers = 0;
    for (const d of devices) {
      if (d.kind === 'videoinput') cameras++;
      else if (d.kind === 'audioinput') microphones++;
      else if (d.kind === 'audiooutput') speakers++;
    }
    return { cameras, microphones, speakers, total: devices.length };
  } catch { return null; }
}

async function getAudioContextDetails() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    const ctx = new AudioCtx();
    const result = {
      sample_rate: ctx.sampleRate,
      state: ctx.state,
      base_latency: typeof ctx.baseLatency === 'number' ? Math.round(ctx.baseLatency * 10000) / 10000 : null,
      output_latency: typeof ctx.outputLatency === 'number' ? Math.round(ctx.outputLatency * 10000) / 10000 : null,
    };
    try { await ctx.close(); } catch {}
    return result;
  } catch { return null; }
}

function getPerformanceDetails() {
  const result = {
    memory: null,
    clock_resolution_ms: null,
    tz_offset: new Date().getTimezoneOffset(),
  };
  try {
    const mem = performance.memory;
    if (mem) {
      result.memory = {
        used_mb: Math.round(mem.usedJSHeapSize / 1048576 * 10) / 10,
        total_mb: Math.round(mem.totalJSHeapSize / 1048576 * 10) / 10,
        limit_mb: Math.round(mem.jsHeapSizeLimit / 1048576 * 10) / 10,
      };
    }
  } catch {}
  try {
    let minDiff = Infinity;
    let prev = performance.now();
    for (let i = 0; i < 50; i++) {
      const now = performance.now();
      const diff = now - prev;
      if (diff > 0 && diff < minDiff) minDiff = diff;
      prev = now;
    }
    result.clock_resolution_ms = minDiff === Infinity ? null : Math.round(minDiff * 10000) / 10000;
  } catch {}
  return result;
}

function getBrowserApiAvailability() {
  return {
    share: !!navigator.share,
    xr: !!navigator.xr,
    credentials: !!navigator.credentials,
    clipboard: !!navigator.clipboard,
    vibrate: !!navigator.vibrate,
    idb: !!window.indexedDB,
    websql: typeof window.openDatabase === 'function',
    trusted_types: !!window.trustedTypes,
    random_uuid: !!(crypto?.randomUUID),
    cross_origin_isolated: !!self.crossOriginIsolated,
    device_motion: 'DeviceMotionEvent' in window,
    device_orientation: 'DeviceOrientationEvent' in window,
    web_codecs: !!(window.VideoDecoder && window.VideoEncoder),
    sensors: !!(window.Accelerometer || window.Gyroscope),
    service_worker: !!navigator.serviceWorker,
    web_locks: !!navigator.locks,
    payment_request: !!window.PaymentRequest,
  };
}

async function detectWebRTC() {
  const result = { supported: false, local: [], public: [], mdns: [], proxy_ports: [] };
  const RTCPeer = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
  if (!RTCPeer) return result;
  result.supported = true;
  return new Promise(async (resolve) => {
    const ips = new Set(), mdns = new Set();
    const proxyPorts = new Set();
    try {
      const pc = new RTCPeer({ iceServers: [] });
      pc.createDataChannel('x');
      pc.onicecandidate = (e) => {
        if (!e.candidate || !e.candidate.candidate) return;
        // SDP candidate format: candidate:<foundation> <component> <transport> <priority> <address> <port> typ ...
        const parts = e.candidate.candidate.split(' ');
        if (parts.length < 6) return;
        const v = parts[4];
        const port = parseInt(parts[5], 10);
        if (!v || isNaN(port)) return;
        if (!isNaN(port) && PROXY_PORTS.has(port)) proxyPorts.add(port);
        if (v.endsWith('.local')) mdns.add(v); else ips.add(v);
      };
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      setTimeout(() => {
        for (const ip of ips) {
          if (/^10\.|^192\.168\.|^172\.(1[6-9]|2\d|3[0-1])\.|^127\.|^169\.254\./.test(ip) || ip === '::1' || ip.startsWith('fe80:') || ip.startsWith('fc') || ip.startsWith('fd')) result.local.push(ip); else result.public.push(ip);
        }
        result.mdns = [...mdns];
        result.proxy_ports = [...proxyPorts];
        try { pc.close(); } catch {}
        resolve(result);
      }, 1800);
    } catch { resolve(result); }
  });
}

async function collectClientSignals() {
  const ua = navigator.userAgent || '';
  const canvas = canvasHash();
  const webgl = getWebGLInfo();
  const fonts = detectFonts();
  const network = getNetworkInfo();
  const system_locale = getSystemLocale();
  const ua_brands = getUaBrands();
  const headless = getHeadlessSignals();
  const css_media = getCssMediaFeatures();
  const perf = getPerformanceDetails();
  const browser_apis = getBrowserApiAvailability();
  const dnt_js = navigator.doNotTrack ?? null;
  const gpc = navigator.globalPrivacyControl ?? null;
  const storage_state = getStorageState();
  const cookie_test = testCookiePolicy();
  const math_fp = getMathFingerprint();
  const codec_fp = getCodecFingerprint();
  const tz_locale = getTimezoneLocaleIntegrity();
  const canvas_text_metrics = getCanvasTextMetrics();
  const js_runtime = getJsRuntimeFingerprint();
  const [audio, webrtc, battery, incognito, media_devices, audio_ctx_details, client_hints, speech_voices, webgpu, codec_caps, worker_raw] = await Promise.all([
    audioHash(),
    detectWebRTC(),
    getBatteryInfo(),
    detectIncognito(),
    getMediaDevicesCount(),
    getAudioContextDetails(),
    getFullClientHints(),
    getSpeechVoices(),
    getWebGPUInfo(),
    getCodecCapabilities(),
    getWorkerConsistency(),
  ]);
  codec_fp.media_capabilities = codec_caps;

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
    fonts_count: fonts.length,
    battery,
    network,
    system_locale,
    ua_brands,
    incognito,
    webrtc,
    headless,
    css_media,
    perf,
    browser_apis,
    media_devices,
    audio_ctx_details,
    dnt_js,
    gpc,
    storage_state,
    cookie_test,
    client_hints,
    css_supports: getCssSupportFeatures(),
    system_colors: getSystemColors(),
    webgl_detailed: getWebGLDetailedInfo(),
    extended_apis: getExtendedApis(),
    math_fp,
    speech_voices: speech_voices,
    plugins: getPluginsInfo(),
    fonts_list: fonts.slice(0, 12),
    codec_fp,
    webgpu,
    tz_locale,
    canvas_text_metrics,
    js_runtime,
  };

  // Worker consistency analysis — compare worker realm with main thread
  client.worker_consistency = analyzeWorkerConsistency(worker_raw, client);
  client.worker_raw = worker_raw;

  const fpSource = JSON.stringify([
    client.browser, client.os, client.device, client.engine,
    client.language, client.languages, client.timezone,
    client.screen, client.viewport, client.dpr,
    client.hardware_concurrency, client.device_memory, client.color_depth,
    client.canvas_hash, client.audio_hash,
    client.webgl?.renderer ?? 'unsupported',
    client.fonts_count,
  ]);
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

const COUNTRY_PRIMARY_LANG = {
  'Russia':'ru','Ukraine':'uk','Belarus':['be','ru'],
  'Germany':'de','Austria':'de','France':'fr','Spain':'es',
  'Italy':'it','Poland':'pl','Netherlands':'nl','Belgium':['fr','nl'],
  'China':['zh'],'Japan':'ja','South Korea':'ko','Korea':'ko',
  'United States':'en','United Kingdom':'en','Canada':['en','fr'],
  'Australia':'en','New Zealand':'en','Brazil':'pt','Portugal':'pt',
  'Sweden':'sv','Norway':['no','nb','nn'],'Denmark':'da','Finland':'fi',
  'Czech Republic':'cs','Slovakia':'sk','Romania':'ro','Hungary':'hu',
  'Bulgaria':'bg','Serbia':'sr','Croatia':'hr','Slovenia':'sl',
  'Kazakhstan':['kk','ru'],'Turkey':'tr','Greece':'el',
  'Latvia':'lv','Lithuania':'lt','Estonia':'et',
  'Israel':['he','iw'],'Saudi Arabia':'ar','Iran':['fa'],
  'Thailand':'th','Vietnam':'vi','Indonesia':'id',
  'Switzerland':['de','fr','it'],
};

function buildLeakItems(server, client) {
  const leaks = [];

  leaks.push({
    title: 'IP-адрес',
    value: server.ip,
    level: 'red',
    why: 'Любой сайт видит твой публичный IP и может связать его с сетью, регионом и историей активности.',
    fix: 'Для скрытия IP используй Tor или надёжный VPN. Помни: VPN не скрывает fingerprint браузера, а Tor делает соединение медленнее.',
  });

  if (server.reverse_dns) leaks.push({
    title: 'Reverse DNS',
    value: server.reverse_dns,
    level: 'yellow',
    why: 'По reverse DNS нередко видно провайдера, тип сети или хостинг.',
    fix: 'Это DNS-запись провайдера — изменить её самостоятельно невозможно.',
  });

  if (server.accept_language) leaks.push({
    title: 'Языки браузера',
    value: server.accept_language,
    level: 'yellow',
    why: 'Язык помогает сузить профиль пользователя и страну/регион.',
    fix: 'Установи единственный язык "en-US" в настройках браузера, чтобы слиться с большинством.',
  });

  if (server.x_forwarded_for) leaks.push({
    title: 'X-Forwarded-For',
    value: server.x_forwarded_for,
    level: 'yellow',
    why: 'Если есть прокси-цепочка, сайт может увидеть дополнительные адреса.',
    fix: 'Используй прокси/VPN, которые не добавляют этот заголовок («non-transparent proxy»).',
  });

  if (server.x_real_ip) leaks.push({
    title: 'X-Real-IP',
    value: server.x_real_ip,
    level: 'yellow',
    why: 'Прокси может пробрасывать исходный IP клиента отдельным заголовком.',
    fix: 'Убедись, что твой прокси/VPN не добавляет заголовок X-Real-IP.',
  });

  // Timezone mismatch
  if (client.timezone && server.geo_timezone && client.timezone !== server.geo_timezone) {
    leaks.push({
      title: 'Timezone mismatch',
      value: `Браузер: ${client.timezone}  →  IP: ${server.geo_timezone}`,
      level: 'red',
      why: `Браузер раскрывает часовой пояс ${client.timezone}, а IP принадлежит зоне ${server.geo_timezone}. Почти гарантированный признак VPN/прокси.`,
      fix: 'Tor Browser нормализует timezone. В Brave: Settings → Privacy → "Use generic time zone". Вручную поменять TZ в ОС — временная мера.',
    });
  }

  // Language / country mismatch
  const firstLang = (server.accept_language || '').split(',')[0].split(';')[0].split('-')[0].toLowerCase().trim();
  if (firstLang && firstLang !== 'en' && server.country) {
    const expected = COUNTRY_PRIMARY_LANG[server.country];
    if (expected) {
      const expectedArr = Array.isArray(expected) ? expected : [expected];
      if (!expectedArr.includes(firstLang)) {
        leaks.push({
          title: 'Язык ≠ страна IP',
          value: `Язык браузера: ${firstLang.toUpperCase()}, страна по IP: ${server.country}`,
          level: 'red',
          why: 'Язык браузера не соответствует стране, которой принадлежит IP. Очень типичный признак VPN у русскоязычных пользователей.',
          fix: 'Установи язык браузера "en-US" — это уменьшит флаги, хотя само противоречие останется в других каналах.',
        });
      }
    }
  }

  // DNSBL
  if (server.dnsbl_listed > 0) leaks.push({
    title: 'DNSBL blacklist',
    value: `В ${server.dnsbl_listed} из ${server.dnsbl_total} блэклистов: ${(server.dnsbl_blacklists || []).join(', ')}`,
    level: 'red',
    why: 'IP занесён в публичные антиспам-блэклисты. Характерно для VPN/hosting IP-адресов.',
    fix: 'Большинство коммерческих VPN используют IP из блэклистов. Смена IP не поможет — целые диапазоны ADN внесены списком.',
  });

  // WebRTC public leak
  if (client.webrtc.public.length) leaks.push({
    title: 'WebRTC public leak',
    value: client.webrtc.public.join(', '),
    level: 'red',
    why: 'Браузер раскрыл публичные адреса через WebRTC — это обходит VPN и показывает реальный IP.',
    fix: 'Firefox: media.peerconnection.enabled → false в about:config. Chrome: расширение WebRTC Leak Prevent. Лучший вариант — Tor Browser.',
  });
  else if (client.webrtc.local.length || client.webrtc.mdns.length) leaks.push({
    title: 'WebRTC local leak',
    value: [...client.webrtc.local, ...client.webrtc.mdns].join(', '),
    level: 'yellow',
    why: 'WebRTC раскрыл локальные/mDNS-кандидаты. Прямого раскрытия публичного IP нет, но утечка данных есть.',
    fix: 'Отключи WebRTC в браузере — инструкция выше для Firefox и Chrome.',
  });

  // WebRTC proxy ports
  if (client.webrtc.proxy_ports && client.webrtc.proxy_ports.length) leaks.push({
    title: 'WebRTC proxy port',
    value: `Порт(ы): ${client.webrtc.proxy_ports.join(', ')}`,
    level: 'red',
    why: 'В WebRTC-кандидатах найдены порты, характерные для SOCKS/HTTP-прокси. Раскрывает наличие прокси-сервера.',
    fix: 'Отключи WebRTC в браузере — это единственный способ избежать такой утечки.',
  });

  // Canvas fingerprint
  if (client.canvas_hash && client.canvas_hash !== 'unsupported') leaks.push({
    title: 'Canvas fingerprint',
    value: client.canvas_hash,
    level: 'yellow',
    why: 'Canvas-хэш строится на основе GPU и шрифтов. Стабильный и уникальный для большинства браузеров.',
    fix: 'Tor Browser рандомизирует canvas. Brave — включи «Canvas fingerprint randomization». Firefox: расширение CanvasBlocker.',
  });

  // Audio fingerprint
  if (client.audio_hash && client.audio_hash !== 'unsupported') leaks.push({
    title: 'Audio fingerprint',
    value: client.audio_hash,
    level: 'yellow',
    why: 'Audio stack даёт стабильный сигнал на основе характеристик звуковой подсистемы.',
    fix: 'Tor Browser и Brave с включёнными защитами добавляют шум к аудио. Используй расширение Privacy Badger.',
  });

  // WebGL renderer
  const webglRenderer = client.webgl?.renderer;
  if (webglRenderer && webglRenderer !== 'unsupported') leaks.push({
    title: 'WebGL renderer',
    value: webglRenderer,
    level: 'yellow',
    why: 'GPU/vendor уникальны и в сочетании с другими сигналами позволяют точно идентифицировать устройство.',
    fix: 'Tor Browser блокирует WebGL по умолчанию. Brave добавляет шум. Можно отключить WebGL в about:config (Firefox) или через флаги (Chrome).',
  });

  // Font fingerprint
  if (client.fonts_count !== undefined && client.fonts_count > 20) leaks.push({
    title: 'Font fingerprint',
    value: `${client.fonts_count} системных шрифтов обнаружено`,
    level: 'yellow',
    why: 'Набор установленных шрифтов уникален для большинства систем и является стабильным компонентом fingerprint.',
    fix: 'Tor Browser ограничивает список доступных шрифтов. Brave частично защищает от font enumeration.',
  });

  // Incognito mode
  if (client.incognito?.detected) leaks.push({
    title: 'Приватный режим',
    value: 'Обнаружен',
    level: 'yellow',
    why: 'Приватный режим НЕ скрывает IP, fingerprint и не защищает от слежки сайтами. Он только не сохраняет историю локально.',
    fix: 'Не полагайся на приватный режим для анонимности в сети. Используй Tor Browser или VPN + Tor.',
  });

  // Battery
  if (client.battery) leaks.push({
    title: 'Battery API',
    value: `${client.battery.level}% ${client.battery.charging ? '(заряжается)' : '(разряжается)'}`,
    level: 'yellow',
    why: 'Уровень заряда и статус зарядки уникальны краткосрочно и могут использоваться для трекинга между сессиями.',
    fix: 'В Firefox Battery API отключён. Chrome пока предоставляет эти данные — полностью скрыть нельзя без другого браузера.',
  });

  // Network info
  if (client.network) {
    const netType = client.network.effective_type || client.network.type;
    if (netType) leaks.push({
      title: 'Network Info',
      value: `Тип: ${netType}${client.network.downlink ? `, ${client.network.downlink} Мбит/с` : ''}`,
      level: 'yellow',
      why: 'Тип подключения и скорость помогают отличить мобильного пользователя от VPN-пользователя на мобиле.',
      fix: 'Network Information API доступен только в Chrome/Edge. В Firefox отключён — используй Firefox для защиты.',
    });
  }

  // System locale mismatch
  if (client.system_locale && server.country) {
    const sysLang = (client.system_locale.number || '').split('-')[0].toLowerCase();
    if (sysLang && sysLang !== 'en') {
      const expected = COUNTRY_PRIMARY_LANG[server.country];
      if (expected) {
        const expectedArr = Array.isArray(expected) ? expected : [expected];
        const browserLang = (client.language || '').split('-')[0].toLowerCase();
        if (!expectedArr.includes(sysLang) && sysLang !== browserLang) {
          leaks.push({
            title: 'System locale mismatch',
            value: `OS: ${client.system_locale.number}, Browser: ${client.language}, IP-страна: ${server.country}`,
            level: 'red',
            why: 'Системная локаль ОС, язык браузера и страна IP указывают на разные регионы. Тройное несоответствие — сильнейший признак VPN.',
            fix: 'Tor Browser нормализует все параметры. Менять системную локаль ОС сложно и не даёт полного скрытия.',
          });
        }
      }
    }
  }

  // WebDriver
  if (client.webdriver) leaks.push({
    title: 'WebDriver',
    value: 'true',
    level: 'red',
    why: 'Флаг webdriver говорит о браузерной автоматизации (Selenium, Playwright, Puppeteer).',
    fix: 'Используй реальный браузер, не автоматизированный. Автоматизация легко детектируется.',
  });

  // Tor
  if (server.is_tor) leaks.push({
    title: 'Tor exit node',
    value: 'detected',
    level: 'yellow',
    why: 'IP найден в локальном списке Tor exit nodes.',
    fix: 'Tor хорош для анонимности, но сам факт его использования виден. В РФ для обхода блокировок используй obfs4-мосты.',
  });

  // VPN / hosting heuristics
  if (server.vpn_hosting_risk === 'medium' || server.vpn_hosting_risk === 'high') leaks.push({
    title: 'Hosting/VPN heuristics',
    value: server.vpn_hosting_reason,
    level: server.vpn_hosting_risk === 'high' ? 'red' : 'yellow',
    why: 'ASN или rDNS похожи на датацентр, VPS, VPN или прокси.',
    fix: 'Большинство коммерческих VPN имеют такие ASN. Для скрытия факта VPN нужны «чистые» резидентные прокси.',
  });

  // Headless browser detection
  const hdiff = client.headless?.outer_inner_height_diff ?? null;
  const wdiff = client.headless?.outer_inner_width_diff ?? null;
  if (hdiff !== null && hdiff === 0 && wdiff === 0) {
    leaks.push({
      title: 'Headless browser',
      value: `outer == inner: ширина ${wdiff}px, высота ${hdiff}px`,
      level: 'red',
      why: 'В реальном браузере outerHeight превышает innerHeight на размер тулбара (≥40px). Нулевая разница — признак Puppeteer/Playwright/Selenium.',
      fix: 'Это не утечка данных, но сайты используют этот сигнал для блокировки ботов и автоматизации.',
    });
  }

  // UA spoof: desktop UA but touch screen
  const maxTouch = client.headless?.max_touch_points ?? 0;
  if (maxTouch > 0 && client.device === 'Десктоп') {
    leaks.push({
      title: 'UA spoof (touch + desktop)',
      value: `Touch points: ${maxTouch}, UA device: ${client.device}`,
      level: 'red',
      why: 'User-Agent заявляет десктопное устройство, но устройство поддерживает тач. Типичный признак подмены UA на мобиле или планшете.',
      fix: 'Убедись что UA соответствует реальному устройству. Подмена легко детектируется по несоответствию с touchPoints.',
    });
  }

  // DNT header mismatch
  if (client.dnt_js === '1' && !server.dnt) {
    leaks.push({
      title: 'DNT mismatch',
      value: 'JS: navigator.doNotTrack=1, Сервер: заголовок отсутствует',
      level: 'yellow',
      why: 'Браузер декларирует DNT=1 через JS API, но сервер не получил этот заголовок. Признак прокси или расширения, модифицирующего заголовки.',
      fix: 'Это говорит о несоответствии между браузером и промежуточным слоем. Возможно, прокси удаляет или не прокидывает заголовок DNT.',
    });
  }

  // Bogon IP in X-Forwarded-For
  if (server.bogon_in_xff) {
    leaks.push({
      title: 'Bogon IP в X-Forwarded-For',
      value: server.x_forwarded_for,
      level: 'yellow',
      why: 'В цепочке X-Forwarded-For найден приватный/зарезервированный IP (RFC 1918, CGN, loopback). Признак некорректно настроенного прокси.',
      fix: 'Прокси не должен добавлять в XFF внутренние адреса. Это раскрывает топологию внутренней сети.',
    });
  }

  // Accept-Encoding: missing brotli = bot/script/stripping proxy
  if (server.accept_encoding && !server.accept_encoding.includes('br')) {
    leaks.push({
      title: 'Accept-Encoding: нет brotli',
      value: server.accept_encoding,
      level: 'yellow',
      why: 'Все современные браузеры поддерживают brotli (br). Его отсутствие говорит о curl/скрипте или прокси, удаляющем заголовки.',
      fix: 'Если ты в браузере — возможно, расширение или прокси модифицирует заголовки запроса.',
    });
  }

  // Weak geolocation accuracy (good for privacy)
  const accRadius = server.geo_accuracy_radius ? parseInt(String(server.geo_accuracy_radius), 10) : null;
  if (accRadius !== null && !isNaN(accRadius) && accRadius > 200) {
    leaks.push({
      title: 'Слабая геолокация по IP',
      value: `Точность: ±${accRadius} км`,
      level: 'green',
      why: 'Большой радиус точности геолокации означает, что точное местоположение по IP трудно определить. Это хороший знак для приватности.',
      fix: 'Это не требует действий — широкий радиус точности защищает геолокацию.',
    });
  }

  // PWA / standalone mode
  if (client.css_media?.display_standalone) {
    leaks.push({
      title: 'PWA standalone mode',
      value: 'display-mode: standalone',
      level: 'yellow',
      why: 'Страница запущена в режиме PWA-приложения. Раскрывает способ использования браузера.',
      fix: 'Это информационный сигнал о режиме работы браузера.',
    });
  }

  // Forced colors (accessibility mode)
  if (client.css_media?.forced_colors) {
    leaks.push({
      title: 'Forced colors (high contrast)',
      value: 'forced-colors: active',
      level: 'yellow',
      why: 'Включён режим высокого контраста Windows или системные настройки доступности. Редкая комбинация, усиливающая fingerprint.',
      fix: 'Режим высокого контраста можно отключить в настройках ОС, но это влияет на удобство использования.',
    });
  }

  // Worker/Realm consistency — spoof detection
  if (client.worker_consistency?.spoof_suspected) {
    const mList = (client.worker_consistency.mismatches || [])
      .map(m => `${m.field}: main=${m.main} / worker=${m.worker}`)
      .join('; ');
    leaks.push({
      title: 'Worker realm mismatch',
      value: mList,
      level: 'red',
      why: 'Значения из Web Worker отличаются от главного потока. Наиболее вероятная причина — скрипт или расширение, которое подменяет свойства navigator/Math в window, но не в Worker. Классический способ детекции спуфинга.',
      fix: 'Если это не намеренный спуфинг — проверь расширения. Браузерные расширения обычно работают только в main-thread и не достигают Web Worker.',
    });
  }

  // Timezone / Locale integrity: tz_offset vs. timezone name
  if (client.tz_locale) {
    const tz = client.tz_locale.timezone;
    const off = client.tz_locale.tz_offset_minutes;
    // Cross-check: Europe/Moscow is UTC+3 (-180 min offset). Detect gross mismatches.
    if (tz && off != null) {
      const tzPrefix = tz.split('/')[0];
      const offsetHours = -off / 60;
      let suspicious = false;
      if (tzPrefix === 'America' && offsetHours > 0) suspicious = true;
      if (tzPrefix === 'Europe'  && offsetHours < -1) suspicious = true;
      if (tzPrefix === 'Asia'    && offsetHours < 0) suspicious = true;
      if (suspicious) {
        leaks.push({
          title: 'TZ offset vs. name mismatch',
          value: `Timezone: ${tz}, UTC offset: ${offsetHours > 0 ? '+' : ''}${offsetHours.toFixed(1)}h`,
          level: 'red',
          why: 'Временная зона в Intl API и фактическое числовое смещение UTC не соответствуют друг другу. Признак подмены API.',
          fix: 'Если ты не использовал скрипт для подмены timezone — возможно, ошибка ОС или расширение.',
        });
      }
    }
    // Locale vs navigator.language mismatch
    if (client.tz_locale.lang_locale_match === false) {
      leaks.push({
        title: 'Locale / Language несоответствие',
        value: `navigator.language="${client.language}", Intl locale="${client.tz_locale.locale}"`,
        level: 'yellow',
        why: 'Язык браузера и язык системной локали Intl API различаются. Может говорить о подмене navigator.language или несогласованных настройках.',
        fix: 'Убедись, что настройки языка браузера согласованы с системными настройками Intl.',
      });
    }
  }

  return leaks;
}

function calculateScore(server, client, leaks) {
  return calculateScoreBreakdown(server, client, leaks).score;
}

function calculateScoreBreakdown(server, client, leaks) {
  const items = [];
  let score = 100;
  for (const l of leaks) {
    const pts = getDeductionByLevel(l.level);
    score -= pts;
    items.push({ name: l.title, deduction: pts, level: l.level });
  }
  const extras = [
    { check: !server.dnt,                                    name: 'Нет DNT заголовка',      pts: 2 },
    { check: client.cookie_enabled,                          name: 'Cookies включены',        pts: 2 },
    { check: server.referer_present,                         name: 'Referer заголовок',       pts: 2 },
    { check: server.origin_present,                          name: 'Origin заголовок',        pts: 2 },
    { check: server.sec_ch_ua_present,                       name: 'Client Hints',            pts: 1 },
    { check: (client.languages?.length ?? 0) > MAX_SAFE_LANGUAGES,
      name: `Много языков (${client.languages?.length ?? 0})`, pts: 1 },
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
const PROXY_PORTS = new Set([1080, 3128, 8080, 8888, 9050, 9150, 1194, 4145]);
const RISK_GREEN_THRESHOLD = 75;
const RISK_YELLOW_THRESHOLD = 45;
const LEVEL_DEDUCTIONS = Object.freeze({ red: 14, yellow: 5, green: 1 });

function getDeductionByLevel(level) {
  return LEVEL_DEDUCTIONS[level] ?? LEVEL_DEDUCTIONS.yellow;
}
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
  ctx.fillStyle = ls >= RISK_GREEN_THRESHOLD ? '#7cf29a' : ls >= RISK_YELLOW_THRESHOLD ? '#ffd166' : '#ff6b6b';
  ctx.fill();
}

function explainScore(score) {
  if (score >= RISK_GREEN_THRESHOLD) return 'Профиль относительно аккуратный: есть отдельные сигналы, но без критичных утечек.';
  if (score >= RISK_YELLOW_THRESHOLD) return 'Умеренный уровень палевности: часть сигналов заметна, но это ещё не максимальный риск.';
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

      if (item.fix) {
        const fix = document.createElement('div');
        fix.className = 'leak-fix';
        fix.textContent = '💡 ' + txt(item.fix);
        article.appendChild(fix);
      }

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
  setText('kv-dnsbl', server.dnsbl_listed != null ? `${server.dnsbl_listed}/${server.dnsbl_total} блэклистов` : '—');
  setText('kv-accept-encoding', server.accept_encoding || '—');
  setText('kv-bogon-xff', server.bogon_in_xff ? 'yes' : 'no');
  setText('kv-geo-accuracy', server.geo_accuracy_radius ? `±${server.geo_accuracy_radius} km` : '—');

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
  const webglStr = client.webgl?.renderer
    ? [client.webgl.renderer, client.webgl.max_texture_size ? `max tex ${client.webgl.max_texture_size}px` : '', `ext: ${client.webgl.extensions_count}`].filter(Boolean).join(' | ')
    : '—';
  setText('fp-webgl', webglStr);
  setText('fp-hash', client.fingerprint_hash || '—');
  setText('fp-incognito', client.incognito?.detected ? 'вероятно да' : (client.incognito?.detected === false ? 'нет' : '—'));
  setText('fp-battery', client.battery ? `${client.battery.level}% ${client.battery.charging ? '(заряжается)' : '(не заряжается)'}` : '—');
  setText('fp-network', client.network?.effective_type || client.network?.type || '—');
  setText('fp-locale', client.system_locale ? `${client.system_locale.number} / ${client.system_locale.collator}` : '—');
  setText('fp-fonts-count', client.fonts_count != null ? String(client.fonts_count) : '—');
  setText('fp-fonts-list', (client.fonts_list || []).join(', ') || '—');
  setText('fp-ua-brands', (client.ua_brands || []).join(', ') || '—');

  // Headless / automation signals
  const hl = client.headless || {};
  setText('fp-outer-diff', hl.outer_inner_width_diff != null ? `W:${hl.outer_inner_width_diff}px H:${hl.outer_inner_height_diff}px` : '—');
  setText('fp-orientation', hl.orientation_type || '—');
  setText('fp-pdf-viewer', hl.pdf_viewer_enabled ? 'yes' : 'no');
  setText('fp-offscreen-canvas', hl.offscreen_canvas ? 'yes' : 'no');
  setText('fp-max-touch', String(hl.max_touch_points ?? '—'));
  setText('fp-dnt-js', client.dnt_js != null ? String(client.dnt_js) : '—');

  // CSS media features
  const cm = client.css_media || {};
  const mediaStr = [
    cm.prefers_dark ? 'dark' : (cm.prefers_light ? 'light' : 'no-pref'),
    cm.prefers_reduced_motion ? 'reduced-motion' : null,
    cm.forced_colors ? 'forced-colors' : null,
    cm.pointer_fine ? 'pointer:fine' : (cm.pointer_coarse ? 'pointer:coarse' : null),
    cm.display_standalone ? 'standalone(PWA)' : null,
    cm.hdr ? 'HDR' : null,
    cm.color_gamut_p3 ? 'P3' : null,
  ].filter(Boolean).join(', ');
  setText('fp-css-media', mediaStr || '—');

  // Performance (heap, clock resolution, TZ offset)
  const pf = client.perf || {};
  setText('fp-perf-memory', pf.memory ? `${pf.memory.used_mb}/${pf.memory.total_mb} MB` : '—');
  setText('fp-clock-res', pf.clock_resolution_ms != null ? `${pf.clock_resolution_ms} ms` : '—');
  const tzOff = pf.tz_offset;
  setText('fp-tz-offset', tzOff != null ? `UTC${tzOff <= 0 ? '+' : ''}${(-tzOff / 60).toFixed(1).replace('.0', '')}` : '—');

  // Media devices
  const md = client.media_devices;
  setText('fp-media-devices', md ? `📹${md.cameras} 🎤${md.microphones} 🔊${md.speakers}` : '—');

  // AudioContext details
  const ac = client.audio_ctx_details;
  setText('fp-audio-ctx', ac ? `${ac.sample_rate}Hz · ${ac.state}${ac.base_latency != null ? ` · latency:${ac.base_latency}s` : ''}` : '—');

  // Browser API availability
  const ba = client.browser_apis || {};
  const apiFlags = [
    ba.device_motion ? 'motion' : null,
    ba.device_orientation ? 'orientation' : null,
    ba.vibrate ? 'vibrate' : null,
    ba.web_codecs ? 'WebCodecs' : null,
    ba.sensors ? 'Sensors' : null,
    ba.xr ? 'WebXR' : null,
    ba.share ? 'Share' : null,
    ba.cross_origin_isolated ? 'crossOriginIsolated' : null,
    ba.trusted_types ? 'trustedTypes' : null,
    ba.websql ? 'WebSQL' : null,
    ba.payment_request ? 'PaymentRequest' : null,
  ].filter(Boolean);
  setText('fp-browser-apis', apiFlags.join(', ') || 'none');

  setText('webrtc-supported', client.webrtc.supported ? 'supported' : 'not supported');
  setText('webrtc-local', client.webrtc.local.length ? client.webrtc.local.join(', ') : '—');
  setText('webrtc-public', client.webrtc.public.length ? client.webrtc.public.join(', ') : '—');
  setText('webrtc-mdns', client.webrtc.mdns.length ? client.webrtc.mdns.join(', ') : '—');
  setText('webrtc-proxy-ports', (client.webrtc.proxy_ports || []).length ? client.webrtc.proxy_ports.join(', ') : '—');
}

// ============================================================
// NEW DATA COLLECTORS — v7
// ============================================================

// ============================================================
// IP INTELLIGENCE & SERVER EXPOSURE — v8
// ============================================================

function fillIpIntelligence(server) {
  const asnType = server.asn_type || 'unknown';
  const asnLabels = {
    datacenter: '🏢 Датацентр / Хостинг',
    mobile: '📱 Мобильная сеть',
    residential: '🏠 Резидентная сеть',
    unknown: '❓ Неизвестно',
  };
  const asnColors = {
    datacenter: 'red-text',
    mobile: 'yellow-text',
    residential: 'green-text',
    unknown: '',
  };

  setText('asn-type-pill', asnLabels[asnType] || asnType);
  const asnTypeEl = $('ip-asn-type');
  if (asnTypeEl) {
    asnTypeEl.textContent = asnLabels[asnType] || asnType;
    asnTypeEl.className = asnColors[asnType] || '';
  }

  setText('ip-version-intel', server.client_ip_version || '—');
  setText('ip-org-intel', [server.asn ? 'AS' + server.asn : '', server.as_org].filter(Boolean).join(' • ') || '—');
  setText('ip-region-intel', [server.city, server.region, server.country].filter(Boolean).join(', ') || '—');

  // Proxy confidence composite score
  let confScore = 0;
  const confReasons = [];
  if (server.vpn_hosting_risk === 'high') { confScore += 3; confReasons.push('Tor'); }
  else if (server.vpn_hosting_risk === 'medium') { confScore += 2; confReasons.push('VPN/хостинг'); }
  if ((server.dnsbl_listed ?? 0) > 0) { confScore += 2; confReasons.push('DNSBL'); }
  if (server.bogon_in_xff) { confScore += 1; confReasons.push('bogon XFF'); }
  if (asnType === 'datacenter') { confScore += 1; confReasons.push('datacenter ASN'); }

  const confEl = $('ip-proxy-conf');
  if (confEl) {
    const reason = confReasons.length ? ' (' + confReasons.join(', ') + ')' : '';
    if (confScore >= 4) {
      confEl.textContent = '🔴 Высокая' + reason;
      confEl.className = 'red-text';
    } else if (confScore >= 2) {
      confEl.textContent = '🟡 Средняя' + reason;
      confEl.className = 'yellow-text';
    } else if (confScore >= 1) {
      confEl.textContent = '🟡 Низкая' + reason;
      confEl.className = 'yellow-text';
    } else {
      confEl.textContent = '🟢 Минимальная';
      confEl.className = 'green-text';
    }
  }

  if (server.dnsbl_listed != null) {
    const dnsblEl = $('ip-dnsbl-intel');
    if (dnsblEl) {
      dnsblEl.textContent = server.dnsbl_listed > 0
        ? `🔴 ${server.dnsbl_listed}/${server.dnsbl_total} блэклистов`
        : `🟢 Чисто (${server.dnsbl_total} проверено)`;
      dnsblEl.className = server.dnsbl_listed > 0 ? 'red-text' : 'green-text';
    }
  }

  const torEl = $('ip-tor-intel');
  if (torEl) {
    torEl.textContent = server.is_tor ? '🔴 Да' : '🟢 Нет';
    torEl.className = server.is_tor ? 'red-text' : 'green-text';
  }

  setText('ip-geo-accuracy-intel', server.geo_accuracy_radius ? `±${server.geo_accuracy_radius} км` : '—');
}

function fillServerExposure(server) {
  const exp = server.server_info_exposure;

  // Summary pill in card header
  const pill = $('server-exposure-pill');
  if (pill) {
    pill.textContent = !exp ? '—'
      : exp.level === 'red' ? '🔴 Риск'
      : exp.level === 'yellow' ? '🟡 Умеренно'
      : '🟢 OK';
  }

  // Sub-stat in summary card
  const expEl = $('server-exposure');
  if (expEl) {
    if (!exp) { expEl.textContent = '—'; }
    else if (exp.level === 'red') { expEl.textContent = '🔴 Высокий'; expEl.className = 'red-text'; }
    else if (exp.level === 'yellow') { expEl.textContent = '🟡 Средний'; expEl.className = 'yellow-text'; }
    else { expEl.textContent = '🟢 Низкий'; expEl.className = 'green-text'; }
  }

  // ASN type sub-stat in summary card
  const asnLabelsShort = { datacenter: '🏢 Датацентр', mobile: '📱 Мобильная', residential: '🏠 Резидентная', unknown: '❓' };
  setText('asn-type-stat', asnLabelsShort[server.asn_type] || server.asn_type || '—');

  // Detailed exposure card
  if (!exp) return;

  const levelEl = $('sei-level');
  if (levelEl) {
    const cls = exp.level === 'red' ? 'red-text' : exp.level === 'yellow' ? 'yellow-text' : 'green-text';
    const label = exp.level === 'red' ? '🔴 Критический' : exp.level === 'yellow' ? '🟡 Умеренный' : '🟢 Безопасный';
    levelEl.textContent = label;
    levelEl.className = cls;
  }

  const hasPrivateXff = (exp.issues || []).includes('private_ip_in_xff');
  const seiPrivateEl = $('sei-private-xff');
  if (seiPrivateEl) {
    seiPrivateEl.textContent = hasPrivateXff ? '🔴 Да — внутренние адреса в XFF' : '🟢 Нет';
    seiPrivateEl.className = hasPrivateXff ? 'red-text' : 'green-text';
  }

  const cipherVisible = (exp.issues || []).includes('tls_cipher_visible');
  const seiCipherVisEl = $('sei-cipher-visible');
  if (seiCipherVisEl) {
    seiCipherVisEl.textContent = cipherVisible ? '🟡 Да' : '🟢 Нет';
    seiCipherVisEl.className = cipherVisible ? 'yellow-text' : 'green-text';
  }

  const gradeEl = $('sei-cipher-grade');
  if (gradeEl) {
    const grade = server.tls_cipher_grade || '';
    const gradeMap = { modern: '🟢 Modern', transitional: '🟡 Transitional', legacy: '🔴 Legacy', '': '— (нет данных)' };
    gradeEl.textContent = gradeMap[grade] ?? grade;
    gradeEl.className = grade === 'modern' ? 'green-text' : grade === 'legacy' ? 'red-text' : grade === 'transitional' ? 'yellow-text' : '';
  }
}

async function getFullClientHints() {
  try {
    if (!navigator.userAgentData?.getHighEntropyValues) return null;
    return await navigator.userAgentData.getHighEntropyValues([
      'architecture', 'bitness', 'mobile', 'model',
      'platform', 'platformVersion', 'uaFullVersion', 'fullVersionList',
    ]);
  } catch { return null; }
}

async function getBrowserPermissions() {
  if (!navigator.permissions?.query) return null;
  const perms = ['geolocation', 'camera', 'microphone', 'notifications', 'midi'];
  const clipPerms = ['clipboard-read', 'clipboard-write'];
  const result = {};
  for (const name of perms) {
    try { result[name] = (await navigator.permissions.query({ name })).state; }
    catch { result[name] = 'n/a'; }
  }
  for (const name of clipPerms) {
    try { result[name] = (await navigator.permissions.query({ name })).state; }
    catch { result[name] = 'n/a'; }
  }
  return result;
}

function getStorageState() {
  const result = {
    cookies: !!navigator.cookieEnabled,
    local_storage: false,
    session_storage: false,
    indexed_db: !!window.indexedDB,
  };
  try { localStorage.setItem('_t', '1'); localStorage.removeItem('_t'); result.local_storage = true; } catch {}
  try { sessionStorage.setItem('_t', '1'); sessionStorage.removeItem('_t'); result.session_storage = true; } catch {}
  return result;
}

async function getStorageQuota() {
  try {
    if (!navigator.storage?.estimate) return null;
    const { quota, usage } = await navigator.storage.estimate();
    const q = quota ?? null, u = usage ?? null;
    return {
      quota_mb: q != null ? Math.round(q / 1048576) : null,
      usage_mb: u != null ? Math.round(u / 1048576 * 10) / 10 : null,
      percent: q && u ? Math.round(u / q * 1000) / 10 : null,
    };
  } catch { return null; }
}

async function getServiceWorkerInfo() {
  const supported = !!navigator.serviceWorker;
  const cache_api = !!window.caches;
  if (!supported) return { supported, cache_api, active: false };
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    return { supported, cache_api, active: !!(reg?.active), scope: reg?.scope || null };
  } catch { return { supported, cache_api, active: false }; }
}

async function detectAdBlock() {
  try {
    const el = document.createElement('div');
    el.className = 'adsbox pub_300x250 ad-placement ad-unit';
    el.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;pointer-events:none';
    document.body.appendChild(el);
    await new Promise(r => setTimeout(r, 120));
    const hidden = el.offsetParent === null || el.offsetWidth === 0 ||
                   getComputedStyle(el).display === 'none';
    document.body.removeChild(el);
    return { detected: hidden };
  } catch { return { detected: null }; }
}

function testCookiePolicy() {
  const key = '_cptest_' + Math.random().toString(36).slice(2, 8);
  document.cookie = `${key}=1; path=/; SameSite=Lax`;
  const ok = document.cookie.indexOf(key) !== -1;
  document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  return { first_party_ok: ok, cookies_enabled: !!navigator.cookieEnabled };
}

function checkUaChConsistency(ua, hints) {
  if (!hints) return null;
  const issues = [];
  if (hints.platform) {
    const p = hints.platform.toLowerCase();
    const uaOs = detectOS(ua || '');
    const map = { windows: 'Windows', linux: 'Linux', macos: 'macOS', android: 'Android' };
    let found = false;
    for (const [k, v] of Object.entries(map)) {
      if (p.includes(k)) { found = true; if (uaOs !== v) issues.push(`OS: UA=${uaOs} / UA-CH=${hints.platform}`); break; }
    }
    if (!found && (p === 'iphone os' || p === 'ios') && uaOs !== 'iOS') {
      issues.push(`OS: UA=${uaOs} / UA-CH=${hints.platform}`);
    }
  }
  if (hints.mobile !== undefined) {
    const uaMobile = detectDevice(ua || '') !== 'Десктоп';
    if (uaMobile !== hints.mobile) issues.push(`Mobile: UA=${uaMobile} / UA-CH=${hints.mobile}`);
  }
  return { consistent: issues.length === 0, issues };
}

const _STAB_KEY = 'myip_fp_stability';
const MAX_STAB_HISTORY = 10;

function _saveStabilitySnap(snap) {
  try {
    const history = JSON.parse(localStorage.getItem(_STAB_KEY) || '[]');
    history.push(snap);
    if (history.length > MAX_STAB_HISTORY) history.splice(0, history.length - MAX_STAB_HISTORY);
    localStorage.setItem(_STAB_KEY, JSON.stringify(history));
  } catch {}
}

function _getStabilityHistory() {
  try { return JSON.parse(localStorage.getItem(_STAB_KEY) || '[]'); } catch { return []; }
}

function computeStability() {
  const history = _getStabilityHistory();
  if (history.length < 2) return null;
  const fields = ['language', 'timezone', 'screen', 'browser', 'os', 'dpr'];
  let totalChecks = 0, stableChecks = 0;
  for (let i = 1; i < history.length; i++) {
    for (const f of fields) {
      totalChecks++;
      if (history[i][f] === history[i - 1][f]) stableChecks++;
    }
  }
  return { pct: Math.round(stableChecks / totalChecks * 100), n: history.length };
}

function getFingerprintDrift(client) {
  const KEY = 'myip_fp_snap';
  const snap = {
    language: client.language, timezone: client.timezone,
    screen: client.screen, browser: client.browser,
    os: client.os, dpr: client.dpr, hash: client.fingerprint_hash,
    ts: Date.now(),
  };
  let drift = null;
  try {
    const prev = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (prev) {
      const changed = [];
      for (const k of ['language', 'timezone', 'screen', 'browser', 'os', 'dpr']) {
        if (prev[k] !== snap[k]) changed.push({ field: k, from: prev[k], to: snap[k] });
      }
      drift = { changed, hash_changed: prev.hash !== snap.hash, prev_ts: prev.ts || null };
    }
    localStorage.setItem(KEY, JSON.stringify(snap));
  } catch {}
  // Track multi-visit component stability
  _saveStabilitySnap({ language: snap.language, timezone: snap.timezone, screen: snap.screen, browser: snap.browser, os: snap.os, dpr: snap.dpr });
  return drift;
}

const _RISK_CAT_MAP = {
  network: ['IP-адрес', 'Reverse DNS', 'X-Forwarded-For', 'X-Real-IP',
            'WebRTC public leak', 'WebRTC local leak', 'WebRTC proxy port',
            'DNSBL blacklist', 'Hosting/VPN heuristics', 'Bogon IP в X-Forwarded-For',
            'Слабая геолокация по IP'],
  browser: ['Canvas fingerprint', 'Audio fingerprint', 'WebGL renderer',
            'Font fingerprint', 'Battery API', 'Network Info', 'WebDriver',
            'Headless browser', 'Приватный режим', 'UA spoof (touch + desktop)'],
  behavior: ['Timezone mismatch', 'Язык ≠ страна IP', 'System locale mismatch',
             'PWA standalone mode', 'Forced colors (high contrast)', 'DNT mismatch',
             'TZ offset vs. name mismatch', 'Locale / Language несоответствие'],
  protocol: ['Accept-Encoding: нет brotli', 'Tor exit node'],
  spoof:    ['Worker realm mismatch', 'TZ offset vs. name mismatch'],
};

function buildRiskCategories(leaks) {
  const cats = {
    network:  { label: '🌐 Сеть',         items: [] },
    browser:  { label: '🖥 Браузер',       items: [] },
    behavior: { label: '⚠️ Поведение',    items: [] },
    protocol: { label: '🔒 Протокол',      items: [] },
    spoof:    { label: '🕵️ Спуфинг',      items: [] },
    other:    { label: '📋 Прочее',         items: [] },
  };
  for (const l of leaks) {
    let placed = false;
    for (const [cat, titles] of Object.entries(_RISK_CAT_MAP)) {
      if (titles.includes(l.title)) { cats[cat].items.push(l); placed = true; break; }
    }
    if (!placed) cats.other.items.push(l);
  }
  return cats;
}

function buildRecommendations(server, client, leaks, perms, adblock, gpc, quota) {
  const recs = [];
  const add = (prio, label, detail, done) => recs.push({ prio, label, detail, done: !!done });

  if (client.webrtc?.public?.length)
    add('critical', 'Отключить WebRTC', 'Утечка реального IP через WebRTC. Firefox: media.peerconnection.enabled=false в about:config.', false);

  if (client.canvas_hash && client.canvas_hash !== 'unsupported')
    add('high', 'Защитить Canvas fingerprint', 'Включи защиту canvas в Brave или используй Tor Browser / расширение CanvasBlocker.', false);

  if (client.audio_hash && client.audio_hash !== 'unsupported')
    add('high', 'Защитить Audio fingerprint', 'Brave: включи «Fingerprinting Protection». Firefox: расширение CanvasBlocker также блокирует аудио.', false);

  add('high', 'Установить uBlock Origin',
    adblock?.detected
      ? 'Блокировщик уже активен — отлично! Убедись, что обновлены фильтры.'
      : 'Блокировщик рекламы и трекеров существенно снижает слежку. Доступен для всех браузеров.',
    adblock?.detected);

  add('medium', 'Включить Global Privacy Control',
    gpc
      ? 'GPC-сигнал активен — браузер запрашивает «не продавать мои данные».'
      : 'Brave и Firefox с расширением GPC Signal отправляют этот заголовок.',
    !!gpc);

  add('low', 'Включить DNT-заголовок',
    server.dnt
      ? 'DNT включён. Учти: сайты не обязаны его соблюдать.'
      : 'Do Not Track сигнализирует о предпочтениях приватности, хотя и не является обязательным.',
    !!server.dnt);

  if (client.battery)
    add('medium', 'Сменить браузер / отключить Battery API', 'Firefox отключил Battery API. Chrome продолжает его предоставлять.', false);

  if ((client.fonts_count ?? 0) > 20)
    add('medium', 'Ограничить доступ к шрифтам', 'Tor Browser ограничивает список шрифтов. Brave частично защищает от font enumeration.', false);

  if (leaks.find(l => l.title === 'Timezone mismatch'))
    add('high', 'Нормализовать timezone', 'Brave: Settings→Privacy→Use generic time zone. Tor Browser делает это автоматически.', false);

  if (!client.webrtc?.supported || (!client.webrtc?.public?.length && !client.webrtc?.local?.length))
    add('high', 'WebRTC', 'WebRTC не раскрывает IP — хороший знак.', true);

  if (perms?.geolocation === 'granted')
    add('medium', 'Отозвать доступ к Геолокации', 'Браузер выдал разрешение на геолокацию. Отзови его в настройках сайта.', false);

  return recs.sort((a, b) => {
    const o = { critical: 0, high: 1, medium: 2, low: 3 };
    return (o[a.prio] ?? 9) - (o[b.prio] ?? 9);
  });
}

function buildBrowserComparison(client, server, adblock, gpc, perms) {
  return [
    { label: 'WebRTC отключён / не течёт', done: !client.webrtc?.supported || (!client.webrtc?.public?.length && !client.webrtc?.local?.length) },
    { label: 'Canvas fingerprint защищён', done: !client.canvas_hash || client.canvas_hash === 'unsupported' },
    { label: 'Audio fingerprint защищён', done: !client.audio_hash || client.audio_hash === 'unsupported' },
    { label: 'Battery API недоступен', done: !client.battery },
    { label: 'Network Info API недоступен', done: !client.network },
    { label: 'AdBlock активен', done: !!adblock?.detected },
    { label: 'GPC включён', done: !!gpc },
    { label: 'DNT включён', done: !!server.dnt },
    { label: 'Fonts ≤ 10 системных', done: (client.fonts_count ?? 99) <= 10 },
    { label: 'WebDriver не обнаружен', done: !client.webdriver },
    { label: 'Геолокация не granted', done: perms?.geolocation !== 'granted' },
    { label: 'JS Heap не раскрыт', done: !client.perf?.memory },
    { label: 'WebGL renderer скрыт', done: !client.webgl?.renderer || client.webgl.renderer === 'unsupported' },
    { label: 'Камера не granted', done: perms?.camera !== 'granted' },
    { label: 'TLS cipher modern', done: !server.tls_cipher_grade || server.tls_cipher_grade === 'modern' },
    { label: 'Нет приватных IP в XFF', done: !(server.server_info_exposure?.issues ?? []).includes('private_ip_in_xff') },
  ];
}

// ============================================================
// NEW RENDERING FUNCTIONS — v7
// ============================================================

function fillUaCh(hints, uaConsistency, secChUaHeader) {
  setText('ua-ch-sec-header', secChUaHeader || '—');
  if (!hints) {
    setText('ua-ch-status', 'Не доступно (нужен HTTPS и Chromium-браузер)');
    return;
  }
  setText('ua-ch-status', 'Доступно');
  setText('ua-ch-platform', hints.platform ?? '—');
  setText('ua-ch-platformversion', hints.platformVersion ?? '—');
  setText('ua-ch-architecture', hints.architecture ?? '—');
  setText('ua-ch-bitness', hints.bitness ?? '—');
  setText('ua-ch-mobile', hints.mobile != null ? String(hints.mobile) : '—');
  setText('ua-ch-model', hints.model || '—');
  setText('ua-ch-uafullversion', hints.uaFullVersion ?? '—');
  setText('ua-ch-brands', hints.fullVersionList
    ? hints.fullVersionList.map(b => `${b.brand} ${b.version}`).join(', ')
    : '—');
  if (uaConsistency) {
    setText('ua-ch-consistency', uaConsistency.consistent
      ? '✅ UA и UA-CH совпадают'
      : '⚠️ ' + uaConsistency.issues.join('; '));
  }
}

function fillPermissions(perms) {
  const grid = $('perms-grid');
  if (!grid) return;
  if (!perms) { grid.innerHTML = '<div class="empty">Permissions API недоступен в этом браузере.</div>'; return; }
  grid.replaceChildren();
  const labels = {
    geolocation: '📍 Геолокация', camera: '📹 Камера', microphone: '🎤 Микрофон',
    notifications: '🔔 Уведомления', midi: '🎹 MIDI',
    'clipboard-read': '📋 Буфер чтение', 'clipboard-write': '📋 Буфер запись',
  };
  for (const [k, v] of Object.entries(perms)) {
    const div = document.createElement('div');
    div.className = 'kv';
    const label = document.createElement('span');
    label.textContent = labels[k] || k;
    const val = document.createElement('strong');
    val.textContent = v;
    val.className = v === 'granted' ? 'red-text' : v === 'denied' ? 'green-text' : '';
    div.appendChild(label); div.appendChild(val);
    grid.appendChild(div);
  }
}

function fillStorageState(state, quota, swInfo) {
  const yn = v => v ? '✅ доступен' : '❌ заблокирован';
  setText('store-cookies', yn(state?.cookies));
  setText('store-local', yn(state?.local_storage));
  setText('store-session', yn(state?.session_storage));
  setText('store-idb', yn(state?.indexed_db));
  setText('store-quota', quota
    ? `${quota.quota_mb ?? '?'} МБ квоты; исп: ${quota.usage_mb ?? '?'} МБ${quota.percent != null ? ' (' + quota.percent + '%)' : ''}`
    : '—');
  setText('store-sw', swInfo?.supported
    ? (swInfo.active ? '✅ Активен' : '⚠️ Поддерживается, неактивен')
    : '❌ Не поддерживается');
  setText('store-cache', swInfo?.cache_api ? '✅ Cache API есть' : '❌ Нет');
}

function fillNetworkPrivacy(server, client, adblock, cookieTest, gpcJs, respHeaders) {
  setText('np-gpc-server', server.sec_gpc ? `🟢 Отправляет (Sec-GPC: ${server.sec_gpc})` : '🔴 Заголовок не отправлен');
  setText('np-gpc-js', gpcJs != null ? (gpcJs ? '🟢 Активен' : '🔴 Выключен') : '—');
  setText('np-adblock', adblock?.detected === true ? '🟢 Обнаружен' : adblock?.detected === false ? '🔴 Не обнаружен' : '—');
  setText('np-cookie-test', cookieTest ? (cookieTest.first_party_ok ? '✅ First-party cookies: OK' : '❌ First-party cookies: заблокированы') : '—');
  setText('np-referrer-policy', respHeaders.referrerPolicy || '—');
  setText('np-ip-version', server.client_ip_version || '—');
  const c = client.network;
  setText('np-net-type', c ? (c.effective_type || c.type || '—') : '—');
  setText('np-net-rtt', c?.rtt != null ? `${c.rtt} мс` : '—');
  setText('np-net-downlink', c?.downlink != null ? `${c.downlink} Мбит/с` : '—');
  setText('np-save-data', c?.save_data ? '🟢 Включён' : '🔴 Выключен');
}

function fillSecFetch(server) {
  setText('sf-site', server.sec_fetch_site || '—');
  setText('sf-mode', server.sec_fetch_mode || '—');
  setText('sf-dest', server.sec_fetch_dest || '—');
  setText('sf-user', server.sec_fetch_user || '—');
  setText('sf-gpc', server.sec_gpc || '—');
  setText('sf-tls', server.tls_version || '—');
  setText('sf-cipher', server.tls_cipher || '—');
  setText('sf-http-proto', server.http_version || '—');
}

function fillPageSecurity(respHeaders) {
  setText('sec-csp', respHeaders.csp || '—');
  setText('sec-coop', respHeaders.coop || '—');
  setText('sec-coep', respHeaders.coep || '—');
  setText('sec-xfo', respHeaders.xfo || '—');
  setText('sec-hsts', respHeaders.hsts || '—');
  setText('sec-pp', respHeaders.permissionsPolicy || '—');
  setText('sec-xcto', respHeaders.xContentTypeOptions || '—');
  setText('sec-corp', respHeaders.crossOriginResourcePolicy || '—');
}

function fillDriftHistory(drift) {
  const box = $('drift-list');
  if (!box) return;
  // Show multi-visit stability metric
  const stability = computeStability();
  const stabRow = $('stability-row');
  if (stabRow && stability) {
    stabRow.style.display = 'flex';
    setText('stab-n', String(stability.n));
    const stabScore = $('stab-score');
    if (stabScore) {
      stabScore.textContent = `${stability.pct}%`;
      stabScore.className = stability.pct >= 90 ? 'green-text' : stability.pct >= 70 ? 'yellow-text' : 'red-text';
    }
  }
  if (!drift) {
    box.innerHTML = '<div class="drift-ok">📌 Первый визит — эталон fingerprint сохранён в localStorage.</div>';
    return;
  }
  box.replaceChildren();
  if (drift.hash_changed) {
    const el = document.createElement('div');
    el.className = 'drift-item danger';
    el.textContent = '⚠️ Fingerprint hash изменился с прошлого визита!';
    box.appendChild(el);
  }
  if (drift.changed.length === 0 && !drift.hash_changed) {
    const el = document.createElement('div');
    el.className = 'drift-ok';
    el.textContent = '✅ Все параметры стабильны с прошлого визита.';
    box.appendChild(el);
  }
  for (const c of drift.changed) {
    const el = document.createElement('div');
    el.className = 'drift-item';
    el.textContent = `${c.field}: «${c.from}» → «${c.to}»`;
    box.appendChild(el);
  }
}

function fillRiskCategories(cats) {
  const container = $('risk-cats');
  if (!container) return;
  container.replaceChildren();
  let hasAny = false;
  for (const [, cat] of Object.entries(cats)) {
    if (cat.items.length === 0) continue;
    hasAny = true;
    const total = cat.items.reduce((s, l) => s + getDeductionByLevel(l.level), 0);
    const div = document.createElement('div');
    div.className = 'cat-block';
    const h = document.createElement('div');
    h.className = 'cat-head';
    h.textContent = `${cat.label} — ${cat.items.length} сигн., −${total} pts`;
    div.appendChild(h);
    const ul = document.createElement('ul');
    ul.className = 'cat-list';
    for (const l of cat.items) {
      const li = document.createElement('li');
      li.className = `cat-item ${l.level}`;
      li.textContent = l.title;
      ul.appendChild(li);
    }
    div.appendChild(ul);
    container.appendChild(div);
  }
  if (!hasAny) {
    const el = document.createElement('div');
    el.className = 'drift-ok';
    el.textContent = '✅ Нет значимых сигналов.';
    container.appendChild(el);
  }
}

function fillRecommendations(recs) {
  const box = $('recs-list');
  if (!box) return;
  box.replaceChildren();
  const icons = { critical: '🚨', high: '🔴', medium: '🟡', low: '🟢' };
  for (const r of recs) {
    const div = document.createElement('div');
    div.className = `rec-item${r.done ? ' done' : ''}`;
    const title = document.createElement('strong');
    title.textContent = `${icons[r.prio] || '•'} ${r.label}`;
    const detail = document.createElement('div');
    detail.className = 'rec-detail';
    detail.textContent = r.detail;
    div.appendChild(title);
    div.appendChild(detail);
    box.appendChild(div);
  }
}

function fillBrowserComparison(items) {
  const box = $('compare-grid');
  if (!box) return;
  const done = items.filter(i => i.done).length;
  setText('compare-score', `${done} / ${items.length}`);
  box.replaceChildren();
  for (const item of items) {
    const div = document.createElement('div');
    div.className = `cmp-item ${item.done ? 'pass' : 'fail'}`;
    div.textContent = `${item.done ? '✅' : '❌'} ${item.label}`;
    box.appendChild(div);
  }
}

function setupExportButtons(getJson) {
  const jsonBtn = $('export-json-btn');
  if (jsonBtn) {
    jsonBtn.addEventListener('click', () => {
      const blob = new Blob([getJson()], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `myip-report-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    });
  }
  const txtBtn = $('export-txt-btn');
  if (txtBtn) {
    txtBtn.addEventListener('click', () => {
      try {
        const d = JSON.parse(getJson());
        let r = `KLEVA My-IP Privacy Report\n${new Date().toISOString()}\n${'='.repeat(48)}\n`;
        r += `IP:           ${d.client_server_view?.ip || '?'}\n`;
        r += `Страна:       ${d.client_server_view?.country || '?'}\n`;
        r += `ASN:          ${d.client_server_view?.as_org || '?'}\n`;
        r += `Privacy Score: ${d.privacy_score}/100\n`;
        r += `Risk level:   ${d.risk_level}\n\n`;
        r += `Утечки (${(d.leaks || []).length}):\n`;
        for (const l of (d.leaks || [])) r += `  [${(l.level || '').toUpperCase()}] ${l.title}: ${l.value}\n`;
        r += `\nAdBlock: ${d.adblock?.detected}\n`;
        const blob = new Blob([r], { type: 'text/plain;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `myip-report-${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(a.href);
      } catch {}
    });
  }
}

// ============================================================
// NEW RENDERING FUNCTIONS — v10
// ============================================================

function fillSystemColors(colors) {
  const grid = $('system-colors-grid');
  if (!grid) return;
  if (!colors) { grid.innerHTML = '<div class="empty">—</div>'; return; }
  grid.replaceChildren();
  const rows = [
    ['Accent color', colors.accent_color],
    ['Color scheme', colors.color_scheme],
    ['Checkbox bg', colors.checkbox_bg],
    ['Checkbox border', colors.checkbox_border],
    ['Select bg', colors.select_bg],
    ['Select color', colors.select_color],
    ['Button bg', colors.button_bg],
    ['Scrollbar color', colors.scrollbar_color],
  ];
  for (const [label, value] of rows) {
    if (!value) continue;
    const div = document.createElement('div');
    div.className = 'kv';
    const s = document.createElement('span');
    s.textContent = label;
    const strong = document.createElement('strong');
    strong.style.fontFamily = 'var(--mono)';
    strong.style.fontSize = '12px';
    strong.textContent = value;
    // Show color swatch for color values
    if (/^rgb|#|hsl/.test(value)) {
      const swatch = document.createElement('span');
      swatch.style.cssText = `display:inline-block;width:12px;height:12px;border-radius:3px;background:${value};border:1px solid var(--line);margin-left:6px;vertical-align:middle`;
      strong.appendChild(swatch);
    }
    div.appendChild(s);
    div.appendChild(strong);
    grid.appendChild(div);
  }
}

function fillMathFingerprint(mathFp) {
  const grid = $('math-fp-grid');
  if (!grid) return;
  if (!mathFp) { grid.innerHTML = '<div class="empty">—</div>'; return; }
  grid.replaceChildren();
  const labels = {
    tan: 'Math.tan(-1e300)', sin: 'Math.sin(π)', cos: 'Math.cos(π)',
    acos: 'Math.acos(0.123…)', atan2: 'Math.atan2(90,15)',
    exp: 'Math.exp(1)', log: 'Math.log(π)',
    sinh: 'Math.sinh(1)', cosh: 'Math.cosh(1)', tanh: 'Math.tanh(1)',
    sqrt2: 'Math.SQRT2',
  };
  for (const [k, label] of Object.entries(labels)) {
    const v = mathFp[k];
    if (v === undefined) continue;
    const div = document.createElement('div');
    div.className = 'kv';
    const s = document.createElement('span');
    s.textContent = label;
    const strong = document.createElement('strong');
    strong.style.fontFamily = 'var(--mono)';
    strong.style.fontSize = '11px';
    strong.textContent = typeof v === 'number' ? v.toString() : String(v);
    div.appendChild(s);
    div.appendChild(strong);
    grid.appendChild(div);
  }
}

function fillSpeechAndPlugins(speech, plugins) {
  const speechEl = $('speech-voices');
  if (speechEl) {
    if (!speech) { speechEl.textContent = 'Не поддерживается'; }
    else {
      speechEl.textContent = `${speech.count} голос(ов)`;
      if (speech.sample && speech.sample.length) {
        speechEl.textContent += ' — ' + speech.sample.slice(0, 3).join(', ') + (speech.count > 3 ? '…' : '');
      }
    }
  }
  const pluginsEl = $('plugins-count');
  if (pluginsEl) {
    if (!plugins) { pluginsEl.textContent = '—'; }
    else {
      pluginsEl.textContent = String(plugins.count);
      if (plugins.names && plugins.names.length) {
        pluginsEl.textContent += ' — ' + plugins.names.join(', ');
      }
    }
  }
}

function fillHttpHeaders(headers) {
  const grid = $('http-headers-grid');
  if (!grid) return;
  if (!headers || typeof headers !== 'object') {
    grid.innerHTML = '<div class="empty">—</div>';
    return;
  }
  grid.replaceChildren();
  const entries = Object.entries(headers);
  if (!entries.length) {
    grid.innerHTML = '<div class="empty">Заголовки не получены.</div>';
    return;
  }
  // Sort: security/fingerprint-relevant headers first
  const PRIORITY = ['User-Agent','Accept','Accept-Language','Accept-Encoding',
                    'Accept-Charset','Connection','TE','Cache-Control',
                    'Pragma','Upgrade-Insecure-Requests','Sec-Fetch-Site',
                    'Sec-Fetch-Mode','Sec-Fetch-Dest','Sec-Fetch-User',
                    'Sec-Ch-Ua','Sec-Ch-Ua-Mobile','Sec-Ch-Ua-Platform',
                    'Sec-Gpc','Dnt','Referer'];
  entries.sort(([a], [b]) => {
    const ai = PRIORITY.indexOf(a), bi = PRIORITY.indexOf(b);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.localeCompare(b);
  });
  for (const [name, value] of entries) {
    const div = document.createElement('div');
    div.className = 'kv';
    const label = document.createElement('span');
    label.textContent = name;
    const val = document.createElement('strong');
    val.className = 'mono';
    val.style.fontSize = '11px';
    val.textContent = String(value);
    div.appendChild(label);
    div.appendChild(val);
    grid.appendChild(div);
  }
}

function fillIPv6Test(mainIp, mainVer, ipv6result) {
  setText('ipv6-main-ip', mainIp || '—');
  setText('ipv6-main-ver', mainVer || '—');
  if (!ipv6result) {
    setText('ipv6-detected', 'Недоступен (нет IPv6 на сервере)');
    setText('ipv6-ep-ver', '—');
    const statusEl = $('ipv6-status');
    if (statusEl) { statusEl.textContent = '⚪ Тест недоступен'; statusEl.className = ''; }
    const pill = $('ipv6-pill');
    if (pill) pill.textContent = '⚪ N/A';
    return;
  }
  setText('ipv6-detected', ipv6result.ip || '—');
  setText('ipv6-ep-ver', ipv6result.version || '—');
  const statusEl = $('ipv6-status');
  const pill = $('ipv6-pill');
  const mainIsV4 = mainVer === 'IPv4';
  const epIsV6 = ipv6result.version === 'IPv6';
  if (mainIsV4 && epIsV6) {
    if (statusEl) { statusEl.textContent = '🔴 IPv6 leak — реальный IPv6 раскрыт при IPv4-VPN'; statusEl.className = 'red-text'; }
    if (pill) pill.textContent = '🔴 Leak';
  } else if (!epIsV6) {
    if (statusEl) { statusEl.textContent = '🟢 IPv6 не используется / заблокирован'; statusEl.className = 'green-text'; }
    if (pill) pill.textContent = '🟢 Safe';
  } else {
    if (statusEl) { statusEl.textContent = '🟡 IPv6 используется (основное соединение тоже IPv6)'; statusEl.className = 'yellow-text'; }
    if (pill) pill.textContent = '🟡 IPv6';
  }
}

function fillFingerprintUniqueness(uniqueness, fpHash) {
  setText('fp-uniq-hash', fpHash || '—');
  if (!uniqueness) {
    setText('fp-uniq-sessions', '—');
    setText('fp-uniq-ips', '—');
    setText('fp-uniq-level', '—');
    const pill = $('fp-unique-pill');
    if (pill) pill.textContent = 'нет данных';
    return;
  }
  const { total_sessions, unique_ips } = uniqueness;
  setText('fp-uniq-sessions', String(total_sessions));
  setText('fp-uniq-ips', String(unique_ips));
  const levelEl = $('fp-uniq-level');
  const pill = $('fp-unique-pill');
  if (total_sessions === 1) {
    if (levelEl) { levelEl.textContent = '🟢 Первый раз — уникальный'; levelEl.className = 'green-text'; }
    if (pill) pill.textContent = '🟢 Уникальный';
  } else if (unique_ips > 1) {
    if (levelEl) { levelEl.textContent = `🔴 Виден с ${unique_ips} IP — надёжно отслеживается`; levelEl.className = 'red-text'; }
    if (pill) pill.textContent = '🔴 Отслеживается';
  } else {
    if (levelEl) { levelEl.textContent = `🟡 ${total_sessions} сессий, 1 IP — скорее всего ты`; levelEl.className = 'yellow-text'; }
    if (pill) pill.textContent = '🟡 ' + total_sessions + ' сессий';
  }
}

function fillVisitTimeline(timeline) {
  const box = $('visit-timeline');
  if (!box) return;
  if (!timeline || !timeline.length) {
    box.innerHTML = '<div class="empty">Данных нет — это первый визит с таким fingerprint.</div>';
    return;
  }
  box.replaceChildren();
  timeline.forEach((visit, i) => {
    const item = document.createElement('div');
    item.className = 'timeline-item';
    const dot = document.createElement('div');
    dot.className = 'timeline-dot ' + (i === 0 ? 'same' : 'diff');
    const meta = document.createElement('div');
    meta.className = 'timeline-meta';
    const date = document.createElement('div');
    date.className = 'timeline-date';
    // Format date nicely
    try {
      const d = new Date(visit.created_at);
      date.textContent = d.toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' });
    } catch { date.textContent = String(visit.created_at || '?'); }
    const ipEl = document.createElement('div');
    ipEl.className = 'timeline-ip';
    // Mask middle of IP for display
    const ip = String(visit.ip || '?');
    const parts = ip.split('.');
    const maskedIp = parts.length === 4 ? `${parts[0]}.${parts[1]}.x.x` : ip;
    const loc = [visit.geo_city, visit.geo_country].filter(Boolean).join(', ');
    ipEl.textContent = maskedIp + (loc ? ' • ' + loc : '');
    meta.appendChild(date);
    meta.appendChild(ipEl);
    item.appendChild(dot);
    item.appendChild(meta);
    if (i === 0) {
      const badge = document.createElement('span');
      badge.className = 'badge green';
      badge.textContent = 'текущий';
      item.appendChild(badge);
    }
    box.appendChild(item);
  });
}

function fillWebGLDetailed(webgl) {
  const grid = $('webgl-detailed-grid');
  if (!grid) return;
  if (!webgl) {
    grid.innerHTML = '<div class="empty">WebGL недоступен или заблокирован.</div>';
    return;
  }
  grid.replaceChildren();
  const rows = [
    ['Vendor', webgl.vendor],
    ['Renderer', webgl.renderer],
    ['GL Version', webgl.version],
    ['GLSL Version', webgl.shading_language],
    ['Max Texture Size', webgl.max_texture_size ? `${webgl.max_texture_size}px` : null],
    ['Max Renderbuffer', webgl.max_renderbuffer ? `${webgl.max_renderbuffer}px` : null],
    ['Max Cube Map', webgl.max_cube_map ? `${webgl.max_cube_map}px` : null],
    ['Max Anisotropy', webgl.max_anisotropy],
    ['Vertex Precision', webgl.vertex_precision != null ? webgl.vertex_precision + ' бит' : null],
    ['Fragment Precision', webgl.fragment_precision != null ? webgl.fragment_precision + ' бит' : null],
    ['Extensions count', webgl.extensions_count],
    ['Notable extensions', (webgl.extensions_notable || []).join(', ') || '—'],
  ];
  for (const [label, value] of rows) {
    const div = document.createElement('div');
    div.className = 'kv';
    const s = document.createElement('span');
    s.textContent = label;
    const strong = document.createElement('strong');
    strong.style.fontSize = '12px';
    strong.textContent = value != null && value !== '' ? String(value) : '—';
    div.appendChild(s);
    div.appendChild(strong);
    grid.appendChild(div);
  }
}

function fillFeatureGrid(containerId, entries, scoreEl) {
  const grid = $(containerId);
  if (!grid) return;
  grid.replaceChildren();
  let yes = 0;
  for (const [label, value] of entries) {
    const item = document.createElement('div');
    item.className = 'feat-item ' + (value ? 'yes' : 'no');
    const icon = document.createElement('span');
    icon.className = 'feat-icon';
    icon.textContent = value ? '✅' : '❌';
    const lbl = document.createElement('span');
    lbl.className = 'feat-label';
    lbl.textContent = label;
    item.appendChild(icon);
    item.appendChild(lbl);
    grid.appendChild(item);
    if (value) yes++;
  }
  if (scoreEl) {
    const el = $(scoreEl);
    if (el) el.textContent = `${yes}/${entries.length}`;
  }
}

function fillCssSupports(features) {
  if (!features) return;
  const CSS_LABELS = {
    grid_subgrid:        'Grid Subgrid',
    container_queries:   'Container Queries',
    color_mix:           'color-mix()',
    has_selector:        ':has() selector',
    dvh_units:           'dvh units',
    logical_properties:  'Логические свойства',
    oklch_color:         'oklch()',
    p3_color:            'display-p3',
    cascade_layers:      'Cascade Layers (@layer)',
    scroll_timeline:     'Scroll Timeline',
    anchor_positioning:  'Anchor Positioning',
    nesting:             'CSS Nesting',
  };
  const entries = Object.entries(features).map(([k, v]) => [CSS_LABELS[k] || k, !!v]);
  fillFeatureGrid('css-features-grid', entries, 'css-fp-score');
}

function fillExtendedApis(apis) {
  if (!apis) return;
  const API_LABELS = {
    bluetooth:          'Bluetooth API',
    usb:                'WebUSB',
    serial:             'Web Serial',
    hid:                'WebHID',
    nfc:                'Web NFC',
    keyboard:           'Keyboard API',
    contacts:           'Contacts API',
    presentation:       'Presentation API',
    wake_lock:          'Wake Lock',
    scheduling:         'Scheduling API',
    ink:                'Ink API',
    gamepads:           'Gamepad API',
    midi:               'Web MIDI',
    file_system_access: 'File System Access',
    eye_dropper:        'EyeDropper',
    screen_capture:     'Screen Capture',
    window_management:  'Window Management',
  };
  const entries = Object.entries(apis).map(([k, v]) => [API_LABELS[k] || k, !!v]);
  fillFeatureGrid('ext-apis-grid', entries, null);
}

// ============================================================
// FILL FUNCTIONS — v12 (new sections)
// ============================================================

function fillCodecFingerprint(codec) {
  const grid = $('codec-fp-grid');
  if (!grid) return;
  if (!codec) { grid.innerHTML = '<div class="empty">—</div>'; return; }
  grid.replaceChildren();
  const yesNo = v => v === 'probably' ? '✅ probably' : v === 'maybe' ? '🟡 maybe' : v === 'no' || !v ? '❌ no' : v;
  const addRow = (label, value) => {
    const div = document.createElement('div');
    div.className = 'kv';
    const s = document.createElement('span'); s.textContent = label;
    const strong = document.createElement('strong'); strong.textContent = txt(value);
    div.appendChild(s); div.appendChild(strong); grid.appendChild(div);
  };
  const vf = codec.video || {};
  const af = codec.audio || {};
  addRow('H.264 (AVC)',   yesNo(vf.h264));
  addRow('H.265 (HEVC)',  yesNo(vf.h265));
  addRow('VP8',           yesNo(vf.vp8));
  addRow('VP9',           yesNo(vf.vp9));
  addRow('AV1',           yesNo(vf.av1));
  addRow('Theora',        yesNo(vf.theora));
  addRow('MP3',           yesNo(af.mp3));
  addRow('AAC',           yesNo(af.aac));
  addRow('Ogg Vorbis',    yesNo(af.ogg_vorbis));
  addRow('Opus',          yesNo(af.opus));
  addRow('FLAC',          yesNo(af.flac));
  addRow('WAV',           yesNo(af.wav));
  const mc = codec.media_capabilities || {};
  if (mc.h264_1080p) {
    const c = mc.h264_1080p;
    addRow('H.264 1080p (MedCap)', `${c.supported ? '✅' : '❌'} smooth:${c.smooth ? '✅' : '❌'} powerEff:${c.power_efficient ? '✅' : '❌'}`);
  }
  if (mc.av1_1080p) {
    const c = mc.av1_1080p;
    addRow('AV1 1080p (MedCap)', `${c.supported ? '✅' : '❌'} smooth:${c.smooth ? '✅' : '❌'} powerEff:${c.power_efficient ? '✅' : '❌'}`);
  }
}

function fillWebGPU(webgpu) {
  const grid = $('webgpu-grid');
  if (!grid) return;
  if (!webgpu || !webgpu.supported) {
    grid.innerHTML = `<div class="empty">${webgpu?.supported === false ? '❌ WebGPU не поддерживается' : '—'}</div>`;
    return;
  }
  if (!webgpu.adapter_available) {
    grid.innerHTML = '<div class="empty">⚠️ WebGPU поддерживается, но адаптер недоступен</div>';
    return;
  }
  grid.replaceChildren();
  const rows = [
    ['Vendor',        webgpu.vendor],
    ['Architecture',  webgpu.architecture],
    ['Device',        webgpu.device],
    ['Description',   webgpu.description],
    ['Fallback',      webgpu.is_fallback != null ? String(webgpu.is_fallback) : null],
    ['Features',      (webgpu.features || []).join(', ') || '—'],
  ];
  const limits = webgpu.limits || {};
  const limitLabels = {
    maxTextureDimension2D: 'Max Texture 2D',
    maxBufferSize:         'Max Buffer Size',
    maxVertexBuffers:      'Max Vertex Buffers',
    maxColorAttachments:   'Max Color Attach.',
    maxBindGroups:         'Max Bind Groups',
  };
  for (const [label, value] of rows) {
    if (!value && value !== false) continue;
    const div = document.createElement('div'); div.className = 'kv';
    const s = document.createElement('span'); s.textContent = label;
    const strong = document.createElement('strong'); strong.style.fontSize = '12px'; strong.textContent = String(value);
    div.appendChild(s); div.appendChild(strong); grid.appendChild(div);
  }
  for (const [k, label] of Object.entries(limitLabels)) {
    if (limits[k] == null) continue;
    const div = document.createElement('div'); div.className = 'kv';
    const s = document.createElement('span'); s.textContent = label;
    const strong = document.createElement('strong'); strong.textContent = String(limits[k]);
    div.appendChild(s); div.appendChild(strong); grid.appendChild(div);
  }
}

function fillWorkerConsistency(workerRaw, consistency) {
  const grid = $('worker-consistency-grid');
  const pillEl = $('worker-consistency-pill');
  if (!grid) return;
  if (!workerRaw) {
    grid.innerHTML = '<div class="empty">—</div>';
    if (pillEl) pillEl.textContent = '—';
    return;
  }
  if (!workerRaw.supported) {
    grid.innerHTML = '<div class="empty">❌ Web Workers не поддерживаются</div>';
    if (pillEl) pillEl.textContent = '❌ Не поддерживается';
    return;
  }
  if (workerRaw.timeout || workerRaw.error) {
    grid.innerHTML = `<div class="empty">⚠️ ${workerRaw.timeout ? 'Worker timed out' : 'Worker error'}</div>`;
    if (pillEl) pillEl.textContent = '⚠️ Ошибка';
    return;
  }
  const mismatches = consistency?.mismatches || [];
  const spoof = consistency?.spoof_suspected;
  if (pillEl) {
    pillEl.textContent = spoof ? '🔴 Мисмэтч обнаружен' : '🟢 Совпадает';
    pillEl.className = (pillEl.className || '') + (spoof ? ' pill red-text' : ' pill green-text');
  }
  grid.replaceChildren();
  const w = workerRaw.result || {};
  const addRow = (label, value, anomaly) => {
    const div = document.createElement('div'); div.className = 'kv';
    const s = document.createElement('span'); s.textContent = label;
    const strong = document.createElement('strong');
    strong.style.fontSize = '12px';
    strong.textContent = value != null ? String(value) : '—';
    if (anomaly) strong.className = 'red-text';
    div.appendChild(s); div.appendChild(strong); grid.appendChild(div);
  };
  const mf = (field) => mismatches.some(m => m.field === field);
  addRow('Timezone (Worker)',     w.timezone,            mf('timezone'));
  addRow('Language (Worker)',     w.language,            mf('language'));
  addRow('hardwareConcurrency',   w.hardware_concurrency, mf('hardwareConcurrency'));
  addRow('deviceMemory (Worker)', w.device_memory,       false);
  addRow('Math.tan (Worker)',     w.math_tan != null ? w.math_tan.toString().slice(0, 20) : null, mf('Math.tan'));
  addRow('Math.sin (Worker)',     w.math_sin != null ? w.math_sin.toString().slice(0, 20) : null, mf('Math.sin'));
  addRow('Audio sum (Worker)',    w.audio_sum,           false);
  if (mismatches.length > 0) {
    for (const m of mismatches) {
      const div = document.createElement('div');
      div.className = 'kv';
      div.style.gridColumn = '1 / -1';
      const s = document.createElement('span'); s.textContent = `⚠️ ${m.field}`;
      const strong = document.createElement('strong');
      strong.className = 'red-text';
      strong.style.fontSize = '11px';
      strong.textContent = `main: ${m.main} ≠ worker: ${m.worker}`;
      div.appendChild(s); div.appendChild(strong); grid.appendChild(div);
    }
  }
}

function fillTimezoneLocaleIntegrity(tz) {
  const grid = $('tz-locale-grid');
  if (!grid) return;
  if (!tz) { grid.innerHTML = '<div class="empty">—</div>'; return; }
  grid.replaceChildren();
  const addRow = (label, value, cls) => {
    const div = document.createElement('div'); div.className = 'kv';
    const s = document.createElement('span'); s.textContent = label;
    const strong = document.createElement('strong');
    strong.style.fontSize = '12px';
    strong.textContent = value != null ? String(value) : '—';
    if (cls) strong.className = cls;
    div.appendChild(s); div.appendChild(strong); grid.appendChild(div);
  };
  const offH = tz.tz_offset_minutes != null ? (-tz.tz_offset_minutes / 60).toFixed(1).replace('.0', '') : '?';
  addRow('Timezone (Intl)',        tz.timezone);
  addRow('UTC offset',             `UTC${parseFloat(offH) >= 0 ? '+' : ''}${offH}`);
  addRow('Locale',                 tz.locale);
  addRow('Calendar',               tz.calendar);
  addRow('Numbering system',       tz.numbering_system);
  addRow('Hour cycle (default)',   tz.hour_cycle);
  addRow('Hour cycle (explicit)',  tz.hour_cycle_explicit);
  addRow('Lang / Locale match',    tz.lang_locale_match == null ? '—' : (tz.lang_locale_match ? '✅ Совпадают' : '⚠️ Разные'),
         tz.lang_locale_match === false ? 'yellow-text' : tz.lang_locale_match ? 'green-text' : '');
  addRow('Sample date format',     tz.sample_date);
  if (tz.calendars_supported?.length) addRow('Calendars (sample)', tz.calendars_supported.join(', '));
  if (tz.numbering_systems?.length) addRow('Numbering systems', tz.numbering_systems.join(', '));
}

function fillCanvasTextMetrics(metrics) {
  const grid = $('canvas-text-metrics-grid');
  if (!grid) return;
  if (!metrics || !Object.keys(metrics).length) { grid.innerHTML = '<div class="empty">—</div>'; return; }
  grid.replaceChildren();
  const sampleNames = { latin: 'Latin', cyrillic: 'Кириллица', emoji: 'Emoji 🎉', arabic: 'Арабский', mixed: 'Mixed', numbers: 'Цифры' };
  for (const [key, data] of Object.entries(metrics)) {
    const label = sampleNames[key] || key;
    if (!data) continue;
    const div = document.createElement('div'); div.className = 'kv';
    const s = document.createElement('span'); s.textContent = label;
    const strong = document.createElement('strong');
    strong.style.fontSize = '11px'; strong.style.fontFamily = 'var(--mono)';
    const parts = [`w=${data.width}`];
    if (data.asc  != null) parts.push(`asc=${data.asc}`);
    if (data.desc != null) parts.push(`desc=${data.desc}`);
    strong.textContent = parts.join(' ');
    div.appendChild(s); div.appendChild(strong); grid.appendChild(div);
  }
}

function fillJsRuntime(rt) {
  const grid = $('js-runtime-grid');
  if (!grid) return;
  if (!rt || !Object.keys(rt).length) { grid.innerHTML = '<div class="empty">—</div>'; return; }
  grid.replaceChildren();
  const labels = {
    stack_engine:            'Stack trace engine',
    stack_first_line:        'Stack first line',
    fn_str_normalized:       'fn.toString() normal',
    has_error_cause:         'Error cause',
    has_array_at:            'Array.at()',
    has_object_hasown:       'Object.hasOwn()',
    has_structured_clone:    'structuredClone()',
    has_array_group_by:      'groupBy()',
    has_promise_any:         'Promise.any()',
    has_string_replaceall:   'String.replaceAll()',
    regex_unicode_props:     'Regex \\p{L}/u',
    regex_dotall:            'Regex /s flag',
    num_0_1_plus_0_2_len:    '0.1+0.2 len',
    error_name_overridable:  'Error.name override',
  };
  for (const [k, label] of Object.entries(labels)) {
    if (rt[k] === undefined) continue;
    const div = document.createElement('div'); div.className = 'kv';
    const s = document.createElement('span'); s.textContent = label;
    const strong = document.createElement('strong');
    strong.style.fontSize = '11px';
    const v = rt[k];
    if (typeof v === 'boolean') {
      strong.textContent = v ? '✅ yes' : '❌ no';
      strong.className = v ? 'green-text' : '';
    } else {
      strong.textContent = String(v).slice(0, 60);
    }
    div.appendChild(s); div.appendChild(strong); grid.appendChild(div);
  }
}

function fillEntropyScores(scores) {
  const grid = $('entropy-scores-grid');
  if (!grid) return;
  if (!scores || !scores.length) { grid.innerHTML = '<div class="empty">—</div>'; return; }
  grid.replaceChildren();
  const totalBits = scores.reduce((s, x) => s + x.bits, 0);
  const totalMax  = scores.reduce((s, x) => s + x.max, 0);
  const summaryDiv = document.createElement('div');
  summaryDiv.className = 'entropy-summary';
  summaryDiv.textContent = `Всего ≈ ${totalBits} / ${totalMax} бит`;
  grid.appendChild(summaryDiv);
  for (const sec of scores) {
    const item = document.createElement('div');
    item.className = 'entropy-item';
    const header = document.createElement('div');
    header.className = 'entropy-header';
    const name = document.createElement('span');
    name.className = 'entropy-name';
    name.textContent = sec.name;
    const bits = document.createElement('span');
    bits.className = 'entropy-bits';
    bits.textContent = `${sec.bits} / ${sec.max} бит`;
    header.appendChild(name);
    header.appendChild(bits);
    const bar = document.createElement('div');
    bar.className = 'entropy-bar';
    const fill = document.createElement('span');
    const pct = Math.round(sec.bits / sec.max * 100);
    fill.className = pct >= 75 ? 'danger' : pct >= 40 ? 'warn' : 'safe';
    fill.style.width = `${pct}%`;
    bar.appendChild(fill);
    item.appendChild(header);
    item.appendChild(bar);
    grid.appendChild(item);
  }
}

async function sendCollect(visitId, client, score, risk, server) {
  try {
    const res = await fetch('./collect.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        visit_id: visitId,
        client,
        fingerprint_hash: client.fingerprint_hash,
        privacy_score: score,
        risk_level: risk,
        vpn_reason: server.vpn_hosting_reason || ''
      })
    });
    return await res.json();
  } catch { return null; }
}

async function loadAll() {
  const statusDot = $('status-dot');
  const statusText = $('api-status');
  if (statusDot) statusDot.className = 'dot loading';
  if (statusText) statusText.textContent = 'Загрузка…';
  try {
    const apiRes = await fetch('./api.php', { cache: 'no-store' });
    if (!apiRes.ok) throw new Error('HTTP ' + apiRes.status);
    // Read security response headers before consuming body
    const respHeaders = {
      csp: apiRes.headers.get('content-security-policy') || '',
      coop: apiRes.headers.get('cross-origin-opener-policy') || '',
      coep: apiRes.headers.get('cross-origin-embedder-policy') || '',
      xfo: apiRes.headers.get('x-frame-options') || '',
      hsts: apiRes.headers.get('strict-transport-security') || '',
      referrerPolicy: apiRes.headers.get('referrer-policy') || '',
      permissionsPolicy: apiRes.headers.get('permissions-policy') || '',
      xContentTypeOptions: apiRes.headers.get('x-content-type-options') || '',
      crossOriginResourcePolicy: apiRes.headers.get('cross-origin-resource-policy') || '',
    };
    const [apiData, client, perms, quota, swInfo, adblock, ipv6result] = await Promise.all([
      apiRes.json(),
      collectClientSignals(),
      getBrowserPermissions(),
      getStorageQuota(),
      getServiceWorkerInfo(),
      detectAdBlock(),
      detectIPv6(),
    ]);
    currentVisitId = apiData.visit_id || null;
    const server = apiData.client || {};
    const gpcJs = client.gpc;
    const drift = getFingerprintDrift(client);
    const uaConsistency = checkUaChConsistency(client.user_agent, client.client_hints);
    const leaks = buildLeakItems(server, client);
    const { score, items: breakdownItems } = calculateScoreBreakdown(server, client, leaks);
    const risk = score >= RISK_GREEN_THRESHOLD ? 'green' : score >= RISK_YELLOW_THRESHOLD ? 'yellow' : 'red';
    const cats = buildRiskCategories(leaks);
    const recs = buildRecommendations(server, client, leaks, perms, adblock, gpcJs, quota);
    const comparison = buildBrowserComparison(client, server, adblock, gpcJs, perms);

    fillSummary(server, client, leaks, score, risk, breakdownItems);
    fillClientDetails(server, client);
    fillIpIntelligence(server);
    fillServerExposure(server);
    fillUaCh(client.client_hints, uaConsistency, server.sec_ch_ua);
    fillPermissions(perms);
    fillStorageState(client.storage_state, quota, swInfo);
    fillNetworkPrivacy(server, client, adblock, client.cookie_test, gpcJs, respHeaders);
    fillSecFetch(server);
    fillPageSecurity(respHeaders);
    fillDriftHistory(drift);
    fillRiskCategories(cats);
    fillRecommendations(recs);
    fillBrowserComparison(comparison);
    fillHttpHeaders(server.all_request_headers || {});
    fillIPv6Test(server.ip, server.client_ip_version, ipv6result);
    fillWebGLDetailed(client.webgl_detailed || null);
    fillCssSupports(client.css_supports || null);
    fillExtendedApis(client.extended_apis || null);
    fillSystemColors(client.system_colors || null);
    fillMathFingerprint(client.math_fp || null);
    fillSpeechAndPlugins(client.speech_voices || null, client.plugins || null);
    // v12 new sections
    fillCodecFingerprint(client.codec_fp || null);
    fillWebGPU(client.webgpu || null);
    fillWorkerConsistency(client.worker_raw || null, client.worker_consistency || null);
    fillTimezoneLocaleIntegrity(client.tz_locale || null);
    fillCanvasTextMetrics(client.canvas_text_metrics || null);
    fillJsRuntime(client.js_runtime || null);
    fillEntropyScores(computeSectionEntropyScores(client, server));

    const combined = {
      timestamp_iso8601: apiData.timestamp_iso8601,
      visit_id: currentVisitId,
      client_server_view: server,
      client_browser_view: client,
      privacy_score: score,
      risk_level: risk,
      leaks,
      permissions: perms,
      storage_quota: quota,
      adblock,
      ua_consistency: uaConsistency,
      drift,
    };
    lastJSON = JSON.stringify(combined, null, 2);
    if (statusDot) statusDot.className = 'dot';
    if (statusText) statusText.textContent = 'API online';

    if (currentVisitId) {
      const collectResult = await sendCollect(currentVisitId, client, score, risk, server);
      if (collectResult?.prev_visit) {
        const { days_ago, same_ip } = collectResult.prev_visit;
        const banner = $('prev-visit-banner');
        if (banner) {
          const ruDays = (n) => {
            const m = n % 100;
            if (m >= 11 && m <= 14) return `${n} дней`;
            const r = n % 10;
            if (r === 1) return `${n} день`;
            if (r >= 2 && r <= 4) return `${n} дня`;
            return `${n} дней`;
          };
          const daysText = days_ago === 0 ? 'сегодня' : `${ruDays(days_ago)} назад`;
          const ipText = same_ip ? 'с того же IP' : 'с другого IP';
          const p = document.createElement('p');
          p.textContent = `🔍 Мы уже видели тебя ${daysText} (${ipText}). Fingerprint совпал — трекинг работает без cookies.`;
          banner.replaceChildren(p);
          banner.style.display = 'block';
        }
      }
      fillFingerprintUniqueness(collectResult?.uniqueness ?? null, client.fingerprint_hash);
      fillVisitTimeline(collectResult?.visit_timeline ?? []);
    } else {
      fillFingerprintUniqueness(null, client.fingerprint_hash);
      fillVisitTimeline([]);
    }
  } catch (err) {
    console.error(err);
    if (statusDot) { statusDot.className = 'dot error'; }
    if (statusText) statusText.textContent = 'API error';
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
  setupExportButtons(() => lastJSON || '{}');
  loadAll();
});
