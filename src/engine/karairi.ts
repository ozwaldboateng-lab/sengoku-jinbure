// 唐入り（第二段）: 渡海と海の兵站、李舜臣の遊撃
// 対馬〜釜山の渡海の路は唐入りのあいだだけ開く。海を渡れる兵と兵糧は船の数で決まり、李舜臣の水軍が突然現れて荷を沈める
import { CROSSINGS, HEXES, NEIGHBORS, PROVINCES, isForeignHex } from './map';
import * as R from './rules';
import { addLog, castleAt, clanCastles, clanTroops, mobilizeCap, occupancy, rand } from './state';
import { formArmy } from './ops';
import type { Army, GameState, General, KarairiWar } from './types';
import { envoyLine } from './lines';
import { TRAITS } from '../data/traits';
import { GAIKO_PEACE, gaikoIn } from './traits';
import { koreaWinter, wakeJoseon } from './korea';

export const K = {
  SHIP_TROOPS: 60, // 船1艘で月に渡せる兵
  SHIP_FOOD: 90, // 船1艘で月に運べる兵糧（石）
  SHIPS_PER_PORT: 8, // 港（海沿いの城）1つあたりの船（はじめ）
  NANBAN_SHIPS: 0.3, // 南蛮の大船を借りれば船が3割増し
  EXPEL_SHIPS: -0.1, // 伴天連を追放すれば南蛮の船は来ず1割減
  BUILD_COST: 1000, BUILD_SHIPS: 25, // 金1,000貫で船25艘
  ENVOY_MONTHS: 2, // 対馬から使いを送れば、返事を待って2か月
  RAID_BASE: 0.4, // 李舜臣が月に現れる見込み（勢い1、護りなし）
  RAID_SINK: [0.15, 0.4], // 現れたとき沈む荷の割合
  YI_RECOVER: 0.15, // 李舜臣の勢いの月ごとの戻り
  YI_START_MONTHS: 1, // 渡海の翌月から現れる
};
// 水軍の将: 特性「水軍」の武将（src/data/traits.ts。来島通総は名簿に加えるまで保留）
export const ADMIRALS = new Set(Object.entries(TRAITS).filter(([, t]) => t === 'suigun').map(([id]) => id));

export const karairiOn = (s: GameState): s is GameState & { karairi: KarairiWar & NonNullable<GameState['karairi']> } => !!s.karairi?.active;
export const crossingOpen = (s: GameState) => karairiOn(s) && s.turn >= s.karairi.openTurn;
// 渡海の路: 対馬のどのマスからでも、釜山鎮へ。釜山を取ったあとは、その隣の浜（空きマス）にも上がれる
const TSUSHIMA = HEXES.filter((h) => PROVINCES[h.p]?.id === 'tsushima').map((h) => h.i);
const BUSAN = CROSSINGS[0]?.[1] ?? -1;
const LANDINGS = BUSAN < 0 ? [] : NEIGHBORS[BUSAN].filter((j) => isForeignHex(j) && NEIGHBORS[j].length < 6);
const pairs = TSUSHIMA.length && BUSAN >= 0 ? TSUSHIMA.flatMap((t) => [[t, BUSAN] as const, ...LANDINGS.map((l) => [t, l] as const)]) : CROSSINGS.map(([a, b]) => [a, b] as const);
export const isLanding = (h: number) => LANDINGS.includes(h);
// 浜に上がれるのは、釜山鎮を当家が持っているときだけ
export const landBlock = (s: GameState, a: Army, to: number) => (isLanding(to) && s.castles.find((c) => c.hex === BUSAN)?.owner !== a.clan ? '釜山鎮を落とすまでは、浜に上がれない' : null);
export const isCrossing = (a: number, b: number) => pairs.some(([x, y]) => (x === a && y === b) || (x === b && y === a));

// 渡海の路を、地図の隣どうしとして開く・閉じる（唐入りのあいだだけ）
let opened = false;
export function syncCrossings(s: GameState | null) {
  const want = !!s && crossingOpen(s);
  if (want === opened) return;
  for (const [a, b] of pairs) {
    if (want) { NEIGHBORS[a].push(b); NEIGHBORS[b].push(a); }
    else { NEIGHBORS[a] = NEIGHBORS[a].filter((x) => x !== b); NEIGHBORS[b] = NEIGHBORS[b].filter((x) => x !== a); }
  }
  opened = want;
}

// 船の数から、月に渡せる兵と兵糧
export const troopCap = (s: GameState) => (karairiOn(s) ? s.karairi.fleet * K.SHIP_TROOPS : 0);
export const foodCap = (s: GameState) => (karairiOn(s) ? s.karairi.fleet * K.SHIP_FOOD : 0);
// この月に海を渡った兵（月の初めにいた側と今の側が違う軍団）
export const crossedThisMonth = (s: GameState, clan: string) => Object.values(s.armies).filter((a) => a.clan === clan && a.abroad !== undefined && a.abroad !== isForeignHex(a.hex));
export const troopsLeft = (s: GameState) => troopCap(s) - crossedThisMonth(s, s.player).reduce((t, a) => t + a.troops, 0) - (karairiOn(s) ? s.karairi.reinforced ?? 0 : 0); // 海の向こうへ送った補充の兵も船を使う
// この軍団は今月、海を渡れるか（渡れなければ理由）
export function crossBlock(s: GameState, a: Army): string | null {
  if (a.clan !== s.player) return '渡海できるのは当家だけ';
  if (!crossingOpen(s)) return '渡海の路はまだ開いていない';
  if (a.abroad !== undefined && a.abroad !== isForeignHex(a.hex)) return 'この月はもう海を渡った';
  if (a.troops > troopsLeft(s)) return `船が足りない（今月あと${Math.max(0, troopsLeft(s))}人まで）`;
  return null;
}

function portCount(s: GameState) { return clanCastles(s, s.player).filter((c) => !isForeignHex(c.hex) && NEIGHBORS[c.hex].length < 6).length; }

// 唐入りを始める（幕間の「陣触」から）
export function startKarairi(s: GameState) {
  const k = s.karairi!;
  const base = Math.round(portCount(s) * K.SHIPS_PER_PORT * (1 + (k.ships ? K.NANBAN_SHIPS : 0) + (k.expel ? K.EXPEL_SHIPS : 0)));
  Object.assign(k, { weary: 0, held: 0, lost: 0, mingLost: 0, joseonLost: 0, lord: s.clans[s.player].leader ?? undefined, active: true, startTurn: s.turn, openTurn: s.turn + (k.envoy ? K.ENVOY_MONTHS : 0), fleet: base, escort: [], yi: 1, raids: 0, raid: null } satisfies Partial<KarairiWar>);
  s.over = null;
  wakeJoseon(s);
  musterVanguard(s);
  for (const a of Object.values(s.armies)) a.abroad = isForeignHex(a.hex);
  addLog(s, `唐入りの陣触が下った。船${base}艘が揃う。${k.envoy ? `対馬の宗氏が朝鮮へ使いに立つ。返事を待って${K.ENVOY_MONTHS}か月後に渡海の路が開く。` : '対馬から釜山へ、ただちに渡海できる。'}`, 'battle', true);
  syncCrossings(s);
}

// 陣触: 一番隊〜三番隊を対馬・壱岐・肥前に集める（すでに対馬・壱岐に軍勢がいれば何もしない）
export const VANGUARD_TROOPS = 15000;
export function musterVanguard(s: GameState) {
  const P = s.player;
  const stage = [...TSUSHIMA, ...HEXES.filter((h) => PROVINCES[h.p]?.id === 'iki').map((h) => h.i)];
  if (Object.values(s.armies).some((a) => a.clan === P && stage.includes(a.hex))) return;
  const C = s.clans[P];
  const free = Object.values(s.generals).filter((g) => g.clan === P && (g.status === 'free' || g.status === 'governor') && g.id !== C.leader).sort((a, b) => (b.lea + b.bra) - (a.lea + a.bra));
  const hizen = HEXES.filter((h) => PROVINCES[h.p]?.id === 'hizen' && h.c === undefined).map((h) => h.i);
  const occ = occupancy(s);
  const spots = [...stage, ...hizen].filter((h) => !occ.has(h));
  const names: string[] = [];
  let cap = Math.max(0, mobilizeCap(s, P) - clanTroops(s, P));
  for (let k = 0; k < 3 && free[k] && spots.length && cap >= 3000; k++) {
    const g = free[k];
    const n = Math.min(VANGUARD_TROOPS, cap, Math.floor(C.food / R.RECRUIT_COST));
    if (n < 3000) break;
    const hex = spots.shift()!;
    const home = s.castles[g.loc];
    if (g.status === 'governor' && home.governor === g.id) home.governor = null;
    g.status = 'free';
    const a = formArmy(s, P, home, g.id, n, hex);
    if (!a) continue;
    a.acted = false; a.mp = R.MOVE_POINTS; a.morale = 1.25; a.departTroops = n; a.abroad = false;
    cap -= n; names.push(`${'一二三'[k]}番隊 ${g.name}`);
  }
  if (names.length) addLog(s, `陣触に応じ、${names.join('・')}が対馬・壱岐に集った。`, 'battle', true);
}

// 造船
export function buildShips(s: GameState): boolean {
  const C = s.clans[s.player];
  if (!karairiOn(s) || C.gold < K.BUILD_COST) return false;
  C.gold -= K.BUILD_COST; s.karairi.fleet += K.BUILD_SHIPS;
  return true;
}

// 水軍の将（渡海の路を守る）: 待機中の家臣。名高い水軍の将は二倍に働く
export const escortPower = (s: GameState) => karairiOn(s) ? s.karairi.escort.map((id) => s.generals[id]).filter((g): g is General => !!g && g.status === 'free' && g.clan === s.player).reduce((t, g) => t + (g.lea + g.int) / 2 * (ADMIRALS.has(g.id) ? 2 : 1), 0) : 0;
export const escortCut = (s: GameState) => Math.min(0.75, escortPower(s) / 400); // 護りで減る襲撃の見込み
export function setEscort(s: GameState, ids: string[]) { if (karairiOn(s)) s.karairi.escort = ids.slice(0, 3); }

// 月の終わり（兵站の前）: 李舜臣の遊撃。海を渡った兵と、渡す兵糧の一部が沈む
// ───────── 海戦（第四段）: 李舜臣が現れたとき、水軍の将の応じ方を選ぶ ─────────
export type NavalChoice = 'fight' | 'convoy' | 'port';
export const YI_FATE = 0.25, YI_DEAD_SHARE = 0.6; // 海戦に勝ったとき李舜臣を討つか捕らえる見込みと、そのうち討死の割合
export interface NavalInfo { base: number; winP: number; leader: General | null; escorts: General[]; shipped: number; abroad: number; yi: number }
type NavalAsk = (s: GameState, info: NavalInfo) => Promise<NavalChoice>;
let navalHook: NavalAsk | null = null;
export function setNavalHook(f: NavalAsk | null) { navalHook = f; }
export const escortGenerals = (s: GameState) => karairiOn(s) ? s.karairi.escort.map((id) => s.generals[id]).filter((g): g is General => !!g && g.status === 'free' && g.clan === s.player) : [];
// 挑んで勝つ見込み: 水軍の将の腕と船の数に対し、李舜臣の勢い
export function navalWinP(s: GameState) {
  if (!karairiOn(s)) return 0;
  const es = escortGenerals(s);
  if (!es.length) return 0;
  const lead = es.reduce((b, g) => ((g.lea + g.int) * (ADMIRALS.has(g.id) ? 1.25 : 1) > (b.lea + b.int) * (ADMIRALS.has(b.id) ? 1.25 : 1) ? g : b));
  const skill = ((lead.lea + lead.int) / 2) * (ADMIRALS.has(lead.id) ? 1.25 : 1);
  return Math.max(0.05, Math.min(0.85, 0.1 + (skill - 60) / 80 + escortPower(s) / 1200 + Math.min(0.1, s.karairi.fleet / 8000) - s.karairi.yi * 0.25));
}
const aiNaval = (s: GameState, info: NavalInfo): NavalChoice => (info.leader && info.winP >= 0.5 ? 'fight' : info.abroad > 0 ? 'convoy' : 'port');

// 月の終わり（兵站の前）: 李舜臣の遊撃。現れれば海戦の応じ方を選ぶ
export async function karairiMonth(s: GameState) {
  if (!karairiOn(s)) return;
  const k = s.karairi;
  k.raid = null;
  k.foodLeft = foodCap(s);
  if (s.turn === k.openTurn - 1 && k.envoy) { addLog(s, '朝鮮は「道を仮す」ことを拒んだ。宗氏の使いは空しく対馬へ戻る。来月、渡海の路が開く。', 'battle', true); (s.scenes ??= []).push(envoyLine(s, 'soRefused', { id: 'so_yoshitoshi', name: '宗義智' })); }
  const abroadN = Object.values(s.armies).filter((a) => a.clan === s.player && isForeignHex(a.hex)).length;
  const shipped = crossedThisMonth(s, s.player);
  if (crossingOpen(s) && (abroadN || shipped.length) && s.turn >= k.openTurn + K.YI_START_MONTHS) {
    const p = K.RAID_BASE * k.yi * (1 - escortCut(s) * 0.6);
    if (rand(s) < p) await navalBattle(s, shipped, abroadN);
  }
  if (!k.yiFate) k.yi = Math.min(1, k.yi + K.YI_RECOVER);
  koreaWinter(s);
  wearyMonth(s);
}

async function navalBattle(s: GameState, shipped: Army[], abroadN: number) {
  if (!karairiOn(s)) return;
  const k = s.karairi;
  const base = K.RAID_SINK[0] + rand(s) * (K.RAID_SINK[1] - K.RAID_SINK[0]);
  const es = escortGenerals(s);
  const winP = navalWinP(s);
  const leader = es.length ? es.reduce((b, g) => ((g.lea + g.int) * (ADMIRALS.has(g.id) ? 1.25 : 1) > (b.lea + b.int) * (ADMIRALS.has(b.id) ? 1.25 : 1) ? g : b)) : null;
  const info: NavalInfo = { base, winP, leader, escorts: es, shipped: shipped.reduce((t, a) => t + a.troops, 0), abroad: abroadN, yi: k.yi };
  let choice = navalHook && s.player ? await navalHook(s, info) : aiNaval(s, info);
  if (choice === 'fight' && !leader) choice = 'convoy';
  let cut = 0, troopCut = 0, lostShips = 0, won = false;
  if (choice === 'fight') {
    won = rand(s) < winP;
    if (won) {
      cut = base * 0.25; troopCut = cut * 0.5; k.yi = Math.max(0.1, k.yi - 0.7); for (const g of es) g.merit += 40;
      // 勝てば一定の割合で、李舜臣を討ち取るか捕らえる。以後、朝鮮水軍の遊撃は来ない
      if (rand(s) < YI_FATE) { k.yiFate = rand(s) < YI_DEAD_SHARE ? 'dead' : 'captured'; k.yi = 0; if (leader) leader.merit += 100; }
    }
    else { cut = Math.min(0.6, base * 1.5); troopCut = cut * 0.7; lostShips = Math.round(k.fleet * (0.08 + rand(s) * 0.07)); k.fleet -= lostShips; }
  } else if (choice === 'convoy') {
    cut = base * (0.6 - escortCut(s) * 0.4); troopCut = cut * 0.5;
  } else {
    // 湊に籠もる: この月は船を出さない（海の向こうへ兵糧が届かない）
    k.foodLeft = 0;
  }
  let lost = 0;
  if (troopCut) for (const a of shipped) if (isForeignHex(a.hex)) { const d = Math.round(a.troops * troopCut); a.troops -= d; lost += d; a.morale = Math.max(0.2, a.morale - 0.1); }
  k.raids++;
  k.raid = { turn: s.turn, zone: '朝鮮海峡', sunk: 0, troops: lost, repelled: won, cut, choice, lostShips, leader: leader?.id };
  const ln = leader?.name ?? '';
  const text = choice === 'fight'
    ? (won ? `李舜臣の水軍が島陰から現れた。${ln}は打って出てこれを退けた。李舜臣の勢いは大きく衰えた（運ぶ兵糧の${Math.round(cut * 100)}%を失う）。` : `李舜臣の水軍が島陰から現れた。${ln}は打って出たが敗れ、船${lostShips}艘を失った。運ぶ兵糧の${Math.round(cut * 100)}%${lost ? `と兵${lost.toLocaleString()}人` : ''}が海に沈んだ。`)
    : choice === 'convoy' ? `李舜臣の水軍が島陰から現れた。荷を守って海峡を抜けたが、運ぶ兵糧の${Math.round(cut * 100)}%${lost ? `と兵${lost.toLocaleString()}人` : ''}が沈んだ。`
    : '李舜臣の水軍が島陰に潜む。船を湊に籠もらせ、この月は海の向こうへ兵糧を送らなかった。';
  addLog(s, text, 'battle', true);
  if (k.yiFate) { addLog(s, k.yiFate === 'dead' ? `乱戦のさなか、李舜臣が鉄砲に撃たれて倒れた。${ln}の手の者が、その首を挙げた。朝鮮水軍は将を失い、もう海峡に現れることはない。` : `${ln}の船が李舜臣の船に乗り移り、李舜臣を捕らえた。朝鮮水軍は将を失い、もう海峡に現れることはない。`, 'battle', true); return; }
  (s.scenes ??= []).push(envoyLine(s, choice === 'fight' && won ? 'yiRepelled' : choice === 'port' ? 'yiWait' : 'yiRaid', { id: 'yi_sunsin', name: '李舜臣' }));
}

// 月の初め: どちらの側にいるかを記す（この月に海を渡ったかを見分ける）
export function karairiMonthStart(s: GameState) {
  if (!karairiOn(s)) return;
  for (const a of Object.values(s.armies)) a.abroad = isForeignHex(a.hex);
  s.karairi.reinforced = 0;
  syncCrossings(s);
}
// 渡海の路の端（対馬・釜山）
export const crossingEnds = () => pairs.flatMap(([a, b]) => [a, b]);
export const crossingCastle = (s: GameState) => castleAt(s, pairs[0]?.[1] ?? -1);
void HEXES; void R;

// ───────── 厭戦と結末（第五段） ─────────
export const W = {
  BASE: 1.2, NO_ENVOY: 0.8, CAUSE: { onsho: -0.2, saki: 0, kango: 0.4, ikou: 0.6 } as Record<string, number>,
  PER_LOSS: 1500, RAID: 1, WINTER: 1.5, CASTLE: -2.5,
  UNREST: 40, CHIAN_DIV: 15, ON_DIV: 25, // 40を超えると、国内の治安と家臣の恩が月ごとに下がる
};
export const isAbroadReport = (s: GameState, hex: number) => isForeignHex(hex);
export function wearyMonth(s: GameState) {
  if (!karairiOn(s) || s.karairi.end) return;
  const k = s.karairi;
  // 海の向こうの合戦の損害（今月の報告から）
  let ours = 0;
  for (const r of s.reports ?? []) {
    if (!isForeignHex(r.hex)) continue;
    const aLoss = Math.max(0, r.aStart - r.aEnd), dLoss = Math.max(0, r.dStart - r.dEnd);
    const side = (c: string | null, loss: number) => { if (c === s.player) ours += loss; else if (c === 'ming') k.mingLost = (k.mingLost ?? 0) + loss; else if (c === 'joseon') k.joseonLost = (k.joseonLost ?? 0) + loss; };
    side(r.attackerClan, aLoss); side(r.defenderClan, dLoss);
  }
  ours += k.raid && k.raid.turn === s.turn ? k.raid.troops : 0;
  k.lost = (k.lost ?? 0) + ours;
  const held = s.castles.filter((c) => isForeignHex(c.hex) && c.owner === s.player).length;
  const gained = Math.max(0, held - (k.held ?? 0));
  k.held = held;
  const abroad = Object.values(s.armies).some((a) => a.clan === s.player && isForeignHex(a.hex));
  const winter = abroad && [11, 12, 1, 2].includes(s.month);
  let d = W.BASE + (k.envoy ? 0 : W.NO_ENVOY) + (W.CAUSE[k.cause ?? ''] ?? 0) + ours / W.PER_LOSS + (k.raid && k.raid.turn === s.turn && !k.raid.repelled ? W.RAID : 0) + (winter ? W.WINTER : 0) + gained * W.CASTLE;
  if (!abroad && !held) d = Math.min(d, 0.5); // まだ渡っていなければ、ゆっくり
  k.weary = Math.max(0, Math.min(100, (k.weary ?? 0) + d));
  if (k.weary > W.UNREST) {
    const over = k.weary - W.UNREST;
    for (const c of clanCastles(s, s.player)) if (!isForeignHex(c.hex)) c.chian = Math.max(0, c.chian - Math.round(over / W.CHIAN_DIV));
    for (const g of Object.values(s.generals)) if (g.clan === s.player && g.status !== 'young' && g.status !== 'dead' && g.id !== s.clans[s.player].leader) g.on = Math.max(0, (g.on ?? R.ON_START) - over / W.ON_DIV);
    if (k.weary >= 80 && rand(s) < 0.5) addLog(s, '長い戦に、国の内は疲れ果てている。百姓は逃げ、家臣は陰で唐入りを恨む。', 'info', true);
  }
  // 結末
  const lord = k.lord ? s.generals[k.lord] : null;
  if (lord && lord.status === 'dead') { endKarairi(s, 'withdraw', 'lordDied'); return; }
  if (k.weary >= 100) { endKarairi(s, 'collapse'); return; }
  const jl = s.castles.find((c) => c.id === 'jiuliancheng');
  if (jl && jl.owner === s.player) { endKarairi(s, 'daimin'); return; }
}
export function endKarairi(s: GameState, end: NonNullable<KarairiWar['end']>, why?: string) {
  const k = s.karairi!;
  k.end = end; k.endWhy = why;
  s.over = end === 'collapse' ? 'lose' : 'win';
  syncCrossings(null);
}
// 和議: 明が来てから。沈惟敬が仲立ちする。今の占領地を保てるかは、持つ城の数と明の損害しだい
export const PEACE_WAIT = 3;
export function peaceBlock(s: GameState): string | null {
  if (!karairiOn(s)) return '唐入りの最中だけ';
  if (!s.clans.ming?.alive) return '明が出てきてから（沈惟敬が仲立ちする）';
  if (s.karairi.peaceTurn !== undefined && s.turn - s.karairi.peaceTurn < PEACE_WAIT) return `和議は${PEACE_WAIT - (s.turn - s.karairi.peaceTurn)}か月後にまた探れる`;
  return null;
}
export function peaceChance(s: GameState) {
  if (!karairiOn(s)) return 0;
  const all = s.castles.filter((c) => isForeignHex(c.hex) && c.id !== 'jiuliancheng').length;
  const held = s.castles.filter((c) => isForeignHex(c.hex) && c.owner === s.player).length;
  return Math.max(0.05, Math.min(0.85, 0.1 + (held / Math.max(1, all)) * 0.6 + Math.min(0.3, (s.karairi.mingLost ?? 0) / 60000) - (s.karairi.weary ?? 0) / 400 + (gaikoIn(s, s.player) ? GAIKO_PEACE : 0)));
}
export function seekPeace(s: GameState): boolean {
  if (peaceBlock(s)) return false;
  const k = s.karairi!;
  k.peaceTurn = s.turn;
  if (rand(s) < peaceChance(s)) { endKarairi(s, 'wagi'); return true; }
  k.weary = Math.min(100, (k.weary ?? 0) + 8);
  addLog(s, '沈惟敬を通じた和議は、条件が折り合わず流れた。国の内には失望が広がる。', 'battle', true);
  return false;
}
export function withdraw(s: GameState) { if (karairiOn(s)) endKarairi(s, 'withdraw'); }
