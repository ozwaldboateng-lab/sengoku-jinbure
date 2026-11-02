// 方面軍団（プレイヤー）: 軍団長に担当の城と部隊を任せ、方針（攻略・防衛・軍備増強）に従ってAIが動かす。
// 「軍事」を委任すると、方面に入れていない直轄の部隊と城も、家全体の方針でAIが動かす。
import { decideStance, enemyNear, groupAssault, localPower, moveToward, tryAttack, type AttackOpts } from './ai';
import { aiFillCorps, attachAuto } from './corps';
import { delegateOf } from './delegate';
import { graphDistances, hexDist, HEXES, NEIGHBORS } from './map';
import { armGuns, castleCom, clanIncome, gunCap, hireAshi } from './money';
import { dueOf, kanjo, kazoCost, onOf } from './on';
import { taxDef } from './invest';
import type { Target } from './move';
import { armCannon } from './nanban';
import { formArmy } from './ops';
import * as R from './rules';
import { addLog, castleAt, castleDef, castleKoku, clanArmies, clanAshi, clanCastles, clanName, clanTroops, farmTroops, hostile, maxTroops, mobilizeCap, occupancy, troopMult } from './state';
import type { Army, Castle, Front, FrontPolicy, GameState, General } from './types';

// ───────── 参照 ─────────
export const frontsOf = (s: GameState) => (s.fronts ??= []);
export const frontById = (s: GameState, id: number | undefined) => (id === undefined ? undefined : frontsOf(s).find((f) => f.id === id));
export const frontOfArmy = (s: GameState, a: Army) => (a.clan === s.player ? frontById(s, a.front) : undefined);
export const frontOfCastle = (s: GameState, c: Castle) => frontsOf(s).find((f) => f.castles.includes(c.i));
export const fiefOf = (s: GameState, g: General | undefined) => (g ? frontsOf(s).find((f) => f.leader === g.id && !f.vacant) : undefined);
export const frontName = (s: GameState, f: Front) => `${s.generals[f.leader]?.name ?? '？'}${f.vacant ? '（亡き後）' : ''}領`;
export const frontArmies = (s: GameState, f: Front) => clanArmies(s, s.player).filter((a) => a.front === f.id && !a.ikki);
export const fiefKoku = (s: GameState, f: Front) => f.castles.reduce((t, i) => t + castleKoku(s.castles[i]), 0);
// 領の動員の枠: 領の城の石高と治安で決まる人数 × 動員目標（領の部隊の農兵はこの中で集める）
export const fiefCapacity = (s: GameState, f: Front) => Math.round(f.castles.reduce((t, i) => { const c = s.castles[i]; return c.owner === s.player ? t + castleKoku(c) * R.manpowerPer(c.chian ?? R.CHIAN_START) : t; }, 0) * (s.clans[s.player].mobilize ?? R.MOBILIZE_DEFAULT) / 100);
export const fiefFarm = (s: GameState, f: Front) => Math.round(frontArmies(s, f).reduce((t, a) => t + a.troops * (1 - (a.ashi ?? 0)), 0));
export const fiefCapLeft = (s: GameState, f: Front) => fiefCapacity(s, f) - fiefFarm(s, f);
// 陪臣（領主に仕える者）
export const isBaishin = (g: General) => !!g.liege;
export const baishinOf = (s: GameState, f: Front) => Object.values(s.generals).filter((g) => g.liege === f.leader && g.clan === s.player && !['dead', 'ronin'].includes(g.status));
// 当家が直接使える武将か（陪臣でない）
export const isDirect = (g: General) => !g.liege;
// プレイヤーが自分で動かせない部隊（領に属するか、軍事を委任している）
export const delegatedArmy = (s: GameState, a: Army) => a.clan === s.player && ((!!frontOfArmy(s, a) && !frontOfArmy(s, a)!.vacant) || !!delegateOf(s).military);
// 城持ちの城の数の上限（身分による）
export const fiefCap = (g: General) => R.FIEF_CAP[g.rank] ?? 0;
export const leaderOk = (s: GameState, g: General | undefined) => !!g && g.clan === s.player && s.clans[s.player].leader !== g.id && !g.liege && fiefCap(g) > 0
  && !['young', 'captive', 'dead', 'ronin'].includes(g.status);
// 城を与えられる武将（直参で、身分の枠に空きがある）
export const leaderCands = (s: GameState) => Object.values(s.generals).filter((g) => leaderOk(s, g) && (fiefOf(s, g)?.castles.length ?? 0) < fiefCap(g))
  .sort((x, y) => x.rank - y.rank || y.merit - x.merit);
export function targetLabel(s: GameState, f: Front) {
  if (!f.target) return '（領主に任せる）';
  const [k, v] = f.target.split(':');
  return k === 'clan' ? `${clanName(s, v)}家` : s.castles[+v]?.name ?? '？';
}
// 与力: 寄親の方針・目標に従う
export const policyOf = (s: GameState, f: Front): Front => { const b = frontById(s, f.boss); return b && !b.vacant && b.id !== f.id ? { ...f, policy: b.policy, target: b.target } : f; };
const bump = (g: General, v: number) => { g.on = Math.max(0, Math.min(100, onOf(g) + v)); };

// ───────── 城を与える・召し上げる ─────────
// 与えられない理由（なければ null）
export function grantBlock(s: GameState, g: General | undefined, c: Castle): string | null {
  if (!g || !leaderOk(s, g)) return g && fiefCap(g) <= 0 ? '足軽組頭は城を持てない（取り立てが要る）' : '城を与えられない武将';
  if (c.owner !== s.player) return '当家の城ではない';
  const C = s.clans[s.player], lord = C.leader ? s.generals[C.leader] : undefined;
  if (lord && lord.status !== 'army' && lord.loc === c.i) return '当主の居城は与えられない';
  const f = fiefOf(s, g);
  if (f?.castles.includes(c.i)) return 'すでにこの者の領';
  if ((f?.castles.length ?? 0) >= fiefCap(g)) return `${R.RANK_NAME[g.rank]}が持てるのは${fiefCap(g)}城まで`;
  return null;
}
export function grantCastle(s: GameState, g: General, c: Castle): Front | null {
  if (grantBlock(s, g, c)) return null;
  const other = frontOfCastle(s, c);
  if (other) removeCastle(s, other, c, true);
  let f = fiefOf(s, g);
  const fresh = !f;
  if (!f) {
    f = { id: (s.nextFrontId = (s.nextFrontId ?? 0) + 1), leader: g.id, castles: [], policy: 'build', target: null, seat: c.i, gold: 0, food: 0 };
    frontsOf(s).push(f);
  }
  f.castles.push(c.i);
  // 城にいた直参の城主は退く（領の城主は領主と陪臣から）
  if (c.governor && c.governor !== g.id && !s.generals[c.governor]?.liege) { const x = s.generals[c.governor]; c.governor = null; if (x) x.status = 'free'; }
  if (fresh) {
    // 領主は居城へ入る（部隊を率いていれば、その部隊ごと領に入る）
    if (g.status !== 'army') {
      for (const x of s.castles) if (x.governor === g.id) x.governor = null;
      g.status = 'governor'; g.loc = c.i; c.governor = g.id;
    } else if (g.army !== null && s.armies[g.army]) s.armies[g.army].front = f.id;
  }
  const k = castleKoku(c);
  g.paid = Math.min(g.merit, (g.paid ?? g.merit) + k * R.FIEF_PAY);
  bump(g, R.fiefOn(k));
  addLog(s, `${g.name}に${c.name}（${k.toFixed(1)}万石）を与えた${fresh ? '' : `（知行 ${fiefKoku(s, f).toFixed(1)}万石）`}。`, 'info', true);
  return f;
}
// 城を召し上げる（quiet: 別の者へ移すときなど、記録を出さない）
export function removeCastle(s: GameState, f: Front, c: Castle, quiet = false) {
  if (!f.castles.includes(c.i)) return;
  f.castles = f.castles.filter((i) => i !== c.i);
  const g = s.generals[f.leader];
  if (g && !f.vacant && c.owner === s.player) bump(g, -R.fiefOn(castleKoku(c)));
  if (c.governor && s.generals[c.governor]?.liege === f.leader) { const x = s.generals[c.governor]; c.governor = null; x.status = 'free'; const to = f.castles[0]; if (to !== undefined) x.loc = to; }
  if (!quiet) addLog(s, `${g?.name ?? ''}から${c.name}を召し上げた。`, 'info', true);
  if (!f.castles.length) { dissolveFront(s, f, quiet ? '' : '（城がなくなった）'); return; }
  if (f.seat === c.i) f.seat = f.castles[0];
}
// 領を解く: 城は直轄に、陪臣は直参に、領の蔵は当家の蔵へ
export function dissolveFront(s: GameState, f: Front, why = '') {
  for (const a of Object.values(s.armies)) if (a.front === f.id) a.front = undefined;
  for (const x of frontsOf(s)) if (x.boss === f.id) x.boss = undefined;
  for (const g of Object.values(s.generals)) if (g.liege === f.leader) g.liege = undefined;
  const C = s.clans[s.player];
  C.gold += Math.max(0, f.gold ?? 0); C.food += Math.max(0, f.food ?? 0);
  s.fronts = frontsOf(s).filter((x) => x !== f);
  addLog(s, `${frontName(s, f)}を解いた${why}。`, 'info', true);
}

// ───────── 陪臣と直参 ─────────
export function baishinBlock(s: GameState, g: General, f: Front): string | null {
  if (g.clan !== s.player || g.liege || s.clans[s.player].leader === g.id) return '付けられない';
  if (f.vacant) return '領主がいない';
  if (g.id === f.leader || fiefOf(s, g)) return '城持ちは陪臣にできない';
  if (['young', 'captive', 'dead', 'ronin'].includes(g.status)) return '付けられない';
  if (g.status === 'army') { const a = g.army !== null ? s.armies[g.army] : undefined; if (!a || a.front !== f.id) return '部隊を率いている（部隊を解いてから）'; }
  return null;
}
export function makeBaishin(s: GameState, g: General, f: Front): boolean {
  if (baishinBlock(s, g, f)) return false;
  if (g.status !== 'army') {
    for (const c of s.castles) if (c.governor === g.id) c.governor = null;
    g.status = 'free'; g.loc = f.seat ?? f.castles[0];
  }
  g.liege = f.leader; g.paid = g.merit; // 未払いの功は領主が引き継ぐ（ここで清算したことにする）
  addLog(s, `${g.name}を${s.generals[f.leader].name}の陪臣とした。`, 'info', true);
  return true;
}
// 陪臣を直参に引き上げる（領主の恩が下がる）
export function makeDirect(s: GameState, g: General) {
  const lord = g.liege ? s.generals[g.liege] : undefined;
  const f = fiefOf(s, lord);
  g.liege = undefined;
  if (lord && f) bump(lord, -(R.FIEF_PULL_ON[g.rank] ?? 3) * (lord.tozama ? R.TOZAMA_PULL : 1)); // 外様の家臣を引き抜くと、なお恨む
  bump(g, 4);
  // 領の外（直轄の城）へ移る
  if (g.status !== 'army') {
    for (const c of s.castles) if (c.governor === g.id) c.governor = null;
    const own = clanCastles(s, s.player).filter((c) => !frontOfCastle(s, c));
    const here = s.castles[g.loc];
    const to = own.sort((a, b) => hexDist(a.hex, here.hex) - hexDist(b.hex, here.hex))[0];
    g.status = 'free'; if (to) g.loc = to.i;
  } else if (g.army !== null && s.armies[g.army]) s.armies[g.army].front = undefined;
  addLog(s, `${lord?.name ?? ''}の陪臣${g.name}を直参に引き上げた${lord ? `（${lord.name}は面白くない）` : ''}。`, 'info', true);
}

// ───────── 後継ぎ ─────────
// 領主がいなくなった領の後継ぎの候補: その領の陪臣（先に）と、城を持てる直参
export function heirCands(s: GameState, f: Front) {
  const own = Object.values(s.generals).filter((g) => g.liege === f.leader && g.clan === s.player && fiefCap(g) > 0 && !['young', 'captive', 'dead', 'ronin'].includes(g.status));
  const rest = leaderCands(s).filter((g) => !fiefOf(s, g));
  return [...own.sort((a, b) => a.rank - b.rank || b.merit - a.merit), ...rest];
}
export function setHeir(s: GameState, f: Front, g: General): boolean {
  if (!f.vacant || !heirCands(s, f).includes(g)) return false;
  const old = f.leader, oldName = s.generals[old]?.name ?? '';
  for (const x of Object.values(s.generals)) if (x.liege === old && x.id !== g.id) x.liege = g.id;
  g.liege = undefined; f.leader = g.id; f.vacant = false; f.asked = undefined;
  // 身分の枠を超える城は直轄へ戻す
  while (f.castles.length > fiefCap(g)) { const i = f.castles.find((x) => x !== f.seat) ?? f.castles[f.castles.length - 1]; f.castles = f.castles.filter((x) => x !== i); }
  if (f.seat === undefined || !f.castles.includes(f.seat)) f.seat = f.castles[0];
  const seat = s.castles[f.seat];
  if (g.status !== 'army') { for (const c of s.castles) if (c.governor === g.id) c.governor = null; if (seat.governor && s.generals[seat.governor]) s.generals[seat.governor].status = 'free'; g.status = 'governor'; g.loc = seat.i; seat.governor = g.id; }
  else if (g.army !== null && s.armies[g.army]) s.armies[g.army].front = f.id;
  bump(g, R.fiefOn(fiefKoku(s, f)));
  addLog(s, `${g.name}に${oldName}の領（${fiefKoku(s, f).toFixed(1)}万石）を継がせた。`, 'info', true);
  return true;
}
export const vacantFiefs = (s: GameState) => frontsOf(s).filter((f) => f.vacant);

// ───────── 降った大名を城持ちに（本領安堵） ─────────
// 降った家の当主（いなければ身分の高い者）が、その家の城をそのまま領として持ち、家臣はその陪臣になる。蔵も領の蔵に
export function enfeoffSurrendered(s: GameState, from: string, castles: number[], gens: General[], stores: { gold: number; food: number }, leaderId: string | null): Front | null {
  const ok = (g: General | undefined): g is General => !!g && !['dead', 'captive', 'young', 'ronin'].includes(g.status);
  const lord = ok(leaderId ? s.generals[leaderId] : undefined) ? s.generals[leaderId!] : gens.filter(ok).sort((a, b) => a.rank - b.rank || b.merit - a.merit)[0];
  if (!lord || !castles.length) return null;
  const need = castles.length > R.FIEF_CAP[1] ? 0 : castles.length > R.FIEF_CAP[2] ? 1 : 2;
  lord.rank = Math.min(lord.rank, need); lord.tozama = from;
  const f: Front = { id: (s.nextFrontId = (s.nextFrontId ?? 0) + 1), leader: lord.id, castles: [...castles], policy: 'defend', target: null, seat: castles.includes(lord.loc) ? lord.loc : castles[0], gold: stores.gold, food: stores.food };
  frontsOf(s).push(f);
  if (lord.status !== 'army') { for (const c of s.castles) if (c.governor === lord.id) c.governor = null; const seat = s.castles[f.seat!]; if (seat.governor && seat.governor !== lord.id) s.generals[seat.governor].status = 'free'; seat.governor = lord.id; lord.status = 'governor'; lord.loc = seat.i; }
  lord.on = R.ON_NEW + 15; // 本領を安堵された恩
  for (const g of gens) if (g !== lord && g.status !== 'dead') { g.liege = lord.id; g.paid = g.merit; }
  for (const a of Object.values(s.armies)) if (a.clan === s.player && (a.main === lord.id || s.generals[a.main]?.liege === lord.id)) a.front = f.id;
  addLog(s, `${lord.name}は本領${castles.length}城を安堵され、当家の城持ちとなった（家臣${gens.filter((g) => g !== lord && g.status !== 'dead').length}人はその陪臣）。`, 'info', true);
  return f;
}
// 古いセーブ: 方面軍団を領に（城のない方面は解く。方面の部隊を率いていた者は軍団長の陪臣に）
export function migrateFiefs(s: GameState) {
  for (const f of [...frontsOf(s)]) {
    if (f.seat !== undefined || f.gold !== undefined) continue;
    if (!f.castles.length) { s.fronts = frontsOf(s).filter((x) => x !== f); for (const a of Object.values(s.armies)) if (a.front === f.id) a.front = undefined; continue; }
    f.seat = f.castles[0]; f.gold = 0; f.food = 0;
    for (const a of Object.values(s.armies)) if (a.front === f.id) for (const gid of [a.main, ...(a.staff ?? [])]) { const g = s.generals[gid]; if (g && gid !== f.leader && !frontsOf(s).some((x) => x.leader === gid)) g.liege = f.leader; }
  }
}

export function setFrontPolicy(s: GameState, f: Front, p: FrontPolicy, target: string | null = f.target) {
  f.policy = p; f.target = p === 'attack' ? target : null;
}
// 寄親を決める（与力になる）。寄親の寄親を自分にはできない
export function setFrontBoss(s: GameState, f: Front, boss: Front | null) {
  if (boss && (boss.id === f.id || boss.boss === f.id)) return;
  f.boss = boss ? boss.id : undefined;
  for (const x of frontsOf(s)) if (x.boss === f.id && boss) x.boss = boss.id; // 与力の与力は寄親の与力に
}
// 攻略目標の候補: 担当の城から近い敵の家と城
export function targetCands(s: GameState, f: Front) {
  const from = f.castles.map((i) => s.castles[i].hex);
  if (!from.length) return { clans: [] as string[], castles: [] as Castle[] };
  const d = graphDistances(from);
  const castles = s.castles.filter((c) => c.owner !== s.player && hostile(s, s.player, c.owner) && d[c.hex] <= 12).sort((x, y) => d[x.hex] - d[y.hex]).slice(0, 12);
  const clans = [...new Set(castles.map((c) => c.owner).filter((x): x is string => !!x))];
  return { clans, castles };
}

// 毎月の整理: 失った城を外し、領の部隊が落とした城をその領に加え（身分の枠まで）、領主がいなくなれば後継ぎ待ちに
export function cleanFronts(s: GameState) {
  for (const f of [...frontsOf(s)]) {
    f.castles = f.castles.filter((i) => s.castles[i].owner === s.player);
    if (!f.castles.length) { dissolveFront(s, f, '（城をすべて失った）'); continue; }
    if (f.seat === undefined || !f.castles.includes(f.seat)) f.seat = f.castles[0];
    if (!f.vacant && !leaderOk(s, s.generals[f.leader])) {
      const g = s.generals[f.leader];
      if (g && g.clan === s.player && g.status === 'captive') continue; // 捕らわれている間は留守居が守る
      f.vacant = true; f.policy = 'defend'; f.target = null;
      addLog(s, `${frontName(s, f)}の領主がいなくなった。後継ぎを決めるまで、領は直轄として扱う。`, 'info', true);
    }
    if (f.vacant) continue;
    if (f.target) {
      const [k, v] = f.target.split(':');
      if ((k === 'clan' && !s.clans[v]?.alive) || (k === 'castle' && (s.castles[+v].owner === s.player || !hostile(s, s.player, s.castles[+v].owner)))) {
        addLog(s, `${frontName(s, f)}: 攻略目標の${targetLabel(s, f)}を${k === 'castle' && s.castles[+v].owner === s.player ? '手に入れた' : '果たした'}。次の目標は領主に任せる。`, 'info', true);
        f.target = null;
      }
    }
  }
  // 陪臣の主がいなくなった（領が解かれた・他家へ移った）ら直参に
  for (const g of Object.values(s.generals)) if (g.liege && (g.clan !== s.player || !frontsOf(s).some((f) => f.leader === g.liege))) g.liege = undefined;
  // 部隊の所属: 領主か陪臣が率いる部隊はその領に
  for (const a of clanArmies(s, s.player)) {
    if (a.ikki) continue;
    const m = s.generals[a.main];
    const f = m ? frontsOf(s).find((x) => x.leader === a.main || x.leader === m.liege) : undefined;
    a.front = f?.id;
  }
  // 領の部隊が落とした城: 枠があればその領に（なければ直轄）
  for (const c of clanCastles(s, s.player)) {
    if (frontOfCastle(s, c)) continue;
    const a = Object.values(s.armies).find((x) => x.hex === c.hex && x.clan === s.player && frontById(s, x.front) && !frontById(s, x.front)!.vacant);
    if (!a || c.prevTurn === undefined || s.turn - c.prevTurn > 1) continue;
    const f = frontById(s, a.front)!, g = s.generals[f.leader];
    if (g && f.castles.length < fiefCap(g)) { f.castles.push(c.i); addLog(s, `${c.name}は${frontName(s, f)}に入った。`, 'info', true); }
  }
}

// ───────── 領の蔵（毎月） ─────────
// 年貢・商いの8割は領へ（2割は上納）。領の兵の兵糧と足軽の給金は領が払い、陪臣の恩賞も領主が払う。余った金は領の城の開発へ
export function fiefAccounts(s: GameState) {
  const C = s.clans[s.player];
  if (!C?.alive) return;
  const keep = 1 - R.FIEF_TRIBUTE;
  for (const f of frontsOf(s)) {
    const castles = f.castles.map((i) => s.castles[i]).filter((c) => c.owner === s.player);
    f.gold ??= 0; f.food ??= 0;
    const tx = taxDef(s, s.player).income;
    const gin = Math.min(Math.max(0, C.gold), Math.round(castles.reduce((t, c) => t + castleCom(c), 0) * keep * tx));
    C.gold -= gin; f.gold += gin;
    if (s.month === R.HARVEST_MONTH) {
      const fin = Math.min(Math.max(0, C.food), Math.round(castles.reduce((t, c) => t + castleKoku(c) * R.harvestMult(c.chisui) * R.HARVEST_RATE, 0) * keep * tx));
      C.food -= fin; f.food += fin;
    }
    if (f.vacant) continue;
    const armies = frontArmies(s, f);
    const food = Math.min(f.food, Math.round(armies.reduce((t, a) => t + a.troops * R.FOOD_PER_SOLDIER, 0)));
    f.food -= food; C.food += food;
    const wage = Math.min(f.gold, Math.round(armies.reduce((t, a) => t + a.troops * (a.ashi ?? 0), 0) * R.ASHI_WAGE));
    f.gold -= wage; C.gold += wage;
    // 陪臣の恩賞
    for (const g of baishinOf(s, f).filter((x) => dueOf(x) >= R.ON_DUE_FREE + 10).sort((a, b) => onOf(a) - onOf(b))) {
      const cost = kazoCost(g);
      if (f.gold - cost > 500) { f.gold -= cost; g.paid = g.merit; bump(g, R.ON_KAZO(dueOf(g) || 10)); } else kanjo(s, g);
    }
    // 陪臣の取り立て（功績が満ちれば。宿老へは上げない）
    for (const g of baishinOf(s, f)) while (g.rank > 1 && g.merit >= R.MERIT_AT[g.rank - 1]) { g.rank--; bump(g, R.ON_PROMOTE); }
    // 蔵に余る兵糧（1年半の収穫を超えた分）は売って金に
    const fcap = fiefKoku(s, f) * R.HARVEST_RATE * 1.5;
    if (f.food > fcap) { f.gold += Math.round((f.food - fcap) * R.RICE_SELL); f.food = Math.round(fcap); }
    // 余った金は領の城の開発へ
    const cap = R.fiefGoldCap(fiefKoku(s, f));
    if (f.gold > cap && castles.length) {
      const extra = f.gold - cap; f.gold = cap;
      for (const c of castles) { const k = R.devCap(c.chian); c.dev = Math.min(k, c.dev + (extra * R.FIEF_DEV_PER_GOLD) / castles.length); c.cdev = Math.min(k, c.cdev + (extra * R.FIEF_DEV_PER_GOLD) / castles.length); }
    }
  }
}

// ───────── AIによる指揮 ─────────
const nearOwn = (s: GameState, a: Army) => castleAt(s, a.hex)?.owner === a.clan || NEIGHBORS[a.hex].some((j) => castleAt(s, j)?.owner === a.clan);
const targetClanOf = (s: GameState, t: Target) => (t.kind === 'army' ? t.army.clan : s.castles[t.castle].owner);

// 方面の人事・編成・配備・足軽（軍団長に任せる）
function organizeFront(s: GameState, f: Front, castles: Castle[], fid: number | undefined) {
  const clan = s.player, C = s.clans[clan];
  const inFront = (g: General) => castles.some((c) => c.i === g.loc) && (fid === undefined ? !g.liege : g.id === f.leader || g.liege === f.leader);
  const isMine = (a: Army) => a.front === fid && !a.ikki;
  const free = () => Object.values(s.generals).filter((g) => g.clan === clan && g.status === 'free' && C.leader !== g.id && inFront(g)).sort((a, b) => troopMult(s, b) - troopMult(s, a) || b.lea - a.lea);
  // 新しい部隊（一月に一つまで）: 動員の余力と兵糧があれば
  const capLeft = fid === undefined ? mobilizeCap(s, clan) - farmTroops(s, clan) : fiefCapLeft(s, f);
  const affordable = C.food > R.NEW_ARMY_TROOPS * R.RECRUIT_COST + clanTroops(s, clan) * R.FOOD_PER_SOLDIER * 3;
  const g0 = free()[0];
  if (g0 && capLeft >= 2000 && affordable && (f.policy !== 'defend' || capLeft >= 5000)) {
    const castle = s.castles[g0.loc], occ = occupancy(s);
    const spot = [castle.hex, ...NEIGHBORS[castle.hex].filter((j) => s.castles[HEXES[j].d]?.owner === clan)].find((h) => !occ.has(h));
    if (spot !== undefined) {
      const a = formArmy(s, clan, castle, g0.id, Math.min(R.NEW_ARMY_TROOPS + 500, capLeft), spot);
      if (a) { a.front = fid; addLog(s, `${fid === undefined ? '委任' : frontName(s, f)}: ${g0.name}隊を編成した（${a.troops.toLocaleString()}人）。`, 'info', true); }
    }
  }
  // 軍団の傘下を埋める（担当の城にいる武将から）
  aiFillCorps(s, clan, (a) => isMine(a) && nearOwn(s, a), inFront);
  for (const g of free()) {
    const here = Object.values(s.armies).find((a) => a.hex === s.castles[g.loc].hex && isMine(a));
    if (here) attachAuto(s, here, g);
  }
  // 城主のいない城に、そこにいる武将を（魅力の高い者から）
  for (const c of castles) {
    if (c.governor) continue;
    const g = free().filter((x) => x.loc === c.i).sort((x, y) => y.cha - x.cha)[0];
    if (g) { c.governor = g.id; g.status = 'governor'; }
  }
  // 鉄砲・大筒の配備（自城の近くの部隊へ、兵の多い順）
  const mine = clanArmies(s, clan).filter(isMine).sort((x, y) => y.troops - x.troops);
  for (const a of mine) {
    if (!nearOwn(s, a)) continue;
    if (C.guns > 0 && (a.guns ?? 0) < gunCap(a)) armGuns(s, a, gunCap(a));
    if ((C.cannon ?? 0) > 0 && (a.cannon ?? 0) < R.CANNON_MAX && f.policy !== 'defend') armCannon(s, a, R.CANNON_MAX);
  }
  // 足軽: 給金が収入の3割（軍備増強は4割5分）に収まるうちは雇う
  const reserve = R.PLOT_GOLD * 2 + 2000;
  const share = f.policy === 'build' ? 0.45 : 0.3;
  if (fid === undefined) {
    for (let k = f.policy === 'build' ? 2 : 1, i = 0; k > 0 && i < mine.length; i++) {
      const a = mine[i];
      if (!nearOwn(s, a)) continue;
      if (C.gold < reserve + 6000 || (clanAshi(s, clan) + R.ASHI_STEP) * R.ASHI_WAGE > clanIncome(s, clan) * share) break;
      if (hireAshi(s, a, Math.min(R.ASHI_STEP, Math.floor((C.gold - reserve - 6000) / R.ASHI_HIRE)))) k--;
    }
  } else {
    // 領の足軽は領の蔵で雇う（給金が領の商いの収入の割合に収まるうち）
    const income = castles.reduce((t, c) => t + castleCom(c), 0) * (1 - R.FIEF_TRIBUTE);
    const ashi = mine.reduce((t, a) => t + a.troops * (a.ashi ?? 0), 0);
    for (let k = f.policy === 'build' ? 2 : 1, i = 0; k > 0 && i < mine.length; i++) {
      const a = mine[i];
      if (!nearOwn(s, a) || (f.gold ?? 0) < 800 || (ashi + R.ASHI_STEP) * R.ASHI_WAGE > income * share) break;
      const n = Math.min(R.ASHI_STEP, Math.floor(((f.gold ?? 0) - 500) / R.ASHI_HIRE));
      const g0 = C.gold; C.gold += n * R.ASHI_HIRE; // 領の蔵から出す
      const got = hireAshi(s, a, n);
      const spent = g0 + n * R.ASHI_HIRE - C.gold; C.gold = g0; f.gold = (f.gold ?? 0) - spent;
      if (got) k--;
    }
  }
}

// 部隊の行き先
function frontGoal(s: GameState, a: Army, f: Front, castles: Castle[], homeDist: number[]): number | null {
  const d = R.DIFFICULTY[s.difficulty];
  const dist = graphDistances([a.hex]);
  const home = castles.length ? castles : clanCastles(s, a.clan);
  if (!home.length) return null;
  const nearest = home.reduce((b, c) => (dist[c.hex] < dist[b.hex] ? c : b));
  if (a.routed || a.troops < d.rotation * a.departTroops || a.morale < 0.75) return nearest.hex;
  const threatened = home.map((c) => ({ c, t: enemyNear(s, a.clan, c.hex, 2) })).filter((x) => x.t > 0 && dist[x.c.hex] <= 6)
    .sort((x, y) => y.t / (dist[y.c.hex] + 1) - x.t / (dist[x.c.hex] + 1));
  if (f.policy === 'build') return threatened.length && dist[threatened[0].c.hex] <= 3 ? threatened[0].c.hex : nearest.hex;
  if (f.policy === 'defend') return threatened.length ? threatened[0].c.hex : nearest.hex;
  // 攻略: 兵が減っていて周りが静かなら補充に戻る
  const capLeft = mobilizeCap(s, a.clan) - clanTroops(s, a.clan);
  if (capLeft >= 1000 && a.troops < 0.6 * maxTroops(s, a) && enemyNear(s, a.clan, a.hex, 4) === 0 && s.clans[a.clan].food > 20000) return nearest.hex;
  // 担当の城が城兵だけでは持たない敵に迫られていれば、遠征より守りを先に

  const [k, v] = (f.target ?? '').split(':');
  if (k === 'castle') return s.castles[+v].hex;
  const want = k === 'clan' ? v : s.clans[a.clan].target;
  const wantFront = k === 'clan' ? Math.min(...s.castles.filter((c) => c.owner === v).map((c) => homeDist[c.hex])) : Infinity;
  let best: number | null = null, bs = -Infinity;
  for (const c of s.castles) {
    if (!hostile(s, a.clan, c.owner) || dist[c.hex] === Infinity) continue;
    if (k === 'clan' && c.owner !== want && c.owner !== null && homeDist[c.hex] >= wantFront) continue; // 目標の家と、その手前の城だけ
    const dd = dist[c.hex];
    // 担当の城から離れすぎない（目標の家を決めていれば少し遠くまで）
    if (dd > 12 || homeDist[c.hex] > (k === 'clan' ? R.FRONT_REACH + 4 : R.FRONT_REACH)) continue;
    const resist = c.garrison * castleDef(c) + enemyNear(s, a.clan, c.hex, 2) * 1.2 + 300;
    const power = a.troops * a.morale + localPower(s, a, c.hex) * 0.5;
    const focus = c.owner === want ? 2 : c.owner === null ? 1.2 : 1;
    const sc = (focus * (castleKoku(c) + 3) * Math.min(2, power / resist)) / (1 + dd / 3);
    if (sc > bs) { bs = sc; best = c.hex; }
  }
  return best ?? nearest.hex;
}

// 攻めてよい目標
function allowOf(s: GameState, f: Front, castles: Castle[], reach: number[]): (t: Target) => boolean {
  const near = (hex: number, r: number) => castles.some((c) => hexDist(c.hex, hex) <= r);
  if (f.policy === 'build') return (t) => t.kind === 'army' && near(t.hex, 1); // 城に取りついた敵だけ
  if (f.policy === 'defend') return (t) => t.kind === 'army' && near(t.hex, 2); // 担当の城に迫る敵だけ
  const [k, v] = (f.target ?? '').split(':');
  if (k === 'castle') { const tc = s.castles[+v]; return (t) => targetClanOf(s, t) === tc.owner || (t.kind === 'army' && near(t.hex, 2)); }
  if (k === 'clan') {
    // 目標の家と国人、担当の城に迫る敵、それに目標の家の城より手前（道をふさぐ家）
    const front = Math.min(...s.castles.filter((c) => c.owner === v).map((c) => reach[c.hex]));
    return (t) => targetClanOf(s, t) === v || targetClanOf(s, t) === null || (t.kind === 'army' && near(t.hex, 2)) || reach[t.hex] < front;
  }
  return () => true;
}

async function commandFront(s: GameState, f0: Front, fid: number | undefined, free = false) {
  let f = fid === undefined ? f0 : policyOf(s, f0);
  const castles = f.castles.map((i) => s.castles[i]).filter((c) => c.owner === s.player);
  organizeFront(s, f, castles, fid);
  const armies = clanArmies(s, s.player).filter((a) => a.front === fid && !a.ikki).sort((x, y) => y.troops - x.troops);
  if (!armies.length) return;
  const leader = s.generals[f.leader];
  // 目標の家の城が担当の城から届く範囲になければ（間に別の家があるなど）、届くまでは目標を絞らずに進む
  const reach = graphDistances((castles.length ? castles : clanCastles(s, s.player)).map((c) => c.hex));
  const [tk, tv] = (f.target ?? '').split(':');
  if (f.policy === 'attack' && tk === 'clan' && !s.castles.some((c) => c.owner === tv && reach[c.hex] <= R.FRONT_REACH + 4)) f = { ...f, target: null };
  // 直轄の委任（free）はAIの大名と同じく目標を絞らない
  const o: AttackOpts = { allow: free ? undefined : allowOf(s, f, castles, reach), noise: R.frontNoise(leader?.int ?? 50) };
  const d = R.DIFFICULTY[s.difficulty];
  const homeDist = reach;
  // 城兵だけでは持たない敵に迫られている担当の城（6ヘックス以内の部隊は、まずそこへ戻って迫る敵を叩く）
  const home = castles.length ? castles : clanCastles(s, s.player);
  const guard = (c: Castle) => c.garrison * castleDef(c) + clanArmies(s, s.player).filter((x) => hexDist(x.hex, c.hex) <= 1).reduce((v, x) => v + x.troops * x.morale, 0);
  const danger = home.filter((c) => enemyNear(s, s.player, c.hex, 2) > guard(c) * 0.8);
  for (const a of armies) {
    if (!s.armies[a.id] || a.acted) continue;
    const dist = graphDistances([a.hex]);
    const save = a.routed ? undefined : danger.filter((c) => dist[c.hex] <= 6).sort((x, y) => dist[x.hex] - dist[y.hex])[0];
    if (save) {
      const near = (t: Target) => t.kind === 'army' && hexDist(t.hex, save.hex) <= 2;
      const so: AttackOpts = { allow: near, noise: o.noise };
      if (await tryAttack(s, a, so)) continue;
      if (save.hex !== a.hex) moveToward(s, a, save.hex);
      if (s.armies[a.id] && !a.acted) await tryAttack(s, a, so);
      continue;
    }
    if (!a.routed && a.troops >= d.rotation * a.departTroops && (await tryAttack(s, a, o))) continue;
    const here = castleAt(s, a.hex);
    if (here && here.owner === s.player && enemyNear(s, s.player, a.hex, 1) > a.troops * a.morale * 0.5) continue; // 籠城
    const goal = frontGoal(s, a, f, castles, homeDist);
    if (goal !== null && goal !== a.hex) moveToward(s, a, goal);
    if (s.armies[a.id] && !a.acted && !a.routed) await tryAttack(s, a, o);
  }
  groupAssault(s, s.player, armies, o);
}

// 評定終了の初めに呼ぶ（命令はこの後のプレイヤーの開戦でまとめて解決される）
export async function runFronts(s: GameState) {
  const C = s.clans[s.player];
  if (!C?.alive) return;
  cleanFronts(s);
  decideStance(s, s.player); // 家全体の構えと主な敵（目標を任せた方面はこの敵へ向かう）
  for (const f of [...frontsOf(s)]) if (!f.vacant) await commandFront(s, f, f.id);
  if (delegateOf(s).military) {
    // 直轄: 家全体の方針（攻勢・均衡・守勢）で当主に代わってAIが動かす
    const castles = clanCastles(s, s.player).filter((c) => { const f = frontOfCastle(s, c); return !f || f.vacant; });
    const pseudo: Front = { id: 0, leader: C.leader ?? '', castles: castles.map((c) => c.i), policy: C.stance === '守勢' ? 'defend' : 'attack', target: null };
    await commandFront(s, pseudo, undefined, true);
  }
}

// 方面が戦った月は軍団長に功績
export function frontMerit(s: GameState) {
  for (const f of frontsOf(s)) if (!f.vacant && frontArmies(s, f).some((a) => a.fought === s.turn)) { const g = s.generals[f.leader]; if (g) g.merit += R.FRONT_MERIT; }
}
// 軍団長の統率: 方面の部隊の毎月の補充が増える
export function frontReinforce(s: GameState, a: Army) {
  const f = frontOfArmy(s, a);
  return f && !f.vacant ? Math.round((s.generals[f.leader]?.lea ?? 0) * R.FRONT_REINF) : 0;
}
// 軍団長の魅力: 担当の城の治安
export function frontChianOf(s: GameState, c: Castle) {
  const f = c.owner === s.player ? frontOfCastle(s, c) : undefined;
  return f && !f.vacant ? R.frontChian(s.generals[f.leader]?.cha ?? 0) : 0;
}
