// 御恩と奉公: 武将ごとの恩。功を立てても報われなければ下がり、報いれば上がる。
// 低いと出奔・城ごとの寝返り・方面軍団の謀反を招き、他家の調略や捕虜の登用にも乗りやすくなる。
import { delegateOf } from './delegate';
import { followers } from './bushi';
import { hexDist } from './map';
import { pushScene } from './lines';
import { desert, eliminateClan } from './ops';
import * as R from './rules';
import { addLog, castleKoku, clanArmies, clanCastles, clanName, hostile, rand } from './state';
import type { Army, Castle, Clan, Front, GameState, General } from './types';

const ACTIVE = ['free', 'army', 'governor', 'bugyo', 'tsukai'];
export const onOf = (g: General) => g.on ?? R.ON_START;
export const dueOf = (g: General) => Math.max(0, Math.round(g.merit - (g.paid ?? g.merit)));
export const isLord = (s: GameState, g: General) => !!g.clan && s.clans[g.clan]?.leader === g.id;
export const vassalsOf = (s: GameState, clan: string) => Object.values(s.generals).filter((g) => g.clan === clan && ACTIVE.includes(g.status) && !g.ikki && !isLord(s, g));
// 家の「御恩の評判」: 家臣の恩の平均
export function goodwill(s: GameState, clan: string) {
  const v = vassalsOf(s, clan);
  return v.length ? v.reduce((t, g) => t + onOf(g), 0) / v.length : R.ON_START;
}
export const onLabel = (on: number) => (on >= 75 ? '厚い' : on >= 50 ? '並' : on >= 30 ? '薄い' : on >= R.ON_LEAVE ? '不満' : '離反寸前');
const bump = (g: General, v: number) => { g.on = Math.max(0, Math.min(100, onOf(g) + v)); };

// 開始時・新参・旧セーブ
export function initOn(s: GameState, g: General, fresh = false) {
  g.on = fresh ? R.ON_NEW : R.ON_START + (g.kin ? 15 : 0);
  g.paid = g.merit;
  if (g.home === undefined && g.clan && s.castles[g.loc]?.owner === g.clan) g.home = g.loc;
}
export function migrateOn(s: GameState) { for (const g of Object.values(s.generals)) if (g.on === undefined) initOn(s, g); }

// ───────── 恩賞 ─────────
export const kanjoBlock = (s: GameState, g: General) => (dueOf(g) <= 0 ? '報いる功がない' : g.kanjoTurn !== undefined && s.turn - g.kanjoTurn < R.ON_KANJO_MONTHS ? `感状はあと${g.kanjoTurn + R.ON_KANJO_MONTHS - s.turn}か月後から` : null);
export function kanjo(s: GameState, g: General): boolean {
  if (kanjoBlock(s, g)) return false;
  g.paid = (g.paid ?? g.merit) + Math.min(dueOf(g), R.ON_KANJO_PAY);
  g.kanjoTurn = s.turn; bump(g, R.ON_KANJO);
  return true;
}
export const kazoCost = (g: General) => Math.ceil(dueOf(g) * R.ON_GOLD);
export function kazo(s: GameState, g: General): boolean {
  const due = dueOf(g), cost = kazoCost(g), C = g.clan ? s.clans[g.clan] : null;
  if (!C || due <= 0 || C.gold < cost) return false;
  C.gold -= cost; g.paid = g.merit; bump(g, R.ON_KAZO(due));
  return true;
}
// 昇進できるか（功績が足り、宿老の枠があるか）
export function promoteBlock(s: GameState, g: General, karoFull: boolean): string | null {
  if (g.rank <= 0 || g.status === 'young') return 'これ以上は上がらない';
  if (g.merit < R.MERIT_AT[g.rank - 1]) return `功績${R.MERIT_AT[g.rank - 1]}から`;
  if (g.rank === 1 && !g.kin && karoFull) return '宿老の枠がない（石高で増える）';
  return null;
}
// 昇進した分の恩（身分の上げ下げは ranks.ts）
export function onPromoted(g: General) { g.paid = Math.min(g.merit, (g.paid ?? g.merit) + R.ON_PROMOTE_PAY); bump(g, R.ON_PROMOTE); }
export function onGift(g: General, grade: number) { g.paid = Math.min(g.merit, (g.paid ?? g.merit) + grade * R.ON_ITEM_PAY); bump(g, grade * R.ON_ITEM); }

// AI（と人事を委任したプレイヤー）: 未払いが溜まった者から、金があれば加増、なければ感状
function aiReward(s: GameState, clan: string) {
  const C = s.clans[clan], reserve = R.PLOT_GOLD * 2 + 2000;
  for (const g of vassalsOf(s, clan).filter((x) => dueOf(x) >= R.ON_DUE_FREE + 10).sort((a, b) => onOf(a) - onOf(b))) {
    if (C.gold - kazoCost(g) > reserve && (onOf(g) < 50 || dueOf(g) >= 60)) kazo(s, g); else kanjo(s, g);
  }
}

// ───────── 毎月 ─────────
export function monthlyOn(s: GameState) {
  for (const C of Object.values(s.clans)) {
    if (!C.alive) continue;
    if (C.id !== s.player || delegateOf(s).staff) aiReward(s, C.id);
    for (const g of vassalsOf(s, C.id)) {
      const due = dueOf(g), on = onOf(g);
      if (due >= R.ON_DUE_FREE) bump(g, -R.ON_DUE_DROP(due));
      else bump(g, (R.ON_TARGET + (g.kin ? 10 : 0) - on) * 0.03);
      if (g.status === 'governor') bump(g, R.ON_GOV);
      if (g.home !== undefined) {
        const h = s.castles[g.home];
        if (h.owner === C.id && g.homeLost) { bump(g, R.ON_HOME_BACK); g.homeLost = false; if (C.id === s.player) addLog(s, `${g.name}の本領${h.name}が戻った。`, 'info', true); }
        else if (h.owner !== C.id && hostile(s, C.id, h.owner)) { bump(g, -R.ON_HOME_LOST); g.homeLost = true; }
      }
    }
    consequences(s, C);
  }
}

function consequences(s: GameState, C: Clan) {
  if (!C.alive) return;
  const mine = C.id === s.player;
  // 方面軍団の謀反（プレイヤー）
  if (mine) for (const f of [...(s.fronts ?? [])]) {
    const g = s.generals[f.leader];
    const on = g ? onOf(g) - (g.outer ? R.OUTER_SHIFT : 0) : 100;
    if (g && on < R.ON_REBEL && rand(s) < R.onRebelChance(on)) { rebelFront(s, f); if (!C.alive) return; }
  }
  for (const g of vassalsOf(s, C.id)) {
    const on = onOf(g) - (g.outer ? R.OUTER_SHIFT : 0); // 外から官を受けた者は、外に戻る門を持っている
    if (g.kin) continue;
    // 城主の寝返り: 近くに敵の城があり、城に自家の部隊がいない
    if (g.status === 'governor' && on < R.ON_BETRAY) {
      const c = s.castles.find((x) => x.governor === g.id);
      if (c && rand(s) < R.onBetrayChance(on)) {
        const to = betrayTarget(s, c, C.id);
        if (to && !clanArmies(s, C.id).some((a) => hexDist(a.hex, c.hex) <= 1)) { betray(s, c, g, to); continue; }
      }
    }
    if (on < R.ON_LEAVE && g.status !== 'army' && rand(s) < R.onLeaveChance(on)) {
      if (mine) pushScene(s, g, 'leaveNeglect');
      const fol = followers(s, g, C.id, 50);
      desert(s, g, `${g.name}は恩賞の薄さを恨み、${C.name}家を去った`);
      for (const f of fol) { if (mine) pushScene(s, f, 'follow', { leader: g.name }); desert(s, f, `${f.name}は${g.name}に従って${C.name}家を去った`); }
    }
  }
}
function betrayTarget(s: GameState, c: Castle, clan: string): string | null {
  const near = s.castles.filter((x) => x.owner && x.owner !== clan && hostile(s, clan, x.owner) && hexDist(x.hex, c.hex) <= 3).map((x) => x.owner!);
  if (!near.length) return null;
  const g = c.governor ? s.generals[c.governor] : null;
  if (g?.outer && near.includes(g.outer)) return g.outer; // 官をくれた家へ
  const pow = (id: string) => clanCastles(s, id).reduce((t, k) => t + castleKoku(k), 0);
  return near.sort((a, b) => pow(b) - pow(a))[0];
}
function betray(s: GameState, c: Castle, g: General, to: string) {
  const from = c.owner!;
  if (from === s.player) pushScene(s, g, 'betray', { castle: c.name, foe: clanName(s, to) });
  for (const f of s.fronts ?? []) f.castles = f.castles.filter((i) => i !== c.i);
  c.owner = to; g.clan = to; g.on = R.ON_NEW + 10; g.paid = g.merit; g.boss = undefined;
  c.chian = Math.min(c.chian, R.CHIAN_CAPTURED + 10);
  addLog(s, `${c.name}の城主${g.name}が${clanName(s, from)}家を見限り、城ごと${clanName(s, to)}家に寝返った。`, 'castle', from === s.player || to === s.player);
  if (!clanCastles(s, from).length) eliminateClan(s, from, to);
}

// 家が割れる: g が城と部隊を率いて新しい家を立てる（方面軍団の謀反・お家騒動）
export function splitClan(s: GameState, g: General, from: string, castles: number[], armies: Army[], why: string): string | null {
  const base = g.name.slice(0, 2);
  const name = Object.values(s.clans).some((c) => c.name === base && c.alive) ? g.name : base;
  const id = `reb_${g.id}_${s.turn}`;
  const C: Clan = { id, name, color: '#9a7b4f', leader: g.id, prestige: 30, food: 20000, alive: true, stance: '均衡', target: from, gold: 2000, guns: 0, budget: { chisui: 10, hodo: 10 }, focus: null, mobilize: R.MOBILIZE_DEFAULT, court: 0 };
  s.clans[id] = C; C.splitFrom = from;
  const join = (x: General) => { if (x.army !== null && !armies.some((a) => a.id === x.army)) return; x.clan = id; x.on = R.ON_NEW + 15; x.paid = x.merit; };
  if (g.army !== null && s.armies[g.army] && !armies.includes(s.armies[g.army])) armies = [...armies, s.armies[g.army]];
  join(g); g.rank = 0;
  for (const i of castles) {
    const c = s.castles[i];
    if (c.owner !== from) continue;
    c.owner = id;
    for (const f of s.fronts ?? []) f.castles = f.castles.filter((x) => x !== i);
    if (c.governor) join(s.generals[c.governor]);
    for (const x of Object.values(s.generals)) if (x.clan === from && x.status === 'free' && x.loc === i) join(x);
  }
  // 縁のある者（恩の薄い者）がついて来る
  const home = clanCastles(s, id)[0];
  if (home) for (const f of followers(s, g, from, 60)) { f.clan = id; f.status = 'free'; f.loc = home.i; f.on = R.ON_NEW + 15; f.paid = f.merit; for (const c of s.castles) if (c.governor === f.id) c.governor = null; }
  for (const a of armies) {
    a.clan = id; a.front = undefined;
    for (const gid of [a.main, ...(a.staff ?? [])]) if (s.generals[gid]) { s.generals[gid].clan = id; s.generals[gid].on = R.ON_NEW + 15; s.generals[gid].paid = s.generals[gid].merit; }
    C.food += a.troops * R.FOOD_PER_SOLDIER * 6;
  }
  addLog(s, `${g.name}が${why}！ ${clanCastles(s, id).length}城を率いて${name}家を立てた。`, 'castle', from === s.player);
  if (!clanCastles(s, id).length) C.alive = false;
  if (!clanCastles(s, from).length) eliminateClan(s, from, id);
  return C.alive ? id : null;
}

// 方面軍団の謀反: 軍団長が担当の城と部隊を率いて独り立ちする
export function rebelFront(s: GameState, f: Front) {
  const g = s.generals[f.leader], from = s.player;
  if (!g) return;
  pushScene(s, g, 'rebel');
  const armies = clanArmies(s, from).filter((x) => x.front === f.id);
  s.fronts = (s.fronts ?? []).filter((x) => x !== f);
  splitClan(s, g, from, [...f.castles], armies, '謀反');
}
