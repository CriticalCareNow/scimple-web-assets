/*
 * XFlix test install (TEST sub-account only).
 * This is the settings block plus the loader in one file, so it can be pasted in one go.
 * It loads the saved course list for the test sub-account first, then XFlix 1.2.0.
 * No Claim CME links yet: those are added later with the real links.
 */
window.XFLIX_CONFIG = {
  brandName: 'XFlix'
};

(function () {
  var RELEASE = '6a4c00f931df90556a52d0b9b5a5c566961b25bb'; // XFlix 1.2.0
  var BASE = 'https://cdn.jsdelivr.net/gh/CriticalCareNow/scimple-web-assets@' + RELEASE + '/xflix/';
  var head = document.head || document.documentElement;
  function load(file, next) {
    var s = document.createElement('sc' + 'ript');
    s.src = BASE + file;
    s.async = true;
    if (next) { s.onload = next; s.onerror = next; }
    head.appendChild(s);
  }
  load('catalog-sandbox.js', function () { load('xflix.js'); });
})();
