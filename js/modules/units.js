/* Unit converter. Every unit carries its full name, so you never have to guess what
   "yd" or "ct" stands for. */
(function () {
  'use strict';

  function convert(category, value, from, to) {
    if (category.special === 'temperature') {
      var c = from === 'C' ? value
        : from === 'F' ? (value - 32) * 5 / 9
        : from === 'K' ? value - 273.15
        : (value - 491.67) * 5 / 9;
      return to === 'C' ? c
        : to === 'F' ? c * 9 / 5 + 32
        : to === 'K' ? c + 273.15
        : (c + 273.15) * 9 / 5;
    }
    var unitFrom = category.units.filter(function (u) { return u.id === from; })[0];
    var unitTo = category.units.filter(function (u) { return u.id === to; })[0];
    if (!unitFrom || !unitTo) return NaN;
    return value * unitFrom.factor / unitTo.factor;
  }

  RT.register({
    id: 'units',
    title: 'Unit converter',
    keywords: 'convert units length mass weight temperature volume area speed data time pressure energy',

    render: function (root, ctx) {
      var el = ctx.el;
      var prefs = Object.assign({ category: 'length', from: 'yd', to: 'm', value: '1' }, ctx.prefs);
      if (!RT.units[prefs.category]) prefs.category = 'length';

      var category = RT.units[prefs.category];
      var result = el('div', { class: 'well well-mono' });
      var explain = el('p', { class: 'note' });
      var allList = el('div', { class: 'unit-all', hidden: true });

      var categoryPicker = RT.ui.picker({
        items: Object.keys(RT.units).map(function (key) {
          return { value: key, label: RT.units[key].label };
        }),
        value: prefs.category,
        searchPlaceholder: 'Search categories',
        onChange: function (value) {
          prefs.category = value;
          category = RT.units[value];
          prefs.from = category.units[0].id;
          prefs.to = (category.units[1] || category.units[0]).id;
          fromPicker.setItems(unitItems());
          toPicker.setItems(unitItems());
          fromPicker.setValue(prefs.from, true);
          toPicker.setValue(prefs.to, true);
          save(); run();
        }
      });

      function unitItems() {
        return category.units.map(function (u) {
          return { value: u.id, label: u.symbol, sub: u.name, keywords: u.name + ' ' + u.id };
        });
      }

      var valueInput = el('input', {
        class: 'input input-number', type: 'text', inputmode: 'decimal', value: prefs.value,
        'aria-label': 'Amount to convert',
        oninput: function () { prefs.value = this.value; save(); run(); }
      });

      var fromPicker = RT.ui.picker({
        items: unitItems(), value: prefs.from, searchPlaceholder: 'Search units',
        onChange: function (v) { prefs.from = v; save(); run(); }
      });
      var toPicker = RT.ui.picker({
        items: unitItems(), value: prefs.to, searchPlaceholder: 'Search units',
        onChange: function (v) { prefs.to = v; save(); run(); }
      });

      function save() {
        ctx.savePrefs({ category: prefs.category, from: prefs.from, to: prefs.to, value: prefs.value });
      }

      function nameOf(id, plural) {
        var unit = category.units.filter(function (u) { return u.id === id; })[0];
        if (!unit) return id;
        if (!plural || category.special === 'temperature') return unit.name;
        return unit.name.replace(/^(\w+)/, function (w) {
          return /(s|x|ch)$/.test(w) ? w + 'es' : /y$/.test(w) ? w.slice(0, -1) + 'ies' : w + 's';
        });
      }

      function run() {
        var value = parseFloat(String(prefs.value).replace(',', '.'));
        if (isNaN(value)) {
          result.textContent = '—';
          explain.textContent = 'Enter a number.';
          allList.textContent = '';
          return;
        }
        var out = convert(category, value, prefs.from, prefs.to);
        var unitTo = category.units.filter(function (u) { return u.id === prefs.to; })[0];
        result.textContent = RT.ui.groupDigits(RT.ui.formatNumber(out)) + ' ' + unitTo.symbol;
        explain.textContent = RT.ui.formatNumber(value) + ' ' + nameOf(prefs.from, Math.abs(value) !== 1) +
          ' = ' + RT.ui.formatNumber(out) + ' ' + nameOf(prefs.to, Math.abs(out) !== 1);
        paintAll(value);
      }

      function paintAll(value) {
        allList.textContent = '';
        category.units.forEach(function (unit) {
          if (unit.id === prefs.from) return;
          allList.appendChild(el('div', { class: 'unit-all-row' }, [
            el('span', { class: 'unit-all-value mono', text: RT.ui.formatNumber(convert(category, value, prefs.from, unit.id), 8) }),
            el('span', { class: 'unit-all-name', text: unit.name })
          ]));
        });
      }

      var toggleAll = el('button', {
        class: 'text-btn', type: 'button', text: 'Show every unit',
        onclick: function () {
          allList.hidden = !allList.hidden;
          this.textContent = allList.hidden ? 'Show every unit' : 'Hide the list';
        }
      });

      root.appendChild(categoryPicker.el);
      root.appendChild(valueInput);
      root.appendChild(el('div', { class: 'convert-row' }, [
        fromPicker.el,
        el('button', {
          class: 'icon-btn', type: 'button', title: 'Swap', 'aria-label': 'Swap the two units',
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
      root.appendChild(explain);
      root.appendChild(toggleAll);
      root.appendChild(allList);
      run();
    }
  });
})();
