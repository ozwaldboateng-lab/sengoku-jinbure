// 家督と遺言: 跡継ぎと後見役を指名し、遺言を残しておけば家督が乱れにくい。
// 跡継ぎが頼りなく、力のある一門がいれば、お家騒動で家が割れることがある（AIの家も同じ）
import { pushScene } from './lines';
import { dueOf, onOf, splitClan } from './on';
import * as R from './rules';
import { addLog, clanArmies, clanCastles, rand } from './state';
import type { Clan, GameState, General } from './types';

const usable = (s: GameState, g: General | undefined, clan: string) => !!g && g.clan === clan && !['dead', 'captive', 'ronin'].includes(g.status) && !g.ikki;
export const worth = (g: General) => g.cha + g.lea;
// 跡継ぎの候補: 一門（元服前も）、次に宿老
export function heirCands(s: GameState, clan: string) {
  const L = s.clans[clan].leader;
  return Object.values(s.generals).filter((g) => usable(s, g, clan) && g.id !== L && (g.kin || g.rank === 0)).sort((a, b) => Number(!!b.kin) - Number(!!a.kin) || (a.born ?? 0) - (b.born ?? 0));
}
export function regentCands(s: GameState, clan: string, heir?: string) {
  const L = s.clans[clan].leader;
  return Object.values(s.generals).filter((g) => usable(s, g, clan) && g.status !== 'young' && g.id !== L && g.id !== heir && (g.kin || g.rank === 0)).sort((a, b) => b.cha - a.cha);
}
export const heirOf = (s: GameState, C: Clan) => (C.heir && usable(s, s.generals[C.heir], C.id) && C.heir !== C.leader ? s.generals[C.heir] : undefined);
export const regentOf = (s: GameState, C: Clan) => (C.regent && usable(s, s.generals[C.regent], C.id) && C.regent !== C.leader ? s.generals[C.regent] : undefined);

// 家督を継いだあと（ops.succession から）: 指名と遺言の効き目、お家騒動
export function afterSuccession(s: GameState, C: Clan, prev: General | null, pick: General, designated: boolean) {
  if (designated && C.will) {
    const vs = Object.values(s.generals).filter((g) => g.clan === C.id && g.id !== pick.id && !['dead', 'captive', 'ronin', 'young'].includes(g.status));
    if (C.will === 'retainers') for (const g of vs) g.on = Math.min(100, onOf(g) + R.WILL.retainers);
    if (C.will === 'land') for (const c of clanCastles(s, C.id)) c.chian = Math.min(100, c.chian + R.WILL.land);
    if (C.will === 'tenka') C.prestige = Math.min(100, C.prestige + R.WILL.tenka);
    if (prev && C.id === s.player) pushScene(s, prev, 'testament', { heir: pick.name, will: R.WILL_NAME[C.will] });
  }
  C.heir = undefined;
  // 後見役: 指名がなければ（AIも）魅力の高い宿老・一門
  const regent = regentOf(s, C) ?? Object.values(s.generals).filter((g) => usable(s, g, C.id) && g.status !== 'young' && g.id !== pick.id && (g.kin || g.rank === 0)).sort((a, b) => b.cha - a.cha)[0];
  C.regent = undefined;
  // お家騒動: 跡継ぎが幼いか頼りなく、はるかに人望のある一門がいる
  const weak = pick.genpuku !== undefined || (pick.born !== undefined && s.year - pick.born < 18) || worth(pick) < 110;
  if (!weak) return;
  const rival = Object.values(s.generals).filter((g) => usable(s, g, C.id) && g.kin && g.id !== pick.id && g.status !== 'young' && worth(g) >= worth(pick) + R.ODOSO_GAP && (onOf(g) < 65 || dueOf(g) > 30))
    .sort((a, b) => worth(b) - worth(a))[0];
  if (!rival || rand(s) >= R.odosoChance(regent?.cha ?? 0) * (designated ? 0.6 : 1)) return;
  // 城主の城と、率いる部隊（城に入っていればその城も）を持って割れる
  const castles = s.castles.filter((c) => c.owner === C.id && (c.governor === rival.id || (rival.army !== null && s.armies[rival.army]?.hex === c.hex))).map((c) => c.i);
  if (!castles.length || clanCastles(s, C.id).length <= castles.length) return;
  const armies = clanArmies(s, C.id).filter((a) => a.main === rival.id);
  if (C.id === s.player) pushScene(s, rival, 'rebel');
  addLog(s, `${C.name}家でお家騒動。${rival.name}が${pick.name}の家督を認めない。`, 'death', C.id === s.player);
  splitClan(s, rival, C.id, castles, armies, 'お家騒動で家を割った');
}
