/*
 * XFlix settings. Paste this block into Custom JavaScript BEFORE the loader (loader.js).
 * Everything here is optional. Delete the lines you do not need.
 *
 * Keep this block in GHL, not in the public repository: the saved catalog lists your course content.
 */
window.XFLIX_CONFIG = {
  brandName: 'XFlix',

  // How a course title is split into a title and a season (year). This wider version also accepts
  // "ResusX:2026 (Enduring)", "Keynotable (2025)", "ResusX 2019" and "ResusX - 2024".
  // A title like "ResusX:2026 (Enduring) - No CME" has no season and stays its own tile.
  seasonPattern: '^(.*?)\\s*[:\\-\\u2013\\u2014]?\\s*\\(?((?:19|20)\\d{2})\\)?(?:\\s*\\((?:Enduring|Replay)\\))?\\s*$',

  // Optional logo image (PNG or SVG with a transparent background). Without it XFlix shows a text logo.
  // logoUrl: 'https://cdn.jsdelivr.net/gh/CriticalCareNow/scimple-web-assets@RELEASE/xflix/assets/xflix-logo.png',

  // "Claim CME" buttons. Keys are the exact course title, then the exact folder title.
  // Use '*' for a button on the course banner instead of on one folder.
  claimCme: {
    'ResusX:2026': {
      'Day 1 · Airway & Breathing': 'https://example.com/claim-resusx-2026-day-1',
      '*': 'https://example.com/claim-resusx-2026'
    }
  },

  // Optional iPhone "Add to Home Screen" setup (icon: a 180x180 PNG on a public https address).
  // homeScreen: { title: 'XFlix', icon: 'https://example.com/xflix-icon-180.png' },

  // Optional wide banner image per title (use the title name without the year) or per exact course title.
  heroImages: {
    // 'ResusX': 'https://example.com/resusx-banner.jpg'
  }

  // Saved catalog (level 2 fallback). Leave this out until you have exported one:
  //   1. Open the portal as a test learner with ?xflix=export on the end of the address.
  //   2. Click "Export catalog" in the XFlix top bar, then Copy.
  //   3. Paste the result here as:  , catalog: { ...pasted... }
  // catalog: null
};
