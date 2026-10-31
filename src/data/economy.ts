// 商業・鉄砲・名物のデータ

// 商業の要所: 城ごとの商業値（貫/月）の上乗せ。町そのものに城がない場合は近くの城で代用
export const COMMERCE_BONUS: Record<string, number> = {
  kishiwada: 3000, // 堺
  kyo: 2000, // 京
  tachibana: 2000, // 博多
  kiyosu: 1000, // 津島・熱田
  ishiyama: 500, saika: 500, negoro: 500,
};
export const SAKAI = 'kishiwada';
// 鉄砲の産地（どれかを持てば安く買える）: 堺・国友・根来・雑賀
export const GUN_SOURCES = ['kishiwada', 'odani', 'negoro', 'saika'];
// 開始時の鉄砲
export const INITIAL_GUNS: Record<string, number> = { oda: 500, saika: 800, honganji: 300, miyoshi: 300, shimazu: 300, otomo: 200 };

export type { ItemKind } from '../engine/types';
import type { ItemKind } from '../engine/types';
// 名物: [id, 名, 種類, 格(1-5), 開始時の持ち主の家（null=堺の市場）, 持たせている武将]
export const MEIBUTSU: [string, string, ItemKind, number, string | null, string | null][] = [
  ['tsukumo', '九十九髪茄子', 'tea', 5, 'miyoshi', 'matsunaga_hisahide'],
  ['hiragumo', '平蜘蛛釜', 'tea', 4, 'miyoshi', null],
  ['hatsuhana', '初花肩衝', 'tea', 5, null, null],
  ['narashiba', '楢柴肩衝', 'tea', 5, null, null],
  ['nitta', '新田肩衝', 'tea', 4, 'otomo', null],
  ['matsushima', '松島茶壺', 'tea', 4, null, null],
  ['shoo_nasu', '紹鴎茄子', 'tea', 3, null, null],
  ['juko_nasu', '珠光小茄子', 'tea', 3, null, null],
  ['samonji', '義元左文字', 'sword', 4, 'oda', 'oda_nobunaga'],
  ['mikazuki', '三日月宗近', 'sword', 5, 'ashikaga', null],
  ['dojigiri', '童子切安綱', 'sword', 5, 'ashikaga', 'ashikaga_yoshiteru'],
  ['odenta', '大典太光世', 'sword', 5, 'ashikaga', null],
  ['onimaru', '鬼丸国綱', 'sword', 4, 'ashikaga', null],
  ['honebami', '骨喰藤四郎', 'sword', 4, 'ashikaga', null],
  ['yagen', '薬研藤四郎', 'sword', 4, 'ashikaga', null],
  ['heshikiri', 'へし切長谷部', 'sword', 4, null, null],
];
