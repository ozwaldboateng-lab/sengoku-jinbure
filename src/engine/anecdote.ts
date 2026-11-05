// 逸話: 人物が生きていて年が合えば、幅の中のどこかの月に一度起きる（家・役職は問わない）
import { ANECDOTES, type Anecdote } from '../data/anecdotes';
import { addLog, rand } from './state';
import type { GameState } from './types';

const alive = (s: GameState, id: string) => { const g = s.generals[id]; return !!g && g.status !== 'dead'; };
export const fillNames = (s: GameState, t: string) => t.replace(/\{(\w+)\}/g, (_, id) => s.generals[id]?.name ?? '');

export function anecdoteReady(s: GameState, a: Anecdote) {
  if ((s.anecdotes ?? []).includes(a.id) || s.year < a.from || s.year > a.to) return false;
  if (!a.who.every((id) => alive(s, id))) return false;
  if (a.gone?.some((id) => alive(s, id))) return false;
  if (a.active && s.generals[a.who[0]].status === 'young') return false;
  if (a.apart) { const [x, y] = a.who.map((id) => s.generals[id].clan); if (!x || !y || x === y) return false; }
  return true;
}

// 月の終わりに（年が変わる前）。幅の残りの月数で割った見込みにして、幅の最後の月には必ず起きる
export function monthlyAnecdotes(s: GameState) {
  for (const a of ANECDOTES) {
    if (!anecdoteReady(s, a)) continue;
    const left = (a.to - s.year) * 12 + (12 - s.month) + 1;
    if (rand(s) >= 1 / left) continue;
    fireAnecdote(s, a);
    break; // 月に一つ
  }
}

export function fireAnecdote(s: GameState, a: Anecdote) {
  (s.anecdotes ??= []).push(a.id);
  for (const [id, k, n] of a.gain) { const g = s.generals[id]; if (g && g.status !== 'dead') g[k] = Math.min(100, g[k] + n); }
  const main = s.generals[a.who[0]];
  addLog(s, `【逸話】${fillNames(s, a.log)}`, 'info', main.clan === s.player);
  (s.events ??= []).push({ kind: 'anecdote', id: a.id });
}
