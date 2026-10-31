# 番号付きの顔画像（ファイル名に含まれる最後の数字＝GENERALS_ALL.csv の番号）を取り込む
# 使い方: python3 tools/import-portraits-num.py <展開したフォルダ> <組の名>
import csv, glob, os, re, shutil, sys
from PIL import Image
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src, label = sys.argv[1], sys.argv[2]
num = {int(r['番号']): r['武将名'] for r in csv.DictReader(open(os.path.join(root, 'GENERALS_ALL.csv'), encoding='utf-8-sig'))}
rows, notes = [], []
for f in sorted(glob.glob(os.path.join(src, '**', '*.png'), recursive=True)):
    m = re.findall(r'(\d+)', os.path.splitext(os.path.basename(f))[0])
    if not m or int(m[-1]) not in num: notes.append(f'番号なし: {os.path.basename(f)}'); continue
    n = num[int(m[-1])]
    w, h = Image.open(f).size
    if abs(w * 5 - h * 4) > max(w, h) * 0.02: notes.append(f'比率が4:5でない: {os.path.basename(f)} {w}x{h}')
    dst = os.path.join(root, 'assets/portraits', n + '.png'); rep = os.path.exists(dst)
    shutil.copy(f, dst); rows.append(f"{n},{n}.png,{os.path.basename(f)},{label}（{'差し替え' if rep else '追加'}）")
mp = os.path.join(root, 'assets/portraits/mapping.csv')
L = open(mp, encoding='utf-8-sig').read().splitlines(); ns = {r.split(',')[0] for r in rows}
open(mp, 'w', encoding='utf-8-sig').write('\n'.join([L[0]] + [l for l in L[1:] if l.split(',')[0] not in ns] + rows) + '\n')
print(len(rows), 'imported:', ' '.join(r.split(',')[0] + ('*' if '差し替え' in r else '') for r in rows))
for x in notes: print(x)
