// 生年（数え年の計算に使う）。史料で知られる年を優先し、不明な者は家中の立場からの推定。
// 寿命は持たない（病にかからなければ死なない）。
export const BORN: Record<string, number> = {
  // 織田
  oda_nobunaga: 1534, shibata_katsuie: 1522, niwa_nagahide: 1535, sakuma_nobumori: 1528, mori_yoshinari: 1523, ikeda_tsuneoki: 1536,
  maeda_toshiie: 1538, takigawa_kazumasu: 1525, kinoshita_tokichiro: 1537, oda_nobukiyo: 1530, mizuno_nobumoto: 1525, sassa_narimasa: 1536,
  hayashi_hidesada: 1513, murai_sadakatsu: 1520, yanada_masatsuna: 1524, kawajiri_hidetaka: 1527, mori_yoshikatsu: 1530, hattori_kazutada: 1530,
  oda_nobuhiro: 1527, oda_nobukane: 1543, hachiya_yoritaka: 1534, kanamori_nagachika: 1524, mori_nagayoshi: 1558, sakuma_morimasa: 1554, kinoshita_hidenaga: 1540,
  oda_nobutada: 1557, oda_nobuo: 1558, oda_nobutaka: 1558, tsuda_nobusumi: 1555,
  // 今川
  imagawa_ujizane: 1538, asahina_yasutomo: 1538, okabe_motonobu: 1525, iio_tsuratatsu: 1530, ohara_shigezane: 1520, ihara_tadatane: 1510,
  kuzuyama_ujimoto: 1520, asahina_nobuoki: 1528, okabe_masatsuna: 1542, sekiguchi_chikanaga: 1518, udono_nagateru: 1520, ii_naochika: 1536, amano_kagetsura: 1520,
  sena_ujitoshi: 1515, ono_masatsugu: 1525, itami_yasunao: 1522,
  // 松平
  tokugawa_ieyasu: 1543, sakai_tadatsugu: 1527, ishikawa_kazumasa: 1533, okubo_tadayo: 1532, torii_mototada: 1539, honda_tadazane: 1531,
  okubo_tadasuke: 1537, hiraiwa_chikayoshi: 1542, honda_shigetsugu: 1529, koriki_kiyonaga: 1530, amano_yasukage: 1537, ishikawa_ienari: 1534,
  naito_masanari: 1528, watanabe_moritsuna: 1542, honda_tadakatsu: 1548, sakakibara_yasumasa: 1548, honda_masanobu: 1538, hattori_masanari: 1542,
  osuga_yasutaka: 1527, torii_tadayoshi: 1496,
  // 斎藤
  saito_yoshitatsu: 1527, inaba_yoshimichi: 1515, ando_morinari: 1503, ujiie_naotomo: 1512, hineno_hironari: 1518, takenaka_shigeharu: 1544,
  fuwa_mitsuharu: 1520, nagai_michitoshi: 1510, hibino_kiyozane: 1520, nagai_moriyasu: 1520, kishi_nobuchika: 1515, sato_tadayoshi: 1520,
  saito_toshimitsu: 1534, saito_tatsuoki: 1548, hori_hidemasa: 1553, oshima_mitsuyoshi: 1508, ikoma_chikamasa: 1526,
  toyama_kageto: 1530, toyama_naokado: 1530, toyama_kageyuki: 1510,
  // 武田
  takeda_shingen: 1521, takeda_nobushige: 1525, yamamoto_kansuke: 1500, baba_nobuharu: 1515, obu_toramasa: 1504, obu_masakage: 1529,
  kasuga_toratsuna: 1527, kudo_suketaka: 1522, sanada_yukitaka: 1513, akiyama_nobutomo: 1527, oyamada_nobushige: 1539, kiso_yoshimasa: 1540,
  hara_toratane: 1497, takeda_nobukado: 1532, takeda_yoshinobu: 1538, anayama_nobukimi: 1541, amari_masatada: 1535, obata_toramori: 1491,
  tada_mitsuyori: 1501, yokota_yasukage: 1525, morozumi_torasada: 1495, sanada_nobutsuna: 1537, hoshina_masatoshi: 1509, okuma_tomohide: 1520,
  sanada_masayuki: 1547, sanada_nobutada: 1547, sanada_masateru: 1543, suwa_katsuyori: 1546, nishina_morinobu: 1557, takeda_nobutoyo: 1549,
  hara_masatane: 1531, tsuchiya_masatsugu: 1544, obata_nobuzane: 1540, atobe_katsusuke: 1530, saegusa_masasada: 1537,
  // 長尾
  uesugi_kenshin: 1530, kakizaki_kageie: 1513, naoe_kagetsuna: 1509, usami_sadamitsu: 1489, amakasu_kagemochi: 1530, saito_tomonobu: 1527,
  honjo_shigenaga: 1540, nagao_masakage: 1526, takanashi_masayori: 1508, kitajo_takahiro: 1517, yasuda_nagahide: 1516, nakajo_fujisuke: 1500,
  irobe_katsunaga: 1500, honjo_sanenori: 1511, yamayoshi_toyomori: 1541, kawada_nagachika: 1543, murakami_yoshikiyo: 1501, shibata_nagaatsu: 1530,
  nagao_akikage: 1556, higuchi_kanetsugu: 1560,
  shibata_shigeie: 1547, irobe_nagazane: 1546, takematsu_yoshitsuna: 1525, suda_mitsuchika: 1526, takanashi_hidemasa: 1530, suibara_chikanori: 1546, chisaka_kagechika: 1536,
  // 北条
  hojo_ujiyasu: 1515, hojo_ujimasa: 1538, hojo_tsunashige: 1515, hojo_genan: 1493, hojo_ujiteru: 1542, hojo_ujikuni: 1541, matsuda_norihide: 1530,
  daidoji_masashige: 1533, toyama_tsunakage: 1510, kasahara_yasukatsu: 1520, ueda_tomonao: 1494, chiba_tanetomi: 1527, hojo_tsunataka: 1490,
  hojo_ujishige: 1536, shimizu_yasuhide: 1523, haga_ujitsugu: 1520, tominaga_naokatsu: 1520, tame_motetada: 1500, ishimaki_iesada: 1510, hojo_ujinori: 1545,
  hojo_ujitaka: 1522, naito_tsunahide: 1525, kasahara_masataka: 1550, hojo_saburo: 1554, hojo_ujinao: 1562, hojo_ujikatsu: 1559, hojo_ujifusa: 1565,
  // 関東
  satomi_yoshitaka: 1507, satomi_yoshihiro: 1530, masaki_tokishige: 1513, masaki_tokitada: 1520, masaki_nobushige: 1540, toki_tameyori: 1520, satomi_yoshiyori: 1543,
  satake_yoshiaki: 1531, wada_akitame: 1532, makabe_hisamoto: 1530, satake_yoshishige: 1547,
  oda_ujiharu: 1534, sugaya_masasada: 1518, sugaya_norimasa: 1540, yuki_harutomo: 1534, mizunoya_masamura: 1523, tagaya_masatsune: 1520,
  utsunomiya_hirotsuna: 1545, haga_takasada: 1520, mashiko_katsumune: 1520, nagano_narimasa: 1499, kamiizumi_nobutsuna: 1508, nagano_narimori: 1544,
  yura_narishige: 1506, yura_kunishige: 1550, nagao_akinaga: 1550, ota_sukemasa: 1522, ota_ujisuke: 1542, kajiwara_masakage: 1548,
  // 奥羽
  date_harumune: 1519, date_terumune: 1544, nakano_munetoki: 1500, oniwa_yoshinao: 1513, endo_motonobu: 1532, makino_hisanaka: 1520, katakura_kagetsuna: 1557,
  mogami_yoshimori: 1521, mogami_yoshiaki: 1546, ujiie_sadanao: 1510, ashina_moriuji: 1521, kanagami_morikiyo: 1527, tomita_ujizane: 1520,
  nanbu_harumasa: 1517, ishikawa_takanobu: 1495, kita_nobuchika: 1523, hachinohe_masanaga: 1540, kunohe_masazane: 1536, nanbu_nobunao: 1546,
  ando_chikasue: 1539, ando_shigesue: 1540, toshima_genba: 1520, kasai_harunobu: 1534, tomizawa_naotsuna: 1520, kashiwayama_akiyoshi: 1520,
  osaki_yoshinao: 1520, osaki_yoshitaka: 1548, ujiie_takatsugu: 1520, soma_moritane: 1529, soma_yoshitane: 1548, sato_yoshinobu: 1510,
  iwaki_shigetaka: 1500, iwaki_chikataka: 1534, shirado_takasada: 1520, nikaido_moriyoshi: 1544, nikaido_teruyuki: 1520, suda_morihide: 1530,
  onodera_kagemichi: 1534, yagashiwa_michitame: 1520, kurosawa_michiie: 1530, daihoji_yoshimasu: 1520, daihoji_yoshiuji: 1551, tosabayashi_zento: 1510,
  // 北陸
  jinbo_nagamoto: 1510, jinbo_nagazumi: 1540, terashima_motosada: 1520, shiina_yasutane: 1520, doi_masashige: 1530, shiina_kagenao: 1530,
  hatakeyama_yoshitsuna: 1530, yusa_tsugumitsu: 1520, cho_tsugutsura: 1522, honganji_kennyo: 1543, shimotsuma_rairen: 1537, shimotsuma_raisho: 1516,
  asakura_yoshikage: 1533, asakura_kagenori: 1505, asakura_kageakira: 1525, yamazaki_yoshiie: 1520, magara_naotaka: 1536, uozumi_kagekata: 1520, maeba_yoshitsugu: 1520,
  takeda_yoshizumi: 1526, awaya_katsuhisa: 1520, hemi_masatsune: 1530, mitsuki_yoshiyori: 1520, mitsuki_yoritsuna: 1540, shioya_akisada: 1520,
  // 近江・畿内
  azai_katamasa: 1545, isono_kazumasa: 1523, endo_naotsune: 1531, akao_kiyotsuna: 1514, azai_hisamasa: 1526, kaihoku_tsunachika: 1510,
  amenomori_kiyosada: 1510, atsuji_sadayuki: 1528, miyabe_keijun: 1528, todo_takatora: 1556, ishida_mitsunari: 1560,
  rokkaku_yoshikata: 1521, gamo_katahide: 1534, goto_katatoyo: 1520, shindo_katamori: 1520, rokkaku_yoshiharu: 1545, hirai_sadatake: 1510,
  mikumo_sadamochi: 1510, gamo_sadahide: 1508, gamo_ujisato: 1556,
  ashikaga_yoshiteru: 1536, hosokawa_fujitaka: 1534, mitsubuchi_fujihide: 1531, wada_koremasa: 1530, isshiki_fujinaga: 1530, ashikaga_yoshiaki: 1537,
  miyoshi_nagayoshi: 1522, miyoshi_yoshioki: 1542, matsunaga_hisahide: 1510, miyoshi_jikkyu: 1527, ataka_fuyuyasu: 1528, sogo_kazumasa: 1532,
  naito_munekatsu: 1515, miyoshi_nagayasu: 1516, shinohara_nagafusa: 1520, iwanari_tomomichi: 1525, miyoshi_masayasu: 1528, miyoshi_yasunaga: 1520,
  ikeda_nagamasa: 1520, itami_chikaoki: 1520, matsunaga_hisamichi: 1543, araki_murashige: 1535, takayama_tomoteru: 1530, takayama_ukon: 1552, nakagawa_kiyohide: 1542,
  hatakeyama_takamasa: 1527, yasumi_munefusa: 1520, yukawa_naomitsu: 1510, suzuki_shigeoki: 1520, suzuki_shigehide: 1538, dobashi_morishige: 1520,
  kitabatake_tomonori: 1528, toyao_mitsuyoshi: 1510, kozukuri_tomomasa: 1530, kitabatake_tomofusa: 1547,
  isshiki_yoshimichi: 1530, inatomi_sukenao: 1545, isshiki_yoshisada: 1545, yamana_suketoyo: 1511, yamana_toyokazu: 1530, otagaki_tomonobu: 1520,
  // 中国
  akamatsu_yoshisuke: 1537, akamatsu_masahide: 1520, akamatsu_norifusa: 1545, bessho_yasuharu: 1532, bessho_shigemune: 1529, bessho_nagaharu: 1545,
  kodera_masamoto: 1529, kodera_mototaka: 1524, kuroda_yoshitaka: 1546, urakami_munekage: 1529, ukita_naoie: 1529, akashi_yukikatsu: 1520, ukita_tadaie: 1532,
  mimura_iechika: 1517, mimura_motochika: 1530, mimura_sanechika: 1530,
  amago_haruhisa: 1514, amago_yoshihisa: 1540, uyama_hisakane: 1510, honjo_tsunemitsu: 1510, ushio_yukikiyo: 1510, tachihara_hisatsuna: 1531,
  yamanaka_yukimori: 1545, yubara_harutsuna: 1520, yonehara_tsunahiro: 1520,
  mori_motonari: 1497, mori_takamoto: 1523, kikkawa_motoharu: 1530, kobayakawa_takakage: 1533, shishido_takaie: 1518, fukubara_sadatoshi: 1512,
  kuchiba_michiyoshi: 1513, kumagai_naozane: 1507, masuda_fujikane: 1529, sugihara_morishige: 1520, naito_takaharu: 1528, katsura_motozumi: 1499,
  akagawa_motoyasu: 1510, kuchi_motosuke: 1510, kodama_naritada: 1506, amano_takashige: 1503, mori_terumoto: 1553, kikkawa_motonaga: 1548,
  kodama_narikata: 1513, nomi_munekatsu: 1527, ankokuji_ekei: 1539, miyoshi_takasuke: 1515, watanabe_hajime: 1530, hoida_motokiyo: 1551, kikkawa_hiroie: 1561, suetsugu_motoyasu: 1560, fukubara_hirotoshi: 1567,
  murakami_motoyoshi: 1553, shimizu_muneharu: 1537,
  // 四国
  kono_michinobu: 1520, kurushima_michiyasu: 1519, murakami_takeyoshi: 1533, hiraoka_fusazane: 1513, saionji_sanemitsu: 1510, saionji_kinhiro: 1537, doi_kiyoyoshi: 1545,
  chosokabe_motochika: 1539, yoshida_takayori: 1510, kira_chikasada: 1541, fukudome_chikamasa: 1511, hisatake_chikanobu: 1530, kosokabe_chikayasu: 1543, tani_tadasumi: 1534,
  motoyama_shigetoki: 1525, motoyama_sadashige: 1545, motoyama_shigenao: 1530, aki_kunitora: 1530, kuroiwa_echizen: 1520, hatayama_motouji: 1520,
  ichijo_kanesada: 1543, doi_sozan: 1510, hanyu_kenmotsu: 1520, tamematsu_wakasa: 1520,
  // 九州
  otomo_sorin: 1530, bekki_akitsura: 1513, yoshihiro_akimasa: 1520, usuki_akisumi: 1515, takahashi_akitane: 1528, tachibana_akitoshi: 1520,
  kamachi_akimori: 1520, saito_shigezane: 1530, tawara_chikakata: 1535, shiga_chikamori: 1520, kutami_akiyasu: 1510, takita_akinari: 1510,
  saeki_korenori: 1530, yoshihiro_shigetoshi: 1548, otomo_yoshimune: 1558,
  ryuzoji_takanobu: 1529, nabeshima_naoshige: 1538, ryuzoji_naganobu: 1538, hyakutake_tomokane: 1540, narimatsu_nobukatsu: 1540, enjoji_nobutane: 1540, notomi_nobukage: 1520,
  arima_yoshisada: 1521, arima_harezumi: 1483, arima_yoshizumi: 1550, matsura_takanobu: 1529, koteda_yasutsune: 1520, matsura_shigenobu: 1549,
  omura_sumitada: 1533, tomonaga_sumimori: 1520, miyahara_sumifusa: 1520, sagara_yoshihi: 1544, fukami_nagatomo: 1531, indo_yoriyasu: 1536, marume_nagayoshi: 1540,
  aso_korenobu: 1520, kai_soun: 1515, aso_koretane: 1520, ito_yoshisuke: 1512, ito_yoshimasu: 1545, ito_suketake: 1559, ochiai_kanetomo: 1520,
  shimazu_takahisa: 1514, shimazu_yoshihisa: 1533, shimazu_yoshihiro: 1535, shimazu_toshihisa: 1537, shimazu_tadayoshi: 1493, niiro_tadamoto: 1526,
  shimazu_tadachika: 1503, shimazu_yoshitora: 1536, shimazu_tadamasa: 1520, ijuin_tadakura: 1510, shimazu_naohisa: 1531, kawakami_hisatoki: 1537, shimazu_iehisa: 1547,
  tanegashima_tokitaka: 1528, ijuin_tadamune: 1541, ei_hisatora: 1558, kabayama_hisataka: 1560, shimazu_tadatoki: 1565, shimazu_toyohisa: 1570, shimazu_hisayasu: 1573, shimazu_tadatsune: 1576, kawakami_tadatomo: 1531, togo_shigekata: 1561,
  kimotsuki_kanetsugu: 1511, kimotsuki_yoshikane: 1535, kimotsuki_kanesuke: 1540,
  // 在野
  akechi_mitsuhide: 1528, shima_kiyooki: 1540, yagyu_munetoshi: 1527, yamauchi_kazutoyo: 1545, kuki_yoshitaka: 1542, hachisuka_masakatsu: 1526,
  maeno_nagayasu: 1528, tsutsui_junkei: 1549, kedoin_yoshishige: 1530,
  // v1.41 剣豪・忍び・のちに名を挙げる者
  tsukahara_bokuden: 1489, hikita_kagekane: 1537, hozoin_inei: 1521, ito_ittosai: 1550, ono_tadaaki: 1565, toda_seigen: 1524, saito_denkibo: 1550, hayashizaki_jinsuke: 1542, okuyama_kyugasai: 1526, yagyu_munenori: 1571, miyamoto_musashi: 1584, momochi_tanba: 1512, fujibayashi_nagato: 1520, kido_yazaemon: 1540, kato_danzo: 1520, fuma_kotaro: 1530, ideura_morikiyo: 1546, sugitani_zenjubo: 1530, tarao_mitsutoshi: 1514, yamanaka_toshiyoshi: 1525, ishikawa_goemon: 1558, hachiya_yanosaburo: 1520, seki_masatoki: 1530, kato_kiyomasa: 1562, fukushima_masanori: 1561, kato_yoshiaki: 1563, otani_yoshitsugu: 1559, katagiri_katsumoto: 1556, wakisaka_yasuharu: 1554, mashita_nagamori: 1545, natsuka_masaie: 1562, konishi_yukinaga: 1558, asano_nagamasa: 1547, horio_yoshiharu: 1543, nakamura_kazuuji: 1542, sengoku_hidehisa: 1552, hachisuka_iemasa: 1558, kani_saizo: 1554, goto_mototsugu: 1560, ban_naoyuki: 1567, maeda_toshimasu: 1541, kuroda_nagamasa: 1568, ii_naomasa: 1561, date_masamune: 1567, date_shigezane: 1568, sanada_nobuyuki: 1566, sanada_nobushige: 1567, tachibana_muneshige: 1567, chosokabe_nobuchika: 1565, hosokawa_tadaoki: 1563, ikeda_terumasa: 1565, maeda_toshinaga: 1562, mori_naritoshi: 1565, ukita_hideie: 1572,
  // v1.42 異国の人
  yasuke: 1555, miura_anjin: 1564, yayosu: 1556,
};
