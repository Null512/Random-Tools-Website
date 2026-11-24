/* Password strength estimator.

   The old version multiplied length by log2(alphabet size), which says "Password1!"
   is as strong as "x7#qRm2p" — it isn't. This works the way KeePass and zxcvbn do:
   it finds the patterns a cracker would exploit (dictionary words, leetspeak,
   keyboard walks, repeats, sequences, dates), then searches for the cheapest way to
   build the whole password out of those patterns. Anything left over is charged at
   the real cost of brute force over the character classes actually used, so a
   genuinely random password still scores its full entropy. */
window.RT = window.RT || {};
(function () {
  'use strict';

  var DICTS = null;

  function buildDicts() {
    if (DICTS) return DICTS;
    var raw = (RT.wordlists || {});
    DICTS = {};
    ['passwords', 'english', 'tv', 'surnames', 'names'].forEach(function (name) {
      var map = Object.create(null);
      var words = (raw[name] || '').split(' ');
      for (var i = 0; i < words.length; i++) if (!(words[i] in map)) map[words[i]] = i + 1;
      DICTS[name] = map;
    });
    return DICTS;
  }

  // --- keyboard adjacency -------------------------------------------------
  var LAYOUTS = {
    qwerty: [
      '`~ 1! 2@ 3# 4$ 5% 6^ 7& 8* 9( 0) -_ =+',
      'qQ wW eE rR tT yY uU iI oO pP [{ ]} \\|',
      'aA sS dD fF gG hH jJ kK lL ;: \'"',
      'zZ xX cC vV bB nN mM ,< .> /?'
    ],
    keypad: ['789', '456', '123', ' 0 ']
  };
  var GRAPHS = null;

  function buildGraphs() {
    if (GRAPHS) return GRAPHS;
    GRAPHS = {};
    // qwerty: keys are slanted, each row shifted right by a little
    var offsets = [0, 1, 1.5, 2], pos = {};
    LAYOUTS.qwerty.forEach(function (row, r) {
      row.split(' ').forEach(function (key, i) {
        for (var k = 0; k < key.length; k++) {
          pos[key[k]] = { x: i + offsets[r], y: r, shifted: k > 0, key: key };
        }
      });
    });
    var adj = {};
    Object.keys(pos).forEach(function (ch) {
      adj[ch] = [];
      Object.keys(pos).forEach(function (other) {
        if (other === ch) return;
        var a = pos[ch], b = pos[other];
        if (a.key === b.key) return;
        if (Math.abs(a.y - b.y) <= 1 && Math.abs(a.x - b.x) < 1.2) adj[ch].push(other);
      });
    });
    GRAPHS.qwerty = { adjacency: adj, positions: pos, starts: 94, degree: 4.6 };

    var kpos = {}, kadj = {};
    LAYOUTS.keypad.forEach(function (row, r) {
      for (var i = 0; i < row.length; i++) if (row[i] !== ' ') kpos[row[i]] = { x: i, y: r, shifted: false };
    });
    Object.keys(kpos).forEach(function (ch) {
      kadj[ch] = [];
      Object.keys(kpos).forEach(function (o) {
        if (o === ch) return;
        if (Math.abs(kpos[ch].x - kpos[o].x) <= 1 && Math.abs(kpos[ch].y - kpos[o].y) <= 1) kadj[ch].push(o);
      });
    });
    GRAPHS.keypad = { adjacency: kadj, positions: kpos, starts: 10, degree: 3.8 };
    return GRAPHS;
  }

  // --- small maths helpers ------------------------------------------------
  function nCk(n, k) {
    if (k > n) return 0;
    if (k === 0) return 1;
    var r = 1;
    for (var d = 1; d <= k; d++) { r *= n; r /= d; n -= 1; }
    return r;
  }
  function log2(n) { return Math.log(n) / Math.LN2; }
  function factorialLog2(n) {
    var s = 0;
    for (var i = 2; i <= n; i++) s += log2(i);
    return s;
  }

  // --- matchers -----------------------------------------------------------
  var L33T = { a: '4@', b: '8', c: '({[<', e: '3', g: '69', i: '1!|', l: '1|7', o: '0', s: '$5', t: '+7', x: '%', z: '2' };

  function l33tSubs(password) {
    // which substitutions are actually present
    var relevant = {};
    Object.keys(L33T).forEach(function (letter) {
      for (var i = 0; i < L33T[letter].length; i++) {
        var sub = L33T[letter][i];
        if (password.indexOf(sub) >= 0) (relevant[sub] = relevant[sub] || []).push(letter);
      }
    });
    var subs = Object.keys(relevant);
    if (!subs.length) return [];
    // cap the search: one letter choice per substituted character, at most 64 tables
    var tables = [{}];
    subs.forEach(function (sub) {
      var next = [];
      relevant[sub].forEach(function (letter) {
        tables.forEach(function (t) {
          if (next.length >= 64) return;
          var copy = Object.assign({}, t);
          copy[sub] = letter;
          next.push(copy);
        });
      });
      tables = next;
    });
    return tables;
  }

  function translate(str, table) {
    var out = '';
    for (var i = 0; i < str.length; i++) out += (table[str[i]] || str[i]);
    return out;
  }

  function dictionaryMatches(password, extraDict) {
    var dicts = buildDicts(), matches = [];
    var lower = password.toLowerCase();

    function scan(text, source, extra) {
      for (var i = 0; i < text.length; i++) {
        for (var j = i + 2; j < text.length + 1 && j - i <= 40; j++) {
          var word = text.slice(i, j);
          var names = source ? [source] : ['passwords', 'english', 'tv', 'surnames', 'names'];
          for (var n = 0; n < names.length; n++) {
            var dict = extra || dicts[names[n]];
            if (dict && word in dict) {
              matches.push(Object.assign({
                pattern: 'dictionary', i: i, j: j - 1, token: password.slice(i, j),
                matched: word, dictionary: source || names[n], rank: dict[word]
              }, extra ? { dictionary: 'your own words' } : {}));
            }
          }
        }
      }
    }

    scan(lower, null, null);
    if (extraDict) scan(lower, 'user', extraDict);

    // reversed words
    var rev = lower.split('').reverse().join('');
    var before = matches.length;
    scan(rev, null, null);
    for (var k = before; k < matches.length; k++) {
      var m = matches[k], len = password.length;
      var i = len - 1 - m.j, j = len - 1 - m.i;
      matches[k] = Object.assign({}, m, { reversed: true, i: i, j: j, token: password.slice(i, j + 1) });
    }

    // leetspeak
    l33tSubs(lower).forEach(function (table) {
      var translated = translate(lower, table);
      if (translated === lower) return;
      var start = matches.length;
      scan(translated, null, null);
      for (var x = start; x < matches.length; x++) {
        var mm = matches[x];
        var token = password.slice(mm.i, mm.j + 1);
        var subsUsed = {};
        for (var c = 0; c < token.length; c++) if (table[token[c].toLowerCase()]) subsUsed[token[c].toLowerCase()] = table[token[c].toLowerCase()];
        if (!Object.keys(subsUsed).length) { matches.splice(x, 1); x--; continue; }
        matches[x] = Object.assign({}, mm, { l33t: true, subs: subsUsed, token: token });
      }
    });

    return matches;
  }

  function spatialMatches(password) {
    var graphs = buildGraphs(), matches = [];
    Object.keys(graphs).forEach(function (name) {
      var graph = graphs[name], adj = graph.adjacency, pos = graph.positions;
      var i = 0;
      while (i < password.length - 1) {
        var j = i + 1, turns = 0, lastDir = null;
        var shifted = pos[password[i]] && pos[password[i]].shifted ? 1 : 0;
        while (j < password.length) {
          var prev = password[j - 1], cur = password[j];
          if (!adj[prev] || adj[prev].indexOf(cur) < 0) break;
          if (pos[cur] && pos[cur].shifted) shifted++;
          var dir = (pos[cur].x - pos[prev].x) + ',' + (pos[cur].y - pos[prev].y);
          if (dir !== lastDir) { turns++; lastDir = dir; }
          j++;
        }
        if (j - i >= 3) {
          matches.push({ pattern: 'spatial', i: i, j: j - 1, token: password.slice(i, j), graph: name, turns: turns, shifted: shifted });
        }
        i = Math.max(j - 1, i + 1);
      }
    });
    return matches;
  }

  function repeatMatches(password) {
    var matches = [], i = 0;
    while (i < password.length) {
      var best = null;
      for (var baseLen = 1; baseLen <= Math.floor((password.length - i) / 2); baseLen++) {
        var base = password.slice(i, i + baseLen), count = 1;
        while (password.slice(i + count * baseLen, i + (count + 1) * baseLen) === base) count++;
        if (count >= 2 && (!best || count * baseLen > best.length)) {
          best = { base: base, count: count, length: count * baseLen };
        }
      }
      if (best) {
        matches.push({
          pattern: 'repeat', i: i, j: i + best.length - 1,
          token: password.slice(i, i + best.length), base: best.base, count: best.count
        });
        i += best.length;
      } else i++;
    }
    return matches;
  }

  function sequenceMatches(password) {
    var matches = [];
    if (password.length < 3) return matches;
    var i = 0;
    while (i < password.length - 1) {
      var delta = password.charCodeAt(i + 1) - password.charCodeAt(i), j = i + 1;
      if (Math.abs(delta) === 1) {
        while (j + 1 < password.length && password.charCodeAt(j + 1) - password.charCodeAt(j) === delta) j++;
        if (j - i >= 2) {
          var token = password.slice(i, j + 1), space = 26, obvious = false;
          if (/^\d+$/.test(token)) { space = 10; obvious = /^[01]/.test(token) || /[09]$/.test(token); }
          else if (/^[a-z]+$/.test(token)) obvious = /^a/.test(token) || /z$/.test(token);
          else if (/^[A-Z]+$/.test(token)) obvious = /^A/.test(token) || /Z$/.test(token);
          else space = 94;
          matches.push({ pattern: 'sequence', i: i, j: j, token: token, space: space, obvious: obvious, descending: delta < 0 });
          i = j;
          continue;
        }
      }
      i++;
    }
    return matches;
  }

  function dateMatches(password) {
    var matches = [], re = /(\d{1,4})([\/\-. _])?(\d{1,2})\2?(\d{1,4})/g, m;
    while ((m = re.exec(password))) {
      var nums = [parseInt(m[1], 10), parseInt(m[3], 10), parseInt(m[4], 10)];
      var year = nums.find(function (n) { return n > 31; });
      if (year === undefined) year = nums[2] < 100 ? 1900 + nums[2] : nums[2];
      if (year < 1900 || year > 2100) continue;
      matches.push({ pattern: 'date', i: m.index, j: m.index + m[0].length - 1, token: m[0], year: year, separator: !!m[2] });
      re.lastIndex = m.index + 1;
    }
    var yre = /(19\d\d|20\d\d)/g;
    while ((m = yre.exec(password))) {
      matches.push({ pattern: 'year', i: m.index, j: m.index + 3, token: m[0], year: parseInt(m[0], 10) });
    }
    return matches;
  }

  // --- guess counts per match --------------------------------------------
  function uppercaseVariations(token) {
    if (!/[A-Z]/.test(token) || token === token.toLowerCase()) return 1;
    if (/^[A-Z][^A-Z]*$/.test(token) || token === token.toUpperCase() || /^[^A-Z]*[A-Z]$/.test(token)) return 2;
    var U = (token.match(/[A-Z]/g) || []).length, L = (token.match(/[a-z]/g) || []).length;
    var sum = 0;
    for (var i = 1; i <= Math.min(U, L); i++) sum += nCk(U + L, i);
    return Math.max(sum, 2);
  }

  function l33tVariations(match) {
    if (!match.l33t) return 1;
    var variations = 1;
    Object.keys(match.subs).forEach(function (sub) {
      var letter = match.subs[sub], token = match.token.toLowerCase();
      var S = 0, U = 0;
      for (var i = 0; i < token.length; i++) {
        if (token[i] === sub) S++;
        if (token[i] === letter) U++;
      }
      if (S === 0 || U === 0) { variations *= 2; return; }
      var possibilities = 0;
      for (var k = 1; k <= Math.min(S, U); k++) possibilities += nCk(S + U, k);
      variations *= Math.max(possibilities, 2);
    });
    return variations;
  }

  function matchGuesses(match) {
    switch (match.pattern) {
      case 'dictionary':
        return match.rank * uppercaseVariations(match.token) * l33tVariations(match) * (match.reversed ? 2 : 1);
      case 'spatial': {
        var g = buildGraphs()[match.graph], L = match.token.length, t = Math.max(match.turns, 1), guesses = 0;
        for (var i = 2; i <= L; i++) {
          for (var j = 1; j <= Math.min(t, i - 1); j++) guesses += nCk(i - 1, j - 1) * g.starts * Math.pow(g.degree, j);
        }
        if (match.shifted) {
          var S = match.shifted, U = L - S, variations = 0;
          for (var k = 1; k <= Math.min(S, U); k++) variations += nCk(S + U, k);
          guesses *= Math.max(variations, 2);
        }
        return guesses;
      }
      case 'repeat':
        return Math.max(estimate(match.base).guesses, 2) * match.count;
      case 'sequence':
        return (match.obvious ? 4 : match.space) * match.token.length * (match.descending ? 2 : 1);
      case 'date':
        return Math.max(Math.abs(match.year - new Date().getFullYear()), 20) * 365 * (match.separator ? 4 : 1);
      case 'year':
        return Math.max(Math.abs(match.year - new Date().getFullYear()), 20);
      default:
        return match.guesses || 1;
    }
  }

  // --- brute force cost for unmatched runs --------------------------------
  function charsetSize(str) {
    var size = 0;
    if (/[a-z]/.test(str)) size += 26;
    if (/[A-Z]/.test(str)) size += 26;
    if (/[0-9]/.test(str)) size += 10;
    if (/[ !-\/:-@\[-`{-~]/.test(str)) size += 33;
    if (/[^\x00-\x7f]/.test(str)) size += 100;
    return size || 1;
  }

  /* Unlike zxcvbn (which charges a flat 10 guesses per unmatched character), the cost
     here is the real alphabet of the password. A 20-character random password with
     symbols then scores ~131 bits rather than being capped around 66. */
  function bruteforceGuesses(token, fullCharset) {
    return Math.pow(fullCharset, token.length);
  }

  // --- search for the cheapest way to build the password ------------------
  function estimate(password, options) {
    options = options || {};
    password = String(password == null ? '' : password);
    var n = password.length;
    if (!n) {
      return { password: '', bits: 0, guesses: 0, score: 0, sequence: [], crackTimes: crackTimes(0), warning: '', suggestions: ['Type a password to check it.'] };
    }

    var extraDict = null;
    if (options.userInputs && options.userInputs.length) {
      extraDict = Object.create(null);
      options.userInputs.forEach(function (w, i) {
        w = String(w).toLowerCase().trim();
        if (w.length > 2) extraDict[w] = i + 1;
      });
    }

    var matches = []
      .concat(dictionaryMatches(password, extraDict))
      .concat(spatialMatches(password))
      .concat(repeatMatches(password))
      .concat(sequenceMatches(password))
      .concat(dateMatches(password));

    matches.forEach(function (m) { m.guesses = Math.max(matchGuesses(m), 1); });

    var cardinality = charsetSize(password);
    var byEnd = {};
    matches.forEach(function (m) { (byEnd[m.j] = byEnd[m.j] || []).push(m); });

    // optimal[k][l] = cheapest log2(guesses) for password[0..l] using k matches
    var optimal = [], pointers = [];
    for (var l = 0; l < n; l++) { optimal.push({}); pointers.push({}); }
    var GROWTH = log2(10000); // cost of adding another pattern to the sequence

    function update(l, k, cost, match, prevK) {
      if (optimal[l][k] === undefined || cost < optimal[l][k]) {
        optimal[l][k] = cost;
        pointers[l][k] = { match: match, prevK: prevK };
      }
    }

    for (l = 0; l < n; l++) {
      // brute-force run ending at l, starting anywhere
      for (var i = 0; i <= l; i++) {
        var bf = { pattern: 'bruteforce', i: i, j: l, token: password.slice(i, l + 1) };
        bf.guesses = bruteforceGuesses(bf.token, cardinality);
        consider(bf);
      }
      (byEnd[l] || []).forEach(consider);
    }

    function consider(m) {
      var cost = log2(Math.max(m.guesses, 1));
      if (m.i === 0) { update(m.j, 1, cost, m, null); return; }
      var prev = optimal[m.i - 1];
      Object.keys(prev).forEach(function (kStr) {
        var k = parseInt(kStr, 10);
        update(m.j, k + 1, prev[k] + cost + GROWTH, m, k);
      });
    }

    var bestK = null, bestCost = Infinity;
    Object.keys(optimal[n - 1]).forEach(function (kStr) {
      var k = parseInt(kStr, 10);
      var total = optimal[n - 1][k] + factorialLog2(k);
      if (total < bestCost) { bestCost = total; bestK = k; }
    });

    var sequence = [], l2 = n - 1, k2 = bestK;
    while (l2 >= 0 && k2) {
      var p = pointers[l2][k2];
      if (!p) break;
      sequence.unshift(p.match);
      l2 = p.match.i - 1;
      k2 = p.prevK;
    }

    var bits = bestCost;
    var guesses = Math.pow(2, Math.min(bits, 1023));
    return {
      password: password,
      bits: bits,
      guesses: guesses,
      charsetSize: cardinality,
      naiveBits: n * log2(cardinality),
      score: bits < 28 ? 0 : bits < 40 ? 1 : bits < 60 ? 2 : bits < 80 ? 3 : 4,
      sequence: sequence.map(describe),
      crackTimes: crackTimes(bits),
      warning: warningFor(sequence, bits),
      suggestions: suggestionsFor(sequence, password, bits)
    };
  }

  function describe(m) {
    var text;
    switch (m.pattern) {
      case 'dictionary':
        text = (m.dictionary === 'passwords' ? 'common password' :
                m.dictionary === 'english' ? 'English word' :
                m.dictionary === 'names' ? 'first name' :
                m.dictionary === 'surnames' ? 'surname' :
                m.dictionary === 'tv' ? 'word from film and TV' : 'word you gave me') +
               ' "' + m.matched + '"' + (m.reversed ? ', reversed' : '') + (m.l33t ? ', with letters swapped for symbols' : '');
        break;
      case 'spatial': text = (m.graph === 'keypad' ? 'numeric keypad walk' : 'keyboard walk'); break;
      case 'repeat': text = 'repeat of "' + m.base + '" ×' + m.count; break;
      case 'sequence': text = 'sequence' + (m.descending ? ', counting down' : ''); break;
      case 'date': text = 'date'; break;
      case 'year': text = 'year'; break;
      default: text = 'unpredictable characters';
    }
    return { token: m.token, pattern: m.pattern, description: text, bits: log2(Math.max(m.guesses, 1)) };
  }

  var SPEEDS = [
    { id: 'online', label: 'Online attack on a site that rate-limits (100 guesses/hour)', rate: 100 / 3600 },
    { id: 'online_fast', label: 'Online attack, no rate limit (10 guesses/second)', rate: 10 },
    { id: 'offline_slow', label: 'Offline, stolen database with slow hashing (10k/second)', rate: 1e4 },
    { id: 'offline_fast', label: 'Offline, fast hashing on a GPU rig (10 billion/second)', rate: 1e10 }
  ];

  function crackTimes(bits) {
    return SPEEDS.map(function (s) {
      var seconds = Math.pow(2, Math.min(bits, 1023)) / 2 / s.rate;
      return { id: s.id, label: s.label, seconds: seconds, text: humanTime(seconds) };
    });
  }

  function humanTime(seconds) {
    if (!isFinite(seconds)) return 'forever';
    if (seconds < 1) return 'instantly';
    var units = [
      [1, 'second'], [60, 'minute'], [3600, 'hour'], [86400, 'day'],
      [2629746, 'month'], [31556952, 'year'], [31556952 * 100, 'century']
    ];
    for (var i = units.length - 1; i >= 0; i--) {
      if (seconds >= units[i][0]) {
        var value = seconds / units[i][0];
        if (units[i][1] === 'century' && value > 1000) {
          var exp = Math.floor(Math.log(value * 100) / Math.LN10);
          return '1e' + exp + ' years';
        }
        var rounded = value < 10 ? Math.round(value * 10) / 10 : Math.round(value);
        return rounded + ' ' + units[i][1] + (rounded === 1 ? '' : 's');
      }
    }
    return 'instantly';
  }

  function warningFor(sequence, bits) {
    if (!sequence.length) return '';
    var worst = sequence.slice().sort(function (a, b) { return matchGuesses(a) - matchGuesses(b); })[0];
    if (bits >= 60) return '';
    if (worst.pattern === 'dictionary' && worst.dictionary === 'passwords' && worst.rank <= 100) return 'This is one of the most commonly used passwords.';
    if (worst.pattern === 'dictionary' && worst.dictionary === 'passwords') return 'This appears in lists of leaked passwords.';
    if (worst.pattern === 'dictionary') return 'Built around a word that cracking tools already have.';
    if (worst.pattern === 'spatial') return 'Runs of neighbouring keys are among the first things tried.';
    if (worst.pattern === 'repeat') return 'Repeated characters barely add anything.';
    if (worst.pattern === 'sequence') return 'Sequences like this are guessed immediately.';
    if (worst.pattern === 'date' || worst.pattern === 'year') return 'Dates are easy to guess, especially recent ones.';
    return 'Short enough to brute-force.';
  }

  function suggestionsFor(sequence, password, bits) {
    var out = [];
    if (bits >= 80) return out;
    if (password.length < 12) out.push('Add length — it helps more than swapping letters for symbols.');
    if (sequence.some(function (m) { return m.pattern === 'dictionary' && m.l33t; })) out.push('Predictable substitutions like @ for a are already in every cracking dictionary.');
    if (sequence.some(function (m) { return m.pattern === 'dictionary'; })) out.push('Try unrelated words rather than a word plus a number.');
    if (sequence.some(function (m) { return m.pattern === 'spatial'; })) out.push('Avoid runs of adjacent keys.');
    if (sequence.some(function (m) { return m.pattern === 'date' || m.pattern === 'year'; })) out.push('Leave out birthdays and years.');
    return out.slice(0, 3);
  }

  RT.strength = { estimate: estimate, humanTime: humanTime, log2: log2 };
})();
