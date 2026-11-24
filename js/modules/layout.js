/* Keyboard layout fixer: rescues text typed with the wrong layout selected —
   "ghbdtn" back into "привет", and the other way round. */
(function () {
  'use strict';

  var EN = "`qwertyuiop[]\\asdfghjkl;'zxcvbnm,./~QWERTYUIOP{}|ASDFGHJKL:\"ZXCVBNM<>?@#$^&";
  var RU = "ёйцукенгшщзхъ\\фывапролджэячсмитьбю.ЁЙЦУКЕНГШЩЗХЪ/ФЫВАПРОЛДЖЭЯЧСМИТЬБЮ,\"№;:?";

  function translate(text, fromMap, toMap) {
    var out = '';
    for (var i = 0; i < text.length; i++) {
      var at = fromMap.indexOf(text[i]);
      out += at >= 0 ? toMap[at] : text[i];
    }
    return out;
  }

  function looksCyrillic(text) {
    return (text.match(/[\u0400-\u04FF]/g) || []).length > (text.match(/[A-Za-z]/g) || []).length;
  }

  RT.register({
    id: 'layout',
    title: 'Keyboard layout fixer',
    keywords: 'gibberish keyboard layout cyrillic russian translit wrong language ghbdtn',

    render: function (root, ctx) {
      var el = ctx.el;
      var prefs = Object.assign({ direction: 'auto' }, ctx.prefs);
      var output = el('div', { class: 'well well-wrap' });
      var hint = el('p', { class: 'note' });

      var input = el('textarea', {
        class: 'input textarea', rows: 3, spellcheck: 'false',
        placeholder: 'Ghbdtn, rfr ltkf?', 'aria-label': 'Text to fix',
        oninput: run
      });

      var options = [
        { id: 'auto', name: 'Detect' },
        { id: 'en2ru', name: 'Latin keys → Cyrillic' },
        { id: 'ru2en', name: 'Cyrillic keys → Latin' }
      ];

      var switcher = el('div', { class: 'segmented segmented-full' }, options.map(function (option) {
        return el('button', {
          class: 'segment' + (prefs.direction === option.id ? ' is-on' : ''), type: 'button',
          text: option.name, 'aria-pressed': prefs.direction === option.id ? 'true' : 'false',
          onclick: function () {
            prefs.direction = option.id;
            ctx.savePrefs({ direction: option.id });
            Array.prototype.forEach.call(switcher.children, function (b) {
              var on = b === this;
              b.classList.toggle('is-on', on);
              b.setAttribute('aria-pressed', on ? 'true' : 'false');
            }, this);
            run();
          }
        });
      }));

      function run() {
        var text = input.value;
        if (!text) { output.textContent = ''; hint.textContent = ''; return; }
        var direction = prefs.direction;
        if (direction === 'auto') direction = looksCyrillic(text) ? 'ru2en' : 'en2ru';
        output.textContent = direction === 'en2ru' ? translate(text, EN, RU) : translate(text, RU, EN);
        hint.textContent = prefs.direction === 'auto'
          ? (direction === 'en2ru' ? 'Read as Latin keys, written out in Cyrillic.' : 'Read as Cyrillic keys, written out in Latin.')
          : '';
      }

      root.appendChild(switcher);
      root.appendChild(input);
      root.appendChild(el('div', { class: 'well-row' }, [
        output,
        el('button', {
          class: 'icon-btn', type: 'button', title: 'Copy', 'aria-label': 'Copy the fixed text',
          onclick: function () { ctx.copy(output.textContent); }
        }, [ctx.icon('copy')])
      ]));
      root.appendChild(hint);
      root.appendChild(el('button', {
        class: 'text-btn', type: 'button', text: 'Move the result up into the box',
        onclick: function () { input.value = output.textContent; run(); }
      }));
    }
  });
})();
