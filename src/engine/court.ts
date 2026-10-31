// 官位: 朝廷への献金。威信（計算上の上乗せ）と、AIに攻められにくくなる効果
import * as R from './rules';
import { addLog, clanCastles, clanKoku, clanName } from './state';
import type { GameState } from './types';

export const courtOf = (s: GameState, clan: string | null) => (clan ? s.clans[clan]?.court ?? 0 : 0);
export const courtName = (s: GameState, clan: string | null) => R.COURT[courtOf(s, clan)].name;
// 威信は上限100だが、官位の分は計算のときに上乗せする
export const presOf = (s: GameState, clan: string | null) => (clan && s.clans[clan] ? s.clans[clan].prestige + R.COURT[courtOf(s, clan)].pres : 0);
export const deterOf = (s: GameState, clan: string | null) => R.COURT[courtOf(s, clan)].deter;
export const holderOf = (s: GameState, rank: number) => Object.values(s.clans).find((c) => c.alive && (c.court ?? 0) === rank) ?? null;

// 次の官位を買えない理由（買えるなら null）
export function courtBlock(s: GameState, clan: string): string | null {
  const C = s.clans[clan];
  if (C.usurp) return '官を自ら名乗った家に、朝廷は官を与えない';
  const next = (C.court ?? 0) + 1;
  if (next >= R.COURT.length) return 'これ以上の官位はない';
  const n = R.COURT[next];
  if (next === R.KAMPAKU) { const h = holderOf(s, R.KAMPAKU); if (h && h.id !== clan) return `関白は${h.name}家が就いている`; }
  if (next === R.SHOGUN) {
    if (clanKoku(s, clan) < R.SHOGUN_KOKU && clanCastles(s, clan).length < R.SHOGUN_CASTLES) return `総石高${R.SHOGUN_KOKU}万石か${R.SHOGUN_CASTLES}城が要る`;
    if (!s.castles.some((c) => c.id === R.SHOGUN_CASTLE && c.owner === clan)) return '京（二条御所）を押さえる必要がある';
  }
  if (C.gold < n.cost) return `献金${n.cost.toLocaleString()}貫が要る`;
  return null;
}

export function buyCourt(s: GameState, clan: string): boolean {
  if (courtBlock(s, clan)) return false;
  const C = s.clans[clan];
  const next = (C.court ?? 0) + 1;
  C.gold -= R.COURT[next].cost;
  // 将軍は天下に1人: 前の将軍家は大臣相当に下がる。関白から将軍に上がれば関白は空く
  if (next === R.SHOGUN) {
    const old = holderOf(s, R.SHOGUN);
    if (old && old.id !== clan) { old.court = R.DEPOSED_COURT; addLog(s, `${old.name}家は征夷大将軍の座を失った。`, 'castle', true); }
  }
  C.court = next;
  addLog(s, `${clanName(s, clan)}家が朝廷に献金し、${R.COURT[next].name}に任じられた。`, next >= R.KAMPAKU ? 'castle' : 'info', clan === s.player || next >= R.KAMPAKU);
  return true;
}

// AI: 金に十分な余裕（献金の2倍）があれば次の官位を買う
export function aiCourt(s: GameState, clan: string) {
  const C = s.clans[clan];
  const next = (C.court ?? 0) + 1;
  if (next >= R.COURT.length || C.gold < R.COURT[next].cost * 2) return;
  buyCourt(s, clan);
}

// 開始時の官位（1560年ごろの官途をおおまかに段階へ）
export const INITIAL_COURT: Record<string, number> = {
  ashikaga: 8, // 足利義輝（征夷大将軍）
  takeda: 2, hojo: 2, miyoshi: 2, otomo: 2, mori: 2, rokkaku: 2, asakura: 2, shimazu: 2, date: 2, // 大膳大夫・左京大夫・修理大夫など
  imagawa: 1, uesugi: 1, saito: 1, amago: 1, kitabatake: 3, // 治部大輔・弾正少弼・修理亮、北畠は中将
};
