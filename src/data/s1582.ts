// 天正十年（1582）六月、本能寺の変の直後（六月三日ごろ）。清洲会議の前。
// 織田家は分かれる: 明智（光秀）・羽柴（秀吉）・柴田（勝家）・滝川（一益）・織田（信雄、一門に信孝、丹羽・池田らが従う）。徳川は織田と同盟。
// 城の持ち主・武将の所在はおおまかな史実に寄せる（確かさの劣るものは近い城・近い家に）。
import type { Scenario } from './scenarios';

// [家, 城] … 武将の所属と所在
const M = (clan: string, loc: string): [string, string] => [clan, loc];

export const S1582: Scenario = {
  id: '1582', year: 1582, month: 6, title: '天正十年 本能寺の変',
  lede: '天正十年六月二日、明智光秀が京の本能寺に織田信長を、二条御所に嫡男信忠を討った。羽柴秀吉は備中高松で毛利と対し、柴田勝家は越中魚津を攻め、滝川一益は上野にあり、徳川家康は堺から本国を目指す。主を失った織田の家臣たちは、誰が天下を継ぐのか。',
  clans: [
    { id: 'akechi', name: '明智', color: '#5a74b8', prestige: 55 },
    { id: 'hashiba', name: '羽柴', color: '#e0b23e', prestige: 60 },
    { id: 'shibata', name: '柴田', color: '#8a5a3c', prestige: 60 },
    { id: 'takigawa', name: '滝川', color: '#4a8a86', prestige: 45 },
    { id: 'sanada', name: '真田', color: '#b83a2e', prestige: 35 },
    { id: 'kiso', name: '木曽', color: '#7a8a5a', prestige: 30 },
    { id: 'tsutsui', name: '筒井', color: '#6a7a9a', prestige: 40 },
    { id: 'hosokawa', name: '細川', color: '#3e6a5a', prestige: 45 },
    // 名を改めた家
    { id: 'matsudaira', name: '徳川', color: '#d7a227', prestige: 65 },
    { id: 'uesugi', name: '上杉', color: '#2c5a9e', prestige: 65 },
    { id: 'urakami', name: '宇喜多', color: '#4a4a7a', prestige: 45 },
    { id: 'anegakoji', name: '姉小路', color: '#6a7a5a', prestige: 30 },
  ],
  prestige: { oda: 70, mori: 65, hojo: 70, otomo: 55, shimazu: 65, ryuzoji: 55, chosokabe: 55, date: 50, satake: 55 },
  owners: {
    // 織田（信雄・信孝・丹羽・池田と、甲信の城代）
    kiyosu: 'oda', inuyama: 'oda', narumi: 'oda', kariya: 'oda', inabayama: 'oda', ogaki: 'oda', iwamura: 'oda', gujo: 'oda',
    kiriyama: 'oda', okawachi: 'oda', kameyama: 'oda', hijiyama: 'oda', tashiro: 'oda', hino: 'oda', nochiseyama: 'oda',
    ishiyama: 'oda', akutagawa: 'oda', koshimizu: 'oda', iimoriyama: 'oda', takaya: 'oda', kishiwada: 'oda',
    tsutsujigasaki: 'oda', iwadono: 'oda', takato: 'oda', iida: 'oda', kaizu: 'oda', iiyama: 'oda',
    // 明智
    kyo: 'akechi', kannonji: 'akechi', sawayama: 'akechi', odani: 'akechi', yagi: 'akechi', kuroi: 'akechi',
    // 羽柴
    gochaku: 'hashiba', oshio: 'hashiba', tatsuno: 'hashiba', miki: 'hashiba', konosumiyama: 'hashiba', fuse: 'hashiba', sumoto: 'hashiba',
    // 柴田（前田・佐々・佐久間・金森を従える）
    ichijodani: 'shibata', kanegasaki: 'shibata', ono: 'shibata', kanazawa: 'shibata', nanao: 'shibata', toyama_c: 'shibata',
    // 滝川・真田・木曽
    umayabashi: 'takigawa', minowa: 'takigawa', komoro: 'sanada', kisofukushima: 'kiso', fukashi: 'kiso',
    // 畿内の国衆
    tsutsui: 'tsutsui', shigisan: 'tsutsui', takebeyama: 'hosokawa',
    // 徳川（三河・遠江・駿河）
    okazaki: 'matsudaira', dabu: 'matsudaira', yoshida: 'matsudaira', hikuma: 'matsudaira', kakegawa: 'matsudaira', sunpu: 'matsudaira',
    // 上杉
    matsukura: 'uesugi',
    // 飛騨
    takahara: 'anegakoji',
    // 関東
    iwatsuki: 'hojo', sekiyado: 'hojo', oshi: 'hojo', kanayama: 'yura', mito: 'satake', odajo: 'satake',
    // 中国（毛利が尼子・三村の旧領を持つ）
    gassantoda: 'mori', yamabuki: 'mori', odaka_h: 'mori', takata: 'mori', bitchu_matsuyama: 'mori',
    // 四国
    amagiri: 'chosokabe', asakura_t: 'chosokabe', motoyama: 'chosokabe', aki_t: 'chosokabe', nakamura: 'chosokabe', shozui: 'miyoshi', sogo: 'miyoshi',
    // 九州
    yanagawa_k: 'ryuzoji', kumamoto: 'ryuzoji', kawaradake: null, tonokori: 'shimazu', takayama_o: 'shimazu',
    // 滅んだ家の城は国人へ
    hiro: null, negoro: null,
  },
  generals: [
    [['akechi_hidemitsu', '明智秀満', 'akechi', 84, 72, 80, 74, 'kannonji'], 1536],
    [['mizoo_shigetomo', '溝尾茂朝', 'akechi', 70, 64, 66, 58, 'kannonji'], 1538],
    [['fujita_yukimasa', '藤田行政', 'akechi', 74, 60, 68, 56, 'yagi'], 1530],
    [['akechi_mitsuyoshi', '明智光慶', 'akechi', 40, 56, 44, 58, 'yagi'], 1569],
    [['kyogoku_takatsugu', '京極高次', 'akechi', 54, 64, 58, 72, 'odani'], 1563],
    [['takeda_motoaki', '武田元明', 'akechi', 58, 56, 58, 62, 'sawayama'], 1552],
    [['mori_hideyori', '毛利長秀', 'oda', 66, 62, 68, 60, 'iida'], 1541],
    [['oda_hidenobu', '織田秀信', 'oda', 50, 54, 52, 62, 'kiyosu'], 1580],
    [['ashina_moritaka', '蘆名盛隆', 'ashina', 70, 60, 66, 62, 'kurokawa'], 1561],
    [['utsunomiya_kunitsuna', '宇都宮国綱', 'utsunomiya', 62, 56, 60, 60, 'utsunomiya'], 1568],
    [['arima_harunobu', '有馬晴信', 'arima', 66, 70, 64, 68, 'hinoe'], 1567],
    [['kono_michinao', '河野通直', 'kono', 48, 56, 52, 60, 'yuzuki'], 1564],
    [['sogo_masayasu', '十河存保', 'miyoshi', 76, 62, 70, 64, 'shozui'], 1554],
  ],
  dead: [
    // 織田
    'oda_nobunaga', 'oda_nobutada', 'mori_yoshinari', 'sakuma_nobumori', 'hayashi_hidesada', 'murai_sadakatsu', 'yanada_masatsuna', 'mori_yoshikatsu',
    'oda_nobuhiro', 'oda_nobukiyo', 'mizuno_nobumoto', 'mori_naritoshi',
    // 今川
    'okabe_motonobu', 'iio_tsuratatsu', 'ohara_shigezane', 'ihara_tadatane', 'kuzuyama_ujimoto', 'asahina_nobuoki', 'sekiguchi_chikanaga', 'udono_nagateru',
    'ii_naochika', 'amano_kagetsura', 'sena_ujitoshi', 'ono_masatsugu',
    // 徳川
    'honda_tadazane', 'torii_tadayoshi',
    // 斎藤・遠山
    'saito_yoshitatsu', 'ujiie_naotomo', 'takenaka_shigeharu', 'fuwa_mitsuharu', 'nagai_michitoshi', 'hibino_kiyozane', 'nagai_moriyasu', 'kishi_nobuchika',
    'sato_tadayoshi', 'saito_tatsuoki', 'toyama_kageto', 'toyama_naokado', 'toyama_kageyuki',
    // 武田
    'takeda_shingen', 'takeda_nobushige', 'yamamoto_kansuke', 'baba_nobuharu', 'obu_toramasa', 'obu_masakage', 'kasuga_toratsuna', 'kudo_suketaka', 'sanada_yukitaka',
    'akiyama_nobutomo', 'oyamada_nobushige', 'hara_toratane', 'takeda_nobukado', 'takeda_yoshinobu', 'anayama_nobukimi', 'amari_masatada', 'obata_toramori', 'tada_mitsuyori',
    'yokota_yasukage', 'morozumi_torasada', 'sanada_nobutsuna', 'okuma_tomohide', 'sanada_masateru', 'suwa_katsuyori', 'nishina_morinobu', 'takeda_nobutoyo', 'hara_masatane',
    'tsuchiya_masatsugu', 'atobe_katsusuke', 'saegusa_masasada',
    // 上杉
    'uesugi_kenshin', 'kakizaki_kageie', 'naoe_kagetsuna', 'usami_sadamitsu', 'nagao_masakage', 'takanashi_masayori', 'yasuda_nagahide', 'nakajo_fujisuke', 'irobe_katsunaga',
    'honjo_sanenori', 'yamayoshi_toyomori', 'kawada_nagachika', 'murakami_yoshikiyo', 'shibata_nagaatsu', 'takematsu_yoshitsuna', 'takanashi_hidemasa',
    // 北条
    'hojo_ujiyasu', 'toyama_tsunakage', 'kasahara_yasukatsu', 'ueda_tomonao', 'chiba_tanetomi', 'hojo_tsunataka', 'hojo_ujishige', 'haga_ujitsugu', 'tominaga_naokatsu',
    'tame_motetada', 'ishimaki_iesada', 'hojo_ujitaka', 'hojo_saburo',
    // 関東の諸家
    'satomi_yoshitaka', 'satomi_yoshihiro', 'masaki_tokishige', 'masaki_tokitada', 'masaki_nobushige', 'toki_tameyori', 'satake_yoshiaki', 'tagaya_masatsune',
    'utsunomiya_hirotsuna', 'nagano_narimasa', 'nagano_narimori', 'yura_narishige', 'ota_ujisuke',
    // 奥羽
    'date_harumune', 'nakano_munetoki', 'makino_hisanaka', 'ujiie_sadanao', 'ashina_moriuji', 'nanbu_harumasa', 'ishikawa_takanobu', 'ando_shigesue', 'toshima_genba',
    'osaki_yoshinao', 'sato_yoshinobu', 'iwaki_shigetaka', 'nikaido_moriyoshi', 'nikaido_teruyuki', 'daihoji_yoshimasu', 'tosabayashi_zento',
    // 北陸
    'jinbo_nagamoto', 'terashima_motosada', 'shiina_yasutane', 'shiina_kagenao', 'yusa_tsugumitsu', 'cho_tsugutsura', 'shimotsuma_raisho',
    'asakura_yoshikage', 'asakura_kagenori', 'asakura_kageakira', 'yamazaki_yoshiie', 'magara_naotaka', 'uozumi_kagekata', 'maeba_yoshitsugu',
    'takeda_yoshizumi', 'hemi_masatsune', 'mitsuki_yoshiyori',
    // 近江・畿内
    'azai_katamasa', 'isono_kazumasa', 'endo_naotsune', 'akao_kiyotsuna', 'azai_hisamasa', 'kaihoku_tsunachika', 'amenomori_kiyosada',
    'goto_katatoyo', 'shindo_katamori', 'hirai_sadatake', 'mikumo_sadamochi', 'gamo_sadahide',
    'ashikaga_yoshiteru', 'mitsubuchi_fujihide', 'wada_koremasa',
    'miyoshi_nagayoshi', 'miyoshi_yoshioki', 'matsunaga_hisahide', 'miyoshi_jikkyu', 'ataka_fuyuyasu', 'sogo_kazumasa', 'naito_munekatsu', 'miyoshi_nagayasu',
    'shinohara_nagafusa', 'iwanari_tomomichi', 'ikeda_nagamasa', 'itami_chikaoki', 'matsunaga_hisamichi',
    'hatakeyama_takamasa', 'yasumi_munefusa', 'yukawa_naomitsu', 'suzuki_shigeoki', 'dobashi_morishige',
    'kitabatake_tomonori', 'toyao_mitsuyoshi', 'kitabatake_tomofusa', 'isshiki_yoshimichi',
    // 中国
    'yamana_suketoyo', 'yamana_toyokazu', 'otagaki_tomonobu', 'akamatsu_yoshisuke', 'akamatsu_masahide', 'bessho_yasuharu', 'bessho_nagaharu',
    'ukita_naoie', 'mimura_iechika', 'mimura_motochika', 'mimura_sanechika',
    'amago_haruhisa', 'uyama_hisakane', 'honjo_tsunemitsu', 'ushio_yukikiyo', 'yamanaka_yukimori', 'yubara_harutsuna', 'yonehara_tsunahiro',
    'mori_motonari', 'mori_takamoto', 'sugihara_morishige', 'katsura_motozumi', 'akagawa_motoyasu', 'kodama_naritada',
    // 四国
    'kono_michinobu', 'kurushima_michiyasu', 'hiraoka_fusazane', 'saionji_sanemitsu',
    'yoshida_takayori', 'kira_chikasada', 'fukudome_chikamasa', 'hisatake_chikanobu', 'motoyama_shigetoki', 'motoyama_shigenao',
    'aki_kunitora', 'kuroiwa_echizen', 'hatayama_motouji', 'doi_sozan', 'hanyu_kenmotsu', 'tamematsu_wakasa',
    // 九州
    'yoshihiro_akimasa', 'usuki_akisumi', 'takahashi_akitane', 'tachibana_akitoshi', 'kamachi_akimori', 'saito_shigezane', 'takita_akinari', 'saeki_korenori',
    'arima_yoshisada', 'arima_harezumi', 'arima_yoshizumi', 'sagara_yoshihi', 'ito_yoshimasu', 'ochiai_kanetomo',
    'shimazu_takahisa', 'shimazu_tadayoshi', 'shimazu_tadachika', 'shimazu_tadamasa', 'ijuin_tadakura', 'shimazu_naohisa', 'kawakami_hisatoki', 'tanegashima_tokitaka',
    'kimotsuki_kanetsugu', 'kimotsuki_yoshikane', 'kimotsuki_kanesuke',
    // 在野
    'kedoin_yoshishige', 'tsukahara_bokuden', 'kato_danzo', 'sugitani_zenjubo',
  ],
  moves: {
    // ── 織田 ──
    oda_nobuo: M('oda', 'kiriyama'), oda_nobutaka: M('oda', 'ishiyama'), oda_nobukane: M('oda', 'kameyama'), oda_hidenobu: M('oda', 'kiyosu'),
    tsuda_nobusumi: M('oda', 'ishiyama'), niwa_nagahide: M('oda', 'ishiyama'), hineno_hironari: M('oda', 'ishiyama'), kani_saizo: M('oda', 'ishiyama'),
    ikeda_tsuneoki: M('oda', 'koshimizu'), ikeda_terumasa: M('oda', 'koshimizu'), nakagawa_kiyohide: M('oda', 'koshimizu'), takayama_ukon: M('oda', 'akutagawa'),
    hachiya_yoritaka: M('oda', 'kishiwada'), miyoshi_yasunaga: M('oda', 'iimoriyama'), kawajiri_hidetaka: M('oda', 'tsutsujigasaki'),
    mori_nagayoshi: M('oda', 'kaizu'), ideura_morikiyo: M('oda', 'kaizu'), inaba_yoshimichi: M('oda', 'ogaki'), oshima_mitsuyoshi: M('oda', 'inabayama'),
    gamo_katahide: M('oda', 'hino'), gamo_ujisato: M('oda', 'hino'), kuki_yoshitaka: M('oda', 'tashiro'), kozukuri_tomomasa: M('oda', 'kiriyama'),
    awaya_katsuhisa: M('oda', 'nochiseyama'), natsuka_masaie: M('oda', 'nochiseyama'),
    // ── 羽柴 ──
    kinoshita_tokichiro: M('hashiba', 'gochaku'), kinoshita_hidenaga: M('hashiba', 'konosumiyama'), todo_takatora: M('hashiba', 'konosumiyama'),
    hachisuka_masakatsu: M('hashiba', 'gochaku'), hachisuka_iemasa: M('hashiba', 'gochaku'), kuroda_yoshitaka: M('hashiba', 'gochaku'), kodera_mototaka: M('hashiba', 'gochaku'),
    kuroda_nagamasa: M('hashiba', 'gochaku'), goto_mototsugu: M('hashiba', 'gochaku'), hori_hidemasa: M('hashiba', 'gochaku'), ikoma_chikamasa: M('hashiba', 'gochaku'),
    ishida_mitsunari: M('hashiba', 'gochaku'), otani_yoshitsugu: M('hashiba', 'gochaku'), kato_kiyomasa: M('hashiba', 'gochaku'), fukushima_masanori: M('hashiba', 'gochaku'),
    kato_yoshiaki: M('hashiba', 'gochaku'), katagiri_katsumoto: M('hashiba', 'gochaku'), wakisaka_yasuharu: M('hashiba', 'gochaku'), mashita_nagamori: M('hashiba', 'gochaku'),
    asano_nagamasa: M('hashiba', 'gochaku'), horio_yoshiharu: M('hashiba', 'gochaku'), nakamura_kazuuji: M('hashiba', 'gochaku'), yamauchi_kazutoyo: M('hashiba', 'gochaku'),
    maeno_nagayasu: M('hashiba', 'gochaku'), hattori_kazutada: M('hashiba', 'gochaku'), tachihara_hisatsuna: M('hashiba', 'gochaku'), ito_suketake: M('hashiba', 'gochaku'),
    konishi_yukinaga: M('hashiba', 'sumoto'), sengoku_hidehisa: M('hashiba', 'sumoto'), miyabe_keijun: M('hashiba', 'fuse'),
    akamatsu_norifusa: M('hashiba', 'tatsuno'), bessho_shigemune: M('hashiba', 'miki'),
    // ── 柴田 ──
    shibata_katsuie: M('shibata', 'ichijodani'), takayama_tomoteru: M('shibata', 'ichijodani'), kanamori_nagachika: M('shibata', 'ono'),
    maeda_toshiie: M('shibata', 'nanao'), maeda_toshinaga: M('shibata', 'nanao'), maeda_toshimasu: M('shibata', 'nanao'),
    sassa_narimasa: M('shibata', 'toyama_c'), sakuma_morimasa: M('shibata', 'kanazawa'),
    // ── 滝川・真田・木曽 ──
    takigawa_kazumasu: M('takigawa', 'umayabashi'), kitajo_takahiro: M('takigawa', 'umayabashi'), obata_nobuzane: M('takigawa', 'minowa'),
    sanada_masayuki: M('sanada', 'komoro'), sanada_nobutada: M('sanada', 'komoro'), sanada_nobuyuki: M('sanada', 'komoro'), sanada_nobushige: M('sanada', 'komoro'),
    kiso_yoshimasa: M('kiso', 'kisofukushima'),
    // ── 明智 ──
    akechi_mitsuhide: M('akechi', 'kannonji'), saito_toshimitsu: M('akechi', 'yagi'), atsuji_sadayuki: M('akechi', 'odani'),
    // ── 筒井・細川 ──
    tsutsui_junkei: M('tsutsui', 'tsutsui'), shima_kiyooki: M('tsutsui', 'tsutsui'),
    hosokawa_fujitaka: M('hosokawa', 'takebeyama'), hosokawa_tadaoki: M('hosokawa', 'takebeyama'), isshiki_yoshisada: M('hosokawa', 'takebeyama'), inatomi_sukenao: M('hosokawa', 'takebeyama'),
    // ── 徳川 ──
    tokugawa_ieyasu: M('matsudaira', 'hikuma'), honda_tadakatsu: M('matsudaira', 'hikuma'), sakakibara_yasumasa: M('matsudaira', 'hikuma'), ii_naomasa: M('matsudaira', 'hikuma'),
    okubo_tadayo: M('matsudaira', 'hikuma'), hattori_masanari: M('matsudaira', 'hikuma'), honda_masanobu: M('matsudaira', 'hikuma'), imagawa_ujizane: M('matsudaira', 'hikuma'),
    sakai_tadatsugu: M('matsudaira', 'yoshida'), osuga_yasutaka: M('matsudaira', 'kakegawa'), asahina_yasutomo: M('matsudaira', 'kakegawa'),
    okabe_masatsuna: M('matsudaira', 'sunpu'), itami_yasunao: M('matsudaira', 'sunpu'), torii_mototada: M('matsudaira', 'sunpu'),
    // ── 上杉 ──
    doi_masashige: M('uesugi', 'matsukura'), amakasu_kagemochi: M('uesugi', 'matsukura'),
    // ── 関東 ──
    ota_sukemasa: M('satake', 'ota'), kajiwara_masakage: M('satake', 'odajo'), hojo_ujifusa: M('hojo', 'iwatsuki'), nagao_akinaga: M('yura', 'kanayama'),
    // ── 中国・四国 ──
    ashikaga_yoshiaki: M('mori', 'kannabe'), isshiki_fujinaga: M('mori', 'kannabe'), shimizu_muneharu: M('mori', 'bitchu_matsuyama'), amago_yoshihisa: M('mori', 'katsuyama'),
    hachiya_yanosaburo: M('mori', 'gassantoda'), murakami_takeyoshi: M('mori', 'niitakayama'), murakami_motoyoshi: M('mori', 'niitakayama'),
    motoyama_sadashige: M('chosokabe', 'motoyama'),
    // ── 九州 ──
    fukami_nagatomo: M('sagara', 'hitoyoshi'),
    // ── 在野（主家が滅んだ・追われた者） ──
    rokkaku_yoshikata: M('', 'kannonji'), rokkaku_yoshiharu: M('', 'kannonji'), honganji_kennyo: M('', 'saika'), shimotsuma_rairen: M('', 'saika'),
    araki_murashige: M('', 'kannabe'), kodera_masamoto: M('', 'kannabe'), urakami_munekage: M('', 'tenjinyama'), miyoshi_masayasu: M('', 'iimoriyama'),
    hatakeyama_yoshitsuna: M('', 'nanao'), jinbo_nagazumi: M('', 'toyama_c'), shibata_shigeie: M('', 'honjo'), oda_ujiharu: M('', 'odajo'),
    sugaya_masasada: M('', 'odajo'), sugaya_norimasa: M('', 'odajo'), ichijo_kanesada: M('', 'jizogatake'), ito_yoshisuke: M('', 'yuzuki'),
    hoshina_masatoshi: M('', 'takato'), ando_morinari: M('', 'ogaki'), kamiizumi_nobutsuna: M('', 'minowa'), marume_nagayoshi: M('', 'hitoyoshi'),
  },
  leaders: {
    oda: 'oda_nobuo', akechi: 'akechi_mitsuhide', hashiba: 'kinoshita_tokichiro', shibata: 'shibata_katsuie', takigawa: 'takigawa_kazumasu',
    matsudaira: 'tokugawa_ieyasu', sanada: 'sanada_masayuki', kiso: 'kiso_yoshimasa', tsutsui: 'tsutsui_junkei', hosokawa: 'hosokawa_fujitaka',
    uesugi: 'nagao_akikage', hojo: 'hojo_ujinao', satomi: 'satomi_yoshiyori', satake: 'satake_yoshishige', utsunomiya: 'haga_takasada', yura: 'yura_kunishige',
    date: 'date_terumune', mogami: 'mogami_yoshiaki', ashina: 'ashina_moritaka', nanbu: 'nanbu_nobunao', osaki: 'osaki_yoshitaka', soma: 'soma_yoshitane',
    iwaki: 'iwaki_chikataka', nikaido: 'suda_morihide', daihoji: 'daihoji_yoshiuji',
    anegakoji: 'mitsuki_yoritsuna', mori: 'mori_terumoto', urakami: 'ukita_tadaie', miyoshi: 'sogo_masayasu', kono: 'kono_michinao', saionji: 'saionji_kinhiro',
    otomo: 'otomo_yoshimune', arima: 'arima_harunobu', matsura: 'matsura_shigenobu', sagara: 'fukami_nagatomo', shimazu: 'shimazu_yoshihisa', saika: 'suzuki_shigehide',
  },
  names: {
    kinoshita_tokichiro: ['羽柴秀吉'], kinoshita_hidenaga: ['羽柴秀長'], tokugawa_ieyasu: ['徳川家康'], nagao_akikage: ['上杉景勝'], higuchi_kanetsugu: ['直江兼続'],
    otomo_sorin: ['大友宗麟'], mitsuki_yoritsuna: ['姉小路頼綱'], yoshihiro_shigetoshi: ['高橋紹運'],
  },
  // 身分は1560年のものを使わず、ここで決める（書いていない者は能力から）
  ranksFresh: true,
  ranks: {
    oda_nobutaka: 1, oda_nobukane: 1, niwa_nagahide: 0, ikeda_tsuneoki: 0, kawajiri_hidetaka: 0, mori_nagayoshi: 1, hachiya_yoritaka: 1, inaba_yoshimichi: 1, gamo_katahide: 1,
    kinoshita_hidenaga: 0, hachisuka_masakatsu: 0, kuroda_yoshitaka: 0, hori_hidemasa: 1, kato_kiyomasa: 3, fukushima_masanori: 3, ishida_mitsunari: 2, otani_yoshitsugu: 2,
    maeda_toshiie: 0, sassa_narimasa: 0, sakuma_morimasa: 1, kanamori_nagachika: 1,
    akechi_hidemitsu: 0, saito_toshimitsu: 0, mizoo_shigetomo: 1, fujita_yukimasa: 1,
    sakai_tadatsugu: 0, ishikawa_kazumasa: 0, honda_tadakatsu: 1, sakakibara_yasumasa: 1, ii_naomasa: 1, okubo_tadayo: 1, torii_mototada: 1,
    higuchi_kanetsugu: 0, saito_tomonobu: 0, honjo_shigenaga: 1, kikkawa_motoharu: 0, kobayakawa_takakage: 0, ankokuji_ekei: 1,
  },
  court: { oda: 4, hashiba: 1, shibata: 1, akechi: 1, matsudaira: 3, mori: 2, uesugi: 2, hojo: 2, otomo: 2, shimazu: 2, date: 2, chosokabe: 1, ryuzoji: 1, ashikaga: 0 },
  treaties: [
    // 織田の家中（清洲会議まで。やがて切れる）
    ['oda', 'hashiba', 10], ['oda', 'shibata', 10], ['oda', 'takigawa', 10], ['hashiba', 'shibata', 8], ['hashiba', 'takigawa', 10], ['shibata', 'takigawa', 10],
    ['oda', 'matsudaira', 36], ['hashiba', 'urakami', 36], ['hashiba', 'mori', 6], ['oda', 'kiso', 12], ['takigawa', 'sanada', 6],
    ['satake', 'utsunomiya', 24], ['satake', 'yuki', 24], ['shimazu', 'sagara', 36], ['oda', 'anegakoji', 24],
  ],
  // 主殺しの仇: 織田方の家は明智を討つ名分を持つ
  foes: [['oda', 'akechi'], ['hashiba', 'akechi'], ['shibata', 'akechi'], ['takigawa', 'akechi'], ['matsudaira', 'akechi'], ['tsutsui', 'akechi'], ['hosokawa', 'akechi'],
    ['urakami', 'akechi'], ['kiso', 'akechi'], ['anegakoji', 'akechi']],
  guns: { oda: 3000, hashiba: 2500, shibata: 1500, akechi: 1500, takigawa: 600, matsudaira: 1200, mori: 1500, hojo: 1200, uesugi: 800, saika: 1500, shimazu: 800, otomo: 800, ryuzoji: 600, chosokabe: 600, tsutsui: 400, hosokawa: 400 },
  // 武田の旧領は主を失った城代が抑えきれず、残党と一揆の火種がくすぶる（天正壬午の乱の下地）
  castleState: Object.fromEntries(['tsutsujigasaki', 'iwadono', 'takato', 'iida', 'kaizu', 'iiyama', 'fukashi', 'komoro', 'minowa', 'umayabashi'].map((id) => [id, { ember: 60, chian: 32, oldOwner: 'takeda' }])),
  items: { samonji: ['oda', null], tsukumo: [null, null] },
  featured: ['akechi', 'hashiba', 'shibata', 'oda', 'matsudaira', 'takigawa', 'sanada', 'hojo', 'uesugi', 'mori', 'urakami', 'chosokabe', 'shimazu', 'otomo', 'ryuzoji', 'date', 'mogami', 'satake'],
};
