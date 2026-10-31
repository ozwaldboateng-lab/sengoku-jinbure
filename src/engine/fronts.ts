// 方面軍団（プレイヤー）: 軍団長に担当の城と部隊を任せ、方針（攻略・防衛・軍備増強）に従ってAIが動かす。
// 「軍事」を委任すると、方面に入れていない直轄の部隊と城も、家全体の方針でAIが動かす。
import { decideStance, enemyNear, groupAssault, localPower, moveToward, tryAttack, type AttackOpts } from './ai';
import { aiFillCorps, attachAuto } from './corps';
import { delegateOf } from './delegate';
import { graphDistances, hexDist, HEXES, NEIGHBORS } from './map';
import { armGuns, clanIncome, gunCap, hireAshi } from './money';
import type { Target } from './move';
import { armCannon } from './nanban';
import { formArmy } from './ops';
import * as R from './rules';
import { addLog, castleAt, castleDef, castleKoku, clanArmies, clanAshi, clanCastles, clanKoku, clanName, clanTroops, farmTroops, hostile, maxTroops, mobilizeCap, occupancy, troopMult } from './state';
import type { Army, Castle, Front, FrontPolicy, GameState, General } from './types';

// ───────── 参照 ─────────
export const frontsOf = (s: GameState) => (s.fronts ??= []);
export const frontById = (s: GameState, id: number | undefined) => (id === undefined ? undefined : frontsOf(s).find((f) => f.id === id));
export const frontOfArmy = (s: GameState, a: Army) => (a.clan === s.player ? frontById(s, a.front) : undefined);
export const frontOfCastle = (s: GameState, c: Castle) => frontsOf(s).find((f) => f.castles.includes(c.i));
export const frontName = (s: GameState, f: Front) => `${s.generals[f.leader]?.name ?? '？'}軍団`;
export const frontArmies = (s: GameState, f: Front) => clanArmies(s, s.player).filter((a) => a.front === f.id && !a.ikki);
// プレイヤーが自分で動かせない部隊（方面に属するか、軍事を委任している）
export const delegatedArmy = (s: GameState, a: Army) => a.clan === s.player && (!!frontOfArmy(s, a) || !!delegateOf(s).military);
export function frontMax(s: GameState, clan = s.player) {
  if (clanCastles(s, clan).length < 3) return 0;
  return Math.min(R.FRONT_MAX, 1 + Math.floor(clanKoku(s, clan) / R.FRONT_KOKU));
}
export function targetLabel(s: GameState, f: Front) {
  if (!f.target) return '（軍団長に任せる）';
  const [k, v] = f.target.split(':');
  return k === 'clan' ? `${clanName(s, v)}家` : s.castles[+v]?.name ?? '？';
}
export const leaderOk = (s: GameState, g: General | undefined) => !!g && g.clan === s.player && s.clans[s.player].leader !== g.id && (g.rank === 0 || !!g.kin)
  && !['young', 'captive', 'dead', 'ronin'].includes(g.status);
// 軍団長になれる武将（他の方面を率いていない宿老・一門）
export const leaderCands = (s: GameState) => Object.values(s.generals).filter((g) => leaderOk(s, g) && !frontsOf(s).some((f) => f.leader === g.id))
  .sort((x, y) => y.lea + y.cha - (x.lea + x.cha));

// ───────── 編成 ─────────
export function createFront(s: GameState, leaderId: string): Front | null {
  const g = s.generals[leaderId];
  if (frontsOf(s).length >= frontMax(s) || !leaderCands(s).some((x) => x.id === leaderId)) return null;
  const f: Front = { id: (s.nextFrontId = (s.nextFrontId ?? 0) + 1), leader: leaderId, castles: [], policy: 'build', target: null };
  frontsOf(s).push(f);
  // 軍団長のいる城（または率いる部隊のいる城）と、その部隊をまず任せる
  const a = g.army !== null ? s.armies[g.army] : undefined;
  const here = a ? castleAt(s, a.hex) : s.castles[g.loc];
  if (here && here.owner === s.player && !frontOfCastle(s, here)) f.castles.push(here.i);
  if (a && a.clan === s.player) a.front = f.id;
  addLog(s, `${g.name}を軍団長とする${frontName(s, f)}を設けた。`, 'info', true);
  return f;
}
export function dissolveFront(s: GameState, f: Front, why = '') {
  for (const a of Object.values(s.armies)) if (a.front === f.id) a.front = undefined;
  s.fronts = frontsOf(s).filter((x) => x !== f);
  addLog(s, `${frontName(s, f)}を解いた${why}。`, 'info', true);
}
export function setFrontCastle(s: GameState, f: Front, c: Castle, on: boolean) {
  for (const x of frontsOf(s)) x.castles = x.castles.filter((i) => i !== c.i);
  if (on && c.owner === s.player) f.castles.push(c.i);
}
export function setArmyFront(s: GameState, a: Army, f: Front | null) { a.front = f ? f.id : undefined; }
export function setFrontPolicy(s: GameState, f: Front, p: FrontPolicy, target: string | null = f.target) {
  f.policy = p; f.target = p === 'attack' ? target : null;
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

// 毎月の整理: 失った城を外し、方面の部隊が落とした城をその方面に加え、軍団長がいなくなれば解く
export function cleanFronts(s: GameState) {
  for (const f of [...frontsOf(s)]) {
    if (!leaderOk(s, s.generals[f.leader])) { dissolveFront(s, f, `（軍団長の${s.generals[f.leader]?.name ?? ''}がいなくなった）`); continue; }
    f.castles = f.castles.filter((i) => s.castles[i].owner === s.player);
    if (f.target) {
      const [k, v] = f.target.split(':');
      if ((k === 'clan' && !s.clans[v]?.alive) || (k === 'castle' && (s.castles[+v].owner === s.player || !hostile(s, s.player, s.castles[+v].owner)))) {
        addLog(s, `${frontName(s, f)}: 攻略目標の${targetLabel(s, f)}を${k === 'castle' && s.castles[+v].owner === s.player ? '手に入れた' : '果たした'}。次の目標は軍団長に任せる。`, 'info', true);
        f.target = null;
      }
    }
  }
  for (const c of clanCastles(s, s.player)) {
    if (frontOfCastle(s, c)) continue;
    const a = Object.values(s.armies).find((x) => x.hex === c.hex && x.clan === s.player && frontById(s, x.front));
    if (a) frontById(s, a.front)!.castles.push(c.i);
  }
  for (const a of clanArmies(s, s.player)) if (a.front !== undefined && !frontById(s, a.front)) a.front = undefined;
}

// ───────── AIによる指揮 ─────────
const nearOwn = (s: GameState, a: Army) => castleAt(s, a.hex)?.owner === a.clan || NEIGHBORS[a.hex].some((j) => castleAt(s, j)?.owner === a.clan);
const targetClanOf = (s: GameState, t: Target) => (t.kind === 'army' ? t.army.clan : s.castles[t.castle].owner);

// 方面の人事・編成・配備・足軽（軍団長に任せる）
function organizeFront(s: GameState, f: Front, castles: Castle[], fid: number | undefined) {
  const clan = s.player, C = s.clans[clan];
  const inFront = (g: General) => castles.some((c) => c.i === g.loc);
  const isMine = (a: Army) => a.front === fid && !a.ikki;
  const free = () => Object.values(s.generals).filter((g) => g.clan === clan && g.status === 'free' && C.leader !== g.id && inFront(g)).sort((a, b) => troopMult(s, b) - troopMult(s, a) || b.lea - a.lea);
  // 新しい部隊（一月に一つまで）: 動員の余力と兵糧があれば
  const capLeft = mobilizeCap(s, clan) - farmTroops(s, clan);
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
  for (let k = f.policy === 'build' ? 2 : 1, i = 0; k > 0 && i < mine.length; i++) {
    const a = mine[i];
    if (!nearOwn(s, a)) continue;
    if (C.gold < reserve + 6000 || (clanAshi(s, clan) + R.ASHI_STEP) * R.ASHI_WAGE > clanIncome(s, clan) * share) break;
    if (hireAshi(s, a, Math.min(R.ASHI_STEP, Math.floor((C.gold - reserve - 6000) / R.ASHI_HIRE)))) k--;
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
  let f = f0;
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
  for (const f of [...frontsOf(s)]) await commandFront(s, f, f.id);
  if (delegateOf(s).military) {
    // 直轄: 家全体の方針（攻勢・均衡・守勢）で当主に代わってAIが動かす
    const castles = clanCastles(s, s.player).filter((c) => !frontOfCastle(s, c));
    const pseudo: Front = { id: 0, leader: C.leader ?? '', castles: castles.map((c) => c.i), policy: C.stance === '守勢' ? 'defend' : 'attack', target: null };
    await commandFront(s, pseudo, undefined, true);
  }
}

// 方面が戦った月は軍団長に功績
export function frontMerit(s: GameState) {
  for (const f of frontsOf(s)) if (frontArmies(s, f).some((a) => a.fought === s.turn)) { const g = s.generals[f.leader]; if (g) g.merit += R.FRONT_MERIT; }
}
// 軍団長の統率: 方面の部隊の毎月の補充が増える
export function frontReinforce(s: GameState, a: Army) {
  const f = frontOfArmy(s, a);
  return f ? Math.round((s.generals[f.leader]?.lea ?? 0) * R.FRONT_REINF) : 0;
}
// 軍団長の魅力: 担当の城の治安
export function frontChianOf(s: GameState, c: Castle) {
  const f = c.owner === s.player ? frontOfCastle(s, c) : undefined;
  return f ? R.frontChian(s.generals[f.leader]?.cha ?? 0) : 0;
}
