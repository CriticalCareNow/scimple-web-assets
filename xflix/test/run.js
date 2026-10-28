/*
 * XFlix test suite against a mock Client Portal.
 *
 * The mock imitates what the probe reports showed: the portal page calls the data service with a login
 * header; the data service rejects any request without that header. Nothing here touches GHL.
 *
 * Run:  NODE_PATH=$(npm root -g) node xflix/test/run.js          (needs playwright + chromium)
 * Screenshots:  SHOTS_DIR=/some/dir node xflix/test/run.js
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'xflix.js'), 'utf8');
const SECRET = 'Bearer SECRET-LEARNER-TOKEN-777';
const LOC = 'LOCABC123';
const API_ROOT = 'https://services.leadconnectorhq.com/clientportal-middleware';
const SHOTS = process.env.SHOTS_DIR || '';

/* ---------------------------------------------------------------- fixtures */

function img(n) { return 'https://img.test/p/' + n + '.svg'; }
function mod(id, title, seq, visibility) { return { id, title, sequenceNo: seq, visibility: visibility || 'published', dripDays: 0, metadata: null, lessonsCount: 0 }; }
function les(id, title, seq, o) {
  o = o || {};
  return {
    id, title, description: '', sequenceNo: seq, posterImage: img(o.img || seq), visibility: o.visibility || 'published',
    started: !!o.started, lockedByPost: null, lockedByCategory: null,
    asset_urls: { meta: { durationInSeconds: o.dur || 600 + seq * 90 }, thumbnailUrl: img(o.img || seq) }
  };
}

function world(kind) {
  if (kind === 'single') {
    return {
      library: [{ id: 'c1', title: 'The Crashing Airway', description: 'Intubating the patient who is already circling the drain, in six short lectures.', posterImage: img(2), libraryOrder: 0, courseStarted: true }],
      modules: { c1: [mod('a1', 'Module 1: Preparation', 1), mod('a2', 'Module 2: The Tube', 2)] },
      lessons: {
        a1: [les('s1', 'Before You Touch the Patient', 1, { started: true }), les('s2', 'The Shock Index Does Not Lie', 2), les('s3', 'Apneic Oxygenation, Done Right', 3)],
        a2: [les('s4', 'Plan B: The Failed First Pass', 1), les('s5', 'Blade Wars', 2)]
      },
      completed: { c1: { completedLessons: [{ lessonId: 's1' }], publishedPosts: 5 } },
      unlocked: { c1: { categoryUnlockedMap: { a1: { isUnlocked: true } }, postUnlockedMap: {}, dripCategoryUnlockedMap: {}, dripCategoryAvailableAtMap: {} } },
      sequence: { c1: { lastLessonId: 's2', lastLesson: { id: 's2', title: 'The Shock Index Does Not Lie', categoryId: 'a1', posterImage: img(5) }, lastLessonCategoryId: 'a1' } }
    };
  }
  return {
    library: [
      { id: 'c26', title: 'ResusX:2026', description: 'Three days of resuscitation, from airway to arrest. Lectures from the 2026 meeting.', posterImage: img(1), libraryOrder: 0, courseStarted: true },
      { id: 'c25', title: 'ResusX:2025', description: 'The 2025 meeting.', posterImage: img(3), libraryOrder: 1, courseStarted: true },
      { id: 'cw', title: 'Airway Workshop', description: 'Hands-on airway skills.', posterImage: img(4), libraryOrder: 2, courseStarted: false }
    ],
    modules: {
      c26: [mod('m1', 'Day 1 · Airway & Breathing', 1), mod('m2', 'Day 2 · Circulation & Shock', 2), mod('m3', 'Day 3 · Neuro & Tox', 3), mod('m4', 'Draft Folder', 4, 'draft'), mod('m5', 'Claiming Your CME', 5)],
      c25: [mod('n1', 'Day 1', 1), mod('n2', 'Day 2', 2), mod('n3', 'Hidden draft', 3, 'draft')],
      cw: [mod('w1', 'Workshop', 1)]
    },
    lessons: {
      m1: [les('l1', 'Driving Pressure for the PEEP-ple', 1), les('l2', 'The Crashing Airway', 2), les('l3', 'HFNC: Who Fails and When', 3, { started: true }), les('l4', 'Awake Intubation Without Fear', 4)],
      m2: [les('l5', 'Pressors in Plain English', 1), les('l6', 'Fluid Tolerance at the Bedside', 2), les('l7', 'Draft lecture', 3, { visibility: 'draft' })],
      m3: [les('l8', 'Status Epilepticus in 10', 1), les('l9', 'The Agitated Overdose', 2)],
      m4: [les('l11', 'Should never show', 1)],
      m5: [les('l10', 'Claim your credit', 1)],
      n1: [les('k1', 'Maybe It Is Not Just Sepsis', 1), les('k2', 'RV Failure for the Rest of Us', 2)],
      n2: [les('k3', 'ECMO in the ED', 1)],
      n3: [les('k4', 'Hidden', 1)],
      w1: [les('x1', 'Videolaryngoscopy Basics', 1), les('x2', 'Bougie Technique', 2)]
    },
    completed: {
      c26: { completedLessons: [{ lessonId: 'l1' }, { lessonId: 'l2' }], publishedPosts: 9 },
      c25: { completedLessons: ['k1'], publishedPosts: 3 },
      cw: { completedLessons: [], publishedPosts: 2 }
    },
    unlocked: {
      c26: { categoryUnlockedMap: { m1: { isUnlocked: true }, m2: { isUnlocked: true }, m3: { isUnlocked: false }, m5: { isUnlocked: false } }, postUnlockedMap: {}, dripCategoryUnlockedMap: {}, dripCategoryAvailableAtMap: {} },
      c25: { categoryUnlockedMap: {}, postUnlockedMap: {}, dripCategoryUnlockedMap: {}, dripCategoryAvailableAtMap: {} },
      cw: { categoryUnlockedMap: {}, postUnlockedMap: {}, dripCategoryUnlockedMap: {}, dripCategoryAvailableAtMap: {} }
    },
    sequence: {
      c26: { lastLessonId: 'l3', lastLesson: { id: 'l3', title: 'HFNC: Who Fails and When', categoryId: 'm1', posterImage: img(6) }, lastLessonCategoryId: 'm1' },
      c25: { lastLessonId: 'k1', lastLesson: { id: 'k1', title: 'Maybe It Is Not Just Sepsis', categoryId: 'n1', posterImage: img(7) }, lastLessonCategoryId: 'n1' },
      cw: {}
    }
  };
}

const PORTAL_HTML = `<!doctype html><html><head><meta charset="utf-8"><title>Mock portal</title></head><body style="font-family:sans-serif">
<h1 id="portal-ui">PORTAL UI <span id="p"></span></h1><a id="x" href="/courses">courses</a>
<script>
document.getElementById('p').textContent = location.pathname;
window.spaGo = function (p) { history.pushState(null, '', p); document.getElementById('p').textContent = p; };
if (location.pathname.indexOf('/courses') === 0 && location.search.indexOf('noapi=1') === -1) {
  fetch('${API_ROOT}/courses/learners/locations/${LOC}/courses/library', { headers: { Authorization: '${SECRET}', channel: 'APP' } }).catch(function () {});
}
</script></body></html>`;

function svg(n) {
  const hue = [20, 175, 28, 12, 190, 35, 160][n % 7];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 90"><defs><radialGradient id="g" cx="75%" cy="25%" r="80%"><stop offset="0" stop-color="hsl(${hue},85%,52%)"/><stop offset="1" stop-color="hsl(${hue},60%,12%)"/></radialGradient></defs><rect width="160" height="90" fill="url(#g)"/><circle cx="${40 + (n * 17) % 90}" cy="${30 + (n * 11) % 40}" r="22" fill="none" stroke="#fff" stroke-opacity=".18" stroke-width="1.2"/></svg>`;
}

/* ---------------------------------------------------------------- harness */

let passed = 0, failed = 0;
const failures = [];
function check(name, cond, extra) {
  if (cond) { passed++; console.log('  ok   ' + name); }
  else { failed++; failures.push(name); console.log('  FAIL ' + name + (extra !== undefined ? '  -> ' + JSON.stringify(extra) : '')); }
}

async function session(browser, o) {
  o = o || {};
  const w = o.world || world('multi');
  const ctx = await browser.newContext({ viewport: o.viewport || { width: 1400, height: 900 } });
  const page = await ctx.newPage();
  const requests = [];
  const hosts = new Set();
  const consoleMsgs = [];
  page.on('console', (m) => consoleMsgs.push(m.text()));
  page.on('pageerror', (e) => consoleMsgs.push('PAGEERROR ' + e.message));

  await page.route('**/*', async (route) => {
    const req = route.request();
    const u = new URL(req.url());
    hosts.add(u.host);
    if (u.host === 'portal.test') return route.fulfill({ status: 200, contentType: 'text/html', body: PORTAL_HTML });
    if (u.host === 'img.test') {
      const n = parseInt((u.pathname.match(/(\d+)\.svg/) || [0, 1])[1], 10);
      return route.fulfill({ status: 200, contentType: 'image/svg+xml', body: svg(n) });
    }
    if (/fonts\.(googleapis|gstatic)\.com$/.test(u.host)) return o.fonts ? route.continue() : route.fulfill({ status: 200, contentType: 'text/css', body: '' });
    if (u.host === 'claim.test') return route.fulfill({ status: 200, contentType: 'text/html', body: 'claim' });
    if (u.host !== 'services.leadconnectorhq.com') return route.fulfill({ status: 404, body: '' });

    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': req.headers()['access-control-request-headers'] || '*', 'access-control-allow-methods': 'GET,OPTIONS' };
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    const p = u.pathname.replace('/clientportal-middleware', '');
    const authOk = req.headers()['authorization'] === SECRET;
    requests.push({ method: req.method(), path: p, authOk });
    const json = (status, body) => route.fulfill({ status, headers: cors, contentType: 'application/json', body: JSON.stringify(body) });
    if (!authOk || o.deny) return json(401, { message: 'Unauthorized' });
    const base = '/courses/learners/locations/' + LOC + '/courses';
    if (p === base + '/library') return json(200, w.library);
    let m;
    if ((m = p.match(new RegExp('^' + base + '/([^/]+)/modules$')))) return json(200, { modules: w.modules[m[1]] || [], totalModules: (w.modules[m[1]] || []).length });
    if ((m = p.match(new RegExp('^' + base + '/([^/]+)/modules/([^/]+)/lessons$')))) {
      if (o.failModule && m[2] === o.failModule) return json(500, { message: 'boom' });
      return json(200, { lessons: w.lessons[m[2]] || [], totalLessons: (w.lessons[m[2]] || []).length });
    }
    if ((m = p.match(new RegExp('^' + base + '/([^/]+)/lessons/completed$')))) return json(200, w.completed[m[1]] || { completedLessons: [], publishedPosts: 0 });
    if ((m = p.match(new RegExp('^' + base + '/([^/]+)/unlocked-modules$')))) return json(200, w.unlocked[m[1]] || {});
    if ((m = p.match(new RegExp('^' + base + '/([^/]+)/lessons/sequence$')))) return json(200, w.sequence[m[1]] || {});
    return json(404, { message: 'not found' });
  });

  const cfg = Object.assign({ waitForAuthMs: 1500, fonts: !!o.fonts, cacheMs: 30000 }, o.config || {});
  await page.addInitScript({ content: 'window.XFLIX_CONFIG = ' + JSON.stringify(cfg) + ';\n' + SRC });
  return { ctx, page, requests, hosts, consoleMsgs };
}

const text = (page, sel) => page.locator(sel).allTextContents();
async function overlayOn(page) { return (await page.locator('#xflix-root').count()) > 0; }
async function onTop(page) {
  return page.evaluate(() => { const e = document.elementFromPoint(300, 400); return !!(e && e.closest('#xflix-root')); });
}
async function shot(page, name, full) {
  if (!SHOTS) return;
  fs.mkdirSync(SHOTS, { recursive: true });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(SHOTS, name) });
}

/* ---------------------------------------------------------------- tests */

(async () => {
  const browser = await chromium.launch();

  console.log('T1  multi-course home');
  {
    const s = await session(browser, { fonts: !!SHOTS });
    const p = s.page;
    await p.goto('https://portal.test/courses');
    await p.waitForSelector('#xflix-root .xf-tile');
    await p.waitForSelector('text=Continue watching');
    check('overlay covers the portal', await overlayOn(p) && await onTop(p));
    const heads = await text(p, '#xflix-root .xf-row-h h2');
    check('has Continue watching and Your courses rows', heads.includes('Continue watching') && heads.includes('Your courses'), heads);
    const names = await text(p, '#xflix-root .xf-title-tile .xf-name');
    check('two titles: ResusX (grouped seasons) and Airway Workshop', names.length === 2 && names.includes('ResusX') && names.includes('Airway Workshop'), names);
    check('ResusX tile says 2 seasons', (await p.locator('#xflix-root').innerText()).includes('2 seasons'));
    const cont = await p.locator('#xflix-root .xf-tile.started').evaluateAll((a) => a.map((x) => x.getAttribute('href')));
    check('continue-watching opens the last lecture in GHL', cont.includes('/courses/products/c26/modules/m1/lessons/l3') && cont.includes('/courses/products/c25/modules/n1/lessons/k1'), cont);
    const resume = await p.locator('#xflix-root .xf-hero .xf-btn.primary').getAttribute('href');
    check('hero Resume goes to the last lecture', resume === '/courses/products/c26/modules/m1/lessons/l3', resume);
    await shot(p, 'xflix-home.png');
    check('read-only: only GET requests', s.requests.every((r) => r.method === 'GET'), s.requests.filter((r) => r.method !== 'GET'));
    check('every data request carried the login header', s.requests.every((r) => r.authOk));
    check('only expected hosts contacted', [...s.hosts].every((h) => ['portal.test', 'img.test', 'services.leadconnectorhq.com', 'fonts.googleapis.com', 'fonts.gstatic.com'].includes(h)), [...s.hosts]);

    console.log('T2  title page: seasons, states, locks, drafts, claim CME');
    await p.locator('#xflix-root .xf-title-tile', { hasText: 'ResusX' }).first().click();
    await p.waitForSelector('#xflix-root .xf-row-h h2');
    await p.waitForFunction(() => document.querySelectorAll('#xflix-root .xf-row').length >= 4);
    check('hero title is ResusX', (await p.locator('#xflix-root .xf-h1').textContent()) === 'ResusX');
    check('season picker defaults to 2026 and offers 2025', (await p.locator('.xf-select').inputValue()) === 'c26' && (await p.locator('.xf-select option').allInnerTexts()).join() === 'Season 2026,Season 2025');
    const rows = await text(p, '#xflix-root .xf-row-h h2');
    check('4 visible folders, draft folder hidden', rows.length === 4 && !rows.some((r) => /Draft/.test(r)) && rows[0].startsWith('Day 1'), rows);
    const day1 = p.locator('#xflix-root .xf-row', { hasText: 'Day 1' });
    check('Day 1: 2 watched, 1 in progress, 1 new', (await day1.locator('.xf-tile.done').count()) === 2 && (await day1.locator('.xf-tile.started').count()) === 1 && (await day1.locator('.xf-tile.new').count()) === 1);
    check('Day 1 header says 2 of 4 watched', (await day1.innerText()).includes('2 of 4 watched'));
    check('draft lecture hidden (Day 2 has 2 tiles)', (await p.locator('#xflix-root .xf-row', { hasText: 'Day 2' }).locator('.xf-tile').count()) === 2);
    check('locked folders: 3 locked tiles, not links', (await p.locator('#xflix-root .xf-tile.is-locked').count()) === 3 && (await p.locator('#xflix-root a.xf-tile.is-locked').count()) === 0);
    check('locked folder explains itself', (await p.locator('#xflix-root').innerText()).includes('This folder is locked'));
    check('overall progress 2 of 9 lectures', (await p.locator('.xf-prog').innerText()).includes('2 of 9 lectures watched'), await p.locator('.xf-prog').innerText());
    check('Resume points at the last lecture', (await p.locator('.xf-hero .xf-btn.primary').getAttribute('href')) === '/courses/products/c26/modules/m1/lessons/l3');
    check('no Claim CME button when not configured', (await p.locator('#xflix-root .xf-btn.teal').count()) === 0);
    await shot(p, 'xflix-title.png');

    console.log('T3  switch season');
    await p.locator('.xf-select').selectOption('c25');
    await p.waitForFunction(() => /Day 2/.test(document.querySelector('#xflix-root').innerText) && !/Day 3/.test(document.querySelector('#xflix-root').innerText));
    const rows25 = await text(p, '#xflix-root .xf-row-h h2');
    check('2025: 2 folders, draft hidden', rows25.length === 2 && !rows25.some((r) => /Hidden/.test(r)), rows25);
    check('2025 completion (string ids) shows 1 of 3 watched', (await p.locator('.xf-prog').innerText()).includes('1 of 3 lectures watched'), await p.locator('.xf-prog').innerText());

    console.log('T4  open a lecture');
    await p.locator('.xf-select').selectOption('c26');
    await p.waitForSelector('#xflix-root a.xf-tile.done');
    await Promise.all([p.waitForURL('**/courses/products/c26/modules/m1/lessons/l1'), p.locator('#xflix-root a.xf-tile.done').first().click()]);
    check('lecture opens in the GHL lesson page', (await p.locator('#portal-ui').innerText()).includes('/courses/products/c26/modules/m1/lessons/l1'));
    check('overlay is gone on the lesson page', !(await overlayOn(p)));

    console.log('T11 no secrets leak');
    await p.goto('https://portal.test/courses');
    await p.waitForSelector('#xflix-root .xf-tile');
    const dump = await p.evaluate(() => {
      const root = document.getElementById('xflix-root');
      return (root ? root.outerHTML : '') + JSON.stringify(localStorage) + JSON.stringify(sessionStorage) + JSON.stringify(window.__xflix) + document.title;
    });
    check('login header not in XFlix page content, storage or its exposed state', !dump.includes('SECRET-LEARNER') && dump.length > 500, dump.length);
    check('login header not in console output', !s.consoleMsgs.join('\n').includes('SECRET-LEARNER'));
    check('no script errors', !s.consoleMsgs.some((m) => m.startsWith('PAGEERROR')), s.consoleMsgs.filter((m) => m.startsWith('PAGEERROR')));
    await s.ctx.close();
  }

  console.log('T2b claim CME links and hero images from config');
  {
    const s = await session(browser, { fonts: !!SHOTS, config: { claimCme: { 'ResusX:2026': { 'Day 1 · Airway & Breathing': 'https://claim.test/day1', '*': 'https://claim.test/all' }, 'ResusX:2025': { 'Day 1': 'javascript:alert(1)' } } } });
    const p = s.page;
    await p.goto('https://portal.test/courses');
    await p.waitForSelector('#xflix-root .xf-title-tile');
    await p.locator('#xflix-root .xf-title-tile', { hasText: 'ResusX' }).first().click();
    await p.waitForFunction(() => document.querySelectorAll('#xflix-root .xf-row').length >= 4);
    const day1 = p.locator('#xflix-root .xf-row', { hasText: 'Day 1' }).locator('a.xf-btn.teal');
    check('Day 1 row has Claim CME link', (await day1.getAttribute('href')) === 'https://claim.test/day1');
    check('course-level Claim CME button in hero', (await p.locator('.xf-hero a.xf-btn.teal').getAttribute('href')) === 'https://claim.test/all');
    if (SHOTS) {
      await p.evaluate(() => { document.getElementById('xflix-root').scrollTop = 560; });
      await p.mouse.move(1300, 60);
      await shot(p, 'xflix-locked.png');
    }
    await p.locator('.xf-select').selectOption('c25');
    await p.waitForFunction(() => !/Day 3/.test(document.querySelector('#xflix-root').innerText));
    check('unsafe claim link (javascript:) is ignored', (await p.locator('#xflix-root a.xf-btn.teal').count()) === 0);
    await s.ctx.close();
  }

  console.log('T5  single course opens straight to the course');
  {
    const s = await session(browser, { world: world('single'), fonts: !!SHOTS });
    const p = s.page;
    await p.goto('https://portal.test/courses');
    await p.waitForSelector('#xflix-root .xf-h1');
    await p.waitForFunction(() => document.querySelectorAll('#xflix-root .xf-row').length >= 2);
    check('goes straight to the course (no library)', (await p.locator('#xflix-root .xf-h1').textContent()) === 'The Crashing Airway' && (await p.locator('.xf-back').count()) === 0);
    check('no Home link or season picker for a single course', (await p.locator('.xf-nav button').count()) === 0 && (await p.locator('.xf-select').count()) === 0);
    check('2 folder rows with progress 1 of 5', (await p.locator('#xflix-root .xf-row-h h2').count()) === 2 && (await p.locator('.xf-prog').innerText()).includes('1 of 5'));
    await shot(p, 'xflix-single.png');
    await s.ctx.close();
  }

  console.log('T6  data service refuses (401), no catalog: steps aside');
  {
    const s = await session(browser, { deny: true });
    const p = s.page;
    await p.goto('https://portal.test/courses');
    await p.waitForFunction(() => !document.getElementById('xflix-root'), null, { timeout: 8000 });
    check('overlay removed, portal visible', !(await overlayOn(p)) && (await p.locator('#portal-ui').isVisible()));
    check('page scroll restored', (await p.evaluate(() => document.documentElement.style.overflow)) === '');
    await s.ctx.close();
  }

  console.log('T7  data service refuses (401), saved catalog is used');
  {
    const cat = { courses: [{ id: 'c26', title: 'ResusX:2026', description: 'Saved catalog.', poster: img(1), modules: [{ id: 'm1', title: 'Day 1', lessons: [{ id: 'l1', title: 'Lecture one', poster: img(2), duration: 1200 }, { id: 'l2', title: 'Lecture two', poster: img(3), duration: 900 }] }] }] };
    const s = await session(browser, { deny: true, config: { catalog: cat }, fonts: !!SHOTS });
    const p = s.page;
    await p.goto('https://portal.test/courses');
    await p.waitForSelector('#xflix-root .xf-tile');
    const t = await p.locator('#xflix-root').innerText();
    check('saved catalog renders the course page', t.includes('Day 1') && t.includes('Lecture one'));
    check('no personal progress or locks in catalog mode', !t.includes('watched') && (await p.locator('.xf-tile.is-locked').count()) === 0 && (await p.locator('.xf-state').count()) === 0);
    const href = await p.locator('#xflix-root a.xf-tile').first().getAttribute('href');
    check('catalog tiles still link to the GHL lesson', href === '/courses/products/c26/modules/m1/lessons/l1', href);
    await shot(p, 'xflix-catalog.png');
    await s.ctx.close();
  }

  console.log('T8  portal never makes a data request: steps aside');
  {
    const s = await session(browser);
    const p = s.page;
    await p.goto('https://portal.test/courses?noapi=1');
    await p.waitForFunction(() => !document.getElementById('xflix-root') || document.querySelector('#xflix-root [aria-busy]') === null ? true : false, null, { timeout: 8000 }).catch(() => {});
    await p.waitForTimeout(2200);
    check('no overlay left behind when no login header is ever seen', !(await overlayOn(p)) && (await p.locator('#portal-ui').isVisible()));
    await s.ctx.close();
  }

  console.log('T9  kill switch');
  {
    const s = await session(browser);
    const p = s.page;
    await p.goto('https://portal.test/courses?xflix=off');
    await p.waitForTimeout(1200);
    check('?xflix=off disables XFlix', !(await overlayOn(p)));
    await p.goto('https://portal.test/courses');
    await p.waitForTimeout(1200);
    check('stays off for the rest of the tab session', !(await overlayOn(p)));
    await p.goto('https://portal.test/courses?xflix=on');
    await p.waitForSelector('#xflix-root .xf-tile');
    check('?xflix=on turns it back on', await overlayOn(p));
    await s.ctx.close();
  }

  console.log('T10 route changes inside the portal (single-page navigation)');
  {
    const s = await session(browser);
    const p = s.page;
    await p.goto('https://portal.test/courses');
    await p.waitForSelector('#xflix-root .xf-tile');
    await p.evaluate(() => window.spaGo('/courses/products/c26'));
    await p.waitForFunction(() => !document.getElementById('xflix-root'), null, { timeout: 3000 });
    check('overlay hides on a course page', true);
    await p.evaluate(() => window.spaGo('/courses'));
    await p.waitForSelector('#xflix-root .xf-tile', { timeout: 5000 });
    check('overlay returns on the course list', await overlayOn(p));
    await s.ctx.close();
  }

  console.log('T15 one folder fails to load');
  {
    const s = await session(browser, { failModule: 'm2' });
    const p = s.page;
    await p.goto('https://portal.test/courses');
    await p.waitForSelector('#xflix-root .xf-title-tile');
    await p.locator('#xflix-root .xf-title-tile', { hasText: 'ResusX' }).first().click();
    await p.waitForFunction(() => document.querySelectorAll('#xflix-root .xf-row').length >= 4);
    const t = await p.locator('#xflix-root').innerText();
    check('failed folder shows a message, other folders still load', t.includes('could not be loaded here') && t.includes('Day 1') && t.includes('Driving Pressure'));
    await s.ctx.close();
  }

  console.log('T13 phone width');
  {
    const s = await session(browser, { viewport: { width: 390, height: 844 }, fonts: !!SHOTS });
    const p = s.page;
    await p.goto('https://portal.test/courses');
    await p.waitForSelector('#xflix-root .xf-title-tile');
    await p.locator('#xflix-root .xf-title-tile', { hasText: 'ResusX' }).first().click();
    await p.waitForFunction(() => document.querySelectorAll('#xflix-root .xf-row').length >= 4);
    const ov = await p.evaluate(() => { const r = document.getElementById('xflix-root'); return { sw: r.scrollWidth, cw: r.clientWidth }; });
    check('no sideways page scroll at 390px', ov.sw <= ov.cw + 1, ov);
    await shot(p, 'xflix-mobile.png');
    await s.ctx.close();
  }

  console.log('T14 catalog export helper');
  {
    const s = await session(browser);
    const p = s.page;
    await p.goto('https://portal.test/courses?xflix=export');
    await p.waitForSelector('#xflix-root .xf-top .xf-btn.teal');
    await p.locator('#xflix-root .xf-top .xf-btn.teal').click();
    await p.waitForSelector('.xf-modal textarea');
    const out = await p.locator('.xf-modal textarea').inputValue();
    const j = JSON.parse(out);
    check('export lists courses, folders and lectures', j.courses.length === 3 && j.courses[0].modules.length === 4 && j.courses[0].modules[0].lessons.length === 4, j.courses.map((c) => c.modules.length));
    check('export omits draft folders and has no login data', !/Draft Folder|Should never show/.test(out) && !out.includes('SECRET-LEARNER'));
    await s.ctx.close();
  }

  await browser.close();
  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  if (failed) { console.log('Failed: ' + failures.join(' | ')); process.exit(1); }
})().catch((e) => { console.error(e); process.exit(2); });
