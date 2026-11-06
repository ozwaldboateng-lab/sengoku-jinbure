// 軍団の再編成: 合流（隣り合う二隊を一つに）と分遣（一隊から、主将のすぐ下の武将と傘下を独立させる）
// 合流の大将: 身分の高いほう（下の身分は上の身分を傘下に置けないため）。同じ身分なら 当主 → 方面軍団長 → 一門 → 統率 → 功績 の順
// 面目: 同じ身分で功績の多い者が大将を譲れば恩−5。不仲: 大将と不仲の者が傘下に入れば双方の恩−10
import { bondOf } from './bushi';
import { attachAuto, directOf, leaveArmy, levelOf, staffOf, treeOf } from './corps';
import { isCrossing } from './karairi';
import { NEIGHBORS, hexDist as hexDistance, isForeignHex } from './map';
import { nearestOwnCastle } from './ops';
import * as R from './rules';
import { addLog, castleAt, maxTroops, occupancy } from './state';
import type { Army, GameState, General } from './types';

export const FACE_ON = 5, RIVAL_ON = 10;
const isFrontLeader = (s: GameState, id: string) => (s.fronts ?? []).some((f) => f.leader === id);
// 大将の順（小さいほど上）
function rankKey(s: GameState, g: General): number[] {
  return [levelOf(s, g), s.clans[g.clan ?? '']?.leader === g.id ? 0 : 1, isFrontLeader(s, g.id) ? 0 : 1, g.kin ? 0 : 1, -g.lea, -g.merit];
}
const cmp = (x: number[], y: number[]) => { for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i] - y[i]; return 0; };

// 合流できるか（理由。null ならできる）
export function mergeBlock(s: GameState, a: Army, b: Army): string | null {
  if (a.id === b.id || a.clan !== b.clan) return '自家の別の軍団とだけ';
  if (a.ikki || b.ikki) return '一揆勢は合流できない';
  if (!NEIGHBORS[a.hex].includes(b.hex) || isCrossing(a.hex, b.hex)) return '隣り合う軍団とだけ';
  if (a.acted || b.acted) return 'この月はもう動いた軍団がいる';
  if (a.routed || b.routed) return '潰走中の軍団は合流できない';
  if ((s.orders ?? []).some((o) => o.army === a.id || o.army === b.id)) return '出陣を命じた軍団は合流できない';
  return null;
}
// 合流の大将の候補: [おすすめ, 選べるもう一方（同じ身分なら）]
export function mergeLeaders(s: GameState, a: Army, b: Army): { keep: Army; other: Army; alt: Army | null } {
  const ga = s.generals[a.main], gb = s.generals[b.main];
  const c = cmp(rankKey(s, ga), rankKey(s, gb));
  const [keep, other] = c <= 0 ? [a, b] : [b, a];
  const sameLevel = levelOf(s, ga) === levelOf(s, gb);
  const lordIn = [ga, gb].some((g) => s.clans[g.clan ?? '']?.leader === g.id);
  return { keep, other, alt: sameLevel && !lordIn ? other : null };
}
// 合流したらどうなるかの見込み（札に出す）
export function mergePreview(s: GameState, keep: Army, other: Army) {
  const K = s.generals[keep.main], O = s.generals[other.main];
  const face = levelOf(s, K) === levelOf(s, O) && O.merit > K.merit && s.clans[K.clan ?? '']?.leader !== K.id;
  const rivals = treeOf(s, other).map((x) => x.g).filter((g) => bondOf(g, K) === 'rival' || bondOf(K, g) === 'rival');
  return { face, rivals, total: keep.troops + other.troops };
}

// 合流: other の兵と武将を keep に入れる。入りきらない武将は other に残る（大将になれる者がいなければ近くの城で待機）
export function mergeArmies(s: GameState, keep: Army, other: Army): { moved: string[]; left: string[]; surplus: number } {
  const K = s.generals[keep.main];
  const pv = mergePreview(s, keep, other);
  const members = treeOf(s, other).map((x) => x.g);
  for (const g of members) { g.army = null; g.boss = undefined; g.status = 'free'; }
  other.staff = []; other.deputy = null;
  // 上の身分から順に、keep の木の空き枠へ。入らなかった者は left
  const moved: string[] = [], left: General[] = [];
  for (const g of members) { if (attachAuto(s, keep, g)) moved.push(g.id); else left.push(g); }
  // 兵・装備・練度などを合わせる
  const tA = keep.troops, tB = other.troops, total = tA + tB;
  const w = (x: number | undefined, y: number | undefined, d: number) => ((x ?? d) * tA + (y ?? d) * tB) / Math.max(1, total);
  keep.morale = w(keep.morale, other.morale, 1);
  keep.drill = w(keep.drill, other.drill, 50);
  keep.ashi = w(keep.ashi, other.ashi, 0);
  keep.food = Math.min(keep.food ?? R.CARRY_MONTHS, other.food ?? R.CARRY_MONTHS);
  const cap = maxTroops(s, keep);
  keep.troops = Math.min(total, cap);
  let surplus = total - keep.troops;
  keep.guns = (keep.guns ?? 0) + (other.guns ?? 0); keep.cannon = (keep.cannon ?? 0) + (other.cannon ?? 0);
  other.guns = 0; other.cannon = 0;
  keep.departTroops = Math.max(keep.departTroops, keep.troops);
  keep.acted = true; keep.mp = 0;
  // 残る者で隊を立て直す（いなければ隊は解け、余った兵は村へ帰る）
  // 余った兵が少なければ、入りきらない武将は近くの城で待機（隊は解ける）
  if (left.length && surplus < R.MIN_ARMY) {
    const home = nearestOwnCastle(s, other.clan, other.hex);
    for (const g of left) { g.status = 'free'; g.army = null; g.boss = undefined; if (home) g.loc = home.i; }
    surplus = 0; delete s.armies[other.id];
  } else if (left.length) {
    left.sort((x, y) => cmp(rankKey(s, x), rankKey(s, y)));
    const head = left[0];
    other.main = head.id; head.status = 'army'; head.army = other.id; head.boss = undefined;
    const rest = left.slice(1).filter((g) => !attachAuto(s, other, g));
    const home = nearestOwnCastle(s, other.clan, other.hex);
    for (const g of rest) { g.status = 'free'; g.army = null; if (home) g.loc = home.i; }
    other.troops = surplus; surplus = 0;
    other.departTroops = other.troops; other.acted = true; other.mp = 0;
  } else {
    delete s.armies[other.id];
  }
  // 面目と不仲
  if (pv.face) { const g = s.generals[members[0].id]; g.on = Math.max(0, (g.on ?? R.ON_START) - FACE_ON); }
  for (const g of pv.rivals) if (g.army === keep.id) { g.on = Math.max(0, (g.on ?? R.ON_START) - RIVAL_ON); K.on = Math.max(0, (K.on ?? R.ON_START) - RIVAL_ON); }
  const mine = keep.clan === s.player;
  addLog(s, `${K.name}隊に${members[0].name}隊が合流した（兵${keep.troops.toLocaleString()}）。${left.length ? `入りきらない${left.map((g) => g.name).join('・')}は${s.armies[other.id] ? `${s.generals[other.main].name}隊として残った` : '近くの城へ退いた'}。` : ''}${surplus > 0 ? `上限を超えた兵${surplus.toLocaleString()}は村へ帰った。` : ''}${pv.face ? `${members[0].name}は大将を譲り、面目を失った。` : ''}${pv.rivals.length ? `不仲の${pv.rivals.map((g) => g.name).join('・')}と${K.name}が同じ軍団になり、互いに不満を抱く。` : ''}`, 'info', mine);
  return { moved, left: left.map((g) => g.id), surplus };
}

// 分遣できるか: 自城か隣にいる軍団から、主将のすぐ下の武将（と傘下）を、隣の空きマスへ
export const nearOwnCastle = (s: GameState, a: Army) => castleAt(s, a.hex)?.owner === a.clan || NEIGHBORS[a.hex].some((j) => castleAt(s, j)?.owner === a.clan);
export function splitSpot(s: GameState, a: Army): number | null {
  const occ = occupancy(s);
  return NEIGHBORS[a.hex].find((j) => !occ.has(j) && !isCrossing(a.hex, j) && isForeignHex(j) === isForeignHex(a.hex) && (!castleAt(s, j) || castleAt(s, j)!.owner === a.clan)) ?? null;
}
export function splitBlock(s: GameState, a: Army, sub?: General): string | null {
  if (a.ikki) return '一揆勢は分けられない';
  if (a.acted) return 'この月はもう動いた';
  if (a.routed) return '潰走中は分けられない';
  if (!nearOwnCastle(s, a)) return '自城か、その隣にいるときだけ';
  if (!directOf(s, a).length) return '主将のすぐ下に武将がいない';
  if (sub && !directOf(s, a).some((g) => g.id === sub.id)) return '主将のすぐ下の武将だけ';
  if (a.troops < 1000) return '兵が少なすぎる（1,000人から）';
  if (splitSpot(s, a) === null) return '隣に空いたマスがない';
  if ((s.orders ?? []).some((o) => o.army === a.id)) return '出陣を命じた軍団は分けられない';
  return null;
}
// 分遣: sub とその傘下を新しい軍団に。兵は frac（1/3・1/2・2/3）
export function splitArmy(s: GameState, a: Army, sub: General, frac: number): Army | null {
  if (splitBlock(s, a, sub)) return null;
  const hex = splitSpot(s, a)!;
  const subtree = new Set<string>();
  const walk = (id: string) => { subtree.add(id); for (const g of staffOf(a).map((x) => s.generals[x]).filter((g) => g && g.boss === id)) walk(g.id); };
  walk(sub.id);
  const id = s.nextArmyId++;
  const n = Math.max(500, Math.min(Math.round(a.troops * frac / 100) * 100, a.troops - 500));
  const b: Army = { id, clan: a.clan, main: sub.id, deputy: null, troops: n, morale: a.morale, hex, mp: 0, acted: true, departTroops: n, routed: false, monto: a.monto, food: a.food, drill: a.drill, ashi: a.ashi, front: a.front, abroad: a.abroad,
    guns: Math.floor((a.guns ?? 0) * n / a.troops), cannon: Math.floor((a.cannon ?? 0) * n / a.troops), staff: [...subtree].filter((x) => x !== sub.id) };
  s.armies[id] = b;
  a.staff = staffOf(a).filter((x) => !subtree.has(x));
  a.troops -= n; a.guns = (a.guns ?? 0) - (b.guns ?? 0); a.cannon = (a.cannon ?? 0) - (b.cannon ?? 0);
  a.acted = true; a.mp = 0; a.departTroops = Math.max(a.troops, Math.min(a.departTroops, a.troops));
  sub.boss = undefined;
  for (const x of subtree) { const g = s.generals[x]; g.army = id; g.status = 'army'; }
  a.deputy = directOf(s, a)[0]?.id ?? null; b.deputy = directOf(s, b)[0]?.id ?? null;
  // 兵の上限を超えていれば、超えた分は元の隊へ
  const capB = maxTroops(s, b); if (b.troops > capB) { a.troops += b.troops - capB; b.troops = capB; b.departTroops = capB; }
  addLog(s, `${s.generals[a.main].name}隊から${sub.name}隊（兵${b.troops.toLocaleString()}）が分かれた。`, 'info', a.clan === s.player);
  return b;
}

// AI（唐入り）: 対馬・壱岐・海の向こうで隣り合う自軍の小さな隊を、面目・不仲の障りがなければ一つにまとめる
export function aiMerge(s: GameState, clan: string, where: (h: number) => boolean) {
  for (const a of Object.values(s.armies)) {
    if (a.clan !== clan || !where(a.hex) || a.acted || a.ikki) continue;
    for (const j of NEIGHBORS[a.hex]) {
      const b = Object.values(s.armies).find((x) => x.hex === j && x.clan === clan);
      if (!b || mergeBlock(s, a, b)) continue;
      const { keep, other } = mergeLeaders(s, a, b);
      const pv = mergePreview(s, keep, other);
      if (pv.face || pv.rivals.length) continue;
      if (keep.troops >= maxTroops(s, keep) * 0.9) continue;
      mergeArmies(s, keep, other);
      break;
    }
  }
}

// ───────── おまかせ編成 ─────────
const freeOf = (s: GameState, clan: string) => Object.values(s.generals).filter((g) => g.clan === clan && g.status === 'free' && s.clans[clan].leader !== g.id);
// 城主の空きに残しておく人数（城主のいない自城の数）
const governorGap = (s: GameState, clan: string) => s.castles.filter((c) => c.owner === clan && !c.governor).length;
const score = (g: General) => g.lea + g.bra;
// 軍団の空きを埋める: 近くにいる（所在の城が軍団に近い）待機の武将から、能力の高い順に。主将と不仲の者は入れない。城主の空きの分は残す
export function fillArmy(s: GameState, a: Army, keepForGovernors = true): string[] {
  const added: string[] = [];
  const main = s.generals[a.main];
  let spare = freeOf(s, a.clan).length - (keepForGovernors ? governorGap(s, a.clan) : 0);
  const dist = (g: General) => hexDistOf(s.castles[g.loc]?.hex ?? a.hex, a.hex);
  const pool = freeOf(s, a.clan).filter((g) => bondOf(g, main) !== 'rival' && bondOf(main, g) !== 'rival').sort((x, y) => dist(x) - dist(y) || score(y) - score(x));
  for (const g of pool) {
    if (spare <= 0) break;
    if (attachAuto(s, a, g)) { added.push(g.id); spare--; }
  }
  return added;
}
export const fillBlock = (s: GameState, a: Army): string | null => {
  if (a.ikki) return '一揆勢は編成できない';
  if (!nearOwnCastle(s, a)) return '自城か、その隣にいるときだけ';
  const before = treeOf(s, a).length;
  // 試しに数える（実際には入れない）: 空き枠と、入れられる待機の武将があるか
  const main = s.generals[a.main];
  const can = freeOf(s, a.clan).some((g) => bondOf(g, main) !== 'rival' && treeOf(s, a).some(({ g: p }) => p && levelOf(s, g) === levelOf(s, p) + 1 && treeOf(s, a).filter((x) => x.boss === p.id).length < R.CORPS_CHILDREN));
  void before;
  return can ? null : '空き枠に入れられる待機の武将がいない';
};
// この城の軍団を組み直す: 城と隣にいる自軍の軍団の、主将は据え置き、傘下を一度外して、待機の武将と合わせて能力順に振り分け直す
export function reshuffleAt(s: GameState, castleHex: number, clan: string): { armies: number; moved: number } {
  const here = Object.values(s.armies).filter((a) => a.clan === clan && !a.ikki && (a.hex === castleHex || NEIGHBORS[castleHex].includes(a.hex)));
  if (!here.length) return { armies: 0, moved: 0 };
  const before = new Map(here.map((a) => [a.id, staffOf(a).join(',')]));
  // 傘下を外す
  for (const a of here) {
    for (const id of staffOf(a)) { const g = s.generals[id]; g.army = null; g.boss = undefined; g.status = 'free'; g.loc = castleAt(s, castleHex)?.i ?? g.loc; }
    a.staff = []; a.deputy = null;
  }
  // 強い軍団（主将の身分が高く、統率が高い）から順に、能力の高い武将で埋める
  here.sort((x, y) => levelOf(s, s.generals[x.main]) - levelOf(s, s.generals[y.main]) || s.generals[y.main].lea - s.generals[x.main].lea);
  const cIdx = castleAt(s, castleHex)?.i;
  const pool = freeOf(s, clan).filter((g) => g.loc === cIdx).sort((x, y) => score(y) - score(x));
  for (const a of here) {
    const main = s.generals[a.main];
    for (const g of pool) if (g.status === 'free' && bondOf(g, main) !== 'rival' && bondOf(main, g) !== 'rival') attachAuto(s, a, g);
  }
  let moved = 0;
  for (const a of here) if (before.get(a.id) !== staffOf(a).join(',')) moved++;
  addLog(s, `${castleAt(s, castleHex)?.name ?? ''}で${here.length}つの軍団を組み直した。`, 'info', clan === s.player);
  return { armies: here.length, moved };
}
const hexDistOf = (a: number, b: number) => hexDistance(a, b);

// ───────── 陣立て: 主将の交代と、傘下を外す ─────────
// 主将を替えられるか（理由。null ならできる）。新しい主将は待機中の武将か、この軍団の傘下の武将
export function replaceBlock(s: GameState, a: Army, g: General): string | null {
  if (a.ikki) return '一揆勢は編成できない';
  if (a.routed) return '潰走中は編成できない';
  if (!nearOwnCastle(s, a)) return '自城か、その隣にいるときだけ';
  if ((s.orders ?? []).some((o) => o.army === a.id)) return '出陣を命じた軍団は編成を変えられない';
  if (g.id === a.main) return 'すでに主将';
  if (g.clan !== a.clan) return '自家の武将だけ';
  if (!(g.status === 'free' && !g.liege) && g.army !== a.id) return '待機中の武将か、この軍団の傘下だけ';
  return null;
}
// 主将を替える: 新しい主将の下に、元の主将を含む全員を身分の高い順に置き直す。入らない者は城で待機。兵が上限を超えれば村へ帰す
export function replaceMain(s: GameState, a: Army, g: General, loc: number): { left: string[]; cut: number } | null {
  if (replaceBlock(s, a, g)) return null;
  const members = treeOf(s, a).map((x) => x.g).filter((x) => x.id !== g.id);
  const oldMain = s.generals[a.main];
  for (const m of members) { m.army = null; m.boss = undefined; m.status = 'free'; }
  a.staff = []; a.deputy = null;
  a.main = g.id; g.status = 'army'; g.army = a.id; g.boss = undefined;
  for (const c of s.castles) if (c.governor === g.id) c.governor = null;
  members.sort((x, y) => cmp(rankKey(s, x), rankKey(s, y)));
  const left: string[] = [];
  for (const m of members) if (!attachAuto(s, a, m)) { m.loc = loc; left.push(m.id); }
  const cap = maxTroops(s, a), cut = Math.max(0, a.troops - cap);
  if (cut) { a.troops = cap; a.departTroops = Math.min(a.departTroops, cap); }
  addLog(s, `${g.name}が${oldMain.name}に代わって軍団の主将となった。${left.length ? `${left.map((id) => s.generals[id].name).join('・')}は城で待機。` : ''}${cut ? `兵${cut.toLocaleString()}人は村へ帰った。` : ''}`, 'info', a.clan === s.player);
  return { left, cut };
}
// 傘下の武将を外して城で待機させる（その下の者は一段上へ繰り上がる。入らない者は一緒に待機）
export function dismissBlock(s: GameState, a: Army, g: General): string | null {
  if (a.ikki) return '一揆勢は編成できない';
  if (!nearOwnCastle(s, a)) return '自城か、その隣にいるときだけ';
  if ((s.orders ?? []).some((o) => o.army === a.id)) return '出陣を命じた軍団は編成を変えられない';
  if (g.id === a.main) return '主将は外せない（主将を替える）';
  if (g.army !== a.id) return 'この軍団にいない';
  return null;
}
export function dismiss(s: GameState, a: Army, g: General, loc: number): { out: string[]; cut: number } | null {
  if (dismissBlock(s, a, g)) return null;
  const detached: General[] = [];
  leaveArmy(s, g, detached);
  const out = [g, ...detached];
  for (const x of out) { x.status = 'free'; x.army = null; x.boss = undefined; x.loc = loc; }
  const cap = maxTroops(s, a), cut = Math.max(0, a.troops - cap);
  if (cut) { a.troops = cap; a.departTroops = Math.min(a.departTroops, cap); }
  return { out: out.map((x) => x.id), cut };
}
