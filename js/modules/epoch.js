/* Unix time, both directions: a timestamp in, a readable date out, and back again.
   Seconds and milliseconds are told apart by magnitude. */
(function () {
  'use strict';

  function relative(date) {
    var diff = date.getTime() - Date.now();
    var abs = Math.abs(diff);
    var units = [[31557600000, 'year'], [2629800000, 'month'], [604800000, 'week'],
                 [86400000, 'day'], [3600000, 'hour'], [60000, 'minute'], [1000, 'second']];
    for (var i = 0; i < units.length; i++) {
      if (abs >= units[i][0]) {
        var n = Math.round(abs / units[i][0]);
        var label = n + ' ' + units[i][1] + (n === 1 ? '' : 's');
        return diff < 0 ? label + ' ago' : 'in ' + label;
      }
    }
    return 'now';
  }

  function toLocalInput(date) {
    var pad = function (n) { return String(n).padStart(2, '0'); };
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) +
      'T' + pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds());
  }

  RT.register({
    id: 'epoch',
    title: 'Unix time',
    keywords: 'unix epoch timestamp date time seconds milliseconds iso',

    render: function (root, ctx) {
      var el = ctx.el;
      var nowLine = el('div', { class: 'well well-mono' });
      var out = el('div', { class: 'stack' });

      var stampInput = el('input', {
        class: 'input input-number', type: 'text', inputmode: 'numeric',
        placeholder: 'Timestamp', 'aria-label': 'Unix timestamp',
        oninput: function () { fromStamp(this.value); }
      });

      var dateInput = el('input', {
        class: 'input', type: 'datetime-local', step: 1, 'aria-label': 'Date and time',
        oninput: function () {
          var date = new Date(this.value);
          if (isNaN(date)) return;
          stampInput.value = Math.floor(date.getTime() / 1000);
          show(date, 'seconds');
        }
      });

      function row(label, value) {
        return el('div', { class: 'kv' }, [
          el('span', { class: 'kv-key', text: label }),
          el('span', { class: 'kv-value mono', text: value }),
          el('button', {
            class: 'icon-btn', type: 'button', title: 'Copy ' + label, 'aria-label': 'Copy ' + label,
            onclick: function () { ctx.copy(value); }
          }, [ctx.icon('copy')])
        ]);
      }

      function show(date, unit) {
        out.textContent = '';
        if (isNaN(date.getTime())) {
          out.appendChild(el('p', { class: 'note note-warn', text: 'That is not a time I can read.' }));
          return;
        }
        out.appendChild(row('Local', date.toLocaleString()));
        out.appendChild(row('UTC', date.toUTCString()));
        out.appendChild(row('ISO 8601', date.toISOString()));
        out.appendChild(row('Seconds', String(Math.floor(date.getTime() / 1000))));
        out.appendChild(row('Milliseconds', String(date.getTime())));
        out.appendChild(el('p', { class: 'note', text: relative(date) + (unit === 'ms' ? ' — read as milliseconds' : '') }));
        dateInput.value = toLocalInput(date);
      }

      function fromStamp(raw) {
        var text = String(raw).trim();
        if (!text) { out.textContent = ''; return; }
        var value = Number(text);
        if (!isFinite(value)) { show(new Date(NaN)); return; }
        // ten digits or fewer reads as seconds; longer reads as milliseconds
        var ms = Math.abs(value) > 1e11 ? value : value * 1000;
        show(new Date(ms), Math.abs(value) > 1e11 ? 'ms' : 'seconds');
      }

      function tickNow() {
        nowLine.textContent = String(Math.floor(Date.now() / 1000));
      }

      root.appendChild(el('div', { class: 'well-row' }, [
        nowLine,
        el('button', {
          class: 'icon-btn', type: 'button', title: 'Copy the current timestamp', 'aria-label': 'Copy the current timestamp',
          onclick: function () { ctx.copy(nowLine.textContent); }
        }, [ctx.icon('copy')]),
        el('button', {
          class: 'btn btn-quiet', type: 'button', text: 'Use now',
          onclick: function () { stampInput.value = nowLine.textContent; fromStamp(stampInput.value); }
        })
      ]));
      root.appendChild(el('p', { class: 'note', text: 'Seconds since 1 January 1970, UTC.' }));
      root.appendChild(stampInput);
      root.appendChild(dateInput);
      root.appendChild(out);

      tickNow();
      var timer = setInterval(tickNow, 1000);
      window.addEventListener('pagehide', function () { clearInterval(timer); });
    }
  });
})();
