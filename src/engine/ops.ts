// 城の占領・勢力滅亡・武将の処遇など、状態を変える操作
import { onCastleTaken } from './bakufu';
import { bondIn, goodBondOf, rivalIn } from './bushi';
import { afterSuccession, heirOf } from './katoku';
import { onCaptured } from './shioki';
import { goodwill, initOn, onOf } from './on';
import { pushScene } from './lines';
import { graphDistances, HEXES, isForeignHex } from './map';
import * as R from './rules';
import { addLog, clanCastles, clanName, garrisonMax, hostile, initialMorale, occupancy, rand } from './state';
import { dropItems, seizeItems } from './money';
import { presOf } from './court';
import { dropIkkiLeader } from './ikki';
import { leaveArmy, membersOf } from './corps';
import type { Army, Castle, GameState, General } from './types';

export function nearestOwnCastle(s: GameState, clan: string, fromHex: number): Castle | null {
  const own = clanCastles(s, clan);
  if (!own.length) return null;
  const d = graphDistances([fromHex]);
  return own.reduce((b, c) => (d[c.hex] < d[b.hex] ? c : b));
}

export function capital(s: GameState, clan: string): Castle | null {
  const leader = s.clans[clan]?.leader;
  const own = clanCastles(s, clan);
  if (!own.length) return null;
  const lg = leader ? s.generals[leader] : null;
  return own.find((c) => lg && c.i === lg.loc) ?? own.reduce((b, c) => (c.baseKoku > b.baseKoku ? c : b));
}

function sendHome(s: GameState, g: General, fromHex: number) {
  const home = g.clan ? nearestOwnCastle(s, g.clan, fromHex) : null;
  g.army = null;
  if (home) { g.status = 'free'; g.loc = home.i; }
  else { g.status = 'ronin'; g.clan = null; }
}

export function removeArmy(s: GameState, a: Army) {
  if (a.ikki) { dropIkkiLeader(s, a); delete s.armies[a.id]; return; }
  for (const id of membersOf(a)) {
    const g = s.generals[id];
    if (!g) continue;
    if (g.army === a.id) { g.army = null; g.boss = undefined; }
    if (g.status === 'army') sendHome(s, g, a.hex);
  }
  delete s.armies[a.id];
}

export function succession(s: GameState, clanId: string) {
  const clan = s.clans[clanId];
  const prev = clan.leader ? s.generals[clan.leader] : null;
  const all = Object.values(s.generals).filter((g) => g.clan === clanId && !g.ikki && g.status !== 'dead' && g.status !== 'captive' && g.status !== 'ronin');
  if (!all.length) { eliminateClan(s, clanId, null); return; }
  // 跡継ぎ: 一門の子の世代（15歳以上年下）の年長者 → 一門 → 元服前の一門の子（幼君） → 家臣の中で人望のある者
  const child = (g: General) => !!g.kin && prev?.born !== undefined && g.born !== undefined && g.born - prev.born >= 15;
  const worth = (g: General) => g.cha + g.lea;
  const grown = all.filter((g) => g.status !== 'young');
  const named = heirOf(s, clan);
  const pick = named ?? grown.filter(child).sort((a, b) => (a.born ?? 0) - (b.born ?? 0))[0]
    ?? grown.filter((g) => g.kin).sort((a, b) => worth(b) - worth(a))[0]
    ?? all.filter((g) => g.status === 'young' && g.kin).sort((a, b) => (a.born ?? 0) - (b.born ?? 0))[0]
    ?? grown.sort((a, b) => worth(b) - worth(a))[0] ?? all[0];
  clan.leader = pick.id;
  const young = pick.status === 'young';
  if (young) { pick.status = 'free'; pick.genpuku = undefined; if (pick.later) { pick.name = pick.later; pick.later = undefined; } }
  if (pick.status === 'tsukai' || pick.status === 'bugyo') pick.status = 'free';
  // 指名しておいた跡継ぎなら、家中の動揺は半分
  const k = named ? R.HEIR_DESIGNATED : 1;
  const drop = Math.round(R.SUCCESSION_PRESTIGE * (1 + Number(!pick.kin || young)) * k);
  clan.prestige = Math.max(0, clan.prestige - drop);
  for (const c of clanCastles(s, clanId)) c.chian = Math.max(0, c.chian - R.SUCCESSION_CHIAN * k);
  if (clanId === s.player) pushScene(s, pick, young ? 'successionYoung' : 'succession');
  addLog(s, `${clan.name}家は${pick.name}が家督を継いだ${young ? '（急ぎ元服させた幼君）' : !pick.kin ? '（家臣からの跡目）' : ''}${named ? '（遺言の通り）' : ''}。威信−${drop}。`, 'death', clanId === s.player);
  afterSuccession(s, clan, prev, pick, !!named);
}

// 軍団から抜ける。継ぐ者がいなければ軍団を解く
function quitArmy(s: GameState, g: General) {
  const a = g.army !== null ? s.armies[g.army] : undefined;
  if (!a) { g.army = null; return; }
  const off: General[] = [];
  if (!leaveArmy(s, g, off)) removeArmy(s, a);
  for (const h of off) if (h.status === 'army') sendHome(s, h, a.hex);
}
export function killGeneral(s: GameState, g: General, why: string) {
  const clanId = g.clan;
  dropItems(s, g, undefined);
  quitArmy(s, g);
  if (clanId === s.player && clanId) pushScene(s, g, why.includes('処断') ? 'execute' : why.includes('病') ? 'deathSick' : 'deathBattle');
  g.status = 'dead'; g.army = null;
  addLog(s, `${g.name}、${why}。`, 'death', clanId === s.player || s.revealed.includes(g.id));
  if (clanId) {
    for (const c of s.castles) if (c.governor === g.id) c.governor = null;
    if (s.clans[clanId].leader === g.id) succession(s, clanId);
  }
}

// 出奔: 家を去って在野になる
export function desert(s: GameState, g: General, why: string) {
  const clanId = g.clan;
  dropItems(s, g, undefined);
  quitArmy(s, g);
  for (const c of s.castles) if (c.governor === g.id) c.governor = null;
  if (clanId === s.player) pushScene(s, g, 'desert');
  g.status = 'ronin'; g.clan = null; g.army = null; g.boss = undefined;
  addLog(s, `${why}。`, 'info', clanId === s.player);
}

export function eliminateClan(s: GameState, clanId: string, by: string | null) {
  const clan = s.clans[clanId];
  if (!clan.alive) return;
  clan.alive = false; clan.ruinedBy = by;
  s.treaties = (s.treaties ?? []).filter((t) => t.a !== clanId && t.b !== clanId);
  for (const a of Object.values(s.armies)) if (a.clan === clanId) { if (a.ikki) dropIkkiLeader(s, a); delete s.armies[a.id]; }
  for (const c of s.castles) if (c.owner === clanId) { c.owner = null; c.governor = null; }
  for (const g of Object.values(s.generals)) if (g.clan === clanId) dropItems(s, g, undefined);
  seizeItems(s, clanId, by);
  for (const g of Object.values(s.generals)) {
    if (g.clan === clanId && g.status !== 'dead') {
      if (g.status !== 'captive' && g.status !== 'young') { g.status = 'ronin'; g.army = null; }
      g.formerClan = clanId; g.clan = null;
    }
  }
  addLog(s, `${clan.name}家、滅亡${by ? `（${clanName(s, by)}家による）` : ''}。`, 'castle', true);
  if (clanId === s.player) s.over = 'lose';
}

export function captureCastle(s: GameState, c: Castle, clan: string) {
  const old = c.owner;
  c.owner = clan;
  if (c.governor) {
    const g = s.generals[c.governor];
    c.governor = null;
    if (g.status === 'governor') sendHome(s, g, c.hex);
  }
  // 城にいた武将（未配属）も退去
  for (const g of Object.values(s.generals)) if (g.status === 'free' && g.loc === c.i && g.clan === old) sendHome(s, g, c.hex);
  for (const g of Object.values(s.generals)) if ((g.status === 'tsukai' || g.status === 'bugyo' || g.status === 'young') && g.loc === c.i && g.clan === old) { const h = nearestOwnCastle(s, old!, c.hex); if (h) g.loc = h.i; }
  c.garrison = Math.round(garrisonMax(c) * 0.3);
  c.chian = Math.min(c.chian ?? R.CHIAN_START, R.CHIAN_CAPTURED); // 新しい領地は治安が低い
  if (old && s.clans[old]?.focus === c.i) s.clans[old].focus = null;
  c.gMorale = 1;
  s.clans[clan].prestige = Math.min(100, s.clans[clan].prestige + R.PRESTIGE_CASTLE);
  if (old) s.clans[old].prestige = Math.max(0, s.clans[old].prestige - R.PRESTIGE_CASTLE);
  addLog(s, `${clanName(s, clan)}家が${c.name}を攻略（旧${clanName(s, old)}）。`, 'castle', clan === s.player || old === s.player);
  onCaptured(s, c, old);
  onCastleTaken(s, c, old, clan);
  if (old && !clanCastles(s, old).length) eliminateClan(s, old, clan);
  checkVictory(s);
}

export function checkVictory(s: GameState) {
  if (s.over) return;
  if (!clanCastles(s, s.player).length) s.over = 'lose';
  else if (!s.karairi?.active && s.castles.every((c) => isForeignHex(c.hex) || c.owner === s.player)) s.over = 'win'; // 国外の城は数えない。唐入りのあいだは天下統一の判定をしない
}

// 登用成功率（SPEC: clamp(0.4 + (登用側主将魅力 − 旧主家威信)/100, 0, 1)）
export function recruitChance(s: GameState, g: General, captor: string): number {
  const leader = s.clans[captor].leader;
  const cha = leader ? s.generals[leader].cha : 50;
  const from = g.clan ?? g.formerClan;
  const pr = from && s.clans[from]?.alive ? presOf(s, from) : 0;
  const isDaimyo = from ? s.clans[from]?.leader === g.id : false;
  if (isDaimyo) return 0;
  // 旧主への恩が薄い者ほど見限る。こちらの家の御恩の評判も効く
  return Math.max(0, Math.min(1, 0.4 + (cha - pr) / 100 + R.onRecruit(onOf(g)) + (goodwill(s, captor) - R.ON_START) / 300 + (bondIn(s, g, captor) ? R.BOND_RECRUIT : 0) - (rivalIn(s, g, captor) ? R.BOND_RECRUIT / 2 : 0)));
}

export function captureGeneral(s: GameState, g: General, captor: string) {
  const wasLeader = g.clan && s.clans[g.clan].leader === g.id;
  dropItems(s, g, captor);
  quitArmy(s, g);
  g.formerClan = g.clan; g.status = 'captive'; g.captor = captor; g.army = null;
  for (const c of s.castles) if (c.governor === g.id) c.governor = null;
  addLog(s, `${g.name}が${clanName(s, captor)}家に捕縛された。`, 'death', captor === s.player || g.clan === s.player);
  if (wasLeader && g.clan) succession(s, g.clan);
  if (captor !== s.player) aiHandleCaptive(s, g);
}

export function recruit(s: GameState, g: General): boolean {
  const captor = g.captor!;
  const ok = rand(s) < recruitChance(s, g, captor);
  if (ok) {
    g.clan = captor; g.status = 'free'; g.captor = null; g.formerClan = null; initOn(s, g, true);
    newcomer(g);
    g.loc = capital(s, captor)?.i ?? g.loc;
    addLog(s, `${g.name}が${clanName(s, captor)}家に仕官した。`, 'info', captor === s.player);
  } else {
    addLog(s, `${g.name}は登用を拒んだ。`, 'info', captor === s.player);
  }
  return ok;
}

export function release(s: GameState, g: General) {
  const home = g.formerClan && s.clans[g.formerClan]?.alive ? g.formerClan : null;
  g.captor = null;
  if (home) { g.clan = home; g.status = 'free'; g.loc = capital(s, home)?.i ?? g.loc; }
  else { g.clan = null; g.status = 'ronin'; }
  g.formerClan = null;
  addLog(s, `${g.name}を解放した。`, 'info', false);
}

export function execute(s: GameState, g: General, by: string) {
  g.captor = null;
  killGeneral(s, g, `${clanName(s, by)}家により処断`);
}

function aiHandleCaptive(s: GameState, g: General) {
  const from = g.formerClan;
  if (from && s.clans[from]?.leader === g.id) { if (rand(s) < 0.5) execute(s, g, g.captor!); else release(s, g); return; }
  if (!recruit(s, g)) release(s, g);
}

// 移動（経路の終点へ）。無守備の敵城に入れば占領。
export function moveArmy(s: GameState, a: Army, to: number, cost: number) {
  a.hex = to;
  a.mp = Math.max(0, a.mp - cost);
  const ci = HEXES[to].c;
  if (ci !== undefined) {
    const c = s.castles[ci];
    if (hostile(s, a.clan, c.owner) && c.garrison <= 0) { a.mp = 0; captureCastle(s, c, a.clan); }
  }
}

export function formArmy(s: GameState, clan: string, castle: Castle, main: string, troops: number, hex = castle.hex): Army | null {
  if (occupancy(s).has(hex)) return null;
  const g = s.generals[main];
  const a: Army = { id: s.nextArmyId++, clan, main, deputy: null, troops, morale: 1, hex, mp: 0, acted: true, departTroops: troops, routed: false, monto: castle.id === R.MONTO_CASTLE, drill: R.DRILL_RECRUIT, ashi: 0 };
  a.morale = initialMorale(s, a) * 0.8;
  s.armies[a.id] = a;
  if (castle.governor === main) castle.governor = null;
  g.status = 'army'; g.army = a.id;
  s.clans[clan].food -= troops * R.RECRUIT_COST;
  return a;
}

export function disband(s: GameState, a: Army) {
  s.clans[a.clan].guns += a.guns ?? 0; // 鉄砲は蔵へ戻す
  a.guns = 0;
  s.clans[a.clan].cannon = (s.clans[a.clan].cannon ?? 0) + (a.cannon ?? 0); // 大筒も
  a.cannon = 0;
  addLog(s, `${s.generals[a.main].name}隊を解散した。`, 'info', a.clan === s.player);
  removeArmy(s, a);
}

// 在野武将の登用（城の所有者が試みる）
export function roninChance(s: GameState, clan: string): number {
  const leader = s.clans[clan].leader;
  const cha = leader ? s.generals[leader].cha : 50;
  return Math.max(0.1, Math.min(0.9, 0.5 + (cha - 50) / 100));
}
export function recruitRonin(s: GameState, g: General, clan: string): boolean {
  g.triedTurn = s.turn;
  if (s.clans[clan].gold < R.RONIN_GOLD) return false;
  s.clans[clan].gold -= R.RONIN_GOLD;
  const ok = rand(s) < roninChance(s, clan);
  if (ok) {
    g.clan = clan; g.status = 'free'; g.formerClan = null; g.refused = undefined; initOn(s, g, true);
    roninRank(g);
    addLog(s, `在野の${g.name}が${clanName(s, clan)}家に仕官した。`, 'info', clan === s.player);
  } else if (clan === s.player) addLog(s, `${g.name}は仕官を断った。`, 'info', true);
  return ok;
}

// ───────── 調略 ─────────
export function canPlot(s: GameState, clan: string, c: Castle): boolean {
  if (!hostile(s, clan, c.owner)) return false;
  const from = [...clanCastles(s, clan).map((k) => k.hex), ...Object.values(s.armies).filter((a) => a.clan === clan).map((a) => a.hex)];
  return graphDistances(from)[c.hex] <= R.PLOT_RANGE;
}
export function plotChance(s: GameState, g: General, c: Castle, clan: string): number {
  const defInt = c.governor ? s.generals[c.governor].int : c.owner ? 50 : 40;
  const myP = presOf(s, clan), theirP = c.owner ? presOf(s, c.owner) : 30;
  const gov = c.governor ? s.generals[c.governor] : null;
  const p = R.PLOT_BASE + (g.int - defInt) / 100 + (myP - theirP) / 200 + (c.owner ? 0 : R.PLOT_NEUTRAL) + (gov && c.owner ? R.onPlot(onOf(gov)) + (gov.outer ? 0.1 : 0) + (goodBondOf(g, gov) ? R.BOND_PLOT : 0) : 0);
  return Math.max(0.05, Math.min(0.75, p));
}
export function naioActive(s: GameState, c: Castle, clan: string) {
  return c.naio !== undefined && c.naio >= s.turn && c.naioBy === clan;
}
// 新参は宿老にはしない（侍大将まで）
// 在野から迎えた身分: 名のある者は侍大将、それ以外は足軽大将
export function roninRank(g: General) {
  g.rank = (g.bra + g.int + g.lea + g.cha) / 4 >= R.RONIN_FAME_SAMURAI ? 1 : 2;
  g.merit = R.MERIT_AT[g.rank]; g.paid = g.merit;
}
export function newcomer(g: General) {
  g.rank = Math.max(1, g.rank);
  g.merit = Math.min(Math.max(g.merit, R.MERIT_AT[g.rank]), R.MERIT_AT[g.rank - 1] - 1);
  g.paid = g.merit;
}

// 成功: 国人衆の城は寝返り、大名の城は翌月まで内応
export function doPlot(s: GameState, g: General, c: Castle, clan: string): 'defect' | 'naio' | 'fail' | 'caught' {
  g.plotTurn = s.turn;
  s.clans[clan].gold -= R.PLOT_GOLD;
  const mine = clan === s.player || c.owner === s.player;
  if (rand(s) < plotChance(s, g, c, clan)) {
    g.merit += R.MERIT.PLOT;
    if (!c.owner) {
      const gar = c.garrison;
      captureCastle(s, c, clan);
      c.garrison = gar;
      addLog(s, `${g.name}の調略で${c.name}の国人衆が${clanName(s, clan)}家に寝返った。`, 'castle', mine);
      return 'defect';
    }
    c.naio = s.turn + 1; c.naioBy = clan;
    addLog(s, `${g.name}の調略が実り、${c.name}に内応者ができた（翌月まで）。`, 'info', mine);
    return 'naio';
  }
  if (c.owner && rand(s) < R.PLOT_CAUGHT) {
    addLog(s, `${g.name}は${c.name}への調略中に捕らえられた。`, 'death', mine);
    captureGeneral(s, g, c.owner);
    return 'caught';
  }
  if (clan === s.player) addLog(s, `${g.name}の${c.name}への調略は不調に終わった。`, 'info', true);
  return 'fail';
}
