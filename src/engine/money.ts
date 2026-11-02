// お金（貫）: 商業収入・兵糧の売買・鉄砲・名物
import { onGift } from './on';
import { COMMERCE_BONUS, GUN_SOURCES, MEIBUTSU, MINES, PRODUCTS, SAKAI, type ProductKind } from '../data/economy';
import { CASTLE_TYPE, TSUME } from '../data/castles';
import { NEIGHBORS } from './map';
import * as R from './rules';
import { aiInvest, taxDef } from './invest';
import { addLog, castleAt, clanArmies, clanCastles, clanName, drillOf, hostile, maxTroops, occupancy } from './state';
import type { Army, Castle, GameState, General, Item } from './types';

// 商業（特産品の商いはその城の商業の開発度に応じて上乗せ）
export const productsAt = (c: Castle) => PRODUCTS.filter(([id]) => id === c.id);
export const minesAt = (c: Castle) => MINES.filter(([id]) => id === c.id);
export const castleCom = (c: Castle) => (c.baseCom + productsAt(c).reduce((t, [, , k, v]) => t + (k === 'com' ? v : 0), 0)) * c.cdev * (1 + (c.kiri ?? 0) * R.KIRI_COM);
// 鉱山の産出（包囲中は止まり、治安が低いと減る）。知行に関わらず当家に入る
export const castleMine = (s: GameState, c: Castle) => { const m = minesAt(c); if (!m.length || !c.owner) return 0; if (besiegedNow(s, c)) return 0; return Math.round(m.reduce((t, x) => t + x[3], 0) * R.mineChian(c.chian)); };
export const clanMine = (s: GameState, clan: string) => clanCastles(s, clan).reduce((t, c) => t + castleMine(s, c), 0);
export const clanIncome = (s: GameState, clan: string) => Math.round(clanCastles(s, clan).reduce((t, c) => t + castleCom(c), 0) * taxDef(s, clan).income + clanMine(s, clan)); // 商いは年貢の率に従う（鉱山は従わない）
// 特産品の効き目（家に一つでもあれば）
export const hasProduct = (s: GameState, clan: string | null, kind: ProductKind) => !!clan && PRODUCTS.some(([id, , k]) => k === kind && s.castles.some((c) => c.id === id && c.owner === clan));
function besiegedNow(s: GameState, c: Castle) { const occ = occupancy(s); return NEIGHBORS[c.hex].some((j) => { const o = occ.get(j); return !!o && hostile(s, o.clan, c.owner); }); }
const owns = (s: GameState, clan: string, castleId: string) => s.castles.some((c) => c.id === castleId && c.owner === clan);

// ───────── 兵糧の売買 ─────────
export const ricePrice = (s: GameState) => R.RICE_PRICE * R.RICE_SEASON[s.month - 1];
export function buyRice(s: GameState, clan: string, koku: number): boolean {
  const cost = Math.ceil(koku * ricePrice(s));
  const C = s.clans[clan];
  if (koku <= 0 || C.gold < cost) return false;
  C.gold -= cost; C.food += koku;
  return true;
}
export function sellRice(s: GameState, clan: string, koku: number): boolean {
  const C = s.clans[clan];
  if (koku <= 0 || C.food < koku) return false;
  C.food -= koku; C.gold += Math.floor(koku * ricePrice(s) * R.RICE_SELL);
  return true;
}

// ───────── 鉄砲 ─────────
export const hasGunSource = (s: GameState, clan: string) => GUN_SOURCES.some((id) => owns(s, clan, id));
export const gunPrice = (s: GameState, clan: string) => Math.round((hasGunSource(s, clan) ? R.GUN_PRICE_SOURCE : R.GUN_PRICE) * (hasProduct(s, clan, 'iron') ? R.IRON_GUN : 1) * 10) / 10;
export const clanGuns = (s: GameState, clan: string) => s.clans[clan].guns + clanArmies(s, clan).reduce((t, a) => t + (a.guns ?? 0), 0);
export function buyGuns(s: GameState, clan: string, n: number): boolean {
  const cost = n * gunPrice(s, clan);
  const C = s.clans[clan];
  if (n <= 0 || C.gold < cost) return false;
  C.gold -= cost; C.guns += n;
  return true;
}
export const gunCap = (a: Army) => Math.floor((a.troops * R.GUN_SHARE) / 10) * 10;
// 蔵の鉄砲を部隊に持たせる（n<0 で蔵へ戻す）
export function armGuns(s: GameState, a: Army, n: number) {
  const C = s.clans[a.clan];
  const cur = a.guns ?? 0;
  const next = Math.max(0, Math.min(gunCap(a), cur + Math.min(n, C.guns)));
  C.guns -= next - cur; a.guns = next;
}
// 兵の損害に合わせて鉄砲も失う
export function loseGuns(a: Army, before: number) {
  if (!a.guns || before <= 0) return;
  a.guns = Math.min(a.guns, Math.round((a.guns * Math.max(0, a.troops)) / before), Math.max(0, a.troops));
}

// ───────── 足軽（常備兵） ─────────
// 自城か自城の隣にいる部隊だけ雇える。兵数の上限（武将の統率と身分）を超える分は、農兵を帰して入れ替える
export function ashiRoom(s: GameState, a: Army): number {
  if (a.ikki) return 0;
  const near = castleAt(s, a.hex)?.owner === a.clan || NEIGHBORS[a.hex].some((j) => castleAt(s, j)?.owner === a.clan);
  if (!near) return 0;
  const farmers = Math.floor(a.troops * (1 - (a.ashi ?? 0)));
  return Math.max(0, Math.min(R.ASHI_STEP, Math.max(0, maxTroops(s, a) - a.troops) + farmers, Math.floor(s.clans[a.clan].gold / R.ASHI_HIRE)));
}
export function hireAshi(s: GameState, a: Army, n: number): number {
  n = Math.min(n, ashiRoom(s, a));
  if (n <= 0) return 0;
  s.clans[a.clan].gold -= n * R.ASHI_HIRE;
  const add = Math.min(n, Math.max(0, maxTroops(s, a) - a.troops)), swap = n - add;
  const ashi = a.troops * (a.ashi ?? 0) + n;
  const kept = a.troops - swap;
  a.troops = kept + n;
  a.drill = (drillOf(a) * kept + R.DRILL_ASHI * n) / a.troops;
  a.ashi = Math.min(1, ashi / a.troops);
  return n;
}

// ───────── 名物 ─────────
export function initItems(s: GameState) {
  s.items = {};
  for (const [id, name, kind, grade, clan, holder] of MEIBUTSU) {
    const it: Item = { id, name, kind, grade, clan, holder: null };
    s.items[id] = it;
    if (clan && s.clans[clan]?.alive) s.clans[clan].prestige = Math.min(100, s.clans[clan].prestige + grade);
    else it.clan = null;
    if (holder && s.generals[holder]?.clan === clan) equip(s, s.generals[holder], it, true);
  }
}
export const clanItems = (s: GameState, clan: string) => Object.values(s.items ?? {}).filter((i) => i.clan === clan);
export const marketItems = (s: GameState) => Object.values(s.items ?? {}).filter((i) => !i.clan && i.kind !== 'nanban');
export const itemPrice = (s: GameState, clan: string, it: Item) => Math.round(it.grade * R.ITEM_PRICE * (owns(s, clan, SAKAI) ? R.ITEM_SAKAI_DISCOUNT : 1));
export const ITEM_KIND_NAME = { tea: '茶器', sword: '刀剣', nanban: '南蛮' } as const;
export const itemLabel = (it: Item) => `${it.name}（${ITEM_KIND_NAME[it.kind]}・格${it.grade}）`;

function applyBonus(g: General, it: Item, sign: 1 | -1) {
  const b = R.itemBonus(it.kind, it.grade);
  g.bra += b.bra * sign; g.int += b.int * sign; g.lea += b.lea * sign; g.cha += b.cha * sign;
}
// 名物による能力の上乗せ（表示用）
export function bonusOf(s: GameState, g: General) {
  const out = { bra: 0, int: 0, lea: 0, cha: 0 };
  for (const id of [g.tea, g.sword, g.nanban]) {
    if (!id || !s.items[id]) continue;
    const b = R.itemBonus(s.items[id].kind, s.items[id].grade);
    out.bra += b.bra; out.int += b.int; out.lea += b.lea; out.cha += b.cha;
  }
  return out;
}

export function unequip(s: GameState, it: Item) {
  if (!it.holder) return;
  const g = s.generals[it.holder];
  if (g) { applyBonus(g, it, -1); if (g[it.kind] === it.id) g[it.kind] = undefined; }
  it.holder = null;
}
// 下賜: 武将に持たせる（同じ種類は1点まで。初めて受ける名物なら功績）
export function equip(s: GameState, g: General, it: Item, silent = false) {
  const cur = g[it.kind];
  if (cur && s.items[cur]) unequip(s, s.items[cur]);
  unequip(s, it);
  it.holder = g.id; g[it.kind] = it.id;
  applyBonus(g, it, 1);
  if (!silent && !(g.gifted ?? []).includes(it.id)) {
    g.gifted = [...(g.gifted ?? []), it.id];
    onGift(g, it.grade);
  }
}
// 家から家へ（威信も移る）。to=null は市場へ
export function transferItem(s: GameState, it: Item, to: string | null) {
  unequip(s, it);
  if (it.clan && s.clans[it.clan]) s.clans[it.clan].prestige = Math.max(0, s.clans[it.clan].prestige - it.grade);
  it.clan = to;
  if (to) s.clans[to].prestige = Math.min(100, s.clans[to].prestige + it.grade);
}
export function buyItem(s: GameState, clan: string, it: Item): boolean {
  const p = itemPrice(s, clan, it);
  if (it.clan || s.clans[clan].gold < p) return false;
  s.clans[clan].gold -= p;
  transferItem(s, it, clan);
  addLog(s, `${clanName(s, clan)}家が名物「${it.name}」を手に入れた。`, 'info', true);
  return true;
}
// 武将が討死・捕縛・出奔したとき: 名物は家の蔵へ戻るか、捕らえた家へ
export function dropItems(s: GameState, g: General, to: string | null | undefined) {
  for (const id of [g.tea, g.sword, g.nanban]) {
    if (!id || !s.items?.[id]) continue;
    const it = s.items[id];
    unequip(s, it);
    if (to !== undefined && to !== it.clan) transferItem(s, it, to);
  }
}
// 滅亡: 蔵の名物は滅ぼした家へ（なければ市場へ）
export function seizeItems(s: GameState, loser: string, by: string | null) {
  for (const it of clanItems(s, loser)) transferItem(s, it, by && s.clans[by]?.alive ? by : null);
}

// ───────── AI ─────────
export function aiEconomy(s: GameState, clan: string) {
  aiTrade(s, clan);
  aiEquip(s, clan);
  if (!s.clans[clan].foreign) aiInvest(s, s.clans[clan], clanIncome(s, clan)); // 余った金を城に回す
}
// 商い: 兵糧の売買・鉄砲の購入と配備・名物の購入
export function aiTrade(s: GameState, clan: string) {
  const C = s.clans[clan];
  const upkeep = clanArmies(s, clan).reduce((t, a) => t + a.troops, 0) * R.FOOD_PER_SOLDIER;
  const reserve = R.PLOT_GOLD * 2 + 2000;
  const price = ricePrice(s);
  // 兵糧: 足りなければ買い、余れば相場の高い時期に売る
  if (C.food < upkeep * 3 && C.gold > reserve) buyRice(s, clan, Math.floor(Math.min(upkeep * 6 - C.food, (C.gold - reserve) / price)));
  else if (C.food > upkeep * 14 + 20000 && price >= 1.1) sellRice(s, clan, Math.floor((C.food - upkeep * 10) * 0.5));
  if (C.gold < R.PLOT_GOLD && C.food > upkeep * 8 + 5000) sellRice(s, clan, Math.floor(Math.min(C.food - upkeep * 8, (R.PLOT_GOLD * 2) / (price * R.RICE_SELL))));
  // 鉄砲: 兵の20%まで
  const target = Math.round(upkeep * 0.2 / R.FOOD_PER_SOLDIER), have = clanGuns(s, clan);
  const spare = C.gold - reserve - 2000;
  if (have < target && spare > 0 && !C.foreign) buyGuns(s, clan, Math.floor(Math.min(target - have, spare / gunPrice(s, clan)))); // 朝鮮・明は日本の市で鉄砲を買わない
  // 自城（とその隣）にいる部隊に持たせる
  for (const a of clanArmies(s, clan)) {
    if (!C.guns) break;
    const home = s.castles.some((c) => c.owner === clan && (c.hex === a.hex || NEIGHBORS[c.hex].includes(a.hex)));
    if (home && (a.guns ?? 0) < gunCap(a)) armGuns(s, a, gunCap(a));
  }
  // 足軽: 金に余裕があり、給金が収入の3割に収まるうちは、自城の近くの部隊に雇う
  const wage = clanArmies(s, clan).reduce((x, a) => x + a.troops * (a.ashi ?? 0), 0) * R.ASHI_WAGE;
  for (const a of clanArmies(s, clan).sort((x, y) => y.troops - x.troops)) {
    if (C.gold < reserve + 6000 || wage + R.ASHI_STEP * R.ASHI_WAGE > clanIncome(s, clan) * 0.3) break;
    hireAshi(s, a, Math.min(R.ASHI_STEP, Math.floor((C.gold - reserve - 6000) / R.ASHI_HIRE)));
    break; // 一月に一部隊まで
  }
  // 名物: 金に余裕があれば市場から
  const market = marketItems(s).sort((x, y) => itemPrice(s, clan, x) - itemPrice(s, clan, y));
  if (!C.foreign && market.length && C.gold > reserve + itemPrice(s, clan, market[0]) * 3 && s.turn % 6 === 0) buyItem(s, clan, market[0]); // 朝鮮・明は名物を買わない
}
// 下賜: 持たせていない名物を部隊長へ（刀剣は兵の多い部隊長、茶器は当主から）
export function aiEquip(s: GameState, clan: string) {
  const C = s.clans[clan];
  for (const it of clanItems(s, clan).filter((i) => !i.holder).sort((x, y) => y.grade - x.grade)) {
    const leader = C.leader ? s.generals[C.leader] : null;
    const cands = [
      ...(it.kind === 'tea' && leader ? [leader] : []),
      ...clanArmies(s, clan).sort((x, y) => y.troops - x.troops).map((a) => s.generals[a.main]),
      ...(leader ? [leader] : []),
    ].filter((g) => g && g.status !== 'dead' && g.status !== 'captive' && !g[it.kind]);
    if (cands[0]) equip(s, cands[0], it);
  }
}
// 外交で添える名物（持たせていない最も格の低いもの）
export function spareItem(s: GameState, clan: string): Item | null {
  return clanItems(s, clan).filter((i) => !i.holder).sort((x, y) => x.grade - y.grade)[0] ?? null;
}

// 旧セーブ（お金なし）の読み込み
export function migrateMoney(s: GameState) {
  for (const c of s.castles) if (c.baseCom === undefined) { c.baseCom = Math.round(c.baseKoku * R.COM_PER_KOKU + (COMMERCE_BONUS[c.id] ?? 0)); c.cdev = 1; }
  for (const c of s.castles) if (c.kind === undefined) { c.kind = CASTLE_TYPE[c.id] ?? 'toride'; c.tsume = TSUME[c.id]; }
  for (const c of s.castles) if (c.chian === undefined) { c.chisui = R.CHISUI_START; c.chian = R.CHIAN_START; }
  for (const C of Object.values(s.clans)) if (C.gold === undefined) { C.gold = clanIncome(s, C.id) * 3; C.guns = 0; }
  for (const C of Object.values(s.clans)) if (!C.budget) { C.budget = { chisui: 10, hodo: 10 }; C.focus = null; }
  if (!s.items) initItems(s);
  for (const C of Object.values(s.clans)) if (C.court === undefined) C.court = C.id === 'ashikaga' ? R.SHOGUN : 0;
}
