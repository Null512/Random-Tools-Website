/* Countdown timer. Keeps time against the clock rather than counting interval ticks,
   so it stays accurate when the tab is in the background. */
(function () {
  'use strict';

  function beep() {
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      var audio = new Ctx();
      [0, 0.35, 0.7].forEach(function (offset) {
        var osc = audio.createOscillator(), gain = audio.createGain();
        osc.type = 'sine';
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.001, audio.currentTime + offset);
        gain.gain.exponentialRampToValueAtTime(0.25, audio.currentTime + offset + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + offset + 0.28);
        osc.connect(gain).connect(audio.destination);
        osc.start(audio.currentTime + offset);
        osc.stop(audio.currentTime + offset + 0.3);
      });
      setTimeout(function () { audio.close(); }, 1500);
    } catch (e) { /* no audio, the toast still fires */ }
  }

  function format(ms) {
    var total = Math.max(0, Math.ceil(ms / 1000));
    var h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
    var pad = function (n) { return String(n).padStart(2, '0'); };
    return (h ? h + ':' + pad(m) : m) + ':' + pad(s);
  }

  RT.register({
    id: 'timer',
    title: 'Timer',
    keywords: 'timer countdown alarm pomodoro minutes',

    render: function (root, ctx) {
      var el = ctx.el;
      var prefs = Object.assign({ seconds: 300 }, ctx.prefs);
      var duration = prefs.seconds * 1000;
      var endsAt = null, remaining = duration, raf = null;

      var display = el('div', { class: 'readout', role: 'timer', 'aria-live': 'off' });
      var startButton = el('button', { class: 'btn btn-wide', type: 'button', text: 'Start', onclick: toggle });

      var minutes = el('input', {
        class: 'input input-number', type: 'number', min: 0, max: 999, value: Math.floor(prefs.seconds / 60),
        'aria-label': 'Minutes', oninput: fromInputs
      });
      var secondsInput = el('input', {
        class: 'input input-number', type: 'number', min: 0, max: 59, value: prefs.seconds % 60,
        'aria-label': 'Seconds', oninput: fromInputs
      });

      function fromInputs() {
        var m = Math.max(0, parseInt(minutes.value, 10) || 0);
        var s = Math.max(0, Math.min(59, parseInt(secondsInput.value, 10) || 0));
        duration = (m * 60 + s) * 1000;
        ctx.savePrefs({ seconds: m * 60 + s });
        if (!endsAt) { remaining = duration; paint(); }
      }

      function paint() {
        display.textContent = format(endsAt ? endsAt - Date.now() : remaining);
        display.classList.toggle('is-running', !!endsAt);
      }

      function frame() {
        if (!endsAt) return;
        var left = endsAt - Date.now();
        if (left <= 0) {
          endsAt = null;
          remaining = duration;
          paint();
          startButton.textContent = 'Start';
          display.classList.add('is-done');
          setTimeout(function () { display.classList.remove('is-done'); }, 3000);
          beep();
          ctx.toast('Timer finished.');
          return;
        }
        paint();
        raf = setTimeout(frame, 200);
      }

      function toggle() {
        if (endsAt) {
          remaining = endsAt - Date.now();
          endsAt = null;
          clearTimeout(raf);
          startButton.textContent = 'Resume';
          paint();
          return;
        }
        if (remaining <= 0) remaining = duration;
        if (remaining <= 0) { ctx.toast('Set a length first.', 'error'); return; }
        endsAt = Date.now() + remaining;
        startButton.textContent = 'Pause';
        frame();
      }

      function reset() {
        endsAt = null;
        clearTimeout(raf);
        remaining = duration;
        startButton.textContent = 'Start';
        paint();
      }

      var presets = el('div', { class: 'chip-row' }, [1, 3, 5, 10, 25, 60].map(function (m) {
        return el('button', {
          class: 'chip', type: 'button', text: m + 'm',
          onclick: function () {
            minutes.value = m;
            secondsInput.value = 0;
            fromInputs();
            reset();
          }
        });
      }));

      root.appendChild(el('div', { class: 'field-pair' }, [
        el('label', { class: 'field-stack' }, [el('span', { class: 'field-label', text: 'Minutes' }), minutes]),
        el('label', { class: 'field-stack' }, [el('span', { class: 'field-label', text: 'Seconds' }), secondsInput])
      ]));
      root.appendChild(presets);
      root.appendChild(display);
      root.appendChild(el('div', { class: 'button-row' }, [
        startButton,
        el('button', { class: 'btn btn-quiet', type: 'button', text: 'Reset', onclick: reset })
      ]));
      paint();
    }
  });
})();
