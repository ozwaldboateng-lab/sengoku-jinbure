// 年齢・成長と老い・病・病没
import { BORN } from '../data/births';
import { killGeneral, nearestOwnCastle, removeArmy } from './ops';
import { staffOf } from './corps';
import * as R from './rules';
import { addLog, garrisonMax, rand } from './state';
import type { GameState, General } from './types';

export const ageOf = (s: GameState, g: General) => (g.born !== undefined ? s.year - g.born : null);

function shift(g: General, k: number) {
  const f = (v: number, d: number) => Math.max(R.STAT_FLOOR, v + d * k);
  g.bra = f(g.bra, 2); g.lea = f(g.lea, 2); g.int = f(g.int, 1); g.cha = f(g.cha, 1);
}
// 開始時: 25歳に満たない武将は、能力を伸びしろの分だけ下げておく
export function initLife(g: General, year: number) {
  g.born ??= BORN[g.id] ?? year - 30;
  const d = Math.max(0, Math.min(R.GROW_MAX, R.GROW_AGE - (year - g.born)));
  if (d > 0) { g.grow = d; shift(g, -d); }
}

const visible = (s: GameState, g: General) => g.clan === s.player || (!!g.clan && s.clans[g.clan]?.leader === g.id);

export function monthlyLife(s: GameState) {
  const gens = Object.values(s.generals).filter((g) => g.status !== 'dead' && !g.ikki);
  if (s.month === 1) {
    for (const g of gens) {
      if (g.grow) { g.grow--; shift(g, 1); }
      const age = ageOf(s, g);
      if (age === null) continue;
      if (age >= R.AGE_DECLINE.bra) g.bra = Math.max(R.STAT_FLOOR, g.bra - 2);
      if (age >= R.AGE_DECLINE.lea) g.lea = Math.max(R.STAT_FLOOR, g.lea - 1);
      if (age >= R.AGE_DECLINE.int) g.int = Math.max(R.STAT_FLOOR, g.int - 1);
    }
  }
  for (const g of gens) {
    if (g.status === 'young') continue;
    const age = ageOf(s, g) ?? 40;
    if (g.sick) {
      if (rand(s) < R.sickDeath(age)) { die(s, g); continue; }
      if (--g.sick <= 0) { g.sick = undefined; if (visible(s, g)) addLog(s, `${g.name}は病が癒えた。`, 'info', g.clan === s.player); }
    } else if (rand(s) < R.sickChance(age)) {
      g.sick = 1 + Math.floor(rand(s) * R.SICK_MONTHS_MAX);
      if (g.clan === s.player && s.clans[s.player].leader === g.id) s.willAsked = s.turn; // 当主が倒れた: 遺言を求める
      if (visible(s, g)) addLog(s, `${g.name}（${age}歳）が病に倒れた。`, 'info', g.clan === s.player);
    }
  }
}

// 病没: 部隊長なら補佐が引き継ぐ。補佐がいなければ兵は近くの自城へ戻り、隊は解ける
function die(s: GameState, g: General) {
  const a = g.army !== null ? s.armies[g.army] : undefined;
  // 主将が病没し、継ぐ者もいなければ兵は近くの自城へ戻る（継ぐ者がいれば killGeneral で引き継ぐ）
  if (a && a.main === g.id && !staffOf(a).length) {
    const c = nearestOwnCastle(s, a.clan, a.hex);
    if (c) c.garrison = Math.min(garrisonMax(c), c.garrison + a.troops);
    s.clans[a.clan].guns += a.guns ?? 0; a.guns = 0;
    removeArmy(s, a);
  }
  g.sick = undefined;
  killGeneral(s, g, `病没（${ageOf(s, g)}歳）`);
}

// 旧セーブ（年齢なし）の読み込み: 能力はそのまま、生年だけ付ける
export function migrateLife(s: GameState) {
  s.startYear ??= R.START_YEAR; s.startMonth ??= R.START_MONTH; s.scenario ??= '1560';
  for (const g of Object.values(s.generals)) g.born ??= Math.min(BORN[g.id] ?? 1530, g.status === 'young' ? 9999 : R.ADULT_BORN_MAX);
}
