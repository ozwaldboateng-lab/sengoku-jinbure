import type { Difficulty } from './rules';
import type { Tactical } from './tactical';

// 唐入りの戦の進み（幕間で唐入りを決め、「唐入りを始める」を押してから）
export interface KarairiWar {
  active: boolean; startTurn: number;
  openTurn: number; // 渡海できるようになる月（対馬から使いを送ると2か月後）
  fleet: number; // 船の数（艘）。渡海できる兵と兵糧の量を決める
  escort: string[]; // 渡海の道を守る水軍の将
  foodLeft?: number; // この月にまだ海を渡せる兵糧（石）
  yi: number; // 李舜臣の水軍の勢い（0〜1。撃退されると下がり、月ごとに戻る）
  raid?: { turn: number; zone: string; sunk: number; troops: number; repelled: boolean; cut?: number; choice?: 'fight' | 'convoy' | 'port'; lostShips?: number; leader?: string } | null; // この月の襲撃（cut: 送った兵糧の沈む割合、sunk: 沈んだ石）
  raids: number; // これまでの襲撃の数
  mingTurn?: number; // 明が援軍を出した月
  weary?: number; // 厭戦（0〜100）
  held?: number; // 先月の終わりに持っていた朝鮮の城の数
  lost?: number; mingLost?: number; joseonLost?: number; // 海の向こうで失った兵（日本・明・朝鮮）
  lord?: string; // 唐入りを始めた当主（亡くなれば撤兵）
  peaceTurn?: number; // 和議を探った月
  reinforced?: number; // この月に船で海の向こうへ送った補充の兵
  seen?: string[]; // 一度だけ見せる場面（名護屋・釜山上陸・義兵・北の冬）
  end?: 'daimin' | 'wagi' | 'withdraw' | 'collapse'; endWhy?: string; // 唐入りの結末
}
// 月をまたぐ城攻め: 日没で決着がつかなければ、合戦の盤面をそのまま翌月へ持ち越す
export interface SiegeSave { clan: string; defender: string | null; armies: number[]; months: number; since: number; tac: Tactical; }

export type Terrain = 'P' | 'F' | 'M' | 'R';

export interface Hex { i: number; q: number; r: number; t: Terrain; p: number; k: number; d: number; c?: number; f?: number; } // f: 国外（朝鮮・遼東。唐入りで開く）

export interface Castle {
  i: number; id: string; name: string; hex: number; owner: string | null;
  baseKoku: number; dev: number; garrison: number; gMorale: number; governor: string | null;
  gate?: number; // 城門の残り耐久（割合）
  naio?: number; naioBy?: string; // 内応: 有効な最終ターンと仕掛けた勢力
  ikkiAt?: number; // 最後に一揆が起きたターン
  baseCom: number; cdev: number; // 商業値（貫/月）と商業の開発度
  chisui: number; chian: number; // 治水（収穫）と治安（動員上限・開発の上限）
  kind: 'yakata' | 'toride' | 'hira' | 'hirayama' | 'yama'; tsume?: string; // 城の種類と詰城
  kiri?: number; // 切支丹の信者の割合（%）
  prevOwner?: string; prevTurn?: number; // 落とされる前の持ち主とそのターン（旧領の回復の名分）
  ember?: number; oldOwner?: string | null; // 残り火（旧主の残党・門徒の火種 0〜100）と、落とす前の持ち主
  rakuichi?: number; // 楽市楽座を布いたターン
  shinden?: { clan: string; until: number }; shindenN?: number; // 新田開発（工事中／成った回数）
  fort?: number; fortBuild?: { clan: string; until: number }; // 普請の段（0土塁・1石垣・2櫓と堀・3天守）／普請中
  store?: number; // 城の蔵（籠城の備えの兵糧、石）。飛び地では収穫もここに入る
}

export type GeneralStatus = 'free' | 'army' | 'governor' | 'captive' | 'dead' | 'ronin' | 'young' | 'tsukai' | 'bugyo';
export interface General {
  id: string; name: string; clan: string | null;
  bra: number; int: number; lea: number; cha: number;
  status: GeneralStatus; loc: number; // 所在城
  army: number | null; captor: string | null; formerClan: string | null;
  triedTurn?: number; // 在野登用を試みたターン
  plotTurn?: number; // 調略を行ったターン
  rank: number; merit: number; // 身分（0 宿老〜3 足軽組頭）と累計功績
  kin?: boolean; // 一門
  genpuku?: number; // 元服する年（status 'young' の間）
  role?: 'agri' | 'com' | 'hyoro'; // 奉行の担当（農政・商業・兵站）
  tea?: string; sword?: string; nanban?: string; // 持たせている名物
  gifted?: string[]; // 下賜を受けたことのある名物（功績は一度だけ）
  ikki?: boolean; // 一揆勢の頭（仮の武将）
  born?: number; // 生年
  sick?: number; // 病の残りか月（0・なしで健やか）
  grow?: number; // 25歳まで毎年伸びる残りの段数
  later?: string; // 元服後の名
  refused?: Record<string, number>; // 在野: 仕官を断られた家とそのターン
  boss?: string; // 軍団での直属の上役
  kan?: number; // 主君の推挙で得た官位（R.COURT の段）
  shugodai?: string; // 守護代を務める国
  tozama?: string; // 降って本領を安堵された旧大名（元の家）。宿老の枠を使わない
  liege?: string; // 陪臣: 仕える城持ち（領主）の武将。恩賞は領主が払い、当家は直接は使えない
  kiri?: boolean; // 洗礼を受けた
  on?: number; paid?: number; // 恩（0〜100）と、恩賞で報いた分の功績（功績−これ＝未払いの功）
  fame?: number; outer?: string; // 名声（0〜100）と、外から受けた官（'court' か家のid。別の場所へ戻れる者）
  exiledFrom?: string; exileTurn?: number; // 追放した家とターン
  bonds?: { id: string; kind: import('../data/bonds').BondKind }[]; comrade?: Record<string, number>; // 縁と、共に勝った回数
  kanjoTurn?: number; home?: number; homeLost?: boolean; // 最後に感状を受けたターン、本領（縁のある城）と、それを敵に取られているか
}

export interface Army {
  id: number; clan: string; main: string; deputy: string | null;
  troops: number; morale: number; hex: number;
  mp: number; acted: boolean; departTroops: number; routed: boolean; monto: boolean;
  guns?: number; // 持たせた鉄砲（合戦では鉄砲隊になる）
  food?: number; // 小荷駄（携行兵糧、月数）。補給下なら満ち、補給切れで減る
  ikki?: { castle: number; until: number }; // 一向一揆（蜂起した城と、散るターン）
  staff?: string[]; // 主将の下の武将（主将を除く。上下は General.boss）
  drill?: number; // 練度 0〜100（なければ50）
  ashi?: number; // 兵のうち足軽（常備兵）の割合 0〜1
  fought?: number; // 最後に合戦したターン
  cannon?: number; // 持たせた大筒（門）
  abroad?: boolean; // 唐入り: 月の初めに海の向こう（朝鮮）にいたか
  front?: number; // 属する方面軍団（なければ直轄）
}

export interface Clan {
  id: string; name: string; color: string; leader: string | null;
  foreign?: boolean; // 国外の家（朝鮮・明）。唐入りまで alive=false のまま眠る
  prestige: number; food: number; alive: boolean; stance: '攻勢' | '均衡' | '守勢';
  target: string | null; // AIの主攻勢力
  lastWar?: number; // 最後に攻撃したターン
  wonTurn?: number; foughtTurn?: number; // 使番の功績判定用
  gold: number; guns: number; // 金（貫）と蔵の鉄砲
  tax?: 'low' | 'mid' | 'high'; // 年貢の率
  shipSeen?: boolean; // 南蛮船が当家の港に来たことがある
  budget: { chisui: number; hodo: number }; // 毎月の収入から治水・施しに回す割合（%）
  focus?: number | null; // 予算を優先する城
  delegate?: { budget: boolean; trade: boolean; staff: boolean; court: boolean; military?: boolean }; // 委任（プレイヤー）。military は直轄も含む全軍
  court?: number; // 官位（0 無位〜8 征夷大将軍）
  mobilize?: number; // 動員目標（動員上限に対する%）。毎月の補充はここまで
  lastBudget?: { chisui: number; hodo: number }; // 先月実際に使った額
  farmAway?: number; // 農繁期に領外へ出た農兵の累計（収穫の減りに使う）
  ruinedBy?: string | null; // この家を滅ぼした家（旧臣はその家に仕えにくい）
  cannon?: number; // 蔵の大筒（門）
  mission?: 'allow' | 'ban'; missionAt?: number; // 布教の許し・禁教と、決めたターン
  ninja?: string | null; ninjaTurn?: number; teaTurn?: number; // 忍び頭と、忍びを使った月・茶会を開いた月
  missionAsked?: number; // 宣教師が最後に訪ねたターン
  usurp?: boolean; // 官を自ら名乗った（僭称）
  splitFrom?: string; // 謀反・お家騒動で割れて出た元の家
  heir?: string; regent?: string; will?: 'retainers' | 'land' | 'tenka'; // 跡継ぎ・後見役・遺言（指名しておけば家督が乱れにくい）
}

export type ItemKind = 'tea' | 'sword' | 'nanban';
export interface Item { id: string; name: string; kind: ItemKind; grade: number; clan: string | null; holder: string | null; }

// 方面軍団（プレイヤーだけ）: 軍団長に担当の城と部隊を任せ、方針に従ってAIが動かす
export type FrontPolicy = 'attack' | 'defend' | 'build';
// 領（知行）: 城持ちの家臣（領主）に与えた城の束。方面軍団を兼ねる（方針に従ってAIが動かす）。target: 'clan:<id>' か 'castle:<城の番号>'
export interface Front {
  id: number; leader: string; castles: number[]; policy: FrontPolicy; target: string | null;
  seat?: number; // 居城（城の番号）
  gold?: number; food?: number; // 領の蔵（年貢・商いの8割が入り、領の兵の兵糧・足軽の給金・陪臣の恩賞をここから払う）
  boss?: number; // 与力として従う寄親の領（方針と目標はこちらに従う）
  vacant?: boolean; asked?: number; // 領主がいなくなった（後継ぎを決めるまで直轄として扱う）／後継ぎを尋ねたターン
}

export interface Ship { port: string; until: number; guns: number; cannon: number; cargo: string[]; }

export interface Treaty { a: string; b: string; kind: 'alliance' | 'marriage'; start: number; until: number | null; }

export interface LogEntry { turn: number; text: string; kind: 'battle' | 'castle' | 'info' | 'death' | 'econ'; mine: boolean; }

export interface BattleRound { aLoss: number; dLoss: number; aMorale: number; dMorale: number; note?: string; }
export interface BattleReport {
  turn: number; attackerClan: string; defenderClan: string | null;
  attackerName: string; defenderName: string; hex: number;
  aStart: number; dStart: number; aEnd: number; dEnd: number;
  rounds: BattleRound[]; outcome: string; events: string[]; charge: boolean;
}

export interface GameState {
  version: 1;
  year: number; month: number; turn: number;
  scenario?: string; startYear?: number; startMonth?: number; // 開始のシナリオと年月
  player: string; difficulty: Difficulty; seed: number;
  clans: Record<string, Clan>;
  generals: Record<string, General>;
  armies: Record<number, Army>;
  castles: Castle[];
  revealed: string[]; // プレイヤーが交戦済みの武将
  log: LogEntry[];
  reports: BattleReport[]; // 直近ターンの戦闘報告
  nextArmyId: number;
  treaties: Treaty[];
  orders: { army: number; hex: number; command: boolean; mp: number }[]; // 今の手番の出陣命令
  // 天下統一ののちの幕間（大評定）で決めたこと: 出るか・大義・南蛮の大船・伴天連追放・人の売り買いの禁令・朝鮮へ使いを送るか・湊を調べたか
  karairi?: { choice: 'go' | 'peace'; cause?: string; ships?: boolean; expel?: boolean; slaveBan?: boolean; envoy?: boolean; investigated?: boolean; turn: number; speaker: string } & Partial<KarairiWar>;
  sieges?: Record<number, SiegeSave>; // 月をまたいで続く城攻め（城の番号 → 合戦の続き）
  dipTried: Record<string, number>; // "提案側|相手" → 最後に交渉したターン
  brokenAt?: Record<string, number>; // 手切れした組 → ターン
  lastClash: Record<string, number>; // "a|b"（辞書順）→ 最後に戦ったターン
  over: null | 'win' | 'lose';
  items: Record<string, Item>; // 名物
  offers?: { gen: string; castle: number; turn: number }[]; // プレイヤーへの仕官の願い出
  ships?: Ship[]; // 来航中の南蛮船
  karasen?: { port: string; until: number }[]; // 来航中の唐船（明の商人の船）
  fronts?: Front[]; nextFrontId?: number; // 方面軍団
  shioki?: { castle: number; turn: number }[]; // プレイヤーが仕置を決める城（落とした翌月の評定終了まで）
  willAsked?: number; // 当主が病に倒れ、遺言を求めたターン
  bakufu?: import('./bakufu').Bakufu; // 幕府（職・守護職・御内書・信任）
  kanOffer?: { gen: string; from: string; turn: number } | null; // 家臣に外から官の誘い（許すか咎めるか）
  returnOffer?: { gen: string; turn: number } | null; // 追放した者が勝手に戦に加わって帰参を願う
  quarrel?: { gen: string; victim: string; killed: boolean; turn: number } | null; // 家臣の喧嘩の裁き
  events?: BigEvent[]; // 月の終わりに場面で見せる大きな出来事（家督相続・滅亡・降伏・謀反）。評定終了ごとに空にする
  scenes?: import('./lines').SceneLine[]; // 月の報告に出す顔見せ（評定終了ごとに空にする）
  missions?: Record<string, { home: string | null; next: number }>; // 宣教師: 身を寄せる家と次に動くターン
  missionVisit?: { mis: string; turn: number } | null; // プレイヤーへの布教の願い出
}

// 場面で見せる大きな出来事（当家に関わるものだけ）
export type BigEvent =
  | { kind: 'katoku'; clan: string; old: string | null; heir: string; will: string | null; regent: string | null; young: boolean }
  | { kind: 'ruin'; clan: string; name: string; leader: string | null; castle: string }
  | { kind: 'surrender'; clan: string; name: string; leader: string | null; castles: number; baishin: number; seat: string | null }
  | { kind: 'rebel'; leader: string; clan: string; name: string; castles: number; seat: string | null; why: 'rebel' | 'odoso'; heir?: string }
  | { kind: 'ikki'; castle: string; troops: number; clan: string }
  | { kind: 'treaty'; treaty: 'alliance' | 'marriage'; other: string }
  | { kind: 'ship'; port: string }
  | { kind: 'mission'; mis: string };
