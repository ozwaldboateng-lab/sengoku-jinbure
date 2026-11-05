// 逸話: 人物が生きていて年が合えば起きる（家・役職・勝ち負けは問わない）。どの家の話でも場面で見せる
// 文の中の {id} は、その時の武将の名に置き換える。効果は主役本人の能力だけ（家の兵・金・外交には触れない）
// 本文は二つのファイルに分けている（ここに1550〜60年代、anecdotes2.ts に1560年代後半から唐入りまで）
import type { OpeningBeat } from './openings';
import { ANECDOTES_B } from './anecdotes2';

export type Stat = 'bra' | 'int' | 'lea' | 'cha';
export interface Anecdote {
  id: string;
  title: string;
  who: string[]; // そろって生きていること（先頭が主役。場面はその居城へ寄せる）
  from: number; to: number; // 起きる年の幅（この間のどこかの月に一度）
  apart?: boolean; // 先頭の二人が別の家にいること
  bg?: string; // 背景の絵（SCENE_ART のキー）。一枚ごとの bg がなければこれ
  active?: boolean; // 主役が表に出ていること（出番待ちの人物では起きない）
  beats: OpeningBeat[]; // who を持つ一枚は、その人物のセリフ（名と顔は自動）
  gain: [string, Stat, number][]; // 能力の伸び
  log: string; // 記録に残す一行
}

export const STAT_NAME: Record<Stat, string> = { bra: '武勇', int: '知略', lea: '統率', cha: '魅力' };

const ANECDOTES_A: Anecdote[] = [
  // ───── 1550年代 ─────
  {
    id: 'makko', title: '抹香を投げつける', bg: 'hondo', who: ['oda_nobunaga'], from: 1552, to: 1553,
    beats: [
      { head: '父の葬儀', text: '尾張の「虎」と呼ばれた{oda_nobunaga}の父が、病で世を去った。菩提寺には国中の僧が三百人も集まり、盛大な葬儀が営まれた。' },
      { text: '家臣たちは折り目正しい肩衣と袴で居並んだ。弟は礼にかなった装いで、静かに焼香を済ませた。人々の目は、まだ姿を見せない嫡男へ向いていた。' },
      { text: 'やがて現れた信長は、茶筅に結った髪、袴もはかず、長柄の太刀と脇差を荒縄で腰に巻きつけた、いつもの姿であった。' },
      { text: '信長は仏前に進むと、抹香を鷲づかみにして、位牌へ投げつけた。そして一言もなく、そのまま寺を出て行った。' },
      { text: '「やはり大うつけよ」「これで織田の家も終わりか」。家臣たちはささやき合った。弟の方がよほど跡継ぎにふさわしい、と口にする者もいた。' },
      { text: 'ただ、筑紫から来ていた旅の僧だけが、こう言ったという。「あれこそ、国を持つ人よ」' },
      { who: 'oda_nobunaga', label: '', text: '……形ばかりの礼で、死んだ者が帰ってくるか。父上が遺したものを守るのは、香ではない。このわしよ。' },
    ],
    gain: [['oda_nobunaga', 'bra', 1], ['oda_nobunaga', 'cha', 1]], log: '{oda_nobunaga}が父の葬儀で抹香を投げつけたという。',
  },
  {
    id: 'aburauri', title: '油売りから国主へ', bg: 'ichi', who: ['saito_dosan'], from: 1552, to: 1555,
    beats: [
      { head: '油売り', text: '美濃を手にした{saito_dosan}には、若い頃の話が伝わる。もとは京の寺の小僧で、やがて寺を出て、油を売り歩く商人になったという。' },
      { text: '男の売り方は変わっていた。漏斗を使わず、高く掲げた柄杓から、油を一文銭の穴に糸のように通して客の器へ注ぐのである。' },
      { who: 'saito_dosan', label: '油売り', text: 'さあさあ、ご覧あれ。この油、一滴でも銭にかかったら、お代は頂きませぬ。' },
      { text: '油は一滴も銭にかからない。人だかりができ、油は飛ぶように売れた。' },
      { text: 'あるとき、それを見ていた武士が言った。「見事な芸だ。だが、その心を武芸に向ければ、ひとかどの武士になれように。惜しいことよ」' },
      { text: '男はその日から油売りをやめ、槍と鉄砲を学んだ。やがて美濃の守護の家に仕え、知恵と謀でのし上がり、ついに主家を追って国を奪った。人は「美濃の蝮」と呼んだ。' },
      { who: 'saito_dosan', label: '美濃の蝮', text: '一文銭の穴に油を通すのも、国を盗るのも同じこと。心を一つに定めれば、通らぬ穴などない。' },
    ],
    gain: [['saito_dosan', 'int', 2]], log: '{saito_dosan}の油売りの頃の話が語られた。',
  },
  {
    id: 'shotokuji', title: '正徳寺の会見', bg: 'hondo', who: ['oda_nobunaga', 'saito_dosan'], from: 1553, to: 1554,
    beats: [
      { head: '娘婿の噂', text: '{saito_dosan}は、娘を嫁がせた{oda_nobunaga}が「大うつけ」だと聞かされていた。本当にうつけなら、尾張ごと呑み込んでしまえばよい。' },
      { text: '道三は、尾張との境にある正徳寺で娘婿と会うことにした。そして当日、寺へ向かう道筋の町家に潜み、通る行列をこっそりのぞいた。' },
      { text: '現れた信長は、噂どおりの姿だった。髪は茶筅、湯帷子の袖を外し、腰には火打ち袋や瓢箪をぶら下げ、馬の上で柿をかじっている。' },
      { text: 'だが、従う軍勢は違った。三間半の長い槍が五百本、弓と鉄砲が五百挺。整然と進むその列は、道三が見たこともない軍勢であった。' },
      { text: '寺に着くと、信長は屏風の陰に入り、髪を結い直し、見事な長袴に着替えて現れた。家臣たちは息をのんだ。うつけの姿は、わざとであったのか。' },
      { text: '対面の席で、信長は道三に臆するところなく、堂々と振る舞った。道三は苦い顔で湯漬けをすすり、早々に席を立った。' },
      { who: 'saito_dosan', label: '会見の帰り道', text: '無念なことよ。わしの子らは、いずれあのうつけの門前に、馬をつなぐことになろう。' },
      { text: 'この日から、道三が家中で信長を悪く言うことはなかったという。' },
    ],
    gain: [['oda_nobunaga', 'cha', 2]], log: '{saito_dosan}が{oda_nobunaga}と正徳寺で会い、その器を認めたという。',
  },
  {
    id: 'zori', title: '草履取り', bg: 'zashiki_day', who: ['kinoshita_tokichiro', 'oda_nobunaga'], from: 1554, to: 1558,
    beats: [
      { head: '草履取り', text: '尾張の農家に生まれた{kinoshita_tokichiro}は、針を売り歩き、あちこちの家に仕えては去り、ようやく{oda_nobunaga}の草履取りになった。' },
      { text: '小柄で猿に似た顔の男は、誰よりも早く起き、誰よりも遅く寝た。主人が何を求めるかを、言われる前に察して動いた。' },
      { text: '雪の降った朝。信長が庭に出ようと草履に足を入れると、ほのかに温かい。' },
      { who: 'oda_nobunaga', label: '', text: 'おのれ、わしの草履を尻に敷いて座っておったな！' },
      { who: 'kinoshita_tokichiro', label: '草履取り', text: '滅相もございませぬ。寒い朝でございますゆえ、懐に入れて温めておりました。……疑われるなら、ほれ、この胸を。' },
      { text: '藤吉郎がはだけた胸には、くっきりと鼻緒の跡がついていた。' },
      { who: 'oda_nobunaga', label: '', text: '……猿め。面白い奴よ。台所の仕事もやってみよ。' },
      { text: '藤吉郎はその後、台所の薪や炭の無駄を減らし、仕事を任されるたびに手柄を立てた。草履一つから始まった出世の話は、のちのちまで語られた。' },
    ],
    gain: [['kinoshita_tokichiro', 'cha', 2]], log: '{kinoshita_tokichiro}が草履を懐で温め、{oda_nobunaga}の目に留まったという。',
  },
  {
    id: 'yuzurijo', title: '国譲り状', bg: 'zashiki_night', who: ['saito_dosan', 'oda_nobunaga'], from: 1555, to: 1556,
    beats: [
      { head: '父と子', text: '{saito_dosan}は、家督を譲った息子と不和になっていた。息子は道三を父と認めず、家中は二つに割れ、道三の側につく者は日に日に減っていった。' },
      { text: '道三はある夜、灯明の下で筆をとった。宛先は、尾張の娘婿、{oda_nobunaga}である。' },
      { who: 'saito_dosan', label: '書状', text: '美濃の国は、織田上総介に譲り渡す。その証として、この書状をしたためる。……わしの子らでは、この国は守れぬ。' },
      { text: '書状には、まだ幼い末の子に「京の寺に入り、出家せよ」とも書き添えられていた。己の行く末を悟ったかのような文面であった。' },
      { who: 'saito_dosan', label: '', text: '国を盗った者が、最後に国を誰かに託すことになるとはな。……あのうつけなら、この国を無駄にはすまい。' },
      { text: '一代で国を奪った蝮が、どれほどあの「うつけ」を高く買っていたか。この書状は、のちのちまで語られた。' },
    ],
    gain: [['oda_nobunaga', 'cha', 1], ['oda_nobunaga', 'int', 1]], log: '{saito_dosan}が{oda_nobunaga}に美濃を譲るとの書状を送ったという。',
  },
  // ───── 1560年代のはじめ ─────
  {
    id: 'toshiie', title: '槍の又左、帰参', bg: 'amemichi', who: ['maeda_toshiie', 'oda_nobunaga'], from: 1560, to: 1561,
    beats: [
      { head: '槍の又左', text: '{maeda_toshiie}は、背丈六尺の大男。派手な身なりで長い槍を振り回すことから「槍の又左」と呼ばれ、{oda_nobunaga}に若い頃から仕えていた。' },
      { text: 'ある日、信長のお気に入りの茶坊主・拾阿弥が、利家の刀の笄を盗んだ。利家は怒ったが、信長は取り合わなかった。拾阿弥はそれからも利家をあざけり続けた。' },
      { text: '堪忍の緒が切れた利家は、信長の目の前で拾阿弥を斬り捨てた。信長は激怒し、手討ちにしようとした。柴田勝家らの取りなしで命だけは助かったが、出仕は止められた。' },
      { text: '主を失った利家は、浪人となった。妻と幼い子を抱え、暮らしは苦しかった。それでも、利家は戦があるたびに勝手に駆けつけた。' },
      { text: '大きな戦で敵の首を三つ挙げ、信長の前へ持参した。だが、許しは出なかった。' },
      { who: 'maeda_toshiie', label: '浪人', text: '首などいくつ挙げてもよい。わしが欲しいのは、殿の「又左、ようやった」の一言だけじゃ。' },
      { text: '翌年、美濃との戦いで、利家は「頸取足立」と恐れられた豪の者を一騎討ちで討ち取った。' },
      { who: 'oda_nobunaga', label: '', text: '……又左。もうよい。戻ってまいれ。' },
      { text: '槍一本で居場所を取り戻した男の話は、家中で長く語られた。利家はこの浪人の日々に、人の情けと冷たさを知ったという。' },
    ],
    gain: [['maeda_toshiie', 'bra', 2]], log: '{maeda_toshiie}が勘気を解かれ、槍の働きで帰参を許されたという。',
  },
  {
    id: 'onihimeko', title: '姫若子から鬼若子へ', bg: 'senjo', who: ['chosokabe_motochika'], from: 1560, to: 1561,
    beats: [
      { head: '姫若子', text: '土佐の{chosokabe_motochika}は、色白で背が高く、おとなしい若者だった。人と話すのが苦手で、いつも一人で静かにしていた。' },
      { text: '家中の者は陰で「姫若子」と呼んだ。二十を過ぎても初陣を済ませていないことに、父も行く末を案じていた。' },
      { text: 'ようやく迎えた初陣の朝。元親は家臣の一人に、真顔で尋ねた。' },
      { who: 'chosokabe_motochika', label: '初陣', text: '槍とは、どう使えばよいのだ。' },
      { text: '家臣は呆れながらも答えた。「敵の目を突くのです。それから、大将は先に駆けず、後にも退かぬもの」。元親は深くうなずいた。' },
      { who: 'chosokabe_motochika', label: '', text: '敵の目を突け、か。……それだけ分かれば十分じゃ。者ども、続け！' },
      { text: '元親は自ら槍をふるって敵の中へ駆け入り、何人もの兵を突き伏せた。昨日までの姫若子の姿は、どこにもなかった。' },
      { text: 'この日から、呼び名は「鬼若子」に変わった。おとなしく見えたのは、物事をじっくり見極める性分ゆえであったと、人々はようやく気づいた。' },
    ],
    gain: [['chosokabe_motochika', 'bra', 3]], log: '初陣で奮戦した{chosokabe_motochika}が「鬼若子」と呼ばれるようになった。',
  },
  {
    id: 'sanshi', title: '三子教訓状', bg: 'zashiki_day', who: ['mori_motonari', 'mori_takamoto', 'kikkawa_motoharu', 'kobayakawa_takakage'], from: 1560, to: 1563,
    beats: [
      { head: '三子教訓状', text: '安芸の小さな国人から身を起こした{mori_motonari}は、知略を尽くして中国の大大名にのし上がった。だが元就は、その道のりで多くの血を流したことを知っていた。' },
      { text: '元就は、三人の息子に宛てて長い書状をしたためた。家督を継いだ{mori_takamoto}、吉川家を継いだ{kikkawa_motoharu}、小早川家を継いだ{kobayakawa_takakage}である。' },
      { who: 'mori_motonari', label: '父の書状', text: '毛利の名を、末代まで決して粗略にするな。元春と隆景は他家を継いだが、それは毛利のためであることを忘れてはならぬ。' },
      { who: 'mori_motonari', label: '父の書状', text: '三人の間に、少しでも隔てる心があってはならぬ。そうなれば、三人ともに滅ぶと思え。' },
      { text: '書状は十四か条に及んだ。わしは多くの人を殺めてきた、その報いがいつか来るかもしれぬ、という父の告白まで書かれていた。' },
      { text: '一本の矢はたやすく折れても、三本束ねれば折れぬ……のちに「三本の矢」として語られる話は、この書状から生まれたといわれる。' },
      { who: 'kobayakawa_takakage', label: '', text: '父上のお言葉、兄上たちと共に、生涯胸に刻みまする。毛利の家は、われら三人で守ってみせます。' },
    ],
    gain: [['mori_takamoto', 'lea', 1], ['kikkawa_motoharu', 'lea', 1], ['kobayakawa_takakage', 'lea', 1]], log: '{mori_motonari}が三人の子に結束を説く書状を送ったという。',
  },
  {
    id: 'shimazu4', title: '島津の四兄弟', bg: 'zashiki_day', who: ['shimazu_tadayoshi', 'shimazu_yoshihisa', 'shimazu_yoshihiro', 'shimazu_toshihisa', 'shimazu_iehisa'], from: 1560, to: 1567,
    beats: [
      { head: '日新斎', text: '薩摩の{shimazu_tadayoshi}は、隠居して日新斎と号した。島津の家を立て直した名将で、武士の心得を四十七首の歌にまとめた「いろは歌」でも知られる。' },
      { text: '日新斎は、孫の四兄弟を手元に置いて、自ら教え育てた。四人はそれぞれに性格が違い、祖父はそれをよく見ていた。' },
      { text: 'あるとき、日新斎は四人をこう評したという。' },
      { who: 'shimazu_tadayoshi', label: '四兄弟の祖父', text: '義久は、三州の総大将たるべき材徳を自ら備えておる。義弘は、雄武英略をもって傑出しておる。' },
      { who: 'shimazu_tadayoshi', label: '四兄弟の祖父', text: '歳久は、始終の利害を察する智計並びなし。家久は、軍法戦術に妙を得たり。' },
      { text: '長兄は人をまとめる器、次兄は武勇、三男は知恵、末弟は戦の巧さ。四人が力を合わせれば、島津は九州に覇を唱えよう……。' },
      { who: 'shimazu_yoshihiro', label: '', text: 'お祖父様の言葉に恥じぬよう、兄上をお支えし、弟たちと共に戦いまする。' },
      { text: '祖父の言葉は、兄弟それぞれの誇りとなった。' },
    ],
    gain: [['shimazu_yoshihisa', 'cha', 1], ['shimazu_yoshihiro', 'bra', 1], ['shimazu_toshihisa', 'int', 1], ['shimazu_iehisa', 'lea', 1]], log: '{shimazu_tadayoshi}が四人の孫を評した言葉が伝わった。',
  },
  {
    id: 'raikiri', title: '雷切', bg: 'senjo', who: ['bekki_akitsura'], from: 1560, to: 1570,
    beats: [
      { head: '雷切', text: '豊後の{bekki_akitsura}には、若い頃の不思議な話が伝わる。' },
      { text: '夏の暑い日、鑑連は大きな木の下で涼んでいた。にわかに空が暗くなり、激しい夕立が来た。その時、雷が木へ落ちかかった。' },
      { text: '鑑連はとっさに枕元の刀「千鳥」を抜き、雷を斬った。命は助かったが、足は不自由になり、二度と自分の足で駆けることはできなくなった。' },
      { text: 'それ以来、その刀は「雷切」と呼ばれた。そして鑑連自身も、いつしか「雷神」と呼ばれるようになった。' },
      { text: '足が利かなくなっても、鑑連は戦をやめなかった。輿に乗り、三尺の刀を手に、戦場へ出たのである。' },
      { who: 'bekki_akitsura', label: '', text: '足が利かぬなら、輿で戦えばよい。わしの輿を、敵の真ん中へ担ぎ込め。逃げる者は、わしが斬るぞ。' },
      { text: '輿を担ぐ者たちは、掛け声を上げて敵中へ突き進んだ。大将が最前に出るのを見て、兵は奮い立った。生涯に三十七度戦い、一度も負けなかったともいう。' },
    ],
    gain: [['bekki_akitsura', 'bra', 2]], log: '{bekki_akitsura}が雷を斬ったという話が、諸国に広まった。',
  },
  {
    id: 'ikkiuchi', title: '川中島の一騎打ち', bg: 'senjo', who: ['uesugi_kenshin', 'takeda_shingen'], apart: true, from: 1561, to: 1562,
    beats: [
      { head: '霧の川中島', text: '信濃の川中島で、{uesugi_kenshin}と{takeda_shingen}は幾度も向かい合ってきた。この年の秋、両軍はかつてない大軍で対陣した。' },
      { text: '武田方は、夜のうちに別動隊を山へ回し、上杉の陣を背後から突く策を立てた。啄木鳥が木をつついて虫を追い出すように、上杉を山から追い落とすのである。' },
      { text: 'だが{uesugi_kenshin}は、武田の陣の炊煙がいつもより多いことに気づいた。そして夜のうちに、音もなく山を下りた。' },
      { text: '夜が明け、霧が晴れたとき、武田の本陣の目の前に、上杉の大軍がいた。乱戦が始まった。' },
      { text: 'そのさなか、白い頭巾で頭を包んだ騎馬武者がただ一騎、武田の本陣へ駆け込んできた。床几に座る信玄へ、太刀が振り下ろされた。' },
      { who: 'uesugi_kenshin', label: '', text: '信玄、覚悟！' },
      { text: '信玄は立つ間もなく、手にした軍配で太刀を受け止めた。二太刀、三太刀。近習が槍で馬を突き、騎馬武者は走り去った。' },
      { who: 'takeda_shingen', label: '', text: '……今のは、{uesugi_kenshin}その人であったか。あれほどの大将が、ただ一騎で斬り込んでくるとはな。' },
      { text: '軍配には、刀の傷が八つ残っていたという。宿敵同士の一騎打ちは、戦国の語り草となった。' },
    ],
    gain: [['uesugi_kenshin', 'bra', 2], ['takeda_shingen', 'lea', 1]], log: '川中島で{uesugi_kenshin}と{takeda_shingen}が太刀と軍配を交えたという。',
  },
  {
    id: 'shirukake', title: '汁かけ飯', bg: 'zashiki_day', who: ['hojo_ujiyasu', 'hojo_ujimasa'], from: 1560, to: 1565,
    beats: [
      { head: '親子の膳', text: '相模の{hojo_ujiyasu}は、息子の{hojo_ujimasa}と膳を共にしていた。北条の家は、祖父の代から関東に根を張り、民に慕われる家となっていた。' },
      { text: '氏政は飯に汁をかけた。食べ進めるうち、汁が足りぬと見て、もう一度かけた。' },
      { text: '氏康は、箸を止めて息子を見つめた。' },
      { who: 'hojo_ujiyasu', label: '', text: '毎日食べる飯じゃ。どれほどの汁をかければよいか、一度で量れぬか。' },
      { who: 'hojo_ujiyasu', label: '', text: '飯にかける汁の量も量れぬ者が、国や家臣の心を量れようか。……北条も、わしの代で終わりか。' },
      { text: '氏政は何も言えず、うつむいた。氏康は箸を置き、静かに席を立った。' },
      { text: '本当にあった話かどうかは分からない。だが、偉大な父を持った子の重さを物語る話として、長く語られた。氏政はこの日の言葉を、生涯忘れなかったという。' },
    ],
    gain: [['hojo_ujimasa', 'int', 1]], log: '{hojo_ujiyasu}が、息子{hojo_ujimasa}の汁かけ飯を嘆いたという。',
  },
  {
    id: 'ujiyasukizu', title: '氏康傷', bg: 'jinmaku', who: ['hojo_ujiyasu'], from: 1560, to: 1570,
    beats: [
      { head: '向こう傷', text: '{hojo_ujiyasu}は、若い頃は体が弱く、刀を見ただけで気を失ったという。家臣たちは、跡継ぎとして大丈夫かと案じた。' },
      { text: 'だが、その若者は変わった。自ら恥じて武芸に励み、戦場では誰よりも前に出るようになった。' },
      { text: 'かつて、八万の大軍に城を囲まれたとき。氏康はわずか八千の兵で夜討ちをかけ、敵を打ち破った。関東の勢いはこの一戦で変わった。' },
      { text: '生涯に出た戦は三十六度。その顔と体には、七つの傷があった。' },
      { text: '傷はすべて体の前にあり、背中には一つもない。敵に背を見せたことがない証であった。人はこの向こう傷を「氏康傷」と呼び、誉れとした。' },
      { who: 'hojo_ujiyasu', label: '相模の獅子', text: '傷を恥じる者は、戦に出ぬがよい。前から受けた傷は、武士の誉れよ。……逃げて背に受けた傷こそ、一生の恥じゃ。' },
      { text: '家中の若者たちは、顔に傷を負うと、かえって胸を張ったという。' },
    ],
    gain: [['hojo_ujiyasu', 'cha', 2]], log: '{hojo_ujiyasu}の向こう傷が「氏康傷」と讃えられた。',
  },
  {
    id: 'shikome', title: '醜女を娶る', bg: 'zashiki_day', who: ['kikkawa_motoharu', 'kumagai_naozane'], from: 1560, to: 1566,
    beats: [
      { head: '嫁取り', text: '若き日の{kikkawa_motoharu}が、妻を迎える年頃になったときのこと。元春は自ら、ある娘を妻にしたいと言い出した。' },
      { text: '相手は、家中に聞こえた勇将{kumagai_naozane}の娘。器量がよくないと噂され、もらい手のなかった娘であった。周りの者は驚いて、思いとどまらせようとした。' },
      { who: 'kikkawa_motoharu', label: '', text: '器量よしなら、ほかにいくらでもおる。だが、信直殿は家中随一の勇将よ。' },
      { who: 'kikkawa_motoharu', label: '', text: 'もらい手のない娘をわしが娶れば、信直殿は喜び、わが家のために命を惜しまず働いてくれよう。これほどの縁はない。' },
      { text: '信直は、この話を聞いて涙を流して喜んだという。' },
      { who: 'kumagai_naozane', label: '', text: '……娘を、そのように望んでくださるとは。この信直、生涯をかけて、ご恩に報いまする。' },
      { text: '夫婦の仲はむつまじく、四人の子に恵まれた。元春は生涯、ほかに妻を持たなかったという。信直もまた、娘婿のために幾度も命がけで戦った。' },
    ],
    gain: [['kumagai_naozane', 'lea', 1], ['kikkawa_motoharu', 'cha', 1]], log: '{kikkawa_motoharu}が{kumagai_naozane}の娘を娶った話が語られた。',
  },
  {
    id: 'kurokami', title: '妻の黒髪', bg: 'zashiki_night', who: ['akechi_mitsuhide'], from: 1560, to: 1566,
    beats: [
      { head: '許嫁', text: '若い頃の{akechi_mitsuhide}には、許嫁がいた。煕子という。ところが嫁入りの前に、煕子は疱瘡にかかり、顔に痕が残ってしまった。' },
      { text: '煕子の父は、代わりに妹を嫁がせようとした。だが光秀は首を振った。' },
      { who: 'akechi_mitsuhide', label: '', text: '顔に痕があろうと、わたしが妻にと望んだのは煕子殿です。ほかの方を迎えるつもりはありませぬ。' },
      { text: 'やがて光秀は国を追われ、浪人となった。暮らしは貧しく、寺の門前で子どもに読み書きを教えて食いつないだ。' },
      { text: 'そんなある日、光秀は連歌の会の主を務めることになった。名を上げるまたとない機会だが、客をもてなす金がない。' },
      { text: '会の当日、膳には酒も肴も見事にそろっていた。煕子が、自慢の黒髪を切って売り、その金でととのえたのであった。' },
      { who: 'akechi_mitsuhide', label: '', text: '……そなたの髪を。この恩は、必ず返す。この光秀、生涯そなたのほかに妻は持たぬ。' },
      { text: '光秀はその言葉どおり、生涯ほかに妻を持たなかったという。のちの世の俳人も、この夫婦の話を句に詠んでいる。' },
    ],
    gain: [['akechi_mitsuhide', 'cha', 2]], log: '{akechi_mitsuhide}の妻が黒髪を売って夫の面目を守ったという。',
  },
  {
    id: 'mikka', title: '三日普請', bg: 'ishigaki', who: ['kinoshita_tokichiro'], from: 1561, to: 1563,
    beats: [
      { head: '崩れた塀', text: '嵐で、城の塀が百間ほど崩れた。すぐに普請が始まったが、二十日たっても直らない。普請の役人は、のらりくらりと日を延ばしていた。' },
      { text: 'それを見ていた{kinoshita_tokichiro}は、聞こえよがしに言った。' },
      { who: 'kinoshita_tokichiro', label: '', text: '今、敵が攻めてきたらどうなさる。……わしに任せてくだされば、三日で直してご覧に入れる。' },
      { text: '大言壮語と笑う者もいたが、普請は藤吉郎に任された。' },
      { text: '藤吉郎はまず、人足たちに酒と飯をたっぷり振る舞った。それから百間の塀を十に分け、十の組に受け持ちを割り振った。' },
      { who: 'kinoshita_tokichiro', label: '普請奉行', text: '一番早く仕上げた組には、褒美をはずむぞ！　遅れた組は、皆の笑いものじゃ。' },
      { text: '組どうしが競い合い、人足たちは夜も休まず働いた。塀は本当に、三日で元どおりになった。' },
      { text: '人を叱って動かすのではなく、乗せて動かす。藤吉郎の名は、この一件で家中に知れ渡った。' },
    ],
    gain: [['kinoshita_tokichiro', 'int', 1], ['kinoshita_tokichiro', 'lea', 1]], log: '{kinoshita_tokichiro}が崩れた城の塀をわずか三日で直したという。',
  },
  {
    id: 'shichinan', title: '願わくば我に七難八苦を', bg: 'tsukiyo', who: ['yamanaka_yukimori'], from: 1562, to: 1570,
    beats: [
      { head: '若き忠臣', text: '{yamanaka_yukimori}は、出雲の武士。幼い頃から武芸に優れ、十六の年には敵の名のある武者を一騎打ちで討ち取ったという。' },
      { text: '兜には、三日月の前立てを付けていた。鹿の角をかたどった兜とともに、戦場でよく目立った。' },
      { text: '主家の行く末が危うくなるなか、幸盛はある夜、山の上の空に浮かぶ三日月に向かって、手を合わせた。' },
      { who: 'yamanaka_yukimori', label: '', text: '願わくば、我に七難八苦を与えたまえ。' },
      { who: 'yamanaka_yukimori', label: '', text: 'どれほどの苦難でも受けて立つ。その苦しみの中で、己を試したいのだ。その代わり、主家を立て直す力をくだされ。' },
      { text: '人は皆、苦しみから逃れたいと祈る。苦しみを自ら願う若武者の言葉に、居合わせた者は言葉を失った。' },
      { text: '主家のために戦い続けた男の話は、忠義の鑑として、のちのちまで語られた。' },
    ],
    gain: [['yamanaka_yukimori', 'cha', 2], ['yamanaka_yukimori', 'bra', 1]], log: '{yamanaka_yukimori}が三日月に七難八苦を願ったという。',
  },
  {
    id: 'shinkage', title: '新陰流を授く', bg: 'zashiki_day', who: ['kamiizumi_nobutsuna', 'yagyu_munetoshi'], from: 1563, to: 1566,
    beats: [
      { head: '剣聖', text: '上野の{kamiizumi_nobutsuna}は、諸国を巡る剣の達人。陰流をもとに、新しい剣「新陰流」を開いた人である。弟子を連れて、大和へやって来た。' },
      { text: '大和の柳生の里に、{yagyu_munetoshi}という剣の使い手がいた。近隣に並ぶ者のない腕と言われ、自らもそれを誇っていた。' },
      { text: '宗厳は、信綱に勝負を挑んだ。信綱は「まずは弟子と立ち合われよ」と言い、弟子の疋田景兼を出した。' },
      { text: '景兼が手にしていたのは、割った竹を革の袋に包んだ「袋竹刀」。宗厳は何度打ち込んでも、一度も勝てなかった。' },
      { text: '最後に信綱自身が立ち合った。宗厳の木刀は、あっという間に取り上げられた。' },
      { who: 'yagyu_munetoshi', label: '', text: '……参りました。どうか、それがしを弟子にしてくだされ。' },
      { who: 'kamiizumi_nobutsuna', label: '剣聖', text: '剣は人を殺すためのものではない。人を活かすためのものよ。素手で刀に勝つ工夫を、そなたへの宿題としよう。' },
      { text: '宗厳は修行を重ね、新陰流の極意を授けられた。そして素手で刀を制する「無刀取り」を編み出したという。' },
    ],
    gain: [['yagyu_munetoshi', 'bra', 2], ['kamiizumi_nobutsuna', 'cha', 1]], log: '{kamiizumi_nobutsuna}が{yagyu_munetoshi}に新陰流を授けたという。',
  },
  {
    id: 'inabayama', title: '十六人の城取り', bg: 'ishigaki', who: ['takenaka_shigeharu'], from: 1564, to: 1565,
    beats: [
      { head: '侮られた若者', text: '{takenaka_shigeharu}（半兵衛）は、色白でひ弱な見かけの若者だった。主君の側近たちには侮られ、城の櫓の上から小便をかけられたことさえあった。' },
      { text: '主君は酒と遊びにふけり、政をかえりみなかった。家中では、心ある者ほど嘆いていた。' },
      { text: 'ある日、半兵衛は、城に詰めている弟が病だと言って、見舞いの品を運び込んだ。長持の中には、武具が隠されていた。' },
      { text: '夜。半兵衛はわずか十六人の手勢で、城の中から斬って出た。側近たちは討たれ、主君は慌てて城を逃げ出した。' },
      { text: '難攻不落と言われた城は、一夜のうちに、十六人のものになった。' },
      { who: 'takenaka_shigeharu', label: '', text: '城が欲しかったのではない。殿をお諫めしたかっただけのこと。……城は、お返しいたす。' },
      { text: '城を譲れと持ちかける者もいたが、半兵衛は応じなかった。しばらくのちに城を主君へ返し、自らは山にこもって隠棲した。' },
      { text: 'わずか十六人で城を取り、欲を見せずに返した若者の名は、一気に諸国へ知れ渡った。' },
    ],
    gain: [['takenaka_shigeharu', 'int', 2], ['takenaka_shigeharu', 'cha', 1]], log: '{takenaka_shigeharu}がわずか十六人で城を乗っ取り、のちに返したという。',
  },
];

export const ANECDOTES: Anecdote[] = [...ANECDOTES_A, ...ANECDOTES_B];
