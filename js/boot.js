/* Last script on the page: every tool has registered itself by now, so start. */
(function () {
  'use strict';
  function start() { RT.app.boot(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
