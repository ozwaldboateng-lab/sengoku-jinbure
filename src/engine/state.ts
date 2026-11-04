// 状態の参照・小さな操作
import { HEXES } from './map';
import * as R from './rules';
import type { Army, Castle, GameState, General, LogEntry } from './types';

export function rand(s: GameState): number {
  // mulberry32（シードは状態に保持し、セーブ後も再現可能）
  let t = (s.seed = (s.seed + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export const armyList = (s: GameState) => Object.values(s.armies);

// 外交: 同盟・婚姻を結んだ勢力同士は戦わない
export const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
export function treatyOf(s: GameState, a: string, b: string) {
  return s.treaties?.find((t) => (t.a === a && t.b === b) || (t.a === b && t.b === a)) ?? null;
}
export const allied = (s: GameState, a: string | null, b: string | null) => !!a && !!b && a !== b && !!treatyOf(s, a, b);
// 自軍から見て敵か（国人衆の城は常に敵）
// 眠っている国外の家（唐入りの前の朝鮮・明）とは戦にならない
const sealed = (s: GameState, id: string | null) => !!id && !!s.clans[id]?.foreign && !s.clans[id].alive;
export const hostile = (s: GameState, me: string, other: string | null) => other !== me && !allied(s, me, other) && !sealed(s, other) && !sealed(s, me);
export function noteClash(s: GameState, a: string | null, b: string | null) {
  if (a && b) { s.lastClash ??= {}; s.lastClash[pairKey(a, b)] = s.turn; }
}
export const clanArmies = (s: GameState, clan: string) => armyList(s).filter((a) => a.clan === clan);
export const clanCastles = (s: GameState, clan: string) => s.castles.filter((c) => c.owner === clan);

export function occupancy(s: GameState): Map<number, Army> {
  const m = new Map<number, Army>();
  for (const a of armyList(s)) m.set(a.hex, a);
  return m;
}

export const hexOwner = (s: GameState, hex: number): string | null => s.castles[HEXES[hex].d]?.owner ?? null;
export const castleAt = (s: GameState, hex: number): Castle | null => {
  const c = HEXES[hex].c;
  return c === undefined ? null : s.castles[c];
};

export const castleKoku = (c: Castle) => c.baseKoku * c.dev;
export const clanKoku = (s: GameState, clan: string) => clanCastles(s, clan).reduce((t, c) => t + castleKoku(c), 0);
// 一揆勢は家の兵に数えない（兵糧も動員上限も使わない）
export const clanTroops = (s: GameState, clan: string) => clanArmies(s, clan).reduce((t, a) => t + (a.ikki ? 0 : a.troops), 0);
// 練度と足軽
export const drillOf = (a: Army) => a.drill ?? R.DRILL_START;
export const ashiOf = (a: Army) => Math.round(a.troops * (a.ashi ?? 0));
export const clanAshi = (s: GameState, clan: string) => clanArmies(s, clan).reduce((t, a) => t + (a.ikki ? 0 : ashiOf(a)), 0);
// 動員上限を使うのは農兵だけ（足軽は金で雇う）
export const farmTroops = (s: GameState, clan: string) => clanTroops(s, clan) - clanAshi(s, clan);
// 補充・AIの編成はこの人数まで（動員上限 × 動員目標）
export const mobilizeCap = (s: GameState, clan: string) => Math.round((clanCapacity(s, clan) * (s.clans[clan].mobilize ?? R.MOBILIZE_DEFAULT)) / 100);
// 動員上限: 城ごとに 石高 × 治安で決まる人数
export const clanCapacity = (s: GameState, clan: string) => Math.round(clanCastles(s, clan).reduce((t, c) => t + castleKoku(c) * R.manpowerPer(c.chian ?? R.CHIAN_START), 0) * TAX_CAP[s.clans[clan]?.tax ?? 'mid']);
const TAX_CAP = { low: 1.1, mid: 1, high: 0.95 } as const; // 年貢の率と動員上限（invest.ts の TAX と揃える）
export const garrisonMax = (c: Castle) => Math.round((R.GARRISON_BASE + castleKoku(c) * R.GARRISON_PER_KOKU) * R.CASTLE_KIND[c.kind ?? 'hira'].garrison * (1 + (c.fort ?? 0) * R.FORT_GARRISON));
// 城の守りの倍率（自動決着）。詰城のある館は上乗せ
export const castleDef = (c: Castle) => R.CASTLE_KIND[c.kind ?? 'hira'].def + (c.tsume ? R.TSUME_DEF : 0) + (c.fort ?? 0) * R.FORT_DEF;
export const clanUpkeep = (s: GameState, clan: string) => Math.round(clanTroops(s, clan) * R.FOOD_PER_SOLDIER);

export const gen = (s: GameState, id: string | null): General | null => (id ? s.generals[id] ?? null : null);

// 補佐の扱い（v1.1、v1.89で武勇を半分に）: 知略は主将と補佐の高い方、武勇は主将に補佐との差の半分を足す、統率・魅力は主将の値
export function armyStats(s: GameState, a: Army) {
  const m = s.generals[a.main];
  // 主将とすぐ下の武将のうち高い方（武勇・知略）
  const direct = (a.staff ?? (a.deputy ? [a.deputy] : [])).map((id) => gen(s, id)).filter((g): g is General => !!g && (g.boss ?? a.main) === a.main);
  return {
    bra: m.bra + Math.max(0, ...direct.map((g) => g.bra - m.bra)) * R.STAFF_BRA, // 補佐の武勇は主将との差の半分だけ（個人の腕前が軍団全体に乗りすぎないように）
    int: Math.max(m.int, ...direct.map((g) => g.int)),
    lea: m.lea,
    cha: m.cha,
  };
}
// 攻撃力・防御力・壊乱閾値（v1.3）。補佐は武勇・知略を補う
export function armyCombat(s: GameState, a: Army) {
  const st = armyStats(s, a);
  // 鉄砲を持つ兵は武将の能力によらず攻撃力が高い（自動決着）
  const g = Math.min(a.guns ?? 0, a.troops);
  const base = R.atkOf(st.bra, st.lea);
  const k = R.drillMult(drillOf(a));
  return {
    atk: (a.troops > 0 ? (base * (a.troops - g) + R.GUN_AUTO_ATK * g) / a.troops : base) * k,
    def: R.defOf(st.lea, st.int, st.cha) * k,
    rout: R.routOf(st.lea, st.cha) - R.drillRout(drillOf(a)) + (a.monto ? R.MONTO_ROUT : 0),
  };
}
export function initialMorale(s: GameState, a: Army): number {
  const m = s.generals[a.main];
  return 1 + (m.lea + m.cha) / 400 + (m.clan && s.clans[m.clan]?.leader !== m.id ? R.onMorale(m.on ?? R.ON_START) : 0) + R.fameMorale(m.fame ?? 0);
}
// 身分による兵数上限の倍率（当主が最大、一門は侍大将以上として扱う）
export function troopMult(s: GameState, g: General): number {
  if (g.clan && s.clans[g.clan]?.leader === g.id) return R.LEADER_TROOP;
  return R.RANK_TROOP[g.kin ? Math.min(g.rank, 1) : g.rank] ?? 1;
}
// 武将ひとりで率いられる兵（統率と身分）
export const personalCap = (s: GameState, g: General) => (3000 + g.lea * 100) * troopMult(s, g);
// 軍団の兵数の上限 = 主将の上限×0.6 ＋ 傘下の武将それぞれの上限×0.5
export const maxTroops = (s: GameState, a: Army) => Math.round((personalCap(s, s.generals[a.main]) * R.CORPS_MAIN_TROOP + (a.staff ?? (a.deputy ? [a.deputy] : [])).reduce((t, id) => t + (s.generals[id] ? personalCap(s, s.generals[id]) * R.CORPS_SUB_TROOP : 0), 0)) / 100) * 100;


export function addLog(s: GameState, text: string, kind: LogEntry['kind'], mine: boolean) {
  if (s.karairi?.active) text = text.replace(/(朝鮮|明)家/g, '$1'); // 国外の国は「家」と呼ばない
  s.log.push({ turn: s.turn, text, kind, mine });
  if (s.log.length > 400) s.log.splice(0, s.log.length - 400);
}

export function clanName(s: GameState, id: string | null) {
  return id ? s.clans[id]?.name ?? '?' : '国人衆';
}

export function involvesPlayer(s: GameState, ...clans: (string | null)[]) {
  return clans.includes(s.player);
}

// 和暦表示
const KANJI = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
export function kanjiNum(n: number): string {
  if (n <= 10) return n === 1 ? '元' : KANJI[n];
  if (n < 20) return '十' + KANJI[n - 10];
  const t = Math.floor(n / 10), u = n % 10;
  return KANJI[t] + '十' + (u ? KANJI[u] : '');
}
export function eraYear(year: number): string {
  const eras: [number, string][] = [[1596, '慶長'], [1592, '文禄'], [1573, '天正'], [1570, '元亀'], [1558, '永禄'], [1555, '弘治'], [1532, '天文']];
  for (const [start, name] of eras) if (year >= start) return `${name}${kanjiNum(year - start + 1)}年`;
  return `${year}年`;
}
export function dateLabel(s: GameState) {
  const mm = s.month <= 10 ? (s.month === 1 ? '正' : KANJI[s.month]) : s.month === 11 ? '十一' : '十二';
  return `${eraYear(s.year)}${mm}月`;
}
