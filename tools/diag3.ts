import { newGame } from '../src/engine/setup';
import { runAIOnlyTurn } from '../src/engine/game';
import { clanArmies, clanCastles, allied, hostile } from '../src/engine/state';
import { attackTargets } from '../src/engine/move';
import { estimate } from '../src/engine/combat';
import { neighbors, clanPower } from '../src/engine/diplomacy';
import { hexDist } from '../src/engine/map';
const s = newGame('oda', 'normal', +(process.argv[2] || 2));
for (let t = 1; t <= 200; t++) { s.over = null; if (!s.clans[s.player].alive) s.player = Object.values(s.clans).find((c) => c.alive)!.id; await runAIOnlyTurn(s); }
for (const c of Object.values(s.clans).filter((c) => c.alive)) {
  const arm = clanArmies(s, c.id);
  const front = arm.filter((a) => Object.values(s.armies).some((o) => hostile(s, c.id, o.clan) && hexDist(o.hex, a.hex) <= 2) || s.castles.some((k) => hostile(s, c.id, k.owner) && hexDist(k.hex, a.hex) <= 1));
  const ests = arm.flatMap((a) => attackTargets(s, a).map((t) => estimate(s, a, t, false))).sort((x, y) => y - x).slice(0, 3).map((x) => x.toFixed(2));
  const near = [...neighbors(s, c.id, 6)];
  console.log(`${c.name} 城${clanCastles(s, c.id).length} 軍${arm.length} 前線${front.length} 兵${Math.round(clanPower(s, c.id) / 1000)}k ${c.stance} 主攻${c.target ? s.clans[c.target].name : '-'} 最後の攻撃${s.turn - (c.lastWar ?? 0)}か月前 食${Math.round(c.food / 1000)}k 推定上位[${ests.join(',')}] 隣:${near.map((n) => s.clans[n].name + (allied(s, c.id, n) ? '(盟)' : '')).join(',')}`);
}
// 典型的な前線軍団の状態
const big = Object.values(s.clans).filter((c) => c.alive).sort((a, b) => clanCastles(s, b.id).length - clanCastles(s, a.id).length)[0];
for (const a of clanArmies(s, big.id).slice(0, 40)) {
  const ts = attackTargets(s, a);
  if (!ts.length) continue;
  console.log(' ', big.name, s.generals[a.main].name, a.troops, '出陣時', a.departTroops, '士気', a.morale.toFixed(2), a.acted ? '行動済' : '', ts.map((t) => (t.kind === 'army' ? s.clans[t.army.clan].name + t.army.troops : '城' + s.castles[t.castle].garrison) + ':' + estimate(s, a, t, false).toFixed(2)).join(' '));
}
