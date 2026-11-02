# 届いた顔画像（<番号>_<武将名>.png）を名簿の名で assets/portraits へ取り込む。名簿にない名は取り込まず表示する
# 使い方: python3 tools/import-portraits.py <展開したフォルダ> <組の名>
import glob, os, re, shutil, sys
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src, label = sys.argv[1], sys.argv[2]
R = ''.join(open(os.path.join(root, p), encoding='utf-8').read() for p in ('src/data/roster.ts', 'src/data/scenarios.ts', 'src/data/s1582.ts', 'src/data/nanban.ts', 'src/data/envoys.ts', 'src/data/korea.ts', 'src/data/opening.ts'))
names = set(re.findall(r"\['\w+', '([^']+)', '\w*', \d+", R))
rows, bad = [], []
for f in sorted(glob.glob(os.path.join(src, '**', '*.png'), recursive=True)):
    m = re.match(r'^\d+_(.+)$', os.path.splitext(os.path.basename(f))[0])
    if not m: continue
    n = m.group(1)
    if n not in names: bad.append(n); continue
    dst = os.path.join(root, 'assets/portraits', n + '.png'); rep = os.path.exists(dst)
    shutil.copy(f, dst); rows.append(f"{n},{n}.png,{os.path.basename(f)},{label}（{'差し替え' if rep else '追加'}）")
mp = os.path.join(root, 'assets/portraits/mapping.csv')
L = open(mp, encoding='utf-8-sig').read().splitlines(); ns = {r.split(',')[0] for r in rows}
open(mp, 'w', encoding='utf-8-sig').write('\n'.join([L[0]] + [l for l in L[1:] if l.split(',')[0] not in ns] + rows) + '\n')
# 取り込んだ武将は失敗作のリストから外す
fp = os.path.join(root, 'PORTRAITS_FAILED.csv')
if os.path.exists(fp):
    F = open(fp, encoding='utf-8-sig').read().splitlines()
    keep = [F[0]] + [l for l in F[1:] if l.split(',')[2] not in ns]
    open(fp, 'w', encoding='utf-8-sig').write('\n'.join(keep) + '\n')
    print('failed list:', len(F) - 1, '->', len(keep) - 1)
print(len(rows), 'imported', ('replaced: ' + ' '.join(r.split(',')[0] for r in rows if '差し替え' in r)) if any('差し替え' in r for r in rows) else '', 'not in roster:', bad)
