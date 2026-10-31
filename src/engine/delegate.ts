// 内政の委任: プレイヤーが任せた項目を、AIと同じ判断で毎月処理する
import { aiFillCorps } from './corps';
import { castleAt } from './state';
import { NEIGHBORS } from './map';
import { aiCourt } from './court';
import { aiEquip, aiTrade, clanGuns, clanItems } from './money';
import { aiNanban } from './nanban';
import { aiBudget } from './policy';
import { aiFillBugyo, aiFillTsukai, bugyoOf, tsukaiLabel, tsukaiOf } from './ranks';
import * as R from './rules';
import { addLog } from './state';
import type { GameState } from './types';

export type DelegateKey = 'budget' | 'trade' | 'staff' | 'court' | 'military';
export const DELEGATE_NAME: Record<DelegateKey, string> = { budget: '予算・動員目標', trade: '商い（兵糧・鉄砲・名物の購入）', staff: '人事（奉行・使番の補充、名物の下賜）', court: '官位（献金）', military: '軍事（直轄の部隊・城も含め、出陣・移動・編成・配備をすべて）' };
export const delegateOf = (s: GameState) => (s.clans[s.player].delegate ??= { budget: false, trade: false, staff: false, court: false, military: false });

export function runDelegation(s: GameState) {
  const clan = s.player, C = s.clans[clan];
  const d = delegateOf(s);
  if (!C?.alive || !(d.budget || d.trade || d.staff || d.court)) return;
  const before = { gold: C.gold, food: C.food, guns: clanGuns(s, clan), items: clanItems(s, clan).length, held: clanItems(s, clan).filter((i) => i.holder).length, court: C.court ?? 0, bugyo: bugyoOf(s, clan).length, tsukai: tsukaiOf(s, clan).length, b: { ...C.budget }, mob: C.mobilize };
  if (d.budget) aiBudget(s, C);
  if (d.trade) { aiNanban(s, clan); aiTrade(s, clan); }
  if (d.staff) { aiFillBugyo(s, clan); aiFillTsukai(s, clan); aiFillCorps(s, clan, (a) => castleAt(s, a.hex)?.owner === a.clan || NEIGHBORS[a.hex].some((j) => castleAt(s, j)?.owner === a.clan)); aiEquip(s, clan); }
  if (d.court) aiCourt(s, clan);
  // したことを1行にまとめて記録する
  const out: string[] = [];
  if (d.budget && (before.b.chisui !== C.budget.chisui || before.b.hodo !== C.budget.hodo || before.mob !== C.mobilize)) out.push(`予算を治水${C.budget.chisui}%・施し${C.budget.hodo}%、動員目標${C.mobilize}%に`);
  const food = C.food - before.food;
  if (food > 0) out.push(`兵糧${food.toLocaleString()}石を買う`); else if (food < 0) out.push(`兵糧${(-food).toLocaleString()}石を売る`);
  const guns = clanGuns(s, clan) - before.guns;
  if (guns > 0) out.push(`鉄砲${guns.toLocaleString()}丁を買う`);
  if (clanItems(s, clan).length > before.items) out.push('名物を買う');
  if (clanItems(s, clan).filter((i) => i.holder).length > before.held) out.push('名物を下賜');
  if (bugyoOf(s, clan).length > before.bugyo) out.push(`奉行を${bugyoOf(s, clan).length - before.bugyo}人任命`);
  if (tsukaiOf(s, clan).length > before.tsukai) out.push(`${tsukaiLabel(clan)}を${tsukaiOf(s, clan).length - before.tsukai}人任命`);
  if ((C.court ?? 0) > before.court) out.push(`献金して${R.COURT[C.court ?? 0].name}に`);
  const spent = Math.round(before.gold - C.gold);
  if (out.length) addLog(s, `委任: ${out.join('、')}（金${spent >= 0 ? '−' : '+'}${Math.abs(spent).toLocaleString()}貫）。`, 'econ', true);
}
