# 汎用の場面絵（SCENES_ORDER_GENERIC.txt の16枚）を取り込む: 番号で名前を決め、960×540 の WebP に縮めて assets/scenes/ に置き、src/data/sceneArt.ts を作り直す
# 使い方: python3 tools/import-scenes.py <絵のあるフォルダ>   （ファイル名の先頭が「01_」〜「16_」）
import base64, os, re, sys
from PIL import Image
KEYS = {1: 'fire_castle', 2: 'night_fire', 3: 'zashiki_day', 4: 'zashiki_night', 5: 'chashitsu', 6: 'hondo', 7: 'senjo', 8: 'yukimichi',
        9: 'minato', 10: 'ichi', 11: 'ishigaki', 12: 'tsukiyo', 13: 'gosho', 14: 'mura', 15: 'jinmaku', 16: 'amemichi'}
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out = os.path.join(root, 'assets', 'scenes')
os.makedirs(out, exist_ok=True)
if len(sys.argv) > 1:
    for f in sorted(os.listdir(sys.argv[1])):
        m = re.match(r'(\d+)_', f)
        if not m or int(m.group(1)) not in KEYS or not re.search(r'\.(png|jpe?g|webp)$', f, re.I): continue
        k = KEYS[int(m.group(1))]
        im = Image.open(os.path.join(sys.argv[1], f)).convert('RGB')
        w, h = im.size; th = round(w * 9 / 16)
        if th < h: im = im.crop((0, (h - th) // 2, w, (h - th) // 2 + th))  # 16:9 に揃える
        im = im.resize((960, 540), Image.LANCZOS)
        done = False
        for size in ((960, 540), (800, 450), (704, 396)):  # 1枚 70KB までに収める（1枚の HTML の容量のため）。細かい絵は少し小さくする
            im2 = im.resize(size, Image.LANCZOS) if size != (960, 540) else im
            for q in (60, 52, 45, 38):
                im2.save(os.path.join(out, f'{k}.webp'), 'WEBP', quality=q, method=6)
                if os.path.getsize(os.path.join(out, f'{k}.webp')) <= 70000: done = True; break
            if done: break
        print('imported', f, '->', k)
lines = ['// 汎用の場面絵（assets/scenes/*.webp を埋め込んだもの。tools/import-scenes.py が作る）', 'export const SCENE_ART: Record<string, string> = {']
for k in KEYS.values():
    p = os.path.join(out, f'{k}.webp')
    if os.path.exists(p): lines.append(f"  {k}: 'data:image/webp;base64,{base64.b64encode(open(p, 'rb').read()).decode()}',")
lines.append('};')
open(os.path.join(root, 'src', 'data', 'sceneArt.ts'), 'w').write('\n'.join(lines) + '\n')
print('sceneArt:', sum(1 for k in KEYS.values() if os.path.exists(os.path.join(out, f'{k}.webp'))), 'images')
