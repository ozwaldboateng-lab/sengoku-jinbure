// 幕府の職と守護職・格式。持ち主は1552年・1560年ごろの史実に寄せる（確かさの劣るものは近い家に）
// 管内は国名（「陸奥」「出羽」は前方一致で陸奥・会津などを含む）
export type OfficeId = 'kanrei' | 'kanreidai' | 'kanto' | 'kubo' | 'oshu' | 'ushu' | 'kyushu';
export const OFFICES: { id: OfficeId; name: string; area: string[]; cost: number; note: string }[] = [
  { id: 'kanrei', name: '管領', area: ['山城', '摂津', '河内', '和泉', '大和'], cost: 30000, note: '将軍を補佐する最高の職。名目は細川京兆家だが、戦国期は畿内を押さえる家が担う' },
  { id: 'kanreidai', name: '管領代', area: ['山城', '摂津', '河内', '和泉', '大和', '近江'], cost: 20000, note: '管領に代わって政務をとる。六角定頼が務めた' },
  { id: 'kanto', name: '関東管領', area: ['相模', '武蔵', '上野', '下野', '常陸', '下総', '上総', '安房'], cost: 20000, note: '関東を治める職。山内上杉家が世襲し、1561年に上杉憲政から長尾景虎へ' },
  { id: 'kubo', name: '古河公方の後見', area: ['相模', '武蔵', '上野', '下野', '常陸', '下総', '上総', '安房'], cost: 15000, note: '関東の公方（足利義氏）を擁立する家。関東管領と並ぶ関東の名分' },
  { id: 'oshu', name: '奥州探題', area: ['陸奥'], cost: 12000, note: '陸奥の探題。大崎家が代々務め、のち伊達晴宗が任じられる' },
  { id: 'ushu', name: '羽州探題', area: ['出羽'], cost: 10000, note: '出羽の探題。最上家が代々務める' },
  { id: 'kyushu', name: '九州探題', area: ['筑前', '筑後', '豊前', '豊後', '肥前', '肥後', '日向', '大隅', '薩摩'], cost: 20000, note: '九州の探題。渋川家の没落後、1559年に大友義鎮が任じられる' },
];
export const OFFICE_START: Record<string, Partial<Record<OfficeId, string>>> = {
  '1560': { kanrei: 'miyoshi', kanto: 'uesugi', kubo: 'hojo', oshu: 'date', ushu: 'mogami', kyushu: 'otomo' },
  '1552': { kanrei: 'miyoshi', kanreidai: 'rokkaku', kanto: 'uesugi', kubo: 'hojo', oshu: 'osaki', ushu: 'mogami' },
  // 1582: 将軍義昭は鞆にあって幕府は名ばかり。関東は信長が滝川一益を「関東の取次」に置いた
  '1582': { kanto: 'takigawa', kubo: 'hojo', oshu: 'date', ushu: 'mogami', kyushu: 'otomo' },
};
// 守護職（国 → 家）
const SHUGO_1560: Record<string, string> = {
  出雲: 'amago', 隠岐: 'amago', 伯耆: 'amago', 因幡: 'amago', 美作: 'amago', 備前: 'amago', 備中: 'amago', 備後: 'amago',
  豊後: 'otomo', 筑後: 'otomo', 肥後: 'otomo', 豊前: 'otomo', 筑前: 'otomo', 肥前: 'otomo',
  駿河: 'imagawa', 遠江: 'imagawa', 甲斐: 'takeda', 信濃: 'takeda', 近江: 'rokkaku', 安芸: 'mori',
  越前: 'asakura', 若狭: 'wakasa_takeda', 伊勢: 'kitabatake', 但馬: 'yamana', 播磨: 'akamatsu', 丹後: 'isshiki',
  能登: 'hatakeyama_n', 河内: 'hatakeyama_k', 紀伊: 'hatakeyama_k', 薩摩: 'shimazu', 大隅: 'shimazu', 日向: 'shimazu', 土佐: 'ichijo', 伊予: 'kono',
  阿波: 'miyoshi', 讃岐: 'miyoshi', 越後: 'uesugi', 上野: 'uesugi', 常陸: 'satake', 下野: 'utsunomiya', 安房: 'satomi',
};
export const SHUGO_START: Record<string, Record<string, string>> = {
  '1560': SHUGO_1560,
  '1552': { ...SHUGO_1560, 豊前: 'ouchi', 筑前: 'ouchi', 肥前: '', 周防: 'ouchi', 長門: 'ouchi', 信濃: '', 安芸: 'ouchi' },
  '1582': { 薩摩: 'shimazu', 大隅: 'shimazu', 日向: 'shimazu', 豊後: 'otomo', 筑後: 'otomo', 豊前: 'otomo', 周防: 'mori', 長門: 'mori', 安芸: 'mori', 石見: 'mori', 出雲: 'mori', 備後: 'mori', 越後: 'uesugi', 常陸: 'satake', 安房: 'satomi', 伊予: 'kono', 土佐: 'chosokabe' },
};
// 御相伴衆（格式）
export const SHOBAN_START: Record<string, string[]> = {
  '1560': ['otomo', 'miyoshi', 'saito', 'amago'],
  '1552': ['amago', 'rokkaku'],
  '1582': ['mori', 'otomo', 'uesugi'],
};
// 幕府の信任（0〜100）。書いていない家は30
export const TRUST_START: Record<string, Record<string, number>> = {
  '1560': { otomo: 70, uesugi: 75, miyoshi: 45, saito: 55, amago: 55, imagawa: 50, takeda: 50, oda: 50, mori: 50, hojo: 40, rokkaku: 60, asakura: 55, date: 50, mogami: 45, kitabatake: 50, hatakeyama_k: 50, wakasa_takeda: 55, isshiki: 45, akamatsu: 40, yamana: 40, satomi: 35, shimazu: 40, ashikaga: 100 },
  '1552': { rokkaku: 75, amago: 60, uesugi: 65, miyoshi: 35, otomo: 55, imagawa: 50, takeda: 45, hojo: 40, ouchi: 30, osaki: 45, mogami: 45, asakura: 55, ashikaga: 100 },
  // 1582: 義昭を庇う毛利の信任が厚い。主を討った明智は低い
  '1582': { mori: 80, uesugi: 55, otomo: 45, shimazu: 45, takeda: 0, akechi: 15, oda: 25, hashiba: 25, shibata: 25, matsudaira: 30, hojo: 40, date: 45, mogami: 45, satake: 40, ashikaga: 100 },
};
// 将軍に立てられる足利一門（擁立の候補）
export const SHOGUN_CANDIDATES = ['ashikaga_yoshiaki', 'ashikaga_yoshiteru'];
