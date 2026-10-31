import { newGame } from '../src/engine/setup';
import { runAIOnlyTurn } from '../src/engine/game';
const s = newGame('oda', 'normal', +(process.argv[2] || 8));
for (let t = 1; t <= 240; t++) {
  s.over = null; if (!s.clans[s.player].alive) s.player = Object.values(s.clans).find((c) => c.alive)!.id;
  const n0 = s.log.length;
  const snap = JSON.stringify(s);
  await runAIOnlyTurn(s);
  const badA = Object.values(s.armies).filter((a) => !Number.isFinite(a.troops) || !Number.isFinite(a.morale));
  const badC = Object.values(s.clans).filter((c) => !Number.isFinite(c.food));
  const badK = s.castles.filter((c) => !Number.isFinite(c.garrison) || !Number.isFinite(c.gMorale));
  if (badA.length || badC.length || badK.length) {
    console.log('turn', t, 'armies', badA.map((a) => `${s.clans[a.clan].name}:${s.generals[a.main].name}:${a.troops}:${a.morale}`).slice(0, 5), 'clans', badC.map((c) => c.name), 'castles', badK.map((c) => `${c.name}:${c.garrison}:${c.gMorale}`).slice(0, 5));
    console.log(s.log.slice(n0).filter((l) => l.kind === 'battle').map((l) => l.text).join('\n'));
    (await import('node:fs')).writeFileSync('./nan-before.json', snap);
    break;
  }
}
