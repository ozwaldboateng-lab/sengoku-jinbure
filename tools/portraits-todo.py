# 顔画像が未割り当ての武将リスト（PORTRAITS_TODO.txt / .csv）を作る
import os, re
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
rd = lambda p: open(os.path.join(root, p), encoding='utf-8').read()
R, S, S82 = rd('src/data/roster.ts'), rd('src/data/scenarios.ts'), rd('src/data/s1582.ts')
clan = dict(re.findall(r"\{ id: '(\w+)', name: '([^']+)'", R + S))
for k, v in re.findall(r"\{ id: '(\w+)', name: '([^']+)'", S82): clan.setdefault(k, v)  # 1582年の家名の改め（徳川・上杉など）は使わない
born = {k: int(v) for k, v in re.findall(r"(\w+): (\d{4})", rd('src/data/births.ts'))}
gp = {k: int(v) for k, v in re.findall(r"(\w+): (\d{4})", rd('src/data/ranks.ts').split('GENPUKU')[1].split('};')[0])}
have = {os.path.splitext(f)[0] for f in os.listdir(os.path.join(root, 'assets/portraits')) if f.endswith('.png')}
rows = [(c, g, n, born.get(g, ''), f'{gp[g]}年元服' if gp.get(g, 0) > 1560 else '') for g, n, c in re.findall(r"\['(\w+)', '([^']+)', '(\w*)', \d+", R) if n not in have]
rows += [(c, g, n, int(b), '1552年のみ') for g, n, c, b in re.findall(r"\[\['(\w+)', '([^']+)', '(\w*)', [^\]]*\], (\d{4})\]", S) if n not in have]
rows += [(c, g, n, int(b), '1582年のみ') for g, n, c, b in re.findall(r"\[\['(\w+)', '([^']+)', '(\w*)', [^\]]*\], (\d{4})\]", S82) if n not in have]
cn = lambda c: clan.get(c, '在野') if c else '在野'
order = list(dict.fromkeys(r[0] for r in rows))
with open(os.path.join(root, 'PORTRAITS_TODO.csv'), 'w', encoding='utf-8-sig') as f:
    f.write('家,武将名,生年,備考,id\n')
    for c, g, n, b, note in rows: f.write(f'{cn(c)},{n},{b},{note},{g}\n')
with open(os.path.join(root, 'PORTRAITS_TODO.txt'), 'w', encoding='utf-8') as f:
    f.write(f'顔画像が未割り当ての武将 {len(rows)}人（顔画像あり {len(have)}枚）\n備考: 「1552年のみ」=1552年シナリオだけの武将、「○年元服」=1560年時点で元服前\n\n')
    for c in order:
        rs = [r for r in rows if r[0] == c]
        f.write(f'■ {cn(c)}（{len(rs)}）\n' + '　'.join(r[2] + (f'（{r[4]}）' if r[4] else '') for r in rs) + '\n\n')
print(len(rows), 'unassigned')
