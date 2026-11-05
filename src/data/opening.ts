// 序幕（シナリオの始まりの背景紹介）にだけ出る人物（顔画像の名寄せにも使う）
// [id, 名, 家（空）, 0]
export const OPENING_PEOPLE: [string, string, string, number][] = [
  ['toki_yorinori', '土岐頼芸', '', 0],
  ['oda_nobuhide', '織田信秀', '', 0],
  ['nohime', '濃姫', '', 0],
  ['ouchi_yoshitaka', '大内義隆', '', 0],
  // ゲームの途中の場面（婚姻で嫁ぐ姫・一揆の頭）。名で顔画像を名寄せする
  ['hime_1', '姫一', '', 0],
  ['hime_2', '姫二', '', 0],
  ['hime_3', '姫三', '', 0],
  ['ikki_toryo', '一向一揆の旗頭', '', 0],
  ['daiku_toryo', '大工の棟梁', '', 0],
  // 逸話の脇役（汎用の顔。id は g_ で始める）
  ['g_kashin', '家臣', '', 0],
  ['g_rojin', '老臣', '', 0],
  ['g_kosho', '小姓', '', 0],
  ['g_shisha', '使者', '', 0],
  ['g_osho', '和尚', '', 0],
  ['g_tabiso', '旅の僧', '', 0],
  ['g_chabozu', '茶坊主', '', 0],
  ['g_tsuma', '武家の妻', '', 0],
  ['g_chonin', '町人', '', 0],
  ['g_hyakusho', '百姓', '', 0],
  ['gihei_face_1', '義兵一', '', 0],
  ['gihei_face_2', '義兵二', '', 0],
  ['gihei_face_3', '義兵三', '', 0],
];
