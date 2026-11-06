// 勢力AI（SPEC: 攻勢/均衡/守勢、包囲・側面・城確保の評価、不利戦闘の回避、70%ローテーション）
import { meibun, shogunClan } from './bakufu';
import { isCrossing } from './karairi';
import { isForeignHex, PROVINCES } from './map';
import { aiMerge } from './reorg';
import { aiNinja } from './traits';
const STAGE = new Set(['tsushima', 'iki']);
import { aiFillCorps, attachAuto } from './corps';
import { estimate, groupEstimate } from './combat';
import { orderAttack, ordersAt, resolveOrders } from './orders';
import { graphDistances, hexDist, HEXES, NEIGHBORS } from './map';
import { carryOf, isSupplied, supplyNet, type SupplyNet } from './supply';
import { attackTargets, reachable, type Target } from './move';
import { canPlot, capital, doPlot, formArmy, moveArmy, plotChance, recruitRonin } from './ops';
import * as R from './rules';
import { castleAt, hostile, rand, castleKoku, clanArmies, mobilizeCap, clanCastles, clanTroops, garrisonMax, maxTroops, occupancy, troopMult, castleDef , farmTroops } from './state';
import type { Army, GameState, General } from './types';
import { aiFillBugyo, aiFillTsukai } from './ranks';
import { aiEconomy } from './money';
import { aiNanban } from './nanban';
import { aiCourt, deterOf } from './court';
import { aiIkki, ikkiOrders } from './ikki';
import { afterCampEdit, AUTO, autoJinbure, campsAt, campsOf, formCamp } from './jinbure';
import { aiBudget } from './policy';

export function enemyNear(s: GameState, clan: string, hex: number, radius: number): number {
  let t = 0;
  // 海の向こう（日本と朝鮮）の軍勢は、近くても渡ってこられないので数えない
  for (const a of Object.values(s.armies)) if (hostile(s, clan, a.clan) && hexDist(a.hex, hex) <= radius && isForeignHex(a.hex) === isForeignHex(hex)) t += a.troops * a.morale;
  return t;
}

// 調略: 知略の高い待機武将がいれば、月に一度、近くの城に仕掛ける
function aiPlot(s: GameState, clan: string) {
  const c = s.clans[clan];
  if (c.gold < R.PLOT_GOLD * 2) return;
  const gens = Object.values(s.generals).filter((g) => g.clan === clan && g.status === 'free' && g.int >= 65 && g.plotTurn !== s.turn).sort((a, b) => b.int - a.int);
  if (!gens.length) return;
  const g = gens[0];
  let best: { k: (typeof s.castles)[number]; v: number; p: number } | null = null;
  for (const k of s.castles) {
    if (!canPlot(s, clan, k)) continue;
    if (k.naio !== undefined && k.naio >= s.turn) continue;
    const p = plotChance(s, g, k, clan);
    const v = p * (castleKoku(k) + 2) * (k.owner === null ? 1.5 : k.owner === c.target ? 1.3 : 1);
    if (!best || v > best.v) best = { k, v, p };
  }
  if (best && best.p >= 0.3) doPlot(s, g, best.k, clan);
}

function organize(s: GameState, clan: string) {
  const c = s.clans[clan];
  const foreign = !!c.foreign; // 朝鮮・明は南蛮・官位・調略・浪人の登用をしない
  if (!foreign) aiNanban(s, clan);
  aiEconomy(s, clan);
  aiBudget(s, c);
  if (!foreign) aiCourt(s, clan);
  if (!foreign) aiPlot(s, clan);
  if (!foreign) aiNinja(s, clan);
  // 在野武将の登用
  if (!foreign) for (const g of Object.values(s.generals)) {
    if (g.status === 'ronin' && s.castles[g.loc].owner === clan && g.triedTurn !== s.turn && rand(s) < 0.3) recruitRonin(s, g, clan);
  }
  // 動員余力が大きければ城主を野戦軍の大将に回す
  for (;;) {
    const capLeft = mobilizeCap(s, clan) - farmTroops(s, clan);
    if (capLeft < 4000 || c.food < clanTroops(s, clan) * R.FOOD_PER_SOLDIER * 4) break;
    const govs = clanCastles(s, clan).filter((k) => k.governor).map((k) => s.generals[k.governor!]);
    if (!govs.length) break;
    const sc = (x: General) => (x.lea + x.bra) * troopMult(s, x);
    const g = govs.reduce((b, x) => (sc(x) > sc(b) ? x : b));
    s.castles[g.loc].governor = null;
    g.status = 'free';
    const castle = s.castles[g.loc];
    const occ0 = occupancy(s);
    const spot = [castle.hex, ...NEIGHBORS[castle.hex].filter((j) => s.castles[HEXES[j].d]?.owner === clan)].find((h) => !occ0.has(h));
    if (!foreign) { formCamp(s, clan, castle, g.id, R.NEW_ARMY_TROOPS + 500); continue; } // 平時の軍団は名簿として作る（陣触で出る）
    if (spot === undefined || !formArmy(s, clan, castle, g.id, R.NEW_ARMY_TROOPS + 500, spot)) { castle.governor = g.id; g.status = 'governor'; break; }
  }
  aiFillBugyo(s, clan);
  aiFillTsukai(s, clan);
  aiFillCorps(s, clan, (a) => castleAt(s, a.hex)?.owner === a.clan || NEIGHBORS[a.hex].some((j) => castleAt(s, j)?.owner === a.clan));
  // 身分の高い者から隊を率い、残りが補佐・城主に回る
  const free = Object.values(s.generals).filter((g) => g.clan === clan && g.status === 'free').sort((a, b) => troopMult(s, b) - troopMult(s, a) || b.lea - a.lea);
  const occ = occupancy(s);
  for (const g of free) {
    const castle = s.castles[g.loc];
    if (castle.owner !== clan) { g.loc = capital(s, clan)?.i ?? g.loc; continue; }
    const capLeft = mobilizeCap(s, clan) - farmTroops(s, clan);
    const affordable = c.food > R.NEW_ARMY_TROOPS * R.RECRUIT_COST + clanTroops(s, clan) * R.FOOD_PER_SOLDIER * 3;
    if (capLeft >= 1500 && affordable) {
      if (!foreign) { formCamp(s, clan, castle, g.id, Math.min(R.NEW_ARMY_TROOPS + 500, capLeft)); continue; } // 名簿として
      // 城か、城に隣接する自領の空きヘックスで編成
      const spot = [castle.hex, ...NEIGHBORS[castle.hex].filter((j) => s.castles[HEXES[j].d]?.owner === clan)].find((h) => !occ.has(h));
      if (spot !== undefined) {
        const a = formArmy(s, clan, castle, g.id, Math.min(R.NEW_ARMY_TROOPS + 500, capLeft), spot);
        if (a) { occ.set(a.hex, a); continue; }
      }
    }
    const here = occ.get(castle.hex);
    if (here && here.clan === clan && attachAuto(s, here, g)) continue;
    const roster = campsAt(s, castle.i).find((a) => a.clan === clan);
    if (roster && attachAuto(s, roster, g)) { afterCampEdit(s, roster); continue; }
    if (!castle.governor) { castle.governor = g.id; g.status = 'governor'; }
  }
}

export function localPower(s: GameState, a: Army, hex: number): number {
  let t = 0;
  for (const o of Object.values(s.armies)) if (o.clan === a.clan && o.id !== a.id && hexDist(o.hex, hex) <= 3) t += o.troops * o.morale;
  return t;
}

export function decideStance(s: GameState, clan: string) {
  const c = s.clans[clan];
  // 唐入り: 明は攻める。朝鮮は明が来るまで守り、来てからは攻めに転じる
  if (c.foreign) { c.target = s.player; c.stance = clan === 'ming' || s.clans.ming?.alive ? '攻勢' : '守勢'; return; }
  const power = (id: string) => clanArmies(s, id).reduce((t, a) => t + a.troops * a.morale, 0) + campsOf(s, id).reduce((t, a) => t + a.troops * a.morale * 0.8, 0) + clanCastles(s, id).reduce((t, k) => t + k.garrison * 0.5, 0);
  const own = power(clan);
  // 隣接勢力（自城から4ヘックス以内に城を持つ）
  const d = graphDistances(clanCastles(s, clan).map((k) => k.hex));
  const neighbors = new Set<string>();
  let neutralNear = false;
  for (const k of s.castles) if (hostile(s, clan, k.owner) && d[k.hex] <= 4) { if (k.owner) neighbors.add(k.owner); else neutralNear = true; }
  let target: string | null = null, best = Infinity;
  for (const n of neighbors) {
    const p = power(n);
    // 官位の高い家は狙いにくい
    const sc = p / (own + 1) / (1 + clanCastles(s, n).reduce((t, k) => t + castleKoku(k), 0) / 400) / (1 - deterOf(s, n)) / (s.clans[n].usurp ? R.USURP_TARGET : 1) * (meibun(s, clan, n).ok ? 0.75 : 1) * (n === shogunClan(s) ? 4 : 1); // 僭称した家・名分のある家を狙い、将軍家は避ける
    if (sc < best) { best = sc; target = n; }
  }
  c.target = target;
  // 自城周辺の敵兵力
  let threat = 0;
  const counted = new Set<number>();
  for (const k of clanCastles(s, clan)) for (const a of Object.values(s.armies)) {
    if (hostile(s, clan, a.clan) && !counted.has(a.id) && hexDist(a.hex, k.hex) <= 3) { counted.add(a.id); threat += a.troops * a.morale; }
  }
  const localOwn = clanArmies(s, clan).reduce((t, a) => t + a.troops * a.morale, 0);
  if (threat > localOwn * 1.5) c.stance = '守勢';
  else if ((target && own >= power(target) * 1.2) || (!target && neutralNear)) c.stance = '攻勢';
  else c.stance = '均衡';
  // 1年以上戦がなく、主攻勢力と互角以上なら攻勢に転じる（膠着の打開）
  if (c.stance === '均衡' && target && s.turn - (c.lastWar ?? 0) >= 12 && own >= power(target) * 0.8) c.stance = '攻勢';
}

// 方面軍団などから使うときの絞り込み: allow で攻めてよい目標、noise で見込みの読み違い（知略の低い大将ほど大きい）
export interface AttackOpts { allow?: (t: Target) => boolean; noise?: number }
export async function tryAttack(s: GameState, a: Army, o: AttackOpts = {}): Promise<boolean> {
  const d = R.DIFFICULTY[s.difficulty];
  const opts = attackTargets(s, a).filter((t) => !o.allow || o.allow(t));
  let best: { t: Target; est: number; score: number } | null = null;
  for (const t of opts) {
    const est = estimate(s, a, t, false, d.estimateBias) + (o.noise ? (rand(s) - 0.5) * 2 * o.noise : 0);
    let score = est;
    if (t.kind === 'castle') score += 0.05 + castleKoku(s.castles[t.castle]) / 200;
    const c = castleAt(s, t.hex);
    if (t.kind === 'army' && c && c.owner !== a.clan) score += 0.02;
    if (ordersAt(s, t.hex, a.clan).length) score += 0.15; // 味方が出陣を命じた目標へ合流する
    if (!best || score > best.score) best = { t, est, score };
  }
  // 攻勢中の膠着打開・兵糧の余力があれば多少の不利も受け入れる
  const clan = s.clans[a.clan];
  let thr = d.attackThreshold;
  if (clan.stance === '攻勢' && s.turn - (clan.lastWar ?? 0) >= 4) thr -= 0.05;
  if (s.turn - (clan.lastWar ?? 0) >= 12) thr -= 0.05;
  if (clan.food > clanTroops(s, a.clan) * R.FOOD_PER_SOLDIER * 18) thr -= 0.03;
  // 圧倒的な国力差があれば消耗戦を受け入れる（隘路の打開）
  const defClan = best ? (best.t.kind === 'army' ? best.t.army.clan : s.castles[best.t.castle].owner) : null;
  if (defClan && clanTroops(s, a.clan) >= 2 * clanTroops(s, defClan)) thr = Math.min(thr, 0.38);
  if (best && ordersAt(s, best.t.hex, a.clan).length) thr = Math.min(thr, 0.35); // 合流なら低い見込みでも加わる
  if (best && isCrossing(a.hex, best.t.hex)) thr = Math.min(thr, 0.38); // 唐入り: 海を渡って攻める（陣触の勢い）
  if (defClan) thr += deterOf(s, defClan) * R.DETER_THRESHOLD; // 官位の高い家には慎重になる
  if (defClan && best && !meibun(s, a.clan, defClan, best.t.hex).ok) thr += R.MEIBUN_AI; // 名分がなければ慎重に
  if (defClan && defClan === shogunClan(s)) thr += R.SHOGUN_AI; // 将軍家に弓を引くのはなおさら
  if (!best || best.est < thr) return false;
  orderAttack(s, a, best.t.hex, false); // 開戦は手番の終わり
  return true;
}

// 総攻撃: 同じ目標に隣接する未行動の軍団を合算し、見込みが立てば全員に出陣を命じる
export function groupAssault(s: GameState, clan: string, only?: Army[], o: AttackOpts = {}) {
  const d = R.DIFFICULTY[s.difficulty];
  const C = s.clans[clan];
  const ready = (only ?? clanArmies(s, clan)).filter((a) => s.armies[a.id] && !a.acted && !a.routed && a.troops >= d.rotation * a.departTroops && a.morale >= 0.8);
  const byTarget = new Map<number, { t: Target; armies: Army[] }>();
  for (const a of ready) for (const t of attackTargets(s, a).filter((x) => !o.allow || o.allow(x))) {
    const e = byTarget.get(t.hex) ?? { t, armies: [] };
    e.armies.push(a); byTarget.set(t.hex, e);
  }
  const baseThr = d.attackThreshold - (s.turn - (C.lastWar ?? 0) >= 12 ? 0.05 : 0);
  // 国力差が大きければ消耗戦を受け入れる（2倍で0.38、3倍で0.3まで）
  const thrFor = (t: Target) => {
    const dc = t.kind === 'army' ? t.army.clan : s.castles[t.castle].owner;
    if (!dc) return baseThr;
    const ratio = clanTroops(s, clan) / Math.max(1, clanTroops(s, dc));
    const thr = ratio >= 3 ? Math.min(baseThr, 0.3) : ratio >= 2 ? Math.min(baseThr, 0.38) : baseThr;
    return thr + deterOf(s, dc) * R.DETER_THRESHOLD + (meibun(s, clan, dc, t.hex).ok ? 0 : R.MEIBUN_AI) + (dc === shogunClan(s) ? R.SHOGUN_AI : 0); // 官位の高い家・名分のない戦・将軍家には慎重になる
  };
  const plans = [...byTarget.values()]
    .map((p) => ({ ...p, already: ordersAt(s, p.t.hex, clan).map((o) => s.armies[o.army]).filter(Boolean) as Army[] }))
    .map((p) => ({ ...p, est: groupEstimate(s, [...p.armies, ...p.already].sort((x, y) => y.troops - x.troops), p.t, d.estimateBias) + (o.noise ? (rand(s) - 0.5) * 2 * o.noise : 0) }))
    .filter((p) => p.est >= thrFor(p.t))
    .sort((x, y) => y.est + (y.t.kind === 'castle' ? 0.1 : 0) - (x.est + (x.t.kind === 'castle' ? 0.1 : 0)));
  for (const p of plans) {
    const free = p.armies.filter((a) => !a.acted);
    if (!free.length) continue;
    for (const a of free) orderAttack(s, a, p.t.hex, false);
  }
}

export function chooseGoal(s: GameState, a: Army, stance: string, net: SupplyNet = supplyNet(s, a.clan)): number | null {
  const d = R.DIFFICULTY[s.difficulty];
  const own = clanCastles(s, a.clan);
  if (!own.length) return null;
  const dist = graphDistances([a.hex]);
  // 補給が届かず小荷駄も残り少なければ、補給の届く所（最寄りの自城）へ戻る
  if (!isSupplied(s, a, net) && carryOf(a) <= 0.5) return own.reduce((b, c) => (dist[c.hex] < dist[b.hex] ? c : b)).hex;
  // 70%ローテーション・士気低下 → 最寄りの自城へ
  if (a.routed || a.troops < d.rotation * a.departTroops || a.morale < 0.75) {
    return own.reduce((b, c) => (dist[c.hex] < dist[b.hex] ? c : b)).hex;
  }
  // 脅威を受けている自城の防衛
  const threatened = own
    .map((c) => ({ c, t: enemyNear(s, a.clan, c.hex, 2) }))
    .filter((x) => x.t > 0 && dist[x.c.hex] <= 6)
    .sort((x, y) => y.t / (dist[y.c.hex] + 1) - x.t / (dist[x.c.hex] + 1));
  if (stance === '守勢' && threatened.length) return threatened[0].c.hex;
  // 兵が少なく周囲が平穏なら自城で補充
  // （動員上限に達していれば補充されないので戻らない）
  const capLeft = mobilizeCap(s, a.clan) - clanTroops(s, a.clan);
  if (capLeft >= 1000 && a.troops < 0.6 * maxTroops(s, a) && enemyNear(s, a.clan, a.hex, 4) === 0 && s.clans[a.clan].food > 20000) {
    return own.reduce((b, c) => (dist[c.hex] < dist[b.hex] ? c : b)).hex;
  }

  // 攻略目標: 近くの敵城を価値/抵抗/距離で評価
  let best: number | null = null, bs = -Infinity;
  for (const c of s.castles) {
    if (!hostile(s, a.clan, c.owner)) continue;
    const dd = dist[c.hex];
    if (dd > (stance === '攻勢' ? 10 : 6)) continue;
    // 補給の届かない城は狙わない（すぐ隣なら別）
    if (dd > 1 && !net.cost.has(c.hex) && !NEIGHBORS[c.hex].some((j) => net.cost.has(j))) continue;
    const resist = c.garrison * castleDef(c) + enemyNear(s, a.clan, c.hex, 2) * 1.2 + 300;
    const power = a.troops * a.morale + localPower(s, a, c.hex) * 0.5;
    if (stance === '均衡' && resist > power * 1.1) continue;
    const focus = c.owner === s.clans[a.clan].target ? 2 : c.owner === null ? 1.5 : 1;
    if (stance === '均衡' && focus === 1 && resist > power * 0.9) continue;
    const sc = (focus * (castleKoku(c) + 3) * Math.min(2, power / resist)) / (1 + dd / 3);
    if (sc > bs) { bs = sc; best = c.hex; }
  }
  if (best !== null) return best;
  if (threatened.length) return threatened[0].c.hex;
  // 前線へ集結: 最寄りの敵城（主攻勢力を優先）へ向かう
  if (stance !== '守勢') {
    const tgt = s.clans[a.clan].target;
    let near: number | null = null, nd = Infinity;
    for (const c of s.castles) {
      if (!hostile(s, a.clan, c.owner) || dist[c.hex] === Infinity) continue;
      const dd = dist[c.hex] * (c.owner === tgt ? 0.7 : 1);
      if (dd < nd) { nd = dd; near = c.hex; }
    }
    return near;
  }
  return null;
}

export function moveToward(s: GameState, a: Army, goal: number) {
  const d = R.DIFFICULTY[s.difficulty];
  const reach = reachable(s, a);
  if (!reach.cost.size) return;
  const gd = graphDistances([goal]);
  const occ = occupancy(s);
  const myPower = a.troops * a.morale;
  const retreating = a.routed || a.troops < d.rotation * a.departTroops;
  let best: number | null = null;
  let bs = gd[a.hex] * 10 - (castleAt(s, a.hex)?.owner === a.clan ? 3 : 0);
  for (const [h] of reach.cost) {
    let sc = gd[h] * 10;
    let danger = 0;
    for (const j of NEIGHBORS[h]) {
      if (isCrossing(h, j)) continue; // 海峡の向こうの敵は渡ってこられない
      const o = occ.get(j);
      if (!o || !hostile(s, a.clan, o.clan)) continue;
      danger += o.troops * o.morale;
      if (!retreating) {
        // 包囲の穴埋め: すでに自軍が隣接している敵へ寄せる
        const allies = NEIGHBORS[o.hex].filter((k) => { const x = occ.get(k); return x && x.clan === a.clan && x.id !== a.id; }).length;
        sc -= (d.surroundWeight / 10) * allies;
      }
    }
    if (danger > myPower * 1.2) sc += retreating ? 80 : 40;
    const c = castleAt(s, h);
    if (c && c.owner === a.clan) sc -= 3;
    if (c && c.owner !== a.clan && c.garrison <= 0) sc -= 30; // 無守備の城
    if (sc < bs) { bs = sc; best = h; }
  }
  if (best !== null) moveArmy(s, a, best, reach.cost.get(best)!);
}

export async function runClanAI(s: GameState, clan: string) {
  if (!s.clans[clan].alive) return;
  organize(s, clan);
  decideStance(s, clan);
  const stance = s.clans[clan].stance;
  // 陣触・陣払い（攻勢なら狙う家の城の近くに陣触、迫られれば急ぎの陣触、平時は陣払い）
  { const C = s.clans[clan];
    // 攻勢に転じた月を覚え、しばらく様子を見てから攻めの陣触を出す（ゲームの始まりの数か月も平時のまま）
    if (stance === '攻勢') C.offensiveSince ??= s.turn; else C.offensiveSince = undefined;
    const ready = stance === '攻勢' && s.turn - (C.offensiveSince ?? s.turn) >= AUTO.WAIT && s.turn > AUTO.GRACE;
    autoJinbure(s, clan, { policy: ready ? 'attack' : 'defend', camps: campsOf(s, clan), field: clanArmies(s, clan).filter((a) => !a.ikki && a.front === undefined), targetHexes: C.target ? clanCastles(s, C.target).map((k) => k.hex) : [] }); }
  const armies = clanArmies(s, clan).filter((a) => !a.ikki).sort((x, y) => y.troops - x.troops);
  const d = R.DIFFICULTY[s.difficulty];
  aiIkki(s, clan);
  ikkiOrders(s, clan);
  // 唐入り: 対馬・壱岐・海の向こうで隣り合う小さな隊をまとめる（面目・不仲の障りがなければ）
  if (s.karairi?.active && !s.clans[clan].foreign) aiMerge(s, clan, (h) => isForeignHex(h) || STAGE.has(PROVINCES[HEXES[h].p]?.id ?? ''));
  const net = supplyNet(s, clan);
  for (const a of armies) {
    if (!s.armies[a.id] || s.over) continue;
    if (!a.routed && a.troops >= d.rotation * a.departTroops && (await tryAttack(s, a))) continue;
    // 自城の籠城: 敵が隣接し、城にいるなら動かない
    const here = castleAt(s, a.hex);
    if (here && here.owner === clan && enemyNear(s, clan, a.hex, 1) > a.troops * a.morale * 0.5) continue;
    // 城確保: 城兵が半減している自城に敵が迫っていれば守備に残る
    if (here && here.owner === clan && here.garrison < garrisonMax(here) * 0.5 && enemyNear(s, clan, a.hex, 3) > 0) continue;
    const goal = chooseGoal(s, a, stance, net);
    if (goal !== null && goal !== a.hex) moveToward(s, a, goal);
    if (s.armies[a.id] && !a.acted && !a.routed) await tryAttack(s, a);
  }
  groupAssault(s, clan);
  // 手番の終わりに、命令を出した目標ごとにまとめて開戦
  await resolveOrders(s, clan);
}
