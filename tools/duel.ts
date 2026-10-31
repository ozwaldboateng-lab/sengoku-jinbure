import { doAction, routAt, type Tactical, type TUnit, type TTerrain } from '../src/engine/tactical';
import { newGame } from '../src/engine/setup';
import * as R from '../src/engine/rules';
const s = newGame('oda', 'normal', 9);
const mk = (id: number, side: 'A' | 'D', gid: string, tile: number): TUnit => {
  const g = s.generals[gid];
  return { id, side, army: null, general: gid, role: 'main', name: g.name, hq: false, troops: 3000, troops0: 3000, morale: 1.3,
    atk: R.atkOf(g.bra, g.lea), def: R.defOf(g.lea, g.int, g.cha), rout: R.routOf(g.lea, g.cha), int: g.int,
    tile, mp: 4, moved: false, acted: false, routed: false, confused: 0, out: null };
};
function duel(a: string, d: string, ta: TTerrain, td: TTerrain, charge: boolean) {
  let wins = 0; const N = 300;
  for (let k = 0; k < N; k++) {
    const t = { kind: 'field', w: 3, h: 1, tiles: [ta, td, 'P'], gates: {}, gateMax: 0, units: [], turn: 1, maxTurn: 10, phase: 'A', attackerClan: 'oda', defenderClan: 'saito', primaryA: 0, primaryD: null, castle: null, hex: 0, armiesA: [], armiesD: [], log: [], deaths: [], captures: [], start: {}, over: null, reason: '', playerSide: null } as unknown as Tactical;
    const A = mk(1, 'A', a, 0), D = mk(2, 'D', d, 1);
    t.units = [A, D];
    for (let r = 0; r < 20 && !A.routed && !D.routed && !A.out && !D.out; r++) {
      A.acted = false; doAction(t, s, A, { kind: 'attack', target: D }, charge);
      if (D.routed || D.out) break;
      D.acted = false; doAction(t, s, D, { kind: 'attack', target: A }, false);
    }
    if (D.routed || D.out) wins++;
  }
  return Math.round((wins / 300) * 100);
}
const g = (id: string) => { const x = s.generals[id]; return `${x.name}(攻${R.atkOf(x.bra, x.lea).toFixed(2)} 防${R.defOf(x.lea, x.int, x.cha).toFixed(2)} 崩${R.routOf(x.lea, x.cha).toFixed(2)})`; };
console.log(g('shibata_katsuie'), 'vs', g('takenaka_shigeharu'));
console.log(' 平地で柴田が突撃:', duel('shibata_katsuie', 'takenaka_shigeharu', 'P', 'P', true) + '%');
console.log(' 竹中が森に籠り柴田が攻撃:', duel('shibata_katsuie', 'takenaka_shigeharu', 'P', 'F', false) + '%');
console.log(' 竹中が森から柴田(平地)を攻撃（伏兵）→竹中勝率:', duel('takenaka_shigeharu', 'shibata_katsuie', 'F', 'P', false) + '%');
console.log(g('magara_naotaka'), 'vs', g('uesugi_kenshin'));
console.log(' 真柄が平地で景虎に突撃:', duel('magara_naotaka', 'uesugi_kenshin', 'P', 'P', true) + '%');
console.log(' 真柄が川の景虎に突撃:', duel('magara_naotaka', 'uesugi_kenshin', 'P', 'R', true) + '%');
