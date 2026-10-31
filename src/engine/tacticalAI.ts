// 合戦AI: 部隊ごとに「移動→行動」を決める。プレイヤーの委任にも使う。
import type { GameState } from './types';
import {
  T_COST, TR, canBow, fireChance, doAction, endPhase, fleeRouted, moveUnit, power, preview, ruseChance, tDist, tNeighbors,
  takeCommand, tdef, canSee, doScout, noteSeen, scoutRange, visibleTiles, doVolley, volleyHelpers, volleyPreview, unitActions, unitAt, unitReach, type Side, type TAction, type TUnit, type Tactical,
} from './tactical';

// 目標地点までの地形コスト距離（部隊は無視、攻め手は未破壊の門も高コストで通れるとみなす）
function distField(t: Tactical, goals: number[], side: Side): number[] {
  const d = new Array(t.tiles.length).fill(Infinity);
  const open: [number, number][] = goals.map((g) => [0, g]);
  for (const g of goals) d[g] = 0;
  while (open.length) {
    open.sort((a, b) => a[0] - b[0]);
    const [c, i] = open.shift()!;
    if (c > d[i]) continue;
    for (const j of tNeighbors(t, i)) {
      const tt = t.tiles[j];
      if (tt === 'W') continue;
      const step = tt === 'G' && side === 'A' && (t.gates[j] ?? 0) > 0 ? 6 : T_COST[tt];
      if (c + step < d[j]) { d[j] = c + step; open.push([c + step, j]); }
    }
  }
  return d;
}

function value(t: Tactical, u: TUnit, a: TAction, charge: boolean): number {
  if (a.kind === 'gate') return 300 + power(t, u) * TR.GATE_DMG * 0.6;
  if (a.kind === 'fire') {
    const e = unitAt(t, a.tile);
    const p = fireChance(t, u);
    if (p < 0.3) return -1; // 分の悪い火計は試さない
    const gain = t.tiles[a.tile] === 'G' ? t.gateMax * 0.6 + 200 : (e ? e.troops * 0.2 + 150 : 0);
    return p * gain;
  }
  if (a.kind === 'douse') return t.tiles[a.tile] === 'G' || unitAt(t, a.tile) ? 260 : 120;
  if (a.kind === 'ruse') {
    const e = a.target;
    if (e.confused > 0 || e.routed) return -1;
    return ruseChance(t, u, e) * power(t, e) * 0.12 - 40;
  }
  const e = a.target;
  const p = preview(t, u, e, charge, a.kind === 'shoot' ? 'gun' : a.kind === 'bow');
  let v = p.dealt - p.taken * (u.hq ? 2.2 : 0.9);
  if (e.hq) v += 120;
  if (p.dealt >= e.troops - 50) v += 200; // 止めを刺せる
  if (e.routed) v += 40;
  return v;
}

function bestAction(t: Tactical, u: TUnit, aggressive: boolean): { a: TAction; charge: boolean; v: number } | null {
  let best: { a: TAction; charge: boolean; v: number } | null = null;
  for (const a of unitActions(t, u)) {
    const opts = a.kind === 'attack' && !u.hq && power(t, u) > power(t, a.target) * 1.3 ? [false, true] : [false];
    for (const charge of opts) {
      const v = value(t, u, a, charge);
      if (!best || v > best.v) best = { a, charge, v };
    }
  }
  if (!best) return null;
  const threshold = aggressive ? -60 : 0;
  return best.v > threshold ? best : null;
}

// 敵の兵力の見積もり: 見えている敵と、最後に見た敵の兵
function knownPower(t: Tactical, side: Side) {
  if (!t.fog || !t.seen) return sidePower(t, side === 'A' ? 'D' : 'A');
  return t.units.filter((e) => e.side !== side && !e.out && !e.routed && t.seen![side][e.id]).reduce((x, e) => x + (canSee(t, side, e) ? power(t, e) : t.seen![side][e.id].troops), 0);
}
const lastSeen = (t: Tactical, side: Side) => Object.values(t.seen?.[side] ?? {}).map((g) => g.tile);
const enemyHome = (t: Tactical, side: Side) => Math.floor(t.h / 2) * t.w + (side === 'A' ? t.w - 2 : 1);

const aiScouted = new WeakMap<Tactical, Record<Side, number[]>>();
// 物見（AI）: 敵が見えなければ最後に見た位置か敵陣の方へ、見えていれば自軍の前の森を探る
export function aiScout(t: Tactical, s: GameState, side: Side) {
  if (!t.fog || !t.scouts) return;
  const visible = t.units.some((e) => e.side !== side && canSee(t, side, e));
  const targets: number[] = [];
  if (!visible) targets.push(...lastSeen(t, side), enemyHome(t, side));
  const front = t.units.filter((u) => !u.out && u.side === side && !u.hidden);
  const forests = t.tiles.map((x, i) => i).filter((i) => t.tiles[i] === 'F' && !visibleTiles(t, side).has(i) && front.some((u) => tDist(t, u.tile, i) <= 3));
  targets.push(...forests);
  const done = (aiScouted.get(t) ?? aiScouted.set(t, { A: [], D: [] }).get(t)!)[side];
  for (const tile of targets) {
    if (t.scouts[side].left <= 0) break;
    if (t.tiles[tile] === 'F' && done.some((d) => tDist(t, d, tile) <= 1)) continue; // 一度探った森は探り直さない
    // 届かなければ自軍に近い側へ寄せる
    let tt = tile;
    if (!scoutRange(t, side, tt)) {
      const near = t.tiles.map((x, i) => i).filter((i) => scoutRange(t, side, i)).sort((a, b) => tDist(t, a, tile) - tDist(t, b, tile))[0];
      if (near === undefined) continue; tt = near;
    }
    if (visibleTiles(t, side).has(tt) && t.tiles[tt] !== 'F') continue;
    done.push(tt);
    doScout(t, s, side, tt);
  }
}

function sidePower(t: Tactical, side: Side) {
  return t.units.filter((u) => !u.out && u.side === side && !u.routed).reduce((x, u) => x + power(t, u), 0);
}

// 1部隊の手番。行動したら true
// auto: 伝令が届かない部隊（その場を固め、隣の敵にだけ応戦する）
export function aiUnit(t: Tactical, s: GameState, u: TUnit, forceAuto = false): { from: number; to: number; msg?: string } | null {
  if (u.out || u.acted || u.routed || u.confused > 0) { u.acted = true; return null; }
  const auto = forceAuto || !takeCommand(t, u);
  const from = u.tile;
  const enemySide: Side = u.side === 'A' ? 'D' : 'A';
  // 伏せている敵・視界の外の敵は見えない
  noteSeen(t, u.side);
  const enemies = t.units.filter((e) => e.side === enemySide && canSee(t, u.side, e));
  // 伏兵: 敵が2ヘックス以内に来るまで（または合戦の後半まで）は伏せたまま待つ
  if (u.hidden && t.turn <= t.maxTurn * 0.6 && !enemies.some((e) => !e.routed && tDist(t, u.tile, e.tile) <= 2)) { u.acted = true; return null; }
  const ratio = sidePower(t, u.side) / Math.max(1, knownPower(t, u.side));
  const aggressive = !auto && (u.side === 'A' ? ratio > 0.6 || t.turn > t.maxTurn * 0.4 : ratio > 1.15);
  // 本陣は護衛となる味方がいる間だけ後方に控える
  const cautious = u.hq && t.units.some((x) => !x.out && x.side === u.side && !x.hq && !x.routed);

  // 動かずに有利な行動があれば実行
  const now = bestAction(t, u, aggressive);
  if (now && (now.v > 150 || cautious || canBow(t, u) || u.role === 'gun')) {
    const msg = act(t, s, u, now);
    return { from, to: u.tile, msg };
  }

  // 目標
  let goals: number[];
  if (auto) goals = [u.tile];
  else if (t.kind === 'siege' && u.side === 'A') goals = [t.tiles.indexOf('K')];
  else if (t.kind === 'siege' && u.side === 'D') {
    const broken = Object.keys(t.gates).map(Number).filter((g) => t.gates[g] <= 0 && !unitAt(t, g));
    goals = broken.length ? broken : [u.tile];
  } else if (cautious) {
    const friends = t.units.filter((x) => !x.out && x.side === u.side && !x.hq && !x.routed);
    goals = friends.length ? friends.map((x) => x.tile) : [u.tile];
  } else if (!aggressive && u.side === 'D') {
    goals = [u.tile];
  } else {
    goals = enemies.filter((e) => !e.routed).map((e) => e.tile);
    if (!goals.length) goals = enemies.map((e) => e.tile);
    if (!goals.length) goals = lastSeen(t, u.side); // 見えなければ最後に見た位置へ
    if (!goals.length) goals = [enemyHome(t, u.side)]; // それもなければ敵の陣の方へ
  }
  const field = distField(t, goals, u.side);
  const reach = unitReach(t, u);
  const myP = power(t, u);
  let best = u.tile, bs = -Infinity;
  for (const tile of [u.tile, ...reach.keys()]) {
    let sc = -field[tile] * 3 + tdef(t, tile) * 6;
    let danger = 0, chance = 0;
    for (const j of tNeighbors(t, tile)) {
      const e = unitAt(t, j);
      if (!e || e.side === u.side || e.id === u.id || e.hidden) continue;
      danger += power(t, e);
      if (!e.routed) chance = Math.max(chance, preview(t, { ...u, tile }, e, false).dealt - preview(t, { ...u, tile }, e, false).taken);
      if (e.hq) chance += 80;
    }
    if (cautious) sc -= (danger / Math.max(1, myP)) * 30 + (enemies.some((e) => tDist(t, tile, e.tile) <= 2) ? 15 : 0);
    else sc += aggressive ? chance / 40 : -(danger / Math.max(1, myP)) * 6;
    if (u.role === 'gun') {
      // 鉄砲隊は敵から2ヘックスの間合いを保つ
      const adjE = tNeighbors(t, tile).filter((j) => { const e = unitAt(t, j); return !!e && e.side !== u.side && e.id !== u.id && !e.routed && !e.hidden; }).length;
      sc += (enemies.some((e) => !e.routed && tDist(t, tile, e.tile) === 2) ? 18 : 0) - adjE * 25;
    }
    if (t.kind === 'siege' && u.side === 'A') {
      // 門に取り付く
      if (tNeighbors(t, tile).some((j) => t.tiles[j] === 'G' && (t.gates[j] ?? 0) > 0)) sc += 12;
    }
    if (sc > bs) { bs = sc; best = tile; }
  }
  if (best !== u.tile) moveUnit(t, u, best, s);
  u.moved = true;
  if (u.out || u.acted || t.over) return { from, to: u.tile };
  const after = bestAction(t, u, aggressive);
  let msg: string | undefined;
  if (after) msg = act(t, s, u, after);
  else u.acted = true;
  return { from, to: u.tile, msg };
}

// 攻撃なら、同じ敵を攻められる味方を集めて一斉攻撃にする（本陣・大きな部隊・止めを刺せるとき）
function act(t: Tactical, s: GameState, u: TUnit, b: { a: TAction; charge: boolean; v: number }) {
  if ((b.a.kind === 'attack' || b.a.kind === 'shoot') && !u.hq) {
    const e = b.a.target;
    const helpers = volleyHelpers(t, s, u, e);
    const worth = e.hq || e.troops >= u.troops * 0.6 || volleyPreview(t, [u, ...helpers], e, b.charge) >= e.troops - 50;
    if (helpers.length && worth) return doVolley(t, s, [u, ...helpers], e, b.charge && b.a.kind === 'attack');
  }
  return doAction(t, s, u, b.a, b.charge);
}

// 次に動かす部隊（本陣は最後）
export function nextAIUnit(t: Tactical, side: Side, only?: (u: TUnit) => boolean): TUnit | null {
  const list = t.units.filter((u) => !u.out && u.side === side && !u.acted && (!only || only(u)));
  list.sort((a, b) => Number(a.hq) - Number(b.hq) || b.troops - a.troops);
  return list[0] ?? null;
}

export function beginAIPhase(t: Tactical, side: Side, s?: GameState) { fleeRouted(t, side); if (s) aiScout(t, s, side); }

// 片方の手番をまとめて処理（委任・自動戦闘用）
export function runAIPhase(t: Tactical, s: GameState) {
  const side = t.phase;
  beginAIPhase(t, side, s);
  for (let guard = 0; guard < 40 && !t.over; guard++) {
    const u = nextAIUnit(t, side);
    if (!u) break;
    aiUnit(t, s, u);
  }
  endPhase(t, s);
}

export function autoResolve(t: Tactical, s: GameState) {
  for (let guard = 0; guard < 200 && !t.over; guard++) runAIPhase(t, s);
}
