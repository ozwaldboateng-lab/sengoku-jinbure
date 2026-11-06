// 移動範囲・攻撃対象
import { HEXES, NEIGHBORS, isLink } from './map';
import * as R from './rules';
import { allied, castleAt, hostile, occupancy } from './state';
import type { Army, GameState } from './types';
import { crossBlock, isCrossing, landBlock } from './karairi';

export interface Reach { cost: Map<number, number>; prev: Map<number, number>; }

export function stepCost(from: number, to: number): number {
  if (isLink(from, to)) return R.LINK_MOVE_COST;
  if (HEXES[to].c !== undefined) return R.CASTLE_MOVE_COST;
  return R.MOVE_COST[HEXES[to].t];
}

// 敵軍に隣接するヘックス（ZOC）
export function zocHexes(s: GameState, clan: string): Set<number> {
  const z = new Set<number>();
  for (const a of Object.values(s.armies)) {
    if (!hostile(s, clan, a.clan)) continue; // 同盟軍はZOCを持たない
    for (const j of NEIGHBORS[a.hex]) if (!isCrossing(a.hex, j)) z.add(j); // 海峡の向こうには ZOC は及ばない
  }
  return z;
}

export function reachable(s: GameState, a: Army): Reach {
  const occ = occupancy(s);
  const zoc = zocHexes(s, a.clan);
  const cost = new Map<number, number>([[a.hex, 0]]);
  const prev = new Map<number, number>();
  const open: [number, number][] = [[0, a.hex]];
  while (open.length) {
    open.sort((x, y) => x[0] - y[0]);
    const [c, i] = open.shift()!;
    if (c > (cost.get(i) ?? Infinity)) continue;
    if (i !== a.hex && zoc.has(i)) continue; // ZOCに入ったら停止
    const ci = castleAt(s, i);
    if (i !== a.hex && ci && ci.owner !== a.clan) continue; // 敵城に入ったら停止
    for (const j of NEIGHBORS[i]) {
      const oj = occ.get(j);
      if (oj && oj.clan !== a.clan) continue; // 自家の軍勢のいるマスは通り抜けられる（止まれはしない）
      if (isCrossing(i, j) && (i !== a.hex || crossBlock(s, a) || landBlock(s, a, j))) continue; // 渡海は船の空きがあるとき、その場からだけ
      const cj = castleAt(s, j);
      if (cj && cj.owner !== a.clan && cj.garrison > 0) continue; // 城兵がいれば攻撃が必要
      if (cj && allied(s, a.clan, cj.owner)) continue; // 同盟国の城には入れない
      const nc = c + stepCost(i, j);
      if (nc > a.mp) continue;
      if (nc < (cost.get(j) ?? Infinity)) { cost.set(j, nc); prev.set(j, i); open.push([nc, j]); }
    }
  }
  // 通り抜けただけのマス（自家の軍勢がいる）は行き先にしない。そこから先へは道が続くので prev は残す
  const through = [...cost.keys()].filter((h) => h !== a.hex && occ.has(h));
  for (const h of through) cost.delete(h);
  cost.delete(a.hex);
  return { cost, prev };
}

export function pathTo(r: Reach, from: number, to: number): number[] {
  const path = [to];
  let cur = to;
  while (cur !== from) { const p = r.prev.get(cur); if (p === undefined) return []; path.unshift(p); cur = p; }
  return path;
}

export type Target = { kind: 'army'; hex: number; army: Army; stance?: Stance } | { kind: 'castle'; hex: number; castle: number };
// 自分の城にいる軍団が攻められたときの構え: 野戦（城の外で迎え撃つ）か籠城か
export type Stance = 'field' | 'rojo';

export function attackTargets(s: GameState, a: Army): Target[] {
  if (a.acted || a.routed) return [];
  const occ = occupancy(s);
  const out: Target[] = [];
  for (const j of NEIGHBORS[a.hex]) {
    if (isCrossing(a.hex, j) && (crossBlock(s, a) || landBlock(s, a, j))) continue; // 海の向こうを攻めるには船が要る
    const o = occ.get(j);
    if (o) { if (hostile(s, a.clan, o.clan)) out.push({ kind: 'army', hex: j, army: o }); continue; }
    const c = castleAt(s, j);
    if (c && hostile(s, a.clan, c.owner) && c.garrison > 0) out.push({ kind: 'castle', hex: j, castle: c.i });
  }
  return out;
}
