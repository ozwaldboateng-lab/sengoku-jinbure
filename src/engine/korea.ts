// 唐入り（第三段）: 朝鮮・明の人物と軍勢、王の北への退去、義兵、冬、明の援軍
// 朝鮮と明の軍勢はふだんの大名のAI（runClanAI）で動く。ここではそのための人と兵、時の流れを与える
import { COLD_PROVINCES, KING_ROUTE, KOREA_BORN, KOREA_GENERALS } from '../data/korea';
import { envoyLine } from './lines';
import { HEXES, NEIGHBORS, PROVINCES, graphDistances, isForeignHex } from './map';
import { formArmy } from './ops';
import * as R from './rules';
import { addLog, castleAt, clanCastles, garrisonMax, hostile, occupancy, rand } from './state';
import type { Castle, GameState, General } from './types';

export const KR = {
  JOSEON_FOOD: 300000, JOSEON_GOLD: 20000,
  MING_FOOD: 400000, MING_GOLD: 40000,
  KING_FLEE: 4, // 日本の軍勢が王の城からこのマス以内に来れば北へ退く
  GIHEI_BASE: 0.05, GIHEI_EMBER: 1 / 500, GIHEI_MAX: 6, // 義兵が起つ見込み（占領した城ごと・月）と、同時に起っている義兵の上限
  GIHEI_TROOPS: [1200, 3500],
  GIHEI_MONTHS: 4, // 義兵は一揆と同じく、この月数で散る（名のある大将は眠りに戻り、また起つことがある）
  COLD: 0.04, COLD_MORALE: 0.05, // 冬に北の道で凍える兵の割合・士気
  MING_MONTHS: 8, // 渡海からこの月数で、明は援軍を出す（平壌が落ちるか義州に迫ればすぐ）
  MING1: 6000, MING2: [36000, 14000], MING2_AFTER: 4, MING_CANNON: 12,
};
const castleOf = (s: GameState, id: string) => s.castles.find((c) => c.id === id);
export const isKoreaClan = (id: string | null) => id === 'joseon' || id === 'ming';

// 朝鮮・明の人物を加える（唐入りを始めたとき）。旧いセーブや二度目は足りない者だけ
export function addKoreaGenerals(s: GameState) {
  for (const [id, name, clan, bra, int, lea, cha, cid, role] of KOREA_GENERALS) {
    if (s.generals[id]) continue;
    const c = castleOf(s, cid);
    const g: General = { id, name, clan, bra, int, lea, cha, status: role === 'gov' ? 'governor' : role === 'king' || role === 'free' ? 'free' : 'ronin', loc: c?.i ?? 0, army: null, captor: null, formerClan: null, rank: role === 'king' ? 0 : 1, merit: 0, born: KOREA_BORN[id] };
    if (role === 'gihei' || role === 'ming1' || role === 'ming2' || role === 'envoy') { g.status = 'young'; g.genpuku = 9999; } // 出番まで眠る（元服前の扱い）
    s.generals[id] = g;
    if (role === 'gov' && c && c.owner === clan && !c.governor) c.governor = id;
  }
}
const wake = (s: GameState, id: string) => { const g = s.generals[id]; if (g && g.status === 'young') { g.status = 'free'; g.genpuku = undefined; } return g; };

// 朝鮮を起こす
export function wakeJoseon(s: GameState) {
  addKoreaGenerals(s);
  const J = s.clans.joseon;
  J.alive = true; J.leader = 'seonjo'; J.food = KR.JOSEON_FOOD; J.gold = KR.JOSEON_GOLD; J.stance = '守勢';
  for (const c of clanCastles(s, 'joseon')) { c.garrison = garrisonMax(c); c.chian = Math.max(c.chian, 70); }
}

// 月の初め（AIの前）: 王の退去・義兵・明の援軍
export function koreaMonth(s: GameState) {
  const k = s.karairi;
  if (!k?.active || !s.clans.joseon?.alive) return;
  // 明の兵糧は遼東から送られる（出ている兵の分）
  const M = s.clans.ming; if (M?.alive) M.food += Object.values(s.armies).filter((a) => a.clan === 'ming').reduce((t, a) => t + a.troops, 0) * R.FOOD_PER_SOLDIER * 1.1;
  kingFlee(s);
  gihei(s);
  ming(s);
}

// 王は日本の軍勢が迫ると、都から北へ退く
function kingFlee(s: GameState) {
  const king = s.generals.seonjo;
  if (!king || king.status === 'dead' || king.status === 'captive') return;
  const here = s.castles[king.loc];
  const foes = Object.values(s.armies).filter((a) => a.clan === s.player).map((a) => a.hex);
  if (!foes.length) return;
  const d = graphDistances(foes);
  const near = here.owner !== 'joseon' || d[here.hex] <= KR.KING_FLEE;
  if (!near) return;
  const idx = KING_ROUTE.indexOf(here.id);
  const next = KING_ROUTE.slice(idx + 1).map((id) => castleOf(s, id)).find((c) => c && c.owner === 'joseon' && d[c.hex] > KR.KING_FLEE);
  if (!next) return;
  king.loc = next.i;
  addLog(s, `朝鮮の王（宣祖）は${here.name}を捨て、${next.name}へ逃れた。`, 'battle', true);
}

// 義兵: 占領した朝鮮の城の辺りに、儒者・僧・農民が起つ（人の売り買いを禁じていれば起ちにくい）
let giheiSeq = 0;
function gihei(s: GameState) {
  const k = s.karairi!;
  // 散った義兵の名のある大将は、また眠りに戻る（次に起つ時を待つ）
  for (const [id, , , , , , , , r] of KOREA_GENERALS) { const g = s.generals[id]; if (r === 'gihei' && g && g.status === 'free' && g.clan === 'joseon' && g.army === null) { g.status = 'young'; g.genpuku = 9999; } }
  const giheiIds = new Set(KOREA_GENERALS.filter(([, , , , , , , , r]) => r === 'gihei').map(([id]) => id));
  const active = Object.values(s.armies).filter((a) => a.clan === 'joseon' && (a.main.startsWith('gihei_') || giheiIds.has(a.main))).length;
  if (active >= KR.GIHEI_MAX) return;
  const occ = occupancy(s);
  const mine = Object.values(s.armies).filter((a) => a.clan === s.player).map((a) => a.hex);
  const dm = graphDistances(mine.length ? mine : [0]);
  for (const c of s.castles) {
    if (c.owner !== s.player || !isForeignHex(c.hex)) continue;
    const p = (KR.GIHEI_BASE + (c.ember ?? 0) * KR.GIHEI_EMBER) * (k.slaveBan ? 0.8 : 1) * (k.investigated && !k.slaveBan ? 1.1 : 1);
    if (rand(s) >= p) continue;
    // 起つ所: 一揆と同じく城の隣の空きマス（日本の軍勢から離れた所を選ぶ）
    const near = NEIGHBORS[c.hex].filter((j) => !occ.has(j) && !castleAt(s, j));
    const spots = near.filter((j) => dm[j] >= 2).length ? near.filter((j) => dm[j] >= 2) : near;
    if (!spots.length) continue;
    const hex = spots[Math.floor(rand(s) * spots.length)];
    const named = KOREA_GENERALS.filter(([, , , , , , , , r]) => r === 'gihei').map(([id]) => s.generals[id]).find((g) => g && g.status === 'young');
    let g: General;
    if (named) { g = wake(s, named.id)!; }
    else { const id = `gihei_${s.turn}_${giheiSeq++}`; g = { id, name: '義兵', clan: 'joseon', bra: 55 + Math.floor(rand(s) * 20), int: 50, lea: 50 + Math.floor(rand(s) * 15), cha: 60, status: 'free', loc: c.i, army: null, captor: null, formerClan: null, rank: 3, merit: 0, ikki: true }; s.generals[id] = g; } // 名のない義兵の頭は仮の武将（一揆と同じく、散れば消える）
    g.loc = c.i;
    const troops = Math.round(KR.GIHEI_TROOPS[0] + rand(s) * (KR.GIHEI_TROOPS[1] - KR.GIHEI_TROOPS[0]) * (0.6 + (c.ember ?? 0) / 100));
    const a = formArmy(s, 'joseon', c, g.id, troops, hex);
    if (!a) continue;
    a.morale = 1.2; a.acted = false; s.clans.joseon.food += troops * R.RECRUIT_COST; // 義兵は自ら兵糧を持って起つ
    a.ikki = { castle: c.i, until: s.turn + KR.GIHEI_MONTHS }; a.departTroops = troops; // 一揆と同じ扱い: 占領された城へ攻めかかり、月が過ぎれば散る。補充も補給もない。討てば城が荒れる
    addLog(s, `${c.name}の辺りで${g.name === '義兵' ? '' : `${g.name}の率いる`}義兵${troops.toLocaleString()}が起った。`, 'battle', true);
    if (named) (s.scenes ??= []).push({ gen: g.id, scene: 'giheiRise', text: GIHEI_LINE[g.id] ?? '国を奪われて黙っている民はおらぬ。鍬を持て、弓を取れ。', label: '義兵', who: { name: g.name, color: s.clans.joseon.color } });
    break; // 月に一つ
  }
}
const GIHEI_LINE: Record<string, string> = {
  gwak_jaeu: '倭の大軍も、山と谷を知らぬ。紅い衣を目印に、わしに続け。道を断ち、荷を奪え。',
  kim_cheonil: '書を読む者こそ、国の危うきに起たねばならぬ。わしは老いたが、まだ弓は引ける。',
  go_gyeongmyeong: '六十の老いぼれに何ができるか、と笑うがよい。死ぬなら、この地で死ぬ。',
  hyujeong: '殺生は仏の戒め。されど民が殺されるのを見過ごすは、なお重い罪。僧兵よ、起て。',
  yujeong: '師の命により、僧兵を率いて参った。経を置き、刀を取る。',
};

// 明の援軍: 平壌が落ちるか、日本の軍勢が義州に迫るか、渡海から月が経てば
function ming(s: GameState) {
  const k = s.karairi!;
  const M = s.clans.ming;
  if (!M) return;
  const jl = castleOf(s, 'jiuliancheng');
  if (!jl || jl.owner !== 'ming') return;
  if (!M.alive) {
    const py = castleOf(s, 'pyongyang'), uj = castleOf(s, 'uiju');
    const mine = Object.values(s.armies).filter((a) => a.clan === s.player).map((a) => a.hex);
    const near = uj && mine.length ? graphDistances(mine)[uj.hex] <= 3 : false;
    if (!(py?.owner === s.player || near || s.turn - (k.openTurn ?? s.turn) >= KR.MING_MONTHS)) return;
    addKoreaGenerals(s);
    M.alive = true; M.leader = 'li_rusong'; M.food = KR.MING_FOOD; M.gold = KR.MING_GOLD; M.stance = '攻勢'; M.target = s.player;
    s.treaties.push({ a: 'joseon', b: 'ming', kind: 'alliance', start: s.turn, until: null });
    k.mingTurn = s.turn;
    const z = wake(s, 'zu_chengxun');
    if (z) { const a = formArmy(s, 'ming', jl, z.id, KR.MING1, freeNear(s, jl)); if (a) { a.acted = false; s.clans.ming.food += KR.MING1 * R.RECRUIT_COST; } }
    addLog(s, `明が朝鮮の求めに応じ、鴨緑江を越えて援軍を送った。先手は祖承訓の${KR.MING1.toLocaleString()}。`, 'battle', true);
    (s.scenes ??= []).push(envoyLine(s, 'mingCome', { id: 'zu_chengxun', name: '祖承訓', color: M.color }));
    return;
  }
  if (k.mingTurn !== undefined && s.turn === k.mingTurn + KR.MING2_AFTER) {
    for (const [id, n] of [['li_rusong', KR.MING2[0]], ['ma_gui', KR.MING2[1]]] as const) {
      const g = wake(s, id);
      if (!g || g.status !== 'free') continue;
      const a = formArmy(s, 'ming', jl, g.id, n, freeNear(s, jl));
      if (!a) continue;
      a.acted = false; s.clans.ming.food += n * R.RECRUIT_COST;
      if (id === 'li_rusong') a.cannon = KR.MING_CANNON;
    }
    addLog(s, `明の本隊が着いた。提督李如松が大軍と大砲を率いて南へ向かう。`, 'battle', true);
    (s.scenes ??= []).push(envoyLine(s, 'mingMain', { id: 'li_rusong', name: '李如松', color: M.color }));
  }
}
function freeNear(s: GameState, c: Castle) {
  const occ = occupancy(s);
  return [c.hex, ...NEIGHBORS[c.hex]].find((h) => !occ.has(h)) ?? c.hex;
}

// 月の終わり: 冬の北の道で凍える（日本の軍勢だけ）
export function koreaWinter(s: GameState) {
  if (!s.karairi?.active || ![11, 12, 1, 2].includes(s.month)) return;
  let n = 0, lost = 0;
  for (const a of Object.values(s.armies)) {
    if (a.clan !== s.player || !isForeignHex(a.hex)) continue;
    if (!COLD_PROVINCES.includes(PROVINCES[HEXES[a.hex].p].id)) continue;
    const d = Math.round(a.troops * KR.COLD); a.troops -= d; lost += d; n++;
    a.morale = Math.max(0.2, a.morale - KR.COLD_MORALE);
  }
  if (n) addLog(s, `北の冬は厳しい。凍えて${lost.toLocaleString()}人が倒れ、${n}隊の士気が下がった。`, 'battle', true);
}
void hostile;
