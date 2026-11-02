// 合戦（戦術ヘックス）: 野戦と攻城戦
// 戦略マップで攻撃が起きると、別のヘックスマップで部隊を動かして決着をつける。
import { childrenOf, directOf } from './corps';
import { HEXES } from './map';
import type { Target } from './move';
import * as R from './rules';
import { castleAt, castleKoku, rand, drillOf, personalCap } from './state';
import { hasProduct } from './money';
import { defenderSupports, supportArmies } from './combat';
import { tsukaiLabel, tsukaiOf } from './ranks';
import type { Army, GameState, General } from './types';
import { armyHas, CHIKUJO_GATE, govTrait, GUNSHI_COURIER, GUNSHI_RANGE, HOJUTSU_GUN, traitOf } from './traits';

export type TTerrain = 'P' | 'F' | 'H' | 'R' | 'S' | 'C' | 'K' | 'W' | 'G';
export const T_NAME: Record<TTerrain, string> = { P: '平地', F: '森', H: '丘', R: '川', S: '湿地', C: '曲輪', K: '本丸', W: '城壁', G: '城門' };
export const T_COST: Record<TTerrain, number> = { P: 1, F: 2, H: 2, R: 3, S: 3, C: 1, K: 1, W: 99, G: 1 };
export const T_DEF: Record<TTerrain, number> = { P: 1.0, F: 1.2, H: 1.25, R: 0.85, S: 0.85, C: 1.4, K: 1.6, W: 1, G: 1.4 };
// 地形による壊乱閾値の増減（川・湿地は崩れやすく、城内は粘る）
export const T_ROUT: Record<TTerrain, number> = { P: 0, F: 0, H: 0, R: R.WET_ROUT, S: R.WET_ROUT, C: R.CASTLE_ROUT, K: R.CASTLE_ROUT, W: 0, G: R.CASTLE_ROUT };

export const TR = {
  FIELD_TURNS: 10,
  SIEGE_TURNS: 15,
  MP: 4,
  ROUTED_MP: 3,
  DMG: 0.125, // 攻撃1回の損害係数（÷相手の防御力）
  COUNTER: 0.0625, // 反撃
  BOW: 0.075, // 城からの射撃（反撃なし）
  GUN: 0.11, // 鉄砲の射撃（反撃なし、2ヘックスまで）
  GUN_ATK: 1.5, GUN_DEF: 0.8, GUN_ROUT: 0.05, // 鉄砲隊は武将の能力によらない
  GUN_CLOSE: 0.7, // 隣に敵がいると射撃×0.7
  CAP: 0.35, // 1回で失う兵の上限割合
  CHARGE_SELF: 1.15, // 突撃時の被害倍率（突撃の攻撃倍率は平地1.3／他1.1）
  SPREAD: 0.15, // 損害の振れ幅（±15%）
  AMBUSH: 1.2, // 森から仕掛け、知略が15以上上回る
  AMBUSH_GAP: 15,
  FOREST_RUSE: 0.15, // 森にいる部隊の計略成功率加算
  FLANK: 0.15, // 隣接味方1部隊ごとの攻撃加算（最大3部隊）
  HIGH: 1.15, // 丘から非丘への攻撃
  IN_RIVER: 0.85, // 川の中からの攻撃
  HQ_FALL: 0.25, // 本陣崩壊時の全軍士気低下
  RUSE_RANGE: 2,
  GATE_DMG: 0.12,
  DEATH_HIT: 0.005,
  DEATH_CHARGE: 0.02,
  FIRE_RANGE: 2, // 火計の届く距離（攻城戦の攻め手のみ）
  FIRE_TURNS: 2, // 燃え続ける刻数
  FIRE_BASE: 0.35, // 成功率 = 0.35 + (知略 − 城方の最高知略)/100
  FIRE_HIT: 0.12, // 着火時: 部隊の兵の12%、士気−0.15
  FIRE_BURN: 0.08, // 毎刻: 部隊の兵の8%、士気−0.1
  FIRE_GATE_HIT: 0.3, // 着火時: 城門耐久の30%
  FIRE_GATE_BURN: 0.2, // 毎刻: 城門耐久の20%
  DOUSE: 0.7, // 消火の成功率
  NAIO_MORALE: 0.3, // 内応: 城兵の士気低下
  AMBUSH_HIDDEN: 1.5, // 伏せた状態から仕掛けたときの攻撃倍率
  AMBUSH_SHOCK: 0.15, // 伏兵に襲われた側の士気低下
  VOLLEY_MORALE: 0.25, // 一斉攻撃: 1部隊増えるごとに士気の下がり方+25%
  VOLLEY_SHOCK: 0.05, // 一斉攻撃: 部隊数×0.05の士気低下（一度に崩れる衝撃）
  VOLLEY_CAP: 0.6, // 一斉攻撃で一度に失う兵の上限割合
  FATE_DEATH: 0.15,
  FATE_CAPTURE: 0.4,
};

export type Side = 'A' | 'D';
export interface TUnit {
  id: number; side: Side; clan: string | null; army: number | null; general: string | null;
  role: 'main' | 'deputy' | 'ashigaru' | 'garrison' | 'gun'; name: string; hq: boolean;
  troops: number; troops0: number; morale: number;
  atk: number; def: number; rout: number; int: number;
  tile: number; mp: number; moved: boolean; acted: boolean;
  routed: boolean; confused: number; out: null | 'dead' | 'escaped';
  cmd?: boolean; // この手番に指揮下にある（本陣の近く、または伝令を受けた）
  hidden?: boolean; // 伏兵（敵から見えない。動くか仕掛けると現れる）
}
// 伝令: 本陣から range 以内は自由に指揮、外の部隊は伝令（手番ごとに couriers 回）で指揮する
export interface Command { clan: string; range: number; couriers: number; left: number; label: string; tsukai: string[]; }
export interface Tactical {
  kind: 'field' | 'siege';
  w: number; h: number; tiles: TTerrain[]; gates: Record<number, number>; gateMax: number;
  cannon?: number; // 攻め手の大筒（門）
  fire: Record<number, number>; // 燃えているヘックス → 残り刻数
  units: TUnit[]; turn: number; maxTurn: number; phase: Side;
  attackerClan: string; defenderClan: string | null;
  horse?: string[]; // 馬の産地を持つ家（突撃の自軍の損害が減る）
  primaryA: number; primaryD: number | null; castle: number | null; hex: number;
  armiesA: number[]; armiesD: number[];
  log: string[]; deaths: string[]; captures: { general: string; by: string }[];
  start: Record<number, number>; // 開始時の兵数（部隊id）
  over: null | 'A' | 'D' | 'draw'; reason: string;
  playerSide: Side | null;
  cmd: Record<Side, Command | null>;
  rings?: number; cdef?: number; // 攻城戦: 曲輪の重なり数と、城内の守りの倍率（城の種類による）
  fog?: boolean; // 視界（野戦のみ）
  seen?: Record<Side, Record<number, { tile: number; troops: number; turn: number }>>; // 最後に見た敵の位置
  scouts?: Record<Side, { left: number; max: number }>; // 物見の残り回数（毎刻）
  scoutAreas?: { side: Side; tile: number }[]; // 物見で見通している場所（その側の次の手番まで）
}
// 城攻めは一か月がかり: 刻の上限で30日。1刻は 30÷刻数 日（15刻なら2日、20刻なら1.5日）。野戦は一日のうち
export const SIEGE_DAYS = 30;
export const siegeDay = (t: Tactical, turn = t.turn) => turn > t.maxTurn ? SIEGE_DAYS : Math.floor((turn - 1) * SIEGE_DAYS / t.maxTurn) + 1; // その手番の始まりの日
export const turnLabel = (t: Tactical) => t.kind === 'siege' ? `${siegeDay(t)}日目 / ${SIEGE_DAYS}日` : `第${Math.min(t.turn, t.maxTurn)}刻 / ${t.maxTurn}`;
const CASTLE_TILE = new Set<TTerrain>(['C', 'K', 'G', 'W']);
// 地形の守り（城内は城の種類で増減）
export const tdef = (t: Tactical, i: number) => T_DEF[t.tiles[i]] * (CASTLE_TILE.has(t.tiles[i]) ? t.cdef ?? 1 : 1);

// ───────── 幾何（odd-r オフセット、尖頂ヘックス） ─────────
const DIRS_EVEN = [[1, 0], [0, -1], [-1, -1], [-1, 0], [-1, 1], [0, 1]];
const DIRS_ODD = [[1, 0], [1, -1], [0, -1], [-1, 0], [0, 1], [1, 1]];
export const tcol = (t: Tactical, i: number) => i % t.w;
export const trow = (t: Tactical, i: number) => Math.floor(i / t.w);
export function tNeighbors(t: Tactical, i: number): number[] {
  const c = tcol(t, i), r = trow(t, i);
  const out: number[] = [];
  for (const [dc, dr] of r & 1 ? DIRS_ODD : DIRS_EVEN) {
    const nc = c + dc, nr = r + dr;
    if (nc >= 0 && nc < t.w && nr >= 0 && nr < t.h) out.push(nr * t.w + nc);
  }
  return out;
}
const cube = (t: Tactical, i: number) => { const c = tcol(t, i), r = trow(t, i); const q = c - (r - (r & 1)) / 2; return [q, r, -q - r]; };
export function tDist(t: Tactical, a: number, b: number) {
  const A = cube(t, a), B = cube(t, b);
  return Math.max(Math.abs(A[0] - B[0]), Math.abs(A[1] - B[1]), Math.abs(A[2] - B[2]));
}

// ───────── 生成 ─────────

// 鉄砲を撃つ位置の補正: 丘×1.1、森×0.6、川・湿地×0.7、城内×1.2
export const GUN_TERRAIN: Partial<Record<TTerrain, number>> = { H: 1.1, F: 0.6, R: 0.7, S: 0.7, C: 1.2, K: 1.2, G: 1.2 };

function armyUnits(s: GameState, a: Army, side: Side, hq: boolean, nextId: () => number): TUnit[] {
  const m = s.generals[a.main];
  const k0 = R.drillMult(drillOf(a)), kr = R.drillRout(drillOf(a)), k = k0;
  // 鉄砲隊（鉄砲の数だけの兵）。残りの兵で主将・補佐・足軽隊を組む
  const gunN = (a.guns ?? 0) >= R.GUN_MIN_UNIT ? Math.min(a.guns!, Math.max(0, a.troops - 200)) : 0;
  const gunUnit: TUnit[] = gunN >= R.GUN_MIN_UNIT ? [{
    id: nextId(), side, clan: a.clan, army: a.id, general: null, role: 'gun', name: `${m.name.slice(0, 2)}鉄砲隊`, hq: false,
    troops: gunN, troops0: gunN, morale: a.routed ? Math.max(a.morale, R.routOf(m.lea, m.cha) - kr + TR.GUN_ROUT + R.ROUTED_START_MARGIN) : a.morale, atk: TR.GUN_ATK * k * (armyHas(s, a, 'hojutsu') ? HOJUTSU_GUN : 1), def: TR.GUN_DEF * k, rout: R.routOf(m.lea, m.cha) - kr + TR.GUN_ROUT + (a.monto ? R.MONTO_ROUT : 0), int: 40,
    tile: -1, mp: 0, moved: false, acted: false, routed: false, confused: a.routed ? 1 : 0, out: null,
  }] : [];
  const rest = a.troops - (gunUnit.length ? gunN : 0);
  // 主将の隊と、主将のすぐ下の武将（最大2人）がそれぞれ率いる隊。その下の武将は属する隊の兵を厚くし、攻防を少し上げる
  const direct = a.ikki ? [] : directOf(s, a).slice(0, R.CORPS_CHILDREN);
  const subtree = (id: string): General[] => childrenOf(s, a, id).flatMap((c) => [c, ...subtree(c.id)]);
  type Part = { role: TUnit['role']; g: General | null; w: number; bonus: number };
  const parts: Part[] = [{ role: 'main', g: a.ikki ? null : m, w: personalCap(s, m) * R.CORPS_MAIN_TROOP, bonus: 0 }];
  for (const c of direct) {
    const below = subtree(c.id);
    parts.push({ role: 'deputy', g: c, w: [c, ...below].reduce((x, h) => x + personalCap(s, h) * R.CORPS_SUB_TROOP, 0), bonus: Math.min(R.CORPS_UNIT_BONUS_MAX, below.length * R.CORPS_UNIT_BONUS) });
  }
  // 傘下がおらず大軍なら、主将の下に名無しの足軽隊（主将の値から一段落ちる）
  if (!direct.length && rest > 6000) { parts[0].w = 0.6; parts.push({ role: 'ashigaru', g: null, w: 0.4, bonus: 0 }); }
  // 本陣（主将の旗本）は兵の35%以上を持つ。傘下が厚くても本陣だけが薄くならないように
  if (parts.length > 1) {
    const others = parts.slice(1).reduce((x, p) => x + p.w, 0);
    const minMain = (R.HQ_SHARE_MIN / (1 - R.HQ_SHARE_MIN)) * others;
    if (parts[0].w < minMain) parts[0].w = minMain;
  }
  const wsum = parts.reduce((x, p) => x + p.w, 0) || 1;
  let left = rest;
  return [...parts.map((p, k) => {
    const troops = k === parts.length - 1 ? left : Math.round((rest * p.w) / wsum);
    left -= troops;
    const g = p.g;
    const src = g ?? m;
    const ash = g || p.role === 'main' ? 0 : 1;
    const kk = k0 * (1 + p.bonus);
    const atk = (R.atkOf(src.bra, src.lea) - 0.1 * ash) * kk, def = (R.defOf(src.lea, src.int, src.cha) - 0.1 * ash) * kk;
    const rout = R.routOf(src.lea, src.cha) - kr + 0.05 * ash + (a.monto ? R.MONTO_ROUT : 0);
    return {
      id: nextId(), side, clan: a.clan, army: a.id, general: g?.id ?? null, role: p.role,
      name: a.ikki ? '一向一揆' : g ? `${g.name}隊` : `${m.name.slice(0, -2) || m.name}足軽隊`, hq: hq && p.role === 'main',
      troops, troops0: troops, morale: a.routed ? Math.max(a.morale, rout + R.ROUTED_START_MARGIN) : a.morale, atk, def, rout, int: g ? g.int : 40,
      tile: -1, mp: 0, moved: false, acted: false, routed: false, confused: a.routed ? 1 : 0, out: null,
    };
  }), ...gunUnit];
}

function genField(s: GameState, w: number, h: number, base: string): TTerrain[] {
  const tiles: TTerrain[] = new Array(w * h).fill('P');
  const mix: Record<string, [TTerrain, number][]> = {
    P: [['F', 4], ['H', 3], ['S', 1]], F: [['F', 9], ['H', 3]], M: [['H', 9], ['F', 5]], R: [['F', 3], ['H', 2], ['S', 2]],
  };
  const blobs = mix[base] ?? mix.P;
  const fake = { w, h } as Tactical;
  for (const [terr, n] of blobs) {
    for (let k = 0; k < n; k++) {
      let i = Math.floor(rand(s) * w * h);
      const size = 2 + Math.floor(rand(s) * 4);
      for (let j = 0; j < size; j++) {
        tiles[i] = terr;
        const nb = tNeighbors(fake, i);
        i = nb[Math.floor(rand(s) * nb.length)];
      }
    }
  }
  if (base === 'R') {
    // 中央を蛇行する川（浅瀬はなく、渡るのに時間がかかる）
    let c = Math.floor(w / 2) - 1 + Math.floor(rand(s) * 3);
    for (let r = 0; r < h; r++) {
      tiles[r * w + c] = 'R';
      const d = rand(s);
      c = Math.max(3, Math.min(w - 4, c + (d < 0.3 ? -1 : d > 0.7 ? 1 : 0)));
    }
  }
  // 配置帯はなるべく通りやすく
  for (let r = 0; r < h; r++) for (const c of [0, 1, w - 2, w - 1]) if (tiles[r * w + c] === 'S' || tiles[r * w + c] === 'R') tiles[r * w + c] = 'P';
  return tiles;
}

function genSiege(s: GameState, t: Tactical, cx: number, cy: number) {
  const center = cy * t.w + cx;
  const gateMarks: number[] = [];
  const c = s.castles[t.castle!];
  const n = t.rings = R.CASTLE_KIND[c.kind ?? 'hira'].rings;
  t.cdef = (R.CASTLE_KIND[c.kind ?? 'hira'].def + (c.fort ?? 0) * R.FORT_DEF) / R.CASTLE_DEF_BASE;
  for (let i = 0; i < t.tiles.length; i++) {
    const d = tDist(t, i, center);
    if (d === 0) t.tiles[i] = 'K';
    else if (d <= 2 * n && d % 2 === 1) t.tiles[i] = 'C';
    else if (d <= 2 * n && d % 2 === 0) t.tiles[i] = 'W';
    // 山城は外側に斜面（丘）が広がり、平山城は一重だけ
    else if ((c.kind === 'yama' && d <= 2 * n + 2) || (c.kind === 'hirayama' && d === 2 * n + 1)) t.tiles[i] = 'H';
  }
  // 門: 内壁に西1か所、外壁に西・北西・南西の3か所
  const westOf = (ring: number, dr: number) => {
    let best = -1, bd = Infinity;
    for (let i = 0; i < t.tiles.length; i++) {
      if (tDist(t, i, center) !== ring) continue;
      const score = Math.abs(trow(t, i) - (cy + dr)) * 10 + tcol(t, i);
      if (score < bd) { bd = score; best = i; }
    }
    return best;
  };
  // 門: 内側の壁に西へ1か所ずつ、外壁は館・砦なら2か所、それ以外は3か所
  for (let k = 1; k < n; k++) gateMarks.push(westOf(2 * k, 0));
  const out = 2 * n;
  if (n === 1) gateMarks.push(westOf(out, 0), westOf(out, -1));
  else gateMarks.push(westOf(out, 0), westOf(out, -(n + 1)), westOf(out, n + 1));
  const frac = t.castle !== null ? s.castles[t.castle].gate ?? 1 : 1;
  for (const g of gateMarks) { t.tiles[g] = 'G'; t.gates[g] = Math.round(t.gateMax * frac); }
}

export function createTactical(s: GameState, a: Army, target: Target, playerSide: Side | null, joined: Army[] = []): Tactical {
  const defHex = target.hex;
  const castle = castleAt(s, defHex);
  const save = castle ? s.sieges?.[castle.i] : undefined;
  if (castle && save && save.clan === a.clan) return resumeSiege(s, save, a, joined, playerSide);
  const kind: Tactical['kind'] = castle ? 'siege' : 'field';
  // 山城（曲輪三重）は地図を広げ、刻も長くとる。館・砦は短い
  const rings = castle ? R.CASTLE_KIND[castle.kind ?? 'hira'].rings : 0;
  const big = rings >= 3;
  const w = kind === 'siege' ? (big ? 19 : 17) : 15, h = kind === 'siege' ? (big ? 15 : 13) : 11;
  const defClan = target.kind === 'army' ? target.army.clan : s.castles[target.castle].owner;
  const t: Tactical = {
    kind, w, h, tiles: genField(s, w, h, HEXES[defHex].t), gates: {}, fire: {}, gateMax: castle ? Math.round((800 + castleKoku(castle) * 60) * R.CASTLE_KIND[castle.kind ?? 'hira'].gate * (1 + (castle.fort ?? 0) * R.FORT_GATE) * (govTrait(s, castle) === 'chikujo' ? CHIKUJO_GATE : 1)) : 0,
    units: [], turn: 1, maxTurn: kind === 'siege' ? TR.SIEGE_TURNS + (big ? 5 : 0) : TR.FIELD_TURNS, phase: 'A',
    attackerClan: a.clan, defenderClan: defClan, primaryA: a.id, primaryD: target.kind === 'army' ? target.army.id : null,
    castle: castle?.i ?? null, hex: defHex, armiesA: [], armiesD: [], log: [], deaths: [], captures: [], start: {},
    over: null, reason: '', playerSide, cmd: { A: null, D: null },
    fog: kind === 'field', seen: { A: {}, D: {} }, scouts: { A: { left: 0, max: 0 }, D: { left: 0, max: 0 } }, scoutAreas: [],
  };
  if (kind === 'siege') genSiege(s, t, big ? 12 : 11, big ? 7 : 6);

  let uid = 1;
  const next = () => uid++;
  // 参戦軍: 攻め手＝出陣を命じた全軍団＋目標に隣接する同盟国の援軍（計5軍まで）
  //         守り手＝主軍＋守備ヘックスに隣接する自家・同盟国の後詰め（3軍まで）
  const ordered = joined.filter((x) => x.id !== a.id && s.armies[x.id]);
  const allies = supportArmies(s, a, defHex, defClan).filter((o) => o.clan !== a.clan && !ordered.includes(o));
  const supA = [...ordered, ...allies].slice(0, 4);
  const supD = defenderSupports(s, defClan, defHex, a.clan, t.primaryD).slice(0, 3);
  t.armiesA = [a.id, ...supA.map((x) => x.id)];
  const primD = target.kind === 'army' ? target.army : null;
  t.armiesD = [...(primD ? [primD.id] : []), ...supD.map((x) => x.id)];

  const unitsA = [a, ...supA].flatMap((x, k) => armyUnits(s, x, 'A', k === 0, next));
  const nAllies = supA.filter((x) => x.clan !== a.clan).length + supD.filter((x) => x.clan !== defClan).length;
  const unitsD = [...(primD ? [primD] : []), ...supD].flatMap((x, k) => armyUnits(s, x, 'D', k === 0 && !!primD, next));
  if (castle && castle.garrison > 0) {
    const n = Math.max(1, Math.min(4, Math.ceil(castle.garrison / 1500)));
    let left = castle.garrison;
    for (let k = 0; k < n; k++) {
      const tr = k === n - 1 ? left : Math.round(castle.garrison / n);
      left -= tr;
      unitsD.push({ id: next(), side: 'D', army: null, general: null, role: 'garrison', clan: castle.owner, name: `城兵${'一二三四'[k]}番`, hq: false, troops: tr, troops0: tr, morale: castle.gMorale, ...R.GARRISON_STATS, ...(castle.tsume ? { rout: R.GARRISON_STATS.rout + R.TSUME_ROUT } : {}), int: 40, tile: -1, mp: 0, moved: false, acted: false, routed: false, confused: 0, out: null });
    }
  }
  t.units = [...unitsA, ...unitsD];
  t.cmd.A = commandOf(s, a.clan);
  // 城に籠もる側は声が届くので伝令は要らない
  if (kind === 'field' && primD) t.cmd.D = commandOf(s, primD.clan);
  // 軍師: その側の軍団にいれば指揮範囲+1・伝令+1
  for (const [side, list] of [['A', [a, ...supA]], ['D', [...(primD ? [primD] : []), ...supD]]] as [Side, Army[]][]) { const c = t.cmd[side]; if (c && list.some((x) => x.clan === c.clan && armyHas(s, x, 'gunshi'))) { c.range += GUNSHI_RANGE; c.couriers += GUNSHI_COURIER; c.left = c.couriers; } }
  deploy(t, unitsA, 'A');
  deploy(t, unitsD, 'D');
  // 物見: 毎刻2回、知略85以上の武将がいれば3回
  for (const side of ['A', 'D'] as Side[]) {
    const best = Math.max(0, ...t.units.filter((u) => u.side === side && u.general).map((u) => u.int));
    t.scouts![side].max = R.SCOUT_BASE + (best >= R.SCOUT_INT ? 1 : 0) + (t.units.some((u) => u.side === side && traitOf(u.general ? s.generals[u.general] : null) === 'ninja') ? 1 : 0); // 忍びがいれば物見+1
  }
  // 伏兵: AIが受け持つ側は合戦の前に森・丘へ伏せる（プレイヤーの側は合戦画面で配置する）
  for (const side of ['A', 'D'] as Side[]) if (side !== playerSide) aiDeployAmbush(t, side);
  for (const u of t.units) t.start[u.id] = u.troops;
  startPhase(t, 'A');
  if (nAllies) t.log.push(`同盟国の軍勢${nAllies}隊が加わっている（AIが動かす）。`);
  t.log.push(kind === 'siege' ? `${s.castles[t.castle!].name}攻め（${R.CASTLE_KIND[s.castles[t.castle!].kind ?? 'hira'].name}・曲輪${'一二三'[(t.rings ?? 2) - 1]}重${s.castles[t.castle!].tsume ? `・詰城${s.castles[t.castle!].tsume}` : ''}）。門を破り本丸を落とせば落城。火計で門や城内の敵を焼ける。` : `野戦。敵の本陣を崩せば勝利。`);
  // 大筒: 合戦の初めに全ての城門を撃ち、城兵を怯ませる
  const cannon = kind === 'siege' ? [a, ...supA].reduce((x, o) => x + (o.cannon ?? 0), 0) : 0;
  if (cannon) {
    t.cannon = cannon;
    const hit = Math.round(t.gateMax * Math.min(0.6, R.CANNON_GATE * cannon));
    for (const g of Object.keys(t.gates).map(Number)) t.gates[g] = Math.max(1, t.gates[g] - hit);
    for (const u of t.units) if (u.side === 'D' && u.role === 'garrison') u.morale = Math.max(0.1, u.morale - Math.min(0.2, R.CANNON_MORALE * cannon));
    t.log.push(`大筒${cannon}門が城門を撃つ！（城門−${hit}、城兵が怯む）`);
  }
  // 内応: 調略済みの城は外門が一つ開き、城兵が動揺している
  if (castle && castle.naio !== undefined && castle.naio >= s.turn && castle.naioBy === a.clan) {
    const outer = Object.keys(t.gates).map(Number).filter((g) => tDist(t, g, t.tiles.indexOf('K')) === 2 * (t.rings ?? 2));
    const g = outer.find((x) => !unitAt(t, x)) ?? outer[0];
    if (g !== undefined) { t.gates[g] = 0; const occ = unitAt(t, g); if (occ) moveOffGate(t, occ); }
    for (const u of t.units) if (u.side === 'D' && u.role === 'garrison') u.morale = Math.max(0.1, u.morale - TR.NAIO_MORALE);
    t.log.push('内応者が城門を開いた！城兵は動揺している。');
  }
  t.horse = [t.attackerClan, t.defenderClan].filter((c): c is string => !!c && hasProduct(s, c, 'horse'));
  return t;
}

// 包囲の続き: 先月の盤面（門の傷・部隊の位置）から始める。兵と士気は今の軍団・城兵に合わせる
function resumeSiege(s: GameState, save: NonNullable<GameState['sieges']>[number], a: Army, joined: Army[], playerSide: Side | null): Tactical {
  const t: Tactical = JSON.parse(JSON.stringify(save.tac));
  const castle = s.castles[t.castle!];
  const defClan = castle.owner;
  const ordered = joined.filter((x) => x.id !== a.id && s.armies[x.id]);
  const allies = supportArmies(s, a, t.hex, defClan).filter((o) => o.clan !== a.clan && !ordered.includes(o));
  const supA = [...ordered, ...allies].slice(0, 4);
  const supD = defenderSupports(s, defClan, t.hex, a.clan, null).slice(0, 3);
  const nowA = [a, ...supA], nowD = supD;
  const live = new Set([...nowA, ...nowD].map((x) => x.id));
  // 抜けた軍団・討たれた者の隊は盤から外す
  t.units = t.units.filter((u) => !u.out && u.troops > 0 && (u.army === null ? u.role === 'garrison' : live.has(u.army) && (!u.general || s.generals[u.general]?.status === 'army')));
  let uid = Math.max(0, ...t.units.map((u) => u.id)) + 1;
  const next = () => uid++;
  const sync = (us: TUnit[], troops: number, morale: number) => {
    const sum = us.reduce((x, u) => x + u.troops, 0);
    for (const u of us) { u.troops = Math.max(1, Math.round(u.troops * troops / Math.max(1, sum))); u.troops0 = Math.max(u.troops0, u.troops); u.morale = morale; }
  };
  const fresh: TUnit[] = [];
  for (const [side, list] of [['A', nowA], ['D', nowD]] as [Side, Army[]][]) for (const x of list) {
    const us = t.units.filter((u) => u.army === x.id);
    if (us.length) sync(us, x.troops, x.morale);
    else { const nu = armyUnits(s, x, side, false, next); fresh.push(...nu); }
  }
  const gar = t.units.filter((u) => u.role === 'garrison');
  if (gar.length) sync(gar, castle.garrison, castle.gMorale);
  for (const u of t.units) {
    u.moved = false; u.acted = false; u.routed = false; u.confused = 0; u.hidden = false; u.mp = 0;
    u.hq = u.side === 'A' && u.army === a.id && u.role === 'main';
  }
  const fa = fresh.filter((u) => u.side === 'A'), fd = fresh.filter((u) => u.side === 'D');
  t.units.push(...fresh);
  for (const u of fresh) u.tile = -1;
  if (fa.length) deploy(t, fa, 'A');
  if (fd.length) deploy(t, fd, 'D');
  t.units = t.units.filter((u) => u.tile >= 0);
  t.attackerClan = a.clan; t.defenderClan = defClan; t.primaryA = a.id; t.primaryD = null;
  t.armiesA = nowA.map((x) => x.id); t.armiesD = nowD.map((x) => x.id);
  t.turn = 1; t.phase = 'A'; t.over = null; t.reason = ''; t.playerSide = playerSide;
  t.deaths = []; t.captures = []; t.fire = {}; t.scoutAreas = []; t.seen = { A: {}, D: {} };
  t.cmd = { A: commandOf(s, a.clan), D: null };
  for (const side of ['A', 'D'] as Side[]) {
    const best = Math.max(0, ...t.units.filter((u) => u.side === side && u.general).map((u) => u.int));
    t.scouts = t.scouts ?? { A: { left: 0, max: 0 }, D: { left: 0, max: 0 } };
    t.scouts[side].max = R.SCOUT_BASE + (best >= R.SCOUT_INT ? 1 : 0);
  }
  t.start = {};
  for (const u of t.units) t.start[u.id] = u.troops;
  startPhase(t, 'A');
  const store = castle.store ?? 0;
  t.log = [`${castle.name}攻め、包囲${save.months + 1}か月目。先月の続きから（門の傷はそのまま）。城兵${Math.round(castle.garrison)}${store <= 0 ? '・城の兵糧は尽きている' : ''}。`];
  t.horse = [t.attackerClan, t.defenderClan].filter((c): c is string => !!c && hasProduct(s, c, 'horse'));
  return t;
}

function moveOffGate(t: Tactical, u: TUnit) {
  const keep = t.tiles.indexOf('K');
  const free = t.tiles.map((x, i) => i).filter((i) => (t.tiles[i] === 'C' || t.tiles[i] === 'K') && !unitAt(t, i)).sort((a, b) => tDist(t, a, u.tile) - tDist(t, b, u.tile) || tDist(t, a, keep) - tDist(t, b, keep));
  if (free.length) u.tile = free[0];
}

function deploy(t: Tactical, units: TUnit[], side: Side) {
  const taken = new Set(t.units.filter((u) => u.tile >= 0).map((u) => u.tile));
  let slots: number[];
  if (side === 'D' && t.kind === 'siege') {
    // 城内: 門の内側から本丸へ
    const keep = t.tiles.indexOf('K');
    slots = t.tiles.map((x, i) => i).filter((i) => ['C', 'G', 'K'].includes(t.tiles[i]))
      .sort((x, y) => (t.tiles[x] === 'G' ? -1 : 0) - (t.tiles[y] === 'G' ? -1 : 0) || tDist(t, y, keep) - tDist(t, x, keep));
  } else {
    const cols = side === 'A' ? [1, 0, 2] : [t.w - 2, t.w - 1, t.w - 3];
    const mid = Math.floor(t.h / 2);
    const rows = [...Array(t.h).keys()].sort((x, y) => Math.abs(x - mid) - Math.abs(y - mid));
    slots = cols.flatMap((c) => rows.map((r) => r * t.w + c)).filter((i) => T_COST[t.tiles[i]] < 99);
  }
  // 本陣は後方
  const order = [...units].sort((x, y) => Number(x.hq) - Number(y.hq));
  const back = side === 'A' ? 0 : t.w - 1;
  for (const u of order) {
    let pool = slots.filter((i) => !taken.has(i));
    if (u.hq && !(side === 'D' && t.kind === 'siege')) {
      const mid = Math.floor(t.h / 2);
      pool = pool.sort((x, y) => Math.abs(tcol(t, x) - back) - Math.abs(tcol(t, y) - back) || Math.abs(trow(t, x) - mid) - Math.abs(trow(t, y) - mid));
    }
    const tile = pool[0];
    if (tile === undefined) { u.out = 'escaped'; continue; }
    u.tile = tile; taken.add(tile);
  }
}

function commandOf(s: GameState, clan: string): Command {
  const ts = tsukaiOf(s, clan);
  const couriers = R.COURIER_BASE + ts.length;
  return { clan, range: R.CMD_RANGE + (ts.length ? R.CMD_HEAD_BONUS : 0), couriers, left: couriers, label: tsukaiLabel(clan), tsukai: ts.map((g) => g.id) };
}

export const hqOf = (t: Tactical, side: Side) => t.units.find((u) => u.hq && u.side === side && !u.out) ?? null;
// 本陣の指揮が届いているか（同盟国の部隊・本陣自身・指揮済みの部隊は常に届く）
export function inCommand(t: Tactical, u: TUnit): boolean {
  const c = t.cmd?.[u.side];
  if (!c || u.clan !== c.clan || u.hq || u.cmd) return true;
  const hq = hqOf(t, u.side);
  return !hq || tDist(t, hq.tile, u.tile) <= c.range;
}
export const canOrder = (t: Tactical, u: TUnit) => inCommand(t, u) || (t.cmd?.[u.side]?.left ?? 0) > 0;
// 指揮する（範囲外なら伝令を1回使う）。指揮できなければ false
export function takeCommand(t: Tactical, u: TUnit): boolean {
  if (inCommand(t, u)) { u.cmd = true; return true; }
  const c = t.cmd[u.side]!;
  if (c.left <= 0) return false;
  c.left--; u.cmd = true;
  return true;
}

// ───────── 参照 ─────────
export const active = (u: TUnit) => !u.out;
export const unitAt = (t: Tactical, i: number) => t.units.find((u) => !u.out && u.tile === i) ?? null;
const enemyOf = (u: TUnit) => (u.side === 'A' ? 'D' : 'A');

export function passable(t: Tactical, u: TUnit, i: number): boolean {
  const tt = t.tiles[i];
  if (tt === 'W') return false;
  if (tt === 'G' && u.side === 'A' && (t.gates[i] ?? 0) > 0) return false;
  if (t.fire[i]) return false; // 燃えている
  return true;
}

// 攻撃側としての戦闘力（攻撃力×兵×士気）
export function power(t: Tactical, u: TUnit): number {
  return u.atk * u.troops * Math.max(0.05, u.morale);
}
// この地形で潰走する士気の線
export function routAt(t: Tactical, u: TUnit): number {
  return u.rout + T_ROUT[t.tiles[u.tile]];
}

export function unitReach(t: Tactical, u: TUnit): Map<number, number> {
  const cost = new Map<number, number>([[u.tile, 0]]);
  if (u.out || u.moved || u.acted || u.confused > 0) return new Map();
  const zoc = new Set<number>();
  for (const e of t.units) if (!e.out && e.side !== u.side && !e.routed && !e.hidden) for (const j of tNeighbors(t, e.tile)) zoc.add(j);
  const occ = new Set(t.units.filter((x) => !x.out && x.id !== u.id).map((x) => x.tile));
  const open: [number, number][] = [[0, u.tile]];
  while (open.length) {
    open.sort((a, b) => a[0] - b[0]);
    const [c, i] = open.shift()!;
    if (c > (cost.get(i) ?? Infinity)) continue;
    if (i !== u.tile && zoc.has(i) && !u.routed) continue;
    for (const j of tNeighbors(t, i)) {
      if (occ.has(j) || !passable(t, u, j)) continue;
      const nc = c + T_COST[t.tiles[j]];
      if (nc > u.mp) continue;
      if (nc < (cost.get(j) ?? Infinity)) { cost.set(j, nc); open.push([nc, j]); }
    }
  }
  cost.delete(u.tile);
  return cost;
}

export type TAction = { kind: 'attack'; target: TUnit } | { kind: 'gate'; tile: number } | { kind: 'bow'; target: TUnit } | { kind: 'shoot'; target: TUnit } | { kind: 'ruse'; target: TUnit }
  | { kind: 'fire'; tile: number } | { kind: 'douse'; tile: number };
export const actionTile = (a: TAction) => ('tile' in a ? a.tile : a.target.tile);

// 火計の成功率: 攻め手の知略と、城方で最も知略の高い武将の差
export function fireChance(t: Tactical, u: TUnit) {
  const best = Math.max(40, ...t.units.filter((x) => !x.out && x.side !== u.side && x.general).map((x) => x.int));
  return Math.max(0.1, Math.min(0.85, TR.FIRE_BASE + (u.int - best) / 100));
}

export function canBow(t: Tactical, u: TUnit) {
  return t.kind === 'siege' && u.side === 'D' && ['C', 'K', 'G'].includes(t.tiles[u.tile]);
}

export function unitActions(t: Tactical, u: TUnit): TAction[] {
  if (u.out || u.acted || u.routed || u.confused > 0) return [];
  const out: TAction[] = [];
  const adj = tNeighbors(t, u.tile);
  for (const e of t.units) {
    if (e.out || e.side === u.side || e.hidden || !canSee(t, u.side, e)) continue;
    const d = tDist(t, u.tile, e.tile);
    if (u.role === 'gun') { if (d <= 2) out.push({ kind: 'shoot', target: e }); continue; }
    if (d === 1) out.push({ kind: 'attack', target: e });
    else if (d === 2 && canBow(t, u)) out.push({ kind: 'bow', target: e });
    if (d <= TR.RUSE_RANGE && u.general) out.push({ kind: 'ruse', target: e });
  }
  if (u.role === 'gun') return out;
  if (u.side === 'A') for (const j of adj) if (t.tiles[j] === 'G' && (t.gates[j] ?? 0) > 0 && !unitAt(t, j)) out.push({ kind: 'gate', tile: j });
  if (t.kind === 'siege' && u.side === 'A') {
    // 火計: 2ヘックス以内の城門・城内の敵部隊
    for (let i = 0; i < t.tiles.length; i++) {
      if (t.fire[i] || tDist(t, u.tile, i) > TR.FIRE_RANGE) continue;
      const e = unitAt(t, i);
      const gate = t.tiles[i] === 'G' && (t.gates[i] ?? 0) > 0;
      const inCastle = ['C', 'K', 'G'].includes(t.tiles[i]);
      if (gate || (e && e.side !== u.side && inCastle)) out.push({ kind: 'fire', tile: i });
    }
  }
  if (t.kind === 'siege' && u.side === 'D') for (const i of [u.tile, ...adj]) if (t.fire[i]) out.push({ kind: 'douse', tile: i });
  return out;
}

export function ruseChance(t: Tactical, u: TUnit, e: TUnit) {
  const forest = t.tiles[u.tile] === 'F' ? TR.FOREST_RUSE : 0;
  return Math.max(0.05, Math.min(0.9, 0.3 + (u.int - e.int) / 100 + forest));
}

// 攻撃の見込み（UI表示とAI判断用）: 与える損害・受ける損害
// 鉄砲の射撃倍率（撃つ位置の地形・隣の敵）
export function gunMult(t: Tactical, u: TUnit) {
  const close = tNeighbors(t, u.tile).some((j) => { const x = unitAt(t, j); return !!x && x.side !== u.side && !x.routed; });
  return (GUN_TERRAIN[t.tiles[u.tile]] ?? 1) * (close ? TR.GUN_CLOSE : 1);
}
export function preview(t: Tactical, u: TUnit, e: TUnit, charge: boolean, ranged: boolean | 'gun' = false, noFlank = false): { dealt: number; taken: number } {
  const gun = ranged === 'gun', bow = !!ranged;
  const atk = attackPower(t, u, e, charge && !bow, noFlank) * (gun ? gunMult(t, u) : 1) * (u.hidden ? TR.AMBUSH_HIDDEN : 1);
  const k = gun ? TR.GUN : bow ? TR.BOW : TR.DMG;
  const dealt = Math.round(Math.min(e.troops * TR.CAP, (k * atk) / (tdef(t, e.tile) * e.def)));
  const taken = bow ? 0 : Math.round(Math.min(u.troops * TR.CAP, (TR.COUNTER * power(t, e) * (charge ? (u.clan && t.horse?.includes(u.clan) ? R.HORSE_CHARGE_SELF : TR.CHARGE_SELF) : 1)) / (u.def * (e.routed ? 3 : 1))));
  return { dealt, taken };
}

export const chargeMult = (t: Tactical, tile: number) => (t.tiles[tile] === 'P' ? R.CHARGE_PLAIN : R.CHARGE_ROUGH);
export const isAmbush = (t: Tactical, u: TUnit, e: TUnit) => t.tiles[u.tile] === 'F' && u.int - e.int >= TR.AMBUSH_GAP;

function attackPower(t: Tactical, u: TUnit, e: TUnit, charge: boolean, noFlank = false) {
  let p = power(t, u) * (charge ? chargeMult(t, e.tile) : 1);
  if (t.tiles[u.tile] === 'F' && u.int - e.int >= TR.AMBUSH_GAP) p *= TR.AMBUSH; // 伏兵
  if (t.tiles[u.tile] === 'H' && t.tiles[e.tile] !== 'H' && !CASTLE_TILE.has(t.tiles[e.tile])) p *= TR.HIGH; // 斜面から城を見上げても高所の利はない
  if (t.tiles[u.tile] === 'R') p *= TR.IN_RIVER;
  const flank = tNeighbors(t, e.tile).map((j) => unitAt(t, j)).filter((x) => x && x.side === u.side && x.id !== u.id && !x.routed).length;
  if (!noFlank) p *= 1 + TR.FLANK * Math.min(3, flank);
  if (e.confused > 0) p *= 1.2;
  return p;
}

// ───────── 行動 ─────────
export function moveUnit(t: Tactical, u: TUnit, to: number, s?: GameState) {
  u.tile = to; u.moved = true;
  u.hidden = false; // 動けば伏兵は現れる
  if (s) springAmbush(t, s, u);
  noteSeen(t, 'A'); noteSeen(t, 'D');
}

// 伏兵: 敵が隣に来たら、伏せていた部隊が襲いかかる（反撃なし・士気を大きく下げ、混乱させる）
export function springAmbush(t: Tactical, s: GameState, victim: TUnit) {
  if (victim.out || t.over) return;
  const h = tNeighbors(t, victim.tile).map((j) => unitAt(t, j)).find((x) => x && x.hidden && x.side !== victim.side && !x.routed);
  if (!h) return;
  const pv = preview(t, h, victim, false, h.role === 'gun' ? 'gun' : false, true);
  h.hidden = false;
  const roll = 1 - TR.SPREAD + rand(s) * TR.SPREAD * 2;
  const dealt = Math.round(Math.min(victim.troops, pv.dealt * roll));
  t.log.push(`伏兵！${h.name}が${victim.name}に襲いかかる：敵−${dealt}`);
  victim.morale = Math.max(0, victim.morale - TR.AMBUSH_SHOCK);
  victim.confused = Math.max(victim.confused, 1);
  hit(t, s, victim, dealt, h);
  checkEnd(t, s);
}

// ───────── 伏兵の配置 ─────────
// 伏せられる部隊の数: その側で最も知略の高い武将（90以上3、75以上2、60以上1）
export function ambushAllowance(t: Tactical, side: Side) {
  if (t.kind !== 'field') return 0;
  const best = Math.max(0, ...t.units.filter((u) => u.side === side && !u.out && u.general).map((u) => u.int));
  return best >= 90 ? 3 : best >= 75 ? 2 : best >= 60 ? 1 : 0;
}
// 伏せられる場所: 自陣側の半分の森・丘で、敵に隣接していない空きヘックス
export function ambushTiles(t: Tactical, side: Side): number[] {
  const mid = t.w / 2;
  return t.tiles.map((x, i) => i).filter((i) => (t.tiles[i] === 'F' || t.tiles[i] === 'H') && (side === 'A' ? tcol(t, i) < mid : tcol(t, i) >= mid) && !unitAt(t, i)
    && !tNeighbors(t, i).some((j) => { const e = unitAt(t, j); return !!e && e.side !== side; }));
}
export function setAmbush(t: Tactical, u: TUnit, tile: number) { u.tile = tile; u.hidden = true; }
// AI: 敵に近い森・丘に、知略の高い順に伏せる
export function aiDeployAmbush(t: Tactical, side: Side) {
  let n = ambushAllowance(t, side);
  const cands = t.units.filter((u) => u.side === side && !u.out && !u.hq && u.role !== 'garrison').sort((a, b) => b.int - a.int);
  const enemyCol = side === 'A' ? t.w - 1 : 0, midRow = t.h / 2;
  for (const u of cands) {
    if (n <= 0) break;
    const tiles = ambushTiles(t, side).sort((a, b) => Math.abs(tcol(t, a) - enemyCol) - Math.abs(tcol(t, b) - enemyCol) + (Math.abs(trow(t, a) - midRow) - Math.abs(trow(t, b) - midRow)) * 0.5);
    if (!tiles.length) break;
    setAmbush(t, u, tiles[0]); n--;
  }
}

// ───────── 一斉攻撃 ─────────
// 加われる部隊の数は総大将（本陣）の統率で決まる: 60未満2、60以上3、80以上4
export function volleyMax(t: Tactical, s: GameState, side: Side) {
  const hq = hqOf(t, side);
  const lea = hq?.general ? s.generals[hq.general]?.lea ?? 0 : 0;
  return lea >= 80 ? 4 : lea >= 60 ? 3 : 2;
}
// 一緒に攻められる味方（行動前・命令が届く・この位置から攻撃できる）。強い順
export function volleyHelpers(t: Tactical, s: GameState, u: TUnit, e: TUnit): TUnit[] {
  return t.units.filter((x) => x.id !== u.id && !x.out && x.side === u.side && !x.acted && !x.routed && x.confused <= 0 && x.clan === u.clan && canOrder(t, x)
    && (x.role === 'gun' ? tDist(t, x.tile, e.tile) <= 2 : tDist(t, x.tile, e.tile) === 1 && x.role !== 'garrison'))
    .sort((a, b) => power(t, b) - power(t, a)).slice(0, volleyMax(t, s, u.side) - 1);
}
export function volleyPreview(t: Tactical, units: TUnit[], e: TUnit, charge: boolean) {
  const sum = units.reduce((x, u) => x + preview(t, u, e, charge && u.role !== 'gun', u.role === 'gun' ? 'gun' : false, true).dealt, 0);
  return Math.round(Math.min(e.troops * TR.VOLLEY_CAP, sum));
}
// 一斉に攻める: 損害をまとめて与え、士気を大きく下げる。反撃は最も強い部隊が受ける
export function doVolley(t: Tactical, s: GameState, units0: TUnit[], e: TUnit, charge = false): string {
  // 仕掛ける部隊は自分の判断でも加われる。加勢する部隊には命令（伝令）が要る
  const units = [units0[0], ...units0.slice(1).filter((u) => takeCommand(t, u))];
  const n = units.length;
  let dealt = 0;
  const amb = units.some((u) => u.hidden);
  for (const u of units) {
    const gun = u.role === 'gun';
    const pv = preview(t, u, e, charge && !gun, gun ? 'gun' : false, true);
    dealt += pv.dealt * (1 - TR.SPREAD + rand(s) * TR.SPREAD * 2);
    u.hidden = false; u.acted = true; u.moved = true;
  }
  dealt = Math.round(Math.min(e.troops, e.troops * TR.VOLLEY_CAP, dealt));
  const melee = units.filter((u) => u.role !== 'gun').sort((a, b) => power(t, b) - power(t, a))[0];
  const taken = melee ? Math.round(Math.min(melee.troops, preview(t, melee, e, charge, false, true).taken * (1 - TR.SPREAD + rand(s) * TR.SPREAD * 2))) : 0;
  const msg = `${n >= 2 ? '一斉' : ''}${charge ? '突撃' : '攻撃'}！${units.map((u) => u.name.replace(/隊$/, '')).join('・')}が${e.name}に：敵−${dealt}${taken ? `／自−${taken}` : ''}${amb ? '（伏兵）' : ''}`;
  t.log.push(msg);
  const frac = e.troops ? dealt / e.troops : 1;
  e.troops = Math.max(0, e.troops - dealt);
  e.morale = Math.max(0, e.morale - frac * (1 + TR.VOLLEY_MORALE * (n - 1)) - TR.VOLLEY_SHOCK * n - (amb ? TR.AMBUSH_SHOCK : 0));
  if (e.troops < 50) destroyUnit(t, s, e, units[0]);
  else if (!e.routed && e.morale < routAt(t, e)) rout(t, s, e);
  if (melee && taken) hit(t, s, melee, taken, e);
  deathRoll(t, s, e, TR.DEATH_HIT);
  if (melee) deathRoll(t, s, melee, charge ? TR.DEATH_CHARGE : TR.DEATH_HIT * 0.5);
  checkEnd(t, s);
  return msg;
}

function hit(t: Tactical, s: GameState, victim: TUnit, loss: number, by: TUnit | null) {
  const frac = victim.troops ? loss / victim.troops : 1;
  victim.troops = Math.max(0, victim.troops - loss);
  victim.morale = Math.max(0, victim.morale - frac * 1.0);
  if (victim.troops < 50) { destroyUnit(t, s, victim, by); return; }
  if (!victim.routed && victim.morale < routAt(t, victim)) rout(t, s, victim);
}

function rout(t: Tactical, s: GameState, u: TUnit) {
  u.routed = true;
  t.log.push(`${u.name}が潰走した。`);
  if (u.hq) hqFall(t, s, u);
}

function hqFall(t: Tactical, s: GameState, u: TUnit) {
  t.log.push(`${u.side === 'A' ? '攻め手' : '守り手'}の本陣が崩れた。全軍の士気が下がる。`);
  for (const x of t.units) if (!x.out && x.side === u.side && x.id !== u.id) {
    x.morale = Math.max(0, x.morale - TR.HQ_FALL);
    if (!x.routed && x.morale < routAt(t, x)) { x.routed = true; t.log.push(`${x.name}が潰走した。`); }
  }
  void s;
}

function destroyUnit(t: Tactical, s: GameState, u: TUnit, by: TUnit | null) {
  u.out = 'dead'; u.troops = 0;
  t.log.push(`${u.name}が壊滅した。`);
  if (u.general) {
    const r = rand(s);
    const g = s.generals[u.general];
    if (r < TR.FATE_DEATH) { t.deaths.push(u.general); t.log.push(`${g.name}討死。`); }
    else if (r < TR.FATE_DEATH + TR.FATE_CAPTURE && by) { const clan = by.side === 'A' ? t.attackerClan : t.defenderClan; if (clan) { t.captures.push({ general: u.general, by: clan }); t.log.push(`${g.name}を捕らえた。`); } }
    else t.log.push(`${g.name}は落ち延びた。`);
  }
  if (u.hq) hqFall(t, s, u);
}

function deathRoll(t: Tactical, s: GameState, u: TUnit, p: number) {
  if (!u.general || u.out) return;
  if (u.morale < 0.5) p *= 1.5;
  if (rand(s) < p) {
    const g = s.generals[u.general];
    t.deaths.push(u.general);
    t.log.push(`${g.name}、乱戦の中で討死。${u.name.replace(/隊$/, '')}の兵は崩れた。`);
    u.general = null; u.name = `${g.name}残兵`; u.int = 40;
    u.morale = Math.min(u.morale, 0.2);
    if (!u.routed) rout(t, s, u);
  }
}

export function doAction(t: Tactical, s: GameState, u: TUnit, a: TAction, charge = false): string {
  u.acted = true; u.moved = true;
  // 伏せた状態からの攻撃は伏兵の一撃になる（それ以外の行動は姿を現すだけ）
  const amb = !!u.hidden && (a.kind === 'attack' || a.kind === 'shoot' || a.kind === 'bow');
  if (!amb) u.hidden = false;
  if (a.kind === 'gate') {
    const dmg = Math.round(TR.GATE_DMG * power(t, u) * (charge ? R.CHARGE_ROUGH : 1));
    t.gates[a.tile] = Math.max(0, (t.gates[a.tile] ?? 0) - dmg);
    // 城内からの反撃（門に隣接する守備部隊の射撃）
    const msg = t.gates[a.tile] <= 0 ? `${u.name}が城門を打ち破った！` : `${u.name}が城門を攻める（残り${t.gates[a.tile]}）。`;
    t.log.push(msg);
    if (charge) u.morale = Math.max(0, u.morale - 0.05);
    checkEnd(t, s);
    return msg;
  }
  if (a.kind === 'fire') {
    const ok = rand(s) < fireChance(t, u);
    if (!ok) { const m = `${u.name}の火計は不発に終わった。`; t.log.push(m); return m; }
    t.fire[a.tile] = TR.FIRE_TURNS;
    const parts = [`${u.name}が火を放った！`];
    if (t.tiles[a.tile] === 'G') { const dmg = Math.round(t.gateMax * TR.FIRE_GATE_HIT); t.gates[a.tile] = Math.max(0, (t.gates[a.tile] ?? 0) - dmg); parts.push(`城門が燃える（残り${t.gates[a.tile]}）`); }
    const e = unitAt(t, a.tile);
    if (e) { const loss = Math.round(e.troops * TR.FIRE_HIT); parts.push(`${e.name}−${loss}`); e.morale = Math.max(0, e.morale - 0.15); hit(t, s, e, loss, u); if (!e.out) moveOutOfFire(t, e); }
    const m = parts.join('　'); t.log.push(m); checkEnd(t, s); return m;
  }
  if (a.kind === 'douse') {
    const ok = rand(s) < TR.DOUSE;
    if (ok) delete t.fire[a.tile];
    const m = ok ? `${u.name}が火を消し止めた。` : `${u.name}の消火は間に合わない。`;
    t.log.push(m); return m;
  }
  if (a.kind === 'ruse') {
    const e = a.target;
    const ok = rand(s) < ruseChance(t, u, e);
    const msg = ok ? `${u.name}の計略で${e.name}が混乱した。` : `${u.name}の計略は見破られた。`;
    if (ok) { e.confused = 2; e.morale = Math.max(0, e.morale - 0.1); if (!e.routed && e.morale < routAt(t, e)) rout(t, s, e); }
    t.log.push(msg);
    checkEnd(t, s);
    return msg;
  }
  const e = a.target;
  const bow = a.kind === 'bow' || a.kind === 'shoot';
  const pv = preview(t, u, e, charge && !bow, a.kind === 'shoot' ? 'gun' : bow);
  u.hidden = false;
  if (amb) { e.morale = Math.max(0, e.morale - TR.AMBUSH_SHOCK); e.confused = Math.max(e.confused, 1); }
  const roll = () => 1 - TR.SPREAD + rand(s) * TR.SPREAD * 2;
  const dealt = Math.round(Math.min(e.troops, pv.dealt * roll()));
  const taken = Math.round(Math.min(u.troops, pv.taken * roll()));
  const msg = `${amb ? '伏兵！' : ''}${u.name}${a.kind === 'shoot' ? 'の鉄砲が' : bow ? 'の弓が' : charge ? 'が突撃、' : 'が'}${e.name}${a.kind === 'shoot' ? 'を撃つ' : bow ? 'を射る' : 'を攻撃'}：敵−${dealt}${taken ? `／自−${taken}` : ''}`;
  t.log.push(msg);
  hit(t, s, e, dealt, u);
  if (taken) hit(t, s, u, taken, e);
  if (!bow) {
    deathRoll(t, s, e, TR.DEATH_HIT);
    deathRoll(t, s, u, charge ? TR.DEATH_CHARGE : TR.DEATH_HIT * 0.5);
  }
  checkEnd(t, s);
  return msg;
}

// 燃えるヘックスから隣の安全な場所へ逃げる（逃げ場がなければ留まる）
function moveOutOfFire(t: Tactical, u: TUnit) {
  const to = tNeighbors(t, u.tile).find((j) => !unitAt(t, j) && passable(t, u, j));
  if (to !== undefined) u.tile = to;
}

// 毎刻の延焼: 燃えている城門と部隊に損害
function burn(t: Tactical, s: GameState) {
  for (const k of Object.keys(t.fire).map(Number)) {
    if (t.tiles[k] === 'G' && (t.gates[k] ?? 0) > 0) {
      t.gates[k] = Math.max(0, t.gates[k] - Math.round(t.gateMax * TR.FIRE_GATE_BURN));
      if (t.gates[k] === 0) t.log.push('城門が焼け落ちた！');
    }
    const e = unitAt(t, k);
    if (e) { e.morale = Math.max(0, e.morale - 0.1); hit(t, s, e, Math.round(e.troops * TR.FIRE_BURN), null); }
    t.fire[k]--;
    if (t.fire[k] <= 0) delete t.fire[k];
  }
}

// ───────── 手番 ─────────
function startPhase(t: Tactical, side: Side) {
  t.phase = side;
  // 大筒: 攻め手の手番ごとに、残りの最も少ない城門を撃つ
  if (side === 'A' && t.cannon && t.turn > 1) {
    const g = Object.keys(t.gates).map(Number).filter((x) => t.gates[x] > 0).sort((x, y) => t.gates[x] - t.gates[y])[0];
    if (g !== undefined) {
      t.gates[g] = Math.max(0, t.gates[g] - Math.round(t.gateMax * R.CANNON_GATE_TURN * t.cannon));
      t.log.push(t.gates[g] === 0 ? '大筒の砲撃で城門が崩れた！' : `大筒が城門を撃つ（残り${t.gates[g]}）。`);
    }
  }
  for (const u of t.units) {
    if (u.out || u.side !== side) continue;
    u.moved = false; u.acted = false;
    u.mp = u.routed ? TR.ROUTED_MP : TR.MP;
    u.cmd = false;
    if (u.confused > 0) u.confused--;
  }
  const c = t.cmd?.[side];
  if (c) c.left = c.couriers;
  if (t.scouts) t.scouts[side].left = t.scouts[side].max;
  if (t.scoutAreas) t.scoutAreas = t.scoutAreas.filter((a) => a.side !== side); // 物見の効き目はこちらの次の手番まで
  noteSeen(t, 'A'); noteSeen(t, 'D');
}

// ───────── 視界と物見（野戦） ─────────
// 見える範囲: 本陣の指揮下の部隊（と同盟国の部隊）は周り3ヘックス（丘から4）。指揮の外の部隊は隣だけ（知らせが本陣に届かない）。
// 森の中の部隊は、隣か丘の上から2ヘックスまでしか見えない。物見で見通した場所は全部見える。
const visCache = new WeakMap<Tactical, { key: string; A: Set<number>; D: Set<number> }>();
export function visibleTiles(t: Tactical, side: Side): Set<number> {
  const key = `${t.turn}${t.phase}|${t.units.map((u) => (u.out ? 'x' : u.tile + (u.cmd ? 'c' : ''))).join(',')}|${(t.scoutAreas ?? []).map((a) => a.side + a.tile).join(',')}`;
  let c = visCache.get(t);
  if (!c || c.key !== key) { c = { key, A: computeVis(t, 'A'), D: computeVis(t, 'D') }; visCache.set(t, c); }
  return c[side];
}
function computeVis(t: Tactical, side: Side): Set<number> {
  const out = new Set<number>();
  if (!t.fog) { for (let i = 0; i < t.tiles.length; i++) out.add(i); return out; }
  for (const o of t.units) {
    if (o.out || o.side !== side) continue;
    const high = t.tiles[o.tile] === 'H';
    const r = inCommand(t, o) ? (high ? R.SIGHT_HIGH : R.SIGHT) : 1;
    for (let i = 0; i < t.tiles.length; i++) {
      const d = tDist(t, o.tile, i);
      if (d > r) continue;
      if (t.tiles[i] === 'F' && d > (high ? 2 : 1)) continue;
      out.add(i);
    }
  }
  for (const a of t.scoutAreas ?? []) if (a.side === side) for (let i = 0; i < t.tiles.length; i++) if (tDist(t, a.tile, i) <= R.SCOUT_RADIUS) out.add(i);
  return out;
}
export const canSee = (t: Tactical, side: Side, e: TUnit) => !e.out && !e.hidden && (e.side === side || visibleTiles(t, side).has(e.tile));
// 見えている敵を記憶する（見えなくなれば最後に見た位置が残る）
export function noteSeen(t: Tactical, side: Side) {
  if (!t.seen) return;
  for (const e of t.units) {
    if (e.side === side) continue;
    if (e.out) { delete t.seen[side][e.id]; continue; }
    if (canSee(t, side, e)) t.seen[side][e.id] = { tile: e.tile, troops: e.troops, turn: t.turn };
    else if (t.seen[side][e.id] && visibleTiles(t, side).has(t.seen[side][e.id].tile)) delete t.seen[side][e.id]; // 見に行ったらいなかった
  }
}
// 物見: 選んだ地点の周り2ヘックスを、こちらの次の手番まで見通す。敵の知将の近くでは欺かれやすい。伏兵も見破る
export function scoutRange(t: Tactical, side: Side, tile: number) {
  return t.units.some((u) => !u.out && u.side === side && tDist(t, u.tile, tile) <= R.SCOUT_RANGE);
}
export function scoutChance(t: Tactical, side: Side, tile: number) {
  const ints = t.units.filter((u) => !u.out && u.side !== side && u.general && tDist(t, u.tile, tile) <= R.SCOUT_RADIUS + 1).map((u) => u.int);
  const best = ints.length ? Math.max(...ints) : 0;
  return Math.max(0.4, Math.min(0.95, 0.95 - Math.max(0, best - 60) / 100));
}
export function doScout(t: Tactical, s: GameState, side: Side, tile: number): string {
  const sc = t.scouts![side];
  if (sc.left <= 0 || !scoutRange(t, side, tile)) return '';
  sc.left--;
  if (rand(s) >= scoutChance(t, side, tile)) { const m = '物見は敵に欺かれ、何も掴めなかった。'; t.log.push(m); return m; }
  t.scoutAreas!.push({ side, tile });
  // 伏兵を見破れるかは知略の比べ合い: 0.3 +（こちらの最も高い知略 − 伏兵の知略）÷100（10〜70%）
  const myInt = Math.max(40, ...t.units.filter((u) => !u.out && u.side === side && u.general).map((u) => u.int));
  // 伏兵は物見の中心とその隣にいるときだけ見破れる
  const found = t.units.filter((u) => !u.out && u.side !== side && u.hidden && tDist(t, u.tile, tile) <= 1
    && rand(s) < Math.max(0.1, Math.min(0.7, 0.3 + (myInt - u.int) / 100)));
  for (const u of found) u.hidden = false;
  const seen = t.units.filter((u) => !u.out && u.side !== side && tDist(t, u.tile, tile) <= R.SCOUT_RADIUS).length;
  noteSeen(t, side);
  const m = `物見の報せ: ${seen ? `敵${seen}隊を見つけた` : '敵の姿はない'}${found.length ? `（伏兵${found.length}隊を見破った）` : ''}。`;
  t.log.push(m);
  return m;
}

export function endPhase(t: Tactical, s: GameState) {
  checkEnd(t, s);
  if (t.over) return;
  if (t.phase === 'A') startPhase(t, 'D');
  else {
    burn(t, s);
    checkEnd(t, s);
    if (t.over) return;
    t.turn++;
    if (t.turn > t.maxTurn) { t.over = 'draw'; t.reason = t.kind === 'siege' ? '月末。この月のうちに城は落ちなかった。囲みを解かなければ、来月この続きから攻める。' : '日没。両軍は兵を引いた。'; return; }
    startPhase(t, 'A');
  }
}

// 潰走部隊は自陣の端へ逃げ、端に着けば離脱
export function fleeRouted(t: Tactical, side: Side) {
  for (const u of t.units) {
    if (u.out || u.side !== side || !u.routed) continue;
    const edge = side === 'A' ? 0 : t.w - 1;
    if (t.kind === 'siege' && side === 'D') { u.acted = true; continue; } // 城内の潰走兵は動けない
    if (tcol(t, u.tile) === edge) { u.out = 'escaped'; t.log.push(`${u.name}は戦場を離脱した。`); continue; }
    const reach = unitReach(t, u);
    let best = u.tile, bd = Math.abs(tcol(t, u.tile) - edge);
    for (const [i] of reach) { const d = Math.abs(tcol(t, i) - edge); if (d < bd) { bd = d; best = i; } }
    if (best !== u.tile) moveUnit(t, u, best);
    if (tcol(t, u.tile) === edge) { u.out = 'escaped'; t.log.push(`${u.name}は戦場を離脱した。`); }
    u.acted = true;
  }
}

export function checkEnd(t: Tactical, s: GameState) {
  if (t.over) return;
  const fighting = (side: Side) => t.units.filter((u) => !u.out && u.side === side && !u.routed);
  const hqDown = (side: Side) => t.units.some((u) => u.hq && u.side === side && (u.out || u.routed));
  if (t.kind === 'siege') {
    const keep = t.tiles.indexOf('K');
    const onKeep = unitAt(t, keep);
    if (onKeep && onKeep.side === 'A' && !onKeep.routed) { t.over = 'A'; t.reason = '本丸を制圧した。'; return; }
    if (!fighting('D').length) { t.over = 'A'; t.reason = '城兵は尽きた。'; return; }
    if (!fighting('A').length || hqDown('A')) { t.over = 'D'; t.reason = '寄せ手は崩れた。'; return; }
  } else {
    if (!fighting('A').length || hqDown('A')) { t.over = 'D'; t.reason = hqDown('A') ? '攻め手の本陣が崩れた。' : '攻め手は総崩れとなった。'; return; }
    if (!fighting('D').length || hqDown('D')) { t.over = 'A'; t.reason = hqDown('D') ? '守り手の本陣が崩れた。' : '守り手は総崩れとなった。'; return; }
  }
  void s;
}

export function retreatSide(t: Tactical, side: Side) {
  t.over = side === 'A' ? 'D' : 'A';
  t.reason = `${side === 'A' ? '攻め手' : '守り手'}は退却した。`;
  for (const u of t.units) if (!u.out && u.side === side) { u.troops = Math.round(u.troops * 0.92); u.morale = Math.max(0.2, u.morale - 0.15); }
}

export { enemyOf };
