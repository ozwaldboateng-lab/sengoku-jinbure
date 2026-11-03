// 将軍と大義名分: 武士の名分は将軍（幕府）から発する。御内書・幕府の職・守護職と、旧領・仇討ち・反撃・救援などの自前の名分。
// 名分のない戦（私戦）は禁じないが、家臣・民・諸家に支持されず高くつく。
import { OFFICE_START, OFFICES, SHOBAN_START, SHOGUN_CANDIDATES, SHUGO_START, TRUST_START, type OfficeId } from '../data/bakufu';
import { holderOf } from './court';
import { HEXES, PROVINCES } from './map';
import { onOf } from './on';
import * as R from './rules';
import { addLog, castleAt, clanCastles, clanKoku, clanName, hostile, rand } from './state';
import type { Army, Castle, GameState, General } from './types';

export interface Order { by: string; target: string; to: string[] | 'all'; until: number }
export interface Bakufu {
  offices: Partial<Record<OfficeId, string | null>>;
  shugo: Record<string, string | null>; // 国名 → 家
  shoban: string[]; // 御相伴衆の家
  trust: Record<string, number>; // 幕府の信任
  orders: Order[]; // 御内書（討伐の命）
  sponsor: string | null; // 将軍を擁立した家
  aggr: Record<string, number>; // "攻めた家|攻められた家" → ターン
  foes: Record<string, number>; // "仇を持つ家|討った家" → ターン（当主・一門を討たれた）
  shussi: Record<string, string>; // 出仕した家 → 従う職の家
  privateWar: Record<string, number>; // 私戦をした家 → 最後のターン
  kantoGiven?: boolean; // 関東管領の譲渡（1561年）を済ませた
}
export const bk = (s: GameState): Bakufu => (s.bakufu ??= { offices: {}, shugo: {}, shoban: [], trust: {}, orders: [], sponsor: null, aggr: {}, foes: {}, shussi: {}, privateWar: {} });
export const trustOf = (s: GameState, clan: string) => bk(s).trust[clan] ?? R.TRUST_DEFAULT;
const bumpTrust = (s: GameState, clan: string, v: number) => { bk(s).trust[clan] = Math.max(0, Math.min(100, trustOf(s, clan) + v)); };
export const shogunClan = (s: GameState) => holderOf(s, R.SHOGUN)?.id ?? null;
export const officeName = (id: OfficeId) => OFFICES.find((o) => o.id === id)!.name;
export const provName = (hex: number) => PROVINCES[HEXES[hex].p].name;
const inArea = (area: string[], prov: string) => area.some((a) => prov === a || prov.startsWith(a + '・'));
const capitalHex = (s: GameState, clan: string) => { const L = s.clans[clan]?.leader; const own = clanCastles(s, clan); const c = own.find((x) => L && s.generals[L]?.loc === x.i) ?? own[0]; return c?.hex; };

// ───────── 開始 ─────────
export function initBakufu(s: GameState) {
  const sc = s.scenario ?? '1560';
  const B = bk(s);
  const alive = (id: string | undefined) => (id && s.clans[id]?.alive ? id : null);
  for (const o of OFFICES) B.offices[o.id] = alive(OFFICE_START[sc]?.[o.id]);
  for (const [p, c] of Object.entries(SHUGO_START[sc] ?? {})) B.shugo[p] = alive(c);
  B.shoban = (SHOBAN_START[sc] ?? []).filter((c) => s.clans[c]?.alive);
  B.trust = { ...(TRUST_START[sc] ?? {}) };
}
export function migrateBakufu(s: GameState) { if (!s.bakufu) initBakufu(s); }

// ───────── 名分 ─────────
export interface Meibun { ok: boolean; reasons: string[] }
// att が def（の hex にある城・部隊）を攻める名分。def が国人（null）なら問わない
export function meibun(s: GameState, att: string, def: string | null, hex?: number): Meibun {
  if (!def) return { ok: true, reasons: ['国人衆'] };
  // 唐入り: 朝鮮・明との戦は唐入りの陣触による（私戦ではない）。朝鮮・明の側からは国を守る戦
  if (s.karairi?.active && (s.clans[def]?.foreign || s.clans[att]?.foreign)) return { ok: true, reasons: [s.clans[att]?.foreign ? '国を守る戦' : '唐入りの陣触'] };
  const B = bk(s), r: string[] = [];
  const prov = hex !== undefined ? provName(hex) : capitalHex(s, def) !== undefined ? provName(capitalHex(s, def)!) : '';
  const recent = (k: string, n: number) => B.aggr[k] !== undefined && s.turn - B.aggr[k] <= n;
  const sh = shogunClan(s);
  if (att === sh) r.push('将軍家の討伐');
  for (const o of B.orders) if (o.target === def && o.until >= s.turn && (o.to === 'all' || o.to.includes(att))) { r.push('将軍の御内書'); break; }
  if (!s.clans[def]) return { ok: true, reasons: [] };
  if (s.clans[def].usurp) r.push('僭称の家');
  if (sh && def !== sh && recent(`${def}|${sh}`, R.REBEL_MONTHS)) r.push('将軍に弓を引いた家');
  for (const o of OFFICES) if (B.offices[o.id] === att && prov && inArea(o.area, prov) && B.shussi[def] !== att) { r.push(`${o.name}の管内`); break; }
  if (prov && B.shugo[prov] === att) r.push(`${prov}守護`);
  const c = hex !== undefined ? castleAt(s, hex) : null;
  if (c && c.prevOwner === att && c.prevTurn !== undefined && s.turn - c.prevTurn <= R.KYURYO_MONTHS) r.push('旧領の回復');
  if (B.foes[`${att}|${def}`] !== undefined && s.turn - B.foes[`${att}|${def}`] <= R.ADAUCHI_MONTHS) r.push('仇討ち');
  if (recent(`${def}|${att}`, R.HANGEKI_MONTHS)) r.push('反撃');
  for (const t of s.treaties ?? []) {
    const ally = t.a === att ? t.b : t.b === att ? t.a : null;
    if (ally && recent(`${def}|${ally}`, R.KYUEN_MONTHS)) { r.push(`${clanName(s, ally)}家の救援`); break; }
  }
  if (s.clans[def].splitFrom === att) r.push('逆臣の討伐');
  return { ok: r.length > 0, reasons: r };
}
export const meibunLabel = (m: Meibun) => (m.ok ? `名分: ${m.reasons.join('・')}` : '名分なし（私戦）');

// 出陣のとき（orders.resolveOrders から）: 攻めた記録、私戦の咎、将軍の味方を攻めた咎
export function onAttack(s: GameState, att: string, def: string | null, hex: number, armies: Army[]) {
  if (!def || att === def) return;
  const B = bk(s);
  const m = meibun(s, att, def, hex);
  B.aggr[`${att}|${def}`] = s.turn;
  const sh = shogunClan(s);
  if (def === sh || (sh && (s.treaties ?? []).some((t) => (t.a === sh && t.b === def) || (t.b === sh && t.a === def)))) bumpTrust(s, att, -R.TRUST_ATTACK_SHOGUN);
  if (m.reasons.includes('将軍の御内書')) bumpTrust(s, att, R.TRUST_ORDER_DONE);
  if (m.ok) return;
  // 私戦: 加わった武将の恩、家の城の治安、威信（同じ月に何度攻めても一度だけ重く）
  const first = B.privateWar[att] !== s.turn;
  B.privateWar[att] = s.turn;
  for (const a of armies) for (const id of [a.main, ...(a.staff ?? [])]) { const g = s.generals[id]; if (g && s.clans[att].leader !== g.id) g.on = Math.max(0, onOf(g) - R.SHISEN_ON); }
  if (first) {
    for (const c of clanCastles(s, att)) c.chian = Math.max(0, c.chian - R.SHISEN_CHIAN);
    s.clans[att].prestige = Math.max(0, s.clans[att].prestige - R.SHISEN_PRESTIGE);
    if (att === s.player) addLog(s, `名分のない戦（${clanName(s, def)}家攻め）に家中と民が眉をひそめている（加わった武将の恩−${R.SHISEN_ON}、全城の治安−${R.SHISEN_CHIAN}、威信−${R.SHISEN_PRESTIGE}）。`, 'info', true);
  }
}
// 城が落ちたとき: 旧主を記録（旧領の回復の名分）。私戦で落とした城は残り火が多い
export function onCastleTaken(s: GameState, c: Castle, old: string | null, by: string) {
  if (old) { c.prevOwner = old; c.prevTurn = s.turn; }
  if (old && bk(s).privateWar[by] === s.turn) c.ember = Math.min(R.EMBER_MAX, (c.ember ?? 0) + R.SHISEN_EMBER);
  else if (old) c.ember = Math.max(0, (c.ember ?? 0) - R.MEIBUN_EMBER);
}
// 合戦の後: 当主・一門を討たれた家は、討った家に仇を持つ
export function noteFoes(s: GameState, sides: [string | null, string | null], ids: [string[], string[]]) {
  for (const k of [0, 1] as const) {
    const me = sides[k], foe = sides[1 - k];
    if (!me || !foe) continue;
    if (ids[k].some((id) => { const g = s.generals[id]; return g?.status === 'dead' && (!!g.kin || g.rank === 0); })) bk(s).foes[`${me}|${foe}`] = s.turn; // 一門・宿老・当主を討たれた
  }
}
// 私戦を重ねる家とは結びにくい（diplomacy から）
export const shisenDip = (s: GameState, clan: string) => (bk(s).privateWar[clan] !== undefined && s.turn - bk(s).privateWar[clan] <= R.SHISEN_DIP_MONTHS ? R.SHISEN_DIP : 0);

// ───────── 幕府への願い出（プレイヤー・AI） ─────────
export function donate(s: GameState, clan: string): boolean {
  const C = s.clans[clan];
  if (!shogunClan(s) || shogunClan(s) === clan || C.gold < R.DONATE_GOLD) return false;
  C.gold -= R.DONATE_GOLD; bumpTrust(s, clan, R.DONATE_TRUST);
  const sh = shogunClan(s)!; s.clans[sh].gold += R.DONATE_GOLD;
  return true;
}
export function orderBlock(s: GameState, clan: string, target: string): string | null {
  const sh = shogunClan(s);
  if (!sh) return '将軍がいない（空位）';
  if (sh === clan) return null;
  if (target === sh) return '将軍家の討伐は願えない';
  if (trustOf(s, clan) < R.ORDER_TRUST) return `幕府の信任${R.ORDER_TRUST}から`;
  if (s.clans[clan].gold < R.ORDER_GOLD) return `金${R.ORDER_GOLD.toLocaleString()}貫が要る`;
  if (bk(s).orders.some((o) => o.target === target && o.until >= s.turn && (o.to === 'all' || o.to.includes(clan)))) return 'すでに御内書を受けている';
  return null;
}
export const orderChance = (s: GameState, clan: string, target: string) => Math.max(0.05, Math.min(0.95, trustOf(s, clan) / 100 - trustOf(s, target) / 200 + (bk(s).shoban.includes(clan) ? 0.1 : 0)));
// 御内書を願う（将軍の家なら自ら出す）
export function requestOrder(s: GameState, clan: string, target: string): boolean | null {
  if (orderBlock(s, clan, target)) return null;
  const sh = shogunClan(s)!;
  if (sh !== clan) { s.clans[clan].gold -= R.ORDER_GOLD; s.clans[sh].gold += R.ORDER_GOLD; }
  const ok = sh === clan || rand(s) < orderChance(s, clan, target);
  if (ok) {
    bk(s).orders.push({ by: sh, target, to: sh === clan ? 'all' : [clan], until: s.turn + R.ORDER_MONTHS });
    if (sh !== clan) bumpTrust(s, clan, -R.ORDER_TRUST_COST);
    addLog(s, `将軍が${clanName(s, clan)}家に${clanName(s, target)}家討伐の御内書を下した。`, 'info', clan === s.player || target === s.player);
  } else if (clan === s.player) addLog(s, `将軍は${clanName(s, target)}家討伐の御内書を下さなかった。`, 'info', true);
  return ok;
}
export type Post = { kind: 'office'; id: OfficeId } | { kind: 'shugo'; prov: string } | { kind: 'shoban' };
export const postName = (p: Post) => (p.kind === 'office' ? officeName(p.id) : p.kind === 'shugo' ? `${p.prov}守護` : '御相伴衆');
export const postCost = (p: Post) => (p.kind === 'office' ? OFFICES.find((o) => o.id === p.id)!.cost : p.kind === 'shugo' ? R.SHUGO_GOLD : R.SHOBAN_GOLD);
export function postHolder(s: GameState, p: Post): string | null {
  const B = bk(s);
  return p.kind === 'office' ? B.offices[p.id] ?? null : p.kind === 'shugo' ? B.shugo[p.prov] ?? null : null;
}
export function postBlock(s: GameState, clan: string, p: Post): string | null {
  const sh = shogunClan(s);
  if (!sh) return '将軍がいない（空位）';
  const B = bk(s);
  if (p.kind === 'shoban' && B.shoban.includes(clan)) return 'すでに列している';
  if (p.kind !== 'shoban' && postHolder(s, p) === clan) return 'すでに就いている';
  if (sh !== clan && trustOf(s, clan) < R.POST_TRUST) return `幕府の信任${R.POST_TRUST}から`;
  if (sh !== clan && s.clans[clan].gold < postCost(p)) return `金${postCost(p).toLocaleString()}貫が要る`;
  if (p.kind === 'shugo' && !clanCastles(s, clan).some((c) => provName(c.hex) === p.prov)) return 'その国に城がない';
  if (p.kind === 'office') { const o = OFFICES.find((x) => x.id === p.id)!; if (!clanCastles(s, clan).some((c) => inArea(o.area, provName(c.hex)))) return '管内に城がない'; }
  return null;
}
export const postChance = (s: GameState, clan: string, p: Post) => {
  if (shogunClan(s) === clan) return 1;
  const h = postHolder(s, p);
  return Math.max(0.05, Math.min(0.95, (trustOf(s, clan) - 40) / 60 - (h ? (trustOf(s, h) - 40) / 120 : 0)));
};
export function requestPost(s: GameState, clan: string, p: Post): boolean | null {
  if (postBlock(s, clan, p)) return null;
  const sh = shogunClan(s)!, B = bk(s);
  if (sh !== clan) { s.clans[clan].gold -= postCost(p); s.clans[sh].gold += postCost(p); }
  if (rand(s) >= postChance(s, clan, p)) { if (clan === s.player) addLog(s, `将軍は${postName(p)}の任官を退けた。`, 'info', true); return false; }
  const old = postHolder(s, p);
  if (p.kind === 'office') B.offices[p.id] = clan; else if (p.kind === 'shugo') B.shugo[p.prov] = clan; else B.shoban.push(clan);
  if (old && old !== clan) bumpTrust(s, old, -10);
  addLog(s, `${clanName(s, clan)}家が${postName(p)}に任じられた${old && old !== clan ? `（${clanName(s, old)}家に代わり）` : ''}。`, 'info', clan === s.player || old === s.player);
  return true;
}
// 出仕: 職の管内の家が職の持ち主に従う（同盟を結び、持ち主の名分から外れる）
export function shussiBlock(s: GameState, clan: string, holder: string): string | null {
  if (clan === holder) return '自家';
  if (bk(s).shussi[clan] === holder) return 'すでに出仕している';
  return null;
}
export function doShussi(s: GameState, clan: string, holder: string) {
  bk(s).shussi[clan] = holder;
  s.treaties = (s.treaties ?? []).filter((t) => !((t.a === clan && t.b === holder) || (t.b === clan && t.a === holder)));
  s.treaties.push({ a: clan, b: holder, kind: 'alliance', start: s.turn, until: s.turn + R.SHUSSI_MONTHS });
  s.clans[holder].prestige = Math.min(100, s.clans[holder].prestige + 2);
  addLog(s, `${clanName(s, clan)}家が${clanName(s, holder)}家に出仕した。`, 'info', clan === s.player || holder === s.player);
}
// 職の持ち主が管内の家に出仕を求める: 弱い家ほど応じる
export function demandShussi(s: GameState, holder: string, clan: string): boolean {
  const p = Math.max(0.05, Math.min(0.8, 0.6 - clanKoku(s, clan) / Math.max(1, clanKoku(s, holder)) * 0.5 + (trustOf(s, holder) - trustOf(s, clan)) / 200));
  const ok = rand(s) < p;
  if (ok) doShussi(s, clan, holder);
  else addLog(s, `${clanName(s, clan)}家は${clanName(s, holder)}家への出仕を拒んだ。`, 'info', holder === s.player || clan === s.player);
  return ok;
}
// 職の管内にある家（出仕を求められる相手）
export function inJurisdiction(s: GameState, holder: string) {
  const B = bk(s);
  const areas = OFFICES.filter((o) => B.offices[o.id] === holder).flatMap((o) => o.area);
  return Object.values(s.clans).filter((C) => C.alive && C.id !== holder && capitalHex(s, C.id) !== undefined && inArea(areas, provName(capitalHex(s, C.id)!)));
}

// ───────── 擁立 ─────────
export const candidates = (s: GameState) => SHOGUN_CANDIDATES.map((id) => s.generals[id]).filter((g): g is General => !!g && g.status !== 'dead' && g.status !== 'young');
export function sponsorBlock(s: GameState, clan: string): string | null {
  if (shogunClan(s)) return '将軍がいる';
  if (!s.castles.some((c) => c.id === R.SHOGUN_CASTLE && c.owner === clan)) return '京（二条御所）を押さえる必要がある';
  const cand = candidates(s).find((g) => g.clan === clan || g.captor === clan || g.status === 'ronin');
  if (!cand) return '迎えられる足利一門がいない（在野・自家・自家の捕虜）';
  if (s.clans[clan].gold < R.SPONSOR_GOLD) return `金${R.SPONSOR_GOLD.toLocaleString()}貫が要る`;
  return null;
}
// 足利一門を将軍に立てる: 足利家を京で再興させ、擁立した家と同盟
export function sponsor(s: GameState, clan: string): boolean {
  if (sponsorBlock(s, clan)) return false;
  const g = candidates(s).find((x) => x.clan === clan || x.captor === clan || x.status === 'ronin')!;
  const A = s.clans.ashikaga;
  s.clans[clan].gold -= R.SPONSOR_GOLD;
  const kyo = s.castles.find((c) => c.id === R.SHOGUN_CASTLE)!;
  if (kyo.governor) { s.generals[kyo.governor].status = 'free'; kyo.governor = null; }
  kyo.owner = 'ashikaga';
  A.alive = true; A.leader = g.id; A.court = R.SHOGUN; A.gold = 3000; A.food = 20000; A.prestige = Math.max(A.prestige, 60);
  g.clan = 'ashikaga'; g.status = 'governor'; g.captor = null; g.formerClan = null; g.loc = kyo.i; kyo.governor = g.id; g.kin = true;
  if (clan === s.player) (s.events ??= []).push({ kind: 'sponsor', gen: g.id });
  for (const C of Object.values(s.clans)) if (C.id !== 'ashikaga' && (C.court ?? 0) >= R.SHOGUN) C.court = R.DEPOSED_COURT;
  s.treaties = (s.treaties ?? []).filter((t) => !((t.a === clan && t.b === 'ashikaga') || (t.b === clan && t.a === 'ashikaga')));
  s.treaties.push({ a: clan, b: 'ashikaga', kind: 'alliance', start: s.turn, until: null });
  const B = bk(s); B.sponsor = clan; B.trust[clan] = Math.max(trustOf(s, clan), 85); B.trust.ashikaga = 100;
  addLog(s, `${clanName(s, clan)}家が${g.name}を征夷大将軍に立てた。足利将軍家が京に返り咲いた。`, 'castle', true);
  return true;
}

// ───────── 毎月 ─────────
export function monthlyBakufu(s: GameState) {
  const B = bk(s);
  B.orders = B.orders.filter((o) => o.until >= s.turn && s.clans[o.target]?.alive);
  for (const k of Object.keys(B.offices) as OfficeId[]) if (B.offices[k] && !s.clans[B.offices[k]!]?.alive) B.offices[k] = null;
  for (const p of Object.keys(B.shugo)) if (B.shugo[p] && !s.clans[B.shugo[p]!]?.alive) B.shugo[p] = null;
  B.shoban = B.shoban.filter((c) => s.clans[c]?.alive);
  for (const [c, h] of Object.entries(B.shussi)) if (!s.clans[c]?.alive || !s.clans[h]?.alive || !(s.treaties ?? []).some((t) => (t.a === c && t.b === h) || (t.b === c && t.a === h))) delete B.shussi[c];
  if (B.sponsor && !s.clans[B.sponsor]?.alive) B.sponsor = null;
  const sh = shogunClan(s);
  // 関東管領の譲渡（1561年）と、長尾家が上杉の名跡を継ぐ
  if (!B.kantoGiven && s.year >= 1561 && s.month >= 3 && s.clans.uesugi?.alive && B.offices.kanto === 'uesugi') {
    B.kantoGiven = true;
    if (s.clans.uesugi.name === '長尾') s.clans.uesugi.name = '上杉';
    addLog(s, '上杉憲政が山内上杉家の名跡と関東管領職を長尾景虎に譲った。長尾家は上杉家となった。', 'castle', true);
  }
  for (const C of Object.values(s.clans)) {
    if (!C.alive) continue;
    // 信任: 将軍と結ぶ家は少しずつ上がり、ほかは40へ戻る
    const allied = sh && (s.treaties ?? []).some((t) => (t.a === sh && t.b === C.id) || (t.b === sh && t.a === C.id));
    if (C.usurp) B.trust[C.id] = 0;
    else bumpTrust(s, C.id, allied ? R.TRUST_ALLY : (R.TRUST_DEFAULT + 10 - trustOf(s, C.id)) * 0.02);
  }
  if (!sh) { aiSponsor(s); return; }
  // 将軍の家（AI）: 将軍家を攻めた家には諸家に討伐の御内書を下す
  if (sh !== s.player) {
    for (const C of Object.values(s.clans)) if (C.alive && C.id !== sh && B.aggr[`${C.id}|${sh}`] === s.turn && !B.orders.some((o) => o.target === C.id && o.to === 'all')) {
      B.orders.push({ by: sh, target: C.id, to: 'all', until: s.turn + R.ORDER_MONTHS });
      addLog(s, `将軍が諸国に${C.name}家討伐の御内書を下した。`, 'castle', true);
    }
    // 擁立された将軍が離反する: 擁立した家が大きくなりすぎ、信任が薄れれば、諸家に討伐を命じる（包囲網）
    const sp = B.sponsor;
    if (sp && s.clans[sp]?.alive && sh === 'ashikaga') {
      const big = clanKoku(s, sp) >= R.BETRAY_KOKU || clanCastles(s, sp).length >= R.BETRAY_CASTLES;
      if (big && (trustOf(s, sp) < R.BETRAY_TRUST || rand(s) < R.BETRAY_CHANCE)) {
        B.sponsor = null;
        s.treaties = (s.treaties ?? []).filter((t) => !((t.a === sp && t.b === sh) || (t.b === sp && t.a === sh)));
        B.orders.push({ by: sh, target: sp, to: 'all', until: s.turn + R.ORDER_MONTHS * 2 });
        bumpTrust(s, sp, -40);
        addLog(s, `将軍が${clanName(s, sp)}家と手を切り、諸国に${clanName(s, sp)}家討伐の御内書を下した（包囲網）。`, 'castle', true);
      }
    }
  }
  aiBakufu(s);
}

// AI: 献金・御内書・職の願い出、出仕の求めと応じ
function aiBakufu(s: GameState) {
  const sh = shogunClan(s)!, B = bk(s);
  for (const C of Object.values(s.clans)) {
    if (!C.alive || C.id === s.player || C.id === sh || C.usurp) continue;
    const reserve = R.PLOT_GOLD * 2 + 4000;
    if (C.gold > reserve + R.DONATE_GOLD * 4 && trustOf(s, C.id) < 70 && rand(s) < 0.15) donate(s, C.id);
    // 主な敵に名分がなければ御内書を願う
    if (C.target && s.clans[C.target]?.alive && !meibun(s, C.id, C.target).ok && C.gold > reserve + R.ORDER_GOLD && rand(s) < 0.15) requestOrder(s, C.id, C.target);
    // 管内に城のある空いた職・守護職
    if (C.gold > reserve + 10000 && trustOf(s, C.id) >= R.POST_TRUST && rand(s) < 0.08) {
      const provs = [...new Set(clanCastles(s, C.id).map((c) => provName(c.hex)))];
      const p: Post | undefined = provs.filter((x) => !B.shugo[x]).map((prov): Post => ({ kind: 'shugo', prov }))[0]
        ?? OFFICES.filter((o) => !B.offices[o.id]).map((o): Post => ({ kind: 'office', id: o.id })).find((x) => !postBlock(s, C.id, x));
      if (p && !postBlock(s, C.id, p) && C.gold > reserve + postCost(p)) requestPost(s, C.id, p);
    }
  }
  // 職の持ち主（AI）は年に一度ほど、管内の弱い家に出仕を求める。弱い家は応じる
  for (const C of Object.values(s.clans)) {
    if (!C.alive || C.id === s.player || rand(s) >= 0.08) continue;
    const t = inJurisdiction(s, C.id).filter((x) => x.id !== s.player && !B.shussi[x.id] && hostile(s, C.id, x.id) && clanKoku(s, x.id) < clanKoku(s, C.id) * 0.6)[0];
    if (t) demandShussi(s, C.id, t.id);
  }
}
function aiSponsor(s: GameState) {
  for (const C of Object.values(s.clans)) if (C.alive && C.id !== s.player && !sponsorBlock(s, C.id) && rand(s) < 0.2) { sponsor(s, C.id); return; }
}
