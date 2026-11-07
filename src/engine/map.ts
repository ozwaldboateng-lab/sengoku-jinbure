// 静的マップ（生成済み JSON）と隣接計算
import raw from '../data/map.json';
import type { Hex } from './types';
import { RANGES } from '../data/ranges';

interface RawMap {
  size: number;
  provinces: { id: string; name: string; f?: number }[];
  hexes: { q: number; r: number; t: Hex['t']; p: number; k: number; d: number; c?: number; f?: number }[];
  castles: { id: string; name: string; owner: string | null; hex: number; koku: number }[];
  links: [number, number, string][];
  crossings?: [number, number, string][];
}
const M = raw as unknown as RawMap;

export const HEX_SIZE = M.size;
export const PROVINCES = M.provinces;
export const HEXES: Hex[] = M.hexes.map((h, i) => ({ i, ...h }));
export const CASTLE_DEFS = M.castles;
export const LINKS = M.links;
// 渡海の路（対馬〜釜山）。陸の隣ではなく、唐入りの船で渡る
export const CROSSINGS = M.crossings ?? [];
// 国外（朝鮮・遼東）のマス。唐入りまでは入れない
export const isForeignHex = (h: number) => !!HEXES[h]?.f;

const DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
const index = new Map(HEXES.map((h) => [`${h.q},${h.r}`, h.i]));
export const NEIGHBORS: number[][] = HEXES.map((h) => {
  const out: number[] = [];
  for (const [dq, dr] of DIRS) {
    const j = index.get(`${h.q + dq},${h.r + dr}`);
    if (j !== undefined) out.push(j);
  }
  return out;
});
const linkSet = new Set<string>();
for (const [a, b] of LINKS) {
  NEIGHBORS[a].push(b); NEIGHBORS[b].push(a);
  linkSet.add(`${a},${b}`); linkSet.add(`${b},${a}`);
}
export const isLink = (a: number, b: number) => linkSet.has(`${a},${b}`);

// 険山: 軍勢は入れない。隣の表から外す（中から出る道だけは残す。古い保存で中にいた部隊のため）
const rangeOf = new Map<number, string>();
for (const g of RANGES) for (const h of g.hexes) rangeOf.set(h, g.name);
export const isBlocked = (h: number) => rangeOf.has(h);
export const rangeName = (h: number) => rangeOf.get(h);
export const isSoloPeak = (h: number) => RANGES.some((g) => g.solo && g.hexes.includes(h));
for (let i = 0; i < NEIGHBORS.length; i++) NEIGHBORS[i] = NEIGHBORS[i].filter((j) => !rangeOf.has(j));

export const hexDist = (a: number, b: number) => {
  const A = HEXES[a], B = HEXES[b];
  return (Math.abs(A.q - B.q) + Math.abs(A.r - B.r) + Math.abs(A.q + A.r - B.q - B.r)) / 2;
};

const SQ3 = Math.sqrt(3);
export const hexCenter = (i: number): [number, number] => {
  const h = HEXES[i];
  return [HEX_SIZE * SQ3 * (h.q + h.r / 2), HEX_SIZE * 1.5 * h.r];
};

// 盤面上の経路距離（BFS、移動コスト無視）
export function graphDistances(from: number[]): number[] {
  const d = new Array(HEXES.length).fill(Infinity);
  const q: number[] = [];
  for (const f of from) { d[f] = 0; q.push(f); }
  for (let k = 0; k < q.length; k++) {
    const i = q[k];
    for (const j of NEIGHBORS[i]) if (d[j] === Infinity) { d[j] = d[i] + 1; q.push(j); }
  }
  return d;
}

export const TERRAIN_NAME: Record<Hex['t'], string> = { P: '平地', F: '森', M: '山', R: '川' };
