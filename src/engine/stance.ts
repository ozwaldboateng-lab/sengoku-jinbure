// 野戦か籠城か: 自分の城のマスにいる軍団が攻められたとき、守り手が構えを決める
// 直轄の城（当家）は毎回プレイヤーに尋ねる。委任している城（領の城・軍事の委任）と、AIの家は「状況次第」で自動に決める
// 野戦に敗れた軍団は城へ退いて籠城し、その月と翌月は籠城のまま（もう尋ねない）
import { groupEstimate } from './combat';
import { delegateOf } from './delegate';
import { frontOfCastle } from './fronts';
import type { Stance, Target } from './move';
import * as R from './rules';
import { castleAt } from './state';
import type { Army, Castle, GameState } from './types';

export interface StanceInfo { castle: Castle; defender: Army; attackers: Army[]; fieldWin: number; rojoWin: number }
type StanceAsk = (s: GameState, info: StanceInfo) => Promise<Stance>;
let stanceHook: StanceAsk | null = null;
export function setStanceHook(f: StanceAsk | null) { stanceHook = f; }

// 守り手が勝つ見込み（攻め手の見込みの裏返し。武将の能力は使わない）
export function stanceOdds(s: GameState, attackers: Army[], t: Target & { kind: 'army' }) {
  const fieldWin = 1 - groupEstimate(s, attackers, { ...t, stance: 'field' });
  const rojoWin = 1 - groupEstimate(s, attackers, { ...t, stance: 'rojo' });
  return { fieldWin, rojoWin };
}
// 状況次第: 野戦で勝てる見込みが十分で、籠城と比べて大きく劣らなければ打って出る（勝てば敵を追い払えるため）。足りなければ籠城
export const autoStance = (fieldWin: number, rojoWin: number): Stance => (fieldWin >= R.FIELD_PICK && fieldWin >= rojoWin * R.FIELD_VS_ROJO ? 'field' : 'rojo');

// 委任している城か（領の城、または軍事を委任している）
export const delegatedCastle = (s: GameState, c: Castle) => { const f = frontOfCastle(s, c); return (!!f && !f.vacant) || !!delegateOf(s).military; };

export async function decideStance(s: GameState, attackers: Army[], t: Target): Promise<Stance | undefined> {
  if (t.kind !== 'army') return undefined;
  const c = castleAt(s, t.hex);
  if (!c || c.owner !== t.army.clan) return undefined; // 自分の城にいるときだけ
  if (t.army.rojo !== undefined && s.turn - t.army.rojo <= 1) return 'rojo'; // 野戦に敗れて籠城したばかり
  const { fieldWin, rojoWin } = stanceOdds(s, attackers, t);
  if (t.army.clan === s.player && stanceHook && !delegatedCastle(s, c)) return stanceHook(s, { castle: c, defender: t.army, attackers, fieldWin, rojoWin });
  return autoStance(fieldWin, rojoWin);
}
