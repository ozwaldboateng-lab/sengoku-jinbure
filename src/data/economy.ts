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

// ───────── 金山・銀山（稼ぎは知行に関わらず当家へ） ─────────
// [城id, 名, 鉱石, 産出（貫/月）]
export type MineKind = 'gold' | 'silver' | 'copper';
export const MINES: [string, string, MineKind, number][] = [
  ['yamabuki', '石見銀山', 'silver', 1200],
  ['konosumiyama', '生野銀山', 'silver', 700],
  ['tsutsujigasaki', '黒川金山', 'gold', 600],
  ['matsukura', '松倉金山', 'gold', 400],
  ['sunpu', '安倍金山', 'gold', 400],
  ['sannohe', '鹿角の金山', 'gold', 400],
  ['yamagata', '延沢銀山', 'silver', 400],
  ['yanagawa', '半田銀山', 'silver', 400],
  ['nirayama', '縄地金山', 'gold', 250],
  ['koshimizu', '多田銀山', 'silver', 250],
  ['takahara', '茂住・和佐保銀山', 'silver', 250],
  ['konosumiyama', '中瀬金山', 'gold', 200],
  ['bitchu_matsuyama', '吹屋の銅山', 'copper', 150],
];
export const MINE_KIND_NAME: Record<MineKind, string> = { gold: '金', silver: '銀', copper: '銅' };

// ───────── 特産品 ─────────
// 種類: com=商い（その城の商業に上乗せ・貫/月） / horse=馬（突撃の自軍の損害が減る） / powder=硫黄・煙硝（鉄砲の維持費が下がる） / iron=鉄（鉄砲の値段が下がる）
export type ProductKind = 'com' | 'horse' | 'powder' | 'iron';
export const PRODUCTS: [string, string, ProductKind, number][] = [
  ['kasugayama', '青苧', 'com', 250],
  ['nanao', '輪島塗と揚げ浜の塩', 'com', 200],
  ['ichijodani', '越前奉書紙', 'com', 200],
  ['toyama_c', '五箇山の煙硝', 'powder', 0],
  ['gujo', '美濃紙', 'com', 150],
  ['inabayama', '関の刀', 'com', 200],
  ['narumi', '常滑焼・瀬戸物', 'com', 150],
  ['okazaki', '三河木綿', 'com', 150],
  ['tsutsujigasaki', '甲斐駒', 'horse', 0],
  ['kisofukushima', '木曽馬', 'horse', 0],
  ['sannohe', '南部馬', 'horse', 0],
  ['kanayama', '桐生の絹', 'com', 200],
  ['kurokawa', '会津の漆', 'com', 150],
  ['yamagata', '最上の紅花', 'com', 200],
  ['kyo', '宇治茶と西陣織', 'com', 300],
  ['tsutsui', '奈良晒と南都の酒', 'com', 250],
  ['okawachi', '丹生の水銀（伊勢白粉）', 'com', 200],
  ['shingu', '熊野の材木', 'com', 150],
  ['shozui', '阿波の藍', 'com', 200],
  ['tatsuno', '赤穂の塩', 'com', 200],
  ['tenjinyama', '備前長船の刀', 'com', 200],
  ['gassantoda', '出雲のたたら鉄', 'iron', 0],
  ['odaka_h', '伯耆の鉄', 'iron', 0],
  ['sogo', '讃岐の塩', 'com', 150],
  ['uchi', '薩摩の硫黄', 'powder', 0],
];
export const PRODUCT_KIND_NAME: Record<ProductKind, string> = { com: '商い', horse: '馬', powder: '硫黄・煙硝', iron: '鉄' };
