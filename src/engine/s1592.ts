// シナリオ「文禄元年（1592）唐入り」: 天正十年の地図から、豊臣が天下を統一した姿を作り、唐入りを始めたところから遊ぶ
// （天下統一して唐入りを決めたことのある人だけ、タイトルの時代選びに出る）
import { isForeignHex } from './map';
import { formArmy } from './ops';
import { addLog, garrisonMax, occupancy } from './state';
import { newGame } from './setup';
import { startKarairi } from './karairi';
import * as R from './rules';
import type { GameState } from './types';

export const S1592 = { id: '1592', year: 1592, month: 4, title: '唐入り', lede: '天正十八年、豊臣秀吉は小田原の北条を降して天下を一つにした。功ある者に与える土地はもはやなく、秀吉の目は海の向こうに向く。肥前名護屋に城が築かれ、全国の大名に陣触が下った。文禄元年四月、一番隊の小西行長と宗義智が対馬を発つ。' };
// 1592年までに世を去った者
const DEAD = ['shibata_katsuie', 'akechi_mitsuhide', 'takigawa_kazumasu', 'niwa_nagahide', 'kinoshita_hidenaga', 'sassa_narimasa', 'ikeda_tsuneoki', 'mori_nagayoshi', 'oda_nobunaga', 'oda_nobutada', 'takeda_katsuyori', 'uesugi_kenshin', 'otomo_sorin', 'ryuzoji_takanobu', 'kuroda_yoshitaka_x'];
// 渡海の一番手（対馬と壱岐・肥前に置く）
const VANGUARD: [string, number][] = [['konishi_yukinaga', 18000], ['kato_kiyomasa', 22000], ['kuroda_nagamasa', 11000], ['shimazu_yoshihiro', 14000], ['kobayakawa_takakage', 15000], ['ukita_hideie', 10000]];

export function newKarairiGame(diff: R.Difficulty, seed = Date.now() & 0x7fffffff): GameState {
  const s = newGame('hashiba', diff, seed, '1582');
  const P = 'hashiba';
  s.year = S1592.year; s.month = S1592.month; s.startYear = S1592.year; s.startMonth = S1592.month; s.scenario = S1592.id;
  const C = s.clans[P];
  C.name = '豊臣'; C.prestige = 100; C.food = 1500000; C.gold = 120000; C.court = R.KAMPAKU;
  for (const id of DEAD) { const g = s.generals[id]; if (g && g.status !== 'dead') { g.status = 'dead'; g.army = null; } }
  // 国内の城と家臣・軍勢は、すべて豊臣のもとへ
  for (const c of s.castles) if (!isForeignHex(c.hex)) { c.owner = P; c.chian = Math.max(c.chian, 70); c.ember = 0; c.garrison = garrisonMax(c); if (c.governor && s.generals[c.governor]?.status === 'dead') c.governor = null; }
  for (const g of Object.values(s.generals)) if (g.clan && !s.clans[g.clan]?.foreign && g.status !== 'dead') { if (g.clan !== P) g.formerClan = null; g.clan = P; if (g.status === 'ronin') g.status = 'free'; }
  for (const a of Object.values(s.armies)) if (!s.clans[a.clan]?.foreign) { if (s.generals[a.main]?.status === 'dead') { delete s.armies[a.id]; continue; } a.clan = P; }
  for (const c of Object.values(s.clans)) if (c.id !== P && !c.foreign) c.alive = false;
  s.treaties = []; s.orders = []; s.fronts = [];
  const hide = s.generals.kinoshita_tokichiro; if (hide) { hide.name = '豊臣秀吉'; C.leader = hide.id; hide.born = 1537; }
  // 一番手を対馬・壱岐・肥前に
  const tsu = s.castles.find((c) => c.id === 'kaneishi')!, iki = s.castles.find((c) => c.id === 'kameoka')!;
  const spots = [tsu.hex, ...[...s.castles].filter((c) => c.id !== 'kaneishi').map((c) => c.hex).filter((h) => h === iki.hex), ...s.castles.filter((c) => ['hirado', 'muranaka', 'hinoe', 'tachibanayama'].includes(c.id)).map((c) => c.hex)];
  let k = 0;
  for (const [id, n] of VANGUARD) {
    const g = s.generals[id];
    if (!g || g.status === 'dead') continue;
    if (g.status === 'army' && g.army && s.armies[g.army]) { const old = s.armies[g.army]; for (const x of Object.values(s.generals)) if (x.army === old.id && x.id !== g.id) { x.status = 'free'; x.army = null; } delete s.armies[old.id]; }
    if (g.status === 'governor') { const c = s.castles[g.loc]; if (c.governor === g.id) c.governor = null; }
    g.status = 'free'; g.army = null;
    const occ = occupancy(s);
    const hex = spots.slice(k).find((h) => !occ.has(h));
    if (hex === undefined) break;
    k = spots.indexOf(hex) + 1;
    const a = formArmy(s, P, s.castles[s.castles.findIndex((c) => c.hex === hex)] ?? tsu, g.id, n, hex);
    if (a) { a.acted = false; a.mp = R.MOVE_POINTS; a.morale = 1.3; a.departTroops = n; C.food += n * R.RECRUIT_COST; }
  }
  s.log = [];
  s.karairi = { choice: 'go', cause: 'ikou', ships: false, expel: true, slaveBan: true, envoy: false, investigated: true, turn: s.turn, speaker: '' };
  startKarairi(s);
  s.karairi.envoy = true; // 宗氏の使いはすでに退けられている（名分はある・渡海の路はすでに開いている）
  addLog(s, S1592.lede, 'info', true);
  return s;
}
