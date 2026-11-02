// 一向一揆: 本願寺が他国の城で門徒を蜂起させる。攻め込まれたのと同じ扱いだが、百姓なので弱い。
// 討てば討つほど、その城の石高（開発度）と治安が下がる。忠誠・治安でも金でも防げない。
import { shogunClan } from './bakufu';
import { graphDistances, NEIGHBORS } from './map';
import { orderAttack } from './orders';
import * as R from './rules';
import { addLog, castleAt, clanName, hostile, occupancy } from './state';
import type { Army, Castle, GameState } from './types';

export function ikkiBlock(s: GameState, clan: string, c: Castle): string | null {
  if (clan !== R.IKKI_CLAN) return '一揆は本願寺だけ';
  if (!c.owner || c.owner === clan) return '他家の城だけ';
  if (!hostile(s, clan, c.owner)) return '同盟・婚姻を結んだ家には起こせない';
  if (c.owner === shogunClan(s)) return '将軍家の城には起こせない';
  if (s.clans[clan].gold < R.IKKI_COST) return `金${R.IKKI_COST.toLocaleString()}貫が要る`;
  if (c.ikkiAt !== undefined && s.turn - c.ikkiAt < R.IKKI_COOLDOWN) return `この城では${c.ikkiAt + R.IKKI_COOLDOWN - s.turn}か月後から`;
  if (spotFor(s, c) === null) return '城の周りに一揆が集まる場所がない';
  return null;
}
const spotFor = (s: GameState, c: Castle) => {
  const occ = occupancy(s);
  return NEIGHBORS[c.hex].find((j) => !occ.has(j) && !castleAt(s, j)) ?? null;
};
export const ikkiSize = (c: Castle) => Math.min(R.IKKI_MAX, Math.max(500, Math.round((c.baseKoku * R.IKKI_PER_KOKU) / 100) * 100));

// 蜂起: 城の隣に一揆勢が現れ、手番の終わりに城へ攻めかかる
export function raiseIkki(s: GameState, clan: string, c: Castle): Army | null {
  if (ikkiBlock(s, clan, c)) return null;
  const hex = spotFor(s, c)!;
  s.clans[clan].gold -= R.IKKI_COST;
  c.ikkiAt = s.turn;
  const gid = `ikki_${s.turn}_${c.i}`;
  s.generals[gid] = { id: gid, name: '一向一揆', clan, ...R.IKKI_STATS, status: 'army', loc: c.i, army: null, captor: null, formerClan: null, rank: 3, merit: 0, ikki: true };
  const troops = ikkiSize(c);
  const a: Army = { id: s.nextArmyId++, clan, main: gid, deputy: null, troops, morale: 1.1, hex, mp: 0, acted: false, departTroops: troops, routed: false, monto: true, ikki: { castle: c.i, until: s.turn + R.IKKI_MONTHS }, drill: R.DRILL_IKKI, ashi: 0 };
  s.armies[a.id] = a;
  s.generals[gid].army = a.id;
  addLog(s, `${c.name}の領内で門徒が蜂起した（一向一揆 ${troops.toLocaleString()}人）。`, 'battle', c.owner === s.player || clan === s.player);
  if (c.owner === s.player) (s.events ??= []).push({ kind: 'ikki', castle: c.id, troops, clan });
  orderAttack(s, a, c.hex, false);
  return a;
}

// 一揆勢の手番: 蜂起した城（なければ隣の敵）へ攻めかかる。家の指図は受けない
export function ikkiOrders(s: GameState, clan: string) {
  for (const a of Object.values(s.armies)) {
    if (a.clan !== clan || !a.ikki || a.routed || (s.orders ?? []).some((o) => o.army === a.id)) continue;
    const home = s.castles[a.ikki.castle];
    if (NEIGHBORS[a.hex].includes(home.hex) && hostile(s, clan, home.owner)) { orderAttack(s, a, home.hex, false); continue; }
    const occ = occupancy(s);
    const foe = NEIGHBORS[a.hex].map((j) => occ.get(j)).find((o) => o && hostile(s, clan, o.clan));
    if (foe) orderAttack(s, a, foe.hex, false);
  }
}

// 一揆勢を討った分だけ、その城が荒れる（自分の領民を討つことになる）
export function ikkiCasualty(s: GameState, a: Army, lost: number) {
  if (!a.ikki || lost <= 0) return;
  const c = s.castles[a.ikki.castle];
  if (!c.owner || c.owner === a.clan) return;
  const k = lost / 1000;
  c.dev = Math.max(0.7, c.dev - R.IKKI_DEV_LOSS * k);
  c.chian = Math.max(0, c.chian - R.IKKI_CHIAN_LOSS * k);
  addLog(s, `${c.name}: 一揆勢を討ち、領内が荒れた（開発−${Math.round(R.IKKI_DEV_LOSS * k * 100)}%・治安−${Math.round(R.IKKI_CHIAN_LOSS * k)}）。`, 'econ', c.owner === s.player);
}

// 一揆の頭は仮の武将: 軍団が消えれば一緒に消す
export function dropIkkiLeader(s: GameState, a: Army) {
  const g = s.generals[a.main];
  if (!g?.ikki) return;
  delete s.generals[g.id];
  // 判明した敵将の一覧などに名が残らないように
  s.revealed = s.revealed.filter((id) => id !== g.id);
}

// 月末: 期限の来た一揆は散る（一揆勢は毎月、自ら動くので手番には加わらない）
export function monthIkki(s: GameState, remove: (a: Army) => void) {
  for (const a of Object.values(s.armies)) {
    if (!a.ikki) continue;
    if (s.turn >= a.ikki.until) { addLog(s, `${s.castles[a.ikki.castle].name}の一揆は散った。`, 'info', s.castles[a.ikki.castle].owner === s.player || a.clan === s.player); remove(a); continue; }
    a.acted = true; a.mp = 0;
  }
}

// AI（本願寺）: 主攻勢力か近くの敵の、石高の大きい城に起こす
export function aiIkki(s: GameState, clan: string) {
  if (clan !== R.IKKI_CLAN || s.clans[clan].gold < R.IKKI_COST * 2) return;
  const C = s.clans[clan];
  // 近い城ほど狙う（本願寺の城からの距離）
  const d = graphDistances(s.castles.filter((c) => c.owner === clan).map((c) => c.hex));
  const cands = s.castles.filter((c) => !ikkiBlock(s, clan, c)).map((c) => ({ c, v: (c.baseKoku * (c.owner === C.target ? 2 : 1) * (c.kind === 'yakata' || c.kind === 'toride' ? 1.5 : 1) * (c.owner && s.clans[c.owner].mission === 'allow' ? R.IKKI_KIRI : 1)) / (1 + d[c.hex] / 6) }));
  if (!cands.length) return;
  const best = cands.sort((x, y) => y.v - x.v)[0];
  raiseIkki(s, clan, best.c);
  void clanName;
}
