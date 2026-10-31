# 描き直しが必要な武将のリスト（失敗作＋顔なし）を GENERALS_ALL の番号順に PORTRAITS_REDRAW.txt / .csv へ
import csv, os
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
gen = list(csv.DictReader(open(os.path.join(root, 'GENERALS_ALL.csv'), encoding='utf-8-sig')))
failed = {r['武将名']: r['失敗の種類'] for r in csv.DictReader(open(os.path.join(root, 'PORTRAITS_FAILED.csv'), encoding='utf-8-sig'))}
have = {os.path.splitext(f)[0] for f in os.listdir(os.path.join(root, 'assets/portraits')) if f.endswith('.png')}
rows = []
for r in gen:
    n = r['武将名']
    why = f"失敗作（{failed[n]}）" if n in failed else ('顔なし' if n not in have else None)
    if why: rows.append((r, why))
with open(os.path.join(root, 'PORTRAITS_REDRAW.csv'), 'w', encoding='utf-8-sig') as f:
    f.write('番号,家,武将名,ファイル名,1560年の年齢,備考,理由\n')
    for r, why in rows:
        note = r['備考'] or (f"元服{r['元服']}年" if r['元服'] else '')
        age = r['1552年の年齢'] if r['備考'] else r['1560年の年齢']
        f.write(f"{r['番号']},{r['家（1560年）']},{r['武将名']},{r['ファイル名']},{age},{note},{why}\n")
nf = sum(1 for _, w in rows if w != '顔なし')
with open(os.path.join(root, 'PORTRAITS_REDRAW.txt'), 'w', encoding='utf-8') as f:
    f.write(f'描き直しが必要な武将 {len(rows)}人（失敗作 {nf}・顔なし {len(rows) - nf}）。番号とファイル名は GENERALS_ALL.csv と同じ\n書式: 番号 武将名（年齢）＊=顔なし\n\n')
    clan = None
    for r, why in rows:
        if r['家（1560年）'] != clan:
            clan = r['家（1560年）']; cnt = sum(1 for x, _ in rows if x['家（1560年）'] == clan)
            f.write(f'\n■ {clan}（{cnt}）\n')
        age = r['1552年の年齢'] if r['備考'] else r['1560年の年齢']
        f.write(f"{r['ファイル名'][:-4]}（{age}{'歳' if age.lstrip('-').isdigit() else ''}{'・1552' if r['備考'] else ''}）{'＊' if why == '顔なし' else ''}\n")
print(len(rows), nf)
