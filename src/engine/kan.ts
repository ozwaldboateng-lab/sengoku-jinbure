// 家臣の官位（主君が朝廷に推挙する）と守護代（当家が守護の国で、家臣を任じる）
import { bk, provName } from './bakufu';
import { courtOf } from './court';
import { onOf } from './on';
import * as R from './rules';
import { addLog } from './state';
import type { Castle, GameState, General } from './types';

const ACTIVE = ['free', 'army', 'governor', 'bugyo', 'tsukai'];
const bump = (g: General, v: number) => { g.on = Math.max(0, Math.min(100, onOf(g) + v)); };
const fame = (g: General, v: number) => { g.fame = Math.max(0, Math.min(100, (g.fame ?? 0) + v * Math.max(0.1, 1 - (g.fame ?? 0) / 110))); };
// 当家の直参で、役目に就ける者か
const directOk = (s: GameState, g: General) => g.clan === s.player && !g.liege && s.clans[s.player].leader !== g.id && ACTIVE.includes(g.status);

// ───────── 官位の推挙 ─────────
export const kanOf = (g: General) => g.kan ?? 0;
export const kanName = (g: General) => (kanOf(g) ? R.COURT[kanOf(g)].name : '');
export const kanCost = (g: General) => Math.round(R.COURT[Math.min(R.KAN_VASSAL_MAX, kanOf(g) + 1)].cost * R.KAN_RATE);
export function kanBlock(s: GameState, g: General): string | null {
  if (!directOk(s, g)) return g.liege ? '陪臣の官位は主が決める' : '推挙できない';
  const C = s.clans[s.player];
  if (C.usurp) return '官を自ら名乗った家の推挙は、朝廷が受けない';
  const next = kanOf(g) + 1;
  if (next > R.KAN_VASSAL_MAX) return 'これ以上は推挙できない';
  if (next >= courtOf(s, s.player)) return `当家の官位（${R.COURT[courtOf(s, s.player)].name}）より下までしか推挙できない`;
  if (C.gold < kanCost(g)) return `献金${kanCost(g).toLocaleString()}貫が要る`;
  return null;
}
export function recommendKan(s: GameState, g: General): boolean {
  if (kanBlock(s, g)) return false;
  s.clans[s.player].gold -= kanCost(g);
  g.kan = kanOf(g) + 1;
  bump(g, R.kanOn(g.kan)); fame(g, R.kanFame(g.kan));
  const closed = !!g.outer; g.outer = undefined; // 当家の推挙で官を得れば、外への門は閉じる
  addLog(s, `朝廷に推挙し、${g.name}が${R.COURT[g.kan].name}に任じられた${closed ? '（外から受けた官の縁は切れた）' : ''}。`, 'info', true);
  return true;
}

// ───────── 守護代 ─────────
export const shugoProvs = (s: GameState) => Object.entries(bk(s).shugo).filter(([, c]) => c === s.player).map(([p]) => p);
export const shugodaiOf = (s: GameState, prov: string) => Object.values(s.generals).find((g) => g.shugodai === prov && g.clan === s.player && g.status !== 'dead');
export function shugodaiBlock(s: GameState, g: General, prov: string): string | null {
  if (!directOk(s, g)) return g.liege ? '陪臣は任じられない' : '任じられない';
  if (bk(s).shugo[prov] !== s.player) return `当家は${prov}の守護ではない`;
  if (g.shugodai === prov) return 'すでに任じている';
  return null;
}
export function appointShugodai(s: GameState, g: General, prov: string): boolean {
  if (shugodaiBlock(s, g, prov)) return false;
  const old = shugodaiOf(s, prov);
  if (old) { old.shugodai = undefined; bump(old, -R.SHUGODAI_OFF); }
  g.shugodai = prov; bump(g, R.SHUGODAI_ON);
  addLog(s, `${g.name}を${prov}の守護代に任じた${old ? `（${old.name}に代えて）` : ''}。`, 'info', true);
  return true;
}
export function dismissShugodai(s: GameState, g: General) {
  if (!g.shugodai) return;
  addLog(s, `${g.name}の${g.shugodai}守護代を解いた。`, 'info', true);
  g.shugodai = undefined; bump(g, -R.SHUGODAI_OFF);
}
// 守護代のいる国の当家の城は、毎月治安が上がる
export function shugodaiChian(s: GameState, c: Castle) {
  if (c.owner !== s.player) return 0;
  const g = shugodaiOf(s, provName(c.hex));
  return g && ACTIVE.includes(g.status) ? R.SHUGODAI_CHIAN : 0;
}
// 毎月: 守護でなくなった国・家を去った者の守護代を外す
export function cleanShugodai(s: GameState) {
  const mine = new Set(shugoProvs(s));
  for (const g of Object.values(s.generals)) {
    if (!g.shugodai) continue;
    if (g.clan !== s.player || g.status === 'dead' || g.liege || !mine.has(g.shugodai)) {
      if (g.clan === s.player && g.status !== 'dead') addLog(s, `${g.name}は${g.shugodai}守護代を離れた${!mine.has(g.shugodai) ? '（当家が守護でなくなった）' : ''}。`, 'info', true);
      g.shugodai = undefined;
    }
  }
}
