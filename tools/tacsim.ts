import { newGame } from '../src/engine/setup';
import { setBattleHook } from '../src/engine/hooks';
import { createTactical } from '../src/engine/tactical';
import { autoResolve } from '../src/engine/tacticalAI';
import { applyTactical } from '../src/engine/combat';
import { runAIOnlyTurn } from '../src/engine/game';

const stats: Record<string, number> = {};
let turnsSum = 0, n = 0;
setBattleHook(async (s, a, t, joined) => {
  const tac = createTactical(s, a, t, null, joined);
  stats['合流あり'] = (stats['合流あり'] || 0) + (joined.length ? 1 : 0);
  stats['援軍・後詰めあり'] = (stats['援軍・後詰めあり'] || 0) + (tac.units.some((u) => u.clan !== (u.side === 'A' ? tac.attackerClan : tac.defenderClan) && u.role !== 'garrison') ? 1 : 0);
  autoResolve(tac, s);
  for (const l of tac.log) for (const k of ['火を放った', '不発', '消し止め', '内応者が城門', '焼け落ちた']) if (l.includes(k)) stats[k] = (stats[k] || 0) + 1;
  const key = `${tac.kind}:${tac.over}`;
  stats[key] = (stats[key] || 0) + 1; turnsSum += tac.turn; n++;
  if (tac.kind === 'siege') console.log('siege', tac.over, 'turn', tac.turn, 'gates', JSON.stringify(tac.gates), 'max', tac.gateMax, 'A', tac.units.filter(u=>u.side==='A'&&!u.out).map(u=>u.troops+(u.routed?'r':'')).join(','), 'D', tac.units.filter(u=>u.side==='D'&&!u.out).map(u=>u.troops+(u.routed?'r':'')).join(','));
  if (n <= 0) console.log(tac.kind, tac.units.length, 'units', 'turn', tac.turn, tac.over, tac.reason, '\n  ' + tac.log.slice(-6).join('\n  '));
  return applyTactical(s, tac);
});
const s = newGame('takeda', 'normal', 3);
const t0 = Date.now();
let defect = 0, naio = 0;
for (let i = 0; i < 60; i++) { const n0 = s.log.length; s.over = null; await runAIOnlyTurn(s); for (const l of s.log.slice(Math.max(0, n0 - (s.log.length >= 400 ? 400 : 0)))) { if (l.turn !== s.turn - 1) continue; if (l.text.includes('寝返')) defect++; if (l.text.includes('内応者ができ')) naio++; } }
console.log('AI調略: 寝返り', defect, '内応', naio);
console.log(stats, 'avg turns', (turnsSum / n).toFixed(1), 'battles', n, 'ms', Date.now() - t0, 'player castles', s.castles.filter(c => c.owner === 'takeda').length);
