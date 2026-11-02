// 月末処理: 兵站・士気・補充・城兵・内政・収穫
import { kyoExtraFood } from './bushi';
import { fiefCapacity, fiefFarm, frontReinforce, frontsOf } from './fronts';
import { clanCannon } from './nanban';
import { NEIGHBORS } from './map';
import * as R from './rules';
import { removeArmy } from './ops';
import { bugyoCoef } from './ranks';
import { clanGuns, clanIncome, hasProduct } from './money';
import { taxDef } from './invest';
import { chianDelta, spendBudget } from './policy';
import { monthIkki } from './ikki';
import { cutOff, harvestToEnclave, isSupplied, monthlySupply, storeOf } from './supply';
import { addLog, hostile, occupancy, castleAt, castleKoku, clanArmies, clanAshi, clanCapacity, mobilizeCap, clanCastles, drillOf, farmTroops, garrisonMax, hexOwner, initialMorale, maxTroops } from './state';
import type { Castle, GameState } from './types';
import { karairiOn, troopsLeft } from './karairi';
import { armyHas, CHIKUJO_REPAIR, govTrait, KENSEI_CAP, KENSEI_DRILL } from './traits';
import { isForeignHex } from './map';

export function besieged(s: GameState, c: Castle): boolean {
  const occ = occupancy(s);
  return NEIGHBORS[c.hex].some((j) => { const o = occ.get(j); return !!o && hostile(s, o.clan, c.owner); });
}

// 城の月ごとの開発度の伸び（包囲中は0、城主がいなければ半分）。role=com は商業
export function devRate(s: GameState, c: Castle, coef?: number, role: 'agri' | 'com' = 'agri'): number {
  const cur = role === 'agri' ? c.dev : c.cdev;
  if (!c.owner || besieged(s, c) || cur >= comCap(c, role)) return 0;
  const k = coef ?? bugyoCoef(s, c.owner, role).coef;
  return R.BUGYO_RATE * k * (c.governor ? 1 : R.NO_GOV_DEV) * taxDef(s, c.owner).grow * (role === 'com' && c.rakuichi !== undefined ? R.RAKUICHI_GROW : 1);
}
// 開発の上限（楽市楽座の城は商業の上限が上がる）
export const comCap = (c: Castle, role: 'agri' | 'com' = 'com') => R.devCap(c.chian) + (role === 'com' && c.rakuichi !== undefined ? R.RAKUICHI_CAP : 0);
// 楽市楽座を布く（当家の城。布いてから12か月は治安が下がる）
export function rakuichiBlock(s: GameState, c: Castle): string | null { if (c.owner !== s.player) return '当家の城ではない'; if (c.rakuichi !== undefined) return 'すでに布いている'; return null; }
export function enactRakuichi(s: GameState, c: Castle): boolean { if (rakuichiBlock(s, c)) return false; c.rakuichi = s.turn; addLog(s, `${c.name}の城下に楽市楽座を布いた。座を持つ寺社や商人は反発している。`, 'econ', true); return true; }

export function monthEnd(s: GameState) {
  // 兵がほとんど残っていない軍団は解散（武将は帰還）
  for (const a of Object.values(s.armies)) if (!Number.isFinite(a.troops) || a.troops < R.MIN_ARMY) removeArmy(s, a);
  for (const clan of Object.values(s.clans)) {
    if (!clan.alive) continue;
    const mine = clan.id === s.player;
    // 兵站: 補給下の部隊は家の蔵（飛び地は城の蔵）から食べ、補給切れは小荷駄を食べる。城の蔵も満たす（京の周りの軍勢は倍食う）
    const sup = monthlySupply(s, clan.id, kyoExtraFood(s, clan.id), (c) => cutOff(s, c));
    const starving = sup.starving;
    if (starving && mine) addLog(s, '兵糧が尽きた。全軍の士気が下がる。', 'econ', true);

    let capacityLeft = mobilizeCap(s, clan.id) - farmTroops(s, clan.id);
    // 当家の領（知行）は自分の城の分だけで補充し、直轄はそれを除いた分で
    const fiefLeft = new Map<number, number>();
    if (mine) for (const f of frontsOf(s)) if (!f.vacant) { const cap = fiefCapacity(s, f), used = fiefFarm(s, f); fiefLeft.set(f.id, cap - used); capacityLeft -= cap - used; }
    const farmSeason = R.FARM_MONTHS.includes(s.month);
    for (const a of clanArmies(s, clan.id)) {
      if (a.ikki) continue; // 一揆勢は補充も補給もない
      const supplied = isSupplied(s, a, sup.net);
      const c = castleAt(s, a.hex);
      const inOwnCastle = !!c && c.owner === clan.id;
      const cap = initialMorale(s, a);
      if (inOwnCastle) a.morale = Math.min(cap, a.morale + R.MORALE_RECOVER_CASTLE);
      else if (supplied) a.morale = Math.min(cap, a.morale + R.MORALE_RECOVER_SUPPLIED);
      else if (!a.monto) a.morale += R.MORALE_OUT_OF_SUPPLY; // 門徒結束: 自然減衰なし
      if (starving && !a.monto) a.morale += R.MORALE_STARVING;
      a.morale = Math.max(0.1, a.morale);
      if (a.routed && a.morale >= R.RETREAT_MORALE) a.routed = false;

      // 練度: 合戦を経れば伸び、自城か隣で過ごせば訓練で伸びる（上限は足軽の割合で決まる）
      const near = inOwnCastle || NEIGHBORS[a.hex].some((j) => castleAt(s, j)?.owner === clan.id);
      const staffBonus = Math.min(R.CORPS_DRILL_MAX, (a.staff?.length ?? 0) * R.CORPS_DRILL);
      const kensei = armyHas(s, a, 'kensei'); // 剣豪が傘下にいれば練度が伸びやすく、上限も上がる
      const gain = (a.fought === s.turn ? R.DRILL_BATTLE : near ? R.drillGain(s.generals[a.main].lea) + staffBonus : supplied ? R.DRILL_FIELD : 0) * (kensei ? KENSEI_DRILL : 1);
      a.drill = Math.min(R.drillCap(a.ashi ?? 0) + (kensei ? KENSEI_CAP : 0), drillOf(a) + gain);
      if (farmSeason && hexOwner(s, a.hex) !== clan.id) clan.farmAway = (clan.farmAway ?? 0) + Math.round(a.troops * (1 - (a.ashi ?? 0)));

      // 補充: 自城または自城に隣接し、補給下にある軍団
      const nearCastle = inOwnCastle || NEIGHBORS[a.hex].some((j) => { const cj = castleAt(s, j); return cj && cj.owner === clan.id; });
      const overSea = karairiOn(s) && a.clan === s.player && isForeignHex(a.hex); // 海の向こうの当家の軍勢へは、補充の兵も船で（今月の渡海の空きの分だけ）
      const fl = mine && a.front !== undefined ? fiefLeft.get(a.front) : undefined;
      if (nearCastle && supplied && (fl ?? capacityLeft) > 0 && (!overSea || troopsLeft(s) > 0)) {
        const want = Math.min(overSea ? Math.max(0, troopsLeft(s)) : Infinity, R.REINFORCE_BASE + s.generals[a.main].lea * 10 + frontReinforce(s, a), maxTroops(s, a) - a.troops, fl ?? capacityLeft, Math.floor(clan.food / R.RECRUIT_COST));
        if (want > 0) {
          // 新しく集めた農兵の分だけ練度と足軽の割合が薄まる
          a.drill = (drillOf(a) * a.troops + R.DRILL_RECRUIT * want) / (a.troops + want);
          a.ashi = ((a.ashi ?? 0) * a.troops) / (a.troops + want);
          a.troops += want; if (fl !== undefined) fiefLeft.set(a.front!, fl - want); else capacityLeft -= want; clan.food -= want * R.RECRUIT_COST;
          if (overSea) s.karairi!.reinforced = (s.karairi!.reinforced ?? 0) + want;
          if (inOwnCastle) a.departTroops = a.troops;
        }
      }
      if (a.guns) a.guns = Math.min(a.guns, a.troops);
      a.mp = R.MOVE_POINTS; a.acted = false;
      if (a.routed) a.mp = 2;
    }

    // 商業収入と鉄砲の維持費（払えなければ鉄砲が傷む）
    const income = clanIncome(s, clan.id);
    clan.gold += income;
    const gunCost = Math.round((clanGuns(s, clan.id) * R.GUN_UPKEEP + clanCannon(s, clan.id) * R.CANNON_UPKEEP) * (hasProduct(s, clan.id, 'powder') ? R.POWDER_UPKEEP : 1));
    if (clan.gold >= gunCost) clan.gold -= gunCost;
    else {
      clan.gold = 0;
      clan.guns = Math.floor(clan.guns * 0.95);
      for (const a of clanArmies(s, clan.id)) if (a.guns) a.guns = Math.floor(a.guns * 0.95);
      if (mine) addLog(s, '鉄砲の維持費が払えず、鉄砲の一部が使えなくなった。', 'econ', true);
    }
    // 足軽の給金（払えなければ1割が去る）
    const wage = Math.round(clanAshi(s, clan.id) * R.ASHI_WAGE);
    if (wage > 0) {
      if (clan.gold >= wage) clan.gold -= wage;
      else {
        clan.gold = 0;
        for (const a of clanArmies(s, clan.id)) if (a.ashi) { const ashi = a.troops * a.ashi * 0.9; a.troops = Math.round(a.troops - a.troops * a.ashi * 0.1); a.ashi = a.troops > 0 ? ashi / a.troops : 0; }
        if (mine) addLog(s, '足軽の給金が払えず、足軽の一部が去った。', 'econ', true);
      }
    }
    // 治水・施しの予算
    clan.lastBudget = spendBudget(s, clan, income);
    // 城兵回復と内政（奉行の係数で全城の開発が進む。治安が開発の上限を決める）
    const coef = bugyoCoef(s, clan.id).coef, ccoef = bugyoCoef(s, clan.id, 'com').coef;
    for (const c of clanCastles(s, clan.id)) {
      const sieged = besieged(s, c);
      c.chian = Math.max(0, Math.min(100, c.chian + chianDelta(s, clan, c, sieged, starving).total));
      const cap = R.devCap(c.chian);
      if (c.dev > cap) c.dev = Math.max(cap, c.dev - R.DEV_DECAY);
      const ccap = comCap(c);
      if (c.cdev > ccap) c.cdev = Math.max(ccap, c.cdev - R.DEV_DECAY);
      // 包囲中（敵軍が隣接）の城は城兵も城門も回復せず、士気も少ししか戻らない
      if (sieged) { c.gMorale = Math.min(1, c.gMorale + 0.1); continue; }
      c.garrison = Math.min(garrisonMax(c), Math.round(c.garrison + garrisonMax(c) * R.GARRISON_REGEN));
      c.gMorale = 1;
      if (c.gate !== undefined) c.gate = Math.min(1, c.gate + 0.2 * (govTrait(s, c) === 'chikujo' ? CHIKUJO_REPAIR : 1)); // 城門の修復（築城の城主なら倍）
      c.dev = Math.min(Math.max(c.dev, cap), c.dev + devRate(s, c, coef));
      c.cdev = Math.min(Math.max(c.cdev, ccap), c.cdev + devRate(s, c, ccoef, 'com'));
    }
    if (s.month === R.HARVEST_MONTH) {
      // 収穫 = 石高 × 治水の倍率
      // 農繁期に領外へ出陣していた農兵の分だけ減る
      const away = (clan.farmAway ?? 0) / R.FARM_MONTHS.length;
      const loss = Math.min(R.FARM_LOSS_MAX, (R.FARM_LOSS * away) / Math.max(1, clanCapacity(s, clan.id)));
      clan.farmAway = 0;
      // 海でもつながらない飛び地の城の収穫は、その城の蔵へ
      let harvest = 0, enclave = 0;
      for (const c of clanCastles(s, clan.id)) {
        const h = Math.round(castleKoku(c) * R.harvestMult(c.chisui) * R.HARVEST_RATE * (1 - loss) * taxDef(s, clan.id).income);
        if (harvestToEnclave(s, c, sup.net)) { c.store = storeOf(c) + h; enclave += h; } else harvest += h;
      }
      clan.food += harvest;
      if (mine && enclave) addLog(s, `飛び地の城の収穫 ${enclave.toLocaleString()} 石は、それぞれの城の蔵に入った。`, 'econ', true);
      if (mine) addLog(s, `収穫。兵糧 ${harvest.toLocaleString()} 石を得た。${loss >= 0.01 ? `（農繁期の出陣で${Math.round(loss * 100)}%減った）` : ''}`, 'econ', true);
    }
  }
  monthIkki(s, (a) => removeArmy(s, a));
  // 国人衆の城兵回復
  for (const c of s.castles) if (!c.owner && !besieged(s, c)) { c.garrison = Math.min(garrisonMax(c), Math.round(c.garrison + garrisonMax(c) * R.GARRISON_REGEN)); c.gMorale = 1; }
}
