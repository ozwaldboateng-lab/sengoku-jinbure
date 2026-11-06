import { initBakufu } from './bakufu';
import { initBonds } from './bushi';
import { initOn } from './on';
import { BUGYO_INIT, GENPUKU, INITIAL_RANK, KIN_EXCLUDE, KIN_EXTRA, TSUKAI_INIT } from '../data/ranks';
import { CLANS, GENERALS } from '../data/roster';
import { BORN } from '../data/births';
import { COMMERCE_BONUS, INITIAL_GUNS } from '../data/economy';
import { CASTLE_TYPE, TSUME } from '../data/castles';
import { scenarioOf } from '../data/scenarios';
import { campAll } from './jinbure';
import { clanIncome, equip, initItems, transferItem } from './money';
import { initLife } from './life';
import { initNanban } from './nanban';
import { attachAuto } from './corps';
import { INITIAL_COURT } from './court';
import { initStores } from './supply';
import { aiFillBugyo, aiFillTsukai, setBugyo, setTsukai } from './ranks';
import { CASTLE_DEFS, HEXES, NEIGHBORS } from './map';
import * as R from './rules';
import { castleKoku, clanCastles, clanUpkeep, garrisonMax, initialMorale, maxTroops, occupancy } from './state';
import type { Army, Castle, Clan, GameState, General } from './types';


// 城の初期値（地図の定義から）
export function makeCastle(i: number, owner: string | null): Castle {
  const c = CASTLE_DEFS[i];
  return {
    i, id: c.id, name: c.name, hex: c.hex, owner, baseKoku: c.koku, dev: 1, garrison: 0, gMorale: 1, governor: null,
    baseCom: Math.round(c.koku * R.COM_PER_KOKU + (COMMERCE_BONUS[c.id] ?? 0)), cdev: 1, chisui: R.CHISUI_START, chian: c.owner ? R.CHIAN_START : 50, kind: CASTLE_TYPE[c.id] ?? FOREIGN_KIND[c.id] ?? 'toride', tsume: TSUME[c.id],
  };
}
// 国外の家（朝鮮・明）。唐入りまでは眠らせておく（alive=false・戦にならない）
export const FOREIGN_CLANS = [
  { id: 'joseon', name: '朝鮮', color: '#4f7f9a', prestige: 60 },
  { id: 'ming', name: '明', color: '#b08a3e', prestige: 90 },
];
// 国外の城の種類（大きな邑城・山城）
const FOREIGN_KIND: Record<string, Castle['kind']> = { hanseong: 'hira', pyongyang: 'hirayama', jinju: 'hirayama', busan: 'hira', dongnae: 'hira', haengju: 'yama', namwon: 'hira', jeonju: 'hira', gaeseong: 'hira', uiju: 'hira', jiuliancheng: 'hira', ulsan: 'hirayama', sangju: 'hira', chungju: 'hira', hamhung: 'hira' };
function foreignClan(d: (typeof FOREIGN_CLANS)[number]): Clan {
  return { id: d.id, name: d.name, color: d.color, leader: null, foreign: true, prestige: d.prestige, food: 0, alive: false, stance: '守勢', target: null, gold: 0, guns: 0, budget: { chisui: 10, hodo: 10 }, focus: null, mobilize: R.MOBILIZE_DEFAULT, court: 0 };
}
// 旧いセーブ: 地図に足した城（対馬・壱岐・朝鮮・遼東）と国外の家を加える
export function migrateMap(s: GameState) {
  for (let i = s.castles.length; i < CASTLE_DEFS.length; i++) { const c = makeCastle(i, CASTLE_DEFS[i].owner); c.garrison = garrisonMax(c); s.castles.push(c); }
  for (const d of FOREIGN_CLANS) if (!s.clans[d.id]) s.clans[d.id] = foreignClan(d);
}

export function newGame(player: string, difficulty: R.Difficulty, seed = (Date.now() & 0x7fffffff), scenario = '1560', camp = true): GameState {
  const sc = scenarioOf(scenario);
  const year = sc.year, month = sc.month;
  const castles: Castle[] = CASTLE_DEFS.map((c, i) => makeCastle(i, sc.owners && c.id in sc.owners ? sc.owners[c.id] : c.owner));
  for (const c of castles) { const cs = sc.castleState?.[c.id]; if (cs) { if (cs.ember !== undefined) c.ember = cs.ember; if (cs.chian !== undefined) c.chian = cs.chian; if (cs.oldOwner) c.oldOwner = cs.oldOwner; } }
  castles.forEach((c) => (c.garrison = garrisonMax(c)));
  const castleIdx = new Map(castles.map((c) => [c.id, c.i]));

  const clans: Record<string, Clan> = {};
  const guns = sc.guns ?? INITIAL_GUNS;
  for (const d of [...CLANS, ...(sc.clans ?? [])]) clans[d.id] = { id: d.id, name: d.name, color: d.color, leader: null, prestige: sc.prestige?.[d.id] ?? d.prestige, food: 0, alive: castles.some((c) => c.owner === d.id), stance: '均衡', target: null, gold: 0, guns: guns[d.id] ?? 0, budget: { chisui: 10, hodo: 10 }, focus: null, mobilize: R.MOBILIZE_DEFAULT, court: sc.court?.[d.id] ?? INITIAL_COURT[d.id] ?? 0 };

  for (const d of FOREIGN_CLANS) clans[d.id] = foreignClan(d);

  const generals: Record<string, General> = {};
  const born = new Map<string, number>((sc.generals ?? []).map(([d, b]) => [d[0], b]));
  for (const [id, name0, clan0, bra, int, lea, cha, loc0] of [...GENERALS, ...(sc.generals ?? []).map(([d]) => d)]) {
    const [clan, loc] = sc.moves?.[id] ?? [clan0, loc0];
    const li = castleIdx.get(loc);
    if (li === undefined) throw new Error(`unknown castle ${loc} for ${name0}`);
    const [name, later] = sc.names?.[id] ?? [name0];
    const g: General = { id, name, clan: clan || null, bra, int, lea, cha, status: clan ? 'free' : 'ronin', loc: li, army: null, captor: null, formerClan: null, rank: clan ? 1 : 2, merit: clan ? 0 : R.MERIT_AT[2] };
    // 生年: 1560年に元服済みの武将は推定が若すぎないよう丸める
    g.born = born.get(id) ?? (GENPUKU[id] === undefined ? Math.min(BORN[id] ?? year - 30, R.ADULT_BORN_MAX) : BORN[id]);
    const gp = GENPUKU[id] ?? g.born! + R.GENPUKU_AGE;
    if (gp > year) { g.status = 'young'; g.genpuku = gp; if (later) g.later = later; }
    initLife(g, year);
    generals[id] = g;
  }
  // この年にはもう亡い者
  for (const id of sc.dead ?? []) { const g = generals[id]; if (g) { g.status = 'dead'; g.formerClan = g.clan; g.clan = null; } }
  // 家が城を失っていれば浪人に
  for (const g of Object.values(generals)) if (g.clan && !clans[g.clan]?.alive && g.status !== 'dead') { g.formerClan = g.clan; g.clan = null; if (g.status !== 'young') g.status = 'ronin'; }
  for (const clan of Object.values(clans)) {
    const lead = sc.leaders?.[clan.id];
    clan.leader = lead && generals[lead]?.clan === clan.id ? lead : Object.values(generals).find((g) => g.clan === clan.id)?.id ?? null;
  }
  // 所在の城がよその家のものなら、本城（当主の城か最初の城）へ
  for (const g of Object.values(generals)) {
    if (!g.clan || g.status === 'dead' || castles[g.loc].owner === g.clan) continue;
    const L = clans[g.clan].leader ? generals[clans[g.clan].leader!] : null;
    const home = L && castles[L.loc].owner === g.clan ? L.loc : castles.find((c) => c.owner === g.clan)?.i;
    if (home !== undefined) g.loc = home;
  }
  assignRanks(clans, generals, castles, sc.ranks ?? {}, !!sc.ranksFresh);

  const s: GameState = {
    version: 1, year, month, turn: 1, player, difficulty, seed, scenario: sc.id, startYear: year, startMonth: month,
    clans, generals, armies: {}, castles, revealed: [], log: [], reports: [], nextArmyId: 1, over: null,
    treaties: [], dipTried: {}, lastClash: {}, orders: [], items: {},
  };
  initItems(s);
  initNanban(s);
  for (const g of Object.values(generals)) initOn(s, g);
  initBonds(s);
  initBakufu(s);
  initStores(s);
  for (const [a, b] of sc.foes ?? []) if (clans[a]?.alive && clans[b]?.alive) s.bakufu!.foes[`${a}|${b}`] = s.turn;
  for (const [a, b, n] of sc.treaties ?? []) if (clans[a]?.alive && clans[b]?.alive) s.treaties.push({ a, b, kind: 'alliance', start: s.turn, until: s.turn + n });
  for (const [id, [clan, holder]] of Object.entries(sc.items ?? {})) {
    const it = s.items[id];
    if (!it) continue;
    transferItem(s, it, clan && clans[clan]?.alive ? clan : null);
    const g = holder ? generals[holder] : null;
    if (g && g.clan === it.clan && g.status !== 'young') equip(s, g, it, true);
  }
  for (const clan of Object.values(clans)) clan.gold = clanIncome(s, clan.id) * R.START_GOLD_MONTHS;

  // 奉行: 史実の顔ぶれがあればそれを、無ければ知略から
  for (const clan of Object.values(clans)) {
    const init = BUGYO_INIT[clan.id];
    if (init) for (const id of init) { if (generals[id]?.clan === clan.id && generals[id].status === 'free') setBugyo(s, generals[id], true); }
    else aiFillBugyo(s, clan.id);
  }
  // 使番（母衣衆）: 史実の顔ぶれがあればそれを、無ければ能力から
  for (const clan of Object.values(clans)) {
    const init = TSUKAI_INIT[clan.id];
    // 先頭が筆頭になるよう、功績にわずかな差をつける
    if (init) init.filter((id) => generals[id]?.clan === clan.id && generals[id].status === 'free').forEach((id, k, xs) => { setTsukai(s, generals[id], true); generals[id].merit += xs.length - k; });
    else aiFillTsukai(s, clan.id);
  }

  const diff = R.DIFFICULTY[difficulty];
  for (const clan of Object.values(clans)) {
    if (!clan.alive) continue;
    const mob = R.BASE_MOBILIZATION + (clan.id === player ? 0 : diff.mobilizationDelta);
    const owned = clanCastles(s, clan.id);
    for (const c of owned) {
      // 当主 → 身分の高い順 → 統率+武勇の順に隊を率いる（使番・幼少は除く）
      const here = Object.values(generals)
        .filter((g) => g.clan === clan.id && g.loc === c.i && g.status === 'free')
        .sort((a, b) => Number(b.id === clan.leader) - Number(a.id === clan.leader) || Math.min(a.rank, 2) - Math.min(b.rank, 2) || b.lea + b.bra - (a.lea + a.bra));
      let budget = castleKoku(c) * R.MANPOWER_PER_KOKU * mob;
      const spots = [c.hex, ...NEIGHBORS[c.hex].filter((j) => HEXES[j].d === c.i)];
      const formed: Army[] = [];
      // 城主を1人残す（武将が2人以上いる場合）
      const pool = [...here];
      let governor: General | null = null;
      if (pool.length >= 2) {
        // 城主は身分の高い者から（同格なら知略）
        governor = pool.slice(1).sort((a, b) => a.rank - b.rank || b.int - a.int)[0];
        pool.splice(pool.indexOf(governor), 1);
      }
      // 当主の隊は小勢力でも最低1500で編成する
      if (budget < 1500 && pool[0]?.id === clan.leader) budget = 1500;
      while (budget >= 1200 && pool.length && spots.length) {
        const hex = spots.shift()!;
        if (occupancy(s).has(hex)) continue;
        const g = pool.shift()!;
        const a: Army = { id: s.nextArmyId++, clan: clan.id, main: g.id, deputy: null, troops: 0, morale: 1, hex, mp: R.MOVE_POINTS, acted: false, departTroops: 0, routed: false, monto: c.id === R.MONTO_CASTLE, drill: R.DRILL_START, ashi: 0, staff: [] };
        a.troops = Math.round(Math.min(maxTroops(s, a), budget) / 100) * 100;
        budget -= a.troops;
        a.morale = initialMorale(s, a);
        a.departTroops = a.troops;
        s.armies[a.id] = a;
        g.status = 'army'; g.army = a.id;
        formed.push(a);
      }
      // 城主の当てがなければ残しておき、残りは軍団の傘下へ（空いた枠に上の段から）
      if (!governor && pool.length > formed.length) governor = pool.pop()!;
      for (const g of pool.sort((x, y) => y.lea + y.bra - (x.lea + x.bra))) for (const a of formed) if (g.status === 'free' && attachAuto(s, a, g)) break;
      // 傘下で増えた上限の分だけ兵を足す
      for (const a of formed) { const add = Math.max(0, Math.min(maxTroops(s, a) - a.troops, Math.floor(budget / 100) * 100)); a.troops += add; a.departTroops = a.troops; budget -= add; }
      if (!governor) governor = pool.find((g) => g.status === 'free') ?? null;
      if (governor) { c.governor = governor.id; governor.status = 'governor'; }
    }
    clan.food = Math.round(owned.reduce((t, c) => t + castleKoku(c), 0) * 1500 + clanUpkeep(s, clan.id) * 6);
  }
  // 平時から始まる: 全家の軍団は陣払いの名簿（本能寺の変の直後のような、戦の最中のシナリオは地図に出たまま）
  if (camp && sc.id !== '1582') campAll(s);
  s.log.push({ turn: 1, text: `${clans[player].name}家、${year}年${month}月に起つ。`, kind: 'info', mine: true });
  return s;
}

// 開始時の身分: 指定があればそれを、無ければ家ごとに能力の上位を宿老、統率62以上を侍大将、それ未満を足軽大将
function assignRanks(clans: Record<string, Clan>, generals: Record<string, General>, castles: Castle[], over: Record<string, number>, fresh = false) {
  const rankOf = (id: string): number | undefined => over[id] ?? (fresh ? undefined : INITIAL_RANK[id]);
  const kinExtra = new Set(KIN_EXTRA), kinEx = new Set(KIN_EXCLUDE);
  const koku = new Map<string, number>();
  for (const c of castles) if (c.owner) koku.set(c.owner, (koku.get(c.owner) ?? 0) + c.baseKoku);
  for (const clan of Object.values(clans)) {
    const leader = clan.leader ? generals[clan.leader] : null;
    const family = leader && leader.name.length > 2 ? leader.name.slice(0, 2) : null;
    const mine = Object.values(generals).filter((g) => g.clan === clan.id && g.id !== clan.leader);
    for (const g of mine) g.kin = kinExtra.has(g.id) || (!!family && g.name.startsWith(family) && !kinEx.has(g.id));
    const explicitKaro = mine.some((g) => rankOf(g.id) === 0 && !g.kin);
    const auto = mine.filter((g) => rankOf(g.id) === undefined && g.status !== 'young');
    if (!explicitKaro) {
      const n = R.karoSlots(koku.get(clan.id) ?? 0);
      const top = auto.filter((g) => !g.kin).sort((a, b) => b.lea + b.int + b.cha - (a.lea + a.int + a.cha)).slice(0, mine.length >= 4 ? n : 0);
      for (const g of top) g.rank = 0;
    }
    for (const g of mine) {
      if (rankOf(g.id) !== undefined) g.rank = rankOf(g.id)!;
      else if (g.status === 'young') g.rank = g.kin ? 1 : 3;
      else if (g.rank !== 0) g.rank = g.kin || g.lea >= 62 ? 1 : 2;
      g.merit = R.MERIT_AT[g.rank];
    }
  }
}
