// 幕府・南蛮とのやり取りの顔見せ（武将の気性ではなく、話し手の立場で言い回しを決める）
// 差し込み: {clan}=こちらの家、{lord}=こちらの当主、{foe}=相手の家・討つ家、{post}=職、{n}=数、{item}=品、{port}=港、{name}=話し手
export type EnvoyScene =
  | 'bkDonate' | 'bkOrderYes' | 'bkOrderNo' | 'bkPostYes' | 'bkPostNo' | 'bkSponsor' | 'bkShussi' | 'bkDemandYes' | 'bkDemandNo'
  | 'misVisit' | 'misAllow' | 'misBan' | 'misHold'
  | 'shipArrive' | 'shipGuns' | 'shipCannon' | 'shipItem'
  | 'courtEdict' | 'courtRank' | 'courtHigh'
  | 'mGuns' | 'mRiceBuy' | 'mRiceSell' | 'mItem' | 'mTea'
  | 'yiRaid' | 'yiRepelled' | 'yiWait' | 'yiAppear' | 'soRefused' | 'mingCome' | 'mingMain' | 'giheiRise';

export const ENVOY_LABEL: Record<EnvoyScene, string> = {
  bkDonate: '献金の返礼', bkOrderYes: '御内書', bkOrderNo: '御内書を退ける', bkPostYes: '任官', bkPostNo: '任官を退ける', bkSponsor: '将軍に立つ',
  bkShussi: '出仕を受ける', bkDemandYes: '出仕に応じる', bkDemandNo: '出仕を拒む',
  misVisit: '布教の願い出', misAllow: '布教の許し', misBan: '禁教', misHold: '返事を待つ',
  shipArrive: '南蛮船の来航', shipGuns: '鉄砲の商い', shipCannon: '大筒の商い', shipItem: '南蛮の品',
  courtEdict: '勅', courtRank: '叙任', courtHigh: '叙任',
  yiRaid: '島陰より', yiRepelled: '退く', yiWait: '待つ', yiAppear: '島陰より', soRefused: '朝鮮の返事', mingCome: '明の援軍', mingMain: '明の本隊', giheiRise: '義兵',
  mGuns: '鉄砲の商い', mRiceBuy: '兵糧の買い付け', mRiceSell: '兵糧の売り', mItem: '名物の商い', mTea: '茶器の商い',
};

// 話すだけの人物の名簿（顔の取り込み用に名簿と同じ形）: [id, 名, '', 生年, 没年]
export const ENVOY_ROSTER: [string, string, string, number, number][] = [
  ['yamashina_tokitsugu', '山科言継', '', 1507, 1579],
  ['kajuji_harumigi', '勧修寺晴右', '', 1523, 1577],
  ['kajuji_haretoyo', '勧修寺晴豊', '', 1544, 1603],
  ['konoe_sakihisa', '近衛前久', '', 1536, 1612],
  ['imai_sokyu', '今井宗久', '', 1520, 1593],
  ['tsuda_sogyu', '津田宗及', '', 1525, 1591],
  ['sen_soeki', '千宗易', '', 1522, 1591],
  ['shimai_soshitsu', '島井宗室', '', 1539, 1615],
  ['chaya_shirojiro', '茶屋四郎次郎', '', 1545, 1596],
  ['capitan', 'カピタン', '', 1500, 1700],
  ['misu', '御簾', '', 1000, 2000],
  ['yi_sunsin', '李舜臣', '', 1545, 1598],
  ['won_gyun', '元均', '', 1540, 1597],
  ['chen_lin', '陳璘', '', 1543, 1607],
  ['so_yoshitoshi', '宗義智', '', 1568, 1615],
];

// 話すだけの人物（武将ではない）。顔は PORTRAITS の同じ id（なければ家紋風の札）
// from/to: 顔見せに出る年（没年・代替わりまで）
export const PERSONAS: Record<string, { name: string; title: string; color: string; from?: number; to?: number }> = {
  yamashina_tokitsugu: { name: '山科言継', title: '公家', color: '#6a5a7a', to: 1579 },
  kajuji_harumigi: { name: '勧修寺晴右', title: '武家伝奏', color: '#3a3a44', to: 1576 },
  kajuji_haretoyo: { name: '勧修寺晴豊', title: '武家伝奏', color: '#3a3a44', from: 1577 },
  konoe_sakihisa: { name: '近衛前久', title: '摂関家', color: '#5a6a4a' },
  imai_sokyu: { name: '今井宗久', title: '堺の納屋衆', color: '#5a4630', to: 1593 },
  tsuda_sogyu: { name: '津田宗及', title: '堺の天王寺屋', color: '#4a4036', to: 1591 },
  sen_soeki: { name: '千宗易', title: '堺の茶人', color: '#2e2a26', to: 1591 },
  shimai_soshitsu: { name: '島井宗室', title: '博多の豪商', color: '#3a4a56', from: 1565 },
  chaya_shirojiro: { name: '茶屋四郎次郎', title: '京の呉服商', color: '#4a3a5a', from: 1570, to: 1596 },
  capitan: { name: '南蛮船のカピタン', title: '南蛮船', color: '#3c4a5c' },
  misu: { name: '御簾の内より', title: '御簾', color: '#6a4a2a' },
  yi_sunsin: { name: '李舜臣', title: '朝鮮水軍', color: '#4f7f9a', to: 1598 },
  won_gyun: { name: '元均', title: '朝鮮水軍', color: '#4f7f9a', to: 1597 },
  chen_lin: { name: '陳璘', title: '明の水軍', color: '#b08a3e' },
  so_yoshitoshi: { name: '宗義智', title: '対馬', color: '#6a5a4a', from: 1580 },
};
export const personaActive = (id: string, year: number) => { const p = PERSONAS[id]; return !!p && year >= (p.from ?? 0) && year <= (p.to ?? 9999); };

export const ENVOY_LINES: Record<EnvoyScene, string[]> = {
  // 取次の幕臣が伝える
  bkDonate: [
    '{clan}殿の御志、公方様は殊のほかお喜びにござる。しかと申し上げておきまする。',
    '近ごろ御所の台所も苦しゅうござれば、まことにありがたき御献上。公方様のお覚えもめでたかろう。',
    'かかる忠節こそ武家の鑑。{clan}家のこと、御前にてよしなにお取りなしいたそう。',
  ],
  // 将軍が自ら
  bkOrderYes: [
    '{foe}の振る舞い、目に余る。{clan}、これを討て。御内書を遣わす。',
    'よかろう。{foe}討伐の儀、公儀として許す。天下の静謐のため励め。',
    '{foe}は公儀を軽んじておる。{clan}の働き、期待しておるぞ。',
  ],
  bkOrderNo: [
    '{foe}もまた公儀に仕える家じゃ。軽々しく討てとは申せぬ。',
    '今はその時ではない。{clan}も、しばし矛を収めよ。',
    '私の争いに公儀の名を貸すわけにはまいらぬ。控えよ。',
  ],
  bkPostYes: [
    '{clan}を{post}に任ずる。公儀の重き職、ゆめゆめ疎かにするでないぞ。',
    'その働き、職に値する。今日より{post}を名乗るがよい。',
    '{post}の任、しかと申し付けた。都の秩序を頼むぞ。',
  ],
  bkPostNo: [
    '{post}は軽々しく与えられる職ではない。いま少し忠節を見せよ。',
    'そなたに{post}は早かろう。重ねての奉公を待つ。',
    '諸家の手前もある。{post}の儀は、見送る。',
  ],
  // 新たに将軍に立った者が
  bkSponsor: [
    '{clan}の後ろ盾あってこそ、この座に就けた。この恩、忘れはせぬ。',
    '将軍家の再興、{clan}の働きによる。頼りにしておるぞ。',
  ],
  // 出仕を受けた職の持ち主の家の当主が
  bkShussi: [
    'よう参られた。{clan}家の出仕、しかと受けた。ともに公儀を支えようぞ。',
    '殊勝な心がけ。今後は我が下知に従われよ。悪いようにはせぬ。',
  ],
  // 出仕を求められた家の当主が
  bkDemandYes: [
    '{clan}殿の威勢には逆らえぬ。出仕いたそう。',
    '公儀の職にある方の求めとあらば、従いましょう。',
  ],
  bkDemandNo: [
    '笑止。{clan}家の下知に従ういわれはない。',
    '職を笠に着て何を申される。お断り申す。',
  ],
  // 宣教師
  misVisit: [
    'デウスの教えを、この国の人々に伝えとうございます。どうか布教のお許しを。',
    '遠く海の向こうから参りました。殿の御領内で、教えを説くことをお許しくださいませ。',
  ],
  misAllow: [
    'まことにありがとうございます。殿の御領に、デウスの恵みがありますように。',
    'このご恩は、南蛮の船にも伝えましょう。殿の湊に、船が多く参るよう祈っております。',
    '寛大なお心に感謝いたします。わたくしどもは、領民を害することはいたしませぬ。',
  ],
  misBan: [
    '……殿のお決めになったこと、従うほかございませぬ。されど、教えは消えませぬ。',
    '悲しいことでございます。いつか、殿のお心が開かれる日を待ちましょう。',
  ],
  misHold: [
    'わかりました。殿のお考えがまとまる日を、お待ちしております。',
    'ゆっくりお考えくださいませ。わたくしどもは急ぎませぬ。',
  ],
  // 南蛮船のカピタン
  shipArrive: [
    'ボン・ディーア！ {port}の湊、よい湊です。鉄砲も、珍しい品も、たくさん積んでまいりました。',
    '天川（マカオ）から参りました。{clan}の殿、よい商いをいたしましょう。',
    '長い船旅でした。南蛮の品、ごらんあれ。殿のお気に召すものがきっとございます。',
  ],
  shipGuns: [
    '鉄砲{n}挺、たしかに。南蛮の筒は、よく当たりますよ。',
    'よいお買い物です。弾と玉薬も、また次の船で。',
    '殿は戦がお上手と聞いております。この鉄砲で、もっと強くなられましょう。',
  ],
  shipCannon: [
    '大筒は重いですが、城の門など、ひとたまりもありません。',
    'この大筒、船から下ろすのに大汗をかきました。大事にお使いください。',
  ],
  shipItem: [
    '「{item}」、南蛮でも珍しい品です。殿はお目が高い。',
    'これはよいものです。「{item}」をお持ちの殿は、この国にそうはおられますまい。',
  ],
  // 御簾の内（帝のお言葉。お姿は描かない）
  courtEdict: [
    '{lord}を{rank}に叙す。いよいよ朝家を重んじ、天下の安寧に努めよ。',
    '{lord}が忠勤、叡聞に達す。よって{rank}に任ず。',
  ],
  // 伝奏の公家
  courtRank: [
    'めでたきことにござる。{lord}殿を{rank}に、との勅でおじゃる。御献上の儀、主上も殊のほか御感あそばされた。',
    '{rank}の宣旨、たしかにお伝え申す。これにて{clan}家の家格も一段と上がりましょうぞ。',
    '近ごろは内裏の修理もままならず、{clan}殿の御志はまことにありがたい。{rank}、おめでとうござる。',
  ],
  // 近衛前久（高い官位）
  courtHigh: [
    '{rank}とはな。{clan}殿、もはや一地方の大名ではない。天下の目がそなたに集まろう。',
    '摂家の一人として申す。{rank}の重み、ゆめゆめ忘れられるな。都はそなたを見ておる。',
  ],
  // 堺・博多・京の商人
  mGuns: [
    '鉄砲{n}挺、たしかに納めまする。玉薬もご入用なら、この宗久にお申し付けを。',
    'よいお買い物で。堺の筒は国友にも負けませぬ。戦が近うござるか。',
    '毎度ありがとう存じまする。{clan}様のご武運、堺から祈っておりますぞ。',
  ],
  mRiceBuy: [
    '兵糧{n}石、蔵からお出ししましょう。相場が上がる前でようございましたな。',
    '戦の前には米が要るもの。荷駄の手配もこちらで整えまする。',
    'まいど。{clan}様のお蔵が満ちれば、手前どもも安心でござる。',
  ],
  mRiceSell: [
    '兵糧{n}石、たしかに買い取りまする。この相場なら悪うはござりませぬ。',
    '米を売られるとは、蔵に余裕がおありで。金はすぐにお届けいたしましょう。',
  ],
  mItem: [
    '「{item}」、目の確かな方の手に渡ってようございました。大事になされませ。',
    'この「{item}」は、茶会に出せば皆が膝を乗り出しましょう。',
    '名物は国ひとつにも替えがたいと申します。「{item}」、よい品でござる。',
  ],
  mTea: [
    '「{item}」……。よい器は、使う人を選びまする。どうぞ、お手元で。',
    '道具は飾るものにあらず。「{item}」で、一服お点てなされませ。',
    '「{item}」をお求めとは。茶の心のわかるお方とお見受けいたす。',
  ],
  // 李舜臣（襲撃）
  yiRaid: [
    '倭の船は重く、島の間を知らぬ。潮の変わる時を待て。……今だ、撃て。',
    '海は我らのものだ。一艘たりとも釜山へは通さぬ。',
    '戦うは今。死を覚悟する者は生き、生を望む者は死ぬ。',
  ],
  yiRepelled: [
    '今日は引く。だが海は広い。また島陰で会おう。',
    '敵の護りが厚い。退け。船を失ってはならぬ。',
  ],
  // 宗義智（使いの返事）
  soRefused: [
    '朝鮮は「道を仮す」ことを拒みました。……戦は避けられませぬ。せめて、この島の者たちが巻き込まれぬよう。',
    '使いは門前払いにございました。朝鮮の王は、明への義を曲げぬと。',
  ],
  mingCome: [
    '倭の小勢など、遼東の騎兵で一蹴してくれよう。朝鮮の王よ、安んじて待たれよ。',
    '天朝の兵が来たからには、倭の者どもも長くはおれまい。',
  ],
  mingMain: [
    '天子の命により、四万の兵と大砲を率いて参った。平壌を取り戻し、倭を海へ追い落とす。',
    '先手の敗れは聞いた。侮るでない。……大砲を前へ。城門を打ち砕け。',
  ],
  giheiRise: ['国を奪われて黙っている民はおらぬ。'],
  yiWait: [
    '倭の船が湊から出てこぬ。よい。出てこぬ限り、陸の倭は飢える。',
    '待つのも戦のうちだ。潮と風が変われば、また来る。',
  ],
  yiAppear: [
    '倭の船団を見つけた。島の陰に隠れよ。……旗を上げるのは、敵が狭い水路に入ってからだ。',
    '敵の荷船は重い。足の速い船で横を突け。将の船だけを狙え。',
  ],
};
