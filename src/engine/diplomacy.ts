// 外交: 同盟・婚姻・降伏勧告
import { shisenDip } from './bakufu';
import { CHAJIN_GIFT, clanHas, GAIKO_DIP, gaikoIn } from './traits';
import { initOn } from './on';
import { graphDistances } from './map';
import { eliminateClan } from './ops';
import { addLog, allied, clanArmies, clanCastles, clanName, noteClash, pairKey, rand, treatyOf } from './state';
import { clanItems, equip, spareItem, transferItem } from './money';
import * as R from './rules';
import { presOf } from './court';
import type { GameState, Treaty } from './types';

export const DIP = {
  ALLIANCE_COST: 2000, // 金（貫）。贈り物
  MARRIAGE_COST: 5000,
  SURRENDER_COST: 1000,
  ALLIANCE_MONTHS: 24, // 同盟の期間。婚姻は期限なし
  MARRIAGE_AFTER: 6, // 婚姻は同盟を結んで6か月後から
  SURRENDER_RATIO: 3, // 降伏勧告には相手の3倍以上の国力
  NEIGHBOR_RANGE: 4, // 降伏勧告は城同士がこのヘックス以内
  COOLDOWN: 3, // 断られたら3か月は同じ相手と交渉できない
  CLASH_MONTHS: 6, // 半年以内に戦った相手は同盟に応じにくい
  BREAK_ALLIANCE: 10,
  BROKEN_MONTHS: 36, // 手切れした相手とは3年間結び直せない // 手切れによる威信低下
  BREAK_MARRIAGE: 20,
  MAX_TREATIES: 3,
  MARRIAGE_PRESTIGE: 3,
};

export type DipKind = 'alliance' | 'marriage' | 'surrender';
export const DIP_NAME: Record<DipKind, string> = { alliance: '同盟', marriage: '婚姻', surrender: '降伏勧告' };

// 国力: 軍団の兵×士気 ＋ 城兵の半分
export function clanPower(s: GameState, clan: string) {
  return clanArmies(s, clan).reduce((t, a) => t + a.troops * a.morale, 0) + clanCastles(s, clan).reduce((t, c) => t + c.garrison * 0.5, 0);
}

export function neighbors(s: GameState, clan: string, range = DIP.NEIGHBOR_RANGE): Set<string> {
  const d = graphDistances(clanCastles(s, clan).map((c) => c.hex));
  const out = new Set<string>();
  for (const c of s.castles) if (c.owner && c.owner !== clan && d[c.hex] <= range) out.add(c.owner);
  return out;
}

const cha = (s: GameState, clan: string) => { const l = s.clans[clan].leader; return l ? s.generals[l].cha : 50; };

export interface Offer { p: number; ok: boolean; reason: string; cost: number; }

// 交渉の成否見込み。from が to に申し入れる。ok=false なら申し入れ自体できない
export function evaluate(s: GameState, kind: DipKind, from: string, to: string, gift?: string | null): Offer {
  const o = evaluateBase(s, kind, from, to);
  const it = gift ? s.items?.[gift] : null;
  // 名物を添えると成功率 +格×5%
  if (o.ok && gaikoIn(s, from)) o.p = Math.min(kind === 'surrender' ? 0.85 : 0.95, o.p + GAIKO_DIP); // 外交の者がいれば
  if (o.ok && it && it.clan === from) o.p = Math.min(kind === 'surrender' ? 0.85 : 0.95, o.p + it.grade * R.ITEM_GIFT * (clanHas(s, from, 'chajin') ? CHAJIN_GIFT : 1)); // 茶人がいれば名物がよく効く
  return o;
}
function evaluateBase(s: GameState, kind: DipKind, from: string, to: string): Offer {
  const cost = kind === 'alliance' ? DIP.ALLIANCE_COST : kind === 'marriage' ? DIP.MARRIAGE_COST : DIP.SURRENDER_COST;
  const F = s.clans[from], T = s.clans[to];
  const no = (reason: string): Offer => ({ p: 0, ok: false, reason, cost });
  if (!T?.alive || from === to) return no('相手がいない');
  if (F.gold < cost) return no(`金${cost.toLocaleString()}貫が要る`);
  const tried = s.dipTried?.[`${from}|${to}`];
  if (tried !== undefined && s.turn - tried < DIP.COOLDOWN) return no(`交渉は${tried + DIP.COOLDOWN - s.turn}か月後から`);
  const tr = treatyOf(s, from, to);
  const ratio = clanPower(s, from) / Math.max(1, clanPower(s, to));
  const clash = s.lastClash?.[pairKey(from, to)];
  const recentWar = clash !== undefined && s.turn - clash < DIP.CLASH_MONTHS;
  const prestige = (presOf(s, from) - presOf(s, to)) / 200; // 官位の分も含む
  const charm = (cha(s, from) - 50) / 200;
  let p = 0;
  if (kind === 'alliance') {
    if (tr) return no(tr.kind === 'marriage' ? '婚姻で結ばれている' : `同盟中（あと${(tr.until ?? 0) - s.turn}か月）`);
    const broken = s.brokenAt?.[pairKey(from, to)];
    if (broken !== undefined && s.turn - broken < DIP.BROKEN_MONTHS) return no(`手切れから${DIP.BROKEN_MONTHS}か月は結べない（あと${broken + DIP.BROKEN_MONTHS - s.turn}か月）`);
    if (s.treaties.filter((t) => t.a === from || t.b === from).length >= DIP.MAX_TREATIES) return no(`同盟・婚姻は${DIP.MAX_TREATIES}家まで`);
    if (s.treaties.filter((t) => t.a === to || t.b === to).length >= DIP.MAX_TREATIES) return no('相手はこれ以上同盟を結べない');
    // 相手が狙っている勢力・近くの強敵と組む話は通りやすい
    const theirTarget = T.target === from;
    const threats = [...neighbors(s, to)].filter((n) => n !== from && clanPower(s, n) > clanPower(s, to));
    // 相手（AI）にとって攻める先がこちらしか残っていなければ応じにくい
    const theirEnemies = [...neighbors(s, to, 6)].filter((n) => n !== from && !allied(s, to, n));
    const lastFront = to !== s.player && !theirEnemies.length ? 0.4 : 0;
    p = 0.15 + prestige + charm + (threats.length ? 0.15 : 0) + (ratio > 1 ? 0.05 : -0.05) - (theirTarget ? 0.35 : 0) - (recentWar ? 0.3 : 0) - lastFront;
  } else if (kind === 'marriage') {
    if (!tr) return no('先に同盟を結ぶ');
    if (tr.kind === 'marriage') return no('すでに婚姻で結ばれている');
    if (s.turn - tr.start < DIP.MARRIAGE_AFTER) return no(`同盟から${DIP.MARRIAGE_AFTER}か月後から（あと${tr.start + DIP.MARRIAGE_AFTER - s.turn}か月）`);
    p = 0.45 + prestige + charm + (ratio > 1 ? 0.1 : 0);
  } else {
    if (!neighbors(s, from).has(to)) return no(`城が${DIP.NEIGHBOR_RANGE}ヘックス以内で接している相手だけ`);
    if (ratio < DIP.SURRENDER_RATIO) return no(`国力が相手の${DIP.SURRENDER_RATIO}倍以上必要（今${ratio.toFixed(1)}倍）`);
    const castles = clanCastles(s, to).length;
    p = 0.1 + (ratio - DIP.SURRENDER_RATIO) * 0.06 + prestige * 1.5 + (cha(s, from) - cha(s, to)) / 200 - (castles > 3 ? 0.1 : 0) + (tr?.kind === 'marriage' ? 0.15 : tr ? 0.05 : 0) - (recentWar ? 0 : 0.05);
  }
  if (s.clans[from].usurp || s.clans[to].usurp) p -= R.USURP_DIP; // 僭称した家とは結びにくい
  p -= shisenDip(s, from) + shisenDip(s, to); // 私戦を重ねる家とも
  return { p: Math.max(0.02, Math.min(kind === 'surrender' ? 0.8 : 0.9, p)), ok: true, reason: '', cost };
}

export function sign(s: GameState, a: string, b: string, kind: 'alliance' | 'marriage') {
  const old = treatyOf(s, a, b);
  if (old) s.treaties = s.treaties.filter((t) => t !== old);
  const t: Treaty = { a, b, kind, start: kind === 'marriage' && old ? old.start : s.turn, until: kind === 'marriage' ? null : s.turn + DIP.ALLIANCE_MONTHS };
  s.treaties.push(t);
  if (kind === 'marriage') for (const c of [a, b]) s.clans[c].prestige = Math.min(100, s.clans[c].prestige + DIP.MARRIAGE_PRESTIGE);
  if (s.clans[a].target === b) s.clans[a].target = null;
  if (s.clans[b].target === a) s.clans[b].target = null;
}

// 降伏した勢力を吸収: 城・軍団・武将・捕虜がそのまま移る
export function absorb(s: GameState, winner: string, loser: string) {
  const L = s.clans[loser];
  for (const c of s.castles) if (c.owner === loser) c.owner = winner;
  for (const a of Object.values(s.armies)) if (a.clan === loser) a.clan = winner;
  // 蔵の兵糧・金・鉄砲もそのまま移る
  const W = s.clans[winner];
  const got = { food: Math.max(0, Math.round(L.food)), gold: Math.max(0, Math.round(L.gold)), guns: Math.max(0, L.guns) };
  W.food += got.food; W.gold += got.gold; W.guns += got.guns;
  L.food = 0; L.gold = 0; L.guns = 0;
  for (const g of Object.values(s.generals)) {
    // 降った家の奉行・使番はいったん解く（こちらの枠で任じ直す）
    if (g.clan === loser && (g.status === 'bugyo' || g.status === 'tsukai')) g.status = 'free';
    if (g.clan === loser && g.status !== 'dead') { g.clan = winner; initOn(s, g, true); if (winner === s.player && !s.revealed.includes(g.id)) s.revealed.push(g.id); }
    if (g.captor === loser) g.captor = winner;
  }
  s.treaties = s.treaties.filter((t) => t.a !== loser && t.b !== loser);
  // 名物は持たせたまま移る
  for (const it of clanItems(s, loser)) { const h = it.holder; transferItem(s, it, winner); if (h) equip(s, s.generals[h], it, true); }
  addLog(s, `${L.name}家が${clanName(s, winner)}家に降った。`, 'castle', true);
  addLog(s, `${L.name}家の蔵を接収した（兵糧${got.food.toLocaleString()}石・金${got.gold.toLocaleString()}貫・鉄砲${got.guns.toLocaleString()}丁）。`, 'econ', winner === s.player);
  L.leader = null;
  eliminateClan(s, loser, winner); // 城・軍団はもう移っているので、勢力だけが消える
}

export type DipResult = 'accepted' | 'refused';

export function propose(s: GameState, kind: DipKind, from: string, to: string, gift?: string | null): DipResult | null {
  const o = evaluate(s, kind, from, to, gift);
  if (!o.ok) return null;
  s.clans[from].gold -= o.cost;
  s.dipTried[`${from}|${to}`] = s.turn;
  const mine = from === s.player || to === s.player;
  const ok = rand(s) < o.p;
  if (!ok) { addLog(s, `${clanName(s, to)}家は${clanName(s, from)}家の${DIP_NAME[kind]}を退けた。`, 'info', mine); return 'refused'; }
  // 応じれば名物は相手の家へ（降伏なら結局こちらに残る）
  const it = gift ? s.items?.[gift] : null;
  if (it && it.clan === from && kind !== 'surrender') { transferItem(s, it, to); addLog(s, `名物「${it.name}」を${clanName(s, to)}家に贈った。`, 'info', mine); }
  if (kind === 'surrender') { absorb(s, from, to); return 'accepted'; }
  sign(s, from, to, kind);
  addLog(s, kind === 'marriage' ? `${clanName(s, from)}家と${clanName(s, to)}家が婚姻を結んだ。` : `${clanName(s, from)}家と${clanName(s, to)}家が同盟を結んだ（${DIP.ALLIANCE_MONTHS}か月）。`, 'info', true);
  return 'accepted';
}

// 手切れ（同盟・婚姻の破棄）。威信を失い、諸大名は交渉に応じにくくなる
export function breakTreaty(s: GameState, by: string, other: string) {
  const t = treatyOf(s, by, other);
  if (!t) return;
  s.treaties = s.treaties.filter((x) => x !== t);
  s.brokenAt ??= {}; s.brokenAt[pairKey(by, other)] = s.turn;
  s.clans[by].prestige = Math.max(0, s.clans[by].prestige - (t.kind === 'marriage' ? DIP.BREAK_MARRIAGE : DIP.BREAK_ALLIANCE));
  noteClash(s, by, other);
  addLog(s, `${clanName(s, by)}家が${clanName(s, other)}家との${t.kind === 'marriage' ? '婚姻' : '同盟'}を破った。`, 'castle', true);
}

// 月末: 期限切れの同盟（AI同士は半分の確率で更新）
export function expireTreaties(s: GameState) {
  for (const t of [...s.treaties]) {
    if (t.until === null || t.until > s.turn) continue;
    const withPlayer = t.a === s.player || t.b === s.player;
    if (!withPlayer && rand(s) < 0.5) { t.until = s.turn + DIP.ALLIANCE_MONTHS; continue; }
    s.treaties = s.treaties.filter((x) => x !== t);
    addLog(s, `${clanName(s, t.a)}家と${clanName(s, t.b)}家の同盟が期限を迎えた。`, 'info', withPlayer);
  }
}

// プレイヤーへの申し入れを確認する口（UIが差し込む）。なければ断る
type Ask = (s: GameState, from: string, kind: DipKind) => Promise<boolean>;
let ask: Ask | null = null;
export function setProposalHook(f: Ask | null) { ask = f; }

// AIの外交（毎月、勢力ごとに一度）
export async function aiDiplomacy(s: GameState, clan: string) {
  const C = s.clans[clan];
  if (!C.alive || rand(s) > 0.25) return;
  const near = [...neighbors(s, clan, 6)].filter((n) => s.clans[n].alive);
  const myP = clanPower(s, clan);
  // 0) 攻める相手がいなくなり1年戦がなければ、最も弱い盟友と手切れ
  const enemies = near.filter((n) => !allied(s, clan, n));
  const idle = s.turn - (C.lastWar ?? 0) >= 12;
  if (!enemies.length && idle && near.length) {
    const weakest = near.sort((x, y) => clanPower(s, x) - clanPower(s, y))[0];
    if (weakest !== s.player || rand(s) < 0.5) {
      if (clanPower(s, weakest) * 1.3 < myP) { breakTreaty(s, clan, weakest); C.target = weakest; return; }
    }
  }
  // 1) 弱い隣国への降伏勧告
  const weak = near.filter((n) => n !== s.player && !allied(s, clan, n) && clanPower(s, n) * 5 <= myP && clanCastles(s, n).length <= 1);
  if (s.turn > 12 && weak.length && rand(s) < 0.3) {
    const n = weak[Math.floor(rand(s) * weak.length)];
    const o = evaluate(s, 'surrender', clan, n);
    if (o.ok && o.p >= 0.15) { propose(s, 'surrender', clan, n); return; }
  }
  // 2) 主攻勢力以外の隣国と同盟、6か月以上の同盟は婚姻へ
  for (const t of s.treaties) {
    const other = t.a === clan ? t.b : t.b === clan ? t.a : null;
    if (!other || t.kind !== 'alliance' || other === s.player) continue;
    const o = evaluate(s, 'marriage', clan, other);
    if (o.ok && o.p >= 0.4 && rand(s) < 0.1) { propose(s, 'marriage', clan, other); return; }
  }
  const cands = near.filter((n) => n !== C.target && !allied(s, clan, n) && clanPower(s, n) >= myP * 0.3);
  if (!cands.length) return;
  const n = cands.sort((x, y) => clanPower(s, y) - clanPower(s, x))[0]; // 強い隣国と組んで背後を固める
  // 見込みが薄ければ名物を添える
  let gift: string | null = null;
  let o = evaluate(s, 'alliance', clan, n);
  const sp = spareItem(s, clan);
  if (o.ok && o.p < 0.4 && sp) { const o2 = evaluate(s, 'alliance', clan, n, sp.id); if (o2.p >= 0.25) { o = o2; gift = sp.id; } }
  if (!o.ok || o.p < 0.25) return;
  if (n === s.player) {
    s.clans[clan].gold -= o.cost;
    s.dipTried[`${clan}|${n}`] = s.turn;
    const yes = ask ? await ask(s, clan, 'alliance') : false;
    if (yes) { sign(s, clan, n, 'alliance'); addLog(s, `${C.name}家と同盟を結んだ（${DIP.ALLIANCE_MONTHS}か月）。`, 'info', true); }
    else addLog(s, `${C.name}家からの同盟の申し入れを断った。`, 'info', true);
    return;
  }
  propose(s, 'alliance', clan, n, gift);
}

