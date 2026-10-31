// 地図の下絵: Natural Earth 10m の海岸線（日本と、その近くの陸）を、ヘックスと同じ投影でゲームの座標（km）へ写し、
// 間引いて src/data/basemap.ts に書く。川は data/geo.mjs の RIVERS（ヘックスの川と同じ線）、湖は概略の輪郭を手で置く。
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { feature } from 'topojson-client';
import { RIVERS, EXTRA_RIVERS } from '../data/geo.mjs';

const require = createRequire(import.meta.url);
const topo = require('world-atlas/countries-10m.json');
const M = JSON.parse(readFileSync(new URL('../src/data/map.json', import.meta.url), 'utf8'));

// build-map.mjs と同じ投影
const LON0 = 129, LAT0 = 42, KX = Math.cos((35.5 * Math.PI) / 180) * 111.32, KY = 110.57;
const proj = (lat, lon) => [(lon - LON0) * KX, (LAT0 - lat) * KY];
const S = M.size, SQ3 = Math.sqrt(3);
const cs = M.hexes.map((h) => [S * SQ3 * (h.q + h.r / 2), S * 1.5 * h.r]);
const PAD = 260;
const box = [Math.min(...cs.map((c) => c[0])) - PAD, Math.min(...cs.map((c) => c[1])) - PAD, Math.max(...cs.map((c) => c[0])) + PAD, Math.max(...cs.map((c) => c[1])) + PAD];

// Douglas–Peucker
function simplify(pts, tol) {
  if (pts.length < 4) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const st = [[0, pts.length - 1]];
  while (st.length) {
    const [a, b] = st.pop();
    const [ax, ay] = pts[a], [bx, by] = pts[b];
    const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1e-9;
    let md = -1, mi = -1;
    for (let i = a + 1; i < b; i++) { const d = Math.abs((pts[i][0] - ax) * dy - (pts[i][1] - ay) * dx) / L; if (d > md) { md = d; mi = i; } }
    if (md > tol) { keep[mi] = 1; st.push([a, mi], [mi, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}
// 閉じた輪: 始点から一番遠い点で二つに分けてから間引く
function simplifyRing(ring, tol) {
  const pts = ring.slice(0, -1);
  let far = 0, fd = -1;
  for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[0][0], pts[i][1] - pts[0][1]); if (d > fd) { fd = d; far = i; } }
  const a = simplify(pts.slice(0, far + 1), tol), b = simplify([...pts.slice(far), pts[0]], tol);
  return [...a, ...b.slice(1, -1)];
}
const area = (r) => { let s = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) s += (r[j][0] - r[i][0]) * (r[j][1] + r[i][1]); return Math.abs(s / 2); };
const inBox = (r) => r.some(([x, y]) => x > box[0] && x < box[2] && y > box[1] && y < box[3]);

const land = [];
let npt = 0;
for (const f of feature(topo, topo.objects.countries).features) {
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [];
  for (const poly of polys) {
    const outer = poly[0].map(([lon, lat]) => proj(lat, lon));
    if (!inBox(outer) || area(outer) < 4) continue; // 4km² 未満の小島は省く
    const kr = f.id === '410' || f.id === '408'; // 朝鮮半島（唐入りの地）
    const tol = f.id === '392' ? 0.35 : kr ? 0.5 : 1.2; // 日本は細かく、朝鮮もやや細かく、よその陸は粗く
    const r = simplifyRing(outer, tol);
    if (r.length < 3) continue;
    land.push({ jp: f.id === '392', ...(kr ? { kr: true } : {}), pts: r.flatMap(([x, y]) => [+x.toFixed(1), +y.toFixed(1)]) });
    npt += r.length;
  }
}

// 湖（概略の輪郭、[緯度, 経度]）
const LAKES = {
  琵琶湖: [[35.52, 136.17], [35.47, 136.22], [35.40, 136.27], [35.33, 136.26], [35.27, 136.24], [35.20, 136.13], [35.16, 136.07], [35.12, 136.00], [35.10, 135.95], [35.05, 135.91], [35.00, 135.89], [35.03, 135.86], [35.10, 135.90], [35.17, 135.94], [35.25, 135.98], [35.32, 136.02], [35.40, 136.04], [35.47, 136.08], [35.52, 136.12]],
  霞ヶ浦: [[36.17, 140.30], [36.13, 140.40], [36.06, 140.47], [35.98, 140.52], [35.95, 140.42], [36.00, 140.30], [36.05, 140.24], [36.11, 140.22]],
  浜名湖: [[34.80, 137.56], [34.77, 137.62], [34.72, 137.61], [34.69, 137.57], [34.71, 137.52], [34.76, 137.51]],
  猪苗代湖: [[37.55, 140.08], [37.52, 140.15], [37.45, 140.15], [37.41, 140.09], [37.44, 140.03], [37.51, 140.02]],
};
const lakes = Object.entries(LAKES).map(([name, ring]) => ({ name, pts: ring.flatMap(([la, lo]) => proj(la, lo).map((v) => +v.toFixed(1))) }));
const rivers = [...RIVERS, ...EXTRA_RIVERS].map((line) => line.flatMap(([la, lo]) => proj(la, lo).map((v) => +v.toFixed(1))));

const out = `// 自動生成（tools/build-basemap.mjs）。地図の下絵: 陸の輪郭・湖・川（ゲームの座標 km、[x0,y0,x1,y1,…]）
// 海岸線は Natural Earth（パブリックドメイン）
export const BASE_LAND: { jp: boolean; kr?: boolean; pts: number[] }[] = ${JSON.stringify(land)};
export const BASE_LAKES: { name: string; pts: number[] }[] = ${JSON.stringify(lakes)};
export const BASE_RIVERS: number[][] = ${JSON.stringify(rivers)};
`;
writeFileSync(new URL('../src/data/basemap.ts', import.meta.url), out);
console.log('land polygons', land.length, 'points', npt, 'size', (out.length / 1024).toFixed(0) + 'KB');
