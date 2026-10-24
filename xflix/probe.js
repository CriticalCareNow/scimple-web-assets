/*
 * XFlix feasibility probe
 *
 * Paste into: Sites > Client Portal > Settings > Branding > Advanced > Custom JavaScript
 * (on a TEST account). It stays off for everyone unless the page address contains
 * ?xflixprobe=1, so learners never see it.
 *
 * It records what GHL's Client Portal makes available to a script:
 *   - which API calls the portal makes, and the shape (key names, list sizes) of each response
 *   - which pages the learner moves through
 *   - which course, lesson and image links appear on each page
 * It records key names and counts only. It does not record values, tokens or cookies.
 * Nothing is sent anywhere: the report is shown on screen for you to copy.
 */
(function () {
  'use strict';

  var FLAG = 'xflixprobe';
  try {
    if (/[?&]xflixprobe=1/.test(location.search)) sessionStorage.setItem(FLAG, '1');
    if (sessionStorage.getItem(FLAG) !== '1') return;
  } catch (e) {
    return;
  }
  if (window.__xflixProbe) return;

  var KEYWORDS = /product|course|categor|post|lesson|folder|module|progress|complet|thumbnail|offer|enroll|video|title|order|access|locked|status/i;
  var MAX_CALLS = 120;
  var MAX_DEPTH = 7;

  var calls = [];
  var pages = [];
  var seenCall = {};

  function path(url) {
    try {
      var u = new URL(url, location.href);
      var keys = [];
      u.searchParams.forEach(function (_, k) { keys.push(k); });
      var p = u.pathname.replace(/[0-9a-f]{20,}/gi, ':id').replace(/\b\d{6,}\b/g, ':n');
      return u.host + p + (keys.length ? '?' + keys.sort().join('&') : '');
    } catch (e) {
      return String(url).slice(0, 80);
    }
  }

  function shape(value, depth) {
    if (value === null) return 'null';
    if (Array.isArray(value)) {
      return {
        list: value.length,
        item: value.length && depth < MAX_DEPTH ? shape(value[0], depth + 1) : undefined
      };
    }
    if (typeof value === 'object') {
      if (depth >= MAX_DEPTH) return 'object';
      var out = {};
      Object.keys(value).slice(0, 40).forEach(function (k) {
        out[k] = shape(value[k], depth + 1);
      });
      return out;
    }
    return typeof value;
  }

  function interesting(sh) {
    return KEYWORDS.test(JSON.stringify(sh));
  }

  function record(method, url, status, bodyText) {
    if (calls.length >= MAX_CALLS) return;
    var key = method + ' ' + path(url);
    var entry = { call: key, status: status };
    if (bodyText) {
      try {
        var sh = shape(JSON.parse(bodyText), 0);
        entry.shape = sh;
        entry.relevant = interesting(sh);
      } catch (e) {
        entry.shape = 'not JSON';
      }
    }
    var sig = key + '|' + status + '|' + JSON.stringify(entry.shape || '').slice(0, 200);
    if (seenCall[sig]) return;
    seenCall[sig] = true;
    calls.push(entry);
    refresh();
  }

  var origFetch = window.fetch;
  if (origFetch) {
    window.fetch = function (input, init) {
      var url = typeof input === 'string' ? input : (input && input.url) || '';
      var method = (init && init.method) || (input && input.method) || 'GET';
      return origFetch.apply(this, arguments).then(function (res) {
        try {
          var type = res.headers.get('content-type') || '';
          if (/json/i.test(type)) {
            res.clone().text().then(function (t) { record(method, url, res.status, t); });
          } else {
            record(method, url, res.status, null);
          }
        } catch (e) { /* ignore */ }
        return res;
      });
    };
  }

  var XHR = window.XMLHttpRequest;
  if (XHR) {
    var open = XHR.prototype.open;
    XHR.prototype.open = function (method, url) {
      this.__xf = { method: method, url: url };
      this.addEventListener('load', function () {
        try {
          var t = this.getResponseHeader('content-type') || '';
          var body = /json/i.test(t) && typeof this.responseText === 'string' ? this.responseText : null;
          record(this.__xf.method, this.__xf.url, this.status, body);
        } catch (e) { /* ignore */ }
      });
      return open.apply(this, arguments);
    };
  }

  function scanPage() {
    var links = {};
    var imgs = 0;
    var anchors = document.querySelectorAll('a[href]');
    Array.prototype.forEach.call(anchors, function (a) {
      var p;
      try { p = new URL(a.href, location.href).pathname; } catch (e) { return; }
      if (/course|product|lesson|categor|post|library|offer|community/i.test(p)) {
        var norm = p.replace(/[0-9a-f]{20,}/gi, ':id');
        links[norm] = (links[norm] || 0) + 1;
      }
    });
    imgs = document.querySelectorAll('img').length;
    var here = location.pathname.replace(/[0-9a-f]{20,}/gi, ':id');
    var already = pages.filter(function (p) { return p.page === here; })[0];
    var snap = { page: here, links: links, images: imgs, hasVideo: !!document.querySelector('video, iframe[src*="video"], iframe[src*="vimeo"], iframe[src*="youtube"], iframe[src*="wistia"]') };
    if (already) {
      pages[pages.indexOf(already)] = snap;
    } else {
      pages.push(snap);
    }
    refresh();
  }

  function onRoute() { setTimeout(scanPage, 1500); }
  ['pushState', 'replaceState'].forEach(function (fn) {
    var orig = history[fn];
    history[fn] = function () {
      var r = orig.apply(this, arguments);
      onRoute();
      return r;
    };
  });
  window.addEventListener('popstate', onRoute);
  window.addEventListener('load', onRoute);

  function globalsHint() {
    var names = [];
    try {
      Object.keys(window).forEach(function (k) {
        if (/ghl|highlevel|portal|membership|course|location|user|contact|store|app/i.test(k) && k.length < 40) names.push(k);
      });
    } catch (e) { /* ignore */ }
    return names.slice(0, 40);
  }

  function report() {
    var relevant = calls.filter(function (c) { return c.relevant; });
    return JSON.stringify({
      probe: 'xflix-1',
      when: new Date().toISOString(),
      page: location.pathname.replace(/[0-9a-f]{20,}/gi, ':id'),
      userAgent: navigator.userAgent,
      globals: globalsHint(),
      pages: pages,
      relevantCalls: relevant,
      otherCalls: calls.filter(function (c) { return !c.relevant; }).map(function (c) { return c.status + ' ' + c.call; })
    }, null, 2);
  }

  var btn, panel, area, tally;

  function ui() {
    if (btn) return;
    btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'XFlix probe';
    btn.setAttribute('style', 'position:fixed;left:12px;bottom:12px;z-index:2147483647;background:#FF7A1A;color:#1a0900;border:0;border-radius:6px;padding:8px 12px;font:600 13px system-ui,sans-serif;cursor:pointer');
    panel = document.createElement('div');
    panel.hidden = true;
    panel.setAttribute('style', 'position:fixed;left:12px;bottom:56px;z-index:2147483647;width:min(560px,calc(100vw - 24px));max-height:70vh;display:grid;gap:8px;background:#141418;color:#F5F1EA;border:1px solid #2A2A31;border-radius:8px;padding:12px;font:13px system-ui,sans-serif');
    tally = document.createElement('div');
    area = document.createElement('textarea');
    area.readOnly = true;
    area.setAttribute('style', 'width:100%;height:42vh;background:#0B0B0D;color:#F5F1EA;border:1px solid #2A2A31;border-radius:6px;font:12px ui-monospace,monospace;padding:8px;box-sizing:border-box');
    var copy = document.createElement('button');
    copy.type = 'button';
    copy.textContent = 'Copy report';
    copy.setAttribute('style', 'justify-self:start;background:#18C5BB;color:#03201e;border:0;border-radius:6px;padding:7px 12px;font:600 13px system-ui,sans-serif;cursor:pointer');
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
    btn.addEventListener('click', function () {
      panel.hidden = !panel.hidden;
      refresh();
    });
    panel.appendChild(tally);
    panel.appendChild(area);
    panel.appendChild(copy);
    document.body.appendChild(btn);
    document.body.appendChild(panel);
  }

  function refresh() {
    if (!document.body) return;
    ui();
    var rel = calls.filter(function (c) { return c.relevant; }).length;
    btn.textContent = 'XFlix probe · ' + rel + '/' + calls.length;
    if (!panel.hidden) {
      tally.textContent = rel + ' relevant API responses of ' + calls.length + ' seen, ' + pages.length + ' page(s) scanned. Browse a course, open a lesson, then copy.';
      area.value = report();
    }
  }

  window.__xflixProbe = { report: report, rescan: scanPage };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { ui(); scanPage(); });
  } else {
    ui();
    scanPage();
  }
})();
