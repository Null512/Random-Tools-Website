/* Currency converter: ~170 fiat currencies plus the main cryptocurrencies, all searchable
   by name as well as code. Rates are cached so the tool still works offline, with the age
   of the figures shown rather than hidden. */
(function () {
  'use strict';

  var CACHE_KEY = 'rt.rates';
  var SOURCES = [
    'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json',
    'https://latest.currency-api.pages.dev/v1/currencies/usd.json'
  ];

  function readCache() {
    try {
      var raw = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (raw && raw.rates && raw.fetched) return raw;
    } catch (e) { /* ignore */ }
    return null;
  }

  function writeCache(data) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch (e) { /* ignore */ }
  }

  function fetchRates(index) {
    index = index || 0;
    if (index >= SOURCES.length) return fetchFallback();
    return fetch(SOURCES[index])
      .then(function (r) { if (!r.ok) throw new Error('bad response'); return r.json(); })
      .then(function (data) {
        var table = data.usd || {};
        var rates = {};
        Object.keys(table).forEach(function (code) { rates[code.toUpperCase()] = table[code]; });
        if (!rates.EUR) throw new Error('unexpected shape');
        return { rates: rates, date: data.date || '', fetched: Date.now() };
      })
      .catch(function () { return fetchRates(index + 1); });
  }

  function fetchFallback() {
    return fetch('https://open.er-api.com/v6/latest/USD')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data.rates) throw new Error('unexpected shape');
        return { rates: data.rates, date: (data.time_last_update_utc || '').slice(5, 16), fetched: Date.now() };
      });
  }

  function ageText(fetched) {
    var minutes = Math.round((Date.now() - fetched) / 60000);
    if (minutes < 2) return 'just now';
    if (minutes < 60) return minutes + ' minutes ago';
    var hours = Math.round(minutes / 60);
    if (hours < 24) return hours + (hours === 1 ? ' hour ago' : ' hours ago');
    var days = Math.round(hours / 24);
    return days + (days === 1 ? ' day ago' : ' days ago');
  }

  RT.register({
    id: 'currency',
    title: 'Currency converter',
    keywords: 'currency money exchange rate fiat crypto bitcoin dollar euro',

    render: function (root, ctx) {
      var el = ctx.el;
      var prefs = Object.assign({ from: 'USD', to: 'EUR', amount: '100' }, ctx.prefs);
      var store = readCache();

      var result = el('div', { class: 'well well-mono' });
      var rateLine = el('p', { class: 'note' });
      var status = el('p', { class: 'note' });

      var amount = el('input', {
        class: 'input input-number', type: 'text', inputmode: 'decimal', value: prefs.amount,
        'aria-label': 'Amount',
        oninput: function () { prefs.amount = this.value; ctx.savePrefs({ amount: this.value }); run(); }
      });

      function items() {
        if (!store) return [{ value: prefs.from, label: prefs.from }, { value: prefs.to, label: prefs.to }];
        var fiat = [], crypto = [];
        Object.keys(store.rates).forEach(function (code) {
          var name = RT.currencyNames[code];
          if (name) { fiat.push({ value: code, label: code, sub: name[0], group: 'Currencies', keywords: name[0] }); return; }
          var coin = RT.cryptoNames[code];
          if (coin) crypto.push({ value: code, label: code, sub: coin[0], group: 'Cryptocurrencies', keywords: coin[0] });
        });
        fiat.sort(function (a, b) { return a.value < b.value ? -1 : 1; });
        crypto.sort(function (a, b) { return a.value < b.value ? -1 : 1; });
        return fiat.concat(crypto);
      }

      var fromPicker = RT.ui.picker({
        items: items(), value: prefs.from, searchPlaceholder: 'Search by code or name',
        onChange: function (v) { prefs.from = v; ctx.savePrefs({ from: v }); run(); }
      });
      var toPicker = RT.ui.picker({
        items: items(), value: prefs.to, searchPlaceholder: 'Search by code or name',
        onChange: function (v) { prefs.to = v; ctx.savePrefs({ to: v }); run(); }
      });

      function nameOf(code) {
        var entry = RT.currencyNames[code] || RT.cryptoNames[code];
        return entry ? entry[0] : code;
      }

      function money(value, code) {
        if (!isFinite(value)) return '—';
        var isCrypto = !!RT.cryptoNames[code] && !RT.currencyNames[code];
        var abs = Math.abs(value);
        if (isCrypto || abs < 1) return RT.ui.formatNumber(value, 8);
        return RT.ui.groupDigits(value.toFixed(2));
      }

      function run() {
        if (!store) { result.textContent = '—'; return; }
        var value = parseFloat(String(prefs.amount).replace(/[\s,]/g, ''));
        var from = store.rates[prefs.from], to = store.rates[prefs.to];
        if (isNaN(value) || !from || !to) {
          result.textContent = '—';
          rateLine.textContent = from && to ? 'Enter an amount.' : 'That currency is not in the current rate feed.';
          return;
        }
        var out = value / from * to;
        result.textContent = money(out, prefs.to) + ' ' + prefs.to;
        rateLine.textContent = '1 ' + nameOf(prefs.from) + ' = ' + money(to / from, prefs.to) + ' ' + prefs.to +
          '  ·  1 ' + nameOf(prefs.to) + ' = ' + money(from / to, prefs.from) + ' ' + prefs.from;
      }

      function paintStatus(state) {
        status.classList.toggle('note-warn', state === 'offline');
        if (state === 'loading') { status.textContent = 'Fetching rates…'; return; }
        if (!store) { status.textContent = 'No rates yet — check your connection and refresh.'; return; }
        status.textContent = (state === 'offline' ? 'Could not refresh, showing rates from ' : 'Rates from ') +
          ageText(store.fetched) + (store.date ? ' (feed dated ' + store.date + ')' : '') + '.';
      }

      function refresh(force) {
        if (!force && store && Date.now() - store.fetched < 6 * 3600 * 1000) { paintStatus(); return; }
        paintStatus('loading');
        fetchRates().then(function (data) {
          store = data;
          writeCache(data);
          fromPicker.setItems(items());
          toPicker.setItems(items());
          paintStatus();
          run();
        }).catch(function () { paintStatus('offline'); });
      }

      root.appendChild(amount);
      root.appendChild(el('div', { class: 'convert-row' }, [
        fromPicker.el,
        el('button', {
          class: 'icon-btn', type: 'button', title: 'Swap', 'aria-label': 'Swap the two currencies',
          onclick: function () {
            var swap = prefs.from; prefs.from = prefs.to; prefs.to = swap;
            fromPicker.setValue(prefs.from, true);
            toPicker.setValue(prefs.to, true);
            ctx.savePrefs({ from: prefs.from, to: prefs.to });
            run();
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
      root.appendChild(rateLine);
      root.appendChild(el('div', { class: 'row-between' }, [
        status,
        el('button', { class: 'text-btn', type: 'button', text: 'Refresh', onclick: function () { refresh(true); } })
      ]));

      run();
      refresh(false);
    }
  });
})();
