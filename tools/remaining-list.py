# 顔画像の残り: 顔なし（未割当）と、不具合のある顔（描き直し）を一つにまとめる。番号・ファイル名は今の GENERALS_ALL に合わせる
import csv, os
from collections import OrderedDict
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
p = lambda f: os.path.join(root, f)
gen = list(csv.DictReader(open(p('GENERALS_ALL.csv'), encoding='utf-8-sig')))
byname = {r['武将名']: r for r in gen}
faceless = list(csv.DictReader(open(p('PORTRAITS_FACELESS.csv'), encoding='utf-8-sig')))
failed = [r for r in csv.DictReader(open(p('PORTRAITS_FAILED.csv'), encoding='utf-8-sig')) if r['武将名'] in byname]
fail_names = {r['武将名'] for r in failed}
rows = []
for r in faceless:
    g = byname.get(r['武将名'], r)
    rows.append(('顔なし', g['家（1560年）'] if '家（1560年）' in g else r['家'], g['ファイル名'], r['武将名'], g.get('生年', ''), g.get('1560年の年齢', ''), (g.get('元服') or '') and f"{g['元服']}年元服", r.get('備考', '')))
for r in failed:
    g = byname[r['武将名']]
    rows.append(('不具合', g['家（1560年）'], g['ファイル名'], r['武将名'], g['生年'], g['1560年の年齢'], r['失敗の種類'], ''))
with open(p('PORTRAITS_REMAINING.csv'), 'w', encoding='utf-8-sig', newline='') as f:
    w = csv.writer(f); w.writerow(['区分', '家', 'ファイル名', '武将名', '生年', '1560年の年齢', '元服・不具合の種類', '備考']); w.writerows(rows)
nf, nb = sum(1 for r in rows if r[0] == '顔なし'), sum(1 for r in rows if r[0] == '不具合')
with open(p('PORTRAITS_REMAINING.txt'), 'w', encoding='utf-8') as f:
    f.write(f'顔画像の残り {nf + nb}人（顔なし {nf}・不具合 {nb}）\n仕様: 320×400（横×縦）・縦横比4:5のまま・1人1枚・縁は黒のグラデーション。ファイル名は「番号_武将名.png」（名前で取り込むので番号がずれても可）\n')
    for kind, title in (('顔なし', '一、顔なし（画像が未割当）'), ('不具合', '二、不具合のある顔（描き直し）')):
        sub = [r for r in rows if r[0] == kind]
        f.write(f'\n━━ {title} {len(sub)}人 ━━\n')
        if kind == '不具合':
            cnt = OrderedDict()
            for r in sub: cnt[r[6]] = cnt.get(r[6], 0) + 1
            f.write('　内訳: ' + '・'.join(f'{k} {v}' for k, v in sorted(cnt.items(), key=lambda x: -x[1])) + '\n')
        clans = OrderedDict()
        for r in sub: clans.setdefault(r[1] or '在野', []).append(r)
        for c, rs in clans.items():
            f.write(f'\n■ {c}（{len(rs)}）\n')
            for r in rs:
                extra = r[6] if kind == '不具合' else '　'.join(dict.fromkeys(x for x in (f'{r[4]}年生' if r[4] else '', r[6], r[7]) if x))
                f.write(f'{r[2]}　{extra}\n')
print('faceless', nf, 'failed', nb, 'failed rows dropped (not in roster):', sum(1 for r in csv.DictReader(open(p('PORTRAITS_FAILED.csv'), encoding='utf-8-sig'))) - nb)
