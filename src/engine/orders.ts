// 出陣命令: 手番中は命令だけを出し、手番の終わりに目標ごとにまとめて開戦する
import { decideStance } from './stance';
import { onAttack } from './bakufu';
import { resolveBattle } from './hooks';
import { NEIGHBORS } from './map';
import { captureCastle } from './ops';
import type { Target } from './move';
import { addLog, castleAt, clanName, hostile, occupancy } from './state';
import type { Army, BattleReport, GameState } from './types';

export interface Order { army: number; hex: number; command: boolean; mp: number; }

export function ordersOf(s: GameState, clan: string): Order[] {
  return (s.orders ?? []).filter((o) => s.armies[o.army]?.clan === clan);
}
export const orderFor = (s: GameState, armyId: number) => (s.orders ?? []).find((o) => o.army === armyId) ?? null;
export const ordersAt = (s: GameState, hex: number, clan: string) => ordersOf(s, clan).filter((o) => o.hex === hex);

export function orderAttack(s: GameState, a: Army, hex: number, command: boolean) {
  s.orders ??= [];
  s.orders = s.orders.filter((o) => o.army !== a.id);
  s.orders.push({ army: a.id, hex, command, mp: a.mp });
  a.acted = true; a.mp = 0;
}

export function cancelOrder(s: GameState, armyId: number) {
  const o = orderFor(s, armyId);
  if (!o) return;
  s.orders = s.orders.filter((x) => x !== o);
  const a = s.armies[armyId];
  if (a) { a.acted = false; a.mp = o.mp; }
}

// 目標ヘックスの現在の守り手（変わっていれば攻め先も変わる）
function targetAt(s: GameState, clan: string, hex: number): Target | 'empty-castle' | null {
  const o = occupancy(s).get(hex);
  if (o) return hostile(s, clan, o.clan) ? { kind: 'army', hex, army: o } : null;
  const c = castleAt(s, hex);
  if (c && hostile(s, clan, c.owner)) return c.garrison > 0 ? { kind: 'castle', hex, castle: c.i } : 'empty-castle';
  return null;
}

// 手番の終わり: 目標ごとに命令を出した全軍団で開戦する
export async function resolveOrders(s: GameState, clan: string): Promise<BattleReport[]> {
  const mine = ordersOf(s, clan);
  s.orders = (s.orders ?? []).filter((o) => !mine.includes(o));
  const hexes = [...new Set(mine.map((o) => o.hex))];
  const reports: BattleReport[] = [];
  const hit = new Set<number>();
  for (const hex of hexes) {
    if (s.over) break;
    const group = mine.filter((o) => o.hex === hex);
    const armies = group.map((o) => s.armies[o.army]).filter((a): a is Army => !!a && !a.routed && a.troops > 0 && NEIGHBORS[a.hex].includes(hex));
    if (!armies.length) continue;
    const t = targetAt(s, clan, hex);
    if (!t) continue;
    onAttack(s, clan, t === 'empty-castle' ? castleAt(s, hex)!.owner : t.kind === 'army' ? t.army.clan : s.castles[t.castle].owner, hex, armies); // 大義名分
    if (t === 'empty-castle') {
      // 守り手が消えた城にはそのまま入る
      const a = armies.sort((x, y) => y.troops - x.troops)[0];
      a.hex = hex; captureCastle(s, castleAt(s, hex)!, clan);
      continue;
    }
    const primary = armies.sort((x, y) => y.troops - x.troops)[0];
    const command = group.some((o) => o.command);
    if (t.kind === 'army') t.stance = await decideStance(s, armies, t); // 自分の城にいる守り手は、野戦か籠城かを決める
    if (t.kind === 'castle') hit.add(t.castle);
    reports.push(await resolveBattle(s, primary, t, false, armies.slice(1), command));
  }
  // 攻めなかった包囲は解いたことになる
  for (const [k, sv] of Object.entries(s.sieges ?? {})) if (sv.clan === clan && !hit.has(+k)) liftSiege(s, +k, '囲みを解いた');
  return reports;
}

function liftSiege(s: GameState, ci: number, why: string) {
  const sv = s.sieges?.[ci];
  if (!sv) return;
  delete s.sieges![ci];
  const c = s.castles[ci];
  addLog(s, `${clanName(s, sv.clan)}家は${c.name}の${why}（包囲${sv.months}か月）。`, 'battle', sv.clan === s.player || c.owner === s.player);
}

// 月の初め: 包囲を続ける軍団に、同じ城への出陣を命じておく（プレイヤーは取り消せば囲みを解ける）
export function continueSieges(s: GameState) {
  for (const [k, sv] of Object.entries(s.sieges ?? {})) {
    const c = s.castles[+k];
    if (!s.clans[sv.clan]?.alive || c.owner !== sv.defender || !hostile(s, sv.clan, c.owner) || c.garrison <= 0) { delete s.sieges![+k]; continue; }
    const armies = sv.armies.map((id) => s.armies[id]).filter((a): a is Army => !!a && a.clan === sv.clan && !a.routed && a.troops > 0 && NEIGHBORS[a.hex].includes(c.hex));
    if (!armies.length) { liftSiege(s, +k, '囲みを解いた'); continue; }
    // AIは兵が城兵を十分に上回らないか、兵糧が尽きかけていれば囲みを解く
    if (sv.clan !== s.player) {
      const troops = armies.reduce((x, a) => x + a.troops, 0);
      if (troops < c.garrison * 1.3 || armies.some((a) => (a.food ?? 1) < 0.5)) { liftSiege(s, +k, '囲みを解いて退いた'); continue; }
    }
    sv.armies = armies.map((a) => a.id);
    for (const a of armies) if (!s.orders?.some((o) => o.army === a.id)) orderAttack(s, a, c.hex, sv.clan === s.player);
  }
}
