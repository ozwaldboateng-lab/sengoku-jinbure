# 顔画像がまだない武将の一覧（GENERALS_ALL の番号つきファイル名）: PORTRAITS_FACELESS.txt / .csv
# 先に tools/portraits-todo.py と tools/generals-list.py を実行しておく
import csv, os
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
p = lambda f: os.path.join(root, f)
rows = list(csv.DictReader(open(p('GENERALS_ALL.csv'), encoding='utf-8-sig')))
todo = {r['id'] for r in csv.DictReader(open(p('PORTRAITS_TODO.csv'), encoding='utf-8-sig'))}
sel = [r for r in rows if r['id'] in todo]
H = '家（1560年）'
note = lambda r: '・'.join(x for x in (r['元服'] and f"{r['元服']}年元服", r['備考']) if x)
with open(p('PORTRAITS_FACELESS.csv'), 'w', encoding='utf-8-sig', newline='') as f:
    w = csv.writer(f); w.writerow(['番号', '家', '武将名', 'ファイル名', '生年', '1560年の年齢', '備考'])
    for r in sel: w.writerow([r['番号'], r[H], r['武将名'], r['ファイル名'], r['生年'], r['1560年の年齢'], note(r)])
with open(p('PORTRAITS_FACELESS.txt'), 'w', encoding='utf-8') as f:
    f.write(f'顔画像がまだない武将 {len(sel)}人（番号は GENERALS_ALL のもの。名前で取り込むので番号がずれても可）\n仕様: 320×400（横×縦）・1人1枚・縁は黒のグラデーション\n')
    cur = None
    for r in sel:
        if r[H] != cur: cur = r[H]; f.write(f'\n■ {cur or "（1552年のみ・その他）"}\n')
        n = note(r); f.write(f"{r['ファイル名']}　{r['生年']}年生{('　' + n) if n else ''}\n")
print('faceless', len(sel))
