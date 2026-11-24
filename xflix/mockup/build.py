"""Builds xflix-mockup.html: the real xflix.js running against a fake GHL data service with sample ResusX content.
Usage: python3 build.py <assets_dir> <out_html>
Make the assets first:  python3 make_assets.py <assets_dir>"""
import sys, os, base64

here = os.path.dirname(os.path.abspath(__file__))
assets, out = sys.argv[1], sys.argv[2]

def b64(name):
    with open(os.path.join(assets, name), 'rb') as f:
        return base64.b64encode(f.read()).decode('ascii')

src = open(os.path.join(here, 'mockup.src.html'), encoding='utf-8').read()
js = open(os.path.join(here, '..', 'xflix.js'), encoding='utf-8').read()
assert '</script' not in js.lower(), 'xflix.js must not contain a closing script tag'

for key, name in (('__IMG_PEEP__', 'peep.jpg'), ('__IMG_THYROID__', 'thyroid.jpg'), ('__IMG_ROUNDS__', 'rounds.jpg'),
                  ('__IMG_BANNER_RESUSX__', 'banner-resusx.jpg'), ('__IMG_BANNER_ROUNDS__', 'banner-rounds.jpg')):
    assert key in src, key
    src = src.replace(key, b64(name))
import json
thumbs = {}
for f in sorted(os.listdir(assets)):
    if f.startswith('t-') and f.endswith('.jpg'):
        thumbs[f[2:-4]] = 'data:image/jpeg;base64,' + b64(f)
assert '/*THUMB_DATA*/{}' in src
src = src.replace('/*THUMB_DATA*/{}', json.dumps(thumbs))
src = src.replace('/*XFLIX_JS*/', js)
open(out, 'w', encoding='utf-8').write(src)
print(out, round(os.path.getsize(out) / 1024), 'KB')
