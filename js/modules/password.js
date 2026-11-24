/* Password generator, with a strength estimate that looks for patterns rather than
   just counting characters — and a second tab for checking a password you already use. */
(function () {
  'use strict';

  var SETS = {
    upper: { label: 'A–Z', chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', ambiguous: 'IO' },
    lower: { label: 'a–z', chars: 'abcdefghijklmnopqrstuvwxyz', ambiguous: 'l' },
    digits: { label: '0–9', chars: '0123456789', ambiguous: '01' },
    symbols: { label: '!@#$', chars: '!@#$%^&*()-_=+[]{};:,.?/~', ambiguous: '' }
  };

  function randomInt(max) {
    // rejection sampling, so every value is equally likely
    var limit = Math.floor(0xffffffff / max) * max;
    var buf = new Uint32Array(1);
    do { crypto.getRandomValues(buf); } while (buf[0] >= limit);
    return buf[0] % max;
  }

  function pick(pool) { return pool[randomInt(pool.length)]; }

  function shuffle(chars) {
    for (var i = chars.length - 1; i > 0; i--) {
      var j = randomInt(i + 1), tmp = chars[i];
      chars[i] = chars[j]; chars[j] = tmp;
    }
    return chars;
  }

  function wordPool() {
    var words = (RT.wordlists && RT.wordlists.english ? RT.wordlists.english : '').split(' ');
    var pool = words.filter(function (w) { return w.length >= 4 && w.length <= 8 && /^[a-z]+$/.test(w); });
    return pool.length ? pool : ['correct', 'horse', 'battery', 'staple'];
  }

  RT.register({
    id: 'password',
    title: 'Password generator',
    keywords: 'password passphrase random entropy strength keepass generator',

    render: function (root, ctx) {
      var el = ctx.el, prefs = ctx.prefs;
      var settings = Object.assign({
        length: 20, upper: true, lower: true, digits: true, symbols: true,
        avoidAmbiguous: false, mode: 'chars', words: 5, separator: '-'
      }, prefs);

      var output = el('div', { class: 'well well-mono', id: 'pw-out', tabindex: '0' });
      var meter = el('div', { class: 'meter' }, [el('span', { class: 'meter-fill' })]);
      var verdict = el('div', { class: 'strength-line' });
      var detail = el('div', { class: 'strength-detail' });
      var generated = null;

      // --- controls
      var lengthValue = el('output', { class: 'range-value', text: settings.length });
      var lengthInput = el('input', {
        type: 'range', min: 6, max: 64, step: 1, value: settings.length,
        'aria-label': 'Password length',
        oninput: function () {
          settings.length = +this.value;
          lengthValue.textContent = settings.length;
          save(); generate();
        }
      });

      var wordsValue = el('output', { class: 'range-value', text: settings.words });
      var wordsInput = el('input', {
        type: 'range', min: 3, max: 10, step: 1, value: settings.words,
        'aria-label': 'Number of words',
        oninput: function () {
          settings.words = +this.value;
          wordsValue.textContent = settings.words;
          save(); generate();
        }
      });

      function checkbox(key, label) {
        return el('label', { class: 'check' }, [
          el('input', {
            type: 'checkbox', checked: settings[key],
            onchange: function () {
              settings[key] = this.checked;
              if (!['upper', 'lower', 'digits', 'symbols'].some(function (k) { return settings[k]; })) {
                settings[key] = true; this.checked = true;
                ctx.toast('Keep at least one character set on.', 'error');
              }
              save(); generate();
            }
          }),
          el('span', { text: label })
        ]);
      }

      var charControls = el('div', { class: 'stack' }, [
        el('div', { class: 'field-inline' }, [
          el('span', { class: 'field-label', text: 'Length' }),
          lengthInput, lengthValue
        ]),
        el('div', { class: 'check-row' }, [
          checkbox('upper', SETS.upper.label),
          checkbox('lower', SETS.lower.label),
          checkbox('digits', SETS.digits.label),
          checkbox('symbols', SETS.symbols.label),
          checkbox('avoidAmbiguous', 'No look-alikes')
        ])
      ]);

      var wordControls = el('div', { class: 'stack', hidden: settings.mode !== 'words' }, [
        el('div', { class: 'field-inline' }, [
          el('span', { class: 'field-label', text: 'Words' }),
          wordsInput, wordsValue
        ]),
        el('div', { class: 'field-inline' }, [
          el('span', { class: 'field-label', text: 'Joined by' }),
          el('input', {
            class: 'input input-short', value: settings.separator, maxlength: 3, 'aria-label': 'Separator',
            oninput: function () { settings.separator = this.value; save(); generate(); }
          })
        ])
      ]);

      var modeSwitch = el('div', { class: 'segmented segmented-full' }, ['chars', 'words'].map(function (mode) {
        return el('button', {
          class: 'segment' + (settings.mode === mode ? ' is-on' : ''), type: 'button',
          text: mode === 'chars' ? 'Characters' : 'Words',
          'aria-pressed': settings.mode === mode ? 'true' : 'false',
          onclick: function () {
            settings.mode = mode;
            Array.prototype.forEach.call(modeSwitch.children, function (b) {
              var on = b === this;
              b.classList.toggle('is-on', on);
              b.setAttribute('aria-pressed', on ? 'true' : 'false');
            }, this);
            charControls.hidden = mode !== 'chars';
            wordControls.hidden = mode !== 'words';
            save(); generate();
          }
        });
      }));

      function save() {
        ctx.savePrefs({
          length: settings.length, upper: settings.upper, lower: settings.lower,
          digits: settings.digits, symbols: settings.symbols, avoidAmbiguous: settings.avoidAmbiguous,
          mode: settings.mode, words: settings.words, separator: settings.separator
        });
      }

      function buildPool() {
        var pool = '';
        ['upper', 'lower', 'digits', 'symbols'].forEach(function (key) {
          if (!settings[key]) return;
          var chars = SETS[key].chars;
          if (settings.avoidAmbiguous) {
            chars = chars.split('').filter(function (c) { return SETS[key].ambiguous.indexOf(c) < 0; }).join('');
          }
          pool += chars;
        });
        return pool;
      }

      function generate() {
        var exactBits;
        if (settings.mode === 'words') {
          var pool = wordPool(), parts = [];
          for (var i = 0; i < settings.words; i++) parts.push(pick(pool));
          generated = parts.join(settings.separator || '-');
          exactBits = settings.words * Math.log2(pool.length);
        } else {
          var chars = buildPool();
          var required = [];
          ['upper', 'lower', 'digits', 'symbols'].forEach(function (key) {
            if (!settings[key]) return;
            var set = SETS[key].chars;
            if (settings.avoidAmbiguous) set = set.split('').filter(function (c) { return SETS[key].ambiguous.indexOf(c) < 0; }).join('');
            required.push(pick(set));
          });
          var out = required.slice();
          for (var j = out.length; j < settings.length; j++) out.push(pick(chars));
          generated = shuffle(out).slice(0, settings.length).join('');
          exactBits = settings.length * Math.log2(chars.length);
        }
        output.textContent = generated;
        showStrength(generated, exactBits);
      }

      function showStrength(password, exactBits) {
        var result = RT.strength.estimate(password);
        var bits = exactBits == null ? result.bits : Math.min(exactBits, result.bits);
        var percent = Math.max(3, Math.min(100, (bits / 128) * 100));
        var level = bits < 28 ? 0 : bits < 40 ? 1 : bits < 60 ? 2 : bits < 80 ? 3 : 4;
        var names = ['Very weak', 'Weak', 'Fair', 'Strong', 'Very strong'];

        meter.firstChild.style.width = percent + '%';
        meter.dataset.level = level;

        verdict.textContent = '';
        verdict.appendChild(el('strong', { text: names[level] }));
        verdict.appendChild(el('span', { class: 'mono', text: Math.round(bits) + ' bits' }));

        var offline = result.crackTimes.filter(function (c) { return c.id === 'offline_fast'; })[0];
        detail.textContent = '';
        detail.appendChild(el('p', {
          class: 'note',
          text: 'A GPU rig guessing 10 billion times a second would need about ' + offline.text + '.'
        }));

        if (exactBits != null) {
        } else {
          if (result.warning) detail.appendChild(el('p', { class: 'note note-warn', text: result.warning }));
          if (result.sequence.length) {
            var list = el('ul', { class: 'pattern-list' });
            result.sequence.forEach(function (match) {
              list.appendChild(el('li', {}, [
                el('code', { text: match.token }),
                el('span', { text: match.description })
              ]));
            });
            detail.appendChild(list);
          }
          result.suggestions.forEach(function (s) {
            detail.appendChild(el('p', { class: 'note', text: s }));
          });
        }
      }

      // --- check tab
      var checkInput = el('input', {
        class: 'input', type: 'password', autocomplete: 'off', spellcheck: 'false',
        placeholder: 'Type a password to test it', 'aria-label': 'Password to check',
        oninput: function () {
          if (!this.value) { meter.firstChild.style.width = '0'; verdict.textContent = ''; detail.textContent = ''; return; }
          showStrength(this.value, null);
        }
      });
      var reveal = el('button', {
        class: 'icon-btn', type: 'button', title: 'Show password', 'aria-label': 'Show password',
        onclick: function () {
          var showing = checkInput.type === 'text';
          checkInput.type = showing ? 'password' : 'text';
          this.textContent = '';
          this.appendChild(ctx.icon(showing ? 'eye' : 'eye-off'));
        }
      }, [ctx.icon('eye')]);

      var checkPane = el('div', { class: 'stack', hidden: true }, [
        el('div', { class: 'field-inline' }, [checkInput, reveal]),
        el('p', { class: 'note', text: 'Typed here only — nothing is sent anywhere or stored.' })
      ]);

      var genPane = el('div', { class: 'stack' }, [
        modeSwitch, charControls, wordControls,
        el('div', { class: 'well-row' }, [
          output,
          el('button', {
            class: 'icon-btn', type: 'button', title: 'Generate another', 'aria-label': 'Generate another',
            onclick: generate
          }, [ctx.icon('refresh')]),
          el('button', {
            class: 'icon-btn', type: 'button', title: 'Copy', 'aria-label': 'Copy password',
            onclick: function () { ctx.copy(generated, 'Password copied.'); }
          }, [ctx.icon('copy')])
        ])
      ]);

      var tabs = el('div', { class: 'tabs' }, [
        el('button', { class: 'tab is-on', type: 'button', text: 'Generate', onclick: function () { pickTab(this, true); } }),
        el('button', { class: 'tab', type: 'button', text: 'Check one', onclick: function () { pickTab(this, false); } })
      ]);

      function pickTab(button, isGenerate) {
        Array.prototype.forEach.call(tabs.children, function (b) { b.classList.toggle('is-on', b === button); });
        genPane.hidden = !isGenerate;
        checkPane.hidden = isGenerate;
        meter.firstChild.style.width = '0';
        verdict.textContent = '';
        detail.textContent = '';
        if (isGenerate) generate();
        else { checkInput.value = ''; checkInput.focus(); }
      }

      root.appendChild(tabs);
      root.appendChild(genPane);
      root.appendChild(checkPane);
      root.appendChild(el('div', { class: 'strength' }, [meter, verdict, detail]));

      generate();
    }
  });
})();
