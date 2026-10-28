/*
 * XFlix probe 2: can our script request course data for itself?
 *
 * Probe 1 showed the portal fetches the library, folders, lectures, lock state and completion
 * from services.leadconnectorhq.com/clientportal-middleware. This probe tests whether a script on
 * the portal page can make those same read-only (GET) requests itself, so XFlix can build its
 * home page without the learner opening every course first.
 *
 * Paste into: Sites > Client Portal > Settings > Branding > Advanced > Custom JavaScript (TEST
 * account only). It stays off unless the page address contains ?xflixprobe=2.
 *
 * Safety:
 *  - Only sends GET requests, only to the portal's own data service, only for the logged-in
 *    test learner, and only when you click "Run replay test".
 *  - The learner's login headers stay in memory. They are never shown, copied or sent elsewhere.
 *    The report lists header NAMES only.
 *  - The report contains endpoint paths (IDs replaced with :id), status codes and field names.
 *    It does not contain titles, names, emails or tokens.
 */
(function () {
  'use strict';

  var FLAG = 'xflixprobe2';
  try {
    if (/[?&]xflixprobe=2/.test(location.search)) sessionStorage.setItem(FLAG, '1');
    if (sessionStorage.getItem(FLAG) !== '1') return;
  } catch (e) {
    return;
  }
  if (window.__xflixProbe2) return;

  var API = /^(https:\/\/(?:services|backend)\.leadconnectorhq\.com\/clientportal-middleware)\//;
  var MAX_DEPTH = 7;
  var SKIP_HEADERS = /^(content-length|host|accept-encoding|connection|origin|referer|user-agent)$/i;

  var headers = null;      // kept in memory only
  var credentials = null;
  var base = null;
  var loc = null;
  var passive = {};        // unique "METHOD host/path" -> count
  var results = [];
  var summary = null;
  var running = false;

  /* ---------- helpers ---------- */

  function norm(url) {
    try {
      var u = new URL(url, location.href);
      var p = u.pathname
        .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
        .replace(/\b[A-Za-z0-9]{18,}\b/g, ':id');
      return u.host + p;
    } catch (e) {
      return String(url).slice(0, 60);
    }
  }

  function shape(value, depth) {
    if (value === null) return 'null';
    if (Array.isArray(value)) {
      return { list: value.length, item: value.length && depth < MAX_DEPTH ? shape(value[0], depth + 1) : undefined };
    }
    if (typeof value === 'object') {
      if (depth >= MAX_DEPTH) return 'object';
      var out = {};
      Object.keys(value).slice(0, 40).forEach(function (k) { out[k] = shape(value[k], depth + 1); });
      return out;
    }
    return typeof value;
  }

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

  function learn(method, url, hdrs, creds) {
    var m = String(url).match(API);
    if (!m) return;
    var key = method + ' ' + norm(url);
    passive[key] = (passive[key] || 0) + 1;
    if (!base && /services\.leadconnectorhq\.com/.test(m[1])) base = m[1];
    var l = String(url).match(/\/locations\/([A-Za-z0-9]+)\//);
    if (l) loc = l[1];
    var clean = {};
    Object.keys(hdrs || {}).forEach(function (k) {
      if (!SKIP_HEADERS.test(k)) clean[k] = hdrs[k];
    });
    if (Object.keys(clean).length && /services\.leadconnectorhq\.com/.test(m[1])) {
      headers = clean;
      credentials = creds || null;
    }
    refresh();
  }

  /* ---------- watch the portal's own requests (read-only) ---------- */

  var origFetch = window.fetch;
  if (origFetch) {
    window.fetch = function (input, init) {
      try {
        var url = typeof input === 'string' ? input : (input && input.url) || '';
        var method = ((init && init.method) || (input && input.method) || 'GET').toUpperCase();
        var h = headersToObject((init && init.headers) || (input && input.headers));
        var creds = (init && init.credentials) || (input && input.credentials) || null;
        learn(method, url, h, creds);
      } catch (e) { /* ignore */ }
      return origFetch.apply(this, arguments);
    };
  }

  var XHR = window.XMLHttpRequest;
  if (XHR) {
    var open = XHR.prototype.open;
    var setHeader = XHR.prototype.setRequestHeader;
    var send = XHR.prototype.send;
    XHR.prototype.open = function (method, url) {
      this.__xf = { method: String(method).toUpperCase(), url: url, h: {} };
      return open.apply(this, arguments);
    };
    XHR.prototype.setRequestHeader = function (k, v) {
      if (this.__xf) this.__xf.h[k] = v;
      return setHeader.apply(this, arguments);
    };
    XHR.prototype.send = function () {
      try {
        if (this.__xf) learn(this.__xf.method, this.__xf.url, this.__xf.h, this.withCredentials ? 'include' : null);
      } catch (e) { /* ignore */ }
      return send.apply(this, arguments);
    };
  }

  /* ---------- the replay test ---------- */

  function get(path) {
    var url = base + path;
    var t = Date.now();
    var init = { method: 'GET', headers: headers };
    if (credentials) init.credentials = credentials;
    return origFetch.call(window, url, init).then(function (res) {
      return res.text().then(function (text) {
        var js = null;
        try { js = JSON.parse(text); } catch (e) { /* not JSON */ }
        results.push({ call: 'GET ' + norm(url), status: res.status, ms: Date.now() - t, shape: js === null ? 'not JSON' : shape(js, 0) });
        return res.status >= 200 && res.status < 300 ? js : null;
      });
    }, function (err) {
      results.push({ call: 'GET ' + norm(url), error: String((err && err.message) || err).slice(0, 80), ms: Date.now() - t });
      return null;
    });
  }

  function run() {
    if (running) return Promise.resolve();
    if (!headers || !base || !loc) {
      results = [{ note: 'Not ready. Open a course page or the course list in the portal first, then run again.' }];
      refresh();
      return Promise.resolve();
    }
    running = true;
    results = [];
    summary = { courses: 0, modules: 0, lessonsSeen: 0, lessonsStarted: 0, lessonsWithDuration: 0, completedListLength: null };
    var L = '/courses/learners/locations/' + loc;
    refresh();

    return get(L + '/courses/library').then(function (lib) {
      var courses = Array.isArray(lib) ? lib : [];
      summary.courses = courses.length;
      var chain = Promise.resolve();
      courses.slice(0, 3).forEach(function (c) {
        chain = chain.then(function () {
          return get(L + '/courses/' + c.id + '/modules').then(function (mods) {
            var list = (mods && mods.modules) || [];
            summary.modules += list.length;
            var inner = Promise.resolve();
            list.slice(0, 3).forEach(function (m) {
              inner = inner.then(function () {
                return get(L + '/courses/' + c.id + '/modules/' + m.id + '/lessons').then(function (res) {
                  var lessons = (res && res.lessons) || [];
                  summary.lessonsSeen += lessons.length;
                  lessons.forEach(function (x) {
                    if (x.started) summary.lessonsStarted += 1;
                    if (x.asset_urls && x.asset_urls.meta && x.asset_urls.meta.durationInSeconds) summary.lessonsWithDuration += 1;
                  });
                });
              });
            });
            return inner;
          }).then(function () {
            return get(L + '/courses/' + c.id + '/lessons/completed').then(function (done) {
              if (done && done.completedLessons) summary.completedListLength = (summary.completedListLength || 0) + done.completedLessons.length;
            });
          }).then(function () { return get(L + '/courses/' + c.id + '/unlocked-modules'); })
            .then(function () { return get(L + '/courses/' + c.id + '/lessons/sequence?courseId=' + c.id); });
        });
      });
      return chain;
    }).then(function () { return get(L + '/courses/library/upsell?limit=10&page=1'); })
      .then(function () { return get(L + '/courses/library/discover?limit=10&page=1'); })
      .then(function () { running = false; refresh(); }, function () { running = false; refresh(); });
  }

  /* ---------- report and panel ---------- */

  function report() {
    return JSON.stringify({
      probe: 'xflix-2',
      when: new Date().toISOString(),
      readyToReplay: !!(headers && base && loc),
      authHeaderNames: headers ? Object.keys(headers).sort() : [],
      fetchCredentialsMode: credentials,
      dataHost: base ? base.replace(/^https:\/\//, '') : null,
      summary: summary,
      replay: results,
      portalEndpointsSeen: Object.keys(passive).sort()
    }, null, 2);
  }

  var btn, panel, area, tally, runBtn;

  function ui() {
    if (btn) return;
    btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'XFlix probe 2';
    btn.setAttribute('style', 'position:fixed;left:12px;bottom:12px;z-index:2147483647;background:#FF7A1A;color:#1a0900;border:0;border-radius:6px;padding:8px 12px;font:600 13px system-ui,sans-serif;cursor:pointer');
    panel = document.createElement('div');
    panel.hidden = true;
    panel.setAttribute('style', 'position:fixed;left:12px;bottom:56px;z-index:2147483647;width:min(560px,calc(100vw - 24px));max-height:75vh;display:grid;gap:8px;background:#141418;color:#F5F1EA;border:1px solid #2A2A31;border-radius:8px;padding:12px;font:13px system-ui,sans-serif');
    tally = document.createElement('div');
    var row = document.createElement('div');
    row.setAttribute('style', 'display:flex;gap:8px;flex-wrap:wrap');
    runBtn = document.createElement('button');
    runBtn.type = 'button';
    runBtn.textContent = 'Run replay test';
    runBtn.setAttribute('style', 'background:#FF7A1A;color:#1a0900;border:0;border-radius:6px;padding:7px 12px;font:600 13px system-ui,sans-serif;cursor:pointer');
    runBtn.addEventListener('click', function () { run(); });
    var copy = document.createElement('button');
    copy.type = 'button';
    copy.textContent = 'Copy report';
    copy.setAttribute('style', 'background:#18C5BB;color:#03201e;border:0;border-radius:6px;padding:7px 12px;font:600 13px system-ui,sans-serif;cursor:pointer');
    copy.addEventListener('click', function () {
      area.select();
      var done = function () { copy.textContent = 'Copied'; setTimeout(function () { copy.textContent = 'Copy report'; }, 1500); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(area.value).then(done, function () { document.execCommand('copy'); done(); });
      } else {
        document.execCommand('copy');
        done();
      }
    });
    area = document.createElement('textarea');
    area.readOnly = true;
    area.setAttribute('style', 'width:100%;height:42vh;background:#0B0B0D;color:#F5F1EA;border:1px solid #2A2A31;border-radius:6px;font:12px ui-monospace,monospace;padding:8px;box-sizing:border-box');
    btn.addEventListener('click', function () { panel.hidden = !panel.hidden; refresh(); });
    row.appendChild(runBtn);
    row.appendChild(copy);
    panel.appendChild(tally);
    panel.appendChild(row);
    panel.appendChild(area);
    document.body.appendChild(btn);
    document.body.appendChild(panel);
  }

  function refresh() {
    if (!document.body) return;
    ui();
    var ready = !!(headers && base && loc);
    btn.textContent = 'XFlix probe 2' + (ready ? ' - ready' : '');
    if (!panel.hidden) {
      tally.textContent = running
        ? 'Running the replay test...'
        : ready
          ? 'Ready. Mark one lecture complete in the portal first if you have not, then click Run replay test, then Copy report.'
          : 'Not ready yet. Open the course list or a course page in the portal so the probe can see a request.';
      runBtn.disabled = running;
      area.value = report();
    }
  }

  window.__xflixProbe2 = { report: report, run: run };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', refresh);
  } else {
    refresh();
  }
})();
