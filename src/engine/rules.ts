// 仕様 v1.1 の数値。調整はここに集約する。
import type { Terrain } from './types';

export const START_YEAR = 1560;
export const START_MONTH = 6; // 桶狭間（1560年5月）後
export const HARVEST_MONTH = 10;

// 移動
export const MOVE_POINTS = 4;
export const MOVE_COST: Record<Terrain, number> = { P: 1, R: 2, F: 2, M: 3 };
export const CASTLE_MOVE_COST = 1;
export const LINK_MOVE_COST = 3; // 海峡・渡し

// 戦闘
export const ROUNDS = 5; // 1か月の会戦ラウンド数（v1.29で3→5）
export const DAMAGE_K = 0.1; // 1ラウンドの損害係数
export const ROUND_LOSS_CAP = 0.4; // 1ラウンドで失う兵の上限割合
export const ROUND_LOSS_CAP_CASTLE = 0.25; // 籠城側の上限
export const CASTLE_MORALE_RESIST = 0.5; // 籠城側の士気低下倍率
export const DEF_MULT: Record<Terrain | 'C', number> = { P: 1.0, R: 1.0, F: 1.15, M: 1.3, C: 1.6 };
export const RIVER_ATTACK = 0.85; // 川ヘックスへの攻撃
export const HIGH_GROUND = 1.1; // 山から非山地への攻撃
export const CHARGE_SELF_LOSS = 1.15;
export const FLANK_SUPPORT = 0.5; // 包囲参加軍の戦闘力寄与率
export const RUSE_GAP = 20; // 知略差がこれ以上で初回ラウンド計略
export const RUSE_BONUS = 1.15;
export const MORALE_LOSS_PER_LOSS = 1.2; // 損耗率×係数ぶん士気低下
export const MORALE_WEAK_SIDE = 0.05;
export const MORALE_FLANK = -0.15;
export const MORALE_SURROUND = -0.2;
export const MORALE_WIN = 0.05;
export const RETREAT_MORALE = 0.5;
export const ROUT_MORALE = 0.3;
export const ROUT_EXTRA_LOSS = 0.15;
export const MIN_ARMY = 200; // これ未満の兵しか残らない軍団は解散する

// 武将能力 → 攻撃力・防御力・壊乱閾値（兵科は持たず、武将と地形で差がつく）
export const STAFF_BRA = 0.5; // 補佐の武勇が主将より高いとき、その差のこの割合だけ軍団の武勇に足す
export const atkOf = (bra: number, lea: number) => 0.5 + (0.6 * bra + 0.4 * lea) / 100;
export const defOf = (lea: number, int: number, cha: number) => 0.5 + (0.6 * lea + 0.2 * int + 0.2 * cha) / 100;
export const routOf = (lea: number, cha: number) => 0.6 - (0.2 * cha + 0.1 * lea) / 100;
export const GARRISON_STATS = { atk: 0.8, def: 1.0, rout: 0.3 }; // 武将なしの城兵（逃げ場がなく粘る）
export const FIELD_GARRISON = 0.5; // 野戦で城兵が打って出て加勢する割合（籠城なら全員）
export const ROJO_MORALE = 0.4; // 野戦に敗れて城へ退いたときの士気の下限
export const FIELD_VS_ROJO = 0.85; // 野戦の見込みが籠城の見込みのこの割合以上なら、野戦を選ぶ（自動）
export const FIELD_PICK = 0.5; // 自動で野戦を選ぶ見込み（野戦で守り手が勝つ見込みがこれ以上なら打って出る）
export const ROUT_BASE = 0.4; // 平均的な壊乱閾値。自動決着ではここからの差で退却・壊乱の線をずらす
export const MONTO_ROUT = -0.1; // 門徒結束
export const CASTLE_ROUT = -0.1; // 籠城中の軍団
export const WET_ROUT = 0.05; // 川・湿地にいる部隊
export const CHARGE_PLAIN = 1.3; // 平地への突撃
export const CHARGE_ROUGH = 1.1; // それ以外への突撃

// 討死・捕縛
export const DEATH_BASE = 0.005;
export const DEATH_CHARGE = 0.02;
export const DEATH_LOW_MORALE = 1.5;
export const DEATH_ADJ2 = 1.3;
export const DESTROYED_DEATH = 0.1;
export const DESTROYED_CAPTURE = 0.4;
export const ROUTED_CAPTURE = 0.05;

// 城兵（守備軍のいない城を守る）
export const GARRISON_BASE = 300;
export const GARRISON_PER_KOKU = 200; // 1万石あたり
export const GARRISON_POWER = 0.9; // 武将なしの戦闘係数
export const GARRISON_REGEN = 0.15; // 月あたり最大値に対する回復率
export const GARRISON_SUPPORT = 0.5; // 軍団籠城時の城兵寄与

// 内政・兵站
export const MANPOWER_PER_KOKU = 300; // 1万石あたり動員上限
export const BASE_MOBILIZATION = 0.6;
export const FOOD_PER_SOLDIER = 1.0; // 石/月
export const RECRUIT_COST = 2; // 石/人
export const HARVEST_RATE = 3000; // 1万石あたり10月収穫(石)
export const REINFORCE_BASE = 1500;
export const NEW_ARMY_TROOPS = 1000;
export const DEV_MAX = 1.5;
export const MORALE_RECOVER_SUPPLIED = 0.05;
export const MORALE_RECOVER_CASTLE = 0.15;
// 合戦: 本陣（主将の旗本）が持つ兵の割合の下限。壊乱した部隊が攻められたとき、崩れる線より少し上で踏みとどまって始まる（初手は動けない）
export const HQ_SHARE_MIN = 0.35; export const ROUTED_START_MARGIN = 0.12;
export const MORALE_OUT_OF_SUPPLY = -0.03; // 補給切れ（小荷駄を食べている間）の士気の減り
// 兵站
export const SUPPLY_RANGE = 3; // 自領・同盟領の外へ補給の届く距離（ヘックス）
export const hyoroRange = (int: number) => (int >= 90 ? 2 : int >= 75 ? 1 : 0); // 兵站奉行の知略で延びる距離
export const hyoroLoss = (int: number) => Math.max(0.5, Math.min(1, 1 - (int - 50) / 100)); // 兵站奉行の知略で運送の減りが縮む（知略100で半分）
export const SUPPLY_LOSS = 0.15; // 自領の外1ヘックスごとに運ぶ兵糧が増える割合
export const SEA_LOSS = 0.1; // 海路で運ぶ分の減り
export const CARRY_MONTHS = 1; // 小荷駄（自前で持つ兵糧、月数）
export const STARVE_MORALE = 0.2; export const STARVE_DESERT = 0.1; // 兵糧が尽きた部隊: 毎月の士気の減りと逃げる兵の割合
export const STORE_MONTHS = 6; // 城の蔵: 城兵の何か月分を蓄えるか
export const STORE_STARVE_MORALE = 0.25; export const STORE_STARVE_DESERT = 0.12; // 城の蔵が尽きた城
export const MORALE_STARVING = -0.1;

// 調略（戦略マップ）
export const PLOT_COST = 3000; // 兵糧（石）
export const PLOT_RANGE = 3; // 自城・自軍からのヘックス数
export const PLOT_BASE = 0.15; // 成功率 = 0.15 + (知略 − 城主知略)/100 + (威信差)/200 (+国人衆0.15)
export const PLOT_NEUTRAL = 0.15;
export const PLOT_CAUGHT = 0.1; // 失敗時に大名の城で捕らえられる確率
export const NAIO_MORALE = 0.3; // 内応した城の城兵士気低下（自動決着）
export const NINJA_SNEAK = 0.3, NINJA_SNEAK_MORALE = 0.2, NINJA_COUNTER = 0.15; // 自動決着の城攻め: 攻め手の忍びが城門を内から開ける見込みと城兵の士気低下、城方の忍びが防ぐ分
export const AUTO_FIRE_INT = 75; // 自動決着の攻城で火計を使う知略
export const AUTO_FIRE_BONUS = 1.2;

// 威信
export const PRESTIGE_BIG_WIN = 5;
export const PRESTIGE_BIG_LOSS = -8;
export const PRESTIGE_SMALL = 1;
export const BIG_BATTLE_TROOPS = 5000;
export const PRESTIGE_CASTLE = 3;

export type Difficulty = 'easy' | 'normal' | 'hard' | 'veryhard';
export interface DiffParams { label: string; attackThreshold: number; surroundWeight: number; chargeThreshold: number; rotation: number; mobilizationDelta: number; estimateBias: number; }
export const DIFFICULTY: Record<Difficulty, DiffParams> = {
  easy: { label: '易', attackThreshold: 0.6, surroundWeight: 25, chargeThreshold: 0.7, rotation: 0.7, mobilizationDelta: -0.05, estimateBias: 0 },
  normal: { label: '普', attackThreshold: 0.55, surroundWeight: 40, chargeThreshold: 0.6, rotation: 0.7, mobilizationDelta: 0, estimateBias: 0 },
  hard: { label: '難', attackThreshold: 0.5, surroundWeight: 55, chargeThreshold: 0.55, rotation: 0.7, mobilizationDelta: 0.05, estimateBias: 0 },
  veryhard: { label: '極', attackThreshold: 0.5, surroundWeight: 60, chargeThreshold: 0.52, rotation: 0.65, mobilizationDelta: 0.05, estimateBias: 0.03 },
};

// 本願寺「門徒結束」: 加賀（金沢御堂）で編成された軍団は士気が自然減衰しない
export const MONTO_CASTLE = 'kanazawa';

// 身分（0 宿老 / 1 侍大将 / 2 足軽大将 / 3 足軽組頭）と功績
export const RANK_NAME = ['宿老', '侍大将', '足軽大将', '足軽組頭'];
export const RANK_TROOP = [1.2, 1.0, 0.8, 0.5]; // 兵数上限の倍率（足軽組頭は小勢しか率いられない）
export const LEADER_TROOP = 1.3;
export const MERIT_AT = [300, 120, 50, 0]; // その身分に上がる累計功績
export const MERIT = { WIN: 10, CASTLE: 8, LOSE: 3, DRAW: 5, GOV: 1, PLOT: 8 };
export const TSUKAI_MULT = 1.5; // 使番は当主の本陣に従い、手柄が早くたまる
export const TSUKAI_MAX_RANK = 2; // 足軽大将・足軽組頭だけが使番になれる（侍大将に上がると抜ける）
export const karoSlots = (koku: number) => Math.min(4, 1 + Math.floor(koku / 40));
export const tsukaiSlots = (koku: number) => Math.min(5, 2 + Math.floor(koku / 25));

// 伝令（合戦）: 本陣から CMD_RANGE 以内は自由に指揮、外の部隊は伝令1回で指揮できる
export const CMD_RANGE = 3;
export const CMD_HEAD_BONUS = 1; // 使番筆頭がいれば指揮範囲+1
export const COURIER_BASE = 1; // 伝令の回数 = 1 + 使番の人数

// 奉行（内政担当）: 家のすべての城の開発（石高）を進める
export const bugyoSlots = (koku: number) => Math.min(5, 1 + Math.floor(koku / 30));
export const BUGYO_WEIGHT = [1, 0.6, 0.4, 0.3, 0.2]; // 知略の高い順の寄与（係数 = Σ 重み×知略/100）
export const BUGYO_RATE = 0.003; // 係数1あたり、月の開発度+0.3%
export const DEV_NATURAL = 0.2; // 奉行がいなくても進む分（係数）
export const BUGYO_CASTLES = 4; // 奉行1人で目が届く城の数（超えると効率が落ちる）
export const NO_GOV_DEV = 0.5; // 城主のいない城は開発が半分
export const BUGYO_MERIT = 2; // 奉行の月ごとの功績

// 商業とお金（貫）
export const COM_PER_KOKU = 50; // 石高1万石あたりの商業値（貫/月）
export const RICE_PRICE = 1; // 兵糧1石の基準価格（貫）
export const RICE_SEASON = [1.1, 1.15, 1.2, 1.2, 1.25, 1.3, 1.3, 1.3, 1.1, 0.7, 0.7, 0.7]; // 月ごとの相場（1月〜12月）
export const RICE_SELL = 0.8; // 売値は相場の8割
export const PLOT_GOLD = 3000; // 調略（貫）
export const RONIN_GOLD = 1000; // 在野武将の登用（貫）
export const START_GOLD_MONTHS = 4; // 開始時の金 = 月収の6か月分

// 鉄砲
export const GUN_PRICE = 12; // 1丁（貫）
export const GUN_PRICE_SOURCE = 8; // 産地を持っていれば
export const GUN_UPKEEP = 0.2; // 1丁あたり月（貫）
// 鉱山・特産品・楽市楽座
export const mineChian = (chian: number) => Math.min(1, 0.5 + chian / 100); // 治安が低いと産出が減る（治安0で半分、50以上で満額）
export const HORSE_CHARGE_SELF = 1.05; // 馬の産地を持てば、突撃の自軍の損害の倍率が1.15→1.05
export const POWDER_UPKEEP = 0.8; // 硫黄・煙硝の産地を持てば鉄砲・大筒の維持費が8割
export const IRON_GUN = 0.85; // 鉄の産地を持てば鉄砲の値段が85%
// 内政への追加投資・新田開発・城の普請
export const INVEST_STEP = 0.05; // 一度の投資で開発度・商業の開発度が+5%
export const INVEST_AGRI = 120; // 開発: 基本石高1万石あたり（貫）
export const INVEST_COM = 1.5; // 商業: 基本の商業値1貫あたり（貫）
export const SHINDEN_PER = 800; export const SHINDEN_RISE = 1.5; // 新田開発: 基本石高1万石あたり800貫、回を重ねるごとに1.5倍
export const SHINDEN_MONTHS = 12; export const SHINDEN_GAIN = 0.08; export const SHINDEN_MAX = 3; // 12か月で基本石高+8%、一つの城で3度まで
export const FORT_COST = [0, 4000, 10000, 25000]; // 普請（石垣・櫓と堀・天守）。城の石高で増減（×(0.6＋石高÷25)）
export const FORT_MONTHS = [0, 6, 9, 12]; // 築城の城主なら半分
export const FORT_DEF = 0.12; export const FORT_GARRISON = 0.12; export const FORT_GATE = 0.2; // 一段ごとの守り・城兵の上限・城門の固さ
export const TENSHU_PRESTIGE = 3;
export const RAKUICHI_GROW = 1.5; // 楽市楽座: 商業の開発の伸び×1.5
export const RAKUICHI_CAP = 0.2; // 商業の開発の上限+20%
export const RAKUICHI_CHIAN = -1; export const RAKUICHI_MONTHS = 12; // 布いてから12か月は、座を持つ寺社・商人の反発で治安が毎月−1
export const GUN_SHARE = 0.4; // 部隊の兵のうち鉄砲を持てる割合
export const GUN_MIN_UNIT = 100; // これ以上で合戦に鉄砲隊が出る
export const GUN_AUTO_ATK = 2.2; // 自動決着での鉄砲兵の攻撃力

// 名物
export const ITEM_PRICE = 3000; // 格×3000貫
export const ITEM_SAKAI_DISCOUNT = 0.8; // 堺を持てば2割引
export const ITEM_MERIT = 10; // 下賜の功績 = 格×10（一度だけ）
export const ITEM_GIFT = 0.05; // 贈答の成功率 = 格×5%
export const itemBonus = (kind: 'tea' | 'sword' | 'nanban', grade: number) =>
  kind === 'tea' ? { bra: 0, int: grade, lea: 0, cha: grade * 2 } : kind === 'sword' ? { bra: grade * 2, int: 0, lea: grade, cha: 0 } : { bra: grade, int: grade, lea: grade, cha: grade };

// 南蛮貿易: 毎年6月に南蛮船が来て、11月の初めに去る。来ている間は港の持ち主に南蛮市が開く
export const SHIP_MONTH = 6;
export const SHIP_STAY = 5; // か月
export const SHIP_EXTRA = 0.5; // 2隻目が来る確率
export const SHIP_TRADE = 1500; // 来航中の港の持ち主に入る貿易の利（貫/月）
export const SILVER_TRADE = 0.2; // 南蛮船・唐船が来ている家は、銀山の産出の2割を貿易の利に上乗せ（日本の銀で生糸を買う）
export const KARASEN_CHANCE = 0.35; // 唐船が来る月ごとの確率
export const KARASEN_STAY = 3; // か月
export const KARASEN_TRADE = 700; // 来航中の港の持ち主に入る貿易の利（貫/月）
export const SHIP_GUNS = 600; // 1隻が積んでくる鉄砲（丁）
export const SHIP_CANNON = 2; // 1隻が積んでくる大筒（門）
export const SHIP_ITEMS = 2; // 1隻が積んでくる南蛮の名物（まで）
export const NANBAN_GUN_PRICE = 6; // 南蛮市の鉄砲1丁（貫）
export const NANBAN_ITEM_PRICE = 2500; // 南蛮の名物: 格×2500貫
export const SHIP_W_ALLOW = 4; // 布教を許した家の港には来やすい
export const SHIP_W_BAN = 0.15; // 禁教の家の港には来にくい
export const SHIP_W_NOOWNER = 0.5; // 国人の港
// 大筒: 攻城で城門を撃ち、城兵を怯ませる
export const CANNON_PRICE = 2000; // 1門（貫）
export const CANNON_UPKEEP = 10; // 1門あたり月（貫）
export const CANNON_MAX = 3; // 1部隊に持たせられる数
export const CANNON_GATE = 0.15; // 攻城の初めの砲撃: 1門ごとに城門の耐久をこの割合だけ削る
export const CANNON_GATE_TURN = 0.04; // 攻め手の手番ごとの砲撃（1門ごと、門ひとつ）
export const CANNON_MORALE = 0.04; // 城兵の士気（1門ごと）
export const CANNON_DEF = 0.08; // 自動決着: 城の守りの倍率（1を超える分）を1門ごとにこれだけ減らす
// 布教: 許すと城の信者が増え、商業が伸びるが寺社が反発する。禁じると信者は減り、洗礼を受けた家臣が去ることがある
export const KIRI_GROW = 0.15; // 許した家の城で毎月（%）。上限に近づくほど伸びが鈍る
export const KIRI_GROW_MIS = 0.15; // 宣教師が身を寄せている家ならさらに
export const KIRI_GROW_GOV = 0.15; // 城主が洗礼を受けていればさらに
export const KIRI_GROW_PORT = 0.2; // 南蛮港ならさらに
export const KIRI_MAX = 40;
export const KIRI_DECAY = 3; // 禁教の家・許していない家の城で毎月
export const KIRI_COM = 0.003; // 信者1%ごとの商業の伸び
export const KIRI_CHIAN = 1 / 60; // 許した家: 寺社の反発で治安が毎月 信者%×これ だけ下がる
export const BAN_CHIAN = -1; // 禁教: 信者が残る城の治安（毎月）
export const BAN_LEAVE = 0.02; // 禁教: 洗礼を受けた家臣が毎月出奔する確率
export const MISSION_COOLDOWN = 6; // 許し・禁教を改めるまでのか月
export const MISSION_VISIT = [4, 9]; // 宣教師が次に動くまでのか月（幅）
export const MISSION_NEAR = 8; // 宣教師が訪ねる家（身を寄せる家・港から近い順に）
export const MISSION_REVISIT = 12; // 同じ家を再び訪ねるまでのか月
export const MISSION_REVISIT_BAN = 24; // 禁じた家を再び訪ねるまでのか月
export const IKKI_KIRI = 2; // 本願寺は布教を許した家の城を狙いやすい

// 治水（収穫）と治安（動員上限・開発の上限）。どちらも城ごとに0〜100
export const CHISUI_START = 50;
export const harvestMult = (chisui: number) => 0.7 + chisui * 0.006; // 0→70%、50→100%、100→130%
export const CHIAN_START = 60;
export const manpowerPer = (chian: number) => 200 + chian * 1.5; // 1万石あたりの動員上限: 0→200、60→290、100→350
export const devCap = (chian: number) => 1 + chian * 0.006; // 開発度の上限: 0→100%、60→136%、100→160%
export const DEV_DECAY = 0.002; // 上限を超えた開発度は毎月これだけ下がる
export const CHIAN_CAPTURED = 30; // 落とした直後の城
export const MOBILIZE_FREE = 0.5; // 動員率（兵÷動員上限）がこれを超えると毎月治安が下がる
export const MOBILIZE_DROP = 10; // 下がり幅 =（動員率−0.5）×10。動員率100%で毎月−5
export const CHIAN_SIEGE = -3; // 包囲中
export const CHIAN_STARVE = -5; // 兵糧切れ
export const CHIAN_PEACE = 0.5; // 戦のなかった月
export const chianGov = (cha: number) => (cha - 40) / 20; // 城主の魅力: 80→+2、40→0
// 予算（毎月の収入に対する割合）
export const BUDGET_STEPS = [0, 5, 10, 20, 30, 50];
export const MOBILIZE_STEPS = [50, 60, 70, 80, 90, 100];
export const MOBILIZE_DEFAULT = 70;
export const CHISUI_COST = 30; // 治水1を上げる費用 = 基本石高×30貫
export const HODO_COST = 10; // 施しで治安1を上げる費用 = 基本石高×10貫
export const FOCUS_SHARE = 0.5; // 重点の城に先に回す割合

// 官位（朝廷への献金で買う）。1つ下から順に上がる。関白・征夷大将軍は天下に1人
export const COURT: { name: string; cost: number; pres: number; deter: number }[] = [
  { name: '無位', cost: 0, pres: 0, deter: 0 },
  { name: '従五位下・守', cost: 3000, pres: 3, deter: 0.05 },
  { name: '従四位下・大夫', cost: 8000, pres: 6, deter: 0.1 },
  { name: '従四位上・近衛中将', cost: 15000, pres: 10, deter: 0.15 },
  { name: '従三位・参議', cost: 30000, pres: 14, deter: 0.2 },
  { name: '正三位・大納言', cost: 50000, pres: 18, deter: 0.25 },
  { name: '従二位・内大臣', cost: 80000, pres: 22, deter: 0.3 },
  { name: '関白', cost: 150000, pres: 28, deter: 0.4 },
  { name: '征夷大将軍', cost: 200000, pres: 35, deter: 0.5 },
];
export const KAMPAKU = 7, SHOGUN = 8;
export const SHOGUN_KOKU = 300; // 将軍の条件: 総石高300万石か40城、かつ京（二条御所）を押さえる
export const SHOGUN_CASTLES = 40;
export const SHOGUN_CASTLE = 'kyo';
export const DEPOSED_COURT = 6; // 将軍を失った家は大臣相当に
export const DETER_THRESHOLD = 0.15; // 攻められにくさ1あたりのAIの攻撃判断の上乗せ

// 城の種類（縄張り）: 城兵の上限・城門の耐久・攻城戦の曲輪の数・守りの倍率
export const CASTLE_KIND: Record<'yakata' | 'toride' | 'hira' | 'hirayama' | 'yama', { name: string; garrison: number; gate: number; rings: number; def: number }> = {
  yakata: { name: '館', garrison: 0.6, gate: 0.5, rings: 1, def: 1.2 },
  toride: { name: '砦', garrison: 0.7, gate: 0.6, rings: 1, def: 1.3 },
  hira: { name: '平城', garrison: 1.0, gate: 1.0, rings: 2, def: 1.4 },
  hirayama: { name: '平山城', garrison: 1.1, gate: 1.1, rings: 2, def: 1.6 },
  yama: { name: '山城', garrison: 0.9, gate: 1.2, rings: 3, def: 1.9 },
};
export const TSUME_DEF = 0.3; // 詰城のある館: 自動決着の守り+0.3
export const TSUME_ROUT = -0.05; // 詰城のある館: 城兵の壊乱閾値−0.05（粘る）
export const CASTLE_DEF_BASE = 1.6; // 合戦の曲輪・本丸・城門の守り（T_DEF）は 守りの倍率÷1.6 で増減

// 一向一揆（本願寺だけの謀略）: 他国の城で門徒が蜂起する。忠誠・治安では防げない
export const IKKI_CLAN = 'honganji';
export const IKKI_COST = 2000; // 金（貫）
export const IKKI_PER_KOKU = 120; // 一揆勢 = 基本石高×120人（500〜4,000人）
export const IKKI_MAX = 4000;
export const IKKI_MONTHS = 3; // 3か月で散る
export const IKKI_COOLDOWN = 12; // 同じ城では12か月に一度
export const IKKI_STATS = { bra: 40, int: 30, lea: 40, cha: 50 }; // 百姓なので弱い（門徒なので崩れにくい）
export const IKKI_DEV_LOSS = 0.04; // 一揆勢1,000人を討つごとに、その城の開発度−4%
export const IKKI_CHIAN_LOSS = 10; // 同じく治安−10

// 視界と物見（野戦の合戦）
export const SIGHT = 3; // 本陣の指揮下の部隊が見える範囲
export const SIGHT_HIGH = 4; // 丘の上から
export const SCOUT_BASE = 2; // 物見の回数（毎刻）
export const SCOUT_INT = 85; // この知略の武将がいれば物見+1
export const SCOUT_RANGE = 7; // 自軍の部隊からこの距離まで物見を出せる
export const SCOUT_RADIUS = 2; // 物見で見通す範囲

// ───────── 寿命・病・世代交代 ─────────
export const GENPUKU_AGE = 15; // 生年から元服までの年数（GENPUKU に指定がなければ）
export const ADULT_BORN_MAX = 1545; // 1560年に元服済みの武将の生年の上限（若すぎる推定を丸める）
// 毎月、病にかかる見込み（年齢ごと）。病でなければ死なない
export const sickChance = (age: number) => (age < 15 ? 0 : age < 40 ? 0.0015 : age < 50 ? 0.003 : age < 60 ? 0.006 : age < 70 ? 0.012 : 0.025);
// 病のあいだ、毎月それで亡くなる見込み
export const sickDeath = (age: number) => Math.max(0.05, Math.min(0.4, 0.08 + (age - 40) * 0.006));
export const SICK_MONTHS_MAX = 5; // 病は1〜5か月続く
// 若いうちは25歳まで毎年伸びる（1段で武勇・統率+2、知略・魅力+1。最大10段）
export const GROW_AGE = 25;
export const GROW_MAX = 10;
// 老い: 毎年正月、この年齢から下がる
export const AGE_DECLINE = { bra: 56, lea: 60, int: 68 };
export const STAT_FLOOR = 10;
// 家督相続の影響
export const SUCCESSION_PRESTIGE = 5; // 威信の低下（一門でない・幼い跡継ぎはさらに同じだけ）
export const SUCCESSION_CHIAN = 5; // 全城の治安の低下

// ───────── 在野・仕官 ─────────
export const RONIN_MOVE = 0.3; // 毎月、在野武将が別の城へ移る見込み
export const RONIN_RANGE = 7; // 移る先の距離（ヘックス。2〜3国先まで）
export const RONIN_OFFER_BASE = 0.15; // 仕官を願い出る見込みの基本値
export const RONIN_REFUSED_MONTHS = 12; // 断られた家にはしばらく願い出ない
export const RONIN_OFFER_KEEP = 1; // 願い出は翌月の評定まで有効
export const RONIN_FAME_SAMURAI = 70; // 能力の平均がこれ以上なら侍大将で迎える

// ───────── 練度と足軽（常備兵） ─────────
export const DRILL_START = 50; // 開始時の部隊
export const DRILL_RECRUIT = 20; // 補充・新しく集めた農兵
export const DRILL_ASHI = 50; // 雇ったばかりの足軽
export const DRILL_IKKI = 10; // 一揆勢
export const DRILL_BATTLE = 4; // 合戦を経た月の伸び
export const drillGain = (lea: number) => 2 + lea / 25; // 自城か隣で訓練した月の伸び（統率100で+6）
export const DRILL_FIELD = 1; // 出陣中（補給下）の伸び
export const drillCap = (ashiShare: number) => 60 + 40 * ashiShare; // 農兵だけなら60、足軽だけなら100
// 練度の効果: 攻撃・防御 ×(0.8＋練度÷250)（20で0.88、50で1.0、100で1.2）、壊乱閾値 −(練度−50)÷500
export const drillMult = (d: number) => 0.8 + d / 250;
export const drillRout = (d: number) => (d - 50) / 500;
export const ASHI_HIRE = 3; // 足軽を雇う（貫/人）
export const ASHI_WAGE = 0.3; // 足軽の給金（貫/人/月）。払えなければ1割が去る
export const ASHI_STEP = 500; // 一度に雇える数
// 農繁期（田植え5・6月、刈り入れ9・10月）に領外へ出陣している農兵の分だけ、十月の収穫が減る
export const FARM_MONTHS = [5, 6, 9, 10];
export const FARM_LOSS = 0.5; // 収穫の減り = 0.5 ×（農繁期に領外にいた農兵の平均 ÷ 動員上限）
export const FARM_LOSS_MAX = 0.4;

// ───────── 軍団の編成 ─────────
export const CORPS_CHILDREN = 2; // ひとつの段の下に置ける武将
export const CORPS_MAIN_TROOP = 0.6; // 兵数の上限 = 主将の上限×0.6 ＋ 傘下の武将それぞれの上限×0.5
export const CORPS_SUB_TROOP = 0.5;
export const CORPS_DRILL = 0.5; // 傘下の武将1人ごとの訓練の上乗せ（最大+3）
export const CORPS_DRILL_MAX = 3;
export const CORPS_UNIT_BONUS = 0.02; // 合戦で隊を持たない傘下の武将1人ごとに、属する隊の攻防+2%（最大+8%）
export const CORPS_UNIT_BONUS_MAX = 0.08;

// 方面軍団（プレイヤー）: 宿老か一門を軍団長にして城と部隊を任せる
export const FRONT_KOKU = 50; // 方面の数 = 1 + 石高（万石）÷これ（城3つ以上から）
export const FRONT_MAX = 6;
export const FRONT_REINF = 5; // 軍団長の統率1ごとに、方面の部隊の毎月の補充+5人
export const frontChian = (cha: number) => Math.max(0, (cha - 40) / 80); // 軍団長の魅力: 担当の城の治安（毎月）80→+0.5
export const frontNoise = (int: number) => Math.max(0.02, (100 - int) / 400); // 軍団長の知略: 合戦の見込みの読み違い 40→±0.15、90→±0.025
export const FRONT_REACH = 6; // 攻略で狙う城は担当の城からこのヘックス以内（目標の家を決めれば+4）
export const FRONT_MERIT = 10; // 方面が戦った月の軍団長の功績
export const FRONT_POLICY_NAME = { attack: '攻略', defend: '防衛', build: '軍備増強' } as const;
// 領（知行）
export const FIEF_CAP = [Infinity, 3, 1, 0]; // 身分ごとに持てる城の数（宿老・侍大将・足軽大将・足軽組頭）
export const FIEF_TRIBUTE = 0.2; // 領の年貢・商いのうち当家へ上納する割合
export const FIEF_PAY = 12; // 城を与えたとき、その石高1万石ごとに報いる功
export const fiefOn = (koku: number) => Math.min(25, 8 + koku * 1.5); // 城を与えた（召し上げた）ときの恩の上げ下げ
export const FIEF_PULL_ON = [12, 8, 5, 3];
// 家臣の官位（推挙）と守護代
export const KAN_RATE = 0.3; // 推挙の献金は、その官位の献金の3割
export const KAN_VASSAL_MAX = 5; // 家臣に推挙できるのは大納言まで（当家の官位より下）
export const kanOn = (k: number) => 6 + k * 2; // 推挙で上がる恩
export const kanFame = (k: number) => 4 + k * 2; // 推挙で上がる名声
export const SHUGODAI_ON = 8; export const SHUGODAI_OFF = 4; // 守護代に任じた・解いたときの恩
export const SHUGODAI_CHIAN = 0.5; // 守護代のいる国の当家の城の、毎月の治安
export const TOZAMA_PULL = 1.5; // 外様（降った旧大名）の家臣を引き抜いたときは1.5倍 // 陪臣を直参に引き上げたときの領主の恩の下がり（引き上げた者の身分ごと）
export const fiefGoldCap = (koku: number) => 1500 + koku * 150; // 領の蔵の金がこれを超えた分は、領の城の開発に回る
export const FIEF_DEV_PER_GOLD = 0.00002; // 余った金1貫あたりの開発度の伸び

// 御恩と奉公: 武将ごとの「恩」（0〜100）。功を立てても報われなければ下がり、報いれば上がる
export const ON_START = 60; // 開始時（一門は+15）
export const ON_NEW = 45; // 新参（登用・仕官・降った家の者）
export const ON_TARGET = 55; // 報われている者が落ち着くところ（一門は+10）
export const ON_DUE_FREE = 20; // これだけの未払いの功までは不満にならない
export const ON_DUE_DROP = (due: number) => Math.min(3, 0.5 + (due - ON_DUE_FREE) / 40); // それを超えた分の毎月の下がり
export const ON_HOME_LOST = 0.4; // 本領（縁のある城）を敵に取られている間、毎月
export const ON_HOME_BACK = 12; // 本領を取り戻したとき
export const ON_GOV = 0.3; // 城主の毎月の手応え（知行）
export const ON_KANJO = 3; export const ON_KANJO_PAY = 15; export const ON_KANJO_MONTHS = 3; // 感状: 金はかからず、3か月に一度
export const ON_GOLD = 30; // 加増: 未払いの功1につき（貫）
export const ON_KAZO = (due: number) => Math.min(12, 2 + due / 8);
export const ON_PROMOTE = 10; export const ON_PROMOTE_PAY = 40; // 昇進
export const ON_ITEM = 4; export const ON_ITEM_PAY = 20; // 下賜: 格ごと
export const ON_LEAVE = 20; export const onLeaveChance = (on: number) => (ON_LEAVE - on) / 400; // 出奔（毎月）
export const ON_BETRAY = 15; export const onBetrayChance = (on: number) => (ON_BETRAY - on) / 300; // 城主の寝返り（敵城が3ヘックス以内）
export const ON_REBEL = 15; export const onRebelChance = (on: number) => (ON_REBEL - on) / 200; // 方面軍団の謀反
export const onPlot = (on: number) => (50 - on) / 250; // 調略される城の城主（0で+20%、100で−20%）
export const onRecruit = (on: number) => (50 - on) / 200; // 捕虜が旧主を見限る
export const onMorale = (on: number) => (on - 50) / 500; // 主将の恩で初めの士気（±0.1）

// 仕置: 落とした城の治め方。残り火（旧主の残党・門徒の火種）が治安の低い城で燃え上がる
export type Shioki = 'buiku' | 'misesime' | 'yakiuchi';
export const SHIOKI_NAME: Record<Shioki, string> = { buiku: '撫育', misesime: '見せしめ', yakiuchi: '焼き討ち' };
export const EMBER_BASE = 25; export const EMBER_OLD_ALIVE = 25; export const EMBER_MONTO = 20; export const EMBER_KOKUJIN = 15; export const EMBER_MAX = 80;
export const MISESIME = { chian: 25, dev: 0.9, ember: 0.5 };
export const YAKIUCHI = { chian: 45, dev: 0.7, prestige: 5 };
export const emberDecay = (chian: number, cha: number) => Math.max(0.3, 0.5 + chian / 100 + (cha - 40) / 100); // 毎月
export const EMBER_FLARE_CHIAN = 40; export const emberFlare = (ember: number) => ember / 2200; // 治安40未満で毎月
export const flareSize = (ember: number, koku: number) => Math.round((ember * 25 + koku * 40) / 100) * 100;

// 家督と遺言
export const HEIR_DESIGNATED = 0.5; // 指名した跡継ぎなら威信・治安の下がりを半分に
export const WILL = { retainers: 8, land: 8, tenka: 5 }; // 遺言: 家臣の恩・全城の治安・威信
export const WILL_NAME = { retainers: '家臣を大事にせよ', land: '領国を固めよ', tenka: '天下を目指せ' } as const;
export const ODOSO_GAP = 25; // 跡継ぎより（魅力＋統率）がこれだけ高い一門がいると、お家騒動のおそれ
export const odosoChance = (regentCha: number) => Math.max(0.05, 0.35 - regentCha / 300);

// 名声と大きすぎる功（二の柱）
export const FAME_WIN = 2; export const FAME_CASTLE = 3; export const FAME_HEAD = 4; export const FAME_LOSE = 1; export const FAME_DECAY = 0.3; // 上がるほど伸びは鈍る（×(1−名声/110)）
export const fameMorale = (fame: number) => Math.min(0.05, fame / 2000);
export const KAN_FAME = 45; export const KAN_ON = 55; export const KAN_CHANCE = 0.03; // 名声45以上・恩55未満の者に、毎月3%で外から官の誘い
export const KAN_FORGIVE = 5; export const KAN_SCOLD = 15; export const OUTER_SHIFT = 10; // 許せば恩+5（だが外に門を持つ: 出奔・寝返り・謀反の線が+10）、咎めれば恩−15
// 縁と去就（四の柱）
export const BOND_RECRUIT = 0.2; export const BOND_PLOT = 0.15; export const BOND_FOLLOW = 0.5; export const COMRADE_WINS = 6;
// 追放と帰参（六の柱）
export const EXILE_PRESTIGE = 1; export const RETURN_CHANCE = 0.35; export const RETURN_ON = 80; export const RETURN_MERIT = 20;
export const QUARREL_CHANCE = 0.012; export const QUARREL_LET = 3; // 喧嘩: 毎月1.2%。不問なら家臣全員の恩−3
// 都の重さ（七の柱）
export const KYO = 'kyo'; export const KYO_RANGE = 2; export const KYO_FOOD = 2; // 京とその周りの軍勢は兵糧を2倍食う
export const ROZEKI_CHANCE = 0.15; export const ROZEKI_CHIAN = 4; // 足軽が半分未満で練度60未満なら狼藉
export const USURP_PRESTIGE = 10; export const USURP_DIP = 0.15; export const USURP_TARGET = 1.5; // 僭称: 威信+10、外交−15%、AIに狙われやすい

// 将軍と大義名分
export const TRUST_DEFAULT = 30; // 幕府の信任（書いていない家）。信任は40へ少しずつ戻る
export const REBEL_MONTHS = 24; export const KYURYO_MONTHS = 60; export const ADAUCHI_MONTHS = 120; export const HANGEKI_MONTHS = 6; export const KYUEN_MONTHS = 3; // 名分の続く月数
export const TRUST_ATTACK_SHOGUN = 25; export const TRUST_ORDER_DONE = 2; export const TRUST_ALLY = 1;
export const SHISEN_ON = 2; export const SHISEN_CHIAN = 1; export const SHISEN_PRESTIGE = 1; export const SHISEN_EMBER = 20; export const MEIBUN_EMBER = 10; // 私戦の咎、名分のある戦の残り火の減り
export const SHISEN_DIP = 0.1; export const SHISEN_DIP_MONTHS = 6; // 私戦を重ねる家とは結びにくい
export const SHOGUN_AI = 0.15; // AI: 将軍家を攻める線
export const MEIBUN_AI = 0.06; // AI: 名分がなければ攻める見込みの線がこれだけ上がる
export const DONATE_GOLD = 1000; export const DONATE_TRUST = 4;
export const ORDER_TRUST = 50; export const ORDER_GOLD = 3000; export const ORDER_MONTHS = 24; export const ORDER_TRUST_COST = 5; // 御内書
export const POST_TRUST = 60; export const SHUGO_GOLD = 5000; export const SHOBAN_GOLD = 8000; // 職・守護職・御相伴衆の願い出
export const SHUSSI_MONTHS = 36; // 出仕の同盟
export const SPONSOR_GOLD = 10000; // 擁立
export const BETRAY_KOKU = 250; export const BETRAY_CASTLES = 30; export const BETRAY_TRUST = 50; export const BETRAY_CHANCE = 0.01; // 擁立された将軍の離反
