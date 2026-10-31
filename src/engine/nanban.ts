// 南蛮貿易と布教: 南蛮船・南蛮市・大筒・宣教師・切支丹
import { BAPTISM, MISSION_BIAS, MISSIONARIES, NANBAN_ITEMS, NANBAN_PORTS } from '../data/nanban';
import { graphDistances, NEIGHBORS } from './map';
import { clanGuns, transferItem } from './money';
import { capital, desert } from './ops';
import { envoyLine } from './lines';
import * as R from './rules';
import { addLog, castleAt, clanArmies, clanCastles, clanName, rand } from './state';
import type { Army, Castle, GameState, Item, Ship } from './types';

// ───────── 港と南蛮船 ─────────
export const portsOpen = (s: GameState) => NANBAN_PORTS.filter(([, , year]) => s.year >= year);
const portDef = (id: string) => NANBAN_PORTS.find(([c]) => c === id);
export const portName = (id: string) => portDef(id)?.[1] ?? id;
export const isPort = (s: GameState, c: Castle) => portsOpen(s).some(([id]) => id === c.id);
const castleById = (s: GameState, id: string) => s.castles.find((c) => c.id === id);
export const portOwner = (s: GameState, id: string) => castleById(s, id)?.owner ?? null;
export const clanPorts = (s: GameState, clan: string) => portsOpen(s).filter(([id]) => portOwner(s, id) === clan);
// プレイヤー（その家）の港に来ている船
export const shipsOf = (s: GameState, clan: string) => (s.ships ?? []).filter((x) => portOwner(s, x.port) === clan);
export const shipGuns = (s: GameState, clan: string) => shipsOf(s, clan).reduce((t, x) => t + x.guns, 0);
export const shipCannon = (s: GameState, clan: string) => shipsOf(s, clan).reduce((t, x) => t + x.cannon, 0);
export const shipItems = (s: GameState, clan: string) => shipsOf(s, clan).flatMap((x) => x.cargo).map((id) => s.items[id]).filter(Boolean);
export const nanbanItemPrice = (it: Item) => it.grade * R.NANBAN_ITEM_PRICE;

function shipWeight(s: GameState, id: string, w: number) {
  const o = portOwner(s, id);
  if (!o) return w * R.SHIP_W_NOOWNER;
  const m = s.clans[o].mission;
  return w * (m === 'allow' ? R.SHIP_W_ALLOW : m === 'ban' ? R.SHIP_W_BAN : 1);
}
// 港ごとの来航のしやすさ（割合）
export function shipOdds(s: GameState): { id: string; p: number }[] {
  const ws = portsOpen(s).map(([id, , , w]) => ({ id, w: shipWeight(s, id, w) }));
  const sum = ws.reduce((t, x) => t + x.w, 0) || 1;
  return ws.map((x) => ({ id: x.id, p: x.w / sum }));
}

function arrive(s: GameState) {
  const n = 1 + (rand(s) < R.SHIP_EXTRA ? 1 : 0);
  let cands = portsOpen(s).map(([id, , , w]) => ({ id, w: shipWeight(s, id, w) }));
  const aboard = new Set((s.ships ?? []).flatMap((x) => x.cargo));
  for (let k = 0; k < n && cands.length; k++) {
    let r = rand(s) * cands.reduce((t, x) => t + x.w, 0);
    const pick = cands.find((x) => (r -= x.w) < 0) ?? cands[cands.length - 1];
    cands = cands.filter((x) => x !== pick);
    // 積荷: 市場にない南蛮の名物から1〜2点
    const pool = Object.values(s.items).filter((i) => i.kind === 'nanban' && !i.clan && !aboard.has(i.id));
    const cargo: string[] = [];
    for (let j = 1 + Math.floor(rand(s) * R.SHIP_ITEMS); j > 0 && pool.length; j--) cargo.push(pool.splice(Math.floor(rand(s) * pool.length), 1)[0].id);
    cargo.forEach((id) => aboard.add(id));
    const ship: Ship = { port: pick.id, until: s.turn + R.SHIP_STAY, guns: R.SHIP_GUNS, cannon: R.SHIP_CANNON, cargo };
    (s.ships ??= []).push(ship);
    const o = portOwner(s, pick.id);
    addLog(s, `南蛮船が${portName(pick.id)}に来航した${o ? `（${clanName(s, o)}家）` : ''}。${o === s.player ? '南蛮市が開いた（商い）。' : ''}`, 'econ', o === s.player);
    if (o === s.player) (s.scenes ??= []).push(envoyLine(s, 'shipArrive', { id: 'capitan', name: '南蛮船のカピタン' }, { port: portName(pick.id) }));
  }
}

// 月末: 来航中の船の利を港の持ち主へ、期限の来た船は去る。5月の末に新しい船が来る
export function monthShips(s: GameState) {
  for (const x of s.ships ?? []) {
    const o = portOwner(s, x.port);
    if (o && s.clans[o].alive) s.clans[o].gold += R.SHIP_TRADE;
  }
  const gone = (s.ships ?? []).filter((x) => s.turn >= x.until);
  for (const x of gone) if (portOwner(s, x.port) === s.player) addLog(s, `南蛮船が${portName(x.port)}を去った。`, 'econ', true);
  s.ships = (s.ships ?? []).filter((x) => s.turn < x.until);
  if (s.month === R.SHIP_MONTH - 1) arrive(s);
}

// ───────── 南蛮市 ─────────
export function buyShipGuns(s: GameState, clan: string, n: number): number {
  const C = s.clans[clan];
  n = Math.min(n, shipGuns(s, clan), Math.floor(C.gold / R.NANBAN_GUN_PRICE));
  if (n <= 0) return 0;
  let left = n;
  for (const x of shipsOf(s, clan)) { const k = Math.min(left, x.guns); x.guns -= k; left -= k; }
  C.gold -= n * R.NANBAN_GUN_PRICE; C.guns += n;
  return n;
}
export function buyShipCannon(s: GameState, clan: string, n: number): number {
  const C = s.clans[clan];
  n = Math.min(n, shipCannon(s, clan), Math.floor(C.gold / R.CANNON_PRICE));
  if (n <= 0) return 0;
  let left = n;
  for (const x of shipsOf(s, clan)) { const k = Math.min(left, x.cannon); x.cannon -= k; left -= k; }
  C.gold -= n * R.CANNON_PRICE; C.cannon = (C.cannon ?? 0) + n;
  return n;
}
export function buyShipItem(s: GameState, clan: string, id: string): boolean {
  const ship = shipsOf(s, clan).find((x) => x.cargo.includes(id));
  const it = s.items[id];
  if (!ship || !it || it.clan || s.clans[clan].gold < nanbanItemPrice(it)) return false;
  s.clans[clan].gold -= nanbanItemPrice(it);
  ship.cargo = ship.cargo.filter((x) => x !== id);
  transferItem(s, it, clan);
  addLog(s, `${clanName(s, clan)}家が南蛮の品「${it.name}」を手に入れた。`, 'info', true);
  return true;
}

// ───────── 大筒 ─────────
export const clanCannon = (s: GameState, clan: string) => (s.clans[clan].cannon ?? 0) + clanArmies(s, clan).reduce((t, a) => t + (a.cannon ?? 0), 0);
// 蔵の大筒を部隊に持たせる（n<0 で蔵へ戻す）
export function armCannon(s: GameState, a: Army, n: number) {
  const C = s.clans[a.clan];
  const cur = a.cannon ?? 0;
  const next = Math.max(0, Math.min(R.CANNON_MAX, cur + Math.min(n, C.cannon ?? 0)));
  C.cannon = (C.cannon ?? 0) - (next - cur); a.cannon = next;
}

// ───────── 布教 ─────────
export const missionLabel = (m: 'allow' | 'ban' | undefined) => (m === 'allow' ? '布教を許す' : m === 'ban' ? '禁教' : '定めず');
export function missionBlock(s: GameState, clan: string, p: 'allow' | 'ban'): string | null {
  const C = s.clans[clan];
  if (C.mission === p) return p === 'allow' ? 'すでに許している' : 'すでに禁じている';
  if (C.missionAt !== undefined && s.turn - C.missionAt < R.MISSION_COOLDOWN) return `あと${C.missionAt + R.MISSION_COOLDOWN - s.turn}か月は改められない`;
  return null;
}
export function setMission(s: GameState, clan: string, p: 'allow' | 'ban', home?: string) {
  const C = s.clans[clan];
  C.mission = p; C.missionAt = s.turn;
  for (const m of Object.values(s.missions ?? {})) if (p === 'ban' && m.home === clan) m.home = null;
  if (home && s.missions?.[home]) s.missions[home].home = clan;
  addLog(s, p === 'allow' ? `${clanName(s, clan)}家が領内での布教を許した。` : `${clanName(s, clan)}家が切支丹を禁じた。`, 'info', clan === s.player);
}
export const misName = (id: string) => MISSIONARIES.find(([m]) => m === id)?.[1] ?? id;
export const misDef = (id: string) => MISSIONARIES.find(([m]) => m === id);
export const missionaryActive = (s: GameState, id: string) => { const d = misDef(id); return !!d && s.year >= d[3] && s.year < d[4]; };
// 宣教師が身を寄せている家
export const missionHome = (s: GameState, clan: string) => Object.entries(s.missions ?? {}).filter(([id, m]) => m.home === clan && missionaryActive(s, id)).map(([id]) => id);
export const baptized = (s: GameState, clan: string) => Object.values(s.generals).filter((g) => g.kiri && g.clan === clan && g.status !== 'dead' && g.status !== 'captive');

// AI: 布教を許すか（許す / 禁じる / 定めず）
function aiMission(s: GameState, clan: string): 'allow' | 'ban' | null {
  if (clan === R.IKKI_CLAN) return 'ban';
  const C = s.clans[clan];
  const lead = C.leader ? s.generals[C.leader] : null;
  if (lead?.kiri) return 'allow';
  const p = 0.2 + (MISSION_BIAS[clan] ?? 0) + (clanPorts(s, clan).length ? 0.2 : 0) + 0.1 * Math.min(3, baptized(s, clan).length);
  if (rand(s) < p) return 'allow';
  return rand(s) < 0.4 ? 'ban' : null;
}

// 宣教師の動き: 来日・離日、許していない家を訪ねて布教の許しを願い出る
function monthMissions(s: GameState) {
  s.missions ??= {};
  for (const [id, name, , from, to, base] of MISSIONARIES) {
    if (s.year < from) continue;
    if (s.year >= to) {
      if (s.missions[id]) { delete s.missions[id]; addLog(s, `宣教師${name}が日本を去った。`, 'info', false); }
      continue;
    }
    if (!s.missions[id]) {
      s.missions[id] = { home: null, next: s.turn + 1 + Math.floor(rand(s) * 4) };
      if (s.year > from || s.month > 1 || s.turn > 0) addLog(s, `宣教師${name}が来日した。`, 'info', false);
    }
    const m = s.missions[id];
    if (m.home && (!s.clans[m.home]?.alive || s.clans[m.home].mission !== 'allow')) m.home = null;
    if (s.turn < m.next) continue;
    m.next = s.turn + R.MISSION_VISIT[0] + Math.floor(rand(s) * (R.MISSION_VISIT[1] - R.MISSION_VISIT[0] + 1));
    const from0 = (m.home && capital(s, m.home)) || castleById(s, base);
    const d = graphDistances([from0?.hex ?? 0]);
    // 訪ねるのは近くの数家だけ（布教は港と身を寄せた家から少しずつ広がる）
    const dist = (id: string) => d[capital(s, id)?.hex ?? 0] ?? 99;
    const near = new Set(Object.values(s.clans).filter((C) => C.alive && !C.foreign && clanCastles(s, C.id).length).sort((x, y) => dist(x.id) - dist(y.id)).slice(0, R.MISSION_NEAR).map((C) => C.id));
    const cands = Object.values(s.clans).filter((C) => near.has(C.id) && C.id !== R.IKKI_CLAN && C.mission !== 'allow'
      && !(C.mission === 'ban' && C.missionAt !== undefined && s.turn - C.missionAt < R.MISSION_REVISIT_BAN)
      && !(C.missionAsked !== undefined && s.turn - C.missionAsked < R.MISSION_REVISIT)
      && !(C.id === s.player && s.missionVisit))
      .map((C) => ({ C, w: (clanPorts(s, C.id).length ? 3 : 1) * (0.5 + C.prestige / 100) / (1 + dist(C.id) / 4) ** 2 }));
    if (!cands.length) {
      // 訪ねる家がなければ、許した家に身を寄せる
      if (!m.home) m.home = Object.values(s.clans).filter((C) => C.alive && C.mission === 'allow').sort((x, y) => (d[capital(s, x.id)?.hex ?? 0] ?? 99) - (d[capital(s, y.id)?.hex ?? 0] ?? 99))[0]?.id ?? null;
      continue;
    }
    let r = rand(s) * cands.reduce((t, x) => t + x.w, 0);
    const C = (cands.find((x) => (r -= x.w) < 0) ?? cands[cands.length - 1]).C;
    C.missionAsked = s.turn;
    if (C.id === s.player) {
      s.missionVisit = { mis: id, turn: s.turn };
      addLog(s, `宣教師${name}が布教の許しを願い出てきた。`, 'info', true);
      continue;
    }
    const ans = aiMission(s, C.id);
    if (ans === 'allow') setMission(s, C.id, 'allow', id);
    else if (ans === 'ban' && C.mission !== 'ban') setMission(s, C.id, 'ban');
  }
  // 返事をしないまま月が替われば、願い出は流れる
  if (s.missionVisit && s.turn - s.missionVisit.turn >= 1) s.missionVisit = null;
}
// プレイヤーの返事
export function answerMission(s: GameState, ans: 'allow' | 'ban' | 'hold') {
  const v = s.missionVisit;
  if (!v) return;
  s.missionVisit = null;
  if (ans === 'hold') { addLog(s, `宣教師${misName(v.mis)}への返事を見合わせた。`, 'info', true); return; }
  if (missionBlock(s, s.player, ans)) return;
  setMission(s, s.player, ans, ans === 'allow' ? v.mis : undefined);
}

// 城の信者・洗礼・禁教の出奔
function monthKiri(s: GameState) {
  const homes = new Set(Object.entries(s.missions ?? {}).filter(([id, m]) => m.home && missionaryActive(s, id)).map(([, m]) => m.home));
  for (const c of s.castles) {
    const C = c.owner ? s.clans[c.owner] : null;
    if (C?.mission === 'allow') {
      const gov = c.governor ? s.generals[c.governor] : null;
      const grow = R.KIRI_GROW + (homes.has(C.id) ? R.KIRI_GROW_MIS : 0) + (gov?.kiri ? R.KIRI_GROW_GOV : 0) + (isPort(s, c) ? R.KIRI_GROW_PORT : 0);
      c.kiri = Math.min(R.KIRI_MAX, (c.kiri ?? 0) + grow * Math.max(0.2, 1 - (c.kiri ?? 0) / R.KIRI_MAX));
    } else if (c.kiri) {
      c.kiri = Math.max(0, c.kiri - (C?.mission === 'ban' ? R.KIRI_DECAY : 0.5));
    }
  }
  for (const g of Object.values(s.generals)) {
    const y = BAPTISM[g.id];
    if (y !== undefined && !g.kiri && s.year >= y && g.status !== 'dead') {
      g.kiri = true;
      if (g.clan && g.status !== 'young') addLog(s, `${g.name}が洗礼を受けた。`, 'info', g.clan === s.player);
    }
  }
  for (const C of Object.values(s.clans)) {
    if (!C.alive || C.mission !== 'ban') continue;
    for (const g of baptized(s, C.id)) {
      if (g.kin || C.leader === g.id || !['free', 'governor', 'army'].includes(g.status)) continue;
      if (rand(s) < R.BAN_LEAVE) desert(s, g, `${g.name}は禁教を嫌い、${clanName(s, C.id)}家を去った`);
    }
  }
}

export function monthlyNanban(s: GameState) {
  monthShips(s);
  monthMissions(s);
  monthKiri(s);
}

// ───────── AI ─────────
export function aiNanban(s: GameState, clan: string) {
  const C = s.clans[clan];
  const reserve = R.PLOT_GOLD * 2 + 2000;
  if (shipsOf(s, clan).length) {
    // 鉄砲: 安いので兵の3割まで
    const troops = clanArmies(s, clan).reduce((t, a) => t + a.troops, 0);
    const want = Math.round(troops * 0.3) - clanGuns(s, clan);
    if (want > 0 && C.gold > reserve) buyShipGuns(s, clan, Math.min(want, Math.floor((C.gold - reserve) / R.NANBAN_GUN_PRICE)));
    // 大筒: 余裕があれば部隊の数まで
    if (C.gold > reserve + R.CANNON_PRICE * 3 && clanCannon(s, clan) < Math.min(6, clanArmies(s, clan).length * 2)) buyShipCannon(s, clan, 1);
    // 南蛮の名物
    const it = shipItems(s, clan).sort((x, y) => y.grade - x.grade)[0];
    if (it && C.gold > reserve + nanbanItemPrice(it) * 2) buyShipItem(s, clan, it.id);
  }
  // 自城（とその隣）にいる大きな部隊に大筒を持たせる
  for (const a of clanArmies(s, clan).sort((x, y) => y.troops - x.troops)) {
    if (!C.cannon) break;
    const home = castleAt(s, a.hex)?.owner === clan || NEIGHBORS[a.hex].some((j) => castleAt(s, j)?.owner === clan);
    if (home && (a.cannon ?? 0) < R.CANNON_MAX) armCannon(s, a, R.CANNON_MAX);
  }
}

// ───────── 開始・旧セーブ ─────────
export function initNanban(s: GameState) {
  s.ships ??= [];
  s.missions ??= {};
  s.missionVisit ??= null;
  for (const [id, name, grade] of NANBAN_ITEMS) if (!s.items[id]) s.items[id] = { id, name, kind: 'nanban', grade, clan: null, holder: null };
  for (const g of Object.values(s.generals)) { const y = BAPTISM[g.id]; if (y !== undefined && s.year >= y) g.kiri = true; }
  // 開始時にすでに許していた家（ザビエル以来の大友、平戸の松浦）
  for (const id of ['otomo', 'matsura']) if (s.clans[id]?.alive && !s.clans[id].mission) s.clans[id].mission = 'allow';
}
