/* QR Code encoder (ISO/IEC 18004), numeric + alphanumeric + byte modes, versions 1-40.
   Produces a module matrix so the code can be drawn as SVG at any size.
   Written for this project so the site has no third-party QR service dependency. */
window.RT = window.RT || {};
(function () {
  'use strict';

  // Per version (1..40), per level (L,M,Q,H): [ecPerBlock, blocks1, data1, blocks2, data2]
  var RS = [7,1,19,0,0,10,1,16,0,0,13,1,13,0,0,17,1,9,0,0,10,1,34,0,0,16,1,28,0,0,22,1,22,0,0,28,1,16,0,0,15,1,55,0,0,26,1,44,0,0,18,2,17,0,0,22,2,13,0,0,20,1,80,0,0,18,2,32,0,0,26,2,24,0,0,16,4,9,0,0,26,1,108,0,0,24,2,43,0,0,18,2,15,2,16,22,2,11,2,12,18,2,68,0,0,16,4,27,0,0,24,4,19,0,0,28,4,15,0,0,20,2,78,0,0,18,4,31,0,0,18,2,14,4,15,26,4,13,1,14,24,2,97,0,0,22,2,38,2,39,22,4,18,2,19,26,4,14,2,15,30,2,116,0,0,22,3,36,2,37,20,4,16,4,17,24,4,12,4,13,18,2,68,2,69,26,4,43,1,44,24,6,19,2,20,28,6,15,2,16,20,4,81,0,0,30,1,50,4,51,28,4,22,4,23,24,3,12,8,13,24,2,92,2,93,22,6,36,2,37,26,4,20,6,21,28,7,14,4,15,26,4,107,0,0,22,8,37,1,38,24,8,20,4,21,22,12,11,4,12,30,3,115,1,116,24,4,40,5,41,20,11,16,5,17,24,11,12,5,13,22,5,87,1,88,24,5,41,5,42,30,5,24,7,25,24,11,12,7,13,24,5,98,1,99,28,7,45,3,46,24,15,19,2,20,30,3,15,13,16,28,1,107,5,108,28,10,46,1,47,28,1,22,15,23,28,2,14,17,15,30,5,120,1,121,26,9,43,4,44,28,17,22,1,23,28,2,14,19,15,28,3,113,4,114,26,3,44,11,45,26,17,21,4,22,26,9,13,16,14,28,3,107,5,108,26,3,41,13,42,30,15,24,5,25,28,15,15,10,16,28,4,116,4,117,26,17,42,0,0,28,17,22,6,23,30,19,16,6,17,28,2,111,7,112,28,17,46,0,0,30,7,24,16,25,24,34,13,0,0,30,4,121,5,122,28,4,47,14,48,30,11,24,14,25,30,16,15,14,16,30,6,117,4,118,28,6,45,14,46,30,11,24,16,25,30,30,16,2,17,26,8,106,4,107,28,8,47,13,48,30,7,24,22,25,30,22,15,13,16,28,10,114,2,115,28,19,46,4,47,28,28,22,6,23,30,33,16,4,17,30,8,122,4,123,28,22,45,3,46,30,8,23,26,24,30,12,15,28,16,30,3,117,10,118,28,3,45,23,46,30,4,24,31,25,30,11,15,31,16,30,7,116,7,117,28,21,45,7,46,30,1,23,37,24,30,19,15,26,16,30,5,115,10,116,28,19,47,10,48,30,15,24,25,25,30,23,15,25,16,30,13,115,3,116,28,2,46,29,47,30,42,24,1,25,30,23,15,28,16,30,17,115,0,0,28,10,46,23,47,30,10,24,35,25,30,19,15,35,16,30,17,115,1,116,28,14,46,21,47,30,29,24,19,25,30,11,15,46,16,30,13,115,6,116,28,14,46,23,47,30,44,24,7,25,30,59,16,1,17,30,12,121,7,122,28,12,47,26,48,30,39,24,14,25,30,22,15,41,16,30,6,121,14,122,28,6,47,34,48,30,46,24,10,25,30,2,15,64,16,30,17,122,4,123,28,29,46,14,47,30,49,24,10,25,30,24,15,46,16,30,4,122,18,123,28,13,46,32,47,30,48,24,14,25,30,42,15,32,16,30,20,117,4,118,28,40,47,7,48,30,43,24,22,25,30,10,15,67,16,30,19,118,6,119,28,18,47,31,48,30,34,24,34,25,30,20,15,61,16];

  var ALIGN = [[],[6,18],[6,22],[6,26],[6,30],[6,34],[6,22,38],[6,24,42],[6,26,46],[6,28,50],[6,30,54],[6,32,58],[6,34,62],[6,26,46,66],[6,26,48,70],[6,26,50,74],[6,30,54,78],[6,30,56,82],[6,30,58,86],[6,34,62,90],[6,28,50,72,94],[6,26,50,74,98],[6,30,54,78,102],[6,28,54,80,106],[6,32,58,84,110],[6,30,58,86,114],[6,34,62,90,118],[6,26,50,74,98,122],[6,30,54,78,102,126],[6,26,52,78,104,130],[6,30,56,82,108,134],[6,34,60,86,112,138],[6,30,58,86,114,142],[6,34,62,90,118,146],[6,30,54,78,102,126,150],[6,24,50,76,102,128,154],[6,28,54,80,106,132,158],[6,32,58,84,110,136,162],[6,26,54,82,110,138,166],[6,30,58,86,114,142,170]];

  var LEVELS = { L: 0, M: 1, Q: 2, H: 3 };
  var LEVEL_BITS = { L: 1, M: 0, Q: 3, H: 2 };
  var ALNUM = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';

  // --- GF(256) arithmetic -------------------------------------------------
  var EXP = new Uint8Array(512), LOG = new Uint8Array(256);
  (function () {
    var x = 1;
    for (var i = 0; i < 255; i++) {
      EXP[i] = x; LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11d;
    }
    for (var j = 255; j < 512; j++) EXP[j] = EXP[j - 255];
  })();

  function gmul(a, b) { return (a === 0 || b === 0) ? 0 : EXP[LOG[a] + LOG[b]]; }

  function generatorPoly(n) {
    var poly = [1];
    for (var i = 0; i < n; i++) {
      var next = new Array(poly.length + 1).fill(0);
      for (var j = 0; j < poly.length; j++) {
        next[j] ^= poly[j];
        next[j + 1] ^= gmul(poly[j], EXP[i]);
      }
      poly = next;
    }
    return poly;
  }

  function ecCodewords(data, n) {
    var gen = generatorPoly(n);
    var rem = new Array(n).fill(0);
    for (var i = 0; i < data.length; i++) {
      var factor = data[i] ^ rem[0];
      rem.shift(); rem.push(0);
      for (var j = 0; j < n; j++) rem[j] ^= gmul(gen[j + 1], factor);
    }
    return rem;
  }

  // --- bit buffer ---------------------------------------------------------
  function BitBuffer() { this.bits = []; }
  BitBuffer.prototype.put = function (value, length) {
    for (var i = length - 1; i >= 0; i--) this.bits.push((value >>> i) & 1);
  };

  // --- mode selection -----------------------------------------------------
  function utf8Bytes(str) {
    var out = [], encoded = unescape(encodeURIComponent(str));
    for (var i = 0; i < encoded.length; i++) out.push(encoded.charCodeAt(i) & 0xff);
    return out;
  }

  function pickMode(text) {
    if (/^[0-9]*$/.test(text)) return 'numeric';
    for (var i = 0; i < text.length; i++) if (ALNUM.indexOf(text[i]) < 0) return 'byte';
    return 'alnum';
  }

  function countBits(mode, version) {
    var group = version < 10 ? 0 : version < 27 ? 1 : 2;
    if (mode === 'numeric') return [10, 12, 14][group];
    if (mode === 'alnum') return [9, 11, 13][group];
    return [8, 16, 16][group];
  }

  function blockInfo(version, level) {
    var o = ((version - 1) * 4 + LEVELS[level]) * 5;
    return { ec: RS[o], b1: RS[o + 1], d1: RS[o + 2], b2: RS[o + 3], d2: RS[o + 4] };
  }

  function dataCodewords(version, level) {
    var i = blockInfo(version, level);
    return i.b1 * i.d1 + i.b2 * i.d2;
  }

  function writeData(buf, text, mode, bytes) {
    var i;
    if (mode === 'numeric') {
      for (i = 0; i + 3 <= text.length; i += 3) buf.put(parseInt(text.substr(i, 3), 10), 10);
      var rest = text.length - i;
      if (rest === 2) buf.put(parseInt(text.substr(i, 2), 10), 7);
      else if (rest === 1) buf.put(parseInt(text.substr(i, 1), 10), 4);
    } else if (mode === 'alnum') {
      for (i = 0; i + 2 <= text.length; i += 2) {
        buf.put(ALNUM.indexOf(text[i]) * 45 + ALNUM.indexOf(text[i + 1]), 11);
      }
      if (i < text.length) buf.put(ALNUM.indexOf(text[i]), 6);
    } else {
      for (i = 0; i < bytes.length; i++) buf.put(bytes[i], 8);
    }
  }

  function dataBitLength(text, mode, bytes) {
    if (mode === 'numeric') {
      var g = Math.floor(text.length / 3), r = text.length % 3;
      return g * 10 + (r === 2 ? 7 : r === 1 ? 4 : 0);
    }
    if (mode === 'alnum') return Math.floor(text.length / 2) * 11 + (text.length % 2) * 6;
    return bytes.length * 8;
  }

  // --- matrix -------------------------------------------------------------
  function Matrix(size) {
    this.size = size;
    this.data = new Int8Array(size * size).fill(-1);   // -1 unset, 0 light, 1 dark
    this.fn = new Uint8Array(size * size);             // function module flag
  }
  Matrix.prototype.set = function (r, c, v, isFn) {
    this.data[r * this.size + c] = v ? 1 : 0;
    if (isFn) this.fn[r * this.size + c] = 1;
  };
  Matrix.prototype.get = function (r, c) { return this.data[r * this.size + c]; };
  Matrix.prototype.isFn = function (r, c) { return this.fn[r * this.size + c] === 1; };

  function placeFunctionPatterns(m, version) {
    var size = m.size, r, c, i;

    function finder(row, col) {
      for (r = -1; r <= 7; r++) for (c = -1; c <= 7; c++) {
        var rr = row + r, cc = col + c;
        if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
        var dark = (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
                   (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
                   (r >= 2 && r <= 4 && c >= 2 && c <= 4);
        m.set(rr, cc, dark, true);
      }
    }
    finder(0, 0); finder(0, size - 7); finder(size - 7, 0);

    // timing patterns
    for (i = 8; i < size - 8; i++) {
      m.set(6, i, i % 2 === 0, true);
      m.set(i, 6, i % 2 === 0, true);
    }

    // alignment patterns
    var pos = ALIGN[version - 1];
    for (i = 0; i < pos.length; i++) for (var j = 0; j < pos.length; j++) {
      var pr = pos[i], pc = pos[j];
      if ((pr <= 8 && pc <= 8) || (pr <= 8 && pc >= size - 9) || (pr >= size - 9 && pc <= 8)) continue;
      for (r = -2; r <= 2; r++) for (c = -2; c <= 2; c++) {
        m.set(pr + r, pc + c, Math.max(Math.abs(r), Math.abs(c)) !== 1, true);
      }
    }

    // dark module + reserved format areas
    m.set(size - 8, 8, true, true);
    for (i = 0; i <= 8; i++) {
      if (!m.isFn(8, i)) m.set(8, i, false, true);
      if (!m.isFn(i, 8)) m.set(i, 8, false, true);
    }
    for (i = 0; i < 8; i++) {
      if (!m.isFn(8, size - 1 - i)) m.set(8, size - 1 - i, false, true);
      if (!m.isFn(size - 1 - i, 8)) m.set(size - 1 - i, 8, false, true);
    }

    if (version >= 7) {
      var rem = version;
      for (i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
      var vinfo = (version << 12) | (rem & 0xfff);
      for (i = 0; i < 18; i++) {
        var bit = ((vinfo >>> i) & 1) === 1;
        m.set(Math.floor(i / 3), size - 11 + (i % 3), bit, true);
        m.set(size - 11 + (i % 3), Math.floor(i / 3), bit, true);
      }
    }
  }

  function placeCodewords(m, bytes) {
    var size = m.size, i = 0, bitIndex = 0;
    for (var right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (var v = 0; v < size; v++) {
        for (var j = 0; j < 2; j++) {
          var c = right - j;
          var upward = ((right + 1) & 2) === 0;
          var r = upward ? size - 1 - v : v;
          if (m.get(r, c) !== -1) continue;
          var dark = false;
          if (i < bytes.length * 8) {
            dark = ((bytes[i >>> 3] >>> (7 - (i & 7))) & 1) === 1;
          }
          m.set(r, c, dark, false);
          i++;
        }
      }
    }
    return i;
  }

  function maskFn(pattern, r, c) {
    switch (pattern) {
      case 0: return (r + c) % 2 === 0;
      case 1: return r % 2 === 0;
      case 2: return c % 3 === 0;
      case 3: return (r + c) % 3 === 0;
      case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
      case 5: return ((r * c) % 2) + ((r * c) % 3) === 0;
      case 6: return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0;
      default: return (((r + c) % 2) + ((r * c) % 3)) % 2 === 0;
    }
  }

  function applyMask(m, pattern) {
    for (var r = 0; r < m.size; r++) for (var c = 0; c < m.size; c++) {
      if (!m.isFn(r, c) && maskFn(pattern, r, c)) {
        m.data[r * m.size + c] ^= 1;
      }
    }
  }

  function writeFormat(m, level, pattern) {
    var size = m.size;
    var data = (LEVEL_BITS[level] << 3) | pattern;
    var rem = data;
    for (var i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    var bits = ((data << 10) | rem) ^ 0x5412;

    // top-left copy, split around the timing pattern
    for (i = 0; i <= 5; i++) m.set(i, 8, ((bits >>> i) & 1) === 1, true);
    m.set(7, 8, ((bits >>> 6) & 1) === 1, true);
    m.set(8, 8, ((bits >>> 7) & 1) === 1, true);
    m.set(8, 7, ((bits >>> 8) & 1) === 1, true);
    for (i = 9; i < 15; i++) m.set(8, 14 - i, ((bits >>> i) & 1) === 1, true);

    // second copy: along the top-right and bottom-left finders
    for (i = 0; i < 8; i++) m.set(8, size - 1 - i, ((bits >>> i) & 1) === 1, true);
    for (i = 8; i < 15; i++) m.set(size - 15 + i, 8, ((bits >>> i) & 1) === 1, true);
    m.set(size - 8, 8, true, true);
  }

  function penalty(m) {
    var size = m.size, score = 0, r, c, run, i;

    // rule 1: runs of five or more same-coloured modules
    for (r = 0; r < size; r++) {
      run = 1;
      for (c = 1; c < size; c++) {
        if (m.get(r, c) === m.get(r, c - 1)) { run++; if (run === 5) score += 3; else if (run > 5) score++; }
        else run = 1;
      }
    }
    for (c = 0; c < size; c++) {
      run = 1;
      for (r = 1; r < size; r++) {
        if (m.get(r, c) === m.get(r - 1, c)) { run++; if (run === 5) score += 3; else if (run > 5) score++; }
        else run = 1;
      }
    }

    // rule 2: 2x2 blocks of one colour
    for (r = 0; r < size - 1; r++) for (c = 0; c < size - 1; c++) {
      var v = m.get(r, c);
      if (v === m.get(r, c + 1) && v === m.get(r + 1, c) && v === m.get(r + 1, c + 1)) score += 3;
    }

    // rule 3: finder-like 1:1:3:1:1 patterns
    var pat1 = [1,0,1,1,1,0,1,0,0,0,0], pat2 = [0,0,0,0,1,0,1,1,1,0,1];
    function matches(get, a, len) {
      if (a + 11 > len) return 0;
      var ok1 = true, ok2 = true;
      for (var k = 0; k < 11; k++) {
        var val = get(a + k);
        if (val !== pat1[k]) ok1 = false;
        if (val !== pat2[k]) ok2 = false;
      }
      return (ok1 ? 1 : 0) + (ok2 ? 1 : 0);
    }
    for (r = 0; r < size; r++) for (c = 0; c < size; c++) {
      score += 40 * matches(function (x) { return m.get(r, x); }, c, size);
      score += 40 * matches(function (x) { return m.get(x, c); }, r, size);
    }

    // rule 4: overall balance of dark modules
    var dark = 0;
    for (i = 0; i < m.data.length; i++) if (m.data[i] === 1) dark++;
    var percent = (dark * 100) / (size * size);
    score += Math.floor(Math.abs(percent - 50) / 5) * 10;
    return score;
  }

  function encode(text, options) {
    options = options || {};
    var level = (options.level || 'M').toUpperCase();
    if (!(level in LEVELS)) level = 'M';

    text = String(text);
    var mode = pickMode(text);
    var bytes = mode === 'byte' ? utf8Bytes(text) : null;

    // smallest version that fits
    var version = -1;
    for (var v = 1; v <= 40; v++) {
      var capacity = dataCodewords(v, level) * 8;
      var needed = 4 + countBits(mode, v) + dataBitLength(text, mode, bytes);
      if (needed <= capacity) { version = v; break; }
    }
    if (version < 0) throw new Error('Too much data for a QR code — shorten the text or lower the error correction level.');

    var buf = new BitBuffer();
    buf.put(mode === 'numeric' ? 1 : mode === 'alnum' ? 2 : 4, 4);
    buf.put(mode === 'byte' ? bytes.length : text.length, countBits(mode, version));
    writeData(buf, text, mode, bytes);

    var total = dataCodewords(version, level) * 8;
    for (var t = 0; t < 4 && buf.bits.length < total; t++) buf.bits.push(0);
    while (buf.bits.length % 8 !== 0) buf.bits.push(0);

    var words = [];
    for (var i = 0; i < buf.bits.length; i += 8) {
      var b = 0;
      for (var j = 0; j < 8; j++) b = (b << 1) | buf.bits[i + j];
      words.push(b);
    }
    var pad = [0xec, 0x11], p = 0;
    while (words.length < dataCodewords(version, level)) words.push(pad[p++ % 2]);

    // split into blocks, add error correction, interleave
    var info = blockInfo(version, level);
    var blocks = [], ecBlocks = [], offset = 0, n;
    for (n = 0; n < info.b1; n++) { blocks.push(words.slice(offset, offset + info.d1)); offset += info.d1; }
    for (n = 0; n < info.b2; n++) { blocks.push(words.slice(offset, offset + info.d2)); offset += info.d2; }
    for (n = 0; n < blocks.length; n++) ecBlocks.push(ecCodewords(blocks[n], info.ec));

    var maxData = Math.max(info.d1, info.d2), out = [];
    for (i = 0; i < maxData; i++) for (n = 0; n < blocks.length; n++) if (i < blocks[n].length) out.push(blocks[n][i]);
    for (i = 0; i < info.ec; i++) for (n = 0; n < ecBlocks.length; n++) out.push(ecBlocks[n][i]);

    var m = new Matrix(17 + 4 * version);
    placeFunctionPatterns(m, version);
    placeCodewords(m, out);

    var best = -1, bestScore = Infinity, saved = m.data.slice();
    for (var mask = 0; mask < 8; mask++) {
      m.data.set(saved);
      applyMask(m, mask);
      writeFormat(m, level, mask);
      var s = penalty(m);
      if (s < bestScore) { bestScore = s; best = mask; }
    }
    m.data.set(saved);
    applyMask(m, best);
    writeFormat(m, level, best);

    var rows = [];
    for (var r = 0; r < m.size; r++) {
      var row = [];
      for (var c = 0; c < m.size; c++) row.push(m.get(r, c) === 1);
      rows.push(row);
    }
    return { size: m.size, version: version, level: level, mask: best, mode: mode, modules: rows };
  }

  /* Draw a code as an SVG string. `quiet` is the margin in modules (4 is the spec minimum). */
  function toSVG(code, opts) {
    opts = opts || {};
    var quiet = opts.quiet == null ? 4 : opts.quiet;
    var dim = code.size + quiet * 2;
    var path = [];
    for (var r = 0; r < code.size; r++) {
      for (var c = 0; c < code.size; c++) {
        if (code.modules[r][c]) path.push('M' + (c + quiet) + ' ' + (r + quiet) + 'h1v1h-1z');
      }
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + dim + ' ' + dim + '" ' +
      'shape-rendering="crispEdges" role="img" aria-label="QR code">' +
      '<rect width="' + dim + '" height="' + dim + '" fill="' + (opts.light || '#ffffff') + '"/>' +
      '<path d="' + path.join('') + '" fill="' + (opts.dark || '#000000') + '"/></svg>';
  }

  RT.qr = { encode: encode, toSVG: toSVG };
})();
