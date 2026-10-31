// 唐入りの朝鮮・明の人物（唐入りを始めたときに加える）
// [id, 名, 家, 武勇, 知略, 統率, 魅力, 城id, 役]  役: king=王（都にいる）/ gov=城主 / free=待機 / gihei=義兵将（占領地に起つ）/ ming1・ming2=明の援軍（一番手・本隊）
export type KoreaRole = 'king' | 'gov' | 'free' | 'gihei' | 'ming1' | 'ming2' | 'envoy';
export const KOREA_GENERALS: [string, string, string, number, number, number, number, string, KoreaRole][] = [
  ['seonjo', '宣祖', 'joseon', 30, 55, 30, 52, 'hanseong', 'king'],
  ['ryu_seongryong', '柳成龍', 'joseon', 30, 90, 62, 82, 'hanseong', 'free'],
  ['kim_myeongwon', '金命元', 'joseon', 45, 60, 58, 55, 'hanseong', 'gov'],
  ['sin_rip', '申砬', 'joseon', 82, 45, 70, 62, 'chungju', 'gov'],
  ['i_il', '李鎰', 'joseon', 68, 48, 60, 45, 'sangju', 'gov'],
  ['jeong_bal', '鄭撥', 'joseon', 72, 50, 62, 60, 'busan', 'gov'],
  ['song_sanghyeon', '宋象賢', 'joseon', 40, 72, 58, 82, 'dongnae', 'gov'],
  ['kim_simin', '金時敏', 'joseon', 72, 66, 82, 72, 'jinju', 'gov'],
  ['gwon_yul', '権慄', 'joseon', 75, 74, 86, 76, 'jeonju', 'gov'],
  ['gwak_jaeu', '郭再祐', 'joseon', 80, 80, 76, 72, 'daegu', 'gihei'],
  ['kim_cheonil', '金千鎰', 'joseon', 55, 72, 70, 82, 'naju', 'gihei'],
  ['go_gyeongmyeong', '高敬命', 'joseon', 45, 76, 62, 86, 'gongju', 'gihei'],
  ['hyujeong', '休静', 'joseon', 52, 86, 72, 92, 'pyongyang', 'gihei'],
  ['yujeong', '惟政', 'joseon', 76, 76, 74, 80, 'wonju', 'gihei'],
  ['zu_chengxun', '祖承訓', 'ming', 76, 40, 62, 50, 'jiuliancheng', 'ming1'],
  ['li_rusong', '李如松', 'ming', 86, 72, 90, 72, 'jiuliancheng', 'ming2'],
  ['ma_gui', '麻貴', 'ming', 78, 60, 80, 60, 'jiuliancheng', 'ming2'],
  ['shen_weijing', '沈惟敬', 'ming', 20, 86, 30, 86, 'jiuliancheng', 'envoy'],
  ['yang_hao', '楊鎬', 'ming', 42, 72, 56, 60, 'jiuliancheng', 'free'],
];
// 生年（顔見せ・年齢の表示用）
export const KOREA_BORN: Record<string, number> = { seonjo: 1552, ryu_seongryong: 1542, kim_myeongwon: 1534, sin_rip: 1546, i_il: 1538, jeong_bal: 1553, song_sanghyeon: 1551, kim_simin: 1554, gwon_yul: 1537, gwak_jaeu: 1552, kim_cheonil: 1537, go_gyeongmyeong: 1533, hyujeong: 1520, yujeong: 1544, zu_chengxun: 1550, li_rusong: 1549, ma_gui: 1543, shen_weijing: 1540, yang_hao: 1555 };
// 王が退く先（都から北へ）
export const KING_ROUTE = ['hanseong', 'gaeseong', 'pyongyang', 'anju', 'uiju'];
// 冬が厳しい道（11〜2月、この国にいる日本の軍勢は凍える）
export const COLD_PROVINCES = ['hwanghae', 'pyongan', 'hamgyong', 'gangwon', 'liaodong'];
// 略歴
export const KOREA_BIOS: Record<string, string> = {
  seonjo: '朝鮮第14代の王。日本軍が迫ると漢城を捨てて北へ逃れ、義州から明に援軍を求めた。',
  ryu_seongryong: '領議政。李舜臣・権慄を抜擢し、明との交渉と兵糧の手配に奔走した。のちに戦の記録『懲毖録』を著す。',
  kim_myeongwon: '都元帥。漢江・臨津江で日本軍を防ごうとした。',
  sin_rip: '三道巡辺使。騎兵を率いて忠州の弾琴台に背水の陣を敷いたが、鉄砲に敗れて死んだ。',
  i_il: '巡辺使。尚州で日本軍を迎え撃ったが敗れ、北へ退いた。',
  jeong_bal: '釜山鎮の僉使。上陸した日本軍を最初に迎え撃ち、城とともに死んだ。',
  song_sanghyeon: '東萊府使。「戦って死ぬは易く、道を貸すは難し」と答えて城を守り、朝服のまま死んだ。',
  kim_simin: '晋州牧使。晋州城に寄せた大軍を退けたが、その傷がもとで死んだ。',
  gwon_yul: '全羅道巡察使、のち都元帥。幸州山城で寡兵をもって大軍を退けた。',
  gwak_jaeu: '慶尚道の義兵将。紅い衣をまとって神出鬼没に戦い、「紅衣将軍」と呼ばれた。',
  kim_cheonil: '全羅道の義兵将。第二次晋州城の戦いで城とともに死んだ。',
  go_gyeongmyeong: '全羅道の老儒。義兵を集めて錦山で戦い、死んだ。',
  hyujeong: '西山大師。七十を過ぎて僧兵を集め、平壌の奪回に加わった。',
  yujeong: '四溟大師。休静の弟子の僧将。のちに日本へ渡り、捕らえられた人々を連れ帰った。',
  zu_chengxun: '遼東の副総兵。最初の援軍を率いて平壌を攻めたが、敗れて退いた。',
  li_rusong: '提督。遼東の名将李成梁の子。大軍と大砲で平壌を取り戻したが、碧蹄館で敗れた。',
  ma_gui: '提督。のちの再出兵のとき、明の陸軍を率いた。',
  shen_weijing: '遊撃。商人あがりで日本との講和を取り持ったが、偽りの交渉が露見して処刑された。',
  yang_hao: '経理。のちの再出兵のとき、明軍の総督を務めた。',
};
