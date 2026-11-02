// 特性の働き: 忍び（忍び頭の暗殺・流言・放火・探り、防諜）・剣豪・築城（普請）・砲術・茶人（茶会）・軍師・水軍
import { TRAITS, TRAIT_NAME, type TraitId } from '../data/traits';
import { membersOf } from './corps';
import { graphDistances } from './map';
import { captureGeneral, killGeneral } from './ops';
import * as R from './rules';
import { addLog, clanCastles, hostile, rand } from './state';
import type { Army, Castle, GameState, General } from './types';

export const traitOf = (g: General | null | undefined): TraitId | null => (g ? TRAITS[g.id] ?? null : null);
export const traitName = (g: General | null | undefined) => { const t = traitOf(g); return t ? TRAIT_NAME[t] : ''; };
export const armyHas = (s: GameState, a: Army, t: TraitId) => membersOf(a).some((id) => TRAITS[id] === t && s.generals[id]?.status === 'army');
export const clanHas = (s: GameState, clan: string, t: TraitId) => Object.values(s.generals).some((g) => g.clan === clan && g.status !== 'dead' && g.status !== 'captive' && g.status !== 'young' && TRAITS[g.id] === t);

// ───────── 剣豪・砲術・軍師・築城の数値 ─────────
export const KENSEI_DRILL = 1.5, KENSEI_CAP = 10; // 練度の伸び×1.5、上限+10
export const HOJUTSU_GUN = 1.2; // 鉄砲隊の攻め×1.2
export const GUNSHI_RANGE = 1, GUNSHI_COURIER = 1;
export const CHIKUJO_GATE = 1.25, CHIKUJO_REPAIR = 2; // 城門の固さ×1.25、修理×2
export const govTrait = (s: GameState, c: Castle) => traitOf(c.governor ? s.generals[c.governor] : null);
// 普請: 城主が築城の者なら、金で城の造りを一段改める（砦→平城→平山城）
export const FUSHIN_COST = 5000;
const NEXT_KIND: Partial<Record<NonNullable<Castle['kind']>, NonNullable<Castle['kind']>>> = { toride: 'hira', yakata: 'hira', hira: 'hirayama' };
export function fushinBlock(s: GameState, c: Castle): string | null {
  if (c.owner !== s.player) return '自城だけ';
  if (govTrait(s, c) !== 'chikujo') return '城主が築城の者のときだけ';
  if (!NEXT_KIND[c.kind ?? 'hira']) return 'これ以上は改められない';
  if (s.clans[s.player].gold < FUSHIN_COST) return `金${FUSHIN_COST.toLocaleString()}貫が要る`;
  return null;
}
export function fushin(s: GameState, c: Castle): boolean {
  if (fushinBlock(s, c)) return false;
  const to = NEXT_KIND[c.kind ?? 'hira']!;
  s.clans[s.player].gold -= FUSHIN_COST; c.kind = to;
  addLog(s, `${s.generals[c.governor!].name}の普請で、${c.name}は${R.CASTLE_KIND[to].name}に改められた。`, 'castle', true);
  return true;
}

// ───────── 外交・僧 ─────────
export const GAIKO_DIP = 0.1, GAIKO_PEACE = 0.1, SO_EMBER = 2;
// 外交の者が使者に立てるか（待機・奉行・城主）
export const gaikoIn = (s: GameState, clan: string) => Object.values(s.generals).some((g) => g.clan === clan && TRAITS[g.id] === 'gaiko' && (g.status === 'free' || g.status === 'bugyo' || g.status === 'governor'));

// ───────── 茶会 ─────────
export const TEA_COST = 500, TEA_ON = 5, TEA_GUESTS = 5, CHAJIN_GIFT = 1.5;
export function teaBlock(s: GameState, host: General | undefined): string | null {
  if (!host || traitOf(host) !== 'chajin' || host.clan !== s.player) return '茶人を選ぶ';
  if (host.status === 'captive' || host.status === 'young' || host.status === 'dead') return '茶会を開けない';
  if (s.clans[s.player].teaTurn === s.turn) return '茶会は月に一度';
  if (s.clans[s.player].gold < TEA_COST) return `金${TEA_COST}貫が要る`;
  return null;
}
// 武将が持つ茶器の格（なければ0）
export const teaGrade = (s: GameState, g: General | undefined) => (g?.tea && s.items?.[g.tea]?.kind === 'tea' ? s.items[g.tea].grade : 0);
export function teaCeremony(s: GameState, host: General): General[] {
  if (teaBlock(s, host)) return [];
  const C = s.clans[s.player];
  C.gold -= TEA_COST; C.teaTurn = s.turn;
  const guests = Object.values(s.generals).filter((g) => g.clan === s.player && g.id !== host.id && g.id !== C.leader && g.status !== 'young' && g.status !== 'captive' && g.status !== 'dead')
    .sort((a, b) => (a.on ?? R.ON_START) - (b.on ?? R.ON_START)).slice(0, TEA_GUESTS);
  // 名物の茶器: 亭主が持てば客の全員に格の分、客が自分の茶器を持参すればその客にさらに格の分
  const hostGrade = teaGrade(s, host);
  for (const g of guests) g.on = Math.min(100, (g.on ?? R.ON_START) + TEA_ON + hostGrade + teaGrade(s, g));
  addLog(s, `${host.name}が茶会を開き、${guests.map((g) => g.name).join('・')}をもてなした。`, 'info', true);
  return guests;
}

// ───────── 忍び ─────────
export type NinjaAct = 'assassinate' | 'rumor' | 'arson' | 'spy';
export const NINJA_COST: Record<NinjaAct, number> = { assassinate: 3000, rumor: 1000, arson: 1500, spy: 500 };
export const NINJA_NAME: Record<NinjaAct, string> = { assassinate: '暗殺', rumor: '流言', arson: '放火', spy: '探り' };
export const NINJA_RANGE = 8; // 自城・自軍からこのマス以内の城・武将だけ
export const ninjaHead = (s: GameState, clan: string) => { const id = s.clans[clan]?.ninja; const g = id ? s.generals[id] : undefined; return g && g.clan === clan && g.status === 'free' && traitOf(g) === 'ninja' ? g : null; };
export function setNinjaHead(s: GameState, clan: string, id: string | null) { s.clans[clan].ninja = id; }
// 敵に忍び頭がいれば防がれる
const counter = (s: GameState, clan: string | null) => (clan && ninjaHead(s, clan) ? 0.15 : 0);
const skill = (g: General) => (g.int + g.bra - 120) / 400;
export function ninjaChance(s: GameState, clan: string, act: NinjaAct, target: { gen?: General; castle?: Castle }): number {
  const g = ninjaHead(s, clan);
  if (!g) return 0;
  const tc = target.gen?.clan ?? target.castle?.owner ?? null;
  if (act === 'assassinate') {
    const t = target.gen!;
    const lord = s.clans[t.clan ?? '']?.leader === t.id;
    if (lord) return Math.max(0.03, Math.min(0.1, 0.07 + skill(g) * 0.3 - counter(s, tc) * 0.3));
    return Math.max(0.05, Math.min(0.45, 0.3 + skill(g) - (t.rank === 0 ? 0.12 : 0.05) - counter(s, tc)));
  }
  const base = act === 'rumor' ? 0.55 : act === 'arson' ? 0.45 : 0.8;
  return Math.max(0.1, Math.min(0.9, base + skill(g) - counter(s, tc)));
}
export function ninjaReach(s: GameState, clan: string): number[] {
  return graphDistances([...clanCastles(s, clan).map((c) => c.hex), ...Object.values(s.armies).filter((a) => a.clan === clan).map((a) => a.hex)]);
}
export function ninjaBlock(s: GameState, clan: string, act: NinjaAct, target: { gen?: General; castle?: Castle }): string | null {
  const g = ninjaHead(s, clan);
  if (!g) return '忍び頭がいない';
  if (s.clans[clan].ninjaTurn === s.turn) return '忍びは月に一度';
  if (s.clans[clan].gold < NINJA_COST[act]) return `金${NINJA_COST[act].toLocaleString()}貫が要る`;
  const tc = target.gen?.clan ?? target.castle?.owner ?? null;
  if (!tc || !hostile(s, clan, tc)) return '敵の家だけ';
  const hex = target.castle?.hex ?? (target.gen ? genHex(s, target.gen) : undefined);
  if (hex === undefined || ninjaReach(s, clan)[hex] > NINJA_RANGE) return `自城・自軍から${NINJA_RANGE}マス以内だけ`;
  if ((act === 'assassinate' || act === 'spy') && !target.gen) return '武将を選ぶ';
  if ((act === 'rumor' || act === 'arson') && !target.castle) return '城を選ぶ';
  if (target.gen && (target.gen.status === 'dead' || target.gen.status === 'captive' || target.gen.status === 'young')) return '狙えない';
  return null;
}
export const genHex = (s: GameState, g: General) => (g.status === 'army' && g.army !== null && s.armies[g.army] ? s.armies[g.army].hex : s.castles[g.loc]?.hex);
export function ninjaDo(s: GameState, clan: string, act: NinjaAct, target: { gen?: General; castle?: Castle }): 'ok' | 'fail' | 'caught' | null {
  if (ninjaBlock(s, clan, act, target)) return null;
  const C = s.clans[clan], g = ninjaHead(s, clan)!;
  C.gold -= NINJA_COST[act]; C.ninjaTurn = s.turn;
  const p = ninjaChance(s, clan, act, target);
  const tc = (target.gen?.clan ?? target.castle?.owner)!;
  const mine = clan === s.player || tc === s.player;
  if (rand(s) < p) {
    if (act === 'assassinate') { const t = target.gen!; killGeneral(s, t, `${C.name}家の忍びに暗殺された`); }
    else if (act === 'rumor') { const c = target.castle!; c.chian = Math.max(0, c.chian - 15); const gv = c.governor ? s.generals[c.governor] : null; if (gv) gv.on = Math.max(0, (gv.on ?? R.ON_START) - 10); addLog(s, `${c.name}に流言が広まり、治安が乱れた${gv ? `。城主${gv.name}は主家を疑い始めた` : ''}。`, 'info', mine); }
    else if (act === 'arson') { const c = target.castle!; c.store = Math.round((c.store ?? 0) * 0.65); c.gate = Math.max(0.3, (c.gate ?? 1) - 0.3); addLog(s, `${c.name}で火の手が上がり、蔵の兵糧と城門が焼けた。`, 'info', mine); }
    else { const t = target.gen!; if (clan === s.player && !s.revealed.includes(t.id)) s.revealed.push(t.id); if (t.army !== null && s.armies[t.army!] && clan === s.player) addLog(s, `探り: ${t.name}隊は兵${s.armies[t.army!].troops.toLocaleString()}・鉄砲${s.armies[t.army!].guns ?? 0}。`, 'info', true); addLog(s, `${g.name}の探りで、${t.name}の力量が明らかになった。`, 'info', clan === s.player); }
    return 'ok';
  }
  // しくじり: 暗殺は捕らわれやすい。相手は当家を恨む
  const caughtP = act === 'assassinate' ? 0.4 : act === 'arson' ? 0.2 : 0.1;
  const T = s.clans[tc];
  if (T && !T.foreign) { T.target = clan; if (act === 'assassinate') C.prestige = Math.max(0, C.prestige - 3); }
  if (rand(s) < caughtP) { captureGeneral(s, g, tc); C.ninja = null; addLog(s, `${g.name}の${NINJA_NAME[act]}はしくじり、${T?.name ?? ''}${T && !T.foreign ? '家' : ''}に捕らわれた。`, 'info', mine); return 'caught'; }
  addLog(s, `${g.name}の${NINJA_NAME[act]}はしくじった（${T?.name ?? ''}${T && !T.foreign ? '家' : ''}は当家を恨む）。`, 'info', mine);
  return 'fail';
}
// AI: 忍びの家臣がいれば忍び頭に据え、ときどき主攻の家に流言・放火・探り（暗殺は稀で、当主は狙わない）
export function aiNinja(s: GameState, clan: string) {
  const C = s.clans[clan];
  if (C.foreign) return;
  if (!ninjaHead(s, clan)) { const g = Object.values(s.generals).find((x) => x.clan === clan && x.status === 'free' && traitOf(x) === 'ninja'); C.ninja = g?.id ?? null; if (!g) return; }
  if (!C.target || !s.clans[C.target]?.alive || rand(s) > 0.15) return;
  const reach = ninjaReach(s, clan);
  const castles = clanCastles(s, C.target).filter((c) => reach[c.hex] <= NINJA_RANGE);
  if (rand(s) < 0.15) {
    const gens = Object.values(s.generals).filter((x) => x.clan === C.target && x.id !== s.clans[C.target!].leader && x.rank > 0 && (x.status === 'army' || x.status === 'governor') && (genHex(s, x) ?? -1) >= 0 && reach[genHex(s, x)!] <= NINJA_RANGE);
    if (gens.length && C.gold > 8000) { ninjaDo(s, clan, 'assassinate', { gen: gens[Math.floor(rand(s) * gens.length)] }); return; }
  }
  if (castles.length && C.gold > 4000) ninjaDo(s, clan, rand(s) < 0.5 ? 'rumor' : 'arson', { castle: castles[Math.floor(rand(s) * castles.length)] });
}
void TRAIT_NAME;
