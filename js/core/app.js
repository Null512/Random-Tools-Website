/* Boots the page: builds every registered tool into a panel, keeps the panels in the
   order you put them in, and wires up the header, search and settings. */
window.RT = window.RT || {};
(function () {
  'use strict';

  var el = null, icon = null;
  var tools = [];
  var byId = {};
  var grid = null;
  var searchTerm = '';

  function register(tool) {
    tools.push(tool);
    byId[tool.id] = tool;
  }

  // --- ordering -----------------------------------------------------------
  function currentOrder() {
    var config = RT.state.get();
    var known = tools.map(function (t) { return t.id; });
    var order = config.order.filter(function (id) { return known.indexOf(id) >= 0; });
    known.forEach(function (id) { if (order.indexOf(id) < 0) order.push(id); });
    return order;
  }

  function setOrder(order) {
    RT.state.update({ order: order });
  }

  function isHidden(id) { return RT.state.get().hidden.indexOf(id) >= 0; }
  function isFavourite(id) { return RT.state.get().favorites.indexOf(id) >= 0; }

  function toggleIn(listName, id) {
    var config = RT.state.get();
    var list = config[listName].slice();
    var at = list.indexOf(id);
    if (at >= 0) list.splice(at, 1); else list.push(id);
    var patch = {};
    patch[listName] = list;
    RT.state.update(patch);
    return at < 0;
  }

  // --- panels -------------------------------------------------------------
  function buildPanel(tool) {
    var body = el('div', { class: 'tool-body' });
    var star = el('button', {
      class: 'icon-btn star', type: 'button',
      title: 'Pin to favourites', 'aria-label': 'Pin ' + tool.title + ' to favourites',
      onclick: function () {
        var added = toggleIn('favorites', tool.id);
        paintPanelState(panel, tool);
        RT.ui.toast(added ? tool.title + ' pinned.' : tool.title + ' unpinned.');
        applyFilters();
      }
    }, [icon('star')]);

    var hide = el('button', {
      class: 'icon-btn', type: 'button',
      title: 'Hide this tool', 'aria-label': 'Hide ' + tool.title,
      onclick: function () {
        toggleIn('hidden', tool.id);
        render();
        RT.ui.toast(tool.title + ' hidden. Bring it back from Settings.');
      }
    }, [icon('hide')]);

    var grip = el('button', {
      class: 'grip', type: 'button', 'aria-label': 'Move ' + tool.title + '. Use the arrow keys to change its position.',
      title: 'Drag to move, or focus and use the arrow keys'
    }, [icon('grip')]);

    var panel = el('article', {
      class: 'tool', dataset: { id: tool.id }, 'aria-labelledby': 'title-' + tool.id
    }, [
      el('header', { class: 'tool-head' }, [
        grip,
        el('h2', { class: 'tool-title', id: 'title-' + tool.id, text: tool.title }),
        el('div', { class: 'tool-actions' }, [star, hide])
      ]),
      body
    ]);

    var context = {
      el: el,
      icon: icon,
      prefs: RT.state.getPrefs(tool.id),
      savePrefs: function (patch) { RT.state.setPrefs(tool.id, patch); },
      toast: RT.ui.toast,
      copy: RT.ui.copy
    };

    try {
      tool.render(body, context);
    } catch (err) {
      console.error('Tool failed:', tool.id, err);
      body.appendChild(el('p', { class: 'note', text: 'This tool failed to start. Reload the page, and if it keeps happening the browser console has the details.' }));
    }

    paintPanelState(panel, tool);
    enableDrag(panel, grip);
    return panel;
  }

  function paintPanelState(panel, tool) {
    var fav = isFavourite(tool.id);
    panel.classList.toggle('is-favourite', fav);
    var star = panel.querySelector('.star');
    star.classList.toggle('is-on', fav);
    star.setAttribute('aria-pressed', fav ? 'true' : 'false');
    star.title = fav ? 'Unpin from favourites' : 'Pin to favourites';
  }

  function render() {
    var order = currentOrder();
    grid.textContent = '';
    order.forEach(function (id) {
      if (isHidden(id)) return;
      var tool = byId[id];
      if (!tool) return;
      grid.appendChild(buildPanel(tool));
    });
    applyFilters();
    paintEmptyState();
  }

  function applyFilters() {
    var favOnly = RT.state.get().favOnly;
    var term = searchTerm.trim().toLowerCase();
    var shown = 0;
    Array.prototype.forEach.call(grid.children, function (panel) {
      var tool = byId[panel.dataset.id];
      if (!tool) return;
      var matchesSearch = !term ||
        (tool.title + ' ' + (tool.keywords || '')).toLowerCase().indexOf(term) >= 0;
      var matchesFav = !favOnly || isFavourite(tool.id);
      var visible = matchesSearch && matchesFav;
      panel.hidden = !visible;
      if (visible) shown++;
    });
    paintEmptyState(shown);
  }

  function paintEmptyState(shown) {
    var note = document.getElementById('empty');
    if (!note) return;
    if (shown === undefined) {
      shown = Array.prototype.filter.call(grid.children, function (p) { return !p.hidden; }).length;
    }
    note.hidden = shown > 0;
    if (!shown) {
      var favOnly = RT.state.get().favOnly;
      note.textContent = searchTerm
        ? 'No tool matches "' + searchTerm + '".'
        : favOnly ? 'Nothing is pinned yet. Use the star on any tool to pin it here.'
                  : 'Every tool is hidden. Open Settings to bring some back.';
    }
  }

  // --- drag to reorder ----------------------------------------------------
  function visiblePanels() {
    return Array.prototype.filter.call(grid.children, function (p) { return !p.hidden; });
  }

  function moveBy(id, step) {
    var order = currentOrder();
    var visible = visiblePanels().map(function (p) { return p.dataset.id; });
    var at = visible.indexOf(id);
    var target = at + step;
    if (at < 0 || target < 0 || target >= visible.length) return false;
    var from = order.indexOf(id), to = order.indexOf(visible[target]);
    order.splice(from, 1);
    order.splice(to, 0, id);
    setOrder(order);
    render();
    var panel = grid.querySelector('.tool[data-id="' + id + '"]');
    if (panel) {
      panel.querySelector('.grip').focus();
      panel.classList.add('just-moved');
      setTimeout(function () { panel.classList.remove('just-moved'); }, 400);
    }
    return true;
  }

  function enableDrag(panel, grip) {
    var dragging = false, startX = 0, startY = 0, offsetX = 0, offsetY = 0;
    var placeholder = null, pointerId = null, scrollTimer = null, lastPoint = null;

    grip.addEventListener('keydown', function (e) {
      var map = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 };
      if (!(e.key in map)) return;
      e.preventDefault();
      moveBy(panel.dataset.id, map[e.key]);
    });

    grip.addEventListener('pointerdown', function (e) {
      if (e.button != null && e.button !== 0) return;
      pointerId = e.pointerId;
      startX = e.clientX; startY = e.clientY;
      grip.setPointerCapture(pointerId);
      grip.addEventListener('pointermove', onMove);
      grip.addEventListener('pointerup', onUp);
      grip.addEventListener('pointercancel', onUp);
      e.preventDefault();
    });

    function beginDrag() {
      var rect = panel.getBoundingClientRect();
      offsetX = startX - rect.left;
      offsetY = startY - rect.top;
      placeholder = el('div', { class: 'tool-placeholder' });
      placeholder.style.height = rect.height + 'px';
      panel.parentNode.insertBefore(placeholder, panel);
      panel.style.width = rect.width + 'px';
      panel.style.height = rect.height + 'px';
      panel.style.left = rect.left + 'px';
      panel.style.top = rect.top + 'px';
      panel.classList.add('is-dragging');
      document.body.classList.add('is-reordering');
      dragging = true;
    }

    function onMove(e) {
      if (!dragging) {
        if (Math.abs(e.clientX - startX) < 5 && Math.abs(e.clientY - startY) < 5) return;
        beginDrag();
      }
      lastPoint = { x: e.clientX, y: e.clientY };
      panel.style.transform = 'translate(' + (e.clientX - startX) + 'px,' + (e.clientY - startY) + 'px)';
      reposition(e.clientX, e.clientY);
      autoScroll(e.clientY);
    }

    function reposition(x, y) {
      var candidates = visiblePanels().filter(function (p) { return p !== panel; });
      var best = null, bestDistance = Infinity, after = false;
      candidates.forEach(function (p) {
        var r = p.getBoundingClientRect();
        var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        var d = Math.pow(x - cx, 2) + Math.pow(y - cy, 2);
        if (d < bestDistance) {
          bestDistance = d; best = p;
          after = (y > cy + 4) || (Math.abs(y - cy) <= r.height / 2 && x > cx);
        }
      });
      if (!best) return;
      var reference = after ? best.nextSibling : best;
      if (reference === placeholder) return;
      flip(function () { grid.insertBefore(placeholder, reference); });
    }

    /* animate the panels that shift out of the way */
    function flip(mutate) {
      var moving = visiblePanels().filter(function (p) { return p !== panel; });
      var before = moving.map(function (p) { return p.getBoundingClientRect(); });
      mutate();
      moving.forEach(function (p, i) {
        var now = p.getBoundingClientRect();
        var dx = before[i].left - now.left, dy = before[i].top - now.top;
        if (!dx && !dy) return;
        p.style.transition = 'none';
        p.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
        requestAnimationFrame(function () {
          p.style.transition = 'transform .18s ease';
          p.style.transform = '';
          setTimeout(function () { p.style.transition = ''; }, 200);
        });
      });
    }

    function autoScroll(y) {
      clearTimeout(scrollTimer);
      var margin = 90, speed = 0;
      if (y < margin) speed = -Math.ceil((margin - y) / 6);
      else if (y > window.innerHeight - margin) speed = Math.ceil((y - (window.innerHeight - margin)) / 6);
      if (!speed) return;
      window.scrollBy(0, speed);
      scrollTimer = setTimeout(function () { if (dragging && lastPoint) autoScroll(lastPoint.y); }, 16);
    }

    function onUp() {
      grip.removeEventListener('pointermove', onMove);
      grip.removeEventListener('pointerup', onUp);
      grip.removeEventListener('pointercancel', onUp);
      clearTimeout(scrollTimer);
      try { grip.releasePointerCapture(pointerId); } catch (e) { /* ignore */ }
      if (!dragging) return;
      dragging = false;
      panel.classList.remove('is-dragging');
      document.body.classList.remove('is-reordering');
      panel.style.cssText = '';
      grid.insertBefore(panel, placeholder);
      if (placeholder.parentNode) placeholder.parentNode.removeChild(placeholder);
      placeholder = null;

      var visible = visiblePanels().map(function (p) { return p.dataset.id; });
      var order = currentOrder().filter(function (id) { return visible.indexOf(id) < 0; });
      // rebuild: keep hidden tools where they were, drop the visible ones in their new order
      var merged = [], vi = 0;
      currentOrder().forEach(function (id) {
        if (visible.indexOf(id) >= 0) merged.push(visible[vi++]);
        else merged.push(id);
      });
      setOrder(merged.concat(order.filter(function (id) { return merged.indexOf(id) < 0; })));
    }
  }

  // --- appearance ---------------------------------------------------------
  function applyAppearance() {
    var config = RT.state.get();
    var root = document.documentElement;
    var dark = config.theme === 'dark' ||
      (config.theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    root.dataset.theme = dark ? 'dark' : 'light';
    root.dataset.accent = config.accent || 'jade';
    root.dataset.contrast = config.contrast;
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', dark ? '#0f1216' : '#f2f3f5');
    var toggle = document.getElementById('theme-toggle');
    if (toggle) {
      toggle.textContent = '';
      toggle.appendChild(icon(dark ? 'sun' : 'moon'));
      toggle.title = dark ? 'Switch to light' : 'Switch to dark';
      toggle.setAttribute('aria-label', toggle.title);
    }
  }

  // --- settings dialog ----------------------------------------------------
  var ACCENTS = [
    { id: 'jade', name: 'Jade' },
    { id: 'cobalt', name: 'Cobalt' },
    { id: 'amber', name: 'Amber' },
    { id: 'violet', name: 'Violet' },
    { id: 'rose', name: 'Rose' },
    { id: 'slate', name: 'Slate' }
  ];

  function openSettings() {
    RT.ui.dialog({
      title: 'Settings',
      size: 'wide',
      onClose: function () { codeField = null; },
      render: function (body, close) {
        body.appendChild(appearanceSection());
        body.appendChild(toolsSection());
        body.appendChild(codeSection(close));
      }
    });
  }

  function segmented(options, value, onPick) {
    var wrap = el('div', { class: 'segmented', role: 'group' });
    options.forEach(function (option) {
      wrap.appendChild(el('button', {
        class: 'segment' + (option.id === value ? ' is-on' : ''), type: 'button',
        'aria-pressed': option.id === value ? 'true' : 'false',
        text: option.name,
        onclick: function () {
          Array.prototype.forEach.call(wrap.children, function (b) {
            b.classList.remove('is-on'); b.setAttribute('aria-pressed', 'false');
          });
          this.classList.add('is-on');
          this.setAttribute('aria-pressed', 'true');
          onPick(option.id);
        }
      }));
    });
    return wrap;
  }

  function appearanceSection() {
    var config = RT.state.get();
    var swatches = el('div', { class: 'swatches' });
    ACCENTS.forEach(function (accent) {
      swatches.appendChild(el('button', {
        class: 'swatch' + (config.accent === accent.id ? ' is-on' : ''),
        type: 'button', dataset: { accent: accent.id },
        title: accent.name, 'aria-label': 'Accent colour: ' + accent.name,
        'aria-pressed': config.accent === accent.id ? 'true' : 'false',
        onclick: function () {
          RT.state.update({ accent: accent.id });
          applyAppearance();
          Array.prototype.forEach.call(swatches.children, function (b) {
            b.classList.toggle('is-on', b.dataset.accent === accent.id);
            b.setAttribute('aria-pressed', b.dataset.accent === accent.id ? 'true' : 'false');
          });
        }
      }));
    });

    return el('section', { class: 'settings-section' }, [
      el('h3', { text: 'Appearance' }),
      el('div', { class: 'field-row' }, [
        el('span', { class: 'field-label', text: 'Theme' }),
        segmented([{ id: 'auto', name: 'System' }, { id: 'light', name: 'Light' }, { id: 'dark', name: 'Dark' }],
          config.theme, function (v) { RT.state.update({ theme: v }); applyAppearance(); })
      ]),
      el('div', { class: 'field-row' }, [
        el('span', { class: 'field-label', text: 'Accent' }),
        swatches
      ]),
      el('div', { class: 'field-row' }, [
        el('span', { class: 'field-label', text: 'Contrast' }),
        segmented([{ id: 'normal', name: 'Normal' }, { id: 'high', name: 'High' }],
          config.contrast, function (v) { RT.state.update({ contrast: v }); applyAppearance(); })
      ])
    ]);
  }

  function toolsSection() {
    var list = el('ul', { class: 'tool-list' });

    function paint() {
      list.textContent = '';
      currentOrder().forEach(function (id, index) {
        var tool = byId[id];
        if (!tool) return;
        var hidden = isHidden(id);
        list.appendChild(el('li', { class: 'tool-list-row' + (hidden ? ' is-hidden' : '') }, [
          el('button', {
            class: 'icon-btn', type: 'button', title: 'Move up', 'aria-label': 'Move ' + tool.title + ' up',
            disabled: index === 0,
            onclick: function () { reorderInSettings(id, -1); paint(); }
          }, [icon('up')]),
          el('button', {
            class: 'icon-btn', type: 'button', title: 'Move down', 'aria-label': 'Move ' + tool.title + ' down',
            disabled: index === currentOrder().length - 1,
            onclick: function () { reorderInSettings(id, 1); paint(); }
          }, [icon('down')]),
          el('span', { class: 'tool-list-name', text: tool.title }),
          el('button', {
            class: 'text-btn', type: 'button',
            text: hidden ? 'Show' : 'Hide',
            onclick: function () { toggleIn('hidden', id); render(); paint(); }
          })
        ]));
      });
    }

    function reorderInSettings(id, step) {
      var order = currentOrder();
      var at = order.indexOf(id), to = at + step;
      if (to < 0 || to >= order.length) return;
      order.splice(to, 0, order.splice(at, 1)[0]);
      setOrder(order);
      render();
    }

    paint();
    return el('section', { class: 'settings-section' }, [
      el('h3', { text: 'Tools' }),
      el('p', { class: 'note', text: 'On the page you can also drag a tool by its handle, or focus the handle and use the arrow keys.' }),
      list
    ]);
  }

  var codeField = null;

  function refreshCodeField() {
    if (!codeField) return;
    RT.state.toCode().then(function (code) { if (codeField) codeField.value = code; });
  }

  function codeSection(close) {
    var field = el('textarea', {
      class: 'code-field', rows: 3, spellcheck: 'false', 'aria-label': 'Settings code',
      placeholder: 'Paste a settings code here'
    });
    var status = el('p', { class: 'note', text: 'Everything above — layout, pinned tools, appearance and each tool\'s own settings — is packed into this code. It is saved in this browser automatically; copy it to move your setup to another machine.' });

    codeField = field;
    refreshCodeField();

    var actions = el('div', { class: 'button-row' }, [
      el('button', {
        class: 'btn', type: 'button', text: 'Copy code',
        onclick: function () {
          // regenerate first, in case something changed while this was open
          RT.state.toCode().then(function (code) {
            field.value = code;
            RT.ui.copy(code, 'Settings code copied.');
          });
        }
      }),
      el('button', {
        class: 'btn btn-quiet', type: 'button', text: 'Apply pasted code',
        onclick: function () {
          RT.state.fromCode(field.value).then(function (next) {
            RT.state.apply(next);
            applyAppearance();
            render();
            close();
            RT.ui.toast('Settings applied.');
          }).catch(function (err) {
            status.textContent = err.message;
            status.classList.add('is-error');
          });
        }
      }),
      el('button', {
        class: 'btn btn-quiet', type: 'button', text: 'Copy as link',
        onclick: function () {
          RT.state.toCode().then(function (code) {
            field.value = code;
            var url = location.origin + location.pathname + '#c=' + encodeURIComponent(code);
            RT.ui.copy(url, 'Link copied — opening it applies these settings.');
          });
        }
      }),
      el('button', {
        class: 'btn btn-danger', type: 'button', text: 'Reset everything',
        onclick: function () {
          if (!confirm('Reset layout, pinned tools and appearance to the defaults?')) return;
          RT.state.reset();
          applyAppearance();
          render();
          close();
          RT.ui.toast('Back to defaults.');
        }
      })
    ]);

    return el('section', { class: 'settings-section' }, [
      el('h3', { text: 'Your setup, as a code' }),
      status,
      field,
      actions
    ]);
  }

  // --- header -------------------------------------------------------------
  function wireHeader() {
    var search = document.getElementById('search');
    search.addEventListener('input', function () {
      searchTerm = search.value;
      applyFilters();
    });
    search.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { search.value = ''; searchTerm = ''; applyFilters(); }
    });

    document.getElementById('theme-toggle').addEventListener('click', function () {
      var config = RT.state.get();
      var dark = document.documentElement.dataset.theme === 'dark';
      RT.state.update({ theme: dark ? 'light' : 'dark' });
      applyAppearance();
    });

    var favButton = document.getElementById('fav-toggle');
    function paintFav() {
      var on = RT.state.get().favOnly;
      favButton.classList.toggle('is-on', on);
      favButton.setAttribute('aria-pressed', on ? 'true' : 'false');
      favButton.title = on ? 'Show every tool' : 'Show pinned tools only';
    }
    favButton.appendChild(icon('star'));
    favButton.addEventListener('click', function () {
      RT.state.update({ favOnly: !RT.state.get().favOnly });
      paintFav();
      applyFilters();
    });
    paintFav();

    document.getElementById('settings-toggle').addEventListener('click', openSettings);

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () {
      if (RT.state.get().theme === 'auto') applyAppearance();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === '/' && document.activeElement === document.body) {
        e.preventDefault();
        search.focus();
      }
    });
  }

  // --- boot ---------------------------------------------------------------
  function boot() {
    el = RT.ui.el;
    icon = RT.ui.icon;
    grid = document.getElementById('grid');

    var hash = location.hash.match(/[#&]c=([^&]+)/);
    var start = Promise.resolve();
    if (hash) {
      start = RT.state.fromCode(decodeURIComponent(hash[1])).then(function (next) {
        RT.state.apply(next);
        history.replaceState(null, '', location.pathname + location.search);
        setTimeout(function () { RT.ui.toast('Settings loaded from the link.'); }, 300);
      }).catch(function (err) {
        setTimeout(function () { RT.ui.toast(err.message, 'error'); }, 300);
      });
    }

    start.then(function () {
      applyAppearance();
      RT.state.onChange(refreshCodeField);
      wireHeader();
      render();
      document.body.classList.remove('booting');
    });
  }

  RT.register = register;
  RT.app = { boot: boot, render: render, openSettings: openSettings, applyAppearance: applyAppearance };
})();
