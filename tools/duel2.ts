import { doAction, TR, type Tactical, type TUnit, type TTerrain } from '../src/engine/tactical';
import { newGame } from '../src/engine/setup';
import * as R from '../src/engine/rules';
const s = newGame('oda', 'normal', 9);
const mk = (id: number, side: 'A' | 'D', gid: string, tile: number, troops = 3000): TUnit => {
  const g = s.generals[gid];
  return { id, side, army: null, general: gid, role: 'main', name: g.name, hq: false, troops, troops0: troops, morale: 1 + (g.lea + g.cha) / 400,
    atk: R.atkOf(g.bra, g.lea), def: R.defOf(g.lea, g.int, g.cha), rout: R.routOf(g.lea, g.cha), int: g.int,
    tile, mp: 4, moved: false, acted: false, routed: false, confused: 0, out: null };
};
// x が先手/後手を交互に取って平均（手番の有利を打ち消す）。x の勝率
function duel(x: string, y: string, tx: TTerrain, ty: TTerrain, xCharge: boolean, ty2 = 3000) {
  let wins = 0; const N = 200;
  for (let k = 0; k < N; k++) {
    const t = { kind: 'field', w: 3, h: 1, tiles: [tx, ty, 'P'], gates: {}, gateMax: 0, units: [], over: null, log: [], deaths: [], captures: [], attackerClan: 'oda', defenderClan: 'saito' } as unknown as Tactical;
    const X = mk(1, 'A', x, 0), Y = mk(2, 'D', y, 1, ty2);
    t.units = [X, Y];
    let turn = k % 2;
    for (let r = 0; r < 60 && !X.routed && !Y.routed && !X.out && !Y.out; r++, turn ^= 1) {
      if (turn === 0) { X.acted = false; doAction(t, s, X, { kind: 'attack', target: Y }, xCharge); }
      else { Y.acted = false; doAction(t, s, Y, { kind: 'attack', target: X }, false); }
    }
    if (Y.routed || Y.out) wins++;
  }
  return Math.round((wins / N) * 100) + '%';
}
for (const [dmg, ctr, mor] of [[0.125, 0.0625, 1]]) {
  TR.DMG = dmg; TR.COUNTER = ctr; (globalThis as any).__mor = mor;
  console.log(`DMG ${dmg} COUNTER ${ctr}`);
  console.log('  同じ武将同士（先手交互）:', duel('shibata_katsuie', 'shibata_katsuie', 'P', 'P', false));
  console.log('  柴田 vs 竹中 平地:', duel('shibata_katsuie', 'takenaka_shigeharu', 'P', 'P', false), ' 柴田突撃:', duel('shibata_katsuie', 'takenaka_shigeharu', 'P', 'P', true));
  console.log('  竹中 vs 柴田 竹中が森・柴田平地（伏兵）:', duel('takenaka_shigeharu', 'shibata_katsuie', 'F', 'P', false));
  console.log('  柴田 vs 竹中 竹中が丘:', duel('shibata_katsuie', 'takenaka_shigeharu', 'P', 'H', false));
  console.log('  真柄 vs 景虎 平地:', duel('magara_naotaka', 'uesugi_kenshin', 'P', 'P', false), ' 景虎が川:', duel('magara_naotaka', 'uesugi_kenshin', 'P', 'R', false));
  console.log('  柴田3000 vs 柴田2000:', duel('shibata_katsuie', 'shibata_katsuie', 'P', 'P', false, 2000));
}
console.log('互角での突撃（柴田 vs 柴田）: 平地', duel('shibata_katsuie', 'shibata_katsuie', 'P', 'P', true), ' 森の敵へ', duel('shibata_katsuie', 'shibata_katsuie', 'P', 'F', true), '（突撃なし森', duel('shibata_katsuie', 'shibata_katsuie', 'P', 'F', false) + '）');
console.log('猛将 vs 名将（真柄 vs 竹中）: 平地', duel('magara_naotaka', 'takenaka_shigeharu', 'P', 'P', false), ' 平地突撃', duel('magara_naotaka', 'takenaka_shigeharu', 'P', 'P', true), ' 竹中が丘', duel('magara_naotaka', 'takenaka_shigeharu', 'P', 'H', false));
