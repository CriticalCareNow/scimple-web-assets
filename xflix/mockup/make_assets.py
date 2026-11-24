"""Builds the images used by the XFlix mockup: three real ResusX thumbnails (resized) and two generated banners.
Usage: python3 make_assets.py <out_dir>"""
import sys, os, math, random, base64, glob
from PIL import Image, ImageDraw, ImageFilter, ImageChops

out = sys.argv[1]
os.makedirs(out, exist_ok=True)
skills = glob.glob('/root/.claude/skills/synced/*/')[0]

def thumb(src, name):
    im = Image.open(src).convert('RGB')
    im = im.resize((640, 360), Image.LANCZOS)
    im.save(os.path.join(out, name + '.jpg'), 'JPEG', quality=78, optimize=True)

thumb(glob.glob(skills + 'resusx-gold-thumbnail/assets/*.jpeg')[0], 'peep')
thumb(glob.glob(skills + 'resusx2026-thumbnail/assets/*.jpeg')[0], 'thyroid')
thumb(glob.glob(skills + 'resusx-rounds-ads/assets/resusx-rounds-template-horizontal.png')[0], 'rounds')

def ember(w, h, seed, glow_rgb=(255, 110, 20), core_rgb=(255, 175, 70), spark_n=1100):
    random.seed(seed)
    base = Image.new('RGB', (w, h), (10, 6, 5))
    glow = Image.new('RGB', (w, h), (0, 0, 0))
    d = ImageDraw.Draw(glow)
    d.ellipse((w * 0.50, -h * 0.25, w * 1.30, h * 1.00), fill=glow_rgb)
    d.ellipse((w * 0.66, h * 0.08, w * 1.12, h * 0.85), fill=core_rgb)
    glow = glow.filter(ImageFilter.GaussianBlur(h * 0.20)).point(lambda v: int(v * 0.62))
    img = ImageChops.add(base, glow)
    sw = Image.new('RGB', (w, h), (0, 0, 0))
    ds = ImageDraw.Draw(sw)
    pts = []
    for t in range(0, 121):
        u = t / 120
        pts.append((w * (0.22 + 0.85 * u), h * (0.98 - 0.62 * math.sin(u * math.pi * 0.92) + 0.06 * math.sin(u * 9))))
    for width, a in ((34, .30), (14, .55), (5, .85), (2, 1.0)):
        ds.line(pts, fill=(int(255 * a), int(165 * a), int(55 * a)), width=width)
    img = ImageChops.add(img, sw.filter(ImageFilter.GaussianBlur(6)))
    sp = Image.new('RGB', (w, h), (0, 0, 0))
    dp = ImageDraw.Draw(sp)
    for _ in range(spark_n):
        x = w * (0.18 + 0.9 * random.random() ** 0.9)
        y = h * random.random()
        r = random.choice((0.8, 1.0, 1.4, 2.0, 2.8, 3.6))
        k = random.random() ** 1.6
        col = random.choice(((255, 200, 90), (255, 140, 40), (255, 235, 170)))
        c = tuple(int(v * (0.35 + 0.65 * k)) for v in col)
        dp.ellipse((x - r, y - r, x + r, y + r), fill=c)
    img = ImageChops.add(img, sp.filter(ImageFilter.GaussianBlur(0.9)))
    return img

ember(1600, 700, 7).save(os.path.join(out, 'banner-resusx.jpg'), 'JPEG', quality=80, optimize=True)
ember(1600, 700, 21, glow_rgb=(20, 150, 140), core_rgb=(60, 220, 205), spark_n=700).save(os.path.join(out, 'banner-rounds.jpg'), 'JPEG', quality=80, optimize=True)
for f in sorted(os.listdir(out)):
    print(f, os.path.getsize(os.path.join(out, f)) // 1024, 'KB')
