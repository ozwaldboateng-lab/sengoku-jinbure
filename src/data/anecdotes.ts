// 逸話: 人物が生きていて年が合えば起きる（家・役職・勝ち負けは問わない）。どの家の話でも場面で見せる
// 文の中の {id} は、その時の武将の名に置き換える。効果は主役本人の能力だけ（家の兵・金・外交には触れない）
import type { OpeningBeat } from './openings';

export type Stat = 'bra' | 'int' | 'lea' | 'cha';
export interface Anecdote {
  id: string;
  title: string;
  who: string[]; // そろって生きていること（先頭が主役。場面はその居城へ寄せる）
  from: number; to: number; // 起きる年の幅（この間のどこかの月に一度）
  apart?: boolean; // 先頭の二人が別の家にいること
  active?: boolean; // 主役が表に出ていること（出番待ちの人物では起きない）
  beats: OpeningBeat[]; // who を持つ一枚は、その人物のセリフ（名と顔は自動）
  gain: [string, Stat, number][]; // 能力の伸び
  log: string; // 記録に残す一行
}

export const STAT_NAME: Record<Stat, string> = { bra: '武勇', int: '知略', lea: '統率', cha: '魅力' };

export const ANECDOTES: Anecdote[] = [
  // ───── 1552年の頃 ─────
  {
    id: 'shotokuji', title: '正徳寺の会見', who: ['oda_nobunaga', 'saito_dosan'], from: 1553, to: 1554,
    beats: [
      { head: '正徳寺の会見', text: '{saito_dosan}は、娘婿の{oda_nobunaga}を「うつけ」と聞き、尾張との境の寺で会うことにした。道三は町家に潜み、通る行列をこっそりのぞいた。' },
      { text: '現れた信長は、茶筅髷に湯帷子、腰に瓢箪をぶら下げた噂どおりの姿。だが率いる兵は長槍と鉄砲をそろえ、見たこともない軍勢であった。' },
      { text: '寺に着くと、信長は屏風の陰で髪を結い直し、正装に着替えて現れた。' },
      { who: 'saito_dosan', label: '会見の帰り道', text: '無念なことよ。わしの子らは、いずれあのうつけの門前に馬をつなぐことになろう。' },
    ],
    gain: [['oda_nobunaga', 'cha', 2]], log: '{saito_dosan}が{oda_nobunaga}と正徳寺で会い、その器を認めたという。',
  },
  {
    id: 'zori', title: '草履取り', who: ['kinoshita_tokichiro', 'oda_nobunaga'], from: 1554, to: 1558,
    beats: [
      { head: '草履取り', text: '雪の朝。{oda_nobunaga}が草履を履くと、ほのかに温かい。「尻に敷いておったな」と草履取りを叱りつけた。' },
      { who: 'kinoshita_tokichiro', label: '草履取り', text: '滅相もない。寒い朝でございますゆえ、懐に入れて温めておりました。……胸に鼻緒の跡が、ほれ、この通り。' },
      { who: 'oda_nobunaga', label: '', text: '……猿め。面白い奴よ。' },
    ],
    gain: [['kinoshita_tokichiro', 'cha', 2]], log: '{kinoshita_tokichiro}が草履を懐で温め、{oda_nobunaga}の目に留まったという。',
  },
  // ───── 1560年の頃 ─────
  {
    id: 'toshiie', title: '槍の又左、帰参', who: ['maeda_toshiie', 'oda_nobunaga'], from: 1560, to: 1561,
    beats: [
      { head: '槍の又左', text: '{maeda_toshiie}は、かつて{oda_nobunaga}の寵愛する茶坊主・拾阿弥に笄を盗まれ、怒って主君の目の前で斬り捨てた。信長は激怒し、利家は出仕を止められた。' },
      { text: '浪々の身となっても、利家は戦があるたびに勝手に駆けつけ、首を挙げては持ち帰った。それでも許しは出なかった。' },
      { who: 'maeda_toshiie', label: '槍の又左', text: '首などいくつ挙げてもよい。わしが欲しいのは、殿の「又左、ようやった」の一言だけじゃ。' },
      { text: 'やがて美濃との戦いで「頸取足立」と呼ばれた豪の者を討ち取り、利家はついに許された。槍一本で居場所を取り戻した男の話は、家中で長く語られた。' },
    ],
    gain: [['maeda_toshiie', 'bra', 2]], log: '{maeda_toshiie}が勘気を解かれ、槍の働きで帰参を許されたという。',
  },
  {
    id: 'onihimeko', title: '姫若子から鬼若子へ', who: ['chosokabe_motochika'], from: 1560, to: 1561,
    beats: [
      { head: '姫若子', text: '{chosokabe_motochika}は色白でおとなしく、人と話すのも苦手であった。家中の者は陰で「姫若子」と呼び、父も行く末を案じていた。' },
      { text: '二十を過ぎてようやくの初陣。元親は槍の使い方を家臣に尋ねてから出たという。' },
      { who: 'chosokabe_motochika', label: '初陣', text: '槍は敵の目を突け、と聞いた。……それだけ分かれば十分じゃ。続け！' },
      { text: '元親は自ら槍をふるって敵の中へ駆け入り、皆を驚かせた。この日から、呼び名は「鬼若子」に変わった。' },
    ],
    gain: [['chosokabe_motochika', 'bra', 3]], log: '初陣で奮戦した{chosokabe_motochika}が「鬼若子」と呼ばれるようになった。',
  },
  {
    id: 'sanshi', title: '三子教訓状', who: ['mori_motonari', 'mori_takamoto', 'kikkawa_motoharu', 'kobayakawa_takakage'], from: 1560, to: 1563,
    beats: [
      { head: '三子教訓状', text: '{mori_motonari}は、三人の息子、{mori_takamoto}・{kikkawa_motoharu}・{kobayakawa_takakage}に長い書状をしたためた。' },
      { who: 'mori_motonari', label: '父の書状', text: '三人の間に、少しでも隔てる心があってはならぬ。そうなれば三人ともに滅ぶと思え。毛利の名を、決して粗略にするな。' },
      { text: '一本の矢は折れても、三本束ねれば折れぬ……のちに「三本の矢」として語られる話は、この書状から生まれた。' },
      { who: 'kobayakawa_takakage', label: '', text: '父上のお言葉、兄上たちと共に、生涯胸に刻みまする。' },
    ],
    gain: [['mori_takamoto', 'lea', 1], ['kikkawa_motoharu', 'lea', 1], ['kobayakawa_takakage', 'lea', 1]], log: '{mori_motonari}が三人の子に結束を説く書状を送ったという。',
  },
  {
    id: 'shimazu4', title: '島津の四兄弟', who: ['shimazu_tadayoshi', 'shimazu_yoshihisa', 'shimazu_yoshihiro', 'shimazu_toshihisa', 'shimazu_iehisa'], from: 1560, to: 1567,
    beats: [
      { head: '祖父の目', text: '隠居した{shimazu_tadayoshi}は、孫の四兄弟をよく見ていた。あるとき、四人をこう評したという。' },
      { who: 'shimazu_tadayoshi', label: '四兄弟の祖父', text: '義久は三州の総大将たるべき材徳を自ら備え、義弘は雄武英略をもって傑出し、歳久は始終の利害を察する智計並びなく、家久は軍法戦術に妙を得たり。' },
      { text: '四人が力を合わせれば、島津は九州に覇を唱えよう……祖父の言葉は、兄弟それぞれの誇りとなった。' },
    ],
    gain: [['shimazu_yoshihisa', 'cha', 1], ['shimazu_yoshihiro', 'bra', 1], ['shimazu_toshihisa', 'int', 1], ['shimazu_iehisa', 'lea', 1]], log: '{shimazu_tadayoshi}が四人の孫を評した言葉が伝わった。',
  },
  {
    id: 'raikiri', title: '雷切', who: ['bekki_akitsura'], from: 1560, to: 1570,
    beats: [
      { head: '雷切', text: '{bekki_akitsura}には、若い頃の話が伝わる。夏の日、大木の下で涼んでいると、にわかに雷が落ちかかった。' },
      { text: '鑑連はとっさに傍らの刀を抜き、雷を斬った。命は助かったが、足は不自由になった。それ以来、その刀は「雷切」と呼ばれた。' },
      { who: 'bekki_akitsura', label: '', text: '足が利かぬなら、輿に乗って戦えばよい。わしの輿を敵の真ん中へ担ぎ込め。逃げる者は斬るぞ。' },
    ],
    gain: [['bekki_akitsura', 'bra', 2]], log: '{bekki_akitsura}が雷を斬ったという話が、諸国に広まった。',
  },
  {
    id: 'inabayama', title: '十六人の城取り', who: ['takenaka_shigeharu'], from: 1564, to: 1565,
    beats: [
      { head: '十六人の城取り', text: '{takenaka_shigeharu}は、ひ弱な見かけから主家の者たちに侮られ、櫓の上から小便をかけられたことさえあった。' },
      { text: 'ある日、半兵衛は病の弟を見舞うと称して城に入り、わずか十六人で城を乗っ取った。' },
      { who: 'takenaka_shigeharu', label: '', text: '城が欲しかったのではない。主君をお諫めしたかっただけのこと。……城はお返しいたす。' },
      { text: '城を明け渡すよう求める声はいくつもあったが、半兵衛は応じず、しばらくのちに城を返して隠棲した。その名は一気に知れ渡った。' },
    ],
    gain: [['takenaka_shigeharu', 'int', 2], ['takenaka_shigeharu', 'cha', 1]], log: '{takenaka_shigeharu}がわずか十六人で城を乗っ取り、のちに返したという。',
  },
  {
    id: 'shio', title: '敵に塩を送る', who: ['uesugi_kenshin', 'takeda_shingen'], from: 1568, to: 1570, apart: true,
    beats: [
      { head: '塩止め', text: '海のない甲斐・信濃では、塩はすべてよそから入る。{takeda_shingen}と争う国々が塩の道を閉ざし、民は困り果てた。' },
      { text: '長年の宿敵、{uesugi_kenshin}は、この話を聞いた。' },
      { who: 'uesugi_kenshin', label: '', text: 'わしが争うは弓矢をもってであって、米や塩をもってではない。塩は、これまでどおり売ってやれ。値も吊り上げてはならぬ。' },
      { text: '宿敵の振る舞いは諸国に伝わり、のちに「敵に塩を送る」という言葉となって残った。' },
    ],
    gain: [['uesugi_kenshin', 'cha', 3]], log: '{uesugi_kenshin}が、宿敵{takeda_shingen}の国へ塩を送り続けたという。',
  },
  {
    id: 'kokin', title: '古今伝授', who: ['hosokawa_fujitaka'], from: 1570, to: 1575,
    beats: [
      { head: '古今伝授', text: '『古今和歌集』の読み解きは、師から弟子へ口伝えでのみ受け継がれる秘伝であった。' },
      { text: '{hosokawa_fujitaka}は、戦の合間にも歌の道を学び続け、ついに公家の三条西実枝から、その秘伝を授けられた。' },
      { who: 'hosokawa_fujitaka', label: '武人にして歌人', text: '武の家に生まれても、歌の道を絶やしてはならぬ。これを伝える者が絶えれば、都の心も絶えよう。' },
    ],
    gain: [['hosokawa_fujitaka', 'int', 2], ['hosokawa_fujitaka', 'cha', 1]], log: '{hosokawa_fujitaka}が古今伝授を受けたという。',
  },
  {
    id: 'sugitaru', title: '家康に過ぎたるもの', who: ['honda_tadakatsu', 'tokugawa_ieyasu'], from: 1572, to: 1574,
    beats: [
      { head: '殿', text: '劣勢の戦で、退く軍勢の最後尾に残ったのは{honda_tadakatsu}であった。鹿の角の兜に、蜻蛉も触れれば切れるという名槍「蜻蛉切」。' },
      { who: 'honda_tadakatsu', label: '', text: '殿は先に退かれよ。ここはこの平八郎が引き受けた。……さあ、かかってこい！' },
      { text: '忠勝は寄せる敵を何度も押し返し、味方を無事に退かせた。敵の陣には、こんな落書が立ったという。「家康に過ぎたるものが二つあり、唐の頭に本多平八」' },
    ],
    gain: [['honda_tadakatsu', 'bra', 2], ['honda_tadakatsu', 'lea', 1]], log: '殿を務めた{honda_tadakatsu}を、敵までが「家康に過ぎたるもの」と讃えたという。',
  },
  {
    id: 'bonten', title: '梵天丸もかくありたい', who: ['date_masamune', 'katakura_kagetsuna'], from: 1574, to: 1578,
    beats: [
      { head: '梵天丸', text: '幼い{date_masamune}は、疱瘡で右目の光を失った。人前に出るのを嫌い、塞ぎ込むようになった。' },
      { text: '寺で恐ろしい不動明王の像を見たとき、あれは怖い顔をしているが本当は慈悲深い仏だ、と教えられた。' },
      { who: 'date_masamune', label: '梵天丸', text: '……梵天丸も、かくありたい。' },
      { text: '守り役の{katakura_kagetsuna}は、若君を強い主に育てようと心を砕いた。少年は少しずつ、胸を張って人前に出るようになった。' },
    ],
    gain: [['date_masamune', 'cha', 2]], log: '幼い{date_masamune}が、片目を失った悲しみを乗り越えたという。',
  },
  {
    id: 'sankencha', title: '三献茶', who: ['ishida_mitsunari', 'kinoshita_tokichiro'], from: 1574, to: 1577,
    beats: [
      { head: '三献茶', text: '鷹狩りの帰り、喉の渇いた{kinoshita_tokichiro}が寺に立ち寄り、茶を所望した。寺の小僧が、大きな茶碗にぬるい茶をなみなみと出した。' },
      { text: 'もう一杯と頼むと、今度は少し熱い茶を半分ほど。三杯目は、小さな茶碗に熱い茶を少しだけ。' },
      { who: 'kinoshita_tokichiro', label: '', text: 'はじめはぬるく多く、次は熱く少なく……。喉の渇きを見て出し方を変えたか。この小僧、名は何という。' },
      { who: 'ishida_mitsunari', label: '寺の小僧', text: '佐吉と申します。' },
    ],
    gain: [['ishida_mitsunari', 'int', 1], ['ishida_mitsunari', 'cha', 1]], log: '{ishida_mitsunari}の気配りが{kinoshita_tokichiro}の目に留まったという（三献茶）。',
  },
  {
    id: 'naijo', title: '内助の功', who: ['yamauchi_kazutoyo'], from: 1580, to: 1582,
    beats: [
      { head: '名馬', text: '城下に、東国から見事な馬が売りに出された。値は黄金十両。家中の誰もが欲しがったが、手が出なかった。' },
      { text: '貧しい{yamauchi_kazutoyo}もため息をついていると、妻の千代が鏡箱の底から十両を出してきた。嫁ぐとき、夫の一大事に使えと持たされた金であった。' },
      { who: 'yamauchi_kazutoyo', label: '', text: '……これほどの金を、今まで黙って取っておいたのか。千代、そなたには頭が上がらぬ。' },
      { text: '一豊はその馬で馬揃えに出て、主君の目に留まった。「内助の功」として、のちのちまで語られる話である。' },
    ],
    gain: [['yamauchi_kazutoyo', 'cha', 2]], log: '{yamauchi_kazutoyo}が妻の蓄えで名馬を買い、馬揃えで面目を施したという。',
  },
  // ───── 唐入りの頃 ─────
  {
    id: 'tora', title: '虎退治', who: ['kato_kiyomasa'], from: 1593, to: 1595,
    beats: [
      { head: '虎', text: '海の向こうの陣で、夜、虎が出て馬や兵を襲った。{kato_kiyomasa}は自ら槍を取り、山へ入った。' },
      { who: 'kato_kiyomasa', label: '', text: '鉄砲は撃つな。虎ごときに怯えたと言われては、日の本の名折れじゃ。' },
      { text: '清正が片鎌槍で虎を仕留めた、という話はやがて国元にも伝わり、虎退治の清正として語られるようになった。' },
    ],
    gain: [['kato_kiyomasa', 'bra', 2]], log: '{kato_kiyomasa}が陣を荒らす虎を退治したという。',
  },
  // ───── 追加（二段目） ─────
  {
    id: 'makko', title: '抹香を投げつける', who: ['oda_nobunaga'], from: 1552, to: 1553,
    beats: [
      { head: '父の葬儀', text: '{oda_nobunaga}の父の葬儀。僧が居並び、家中の者は皆、礼を尽くして座っていた。' },
      { text: '遅れて現れた信長は、茶筅髷に荒縄の帯、長柄の太刀を差したいつもの姿。仏前に進むと、抹香をわしづかみにして投げつけ、そのまま帰ってしまった。' },
      { text: '「やはり大うつけよ」と家中の者はささやいた。ただ、筑紫から来た旅の僧だけがこう言ったという。「あれこそ国を持つ人よ」' },
      { who: 'oda_nobunaga', label: '', text: '……形ばかりの礼で、死んだ者が帰ってくるか。' },
    ],
    gain: [['oda_nobunaga', 'bra', 1], ['oda_nobunaga', 'cha', 1]], log: '{oda_nobunaga}が父の葬儀で抹香を投げつけたという。',
  },
  {
    id: 'aburauri', title: '油売りから国主へ', who: ['saito_dosan'], from: 1552, to: 1555,
    beats: [
      { head: '油売り', text: '{saito_dosan}には、若い頃に油売りをしていたという話が伝わる。' },
      { text: '漏斗を使わず、油を一文銭の穴に糸のように通して注ぐ。「油がこぼれたら代は要らぬ」。この芸が評判を呼び、油はよく売れた。' },
      { text: 'あるとき客の一人が言った。「その心を武芸に向ければ、ひとかどの武士になれように」。男は油売りをやめ、槍と鉄砲を学んだ。' },
      { who: 'saito_dosan', label: '美濃の蝮', text: '一文銭の穴に油を通すのも、国を盗るのも同じこと。心を一つにすれば、通らぬ穴はない。' },
    ],
    gain: [['saito_dosan', 'int', 2]], log: '{saito_dosan}の油売りの頃の話が語られた。',
  },
  {
    id: 'yuzurijo', title: '国譲り状', who: ['saito_dosan', 'oda_nobunaga'], from: 1555, to: 1556,
    beats: [
      { head: '国譲り状', text: 'わが子との不和が深まるなか、{saito_dosan}は一通の書状をしたためた。宛先は、娘婿の{oda_nobunaga}であった。' },
      { who: 'saito_dosan', label: '書状', text: '美濃の国は、織田上総介に譲り渡す。……わしの子らでは、この国は守れぬ。' },
      { text: '道三が、あの「うつけ」をどれほど高く買っていたか。この書状はのちのちまで語られた。' },
    ],
    gain: [['oda_nobunaga', 'cha', 1], ['oda_nobunaga', 'int', 1]], log: '{saito_dosan}が{oda_nobunaga}に美濃を譲るとの書状を送ったという。',
  },
  {
    id: 'ikkiuchi', title: '川中島の一騎打ち', who: ['uesugi_kenshin', 'takeda_shingen'], from: 1561, to: 1562, apart: true,
    beats: [
      { head: '一騎打ち', text: '霧の晴れた川中島。両軍が入り乱れる乱戦のさなか、白い頭巾の騎馬武者がただ一騎、{takeda_shingen}の本陣へ駆け込んだ。' },
      { text: '床几に座る信玄へ、太刀が三度振り下ろされた。信玄は立つ間もなく、手にした軍配で受け止めた。' },
      { who: 'uesugi_kenshin', label: '', text: '信玄、覚悟！' },
      { text: '騎馬武者は{uesugi_kenshin}その人であった、と伝わる。軍配には刀の傷が八つ残っていたという。' },
    ],
    gain: [['uesugi_kenshin', 'bra', 2], ['takeda_shingen', 'lea', 1]], log: '川中島で{uesugi_kenshin}と{takeda_shingen}が太刀と軍配を交えたという。',
  },
  {
    id: 'shirukake', title: '汁かけ飯', who: ['hojo_ujiyasu', 'hojo_ujimasa'], from: 1560, to: 1565,
    beats: [
      { head: '汁かけ飯', text: '{hojo_ujiyasu}は、息子の{hojo_ujimasa}と食事をともにしていた。氏政は飯に汁をかけ、足りぬと見てもう一度かけた。' },
      { who: 'hojo_ujiyasu', label: '', text: '毎日食べる飯にかける汁の量も量れぬ者が、国や家臣の心を量れようか。……北条も、わしの代で終わりか。' },
      { text: '氏康は箸を置いて嘆いた。氏政はこの日の言葉を、忘れることができなかったという。' },
    ],
    gain: [['hojo_ujimasa', 'int', 1]], log: '{hojo_ujiyasu}が、息子{hojo_ujimasa}の汁かけ飯を嘆いたという。',
  },
  {
    id: 'ujiyasukizu', title: '氏康傷', who: ['hojo_ujiyasu'], from: 1560, to: 1570,
    beats: [
      { head: '向こう傷', text: '{hojo_ujiyasu}は、生涯に三十六度の戦に出たという。その顔と体には、七つの傷があった。' },
      { text: '傷はすべて体の前にあり、背には一つもない。敵に背を見せたことがない証であった。人はこれを「氏康傷」と呼んだ。' },
      { who: 'hojo_ujiyasu', label: '相模の獅子', text: '傷を恥じる者は戦に出ぬがよい。前から受けた傷は、武士の誉れよ。' },
    ],
    gain: [['hojo_ujiyasu', 'cha', 2]], log: '{hojo_ujiyasu}の向こう傷が「氏康傷」と讃えられた。',
  },
  {
    id: 'shichinan', title: '願わくば我に七難八苦を', who: ['yamanaka_yukimori'], from: 1562, to: 1570,
    beats: [
      { head: '三日月', text: '主家の行く末が危うくなるなか、{yamanaka_yukimori}は夜空の三日月に向かって手を合わせた。' },
      { who: 'yamanaka_yukimori', label: '', text: '願わくば、我に七難八苦を与えたまえ。……どれほどの苦難でも受けて立つ。その代わり、主家を立て直す力をくだされ。' },
      { text: '苦しみを自ら願う若武者の話は、忠義の鑑として長く語られた。' },
    ],
    gain: [['yamanaka_yukimori', 'cha', 2], ['yamanaka_yukimori', 'bra', 1]], log: '{yamanaka_yukimori}が三日月に七難八苦を願ったという。',
  },
  {
    id: 'shikome', title: '醜女を娶る', who: ['kikkawa_motoharu', 'kumagai_naozane'], from: 1560, to: 1566,
    beats: [
      { head: '嫁取り', text: '若き日の{kikkawa_motoharu}は、自ら望んで{kumagai_naozane}の娘を妻に迎えた。器量がよくないと噂され、もらい手のなかった娘であった。' },
      { who: 'kikkawa_motoharu', label: '', text: '器量よしならほかにもおる。だが、信直殿は家中に聞こえた勇将。その娘を娶れば、信直殿はわが家のために命を惜しまぬであろう。' },
      { text: '夫婦の仲はむつまじく、元春は生涯ほかに妻を持たなかったという。信直もまた、娘婿のために力を尽くした。' },
    ],
    gain: [['kumagai_naozane', 'lea', 1], ['kikkawa_motoharu', 'cha', 1]], log: '{kikkawa_motoharu}が{kumagai_naozane}の娘を娶った話が語られた。',
  },
  {
    id: 'mikka', title: '三日普請', who: ['kinoshita_tokichiro'], from: 1561, to: 1563,
    beats: [
      { head: '崩れた塀', text: '嵐で城の塀が百間ほど崩れた。二十日たっても直らず、普請の役人はのらりくらりと日を延ばしていた。' },
      { who: 'kinoshita_tokichiro', label: '', text: '敵が攻めてきたらどうなさる。……わしに任せてくだされ。三日で直してご覧に入れる。' },
      { text: '{kinoshita_tokichiro}は人足を十の組に分け、組ごとに受け持ちを決めて、早く終えた組に褒美を出すと約束した。' },
      { text: '組どうしが競って働き、塀は本当に三日で直った。藤吉郎の名は、家中に知れ渡った。' },
    ],
    gain: [['kinoshita_tokichiro', 'int', 1], ['kinoshita_tokichiro', 'lea', 1]], log: '{kinoshita_tokichiro}が崩れた城の塀をわずか三日で直したという。',
  },
  {
    id: 'kurokami', title: '妻の黒髪', who: ['akechi_mitsuhide'], from: 1560, to: 1566,
    beats: [
      { head: '連歌の会', text: '浪々の身で貧しかった{akechi_mitsuhide}が、連歌の会の主を務めることになった。だが、客をもてなす金がない。' },
      { text: '会の当日、膳には酒も肴も見事にそろっていた。妻の煕子が、自慢の黒髪を切って売り、その金でととのえたのであった。' },
      { who: 'akechi_mitsuhide', label: '', text: '……そなたの髪を。この恩は、必ず返す。この光秀、生涯そなたのほかに妻は持たぬ。' },
      { text: '光秀はその言葉どおり、生涯ほかに妻を持たなかったという。' },
    ],
    gain: [['akechi_mitsuhide', 'cha', 2]], log: '{akechi_mitsuhide}の妻が黒髪を売って夫の面目を守ったという。',
  },
  {
    id: 'ryogan', title: 'わが両眼のごとし', who: ['sanada_masayuki', 'takeda_shingen'], from: 1565, to: 1572,
    beats: [
      { head: '若き近習', text: '{takeda_shingen}のそばに、若い近習がいた。真田の三男、{sanada_masayuki}である。' },
      { text: '昌幸は信玄の戦ぶり、政のやり方を、一つも見落とすまいとそばで学び続けた。' },
      { who: 'takeda_shingen', label: '', text: 'あの者らは、わしの両の眼のようなものよ。わしの見えぬところを、代わりに見てくれる。' },
    ],
    gain: [['sanada_masayuki', 'int', 2]], log: '{takeda_shingen}が若き{sanada_masayuki}を「わが両眼のごとし」と評したという。',
  },
  {
    id: 'nigedanjo', title: '逃げ弾正', who: ['kasuga_toratsuna'], from: 1563, to: 1572,
    beats: [
      { head: '逃げ弾正', text: '{kasuga_toratsuna}は、退き際の見極めが誰よりも巧かった。そのため人は「逃げ弾正」と呼んだ。' },
      { text: '笑う者もいたが、虎綱の率いた兵は、いつも大きく減らずに帰ってきた。' },
      { who: 'kasuga_toratsuna', label: '', text: '勝てる戦は誰でも勝つ。負ける戦で兵を残せるかどうかが、大将の器というものだ。' },
    ],
    gain: [['kasuga_toratsuna', 'lea', 2]], log: '{kasuga_toratsuna}の退き際の巧みさから「逃げ弾正」の名が広まった。',
  },
  {
    id: 'komegoroza', title: '米五郎左', who: ['niwa_nagahide'], from: 1565, to: 1580,
    beats: [
      { head: '米五郎左', text: 'ある家中で、こんな歌がはやった。「木綿藤吉、米五郎左、掛かれ柴田に退き佐久間」' },
      { text: '木綿のように丈夫で使い勝手のよい藤吉郎。掛かれば強い柴田、退くのが巧い佐久間。そして{niwa_nagahide}は、米のように毎日なくてはならぬ男だという。' },
      { who: 'niwa_nagahide', label: '', text: '派手な手柄はほかの者に任せる。わしは、皆が明日も飯を食えるようにするだけよ。' },
    ],
    gain: [['niwa_nagahide', 'int', 1], ['niwa_nagahide', 'cha', 1]], log: '{niwa_nagahide}が「米五郎左」と歌われた。',
  },
  {
    id: 'shinkage', title: '新陰流を授く', who: ['kamiizumi_nobutsuna', 'yagyu_munetoshi'], from: 1563, to: 1566,
    beats: [
      { head: '剣聖', text: '諸国を巡る剣の達人、{kamiizumi_nobutsuna}が大和を訪れた。腕に覚えのある{yagyu_munetoshi}は、勝負を挑んだ。' },
      { text: '信綱は割った竹を革で包んだ袋竹刀を手に取った。宗厳は何度打ち込んでも、一度も勝てなかった。' },
      { who: 'yagyu_munetoshi', label: '', text: '……参りました。どうか、それがしを弟子にしてくだされ。' },
      { text: '宗厳は信綱のもとで修行を重ね、新陰流の極意を授けられた。のちに素手で刀を制する「無刀取り」を編み出したという。' },
    ],
    gain: [['yagyu_munetoshi', 'bra', 2], ['kamiizumi_nobutsuna', 'cha', 1]], log: '{kamiizumi_nobutsuna}が{yagyu_munetoshi}に新陰流を授けたという。',
  },
  {
    id: 'kamewari', title: '瓶割り柴田', who: ['shibata_katsuie'], from: 1570, to: 1571,
    beats: [
      { head: '水の手', text: '{shibata_katsuie}の籠もる城が囲まれ、水の手を断たれた。城の中の水は、瓶に残るわずかな分だけになった。' },
      { text: '勝家は兵を集めて残りの水を飲ませると、槍の石突きで瓶を一つ残らず叩き割った。' },
      { who: 'shibata_katsuie', label: '', text: 'もう水はない。生きて水を飲みたければ、打って出て勝つほかない！' },
      { text: '死を覚悟した兵は城から打って出て、囲みを破った。人は勝家を「瓶割り柴田」と呼んだ。' },
    ],
    gain: [['shibata_katsuie', 'bra', 1], ['shibata_katsuie', 'lea', 1]], log: '{shibata_katsuie}が水瓶を割って兵を奮い立たせたという。',
  },
  {
    id: 'komori', title: '鳥なき島の蝙蝠', who: ['chosokabe_motochika', 'oda_nobunaga'], from: 1575, to: 1582, apart: true,
    beats: [
      { head: '蝙蝠', text: '四国で勢いを伸ばす{chosokabe_motochika}の噂を聞いて、{oda_nobunaga}は笑ったという。' },
      { who: 'oda_nobunaga', label: '', text: '元親か。あれは、鳥なき島の蝙蝠よ。' },
      { text: '鳥のいない島では、蝙蝠でも鳥の顔をしていられる……強い者のいない四国だから大きな顔ができるのだ、という意味であった。' },
      { who: 'chosokabe_motochika', label: '', text: '蝙蝠でけっこう。いずれ鳥のなき島から、大きく羽ばたいてみせよう。' },
    ],
    gain: [['chosokabe_motochika', 'lea', 2]], log: '{oda_nobunaga}が{chosokabe_motochika}を「鳥なき島の蝙蝠」と評したという。',
  },
  {
    id: 'sakon', title: '三成に過ぎたるもの', who: ['shima_kiyooki', 'ishida_mitsunari'], from: 1585, to: 1590,
    beats: [
      { head: '左近', text: '主を持たずにいた名将、{shima_kiyooki}（左近）。多くの家が招いたが、左近は首を縦に振らなかった。' },
      { text: '{ishida_mitsunari}は、自らの禄の半分を差し出すと言って左近を口説いたという。' },
      { who: 'shima_kiyooki', label: '', text: '己の禄の半分を出すと申されるか。……そこまで言われて断っては、男がすたる。' },
      { text: 'のちに、こんな歌がはやった。「治部少に過ぎたるものが二つあり、島の左近と佐和山の城」' },
    ],
    gain: [['shima_kiyooki', 'lea', 1], ['ishida_mitsunari', 'cha', 1]], log: '{ishida_mitsunari}が禄の半分を出して{shima_kiyooki}を招いたという。',
  },
  {
    id: 'otanicha', title: '大谷吉継と茶会', who: ['otani_yoshitsugu', 'ishida_mitsunari'], from: 1587, to: 1590,
    beats: [
      { head: '回し飲み', text: '大きな茶会で、一つの茶碗を順に回して飲んでいた。病で顔を布で包んだ{otani_yoshitsugu}が口をつけたとき、膿が一滴、茶に落ちた。' },
      { text: '次の者からは、皆が飲むふりをして茶碗を回した。吉継は、うつむくしかなかった。' },
      { who: 'ishida_mitsunari', label: '', text: '喉が渇いてかなわぬ。残りはすべて、わしがいただく。' },
      { text: '{ishida_mitsunari}は、茶をひと息に飲み干した。吉継はこの日の恩を、生涯忘れなかったという。' },
    ],
    gain: [['ishida_mitsunari', 'cha', 2]], log: '茶会で、{ishida_mitsunari}が{otani_yoshitsugu}の茶を飲み干したという。',
  },
  {
    id: 'mizuburo', title: '水風呂', who: ['maeda_toshimasu', 'maeda_toshiie'], from: 1588, to: 1591,
    beats: [
      { head: '傾奇者', text: '{maeda_toshimasu}（慶次）は、叔父の{maeda_toshiie}から、行いを改めよと何度も意見されていた。' },
      { who: 'maeda_toshimasu', label: '', text: '叔父上、これまでのことを悔い改めまする。どうか茶を一服。寒い日ゆえ、風呂も沸かしておきました。' },
      { text: '喜んだ利家が湯船に入ると、それは氷のような水であった。利家が怒鳴ったときには、慶次は名馬「松風」に乗って去ったあとであった。' },
    ],
    gain: [['maeda_toshimasu', 'cha', 2]], log: '{maeda_toshimasu}が叔父{maeda_toshiie}を水風呂に入れ、去ったという。',
  },
  {
    id: 'koui', title: '紅衣将軍', who: ['gwak_jaeu'], from: 1592, to: 1593, active: true,
    beats: [
      { head: '紅衣将軍', text: '国が侵されたと聞き、学者の{gwak_jaeu}は家の財を投げ出して義兵を集めた。' },
      { text: '紅い衣をまとい、白馬に乗って川辺を駆ける。敵の目を引きつけては、伏せた兵で討った。' },
      { who: 'gwak_jaeu', label: '義兵の大将', text: '天から降りた紅衣の将軍が来たと、敵に思わせよ。恐れは、刀よりもよく効く。' },
      { text: '人々は郭再祐を「天降紅衣将軍」と呼んで讃えた。' },
    ],
    gain: [['gwak_jaeu', 'lea', 2], ['gwak_jaeu', 'bra', 1]], log: '{gwak_jaeu}が紅衣の義兵大将として名を上げたという。',
  },
];
