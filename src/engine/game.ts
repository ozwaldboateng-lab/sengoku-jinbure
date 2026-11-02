// ターン進行
import { monthlyBakufu } from './bakufu';
import { monthlyBushi } from './bushi';
import { runClanAI } from './ai';
import { aiDiplomacy, expireTreaties } from './diplomacy';
import { monthEnd } from './economy';
import { continueSieges, resolveOrders } from './orders';
import { karairiMonth, karairiMonthStart } from './karairi';
import { koreaMonth } from './korea';
import { monthlyRanks } from './ranks';
import { monthlyLife } from './life';
import { monthlyRonin } from './ronin';
import { monthlyNanban } from './nanban';
import { monthlyOn } from './on';
import { fiefAccounts, frontById, frontMerit, frontOfCastle, runFronts } from './fronts';
import { monthlyEmber, settleShioki } from './shioki';
import { delegateOf } from './delegate';
import { cleanShugodai } from './kan';
import { monthlyWorks } from './invest';
import { runDelegation } from './delegate';
import { ikkiOrders } from './ikki';
import { checkVictory } from './ops';
import { rand } from './state';
import type { GameState } from './types';

export async function endTurn(s: GameState) {
  if (s.over) return;
  s.reports = [];
  s.scenes = [];
  // プレイヤーの出陣命令をここでまとめて開戦（一揆勢は自ら動く）
  // 決めずにいた仕置: 方面の城は軍団長が、軍事を委任していれば当主の気性で、ほかは撫育
  settleShioki(s, (c) => {
    const f = frontOfCastle(s, c) ?? frontById(s, Object.values(s.armies).find((a) => a.hex === c.hex && a.clan === s.player)?.front);
    if (f && !f.vacant) return s.generals[f.leader];
    return delegateOf(s).military && s.clans[s.player].leader ? s.generals[s.clans[s.player].leader!] : undefined;
  });
  await runFronts(s); // 方面軍団（と軍事の委任）の出陣・移動
  ikkiOrders(s, s.player);
  await resolveOrders(s, s.player);
  frontMerit(s);
  checkVictory(s);
  if (s.over) return;
  runDelegation(s); // 委任した内政
  koreaMonth(s); // 唐入り: 王の退去・義兵・明の援軍
  const order = Object.keys(s.clans).filter((c) => c !== s.player && s.clans[c].alive && (!s.clans[c].foreign || !!s.karairi?.active)); // 国外の家（朝鮮・明）は唐入りのあいだだけ動く
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rand(s) * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  for (const c of order) { if (s.over) break; if (!s.clans[c].foreign) await aiDiplomacy(s, c); }
  for (const c of order) { if (s.over) break; await runClanAI(s, c); }
  await karairiMonth(s); // 唐入り: 李舜臣の遊撃と海戦（兵站の前に）
  monthEnd(s);
  monthlyWorks(s); // 新田開発・城の普請の進み
  fiefAccounts(s); // 領の蔵: 年貢・商いの8割と、領の兵の兵糧・給金・陪臣の恩賞
  monthlyEmber(s);
  monthlyRanks(s);
  monthlyOn(s);
  monthlyBushi(s);
  monthlyBakufu(s);
  cleanShugodai(s); // 守護でなくなった国の守護代を外す
  monthlyLife(s);
  monthlyRonin(s);
  monthlyNanban(s);
  expireTreaties(s);
  s.month++;
  if (s.month > 12) { s.month = 1; s.year++; }
  s.turn++;
  continueSieges(s); // 月をまたぐ城攻め
  karairiMonthStart(s);
  checkVictory(s);
}

export async function runAIOnlyTurn(s: GameState) {
  // シミュレーション用: プレイヤー勢力もAIで動かす
  await runClanAI(s, s.player);
  await endTurn(s);
}
