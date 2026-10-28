/*! XFlix 1.0.0
 * Netflix-style course browsing for the GoHighLevel Client Portal.
 *
 * What it does
 *   - On the portal's course list page it shows a full-screen XFlix library instead (courses grouped
 *     into titles and seasons, folders as rows, lectures as tiles with watched / in-progress / locked
 *     states). Lectures open in GHL's own lesson page, so GHL still plays the video and tracks completion.
 *   - It asks the portal's own data service for the logged-in learner's courses (read-only GET requests).
 *
 * Safety
 *   - Read-only: only GET requests, only to the portal's data service, only as the logged-in learner.
 *   - The learner's login headers stay in memory. They are never shown, stored or sent anywhere else.
 *   - If anything fails it steps aside and the learner sees GHL's normal pages:
 *       level 1  live data from the portal
 *       level 2  the saved catalog in XFLIX_CONFIG.catalog (no personal progress or locks)
 *       level 3  nothing (GHL's normal pages)
 *   - Kill switch: add ?xflix=off to any portal address (lasts for that browser tab session).
 *
 * Configure with window.XFLIX_CONFIG before this script loads. See INSTALL.md.
 */
(function () {
  'use strict';
  if (window.__xflix) return;

  var VERSION = '1.0.0';

  var DEFAULTS = {
    enabled: true,
    brandName: 'XFlix',
    logoUrl: '',
    homeRoutes: ['/courses'],
    accountUrl: '/dashboard',
    accountLabel: 'Account',
    seasonPattern: '^(.*?)\\s*[:\\-\\u2013\\u2014]?\\s*((?:19|20)\\d{2})\\s*$',
    waitForAuthMs: 8000,
    requestTimeoutMs: 20000,
    cacheMs: 30000,
    concurrency: 4,
    hideStatusPattern: '(draft|hidden|unpublish|private|archiv)',
    fonts: true,
    claimCme: {},
    heroImages: {},
    catalog: null,
    colors: {},
    routes: {
      course: '/courses/products/{courseId}',
      lesson: '/courses/products/{courseId}/modules/{moduleId}/lessons/{lessonId}'
    },
    dataBase: 'https://services.leadconnectorhq.com/clientportal-middleware',
    debug: false
  };

  var user = window.XFLIX_CONFIG || {};
  var cfg = {};
  Object.keys(DEFAULTS).forEach(function (k) { cfg[k] = DEFAULTS[k]; });
  Object.keys(user).forEach(function (k) {
    cfg[k] = (k === 'routes' || k === 'colors') ? Object.assign({}, DEFAULTS[k], user[k]) : user[k];
  });

  /* ------------------------------------------------------------------ switches */

  function flag(name) { try { return sessionStorage.getItem(name) === '1'; } catch (e) { return false; } }
  function setFlag(name, on) {
    try { if (on) sessionStorage.setItem(name, '1'); else sessionStorage.removeItem(name); } catch (e) { /* ignore */ }
  }
  var qp = /[?&]xflix=(off|on|export)\b/.exec(location.search);
  if (qp) {
    if (qp[1] === 'off') setFlag('xflix-off', true);
    if (qp[1] === 'on') setFlag('xflix-off', false);
    if (qp[1] === 'export') setFlag('xflix-export', true);
  }
  if (!cfg.enabled || flag('xflix-off')) {
    window.__xflix = { version: VERSION, disabled: true };
    return;
  }

  function log() {
    if (cfg.debug && window.console) console.log.apply(console, ['[xflix]'].concat([].slice.call(arguments)));
  }

  /* ------------------------------------------------------------------ network (read-only) */

  var net = { headers: null, creds: null, base: cfg.dataBase, loc: null };
  var DATA_HOST = /^https:\/\/[a-z0-9.-]*leadconnectorhq\.com\/clientportal-middleware\//i;
  var SKIP_HEADERS = /^(content-length|host|accept-encoding|connection|origin|referer|user-agent)$/i;
  var origFetch = window.fetch;

  function headersToObject(h) {
    var out = {};
    if (!h) return out;
    if (typeof Headers !== 'undefined' && h instanceof Headers) {
      h.forEach(function (v, k) { out[k] = v; });
    } else if (Array.isArray(h)) {
      h.forEach(function (pair) { out[pair[0]] = pair[1]; });
    } else if (typeof h === 'object') {
      Object.keys(h).forEach(function (k) { out[k] = h[k]; });
    }
    return out;
  }

  function learn(url, hdrs, creds) {
    var u = String(url);
    if (!DATA_HOST.test(u)) return;
    var l = u.match(/\/locations\/([A-Za-z0-9]+)\//);
    if (l) net.loc = l[1];
    var clean = {};
    Object.keys(hdrs || {}).forEach(function (k) { if (!SKIP_HEADERS.test(k)) clean[k] = hdrs[k]; });
    if (Object.keys(clean).length) {
      net.headers = clean;
      net.creds = creds || null;
      var m = u.match(/^(https:\/\/[a-z0-9.-]*leadconnectorhq\.com\/clientportal-middleware)\//i);
      if (m && /^https:\/\/services\./i.test(m[1])) net.base = m[1];
    }
  }

  if (origFetch) {
    window.fetch = function (input, init) {
      try {
        var url = typeof input === 'string' ? input : (input && input.url) || '';
        learn(url, headersToObject((init && init.headers) || (input && input.headers)),
          (init && init.credentials) || (input && input.credentials) || null);
      } catch (e) { /* never break the portal */ }
      return origFetch.apply(this, arguments);
    };
  }
  if (window.XMLHttpRequest) {
    var xOpen = XMLHttpRequest.prototype.open;
    var xSet = XMLHttpRequest.prototype.setRequestHeader;
    var xSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function (method, url) {
      this.__xf = { url: url, h: {} };
      return xOpen.apply(this, arguments);
    };
    XMLHttpRequest.prototype.setRequestHeader = function (k, v) {
      if (this.__xf) this.__xf.h[k] = v;
      return xSet.apply(this, arguments);
    };
    XMLHttpRequest.prototype.send = function () {
      try { if (this.__xf) learn(this.__xf.url, this.__xf.h, this.withCredentials ? 'include' : null); } catch (e) { /* ignore */ }
      return xSend.apply(this, arguments);
    };
  }

  function ready() { return !!(net.headers && net.loc && origFetch); }

  function waitForAuth() {
    return new Promise(function (resolve, reject) {
      var t0 = Date.now();
      (function poll() {
        if (ready()) return resolve();
        if (Date.now() - t0 > cfg.waitForAuthMs) return reject(new Error('no-auth'));
        setTimeout(poll, 100);
      })();
    });
  }

  function api(path) {
    if (!ready()) return Promise.reject(new Error('not-ready'));
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, cfg.requestTimeoutMs) : null;
    var init = { method: 'GET', headers: net.headers };
    if (net.creds) init.credentials = net.creds;
    if (ctrl) init.signal = ctrl.signal;
    return origFetch.call(window, net.base + path, init).then(function (res) {
      if (timer) clearTimeout(timer);
      if (!res.ok) { var e = new Error('http-' + res.status); e.status = res.status; throw e; }
      return res.json();
    }, function (err) {
      if (timer) clearTimeout(timer);
      throw err;
    });
  }

  function pool(items, worker) {
    var results = new Array(items.length);
    var next = 0;
    function run() {
      if (next >= items.length) return Promise.resolve();
      var i = next++;
      return Promise.resolve(worker(items[i], i)).then(function (r) { results[i] = r; }).then(run);
    }
    var starters = [];
    for (var n = 0; n < Math.min(cfg.concurrency, items.length); n++) starters.push(run());
    return Promise.all(starters).then(function () { return results; });
  }

  /* ------------------------------------------------------------------ data model */

  function asArray(v, keys) {
    if (Array.isArray(v)) return v;
    if (v && typeof v === 'object') {
      for (var i = 0; i < keys.length; i++) if (Array.isArray(v[keys[i]])) return v[keys[i]];
    }
    return [];
  }

  var hideRe = new RegExp(cfg.hideStatusPattern, 'i');
  function isVisible(item) {
    if (!item) return false;
    if (item.deletedAt) return false;
    return !(typeof item.visibility === 'string' && hideRe.test(item.visibility));
  }

  function safeUrl(u) { return typeof u === 'string' && /^https?:\/\//i.test(u) ? u : ''; }
  function enc(v) { return encodeURIComponent(String(v)); }

  function courseUrl(courseId) { return cfg.routes.course.replace('{courseId}', enc(courseId)); }
  function lessonUrl(courseId, moduleId, lessonId) {
    if (!moduleId || !lessonId) return courseUrl(courseId);
    return cfg.routes.lesson.replace('{courseId}', enc(courseId)).replace('{moduleId}', enc(moduleId)).replace('{lessonId}', enc(lessonId));
  }

  function normCourse(c) {
    return {
      id: c.id,
      title: String(c.title || 'Untitled'),
      description: String(c.description || ''),
      poster: safeUrl(c.posterImage || c.poster),
      started: !!c.courseStarted,
      order: typeof c.libraryOrder === 'number' ? c.libraryOrder : 0
    };
  }

  function groupTitles(courses) {
    var re;
    try { re = new RegExp(cfg.seasonPattern); } catch (e) { re = null; }
    var list = courses.filter(function (c) { return c && c.id; }).map(normCourse);
    list.sort(function (a, b) { return a.order - b.order; });
    var map = {};
    var out = [];
    list.forEach(function (c) {
      var m = re ? re.exec(c.title.trim()) : null;
      var name = m && m[1] && m[1].trim() ? m[1].trim() : c.title;
      var label = m && m[1] && m[1].trim() ? m[2] : null;
      var key = name.toLowerCase();
      if (!map[key]) { map[key] = { key: key, name: name, seasons: [] }; out.push(map[key]); }
      c.label = label;
      map[key].seasons.push(c);
    });
    out.forEach(function (t) {
      t.seasons.sort(function (a, b) {
        if (a.label && b.label) return Number(b.label) - Number(a.label);
        return a.label ? -1 : (b.label ? 1 : 0);
      });
    });
    return out;
  }

  function completedSet(res) {
    var set = {};
    var list = res && (res.completedLessons || res.completed || res.lessons);
    (Array.isArray(list) ? list : []).forEach(function (x) {
      if (typeof x === 'string') { set[x] = 1; return; }
      if (!x) return;
      var id = x.lessonId || x.postId || x.post_id || x.id;
      if (id) set[id] = 1;
    });
    return set;
  }

  function loadLive(course) {
    var L = '/courses/learners/locations/' + net.loc + '/courses/' + enc(course.id);
    return Promise.all([
      api(L + '/modules'),
      api(L + '/lessons/completed').catch(function () { return null; }),
      api(L + '/unlocked-modules').catch(function () { return null; }),
      api(L + '/lessons/sequence?courseId=' + enc(course.id)).catch(function () { return null; })
    ]).then(function (r) {
      var modules = asArray(r[0], ['modules', 'categories']).filter(isVisible);
      modules.sort(function (a, b) { return (a.sequenceNo || 0) - (b.sequenceNo || 0); });
      return pool(modules, function (m) {
        return api(L + '/modules/' + enc(m.id) + '/lessons').then(function (res) {
          return asArray(res, ['lessons', 'posts']).filter(isVisible);
        }).catch(function () { return null; });
      }).then(function (lessonLists) {
        return buildDetail(course, modules, lessonLists, completedSet(r[1]), r[2] || {}, r[3] || {}, true);
      });
    });
  }

  function loadCatalog(course) {
    var entry = null;
    ((cfg.catalog && cfg.catalog.courses) || []).forEach(function (c) { if (String(c.id) === String(course.id)) entry = c; });
    var modules = ((entry && entry.modules) || []).map(function (m, i) { return { id: m.id, title: m.title, sequenceNo: i }; });
    var lists = ((entry && entry.modules) || []).map(function (m) {
      return (m.lessons || []).map(function (l, i) {
        return { id: l.id, title: l.title, sequenceNo: i, posterImage: l.poster, asset_urls: { meta: { durationInSeconds: l.duration || 0 } } };
      });
    });
    return Promise.resolve(buildDetail(course, modules, lists, {}, {}, {}, false));
  }

  function buildDetail(course, modules, lessonLists, done, unlocked, seq, personal) {
    var cats = unlocked.categoryUnlockedMap || {};
    var drips = unlocked.dripCategoryUnlockedMap || {};
    var posts = unlocked.postUnlockedMap || {};
    var availAt = unlocked.dripCategoryAvailableAtMap || {};
    var total = 0;
    var doneCount = 0;
    var mods = [];
    modules.forEach(function (m, mi) {
      var raw = lessonLists[mi];
      var failed = raw === null;
      var items = (raw || []).slice().sort(function (a, b) { return (a.sequenceNo || 0) - (b.sequenceNo || 0); });
      var catLocked = personal && ((cats[m.id] && cats[m.id].isUnlocked === false) ||
        (drips[m.id] === false || (drips[m.id] && drips[m.id].isUnlocked === false)));
      var lessons = items.map(function (l, li) {
        var meta = (l.asset_urls && l.asset_urls.meta) || {};
        var isDone = !!done[l.id];
        var locked = !!catLocked || (personal && posts[l.id] && posts[l.id].isUnlocked === false);
        total += 1;
        if (isDone) doneCount += 1;
        return {
          id: l.id,
          moduleId: m.id,
          title: String(l.title || 'Lecture ' + (li + 1)),
          n: li + 1,
          poster: safeUrl(l.posterImage || (l.asset_urls && l.asset_urls.thumbnailUrl)),
          seconds: Number(meta.durationInSeconds) || 0,
          state: isDone ? 'done' : (l.started ? 'started' : 'new'),
          locked: !!locked,
          url: lessonUrl(course.id, m.id, l.id)
        };
      });
      mods.push({
        id: m.id,
        title: String(m.title || 'Folder ' + (mi + 1)),
        locked: !!catLocked,
        availableAt: availAt[m.id] || null,
        failed: failed,
        lessons: lessons,
        doneCount: lessons.filter(function (x) { return x.state === 'done'; }).length,
        claim: claimUrl(course.title, m.title)
      });
    });
    return {
      course: course,
      modules: mods,
      total: total,
      doneCount: doneCount,
      personal: personal,
      resume: pickResume(course, mods, seq, personal),
      claim: claimUrl(course.title, '*')
    };
  }

  function pickResume(course, mods, seq, personal) {
    var flat = [];
    mods.forEach(function (m) { m.lessons.forEach(function (l) { if (!m.locked && !l.locked) flat.push(l); }); });
    if (!flat.length) return null;
    if (!personal) return { lesson: flat[0], label: 'Play' };
    var anyProgress = flat.some(function (l) { return l.state !== 'new'; });
    var allDone = flat.every(function (l) { return l.state === 'done'; });
    var last = null;
    if (seq && seq.lastLessonId) flat.forEach(function (l) { if (l.id === seq.lastLessonId) last = l; });
    if (allDone) return { lesson: flat[0], label: 'Watch again' };
    if (last && last.state !== 'done') return { lesson: last, label: 'Resume' };
    var next = null;
    flat.forEach(function (l) { if (!next && l.state !== 'done') next = l; });
    return { lesson: next || flat[0], label: anyProgress ? 'Resume' : 'Play' };
  }

  function claimUrl(courseTitle, moduleTitle) {
    var map = cfg.claimCme || {};
    var want = String(courseTitle).toLowerCase();
    var out = '';
    Object.keys(map).forEach(function (ck) {
      if (ck.toLowerCase() !== want) return;
      var inner = map[ck] || {};
      Object.keys(inner).forEach(function (mk) { if (mk.toLowerCase() === String(moduleTitle).toLowerCase()) out = safeUrl(inner[mk]); });
    });
    return out;
  }

  /* ------------------------------------------------------------------ state */

  var state = {
    status: 'idle',          // idle | loading | ready | failed
    mode: 'live',            // live | catalog
    titles: [],
    screen: 'home',          // home | title
    titleKey: null,
    courseId: null,
    details: {},             // courseId -> { ts, promise, value, error }
    home: { items: null },   // continue-watching data
    ts: 0,
    bootId: 0,
    giveUpUntil: 0,
    open: false
  };

  function findTitle(key) { var r = null; state.titles.forEach(function (t) { if (t.key === key) r = t; }); return r; }
  function findCourse(title, id) {
    var r = title.seasons[0];
    title.seasons.forEach(function (s) { if (String(s.id) === String(id)) r = s; });
    return r;
  }

  function getDetail(course) {
    var slot = state.details[course.id];
    if (slot && slot.value) return slot;
    if (slot && slot.promise) return slot;
    slot = state.details[course.id] = { ts: Date.now(), promise: null, value: null, error: null };
    var loader = state.mode === 'catalog' ? loadCatalog : loadLive;
    slot.promise = loader(course).then(function (v) {
      slot.value = v; slot.promise = null; slot.ts = Date.now();
      if (state.open) render();
      return v;
    }, function (err) {
      slot.error = err; slot.promise = null;
      log('detail failed', err && err.message);
      if (state.open) render();
    });
    return slot;
  }

  /* ------------------------------------------------------------------ boot and fallback */

  function boot() {
    state.status = 'loading';
    state.bootId += 1;
    var id = state.bootId;
    render();
    waitForAuth().then(function () {
      return api('/courses/learners/locations/' + net.loc + '/courses/library');
    }).then(function (lib) {
      if (id !== state.bootId) return;
      state.mode = 'live';
      state.details = {};
      state.home = { items: null };
      state.ts = Date.now();
      afterLibrary(groupTitles(asArray(lib, ['courses', 'data', 'items'])));
    }).catch(function (err) {
      if (id !== state.bootId) return;
      log('live data failed', err && err.message);
      fallback();
    });
  }

  function fallback() {
    var cat = cfg.catalog && cfg.catalog.courses;
    if (cat && cat.length) {
      state.mode = 'catalog';
      state.details = {};
      state.home = { items: null };
      state.ts = Date.now();
      afterLibrary(groupTitles(cat.map(function (c) {
        return { id: c.id, title: c.title, description: c.description, posterImage: c.poster, libraryOrder: 0 };
      })));
    } else {
      giveUp();
    }
  }

  function giveUp() {
    state.status = 'failed';
    state.giveUpUntil = Date.now() + 60000;
    close();
  }

  function afterLibrary(titles) {
    if (!titles.length) return giveUp();
    state.titles = titles;
    state.status = 'ready';
    if (titles.length === 1) {
      state.screen = 'title';
      state.titleKey = titles[0].key;
      state.courseId = titles[0].seasons[0].id;
    } else {
      state.screen = 'home';
      state.titleKey = null;
      state.courseId = null;
      loadContinue();
    }
    render();
  }

  function loadContinue() {
    if (state.mode !== 'live') return;
    var started = [];
    state.titles.forEach(function (t) { t.seasons.forEach(function (s) { if (s.started) started.push(s); }); });
    started = started.slice(0, 8);
    var myBoot = state.bootId;
    pool(started, function (c) {
      var L = '/courses/learners/locations/' + net.loc + '/courses/' + enc(c.id);
      return api(L + '/lessons/sequence?courseId=' + enc(c.id)).then(function (s) {
        var ll = s && s.lastLesson;
        if (!ll || !ll.id) return null;
        return {
          course: c,
          title: String(ll.title || c.title),
          poster: safeUrl(ll.posterImage) || c.poster,
          url: lessonUrl(c.id, ll.categoryId || s.lastLessonCategoryId, ll.id)
        };
      }).catch(function () { return null; });
    }).then(function (items) {
      if (myBoot !== state.bootId) return;
      state.home.items = items.filter(Boolean);
      if (state.open) render();
    });
  }

  /* ------------------------------------------------------------------ routing */

  function isHomeRoute() {
    var p = location.pathname.replace(/\/+$/, '') || '/';
    return cfg.homeRoutes.indexOf(p) !== -1;
  }

  var lastHref = '';
  function onRoute() {
    lastHref = location.href;
    if (isHomeRoute()) {
      if (Date.now() < state.giveUpUntil) return close();
      open();
    } else {
      close();
    }
  }

  function open() {
    if (!state.open) {
      state.open = true;
      ensureRoot();
      document.documentElement.style.overflow = 'hidden';
    }
    var stale = state.status === 'ready' && Date.now() - state.ts > cfg.cacheMs;
    if (state.status === 'idle' || state.status === 'failed' || stale) {
      boot();
    } else {
      render();
    }
  }

  function close() {
    if (!state.open) return;
    state.open = false;
    state.bootId += 1;
    if (state.status === 'loading') state.status = 'idle';
    var root = document.getElementById('xflix-root');
    if (root && root.parentNode) root.parentNode.removeChild(root);
    document.documentElement.style.overflow = '';
  }

  ['pushState', 'replaceState'].forEach(function (fn) {
    var orig = history[fn];
    history[fn] = function () {
      var r = orig.apply(this, arguments);
      setTimeout(onRoute, 0);
      return r;
    };
  });
  window.addEventListener('popstate', function () { setTimeout(onRoute, 0); });
  window.addEventListener('hashchange', function () { setTimeout(onRoute, 0); });
  setInterval(function () { if (location.href !== lastHref) onRoute(); }, 700);

  /* ------------------------------------------------------------------ DOM helpers */

  function el(tag, props, kids) {
    var n = document.createElement(tag);
    if (props) {
      Object.keys(props).forEach(function (k) {
        var v = props[k];
        if (v === null || v === undefined || v === false) return;
        if (k === 'class') n.className = v;
        else if (k === 'text') n.textContent = v;
        else if (k === 'style') n.style.cssText = v;
        else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), v);
        else n.setAttribute(k, v === true ? '' : String(v));
      });
    }
    (kids || []).forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return n;
  }

  var PALETTE = [
    ['#ff7a1ad0', '#4a1600'], ['#18c5bbb8', '#06302e'], ['#7fe3d9a0', '#0f2a35'],
    ['#ffb15cc8', '#3d2300'], ['#ff5a1fcc', '#3a0a06'], ['#18c5bb90', '#1a1030']
  ];
  function hash(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
  function artStyle(seed) {
    var h = hash(String(seed));
    var p = PALETTE[h % PALETTE.length];
    return '--a:' + p[0] + ';--b:' + p[1] + ';--x:' + (20 + (h % 60)) + '%;--y:' + (20 + ((h >> 3) % 60)) + '%';
  }

  function poster(url, seed, cls) {
    var d = el('div', { class: 'xf-poster xf-art ' + (cls || ''), style: artStyle(seed) });
    if (url) {
      var img = el('img', { src: url, alt: '', loading: 'lazy', decoding: 'async' });
      img.addEventListener('error', function () { if (img.parentNode) img.parentNode.removeChild(img); });
      d.appendChild(img);
    }
    return d;
  }

  function fmtDur(sec) {
    if (!sec) return '';
    var m = Math.round(sec / 60);
    if (m < 1) return '<1m';
    if (m >= 60) { var mm = m % 60; return Math.floor(m / 60) + 'h ' + (mm < 10 ? '0' : '') + mm + 'm'; }
    return m + 'm';
  }

  var ICON = {
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    lock: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2" fill="currentColor"/><path d="M8 10.5V8a4 4 0 018 0v2.5" fill="none" stroke="currentColor" stroke-width="2.2"/></svg>',
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l13-7.5z" fill="currentColor"/></svg>',
    left: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    right: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };
  function icon(name) { var s = el('span', { class: 'xf-ico xf-ico-' + name }); s.innerHTML = ICON[name]; return s; }

  /* ------------------------------------------------------------------ styles */

  function css() {
    var c = cfg.colors || {};
    var vars = '--xf-bg:' + (c.bg || '#0B0B0D') + ';--xf-surface:' + (c.surface || '#141418') + ';--xf-raised:' + (c.raised || '#1E1E24') +
      ';--xf-line:' + (c.line || '#2A2A31') + ';--xf-accent:' + (c.accent || '#FF7A1A') + ';--xf-accent2:' + (c.accent2 || '#18C5BB') +
      ';--xf-text:' + (c.text || '#F5F1EA') + ';--xf-muted:' + (c.muted || '#9A968F') + ';';
    return '#xflix-root{' + vars + 'position:fixed;inset:0;z-index:2147483000;overflow:auto;background:var(--xf-bg);color:var(--xf-text);' +
      'font-family:"Instrument Sans",system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;line-height:1.4;-webkit-font-smoothing:antialiased}' +
      '#xflix-root *{box-sizing:border-box}#xflix-root a{color:inherit;text-decoration:none}' +
      '#xflix-root button,#xflix-root select{font:inherit;color:inherit}' +
      '.xf-top{position:sticky;top:0;z-index:20;display:flex;align-items:center;gap:28px;padding:14px clamp(16px,4vw,48px);background:linear-gradient(rgba(11,11,13,.92),rgba(11,11,13,0));transition:background .2s}' +
      '.xf-top.solid{background:var(--xf-bg);box-shadow:0 1px 0 var(--xf-line)}' +
      '.xf-logo{display:inline-flex;align-items:center;gap:2px;font:900 clamp(24px,3vw,32px)/1 "Big Shoulders Display",Impact,"Arial Narrow",sans-serif;letter-spacing:.02em;border:0;background:none;padding:0;cursor:pointer}' +
      '.xf-logo b{background:linear-gradient(180deg,#fff1d2,#ffbf5e 45%,var(--xf-accent));-webkit-background-clip:text;background-clip:text;color:transparent}' +
      '.xf-logo img{height:34px;width:auto;display:block}' +
      '.xf-nav{display:flex;gap:22px;font-size:15px;color:var(--xf-muted)}' +
      '.xf-nav a,.xf-nav button{background:none;border:0;padding:6px 0;cursor:pointer;color:inherit}' +
      '.xf-nav .on,.xf-nav a:hover,.xf-nav button:hover{color:var(--xf-text)}' +
      '.xf-spacer{flex:1}' +
      '.xf-main{padding-bottom:64px}' +
      '.xf-hero{position:relative;min-height:min(62vh,560px);display:flex;align-items:flex-end;padding:0 clamp(16px,4vw,48px) 56px;margin-top:-62px;overflow:hidden}' +
      '.xf-hero .xf-poster{position:absolute;inset:0;border-radius:0;aspect-ratio:auto}' +
      '.xf-hero::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,#0b0b0dee 0%,#0b0b0d80 45%,transparent 75%),linear-gradient(transparent 55%,var(--xf-bg) 98%)}' +
      '.xf-hero-copy{position:relative;z-index:2;max-width:620px;padding-top:120px}' +
      '.xf-eyebrow{font:600 12px/1 "Instrument Sans",sans-serif;letter-spacing:.3em;text-transform:uppercase;color:var(--xf-accent);margin-bottom:14px}' +
      '.xf-h1{margin:0 0 14px;font:900 clamp(44px,8vw,92px)/.86 "Big Shoulders Display",Impact,"Arial Narrow",sans-serif;text-transform:uppercase;text-wrap:balance}' +
      '.xf-desc{margin:0 0 18px;color:#ddd8d0;max-width:54ch;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}' +
      '.xf-prog{display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px;margin:0 0 18px;font-size:14px;color:var(--xf-muted)}' +
      '.xf-bar{width:min(240px,50vw);height:5px;border-radius:3px;background:#ffffff26;overflow:hidden}.xf-bar i{display:block;height:100%;background:var(--xf-accent)}' +
      '.xf-btns{display:flex;flex-wrap:wrap;gap:12px;align-items:center}' +
      '.xf-btn{display:inline-flex;align-items:center;gap:8px;border:0;border-radius:6px;padding:11px 24px;font-weight:700;font-size:16px;cursor:pointer;background:#ffffff2b;color:var(--xf-text)}' +
      '.xf-btn.primary{background:var(--xf-accent);color:#1a0900}.xf-btn.teal{background:transparent;border:1.5px solid var(--xf-accent2);color:var(--xf-accent2);padding:9px 18px;font-size:14px}' +
      '.xf-btn:hover{filter:brightness(1.12)}.xf-btn .xf-ico{width:1em;height:1em;display:inline-flex}.xf-ico svg{width:100%;height:100%}' +
      '.xf-select{appearance:none;background:#0b0b0dcc;border:1.5px solid #8a8680;border-radius:6px;padding:9px 34px 9px 14px;font-weight:600;cursor:pointer;' +
      'background-image:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\'%3E%3Cpath d=\'M6 9l6 6 6-6\' fill=\'none\' stroke=\'%23F5F1EA\' stroke-width=\'2.4\'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 8px center;background-size:18px}' +
      '.xf-select option{background:#1E1E24;color:#F5F1EA}' +
      '.xf-row{margin:30px 0 0;padding-left:clamp(16px,4vw,48px)}' +
      '.xf-row-h{display:flex;flex-wrap:wrap;align-items:baseline;gap:6px 14px;margin:0 clamp(16px,4vw,48px) 12px 0}' +
      '.xf-row-h h2{margin:0;font-size:clamp(18px,2vw,22px);font-weight:700}' +
      '.xf-row-meta{font-size:13px;color:var(--xf-muted)}' +
      '.xf-row-h .xf-btn.teal{margin-left:auto}' +
      '.xf-scroller{position:relative}' +
      '.xf-track{display:flex;gap:10px;overflow-x:auto;padding:10px clamp(16px,4vw,48px) 14px 12px;margin:-6px 0 0 -12px;scroll-snap-type:x proximity;scrollbar-width:thin;scrollbar-color:#3a3a42 transparent}' +
      '.xf-arrow{position:absolute;top:0;bottom:56px;width:48px;z-index:5;border:0;background:linear-gradient(90deg,#0b0b0dee,transparent);color:#fff;cursor:pointer;opacity:0;transition:opacity .15s;display:flex;align-items:center;justify-content:center}' +
      '.xf-arrow.r{right:0;background:linear-gradient(270deg,#0b0b0dee,transparent)}.xf-arrow.l{left:-1px}' +
      '.xf-scroller:hover .xf-arrow{opacity:1}.xf-arrow[hidden]{display:none}.xf-arrow .xf-ico{width:28px;height:28px;display:inline-flex}' +
      '.xf-tile{position:relative;flex:0 0 clamp(210px,19vw,290px);scroll-snap-align:start;display:block;transition:transform .15s}' +
      '.xf-tile:hover,.xf-tile:focus-visible{transform:scale(1.035);z-index:3}' +
      '.xf-tile:focus-visible{outline:2px solid var(--xf-accent);outline-offset:3px;border-radius:6px}' +
      '.xf-tile.is-locked{cursor:not-allowed}.xf-tile.is-locked:hover{transform:none}.xf-tile.is-locked .xf-poster{filter:grayscale(.7) brightness(.55)}' +
      '.xf-poster{position:relative;overflow:hidden;border-radius:6px;aspect-ratio:16/9;background:linear-gradient(165deg,var(--b),#0b0b0d 82%)}' +
      '.xf-art::before{content:"";position:absolute;inset:0;background:' +
      'radial-gradient(circle at var(--x,70%) var(--y,35%),transparent 0 17%,rgba(255,255,255,.13) 17.4% 18.1%,transparent 18.5% 25%,rgba(255,255,255,.06) 25.3% 25.9%,transparent 26.2%),' +
      'radial-gradient(115% 95% at 85% 12%,var(--a),transparent 62%)}' +
      '.xf-poster img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}' +
      '.xf-badge{position:absolute;z-index:2;font:600 11px/1 ui-monospace,Menlo,monospace;letter-spacing:.05em;padding:4px 7px;border-radius:4px;background:#0b0b0dcc;color:var(--xf-text)}' +
      '.xf-badge.tl{top:8px;left:8px}.xf-badge.br{bottom:8px;right:8px}' +
      '.xf-state{position:absolute;z-index:2;top:8px;right:8px;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center}' +
      '.xf-state.done{background:var(--xf-accent2);color:#03201e}.xf-state.done .xf-ico{width:16px;height:16px;display:inline-flex}' +
      '.xf-state.started{width:auto;height:auto;border-radius:4px;padding:4px 7px;background:var(--xf-accent);color:#1a0900;font:700 11px/1 "Instrument Sans",sans-serif}' +
      '.xf-lock{position:absolute;inset:0;z-index:3;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:#d8d3cb;font-size:13px;font-weight:600}' +
      '.xf-lock .xf-ico{width:26px;height:26px;display:inline-flex}' +
      '.xf-prog-line{position:absolute;left:0;right:0;bottom:0;height:4px;background:#ffffff33;z-index:2}.xf-prog-line i{display:block;height:100%;background:var(--xf-accent)}' +
      '.xf-tile-t{margin:8px 2px 0;font-size:15px;font-weight:600;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}' +
      '.xf-tile-s{margin:2px 2px 0;font-size:13px;color:var(--xf-muted)}' +
      '.xf-tile.done .xf-tile-s{color:var(--xf-accent2)}' +
      '.xf-title-tile .xf-poster{aspect-ratio:16/9}' +
      '.xf-tile .xf-name{position:absolute;z-index:2;left:12px;right:12px;bottom:12px;font:900 clamp(22px,2.2vw,30px)/.9 "Big Shoulders Display",Impact,"Arial Narrow",sans-serif;text-transform:uppercase;text-shadow:0 2px 12px #000}' +
      '.xf-back{background:none;border:0;color:var(--xf-muted);cursor:pointer;padding:0;margin:0 0 14px;font-size:14px}.xf-back:hover{color:var(--xf-text)}' +
      '.xf-note{margin:30px clamp(16px,4vw,48px);padding:16px 18px;border:1px solid var(--xf-line);border-radius:8px;background:var(--xf-surface);color:var(--xf-muted);font-size:14px}' +
      '.xf-note a{color:var(--xf-accent);text-decoration:underline}' +
      '.xf-lockrow{margin:0 clamp(16px,4vw,48px) 6px 0;font-size:13px;color:var(--xf-muted)}' +
      '.xf-skel .xf-poster{background:linear-gradient(90deg,#16161a,#202027,#16161a);background-size:200% 100%;animation:xfsh 1.3s linear infinite}' +
      '.xf-skel .xf-poster::before{display:none}' +
      '@keyframes xfsh{to{background-position:-200% 0}}' +
      '.xf-modal{position:fixed;inset:0;z-index:30;background:#000c;display:flex;align-items:center;justify-content:center;padding:16px}' +
      '.xf-modal>div{width:min(720px,100%);background:var(--xf-surface);border:1px solid var(--xf-line);border-radius:10px;padding:18px;display:grid;gap:12px}' +
      '.xf-modal textarea{width:100%;height:46vh;background:var(--xf-bg);color:var(--xf-text);border:1px solid var(--xf-line);border-radius:6px;padding:10px;font:12px ui-monospace,Menlo,monospace}' +
      '@media (max-width:720px){.xf-nav{gap:14px}.xf-hero{min-height:56vh;padding-bottom:36px}.xf-tile{flex-basis:70vw}.xf-arrow{display:none}.xf-btn{padding:10px 18px;font-size:15px}}' +
      '@media (prefers-reduced-motion:reduce){#xflix-root *{animation:none!important;transition:none!important}}';
  }

  function injectStyle() {
    if (document.getElementById('xflix-style') || window.__xflixSheet) return;
    var text = css();
    try {
      if (typeof CSSStyleSheet !== 'undefined' && document.adoptedStyleSheets !== undefined) {
        var sheet = new CSSStyleSheet();
        sheet.replaceSync(text);
        document.adoptedStyleSheets = [].concat(Array.prototype.slice.call(document.adoptedStyleSheets), [sheet]);
        window.__xflixSheet = sheet;
        return;
      }
    } catch (e) { /* fall back to a style element */ }
    var s = el('style', { id: 'xflix-style' });
    s.textContent = text;
    document.head.appendChild(s);
  }

  function injectFonts() {
    if (!cfg.fonts || document.getElementById('xflix-fonts')) return;
    var l = el('link', {
      id: 'xflix-fonts', rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@800;900&family=Instrument+Sans:wght@400;500;600;700&display=swap'
    });
    document.head.appendChild(l);
  }

  function ensureRoot() {
    injectStyle();
    injectFonts();
    var root = document.getElementById('xflix-root');
    if (!root) {
      root = el('div', { id: 'xflix-root', role: 'main', 'aria-label': cfg.brandName + ' course library' });
      root.addEventListener('scroll', syncTop);
      document.documentElement.appendChild(root);
    }
    return root;
  }

  function syncTop() {
    var r = document.getElementById('xflix-root');
    var t = r && r.querySelector('.xf-top');
    if (t) t.classList.toggle('solid', r.scrollTop > 40);
  }

  /* ------------------------------------------------------------------ views */

  function logo() {
    if (cfg.logoUrl && safeUrl(cfg.logoUrl)) {
      return el('button', { class: 'xf-logo', type: 'button', 'aria-label': cfg.brandName, onclick: goHome }, [el('img', { src: cfg.logoUrl, alt: cfg.brandName })]);
    }
    var name = cfg.brandName || 'XFlix';
    return el('button', { class: 'xf-logo', type: 'button', 'aria-label': name, onclick: goHome }, [
      el('b', { text: name.charAt(0).toUpperCase() }), el('b', { text: name.slice(1).toUpperCase() })
    ]);
  }

  function topbar() {
    var multi = state.titles.length > 1;
    var kids = [logo(), el('nav', { class: 'xf-nav', 'aria-label': 'XFlix' }, [
      multi ? el('button', { type: 'button', class: state.screen === 'home' ? 'on' : '', onclick: goHome, text: 'Home' }) : null,
      el('a', { href: cfg.accountUrl, text: cfg.accountLabel })
    ]), el('div', { class: 'xf-spacer' })];
    if (flag('xflix-export') && state.mode === 'live') {
      kids.push(el('button', { class: 'xf-btn teal', type: 'button', onclick: exportCatalog, text: 'Export catalog' }));
    }
    return el('header', { class: 'xf-top' }, kids);
  }

  function goHome() {
    if (state.titles.length === 1) { state.screen = 'title'; } else { state.screen = 'home'; state.titleKey = null; state.courseId = null; }
    render();
    var root = document.getElementById('xflix-root');
    if (root) root.scrollTop = 0;
  }

  function openTitle(t, courseId) {
    state.screen = 'title';
    state.titleKey = t.key;
    state.courseId = courseId || t.seasons[0].id;
    render();
    var root = document.getElementById('xflix-root');
    if (root) root.scrollTop = 0;
  }

  function trackWithArrows(track) {
    function scrollBy(dir) { track.scrollBy({ left: dir * Math.max(200, track.clientWidth * 0.8), behavior: 'smooth' }); }
    var left = el('button', { class: 'xf-arrow l', type: 'button', 'aria-label': 'Scroll left', onclick: function () { scrollBy(-1); } }, [icon('left')]);
    var right = el('button', { class: 'xf-arrow r', type: 'button', 'aria-label': 'Scroll right', onclick: function () { scrollBy(1); } }, [icon('right')]);
    function update() {
      left.hidden = track.scrollLeft < 4;
      right.hidden = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
    }
    track.addEventListener('scroll', update);
    left.hidden = true;
    right.hidden = true;
    setTimeout(update, 60);
    return el('div', { class: 'xf-scroller' }, [left, track, right]);
  }

  function skeletonRow(n) {
    var tiles = [];
    for (var i = 0; i < (n || 5); i++) tiles.push(el('div', { class: 'xf-tile xf-skel' }, [el('div', { class: 'xf-poster' })]));
    return el('section', { class: 'xf-row', 'aria-hidden': 'true' }, [el('div', { class: 'xf-row-h' }, [el('h2', { text: ' ' })]), el('div', { class: 'xf-track' }, tiles)]);
  }

  function lectureTile(l) {
    var kids = [];
    var p = poster(l.poster, l.title);
    p.appendChild(el('span', { class: 'xf-badge tl', text: 'L' + l.n }));
    if (l.seconds) p.appendChild(el('span', { class: 'xf-badge br', text: fmtDur(l.seconds) }));
    if (l.state === 'done') { var d = el('span', { class: 'xf-state done', title: 'Watched' }); d.appendChild(icon('check')); p.appendChild(d); }
    if (l.state === 'started') p.appendChild(el('span', { class: 'xf-state started', text: 'In progress' }));
    if (l.locked) { var lk = el('div', { class: 'xf-lock' }, [icon('lock'), el('span', { text: 'Locked' })]); p.appendChild(lk); }
    kids.push(p);
    kids.push(el('div', { class: 'xf-tile-t', text: l.title }));
    var sub = l.state === 'done' ? 'Watched' : (l.state === 'started' ? 'In progress' : '');
    if (sub && !l.locked) kids.push(el('div', { class: 'xf-tile-s', text: sub }));
    var cls = 'xf-tile ' + l.state + (l.locked ? ' is-locked' : '');
    if (l.locked) return el('div', { class: cls, 'aria-disabled': 'true' }, kids);
    return el('a', { class: cls, href: l.url }, kids);
  }

  function moduleRow(m) {
    var meta = m.lessons.length ? (state.mode === 'live' ? m.doneCount + ' of ' + m.lessons.length + ' watched' : m.lessons.length + ' lectures') : '';
    var head = [el('h2', { text: m.title })];
    if (meta) head.push(el('span', { class: 'xf-row-meta', text: meta }));
    if (m.claim) head.push(el('a', { class: 'xf-btn teal', href: m.claim, target: '_blank', rel: 'noopener', text: 'Claim CME' }));
    var body = [el('div', { class: 'xf-row-h' }, head)];
    if (m.locked) {
      body.push(el('div', { class: 'xf-lockrow', text: m.availableAt ? 'This folder opens on a set date.' : 'This folder is locked. Finish the earlier folders to unlock it.' }));
    }
    if (m.failed) {
      body.push(el('div', { class: 'xf-lockrow', text: 'This folder could not be loaded here. Open the course page to see it.' }));
    } else if (m.lessons.length) {
      body.push(trackWithArrows(el('div', { class: 'xf-track' }, m.lessons.map(lectureTile))));
    } else {
      body.push(el('div', { class: 'xf-lockrow', text: 'No lectures in this folder yet.' }));
    }
    return el('section', { class: 'xf-row' }, body);
  }

  function titleView(t) {
    var course = findCourse(t, state.courseId);
    var slot = getDetail(course);
    var detail = slot.value;
    var heroImg = (cfg.heroImages && (cfg.heroImages[t.name] || cfg.heroImages[course.title])) || '';
    var copy = [];
    if (state.titles.length > 1) copy.push(el('button', { class: 'xf-back', type: 'button', onclick: goHome, text: '‹ All courses' }));
    copy.push(el('div', { class: 'xf-eyebrow', text: course.label ? cfg.brandName + ' · Season ' + course.label : cfg.brandName }));
    copy.push(el('h1', { class: 'xf-h1', text: t.name }));
    if (course.description) copy.push(el('p', { class: 'xf-desc', text: course.description }));
    if (detail && detail.personal && detail.total) {
      var pct = Math.round(detail.doneCount * 100 / detail.total);
      copy.push(el('div', { class: 'xf-prog' }, [el('div', { class: 'xf-bar' }, [el('i', { style: 'width:' + pct + '%' })]),
        el('span', { text: detail.doneCount + ' of ' + detail.total + ' lectures watched' })]));
    }
    var btns = [];
    if (detail && detail.resume) {
      var a = el('a', { class: 'xf-btn primary', href: detail.resume.lesson.url }, [icon('play'), el('span', { text: detail.resume.label })]);
      btns.push(a);
    } else {
      btns.push(el('a', { class: 'xf-btn primary', href: courseUrl(course.id) }, [icon('play'), el('span', { text: 'Open course' })]));
    }
    if (t.seasons.length > 1) {
      var sel = el('select', { class: 'xf-select', 'aria-label': 'Season', onchange: function (e) { state.courseId = e.target.value; render(); } },
        t.seasons.map(function (s) {
          var o = el('option', { value: String(s.id), text: s.label ? 'Season ' + s.label : s.title });
          if (String(s.id) === String(course.id)) o.selected = true;
          return o;
        }));
      btns.push(sel);
    }
    if (detail && detail.claim) btns.push(el('a', { class: 'xf-btn teal', href: detail.claim, target: '_blank', rel: 'noopener', text: 'Claim CME' }));
    copy.push(el('div', { class: 'xf-btns' }, btns));

    var out = [el('section', { class: 'xf-hero' }, [poster(safeUrl(heroImg) || course.poster, course.title), el('div', { class: 'xf-hero-copy' }, copy)])];
    if (detail) {
      detail.modules.forEach(function (m) { out.push(moduleRow(m)); });
      if (!detail.modules.length) out.push(el('div', { class: 'xf-note', text: 'No lectures are available yet.' }));
    } else if (slot.error) {
      out.push(el('div', { class: 'xf-note' }, [document.createTextNode('We could not load this course here. '),
        el('a', { href: courseUrl(course.id), text: 'Open it in the portal' }), document.createTextNode('.')]));
    } else {
      out.push(skeletonRow(5), skeletonRow(4));
    }
    return out;
  }

  function homeView() {
    var items = (state.home && state.home.items) || [];
    var featured = state.titles[0];
    var resumeItem = items[0];
    if (resumeItem) state.titles.forEach(function (t) { t.seasons.forEach(function (s) { if (s.id === resumeItem.course.id) featured = t; }); });
    var fCourse = featured.seasons[0];
    var heroImg = (cfg.heroImages && (cfg.heroImages[featured.name] || cfg.heroImages[fCourse.title])) || '';
    var copy = [
      el('div', { class: 'xf-eyebrow', text: cfg.brandName }),
      el('h1', { class: 'xf-h1', text: featured.name })
    ];
    if (fCourse.description) copy.push(el('p', { class: 'xf-desc', text: fCourse.description }));
    var btns = [];
    if (resumeItem && resumeItem.course.id === fCourse.id) {
      btns.push(el('a', { class: 'xf-btn primary', href: resumeItem.url }, [icon('play'), el('span', { text: 'Resume' })]));
    } else {
      btns.push(el('a', { class: 'xf-btn primary', href: courseUrl(fCourse.id) }, [icon('play'), el('span', { text: 'Play' })]));
    }
    btns.push(el('button', { class: 'xf-btn', type: 'button', onclick: function () { openTitle(featured); }, text: featured.seasons.length > 1 ? 'Seasons & lectures' : 'All lectures' }));
    copy.push(el('div', { class: 'xf-btns' }, btns));
    var out = [el('section', { class: 'xf-hero' }, [poster(safeUrl(heroImg) || fCourse.poster, fCourse.title), el('div', { class: 'xf-hero-copy' }, copy)])];

    if (items.length) {
      out.push(el('section', { class: 'xf-row' }, [
        el('div', { class: 'xf-row-h' }, [el('h2', { text: 'Continue watching' })]),
        trackWithArrows(el('div', { class: 'xf-track' }, items.map(function (it) {
          var p = poster(it.poster, it.title);
          p.appendChild(el('span', { class: 'xf-state started', text: 'Resume' }));
          return el('a', { class: 'xf-tile started', href: it.url }, [p, el('div', { class: 'xf-tile-t', text: it.title }), el('div', { class: 'xf-tile-s', text: it.course.title })]);
        })))
      ]));
    }
    out.push(el('section', { class: 'xf-row' }, [
      el('div', { class: 'xf-row-h' }, [el('h2', { text: 'Your courses' })]),
      trackWithArrows(el('div', { class: 'xf-track' }, state.titles.map(function (t) {
        var p = poster(safeUrl((cfg.heroImages && cfg.heroImages[t.name]) || '') || t.seasons[0].poster, t.name, 'xf-title-tile');
        p.appendChild(el('span', { class: 'xf-name', text: t.name }));
        var sub = t.seasons.length > 1 ? t.seasons.length + ' seasons' : (t.seasons[0].label ? 'Season ' + t.seasons[0].label : '');
        return el('a', { class: 'xf-tile xf-title-tile', href: courseUrl(t.seasons[0].id), onclick: function (e) { e.preventDefault(); openTitle(t); } },
          [p, sub ? el('div', { class: 'xf-tile-s', text: sub }) : null]);
      })))
    ]));
    return out;
  }

  function render() {
    if (!state.open) return;
    var root = ensureRoot();
    var keep = root.scrollTop;
    while (root.firstChild) root.removeChild(root.firstChild);
    var main = el('main', { class: 'xf-main' });
    if (state.status === 'ready' && state.titles.length) {
      root.appendChild(topbar());
      var t = state.screen === 'title' ? findTitle(state.titleKey) : null;
      (t ? titleView(t) : homeView()).forEach(function (n) { main.appendChild(n); });
    } else {
      root.appendChild(el('header', { class: 'xf-top' }, [logo()]));
      main.appendChild(el('section', { class: 'xf-hero', 'aria-busy': 'true' }, [el('div', { class: 'xf-hero-copy' }, [
        el('div', { class: 'xf-eyebrow', text: cfg.brandName }), el('h1', { class: 'xf-h1', text: 'Loading' })])]));
      main.appendChild(skeletonRow(5));
      main.appendChild(skeletonRow(4));
    }
    root.appendChild(main);
    root.scrollTop = keep;
    syncTop();
  }

  /* ------------------------------------------------------------------ catalog export (admin helper) */

  function exportCatalog() {
    if (state.mode !== 'live') return;
    var all = [];
    state.titles.forEach(function (t) { t.seasons.forEach(function (s) { all.push(s); }); });
    pool(all, function (c) {
      var slot = getDetail(c);
      return (slot.promise || Promise.resolve(slot.value)).then(function () { return state.details[c.id].value; });
    }).then(function (details) {
      var out = {
        version: 1,
        exportedAt: new Date().toISOString(),
        courses: all.map(function (c, i) {
          var d = details[i];
          return {
            id: c.id, title: c.title, description: c.description, poster: c.poster,
            modules: d ? d.modules.map(function (m) {
              return { id: m.id, title: m.title, lessons: m.lessons.map(function (l) { return { id: l.id, title: l.title, poster: l.poster, duration: l.seconds }; }) };
            }) : []
          };
        })
      };
      var text = JSON.stringify(out, null, 2);
      var area = el('textarea', { readonly: true });
      area.value = text;
      var copy = el('button', { class: 'xf-btn teal', type: 'button', text: 'Copy', onclick: function () {
        area.select();
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).catch(function () { document.execCommand('copy'); });
        else document.execCommand('copy');
      } });
      var modal = el('div', { class: 'xf-modal' }, [el('div', null, [
        el('div', { class: 'xf-row-meta', text: 'Saved catalog for XFLIX_CONFIG.catalog. It lists course, folder and lecture names and IDs only.' }),
        area, el('div', { class: 'xf-btns' }, [copy, el('button', { class: 'xf-btn', type: 'button', text: 'Close', onclick: function () { modal.remove(); } })])])]);
      ensureRoot().appendChild(modal);
    });
  }

  /* ------------------------------------------------------------------ start */

  window.__xflix = {
    version: VERSION,
    config: cfg,
    state: state,
    exportCatalog: exportCatalog,
    off: function () { setFlag('xflix-off', true); close(); }
  };

  function start() {
    lastHref = '';
    onRoute();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
