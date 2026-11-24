/* World clock. Every IANA zone is available through the search box; the ones you add
   stay in your settings code. */
(function () {
  'use strict';

  var zones = null;

  function allZones() {
    if (zones) return zones;
    var countries = {};
    (RT.timezoneData || '').split(';').forEach(function (pair) {
      var bits = pair.split('|');
      if (bits[0]) countries[bits[0]] = bits[1] || '';
    });
    var list = Object.keys(countries);
    if (typeof Intl.supportedValuesOf === 'function') {
      try {
        Intl.supportedValuesOf('timeZone').forEach(function (z) {
          if (list.indexOf(z) < 0) list.push(z);
        });
      } catch (e) { /* older browser */ }
    }
    zones = list.sort().map(function (id) {
      var parts = id.split('/');
      return {
        id: id,
        city: parts[parts.length - 1].replace(/_/g, ' '),
        region: parts.length > 1 ? parts[0].replace(/_/g, ' ') : '',
        country: countries[id] || ''
      };
    });
    zones.unshift({ id: 'UTC', city: 'UTC', region: '', country: 'Coordinated Universal Time' });
    zones.unshift({ id: 'local', city: 'Local time', region: '', country: 'This device' });
    return zones;
  }

  function zoneInfo(id) {
    var found = allZones().filter(function (z) { return z.id === id; })[0];
    return found || { id: id, city: id, region: '', country: '' };
  }

  function offsetLabel(id) {
    if (id === 'local') return '';
    try {
      var now = new Date();
      var here = new Date(now.toLocaleString('en-US', { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }));
      var there = new Date(now.toLocaleString('en-US', { timeZone: id }));
      var diff = Math.round((there - here) / 60000);
      if (!diff) return 'same as you';
      var sign = diff > 0 ? '+' : '−';
      var hours = Math.floor(Math.abs(diff) / 60), minutes = Math.abs(diff) % 60;
      return sign + hours + (minutes ? ':' + String(minutes).padStart(2, '0') : '') + 'h';
    } catch (e) { return ''; }
  }

  RT.register({
    id: 'clock',
    title: 'World clock',
    keywords: 'time zone clock utc world city hour',

    render: function (root, ctx) {
      var el = ctx.el;
      var prefs = Object.assign({ zones: ['local', 'UTC', 'Europe/London', 'America/New_York'], seconds: true }, ctx.prefs);
      var rows = el('div', { class: 'clock-rows' });
      var timer = null;

      function save() { ctx.savePrefs({ zones: prefs.zones, seconds: prefs.seconds }); }

      function paint() {
        rows.textContent = '';
        prefs.zones.forEach(function (id, index) {
          var info = zoneInfo(id);
          var time = el('span', { class: 'clock-time mono' });
          var date = el('span', { class: 'clock-date' });
          rows.appendChild(el('div', { class: 'clock-row', dataset: { zone: id } }, [
            el('div', { class: 'clock-place' }, [
              el('span', { class: 'clock-city', text: info.city }),
              el('span', { class: 'clock-country', text: [info.country, offsetLabel(id)].filter(Boolean).join(' · ') })
            ]),
            el('div', { class: 'clock-readout' }, [time, date]),
            el('button', {
              class: 'icon-btn clock-remove', type: 'button',
              title: 'Remove', 'aria-label': 'Remove ' + info.city,
              onclick: function () {
                prefs.zones.splice(index, 1);
                save(); paint();
              }
            }, [ctx.icon('close')])
          ]));
        });
        if (!prefs.zones.length) {
          rows.appendChild(el('p', { class: 'note', text: 'No clocks yet — add a city below.' }));
        }
        tick();
      }

      function tick() {
        var now = new Date();
        Array.prototype.forEach.call(rows.querySelectorAll('.clock-row'), function (row) {
          var id = row.dataset.zone;
          var timeOptions = { hour: '2-digit', minute: '2-digit', hour12: false };
          if (prefs.seconds) timeOptions.second = '2-digit';
          var dateOptions = { weekday: 'short', day: 'numeric', month: 'short' };
          if (id !== 'local') { timeOptions.timeZone = id; dateOptions.timeZone = id; }
          try {
            row.querySelector('.clock-time').textContent = now.toLocaleTimeString('en-GB', timeOptions);
            row.querySelector('.clock-date').textContent = now.toLocaleDateString('en-GB', dateOptions);
          } catch (e) {
            row.querySelector('.clock-time').textContent = '—';
          }
        });
      }

      var adder = RT.ui.picker({
        items: [],
        value: null,
        placeholder: 'Add a city or zone',
        searchPlaceholder: 'Search 400+ zones',
        onChange: function (value) {
          if (value && prefs.zones.indexOf(value) < 0) {
            prefs.zones.push(value);
            save(); paint();
          }
          adder.setValue(null, true);
        }
      });

      adder.setItems(allZones().map(function (z) {
        var popular = (RT.popularZones || []).indexOf(z.id) >= 0 || z.id === 'local';
        return {
          value: z.id,
          label: z.city,
          sub: [z.country, z.region].filter(Boolean).join(' · '),
          group: popular ? 'Common' : 'All zones',
          keywords: z.id + ' ' + z.country
        };
      }).sort(function (a, b) {
        if (a.group === b.group) return 0;
        return a.group === 'Common' ? -1 : 1;
      }));

      root.appendChild(rows);
      root.appendChild(adder.el);
      root.appendChild(el('label', { class: 'check' }, [
        el('input', {
          type: 'checkbox', checked: prefs.seconds,
          onchange: function () { prefs.seconds = this.checked; save(); tick(); }
        }),
        el('span', { text: 'Show seconds' })
      ]));

      paint();
      timer = setInterval(tick, 1000);
      window.addEventListener('pagehide', function () { clearInterval(timer); });
    }
  });
})();
