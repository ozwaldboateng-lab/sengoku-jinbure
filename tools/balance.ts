// 終盤の膠着を測る: 5年ごとの落城数・攻城の成否・存続家数
import { newGame } from '../src/engine/setup';
import { runAIOnlyTurn } from '../src/engine/game';
import { clanCastles } from '../src/engine/state';
const seeds = (process.argv[2] || '1,2,3').split(',').map(Number);
const rows: string[] = [];
const agg: Record<string, number[]> = {};
for (const seed of seeds) {
  const s = newGame('oda', 'normal', seed);
  let prev = s.castles.map((c) => c.owner);
  const caps = [0, 0, 0, 0];
  const sieges = [0, 0, 0, 0], siegeWins = [0, 0, 0, 0];
  const alive: number[] = [];
  let logLen = 0;
  for (let t = 1; t <= 240; t++) {
    s.over = null;
    if (!s.clans[s.player].alive) s.player = Object.values(s.clans).find((c) => c.alive)!.id;
    const n0 = s.log.length;
    await runAIOnlyTurn(s);
    const w = Math.min(3, Math.floor((t - 1) / 60));
    const now = s.castles.map((c) => c.owner);
    caps[w] += now.filter((o, i) => o !== prev[i]).length;
    prev = now;
    for (const l of s.log.slice(Math.max(0, n0 - (s.log.length === 400 ? 50 : 0)))) {
      if (l.turn !== t || l.kind !== 'battle') continue;
      if (l.text.includes('城兵') || l.text.includes('攻城戦')) { sieges[w]++; if (l.text.includes('落城')) siegeWins[w]++; }
    }
    if (t % 60 === 0) alive.push(Object.values(s.clans).filter((c) => c.alive).length);
    logLen = s.log.length;
  }
  const top = Object.values(s.clans).filter((c) => c.alive).map((c) => clanCastles(s, c.id).length).sort((a, b) => b - a).slice(0, 3);
  rows.push(`seed${seed} 落城/5年 ${caps.join(',')}  城攻め成功 ${siegeWins.map((x, i) => `${x}/${sieges[i]}`).join(',')}  存続 ${alive.join(',')}  上位城数 ${top.join(',')}`);
  for (const [k, v] of [['caps', caps], ['alive', alive]] as const) { agg[k] ??= [0, 0, 0, 0]; v.forEach((x, i) => (agg[k][i] += x / seeds.length)); }
  void logLen;
}
console.log(rows.join('\n'));
console.log('平均 落城/5年', agg.caps.map((x) => x.toFixed(0)).join(','), ' 存続', agg.alive.map((x) => x.toFixed(1)).join(','));
