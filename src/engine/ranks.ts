// 身分・功績・使番（母衣衆）・奉行・元服
import { noteFoes } from './bakufu';
import { TRAITS } from '../data/traits';
export const SANKAN_BUGYO = 1.3;
import { battleFame } from './bushi';
import { initOn, onPromoted, promoteBlock } from './on';
import { delegateOf } from './delegate';
import { pushScene } from './lines';
import { ARRIVAL, TSUKAI_LABEL } from '../data/ranks';
import { capital } from './ops';
import * as R from './rules';
import { addLog, clanKoku } from './state';
import type { GameState, General } from './types';

export const tsukaiLabel = (clan: string | null) => (clan && TSUKAI_LABEL[clan]) || '使番';
export const isLeader = (s: GameState, g: General) => !!g.clan && s.clans[g.clan]?.leader === g.id;
// 家中で働いている武将（捕虜・在野・幼少を除く）
export const ACTIVE = ['free', 'army', 'governor', 'tsukai', 'bugyo'];
const isActive = (g: General) => ACTIVE.includes(g.status);

export function rankName(s: GameState, g: General): string {
  if (isLeader(s, g)) return '当主';
  if (g.status === 'young') return '幼少';
  return R.RANK_NAME[g.rank] ?? '侍大将';
}

// 使番（筆頭が先頭: 身分が高く、功績の多い順）
export function tsukaiOf(s: GameState, clan: string): General[] {
  return Object.values(s.generals).filter((g) => g.clan === clan && g.status === 'tsukai').sort((a, b) => a.rank - b.rank || b.merit - a.merit);
}
export const tsukaiSlots = (s: GameState, clan: string) => R.tsukaiSlots(clanKoku(s, clan));
export const karoSlots = (s: GameState, clan: string) => R.karoSlots(clanKoku(s, clan));
const karoCount = (s: GameState, clan: string) => Object.values(s.generals).filter((g) => g.clan === clan && g.rank === 0 && !g.kin && !isLeader(s, g) && isActive(g)).length;

export function canTsukai(s: GameState, g: General): string | null {
  if (!g.clan || g.status !== 'free') return '待機中の武将だけ';
  if (isLeader(s, g)) return '当主は就けない';
  if (g.rank < R.TSUKAI_MAX_RANK) return '足軽大将・足軽組頭だけ';
  if (tsukaiOf(s, g.clan).length >= tsukaiSlots(s, g.clan)) return '枠がない';
  return null;
}
export function setTsukai(s: GameState, g: General, on: boolean) {
  if (on) { g.status = 'tsukai'; const c = capital(s, g.clan!); if (c) g.loc = c.i; }
  else if (g.status === 'tsukai') g.status = 'free';
}

// 奉行（知略の高い順）
export function bugyoOf(s: GameState, clan: string): General[] {
  return Object.values(s.generals).filter((g) => g.clan === clan && g.status === 'bugyo').sort((a, b) => b.int - a.int);
}
export const bugyoSlots = (s: GameState, clan: string) => R.bugyoSlots(clanKoku(s, clan));
// 開発の係数 = 自然増0.2 + Σ 重み×知略/100 × 目の届く割合（奉行1人で4城まで）。農政と商業で別々
export const roleOf = (g: General) => g.role ?? 'agri';
export function bugyoCoef(s: GameState, clan: string, role: 'agri' | 'com' | 'hyoro' = 'agri'): { coef: number; base: number; cover: number } {
  const bs = bugyoOf(s, clan).filter((g) => roleOf(g) === role);
  const base = bs.reduce((t, g, k) => t + (R.BUGYO_WEIGHT[k] ?? 0) * (g.int / 100) * (TRAITS[g.id] === 'sankan' ? SANKAN_BUGYO : 1), 0); // 算勘の奉行はよく働く
  const castles = s.castles.filter((c) => c.owner === clan).length;
  const cover = castles ? Math.min(1, (bs.length * R.BUGYO_CASTLES) / castles) : 1;
  return { coef: R.DEV_NATURAL + base * cover, base, cover };
}
export function canBugyo(s: GameState, g: General): string | null {
  if (!g.clan || g.status !== 'free') return '待機中の武将だけ';
  if (isLeader(s, g)) return '当主は就けない';
  if (bugyoOf(s, g.clan).length >= bugyoSlots(s, g.clan)) return '枠がない';
  return null;
}
export function setBugyo(s: GameState, g: General, on: boolean) {
  if (on) { g.status = 'bugyo'; const c = capital(s, g.clan!); if (c) g.loc = c.i; }
  else if (g.status === 'bugyo') g.status = 'free';
}

const paidToo = (s: GameState, id: string, v: number) => { const g = s.generals[id]; if (g) g.paid = (g.paid ?? g.merit - v) + v; };
export function addMerit(s: GameState, id: string | null | undefined, v: number) {
  if (!id) return;
  const g = s.generals[id];
  if (g && g.status !== 'dead') g.merit = Math.round((g.merit + v) * 10) / 10;
}

// 合戦の功績: 参戦した武将（主将・補佐）。勝敗は使番の月末判定にも使う
export function awardBattle(s: GameState, clans: [string | null, string | null], winner: string | null, castleTaken: boolean, ids: [string[], string[]]) {
  for (const k of [0, 1] as const) {
    const clan = clans[k];
    if (!clan || !s.clans[clan]) continue;
    s.clans[clan].foughtTurn = s.turn;
    const won = winner === clan;
    if (won) s.clans[clan].wonTurn = s.turn;
    const v = won ? R.MERIT.WIN + (castleTaken && k === 0 ? R.MERIT.CASTLE : 0) : winner ? R.MERIT.LOSE : R.MERIT.DRAW;
    for (const id of ids[k]) addMerit(s, id, v);
  }
  battleFame(s, winner, castleTaken, clans, ids);
  noteFoes(s, clans, ids);
}

// 月末: 元服・城主と使番の功績・昇進
export function monthlyRanks(s: GameState) {
  for (const g of Object.values(s.generals)) {
    if (g.status !== 'young' || (g.genpuku ?? 0) > s.year) continue;
    g.genpuku = undefined;
    const child = g.name;
    if (g.later) { g.name = g.later; g.later = undefined; }
    g.rank = g.kin ? 1 : 3; g.merit = R.MERIT_AT[g.rank]; initOn(s, g);
    if (!g.clan || !s.clans[g.clan]?.alive) {
      g.clan = null; g.status = 'ronin';
      const via = ARRIVAL[g.id];
      if (via) { g.rank = 2; g.merit = R.MERIT_AT[2]; addLog(s, `異国の${g.name}が${via}、${s.castles[g.loc].name}のあたりに現れた。`, 'info', s.castles[g.loc].owner === s.player); }
      continue;
    }
    g.status = 'free';
    if (s.castles[g.loc].owner !== g.clan) g.loc = capital(s, g.clan)?.i ?? g.loc;
    if (g.clan === s.player) pushScene(s, g, 'genpuku');
    addLog(s, `${child}が元服した${child !== g.name ? `（${g.name}と名乗る）` : ''}（${R.RANK_NAME[g.rank]}）。`, 'info', g.clan === s.player);
  }
  // 城主・奉行の日々の務めの功は、知行・役料で報われている（恩賞の沙汰には入れない）
  for (const c of s.castles) if (c.governor && c.owner) { addMerit(s, c.governor, R.MERIT.GOV); paidToo(s, c.governor, R.MERIT.GOV); }
  for (const g of Object.values(s.generals)) if (g.status === 'bugyo') { addMerit(s, g.id, R.BUGYO_MERIT); paidToo(s, g.id, R.BUGYO_MERIT); }
  for (const clan of Object.values(s.clans)) {
    if (!clan.alive) continue;
    const v = clan.wonTurn === s.turn ? R.MERIT.WIN : clan.foughtTurn === s.turn ? R.MERIT.LOSE : 0;
    if (v) for (const g of tsukaiOf(s, clan.id)) addMerit(s, g.id, v * R.TSUKAI_MULT);
    promote(s, clan.id);
  }
}

// プレイヤーは恩賞の沙汰で自ら取り立てる（人事を委任していれば自動）。AIは功績が満ちれば取り立てる
// 一段だけ取り立てる（恩賞の沙汰）。できなければ理由
export function promoteBlockOf(s: GameState, g: General) { return promoteBlock(s, g, !!g.clan && karoCount(s, g.clan) >= karoSlots(s, g.clan)); }
export function promoteOne(s: GameState, g: General): boolean {
  if (!g.clan || promoteBlockOf(s, g)) return false;
  g.rank--; onPromoted(g);
  // 不仲の者は面白くない
  for (const b of g.bonds ?? []) if (b.kind === 'rival') { const x = s.generals[b.id]; if (x && x.clan === g.clan) x.on = Math.max(0, (x.on ?? R.ON_START) - 3); }
  const left = g.status === 'tsukai' && g.rank < R.TSUKAI_MAX_RANK;
  if (left) g.status = 'free';
  addLog(s, `${g.name}を${R.RANK_NAME[g.rank]}に取り立てた${left ? `（${tsukaiLabel(g.clan)}を離れる）` : ''}。`, 'info', g.clan === s.player);
  return true;
}
function promote(s: GameState, clan: string) {
  if (clan === s.player && !delegateOf(s).staff) return;
  const label = tsukaiLabel(clan);
  const gens = Object.values(s.generals).filter((g) => g.clan === clan && isActive(g) && !isLeader(s, g)).sort((a, b) => b.merit - a.merit);
  for (const g of gens) {
    const from = g.rank;
    while (g.rank > 0 && g.merit >= R.MERIT_AT[g.rank - 1]) {
      if (g.rank === 1 && !g.kin && karoCount(s, clan) >= karoSlots(s, clan)) break;
      g.rank--; onPromoted(g);
      const left = g.status === 'tsukai' && g.rank < R.TSUKAI_MAX_RANK;
      if (left) g.status = 'free';
      addLog(s, `${g.name}が${R.RANK_NAME[g.rank]}に取り立てられた${left ? `（${label}を離れる）` : ''}。`, 'info', clan === s.player);
    }
    if (clan === s.player && g.rank < from) pushScene(s, g, 'promote', { rank: R.RANK_NAME[g.rank] }); // 何段上がっても一度だけ
  }
}

// AI: 武将に余裕があれば（武将数 ≥ 城数 + 3）奉行、次に使番を埋める
function room(s: GameState, clan: string) {
  const active = Object.values(s.generals).filter((g) => g.clan === clan && isActive(g)).length;
  const castles = s.castles.filter((c) => c.owner === clan).length;
  return active - (castles + 3) - tsukaiOf(s, clan).length - bugyoOf(s, clan).length;
}
export function aiFillBugyo(s: GameState, clan: string) {
  let n = Math.min(bugyoSlots(s, clan) - bugyoOf(s, clan).length, room(s, clan) + 1); // 奉行は1人目を優先
  if (n <= 0) return;
  const cands = Object.values(s.generals).filter((g) => g.clan === clan && !canBugyo(s, g) && g.int >= 60).sort((a, b) => b.int - a.int);
  for (const g of cands) {
    if (n-- <= 0) break;
    setBugyo(s, g, true);
    // 農政と商業を交互に（農政から）
    // 3人目からは兵站奉行を一人置く（知略の高い順に埋めるので、兵站には残った中の最上位）
    const others = bugyoOf(s, clan).filter((x) => x !== g);
    const agri = others.filter((x) => roleOf(x) === 'agri').length;
    const com = others.filter((x) => roleOf(x) === 'com').length;
    const hyoro = others.filter((x) => roleOf(x) === 'hyoro').length;
    g.role = others.length >= 2 && !hyoro ? 'hyoro' : agri > com ? 'com' : 'agri';
  }
}
export function aiFillTsukai(s: GameState, clan: string) {
  let n = Math.min(tsukaiSlots(s, clan) - tsukaiOf(s, clan).length, room(s, clan));
  if (n <= 0) return;
  const cands = Object.values(s.generals).filter((g) => !canTsukai(s, g) && g.clan === clan).sort((a, b) => b.bra - a.bra);
  for (const g of cands) { if (n-- <= 0) break; setTsukai(s, g, true); }
}

// 旧セーブ（身分なし）の読み込み
export function migrateRanks(s: GameState) {
  for (const g of Object.values(s.generals)) if (g.rank === undefined) { g.rank = 1; g.merit = R.MERIT_AT[1]; }
}
