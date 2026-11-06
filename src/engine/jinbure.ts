// 陣触と陣払い: 平時の軍団は城の名簿（s.camps）として地図に出ず、兵糧もかからない。陣触で集まって地図に現れる
// 陣触: 翌月に名簿の兵がそろって現れる。急ぎの陣触: その月のうちに名簿の半分が現れ、残りは翌月に追いつく
// 陣払い: 本国の自分の城か、その隣にいる軍団を名簿に戻す（その月の行動を使う）。海の向こうでは陣払いできない
import { membersOf, staffOf, treeOf, attachAuto, levelOf } from './corps';
import { HEXES, NEIGHBORS, graphDistances, hexDist, isForeignHex } from './map';
import { nearestOwnCastle } from './ops';
import * as R from './rules';
import { addLog, allied, hostile, castleAt, clanCastles, clanName, drillOf, initialMorale, maxTroops, occupancy } from './state';
import { TRAITS } from '../data/traits';
import { ninjaHead } from './traits';
import type { Army, Castle, GameState, General } from './types';

export const JB = {
  CAMP_DRILL: 2, CAMP_DRILL_FLOOR: 30, // 陣払い中は練度が毎月2ずつ下がる（30まで）
  HURRY: 0.5, // 急ぎの陣触で、その月のうちに集まる兵の割合
  NEWS: 4, NEWS_NINJA: 6, NEWS_NINJA_TRAIT: 10, // 敵の陣触が聞こえる距離（自分の城からのマス）。忍び頭がいれば広く、忍びの特性を持つ忍び頭ならさらに広い
};

export const campsOf = (s: GameState, clan: string) => Object.values(s.camps ?? {}).filter((a) => a.clan === clan);
export const campsAt = (s: GameState, ci: number) => Object.values(s.camps ?? {}).filter((a) => a.camp === ci);
export const isCamp = (s: GameState, a: Army) => !!s.camps?.[a.id];
// 軍団を名簿か地図のどちらかから
export const armyOrCamp = (s: GameState, id: number | null | undefined) => (id === null || id === undefined ? undefined : s.armies[id] ?? s.camps?.[id]);

// 武将の身の置き所を、軍団の状態に合わせる
export function syncStatus(s: GameState, a: Army) {
  const camp = isCamp(s, a);
  for (const id of membersOf(a)) {
    const g = s.generals[id];
    if (!g || g.status === 'dead' || g.status === 'captive') continue;
    g.status = camp ? 'camp' : 'army'; g.army = a.id;
    if (camp && a.camp !== undefined) g.loc = a.camp;
    for (const c of s.castles) if (c.governor === g.id) c.governor = null;
  }
}

// 陣払いできる城: 本国の自分の城（いるマスか、その隣）
export function homeCastle(s: GameState, a: Army): Castle | null {
  const here = castleAt(s, a.hex);
  if (here && here.owner === a.clan && !isForeignHex(here.hex)) return here;
  return NEIGHBORS[a.hex].map((j) => castleAt(s, j)).find((c): c is Castle => !!c && c.owner === a.clan && !isForeignHex(c.hex)) ?? null;
}
export function campBlock(s: GameState, a: Army): string | null {
  if (a.ikki) return '一揆勢は陣払いできない';
  if (s.clans[a.clan]?.foreign) return '国外の軍勢は陣払いしない';
  if (isForeignHex(a.hex)) return '海の向こうでは陣払いできない（日本へ戻ってから）';
  if (a.routed) return '潰走中は陣払いできない';
  if (a.acted) return 'この月はもう動いた';
  if ((s.orders ?? []).some((o) => o.army === a.id)) return '出陣を命じている（取り消すと陣払いできる）';
  if (Object.values(s.sieges ?? {}).some((sv) => sv.armies.includes(a.id))) return '城攻めの最中';
  if (!homeCastle(s, a)) return '自分の城か、その隣にいるときだけ';
  return null;
}
// 陣払い: 軍団を名簿に戻す。急ぎの陣触でまだ来ていない兵も名簿に戻る
export function toCamp(s: GameState, a: Army, quiet = false): boolean {
  if (campBlock(s, a)) return false;
  const c = homeCastle(s, a)!;
  delete s.armies[a.id];
  (s.camps ??= {})[a.id] = a;
  a.troops += a.musterLeft ?? 0;
  a.camp = c.i; a.hex = c.hex; a.muster = undefined; a.musterLeft = undefined; a.routed = false; a.acted = true; a.mp = 0; a.rojo = undefined;
  syncStatus(s, a);
  if (!quiet) addLog(s, `${s.generals[a.main].name}隊（兵${a.troops.toLocaleString()}）が陣払いし、${c.name}に戻った。`, 'info', a.clan === s.player);
  return true;
}

// 現れるマス: 城か、城の支配域で隣の空きマス
export function spotFor(s: GameState, c: Castle): number | null {
  const occ = occupancy(s);
  return [c.hex, ...NEIGHBORS[c.hex].filter((j) => s.castles[HEXES[j].d]?.owner === c.owner && !castleAt(s, j))].find((h) => !occ.has(h)) ?? null;
}
export function musterBlock(s: GameState, a: Army, hurry: boolean): string | null {
  if (!isCamp(s, a)) return 'もう出陣している';
  const c = a.camp !== undefined ? s.castles[a.camp] : undefined;
  if (!c || c.owner !== a.clan) return '名簿の城を失った';
  if (!hurry && a.muster !== undefined) return '陣触を出している（来月に集まる）';
  if (hurry && spotFor(s, c) === null) return '城と隣に空いたマスがない';
  if (a.troops < R.MIN_ARMY) return '兵が少なすぎる';
  return null;
}
// 陣触: 翌月に現れる（hurry ならその月のうちに半分）
export function muster(s: GameState, a: Army, hurry: boolean): boolean {
  if (musterBlock(s, a, hurry)) return false;
  const c = s.castles[a.camp!];
  if (!hurry) {
    a.muster = s.turn + 1;
    addLog(s, `${s.generals[a.main].name}隊に陣触を出した。来月、${c.name}に兵${a.troops.toLocaleString()}が集まる。`, 'info', a.clan === s.player);
    announce(s, a, c);
    return true;
  }
  const ok = appear(s, a, true);
  if (ok) addLog(s, `${c.name}で急ぎの陣触。${s.generals[a.main].name}隊が兵${a.troops.toLocaleString()}で出た（残り${(a.musterLeft ?? 0).toLocaleString()}は来月）。`, 'battle', a.clan === s.player);
  return ok;
}
function appear(s: GameState, a: Army, hurry: boolean): boolean {
  const c = s.castles[a.camp!];
  const spot = spotFor(s, c);
  if (spot === null) return false;
  delete s.camps![a.id];
  s.armies[a.id] = a;
  a.hex = spot; a.camp = undefined; a.muster = undefined; a.musterTurn = s.turn;
  if (hurry) { const now = Math.max(R.MIN_ARMY, Math.round(a.troops * JB.HURRY)); a.musterLeft = a.troops - now; a.troops = now; }
  a.departTroops = a.troops + (a.musterLeft ?? 0);
  a.food = R.CARRY_MONTHS; a.mp = hurry ? 0 : R.MOVE_POINTS; a.acted = hurry; a.routed = false;
  a.morale = Math.max(a.morale, initialMorale(s, a) * 0.9);
  syncStatus(s, a);
  return true;
}

// 月の初め: 陣触を出した軍団が現れ、急ぎの陣触の残りが追いつく。陣払い中は練度が下がる
export function monthCamps(s: GameState) {
  syncCamps(s);
  s.musterNews = (s.musterNews ?? []).filter((n) => s.turn - n.turn <= 2);
  for (const a of Object.values(s.camps ?? {})) {
    if (a.muster !== undefined && a.muster <= s.turn) {
      const c = s.castles[a.camp!];
      if (appear(s, a, false)) addLog(s, `陣触に応じて兵が集まり、${s.generals[a.main].name}隊（兵${a.troops.toLocaleString()}）が${c.name}に出た。`, 'battle', a.clan === s.player);
      else if (a.muster === s.turn) addLog(s, `${c.name}のまわりが埋まっていて、${s.generals[a.main].name}隊は出られない（空けば出る）。`, 'info', a.clan === s.player);
      continue;
    }
    a.drill = Math.max(JB.CAMP_DRILL_FLOOR, drillOf(a) - JB.CAMP_DRILL);
  }
  for (const a of Object.values(s.armies)) {
    if (!a.musterLeft) continue;
    const add = Math.max(0, Math.min(a.musterLeft, maxTroops(s, a) - a.troops));
    a.troops += add; a.musterLeft = undefined;
  }
}

// 名簿を整える: 城を失えば名簿は解ける。死んだ・捕らわれた・家を去った者は外し、主将がいなければ筆頭が継ぐ
export function syncCamps(s: GameState) {
  for (const a of Object.values(s.camps ?? {})) {
    const c = a.camp !== undefined ? s.castles[a.camp] : undefined;
    if (!c || c.owner !== a.clan || !s.clans[a.clan]?.alive) { dissolveCamp(s, a, c ? `${c.name}を失い、` : ''); continue; }
    const ok = (id: string) => { const g = s.generals[id]; return !!g && g.clan === a.clan && (g.status === 'camp' || g.status === 'army') && g.army === a.id; };
    const members = membersOf(a).filter(ok);
    if (members.length === membersOf(a).length) continue;
    if (!members.length) { delete s.camps![a.id]; continue; }
    // 置き直す: 身分の高い者が主将、残りは空き枠へ
    const gs = members.map((id) => s.generals[id]).sort((x, y) => levelOf(s, x) - levelOf(s, y) || y.lea - x.lea);
    for (const g of gs) { g.boss = undefined; }
    a.main = gs[0].id; a.staff = []; a.deputy = null;
    for (const g of gs.slice(1)) if (!attachAuto(s, a, g)) { g.status = 'free'; g.army = null; g.loc = c.i; }
    a.troops = Math.min(a.troops, maxTroops(s, a));
    syncStatus(s, a);
  }
}
export function dissolveCamp(s: GameState, a: Army, why = '') {
  const home = nearestOwnCastle(s, a.clan, a.hex);
  for (const id of membersOf(a)) {
    const g = s.generals[id];
    if (!g || g.army !== a.id || (g.status !== 'camp' && g.status !== 'army')) continue;
    g.status = 'free'; g.army = null; g.boss = undefined; if (home) g.loc = home.i;
  }
  delete s.camps?.[a.id];
  if (why) addLog(s, `${why}${s.generals[a.main]?.name ?? ''}隊の名簿は解けた。`, 'info', a.clan === s.player);
}

// 名簿として新しい軍団を作る（陣払いのまま。兵糧は名簿に入れる兵の分だけ使う）
export function formCamp(s: GameState, clan: string, castle: Castle, main: string, troops: number): Army {
  const a: Army = { id: s.nextArmyId++, clan, main, deputy: null, troops, morale: 1, hex: castle.hex, mp: 0, acted: true, departTroops: troops, routed: false, monto: castle.id === R.MONTO_CASTLE, drill: R.DRILL_RECRUIT, ashi: 0, camp: castle.i, staff: [] };
  a.morale = initialMorale(s, a) * 0.8;
  (s.camps ??= {})[a.id] = a;
  if (castle.governor === main) castle.governor = null;
  s.clans[clan].food -= troops * R.RECRUIT_COST;
  syncStatus(s, a);
  return a;
}
// 名簿の軍団の顔ぶれを変えたあと（配属・外す・主将の交代）、武将の身の置き所を名簿に合わせる
export function afterCampEdit(s: GameState, a: Army) { if (isCamp(s, a)) { a.troops = Math.min(a.troops, maxTroops(s, a)); syncStatus(s, a); } }
// 名簿の軍団の傘下を外す（下の者も一緒に待機へ）
export function dismissFromCamp(s: GameState, a: Army, g: General) {
  const subtree = new Set<string>();
  const walk = (id: string) => { subtree.add(id); for (const x of staffOf(a)) if (s.generals[x]?.boss === id) walk(x); };
  walk(g.id);
  a.staff = staffOf(a).filter((x) => !subtree.has(x));
  for (const id of subtree) { const h = s.generals[id]; h.status = 'free'; h.army = null; h.boss = undefined; h.loc = a.camp ?? h.loc; }
  a.deputy = treeOf(s, a).find((x) => x.depth === 1)?.g.id ?? null;
  a.troops = Math.min(a.troops, maxTroops(s, a));
  return [...subtree];
}

// ───────── 敵の陣触の知らせ ─────────
// 聞こえる家: 同盟・婚姻の家の陣触はいつでも。ほかは自分の城から一定のマス以内（忍び頭がいれば広く、忍びの特性ならさらに広く）
export function newsRange(s: GameState, clan: string) {
  const h = ninjaHead(s, clan);
  return h ? (TRAITS[h.id] === 'ninja' ? JB.NEWS_NINJA_TRAIT : JB.NEWS_NINJA) : JB.NEWS;
}
export function hearsMuster(s: GameState, listener: string, a: Army, c: Castle) {
  if (listener === a.clan) return false;
  if (allied(s, listener, a.clan)) return true;
  const d = graphDistances(clanCastles(s, listener).map((x) => x.hex));
  return (d[c.hex] ?? Infinity) <= newsRange(s, listener);
}
function announce(s: GameState, a: Army, c: Castle) {
  (s.musterNews ??= []).push({ clan: a.clan, castle: c.i, troops: a.troops, turn: s.turn });
  if (hearsMuster(s, s.player, a, c)) addLog(s, `【陣触】${clanName(s, a.clan)}家が陣触を出した。${c.name}に兵およそ${(Math.round(a.troops / 1000) * 1000 || a.troops).toLocaleString()}が集まりつつある。`, 'battle', true);
}

// 新しいゲームの始まり: 全家の軍団を陣払いの名簿にする（平時から始まる）
export function campAll(s: GameState) {
  for (const a of Object.values(s.armies)) {
    if (a.ikki || s.clans[a.clan]?.foreign) continue;
    const c = homeCastle(s, a);
    if (!c) continue;
    delete s.armies[a.id];
    (s.camps ??= {})[a.id] = a;
    a.camp = c.i; a.hex = c.hex; a.acted = true;
    syncStatus(s, a);
  }
}

// ───────── 自動の陣触・陣払い（AIの家、領、軍事の委任） ─────────
// 攻め: 狙う城の近く（JB.FRONT マス以内）にある名簿に陣触。守り: 敵の軍勢が迫った城の名簿に急ぎの陣触、聞こえた陣触が近ければ陣触
// 平時: 敵が近くになく、狙う城からも遠く、しばらく戦のない軍団は陣払い（兵糧が浮く）
export const AUTO = { FRONT: 6, THREAT: 3, NEWS_NEAR: 5, IDLE: 3, CALM: 4, ATTACK_PER_MONTH: 2 };
export interface AutoOpts { policy: 'attack' | 'defend' | 'build'; camps: Army[]; field: Army[]; targetHexes: number[] }
export function autoJinbure(s: GameState, clan: string, o: AutoOpts) {
  const C = s.clans[clan];
  if (!C?.alive || C.foreign) return;
  const hostileArmies = Object.values(s.armies).filter((x) => x.clan !== clan && !x.routed && hostile(s, clan, x.clan));
  const near = (hex: number, r: number) => hostileArmies.filter((x) => hexDist(x.hex, hex) <= r).reduce((t, x) => t + x.troops, 0);
  const tgt = o.targetHexes.length ? graphDistances(o.targetHexes) : null;
  // 聞こえた陣触のうち、この家を狙う家のものだけに備える（ほかの家どうしの陣触にまで応じると、陣触が連鎖してしまう）
  const news = (s.musterNews ?? []).filter((n) => n.turn >= s.turn - 1 && hostile(s, clan, n.clan) && s.clans[n.clan]?.target === clan && hearsMuster(s, clan, { clan: n.clan } as Army, s.castles[n.castle]));
  // 守り（急ぎ・陣触）。攻めの陣触は一月に AUTO.ATTACK_PER_MONTH 隊まで、狙う城に近い名簿から
  let attackN = 0;
  const camps = [...o.camps].sort((x, y) => (tgt ? (tgt[s.castles[x.camp ?? 0].hex] ?? 99) - (tgt[s.castles[y.camp ?? 0].hex] ?? 99) : 0));
  for (const a of camps) {
    if (!isCamp(s, a) || a.camp === undefined) continue;
    const c = s.castles[a.camp];
    if (near(c.hex, AUTO.THREAT) > 0) { muster(s, a, true); continue; }
    if (a.muster === undefined && news.some((n) => hexDist(s.castles[n.castle].hex, c.hex) <= AUTO.NEWS_NEAR)) { muster(s, a, false); continue; }
    // 攻め: 狙う城に近い名簿から（兵糧が数か月もつうちは）
    if (o.policy === 'attack' && tgt && a.muster === undefined && (tgt[c.hex] ?? Infinity) <= AUTO.FRONT) {
      const upkeep = (fieldTroopsOf(s, clan) + a.troops) * R.FOOD_PER_SOLDIER;
      if (attackN < AUTO.ATTACK_PER_MONTH && C.food > upkeep * 4 && muster(s, a, false)) attackN++;
    }
  }
  // 平時の陣払い
  for (const a of o.field) {
    if (!s.armies[a.id] || campBlock(s, a)) continue;
    if (s.turn - (a.musterTurn ?? -99) < AUTO.IDLE || s.turn - (a.fought ?? -99) < AUTO.IDLE) continue;
    if (near(a.hex, AUTO.CALM) > 0) continue;
    if (o.policy === 'attack' && tgt && (tgt[a.hex] ?? Infinity) <= AUTO.FRONT + 1) continue;
    toCamp(s, a, a.clan !== s.player);
  }
}
const fieldTroopsOf = (s: GameState, clan: string) => Object.values(s.armies).reduce((t, x) => t + (x.clan === clan && !x.ikki ? x.troops : 0), 0);
