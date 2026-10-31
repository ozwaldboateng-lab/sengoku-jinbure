// 1560年時点の身分（0 宿老 / 1 侍大将 / 2 足軽大将 / 3 足軽組頭）。
// ここに無い武将は能力から振り分ける（宿老は家ごとの上位、統率62以上は侍大将、それ未満は足軽大将）。
export const INITIAL_RANK: Record<string, number> = {
  // 織田
  hayashi_hidesada: 0, shibata_katsuie: 0, sakuma_nobumori: 0,
  niwa_nagahide: 1, mori_yoshinari: 1, ikeda_tsuneoki: 1, takigawa_kazumasu: 1, murai_sadakatsu: 1, mizuno_nobumoto: 1,
  maeda_toshiie: 2, sassa_narimasa: 2, kawajiri_hidetaka: 2, yanada_masatsuna: 2, kanamori_nagachika: 2, hachiya_yoritaka: 2,
  kinoshita_tokichiro: 3, kinoshita_hidenaga: 3, mori_yoshikatsu: 3, hattori_kazutada: 3,
  // 今川
  asahina_yasutomo: 0, ihara_tadatane: 0,
  // 松平
  sakai_tadatsugu: 0, ishikawa_ienari: 0, torii_tadayoshi: 0,
  torii_mototada: 2, okubo_tadasuke: 2, naito_masanari: 2, watanabe_moritsuna: 2, hattori_masanari: 2, honda_masanobu: 2,
  // 斎藤
  inaba_yoshimichi: 0, ando_morinari: 0, ujiie_naotomo: 0, takenaka_shigeharu: 2, saito_toshimitsu: 2,
  // 武田（足軽大将は史料に名の残る面々）
  obu_toramasa: 0, amari_masatada: 0, baba_nobuharu: 0, obata_toramori: 0, takeda_nobushige: 0,
  yamamoto_kansuke: 2, hara_toratane: 2, yokota_yasukage: 2, tada_mitsuyori: 2,
  // 長尾
  nagao_masakage: 0, kakizaki_kageie: 0, naoe_kagetsuna: 0, usami_sadamitsu: 0, honjo_sanenori: 0,
  // 北条
  hojo_genan: 0, matsuda_norihide: 0, daidoji_masashige: 0, toyama_tsunakage: 0,
  // 毛利（五奉行）
  fukubara_sadatoshi: 0, katsura_motozumi: 0, akagawa_motoyasu: 0, kodama_naritada: 1, kuchi_motosuke: 1,
  // 三好
  matsunaga_hisahide: 0, miyoshi_nagayasu: 0, shinohara_nagafusa: 0,
  // 朝倉
  yamazaki_yoshiie: 0, asakura_kagenori: 0,
  // 浅井（海赤雨の三将）
  akao_kiyotsuna: 0, kaihoku_tsunachika: 0, amenomori_kiyosada: 0,
  // 大友（加判衆）
  bekki_akitsura: 0, yoshihiro_akimasa: 0, usuki_akisumi: 0,
  // 島津
  ijuin_tadakura: 0, shimazu_tadayoshi: 0, kawakami_hisatoki: 2,
  // 伊達
  nakano_munetoki: 0, makino_hisanaka: 0, oniwa_yoshinao: 0, endo_motonobu: 2,
  // 長宗我部
  yoshida_takayori: 0, tani_tadasumi: 2,
  // 六角
  goto_katatoyo: 0, shindo_katamori: 0, gamo_sadahide: 0,
};

// 一門（当主と同じ名字は自動で一門。それ以外の親族をここに）
export const KIN_EXTRA = [
  'anayama_nobukimi', 'suwa_katsuyori', 'nishina_morinobu', // 武田
  'kikkawa_motoharu', 'kobayakawa_takakage', 'kikkawa_motonaga', 'shishido_takaie', 'hoida_motokiyo', 'kikkawa_hiroie', 'suetsugu_motoyasu', // 毛利
  'ataka_fuyuyasu', 'sogo_kazumasa', // 三好
  'kira_chikasada', 'kosokabe_chikayasu', // 長宗我部
  'sekiguchi_chikanaga', // 今川
  'tsuda_nobusumi', // 織田
];
// 名字が同じでも一門として扱わない
export const KIN_EXCLUDE = ['kitajo_takahiro', 'hojo_tsunataka', 'saito_toshimitsu'];

// 1560年に元服前の武将: 元服する年（それまでは登場しても任用できない）
// 異国の人: 元服ではなく来日として扱う
export const ARRIVAL: Record<string, string> = { yasuke: 'ヴァリニャーノの従者として', miura_anjin: 'リーフデ号で流れ着き', yayosu: 'リーフデ号で流れ着き' };
export const GENPUKU: Record<string, number> = {
  honda_tadakatsu: 1562, sakakibara_yasumasa: 1562,
  sanada_masayuki: 1561, sanada_nobutada: 1561, suwa_katsuyori: 1562, nishina_morinobu: 1571, takeda_nobutoyo: 1563,
  kuroda_yoshitaka: 1561, saito_tatsuoki: 1561, hori_hidemasa: 1566, shimazu_iehisa: 1561, satake_yoshishige: 1561,
  kitabatake_tomofusa: 1561, gamo_ujisato: 1569, todo_takatora: 1570, ishida_mitsunari: 1574,
  nagao_akikage: 1569, higuchi_kanetsugu: 1574, mori_terumoto: 1565, kikkawa_motonaga: 1562,
  yoshihiro_shigetoshi: 1562, otomo_yoshimune: 1571, mori_nagayoshi: 1571, sakuma_morimasa: 1567, katakura_kagetsuna: 1571,
  oda_nobutada: 1572, oda_nobuo: 1572, oda_nobutaka: 1572, tsuda_nobusumi: 1570, takayama_ukon: 1564,
  shibata_shigeie: 1562, irobe_nagazane: 1561, suibara_chikanori: 1561,
  kasahara_masataka: 1565, hojo_saburo: 1569, hojo_ujinao: 1577, hojo_ujikatsu: 1574, hojo_ujifusa: 1580,
  hoida_motokiyo: 1566, kikkawa_hiroie: 1576, suetsugu_motoyasu: 1575, fukubara_hirotoshi: 1582, murakami_motoyoshi: 1568,
  ei_hisatora: 1573, kabayama_hisataka: 1575, shimazu_tadatoki: 1580, shimazu_toyohisa: 1585, shimazu_hisayasu: 1588, shimazu_tadatsune: 1591, togo_shigekata: 1576,
  // v1.41
  ito_ittosai: 1565, ono_tadaaki: 1580, saito_denkibo: 1565, yagyu_munenori: 1586, miyamoto_musashi: 1599, ideura_morikiyo: 1561, ishikawa_goemon: 1573, kato_kiyomasa: 1577, fukushima_masanori: 1576, kato_yoshiaki: 1578, otani_yoshitsugu: 1574, katagiri_katsumoto: 1571, wakisaka_yasuharu: 1569, natsuka_masaie: 1577, konishi_yukinaga: 1573, asano_nagamasa: 1562, sengoku_hidehisa: 1567, hachisuka_iemasa: 1573, kani_saizo: 1569, goto_mototsugu: 1575, ban_naoyuki: 1582, kuroda_nagamasa: 1583, ii_naomasa: 1576, date_masamune: 1581, date_shigezane: 1583, sanada_nobuyuki: 1581, sanada_nobushige: 1582, tachibana_muneshige: 1582, chosokabe_nobuchika: 1580, hosokawa_tadaoki: 1578, ikeda_terumasa: 1580, maeda_toshinaga: 1577, mori_naritoshi: 1580, ukita_hideie: 1587,
  // v1.42 異国の人: 元服の年の代わりに来日の年
  yasuke: 1581, miura_anjin: 1600, yayosu: 1600,
};

// 開始時の奉行（内政担当）。ここに無い家は知略の高い者から自動で選ぶ。
export const BUGYO_INIT: Record<string, string[]> = {
  oda: ['murai_sadakatsu'],
  mori: ['kodama_naritada', 'akagawa_motoyasu', 'kuchi_motosuke'], // 五奉行
  hojo: ['ishimaki_iesada'],
};

// 使番の家ごとの呼び名
export const TSUKAI_LABEL: Record<string, string> = { oda: '母衣衆', takeda: '百足衆' };
// 開始時の使番（先頭が筆頭）。ここに無い家は能力から自動で選ぶ。
export const TSUKAI_INIT: Record<string, string[]> = {
  oda: ['kawajiri_hidetaka', 'maeda_toshiie', 'sassa_narimasa', 'mori_yoshikatsu'],
};
