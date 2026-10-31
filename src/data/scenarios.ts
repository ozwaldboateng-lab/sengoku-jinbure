// シナリオ: 1560年（roster.ts そのもの）と、それとの差分で書いた1552年
import type { ClanDef, GeneralDef } from './roster';
import { S1582 } from './s1582';

export interface Scenario {
  id: string; year: number; month: number; title: string; lede: string;
  clans?: ClanDef[]; // この年だけの家
  prestige?: Record<string, number>; // 威信の上書き
  owners?: Record<string, string | null>; // 城の持ち主の上書き（null は国人衆）
  generals?: [GeneralDef, number][]; // この年だけの武将と生年
  moves?: Record<string, [string, string]>; // 武将の所属と所在の上書き [家（''は在野）, 城]
  leaders?: Record<string, string>; // 当主の上書き
  names?: Record<string, [string, string?]>; // 開始時の名と、元服後の名
  ranks?: Record<string, number>; // 開始時の身分の上書き
  guns?: Record<string, number>; // 開始時の鉄砲（指定がなければ1560年の値）
  items?: Record<string, [string | null, string | null]>; // 名物の持ち主の上書き [家, 武将]
  featured?: string[];
  dead?: string[]; // この年にはもう亡い者（名簿にはいるが出さない）
  ranksFresh?: boolean; // 1560年の身分を使わず、ranks と能力から決め直す
  court?: Record<string, number>; // 開始時の官位の上書き
  treaties?: [string, string, number][]; // 開始時の同盟 [家, 家, 月数]
  foes?: [string, string][]; // 仇（主・一門を討たれた家, 討った家）
  castleState?: Record<string, { ember?: number; chian?: number; oldOwner?: string }>; // 開始時の城の残り火・治安
}

export const SCENARIOS: Scenario[] = [
  {
    id: '1560', year: 1560, month: 6, title: '永禄三年 桶狭間の後',
    lede: '永禄三年六月。桶狭間で今川義元が討たれ、東海の均衡が崩れた。',
  },
  {
    id: '1552', year: 1552, month: 4, title: '天文二十一年 信長家督',
    lede: '天文二十一年四月。織田信秀が没し、十八歳の信長が家督を継いだ。美濃では斎藤道三が国を奪い、駿河の今川義元は三河を呑み、西国では陶晴賢が主君を討って大内家を握る。',
    clans: [
      { id: 'oda_iwakura', name: '織田伊勢守', color: '#b0705a', prestige: 35 },
      { id: 'murakami', name: '村上', color: '#5a6a8a', prestige: 40 },
      { id: 'kiso', name: '木曽', color: '#7a8a5a', prestige: 30 },
      { id: 'ouchi', name: '大内', color: '#8a3a8a', prestige: 60 },
    ],
    prestige: { oda: 40, imagawa: 65, takeda: 60, mori: 45, amago: 65, saito: 50, honganji: 70 },
    owners: {
      narumi: 'imagawa', okazaki: 'imagawa', inuyama: 'oda_iwakura',
      kaizu: 'murakami', iiyama: 'murakami', kisofukushima: 'kiso',
      shigisan: null, yagi: null, iimoriyama: 'hatakeyama_k', chosa: null,
      konomine: 'ouchi', katsuyama: 'ouchi', masuda: 'ouchi', kawaradake: 'ouchi',
    },
    generals: [
      [['hirate_masahide', '平手政秀', 'oda', 40, 72, 55, 70, 'kiyosu'], 1492],
      [['oda_nobukatsu', '織田信勝', 'oda', 58, 60, 62, 62, 'kiyosu'], 1536],
      [['oda_nobumitsu', '織田信光', 'oda', 72, 58, 68, 56, 'kiyosu'], 1516],
      [['oda_nobuyasu', '織田信安', 'oda_iwakura', 50, 52, 56, 50, 'inuyama'], 1528],
      [['oda_nobukata', '織田信賢', 'oda_iwakura', 56, 44, 52, 40, 'inuyama'], 1535],
      [['yamauchi_moritoyo', '山内盛豊', 'oda_iwakura', 58, 56, 58, 54, 'inuyama'], 1510],
      [['imagawa_yoshimoto', '今川義元', 'imagawa', 68, 82, 80, 82, 'sunpu'], 1519],
      [['taigen_sessai', '太原雪斎', 'imagawa', 40, 95, 74, 80, 'sunpu'], 1496],
      [['asahina_yasuyoshi', '朝比奈泰能', 'imagawa', 70, 66, 72, 66, 'kakegawa'], 1497],
      [['matsui_munenobu', '松井宗信', 'imagawa', 76, 55, 70, 62, 'hikuma'], 1515],
      [['ii_naomori', '井伊直盛', 'imagawa', 66, 56, 62, 62, 'hikuma'], 1526],
      [['yui_masanobu', '由比正信', 'imagawa', 64, 50, 58, 52, 'sunpu'], 1510],
      [['yamaguchi_noritsugu', '山口教継', 'imagawa', 62, 66, 60, 48, 'narumi'], 1510],
      [['saito_dosan', '斎藤道三', 'saito', 74, 92, 82, 52, 'inabayama'], 1494],
      [['akechi_mitsuyasu', '明智光安', 'saito', 60, 62, 62, 60, 'inabayama'], 1500],
      [['yashiro_masakuni', '屋代政国', 'murakami', 56, 58, 58, 50, 'kaizu'], 1510],
      [['muroga_mitsumasa', '室賀満正', 'murakami', 60, 48, 56, 46, 'kaizu'], 1520],
      [['kiso_yoshiyasu', '木曽義康', 'kiso', 60, 58, 62, 58, 'kisofukushima'], 1514],
      [['yamamura_yoshitoshi', '山村良利', 'kiso', 58, 60, 60, 54, 'kisofukushima'], 1500],
      [['nagao_harukage', '長尾晴景', 'uesugi', 40, 52, 40, 50, 'kasugayama'], 1509],
      [['uesugi_norimasa', '上杉憲政', 'uesugi', 40, 46, 44, 52, 'kasugayama'], 1523],
      [['asakura_soteki', '朝倉宗滴', 'asakura', 80, 86, 90, 80, 'ichijodani'], 1477],
      [['honganji_shonyo', '本願寺証如', 'honganji', 30, 70, 45, 86, 'ishiyama'], 1516],
      [['ouchi_yoshinaga', '大内義長', 'ouchi', 42, 50, 45, 56, 'konomine'], 1532],
      [['sue_harukata', '陶晴賢', 'ouchi', 84, 70, 82, 60, 'konomine'], 1521],
      [['hironaka_takakane', '弘中隆兼', 'ouchi', 70, 66, 70, 62, 'konomine'], 1510],
      [['era_fusahide', '江良房栄', 'ouchi', 66, 68, 66, 54, 'katsuyama'], 1515],
      [['shiji_hiroyoshi', '志道広良', 'mori', 30, 84, 50, 70, 'koriyama'], 1467],
      [['amago_kunihisa', '尼子国久', 'amago', 78, 55, 76, 54, 'gassantoda'], 1492],
      [['amago_masahisa', '尼子誠久', 'amago', 72, 50, 66, 50, 'gassantoda'], 1510],
      [['akamatsu_harumasa', '赤松晴政', 'akamatsu', 50, 55, 56, 50, 'oshio'], 1513],
      [['chosokabe_kunichika', '長宗我部国親', 'chosokabe', 70, 72, 74, 72, 'oko'], 1504],
      [['sagara_haruhiro', '相良晴広', 'sagara', 55, 66, 58, 60, 'hitoyoshi'], 1513],
    ],
    moves: {
      // 松平家は今川の傘下。竹千代は駿府で人質
      tokugawa_ieyasu: ['imagawa', 'sunpu'],
      sakai_tadatsugu: ['imagawa', 'okazaki'], ishikawa_kazumasa: ['imagawa', 'okazaki'], okubo_tadayo: ['imagawa', 'okazaki'],
      torii_mototada: ['imagawa', 'okazaki'], honda_tadazane: ['imagawa', 'okazaki'], okubo_tadasuke: ['imagawa', 'okazaki'],
      hiraiwa_chikayoshi: ['imagawa', 'okazaki'], honda_shigetsugu: ['imagawa', 'okazaki'], koriki_kiyonaga: ['imagawa', 'okazaki'],
      amano_yasukage: ['imagawa', 'okazaki'], ishikawa_ienari: ['imagawa', 'okazaki'], naito_masanari: ['imagawa', 'okazaki'],
      watanabe_moritsuna: ['imagawa', 'okazaki'], honda_tadakatsu: ['imagawa', 'okazaki'], sakakibara_yasumasa: ['imagawa', 'okazaki'],
      honda_masanobu: ['imagawa', 'okazaki'], hattori_masanari: ['imagawa', 'okazaki'], osuga_yasutaka: ['imagawa', 'okazaki'],
      torii_tadayoshi: ['imagawa', 'okazaki'],
      // 尾張
      oda_nobukiyo: ['oda', 'kiyosu'], sakuma_nobumori: ['oda', 'kiyosu'], sakuma_morimasa: ['oda', 'kiyosu'],
      hachiya_yoritaka: ['saito', 'inabayama'],
      kinoshita_tokichiro: ['', 'hikuma'], takigawa_kazumasu: ['', 'kannonji'],
      akechi_mitsuhide: ['saito', 'inabayama'],
      // 信濃
      murakami_yoshikiyo: ['murakami', 'kaizu'], takanashi_masayori: ['murakami', 'iiyama'], takanashi_hidemasa: ['murakami', 'iiyama'], suda_mitsuchika: ['murakami', 'iiyama'], kiso_yoshimasa: ['kiso', 'kisofukushima'],
      // 畿内
      miyoshi_nagayoshi: ['miyoshi', 'koshimizu'], iwanari_tomomichi: ['miyoshi', 'koshimizu'], miyoshi_masayasu: ['miyoshi', 'koshimizu'],
      matsunaga_hisahide: ['miyoshi', 'koshimizu'], matsunaga_hisamichi: ['miyoshi', 'koshimizu'], takayama_tomoteru: ['miyoshi', 'akutagawa'],
      naito_munekatsu: ['miyoshi', 'koshimizu'],
      // 中国・九州
      naito_takaharu: ['ouchi', 'katsuyama'], masuda_fujikane: ['ouchi', 'masuda'],
      fukubara_sadatoshi: ['mori', 'koriyama'], amano_takashige: ['mori', 'koriyama'],
      shimazu_yoshihiro: ['shimazu', 'uchi'], shimazu_tadamasa: ['shimazu', 'uchi'],
    },
    leaders: {
      oda: 'oda_nobunaga', imagawa: 'imagawa_yoshimoto', saito: 'saito_dosan', honganji: 'honganji_shonyo', azai: 'azai_hisamasa',
      akamatsu: 'akamatsu_harumasa', chosokabe: 'chosokabe_kunichika', sagara: 'sagara_haruhiro', murakami: 'murakami_yoshikiyo',
      kiso: 'kiso_yoshiyasu', ouchi: 'ouchi_yoshinaga', oda_iwakura: 'oda_nobuyasu', miyoshi: 'miyoshi_nagayoshi',
    },
    names: {
      takeda_shingen: ['武田晴信'],
      tokugawa_ieyasu: ['松平竹千代', '松平元康'],
      azai_katamasa: ['浅井猿夜叉', '浅井賢政'],
      kinoshita_tokichiro: ['木下藤吉郎'],
    },
    ranks: {
      hirate_masahide: 0, hayashi_hidesada: 0, shibata_katsuie: 0, sakuma_nobumori: 1, niwa_nagahide: 2, ikeda_tsuneoki: 2, mori_yoshinari: 1,
      taigen_sessai: 0, asahina_yasuyoshi: 0, matsui_munenobu: 1, ii_naomori: 1, yamaguchi_noritsugu: 1,
      akechi_mitsuyasu: 0, akechi_mitsuhide: 2, sue_harukata: 0, hironaka_takakane: 0, era_fusahide: 1, asakura_soteki: 0,
      sakai_tadatsugu: 1, ishikawa_ienari: 1, torii_tadayoshi: 1,
    },
    guns: { oda: 200, saika: 300, honganji: 100, miyoshi: 100, shimazu: 200, otomo: 100 },
    items: { samonji: ['imagawa', 'imagawa_yoshimoto'] },
    featured: ['oda', 'imagawa', 'saito', 'takeda', 'uesugi', 'hojo', 'mori', 'ouchi', 'amago', 'miyoshi', 'asakura', 'otomo', 'shimazu', 'chosokabe', 'date', 'honganji'],
  },
  S1582,
];
export const scenarioOf = (id: string | undefined) => SCENARIOS.find((x) => x.id === id) ?? SCENARIOS[0];
