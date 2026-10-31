// 兵站: 領国のつながり（本国・飛び地・海路）、補給線（自城からの距離と敵による遮断）、小荷駄（部隊の携行兵糧）、城の蔵（籠城の備え）。
// 家の蔵（clan.food）は本国と、海でつながる飛び地の分。海でもつながらない飛び地は、その中の城の蔵で食べる。
import { HEXES, NEIGHBORS } from './map';
import { capital } from './ops';
import { bugyoOf, roleOf } from './ranks';
import * as R from './rules';
import { addLog, allied, castleAt, clanCastles, garrisonMax, hexOwner, hostile, occupancy } from './state';
import type { Army, Castle, GameState } from './types';
import { isCrossing, karairiOn } from './karairi';
import { TRAITS } from '../data/traits';
import { isForeignHex } from './map';

// 海に面したヘックス（格子の隣が6つそろわない）
const hexIndex = new Map(HEXES.map((h) => [`${h.q},${h.r}`, h.i]));
const DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
const COASTAL = HEXES.map((h) => DIRS.some(([dq, dr]) => !hexIndex.has(`${h.q + dq},${h.r + dr}`)));
export const isPort = (c: Castle) => COASTAL[c.hex];

export interface SupplyNet {
  clan: string;
  compOf: Map<number, number>; // 自城の番号 → まとまりの番号
  home: number; // 本国のまとまり（-1 は城なし）
  seaLinked: Set<number>; // 海で本国とつながる飛び地
  cost: Map<number, { c: number; comp: number }>; // ヘックス → 自城からの補給の距離（自領・同盟領は0）と、どのまとまりから届くか
  range: number; // 補給の届く距離
  loss: number; // 兵站奉行による運送の減りの倍率
}

// 兵站奉行: 知略の最も高い者の腕で、補給の届く距離と運送の減りが変わる
export function hyoroBugyo(s: GameState, clan: string) {
  const bs = bugyoOf(s, clan).filter((g) => roleOf(g) === 'hyoro').sort((a, b) => b.int - a.int);
  return bs[0] ?? null;
}
export function supplyRange(s: GameState, clan: string) {
  const g = hyoroBugyo(s, clan);
  return R.SUPPLY_RANGE + (g ? R.hyoroRange(g.int) + (TRAITS[g.id] === 'sankan' ? 1 : 0) : 0); // 算勘の兵站奉行は+1
}
export const supplyLoss = (s: GameState, clan: string) => { const g = hyoroBugyo(s, clan); return g ? R.hyoroLoss(g.int) * (TRAITS[g.id] === 'sankan' ? 0.85 : 1) : 1; };

// 領国のつながり: 自領・同盟領・国人の地をたどって自城をまとめる（敵の領地と敵の部隊のいるヘックスは通れない）
const passable = (s: GameState, clan: string, h: number, occ: Map<number, Army>) => {
  const o = hexOwner(s, h);
  if (o !== clan && !allied(s, clan, o)) return false; // 国人衆の地も通れない（領主の違う地を兵糧は越えない）
  const a = occ.get(h);
  return !a || !hostile(s, clan, a.clan);
};

export function supplyNet(s: GameState, clan: string): SupplyNet {
  const occ = occupancy(s);
  const own = clanCastles(s, clan);
  const compOf = new Map<number, number>();
  const seen = new Map<number, number>();
  let n = 0;
  for (const c of own) {
    if (seen.has(c.hex)) { compOf.set(c.i, seen.get(c.hex)!); continue; }
    const id = n++;
    const q = [c.hex]; seen.set(c.hex, id);
    while (q.length) {
      const h = q.pop()!;
      for (const j of NEIGHBORS[h]) if (!seen.has(j) && !isCrossing(h, j) && passable(s, clan, j, occ)) { seen.set(j, id); q.push(j); } // 海峡は陸続きではない
    }
    compOf.set(c.i, id);
  }
  const cap = capital(s, clan);
  const home = cap ? compOf.get(cap.i)! : -1;
  // 海路: 本国にも飛び地にも港（海沿いの城）があればつながる
  const seaLinked = new Set<number>();
  const portComps = new Set(own.filter(isPort).map((c) => compOf.get(c.i)!));
  if (portComps.has(home)) for (const k of portComps) if (k !== home) seaLinked.add(k);

  // 補給の距離: 自城から 0-1 BFS。自領・同盟領は0、それ以外は1歩ごとに1。
  // 敵の部隊のいるヘックスへは入れず、敵の部隊に接するヘックス（自領・同盟領でない）からは先へ延びない
  const cost = new Map<number, { c: number; comp: number }>();
  const dq: number[] = [];
  for (const c of own) { cost.set(c.hex, { c: 0, comp: compOf.get(c.i)! }); dq.push(c.hex); }
  const friendly = (h: number) => { const o = hexOwner(s, h); return o === clan || allied(s, clan, o); };
  const zoc = (h: number) => NEIGHBORS[h].some((j) => { const a = occ.get(j); return !!a && hostile(s, clan, a.clan); });
  const range = supplyRange(s, clan);
  while (dq.length) {
    const h = dq.shift()!;
    const cur = cost.get(h)!;
    if (cur.c >= range) continue;
    if (!friendly(h) && zoc(h) && !castleAt(s, h)) continue; // 敵に接する敵地からは延びない
    for (const j of NEIGHBORS[h]) {
      if (isCrossing(h, j)) continue; // 海を渡る兵糧は船で（海路）
      const a = occ.get(j);
      if (a && hostile(s, clan, a.clan)) continue;
      const step = friendly(j) ? 0 : 1;
      const nc = cur.c + step;
      const prev = cost.get(j);
      if (prev && prev.c <= nc) continue;
      cost.set(j, { c: nc, comp: cur.comp });
      if (step === 0) dq.unshift(j); else dq.push(j);
    }
  }
  return { clan, compOf, home, seaLinked, cost, range, loss: supplyLoss(s, clan) };
}

export type SupplyState = { ok: boolean; dist: number; comp: number; kind: 'home' | 'sea' | 'enclave' | 'none' };
export function armySupply(s: GameState, a: Army, net = supplyNet(s, a.clan)): SupplyState {
  const x = net.cost.get(a.hex);
  if (!x) return { ok: false, dist: Infinity, comp: -1, kind: 'none' };
  const kind = x.comp === net.home ? 'home' : net.seaLinked.has(x.comp) ? 'sea' : 'enclave';
  return { ok: true, dist: x.c, comp: x.comp, kind };
}
export const isSupplied = (s: GameState, a: Army, net?: SupplyNet) => armySupply(s, a, net).ok;
// 城がどのまとまりにあるか
export function castleSupply(s: GameState, c: Castle, net = supplyNet(s, c.owner!)): 'home' | 'sea' | 'enclave' {
  const k = net.compOf.get(c.i);
  return k === net.home ? 'home' : k !== undefined && net.seaLinked.has(k) ? 'sea' : 'enclave';
}

// 兵糧攻めの包囲: 敵の部隊が2つ以上取りつくか、城兵の2倍を超える敵が取りつけば、外から兵糧を入れられない
export function cutOff(s: GameState, c: Castle): boolean {
  if (!c.owner) return false;
  if (s.sieges?.[c.i]) return true; // 月をまたいで囲まれている
  const occ = occupancy(s);
  let n = 0, t = 0;
  for (const j of NEIGHBORS[c.hex]) { const a = occ.get(j); if (a && hostile(s, c.owner, a.clan)) { n++; t += a.troops; } }
  return n >= 2 || (n >= 1 && t >= c.garrison * 2);
}

// 城の蔵: 籠城の備え（城兵の何か月分）
export const storeMax = (c: Castle) => Math.round(garrisonMax(c) * R.STORE_MONTHS * R.FOOD_PER_SOLDIER);
export const storeOf = (c: Castle) => c.store ?? storeMax(c);
export const carryOf = (a: Army) => a.food ?? R.CARRY_MONTHS;

// 飛び地のまとまりの城の蔵から取る（足りなければ取れた分だけ）
function drawEnclave(cs: Castle[], want: number): number {
  let got = 0;
  for (const c of cs) {
    if (got >= want) break;
    const take = Math.min(storeOf(c), want - got);
    c.store = storeOf(c) - take; got += take;
  }
  return got;
}

// 月末の兵站（economy.monthEnd から、家ごとに）。戻り値: 本国の蔵が尽きたか
export function monthlySupply(s: GameState, clan: string, kyoExtra: number, besieged: (c: Castle) => boolean): { starving: boolean; starvingArmies: Set<number>; net: SupplyNet } {
  const C = s.clans[clan];
  const mine = clan === s.player;
  const net = supplyNet(s, clan);
  const own = clanCastles(s, clan);
  const enclaveCastles = (k: number) => own.filter((c) => net.compOf.get(c.i) === k);
  const starvingArmies = new Set<number>();
  let homeDraw = kyoExtra;
  const lowArmies: string[] = [];
  for (const a of Object.values(s.armies)) {
    if (a.clan !== clan || a.ikki) continue;
    const base = a.troops * R.FOOD_PER_SOLDIER;
    const sp = armySupply(s, a, net);
    if (sp.ok) {
      // 補給下: 運送で減る分も含めて蔵から送り、小荷駄も満たす
      const refill = Math.max(0, R.CARRY_MONTHS - carryOf(a)) * base;
      const mult = (1 + R.SUPPLY_LOSS * sp.dist * net.loss) * (sp.kind === 'sea' ? 1 + R.SEA_LOSS : 1);
      const want = (base + refill) * mult;
      // 唐入り: 海の向こうへ船で運ぶ兵糧は、この月に渡せる量まで（足りなければ現地の城の蔵、それも尽きれば小荷駄）
      const overSea = sp.kind === 'sea' && karairiOn(s) && isForeignHex(a.hex);
      const shipped = overSea ? Math.min(want, Math.max(0, s.karairi!.foodLeft ?? 0)) : want;
      const cut = overSea && s.karairi!.raid?.turn === s.turn ? s.karairi!.raid.cut ?? 0 : 0; // 李舜臣に沈められる分
      if (overSea && cut) s.karairi!.raid!.sunk += Math.round(shipped * cut);
      if (shipped < want || cut) {
        s.karairi!.foodLeft = Math.max(0, (s.karairi!.foodLeft ?? 0) - shipped);
        const arrived = shipped * (1 - cut);
        const got = arrived + drawEnclave(enclaveCastles(sp.comp), want - arrived);
        homeDraw += shipped;
        if (got < want * 0.999) { a.food = Math.max(0, carryOf(a) - (1 - got / want)); if (a.food <= 0) starvingArmies.add(a.id); else if (mine) lowArmies.push(s.generals[a.main]?.name ?? ''); }
        else a.food = R.CARRY_MONTHS;
        continue;
      }
      if (overSea) s.karairi!.foodLeft = (s.karairi!.foodLeft ?? 0) - want;
      if (sp.kind === 'enclave') {
        const got = drawEnclave(enclaveCastles(sp.comp), want);
        if (got < want * 0.999) { a.food = Math.max(0, carryOf(a) - (1 - got / want)); if (a.food <= 0) starvingArmies.add(a.id); }
        else a.food = R.CARRY_MONTHS;
      } else { homeDraw += want; a.food = R.CARRY_MONTHS; }
    } else {
      // 補給切れ: 小荷駄を食べる。この月の半分も食べられなければ飢える
      const had = carryOf(a);
      a.food = Math.max(0, had - 1);
      if (had < 0.5) starvingArmies.add(a.id);
      else if (a.food < 0.5 && mine) lowArmies.push(s.generals[a.main]?.name ?? '');
    }
  }
  C.food -= Math.round(homeDraw);
  const starving = C.food < 0;
  if (starving) C.food = 0;
  // 城の蔵: 囲まれていなければ満たす（本国・海路は家の蔵から。飛び地は収穫で）。囲まれれば城兵が食べる
  for (const c of own) {
    const max = storeMax(c), kind = castleSupply(s, c, net);
    if (besieged(c)) {
      const eat = c.garrison * R.FOOD_PER_SOLDIER;
      c.store = storeOf(c) - eat;
      if (c.store <= 0) {
        c.store = 0;
        c.gMorale = Math.max(0.2, c.gMorale - R.STORE_STARVE_MORALE);
        c.garrison = Math.round(c.garrison * (1 - R.STORE_STARVE_DESERT));
        if (mine) addLogSafe(s, `${c.name}の蔵の兵糧が尽き、城兵が飢えている。`, true);
      }
      continue;
    }
    if (kind === 'enclave') continue;
    const need = Math.max(0, max - storeOf(c));
    const abroadCap = karairiOn(s) && isForeignHex(c.hex) ? Math.max(0, s.karairi.foodLeft ?? 0) : Infinity; // 海の向こうの城の蔵も船で
    const give = Math.min(need, C.food, abroadCap);
    if (abroadCap !== Infinity) s.karairi!.foodLeft = abroadCap - give;
    c.store = storeOf(c) + give; C.food -= give;
  }
  if (lowArmies.length) addLogSafe(s, `補給が届かず、${lowArmies.join('・')}隊の小荷駄（持ち歩く兵糧）が尽きた。来月から飢える。`, true);
  for (const id of starvingArmies) {
    const a = s.armies[id];
    if (!a) continue;
    a.morale = Math.max(0.1, a.morale - R.STARVE_MORALE);
    a.troops = Math.round(a.troops * (1 - R.STARVE_DESERT));
    if (mine) addLogSafe(s, `${s.generals[a.main]?.name ?? ''}隊は兵糧が尽き、兵が逃げはじめた。`, true);
  }
  return { starving, starvingArmies, net };
}

// 収穫の分け先: 海でもつながらない飛び地の城は、その城の蔵へ
export function harvestToEnclave(s: GameState, c: Castle, net: SupplyNet): boolean {
  return castleSupply(s, c, net) === 'enclave';
}

const addLogSafe = (s: GameState, text: string, mine: boolean) => addLog(s, text, 'econ', mine);

// 開始時・旧セーブ: 城の蔵を満たす
export function initStores(s: GameState) { for (const c of s.castles) if (c.store === undefined) c.store = storeMax(c); }
