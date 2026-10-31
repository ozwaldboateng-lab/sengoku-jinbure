// 顔見せのセリフ選び。気性は能力の最も高いもので決める（武勇=豪胆・知略=理知・魅力=温厚・統率=実直）
import { FAMOUS, LINES, type Scene, type Temper } from '../data/lines';
import { ENVOY_LABEL, ENVOY_LINES, PERSONAS, type EnvoyScene } from '../data/envoys';
import { clanName } from './state';
import type { GameState, General } from './types';

export type { Scene } from '../data/lines';
// gen は顔の id（武将、または話すだけの人物）。who があれば武将ではなく、その名と色で出す。label は場面の見出し
export interface SceneLine { gen: string; scene: Scene | EnvoyScene; text: string; jisei?: boolean; who?: { name: string; color: string }; label?: string }

export function temperOf(g: General): Temper {
  const v: [Temper, number][] = [['bold', g.bra], ['wise', g.int], ['gentle', g.cha], ['steady', g.lea]];
  return v.reduce((b, x) => (x[1] > b[1] ? x : b))[0];
}
// 同じ武将・場面・月なら同じセリフ（画面を描き直しても変わらない）
function hash(str: string) { let h = 2166136261; for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619); return h >>> 0; }
const DEATH: Scene[] = ['deathBattle', 'deathSick', 'execute'];

export function lineFor(s: GameState, g: General, scene: Scene, vars: Record<string, string> = {}): SceneLine {
  const f = FAMOUS[g.id];
  let text: string | undefined, jisei = false;
  if (f?.jisei && DEATH.includes(scene)) { text = f.jisei; jisei = true; }
  else text = f?.[scene];
  if (!text) {
    const pool = LINES[scene][temperOf(g)];
    text = pool[hash(`${g.id}|${scene}|${s.turn}`) % pool.length];
  }
  const v: Record<string, string> = { clan: clanName(s, s.player), foe: g.clan ? clanName(s, g.clan) : g.formerClan ? clanName(s, g.formerClan) : '旧主', name: g.name, ...vars };
  return { gen: g.id, scene, text: text.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? ''), jisei };
}
// 月の報告に出す節目の顔見せ（評定終了のたびに空にする）
export function pushScene(s: GameState, g: General, scene: Scene, vars: Record<string, string> = {}) {
  (s.scenes ??= []).push(lineFor(s, g, scene, vars));
}

// 幕府・南蛮などとのやり取り: 話し手は武将（将軍・幕臣・相手の当主）か、話すだけの人物（PERSONAS）か、宣教師（id と名）
export function envoyLine(s: GameState, scene: EnvoyScene, speaker: General | { id: string; name: string; color?: string }, vars: Record<string, string> = {}): SceneLine {
  const pool = ENVOY_LINES[scene];
  const id = 'status' in speaker ? speaker.id : speaker.id;
  const text = pool[hash(`${id}|${scene}|${s.turn}`) % pool.length];
  const lord = s.clans[s.player]?.leader ? s.generals[s.clans[s.player].leader!]?.name ?? '' : '';
  const v: Record<string, string> = { clan: clanName(s, s.player), lord, name: speaker.name, ...vars };
  const out: SceneLine = { gen: id, scene, text: text.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? ''), label: ENVOY_LABEL[scene] };
  if (!('status' in speaker)) { const p = PERSONAS[speaker.id]; out.who = { name: p?.name ?? speaker.name, color: p?.color ?? speaker.color ?? '#5a4a3a' }; }
  return out;
}
