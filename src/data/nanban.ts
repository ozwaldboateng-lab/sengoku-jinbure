// 南蛮貿易と布教のデータ

// 南蛮船の入る港: [城id, 港の名, 開く年, 来航しやすさ]。町そのものに城がない港は近くの城で代用
export const NANBAN_PORTS: [string, string, number, number][] = [
  ['hirado', '平戸', 1550, 1],
  ['funai', '府内', 1550, 1],
  ['uchi', '坊津', 1550, 0.8],
  ['kishiwada', '堺', 1550, 0.5],
  ['sanjo', '長崎', 1570, 1.2],
];

// 唐船（明の商人の船。明は海禁で公の貿易を禁じていたため密貿易）の入る港: [城id, 港の名, 来航しやすさ]
export const KARA_PORTS: [string, string, number][] = [
  ['hirado', '平戸', 1.2],
  ['uchi', '坊津', 1],
  ['tachibana', '博多', 0.8],
];

// 宣教師: [id, 名, 種別（顔画像の生成用・空）, 来日の年, 離日・没の年, 最初に入る城, 紹介]
export const MISSIONARIES: [string, string, string, number, number, string, string][] = [
  ['torres', 'トーレス', '', 1549, 1570, 'funai', 'イエズス会の司祭。ザビエルとともに来日し、その後を継いで日本の布教を率いる。山口・豊後を拠点に信徒を育てた。'],
  ['vilela', 'ヴィレラ', '', 1556, 1570, 'funai', 'イエズス会の司祭。豊後から京へ上り、将軍足利義輝に布教の許しを願い出た。畿内の布教の礎を築いた。'],
  ['frois', 'フロイス', '', 1563, 1597, 'hirado', 'イエズス会の司祭。筆まめで、のちに『日本史』を著す。京で織田信長と幾度も対面したことで知られる。'],
  ['organtino', 'オルガンティーノ', '', 1570, 1609, 'kishiwada', 'イエズス会の司祭。温和な人柄で日本の風習を重んじ、「宇留岸伴天連」と親しまれた。京・安土で布教した。'],
  ['cabral', 'カブラル', '', 1570, 1581, 'sanjo', 'イエズス会の日本布教長。厳格で、日本の習わしに合わせることを好まなかった。大友義鎮に洗礼を授けた。'],
  ['coelho', 'コエリョ', '', 1572, 1590, 'sanjo', 'イエズス会の日本準管区長。熱心で押しが強く、大名とも渡り合った。天下人に唐入りの際は南蛮の大船を用意すると申し出たと伝わり、伴天連追放令のきっかけを作ったともいわれる。'],
  ['valignano', 'ヴァリニャーノ', '', 1579, 1603, 'sanjo', 'イエズス会の巡察師。日本の習わしに合わせた布教を説き、セミナリヨを開き、天正の遣欧使節を送り出した。'],
];

// 洗礼を受ける武将とその年（この年になると洗礼名を持つ）
export const BAPTISM: Record<string, number> = {
  omura_sumitada: 1563,
  takayama_tomoteru: 1563,
  takayama_ukon: 1564,
  ichijo_kanesada: 1575,
  arima_yoshisada: 1576,
  otomo_sorin: 1578,
  kuroda_yoshitaka: 1585,
  gamo_ujisato: 1585,
  otomo_yoshimune: 1587,
};

// 布教への構え（AIが許すかどうかの傾き）。書いていない家は0
export const MISSION_BIAS: Record<string, number> = {
  omura: 0.5, otomo: 0.3, arima: 0.3, matsura: 0.2, oda: 0.3, ashikaga: 0.2, miyoshi: 0.1, ichijo: 0.1,
  honganji: -1, saika: -0.4, mori: -0.1, takeda: -0.2, uesugi: -0.1, ryuzoji: -0.1,
};

// 南蛮の名物: [id, 名, 格]。南蛮船が積んでくる
export const NANBAN_ITEMS: [string, string, number][] = [
  ['nanbando', '南蛮胴具足', 4],
  ['chikyugi', '地球儀', 4],
  ['birodo', '天鵞絨の外套', 3],
  ['tokei', '南蛮時計', 3],
  ['tomegane', '遠眼鏡', 3],
  ['giyaman', 'ギヤマンの酒杯', 2],
  ['nanbangasa', '南蛮笠', 2],
];
