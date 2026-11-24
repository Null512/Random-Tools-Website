/* Stopwatch with laps. Also measured against the clock, not by counting ticks. */
(function () {
  'use strict';

  function format(ms) {
    var total = Math.max(0, ms);
    var m = Math.floor(total / 60000);
    var s = Math.floor((total % 60000) / 1000);
    var cs = Math.floor((total % 1000) / 10);
    var pad = function (n) { return String(n).padStart(2, '0'); };
    return pad(m) + ':' + pad(s) + '.' + pad(cs);
  }

  RT.register({
    id: 'stopwatch',
    title: 'Stopwatch',
    keywords: 'stopwatch timer laps elapsed measure',

    render: function (root, ctx) {
      var el = ctx.el;
      var startedAt = null, elapsed = 0, laps = [], raf = null;

      var display = el('div', { class: 'readout' });
      var lapList = el('ol', { class: 'lap-list' });
      var startButton = el('button', { class: 'btn btn-wide', type: 'button', text: 'Start', onclick: toggle });
      var lapButton = el('button', { class: 'btn btn-quiet', type: 'button', text: 'Lap', onclick: lap, disabled: true });

      function total() { return elapsed + (startedAt ? Date.now() - startedAt : 0); }

      function paint() {
        display.textContent = format(total());
        display.classList.toggle('is-running', !!startedAt);
      }

      function frame() {
        if (!startedAt) return;
        paint();
        raf = requestAnimationFrame(frame);
      }

      function toggle() {
        if (startedAt) {
          elapsed += Date.now() - startedAt;
          startedAt = null;
          cancelAnimationFrame(raf);
          startButton.textContent = 'Resume';
          lapButton.textContent = 'Reset';
        } else {
          startedAt = Date.now();
          startButton.textContent = 'Pause';
          lapButton.textContent = 'Lap';
          lapButton.disabled = false;
          frame();
        }
        paint();
      }

      function lap() {
        if (!startedAt) { reset(); return; }
        var at = total();
        var previous = laps.length ? laps[laps.length - 1].at : 0;
        laps.push({ at: at, split: at - previous });
        paintLaps();
      }

      function paintLaps() {
        lapList.textContent = '';
        laps.slice().reverse().forEach(function (entry, index) {
          lapList.appendChild(el('li', { class: 'lap' }, [
            el('span', { class: 'lap-index', text: '#' + (laps.length - index) }),
            el('span', { class: 'lap-split mono', text: '+' + format(entry.split) }),
            el('span', { class: 'lap-total mono', text: format(entry.at) })
          ]));
        });
      }

      function reset() {
        startedAt = null;
        cancelAnimationFrame(raf);
        elapsed = 0;
        laps = [];
        startButton.textContent = 'Start';
        lapButton.textContent = 'Lap';
        lapButton.disabled = true;
        paintLaps();
        paint();
      }

      root.appendChild(display);
      root.appendChild(el('div', { class: 'button-row' }, [
        startButton, lapButton,
        el('button', {
          class: 'icon-btn', type: 'button', title: 'Copy the time', 'aria-label': 'Copy the time',
          onclick: function () {
            var text = laps.length
              ? format(total()) + '\n' + laps.map(function (l, i) { return '#' + (i + 1) + '  +' + format(l.split) + '  ' + format(l.at); }).join('\n')
              : format(total());
            ctx.copy(text);
          }
        }, [ctx.icon('copy')])
      ]));
      root.appendChild(lapList);
      paint();
    }
  });
})();
