/* Base converter. Uses BigInt, so it does not quietly lose precision on long values
   the way parseInt does. */
(function () {
  'use strict';

  var DIGITS = '0123456789abcdefghijklmnopqrstuvwxyz';

  function parseBig(text, base) {
    var negative = text[0] === '-';
    if (negative) text = text.slice(1);
    if (!text.length) throw new Error('empty');
    var value = 0n, big = BigInt(base);
    for (var i = 0; i < text.length; i++) {
      var digit = DIGITS.indexOf(text[i].toLowerCase());
      if (digit < 0 || digit >= base) throw new Error('"' + text[i] + '" is not a digit in base ' + base);
      value = value * big + BigInt(digit);
    }
    return negative ? -value : value;
  }

  RT.register({
    id: 'base',
    title: 'Base converter',
    keywords: 'base binary hex hexadecimal octal decimal radix number convert',

    render: function (root, ctx) {
      var el = ctx.el;
      var prefs = Object.assign({ from: 10, to: 2, value: '255' }, ctx.prefs);
      var result = el('div', { class: 'well well-mono' });
      var error = el('p', { class: 'note' });
      var common = el('div', { class: 'stack' });

      var input = el('input', {
        class: 'input input-mono', type: 'text', spellcheck: 'false', value: prefs.value,
        placeholder: 'Value', 'aria-label': 'Value to convert',
        oninput: function () { prefs.value = this.value; save(); run(); }
      });

      function baseItems() {
        var presets = { 2: 'binary', 8: 'octal', 10: 'decimal', 16: 'hexadecimal', 36: 'base 36' };
        var items = [];
        for (var b = 2; b <= 36; b++) {
          items.push({ value: b, label: 'Base ' + b, sub: presets[b] || '', keywords: presets[b] || '' });
        }
        return items;
      }

      var fromPicker = RT.ui.picker({
        items: baseItems(), value: prefs.from, searchPlaceholder: 'Search bases',
        onChange: function (v) { prefs.from = v; save(); run(); }
      });
      var toPicker = RT.ui.picker({
        items: baseItems(), value: prefs.to, searchPlaceholder: 'Search bases',
        onChange: function (v) { prefs.to = v; save(); run(); }
      });

      function save() { ctx.savePrefs({ from: prefs.from, to: prefs.to, value: prefs.value }); }

      function run() {
        var text = String(prefs.value).trim().replace(/[\s_]/g, '');
        common.textContent = '';
        if (!text) { result.textContent = '—'; error.textContent = ''; return; }
        var value;
        try { value = parseBig(text, prefs.from); }
        catch (err) {
          result.textContent = '—';
          error.textContent = err.message === 'empty' ? '' : err.message;
          error.classList.add('note-warn');
          return;
        }
        error.textContent = '';
        error.classList.remove('note-warn');
        result.textContent = value.toString(prefs.to).toUpperCase();
        [[2, 'Binary'], [8, 'Octal'], [10, 'Decimal'], [16, 'Hexadecimal']].forEach(function (pair) {
          if (pair[0] === prefs.to) return;
          common.appendChild(el('div', { class: 'kv' }, [
            el('span', { class: 'kv-key', text: pair[1] }),
            el('span', { class: 'kv-value mono', text: value.toString(pair[0]).toUpperCase() })
          ]));
        });
      }

      root.appendChild(input);
      root.appendChild(el('div', { class: 'convert-row' }, [
        fromPicker.el,
        el('button', {
          class: 'icon-btn', type: 'button', title: 'Swap', 'aria-label': 'Swap the two bases',
          onclick: function () {
            var swap = prefs.from; prefs.from = prefs.to; prefs.to = swap;
            fromPicker.setValue(prefs.from, true);
            toPicker.setValue(prefs.to, true);
            save(); run();
          }
        }, [ctx.icon('swap')]),
        toPicker.el
      ]));
      root.appendChild(el('div', { class: 'well-row' }, [
        result,
        el('button', {
          class: 'icon-btn', type: 'button', title: 'Copy', 'aria-label': 'Copy the result',
          onclick: function () { ctx.copy(result.textContent); }
        }, [ctx.icon('copy')])
      ]));
      root.appendChild(error);
      root.appendChild(common);
      run();
    }
  });
})();
