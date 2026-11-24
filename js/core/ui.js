/* Small shared UI pieces: a DOM builder, the toast, copy-to-clipboard, the dialog,
   and the searchable picker that the currency, time zone and unit tools all use. */
window.RT = window.RT || {};
(function () {
  'use strict';

  function el(tag, props, children) {
    var node = document.createElement(tag);
    if (props) {
      Object.keys(props).forEach(function (key) {
        var value = props[key];
        if (value == null || value === false) return;
        if (key === 'class') node.className = value;
        else if (key === 'text') node.textContent = value;
        else if (key === 'html') node.innerHTML = value;
        else if (key === 'dataset') Object.assign(node.dataset, value);
        else if (key === 'style') Object.assign(node.style, value);
        else if (key.slice(0, 2) === 'on') node.addEventListener(key.slice(2).toLowerCase(), value);
        else if (value === true) node.setAttribute(key, '');
        else node.setAttribute(key, value);
      });
    }
    (children || []).forEach(function (child) {
      if (child == null || child === false) return;
      node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    });
    return node;
  }

  function icon(name, cls) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'icon' + (cls ? ' ' + cls : ''));
    svg.setAttribute('aria-hidden', 'true');
    var use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', '#i-' + name);
    svg.appendChild(use);
    return svg;
  }

  var toastTimer = null;
  function toast(message, kind) {
    var node = document.getElementById('toast');
    if (!node) return;
    node.textContent = '';
    node.appendChild(icon(kind === 'error' ? 'alert' : 'check'));
    node.appendChild(el('span', { text: message }));
    node.className = 'toast show' + (kind === 'error' ? ' toast-error' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { node.className = 'toast'; }, 2600);
  }

  function copy(text, message) {
    text = String(text == null ? '' : text);
    if (!text) { toast('Nothing to copy yet.', 'error'); return Promise.resolve(false); }
    function fallback() {
      var area = el('textarea', { value: text, style: { position: 'fixed', top: '-1000px', opacity: '0' } });
      document.body.appendChild(area);
      area.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(area);
      toast(ok ? (message || 'Copied.') : 'Your browser blocked the copy — select the text and copy it yourself.', ok ? null : 'error');
      return ok;
    }
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text)
        .then(function () { toast(message || 'Copied.'); return true; })
        .catch(function () { return fallback(); });
    }
    return Promise.resolve(fallback());
  }

  // --- dialog -------------------------------------------------------------
  var openDialog = null;

  function dialog(options) {
    close();
    var content = el('div', { class: 'dialog-body' });
    var titleBar = el('div', { class: 'dialog-head' }, [
      el('h2', { class: 'dialog-title', text: options.title || '' }),
      el('button', { class: 'icon-btn', 'aria-label': 'Close', onclick: close }, [icon('close')])
    ]);
    var panel = el('div', {
      class: 'dialog' + (options.size ? ' dialog-' + options.size : ''),
      role: 'dialog', 'aria-modal': 'true', 'aria-label': options.title || 'Dialog'
    }, [options.title === false ? null : titleBar, content]);
    var overlay = el('div', { class: 'overlay', onclick: function (e) { if (e.target === overlay) close(); } }, [panel]);

    if (typeof options.render === 'function') options.render(content, close);
    else if (options.content) content.appendChild(options.content);

    document.body.appendChild(overlay);
    document.body.classList.add('no-scroll');
    requestAnimationFrame(function () { overlay.classList.add('open'); });

    var focusable = panel.querySelector('input, button, textarea, select');
    if (focusable && !('ontouchstart' in window)) focusable.focus();

    openDialog = { overlay: overlay, onClose: options.onClose };
    return { close: close, panel: panel, body: content };
  }

  function close() {
    if (!openDialog) return;
    var d = openDialog;
    openDialog = null;
    d.overlay.classList.remove('open');
    document.body.classList.remove('no-scroll');
    setTimeout(function () { if (d.overlay.parentNode) d.overlay.parentNode.removeChild(d.overlay); }, 180);
    if (d.onClose) d.onClose();
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && openDialog) close();
  });

  // --- searchable picker --------------------------------------------------
  /* items: [{ value, label, sub, group }] — label is the short form (USD, yd),
     sub is the full name that makes it obvious what the short form means. */
  function picker(options) {
    var items = options.items || [];
    var value = options.value;
    var trigger = el('button', {
      class: 'picker' + (options.class ? ' ' + options.class : ''), type: 'button',
      'aria-haspopup': 'listbox', 'aria-expanded': 'false'
    });
    var popup = null, list = null, search = null, filtered = [], active = 0;

    function current() {
      for (var i = 0; i < items.length; i++) if (items[i].value === value) return items[i];
      return null;
    }

    function paintTrigger() {
      var item = current();
      trigger.textContent = '';
      trigger.appendChild(el('span', { class: 'picker-label' }, [
        el('span', { class: 'picker-code', text: item ? item.label : (options.placeholder || 'Choose') }),
        item && item.sub ? el('span', { class: 'picker-sub', text: item.sub }) : null
      ]));
      trigger.appendChild(icon('chevron', 'picker-caret'));
    }

    function render(query) {
      query = (query || '').trim().toLowerCase();
      filtered = items.filter(function (item) {
        if (!query) return true;
        return (item.label + ' ' + (item.sub || '') + ' ' + (item.keywords || '')).toLowerCase().indexOf(query) >= 0;
      });
      list.textContent = '';
      if (!filtered.length) {
        list.appendChild(el('div', { class: 'picker-empty', text: 'No match. Try a different word or code.' }));
        return;
      }
      var lastGroup = null;
      filtered.slice(0, 300).forEach(function (item, index) {
        if (item.group && item.group !== lastGroup) {
          lastGroup = item.group;
          list.appendChild(el('div', { class: 'picker-group', text: item.group }));
        }
        var row = el('div', {
          class: 'picker-option' + (item.value === value ? ' is-current' : '') + (index === active ? ' is-active' : ''),
          role: 'option', 'aria-selected': item.value === value ? 'true' : 'false',
          dataset: { index: index },
          onclick: function () { choose(item); }
        }, [
          el('span', { class: 'picker-code', text: item.label }),
          item.sub ? el('span', { class: 'picker-sub', text: item.sub }) : null
        ]);
        list.appendChild(row);
      });
    }

    function choose(item) {
      value = item.value;
      paintTrigger();
      hide();
      if (options.onChange) options.onChange(value, item);
    }

    function move(step) {
      active = Math.max(0, Math.min(filtered.length - 1, active + step));
      render(search.value);
      var node = list.querySelector('.picker-option.is-active');
      if (node) node.scrollIntoView({ block: 'nearest' });
    }

    function show() {
      if (popup) return;
      active = Math.max(0, items.indexOf(current()));
      search = el('input', {
        class: 'picker-search', type: 'search', placeholder: options.searchPlaceholder || 'Search',
        'aria-label': options.searchPlaceholder || 'Search',
        oninput: function () { active = 0; render(search.value); },
        onkeydown: function (e) {
          if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
          else if (e.key === 'Enter') { e.preventDefault(); if (filtered[active]) choose(filtered[active]); }
          else if (e.key === 'Escape') { e.preventDefault(); hide(); }
        }
      });
      list = el('div', { class: 'picker-list', role: 'listbox' });
      popup = el('div', { class: 'picker-popup' }, [
        el('div', { class: 'picker-search-wrap' }, [icon('search', 'picker-search-icon'), search]),
        list
      ]);
      document.body.appendChild(popup);
      trigger.setAttribute('aria-expanded', 'true');
      position();
      render('');
      var node = list.querySelector('.picker-option.is-current');
      if (node) node.scrollIntoView({ block: 'center' });
      search.focus({ preventScroll: true });
      setTimeout(function () {
        document.addEventListener('pointerdown', outside, true);
        window.addEventListener('resize', position);
        window.addEventListener('scroll', position, true);
      }, 0);
    }

    function position() {
      if (!popup) return;
      if (window.innerWidth <= 620) { popup.classList.add('picker-sheet'); return; }
      popup.classList.remove('picker-sheet');
      var rect = trigger.getBoundingClientRect();
      var height = Math.min(360, window.innerHeight - rect.bottom - 16);
      var above = height < 200 && rect.top > 240;
      popup.style.width = Math.max(rect.width, 260) + 'px';
      popup.style.left = Math.min(rect.left, window.innerWidth - Math.max(rect.width, 260) - 12) + 'px';
      if (above) {
        popup.style.top = 'auto';
        popup.style.bottom = (window.innerHeight - rect.top + 6) + 'px';
        popup.style.maxHeight = Math.min(360, rect.top - 16) + 'px';
      } else {
        popup.style.bottom = 'auto';
        popup.style.top = (rect.bottom + 6) + 'px';
        popup.style.maxHeight = Math.max(200, height) + 'px';
      }
    }

    function outside(e) {
      if (popup && !popup.contains(e.target) && e.target !== trigger) hide();
    }

    function hide() {
      if (!popup) return;
      document.removeEventListener('pointerdown', outside, true);
      window.removeEventListener('resize', position);
      window.removeEventListener('scroll', position, true);
      if (popup.parentNode) popup.parentNode.removeChild(popup);
      popup = null;
      trigger.setAttribute('aria-expanded', 'false');
    }

    trigger.addEventListener('click', function () { popup ? hide() : show(); });
    paintTrigger();

    return {
      el: trigger,
      get value() { return value; },
      setValue: function (next, silent) {
        value = next;
        paintTrigger();
        if (!silent && options.onChange) options.onChange(value, current());
      },
      setItems: function (next) { items = next; paintTrigger(); if (popup) render(search.value); },
      close: hide
    };
  }

  // --- misc ---------------------------------------------------------------
  function debounce(fn, wait) {
    var t = null;
    return function () {
      var args = arguments, self = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, args); }, wait);
    };
  }

  /* Trim a float to something readable without turning 0.00001 into 0. */
  function formatNumber(value, maxDigits) {
    if (!isFinite(value)) return '—';
    if (value === 0) return '0';
    var abs = Math.abs(value);
    if (abs >= 1e15 || abs < 1e-6) return value.toExponential(6).replace(/e([+-])(\d)$/, 'e$10$2');
    var digits = maxDigits || 10;
    var out = Number(value.toPrecision(digits)).toString();
    if (out.indexOf('e') >= 0) return value.toFixed(Math.min(20, digits));
    return out;
  }

  function groupDigits(text) {
    var parts = String(text).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '\u2009');
    return parts.join('.');
  }

  RT.ui = {
    el: el, icon: icon, toast: toast, copy: copy, dialog: dialog, closeDialog: close,
    picker: picker, debounce: debounce, formatNumber: formatNumber, groupDigits: groupDigits
  };
})();
