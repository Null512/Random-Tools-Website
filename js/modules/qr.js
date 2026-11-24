/* QR generator. Codes are built in the page (see js/lib/qr.js) and drawn as SVG, so
   they stay sharp at any size — including the full-screen view a camera can actually read. */
(function () {
  'use strict';

  RT.register({
    id: 'qr',
    title: 'QR code',
    keywords: 'qr code barcode scan wifi url share',

    render: function (root, ctx) {
      var el = ctx.el;
      var prefs = Object.assign({ level: 'M', text: '' }, ctx.prefs);
      var current = null;

      var stage = el('div', { class: 'qr-stage' });
      var info = el('p', { class: 'note qr-info' });

      var input = el('textarea', {
        class: 'input textarea', rows: 3, spellcheck: 'false',
        placeholder: 'Text, a link, a wifi string — anything', 'aria-label': 'Text to encode',
        value: prefs.text,
        oninput: function () { prefs.text = this.value; ctx.savePrefs({ text: this.value }); build(); }
      });

      var levels = [
        ['L', 'Recovers 7% — smallest code'],
        ['M', 'Recovers 15% — the usual choice'],
        ['Q', 'Recovers 25%'],
        ['H', 'Recovers 30% — survives scuffs and logos']
      ];
      var levelSwitch = el('div', { class: 'segmented segmented-full' }, levels.map(function (pair) {
        return el('button', {
          class: 'segment' + (prefs.level === pair[0] ? ' is-on' : ''), type: 'button',
          text: pair[0], title: pair[1], 'aria-label': 'Error correction ' + pair[0] + '. ' + pair[1],
          'aria-pressed': prefs.level === pair[0] ? 'true' : 'false',
          onclick: function () {
            prefs.level = pair[0];
            ctx.savePrefs({ level: pair[0] });
            Array.prototype.forEach.call(levelSwitch.children, function (b) {
              var on = b === this;
              b.classList.toggle('is-on', on);
              b.setAttribute('aria-pressed', on ? 'true' : 'false');
            }, this);
            build();
          }
        });
      }));

      function build() {
        var text = input.value;
        stage.textContent = '';
        if (!text) {
          stage.appendChild(el('p', { class: 'qr-placeholder', text: 'Your code appears here.' }));
          info.textContent = '';
          current = null;
          setButtons(false);
          return;
        }
        try {
          current = RT.qr.encode(text, { level: prefs.level });
        } catch (err) {
          current = null;
          stage.appendChild(el('p', { class: 'note note-warn', text: err.message }));
          info.textContent = '';
          setButtons(false);
          return;
        }
        stage.innerHTML = RT.qr.toSVG(current, { quiet: 3 });
        info.textContent = 'Version ' + current.version + ', ' + current.size + '×' + current.size +
          ' modules, ' + (current.mode === 'byte' ? 'byte' : current.mode) + ' mode.';
        setButtons(true);
      }

      function canvasFor(pixels) {
        var quiet = 4, dim = current.size + quiet * 2;
        var scale = Math.max(1, Math.floor(pixels / dim));
        var canvas = document.createElement('canvas');
        canvas.width = canvas.height = dim * scale;
        var g = canvas.getContext('2d');
        g.fillStyle = '#ffffff';
        g.fillRect(0, 0, canvas.width, canvas.height);
        g.fillStyle = '#000000';
        for (var r = 0; r < current.size; r++) {
          for (var c = 0; c < current.size; c++) {
            if (current.modules[r][c]) g.fillRect((c + quiet) * scale, (r + quiet) * scale, scale, scale);
          }
        }
        return canvas;
      }

      function download(name, blob) {
        var url = URL.createObjectURL(blob);
        var link = el('a', { href: url, download: name });
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      }

      function fullscreen() {
        if (!current) return;
        RT.ui.dialog({
          title: false,
          size: 'qr',
          render: function (body, close) {
            var holder = el('div', { class: 'qr-full', onclick: close });
            holder.innerHTML = RT.qr.toSVG(current, { quiet: 2, light: '#ffffff', dark: '#000000' });
            body.appendChild(holder);
            body.appendChild(el('p', { class: 'qr-full-note', text: 'Turn your screen brightness up if the camera struggles. Tap anywhere to close.' }));
          }
        });
      }

      var buttons = el('div', { class: 'button-row' }, [
        el('button', { class: 'btn', type: 'button', onclick: fullscreen }, [ctx.icon('expand'), el('span', { text: 'Full screen' })]),
        el('button', {
          class: 'btn btn-quiet', type: 'button', text: 'PNG',
          onclick: function () { canvasFor(1024).toBlob(function (blob) { download('qr-code.png', blob); }); }
        }),
        el('button', {
          class: 'btn btn-quiet', type: 'button', text: 'SVG',
          onclick: function () {
            download('qr-code.svg', new Blob([RT.qr.toSVG(current, { quiet: 4 })], { type: 'image/svg+xml' }));
          }
        })
      ]);

      function setButtons(on) {
        Array.prototype.forEach.call(buttons.children, function (b) { b.disabled = !on; });
      }

      stage.addEventListener('click', function () { if (current) fullscreen(); });

      root.appendChild(input);
      root.appendChild(levelSwitch);
      root.appendChild(stage);
      root.appendChild(buttons);
      root.appendChild(info);
      build();
    }
  });
})();
