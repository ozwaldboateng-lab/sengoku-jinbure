import { MINES, MINE_KIND_NAME } from '../data/economy';
// キャンバス地図の描画と操作（パン・ズーム・ヘックス選択）
import { BASE_LAKES, BASE_LAND, BASE_RIVERS } from '../data/basemap';
import { bk, meibun } from '../engine/bakufu';
import { supplyNet } from '../engine/supply';
import { CASTLE_DEFS, CROSSINGS, HEXES, HEX_SIZE, PROVINCES, hexCenter, isForeignHex } from '../engine/map';
import type { Reach, Target } from '../engine/move';
import { allied, castleAt, castleKoku, hexOwner } from '../engine/state';
import type { GameState } from '../engine/types';

const SQ3 = Math.sqrt(3);
const EDGE_DIRS = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]];
const hexIndex = new Map(HEXES.map((h) => [`${h.q},${h.r}`, h.i]));
const EDGE_NB: number[][] = HEXES.map((h) => EDGE_DIRS.map(([dq, dr]) => hexIndex.get(`${h.q + dq},${h.r + dr}`) ?? -1));
// 国外（唐入りまで眠っている朝鮮・明）のマス: 沈んだ色で塗り、城と名を薄く
const FOREIGN_FILL = '#5f666c';
const isSealedClan = (s: GameState, id: string | null) => !!id && !!s.clans[id]?.foreign && !s.clans[id].alive;
const isSealed = (s: GameState, h: number) => isForeignHex(h) && isSealedClan(s, hexOwner(s, h));
const CENTERS = HEXES.map((h) => hexCenter(h.i));
// 国外の家ごとの真ん中（名を置く所）
const FOREIGN_CENTER: Record<string, [number, number]> = (() => {
  const acc: Record<string, [number, number, number]> = {};
  for (const h of HEXES) { if (!h.f) continue; const o = CASTLE_DEFS[h.d]?.owner; if (!o) continue; const a = (acc[o] ??= [0, 0, 0]); a[0] += CENTERS[h.i][0]; a[1] += CENTERS[h.i][1]; a[2]++; }
  return Object.fromEntries(Object.entries(acc).map(([k, [x, y, n]]) => [k, [x / n, y / n]]));
})();
const VERT = [...Array(6)].map((_, k) => { const a = ((60 * k - 30) * Math.PI) / 180; return [Math.cos(a), Math.sin(a)]; });

const C = {
  sea: '#16222e', seaLine: 'rgba(170,200,220,0.07)', washi: '#e9dcc0', neutral: '#b8ab8c',
  ink: '#1a1410', gold: '#d3ae62', red: '#e0583c', white: '#f6efe0', reach: 'rgba(255,240,190,0.38)',
};
const FONT = '"Shippori Mincho B1", "Hiragino Mincho ProN", "Yu Mincho", serif';

function hexToRgb(h: string): [number, number, number] {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mix(a: string, b: string, t: number): string {
  const A = hexToRgb(a), B = hexToRgb(b);
  return `rgb(${A.map((v, i) => Math.round(v * (1 - t) + B[i] * t)).join(',')})`;
}
function shade(a: string, f: number): string {
  const A = hexToRgb(a);
  return `rgb(${A.map((v) => Math.max(0, Math.min(255, Math.round(v * f)))).join(',')})`;
}

// 鉱山のある城 → 印（金・銀・銅。二つあれば並べる）
const MINE_MARK = new Map<string, string>();
for (const [id, , k] of MINES) MINE_MARK.set(id, (MINE_MARK.get(id) ?? '') + MINE_KIND_NAME[k]);
export type MapMode = 'power' | 'meibun' | 'chian' | 'ember' | 'front' | 'shugo' | 'supply';
export const MAP_MODES: [MapMode, string][] = [['power', '勢力'], ['meibun', '名分'], ['chian', '治安'], ['ember', '残り火'], ['front', '知行'], ['shugo', '守護'], ['supply', '補給']];
export const FRONT_COLORS = ['#d9a441', '#5f9fc4', '#b36fb0', '#6fae6a', '#d07650', '#8a86d0', '#c4b25a', '#4fb3a6'];
export const MB = { own: '#ead9a0', ally: '#8fb0c8', ok: '#de7a5a', no: '#a39c90', kokujin: '#d8b98e' };
const ramp = (stops: string[], v: number) => {
  const x = Math.max(0, Math.min(1, v)) * (stops.length - 1), k = Math.min(stops.length - 2, Math.floor(x));
  return mix(stops[k], stops[k + 1], x - k);
};
export const CHIAN_RAMP = ['#b5452e', '#d9c27a', '#6f9e5a'];
export const EMBER_RAMP = ['#d6cbb0', '#e3a35a', '#cf3a1c'];
export const SUP = { home: '#9cc48a', sea: '#8fb6d4', enclave: '#c99ad8', near: '#e8d48a', far: '#e0a060', none: '#6e655a', other: '#a39c90' };

// 地図の下絵（線で描く本物の海岸線・湖・川）。Path2D はゲームの座標（km）で一度だけ作る
const polyPath = (pts: number[], p = new Path2D()) => { p.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) p.lineTo(pts[i], pts[i + 1]); p.closePath(); return p; };
// 川は粗い折れ線なので、中点を通る二次曲線でなめらかにする
const riverPath = (pts: number[], p = new Path2D()) => {
  p.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length - 2; i += 2) p.quadraticCurveTo(pts[i], pts[i + 1], (pts[i] + pts[i + 2]) / 2, (pts[i + 1] + pts[i + 3]) / 2);
  p.lineTo(pts[pts.length - 2], pts[pts.length - 1]);
  return p;
};
let BASE: { jp: Path2D; other: Path2D; lakes: Path2D; rivers: Path2D } | null = null;
const base = () => (BASE ??= {
  jp: BASE_LAND.filter((l) => l.jp).reduce((p, l) => polyPath(l.pts, p), new Path2D()),
  other: BASE_LAND.filter((l) => !l.jp).reduce((p, l) => polyPath(l.pts, p), new Path2D()),
  lakes: BASE_LAKES.reduce((p, l) => polyPath(l.pts, p), new Path2D()),
  rivers: BASE_RIVERS.reduce((p, l) => riverPath(l, p), new Path2D()),
});
export const HEX_ALPHA: [string, number | null][] = [['なし', null], ['濃', 0.8], ['中', 0.55], ['淡', 0.35]];

export type ArmyStyle = 'round' | 'totsu' | 'koma' | 'nobori' | 'hata' | 'gunzei' | 'hayashi';
// 兵数による部隊の印の大きさ（3段階、またはなめらかに）
export const armyScale = (troops: number, mode: 'tier' | 'scale') =>
  mode === 'tier' ? (troops < 3000 ? 0.78 : troops < 7000 ? 1 : 1.24) : Math.max(0.7, Math.min(1.32, 0.62 + 0.7 * Math.sqrt(Math.min(troops, 16000) / 16000)));

export interface Selection { army: number | null; hex: number | null; reach: Reach | null; targets: Target[]; }

// 陣の影に並ぶ兵（ほぼ点）。兵が多いほど増え、二列になる。潰走中は散らばる
export function drawFootSoldiers(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, n: number, color: string, routed: boolean, px: number, fig = 1, guns = 0) {
  const r = Math.max(1.1 * px, ry * 0.3) * fig;
  const rows = n > 7 ? 2 : 1;
  const per = [Math.ceil(n / rows), Math.floor(n / rows)];
  const body = routed ? '#6b6158' : shade(rgbToHex(color), 0.85);
  ctx.save();
  ctx.lineWidth = Math.max(0.6 * px, r * 0.45); ctx.strokeStyle = 'rgba(12,8,4,0.85)';
  for (let row = 0; row < rows; row++) {
    const m = per[row];
    const yy = cy + (rows === 2 ? (row === 0 ? -ry * 0.35 : ry * 0.4) : 0);
    const span = rx * (rows === 2 && row === 0 ? 0.78 : 0.86);
    for (let k = 0; k < m; k++) {
      let xx = cx + (m === 1 ? 0 : -span + (2 * span * k) / (m - 1)) + (row === 0 && rows === 2 ? rx * 0.06 : 0);
      let y2 = yy;
      if (routed) { const h = Math.sin((k + 1) * 12.9898 + row * 78.233) * 43758.5453; const f = h - Math.floor(h); xx += (f - 0.5) * rx * 0.5; y2 += (f - 0.5) * ry * 1.2; }
      // 足軽の人形: 陣笠・胴（家の色）・脚・槍。足もとが (xx, y2)
      const h = r * 4.2 * (rows === 2 && row === 0 ? 0.92 : 1);
      const lean = routed ? ((k % 2) * 2 - 1) * 0.5 : 0;
      ctx.save(); ctx.translate(xx, y2); ctx.rotate(lean);
      ctx.strokeStyle = 'rgba(12,8,4,0.9)'; ctx.lineWidth = Math.max(0.7 * px, h * 0.11);
      ctx.beginPath(); ctx.moveTo(-h * 0.13, 0); ctx.lineTo(0, -h * 0.38); ctx.lineTo(h * 0.13, 0); ctx.stroke(); // 脚
      // 前の列の端から順に鉄砲を持たせる（guns は鉄砲を持つ割合）
      const gun = !routed && guns > 0 && (row * per[0] + k) / n >= 1 - guns;
      if (gun) {
        // 鉄砲: 肩に担ぎ、筒先を斜め前へ。台木は茶、筒は黒
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#6a4626'; ctx.lineWidth = Math.max(0.7 * px, h * 0.1);
        ctx.beginPath(); ctx.moveTo(-h * 0.12, -h * 0.5); ctx.lineTo(h * 0.12, -h * 0.66); ctx.stroke();
        ctx.strokeStyle = '#151210'; ctx.lineWidth = Math.max(0.5 * px, h * 0.06);
        ctx.beginPath(); ctx.moveTo(h * 0.1, -h * 0.65); ctx.lineTo(h * 0.5, -h * 0.92); ctx.stroke();
      } else if (!routed) { ctx.lineWidth = Math.max(0.5 * px, h * 0.06); ctx.strokeStyle = '#3a2a18'; ctx.beginPath(); ctx.moveTo(h * 0.12, -h * 0.2); ctx.lineTo(h * 0.2, -h * 1.25); ctx.stroke(); } // 槍
      ctx.fillStyle = body; ctx.fillRect(-h * 0.13, -h * 0.7, h * 0.26, h * 0.36); // 胴
      ctx.strokeStyle = 'rgba(12,8,4,0.8)'; ctx.lineWidth = Math.max(0.4 * px, h * 0.04); ctx.strokeRect(-h * 0.13, -h * 0.7, h * 0.26, h * 0.36);
      ctx.fillStyle = '#2a1f14'; ctx.beginPath(); ctx.arc(0, -h * 0.8, h * 0.1, 0, 7); ctx.fill(); // 頭
      ctx.fillStyle = 'rgba(236,226,200,0.92)'; ctx.beginPath(); ctx.moveTo(-h * 0.2, -h * 0.82); ctx.lineTo(h * 0.2, -h * 0.82); ctx.lineTo(0, -h * 0.98); ctx.closePath(); ctx.fill(); // 陣笠
      ctx.restore();
    }
  }
  ctx.restore();
}

export class MapView {
  ctx: CanvasRenderingContext2D;
  dpr = 1; w = 0; h = 0;
  scale = 1.4; ox = 0; oy = 0; // 画面px = 世界km * scale + o
  state: GameState | null = null;
  sel: Selection = { army: null, hex: null, reach: null, targets: [] };
  anim: { army: number; path: number[]; start: number; step: number; done: () => void } | null = null;
  flash: { hex: number; until: number } | null = null;
  onHexClick: (hex: number) => void = () => {};
  mode: MapMode = 'power';
  highlight: string | string[] | null = null; // タイトルの家選び・序幕: この家（家々）以外を沈める
  marks: { hexes: number[]; arrows: [number, number][] } | null = null; // 序幕: 光る場所と進軍の矢印
  hexAlpha: number | null = 0.55; // 下絵を敷くときのヘックスの塗りの濃さ（null は下絵なし）
  armyStyle: ArmyStyle = 'hayashi'; // 部隊の印: 幟の林（初期）・丸（兵数の弧）。凸・駒・幟・流れ旗は試作のまま残す
  armySize: 'tier' | 'scale' = 'scale'; // 兵数で3段階か、なめらかに
  private tint: { key: string; by: (string | null)[] } | null = null; // 表示切り替えの塗り（城ごと・守護は国ごと）
  private pending = false;
  private pointers = new Map<number, { x: number; y: number }>();
  private drag: { x: number; y: number; ox: number; oy: number; moved: boolean } | null = null;
  private pinch: { d: number; scale: number; cx: number; cy: number } | null = null;
  private seaPattern: CanvasPattern | null = null;

  constructor(public canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    new ResizeObserver(() => this.resize()).observe(canvas);
    canvas.addEventListener('pointerdown', (e) => this.down(e));
    canvas.addEventListener('pointermove', (e) => this.move(e));
    canvas.addEventListener('pointerup', (e) => this.up(e));
    canvas.addEventListener('pointercancel', (e) => { this.pointers.delete(e.pointerId); this.drag = null; this.pinch = null; });
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const r = canvas.getBoundingClientRect();
      this.zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.0015));
    }, { passive: false });
    this.resize();
  }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    this.dpr = window.devicePixelRatio || 1;
    this.w = r.width; this.h = r.height;
    this.canvas.width = Math.round(r.width * this.dpr);
    this.canvas.height = Math.round(r.height * this.dpr);
    this.seaPattern = null;
    this.redraw();
  }

  zoomAt(px: number, py: number, f: number) {
    const ns = Math.max(0.35, Math.min(5, this.scale * f));
    const k = ns / this.scale;
    this.ox = px - (px - this.ox) * k;
    this.oy = py - (py - this.oy) * k;
    this.scale = ns;
    this.redraw();
  }
  zoomBy(f: number) { this.zoomAt(this.w / 2, this.h / 2, f); }

  centerOn(hex: number, scale?: number) {
    if (scale) this.scale = scale;
    const [x, y] = CENTERS[hex];
    this.ox = this.w / 2 - x * this.scale;
    this.oy = this.h / 2 - y * this.scale;
    this.redraw();
  }

  screenToHex(px: number, py: number): number | null {
    const x = (px - this.ox) / this.scale, y = (py - this.oy) / this.scale;
    const q = ((SQ3 / 3) * x - y / 3) / HEX_SIZE, r = ((2 / 3) * y) / HEX_SIZE;
    let rx = Math.round(q), rz = Math.round(r);
    const ry = Math.round(-q - r);
    const dx = Math.abs(rx - q), dy = Math.abs(ry + q + r), dz = Math.abs(rz - r);
    if (dx > dy && dx > dz) rx = -ry - rz; else if (!(dy > dz)) rz = -rx - ry;
    return hexIndex.get(`${rx},${rz}`) ?? null;
  }

  private down(e: PointerEvent) {
    this.canvas.setPointerCapture(e.pointerId);
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.pointers.size === 1) this.drag = { x: e.clientX, y: e.clientY, ox: this.ox, oy: this.oy, moved: false };
    if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      const r = this.canvas.getBoundingClientRect();
      this.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), scale: this.scale, cx: (a.x + b.x) / 2 - r.left, cy: (a.y + b.y) / 2 - r.top };
      this.drag = null;
    }
  }
  private move(e: PointerEvent) {
    if (!this.pointers.has(e.pointerId)) return;
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.pinch && this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      this.zoomAt(this.pinch.cx, this.pinch.cy, (this.pinch.scale * (d / this.pinch.d)) / this.scale);
      return;
    }
    if (this.drag) {
      const dx = e.clientX - this.drag.x, dy = e.clientY - this.drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 6) this.drag.moved = true;
      if (this.drag.moved) { this.ox = this.drag.ox + dx; this.oy = this.drag.oy + dy; this.redraw(); }
    }
  }
  private up(e: PointerEvent) {
    const wasDrag = this.drag;
    this.pointers.delete(e.pointerId);
    if (this.pointers.size < 2) this.pinch = null;
    if (wasDrag && !wasDrag.moved && this.pointers.size === 0) {
      const r = this.canvas.getBoundingClientRect();
      const hex = this.screenToHex(e.clientX - r.left, e.clientY - r.top);
      if (hex !== null) this.onHexClick(hex);
    }
    if (this.pointers.size === 0) this.drag = null;
  }

  animateMove(army: number, path: number[], done: () => void) {
    if (path.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { done(); return; }
    this.anim = { army, path, start: performance.now(), step: 110, done };
    this.redraw();
  }
  flashHex(hex: number) { this.flash = { hex, until: performance.now() + 900 }; this.redraw(); }

  redraw() {
    if (this.pending) return;
    this.pending = true;
    requestAnimationFrame(() => { this.pending = false; this.draw(); });
  }

  private hexPath(ctx: CanvasRenderingContext2D, i: number, r = HEX_SIZE) {
    const [cx, cy] = CENTERS[i];
    ctx.beginPath();
    for (let k = 0; k < 6; k++) {
      const x = cx + VERT[k][0] * r, y = cy + VERT[k][1] * r;
      if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    ctx.closePath();
  }

  private makeSea(): CanvasPattern | null {
    // 青海波
    const t = document.createElement('canvas');
    const R0 = 14 * this.dpr;
    t.width = R0 * 2; t.height = R0;
    const c = t.getContext('2d')!;
    c.fillStyle = C.sea; c.fillRect(0, 0, t.width, t.height);
    c.strokeStyle = C.seaLine; c.lineWidth = 1 * this.dpr;
    const wave = (x: number, y: number) => { for (let k = 1; k <= 3; k++) { c.beginPath(); c.arc(x, y, (R0 * k) / 3, Math.PI, 2 * Math.PI); c.stroke(); } };
    for (const [x, y] of [[0, R0], [R0 * 2, R0], [R0, R0 * 0.5 + R0 * 0.5], [R0, R0 * 1.5 - R0 * 0.5]]) wave(x, y);
    wave(R0, R0 / 2 + R0);
    return c.createPattern(t, 'repeat');
  }

  setHexAlpha(a: number | null) { this.hexAlpha = a; this.redraw(); }
  setMode(m: MapMode) { this.mode = m; this.tint = null; this.redraw(); }
  invalidate() { this.tint = null; this.redraw(); }

  // 表示切り替えの塗り。城（ヘックスの d）ごと、守護だけは国（p）ごと
  private tintOf(s: GameState, h: { i: number; d: number; p: number }): string | null {
    const key = `${this.mode}|${s.turn}|${s.player}`;
    if (!this.tint || this.tint.key !== key) this.tint = { key, by: this.computeTint(s) };
    return this.tint.by[this.mode === 'shugo' ? h.p : this.mode === 'supply' ? h.i : h.d];
  }
  private computeTint(s: GameState): (string | null)[] {
    const P = s.player;
    if (this.mode === 'supply') {
      // 補給: 自領は本国（緑）・海路の飛び地（青）・飛び地（紫）、自領の外は届く（黄〜橙）・届かない（暗）
      const net = supplyNet(s, P);
      const compAt = new Map<number, number>();
      for (const c of s.castles) if (c.owner === P) compAt.set(c.i, net.compOf.get(c.i)!);
      return HEXES.map((h) => {
        const o = hexOwner(s, h.i);
        if (o === P) { const k = compAt.get(h.d); return k === net.home ? SUP.home : k !== undefined && net.seaLinked.has(k) ? SUP.sea : SUP.enclave; }
        const x = net.cost.get(h.i);
        if (x) return x.c <= Math.max(1, net.range - 1) ? SUP.near : SUP.far;
        return o && allied(s, P, o) ? SUP.other : SUP.none;
      });
    }
    if (this.mode === 'shugo') {
      const B = bk(s);
      return PROVINCES.map((p) => { const c = B.shugo[p.name]; return c && s.clans[c]?.alive ? mix(C.washi, s.clans[c].color, 0.6) : '#958d7a'; });
    }
    const fr = new Map<number, number>();
    for (const f of s.fronts ?? []) for (const ci of f.castles) fr.set(ci, f.id);
    const mbCache = new Map<string, string>();
    return s.castles.map((c) => {
      switch (this.mode) {
        case 'meibun': {
          if (c.owner === P) return MB.own;
          if (!c.owner) return MB.kokujin;
          if (allied(s, P, c.owner)) return MB.ally;
          // 守護・管内・旧領は城によって変わるので城ごとに引く
          const k = `${c.owner}|${c.i}`;
          if (!mbCache.has(k)) mbCache.set(k, meibun(s, P, c.owner, c.hex).ok ? MB.ok : MB.no);
          return mbCache.get(k)!;
        }
        case 'chian': return ramp(CHIAN_RAMP, c.chian / 100);
        case 'ember': return ramp(EMBER_RAMP, (c.ember ?? 0) / 60);
        case 'front': {
          if (c.owner !== P) return '#8c8577';
          const f = fr.get(c.i);
          return f === undefined ? C.washi : mix(C.washi, FRONT_COLORS[f % FRONT_COLORS.length], 0.75);
        }
        default: return null;
      }
    });
  }

  private draw() {
    const s = this.state;
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    if (!this.seaPattern) this.seaPattern = this.makeSea();
    ctx.fillStyle = this.seaPattern ?? C.sea;
    ctx.fillRect(0, 0, this.w, this.h);
    if (!s) return;
    ctx.setTransform(this.dpr * this.scale, 0, 0, this.dpr * this.scale, this.dpr * this.ox, this.dpr * this.oy);
    const px = 1 / this.scale; // 1画面pxの世界長
    const viewMinX = -this.ox / this.scale - HEX_SIZE * 2, viewMaxX = (this.w - this.ox) / this.scale + HEX_SIZE * 2;
    const viewMinY = -this.oy / this.scale - HEX_SIZE * 2, viewMaxY = (this.h - this.oy) / this.scale + HEX_SIZE * 2;
    const visible = HEXES.filter((h) => { const [x, y] = CENTERS[h.i]; return x > viewMinX && x < viewMaxX && y > viewMinY && y < viewMaxY; });

    const under = this.hexAlpha !== null;
    if (under) {
      // 下絵: 本物の陸（よその陸は暗く）と海岸線。ヘックスはこの上に半透明で重ねる
      const B = base();
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.save(); ctx.translate(2.2, 2.6); ctx.fill(B.jp, 'evenodd'); ctx.fill(B.other, 'evenodd'); ctx.restore();
      ctx.fillStyle = '#7d7460'; ctx.fill(B.other, 'evenodd');
      ctx.fillStyle = '#d8c9a4'; ctx.fill(B.jp, 'evenodd');
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(40,28,15,0.75)'; ctx.lineWidth = 1.3 * px; ctx.stroke(B.jp); ctx.stroke(B.other);
    } else {
      // 陸地の影
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      for (const h of visible) { ctx.save(); ctx.translate(2.2, 2.6); this.hexPath(ctx, h.i, HEX_SIZE + 0.3); ctx.fill(); ctx.restore(); }
    }

    // 塗り（勢力色×和紙）と地形
    for (const h of visible) {
      const owner = hexOwner(s, h.i);
      const sealed = isSealed(s, h.i);
      const tint = this.mode === 'power' || sealed ? null : this.tintOf(s, h);
      let base = sealed ? FOREIGN_FILL : tint ?? (owner ? mix(C.washi, s.clans[owner].color, 0.5) : C.neutral);
      const hl = this.highlight, lit = !hl || (Array.isArray(hl) ? hl.includes(owner ?? '') : owner === hl);
      if (hl && !lit) base = mix(rgbToHex(base), '#1a130d', 0.5);
      else if (this.highlight) base = mix(rgbToHex(base), '#fff3d0', 0.15);
      const tf = h.t === 'M' ? 0.86 : h.t === 'F' ? 0.93 : 1;
      ctx.fillStyle = tf === 1 ? base : shade(rgbToHex(base), tf);
      this.hexPath(ctx, h.i, HEX_SIZE + 0.25);
      if (under) ctx.globalAlpha = this.hexAlpha!;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.lineCap = 'round';
    for (const h of visible) if (!(under && h.t === 'R')) this.drawTerrain(ctx, h.i, h.t);
    if (under) {
      // 湖と川はヘックスの上に（地形の川のヘックスと同じ線）
      const B = base();
      ctx.fillStyle = 'rgba(52,86,110,0.92)'; ctx.fill(B.lakes);
      ctx.strokeStyle = 'rgba(30,24,16,0.6)'; ctx.lineWidth = 1 * px; ctx.stroke(B.lakes);
      ctx.strokeStyle = 'rgba(62,118,160,0.85)'; ctx.lineWidth = Math.max(2.2 * px, HEX_SIZE * 0.09); ctx.stroke(B.rivers);
    }

    // 国境・勢力境界・海岸線
    for (const h of visible) {
      const [cx, cy] = CENTERS[h.i];
      const own = hexOwner(s, h.i);
      for (let k = 0; k < 6; k++) {
        const j = EDGE_NB[h.i][k];
        const ax = cx + VERT[k][0] * HEX_SIZE, ay = cy + VERT[k][1] * HEX_SIZE;
        const bx = cx + VERT[(k + 1) % 6][0] * HEX_SIZE, by = cy + VERT[(k + 1) % 6][1] * HEX_SIZE;
        let w = 0, col = '';
        if (j < 0) { w = (under ? 1 : 1.6) * px; col = under ? 'rgba(30,20,10,0.45)' : 'rgba(30,20,10,0.75)'; }
        else if (hexOwner(s, j) !== own) { if (j < h.i) continue; w = 2.6 * px; col = 'rgba(25,15,8,0.85)'; }
        else if (this.mode === 'shugo' && HEXES[j].p !== h.p) { if (j < h.i) continue; w = 1.8 * px; col = 'rgba(60,20,10,0.6)'; }
        else if (HEXES[j].d !== h.d) { if (j < h.i) continue; w = 0.8 * px; col = 'rgba(40,30,20,0.28)'; }
        if (!w) continue;
        ctx.strokeStyle = col; ctx.lineWidth = w;
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      }
    }

    // 移動範囲
    if (this.sel.reach) {
      ctx.fillStyle = C.reach;
      for (const [hx] of this.sel.reach.cost) { this.hexPath(ctx, hx, HEX_SIZE * 0.92); ctx.fill(); }
    }
    if (this.sel.hex !== null && this.sel.army === null) {
      ctx.strokeStyle = C.gold; ctx.lineWidth = 2.5 * px;
      this.hexPath(ctx, this.sel.hex, HEX_SIZE * 0.9); ctx.stroke();
    }

    // 城
    for (const c of s.castles) {
      const [x, y] = CENTERS[c.hex];
      if (x < viewMinX || x > viewMaxX || y < viewMinY || y > viewMaxY) continue;
      const dim = isSealed(s, c.hex);
      if (dim) ctx.globalAlpha = 0.55;
      this.drawCastle(ctx, x, y, dim ? '#6a7078' : c.owner ? s.clans[c.owner].color : '#7d735c', c.owner === s.player, px, castleKoku(c), c.kind ?? 'hira');
      ctx.globalAlpha = 1;
      if (c.naio !== undefined && c.naio >= s.turn && c.naioBy === s.player) {
        // 内応の印
        ctx.fillStyle = '#8fb36a'; ctx.beginPath(); ctx.arc(x + HEX_SIZE * 0.42, y - HEX_SIZE * 0.42, HEX_SIZE * 0.24, 0, 7); ctx.fill();
        ctx.fillStyle = '#10140c'; ctx.font = `700 ${HEX_SIZE * 0.3}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('応', x + HEX_SIZE * 0.42, y - HEX_SIZE * 0.4);
      }
    }

    // 出陣命令（自軍）: 軍団から目標への矢印。同じ目標には数を添える
    const ordered = new Map<number, number>();
    for (const o of s.orders ?? []) {
      const a = s.armies[o.army];
      if (!a || a.clan !== s.player) continue;
      ordered.set(o.hex, (ordered.get(o.hex) ?? 0) + 1);
      const [ax, ay] = CENTERS[a.hex], [tx, ty] = CENTERS[o.hex];
      const ang = Math.atan2(ty - ay, tx - ax);
      const ex = tx - Math.cos(ang) * HEX_SIZE * 0.55, ey = ty - Math.sin(ang) * HEX_SIZE * 0.55;
      ctx.strokeStyle = 'rgba(232,86,52,0.95)'; ctx.lineWidth = 3 * px; ctx.setLineDash([6 * px, 4 * px]);
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ex, ey); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(232,86,52,0.95)';
      ctx.beginPath(); ctx.moveTo(ex + Math.cos(ang) * 6 * px, ey + Math.sin(ang) * 6 * px);
      ctx.lineTo(ex + Math.cos(ang + 2.5) * 7 * px, ey + Math.sin(ang + 2.5) * 7 * px);
      ctx.lineTo(ex + Math.cos(ang - 2.5) * 7 * px, ey + Math.sin(ang - 2.5) * 7 * px); ctx.closePath(); ctx.fill();
    }
    // 軍団
    const now = performance.now();
    let animating = false;
    // 手前（下）の部隊ほど後に描く（上へはみ出す幟が重なっても奥行きが自然になる）
    for (const a of Object.values(s.armies).sort((p, q) => CENTERS[p.hex][1] - CENTERS[q.hex][1] || CENTERS[p.hex][0] - CENTERS[q.hex][0])) {
      let [x, y] = CENTERS[a.hex];
      if (this.anim && this.anim.army === a.id) {
        const p = this.anim.path, t = (now - this.anim.start) / this.anim.step;
        const k = Math.min(p.length - 1, Math.floor(t)), f = Math.min(1, t - k);
        const A = CENTERS[p[k]], B = CENTERS[p[Math.min(p.length - 1, k + 1)]];
        x = A[0] + (B[0] - A[0]) * f; y = A[1] + (B[1] - A[1]) * f;
        if (t >= p.length - 1) { const done = this.anim.done; this.anim = null; done(); } else animating = true;
      }
      if (x < viewMinX || x > viewMaxX || y < viewMinY || y > viewMaxY) continue;
      this.drawArmy(ctx, x, y, a.id, px);
    }

    // 攻撃対象（名分のある相手は金、私戦になる相手は灰の破線）
    if (this.sel.targets.length) {
      const pulse = 0.55 + 0.45 * Math.sin(now / 180);
      ctx.lineWidth = 3 * px;
      for (const t of this.sel.targets) {
        const def = t.kind === 'army' ? t.army.clan : s.castles[t.castle].owner;
        const ok = meibun(s, s.player, def, t.hex).ok;
        this.hexPath(ctx, t.hex, HEX_SIZE * 0.86);
        ctx.setLineDash([]); ctx.lineWidth = 5.5 * px; ctx.strokeStyle = `rgba(20,12,6,${0.55 * pulse + 0.2})`; ctx.stroke();
        ctx.lineWidth = 3 * px;
        ctx.strokeStyle = ok ? `rgba(246,200,90,${pulse})` : `rgba(250,244,232,${pulse})`;
        ctx.setLineDash(ok ? [] : [6 * px, 4 * px]);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      animating = true;
    }
    if (this.flash && now < this.flash.until) {
      const f = (this.flash.until - now) / 900;
      ctx.strokeStyle = `rgba(255,220,140,${f})`; ctx.lineWidth = 4 * px;
      this.hexPath(ctx, this.flash.hex, HEX_SIZE * (1.4 - f * 0.5)); ctx.stroke();
      animating = true;
    }

    // 城名
    if (this.scale > 0.95) {
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      const fs = Math.max(9.5, Math.min(13, 11 * Math.sqrt(this.scale / 1.6))) * px;
      ctx.font = `600 ${fs}px ${FONT}`;
      for (const c of s.castles) {
        const [x, y] = CENTERS[c.hex];
        if (x < viewMinX || x > viewMaxX || y < viewMinY || y > viewMaxY) continue;
        const hasArmy = Object.values(s.armies).some((a) => a.hex === c.hex);
        const ty = y + HEX_SIZE * (hasArmy ? 0.74 : 0.48);
        ctx.lineWidth = 3 * px; ctx.strokeStyle = 'rgba(20,14,8,0.85)'; ctx.lineJoin = 'round';
        ctx.strokeText(c.name, x, ty);
        ctx.fillStyle = c.owner === s.player ? '#ffe7a8' : isSealed(s, c.hex) ? 'rgba(220,215,205,0.55)' : C.white;
        ctx.fillText(c.name, x, ty);
        // 自家の城の名簿（陣払い中の軍団）の数: 城名の下に小さく「名簿2」
        if (c.owner === s.player) {
          const n = Object.values(s.camps ?? {}).filter((a) => a.camp === c.i).length;
          if (n) { ctx.save(); ctx.font = `600 ${fs * 0.78}px ${FONT}`; ctx.strokeText(`名簿${n}`, x, ty + fs * 1.05); ctx.fillStyle = '#c9b98a'; ctx.fillText(`名簿${n}`, x, ty + fs * 1.05); ctx.restore(); }
        }
        // 鉱山の印（金・銀・銅）
        const mk = MINE_MARK.get(c.id);
        if (mk) {
          const w = ctx.measureText(c.name).width;
          ctx.save(); ctx.font = `700 ${fs * 0.85}px ${FONT}`; ctx.textAlign = 'left';
          ctx.strokeText(mk, x + w / 2 + 2 * px, ty); ctx.fillStyle = mk.includes('金') ? '#f2c94c' : mk.includes('銀') ? '#d9dde3' : '#d08a5a'; ctx.fillText(mk, x + w / 2 + 2 * px, ty);
          ctx.restore();
        }
      }
    }
    // 序幕: 光る場所（輪）と進軍の矢印
    if (this.marks) {
      const t = (performance.now() % 1600) / 1600;
      for (const [ha, hb] of this.marks.arrows) {
        const [ax, ay] = CENTERS[ha], [bx, by] = CENTERS[hb];
        const mx = (ax + bx) / 2 - (by - ay) * 0.15, my = (ay + by) / 2 + (bx - ax) * 0.15;
        ctx.save(); ctx.setLineDash([HEX_SIZE * 0.4, HEX_SIZE * 0.22]); ctx.lineDashOffset = -t * HEX_SIZE * 1.24; ctx.lineWidth = Math.max(5 * px, HEX_SIZE * 0.14); ctx.lineCap = 'round';
        ctx.strokeStyle = 'rgba(232,86,52,0.92)'; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo(mx, my, bx, by); ctx.stroke();
        const ang = Math.atan2(by - my, bx - mx), L = Math.max(16 * px, HEX_SIZE * 0.6); ctx.setLineDash([]); ctx.fillStyle = 'rgba(232,86,52,0.95)';
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx - L * Math.cos(ang - 0.45), by - L * Math.sin(ang - 0.45)); ctx.lineTo(bx - L * Math.cos(ang + 0.45), by - L * Math.sin(ang + 0.45)); ctx.closePath(); ctx.fill(); ctx.restore();
      }
      for (const hx of this.marks.hexes) {
        const [x, y] = CENTERS[hx];
        ctx.save(); ctx.strokeStyle = `rgba(243,214,140,${0.95 - t * 0.7})`; ctx.lineWidth = Math.max(3.5 * px, HEX_SIZE * 0.1);
        ctx.beginPath(); ctx.arc(x, y, HEX_SIZE * (0.75 + t * 0.9), 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = 'rgba(243,214,140,0.95)'; ctx.beginPath(); ctx.arc(x, y, HEX_SIZE * 0.72, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      }
      this.redraw(); // 動かし続ける
    }
    // 唐入り: 渡海の路（対馬〜釜山）を点線で
    if (s.karairi?.active) {
      for (const [ha, hb, name] of CROSSINGS) {
        const [ax, ay] = CENTERS[ha], [bx, by] = CENTERS[hb];
        const open = s.turn >= (s.karairi.openTurn ?? 0);
        ctx.save(); ctx.setLineDash([HEX_SIZE * 0.35, HEX_SIZE * 0.25]); ctx.lineWidth = Math.max(2 * px, HEX_SIZE * 0.08);
        ctx.strokeStyle = open ? 'rgba(240,214,140,0.9)' : 'rgba(200,200,200,0.5)';
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo((ax + bx) / 2 + HEX_SIZE, (ay + by) / 2, bx, by); ctx.stroke(); ctx.restore();
        if (this.scale > 0.7) { ctx.font = `600 ${Math.max(10, 12 * Math.sqrt(this.scale / 1.6)) * px}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 3 * px; ctx.strokeStyle = 'rgba(15,15,18,0.85)'; const mx = (ax + bx) / 2 + HEX_SIZE * 1.1, my = (ay + by) / 2; ctx.strokeText(`${name}${open ? '' : '（閉）'}`, mx, my); ctx.fillStyle = '#f0d68c'; ctx.fillText(`${name}${open ? '' : '（閉）'}`, mx, my); }
      }
    }
    // 国外の名（唐入りまで眠っている朝鮮・明）
    for (const [clan, [x, y]] of Object.entries(FOREIGN_CENTER)) {
      if (!isSealedClan(s, clan) || x < viewMinX || x > viewMaxX || y < viewMinY || y > viewMaxY) continue;
      const fs = Math.max(20, 34 / Math.sqrt(Math.max(0.4, this.scale))) * px * this.scale;
      ctx.font = `700 ${fs}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 4 * px; ctx.strokeStyle = 'rgba(15,15,18,0.75)'; ctx.strokeText(`${s.clans[clan].name}（国外）`, x, y);
      ctx.fillStyle = 'rgba(225,220,205,0.6)'; ctx.fillText(`${s.clans[clan].name}（国外）`, x, y);
    }
    // 出陣先の印（城名より上に描く）
    for (const [hx, n] of ordered) {
      const [x, y] = CENTERS[hx];
      ctx.strokeStyle = 'rgba(232,86,52,0.9)'; ctx.lineWidth = 2.5 * px;
      this.hexPath(ctx, hx, HEX_SIZE * 0.92); ctx.stroke();
      ctx.fillStyle = '#c4432a'; ctx.beginPath(); ctx.arc(x - HEX_SIZE * 0.62, y - HEX_SIZE * 0.62, HEX_SIZE * 0.26, 0, 7); ctx.fill();
      ctx.fillStyle = '#fbeee0'; ctx.font = `700 ${HEX_SIZE * 0.3}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(n > 1 ? `${n}` : '陣', x - HEX_SIZE * 0.62, y - HEX_SIZE * 0.6);
    }
    if (animating) this.redraw();
  }

  private drawTerrain(ctx: CanvasRenderingContext2D, i: number, t: string) {
    const [cx, cy] = CENTERS[i];
    const S = HEX_SIZE;
    if (t === 'M') {
      ctx.strokeStyle = 'rgba(60,40,20,0.45)'; ctx.lineWidth = 1.3;
      for (const [dx, dy, sz] of [[-0.35, 0.15, 0.34], [0.18, -0.1, 0.42], [0.42, 0.3, 0.26]]) {
        const x = cx + dx * S, y = cy + dy * S, w = sz * S;
        ctx.beginPath(); ctx.moveTo(x - w, y + w * 0.55); ctx.lineTo(x, y - w * 0.5); ctx.lineTo(x + w, y + w * 0.55); ctx.stroke();
      }
    } else if (t === 'F') {
      ctx.fillStyle = 'rgba(40,70,35,0.38)';
      for (const [dx, dy] of [[-0.4, -0.1], [0, 0.25], [0.35, -0.2], [-0.1, -0.42], [0.42, 0.32], [-0.45, 0.4]]) {
        ctx.beginPath(); ctx.arc(cx + dx * S, cy + dy * S, S * 0.11, 0, Math.PI * 2); ctx.fill();
      }
    } else if (t === 'R') {
      ctx.strokeStyle = 'rgba(70,130,175,0.75)'; ctx.lineWidth = S * 0.13;
      ctx.beginPath();
      ctx.moveTo(cx - S * 0.85, cy - S * 0.2);
      ctx.bezierCurveTo(cx - S * 0.3, cy - S * 0.6, cx + S * 0.2, cy + S * 0.5, cx + S * 0.85, cy + S * 0.15);
      ctx.stroke();
    }
  }

  // 城の印: 石高で大きさ（0.72〜1.4倍）と屋根の重ね（小1・中2・大3）が変わる。館は石垣なしの低い屋敷、砦は柵
  private drawCastle(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, mine: boolean, px: number, koku = 12, kind = 'hira') {
    const k = Math.max(0.72, Math.min(1.4, Math.sqrt(koku / 12)));
    const S = HEX_SIZE * 0.5 * k;
    const tiers = koku >= 20 ? 3 : koku >= 8 ? 2 : 1;
    const roof = shade(rgbToHex(color), 0.75);
    const edge = mine ? C.gold : 'rgba(20,14,8,0.8)';
    ctx.save();
    ctx.translate(x, y - S * 0.15);
    if (kind === 'yakata') {
      // 館: 堀と塀に囲まれた低い屋敷
      ctx.fillStyle = '#5b5247';
      ctx.fillRect(-S * 0.8, S * 0.38, S * 1.6, S * 0.17);
      ctx.fillStyle = '#f1ead8';
      ctx.fillRect(-S * 0.6, -S * 0.08, S * 1.2, S * 0.46);
      ctx.fillStyle = roof;
      ctx.beginPath(); ctx.moveTo(-S * 0.78, -S * 0.04); ctx.lineTo(S * 0.78, -S * 0.04); ctx.lineTo(S * 0.5, -S * 0.42); ctx.lineTo(-S * 0.5, -S * 0.42); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = edge; ctx.lineWidth = (mine ? 1.6 : 1) * px;
      ctx.strokeRect(-S * 0.6, -S * 0.08, S * 1.2, S * 0.46);
      ctx.restore();
      return;
    }
    if (kind === 'toride') {
      // 砦: 柵と物見櫓
      ctx.strokeStyle = '#4a3a28'; ctx.lineWidth = Math.max(1, S * 0.07);
      ctx.beginPath();
      for (let i = -4; i <= 4; i++) { const sx = i * S * 0.18; ctx.moveTo(sx, S * 0.55); ctx.lineTo(sx, S * 0.2); }
      ctx.moveTo(-S * 0.75, S * 0.3); ctx.lineTo(S * 0.75, S * 0.3);
      ctx.stroke();
    } else {
      // 石垣
      ctx.fillStyle = '#5b5247';
      ctx.beginPath(); ctx.moveTo(-S * 0.75, S * 0.55); ctx.lineTo(S * 0.75, S * 0.55); ctx.lineTo(S * 0.55, S * 0.1); ctx.lineTo(-S * 0.55, S * 0.1); ctx.closePath(); ctx.fill();
    }
    // 壁と屋根を下から重ねる（上の段ほど細く）
    let w = S * 0.42, top = S * 0.12;
    const wallH = tiers === 3 ? S * 0.3 : S * 0.44 / Math.max(1, tiers - 0.4);
    for (let t = 0; t < tiers; t++) {
      const last = t === tiers - 1;
      const h = t === 0 ? wallH : wallH * 0.75;
      ctx.fillStyle = '#f1ead8';
      ctx.fillRect(-w, top - h, w * 2, h);
      ctx.strokeStyle = edge; ctx.lineWidth = (mine ? 1.6 : 1) * px;
      ctx.strokeRect(-w, top - h, w * 2, h);
      top -= h;
      ctx.fillStyle = roof;
      const ro = w * 1.45, ri = w * 0.75, rh = S * (last ? 0.28 : 0.16);
      ctx.beginPath(); ctx.moveTo(-ro, top + S * 0.04); ctx.lineTo(ro, top + S * 0.04); ctx.lineTo(ri, top - rh); ctx.lineTo(-ri, top - rh); ctx.closePath(); ctx.fill();
      if (last) { ctx.beginPath(); ctx.moveTo(-ri * 1.1, top - rh); ctx.lineTo(ri * 1.1, top - rh); ctx.lineTo(0, top - rh - S * 0.26); ctx.closePath(); ctx.fill(); }
      top -= rh * 0.55;
      w *= 0.7;
    }
    ctx.restore();
  }

  private drawArmy(ctx: CanvasRenderingContext2D, x: number, y: number, id: number, px: number) {
    if (this.armyStyle === 'hayashi') { this.drawArmyGrove(ctx, x, y, id, px); return; }
    if (this.armyStyle === 'nobori' || this.armyStyle === 'hata' || this.armyStyle === 'gunzei') { this.drawArmyBanner(ctx, x, y, id, px); return; }
    if (this.armyStyle !== 'round') { this.drawArmyPiece(ctx, x, y, id, px); return; }
    const s = this.state!;
    const a = s.armies[id];
    if (!a) return;
    const R = HEX_SIZE * 0.6;
    const mine = a.clan === s.player;
    const dim = mine && a.acted;
    const col = s.clans[a.clan].color;
    ctx.save();
    ctx.globalAlpha = dim ? 0.62 : 1;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath(); ctx.arc(x + 1.2, y + 1.6, R, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = a.routed ? '#6b6158' : col;
    ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = (mine ? 2.4 : 1.4) * px * Math.max(1, this.scale / 1.6);
    const ally = !mine && allied(s, s.player, a.clan);
    ctx.strokeStyle = mine ? C.gold : ally ? '#9fd27a' : 'rgba(246,239,224,0.9)';
    ctx.stroke();
    if (this.sel.army === id) {
      ctx.strokeStyle = '#fff3c4'; ctx.lineWidth = 2.4 * px;
      ctx.beginPath(); ctx.arc(x, y, R + 3.2 * px + 1.2, 0, Math.PI * 2); ctx.stroke();
    }
    // 兵数の弧
    const frac = Math.min(1, a.troops / 12000);
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = R * 0.14;
    ctx.beginPath(); ctx.arc(x, y, R * 0.82, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2); ctx.stroke();
    // 名
    const name = s.generals[a.main].name.slice(-2);
    ctx.fillStyle = luminance(col) > 0.55 ? '#1a1410' : '#fbf5e6';
    ctx.font = `700 ${R * 0.62}px ${FONT}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(name, x, y - R * 0.05);
    if (this.scale > 1.1) {
      ctx.font = `600 ${R * 0.36}px ${FONT}`;
      const tx = (a.troops / 1000).toFixed(1);
      ctx.lineWidth = 2.6 * px; ctx.strokeStyle = 'rgba(20,14,8,0.9)';
      ctx.strokeText(tx, x, y + R * 0.98);
      ctx.fillStyle = '#fbf5e6'; ctx.fillText(tx, x, y + R * 0.98);
    }
    if (a.routed) {
      ctx.strokeStyle = '#f0d9c0'; ctx.lineWidth = R * 0.12;
      ctx.beginPath(); ctx.moveTo(x - R * 0.5, y - R * 0.5); ctx.lineTo(x + R * 0.5, y + R * 0.5); ctx.stroke();
    }
    ctx.restore();
  }

  // 凸・駒の形の部隊の印。大きさは兵数で変わる
  private piecePath(ctx: CanvasRenderingContext2D, x: number, y: number, W: number, H: number) {
    ctx.beginPath();
    if (this.armyStyle === 'totsu') {
      // 凸: 下の広い段と上の狭い段
      const top = y - H / 2, mid = y - H * 0.08, bot = y + H / 2, uw = W * 0.56;
      ctx.moveTo(x - W / 2, bot); ctx.lineTo(x + W / 2, bot); ctx.lineTo(x + W / 2, mid); ctx.lineTo(x + uw / 2, mid);
      ctx.lineTo(x + uw / 2, top); ctx.lineTo(x - uw / 2, top); ctx.lineTo(x - uw / 2, mid); ctx.lineTo(x - W / 2, mid);
    } else {
      // 将棋の駒: 上がとがり、肩から下へ少し広がる五角形
      const top = y - H / 2, sh = y - H * 0.2, bot = y + H / 2;
      ctx.moveTo(x, top); ctx.lineTo(x + W * 0.42, sh); ctx.lineTo(x + W / 2, bot); ctx.lineTo(x - W / 2, bot); ctx.lineTo(x - W * 0.42, sh);
    }
    ctx.closePath();
  }
  private drawArmyPiece(ctx: CanvasRenderingContext2D, x: number, y: number, id: number, px: number) {
    const s = this.state!;
    const a = s.armies[id];
    if (!a) return;
    const k = armyScale(a.troops, this.armySize);
    const base = HEX_SIZE * 0.6;
    const koma = this.armyStyle === 'koma';
    const W = HEX_SIZE * (koma ? 1.02 : 1.34) * k, H = HEX_SIZE * (koma ? 1.22 : 0.98) * k;
    const fsBase = HEX_SIZE * 0.4 * Math.sqrt(k); // 名は小さな隊でも読める大きさに
    const mine = a.clan === s.player;
    const col = s.clans[a.clan].color;
    const ally = !mine && allied(s, s.player, a.clan);
    ctx.save();
    ctx.globalAlpha = mine && a.acted ? 0.62 : 1;
    ctx.lineJoin = 'round';
    // 影
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    this.piecePath(ctx, x + 1.3, y + 1.8, W, H); ctx.fill();
    // 地: 家の色に、上から下へ少し濃くなる陰
    const g = ctx.createLinearGradient(0, y - H / 2, 0, y + H / 2);
    const c0 = a.routed ? '#6b6158' : col;
    g.addColorStop(0, mix(rgbToHex(c0), '#ffffff', 0.12)); g.addColorStop(1, shade(rgbToHex(c0), 0.78));
    ctx.fillStyle = g;
    this.piecePath(ctx, x, y, W, H); ctx.fill();
    ctx.lineWidth = (mine ? 2.4 : 1.4) * px * Math.max(1, this.scale / 1.6);
    ctx.strokeStyle = mine ? C.gold : ally ? '#9fd27a' : 'rgba(30,20,12,0.9)';
    ctx.stroke();
    if (!mine && !ally) { ctx.lineWidth = 0.8 * px; ctx.strokeStyle = 'rgba(246,239,224,0.55)'; this.piecePath(ctx, x, y, W * 0.86, H * 0.86); ctx.stroke(); }
    if (this.sel.army === id) {
      ctx.strokeStyle = '#fff3c4'; ctx.lineWidth = 2.4 * px;
      this.piecePath(ctx, x, y, W + 7 * px + 2, H + 7 * px + 2); ctx.stroke();
    }
    // 名: 駒は縦書き、凸は横書き
    const name = s.generals[a.main].name.slice(-2);
    ctx.fillStyle = luminance(col) > 0.55 ? '#1a1410' : '#fbf5e6';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (koma) {
      const fs = Math.min(fsBase, W * 0.52);
      ctx.font = `700 ${fs}px ${FONT}`;
      ctx.fillText(name[0], x, y + H * 0.08 - fs * 0.5);
      if (name[1]) ctx.fillText(name[1], x, y + H * 0.08 + fs * 0.52);
    } else {
      const fs = Math.min(fsBase, W * 0.36);
      ctx.font = `700 ${fs}px ${FONT}`;
      ctx.fillText(name, x, y + H * 0.2);
    }
    if (this.scale > 1.1) {
      ctx.font = `600 ${base * 0.36}px ${FONT}`;
      const tx = (a.troops / 1000).toFixed(1);
      const ty = y + H / 2 + base * 0.3;
      ctx.lineWidth = 2.6 * px; ctx.strokeStyle = 'rgba(20,14,8,0.9)';
      ctx.strokeText(tx, x, ty);
      ctx.fillStyle = '#fbf5e6'; ctx.fillText(tx, x, ty);
    }
    if (a.routed) {
      ctx.strokeStyle = '#f0d9c0'; ctx.lineWidth = base * 0.12;
      ctx.beginPath(); ctx.moveTo(x - W * 0.35, y - H * 0.35); ctx.lineTo(x + W * 0.35, y + H * 0.35); ctx.stroke();
    }
    ctx.restore();
  }

  // 旗の形の部隊の印: 幟（縦長の旗）・流れ旗（横の旗）・軍勢（幟と兵の点）
  private drawArmyBanner(ctx: CanvasRenderingContext2D, x: number, y: number, id: number, px: number) {
    const s = this.state!;
    const a = s.armies[id];
    if (!a) return;
    const k = armyScale(a.troops, this.armySize);
    const st = this.armyStyle;
    const mine = a.clan === s.player;
    const col = a.routed ? '#6b6158' : s.clans[a.clan].color;
    const ally = !mine && allied(s, s.player, a.clan);
    const edge = mine ? C.gold : ally ? '#9fd27a' : 'rgba(246,239,224,0.85)';
    const name = s.generals[a.main].name.slice(-2);
    const ink = luminance(col) > 0.55 ? '#1a1410' : '#fbf5e6';
    ctx.save();
    ctx.globalAlpha = mine && a.acted ? 0.62 : 1;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    // 旗の布の形（竿は左）
    const vertical = st !== 'hata';
    // 幟は竿の根元をヘックスの下寄りに立て、上（奥のヘックス）へはみ出してよい
    const Hh = HEX_SIZE * (vertical ? 2.1 : 1.2) * k; // 竿の高さ
    const bw = vertical ? HEX_SIZE * 0.8 * k : HEX_SIZE * 1.18 * k; // 布の幅
    const bh = vertical ? Hh * 0.64 : HEX_SIZE * 0.62 * k; // 布の高さ
    const footY = vertical ? y + HEX_SIZE * (st === 'gunzei' ? 0.22 : 0.42) : y + Hh * 0.5;
    const poleX = x - bw * 0.5;
    const topY = footY - Hh;
    const cloth = (dx: number, dy: number, grow = 0) => {
      ctx.beginPath();
      const x0 = poleX + dx - grow, y0 = topY + dy + (vertical ? HEX_SIZE * 0.07 * k : 0) - grow;
      if (vertical) {
        ctx.rect(x0, y0, bw + grow * 2, bh + grow * 2);
      } else {
        // 流れ旗: 先が燕尾に割れる
        const w = bw + grow * 2, h = bh + grow * 2;
        ctx.moveTo(x0, y0); ctx.lineTo(x0 + w, y0 + h * 0.08); ctx.lineTo(x0 + w * 0.84, y0 + h * 0.5); ctx.lineTo(x0 + w, y0 + h * 0.92); ctx.lineTo(x0, y0 + h); ctx.closePath();
      }
    };
    // 兵の点（軍勢）: 兵1500ごとに一つ、2〜9
    if (st === 'gunzei') {
      const n = Math.max(2, Math.min(9, Math.round(a.troops / 1500)));
      const r = HEX_SIZE * 0.09 * Math.sqrt(k), cols = Math.min(n, 5);
      for (let j = 0; j < n; j++) {
        const row = Math.floor(j / 5), c = j % 5, cnt = row === 0 ? cols : n - 5;
        const dx = (c - (cnt - 1) / 2) * r * 2.5, dy = footY + r * 1.6 + row * r * 2.3;
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.arc(x + dx + 0.8, dy + 1, r, 0, 7); ctx.fill();
        ctx.fillStyle = shade(rgbToHex(col), 0.85); ctx.beginPath(); ctx.arc(x + dx, dy, r, 0, 7); ctx.fill();
        ctx.lineWidth = 0.8 * px; ctx.strokeStyle = edge; ctx.stroke();
      }
    }
    // 陣の影（足元）
    ctx.fillStyle = 'rgba(10,6,3,0.35)';
    ctx.beginPath(); ctx.ellipse(x, footY + HEX_SIZE * 0.04, HEX_SIZE * 0.5 * k, HEX_SIZE * 0.13 * k, 0, 0, 7); ctx.fill();
    // 影と竿
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; cloth(1.3, 1.6); ctx.fill();
    ctx.strokeStyle = '#2a1d12'; ctx.lineWidth = Math.max(1.6 * px, HEX_SIZE * 0.06 * k);
    ctx.beginPath(); ctx.moveTo(poleX, footY); ctx.lineTo(poleX, topY - HEX_SIZE * 0.06 * k); ctx.stroke();
    if (vertical) { ctx.beginPath(); ctx.moveTo(poleX, topY + HEX_SIZE * 0.07 * k); ctx.lineTo(poleX + bw + HEX_SIZE * 0.05 * k, topY + HEX_SIZE * 0.07 * k); ctx.stroke(); }
    // 布
    const g = ctx.createLinearGradient(poleX, 0, poleX + bw, 0);
    g.addColorStop(0, shade(rgbToHex(col), 0.82)); g.addColorStop(0.5, mix(rgbToHex(col), '#ffffff', 0.1)); g.addColorStop(1, shade(rgbToHex(col), 0.88));
    ctx.fillStyle = g; cloth(0, 0); ctx.fill();
    ctx.lineWidth = (mine ? 2.2 : 1.2) * px * Math.max(1, this.scale / 1.6); ctx.strokeStyle = edge; ctx.stroke();
    // 乳（竿に通す輪）
    if (vertical) { ctx.fillStyle = '#2a1d12'; for (let j = 1; j <= 3; j++) { ctx.beginPath(); ctx.arc(poleX, topY + HEX_SIZE * 0.07 * k + (bh * j) / 4, Math.max(1, HEX_SIZE * 0.035 * k), 0, 7); ctx.fill(); } }
    if (this.sel.army === id) { ctx.strokeStyle = '#fff3c4'; ctx.lineWidth = 2.4 * px; cloth(0, 0, 3.5 * px + 1); ctx.stroke(); }
    // 名
    ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const fs = HEX_SIZE * (vertical ? 0.6 : 0.44) * Math.sqrt(k);
    ctx.font = `700 ${Math.min(fs, vertical ? bw * 0.84 : bh * 0.78)}px ${FONT}`;
    if (vertical) {
      const f2 = Math.min(fs, bw * 0.84), cx = poleX + bw / 2, cy = topY + HEX_SIZE * 0.07 * k + bh / 2;
      ctx.fillText(name[0], cx, cy - f2 * 0.52); if (name[1]) ctx.fillText(name[1], cx, cy + f2 * 0.52);
    } else ctx.fillText(name, poleX + bw * 0.44, topY + bh / 2);
    if (this.scale > 1.1) {
      ctx.font = `600 ${HEX_SIZE * 0.22}px ${FONT}`;
      const tx = (a.troops / 1000).toFixed(1);
      const tyy = st === 'gunzei' ? footY + HEX_SIZE * 0.42 : footY + HEX_SIZE * 0.16;
      ctx.lineWidth = 2.6 * px; ctx.strokeStyle = 'rgba(20,14,8,0.9)'; ctx.strokeText(tx, x + (st === 'gunzei' ? 0 : HEX_SIZE * 0.1), tyy);
      ctx.fillStyle = '#fbf5e6'; ctx.fillText(tx, x + (st === 'gunzei' ? 0 : HEX_SIZE * 0.1), tyy);
    }
    if (a.routed) {
      // 壊乱: 旗が倒れかける（斜めの線）
      ctx.strokeStyle = '#f0d9c0'; ctx.lineWidth = HEX_SIZE * 0.07;
      ctx.beginPath(); ctx.moveTo(poleX, topY); ctx.lineTo(poleX + bw, topY + bh); ctx.stroke();
    }
    ctx.restore();
  }

  // 幟の林: 兵2000ごとに幟を1本（1〜7本）。名は書かない。当主の隊は招きが金、壊乱は幟が傾く
  private drawArmyGrove(ctx: CanvasRenderingContext2D, x0: number, y: number, id: number, px: number) {
    const s = this.state!;
    const a = s.armies[id];
    if (!a) return;
    // 城のあるヘックスでは、城の印にかからないよう右へ寄せる
    const x = x0 + (castleAt(s, a.hex) && !this.anim ? HEX_SIZE * 0.34 : 0);
    const mine = a.clan === s.player;
    const col = a.routed ? '#6b6158' : s.clans[a.clan].color;
    const ally = !mine && allied(s, s.player, a.clan);
    const edge = mine ? C.gold : ally ? '#9fd27a' : 'rgba(246,239,224,0.8)';
    const n = Math.max(1, Math.min(7, Math.ceil(a.troops / 2000)));
    const lord = s.clans[a.clan].leader === a.main;
    const S = HEX_SIZE;
    const bw = S * 0.24, bh = S * 0.82, ph = S * 1.25; // 布の幅・高さ、竿の高さ
    // 並び: 前の列（下）と後ろの列（上・少し高い）を交互に
    const front: number[] = [], back: number[] = [];
    for (let j = 0; j < n; j++) (j % 2 === 0 ? front : back).push(j);
    const spots: { fx: number; fy: number; h: number }[] = [];
    const place = (row: number[], fy: number, h: number, off: number) => row.forEach((_, k) => spots.push({ fx: x + (k - (row.length - 1) / 2) * S * 0.3 + off, fy, h }));
    place(back, y + S * 0.18, ph * 1.08, S * 0.15 * (front.length > back.length ? 0 : 1) - (back.length && front.length > back.length ? 0 : 0));
    place(front, y + S * 0.46, ph, 0);
    ctx.save();
    ctx.globalAlpha = mine && a.acted ? 0.6 : 1;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    // 陣の影
    const spread = Math.max(1, Math.ceil(n / 2)) * S * 0.3 + S * 0.25;
    ctx.fillStyle = 'rgba(10,6,3,0.35)';
    ctx.beginPath(); ctx.ellipse(x, y + S * 0.42, spread * 0.6, S * 0.17, 0, 0, 7); ctx.fill();
    if (this.sel.army === id) {
      ctx.strokeStyle = '#fff3c4'; ctx.lineWidth = 2.4 * px;
      ctx.beginPath(); ctx.ellipse(x, y + S * 0.42, spread * 0.6 + 3 * px, S * 0.17 + 3 * px, 0, 0, 7); ctx.stroke();
    }
    const tilt = a.routed ? -0.45 : 0;
    const one = (fx: number, fy: number, h: number) => {
      ctx.save();
      ctx.translate(fx, fy); ctx.rotate(tilt);
      // 竿
      ctx.strokeStyle = '#24180e'; ctx.lineWidth = Math.max(1.3 * px, S * 0.045);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -h + S * 0.05); ctx.lineTo(bw + S * 0.03, -h + S * 0.05); ctx.stroke();
      // 布（影・地・招き）
      const top = -h + S * 0.05;
      ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(1.2 * px, top + 1.4 * px, bw, bh);
      const g = ctx.createLinearGradient(0, 0, bw, 0);
      g.addColorStop(0, shade(rgbToHex(col), 0.8)); g.addColorStop(0.55, mix(rgbToHex(col), '#ffffff', 0.12)); g.addColorStop(1, shade(rgbToHex(col), 0.88));
      ctx.fillStyle = g; ctx.fillRect(0, top, bw, bh);
      // 招き（上端の帯）: 当主の隊は金、ほかは白
      ctx.fillStyle = lord ? '#e8bf4f' : 'rgba(246,239,224,0.9)'; ctx.fillRect(0, top, bw, bh * (lord ? 0.2 : 0.14));
      ctx.lineWidth = (mine ? 1.8 : 1) * px * Math.max(1, this.scale / 1.6); ctx.strokeStyle = edge; ctx.strokeRect(0, top, bw, bh);
      ctx.restore();
    };
    for (const p of spots) one(p.fx, p.fy, p.h);
    // 足もとの兵
    drawFootSoldiers(ctx, x, y + S * 0.44, spread * 0.6, S * 0.17, Math.max(2, Math.min(14, Math.round(a.troops / 700))), s.clans[a.clan].color, !!a.routed, px, 1.2, (a.guns ?? 0) > 0 ? Math.max(1 / 7, Math.min(1, (a.guns ?? 0) / Math.max(1, a.troops))) : 0);
    // 兵数（よく寄ったときだけ、足元に小さく）
    if (this.scale > 2) {
      ctx.font = `600 ${S * 0.2}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const tx = (a.troops / 1000).toFixed(1);
      ctx.lineWidth = 2.4 * px; ctx.strokeStyle = 'rgba(20,14,8,0.9)'; ctx.strokeText(tx, x, y + S * 0.66);
      ctx.fillStyle = '#fbf5e6'; ctx.fillText(tx, x, y + S * 0.66);
    }
    ctx.restore();
  }
}

function rgbToHex(c: string): string {
  if (c.startsWith('#')) return c;
  const m = c.match(/\d+/g)!.map(Number);
  return '#' + m.slice(0, 3).map((v) => v.toString(16).padStart(2, '0')).join('');
}
function luminance(c: string): number {
  const [r, g, b] = hexToRgb(rgbToHex(c));
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}
