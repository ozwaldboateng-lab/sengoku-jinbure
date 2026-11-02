// 軍団の編成: 主将の下に、ひとつ下の身分の武将を2人まで（その下にも2人まで）置く
// 当主・宿老 → 侍大将 → 足軽大将 → 足軽組頭。一門は侍大将以上として扱う
import * as R from './rules';
import type { Army, GameState, General } from './types';

export const staffOf = (a: Army) => a.staff ?? (a.deputy ? [a.deputy] : []);
const bossOf = (a: Army, g: General) => g.boss ?? a.main;
// 軍団での段（0 当主・宿老 / 1 侍大将 / 2 足軽大将 / 3 足軽組頭）
export function levelOf(s: GameState, g: General): number {
  if (g.clan && s.clans[g.clan]?.leader === g.id) return 0;
  return g.kin ? Math.min(g.rank, 1) : g.rank;
}
export const childrenOf = (s: GameState, a: Army, id: string) => staffOf(a).map((x) => s.generals[x]).filter((g) => g && bossOf(a, g) === id);
// 主将の下の木を上から順に（[武将, 親]）
export function treeOf(s: GameState, a: Army): { g: General; depth: number; boss: string | null }[] {
  const out: { g: General; depth: number; boss: string | null }[] = [];
  const walk = (id: string, depth: number, boss: string | null) => {
    out.push({ g: s.generals[id], depth, boss });
    for (const c of childrenOf(s, a, id)) walk(c.id, depth + 1, id);
  };
  walk(a.main, 0, null);
  return out;
}
// 主将のすぐ下（筆頭が先頭）
export const directOf = (s: GameState, a: Army) => childrenOf(s, a, a.main).sort((x, y) => x.rank - y.rank || y.lea - x.lea);
function sync(s: GameState, a: Army) {
  a.deputy = directOf(s, a)[0]?.id ?? null;
}

// 親の下に置けるか（理由を返す。null なら置ける）
export function attachBlock(s: GameState, a: Army, parentId: string, g: General): string | null {
  const p = s.generals[parentId];
  if (!p || (parentId !== a.main && !staffOf(a).includes(parentId))) return 'その武将はこの軍団にいない';
  if (g.clan !== a.clan || g.status !== 'free') return '待機中の武将だけ';
  if (levelOf(s, p) >= 3) return '足軽組頭の下には置けない';
  if (levelOf(s, g) !== levelOf(s, p) + 1) return `${R.RANK_NAME[Math.min(3, levelOf(s, p) + 1)]}だけ`;
  if (childrenOf(s, a, parentId).length >= R.CORPS_CHILDREN) return '枠がない';
  return null;
}
export function attach(s: GameState, a: Army, parentId: string, g: General) {
  a.staff = [...staffOf(a).filter((x) => x !== g.id), g.id];
  if (!a.staff.length) a.staff = [g.id];
  g.boss = parentId; g.status = 'army'; g.army = a.id;
  for (const c of s.castles) if (c.governor === g.id) c.governor = null;
  sync(s, a);
}
// 空いている枠へ自動で（上の段から）
export function attachAuto(s: GameState, a: Army, g: General): boolean {
  for (const { g: p } of treeOf(s, a)) if (!attachBlock(s, a, p.id, g)) { attach(s, a, p.id, g); return true; }
  return false;
}
// 軍団から抜ける（討死・捕縛・異動）。下の武将は一段上へ繰り上がる。主将が抜けたら筆頭が継ぐ
// 繰り上がると身分が合わない（または枠がない）武将は、その下の者ごと軍団を離れて detached に入る（呼び出し側で城へ戻す）
// 継ぐ者がいなければ false（呼び出し側で軍団を解く）
export function leaveArmy(s: GameState, g: General, detached: General[] = []): boolean {
  const a = g.army !== null ? s.armies[g.army] : undefined;
  g.army = null; g.boss = undefined;
  if (!a) return true;
  const kids = childrenOf(s, a, g.id);
  let up: General;
  if (a.main === g.id) {
    const succ = directOf(s, a)[0];
    if (!succ) { a.staff = []; a.deputy = null; return false; }
    a.main = succ.id; succ.boss = undefined;
    a.staff = staffOf(a).filter((x) => x !== succ.id);
    up = succ;
  } else {
    up = s.generals[g.boss ?? a.main] ?? s.generals[a.main];
    a.staff = staffOf(a).filter((x) => x !== g.id);
  }
  const drop = (h: General) => {
    for (const c of childrenOf(s, a, h.id)) drop(c);
    a.staff = staffOf(a).filter((x) => x !== h.id);
    h.army = null; h.boss = undefined; detached.push(h);
  };
  for (const h of kids) {
    if (h.id === up.id) continue;
    const fits = levelOf(s, h) === levelOf(s, up) + 1 && childrenOf(s, a, up.id).filter((x) => x.id !== h.id).length < R.CORPS_CHILDREN;
    if (fits) h.boss = up.id; else drop(h);
  }
  sync(s, a);
  return true;
}
// 軍団の全員（主将を含む）
export const membersOf = (a: Army) => [a.main, ...staffOf(a)];

// 旧セーブ（補佐だけの軍団）の読み込み
export function migrateCorps(s: GameState) {
  for (const a of Object.values(s.armies)) {
    if (a.staff) continue;
    a.staff = a.deputy ? [a.deputy] : [];
    if (a.deputy && s.generals[a.deputy]) s.generals[a.deputy].boss = a.main;
  }
}

// AI（と人事を委任したプレイヤー）: 自城の近くにいる軍団の空き枠を、同じ城や近くの待機中の武将で埋める
export function aiFillCorps(s: GameState, clan: string, near: (a: Army) => boolean, pool?: (g: General) => boolean) {
  const free = Object.values(s.generals).filter((g) => g.clan === clan && g.status === 'free' && s.clans[clan].leader !== g.id && (pool ? pool(g) : !g.liege))
    .sort((x, y) => y.lea + y.bra - (x.lea + x.bra));
  if (!free.length) return;
  const castles = s.castles.filter((c) => c.owner === clan).length;
  let spare = free.length - Math.max(0, castles - s.castles.filter((c) => c.owner === clan && c.governor).length) - 1; // 城主の空きに残す
  for (const a of Object.values(s.armies).filter((x) => x.clan === clan && !x.ikki && near(x)).sort((x, y) => y.troops - x.troops)) {
    for (const g of [...free]) {
      if (spare <= 0) return;
      if (g.status !== 'free') continue;
      if (attachAuto(s, a, g)) { spare--; free.splice(free.indexOf(g), 1); }
    }
  }
}
