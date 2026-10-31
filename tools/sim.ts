import { newGame } from '../src/engine/setup';
import { runAIOnlyTurn } from '../src/engine/game';
import { clanCastles, clanKoku, clanTroops, clanArmies } from '../src/engine/state';
import { CLANS, GENERALS } from '../src/data/roster';

const turns = +(process.argv[2] || 120), seed = +(process.argv[3] || 1);
// roster sanity
const noGen = CLANS.filter((c) => !GENERALS.some((g) => g[2] === c.id)).map((c) => c.id);
if (noGen.length) console.log('clans without generals', noGen);
const s = newGame('oda', 'normal', seed);
const top = (label: string) => {
  const alive = Object.values(s.clans).filter((c) => c.alive);
  const rows = alive.map((c) => [c.name, clanCastles(s, c.id).length, Math.round(clanKoku(s, c.id)), clanTroops(s, c.id), clanArmies(s, c.id).length, Math.round(c.food / 1000) + 'k', c.prestige] as const)
    .sort((a, b) => b[2] - a[2]).slice(0, 12);
  console.log(`== ${label} ${s.year}/${s.month} alive=${alive.length} treaties=${s.treaties.length}(婚${s.treaties.filter((t) => t.kind === 'marriage').length}) armies=${Object.keys(s.armies).length} neutral=${s.castles.filter((c) => !c.owner).length}`);
  console.log(rows.map((r) => r.join(' ')).join('\n'));
};
top('start');
const t0 = Date.now();
let battles = 0;
for (let t = 1; t <= turns; t++) {
  const before = s.log.length;
  s.over = null;
  if (!s.clans[s.player].alive) s.player = Object.values(s.clans).find((c) => c.alive)!.id; // 観戦用に視点を移す
  await runAIOnlyTurn(s);
  battles += s.log.slice(before).filter((l) => l.kind === 'battle').length;
  if (t % 24 === 0) top(`turn ${t}`);
}
console.log('ms/turn', ((Date.now() - t0) / turns).toFixed(1), 'battles', battles, 'dead', Object.values(s.generals).filter((g) => g.status === 'dead').length, 'over', s.over);
console.log(s.log.filter((l) => l.kind === 'battle').slice(-5).map((l) => l.text).join('\n'));
