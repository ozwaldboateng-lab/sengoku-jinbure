// 城の種類（縄張り）。1560年ごろの姿をおおまかに分けた暫定値
// yakata 館（平地の居館） / toride 砦（小規模な城・国人の城） / hira 平城 / hirayama 平山城 / yama 山城
export type CastleType = 'yakata' | 'toride' | 'hira' | 'hirayama' | 'yama';

export const CASTLE_TYPE: Record<string, CastleType> = {
  // 東海
  kiyosu: 'hira', inuyama: 'hirayama', narumi: 'hirayama', kariya: 'hira', sunpu: 'yakata', kakegawa: 'hirayama', hikuma: 'hirayama',
  yoshida: 'hira', okazaki: 'hirayama', dabu: 'toride',
  // 美濃・飛騨
  inabayama: 'yama', ogaki: 'hira', iwamura: 'yama', gujo: 'yama', sakurabora: 'yakata', takahara: 'toride',
  // 甲信
  tsutsujigasaki: 'yakata', iwadono: 'yama', fukashi: 'hira', takato: 'hirayama', kaizu: 'hira', komoro: 'hirayama', kisofukushima: 'toride', iida: 'hirayama',
  // 越後・北陸
  kasugayama: 'yama', sakado: 'yama', tochio: 'yama', honjo: 'yama', iiyama: 'hirayama', toyama_c: 'hira', matsukura: 'yama', nanao: 'yama',
  kanazawa: 'hira', ichijodani: 'yakata', kanegasaki: 'toride', ono: 'yama', nochiseyama: 'yama',
  // 関東
  odawara: 'hirayama', nirayama: 'hirayama', tamanawa: 'hirayama', edo: 'hirayama', kawagoe: 'hira', takiyama: 'hirayama', hachigata: 'hirayama',
  matsuyama_m: 'hirayama', koga: 'hira', motosakura: 'hirayama', oshi: 'hira', sekiyado: 'hira', kururi: 'yama', sanuki_k: 'hirayama', otaki: 'hirayama',
  okamoto: 'toride', ota: 'hirayama', mito: 'hirayama', odajo: 'hira', yuki: 'hira', utsunomiya: 'hira', karasawa: 'yama', karasuyama: 'yama',
  minowa: 'hirayama', umayabashi: 'hira', kanayama: 'yama', iwatsuki: 'hira',
  // 奥羽
  yonezawa: 'hira', yanagawa: 'hira', yamagata: 'hira', kurokawa: 'hira', sannohe: 'yama', nejo: 'hira', ishikawa: 'hirayama', hiyama: 'yama', minato: 'toride',
  teraike: 'hirayama', myo: 'hira', odaka: 'hirayama', odate_i: 'hirayama', sukagawa: 'hira', miharu: 'yama', shirakawa: 'yama', koshuji: 'hirayama',
  yokote: 'hirayama', oura: 'yama',
  // 近江・畿内
  odani: 'yama', kannonji: 'yama', hino: 'hirayama', sawayama: 'yama', kyo: 'yakata', iimoriyama: 'yama', akutagawa: 'yama', shigisan: 'yama',
  kishiwada: 'hira', yagi: 'yama', koshimizu: 'hirayama', shozui: 'yakata', sogo: 'toride', sumoto: 'yama', ishiyama: 'hirayama', takaya: 'hira',
  hiro: 'toride', saika: 'toride', negoro: 'toride', shingu: 'toride', tsutsui: 'hira', kuroi: 'yama', kameyama: 'hirayama', hijiyama: 'toride',
  tashiro: 'toride', kiriyama: 'yama', okawachi: 'hirayama', takebeyama: 'yama',
  // 中国
  konosumiyama: 'yama', fuse: 'yama', oshio: 'yama', tatsuno: 'yama', miki: 'hirayama', gochaku: 'hira', tenjinyama: 'yama', numa: 'hira',
  bitchu_matsuyama: 'yama', gassantoda: 'yama', yamabuki: 'toride', odaka_h: 'hirayama', takata: 'yama', koriyama: 'yama', niitakayama: 'yama',
  hinoyama: 'yama', konomine: 'yama', katsuyama: 'yama', kannabe: 'yama', masuda: 'yama',
  // 四国
  yuzuki: 'hirayama', kurose: 'yama', jizogatake: 'yama', amagiri: 'yama', oko: 'toride', asakura_t: 'toride', motoyama: 'toride', aki_t: 'toride', nakamura: 'toride',
  // 九州
  funai: 'yakata', tachibana: 'yama', yanagawa_k: 'hira', kumamoto: 'hirayama', kawaradake: 'yama', muranaka: 'hira', hinoe: 'hirayama', hirado: 'yakata',
  sanjo: 'hirayama', hitoyoshi: 'hirayama', iwao: 'toride', uto: 'hirayama', tonokori: 'yama', obi: 'hirayama', uchi: 'yakata', izumi_k: 'yama', chosa: 'yama',
  takayama_o: 'yama',
};

// 背後に詰城を持つ館（自動決着の守りと城兵の粘りに補正）
export const TSUME: Record<string, string> = {
  tsutsujigasaki: '要害山城', ichijodani: '一乗谷城山', sunpu: '賤機山城', funai: '高崎山城', uchi: '東福寺城',
};
