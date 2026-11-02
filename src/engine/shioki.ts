// 仕置（取った城の治め方）と残り火: 撫育は治安の戻りが遅いが土地を保つ。見せしめは治安がすぐ戻るが人が逃げる。
// 焼き討ちは火種を断つが土地と評判を失う。残り火は治安の低い城で燃え上がり、城兵が少なければ城を奪い返される。
import { temperOf } from './lines';
import { TRAITS } from '../data/traits';
import { SO_EMBER } from './traits';
import { MONTO_CASTLE } from './rules';
import * as R from './rules';
import { taxDef } from './invest';
import { captureCastle, checkVictory, eliminateClan, nearestOwnCastle } from './ops';
import { addLog, castleKoku, clanCastles, clanName, garrisonMax, hostile, rand } from './state';
import type { Castle, GameState, General } from './types';

// 落としたときの残り火
export function setEmber(s: GameState, c: Castle, old: string | null) {
  const alive = !!old && !!s.clans[old]?.alive;
  c.ember = old === null ? R.EMBER_KOKUJIN : Math.min(R.EMBER_MAX, R.EMBER_BASE + (alive ? R.EMBER_OLD_ALIVE : 0) + (old === R.IKKI_CLAN || c.id === MONTO_CASTLE ? R.EMBER_MONTO : 0));
  // 旧主が取り戻したなら火種は消える
  if (c.oldOwner === c.owner) c.ember = 0;
  c.oldOwner = old;
}
// 大将の気性で選ぶ（AI・方面軍団・委任）
export function shiokiOf(g: General | undefined, c: Castle): R.Shioki {
  const e = c.ember ?? 0, monto = c.oldOwner === R.IKKI_CLAN;
  switch (g ? temperOf(g) : 'steady') {
    case 'bold': return e >= 40 ? (monto ? 'yakiuchi' : 'misesime') : 'misesime';
    case 'gentle': return 'buiku';
    case 'wise': return e >= 60 ? 'misesime' : 'buiku';
    default: return e >= 50 ? 'misesime' : 'buiku';
  }
}
export function applyShioki(s: GameState, c: Castle, kind: R.Shioki, by?: General) {
  if (kind === 'misesime') {
    c.chian = Math.min(100, c.chian + R.MISESIME.chian); c.dev *= R.MISESIME.dev; c.cdev *= R.MISESIME.dev; c.ember = (c.ember ?? 0) * R.MISESIME.ember;
  } else if (kind === 'yakiuchi') {
    c.chian = Math.max(c.chian, R.YAKIUCHI.chian); c.dev *= R.YAKIUCHI.dev; c.cdev *= R.YAKIUCHI.dev; c.ember = 0;
    if (c.owner) s.clans[c.owner].prestige = Math.max(0, s.clans[c.owner].prestige - R.YAKIUCHI.prestige);
  }
  s.shioki = (s.shioki ?? []).filter((x) => x.castle !== c.i);
  const who = by ? `${by.name}は` : '';
  const msg = kind === 'buiku' ? `${who}${c.name}の民を撫育することにした。` : kind === 'misesime' ? `${who}${c.name}で見せしめを行った。治安は戻ったが、逃げ出す者が出た。` : `${who}${c.name}を焼き討ちにした。火種は断ったが、土地は荒れ、悪名が立った。`;
  if (c.owner === s.player || kind !== 'buiku') addLog(s, msg, 'info', c.owner === s.player);
}

// 城が落ちたとき（ops.captureCastle から）: プレイヤーは翌月の評定終了まで決められる。AIはその場で決める
export function onCaptured(s: GameState, c: Castle, old: string | null) {
  setEmber(s, c, old);
  if (!c.owner) return;
  if (c.owner === s.player) { (s.shioki ??= []).push({ castle: c.i, turn: s.turn }); return; }
  const L = s.clans[c.owner].leader;
  applyShioki(s, c, shiokiOf(L ? s.generals[L] : undefined, c));
}
// 決めずにいた城: 方面の城なら軍団長が、それ以外は撫育（評定終了の初めに）
export function settleShioki(s: GameState, leaderFor: (c: Castle) => General | undefined) {
  for (const p of [...(s.shioki ?? [])]) {
    const c = s.castles[p.castle];
    if (c.owner !== s.player) { s.shioki = (s.shioki ?? []).filter((x) => x !== p); continue; }
    if (s.turn <= p.turn) continue; // 落とした月の評定終了ではまだ
    const g = leaderFor(c);
    applyShioki(s, c, g ? shiokiOf(g, c) : 'buiku', g);
  }
}

// 毎月: 残り火が冷め、治安の低い城では燃え上がる
export function monthlyEmber(s: GameState) {
  for (const c of s.castles) {
    if (!c.ember || !c.owner) continue;
    const gov = c.governor ? s.generals[c.governor] : null;
    c.ember = Math.max(0, c.ember - R.emberDecay(c.chian, gov?.cha ?? 40) * (gov && TRAITS[gov.id] === 'so' ? SO_EMBER : 1) * taxDef(s, c.owner).ember); // 僧の城主なら倍の速さで鎮まる。年貢が軽いと早く鎮まる
    if (c.chian >= R.EMBER_FLARE_CHIAN || rand(s) >= R.emberFlare(c.ember)) continue;
    const size = R.flareSize(c.ember, castleKoku(c));
    const old = c.oldOwner && s.clans[c.oldOwner]?.alive && hostile(s, c.owner, c.oldOwner) ? c.oldOwner : null;
    const mine = c.owner === s.player;
    const held = Object.values(s.armies).filter((a) => a.hex === c.hex && a.clan === c.owner).reduce((t, a) => t + a.troops, 0); // 城にいる自家の軍勢も押さえに加わる
    if (c.garrison + held < size) {
      addLog(s, `${c.name}で残り火が燃え上がった。${old ? `旧主${clanName(s, old)}家の残党` : '土豪'}が蜂起し、城を奪われた。`, 'castle', mine);
      const owner = c.owner;
      if (old) captureCastle(s, c, old);
      else {
        // 国人の城に戻る: 城にいた武将は近くの自城へ
        c.owner = null; c.governor = null;
        for (const g of Object.values(s.generals)) if (g.clan === owner && g.loc === c.i && g.status !== 'army') { const h = nearestOwnCastle(s, owner, c.hex); if (h) { g.loc = h.i; if (g.status === 'governor') g.status = 'free'; } }
        c.garrison = Math.round(garrisonMax(c) * 0.5);
        if (!clanCastles(s, owner).length) eliminateClan(s, owner, null);
        checkVictory(s);
      }
      c.ember = 0;
    } else {
      c.garrison -= size; c.chian = Math.max(0, c.chian - 10); c.dev = Math.max(0.7, c.dev - 0.03); c.ember = Math.max(0, c.ember - 20);
      addLog(s, `${c.name}で残り火が燃え上がり、${size.toLocaleString()}人が蜂起した。城兵が押さえ込んだ。`, 'castle', mine);
    }
  }
}
