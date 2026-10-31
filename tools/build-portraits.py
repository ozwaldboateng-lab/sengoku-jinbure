# 顔画像: assets/portraits/<武将名>.png（320×400 以上、縦横比4:5）を 200×250 の WebP にして src/data/portraits.ts へ埋め込む
import base64, glob, io, os, re, sys
from PIL import Image

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
roster = ''.join(open(os.path.join(root, f), encoding='utf-8').read() for f in ('src/data/roster.ts', 'src/data/scenarios.ts', 'src/data/s1582.ts', 'src/data/nanban.ts', 'src/data/envoys.ts', 'src/data/korea.ts'))
ids = {name: gid for gid, name in re.findall(r"\['([a-z0-9_]+)', '([^']+)', '[a-z_]*', \d+", roster)}
out, missing = [], []
for f in sorted(glob.glob(os.path.join(root, 'assets/portraits/*.png'))):
    name = os.path.splitext(os.path.basename(f))[0]
    gid = ids.get(name)
    if not gid:
        missing.append(name); continue
    im = Image.open(f).convert('RGB').resize((200, 250), Image.LANCZOS)
    buf = io.BytesIO(); im.save(buf, 'WEBP', quality=80, method=6)
    out.append((gid, name, base64.b64encode(buf.getvalue()).decode()))
with open(os.path.join(root, 'src/data/portraits.ts'), 'w', encoding='utf-8') as w:
    w.write('// 自動生成（tools/build-portraits.py）。武将id → 顔画像（200×250 WebP）\n')
    w.write('export const PORTRAITS: Record<string, string> = {\n')
    for gid, name, b64 in out: w.write(f"  {gid}: 'data:image/webp;base64,{b64}', // {name}\n")
    w.write('};\n')
total = sum(len(b) for _, _, b in out)
print(f'{len(out)} portraits, {total // 1024}KB base64', 'missing:', missing)
