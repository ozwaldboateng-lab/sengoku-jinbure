import { newGame } from '../src/engine/setup';
import { runAIOnlyTurn } from '../src/engine/game';
import { neighbors, clanPower } from '../src/engine/diplomacy';
import { allied, clanCastles } from '../src/engine/state';
const s = newGame('oda', 'normal', 3);
for (let t = 1; t <= 200; t++) { s.over = null; await runAIOnlyTurn(s); }
for (const c of Object.values(s.clans).filter((c) => c.alive)) {
  const near = [...neighbors(s, c.id, 6)];
  console.log(c.name, clanCastles(s, c.id).length, 'P', Math.round(clanPower(s, c.id)), 'stance', c.stance, 'lastWar', s.turn - (c.lastWar ?? 0), 'near', near.map((n) => s.clans[n].name + (allied(s, c.id, n) ? '(盟)' : '')).join(','));
}
console.log(s.treaties.map((t) => `${s.clans[t.a].name}-${s.clans[t.b].name}:${t.kind}`).join(' '));
