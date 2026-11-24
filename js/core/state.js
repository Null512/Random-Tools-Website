/* Everything the site remembers lives in one plain object: layout, which tools are
   pinned or hidden, appearance, and each tool's own settings.

   That object is saved to localStorage on every change, and can be packed into a short
   code you can carry to another machine. The code is the same data, deflated and
   base64url-encoded, so nothing is stored on a server and there is no account to make. */
window.RT = window.RT || {};
(function () {
  'use strict';

  var KEY = 'rt.config';
  var CODE_KEY = 'rt.code';
  var CODE_PREFIX = 'RT1';

  /* Append-only. Position in this list is how a tool is written into the code,
     which keeps codes short. Never reorder or remove — add new tools at the end. */
  var ID_INDEX = [
    'password', 'qr', 'units', 'currency', 'clock', 'timer', 'stopwatch',
    'epoch', 'base', 'case', 'words', 'layout'
  ];

  var listeners = [];
  var saveTimer = null;
  var config = null;

  function defaults() {
    return {
      theme: 'auto',
      accent: 'jade',
      contrast: 'normal',
      favOnly: false,
      order: [],
      hidden: [],
      favorites: [],
      prefs: {}
    };
  }

  function normalise(raw) {
    var c = Object.assign(defaults(), raw || {});
    ['order', 'hidden', 'favorites'].forEach(function (k) {
      if (!Array.isArray(c[k])) c[k] = [];
      c[k] = c[k].filter(function (x) { return typeof x === 'string'; });
    });
    if (typeof c.prefs !== 'object' || !c.prefs) c.prefs = {};
    if (['auto', 'light', 'dark'].indexOf(c.theme) < 0) c.theme = 'auto';
    if (['normal', 'high'].indexOf(c.contrast) < 0) c.contrast = 'normal';
    return c;
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      return normalise(raw ? JSON.parse(raw) : null);
    } catch (e) {
      return defaults();
    }
  }

  function get() {
    if (!config) config = load();
    return config;
  }

  function emit() {
    listeners.forEach(function (fn) { try { fn(config); } catch (e) { console.error(e); } });
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(config)); } catch (e) { /* private mode */ }
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      toCode().then(function (code) {
        try { localStorage.setItem(CODE_KEY, code); } catch (e) { /* ignore */ }
      }).catch(function () { /* ignore */ });
    }, 400);
  }

  function update(patch, options) {
    get();
    if (typeof patch === 'function') patch(config);
    else Object.assign(config, patch);
    save();
    if (!options || !options.silent) emit();
  }

  function getPrefs(toolId) {
    var p = get().prefs[toolId];
    return p && typeof p === 'object' ? p : {};
  }

  function setPrefs(toolId, patch) {
    get();
    config.prefs[toolId] = Object.assign(getPrefs(toolId), patch);
    save();
  }

  function onChange(fn) { listeners.push(fn); }

  // --- portable code ------------------------------------------------------
  function packIds(ids) {
    return ids.map(function (id) {
      var i = ID_INDEX.indexOf(id);
      return i < 0 ? id : i;
    });
  }
  function unpackIds(arr) {
    if (!Array.isArray(arr)) return [];
    return arr.map(function (x) { return typeof x === 'number' ? (ID_INDEX[x] || null) : x; })
              .filter(Boolean);
  }

  function pack(c) {
    return [
      1,
      { auto: 0, light: 1, dark: 2 }[c.theme],
      c.accent,
      c.contrast === 'high' ? 1 : 0,
      c.favOnly ? 1 : 0,
      packIds(c.order),
      packIds(c.hidden),
      packIds(c.favorites),
      c.prefs
    ];
  }

  function unpack(arr) {
    if (!Array.isArray(arr) || arr[0] !== 1) throw new Error('unsupported');
    return normalise({
      theme: ['auto', 'light', 'dark'][arr[1]] || 'auto',
      accent: arr[2],
      contrast: arr[3] ? 'high' : 'normal',
      favOnly: !!arr[4],
      order: unpackIds(arr[5]),
      hidden: unpackIds(arr[6]),
      favorites: unpackIds(arr[7]),
      prefs: arr[8] || {}
    });
  }

  function toBase64Url(bytes) {
    var bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function fromBase64Url(str) {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) str += '=';
    var bin = atob(str), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  function deflate(bytes) {
    if (typeof CompressionStream === 'undefined') return Promise.resolve(null);
    try {
      var stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'));
      return new Response(stream).arrayBuffer().then(function (buf) { return new Uint8Array(buf); });
    } catch (e) { return Promise.resolve(null); }
  }

  function inflate(bytes) {
    if (typeof DecompressionStream === 'undefined') return Promise.reject(new Error('no decompressor'));
    var stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Response(stream).arrayBuffer().then(function (buf) { return new Uint8Array(buf); });
  }

  function toCode(source) {
    var json = JSON.stringify(pack(source || get()));
    var raw = new TextEncoder().encode(json);
    return deflate(raw).then(function (packed) {
      var useZip = packed && packed.length < raw.length;
      var body = useZip ? packed : raw;
      var out = new Uint8Array(body.length + 1);
      out[0] = useZip ? 1 : 0;
      out.set(body, 1);
      return CODE_PREFIX + toBase64Url(out);
    });
  }

  function fromCode(code) {
    return new Promise(function (resolve, reject) {
      code = String(code || '').trim().replace(/\s+/g, '');
      if (code.slice(0, CODE_PREFIX.length) !== CODE_PREFIX) {
        return reject(new Error('That does not look like a settings code — it should start with ' + CODE_PREFIX + '.'));
      }
      var bytes;
      try { bytes = fromBase64Url(code.slice(CODE_PREFIX.length)); }
      catch (e) { return reject(new Error('The code is damaged — some characters are missing or changed.')); }
      if (!bytes.length) return reject(new Error('The code is empty.'));
      var body = bytes.slice(1);
      var step = bytes[0] === 1 ? inflate(body) : Promise.resolve(body);
      step.then(function (raw) {
        var parsed = JSON.parse(new TextDecoder().decode(raw));
        resolve(unpack(parsed));
      }).catch(function () {
        reject(new Error('The code is damaged — copy it again, all in one piece.'));
      });
    });
  }

  function apply(next) {
    config = normalise(next);
    save();
    emit();
  }

  function reset() { apply(defaults()); }

  function lastCode() {
    try { return localStorage.getItem(CODE_KEY) || ''; } catch (e) { return ''; }
  }

  RT.state = {
    get: get, update: update, onChange: onChange,
    getPrefs: getPrefs, setPrefs: setPrefs,
    toCode: toCode, fromCode: fromCode, apply: apply, reset: reset,
    lastCode: lastCode, ids: ID_INDEX
  };
})();
