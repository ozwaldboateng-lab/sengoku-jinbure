// 会戦解決（v1.1）
// 1か月の会戦を最大5ラウンドで解決する。損害は「相手の戦闘力」に比例（大軍ほど与える損害が大きく、受ける割合が小さい）。
import { HEXES, NEIGHBORS, hexDist } from './map';
import { awardBattle } from './ranks';
import { hasProduct, loseGuns } from './money';
import { ikkiCasualty } from './ikki';
import * as R from './rules';
import { captureCastle, captureGeneral, killGeneral, naioActive, removeArmy } from './ops';
import { membersOf } from './corps';
import { TRAITS } from '../data/traits';
import { castleDef, addLog, allied, armyCombat, armyStats, castleAt, clanName, gen, hexOwner, hostile, noteClash, occupancy, rand } from './state';
import type { Army, BattleReport, Castle, GameState } from './types';
import type { Target } from './move';
import type { Tactical } from './tactical';

interface Side { troops: number; morale: number; atk: number; def: number; rout: number; int: number; }
// 退却・壊乱の線は壊乱閾値の平均からの差でずらす
const retreatAt = (x: Side) => R.RETREAT_MORALE + (x.rout - R.ROUT_BASE);
const routAt = (x: Side) => R.ROUT_MORALE + (x.rout - R.ROUT_BASE);

const defMultAt = (s: GameState, hex: number, field = false) => { const c = castleAt(s, hex); return c && !field ? castleDef(c) : R.DEF_MULT[HEXES[hex].t]; };
// 野戦（自分の城の外で迎え撃つ）か: 守り手の軍団が自分の城のマスにいて、野戦を選んだとき
export const isFieldAtCastle = (t: Target) => t.kind === 'army' && t.stance === 'field';

// 目標に隣接する味方（同じ家の軍団と、同盟を結んだAIの軍団＝援軍）
export function supportArmies(s: GameState, a: Army, defHex: number, defClan: string | null = null): Army[] {
  const occ = occupancy(s);
  return NEIGHBORS[defHex].map((j) => occ.get(j)).filter((o): o is Army => !!o && o.id !== a.id && !o.routed
    && (o.clan === a.clan || (allied(s, o.clan, a.clan) && o.clan !== s.player && hostile(s, o.clan, defClan))));
}
// 守備ヘックスに隣接する守り手の味方（同じ家と、同盟を結んだAIの後詰め）
export function defenderSupports(s: GameState, defClan: string | null, defHex: number, atkClan: string, exclude: number | null): Army[] {
  if (!defClan) return [];
  const occ = occupancy(s);
  return NEIGHBORS[defHex].map((j) => occ.get(j)).filter((o): o is Army => !!o && o.id !== exclude && !o.routed
    && (o.clan === defClan || (allied(s, o.clan, defClan) && o.clan !== s.player && hostile(s, o.clan, atkClan))));
}

export function retreatHex(s: GameState, a: Army, fromHex: number): number | null {
  const occ = occupancy(s);
  let best: number | null = null, bs = -Infinity;
  for (const j of NEIGHBORS[a.hex]) {
    if (occ.has(j)) continue;
    const c = castleAt(s, j);
    if (c && c.owner !== a.clan) continue;
    const owner = hexOwner(s, j);
    let sc = owner === a.clan ? 3 : owner === null ? 0 : -1;
    sc -= 2 * NEIGHBORS[j].filter((k) => { const o = occ.get(k); return o && hostile(s, a.clan, o.clan); }).length;
    sc += hexDist(j, fromHex);
    if (c) sc += 2;
    if (sc > bs) { bs = sc; best = j; }
  }
  return best;
}

function attackMods(s: GameState, a: Army, defHex: number, charge: boolean): number {
  let m = charge ? (HEXES[defHex].t === 'P' && !castleAt(s, defHex) ? R.CHARGE_PLAIN : R.CHARGE_ROUGH) : 1;
  if (HEXES[defHex].t === 'R' && !castleAt(s, defHex)) m *= R.RIVER_ATTACK;
  if (HEXES[a.hex].t === 'M' && HEXES[defHex].t !== 'M') m *= R.HIGH_GROUND;
  return m;
}

function defenderSide(s: GameState, t: Target): { side: Side; garrisonSupport: number; castle: Castle | null; army: Army | null } {
  if (t.kind === 'army') {
    const d = t.army;
    const c = castleAt(s, d.hex), field = t.stance === 'field';
    // 野戦なら城兵は城を守ったまま（打って出る分だけ半分の加勢）、城の崩れにくさもない
    const gs = c && c.owner === d.clan ? c.garrison * R.GARRISON_STATS.atk * c.gMorale * R.GARRISON_SUPPORT * (field ? R.FIELD_GARRISON : 1) : 0;
    const cb = armyCombat(s, d);
    const rout = cb.rout + (c && !field ? R.CASTLE_ROUT : HEXES[d.hex].t === 'R' ? R.WET_ROUT : 0);
    return { side: { troops: d.troops, morale: d.morale, atk: cb.atk, def: cb.def, rout, int: armyStats(s, d).int }, garrisonSupport: gs, castle: c, army: d };
  }
  const c = s.castles[t.castle];
  const G = R.GARRISON_STATS;
  return { side: { troops: c.garrison, morale: c.gMorale, atk: G.atk, def: G.def, rout: G.rout, int: 40 }, garrisonSupport: 0, castle: c, army: null };
}

// 意思決定用の推定比率（武将能力を使わない＝プレイヤーとAIが同じ情報で判断する）
export function estimate(s: GameState, a: Army, t: Target, charge: boolean, bias = 0): number {
  const def = defenderSide(s, t);
  const sup = supportArmies(s, a, t.hex, t.kind === 'army' ? t.army.clan : s.castles[t.castle].owner).reduce((x, o) => x + R.FLANK_SUPPORT * o.troops * o.morale, 0);
  const sa = a.troops * a.morale * attackMods(s, a, t.hex, charge) + sup;
  const defClan = t.kind === 'army' ? t.army.clan : s.castles[t.castle].owner;
  const dsup = defenderSupports(s, defClan, t.hex, a.clan, t.kind === 'army' ? t.army.id : null).reduce((x, o) => x + R.FLANK_SUPPORT * o.troops * o.morale, 0);
  const sd = def.side.troops * def.side.morale + def.garrisonSupport / R.GARRISON_STATS.atk + dsup;
  const ratio = sa / (sa + sd * defMultAt(s, t.hex, isFieldAtCastle(t)));
  return Math.min(1, ratio + bias);
}

// 複数の軍団でまとめて攻めたときの推定比率（AIの総攻撃判断用。武将能力は使わない）
export function groupEstimate(s: GameState, armies: Army[], t: Target, bias = 0): number {
  const def = defenderSide(s, t);
  const defClan = t.kind === 'army' ? t.army.clan : s.castles[t.castle].owner;
  const lead = armies[0];
  const allies = supportArmies(s, lead, t.hex, defClan).filter((o) => !armies.includes(o)).reduce((x, o) => x + R.FLANK_SUPPORT * o.troops * o.morale, 0);
  const sa = armies.reduce((x, a) => x + a.troops * a.morale * attackMods(s, a, t.hex, false), 0) + allies;
  const dsup = defenderSupports(s, defClan, t.hex, lead.clan, t.kind === 'army' ? t.army.id : null).reduce((x, o) => x + R.FLANK_SUPPORT * o.troops * o.morale, 0);
  const sd = def.side.troops * def.side.morale + def.garrisonSupport / R.GARRISON_STATS.atk + dsup;
  return Math.min(1, sa / (sa + sd * defMultAt(s, t.hex, isFieldAtCastle(t))) + bias);
}

export function battle(s: GameState, a: Army, t: Target, charge: boolean, joined: Army[] = []): BattleReport {
  const defHex = t.hex;
  const def = defenderSide(s, t);
  const D = def.side;
  const defClan = t.kind === 'army' ? t.army.clan : s.castles[t.castle].owner;
  // 出陣を命じた軍団はまとめて一つの攻め手になる（損害は兵数に応じて割り振る）
  const attackers = [a, ...joined.filter((x) => x.id !== a.id && s.armies[x.id] && x.troops > 0)];
  for (const x of attackers) x.fought = s.turn;
  if (t.kind === 'army') t.army.fought = s.turn;
  const startTroops = attackers.map((x) => x.troops);
  const idsA = attackers.flatMap((x) => membersOf(x));
  const govD = t.kind === 'castle' ? s.castles[t.castle].governor : null;
  const idsD = (t.kind === 'army' ? membersOf(t.army) : [govD]).filter((x): x is string => !!x);
  const totalT = startTroops.reduce((x, y) => x + y, 0) || 1;
  const wavg = (f: (x: Army) => number) => attackers.reduce((v, x) => v + f(x) * x.troops, 0) / totalT;
  const A: Side = {
    troops: totalT, morale: wavg((x) => x.morale), atk: wavg((x) => armyCombat(s, x).atk), def: wavg((x) => armyCombat(s, x).def),
    rout: wavg((x) => armyCombat(s, x).rout), int: Math.max(...attackers.map((x) => armyStats(s, x).int)),
  };
  const supports = supportArmies(s, a, defHex, defClan).filter((o) => !attackers.includes(o));
  const dSupports = defenderSupports(s, defClan, defHex, a.clan, t.kind === 'army' ? t.army.id : null);
  const dSupportPower = dSupports.reduce((x, o) => x + R.FLANK_SUPPORT * armyCombat(s, o).atk * o.morale * o.troops, 0);
  const events: string[] = [];
  if (t.kind === 'army' && t.stance) events.push(t.stance === 'field' ? `${s.generals[t.army.main].name}隊は城を出て野戦で迎え撃った` : `${s.generals[t.army.main].name}隊は城に籠もった`);
  const occ = occupancy(s);

  // 側面・包囲による士気低下
  if (t.kind === 'army') {
    const hostileAdj = NEIGHBORS[defHex].filter((j) => { const o = occ.get(j); return o && o.clan !== defClan; }).length;
    const noRetreat = retreatHex(s, t.army, a.hex) === null;
    if (hostileAdj >= 4 || noRetreat) { D.morale += R.MORALE_SURROUND; events.push('包囲された'); }
    else if (supports.length || attackers.length > 1) { D.morale += R.MORALE_FLANK; events.push('側面を突かれた'); }
  }

  // 内応（調略）: 城兵が動揺
  const cas = castleAt(s, defHex);
  if (cas && naioActive(s, cas, a.clan)) { D.morale -= R.NAIO_MORALE; events.push('内応者が城門を開いた'); cas.naio = undefined; }
  // 忍び: 攻め手に忍びがいれば、知略によらず火計を使い、石垣を越えて城門を内から開けることがある（城方に忍びがいれば防がれやすい）
  const ninjaA = !!cas && idsA.some((id) => TRAITS[id] === 'ninja');
  const ninjaD = idsD.some((id) => TRAITS[id] === 'ninja') ? R.NINJA_COUNTER : 0;
  const autoFire = !!cas && (A.int >= R.AUTO_FIRE_INT || (ninjaA && rand(s) >= ninjaD));
  if (ninjaA && rand(s) < R.NINJA_SNEAK - ninjaD) { D.morale -= R.NINJA_SNEAK_MORALE; events.push('忍びが石垣を越えて城門を内から開けた'); }
  const cannon = cas ? attackers.reduce((x, o) => x + (o.cannon ?? 0), 0) : 0;
  const defMult0 = defMultAt(s, defHex, isFieldAtCastle(t));
  const defMult = cannon ? 1 + (defMult0 - 1) * Math.max(0.4, 1 - R.CANNON_DEF * cannon) : defMult0;
  if (cannon) { D.morale -= Math.min(0.2, R.CANNON_MORALE * cannon); events.push(`大筒${cannon}門で城を撃った`); }
  const inCastle = !!castleAt(s, defHex);
  const dCap = inCastle ? R.ROUND_LOSS_CAP_CASTLE : R.ROUND_LOSS_CAP;
  const dMoraleK = R.MORALE_LOSS_PER_LOSS * (inCastle ? R.CASTLE_MORALE_RESIST : 1);
  const mods = attackMods(s, a, defHex, charge);
  const report: BattleReport = {
    turn: s.turn, attackerClan: a.clan, defenderClan: defClan,
    attackerName: s.generals[a.main].name + (attackers.length > 1 ? `ほか${attackers.length - 1}隊` : ''),
    defenderName: t.kind === 'army' ? s.generals[t.army.main].name : `${s.castles[t.castle].name}城兵`,
    hex: defHex, aStart: A.troops, dStart: D.troops, aEnd: 0, dEnd: 0, rounds: [], outcome: '', events, charge,
  };

  for (let r = 0; r < R.ROUNDS; r++) {
    let sa = A.atk * A.morale * A.troops * mods + supports.reduce((x, o) => x + R.FLANK_SUPPORT * armyCombat(s, o).atk * o.morale * o.troops, 0);
    let sd = D.atk * D.morale * D.troops + def.garrisonSupport + dSupportPower;
    let note: string | undefined;
    if (r === 0 && A.int - D.int >= R.RUSE_GAP) { sa *= R.RUSE_BONUS; note = '攻撃側の計略が決まる'; }
    if (r === 0 && autoFire) { sa *= R.AUTO_FIRE_BONUS; note = (note ? note + '・' : '') + '火計で城内が燃える'; }
    if (r === 0 && D.int - A.int >= R.RUSE_GAP) { sd *= R.RUSE_BONUS; note = '守備側の伏兵が決まる'; }
    // 合ごとの振れ幅 ±15%
    sa *= 0.85 + rand(s) * 0.3; sd *= 0.85 + rand(s) * 0.3;
    const dLoss = Math.round(Math.min(D.troops * dCap, (R.DAMAGE_K * sa) / (defMult * D.def)));
    const aLoss = Math.round(Math.min(A.troops * R.ROUND_LOSS_CAP, (R.DAMAGE_K * sd * (charge ? (hasProduct(s, a.clan, 'horse') ? R.HORSE_CHARGE_SELF : R.CHARGE_SELF_LOSS) : 1)) / A.def));
    const aFrac = A.troops ? aLoss / A.troops : 1, dFrac = D.troops ? dLoss / D.troops : 1;
    A.troops -= aLoss; D.troops -= dLoss;
    const ratio = sa / (sa + sd);
    A.morale -= aFrac * R.MORALE_LOSS_PER_LOSS + (ratio < 0.4 ? R.MORALE_WEAK_SIDE : 0);
    D.morale -= dFrac * dMoraleK + (ratio > 0.6 ? R.MORALE_WEAK_SIDE : 0);
    report.rounds.push({ aLoss, dLoss, aMorale: A.morale, dMorale: D.morale, note });
    if (A.morale < retreatAt(A) || D.morale < retreatAt(D) || D.troops <= 0 || A.troops <= 0) break;
  }
  A.morale = Math.max(0, A.morale); D.morale = Math.max(0, D.morale);
  A.troops = Math.max(0, A.troops); D.troops = Math.max(0, D.troops);

  // 兵がほとんど残らない守備軍団は四散扱い
  if (t.kind === 'army' && D.troops > 0 && D.troops < R.MIN_ARMY) { events.push(`${s.generals[t.army.main].name}隊は兵が尽きて四散`); D.troops = 0; }
  const dBroke = D.troops <= 0 || D.morale < retreatAt(D);
  const aBroke = A.troops <= 0 || A.morale < retreatAt(A);
  const attackerWon = dBroke && !aBroke;
  const defenderWon = aBroke && !dBroke;
  if (!dBroke) D.morale += attackerWon ? 0 : R.MORALE_WIN;

  // 交戦で敵武将の能力を公開
  if (a.clan === s.player && t.kind === 'army') for (const id of membersOf(t.army)) if (!s.revealed.includes(id)) s.revealed.push(id);
  if (defClan === s.player) for (const x of attackers) for (const id of membersOf(x)) if (!s.revealed.includes(id)) s.revealed.push(id);
  if (supports.length) events.push(`援軍${supports.length}隊`);
  if (dSupports.length) events.push(`後詰め${dSupports.length}隊`);

  // 攻撃側の反映
  noteClash(s, a.clan, defClan);
  s.clans[a.clan].lastWar = s.turn;
  attackers.forEach((x, k) => {
    x.troops = Math.round((A.troops * startTroops[k]) / totalT);
    loseGuns(x, startTroops[k]);
    ikkiCasualty(s, x, startTroops[k] - x.troops);
    x.morale = A.morale; x.acted = true; x.mp = 0;
  });
  // 兵がほとんど残らない軍団は解散（武将は帰還）
  for (const x of attackers) if (s.armies[x.id] && x.troops > 0 && x.troops < R.MIN_ARMY) { events.push(`${s.generals[x.main].name}隊は兵が尽きて解散`); removeArmy(s, x); }

  // 討死判定（主将）
  const deathCheck = (army: Army, isAttacker: boolean) => {
    if (!s.armies[army.id] || army.ikki) return;
    const enemyAdj = NEIGHBORS[army.hex].filter((j) => { const o = occupancy(s).get(j); return o && o.clan !== army.clan; }).length;
    let p = isAttacker && charge ? R.DEATH_CHARGE : R.DEATH_BASE;
    if (army.morale < R.RETREAT_MORALE) p *= R.DEATH_LOW_MORALE;
    if (enemyAdj >= 2) p *= R.DEATH_ADJ2;
    if (rand(s) < p) {
      const g = s.generals[army.main], guard = guardOf(s, army);
      if (guard && rand(s) < KENSEI_GUARD) { events.push(guardLine(guard, g)); addLog(s, `${guardLine(guard, g)}。`, 'battle', army.clan === s.player); return; }
      events.push(`${g.name}討死`);
      killGeneral(s, g, '討死');
      if (s.armies[army.id]) {
        army.morale = 0.2; army.routed = true;
        events.push(`${s.generals[army.main].name}が指揮を継ぐも隊は壊乱`);
      } else events.push('隊は四散した');
    }
  };

  // 撃破・退却処理
  const resolveBroken = (army: Army, enemyClan: string | null, fromHex: number, side: Side) => {
    if (side.troops <= 0) { destroyArmy(s, army, enemyClan, events); return; }
    if (side.morale < routAt(side)) {
      army.troops = Math.round(army.troops * (1 - R.ROUT_EXTRA_LOSS));
      army.routed = true;
      events.push(`${s.generals[army.main].name}隊壊乱`);
    }
    const to = retreatHex(s, army, fromHex);
    if (to === null) { events.push(`${s.generals[army.main].name}隊は退路を断たれた`); destroyArmy(s, army, enemyClan, events); return; }
    army.hex = to; army.mp = 0;
    if (army.routed && enemyClan && !army.ikki && rand(s) < R.ROUTED_CAPTURE) {
      const g = s.generals[army.main];
      events.push(`${g.name}捕縛`);
      captureGeneral(s, g, enemyClan);
    }
  };

  if (t.kind === 'army') {
    const d = t.army;
    const dBefore = d.troops;
    d.troops = D.troops; d.morale = D.morale;
    loseGuns(d, dBefore);
    ikkiCasualty(s, d, dBefore - d.troops);
    deathCheck(a, true);
    deathCheck(d, false);
    if (s.armies[d.id] && dBroke && isFieldAtCastle(t) && D.troops > 0 && castleAt(s, d.hex)?.owner === d.clan) {
      // 野戦に敗れたら、城へ退いて籠城する（敗走で兵は減るが、城を捨てはしない）
      if (D.morale < routAt(D)) d.troops = Math.round(d.troops * (1 - R.ROUT_EXTRA_LOSS));
      d.morale = Math.max(d.morale, R.ROJO_MORALE); d.routed = false; d.rojo = s.turn;
      events.push(`${s.generals[d.main].name}隊は城へ退いて籠城した`);
    } else if (s.armies[d.id] && dBroke) resolveBroken(d, a.clan, a.hex, D);
    for (const x of attackers) {
      if (!s.armies[x.id]) continue;
      if (A.morale < routAt(A)) resolveBroken(x, d.clan, defHex, { ...A, troops: x.troops });
      else if (x.troops <= 0) destroyArmy(s, x, d.clan, events);
    }
  } else {
    const c = s.castles[t.castle];
    c.garrison = D.troops; c.gMorale = Math.max(0.2, D.morale);
    deathCheck(a, true);
    for (const x of attackers) {
      if (!s.armies[x.id]) continue;
      if (x.troops <= 0) destroyArmy(s, x, c.owner, events);
      else if (A.morale < routAt(A)) resolveBroken(x, c.owner, defHex, { ...A, troops: x.troops });
    }
    const taker = attackers.find((x) => s.armies[x.id] && !x.routed);
    if (dBroke && taker && !aBroke && !occupancy(s).has(c.hex)) {
      c.garrison = 0;
      taker.hex = c.hex;
      captureCastle(s, c, a.clan);
      events.push(`${c.name}落城`);
    }
  }

  report.aEnd = A.troops; report.dEnd = D.troops;
  report.outcome = attackerWon ? '攻撃側の勝利' : defenderWon ? '守備側の勝利' : dBroke && aBroke ? '両軍退く' : '決着つかず';

  // 威信
  const big = report.aStart >= R.BIG_BATTLE_TROOPS && report.dStart >= R.BIG_BATTLE_TROOPS;
  const winner = attackerWon ? a.clan : defenderWon ? defClan : null;
  const loser = attackerWon ? defClan : defenderWon ? a.clan : null;
  if (winner && s.clans[winner]) s.clans[winner].prestige = Math.min(100, s.clans[winner].prestige + (big ? R.PRESTIGE_BIG_WIN : R.PRESTIGE_SMALL));
  if (loser && s.clans[loser]) s.clans[loser].prestige = Math.max(0, s.clans[loser].prestige + (big ? R.PRESTIGE_BIG_LOSS : -R.PRESTIGE_SMALL));

  awardBattle(s, [a.clan, defClan], winner, t.kind === 'castle' && s.castles[t.castle].owner === a.clan, [idsA, idsD]);

  const mine = a.clan === s.player || defClan === s.player;
  addLog(s, `${clanName(s, a.clan)}・${report.attackerName}${charge ? '（突撃）' : ''} → ${clanName(s, defClan)}・${report.defenderName}：${report.outcome}（損害 ${report.aStart - report.aEnd} / ${report.dStart - report.dEnd}）${events.length ? '　' + events.join('、') : ''}`, 'battle', mine);
  if (mine) s.reports.push(report);
  return report;
}

// 剣豪の守り: 同じ軍団に剣豪がいれば、主将の討死・捕縛を半分にする（主将本人が剣豪なら自分の身を守る）
const KENSEI_GUARD = 0.5;
function guardOf(s: GameState, a: Army) {
  const ids = membersOf(a);
  const id = TRAITS[a.main] === 'kensei' ? a.main : ids.find((x) => x !== a.main && TRAITS[x] === 'kensei' && s.generals[x]?.status !== 'dead');
  return id ? s.generals[id] : null;
}
const guardLine = (guard: { name: string; id: string }, g: { name: string; id: string }) => guard.id === g.id ? `${g.name}は自ら太刀をふるって斬り抜けた` : `${guard.name}が斬り込む敵を斬り払い、${g.name}を守った`;

export function destroyArmy(s: GameState, army: Army, enemyClan: string | null, events: string[]) {
  events.push(`${s.generals[army.main].name}隊壊滅`);
  const ids = membersOf(army), mainId = army.main, guard = guardOf(s, army);
  removeArmy(s, army);
  for (const id of ids) {
    const g = gen(s, id);
    if (!g || g.ikki || g.status === 'dead') continue;
    const r = rand(s);
    if (id === mainId && guard && guard.status !== 'dead' && r < R.DESTROYED_DEATH + (enemyClan ? R.DESTROYED_CAPTURE : 0) && rand(s) < KENSEI_GUARD) { events.push(guardLine(guard, g)); addLog(s, `${guardLine(guard, g)}。`, 'battle', g.clan === s.player); continue; } // 剣豪が主将を落ち延びさせる
    if (r < R.DESTROYED_DEATH) { events.push(`${g.name}討死`); killGeneral(s, g, '討死'); }
    else if (enemyClan && r < R.DESTROYED_DEATH + R.DESTROYED_CAPTURE) { events.push(`${g.name}捕縛`); captureGeneral(s, g, enemyClan); }
  }
}

// ───────── 合戦（戦術マップ）の結果を戦略マップへ反映 ─────────

export function applyTactical(s: GameState, t: Tactical): BattleReport {
  const events: string[] = [];
  const govT = t.castle !== null ? s.castles[t.castle].governor : null;
  if (t.reason) events.push(t.reason);
  const a0 = s.armies[t.primaryA];
  const attackerName = a0 ? s.generals[a0.main].name : '攻め手';
  const pd = t.primaryD !== null ? s.armies[t.primaryD] : null;
  const castle = t.castle !== null ? s.castles[t.castle] : null;
  const defenderName = pd ? s.generals[pd.main].name : castle ? `${castle.name}城兵` : '守り手';
  const sideSum = (side: 'A' | 'D', start: boolean) => t.units.filter((u) => u.side === side).reduce((x, u) => x + (start ? t.start[u.id] ?? 0 : u.troops), 0);

  // 交戦した武将の能力を公開
  for (const u of t.units) {
    if (!u.general && !t.deaths.includes(u.general ?? '')) continue;
    const clan = u.side === 'A' ? t.attackerClan : t.defenderClan;
    if (u.general && clan !== s.player && (t.attackerClan === s.player || t.defenderClan === s.player) && !s.revealed.includes(u.general)) s.revealed.push(u.general);
  }
  for (const u of t.units) {
    const id = u.army !== null ? (s.armies[u.army]?.main ?? null) : null;
    if (id && s.armies[u.army!].clan !== s.player && (t.attackerClan === s.player || t.defenderClan === s.player) && !s.revealed.includes(id)) s.revealed.push(id);
  }

  // 武将の討死・捕縛
  for (const id of t.deaths) { const g = s.generals[id]; if (g.status !== 'dead') { killGeneral(s, g, '討死'); events.push(`${g.name}討死`); } }
  for (const c of t.captures) { const g = s.generals[c.general]; if (g.status === 'army' || g.status === 'free') { captureGeneral(s, g, c.by); events.push(`${g.name}捕縛`); } }

  // 軍団の兵・士気・指揮官
  for (const id of [...t.armiesA, ...t.armiesD]) {
    const army = s.armies[id];
    if (!army) continue;
    army.fought = s.turn;
    const units = t.units.filter((u) => u.army === id);
    const troops = units.reduce((x, u) => x + u.troops, 0);
    ikkiCasualty(s, army, units.reduce((x, u) => x + (t.start[u.id] ?? 0), 0) - troops);
    const alive = units.filter((u) => u.troops > 0);
    army.troops = Math.round(troops);
    army.guns = units.filter((u) => u.role === 'gun').reduce((x, u) => x + Math.round(u.troops), 0);
    army.morale = alive.length ? Math.max(0.1, alive.reduce((x, u) => x + u.morale * u.troops, 0) / Math.max(1, troops)) : 0.1;
    army.routed = alive.length > 0 && alive.every((u) => u.routed);
    // 討死・捕縛した武将は軍団から抜けている（主将が抜ければ筆頭が継ぐ）。継ぐ者がいなければ軍団はもうない
    if (!s.armies[id]) continue;
    if (s.generals[army.main].status !== 'army') { removeArmy(s, army); continue; }
    if (army.troops < R.MIN_ARMY) { events.push(`${s.generals[army.main].name}隊${army.troops <= 0 ? '壊滅' : 'は兵が尽きて解散'}`); removeArmy(s, army); }
  }

  const attackerWon = t.over === 'A', defenderWon = t.over === 'D';
  const atkClan = t.attackerClan, defClan = t.defenderClan;
  const fallBack = (army: Army, enemy: string | null, from: number) => {
    const to = retreatHex(s, army, from);
    if (to === null) { events.push(`${s.generals[army.main].name}隊は退路を断たれた`); destroyArmy(s, army, enemy, events); return; }
    army.hex = to; army.mp = 0;
  };
  const fromHex = a0?.hex ?? t.hex;
  if (attackerWon) {
    for (const id of t.armiesD) {
      const d = s.armies[id];
      if (!d) continue;
      // 城の前の野戦に敗れたら、城へ退いて籠城する
      if (t.fieldCastle !== undefined && d.hex === t.hex && s.castles[t.fieldCastle].owner === d.clan) { d.morale = Math.max(d.morale, R.ROJO_MORALE); d.routed = false; d.rojo = s.turn; events.push(`${s.generals[d.main].name}隊は城へ退いて籠城した`); continue; }
      fallBack(d, atkClan, fromHex);
    }
  } else if (defenderWon) {
    for (const id of t.armiesA) { const x = s.armies[id]; if (x && (x.routed || id === t.primaryA)) fallBack(x, defClan, t.hex); }
  }
  if (castle) {
    if (castle.naioBy === atkClan) castle.naio = undefined; // 内応は一度きり
    const g = t.units.filter((u) => u.role === 'garrison');
    const gt = g.reduce((x, u) => x + u.troops, 0);
    castle.garrison = attackerWon ? 0 : Math.round(gt);
    const gv = Object.values(t.gates);
    castle.gate = attackerWon || !gv.length ? 1 : gv.reduce((x, v) => x + v, 0) / gv.length / Math.max(1, t.gateMax);
    castle.gMorale = g.length && gt > 0 ? Math.max(0.2, g.reduce((x, u) => x + u.morale * u.troops, 0) / gt) : 1;
    if (attackerWon) {
      const occ = occupancy(s);
      const taker = [t.primaryA, ...t.armiesA].map((id) => s.armies[id]).find((x) => x && !x.routed);
      if (taker && !occ.has(castle.hex)) { taker.hex = castle.hex; captureCastle(s, castle, taker.clan); events.push(`${castle.name}落城`); }
    }
  }
  // 城攻めが日没で決着しなければ、盤面を翌月へ持ち越す（包囲が続く）
  if (castle && t.kind === 'siege') {
    s.sieges ??= {};
    const stay = t.armiesA.filter((id) => s.armies[id]?.clan === atkClan && !s.armies[id].routed);
    if (t.over === 'draw' && stay.length && castle.owner === defClan && castle.garrison > 0) {
      const prev = s.sieges[castle.i];
      const months = (prev && prev.clan === atkClan ? prev.months : 0) + 1;
      s.sieges[castle.i] = { clan: atkClan, defender: defClan, armies: stay, months, since: prev?.since ?? s.turn, tac: JSON.parse(JSON.stringify({ ...t, log: [] })) };
      events.push(`包囲${months}か月目、来月も続く`);
    } else delete s.sieges[castle.i];
  }
  for (const id of t.armiesA) { const x = s.armies[id]; if (x) { x.acted = true; x.mp = 0; } }
  s.clans[atkClan].lastWar = s.turn;
  noteClash(s, atkClan, defClan);

  const report: BattleReport = {
    turn: s.turn, attackerClan: atkClan, defenderClan: defClan, attackerName, defenderName, hex: t.hex,
    aStart: sideSum('A', true), dStart: sideSum('D', true), aEnd: Math.round(sideSum('A', false)), dEnd: Math.round(sideSum('D', false)),
    rounds: [], outcome: attackerWon ? '攻撃側の勝利' : defenderWon ? '守備側の勝利' : '決着つかず', events, charge: false,
  };
  const big = report.aStart >= R.BIG_BATTLE_TROOPS && report.dStart >= R.BIG_BATTLE_TROOPS;
  const winner = attackerWon ? atkClan : defenderWon ? defClan : null;
  const loser = attackerWon ? defClan : defenderWon ? atkClan : null;
  if (winner && s.clans[winner]) s.clans[winner].prestige = Math.min(100, s.clans[winner].prestige + (big ? R.PRESTIGE_BIG_WIN : R.PRESTIGE_SMALL));
  if (loser && s.clans[loser]) s.clans[loser].prestige = Math.max(0, s.clans[loser].prestige + (big ? R.PRESTIGE_BIG_LOSS : -R.PRESTIGE_SMALL));
  // 功績は隊を率いた武将と、軍団の傘下の全員に
  const sideIds = (side: 'A' | 'D', clan: string | null) => {
    const us = t.units.filter((u) => u.side === side && u.clan === clan);
    const armies = [...new Set(us.map((u) => u.army).filter((x): x is number => x !== null))].map((id) => s.armies[id]).filter((x): x is Army => !!x);
    return [...new Set([...us.filter((u) => u.general).map((u) => u.general!), ...armies.flatMap((x) => membersOf(x))])];
  };
  awardBattle(s, [atkClan, defClan], winner, !!castle && castle.owner === atkClan, [sideIds('A', atkClan), [...sideIds('D', defClan), ...(govT ? [govT] : [])]]);
  addLog(s, `【${t.kind === 'siege' ? '攻城戦' : '野戦'}】${clanName(s, atkClan)}・${attackerName} → ${clanName(s, defClan)}・${defenderName}：${report.outcome}（損害 ${report.aStart - report.aEnd} / ${report.dStart - report.dEnd}）　${events.join('、')}`, 'battle', true);
  s.reports.push(report);
  return report;
}
