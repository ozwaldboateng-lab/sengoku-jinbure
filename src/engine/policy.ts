// 治水・治安と、その予算（家単位。城への配分は自動）
import { frontChianOf } from './fronts';
import { shugodaiChian } from './kan';
import { taxDef } from './invest';
import * as R from './rules';
import { clanCapacity, clanCastles, farmTroops } from './state';
import type { Castle, Clan, GameState } from './types';

// 治安の毎月の変化（城主の魅力・戦のない月・包囲・兵糧切れ・動員の多さ）
export function chianDelta(s: GameState, clan: Clan, c: Castle, sieged: boolean, starving: boolean): { total: number; parts: [string, number][] } {
  const parts: [string, number][] = [];
  if (c.governor) parts.push(['城主の魅力', R.chianGov(s.generals[c.governor].cha)]);
  if (clan.foughtTurn !== s.turn) parts.push(['戦のない月', R.CHIAN_PEACE]);
  if (sieged) parts.push(['包囲', R.CHIAN_SIEGE]);
  if (starving) parts.push(['兵糧切れ', R.CHIAN_STARVE]);
  const fc = frontChianOf(s, c);
  if (fc > 0) parts.push(['領主の魅力', Math.round(fc * 10) / 10]);
  const tx = taxDef(s, c.owner);
  if (tx.chian) parts.push([tx.chian > 0 ? '年貢が軽い' : '年貢が重い', tx.chian]);
  if (c.rakuichi !== undefined && s.turn - c.rakuichi < R.RAKUICHI_MONTHS) parts.push(['楽市楽座への反発', R.RAKUICHI_CHIAN]);
  const sd = shugodaiChian(s, c);
  if (sd > 0) parts.push(['守護代', sd]);
  if (clan.mission === 'allow' && (c.kiri ?? 0) >= 2) parts.push(['寺社の反発', -Math.round((c.kiri ?? 0) * R.KIRI_CHIAN * 10) / 10]);
  if (clan.mission === 'ban' && (c.kiri ?? 0) > 5) parts.push(['禁教', R.BAN_CHIAN]);
  const m = mobilizeDrop(s, clan.id);
  if (m) parts.push(['動員', -m]);
  return { total: parts.reduce((t, [, v]) => t + v, 0), parts };
}
// 動員率（兵 ÷ 動員上限）が5割を超えた分だけ、家のすべての城の治安が毎月下がる
export function mobilizeRate(s: GameState, clan: string) {
  const cap = clanCapacity(s, clan);
  return cap > 0 ? farmTroops(s, clan) / cap : 0;
}
export const mobilizeDrop = (s: GameState, clan: string) => Math.max(0, (mobilizeRate(s, clan) - R.MOBILIZE_FREE) * R.MOBILIZE_DROP);

// 予算: 毎月の収入の一定割合を治水・施しに回す。重点の城に半分、残りは低い城から
export function spendBudget(s: GameState, clan: Clan, income: number) {
  const castles = clanCastles(s, clan.id);
  if (!castles.length) return { chisui: 0, hodo: 0 };
  const spend = (pct: number, key: 'chisui' | 'chian', unit: number) => {
    let money = Math.min(clan.gold, Math.floor((income * pct) / 100));
    if (money <= 0) return 0;
    const used0 = money;
    const raise = (c: Castle, budget: number) => {
      const cost = c.baseKoku * unit;
      const room = 100 - c[key];
      const pts = Math.min(room, budget / cost);
      c[key] = Math.min(100, c[key] + pts);
      return pts * cost;
    };
    const focus = clan.focus !== null && clan.focus !== undefined ? s.castles[clan.focus] : null;
    if (focus && focus.owner === clan.id) money -= raise(focus, money * R.FOCUS_SHARE);
    // 低い城から順に、差を埋めるように配る
    for (let guard = 0; guard < 8 && money > 1; guard++) {
      const open = castles.filter((c) => c[key] < 100).sort((a, b) => a[key] - b[key]);
      if (!open.length) break;
      const share = money / open.length;
      for (const c of open) money -= raise(c, share);
    }
    const used = Math.round(used0 - money);
    clan.gold -= used;
    return used;
  };
  return { chisui: spend(clan.budget.chisui, 'chisui', R.CHISUI_COST), hodo: spend(clan.budget.hodo, 'chian', R.HODO_COST) };
}

// AI: 治安が低ければ施しを厚く、金に余裕があれば治水へ
export function aiBudget(s: GameState, clan: Clan) {
  const castles = clanCastles(s, clan.id);
  if (!castles.length) return;
  const chian = castles.reduce((t, c) => t + c.chian, 0) / castles.length;
  const rich = clan.gold > 50000;
  clan.budget.hodo = chian < 35 ? 50 : chian < 50 ? 30 : rich && chian < 70 ? 50 : 10;
  clan.budget.chisui = clan.gold < R.PLOT_GOLD * 2 ? 0 : rich ? 30 : 20;
  // 動員目標: 守りは厚く、攻めは8割、平時は6〜7割。治安が低ければ絞る
  const base = clan.stance === '守勢' ? 90 : clan.stance === '攻勢' ? 80 : 65;
  clan.mobilize = Math.max(50, base - (chian < 30 ? 20 : chian < 45 ? 10 : 0));
  const low = castles.reduce((b, c) => (c.chian < b.chian ? c : b));
  clan.focus = low.chian < 30 ? low.i : null;
}
