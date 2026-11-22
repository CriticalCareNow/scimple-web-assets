/* Renders placeholder title-card thumbnails (ResusX ember look, no faces) for the mockup.
 * Usage: NODE_PATH=$(npm root -g) node make_thumbs.js <assets_dir>   (needs banner-*.jpg from make_assets.py) */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const dir = process.argv[2];
const uri = (f) => 'data:image/jpeg;base64,' + fs.readFileSync(path.join(dir, f)).toString('base64');

const LECTURES = [
  ['l2', 'HFNC: Who Fails and When', 'RESUSX 2026'], ['l3', 'Awake Intubation Without Fear', 'RESUSX 2026'], ['l4', 'Post-Intubation Hypotension', 'RESUSX 2026'],
  ['l5', 'The Crashing Airway', 'RESUSX 2026'], ['l7', 'Pressors in Plain English', 'RESUSX 2026'], ['l8', 'Fluid Tolerance at the Bedside', 'RESUSX 2026'],
  ['l9', 'RV Failure for the Rest of Us', 'RESUSX 2026'], ['l10', 'ECMO in the ED', 'RESUSX 2026'], ['l11', 'Status Epilepticus in 10', 'RESUSX 2026'],
  ['l12', 'The Agitated Overdose', 'RESUSX 2026'], ['l13', 'ICH: Pressure and Reversal', 'RESUSX 2026'], ['l14', 'Brain Death Basics', 'RESUSX 2026'],
  ['l15', 'Claim your credit', 'RESUSX 2026'],
  ['p1', 'Ventilator Basics, Done Right', 'RESUSX 2025'], ['p2', 'Asthma on the Vent', 'RESUSX 2025'], ['p3', 'NIV: When to Push and When to Stop', 'RESUSX 2025'],
  ['p4', 'Video Laryngoscopy Pearls', 'RESUSX 2025'], ['p5', 'Septic Shock Beyond the Bundle', 'RESUSX 2025'], ['p6', 'Vasopressin and Friends', 'RESUSX 2025'],
  ['p7', 'POCUS for the Hypotensive Patient', 'RESUSX 2025'], ['p8', 'Cardiogenic Shock Pathways', 'RESUSX 2025'], ['p9', 'Stop Doing CPR Wrong', 'RESUSX 2025'],
  ['p10', 'ECPR: Who Benefits', 'RESUSX 2025'], ['p11', 'After ROSC: The First Hour', 'RESUSX 2025'],
  ['r2', 'Traumatic Arrest: Where ACLS Falls Short', 'ROUNDS'], ['r3', 'Undifferentiated Shock', 'ROUNDS'], ['r4', 'Blood Shortages: What Now?', 'ROUNDS'],
  ['r5', 'Decongestion: How Hard to Push', 'ROUNDS'], ['r6', 'Pre-hospital Blood Works', 'ROUNDS']
];

function html(id, title, series, i) {
  const rounds = series === 'ROUNDS';
  const bg = uri(rounds ? 'banner-rounds.jpg' : 'banner-resusx.jpg');
  const words = title.split(' ');
  const k = words.length <= 2 ? 1 : Math.ceil(words.length / 2);
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const pos = (62 + ((i * 29) % 39)) + '% ' + (15 + ((i * 53) % 70)) + '%';
  return `<link href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@900&family=Instrument+Sans:wght@700&display=swap" rel="stylesheet">
<style>body{margin:0;background:#000}
#t{width:480px;height:270px;position:relative;overflow:hidden;background:#0B0B0D url(${bg});background-size:1150px auto;background-position:${pos}}
#t::before{content:"";position:absolute;inset:0;background:linear-gradient(0deg,rgba(8,5,4,.78) 0%,rgba(8,5,4,0) 62%),linear-gradient(90deg,rgba(8,5,4,.72) 0%,rgba(8,5,4,.28) 60%,rgba(8,5,4,0) 100%)}
.tag{position:absolute;left:66px;top:16px;font:900 25px/1 'Big Shoulders Display',Impact,sans-serif;letter-spacing:.04em;color:${rounds ? '#5EE6DB' : '#FFB45A'}}
.tag b{color:#fff;font-weight:900}
.title{position:absolute;left:20px;right:34px;bottom:22px;font:700 33px/1.06 'Instrument Sans',Arial,sans-serif;filter:drop-shadow(0 2px 8px rgba(0,0,0,.85))}
.w{color:#fff}.g{background:linear-gradient(180deg,${rounds ? '#c9fff9,#5ee6db 60%,#18C5BB' : '#ffeab8,#ffb040 55%,#ff8a1f'});-webkit-background-clip:text;background-clip:text;color:transparent}
</style><div id="t"><div class="tag">RESUSX <b>${series.replace('RESUSX ', '')}</b></div>
<div class="title"><span class="w">${esc(words.slice(0, k).join(' '))}</span> <span class="g">${esc(words.slice(k).join(' '))}</span></div></div>`;
}

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 480, height: 270 } });
  for (let i = 0; i < LECTURES.length; i++) {
    const [id, title, series] = LECTURES[i];
    await p.setContent(html(id, title, series, i), { waitUntil: 'networkidle' });
    await p.evaluate(async () => { await document.fonts.load('700 33px "Instrument Sans"'); await document.fonts.load('900 25px "Big Shoulders Display"'); await document.fonts.ready; });
    await p.locator('#t').screenshot({ path: path.join(dir, 't-' + id + '.jpg'), type: 'jpeg', quality: 72 });
  }
  await b.close();
  const total = fs.readdirSync(dir).filter((f) => f.startsWith('t-')).reduce((n, f) => n + fs.statSync(path.join(dir, f)).size, 0);
  console.log(LECTURES.length + ' thumbnails, ' + Math.round(total / 1024) + ' KB');
})();
