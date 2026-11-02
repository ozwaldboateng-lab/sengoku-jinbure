// 地方の区分け（一覧を地方ごとにたたむ・選択欄を地方ごとにまとめるため）
export const REGION_ORDER = ['奥羽', '関東', '甲信', '北陸', '東海', '近畿', '中国', '四国', '九州', '海の向こう'] as const;
export type Region = (typeof REGION_ORDER)[number];
const R: Record<Exclude<Region, '海の向こう'>, string[]> = {
  奥羽: [],
  関東: ['相模', '武蔵', '下総', '上総', '安房', '常陸', '下野', '上野'],
  甲信: ['甲斐', '信濃'],
  北陸: ['越後', '佐渡', '越中', '能登', '加賀', '越前', '若狭'],
  東海: ['尾張', '三河', '遠江', '駿河', '伊豆', '美濃', '飛騨'],
  近畿: ['山城', '大和', '河内', '和泉', '摂津', '近江', '丹波', '丹後', '紀伊', '伊勢', '伊賀', '志摩', '淡路'],
  中国: ['播磨', '但馬', '因幡', '伯耆', '出雲', '石見', '隠岐', '美作', '備前', '備中', '備後', '安芸', '周防', '長門'],
  四国: ['阿波', '讃岐', '伊予', '土佐'],
  九州: ['筑前', '筑後', '豊前', '豊後', '肥前', '肥後', '日向', '大隅', '薩摩', '対馬', '壱岐'],
};
const BY_PROV = new Map<string, Region>();
for (const [r, ps] of Object.entries(R)) for (const p of ps) BY_PROV.set(p, r as Region);
// 国名から地方（陸奥・出羽は「陸奥・会津」のように分かれているので先頭で見る）
export function regionOf(prov: string): Region {
  if (prov.startsWith('陸奥') || prov.startsWith('出羽')) return '奥羽';
  return BY_PROV.get(prov) ?? '海の向こう';
}
