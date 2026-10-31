import { newGame } from '../src/engine/setup';
import { runAIOnlyTurn } from '../src/engine/game';
import { clanArmies, castleAt, clanCastles } from '../src/engine/state';
import { attackTargets } from '../src/engine/move';
import { estimate } from '../src/engine/combat';
const s = newGame('oda', 'normal', 2);
for (let t = 1; t <= 150; t++) await runAIOnlyTurn(s);
const alive = Object.values(s.clans).filter(c => c.alive);
console.log(alive.map(c => `${c.name}:${clanCastles(s, c.id).length}:${c.stance}:${c.target ? s.clans[c.target].name : '-'}:${s.turn - (c.lastWar ?? 0)}`).join(' '));
for (const id of ['hojo', 'otomo']) {
  for (const a of clanArmies(s, id)) {
    const ts = attackTargets(s, a).map(t => `${t.kind === 'army' ? s.clans[t.army.clan].name + t.army.troops : '城' + s.castles[t.castle].name + s.castles[t.castle].garrison}:${estimate(s, a, t, false).toFixed(2)}`);
    console.log(' ', id, s.generals[a.main].name, a.troops, a.departTroops, a.morale.toFixed(2), a.routed, castleAt(s, a.hex)?.name ?? '-', ts.join(' '));
  }
}
