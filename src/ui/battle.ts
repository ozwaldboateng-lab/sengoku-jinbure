import { mood, sfx } from './sound';
import { setTacticalSound } from '../engine/tactical';
setTacticalSound((kind, charge) => sfx(kind === 'shoot' ? 'gun' : kind === 'attack' ? (charge ? 'charge' : 'clash') : kind === 'gate' || kind === 'sneak' ? 'gate' : kind === 'fire' ? 'fire' : kind === 'bow' ? 'tick' : 'tick'));
// 合戦画面: 戦術ヘックスで部隊を操作する
import { applyTactical } from '../engine/combat';
import type { Target } from '../engine/move';
import { addLog, clanName } from '../engine/state';
import {
  T_NAME, T_ROUT, TR, actionTile, canBow, fireChance, sneakChance, chargeMult, isAmbush, routAt, createTactical, doAction, endPhase, fleeRouted, moveUnit, preview, retreatSide, ruseChance,
  siegeDay, SIEGE_DAYS, turnLabel, tcol, trow, tNeighbors, unitActions, unitAt, unitReach, canOrder, hqOf, inCommand, takeCommand, tDist, tdef, canSee, visibleTiles, doScout, scoutRange, ambushAllowance, ambushTiles, setAmbush, doVolley, volleyHelpers, volleyPreview, volleyMax, type TAction, type TUnit, type Tactical,
} from '../engine/tactical';
import { aiScout, aiUnit, autoResolve, nextAIUnit } from '../engine/tacticalAI';
import * as R from '../engine/rules';
import { PORTRAITS } from '../data/portraits';
import { TILE_ART } from '../data/tiles';
import type { Army, BattleReport, GameState } from '../engine/types';
import { drawFootSoldiers } from './render';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const fmt = (n: number) => Math.round(n).toLocaleString('ja-JP');
const FONT = '"Shippori Mincho B1", "Hiragino Mincho ProN", "Yu Mincho", serif';
const SQ3 = Math.sqrt(3);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const TILE: Record<string, string> = {
  P: '#d9cba4', F: '#8fa66e', H: '#b59a6c', R: '#6f9fc2', S: '#9fae8a', C: '#e6dcc4', K: '#efe6d0', W: '#7b746a', G: '#7a5434',
};

// 地形の絵: 地面はつなぎ目のない模様として敷き、木立は森に重ねる
const loadImg = (src: string) => { const im = new Image(); im.src = src; im.onload = () => view?.redraw(); return im; };
const GROUND: Record<string, HTMLImageElement> = Object.fromEntries(Object.entries(TILE_ART).filter(([k]) => k.length === 1).map(([k, v]) => [k, loadImg(v[0])]));
const TREES = (TILE_ART.tree ?? []).map(loadImg);
// 置物（向きを持たない）: 城門（閉・壊）・櫓・本丸の館
const PROP: Record<string, HTMLImageElement | undefined> = Object.fromEntries(['gate', 'gateBroken', 'yagura', 'keep'].map((k) => [k, TILE_ART[k]?.[0] ? loadImg(TILE_ART[k][0]) : undefined]));
const ready = (im?: HTMLImageElement): im is HTMLImageElement => !!im && im.complete && !!im.naturalWidth;
function groundPatterns(c: CanvasRenderingContext2D, ox: number, oy: number, S: number): Record<string, CanvasPattern | undefined> {
  const out: Record<string, CanvasPattern | undefined> = {};
  for (const [k, im] of Object.entries(GROUND)) {
    if (!im.complete || !im.naturalWidth) continue;
    const p = c.createPattern(im, 'repeat');
    if (!p) continue;
    const k2 = (S * 2.4) / im.naturalWidth; // 1枚で2ヘックス半ほど
    p.setTransform(new DOMMatrix().translate(ox, oy).scale(k2));
    out[k] = p;
  }
  return out;
}

// 隣のヘックス（UI用）と、六角形の輪の角かどうか（立方座標の成分のどれかが0）
function tNeighborsUI(t: Tactical, i: number) { return tNeighbors(t, i); }
function isCorner(t: Tactical, i: number, center: number) {
  const cube = (k: number) => { const cc = tcol(t, k), r = trow(t, k); const q = cc - (r - (r & 1)) / 2; return [q, r, -q - r]; };
  const a = cube(i), b = cube(center);
  return a.some((v, k) => v === b[k]);
}

// 合戦の部隊の印（設定で切り替え）
export type UnitStyle = 'nobori' | 'hayashi' | 'sonae' | 'box';
export const UNIT_STYLE_NAME: Record<UnitStyle, string> = { nobori: '幟（縦書きの名）', hayashi: '幟の林（兵が多いほど幟が増える）', sonae: '備（兵の並びが減っていく）', box: '四角（旧来）' };
let battleStyle: UnitStyle = 'hayashi';
try { const v = localStorage.getItem('sengoku-battlestyle'); if (v && v in UNIT_STYLE_NAME) battleStyle = v as UnitStyle; } catch { /* 保存できなくても動く */ }
export const getBattleStyle = () => battleStyle;
export function setBattleStyle(v: UnitStyle) {
  battleStyle = v;
  try { localStorage.setItem('sengoku-battlestyle', v); } catch { /* 保存できなくても続ける */ }
  if (view) { view.unitStyle = v; view.draw(); }
}

interface Floater { tile: number; text: string; color: string; t0: number; }

class BattleView {
  ctx: CanvasRenderingContext2D;
  w = 0; h = 0; dpr = 1; size = 20; ox = 0; oy = 0;
  t: Tactical | null = null; s: GameState | null = null;
  sel: number | null = null; reach: Map<number, number> = new Map(); acts: TAction[] = []; focus: number | null = null;
  floaters: Floater[] = [];
  unitStyle: UnitStyle = battleStyle;
  anim: { unit: number; from: number; to: number; t0: number; dur: number } | null = null;
  onClick: (tile: number) => void = () => {};
  private pending = false;

  constructor(public canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    new ResizeObserver(() => this.resize()).observe(canvas);
    canvas.addEventListener('click', (e) => {
      const r = canvas.getBoundingClientRect();
      const tile = this.tileAt(e.clientX - r.left, e.clientY - r.top);
      if (tile !== null) this.onClick(tile);
    });
  }
  resize() {
    const r = this.canvas.getBoundingClientRect();
    this.dpr = window.devicePixelRatio || 1;
    this.w = r.width; this.h = r.height;
    this.canvas.width = Math.round(r.width * this.dpr); this.canvas.height = Math.round(r.height * this.dpr);
    this.fit(); this.redraw();
  }
  fit() {
    if (!this.t) return;
    const cols = this.t.w + 0.5, rows = this.t.h * 0.75 + 0.25;
    this.size = Math.min(this.w / (cols * SQ3), this.h / (rows * 2)) * 0.98;
    const mw = cols * SQ3 * this.size, mh = rows * 2 * this.size;
    this.ox = (this.w - mw) / 2 + (SQ3 / 2) * this.size;
    this.oy = (this.h - mh) / 2 + this.size;
  }
  center(i: number): [number, number] {
    const t = this.t!;
    const c = tcol(t, i), r = trow(t, i);
    return [this.ox + this.size * SQ3 * (c + 0.5 * (r & 1)), this.oy + this.size * 1.5 * r];
  }
  tileAt(px: number, py: number): number | null {
    const t = this.t;
    if (!t) return null;
    let best: number | null = null, bd = Infinity;
    for (let i = 0; i < t.tiles.length; i++) {
      const [x, y] = this.center(i);
      const d = (x - px) ** 2 + (y - py) ** 2;
      if (d < bd) { bd = d; best = i; }
    }
    return bd <= this.size * this.size ? best : null;
  }
  float(tile: number, text: string, color: string) { this.floaters.push({ tile, text, color, t0: performance.now() }); this.redraw(); }
  redraw() { if (this.pending) return; this.pending = true; requestAnimationFrame(() => { this.pending = false; this.draw(); }); }

  private hex(x: number, y: number, r: number) {
    const c = this.ctx;
    c.beginPath();
    for (let k = 0; k < 6; k++) { const a = ((60 * k - 30) * Math.PI) / 180; const px = x + r * Math.cos(a), py = y + r * Math.sin(a); if (k) c.lineTo(px, py); else c.moveTo(px, py); }
    c.closePath();
  }

  draw() {
    const c = this.ctx, t = this.t, s = this.s;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.fillStyle = '#0e0e10'; c.fillRect(0, 0, this.w, this.h);
    if (!t || !s) return;
    const S = this.size;
    const now = performance.now();
    let animating = false;
    // 地形（絵があれば絵、なければ色）
    const pats = groundPatterns(c, this.ox, this.oy, S);
    for (let i = 0; i < t.tiles.length; i++) {
      const [x, y] = this.center(i);
      const tt = t.tiles[i];
      const pat = pats[tt] ?? (tt === 'G' ? pats.C : undefined); // 城門の下は曲輪の地面
      c.fillStyle = pat ?? TILE[tt];
      this.hex(x, y, S + 0.4); c.fill();
      c.strokeStyle = pat ? 'rgba(25,18,10,0.32)' : 'rgba(40,28,16,0.18)'; c.lineWidth = 1; this.hex(x, y, S); c.stroke();
      if (pat && (tt === 'F' || tt === 'R' || tt === 'P' || tt === 'S' || tt === 'C' || tt === 'W')) continue; // 木立・壁の面は後で重ねる
      if (tt === 'K' && ready(PROP.keep)) continue;
      if (tt === 'G' && ready(PROP.gate)) continue;
      if (pat && tt === 'H') {
        // 丘は平地と見分けやすいよう、等高線と陰を残す
        c.fillStyle = 'rgba(120,90,40,0.18)'; this.hex(x, y, S); c.fill();
        c.strokeStyle = 'rgba(60,40,15,0.6)'; c.lineWidth = 1.4;
        c.beginPath(); c.arc(x, y + S * 0.35, S * 0.55, Math.PI * 1.15, Math.PI * 1.85); c.stroke();
        c.beginPath(); c.arc(x, y + S * 0.35, S * 0.3, Math.PI * 1.15, Math.PI * 1.85); c.stroke();
        continue;
      }
      if (tt === 'F') {
        c.fillStyle = 'rgba(40,70,35,0.45)';
        for (const [dx, dy] of [[-0.35, -0.1], [0.05, 0.3], [0.35, -0.25], [-0.05, -0.45]]) { c.beginPath(); c.arc(x + dx * S, y + dy * S, S * 0.15, 0, 7); c.fill(); }
      } else if (tt === 'H') {
        c.strokeStyle = 'rgba(80,55,25,0.55)'; c.lineWidth = 1.4;
        c.beginPath(); c.arc(x, y + S * 0.35, S * 0.55, Math.PI * 1.15, Math.PI * 1.85); c.stroke();
        c.beginPath(); c.arc(x, y + S * 0.35, S * 0.3, Math.PI * 1.15, Math.PI * 1.85); c.stroke();
      } else if (tt === 'R') {
        c.strokeStyle = 'rgba(230,245,255,0.5)'; c.lineWidth = 1.2;
        for (const dy of [-0.2, 0.2]) { c.beginPath(); c.moveTo(x - S * 0.5, y + dy * S); c.quadraticCurveTo(x, y + dy * S - S * 0.18, x + S * 0.5, y + dy * S); c.stroke(); }
      } else if (tt === 'S') {
        c.strokeStyle = 'rgba(60,90,60,0.6)'; c.lineWidth = 1;
        for (const dx of [-0.3, 0, 0.3]) { c.beginPath(); c.moveTo(x + dx * S, y + S * 0.25); c.lineTo(x + dx * S, y - S * 0.1); c.stroke(); }
      } else if (tt === 'W') {
        c.fillStyle = '#5e574e'; this.hex(x, y, S * 0.82); c.fill();
        c.strokeStyle = 'rgba(230,220,200,0.35)'; c.lineWidth = 1;
        for (const dy of [-0.3, 0, 0.3]) { c.beginPath(); c.moveTo(x - S * 0.6, y + dy * S); c.lineTo(x + S * 0.6, y + dy * S); c.stroke(); }
      } else if (tt === 'G') {
        const hp = (t.gates[i] ?? 0) / Math.max(1, t.gateMax);
        c.fillStyle = hp > 0 ? '#5a3a20' : '#3a2a1c'; c.fillRect(x - S * 0.5, y - S * 0.42, S, S * 0.84);
        c.strokeStyle = '#c9a45c'; c.lineWidth = 1.2; c.strokeRect(x - S * 0.5, y - S * 0.42, S, S * 0.84);
        if (hp > 0) {
          c.fillStyle = 'rgba(0,0,0,0.5)'; c.fillRect(x - S * 0.5, y + S * 0.5, S, 4);
          c.fillStyle = '#e0a040'; c.fillRect(x - S * 0.5, y + S * 0.5, S * hp, 4);
        } else { c.strokeStyle = '#e0583c'; c.lineWidth = 2; c.beginPath(); c.moveTo(x - S * 0.4, y - S * 0.3); c.lineTo(x + S * 0.4, y + S * 0.3); c.stroke(); }
      } else if (tt === 'K') {
        c.fillStyle = '#5b5247'; c.fillRect(x - S * 0.55, y + S * 0.1, S * 1.1, S * 0.3);
        c.fillStyle = '#f6f0e0'; c.fillRect(x - S * 0.35, y - S * 0.3, S * 0.7, S * 0.42);
        c.fillStyle = '#3a3d48';
        c.beginPath(); c.moveTo(x - S * 0.55, y - S * 0.28); c.lineTo(x + S * 0.55, y - S * 0.28); c.lineTo(x + S * 0.25, y - S * 0.55); c.lineTo(x - S * 0.25, y - S * 0.55); c.closePath(); c.fill();
        c.beginPath(); c.moveTo(x - S * 0.3, y - S * 0.55); c.lineTo(x + S * 0.3, y - S * 0.55); c.lineTo(x, y - S * 0.8); c.closePath(); c.fill();
      }
    }
    // 木立（隣のヘックスに少しはみ出してよい）
    const trees = TREES.filter((im) => im.complete && im.naturalWidth);
    if (trees.length) for (let i = 0; i < t.tiles.length; i++) {
      if (t.tiles[i] !== 'F') continue;
      const [x, y] = this.center(i);
      const h = (i * 2654435761) >>> 0;
      const im = trees[h % trees.length];
      const sz = S * (1.85 + ((h >> 8) % 20) / 100);
      const dx = (((h >> 12) % 11) - 5) / 50 * S, dy = (((h >> 16) % 11) - 5) / 50 * S;
      c.drawImage(im, x - sz / 2 + dx, y - sz / 2 + dy, sz, sz);
    }
    // 城: 壁の面（外側へ落ちる暗い帯）・櫓・本丸の館・城門
    if (t.kind === 'siege') this.drawCastle(t, S);
    // 火
    for (const k of Object.keys(t.fire).map(Number)) {
      const [x, y] = this.center(k);
      const fl = 0.85 + 0.15 * Math.sin(now / 90 + k);
      c.fillStyle = 'rgba(255,120,30,0.35)'; this.hex(x, y, S * 0.9); c.fill();
      for (const [dx, sz] of [[-0.3, 0.45], [0.05, 0.6], [0.32, 0.4]]) {
        const fx = x + dx * S, fy = y + S * 0.3, hgt = S * sz * fl;
        c.fillStyle = 'rgba(255,90,20,0.9)';
        c.beginPath(); c.moveTo(fx - S * 0.13, fy); c.quadraticCurveTo(fx - S * 0.12, fy - hgt * 0.6, fx, fy - hgt); c.quadraticCurveTo(fx + S * 0.12, fy - hgt * 0.6, fx + S * 0.13, fy); c.closePath(); c.fill();
        c.fillStyle = 'rgba(255,220,90,0.9)';
        c.beginPath(); c.moveTo(fx - S * 0.06, fy); c.quadraticCurveTo(fx, fy - hgt * 0.5, fx + S * 0.06, fy); c.closePath(); c.fill();
      }
      animating = true;
    }
    // 配置帯の目印
    c.fillStyle = 'rgba(200,68,44,0.07)';
    // 視界の外は暗く
    if (t.fog && t.playerSide) {
      const vis = visibleTiles(t, t.playerSide);
      c.fillStyle = 'rgba(12,9,6,0.42)';
      for (let i = 0; i < t.tiles.length; i++) if (!vis.has(i)) { const [x, y] = this.center(i); this.hex(x, y, S + 0.4); c.fill(); }
    }
    // 本陣の指揮範囲（自軍の手番）
    const cmd = t.playerSide ? t.cmd[t.playerSide] : null;
    const hq = t.playerSide ? hqOf(t, t.playerSide) : null;
    if (cmd && hq && t.phase === t.playerSide && !t.over) {
      c.strokeStyle = 'rgba(150,100,25,0.9)'; c.lineWidth = 2; c.setLineDash([4, 3]);
      for (let i = 0; i < t.tiles.length; i++) if (tDist(t, hq.tile, i) === cmd.range) { const [x, y] = this.center(i); this.hex(x, y, S * 0.8); c.stroke(); }
      c.setLineDash([]);
    }
    // 移動範囲・行動対象
    for (const [i] of this.reach) { const [x, y] = this.center(i); c.fillStyle = 'rgba(255,240,180,0.45)'; this.hex(x, y, S * 0.9); c.fill(); }
    const pulse = 0.55 + 0.45 * Math.sin(now / 170);
    for (const a of this.acts) {
      const tile = actionTile(a);
      const [x, y] = this.center(tile);
      c.strokeStyle = a.kind === 'ruse' ? `rgba(140,170,255,${pulse})` : a.kind === 'fire' ? `rgba(255,150,40,${pulse})` : a.kind === 'sneak' ? `rgba(190,160,255,${pulse})` : a.kind === 'douse' ? `rgba(120,200,255,${pulse})` : `rgba(230,80,50,${pulse})`;
      c.lineWidth = a.kind === 'ruse' ? 1.6 : 2.6;
      if (a.kind === 'ruse' || a.kind === 'fire' || a.kind === 'douse' || a.kind === 'sneak') c.setLineDash([4, 3]);
      this.hex(x, y, S * (a.kind === 'ruse' ? 0.95 : 0.86)); c.stroke();
      c.setLineDash([]);
      animating = true;
    }
    if (this.focus !== null) { const [x, y] = this.center(this.focus); c.strokeStyle = '#fff3c4'; c.lineWidth = 2.5; this.hex(x, y, S * 0.95); c.stroke(); }
    // 部隊
    const gatesFirst = this.unitStyle !== 'box'; // 旗の印は門の上に立てる。四角の印は門の陰に置き、旗だけ門の上に出す
    if (t.kind === 'siege' && gatesFirst) this.drawGates(t, S, pulse);
    for (const u of [...t.units].sort((a, b) => a.tile - b.tile)) { // 上の段から描く（旗が下の段に隠れないよう）
      if (u.out) continue;
      let [x, y] = this.center(u.tile);
      if (this.anim && this.anim.unit === u.id) {
        const f = Math.min(1, (now - this.anim.t0) / this.anim.dur);
        const A = this.center(this.anim.from), B = this.center(this.anim.to);
        x = A[0] + (B[0] - A[0]) * f; y = A[1] + (B[1] - A[1]) * f;
        if (f < 1) animating = true; else this.anim = null;
      }
      if (t.playerSide && u.side !== t.playerSide && !canSee(t, t.playerSide, u)) continue; // 伏せた敵・視界の外の敵は描かない
      this.drawUnit(u, x, y);
    }
    if (t.kind === 'siege' && !gatesFirst) this.drawGates(t, S, pulse);
    // 最後に見た敵の位置（見えなくなった敵）
    if (t.fog && t.playerSide && t.seen) {
      for (const [id, g] of Object.entries(t.seen[t.playerSide])) {
        const u = t.units.find((x) => x.id === +id);
        if (!u || u.out || canSee(t, t.playerSide, u)) continue;
        const [x, y] = this.center(g.tile);
        c.save(); c.globalAlpha = 0.5; c.setLineDash([3, 3]); c.strokeStyle = '#f1e7cf'; c.lineWidth = 1.5;
        c.strokeRect(x - S * 0.55, y - S * 0.55, S * 1.1, S * 1.1); c.setLineDash([]);
        c.fillStyle = '#f1e7cf'; c.font = `700 ${S * 0.5}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('？', x, y);
        c.restore();
      }
    }
    // 浮き文字
    this.floaters = this.floaters.filter((f) => now - f.t0 < 1300);
    c.textAlign = 'center'; c.textBaseline = 'middle';
    for (const f of this.floaters) {
      const k = (now - f.t0) / 1300;
      const [x, y] = this.center(f.tile);
      c.globalAlpha = 1 - k;
      c.font = `700 ${Math.max(12, S * 0.55)}px ${FONT}`;
      c.lineWidth = 3; c.strokeStyle = 'rgba(15,10,6,0.9)'; c.strokeText(f.text, x, y - S * 0.6 - k * S * 0.9);
      c.fillStyle = f.color; c.fillText(f.text, x, y - S * 0.6 - k * S * 0.9);
      c.globalAlpha = 1;
      animating = true;
    }
    if (animating) this.redraw();
  }

  // 城の立体感: 城壁の外側の辺に壁の面と影、内側の辺に明るい縁。置物は向きを変えずに置く
  drawCastle(t: Tactical, S: number) {
    const c = this.ctx;
    const keep = t.tiles.indexOf('K');
    const vert = (x: number, y: number, k: number, r: number) => { const a = ((60 * k - 30) * Math.PI) / 180; return [x + r * Math.cos(a), y + r * Math.sin(a)]; };
    for (let i = 0; i < t.tiles.length; i++) {
      if (t.tiles[i] !== 'W') continue;
      const [x, y] = this.center(i);
      for (const j of tNeighborsUI(t, i)) {
        // 外側（本丸から遠い側）で壁でない隣: 曲輪が重なる城では内側の壁にも面ができる
        const outer = t.tiles[j] !== 'W' && t.tiles[j] !== 'G' && tDist(t, j, keep) > tDist(t, i, keep);
        const inner = (t.tiles[j] === 'C' || t.tiles[j] === 'K') && tDist(t, j, keep) < tDist(t, i, keep);
        if (!outer && !inner) continue;
        const [nx, ny] = this.center(j);
        const ang = (Math.atan2(ny - y, nx - x) * 180) / Math.PI;
        const k0 = Math.round((ang + 30 - 30) / 60); // 隣の方向の両側の頂点
        const a = vert(x, y, k0, S), b = vert(x, y, k0 + 1, S);
        if (outer) {
          // 壁の面: 辺から内側へ暗い帯、外側へ短い影
          const ia = vert(x, y, k0, S * 0.7), ib = vert(x, y, k0 + 1, S * 0.7);
          c.fillStyle = 'rgba(28,20,12,0.55)';
          c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.lineTo(ib[0], ib[1]); c.lineTo(ia[0], ia[1]); c.closePath(); c.fill();
          const oa = [a[0] + (nx - x) * 0.12, a[1] + (ny - y) * 0.12], ob = [b[0] + (nx - x) * 0.12, b[1] + (ny - y) * 0.12];
          c.fillStyle = 'rgba(10,8,5,0.28)';
          c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.lineTo(ob[0], ob[1]); c.lineTo(oa[0], oa[1]); c.closePath(); c.fill();
        } else {
          c.strokeStyle = 'rgba(240,228,200,0.45)'; c.lineWidth = 1.4;
          c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke();
        }
      }
    }
    // 櫓: 一番外の城壁の角（城門でない所）
    const ring = Math.max(...t.tiles.map((x, i) => (x === 'W' || x === 'G' ? tDist(t, i, keep) : 0)));
    if (ready(PROP.yagura)) for (let i = 0; i < t.tiles.length; i++) {
      if (t.tiles[i] !== 'W' || tDist(t, i, keep) !== ring || !isCorner(t, i, keep)) continue;
      const [x, y] = this.center(i);
      const sz = S * 1.7;
      c.drawImage(PROP.yagura, x - sz / 2, y - sz * 0.62, sz, sz);
    }
    // 本丸の館
    if (keep >= 0 && ready(PROP.keep)) {
      const [x, y] = this.center(keep);
      const sz = S * 2.1;
      c.drawImage(PROP.keep, x - sz / 2, y - sz * 0.6, sz, sz);
    }
  }

  // 城門（閉じた門・壊れた門）と耐久。部隊より手前に描く（門の陰の部隊は小さな旗だけ見える）
  drawGates(t: Tactical, S: number, pulse: number) {
    const c = this.ctx, s = this.s!;
    for (const g of Object.keys(t.gates).map(Number)) {
      const [x, y] = this.center(g);
      const hp = (t.gates[g] ?? 0) / Math.max(1, t.gateMax);
      const im = hp > 0 ? PROP.gate : PROP.gateBroken ?? PROP.gate;
      if (!ready(im)) continue;
      const sz = S * 2.6; // 門は大きめに（隣の壁にかかってよい）
      c.drawImage(im, x - sz / 2, y - sz * 0.58, sz, sz);
      if (hp > 0) {
        c.fillStyle = 'rgba(0,0,0,0.55)'; c.fillRect(x - S * 0.5, y + S * 0.52, S, 4);
        c.fillStyle = '#e0a040'; c.fillRect(x - S * 0.5, y + S * 0.52, S * hp, 4);
      }
      // 門の陰の部隊: 旗指物だけを門の上に出す
      const u = unitAt(t, g);
      if (u && this.unitStyle === 'box' && (!t.playerSide || u.side === t.playerSide || canSee(t, t.playerSide, u))) {
        const col = u.clan ? s.clans[u.clan].color : '#7d735c';
        const fx = x + S * 0.36, fy = y - S * 1.05, fw = S * 0.8, fh = S * 0.5;
        c.strokeStyle = '#2a2018'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(fx, fy); c.lineTo(fx, fy + S * 0.9); c.stroke();
        c.fillStyle = u.routed ? '#6b6158' : col; c.fillRect(fx, fy, fw, fh);
        c.strokeStyle = u.side === t.playerSide ? '#d3ae62' : 'rgba(246,239,224,0.9)'; c.lineWidth = 1.2; c.strokeRect(fx, fy, fw, fh);
        c.fillStyle = '#fbf5e6'; c.font = `700 ${S * 0.32}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText(u.troops >= 1000 ? (u.troops / 1000).toFixed(1) + 'k' : String(Math.round(u.troops)), fx + fw / 2, fy + fh / 2 + 1);
      }
      // 選択・攻撃目標の枠は門の上にも出す
      const act = this.acts.find((a) => actionTile(a) === g);
      if (act) { c.strokeStyle = `rgba(230,80,50,${pulse})`; c.lineWidth = 2.6; this.hex(x, y, S * 0.86); c.stroke(); }
      if (this.focus === g || (u && this.sel === u.id)) { c.strokeStyle = '#fff3c4'; c.lineWidth = 2.5; this.hex(x, y, S * 0.95); c.stroke(); }
    }
  }

  drawUnit(u: TUnit, x: number, y: number) {
    const c = this.ctx, t = this.t!, s = this.s!;
    const S = this.size;
    const clan = u.clan;
    const color = clan ? s.clans[clan].color : '#7d735c';
    const mine = t.playerSide === u.side && clan === s.player;
    const ally = t.playerSide === u.side && clan !== s.player;
    const edge = mine ? '#d3ae62' : ally ? '#9fd27a' : 'rgba(246,239,224,0.9)';
    const fill = u.routed ? '#6b6158' : color;
    const lum = parseInt(color.slice(1, 3), 16) * 0.299 + parseInt(color.slice(3, 5), 16) * 0.587 + parseInt(color.slice(5, 7), 16) * 0.114;
    const ink = lum > 140 && !u.routed ? '#1a1410' : '#fbf5e6';
    const label = u.role === 'garrison' ? '城兵' : u.role === 'ashigaru' ? '足軽' : u.role === 'gun' ? '鉄砲' : u.name === '一向一揆' ? '一揆' : (u.general ? s.generals[u.general].name.slice(-2) : '残兵');
    const troops = u.troops >= 1000 ? (u.troops / 1000).toFixed(1) + 'k' : String(Math.round(u.troops));
    const frac = Math.max(0, Math.min(1, u.troops / Math.max(1, u.troops0)));
    const mf = Math.max(0, Math.min(1, u.morale / 1.5));
    const moraleCol = u.morale < routAt(t, u) + 0.15 ? '#d4553a' : '#8fb36a';
    const selected = this.sel === u.id;
    c.save();
    c.globalAlpha = u.hidden ? 0.55 : mine && u.acted && t.phase === u.side ? 0.6 : 1;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    // 印を置く枠（左上・右上・左下の隅に札を付ける）
    let L: number, T: number, Rr: number, B: number;
    const bars = (l: number, b: number, w: number) => {
      c.fillStyle = 'rgba(0,0,0,0.6)'; c.fillRect(l, b, w, 4);
      c.fillStyle = '#f1e7cf'; c.fillRect(l, b, w * frac, 2);
      c.fillStyle = moraleCol; c.fillRect(l, b + 2, w * mf, 2);
    };
    if (this.unitStyle === 'box') {
      const wB = S * 1.15, hB = S * 1.15;
      L = x - wB / 2; T = y - hB / 2; Rr = x + wB / 2; B = y + hB / 2;
      c.fillStyle = 'rgba(0,0,0,0.45)'; c.fillRect(L + 2, T + 2, wB, hB);
      c.fillStyle = fill; c.fillRect(L, T, wB, hB);
      c.lineWidth = mine || ally ? 2.2 : 1.3; c.strokeStyle = edge; c.strokeRect(L, T, wB, hB);
      if (selected) { c.strokeStyle = '#fff3c4'; c.lineWidth = 2.5; c.strokeRect(L - 3, T - 3, wB + 6, hB + 6); }
      c.fillStyle = 'rgba(0,0,0,0.55)'; c.fillRect(L, B - 4, wB, 4);
      c.fillStyle = '#f1e7cf'; c.fillRect(L, B - 4, wB * frac, 4);
      c.fillStyle = moraleCol; c.fillRect(L, T, 3, hB * mf);
      c.fillStyle = ink; c.font = `700 ${S * 0.46}px ${FONT}`; c.fillText(label, x + 1, y - S * 0.12);
      c.font = `600 ${S * 0.3}px ${FONT}`; c.fillText(troops, x + 1, y + S * 0.26);
    } else if (this.unitStyle === 'nobori') {
      // 幟: 竿に縦長の旗。名は縦書き、招き（上の帯）は本陣なら金。足もとに兵数
      const bw = S * 0.62, top = y - S * 1.02, bot = y + S * 0.42, px = x - bw / 2 - S * 0.04;
      L = px - S * 0.1; T = top; Rr = px + bw + S * 0.06; B = bot + S * 0.5;
      c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.ellipse(x, y + S * 0.6, S * 0.55, S * 0.16, 0, 0, 7); c.fill();
      if (selected) { c.strokeStyle = '#fff3c4'; c.lineWidth = 2.5; c.beginPath(); c.ellipse(x, y + S * 0.6, S * 0.62, S * 0.2, 0, 0, 7); c.stroke(); }
      c.save();
      if (u.routed) { c.translate(px, y + S * 0.6); c.rotate(-0.35); c.translate(-px, -(y + S * 0.6)); }
      c.strokeStyle = '#3a2a1a'; c.lineWidth = Math.max(1.5, S * 0.08);
      c.beginPath(); c.moveTo(px, y + S * 0.62); c.lineTo(px, top - S * 0.08); c.moveTo(px, top + S * 0.02); c.lineTo(px + bw + S * 0.05, top + S * 0.02); c.stroke();
      c.fillStyle = 'rgba(0,0,0,0.4)'; c.fillRect(px + 2, top + S * 0.06 + 2, bw, bot - top - S * 0.06);
      c.fillStyle = fill; c.fillRect(px, top + S * 0.06, bw, bot - top - S * 0.06);
      c.fillStyle = u.hq ? '#e8bf4f' : '#f1ead8'; c.fillRect(px, top + S * 0.06, bw, S * 0.2);
      c.lineWidth = mine || ally ? 2 : 1.1; c.strokeStyle = edge; c.strokeRect(px, top + S * 0.06, bw, bot - top - S * 0.06);
      c.fillStyle = ink; c.font = `700 ${S * 0.44}px ${FONT}`;
      const ch = [...label];
      ch.forEach((k, i) => c.fillText(k, px + bw / 2, top + S * 0.52 + i * S * 0.46));
      c.restore();
      c.font = `700 ${S * 0.3}px ${FONT}`; c.lineWidth = 3; c.strokeStyle = 'rgba(20,14,8,0.9)'; c.lineJoin = 'round';
      c.strokeText(troops, x, y + S * 0.76); c.fillStyle = '#fbf5e6'; c.fillText(troops, x, y + S * 0.76);
      bars(px + bw * 0.05, bot + S * 0.04, bw * 0.9);
    } else if (this.unitStyle === 'sonae') {
      // 備: 上から見た兵の並び（減るほど欠ける）と名の札。本陣は陣幕、鉄砲は二列、城兵は石垣の内
      const cols = u.role === 'gun' ? 6 : 5, rows = u.role === 'gun' ? 2 : 4;
      const gw = S * 1.3, gh = u.role === 'gun' ? S * 0.42 : S * 0.78;
      const gx = x - gw / 2, gy = y - S * 0.62;
      L = gx; T = gy - S * 0.1; Rr = gx + gw; B = y + S * 0.62;
      if (u.hq) {
        // 陣幕
        c.fillStyle = '#f1ead8'; c.fillRect(gx - S * 0.08, gy - S * 0.08, gw + S * 0.16, gh + S * 0.16);
        c.fillStyle = fill; for (let k = 0; k < 3; k++) c.fillRect(gx - S * 0.08, gy - S * 0.08 + k * (gh + S * 0.16) / 3 + (gh + S * 0.16) / 9, gw + S * 0.16, (gh + S * 0.16) / 9);
        c.fillStyle = 'rgba(30,22,14,0.75)'; c.fillRect(gx, gy, gw, gh);
      } else if (u.role === 'garrison') {
        c.fillStyle = '#6b6152'; c.fillRect(gx - S * 0.06, gy + gh, gw + S * 0.12, S * 0.12);
      }
      const n = cols * rows, alive = Math.max(1, Math.round(n * frac));
      for (let k = 0; k < n; k++) {
        const r = Math.floor(k / cols), q = k % cols;
        const dx = gx + gw * (q + 0.5) / cols + (r & 1 ? gw / cols * 0.25 : 0), dy = gy + gh * (r + 0.5) / rows;
        const on = k >= n - alive;
        c.fillStyle = on ? fill : 'rgba(0,0,0,0.25)';
        c.beginPath(); c.arc(dx, dy, S * 0.11, 0, 7); c.fill();
        if (on) { c.strokeStyle = 'rgba(15,10,6,0.8)'; c.lineWidth = 0.8; c.stroke(); }
        if (on && u.role === 'gun') { c.strokeStyle = '#2a1e12'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(dx, dy - S * 0.1); c.lineTo(dx, dy - S * 0.26); c.stroke(); }
      }
      if (u.hq) { c.strokeStyle = '#3a2a1a'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x, gy + gh * 0.5); c.lineTo(x, gy - S * 0.35); c.stroke(); c.fillStyle = '#e8bf4f'; c.beginPath(); c.arc(x, gy - S * 0.38, S * 0.13, 0, 7); c.fill(); }
      // 名の札
      const pw = S * 1.5, ph = S * 0.42, py = y + S * 0.14;
      c.fillStyle = 'rgba(0,0,0,0.4)'; c.fillRect(x - pw / 2 + 2, py + 2, pw, ph);
      c.fillStyle = '#efe4c8'; c.fillRect(x - pw / 2, py, pw, ph);
      c.fillStyle = fill; c.fillRect(x - pw / 2, py, S * 0.12, ph);
      c.lineWidth = mine || ally ? 2 : 1; c.strokeStyle = mine ? '#b38a3a' : ally ? '#6f9c50' : 'rgba(40,28,16,0.8)'; c.strokeRect(x - pw / 2, py, pw, ph);
      if (selected) { c.strokeStyle = '#fff3c4'; c.lineWidth = 2.5; c.strokeRect(gx - 4, gy - 4, gw + 8, py + ph - gy + 8); }
      c.fillStyle = '#1a1410'; c.font = `700 ${S * 0.27}px ${FONT}`; c.fillText(`${label} ${troops}`, x + S * 0.06, py + ph / 2 + 0.5);
      bars(x - pw / 2, py + ph, pw);
    } else {
      // 幟の林: 兵の多さで本数（〜5本）、足もとに名の札
      const n = Math.max(1, Math.min(5, Math.ceil(u.troops / 1000)));
      const bw = S * 0.24, bh = S * 0.62, ph = S * 1.05;
      const foot = y + S * 0.18;
      L = x - S * 0.6; T = foot - ph; Rr = x + S * 0.6; B = y + S * 0.84;
      c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.ellipse(x, foot, S * 0.6, S * 0.16, 0, 0, 7); c.fill();
      if (selected) { c.strokeStyle = '#fff3c4'; c.lineWidth = 2.5; c.beginPath(); c.ellipse(x, foot, S * 0.68, S * 0.2, 0, 0, 7); c.stroke(); }
      for (let k = 0; k < n; k++) {
        const off = (k - (n - 1) / 2) * S * 0.24, bx = x + off, by = foot - (k % 2) * S * 0.08;
        c.save();
        if (u.routed) { c.translate(bx, by); c.rotate(-0.4 + k * 0.15); c.translate(-bx, -by); }
        c.strokeStyle = '#3a2a1a'; c.lineWidth = 1.3; c.beginPath(); c.moveTo(bx, by); c.lineTo(bx, by - ph); c.stroke();
        c.fillStyle = fill; c.fillRect(bx, by - ph + S * 0.04, bw, bh);
        c.fillStyle = u.hq ? '#e8bf4f' : '#f1ead8'; c.fillRect(bx, by - ph + S * 0.04, bw, S * 0.12);
        c.lineWidth = 0.9; c.strokeStyle = edge; c.strokeRect(bx, by - ph + S * 0.04, bw, bh);
        c.restore();
      }
      drawFootSoldiers(c, x, foot, S * 0.58, S * 0.17, Math.max(3, Math.min(20, Math.round(u.troops / 160))), color, u.routed, 1, 1.55, u.role === 'gun' ? 1 : 0);
      const pw = S * 1.4, phh = S * 0.4, py = foot + S * 0.2;
      c.fillStyle = '#efe4c8'; c.fillRect(x - pw / 2, py, pw, phh);
      c.lineWidth = mine || ally ? 2 : 1; c.strokeStyle = mine ? '#b38a3a' : ally ? '#6f9c50' : 'rgba(40,28,16,0.8)'; c.strokeRect(x - pw / 2, py, pw, phh);
      c.fillStyle = '#1a1410'; c.font = `700 ${S * 0.26}px ${FONT}`; c.fillText(`${label} ${troops}`, x, py + phh / 2 + 0.5);
      bars(x - pw / 2, py + phh, pw);
    }
    // 隅の札
    const badge = (bx: number, by: number, bg: string, fg: string, k: string) => {
      c.fillStyle = bg; c.beginPath(); c.arc(bx, by, S * 0.22, 0, 7); c.fill();
      c.fillStyle = fg; c.font = `700 ${S * 0.26}px ${FONT}`; c.fillText(k, bx, by + 0.5);
    };
    if (u.hq && this.unitStyle === 'box') badge(Rr - 1, T + 1, '#d3ae62', '#1a1410', '本');
    // 指揮範囲の外: 伝令が残っていれば「伝」、尽きていれば「自」（自らの判断で動く）
    if (mine && !u.out && !u.routed && t.phase === u.side && !u.acted && !inCommand(t, u)) {
      const left = (t.cmd[u.side]?.left ?? 0) > 0;
      badge(L + 1, B - 1, left ? '#e8c46a' : '#c86a50', '#1a1410', left ? '伝' : '自');
    }
    if (u.hidden) badge(L + 1, T + 1, '#3f6b3a', '#f6efe0', '伏');
    if (u.confused > 0) { c.fillStyle = '#8aa6ff'; c.font = `700 ${S * 0.3}px ${FONT}`; c.fillText('乱', Rr - S * 0.15, T + S * 0.2); }
    c.restore();
  }
}

// ───────── 合戦の進行 ─────────
let view: BattleView | null = null;
let tac: Tactical | null = null;
let gs: GameState | null = null;
let sel: number | null = null;
let pending: TAction[] | null = null;
let aiRunning = false;
// 伏兵の配置（合戦の前）: 残り数。null なら配置は終わっている
let deploy: { left: number } | null = null;
let scouting = false; // 物見の地点を選んでいる
let finish: ((r: BattleReport) => void) | null = null;

export function openBattle(s: GameState, a: Army, target: Target, joined: Army[] = []): Promise<BattleReport> {
  const playerSide = a.clan === s.player ? 'A' : 'D';
  mood('battle'); sfx('horn');
  gs = s;
  tac = createTactical(s, a, target, playerSide, joined);
  sel = null; pending = null; delegateQueued = false;
  $('battle').hidden = false;
  if (!view) {
    view = new BattleView($('bt-map') as HTMLCanvasElement);
    (window as unknown as { __sengoku_bt: unknown }).__sengoku_bt = view;
    view.onClick = onTile;
    $('bt-end').onclick = () => endPlayerPhase();
    $('bt-auto').onclick = () => delegate();
    $('bt-retreat').onclick = () => confirmRetreat();
    $('bt-panel').addEventListener('click', onPanel);
    $('bt-roster').addEventListener('click', onPanel);
  }
  view.t = tac; view.s = s;
  view.resize();
  const atk = clanName(s, tac.attackerClan), def = clanName(s, tac.defenderClan);
  const sv = tac.castle !== null ? s.sieges?.[tac.castle] : undefined;
  $('bt-title').textContent = tac.kind === 'siege' ? `${s.castles[tac.castle!].name}攻防戦${sv && sv.clan === tac.attackerClan ? `（包囲${sv.months + 1}か月目）` : ''}` : '野戦';
  const ie = (id: string | null, n: string) => (id && !s.clans[id]?.foreign ? `${n}家` : n); // 朝鮮・明は「家」をつけない
  $('bt-sub').textContent = `${ie(tac.attackerClan, atk)}（攻）対 ${ie(tac.defenderClan, def)}（守）　あなたは${playerSide === 'A' ? '攻め手' : '守り手'}`;
  return new Promise((resolve) => {
    finish = resolve;
    const n = ambushAllowance(tac!, playerSide);
    deploy = n > 0 ? { left: n } : null;
    if (deploy) { sel = null; refresh(); return; } // 伏兵を置いてから始める
    refresh();
    beginBattle();
  });
}

function beginBattle() {
  deploy = null;
  if (tac!.phase !== tac!.playerSide) runAI();
  else startPlayerPhase();
}

function startPlayerPhase() {
  const t = tac!;
  fleeRouted(t, t.playerSide!);
  if (t.over) { showResult(); return; }
  sel = null; pending = null;
  selectNext();
  refresh();
}

// 操作できるのは自家の部隊だけ（同盟国の援軍はAIが動かす）
const isMine = (u: TUnit) => !!tac && !!gs && u.side === tac.playerSide && u.clan === gs.player;
function mineActive(): TUnit[] {
  const t = tac!;
  return t.units.filter((u) => !u.out && isMine(u) && !u.acted && !u.routed && u.confused <= 0 && canOrder(t, u));
}

function selectNext() {
  const list = mineActive().filter((u) => !u.hidden); // 伏兵は自動では選ばない（クリックすれば動かせる）
  const cur = list.findIndex((u) => u.id === sel);
  sel = list.length ? list[(cur + 1) % list.length].id : null;
  pending = null;
}

function selected(): TUnit | null { return tac && sel !== null ? tac.units.find((u) => u.id === sel && !u.out) ?? null : null; }

function onTile(tile: number) {
  const t = tac;
  if (!t || t.over || aiRunning) return;
  if (deploy) {
    // 伏兵の配置: 部隊を選び、明るい森・丘をクリック
    const u = selected();
    const o = unitAt(t, tile);
    if (o && isMine(o) && !o.hq) { sel = o.id; refresh(); return; }
    if (u && !u.hidden && deploy.left > 0 && ambushTiles(t, t.playerSide!).includes(tile)) {
      const from = u.tile;
      setAmbush(t, u, tile); animate(u.id, from, tile);
      deploy.left--; sel = null;
      t.log.push(`${u.name}を伏せた。`);
      refresh(); return;
    }
    return;
  }
  if (t.phase !== t.playerSide) return;
  if (scouting) {
    scouting = false;
    if (!scoutRange(t, t.playerSide!, tile)) { t.log.push('そこまでは物見が届かない。'); refresh(); return; }
    const before = new Map(t.units.map((x) => [x.id, x.troops]));
    doScout(t, gs!, t.playerSide!, tile);
    floatsFrom(before);
    view!.focus = tile; refresh(); return;
  }
  const u = selected();
  if (u && !u.acted && canOrder(t, u)) {
    const acts = unitActions(t, u).filter((a) => actionTile(a) === tile);
    const order = ['attack', 'shoot', 'bow', 'gate', 'sneak', 'fire', 'douse', 'ruse'];
    if (acts.length) { pending = acts.sort((x, y) => order.indexOf(x.kind) - order.indexOf(y.kind)); view!.focus = tile; refresh(); return; }
    const reach = u.moved ? new Map() : unitReach(t, u);
    if (reach.has(tile)) {
      const from = u.tile;
      if (!takeCommand(t, u)) return;
      const before = new Map(t.units.map((x) => [x.id, x.troops]));
      moveUnit(t, u, tile, gs!);
      animate(u.id, from, tile);
      floatsFrom(before);
      if (t.over) { refresh(); showResult(); return; }
      pending = null; view!.focus = null;
      if (!unitActions(t, u).length) { u.acted = true; selectNext(); }
      refresh(); return;
    }
  }
  const o0 = unitAt(t, tile);
  const o = o0 && o0.side !== t.playerSide && !canSee(t, t.playerSide!, o0) ? null : o0; // 伏せた敵・視界の外の敵は見えない
  if (o && isMine(o)) { sel = o.id; pending = null; view!.focus = null; refresh(); return; }
  view!.focus = o ? tile : null; pending = null;
  refresh(o);
}

function animate(unit: number, from: number, to: number) {
  if (reduced() || !view) return;
  view.anim = { unit, from, to, t0: performance.now(), dur: 220 };
  view.redraw();
}

function act(a: TAction, charge: boolean) {
  const t = tac!, u = selected();
  if (!u) return;
  if (!takeCommand(t, u)) return;
  const before = new Map(t.units.map((x) => [x.id, x.troops]));
  const gateBefore = a.kind === 'gate' ? t.gates[a.tile] : 0;
  doAction(t, gs!, u, a, charge);
  floatsFrom(before);
  if (a.kind === 'gate') view!.float(a.tile, `門−${fmt(gateBefore - (t.gates[a.tile] ?? 0))}`, '#f0c060');
  if (a.kind === 'ruse') view!.float(a.target.tile, a.target.confused > 0 ? '混乱' : '失敗', '#9db4ff');
  if (a.kind === 'fire') view!.float(a.tile, t.fire[a.tile] ? '火計' : '不発', '#ffb050');
  if (a.kind === 'sneak') view!.float(a.tile, t.gates[a.tile] <= 0 ? '開門' : '見破られる', '#c8b4ff');
  if (a.kind === 'douse') view!.float(a.tile, t.fire[a.tile] ? '消えず' : '消火', '#9fd8ff');
  pending = null; view!.focus = null;
  if (t.over) { refresh(); showResult(); return; }
  selectNext();
  refresh();
}

function floatsFrom(before: Map<number, number>) {
  for (const x of tac!.units) {
    const b = before.get(x.id) ?? x.troops;
    const d = Math.round(b - x.troops);
    if (d > 0) view!.float(x.tile, `−${fmt(d)}`, x.side === tac!.playerSide ? '#ff9a7a' : '#ffe08a');
  }
}

function endPlayerPhase() {
  if (deploy) return;
  const t = tac;
  if (!t || t.over || aiRunning || t.phase !== t.playerSide) return;
  // 伝令の届かない部隊は自らの判断で動く（その場を固め、隣の敵に応戦）
  const before = new Map(t.units.map((x) => [x.id, x.troops]));
  for (const u of t.units) if (isMine(u) && !u.out && !u.acted && !u.cmd && !inCommand(t, u) && !t.over) aiUnit(t, gs!, u, true);
  floatsFrom(before);
  if (t.over) { refresh(); showResult(); return; }
  for (const u of t.units) if (isMine(u)) u.acted = true;
  // 自軍側の同盟部隊が残っていれば、AIが動かしてから手番を終える
  if (t.units.some((u) => !u.out && u.side === t.playerSide && !u.acted)) { runAI(true); return; }
  endPhase(t, gs!);
  if (t.over) { refresh(); showResult(); return; }
  runAI();
}

async function runAI(alliesOnly = false) {
  const t = tac!;
  aiRunning = true;
  sel = null; pending = null; view!.focus = null;
  refresh();
  const side = t.phase;
  if (!alliesOnly) { fleeRouted(t, side); aiScout(t, gs!, side); }
  for (let guard = 0; guard < 40 && !t.over; guard++) {
    if (delegateQueued) break;
    const u = nextAIUnit(t, side, alliesOnly ? (x) => x.clan !== gs!.player : undefined);
    if (!u) break;
    const before = new Map(t.units.map((x) => [x.id, x.troops]));
    const r = aiUnit(t, gs!, u);
    if (r && (r.from !== r.to || r.msg)) {
      if (r.from !== r.to) animate(u.id, r.from, r.to);
      floatsFrom(before);
      refresh();
      await sleep(reduced() ? 60 : r.msg ? 420 : 200);
    }
  }
  if (delegateQueued) { delegateQueued = false; aiRunning = false; delegate(); return; }
  if (!t.over) endPhase(t, gs!);
  aiRunning = false;
  if (t.over) { refresh(); showResult(); return; }
  if (t.phase === t.playerSide) startPlayerPhase();
  else runAI();
}

let delegateQueued = false;
function delegate() {
  deploy = null;
  const t = tac;
  if (!t || t.over) return;
  // 敵の手番中なら、いま動いている部隊の行動が終わりしだい委任する
  if (aiRunning) { delegateQueued = true; $('bt-phase').textContent = '委任を受け付けた…'; return; }
  // 残りを自動で解決
  autoResolve(t, gs!);
  refresh();
  showResult();
}

function confirmRetreat() {
  const t = tac;
  if (!t || t.over || aiRunning) return;
  $('bt-panel').innerHTML = `<h3>退却</h3><p class="hint">全部隊が兵の8%を失って退く。合戦は負けとなり、${t.playerSide === 'A' ? '軍団は元の位置から一歩下がる' : '軍団は持ち場を捨てて退く'}。</p>
    <div class="actions"><button class="act primary" data-bact="retreat-yes">退却する</button><button class="act" data-bact="cancel">続ける</button></div>`;
}

function showResult() {
  const t = tac!, s = gs!;
  const won = t.over === t.playerSide;
  const draw = t.over === 'draw';
  sfx(won ? 'win' : draw ? 'clap' : 'lose');
  const siegeGoesOn = draw && t.kind === 'siege' && t.playerSide === 'A';
  const defending = draw && t.kind === 'siege' && t.playerSide === 'D';
  const sum = (side: 'A' | 'D', start: boolean) => t.units.filter((u) => u.side === side).reduce((x, u) => x + (start ? t.start[u.id] : u.troops), 0);
  const me = t.playerSide!, en = me === 'A' ? 'D' : 'A';
  $('bt-panel').innerHTML = `<div class="bt-result ${won ? 'win' : draw ? 'draw' : 'lose'}"><div class="stamp">${won ? '勝利' : draw ? (t.kind === 'siege' ? '月越し' : '引き分け') : '敗北'}</div>
    <p>${esc(t.reason)}</p>
    <dl class="kv"><dt>自軍</dt><dd>${fmt(sum(me, true))} → ${fmt(sum(me, false))}</dd><dt>敵軍</dt><dd>${fmt(sum(en, true))} → ${fmt(sum(en, false))}</dd><dt>${t.kind === 'siege' ? '日数' : '刻'}</dt><dd>${t.kind === 'siege' ? `${siegeDay(t)} / ${SIEGE_DAYS}日` : `${Math.min(t.turn, t.maxTurn)} / ${t.maxTurn}`}</dd></dl>
    ${siegeGoesOn ? `<p class="hint" style="margin:6px 0">囲んだままにすれば、来月の評定でこの軍団に${esc(s.castles[t.castle!].name)}への出陣命令が出ている。評定を終えると、この盤面の続きから攻める（門の傷・部隊の位置はそのまま）。そのあいだ城兵は城の蔵を食べる。</p>` : ''}
    ${defending ? `<p class="hint" style="margin:6px 0">敵は囲みを続けるかもしれない。囲まれているあいだ城の蔵は減っていく。後詰めを送るか、敵の補給を断てば囲みは解ける。</p>` : ''}
    <div class="actions">${siegeGoesOn ? `<button class="act primary" data-bact="leave">囲んだまま月を送る</button><button class="act" data-bact="lift">囲みを解いて退く</button>` : `<button class="act primary" data-bact="leave">戦場を去る</button>`}</div></div>`;
  void s;
  ['bt-end', 'bt-auto', 'bt-retreat'].forEach((id) => $(id).setAttribute('disabled', ''));
}

function leave(lift = false) {
  const t = tac!, s = gs!;
  const rep = applyTactical(s, t);
  if (lift && t.castle !== null && s.sieges?.[t.castle]) {
    delete s.sieges[t.castle];
    addLog(s, `${s.castles[t.castle].name}の囲みを解いた。`, 'battle', true);
    const ev = `囲みを解いた`; rep.events = rep.events.filter((e) => !e.startsWith('包囲')).concat(ev);
  }
  $('battle').hidden = true;
  ['bt-end', 'bt-auto', 'bt-retreat'].forEach((id) => $(id).removeAttribute('disabled'));
  tac = null;
  const f = finish; finish = null;
  f?.(rep);
}

function onPanel(e: Event) {
  const b = (e.target as HTMLElement).closest('[data-bact]') as HTMLElement | null;
  if (!b || !tac) return;
  const k = b.dataset.bact!;
  if (k === 'leave') { leave(); return; }
  if (k === 'lift') { leave(true); return; }
  if (k === 'deploy-done' && deploy) { beginBattle(); refresh(); return; }
  if (k === 'scout' && tac && tac.phase === tac.playerSide && !aiRunning) { scouting = !scouting; refresh(); return; }
  if (k === 'retreat-yes') { retreatSide(tac, tac.playerSide!); refresh(); showResult(); return; }
  if (k === 'cancel') { refresh(); return; }
  if (tac.over || aiRunning) return;
  if (k === 'pick') { sel = +b.dataset.id!; pending = null; view!.focus = null; refresh(); return; }
  if (k === 'next') { selectNext(); refresh(); return; }
  if (k === 'wait') { const u = selected(); if (u) { u.acted = true; u.moved = true; } selectNext(); refresh(); return; }
  if (k === 'do' && pending) {
    const a = pending[+b.dataset.i!];
    if (a) act(a, b.dataset.charge === '1');
  }
  if (k === 'volley' && pending) {
    const a = pending[+b.dataset.i!];
    const u = selected();
    if (!a || !u || !('target' in a)) return;
    const t = tac!;
    const before = new Map(t.units.map((x) => [x.id, x.troops]));
    doVolley(t, gs!, [u, ...volleyHelpers(t, gs!, u, a.target)], a.target, b.dataset.charge === '1');
    floatsFrom(before);
    pending = null; view!.focus = null;
    if (t.over) { refresh(); showResult(); return; }
    selectNext(); refresh();
  }
}

// ───────── 表示更新 ─────────
function refresh(inspect?: TUnit | null) {
  const t = tac, s = gs;
  if (!t || !s || !view) return;
  const u = selected();
  view.sel = u?.id ?? null;
  const myTurn = t.phase === t.playerSide && !aiRunning && !t.over;
  const ok = !!u && canOrder(t, u);
  view.reach = deploy ? new Map(u && !u.hidden && deploy.left > 0 ? ambushTiles(t, t.playerSide!).map((i) => [i, 0]) : []) : myTurn && u && ok && !u.moved && !u.acted ? unitReach(t, u) : new Map();
  view.acts = !deploy && myTurn && u && ok && !u.acted ? unitActions(t, u) : [];
  view.redraw();
  $('bt-turn').textContent = turnLabel(t);
  $('bt-turn').title = t.kind === 'siege' ? `城攻めは一か月がかり。1手番＝約${(SIEGE_DAYS / t.maxTurn).toFixed(1)}日（${t.maxTurn}手番で月末）` : '野戦は一日のうち。日没（上限の刻）で両軍は兵を引く';
  const cm = t.playerSide ? t.cmd[t.playerSide] : null;
  $('bt-phase').textContent = deploy ? `伏兵の配置（あと${deploy.left}隊）` : t.over ? '決着' : t.phase === t.playerSide ? `あなたの手番${cm ? `　伝令 ${cm.left}/${cm.couriers}` : ''}` : '敵の手番…';
  $('bt-phase').className = `bt-phase ${t.phase === t.playerSide ? 'mine' : ''}`;
  ['bt-end', 'bt-auto', 'bt-retreat'].forEach((id) => { if (!t.over) ($(id) as HTMLButtonElement).disabled = !myTurn && id === 'bt-end'; });
  if (!t.over) $('bt-panel').innerHTML = panelHtml(t, s, inspect ?? null);
  $('bt-roster').innerHTML = rosterHtml(t, s);
  $('bt-log').innerHTML = t.log.slice(-40).reverse().map((l) => `<li>${esc(l)}</li>`).join('');
}

function unitCard(t: Tactical, s: GameState, u: TUnit) {
  const g = u.general ? s.generals[u.general] : null;
  const known = g && (g.clan === s.player || s.revealed.includes(g.id));
  const clan = u.clan;
  // 能力由来の値は、武将が判明しているか城兵のときだけ見せる
  const leadId = u.general ?? (u.army !== null ? s.armies[u.army]?.main ?? null : null);
  const show = u.side === t.playerSide || u.role === 'garrison' || (!!leadId && s.revealed.includes(leadId));
  const pic = leadId && PORTRAITS[leadId] ? `<img class="face" src="${PORTRAITS[leadId]}" width="64" height="80" alt="">` : '';
  return `<div class="ph">${pic}<div><h2>${esc(u.name)}${u.hq ? '<span class="pill warn">本陣</span>' : ''}</h2><div class="sub">${esc(clanName(s, clan))}${clan ? '家' : ''}　${T_NAME[t.tiles[u.tile]]}（守×${tdef(t, u.tile).toFixed(2)}）</div></div></div>
    <dl class="kv"><dt>兵</dt><dd>${fmt(u.troops)} / ${fmt(u.troops0)}</dd><dt>士気</dt><dd>${u.morale.toFixed(2)}${u.routed ? '　潰走' : ''}${u.confused > 0 ? '　混乱' : ''}</dd>
    ${g ? `<dt>武将</dt><dd>${known ? `武${g.bra} 知${g.int} 統${g.lea} 魅${g.cha}` : '能力不明'}</dd>` : ''}
    <dt>攻／防</dt><dd>${show ? `${u.atk.toFixed(2)} ／ ${u.def.toFixed(2)}` : '？'}</dd>
    <dt>壊乱</dt><dd>${show ? `士気${routAt(t, u).toFixed(2)}未満で潰走${T_ROUT[t.tiles[u.tile]] ? `（地形${T_ROUT[t.tiles[u.tile]] > 0 ? '+' : ''}${T_ROUT[t.tiles[u.tile]].toFixed(2)}）` : ''}` : '？'}</dd></dl>`;
}

function panelHtml(t: Tactical, s: GameState, inspect: TUnit | null): string {
  const u = selected();
  if (deploy) {
    return `<h3>伏兵の配置</h3><p class="hint">合戦の前に、あと${deploy.left}隊を森か丘に伏せられる（自陣側の半分、敵に隣接しない場所）。部隊を選び、明るいヘックスをクリック。</p>
      <ul class="hint" style="padding-left:1.2em"><li>伏せた部隊は、動くか仕掛けるまで敵から見えない。</li><li>敵が隣に来ると、伏兵が襲いかかる（反撃なし・敵の士気−${TR.AMBUSH_SHOCK}・混乱）。</li><li>伏せた状態から攻撃すると攻撃×${TR.AMBUSH_HIDDEN}。</li><li>伏せられる数は、自軍で最も知略の高い武将で決まる（60以上1隊、75以上2隊、90以上3隊）。</li></ul>
      ${u ? unitCard(t, s, u) : ''}<div class="actions"><button class="act primary" data-bact="deploy-done">配置を終えて合戦を始める</button></div>`;
  }
  if (inspect && inspect.side !== t.playerSide) return unitCard(t, s, inspect) + `<p class="hint">敵部隊。自部隊を選び、赤枠をクリックで攻撃。</p>`;
  if (t.phase !== t.playerSide || aiRunning) return `<h3>敵の手番</h3><p class="hint">敵が動いている。</p>`;
  const cm0 = t.cmd[t.playerSide!];
  const autoN = t.units.filter((x) => isMine(x) && !x.out && !x.acted && !x.routed && !inCommand(t, x)).length;
  if (scouting) return `<h3>物見</h3><p class="hint">物見を出す地点をクリック（自軍の部隊から${R.SCOUT_RANGE}ヘックス以内）。周り${R.SCOUT_RADIUS}ヘックスを次の手番まで見通し、伏兵も見破る。敵の知将の近くでは欺かれやすい（知略60を超えた分だけ成功率が下がる、最低40%）。</p><div class="actions"><button class="act" data-bact="scout">やめる</button></div>`;
  if (!u) return `<h3>全部隊が行動済み</h3><p class="hint">「手番終了」で敵の手番へ。${cm0 && autoN ? `伝令の届かない${autoN}部隊は自らの判断で動く。` : ''}</p><div class="actions"><button class="act primary" data-bact="next">未行動の部隊を探す</button>${scoutBtn(t)}</div>`;
  const parts = [unitCard(t, s, u)];
  const cm = t.cmd[t.playerSide!];
  if (cm && !inCommand(t, u)) {
    parts.push(cm.left > 0 ? `<p class="hint warn">本陣の指揮範囲（${cm.range}ヘックス）の外。動かすと伝令を1回使う（残り${cm.left}）。</p>`
      : `<p class="hint warn">伝令が尽きた。この部隊は手番の終わりに自らの判断で動く（その場を固め、隣の敵にだけ応戦）。</p>`);
  }
  if (pending) {
    const opts: string[] = [];
    pending.forEach((a, i) => {
      if (a.kind === 'attack') {
        const p = preview(t, u, a.target, false), q = preview(t, u, a.target, true);
        opts.push(`<button class="act primary" data-bact="do" data-i="${i}">攻撃　敵−${fmt(p.dealt)}／自−${fmt(p.taken)}</button>`);
        opts.push(`<button class="act" data-bact="do" data-i="${i}" data-charge="1">突撃×${chargeMult(t, a.target.tile)}　敵−${fmt(q.dealt)}／自−${fmt(q.taken)}</button>`);
        opts.push(...volleyButtons(t, s, u, a.target, i));
        if (isAmbush(t, u, a.target)) opts.push(`<span class="hint" style="margin:0">森からの伏兵: 攻撃×${TR.AMBUSH}</span>`);
      } else if (a.kind === 'shoot') {
        const p = preview(t, u, a.target, false, 'gun');
        opts.push(`<button class="act primary" data-bact="do" data-i="${i}">鉄砲を撃つ　敵−${fmt(p.dealt)}（反撃なし）</button>`);
        opts.push(...volleyButtons(t, s, u, a.target, i));
      } else if (a.kind === 'bow') {
        const p = preview(t, u, a.target, false, true);
        opts.push(`<button class="act primary" data-bact="do" data-i="${i}">射撃　敵−${fmt(p.dealt)}（反撃なし）</button>`);
      } else if (a.kind === 'ruse') {
        opts.push(`<button class="act" data-bact="do" data-i="${i}">計略（混乱）成功${Math.round(ruseChance(t, u, a.target) * 100)}%${t.tiles[u.tile] === 'F' ? '（森+15%）' : ''}</button>`);
      } else if (a.kind === 'fire') {
        const e = unitAt(t, a.tile);
        opts.push(`<button class="act primary" data-bact="do" data-i="${i}">火計（${t.tiles[a.tile] === 'G' ? '城門' : esc(e?.name ?? '')}）成功${Math.round(fireChance(t, u) * 100)}%</button>`);
      } else if (a.kind === 'sneak') {
        opts.push(`<button class="act primary" data-bact="do" data-i="${i}">忍び込み（石垣を越えて城門を内から開ける・一度だけ）成功${Math.round(sneakChance(t, u) * 100)}%</button>`);
      } else if (a.kind === 'douse') {
        opts.push(`<button class="act primary" data-bact="do" data-i="${i}">消火　成功${Math.round(TR.DOUSE * 100)}%</button>`);
      } else if (a.kind === 'gate') {
        opts.push(`<button class="act primary" data-bact="do" data-i="${i}">城門を攻める（残り${fmt(t.gates[a.tile] ?? 0)}）</button>`);
        opts.push(`<button class="act" data-bact="do" data-i="${i}" data-charge="1">突撃で門を破る（士気−0.05）</button>`);
      }
    });
    const p0 = pending[0];
    const tgt = 'target' in p0 ? p0.target : unitAt(t, p0.tile);
    if (pending.some((a) => a.kind === 'fire')) parts.push(`<p class="hint">火計: 着火すると城門は耐久の${TR.FIRE_GATE_HIT * 100}%、部隊は兵の${TR.FIRE_HIT * 100}%を失う。${t.kind === 'siege' ? `${TR.FIRE_TURNS}手番（約${Math.round(TR.FIRE_TURNS * SIEGE_DAYS / t.maxTurn)}日）燃え続け、手番ごとにさらに損害。` : `${TR.FIRE_TURNS}刻燃え続け、毎刻さらに損害。`}燃えるヘックスは通れない。成功率は知略と城方の最も知略の高い武将の差で決まる。</p>`);
    if (tgt && tgt.side !== t.playerSide) parts.push(`<h3 style="margin-top:10px">目標</h3>` + unitCard(t, s, tgt));
    parts.push(`<div class="actions bt-opts">${opts.join('')}</div>`);
    if (pending.some((x) => x.kind === 'attack')) parts.push(`<p class="hint">突撃: 平地なら攻撃×1.3、それ以外×1.1。被害×${TR.CHARGE_SELF}、武将討死率${TR.DEATH_CHARGE * 100}%。隣接する味方1部隊ごとに攻撃+${TR.FLANK * 100}%。</p>`);
  } else {
    parts.push(`<div class="actions"><button class="act" data-bact="next">次の部隊</button><button class="act" data-bact="wait">待機</button>${scoutBtn(t)}</div>`);
    if (t.fog) parts.push(`<p class="hint">視界: 本陣の指揮下の部隊は周り${R.SIGHT}ヘックス（丘から${R.SIGHT_HIGH}）が見え、指揮の外の部隊は隣しか見えない。森の中の敵は隣まで近づかないと見えない。暗い所は見えていない。「？」は最後に敵を見た位置。</p>`);
    if (cm) parts.push(`<p class="hint">金の点線＝本陣の指揮範囲。外の部隊へは伝令で指揮する（${t.kind === 'siege' ? '手番' : '刻'}ごとに${cm.couriers}回＝1＋${esc(cm.label)}${cm.tsukai.length}人）。</p>`);
    if (u.role === 'gun') parts.push(`<p class="hint">鉄砲隊: 2ヘックス先まで撃てて反撃を受けない。丘×1.1・城内×1.2・森×0.6・川や湿地×0.7、隣に敵がいると×0.7。白兵戦はできず、防御が低い。</p>`);
    parts.push(`<p class="hint">${u.moved ? '移動済み。隣接する敵（赤枠）を攻撃するか待機。' : '明るいヘックスへ移動、赤枠で攻撃、青い点線は計略、橙の点線は火計の届く目標。'}${canBow(t, u) ? '城内からは2ヘックス先を射撃できる。' : ''}</p>`);
  }
  return parts.join('');
}

// 一斉攻撃のボタン（加勢できる味方がいれば）
function volleyButtons(t: Tactical, s: GameState, u: TUnit, e: TUnit, i: number): string[] {
  const helpers = volleyHelpers(t, s, u, e);
  if (!helpers.length) return [];
  const units = [u, ...helpers];
  const names = helpers.map((x) => x.name.replace(/隊$/, '')).join('・');
  const cm = t.cmd[u.side];
  const need = helpers.filter((x) => !inCommand(t, x)).length;
  const note = `${units.length}隊（＋${names}）${need ? `・伝令${need}` : ''}`;
  const out = [`<button class="act primary" data-bact="volley" data-i="${i}">一斉攻撃 ${note}　敵−${fmt(volleyPreview(t, units, e, false))}</button>`];
  if (u.role !== 'gun') out.push(`<button class="act" data-bact="volley" data-i="${i}" data-charge="1">一斉突撃 ${units.length}隊　敵−${fmt(volleyPreview(t, units, e, true))}</button>`);
  out.push(`<span class="hint" style="margin:0">一斉攻撃: 損害をまとめて与え、敵の士気を大きく下げる（${units.length}隊で士気の下がり方×${(1 + TR.VOLLEY_MORALE * (units.length - 1)).toFixed(2)}、さらに−${(TR.VOLLEY_SHOCK * units.length).toFixed(2)}）。反撃は最も強い1隊だけ。加われるのは総大将の統率で最大${volleyMax(t, s, u.side)}隊${cm ? '、指揮範囲の外の隊は伝令を使う' : ''}。</span>`);
  return out;
}

// 見えなくなった敵（最後に見た兵と刻）
function ghostRows(t: Tactical, me: 'A' | 'D') {
  if (!t.fog || !t.seen) return '';
  return Object.entries(t.seen[me]).map(([id, g]) => {
    const u = t.units.find((x) => x.id === +id);
    if (!u || u.out || canSee(t, me, u)) return '';
    return `<li><button disabled><span class="grow">？${esc(u.name)}</span><span class="num">${fmt(g.troops)}?</span><span class="st">${t.kind === 'siege' ? `${siegeDay(t, g.turn)}日目` : `第${g.turn}刻`}</span></button></li>`;
  }).join('');
}

function scoutBtn(t: Tactical) {
  const sc = t.scouts?.[t.playerSide!];
  return t.fog && sc ? `<button class="act" data-bact="scout" ${sc.left > 0 ? '' : 'disabled'}>物見（残り${sc.left}）</button>` : '';
}

function rosterHtml(t: Tactical, s: GameState) {
  const row = (u: TUnit) => {
    const mine = isMine(u);
    const st = u.out === 'dead' ? '壊滅' : u.out === 'escaped' ? '離脱' : u.routed ? '潰走' : u.confused > 0 ? '混乱' : mine && u.acted && t.phase === u.side ? '済' : '';
    return `<li><button ${mine && !u.out ? `data-bact="pick" data-id="${u.id}"` : 'disabled'} class="${sel === u.id ? 'on' : ''}"><span class="grow">${u.hq ? '◎' : ''}${u.clan && u.clan !== (u.side === 'A' ? t.attackerClan : t.defenderClan) ? `［${esc(clanName(s, u.clan))}］` : ''}${esc(u.name)}</span><span class="num">${fmt(u.troops)}</span><span class="num">${u.morale.toFixed(2)}</span><span class="st">${st}</span></button></li>`;
  };
  const me = t.playerSide!, en = me === 'A' ? 'D' : 'A';
  return `<h3>自軍</h3><ul class="list">${t.units.filter((u) => u.side === me).map(row).join('')}</ul>
    <h3 style="margin-top:8px">敵軍</h3><ul class="list">${t.units.filter((u) => u.side === en && (u.out || canSee(t, me, u))).map(row).join('')}${ghostRows(t, me)}</ul>`;
}
