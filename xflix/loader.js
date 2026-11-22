/*
 * XFlix loader.
 * Paste this AFTER your window.XFLIX_CONFIG block (see config.example.js) into:
 *   Sites > Client Portal > Settings > Branding > Advanced > Custom JavaScript
 *
 * It loads a fixed, tested release of XFlix from the public repository through jsDelivr.
 * To update XFlix, replace the commit id below with a newer tested one. To switch XFlix off,
 * empty the Custom JavaScript box (GHL's normal pages return straight away).
 */
(function () {
  var RELEASE = 'd2b1e7ce6dde5fcc0ac71142fbfc9398ba796f79'; // XFlix 1.1.0
  var s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/gh/CriticalCareNow/scimple-web-assets@' + RELEASE + '/xflix/xflix.js';
  s.async = true;
  (document.head || document.documentElement).appendChild(s);
})();
