// 在野武将: 諸国を巡り、目にかなう家へ仕官を願い出る（召し抱えるには金を払う）
import { goodwill, initOn } from './on';
import { presOf } from './court';
import { delegateOf } from './delegate';
import { graphDistances } from './map';
import { roninRank } from './ops';
import * as R from './rules';
import { addLog, clanCastles, clanName, rand } from './state';
import type { GameState, General } from './types';

export const fame = (g: General) => (g.bra + g.int + g.lea + g.cha) / 4;
// 旧主家を滅ぼした家には仕えない
const ruiner = (s: GameState, g: General, clan: string) => !!g.formerClan && s.clans[g.formerClan]?.ruinedBy === clan;
// 家の魅力: 威信（官位の上乗せを含む）＋当主の魅力の半分
export function appeal(s: GameState, clan: string) {
  const L = s.clans[clan].leader;
  return presOf(s, clan) + (L ? s.generals[L].cha / 2 : 0);
}
// 願い出る見込み: 名のある者ほど大きな家を望む
export function offerChance(s: GameState, g: General, clan: string) {
  if (ruiner(s, g, clan)) return 0;
  const r = g.refused?.[clan];
  if (r !== undefined && s.turn - r < R.RONIN_REFUSED_MONTHS) return 0;
  return Math.max(0.03, Math.min(0.5, R.RONIN_OFFER_BASE + (appeal(s, clan) - fame(g) - 20) / 100 + (goodwill(s, clan) - R.ON_START) / 200));
}

function wander(s: GameState, g: General) {
  const d = graphDistances([s.castles[g.loc].hex]);
  const opts = s.castles.filter((c) => c.i !== g.loc && d[c.hex] <= R.RONIN_RANGE).map((c) => {
    const w = !c.owner ? 0.4 : ruiner(s, g, c.owner) ? 0 : 1 + presOf(s, c.owner) / 25 + clanCastles(s, c.owner).length / 10;
    return [c.i, w] as const;
  });
  let x = rand(s) * opts.reduce((t, [, w]) => t + w, 0);
  for (const [i, w] of opts) { if ((x -= w) <= 0) { g.loc = i; return; } }
}

export function hire(s: GameState, g: General, clan: string): boolean {
  const C = s.clans[clan];
  if (g.status !== 'ronin' || C.gold < R.RONIN_GOLD) return false;
  C.gold -= R.RONIN_GOLD;
  g.clan = clan; g.status = 'free'; g.formerClan = null; g.refused = undefined; initOn(s, g, true);
  roninRank(g);
  s.offers = (s.offers ?? []).filter((o) => o.gen !== g.id);
  addLog(s, `${g.name}が${clanName(s, clan)}家に仕官した（${R.RANK_NAME[g.rank]}）。`, 'info', clan === s.player);
  return true;
}
export function refuse(s: GameState, g: General, clan: string) {
  (g.refused ??= {})[clan] = s.turn;
  s.offers = (s.offers ?? []).filter((o) => o.gen !== g.id);
}

// AI（と人事を委任したプレイヤー）: 金に余裕があり、武将が足りていなければ召し抱える
function aiConsider(s: GameState, g: General, clan: string) {
  const C = s.clans[clan];
  const active = Object.values(s.generals).filter((x) => x.clan === clan && ['free', 'army', 'governor', 'tsukai', 'bugyo'].includes(x.status)).length;
  const want = active < clanCastles(s, clan).length * 4 + 6 || fame(g) >= R.RONIN_FAME_SAMURAI;
  if (want && C.gold >= R.RONIN_GOLD + R.PLOT_GOLD) hire(s, g, clan);
  else refuse(s, g, clan);
}

export function monthlyRonin(s: GameState) {
  const mine = (o: { gen: string; castle: number }) => s.generals[o.gen]?.status === 'ronin' && s.generals[o.gen].loc === o.castle && s.castles[o.castle].owner === s.player;
  s.offers = (s.offers ?? []).filter((o) => s.turn - o.turn < R.RONIN_OFFER_KEEP && mine(o));
  for (const g of Object.values(s.generals)) {
    if (g.status !== 'ronin' || g.ikki) continue;
    if (rand(s) < R.RONIN_MOVE) wander(s, g);
    const c = s.castles[g.loc];
    if (!c.owner || !s.clans[c.owner]?.alive || rand(s) >= offerChance(s, g, c.owner)) continue;
    if (c.owner === s.player && !delegateOf(s).staff) {
      if (s.offers.some((o) => o.gen === g.id)) continue;
      s.offers.push({ gen: g.id, castle: c.i, turn: s.turn });
      addLog(s, `在野の${g.name}が${c.name}に来て、仕官を願い出た。`, 'info', true);
    } else aiConsider(s, g, c.owner);
  }
}
