// 武士の性質: 名声と大きすぎる功（二）、縁と去就（四）、追放と帰参・喧嘩（六）、都の重さと僭称（七）
import { BONDS, goodBond, type BondKind } from '../data/bonds';
import { hexDist } from './map';
import { pushScene } from './lines';
import { initOn, onOf, vassalsOf } from './on';
import { desert, killGeneral, nearestOwnCastle } from './ops';
import * as R from './rules';
import { addLog, clanArmies, clanName, drillOf, hostile, rand } from './state';
import type { GameState, General } from './types';

// ───────── 縁 ─────────
export function initBonds(s: GameState) {
  for (const [a, b, kind] of BONDS) {
    const A = s.generals[a], B = s.generals[b];
    if (!A || !B) continue;
    addBond(A, b, kind); addBond(B, a, kind);
  }
}
function addBond(g: General, id: string, kind: BondKind) {
  if ((g.bonds ?? []).some((x) => x.id === id)) return;
  (g.bonds ??= []).push({ id, kind });
}
export const bondOf = (a: General, b: General) => a.bonds?.find((x) => x.id === b.id)?.kind ?? null;
export const bondsOf = (s: GameState, g: General) => (g.bonds ?? []).map((x) => ({ g: s.generals[x.id], kind: x.kind })).filter((x) => x.g && x.g.status !== 'dead');
// 捕虜・調略の相手と縁のある自家の武将
export const bondIn = (s: GameState, g: General, clan: string) => bondsOf(s, g).find((x) => goodBond(x.kind) && x.g.clan === clan && x.g.status !== 'captive')?.g;
export const rivalIn = (s: GameState, g: General, clan: string) => bondsOf(s, g).find((x) => x.kind === 'rival' && x.g.clan === clan && x.g.status !== 'captive')?.g;
export const goodBondOf = (a: General, b: General) => goodBond(bondOf(a, b));

// 去就: 去った者・家を割った者に、縁のある者（恩の薄い者）がついて行く
export function followers(s: GameState, g: General, from: string, onBelow: number) {
  return bondsOf(s, g).filter((x) => goodBond(x.kind)).map((x) => x.g).filter((x) => x.clan === from && !x.kin && s.clans[from]?.leader !== x.id && onOf(x) < onBelow && ['free', 'governor', 'bugyo', 'tsukai'].includes(x.status) && rand(s) < R.BOND_FOLLOW);
}

// ───────── 名声と首級 ─────────
const fameOf = (g: General) => g.fame ?? 0;
const addFame = (g: General | undefined, v: number) => { if (g && g.status !== 'dead') g.fame = Math.max(0, Math.min(100, fameOf(g) + (v > 0 ? v * Math.max(0.1, 1 - fameOf(g) / 110) : v))); };
// 合戦の後（ranks.awardBattle から）: 勝った側の主将に名声、討ち取り・捕らえた分の首級、共に勝った者の戦友の縁
export function battleFame(s: GameState, winner: string | null, castleTaken: boolean, sides: [string | null, string | null], ids: [string[], string[]]) {
  for (const k of [0, 1] as const) {
    const main = s.generals[ids[k][0]];
    const won = !!winner && sides[k] === winner;
    if (!won) { addFame(main, -R.FAME_LOSE); continue; }
    const heads = ids[1 - k].filter((id) => ['dead', 'captive'].includes(s.generals[id]?.status ?? '')).length;
    addFame(main, R.FAME_WIN + (castleTaken && k === 0 ? R.FAME_CASTLE : 0) + heads * R.FAME_HEAD);
    for (const id of ids[k].slice(1)) addFame(s.generals[id], 1);
    // 戦友
    const gs = ids[k].slice(0, 6).map((id) => s.generals[id]).filter((g) => g && g.status !== 'dead');
    for (const a of gs) for (const b of gs) {
      if (a === b) continue;
      a.comrade ??= {};
      a.comrade[b.id] = (a.comrade[b.id] ?? 0) + 1;
      if (a.comrade[b.id] === R.COMRADE_WINS && bondOf(a, b) !== 'rival') addBond(a, b.id, 'comrade');
    }
  }
}

// 外から官の誘い（大きすぎる功）: 名声が高く恩の薄い者に。プレイヤーは許すか咎めるか、AIは五分
function kanGiver(s: GameState, g: General): string {
  const foes = Object.values(s.clans).filter((C) => C.alive && g.clan && C.id !== g.clan && hostile(s, g.clan, C.id) && (C.court ?? 0) >= 3).sort((a, b) => b.prestige - a.prestige);
  return foes[0] && rand(s) < 0.5 ? foes[0].id : 'court';
}
export const giverName = (s: GameState, from: string) => (from === 'court' ? '朝廷' : `${clanName(s, from)}家`);
export function answerKan(s: GameState, forgive: boolean) {
  const o = s.kanOffer;
  if (!o) return;
  s.kanOffer = null;
  const g = s.generals[o.gen];
  if (!g || g.clan !== s.player) return;
  if (forgive) { g.outer = o.from; g.on = Math.min(100, onOf(g) + R.KAN_FORGIVE); addFame(g, 5); addLog(s, `${g.name}が${giverName(s, o.from)}から官を受けるのを許した。`, 'info', true); }
  else { g.on = Math.max(0, onOf(g) - R.KAN_SCOLD); addLog(s, `${g.name}が${giverName(s, o.from)}から官を受けようとしたのを咎めた。`, 'info', true); }
}

// ───────── 追放と帰参・喧嘩 ─────────
export function exile(s: GameState, g: General, why = '') {
  const clan = g.clan;
  if (!clan || s.clans[clan].leader === g.id) return;
  if (clan === s.player) pushScene(s, g, 'exiled');
  for (const x of bondsOf(s, g)) if (x.g.clan === clan) x.g.on = Math.max(0, onOf(x.g) - 5);
  s.clans[clan].prestige = Math.max(0, s.clans[clan].prestige - R.EXILE_PRESTIGE);
  desert(s, g, `${g.name}を${clanName(s, clan)}家から追放した${why}`);
  g.exiledFrom = clan; g.exileTurn = s.turn;
}
export function answerReturn(s: GameState, ok: boolean) {
  const o = s.returnOffer;
  s.returnOffer = null;
  const g = o ? s.generals[o.gen] : undefined;
  if (!g || g.status !== 'ronin') return;
  if (!ok) { addLog(s, `${g.name}の帰参を許さなかった。`, 'info', true); return; }
  const home = nearestOwnCastle(s, s.player, s.castles[g.loc].hex);
  g.clan = s.player; g.status = 'free'; g.formerClan = null; g.exiledFrom = undefined;
  initOn(s, g); g.on = R.RETURN_ON; g.merit += R.RETURN_MERIT; g.paid = g.merit;
  if (home) g.loc = home.i;
  addLog(s, `${g.name}の帰参を許した。`, 'info', true);
}
export function judgeQuarrel(s: GameState, how: 'seppuku' | 'exile' | 'let') {
  const q = s.quarrel;
  s.quarrel = null;
  const g = q ? s.generals[q.gen] : undefined;
  if (!g || g.clan !== s.player || g.status === 'dead') return;
  if (how === 'seppuku') killGeneral(s, g, '喧嘩の咎で切腹');
  else if (how === 'exile') exile(s, g, '（喧嘩の咎）');
  else { for (const x of vassalsOf(s, s.player)) if (x.id !== g.id) x.on = Math.max(0, onOf(x) - R.QUARREL_LET); addLog(s, `${g.name}の喧嘩を不問とした。家中に不満が残った。`, 'info', true); }
}

// ───────── 毎月 ─────────
export function monthlyBushi(s: GameState) {
  // 返事のないまま月が替われば: 官は受けてしまう、帰参は流れる、喧嘩は追放
  if (s.kanOffer && s.turn - s.kanOffer.turn >= 1) { const g = s.generals[s.kanOffer.gen]; if (g && g.clan === s.player) { g.outer = s.kanOffer.from; addLog(s, `${g.name}は返事を待たず${giverName(s, s.kanOffer.from)}から官を受けた。`, 'info', true); } s.kanOffer = null; }
  if (s.returnOffer && s.turn - s.returnOffer.turn >= 1) s.returnOffer = null;
  if (s.quarrel && s.turn - s.quarrel.turn >= 1) judgeQuarrel(s, 'exile');
  for (const g of Object.values(s.generals)) if ((g.fame ?? 0) > 30 && g.status !== 'dead') g.fame = Math.max(30, g.fame! - R.FAME_DECAY);
  for (const C of Object.values(s.clans)) {
    if (!C.alive) continue;
    const mine = C.id === s.player;
    // 大きすぎる功
    for (const g of vassalsOf(s, C.id)) {
      if (g.outer || g.kin || fameOf(g) < R.KAN_FAME || onOf(g) >= R.KAN_ON || rand(s) >= R.KAN_CHANCE) continue;
      const from = kanGiver(s, g);
      if (mine) { if (!s.kanOffer) { s.kanOffer = { gen: g.id, from, turn: s.turn }; addLog(s, `${g.name}に${giverName(s, from)}から官の誘いが来ている。`, 'info', true); } }
      else if (rand(s) < 0.5) g.outer = from; else g.on = Math.max(0, onOf(g) - R.KAN_SCOLD);
    }
    if (!mine) continue;
    // 追放した者の無断参戦: 当家が勝った月、戦った部隊の近くにいれば首を挙げて帰参を願う
    if (C.wonTurn === s.turn && !s.returnOffer) {
      const fought = clanArmies(s, C.id).filter((a) => a.fought === s.turn);
      const r = Object.values(s.generals).find((g) => g.status === 'ronin' && g.exiledFrom === C.id && (g.exileTurn ?? 0) <= s.turn - 3 && fought.some((a) => hexDist(a.hex, s.castles[g.loc].hex) <= 4));
      if (r && rand(s) < R.RETURN_CHANCE) {
        s.returnOffer = { gen: r.id, turn: s.turn }; addFame(r, 5);
        pushScene(s, r, 'returnHead');
        addLog(s, `追放した${r.name}が勝手に戦に加わり、首を挙げて帰参を願い出た。`, 'info', true);
      }
    }
    // 喧嘩: 同じ城にいる気の荒い者
    const vs = vassalsOf(s, C.id).filter((g) => !g.kin && ['free', 'governor'].includes(g.status));
    // 不仲の者が同じ城にいれば、気性によらず喧嘩になりやすい（倍）
    const rivals = vs.flatMap((a) => vs.filter((b) => b !== a && b.loc === a.loc && bondOf(a, b) === 'rival').map((b) => [a, b] as const));
    if (!s.quarrel && rand(s) < R.QUARREL_CHANCE * (rivals.length ? 2 : 1)) {
      const pick = rivals.length ? rivals[Math.floor(rand(s) * rivals.length)] : null;
      const a = pick ? (pick[0].bra >= pick[1].bra ? pick[0] : pick[1]) : vs.filter((g) => g.bra >= 70 && g.bra > g.int).sort(() => rand(s) - 0.5)[0];
      const b = pick ? (a === pick[0] ? pick[1] : pick[0]) : a && vs.find((g) => g !== a && g.loc === a.loc && !bondOf(a, g));
      if (a && b) {
        const killed = rand(s) < 0.5;
        pushScene(s, a, 'quarrel', { victim: b.name });
        if (killed) killGeneral(s, b, `${a.name}との喧嘩で斬られる`);
        else { b.sick = Math.max(b.sick ?? 0, 2); addLog(s, `${a.name}が喧嘩の末に${b.name}に斬りつけた（手負い）。`, 'info', true); }
        s.quarrel = { gen: a.id, victim: b.name, killed, turn: s.turn };
      }
    }
  }
  // 都の重さ: 京の周りの軍勢の狼藉
  const kyo = s.castles.find((c) => c.id === R.KYO);
  if (kyo) for (const a of Object.values(s.armies)) {
    if (a.ikki || hexDist(a.hex, kyo.hex) > R.KYO_RANGE || (a.ashi ?? 0) >= 0.5 || drillOf(a) >= 60 || rand(s) >= R.ROZEKI_CHANCE) continue;
    if (kyo.owner === a.clan) kyo.chian = Math.max(0, kyo.chian - R.ROZEKI_CHIAN);
    s.clans[a.clan].prestige = Math.max(0, s.clans[a.clan].prestige - 1);
    addLog(s, `京で${s.generals[a.main].name}隊の兵が狼藉をはたらいた。${clanName(s, a.clan)}家の評判が下がった。`, 'info', a.clan === s.player);
  }
}
// 京とその周りの軍勢は兵糧を倍食う（economy の兵糧の消費に足す分）
export function kyoExtraFood(s: GameState, clan: string) {
  const kyo = s.castles.find((c) => c.id === R.KYO);
  if (!kyo) return 0;
  return clanArmies(s, clan).filter((a) => hexDist(a.hex, kyo.hex) <= R.KYO_RANGE).reduce((t, a) => t + a.troops, 0) * R.FOOD_PER_SOLDIER * (R.KYO_FOOD - 1);
}
// 僭称
export function usurp(s: GameState, clan: string) {
  const C = s.clans[clan];
  if (C.usurp) return;
  C.usurp = true; C.prestige = Math.min(100, C.prestige + R.USURP_PRESTIGE);
  addLog(s, `${C.name}家は朝廷を経ずに官を名乗った（僭称）。`, 'info', true);
}
