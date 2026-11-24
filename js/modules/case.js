/* Case converter. The text you typed stays put; conversions land in the box below,
   so you can try several without losing the original. */
(function () {
  'use strict';

  function words(text) {
    return text
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .split(/[^A-Za-z0-9\u0400-\u04FF]+/)
      .filter(Boolean);
  }

  var TRANSFORMS = [
    ['UPPER CASE', function (t) { return t.toUpperCase(); }],
    ['lower case', function (t) { return t.toLowerCase(); }],
    ['Title Case', function (t) {
      return t.replace(/\S+/g, function (w) { return w[0].toUpperCase() + w.slice(1).toLowerCase(); });
    }],
    ['Sentence case', function (t) {
      return t.toLowerCase().replace(/(^\s*\w|[.!?]\s+\w)/g, function (m) { return m.toUpperCase(); });
    }],
    ['camelCase', function (t) {
      return words(t).map(function (w, i) {
        w = w.toLowerCase();
        return i ? w[0].toUpperCase() + w.slice(1) : w;
      }).join('');
    }],
    ['PascalCase', function (t) {
      return words(t).map(function (w) { return w[0].toUpperCase() + w.slice(1).toLowerCase(); }).join('');
    }],
    ['snake_case', function (t) { return words(t).map(function (w) { return w.toLowerCase(); }).join('_'); }],
    ['kebab-case', function (t) { return words(t).map(function (w) { return w.toLowerCase(); }).join('-'); }],
    ['CONSTANT_CASE', function (t) { return words(t).map(function (w) { return w.toUpperCase(); }).join('_'); }],
    ['iNVERTED', function (t) {
      return t.replace(/[a-zA-Z\u0400-\u04FF]/g, function (c) {
        return c === c.toLowerCase() ? c.toUpperCase() : c.toLowerCase();
      });
    }]
  ];

  RT.register({
    id: 'case',
    title: 'Case converter',
    keywords: 'case upper lower title camel snake kebab pascal constant text',

    render: function (root, ctx) {
      var el = ctx.el;
      var output = el('div', { class: 'well well-wrap', text: '' });

      var input = el('textarea', {
        class: 'input textarea', rows: 3, placeholder: 'Paste your text', 'aria-label': 'Text to convert',
        oninput: function () { if (last) apply(last); }
      });

      var last = null;
      function apply(transform) {
        last = transform;
        output.textContent = input.value ? transform[1](input.value) : '';
      }

      var buttons = el('div', { class: 'chip-row' }, TRANSFORMS.map(function (transform) {
        return el('button', {
          class: 'chip', type: 'button', text: transform[0],
          onclick: function () {
            Array.prototype.forEach.call(buttons.children, function (b) { b.classList.toggle('is-on', b === this); }, this);
            apply(transform);
          }
        });
      }));

      root.appendChild(input);
      root.appendChild(buttons);
      root.appendChild(el('div', { class: 'well-row' }, [
        output,
        el('button', {
          class: 'icon-btn', type: 'button', title: 'Copy', 'aria-label': 'Copy the converted text',
          onclick: function () { ctx.copy(output.textContent); }
        }, [ctx.icon('copy')])
      ]));
    }
  });
})();
