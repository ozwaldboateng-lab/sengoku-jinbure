// 城ごとに金を使う: 年貢の率・内政への追加投資・新田開発・城の普請（石垣〜天守）。AIも余った金をここに回す
import * as R from './rules';
import { addLog, castleKoku, clanCastles, hostile } from './state';
import { hexDist } from './map';
import { govTrait } from './traits';
import type { Castle, Clan, GameState } from './types';

// ───────── 年貢の率 ─────────
export type Tax = 'low' | 'mid' | 'high';
export const TAX: Record<Tax, { name: string; note: string; income: number; chian: number; grow: number; cap: number; ember: number }> = {
  low: { name: '三公七民', note: '年貢を軽くする', income: 0.8, chian: 0.6, grow: 1.25, cap: 1.1, ember: 1.5 },
  mid: { name: '四公六民', note: 'ならわしどおり', income: 1, chian: 0, grow: 1, cap: 1, ember: 1 },
  high: { name: '五公五民', note: '年貢を重くする', income: 1.2, chian: -0.8, grow: 0.85, cap: 0.95, ember: 0.8 },
};
export const taxOf = (s: GameState, clan: string | null): Tax => (clan ? s.clans[clan]?.tax ?? 'mid' : 'mid');
export const taxDef = (s: GameState, clan: string | null) => TAX[taxOf(s, clan)];
export function setTax(s: GameState, clan: string, t: Tax) {
  const C = s.clans[clan];
  if ((C.tax ?? 'mid') === t) return;
  C.tax = t;
  if (clan === s.player) addLog(s, `年貢の率を${TAX[t].name}に改めた（${TAX[t].note}）。`, 'econ', true);
}

// ───────── 内政への追加投資（開発・商業を一度に進める） ─────────
export type InvestRole = 'agri' | 'com';
export const investCap = (c: Castle, role: InvestRole) => R.devCap(c.chian) + (role === 'com' && c.rakuichi !== undefined ? R.RAKUICHI_CAP : 0);
export const investCost = (c: Castle, role: InvestRole) => Math.max(300, Math.round(role === 'agri' ? c.baseKoku * R.INVEST_AGRI : c.baseCom * R.INVEST_COM));
export function investBlock(s: GameState, clan: string, c: Castle, role: InvestRole): string | null {
  if (c.owner !== clan) return '自城だけ';
  const cur = role === 'agri' ? c.dev : c.cdev;
  if (cur >= investCap(c, role) - 0.001) return `${role === 'agri' ? '開発' : '商業'}は上限（治安で決まる）まで進んでいる`;
  if (s.clans[clan].gold < investCost(c, role)) return `金${investCost(c, role).toLocaleString()}貫が要る`;
  return null;
}
export function invest(s: GameState, clan: string, c: Castle, role: InvestRole): boolean {
  if (investBlock(s, clan, c, role)) return false;
  s.clans[clan].gold -= investCost(c, role);
  if (role === 'agri') c.dev = Math.min(investCap(c, 'agri'), c.dev + R.INVEST_STEP); else c.cdev = Math.min(investCap(c, 'com'), c.cdev + R.INVEST_STEP);
  return true;
}

// ───────── 新田開発（数か月の工事で、城の基本の石高を上げる） ─────────
export const shindenDone = (c: Castle) => c.shindenN ?? 0;
export const shindenCost = (c: Castle) => Math.round(c.baseKoku * R.SHINDEN_PER * Math.pow(R.SHINDEN_RISE, shindenDone(c)));
export function shindenBlock(s: GameState, clan: string, c: Castle): string | null {
  if (c.owner !== clan) return '自城だけ';
  if (c.shinden) return `工事中（あと${c.shinden.until - s.turn}か月）`;
  if (shindenDone(c) >= R.SHINDEN_MAX) return `この城では${R.SHINDEN_MAX}度まで`;
  if (s.clans[clan].gold < shindenCost(c)) return `金${shindenCost(c).toLocaleString()}貫が要る`;
  return null;
}
export function startShinden(s: GameState, clan: string, c: Castle): boolean {
  if (shindenBlock(s, clan, c)) return false;
  s.clans[clan].gold -= shindenCost(c);
  c.shinden = { clan, until: s.turn + R.SHINDEN_MONTHS };
  if (clan === s.player) addLog(s, `${c.name}で新田開発を始めた（${R.SHINDEN_MONTHS}か月）。`, 'econ', true);
  return true;
}

// ───────── 城の普請（石垣・櫓・天守） ─────────
export const FORT_NAME = ['土塁', '石垣', '櫓と堀', '天守'];
export const fortOf = (c: Castle) => c.fort ?? 0;
export const fortCost = (c: Castle) => Math.round(R.FORT_COST[fortOf(c) + 1] * (0.6 + castleKoku(c) / 25));
export const fortMonths = (s: GameState, c: Castle) => Math.ceil(R.FORT_MONTHS[fortOf(c) + 1] * (govTrait(s, c) === 'chikujo' ? 0.5 : 1)); // 築城の城主なら半分
export function fortBlock(s: GameState, clan: string, c: Castle): string | null {
  if (c.owner !== clan) return '自城だけ';
  if (c.fortBuild) return `普請中（あと${c.fortBuild.until - s.turn}か月）`;
  if (fortOf(c) >= FORT_NAME.length - 1) return 'これ以上は築けない';
  if (s.clans[clan].gold < fortCost(c)) return `金${fortCost(c).toLocaleString()}貫が要る`;
  return null;
}
export function startFort(s: GameState, clan: string, c: Castle): boolean {
  if (fortBlock(s, clan, c)) return false;
  s.clans[clan].gold -= fortCost(c);
  c.fortBuild = { clan, until: s.turn + fortMonths(s, c) };
  if (clan === s.player) addLog(s, `${c.name}で${FORT_NAME[fortOf(c) + 1]}の普請を始めた（${fortMonths(s, c)}か月）。`, 'castle', true);
  return true;
}
// 守りへの効き目（castleDef・城兵・城門に掛ける）
export const fortDef = (c: Castle) => fortOf(c) * R.FORT_DEF;
export const fortGarrison = (c: Castle) => 1 + fortOf(c) * R.FORT_GARRISON;
export const fortGate = (c: Castle) => 1 + fortOf(c) * R.FORT_GATE;

// ───────── 毎月: 工事の進み ─────────
export function monthlyWorks(s: GameState) {
  for (const c of s.castles) {
    if (c.shinden && c.owner !== c.shinden.clan) { if (c.shinden.clan === s.player) addLog(s, `${c.name}を失い、新田開発は止まった。`, 'econ', true); c.shinden = undefined; }
    if (c.shinden && s.turn + 1 >= c.shinden.until) { // 月末に、残り1か月の工事が終わる
      const add = c.baseKoku * R.SHINDEN_GAIN;
      c.baseKoku += add; c.shindenN = shindenDone(c) + 1; c.shinden = undefined;
      if (c.owner === s.player) addLog(s, `${c.name}の新田開発が成り、石高が${add.toFixed(1)}万石増えた。`, 'econ', true);
    }
    if (c.fortBuild && c.owner !== c.fortBuild.clan) { if (c.fortBuild.clan === s.player) addLog(s, `${c.name}を失い、普請は止まった。`, 'castle', true); c.fortBuild = undefined; }
    if (c.fortBuild && s.turn + 1 >= c.fortBuild.until) {
      c.fort = fortOf(c) + 1; c.fortBuild = undefined;
      if (c.fort === FORT_NAME.length - 1 && c.owner) s.clans[c.owner].prestige = Math.min(100, s.clans[c.owner].prestige + R.TENSHU_PRESTIGE);
      if (c.owner === s.player) addLog(s, `${c.name}の${FORT_NAME[c.fort]}が成った${c.fort === FORT_NAME.length - 1 ? `（威信+${R.TENSHU_PRESTIGE}）` : ''}。`, 'castle', true);
    }
  }
}

// ───────── AI: 余った金を城に回す ─────────
export function aiInvest(s: GameState, C: Clan, income: number) {
  const reserve = Math.max(6000, income * 5);
  let spend = Math.floor((C.gold - reserve) * 0.5);
  if (spend <= 0) return;
  const cs = clanCastles(s, C.id);
  const pay = (f: () => boolean, cost: number) => { if (cost > spend) return false; const g0 = C.gold; if (!f()) return false; spend -= g0 - C.gold; return true; };
  // 敵に近い城の普請（石垣・櫓まで。天守は大きな城だけ）
  const front = cs.filter((c) => s.castles.some((x) => x.owner && x.owner !== C.id && hostile(s, C.id, x.owner) && hexDist(x.hex, c.hex) <= 3)).sort((a, b) => castleKoku(b) - castleKoku(a));
  for (const c of front.slice(0, 3)) if (fortOf(c) < (castleKoku(c) >= 15 ? 3 : 2) && !fortBlock(s, C.id, c)) pay(() => startFort(s, C.id, c), fortCost(c));
  // 新田開発（同時に2つまで、石高の大きい城から）
  const busy = cs.filter((c) => c.shinden).length;
  if (busy < 2) for (const c of [...cs].sort((a, b) => b.baseKoku - a.baseKoku).slice(0, 4)) if (!shindenBlock(s, C.id, c) && pay(() => startShinden(s, C.id, c), shindenCost(c))) break;
  // 開発・商業の追加投資（上限に遠い城から）
  for (const role of ['agri', 'com'] as const) for (const c of [...cs].sort((a, b) => (role === 'agri' ? a.dev - b.dev : a.cdev - b.cdev))) { if (spend < 300) return; if (!investBlock(s, C.id, c, role)) pay(() => invest(s, C.id, c, role), investCost(c, role)); }
  // 年貢: 治安が低ければ軽く、金に困れば重く
  const avg = cs.reduce((t, c) => t + c.chian, 0) / Math.max(1, cs.length);
  setTax(s, C.id, avg < 40 ? 'low' : C.gold < income * 2 && avg > 60 ? 'high' : 'mid');
}
