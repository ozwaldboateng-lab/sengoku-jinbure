// 武将の特性（一人に一つまで）。効き目は特性で決まり、能力は少し効くだけ。特性は役目に就けて使う
export type TraitId = 'ninja' | 'kensei' | 'chikujo' | 'hojutsu' | 'chajin' | 'gunshi' | 'suigun' | 'sankan' | 'gaiko' | 'so';
export const TRAIT_NAME: Record<TraitId, string> = { ninja: '忍び', kensei: '剣豪', chikujo: '築城', hojutsu: '砲術', chajin: '茶人', gunshi: '軍師', suigun: '水軍', sankan: '算勘', gaiko: '外交', so: '僧' };
export const TRAIT_NOTE: Record<TraitId, string> = {
  ninja: '忍び頭に就ければ、暗殺・流言・放火・探りができ、敵の調略や忍びを防ぐ。合戦では物見が1回多い。城攻めでは火計が知略によらずよく決まり（7割以上）、石垣を越えて城門を内から開けることがある（戦術画面は一度だけ4割、自動決着は3割）。城方に忍びがいれば、どちらも防がれやすい。',
  kensei: '軍団の傘下にいれば、その軍団の練度が伸びやすく、上限も10上がる。主将の討死・捕縛を半分に防ぐ（主将本人が剣豪でも同じ）。',
  chikujo: '城主に置けば、城門の修理が倍になり、城攻めで門が固い。城の造りを一段改められる（普請）。',
  hojutsu: '軍団の傘下にいれば、その軍団の鉄砲隊が強い（2割増し）。',
  chajin: '茶会で家臣の恩を上げる。家に茶人がいれば、名物を添えた外交がよく効く。',
  gunshi: '軍団にいれば、合戦で本陣の指揮範囲が1広がり、伝令が1回増える。',
  suigun: '唐入りで水軍の将に置けば、渡海の路をよく守り、海戦で腕が上がる。',
  sankan: '奉行に就ければ開発・商業がよく伸びる（奉行の働き×1.3）。兵站奉行なら補給の届く距離+1、運送の減りも少ない。',
  gaiko: '家にいれば（待機・奉行・城主）、同盟・婚姻・降伏勧告の見込み+10%。唐入りの和議の見込みも+10%。',
  so: '城主に置けば、城の残り火が倍の速さで鎮まる。',
};
export const TRAITS: Record<string, TraitId> = {
  // ninja: 百地丹波 加藤段蔵 風魔小太郎 鉢屋弥之三郎 世鬼政時 多羅尾光俊 山中俊好 石川五右衛門 服部正成 城戸弥左衛門 出浦盛清 和田惟政
  momochi_tanba: 'ninja', kato_danzo: 'ninja', fuma_kotaro: 'ninja', hachiya_yanosaburo: 'ninja', seki_masatoki: 'ninja', tarao_mitsutoshi: 'ninja', yamanaka_toshiyoshi: 'ninja', ishikawa_goemon: 'ninja', hattori_masanari: 'ninja', kido_yazaemon: 'ninja', ideura_morikiyo: 'ninja', wada_koremasa: 'ninja',
  // kensei: 塚原卜伝 上泉信綱 疋田景兼 宝蔵院胤栄 伊藤一刀斎 小野忠明 富田勢源 斎藤伝鬼坊 林崎甚助 奥山休賀斎 柳生宗厳 柳生宗矩 宮本武蔵 北畠具教 足利義輝 丸目長恵 東郷重位
  tsukahara_bokuden: 'kensei', kamiizumi_nobutsuna: 'kensei', hikita_kagekane: 'kensei', hozoin_inei: 'kensei', ito_ittosai: 'kensei', ono_tadaaki: 'kensei', toda_seigen: 'kensei', saito_denkibo: 'kensei', hayashizaki_jinsuke: 'kensei', okuyama_kyugasai: 'kensei', yagyu_munetoshi: 'kensei', yagyu_munenori: 'kensei', miyamoto_musashi: 'kensei', kitabatake_tomonori: 'kensei', ashikaga_yoshiteru: 'kensei', marume_nagayoshi: 'kensei', togo_shigekata: 'kensei',
  // chikujo: 藤堂高虎 加藤清正 丹羽長秀 太田資正 松永久秀
  todo_takatora: 'chikujo', kato_kiyomasa: 'chikujo', niwa_nagahide: 'chikujo', ota_sukemasa: 'chikujo', matsunaga_hisahide: 'chikujo',
  // hojutsu: 鈴木重秀 杉谷善住坊 稲富祐直 土橋守重 滝川一益 明智光秀 佐々成政
  suzuki_shigehide: 'hojutsu', sugitani_zenjubo: 'hojutsu', inatomi_sukenao: 'hojutsu', dobashi_morishige: 'hojutsu', takigawa_kazumasu: 'hojutsu', akechi_mitsuhide: 'hojutsu', sassa_narimasa: 'hojutsu',
  // chajin: 細川藤孝 蒲生氏郷 高山右近 荒木村重 細川忠興 金森長近 前田利長
  hosokawa_fujitaka: 'chajin', gamo_ujisato: 'chajin', takayama_ukon: 'chajin', araki_murashige: 'chajin', hosokawa_tadaoki: 'chajin', kanamori_nagachika: 'chajin', maeda_toshinaga: 'chajin',
  // gunshi: 竹中重治 黒田孝高 山本勘助 真田幸隆 真田昌幸 本多正信 片倉景綱 宇佐美定満 島清興 鍋島直茂 吉弘鑑理 山中幸盛 宇喜多直家 毛利元就 戸次鑑連
  takenaka_shigeharu: 'gunshi', kuroda_yoshitaka: 'gunshi', yamamoto_kansuke: 'gunshi', sanada_yukitaka: 'gunshi', sanada_masayuki: 'gunshi', honda_masanobu: 'gunshi', katakura_kagetsuna: 'gunshi', usami_sadamitsu: 'gunshi', shima_kiyooki: 'gunshi', nabeshima_naoshige: 'gunshi', yoshihiro_akimasa: 'gunshi', yamanaka_yukimori: 'gunshi', ukita_naoie: 'gunshi', mori_motonari: 'gunshi', bekki_akitsura: 'gunshi',
  // suigun: 九鬼嘉隆 脇坂安治 加藤嘉明 村上武吉 小早川隆景 村上元吉 来島通康 乃美宗勝 安宅冬康
  kuki_yoshitaka: 'suigun', wakisaka_yasuharu: 'suigun', kato_yoshiaki: 'suigun', murakami_takeyoshi: 'suigun', kobayakawa_takakage: 'suigun', murakami_motoyoshi: 'suigun', kurushima_michiyasu: 'suigun', nomi_munekatsu: 'suigun', ataka_fuyuyasu: 'suigun',
  // sankan: 石田三成 長束正家 増田長盛 村井貞勝 浅野長政 片桐且元 木下秀長 堀秀政 大谷吉継
  ishida_mitsunari: 'sankan', natsuka_masaie: 'sankan', mashita_nagamori: 'sankan', murai_sadakatsu: 'sankan', asano_nagamasa: 'sankan', katagiri_katsumoto: 'sankan', kinoshita_hidenaga: 'sankan', hori_hidemasa: 'sankan', otani_yoshitsugu: 'sankan',
  // gaiko: 安国寺恵瓊 石川数正 一色藤長 朝比奈泰朝 小西行長 蜂須賀正勝 口羽通良 三淵藤英 進藤賢盛
  ankokuji_ekei: 'gaiko', ishikawa_kazumasa: 'gaiko', isshiki_fujinaga: 'gaiko', asahina_yasutomo: 'gaiko', konishi_yukinaga: 'gaiko', hachisuka_masakatsu: 'gaiko', kuchiba_michiyoshi: 'gaiko', mitsubuchi_fujihide: 'gaiko', shindo_katamori: 'gaiko',
  // so: 本願寺顕如 下間頼廉 下間頼照
  honganji_kennyo: 'so', shimotsuma_rairen: 'so', shimotsuma_raisho: 'so',
};
