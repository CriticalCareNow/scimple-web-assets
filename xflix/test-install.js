/*
 * XFlix test install (TEST sub-account only).
 * This is the settings block plus the loader in one file, so it can be pasted in one go.
 * No Claim CME links yet: those are added later with the real links.
 */
window.XFLIX_CONFIG = {
  brandName: 'XFlix'
};

(function () {
  var RELEASE = 'd50f7f287cd2d8cac52b56a02d477af9fcff41e8'; // XFlix 1.0.0
  var s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/gh/CriticalCareNow/scimple-web-assets@' + RELEASE + '/xflix/xflix.js';
  s.async = true;
  (document.head || document.documentElement).appendChild(s);
})();
