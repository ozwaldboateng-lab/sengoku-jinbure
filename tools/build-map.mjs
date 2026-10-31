// 日本地図（Natural Earth 10m）をヘックスにラスタライズし、地形・国・城の支配域を生成する。
// 出力: src/data/map.json
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { feature } from 'topojson-client';
import { PROVINCES, CASTLES, RIDGES, RIVERS, PLAINS, STRAITS, CASTLE_PROVINCE, EXTRA_PROVINCES, EXTRA_CASTLES, EXTRA_RIDGES, EXTRA_RIVERS, EXTRA_PLAINS, SEA_CROSSINGS } from '../data/geo.mjs';

const require = createRequire(import.meta.url);
const topo = require('world-atlas/countries-10m.json');

const S = 15; // ヘックス外接半径(km)
const LON0 = 129, LAT0 = 42, KX = Math.cos((35.5 * Math.PI) / 180) * 111.32, KY = 110.57;
const proj = (lat, lon) => [(lon - LON0) * KX, (LAT0 - lat) * KY];
const unproj = (x, y) => [LAT0 - y / KY, LON0 + x / KX];
const SQ3 = Math.sqrt(3);
const center = (q, r) => [S * SQ3 * (q + r / 2), S * 1.5 * r];
const DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
const key = (q, r) => `${q},${r}`;
const hexDist = (a, b) => (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(a.q + a.r - b.q - b.r)) / 2;

// --- 島ポリゴン
const japan = feature(topo, topo.objects.countries).features.find((f) => f.id === '392');
const ISLAND_PROBES = { H: [36.0, 138.0], K: [32.7, 131.0], S: [33.7, 133.5], A: [34.4, 134.83] };
function pip(rings, x, y) {
  let inside = false;
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i], [xj, yj] = ring[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
  }
  return inside;
}
const projected = japan.geometry.coordinates.map((poly) => poly.map((ring) => ring.map(([lon, lat]) => proj(lat, lon))));
const islands = {};
for (const [isl, [lat, lon]] of Object.entries(ISLAND_PROBES)) {
  const [x, y] = proj(lat, lon);
  const idx = projected.findIndex((p) => pip(p, x, y));
  if (idx < 0) throw new Error('island not found ' + isl);
  const rings = projected[idx];
  const xs = rings[0].map((p) => p[0]), ys = rings[0].map((p) => p[1]);
  islands[isl] = { rings, bbox: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] };
}
function islandAt(x, y) {
  for (const [isl, { rings, bbox }] of Object.entries(islands)) {
    if (x < bbox[0] || x > bbox[2] || y < bbox[1] || y > bbox[3]) continue;
    if (pip(rings, x, y)) return isl;
  }
  return null;
}

// --- ラスタライズ
const all = Object.values(islands).map((i) => i.bbox);
const minX = Math.min(...all.map((b) => b[0])), maxX = Math.max(...all.map((b) => b[2]));
const minY = Math.min(...all.map((b) => b[1])), maxY = Math.max(...all.map((b) => b[3]));
const samples = [[0, 0]];
for (let k = 0; k < 6; k++) {
  const a1 = (Math.PI / 3) * k + Math.PI / 6, a2 = (Math.PI / 3) * k;
  samples.push([Math.cos(a1) * S * 0.5, Math.sin(a1) * S * 0.5]);
  samples.push([Math.cos(a2) * S * 0.85, Math.sin(a2) * S * 0.85]);
}
let hexes = [];
for (let r = Math.floor(minY / (1.5 * S)) - 1; r <= Math.ceil(maxY / (1.5 * S)) + 1; r++) {
  for (let q = Math.floor(minX / (SQ3 * S) - r / 2) - 1; q <= Math.ceil(maxX / (SQ3 * S) - r / 2) + 1; q++) {
    const [cx, cy] = center(q, r);
    const counts = {};
    let n = 0;
    for (const [dx, dy] of samples) {
      const isl = islandAt(cx + dx, cy + dy);
      if (isl) { counts[isl] = (counts[isl] || 0) + 1; n++; }
    }
    if (n >= 5) {
      const isl = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
      hexes.push({ q, r, isl });
    }
  }
}

let idx = new Map(hexes.map((h, i) => [key(h.q, h.r), i]));
function components(list, links) {
  const map = new Map(list.map((h, i) => [key(h.q, h.r), i]));
  const adj = list.map(() => []);
  list.forEach((h, i) => DIRS.forEach(([dq, dr]) => { const j = map.get(key(h.q + dq, h.r + dr)); if (j !== undefined) adj[i].push(j); }));
  for (const [a, b] of links) { adj[a].push(b); adj[b].push(a); }
  const comp = new Array(list.length).fill(-1);
  let c = 0;
  for (let i = 0; i < list.length; i++) {
    if (comp[i] >= 0) continue;
    const st = [i]; comp[i] = c;
    while (st.length) { const x = st.pop(); for (const y of adj[x]) if (comp[y] < 0) { comp[y] = c; st.push(y); } }
    c++;
  }
  return comp;
}
// 小さな孤立片を除去（淡路は残す）
{
  const comp = components(hexes, []);
  const size = {};
  comp.forEach((c) => (size[c] = (size[c] || 0) + 1));
  hexes = hexes.filter((h, i) => size[comp[i]] >= 3 || h.isl === 'A');
  idx = new Map(hexes.map((h, i) => [key(h.q, h.r), i]));
}

hexes.forEach((h) => { const [x, y] = center(h.q, h.r); h.x = x; h.y = y; [h.lat, h.lon] = unproj(x, y); });
const nearestHex = (lat, lon, filter = () => true) => {
  const [x, y] = proj(lat, lon);
  let best = -1, bd = Infinity;
  hexes.forEach((h, i) => { if (!filter(h, i)) return; const d = (h.x - x) ** 2 + (h.y - y) ** 2; if (d < bd) { bd = d; best = i; } });
  return best;
};

// --- 海峡・渡し
const links = [];
for (const s of STRAITS) {
  const a = nearestHex(s.at[0], s.at[1], (h) => h.isl === s.islands[0]);
  const b = nearestHex(s.at[0], s.at[1], (h) => h.isl === s.islands[1]);
  const ha = hexes[a], hb = hexes[b];
  if (hexDist(ha, hb) > 1) links.push([a, b, s.name]);
}
for (;;) {
  const comp = components(hexes, links);
  const size = {};
  comp.forEach((c) => (size[c] = (size[c] || 0) + 1));
  const main = +Object.entries(size).sort((a, b) => b[1] - a[1])[0][0];
  const other = comp.findIndex((c) => c !== main);
  if (other < 0) break;
  const oc = comp[other];
  let best = null, bd = Infinity;
  hexes.forEach((h, i) => {
    if (comp[i] !== oc) return;
    hexes.forEach((g, j) => { if (comp[j] !== main) return; const d = (h.x - g.x) ** 2 + (h.y - g.y) ** 2; if (d < bd) { bd = d; best = [i, j]; } });
  });
  links.push([best[0], best[1], '渡し']);
}

// --- 隣接と海岸距離
const nbr = (i) => {
  const h = hexes[i];
  const out = [];
  for (const [dq, dr] of DIRS) { const j = idx.get(key(h.q + dq, h.r + dr)); if (j !== undefined) out.push(j); }
  for (const [a, b] of links) { if (a === i) out.push(b); if (b === i) out.push(a); }
  return out;
};
const coast = hexes.map(() => Infinity);
const queue = [];
hexes.forEach((h, i) => {
  const landN = DIRS.filter(([dq, dr]) => idx.has(key(h.q + dq, h.r + dr))).length;
  if (landN < 6) { coast[i] = 0; queue.push(i); }
});
for (let qi = 0; qi < queue.length; qi++) {
  const i = queue[qi];
  for (const j of nbr(i)) if (coast[j] > coast[i] + 1) { coast[j] = coast[i] + 1; queue.push(j); }
}

// --- 地形
const segDist = (px, py, ax, ay, bx, by) => {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
};
const lineDist = (h, line) => {
  let d = Infinity;
  for (let k = 0; k < line.length - 1; k++) {
    const [ax, ay] = proj(...line[k]), [bx, by] = proj(...line[k + 1]);
    d = Math.min(d, segDist(h.x, h.y, ax, ay, bx, by));
  }
  return d;
};
const noise = (q, r) => { let n = (q * 374761393 + r * 668265263) ^ 0x5bd1e995; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
hexes.forEach((h, i) => {
  const inPlain = PLAINS.some(([lat, lon, rad]) => { const [x, y] = proj(lat, lon); return Math.hypot(h.x - x, h.y - y) <= rad; });
  const nRiver = Math.min(...RIVERS.map((l) => lineDist(h, l)));
  const nRidge = Math.min(...RIDGES.map((l) => lineDist(h, l)));
  const z = noise(h.q, h.r);
  let t = 'P';
  if (nRiver < S * 0.8) t = 'R';
  else if (inPlain) t = 'P';
  else if (nRidge < S * 1.5 || (coast[i] >= 4 && z < 0.35)) t = 'M';
  else if ((coast[i] >= 2 && z < 0.6) || (coast[i] >= 1 && z < 0.3) || nRidge < S * 2.6) t = 'F';
  h.t = t;
});

// --- 城の配置
const castleOut = [];
const taken = new Set();
for (const [id, name, lat, lon, owner] of CASTLES) {
  let hi = nearestHex(lat, lon, (h, i) => !taken.has(i));
  taken.add(hi);
  hexes[hi].c = castleOut.length;
  // 所属国: 指定があればそれ、なければ同じ島の最寄り国府点
  let p = PROVINCES.findIndex((x) => x[0] === CASTLE_PROVINCE[id]);
  if (p < 0) {
    let bd = Infinity;
    PROVINCES.forEach((x, pi) => {
      if (x[5] !== hexes[hi].isl) return;
      const [px, py] = proj(x[2], x[3]), [cx, cy] = proj(lat, lon);
      const d = (px - cx) ** 2 + (py - cy) ** 2;
      if (d < bd) { bd = d; p = pi; }
    });
  }
  castleOut.push({ id, name, owner, hex: hi, lat, lon, p });
}

// --- 支配域: 城からのダイクストラ（山・森・海峡は遠い）。国は城の支配域の和になる
const isLinkPair = (i, j) => links.some(([a, b]) => (a === i && b === j) || (a === j && b === i));
const dist = hexes.map(() => Infinity);
const owner = hexes.map(() => -1);
const pq = [];
castleOut.forEach((c, ci) => { dist[c.hex] = 0; owner[c.hex] = ci; pq.push([0, c.hex]); });
while (pq.length) {
  pq.sort((a, b) => a[0] - b[0]);
  const [d, i] = pq.shift();
  if (d > dist[i]) continue;
  for (const j of nbr(i)) {
    const nd = d + 1 + (hexes[j].t === 'M' ? 1 : hexes[j].t === 'F' ? 0.3 : 0) + (isLinkPair(i, j) ? 2 : 0);
    if (nd < dist[j]) { dist[j] = nd; owner[j] = owner[i]; pq.push([nd, j]); }
  }
}
hexes.forEach((h, i) => { h.d = owner[i]; h.p = castleOut[owner[i]].p; });
const usedP = new Set(castleOut.map((c) => c.p));
PROVINCES.forEach((p, pi) => { if (!usedP.has(pi)) console.warn('province without castle:', p[1]); });

// --- 石高配分: 国高の半分を城数で等分、残り半分を支配域の地形で按分
const W = { P: 3, R: 3, F: 1.5, M: 0.6 };
hexes.forEach((h) => (h.k = 0));
PROVINCES.forEach((p, pi) => {
  const list = hexes.filter((h) => h.p === pi);
  if (!list.length) { console.warn('province without hexes:', p[1]); return; }
  const tw = list.reduce((s, h) => s + W[h.t], 0);
  list.forEach((h) => (h.k += (p[4] * 0.5 * W[h.t]) / tw));
  const cs = [...new Set(list.map((h) => h.d))];
  for (const ci of cs) {
    const dl = list.filter((h) => h.d === ci);
    const dw = dl.reduce((s, h) => s + W[h.t], 0);
    dl.forEach((h) => (h.k += (p[4] * 0.5 * W[h.t]) / cs.length / dw));
  }
  if (!cs.length) list.forEach((h) => (h.k += (p[4] * 0.5 * W[h.t]) / tw));
});
hexes.forEach((h) => (h.k = Math.round(h.k * 100) / 100));
castleOut.forEach((c, ci) => (c.koku = Math.round(hexes.filter((h) => h.d === ci).reduce((s, h) => s + h.k, 0) * 10) / 10));

// ───────── 唐入りの地図: 対馬・壱岐（日本）と朝鮮半島・遼東（国外）を、日本の後ろに足す ─────────
// 日本のマス・城・国・地形・支配域は上で決めたまま変えない（セーブと城の番号を保つ）
const nJapan = hexes.length;
const feats = feature(topo, topo.objects.countries).features;
const polysOf = (id) => { const f = feats.find((x) => x.id === id); const g = f.geometry; return (g.type === 'Polygon' ? [g.coordinates] : g.coordinates).map((poly) => poly.map((ring) => ring.map(([lon, lat]) => proj(lat, lon)))); };
const bboxOf = (rings) => { const xs = rings[0].map((p) => p[0]), ys = rings[0].map((p) => p[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; };
const polyAt = (polys, lat, lon) => { const [x, y] = proj(lat, lon); const p = polys.find((r) => pip(r, x, y)); if (!p) throw new Error('polygon not found ' + lat + ',' + lon); return { rings: p, bbox: bboxOf(p) }; };
const jpPolys = polysOf('392');
const regions = [
  { code: 'T', parts: [polyAt(jpPolys, 34.4, 129.33), polyAt(jpPolys, 34.2, 129.25)], min: 3, foreign: false },
  { code: 'I', parts: [polyAt(jpPolys, 33.79, 129.72)], min: 3, foreign: false },
  { code: 'C', parts: [polyAt(polysOf('410'), 36.5, 127.8), polyAt(polysOf('408'), 40.0, 127.0)], min: 5, foreign: true },
];
const extra = [];
const occupied = new Set(hexes.map((h) => key(h.q, h.r)));
for (const reg of regions) {
  const inReg = (x, y) => reg.parts.some((p) => x >= p.bbox[0] && x <= p.bbox[2] && y >= p.bbox[1] && y <= p.bbox[3] && pip(p.rings, x, y));
  const bb = [Math.min(...reg.parts.map((p) => p.bbox[0])), Math.min(...reg.parts.map((p) => p.bbox[1])), Math.max(...reg.parts.map((p) => p.bbox[2])), Math.max(...reg.parts.map((p) => p.bbox[3]))];
  const got = [];
  for (let r = Math.floor(bb[1] / (1.5 * S)) - 1; r <= Math.ceil(bb[3] / (1.5 * S)) + 1; r++)
    for (let q = Math.floor(bb[0] / (SQ3 * S) - r / 2) - 1; q <= Math.ceil(bb[2] / (SQ3 * S) - r / 2) + 1; q++) {
      if (occupied.has(key(q, r))) continue;
      const [cx, cy] = center(q, r);
      let n = 0;
      for (const [dx, dy] of samples) if (inReg(cx + dx, cy + dy)) n++;
      if (n >= reg.min) got.push({ q, r, isl: reg.code, f: reg.foreign });
    }
  // 小島は少なくとも1マス
  if (!got.length) { const [x, y] = [ (reg.parts[0].bbox[0] + reg.parts[0].bbox[2]) / 2, (reg.parts[0].bbox[1] + reg.parts[0].bbox[3]) / 2 ]; const r = Math.round(y / (1.5 * S)); const q = Math.round(x / (SQ3 * S) - r / 2); got.push({ q, r, isl: reg.code, f: reg.foreign }); }
  // 朝鮮: 3マス未満のちぎれた島は省く
  if (reg.code === 'C') {
    const comp = components(got, []); const size = {}; comp.forEach((c) => (size[c] = (size[c] || 0) + 1));
    for (let i = got.length - 1; i >= 0; i--) if (size[comp[i]] < 3) got.splice(i, 1);
  }
  for (const h of got) { occupied.add(key(h.q, h.r)); extra.push(h); }
}
// 遼東: 鴨緑江の向こう、朝鮮のマスから2マス以内の明の陸
{
  const cn = polysOf('156').map((r) => ({ rings: r, bbox: bboxOf(r) })).filter((p) => { const [x0, y0] = proj(41.5, 123.0), [x1, y1] = proj(39.5, 126.0); return !(p.bbox[2] < x0 || p.bbox[0] > x1 || p.bbox[3] < y0 || p.bbox[1] > y1); });
  const kor = extra.filter((h) => h.isl === 'C');
  for (let r = Math.floor(proj(41.2, 0)[1] / (1.5 * S)); r <= Math.ceil(proj(39.7, 0)[1] / (1.5 * S)); r++)
    for (let q = -40; q <= 0; q++) {
      if (occupied.has(key(q, r))) continue;
      const [cx, cy] = center(q, r); const [lat, lon] = unproj(cx, cy);
      if (lon < 123.5 || lon > 125.2 || lat < 39.8 || lat > 41.0) continue;
      if (!cn.some((p) => pip(p.rings, cx, cy))) continue;
      if (!kor.some((k) => hexDist(k, { q, r }) <= 2)) continue;
      occupied.add(key(q, r)); extra.push({ q, r, isl: 'L', f: true });
    }
}
extra.forEach((h) => { const [x, y] = center(h.q, h.r); h.x = x; h.y = y; [h.lat, h.lon] = unproj(x, y); });
const base = hexes.length;
hexes.push(...extra);
idx = new Map(hexes.map((h, i) => [key(h.q, h.r), i]));
const exIdx = extra.map((_, k) => base + k);
// 渡し: 壱岐〜肥前、対馬〜壱岐（陸続きでなければ）
const nearIn = (lat, lon, f) => { const [x, y] = proj(lat, lon); let best = -1, bd = Infinity; hexes.forEach((h, i) => { if (!f(h)) return; const d = (h.x - x) ** 2 + (h.y - y) ** 2; if (d < bd) { bd = d; best = i; } }); return best; };
const adjOf = (i) => DIRS.map(([dq, dr]) => idx.get(key(hexes[i].q + dq, hexes[i].r + dr))).filter((j) => j !== undefined);
const linkIf = (a, b, name) => { if (!adjOf(a).includes(b)) links.push([a, b, name]); };
const iki = nearIn(33.79, 129.72, (h) => h.isl === 'I'), tsu = nearIn(34.3, 129.3, (h) => h.isl === 'T');
linkIf(nearIn(33.5, 129.85, (h) => h.isl === 'K'), iki, '壱岐水道');
linkIf(iki, nearIn(34.25, 129.3, (h) => h.isl === 'T'), '対馬海峡');
// 対馬のマスどうしがちぎれていればつなぐ
{ const ts = exIdx.filter((i) => hexes[i].isl === 'T'); for (let a = 1; a < ts.length; a++) if (!adjOf(ts[a]).some((j) => hexes[j].isl === 'T')) linkIf(ts[a - 1], ts[a], '対馬'); }
// 地形（足したマスだけ）
{
  const coastX = hexes.map(() => Infinity); const qx = [];
  for (const i of exIdx) { const landN = adjOf(i).length; if (landN < 6) { coastX[i] = 0; qx.push(i); } }
  for (let k = 0; k < qx.length; k++) { const i = qx[k]; for (const j of adjOf(i)) if (j >= base && coastX[j] > coastX[i] + 1) { coastX[j] = coastX[i] + 1; qx.push(j); } }
  for (const i of exIdx) {
    const h = hexes[i];
    const inPlain = EXTRA_PLAINS.some(([lat, lon, rad]) => { const [x, y] = proj(lat, lon); return Math.hypot(h.x - x, h.y - y) <= rad; });
    const nRiver = Math.min(...EXTRA_RIVERS.map((l) => lineDist(h, l)));
    const nRidge = Math.min(...EXTRA_RIDGES.map((l) => lineDist(h, l)));
    const z = noise(h.q, h.r), c = coastX[i];
    let t = 'P';
    if (nRiver < S * 0.8) t = 'R';
    else if (inPlain) t = 'P';
    else if (nRidge < S * 1.6 || (c >= 3 && z < 0.45)) t = 'M'; // 朝鮮は山がちに
    else if ((c >= 1 && z < 0.6) || nRidge < S * 2.8) t = 'F';
    if (h.isl === 'T' || h.isl === 'I') t = h.isl === 'T' ? 'M' : 'P';
    h.t = t;
  }
}
// 国と城
const pBase = PROVINCES.length;
const exCastles = [];
for (const [id, name, lat, lon, ow, prov] of EXTRA_CASTLES) {
  const pr = EXTRA_PROVINCES.findIndex((x) => x[0] === prov);
  const reg = EXTRA_PROVINCES[pr][5];
  const hi = nearIn(lat, lon, (h) => h.isl === reg && h.c === undefined);
  hexes[hi].c = castleOut.length;
  exCastles.push(castleOut.length);
  castleOut.push({ id, name, owner: ow, hex: hi, lat, lon, p: pBase + pr });
}
// 支配域（足したマスだけ、足した城から）
{
  const dist = hexes.map(() => Infinity), own = hexes.map(() => -1); const pq = [];
  for (const ci of exCastles) { const c = castleOut[ci]; dist[c.hex] = 0; own[c.hex] = ci; pq.push([0, c.hex]); }
  const nb = (i) => [...adjOf(i), ...links.filter(([a, b]) => a === i || b === i).map(([a, b]) => (a === i ? b : a))].filter((j) => j >= base);
  while (pq.length) {
    pq.sort((a, b) => a[0] - b[0]);
    const [d, i] = pq.shift();
    if (d > dist[i]) continue;
    for (const j of nb(i)) { const nd = d + 1 + (hexes[j].t === 'M' ? 1 : hexes[j].t === 'F' ? 0.3 : 0); if (nd < dist[j]) { dist[j] = nd; own[j] = own[i]; pq.push([nd, j]); } }
  }
  for (const i of exIdx) { const o = own[i] >= 0 ? own[i] : exCastles[0]; hexes[i].d = o; hexes[i].p = castleOut[o].p; }
  // 石高
  EXTRA_PROVINCES.forEach((pv, k) => {
    const pi = pBase + k; const list = exIdx.map((i) => hexes[i]).filter((h) => h.p === pi);
    if (!list.length) { console.warn('extra province without hexes:', pv[1]); return; }
    const tw = list.reduce((s, h) => s + W[h.t], 0); list.forEach((h) => (h.k = Math.round(((pv[4] * W[h.t]) / tw) * 100) / 100));
  });
  for (const ci of exCastles) castleOut[ci].koku = Math.round(exIdx.filter((i) => hexes[i].d === ci).reduce((s, i) => s + hexes[i].k, 0) * 10) / 10;
}
// 渡海の路は城から城へ（対馬の金石城〜釜山鎮）
const castleHex = (id) => castleOut.find((c) => c.id === id).hex;
const crossings = SEA_CROSSINGS.map(([name, a, b]) => [castleHex(a), castleHex(b), name]);
const allProv = [...PROVINCES.map((p) => ({ id: p[0], name: p[1] })), ...EXTRA_PROVINCES.map((p) => ({ id: p[0], name: p[1], ...(p[5] === 'C' || p[5] === 'L' ? { f: 1 } : {}) }))];
console.log('japan hexes', nJapan, 'extra', extra.length, 'by region', JSON.stringify(extra.reduce((m, h) => ((m[h.isl] = (m[h.isl] || 0) + 1), m), {})), 'extra castles', exCastles.length, 'links', links.map((l) => l[2]).join(','));

const out = {
  size: S,
  provinces: allProv,
  hexes: hexes.map((h) => ({ q: h.q, r: h.r, t: h.t, p: h.p, k: h.k, d: h.d, ...(h.c !== undefined ? { c: h.c } : {}), ...(h.f ? { f: 1 } : {}) })),
  castles: castleOut.map(({ id, name, owner, hex, koku }) => ({ id, name, owner, hex, koku })),
  links,
  crossings, // 渡海の路（対馬〜釜山）。陸の隣ではない
};
mkdirSync(new URL('../src/data/', import.meta.url), { recursive: true });
writeFileSync(new URL('../src/data/map.json', import.meta.url), JSON.stringify(out));
const tc = {};
hexes.forEach((h) => (tc[h.t] = (tc[h.t] || 0) + 1));
console.log('hexes', hexes.length, 'castles', castleOut.length, 'links', links.map((l) => l[2]).join(','), 'terrain', JSON.stringify(tc));
const small = castleOut.filter((c) => c.koku < 1).map((c) => `${c.name}:${c.koku}`);
console.log('small castles', small.join(' '));
