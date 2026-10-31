# 登場武将全員のリスト（GENERALS_ALL.csv / .txt）。顔画像の制作用に番号・ファイル名・開始時の年齢を付ける
import os, re
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
rd = lambda p: open(os.path.join(root, p), encoding='utf-8').read()
R, S, S82 = rd('src/data/roster.ts'), rd('src/data/scenarios.ts'), rd('src/data/s1582.ts')
clan = dict(re.findall(r"\{ id: '(\w+)', name: '([^']+)'", R + S))
for k, v in re.findall(r"\{ id: '(\w+)', name: '([^']+)'", S82): clan.setdefault(k, v)  # 1582年の家名の改め（徳川・上杉など）は使わない
born = {k: int(v) for k, v in re.findall(r"(\w+): (\d{4})", rd('src/data/births.ts'))}
gp = {k: int(v) for k, v in re.findall(r"(\w+): (\d{4})", rd('src/data/ranks.ts').split('GENPUKU')[1].split('};')[0])}
have = {os.path.splitext(f)[0] for f in os.listdir(os.path.join(root, 'assets/portraits')) if f.endswith('.png')}
rows = [(g, n, c, born.get(g), '') for g, n, c in re.findall(r"\['(\w+)', '([^']+)', '(\w*)', \d+", R)]
rows += [(g, n, c, int(b), '1552年のみ') for g, n, c, b in re.findall(r"\[\['(\w+)', '([^']+)', '(\w*)', [^\]]*\], (\d{4})\]", S)]
rows += [(g, n, c, int(b), '1582年のみ') for g, n, c, b in re.findall(r"\[\['(\w+)', '([^']+)', '(\w*)', [^\]]*\], (\d{4})\]", S82)]
# 1560年に元服済みの武将は生年を1545年以前に丸める（ゲームと同じ）
age = lambda g, b, y: (y - (min(b, 1545) if g not in gp else b)) if b else None
order = list(dict.fromkeys(c for _, _, c, _, _ in rows))
rows.sort(key=lambda r: order.index(r[2]))
cn = lambda c: clan.get(c, '在野') if c else '在野'
with open(os.path.join(root, 'GENERALS_ALL.csv'), 'w', encoding='utf-8-sig') as f:
    f.write('番号,家（1560年）,武将名,ファイル名,生年,1560年の年齢,1552年の年齢,元服,備考,顔画像,id\n')
    for k, (g, n, c, b, note) in enumerate(rows, 1):
        a60 = '' if note else age(g, b, 1560); a52 = age(g, b, 1552)
        f.write(f"{k},{cn(c)},{n},{k:03d}_{n}.png,{b or ''},{a60 if a60 is None or a60 == '' or a60 >= 0 else '未生'},{a52 if a52 is None or a52 >= 0 else '未生'},{gp.get(g, '')},{note},{'あり' if n in have else ''},{g}\n")
with open(os.path.join(root, 'GENERALS_ALL.txt'), 'w', encoding='utf-8') as f:
    f.write(f'登場武将 全{len(rows)}人（顔画像あり {sum(1 for r in rows if r[1] in have)}人）\n書式: 番号 武将名（1560年の年齢）。「1552」=1552年シナリオのみ、「元服○年」=1560年時点で元服前\n\n')
    for c in order:
        rs = [(k, r) for k, r in enumerate(rows, 1) if r[2] == c]
        f.write(f'■ {cn(c)}（{len(rs)}）\n')
        for k, (g, n, _, b, note) in rs:
            a = age(g, b, 1552 if note else 1560)
            extra = '・1552' if note else (f'・元服{gp[g]}年' if gp.get(g, 0) > 1560 else '')
            f.write(f"{k:03d} {n}（{'未生' if a is not None and a < 0 else f'{a}歳' if a is not None else '?'}{extra}）\n")
        f.write('\n')
print(len(rows))
