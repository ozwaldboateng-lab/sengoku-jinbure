# 地形の絵: assets/tiles/<種類><番号>.png を WebP にして src/data/tiles.ts へ埋め込む
# 地面（平地・森・丘・川・湿地・曲輪・本丸・城壁）はつなぎ目のない正方形、木立・城門・櫓・本丸の館は透明背景の置物
import base64, glob, io, os, re
from PIL import Image

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KEYS = {'平地': 'P', '森': 'F', '丘': 'H', '川': 'R', '湿地': 'S', '曲輪': 'C', '本丸': 'K', '城壁': 'W', '木立': 'tree',
        '城門閉': 'gate', '城門壊': 'gateBroken', '櫓': 'yagura', '本丸の館': 'keep'}
PROPS = {'tree', 'gate', 'gateBroken', 'yagura', 'keep'}  # 透明背景の置物
out = {}
for f in sorted(glob.glob(os.path.join(root, 'assets/tiles/*.png'))):
    m = re.match(r'(\D+)(\d*)$', os.path.splitext(os.path.basename(f))[0])
    key = KEYS.get(m.group(1)) if m else None
    if not key: continue
    im = Image.open(f)
    im = im.convert('RGBA' if key in PROPS else 'RGB').resize((256, 256), Image.LANCZOS)
    buf = io.BytesIO(); im.save(buf, 'WEBP', quality=80, method=6)
    out.setdefault(key, []).append('data:image/webp;base64,' + base64.b64encode(buf.getvalue()).decode())
with open(os.path.join(root, 'src/data/tiles.ts'), 'w', encoding='utf-8') as w:
    w.write('// 自動生成（tools/build-tiles.py）。地形の記号 → 絵（WebP）\n')
    w.write('export const TILE_ART: Record<string, string[]> = {\n')
    for k, v in out.items(): w.write(f"  {k}: [\n" + ''.join(f"    '{x}',\n" for x in v) + '  ],\n')
    w.write('};\n')
print({k: len(v) for k, v in out.items()}, sum(len(x) for v in out.values() for x in v) // 1024, 'KB')
