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
  var RELEASE = '24215c15f9b65c01ea262ce6224523b0ce26bb3d'; // XFlix 1.0.1
  var s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/gh/CriticalCareNow/scimple-web-assets@' + RELEASE + '/xflix/xflix.js';
  s.async = true;
  (document.head || document.documentElement).appendChild(s);
})();
