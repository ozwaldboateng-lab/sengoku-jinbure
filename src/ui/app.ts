// 画面の組み立てと操作
import { defenderSupports, estimate, supportArmies } from '../engine/combat';
import { endTurn } from '../engine/game';
import { HEXES, PROVINCES, NEIGHBORS, TERRAIN_NAME, hexCenter, hexDist, isForeignHex } from '../engine/map';
import { attackTargets, pathTo, reachable, type Target } from '../engine/move';
import { canPlot, capital, checkVictory, doPlot, naioActive, plotChance, disband, execute, formArmy, moveArmy, recruit, recruitChance, recruitRonin, release, roninChance } from '../engine/ops';
import * as R from '../engine/rules';
import { migrateMap, newGame } from '../engine/setup';
import { newKarairiGame, S1592 } from '../engine/s1592';
import { fillArmy, fillBlock, reshuffleAt } from '../engine/reorg';
import { FUSHIN_COST, fushin, fushinBlock, genHex, govTrait, NINJA_COST, NINJA_NAME, NINJA_RANGE, ninjaBlock, ninjaChance, ninjaDo, ninjaHead, ninjaReach, setNinjaHead, TEA_COST, TEA_GUESTS, TEA_ON, teaBlock, teaCeremony, teaGrade, traitName, traitOf, type NinjaAct } from '../engine/traits';
import { TRAIT_NOTE } from '../data/traits';
import { FACE_ON, mergeArmies, mergeBlock, mergeLeaders, mergePreview, RIVAL_ON, splitArmy, splitBlock } from '../engine/reorg';
import {
  addLog, hostile, armyCombat, armyStats, ashiOf, clanAshi, drillOf, castleAt, castleKoku, clanArmies, clanCapacity, clanCastles, clanKoku, clanName, clanTroops, clanUpkeep,
  castleDef, dateLabel, garrisonMax, treatyOf, hexOwner, initialMorale, maxTroops, occupancy, troopMult,
} from '../engine/state';
import type { Army, BattleReport, BigEvent, Castle, Front, GameState, General, Item } from '../engine/types';
import { openingOn, openTitleScreen, setOpeningOn, titleOpen } from './title';
import { mood, renderPreview, setSound, sfx, soundSettings, wireSound, type Mood } from './sound';
import { playScene } from './scene';
import { OPENING_PEOPLE } from '../data/opening';
import { ANECDOTES, STAT_NAME } from '../data/anecdotes';
import { fillNames, fireAnecdote } from '../engine/anecdote';
import { temperOf } from '../engine/lines';
import type { OpeningBeat } from '../data/openings';
import { armySupply, carryOf, castleSupply, cutOff, hyoroBugyo, initStores, isPort as isCoast, storeMax, storeOf, supplyRange } from '../engine/supply';
import { CHIAN_RAMP, EMBER_RAMP, FRONT_COLORS, HEX_ALPHA, MAP_MODES, MB, MapView, SUP, type MapMode } from './render';
import { cancelOrder, orderAttack, orderFor, ordersAt } from '../engine/orders';
import { breakTreaty, clanPower, DIP, DIP_NAME, evaluate, neighbors, propose, setProposalHook, type DipKind } from '../engine/diplomacy';
import { getBattleStyle, openBattle, setBattleStyle, UNIT_STYLE_NAME, type UnitStyle } from './battle';
import { setBattleHook } from '../engine/hooks';
import { PORTRAITS } from '../data/portraits';
import { besieged, comCap, devRate, enactRakuichi, rakuichiBlock } from '../engine/economy';
import { MINE_KIND_NAME, PRODUCT_KIND_NAME } from '../data/economy';
import { REGION_ORDER, regionOf } from '../data/regions';
import { FORT_NAME, TAX, fortBlock, fortCost, fortMonths, fortOf, invest, investBlock, investCost, setTax, shindenBlock, shindenCost, shindenDone, startFort, startShinden, taxOf, type InvestRole, type Tax } from '../engine/invest';
import { chianDelta, mobilizeDrop, mobilizeRate } from '../engine/policy';
import { buyCourt, courtBlock, courtName, courtOf, holderOf } from '../engine/court';
import { appointShugodai, dismissShugodai, kanBlock, kanCost, kanName, kanOf, recommendKan, shugodaiBlock, shugodaiOf, shugoProvs } from '../engine/kan';
import { DELEGATE_NAME, delegateOf, type DelegateKey } from '../engine/delegate';
import { ikkiBlock, ikkiSize, raiseIkki } from '../engine/ikki';
import {
  armGuns, bonusOf, buyGuns, buyItem, buyRice, castleCom, castleMine, minesAt, productsAt, clanMine, hasProduct, clanGuns, clanIncome, clanItems, equip, gunCap, gunPrice, hasGunSource, itemLabel, itemPrice, marketItems, migrateMoney,
  ricePrice, sellRice, unequip, ashiRoom, hireAshi } from '../engine/money';
import { ageOf, migrateLife } from '../engine/life';
import { applyShioki } from '../engine/shioki';
import {
  bk, candidates, demandShussi, donate, doShussi, inJurisdiction, meibun, meibunLabel, migrateBakufu, orderBlock, orderChance, postBlock, postChance, postCost, postHolder, postName,
  provName, requestOrder, requestPost, shogunClan, shussiBlock, sponsor, sponsorBlock, trustOf, type Post,
} from '../engine/bakufu';
import { OFFICES, type OfficeId } from '../data/bakufu';
import { answerKan, answerReturn, bondsOf, exile, giverName, initBonds, judgeQuarrel, usurp } from '../engine/bushi';
import { BOND_NAME } from '../data/bonds';
import { heirCands, heirOf, regentCands, regentOf } from '../engine/katoku';
import { dueOf, goodwill, kanjo, kanjoBlock, kazo, kazoCost, migrateOn, onLabel, onOf, vassalsOf } from '../engine/on';
import { promoteBlockOf, promoteOne } from '../engine/ranks';
import { envoyLine, lineFor, type Scene, type SceneLine } from '../engine/lines';
import { PERSONAS, personaActive, type EnvoyScene } from '../data/envoys';
import { peaceBlock, peaceChance, seekPeace, W, withdraw } from '../engine/karairi';
import { ADMIRALS as KADM, navalWinP, setNavalHook, type NavalChoice, type NavalInfo } from '../engine/karairi';
import { ADMIRALS, buildShips, crossingEnds, crossingOpen, crossBlock, escortCut, foodCap, K, karairiOn, setEscort, startKarairi, syncCrossings, troopCap, troopsLeft } from '../engine/karairi';
import { ENDING_ART } from '../data/ending';
import { SEKAIZU_ART } from '../data/sekaizu';
import { BUSAN_ART, FUYU_ART, GIHEI_ART, KOWA_ART, NAGOYA_ART, SHIMAKAGE_ART } from '../data/karairiArt';
import { HYOJO_ART, MINATO_ART } from '../data/scenes';
import { SCENE_LABEL } from '../data/lines';
import { absorb as absorbClan } from '../engine/diplomacy';
import { captureCastle, killGeneral } from '../engine/ops';
import { rebelFront } from '../engine/on';
import {
  baishinBlock, baishinOf, delegatedArmy, dissolveFront, fiefCap, fiefKoku, fiefOf, frontArmies, frontById, frontName, frontOfArmy, frontOfCastle, frontsOf, grantBlock, grantCastle, heirCands as fiefHeirCands,
  leaderCands, makeBaishin, makeDirect, migrateFiefs, policyOf, removeCastle, setFrontBoss, setFrontPolicy, setHeir, targetCands, targetLabel, vacantFiefs,
} from '../engine/fronts';
import {
  answerMission, armCannon, baptized, buyShipCannon, buyShipGuns, buyShipItem, clanCannon, clanPorts, initNanban, isPort, misDef, missionaryActive, missionBlock, missionHome, missionLabel,
  misName, nanbanItemPrice, portName, portOwner, setMission, shipCannon, shipGuns, shipItems, shipOdds, shipsOf,
  isKaraPort, karaPortName, karasenAt, silverTrade,
} from '../engine/nanban';
import { MISSIONARIES } from '../data/nanban';
import { fame, hire, offerChance, refuse } from '../engine/ronin';
import { attach, attachBlock, childrenOf, directOf, leaveArmy, levelOf, migrateCorps, staffOf, treeOf } from '../engine/corps';
import { BIO } from '../data/bios';
import { KOREA_BIOS } from '../data/korea';
import { roleOf, bugyoCoef, bugyoOf, bugyoSlots, canBugyo, setBugyo, canTsukai, rankName, setTsukai, tsukaiLabel, tsukaiOf, tsukaiSlots, migrateRanks } from '../engine/ranks';

const SAVE_KEY = 'sengoku1560:save:v1';
const AUTO_KEY = 'sengoku1560:auto:v1';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const fmt = (n: number) => Math.round(n).toLocaleString('ja-JP');
const man = (koku: number) => `${koku.toFixed(1)}万石`;

type PanelMode = { kind: 'none' } | { kind: 'army'; id: number } | { kind: 'castle'; i: number } | { kind: 'hex'; i: number } | { kind: 'attack'; army: number; target: Target };

let s: GameState | null = null;
let view: MapView;
let mode: PanelMode = { kind: 'none' };
let busy = false;
let picker: null | 'governor' | 'form' | 'plot' = null;

function store(key: string, value: string | null) {
  try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value); return true; } catch { return false; }
}
function load(key: string): GameState | null {
  try { const t = localStorage.getItem(key); const st = t ? (JSON.parse(t) as GameState) : null; if (st) { migrateRanks(st); migrateMoney(st); migrateLife(st); migrateCorps(st); initNanban(st); migrateOn(st); migrateFiefs(st); initBonds(st); migrateBakufu(st); migrateMap(st); initStores(st); st.revealed = (st.revealed ?? []).filter((id) => st.generals[id]); } return st; } catch { return null; }
}

export function boot(saved?: { state?: GameState }) {
  view = new MapView($('map') as HTMLCanvasElement);
  view.onHexClick = onHexClick;
  $('btn-end').onclick = () => doEndTurn();
  setBattleHook(async (st, a, t, joined) => {
    $('toast').hidden = true;
    const r = await openBattle(st, a, t, joined);
    refresh();
    return r;
  });
  for (const m of MENUS) $(`btn-${m.key}`).onclick = () => openMenu(m.key);
  $('btn-todo').onclick = () => openTodo();
  $('stats').addEventListener('click', (e) => { const d = (e.target as HTMLElement).closest('[data-tip]') as HTMLElement | null; if (d && statTip(d.dataset.tip!)) toast(`${d.dataset.tip}: ${statTip(d.dataset.tip!)}`); });
  setProposalHook((st, from, kind) => askPlayer(st, from, kind));
  setNavalHook((st, info) => askNaval(st, info));
  $('zin').onclick = () => view.zoomBy(1.3);
  $('zout').onclick = () => view.zoomBy(1 / 1.3);
  $('zhome').onclick = () => { if (s) { const c = capital(s, s.player); if (c) view.centerOn(c.hex); } };
  $('mapmode').innerHTML = MAP_MODES.map(([k, n]) => `<button type="button" data-mode="${k}" aria-pressed="false">${n}</button>`).join('');
  $('mapmode').addEventListener('click', (e) => { const b = (e.target as HTMLElement).closest('button[data-mode]') as HTMLElement | null; if (b) setMapMode(b.dataset.mode as MapMode); });
  try { const m = localStorage.getItem('sengoku-mapmode'); if (m && MAP_MODES.some(([k]) => k === m)) view.mode = m as MapMode; } catch { /* 保存できなくても動く */ }
  try { const st = localStorage.getItem('sengoku-armystyle'); if (st === 'round' || st === 'hayashi') view.armyStyle = st; } catch { /* 保存できなくても動く */ }
  // 下絵とヘックスの濃さ（なし・濃・中・淡）
  try { const a = localStorage.getItem('sengoku-hexalpha'); if (a !== null) view.hexAlpha = a === 'off' ? null : HEX_ALPHA.find(([, v]) => v === +a)?.[1] ?? view.hexAlpha; } catch { /* 保存できなくても動く */ }
  const renderBase = () => { $('mapbase').innerHTML = `<span>下絵</span>${HEX_ALPHA.map(([n, v]) => `<button type="button" data-alpha="${v ?? 'off'}" aria-pressed="${v === view.hexAlpha}" title="${v === null ? '下絵を敷かない（ヘックスだけ）' : `本物の海岸線の上に、ヘックスを${n === '濃' ? '濃く' : n === '中' ? '半ば透かして' : '薄く'}重ねる`}">${n}</button>`).join('')}`; };
  renderBase();
  $('mapbase').addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest('button[data-alpha]') as HTMLElement | null; if (!b) return;
    const a = b.dataset.alpha === 'off' ? null : +b.dataset.alpha!;
    view.setHexAlpha(a); renderBase();
    try { localStorage.setItem('sengoku-hexalpha', a === null ? 'off' : String(a)); } catch { /* 保存できなくても動く */ }
  });
  $('modal-close').onclick = () => closeModal();
  // 押せない札（触れる画面）は理由を出すだけ
  document.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest('button[aria-disabled="true"]') as HTMLButtonElement | null;
    if (!b) return;
    e.preventDefault(); e.stopImmediatePropagation();
    toast(b.title || '今は選べない');
  }, true);
  $('panel').addEventListener('click', onPanelClick);
  // 音: 最初の操作で鳴らし始め、押した札・ボタンには小さな音
  wireSound();
  document.addEventListener('click', (e) => { if ((e.target as HTMLElement).closest('button, [data-act], .op-box, summary')) sfx('tick'); }, true);
  $('modal-body').addEventListener('click', onModalClick);
  // 地方ごとにたたんだ一覧の開閉を覚える（描き直しても保つ）
  $('modal-body').addEventListener('toggle', (e) => { const d = e.target as HTMLDetailsElement; const k = d.querySelector('summary')?.dataset.id; if (k) regOpen.set(k, d.open); }, true);
  // 城の札: 地図で選んだ城を家臣に与える
  $('panel').addEventListener('change', (e) => {
    const el = e.target as HTMLSelectElement;
    if (el.dataset.fgrantc && el.value && s) { const c = s.castles[+el.dataset.fgrantc], g = s.generals[el.value]; const why = grantBlock(s, g, c); if (why) toast(why); else { grantCastle(s, g, c); toast(`${g.name}に${c.name}を与えた`); cutin(s, g, 'chigyo', { castle: c.name }); } refresh(); }
  });
  $('modal-body').addEventListener('change', (e) => {
    const t0 = e.target as HTMLSelectElement;
    if (t0.id === 'sel-ninja-head' && s) { setNinjaHead(s, s.player, t0.value || null); openMenu(); return; }
    if (t0.id === 'sel-ninja-act') { ninjaSel.act = t0.value as NinjaAct; ninjaSel.target = ''; openMenu(); return; }
    if (t0.id === 'sel-ninja-target') { ninjaSel.target = t0.value; openMenu(); return; }
    if (t0.id === 'sel-tea-host') { teaHost = t0.value; openMenu(); return; }
    const el = e.target as HTMLSelectElement;
    if (el.id === 'sel-gift') { dipGift = el.value || null; openMenu(); }
    if (el.dataset.escort !== undefined && s && karairiOn(s)) { const ids = [...s.karairi.escort]; ids[+el.dataset.escort] = el.value; setEscort(s, ids.filter((x, i, arr) => x && arr.indexOf(x) === i)); openMenu(); }
    if (el.dataset.budget && s) {
      const me = s.clans[s.player], v = +el.value;
      if (el.dataset.budget === 'mobilize') me.mobilize = v; else me.budget[el.dataset.budget as 'chisui' | 'hodo'] = v;
      refresh(); openMenu();
    }
    if (el.dataset.corps && el.value && s) {
      const [aid, pid] = el.dataset.corps.split(':'); const army = s.armies[+aid], g = s.generals[el.value];
      if (army && g && !attachBlock(s, army, pid, g)) { attach(s, army, pid, g); toast(`${g.name}を${s.generals[pid].name}の下に置いた`); }
      refresh(); openMenu();
    }
    if (el.dataset.gov && el.value && s && frontOfCastle(s, s.castles[+el.dataset.gov]) && !frontOfCastle(s, s.castles[+el.dataset.gov])!.vacant) { toast('領の城の城主は領主が決める'); reopen(); }
    else if (el.dataset.gov && el.value && s) {
      const c = s.castles[+el.dataset.gov], g = s.generals[el.value];
      if (c.governor) s.generals[c.governor].status = 'free';
      c.governor = g.id; g.status = 'governor'; g.loc = c.i;
      toast(`${g.name}を${c.name}の城主に任じた`); refresh(); openMenu();
    }
    if ((el.dataset.heir !== undefined || el.dataset.regent !== undefined || el.dataset.will !== undefined) && s) {
      const C = s.clans[s.player];
      if (el.dataset.heir !== undefined) C.heir = el.value || undefined;
      if (el.dataset.regent !== undefined) C.regent = el.value || undefined;
      if (el.dataset.will !== undefined) C.will = (el.value || undefined) as typeof C.will;
      toast('家督の備えを定めた');
      reopen();
    }
    if (el.dataset.fpol && s) { const f = frontById(s, +el.dataset.fpol); if (f) { setFrontPolicy(s, f, el.value as 'attack' | 'defend' | 'build'); toast(`${frontName(s, f)}の方針を${R.FRONT_POLICY_NAME[f.policy]}にした`); } refresh(); openMenu(); }
    if (el.dataset.ftgt !== undefined && s) { const f = frontById(s, +el.dataset.ftgt); if (f) { setFrontPolicy(s, f, 'attack', el.value || null); toast(`${frontName(s, f)}の目標: ${targetLabel(s, f)}`); } refresh(); openMenu(); }
    if (el.dataset.vol) { setSound({ [el.dataset.vol]: +el.value / 100 } as { vm?: number; vs?: number }); if (el.dataset.vol === 'vs') sfx('ponn'); }
    if (el.dataset.vq !== undefined && s) { vasFilter.q = el.value.trim(); vasFilter.page = 1; reopen(); }
    if (el.dataset.vrank !== undefined && s) { vasFilter.rank = el.value; vasFilter.page = 1; reopen(); }
    if (el.dataset.sgd && el.value && s) { const g = s.generals[el.dataset.sgd]; const why = shugodaiBlock(s, g, el.value); if (why) toast(why); else { appointShugodai(s, g, el.value); toast(`${g.name}を${el.value}の守護代に任じた`); cutin(s, g, 'ninkan', { kan: `${el.value}守護代` }); } refresh(); reopen(); }
    if (el.dataset.sgdp && el.value && s) { const g = s.generals[el.value], pv = el.dataset.sgdp; const why = shugodaiBlock(s, g, pv); if (why) toast(why); else { appointShugodai(s, g, pv); toast(`${g.name}を${pv}の守護代に任じた`); cutin(s, g, 'ninkan', { kan: `${pv}守護代` }); } refresh(); reopen(); }
    if (el.dataset.fbaiG && el.value && s) { const f = frontById(s, +el.value), g = s.generals[el.dataset.fbaiG]; if (f && g) { const why = baishinBlock(s, g, f); if (why) toast(why); else { makeBaishin(s, g, f); toast(`${g.name}を${s.generals[f.leader].name}の陪臣とした`); } } refresh(); reopen(); }
    if (el.dataset.fbai && el.value && s) { const f = frontById(s, +el.dataset.fbai), g = s.generals[el.value]; if (f && g) { const why = baishinBlock(s, g, f); if (why) toast(why); else { makeBaishin(s, g, f); toast(`${g.name}を${s.generals[f.leader].name}の陪臣とした`); } } refresh(); reopen(); }
    if (el.dataset.fgrant && el.value && s) { const g = s.generals[el.dataset.fgrant], c = s.castles[+el.value]; const why = grantBlock(s, g, c); if (why) toast(why); else { grantCastle(s, g, c); toast(`${g.name}に${c.name}を与えた`); cutin(s, g, 'chigyo', { castle: c.name }); } refresh(); reopen(); }
    if (el.dataset.govg && el.value && s) {
      const c = s.castles[+el.value], g = s.generals[el.dataset.govg];
      if (c.governor) s.generals[c.governor].status = 'free';
      c.governor = g.id; g.status = 'governor'; g.loc = c.i;
      toast(`${g.name}を${c.name}の城主に任じた`); refresh(); reopen();
    }
    if (el.dataset.equipg && el.value && s) {
      const g = s.generals[el.dataset.equipg], it = s.items[el.value];
      equip(s, g, it); toast(`${g.name}に「${it.name}」を下賜した`); cutin(s, g, 'gift', { item: it.name }); refresh(); reopen();
    }
    if (el.dataset.equip && s) {
      const it = s.items[el.dataset.equip];
      if (el.value) { const g = s.generals[el.value]; equip(s, g, it); toast(`${g.name}に「${it.name}」を下賜した`); cutin(s, g, 'gift', { item: it.name }); } else unequip(s, it);
      refresh(); openMenu();
    }
  });
  document.addEventListener('keydown', (e) => {
    if ((e.target as HTMLElement).tagName === 'SELECT' || titleOpen()) return;
    if (e.key === 'Escape') { if (!$('modal').hidden && $('modal-close').style.display !== 'none') closeModal(); else select({ kind: 'none' }); }
    if (s && !busy && ($('modal').hidden || menuShown) && /^[1-6]$/.test(e.key)) { openMenu(MENUS[+e.key - 1].key); return; }
    if (s && !busy && $('modal').hidden && (e.key === 't' || e.key === 'T') && todoCount(s)) { openTodo(); return; }
    if (!s || busy || !$('modal').hidden) return;
    if (e.key === 'm' || e.key === 'M') { const i = MAP_MODES.findIndex(([k]) => k === view.mode); setMapMode(MAP_MODES[(i + 1) % MAP_MODES.length][0]); }
    if (e.key === 'n' || e.key === 'N') nextArmy();
    if (e.key === 'e' || e.key === 'E') doEndTurn();
  });
  window.claude?.hot?.snapshot?.(() => ({ state: s }));
  (window as unknown as { __sengoku: unknown }).__sengoku = {
    get state() { return s; }, view, center: hexCenter,
    renderSound: (what: string, sec: number) => renderPreview(what as Parameters<typeof renderPreview>[0], sec), // 試聴用の書き出し
    kill: (id: string) => { if (s) { killGeneral(s, s.generals[id], 'テスト'); refresh(); } }, // テスト用: 武将を討ち死にさせる
    rebel: (fid: number) => { if (s) { const f = frontById(s, fid); if (f) rebelFront(s, f); refresh(); } }, // テスト用: 領の謀反
    capture: (cid: string) => { if (s) { const c = s.castles.find((x) => x.id === cid); if (c) captureCastle(s, c, s.player); refresh(); } }, // テスト用: 城を落としたことにする
    anecdoteIds: () => ANECDOTES.map((a) => a.id), anecdoteWho: (id: string) => ANECDOTES.find((a) => a.id === id)?.who ?? [],
    anecdote: (id: string) => { const a = ANECDOTES.find((x) => x.id === id); if (s && a) fireAnecdote(s, a); }, // テスト用: 逸話を起こす
    playEvents: () => new Promise<void>((res) => { if (s) playEvents(s, res); else res(); }), // テスト用: たまった出来事の場面を流す
    surrender: (loser: string) => { if (s) { absorbClan(s, s.player, loser); refresh(); } }, // テスト用: 降伏勧告が通ったことにする
    supply: (id: number) => (s && s.armies[id] ? armySupply(s, s.armies[id]) : null), neighbors: (h: number) => NEIGHBORS[h],
    // テスト用: 自軍の部隊で隣の敵部隊と合戦を開く
    battle: (armyId: number, enemyId: number) => { const st = s!; const e = st.armies[enemyId]; return openBattle(st, st.armies[armyId], { kind: 'army', hex: e.hex, army: e }).then(() => refresh()); },
    siege: (armyId: number, castle: number) => { const st = s!; return openBattle(st, st.armies[armyId], { kind: 'castle', hex: st.castles[castle].hex, castle }).then(() => refresh()); },
  };
  if (saved?.state) { startWith(saved.state); return; }
  openTitle();
}

// 地図の曲: 戦のあった月（先月・今月）や、敵が当家の城に迫っていれば戦の曲、ほかは平時の曲
function mapMood(st: GameState) {
  const C = st.clans[st.player];
  if (st.karairi?.active) { mood('war'); return; }
  const fighting = (C.foughtTurn ?? -9) >= st.turn - 2 || Object.values(st.armies).some((a) => a.clan !== st.player && hostile(st, a.clan, st.player) && clanCastles(st, st.player).some((c) => hexDist(a.hex, c.hex) <= 1));
  mood(fighting ? 'war' : 'peace');
}
function startWith(state: GameState) {
  // 旧版のセーブにも外交の欄を足す
  state.treaties ??= []; state.dipTried ??= {}; state.lastClash ??= {}; state.orders ??= []; state.revealed = (state.revealed ?? []).filter((id) => state.generals[id]);
  s = state;
  mapMood(state);
  migrateMap(s); syncCrossings(s); // 唐入りのあいだだけ渡海の路を開く
  view.state = s;
  mode = { kind: 'none' };
  closeModal();
  const c = capital(s, s.player);
  if (c) view.centerOn(c.hex, Math.min(2.4, Math.max(1.4, view.w / 520)));
  refresh();
}

// ───────── 更新 ─────────
function refresh() {
  if (!s) return;
  const st = s;
  if (!st.over) queueMicrotask(() => { if (s === st && !st.over) karairiScenes(st); }); // 唐入りの節目の場面（一度だけ）
  const me = st.clans[st.player];
  $('date').textContent = `${dateLabel(st)}（${st.year}）`;
  const cap = clanCapacity(st, st.player), troops = clanTroops(st, st.player);
  $('stats').innerHTML = [
    `<div class="clan-chip"><span class="swatch" style="background:${me.color}"></span>${esc(me.name)}家</div>`,
    stat('石高', man(clanKoku(st, st.player))),
    stat('兵糧', `${fmt(me.food)}石`),
    stat('金', `${fmt(me.gold)}貫`),
    stat('鉄砲', `${fmt(clanGuns(st, st.player))}丁`),
    stat('兵', `${fmt(troops)}/${fmt(cap)}`),
    stat('治安', `${Math.round(clanCastles(st, st.player).reduce((t, c) => t + c.chian, 0) / Math.max(1, clanCastles(st, st.player).length))}`),
    stat('威信', `${me.prestige}`),
  ].join('');
  const captives = Object.values(st.generals).filter((g) => g.status === 'captive' && g.captor === st.player).length;
  const badge = $('badge-captive');
  badge.hidden = !captives; badge.textContent = String(captives);
  const tn = todoCount(st);
  $('btn-todo').hidden = !tn; $('badge-todo').textContent = String(tn);
  syncSelection();
  renderPanel();
  renderLog();
  renderLegend();
  view.invalidate();
}

// ───────── 地図の表示切り替え ─────────
function setMapMode(m: MapMode) {
  view.setMode(m);
  try { localStorage.setItem('sengoku-mapmode', m); } catch { /* 保存できなくても動く */ }
  renderLegend();
}
const sw = (c: string, label: string) => `<span><i class="lg" style="background:${c}"></i>${label}</span>`;
const rampBar = (stops: string[], lo: string, hi: string, label: string) => `<span>${label}</span><span class="lg-ramp">${lo}<i style="background:linear-gradient(90deg,${stops.join(',')})"></i>${hi}</span>`;
function renderLegend() {
  $('mapmode').querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === view.mode)));
  const el = $('legend');
  el.dataset.mode = view.mode;
  const st = s;
  if (view.mode === 'power' || !st) {
    el.innerHTML = '<span><i class="lg lg-p"></i>平地</span><span><i class="lg lg-f"></i>森 守×1.15</span><span><i class="lg lg-m"></i>山 守×1.3</span><span><i class="lg lg-r"></i>川 攻×0.85</span><span><i class="lg lg-c"></i>城 守×1.2〜2.2</span>';
    return;
  }
  if (view.mode === 'meibun') el.innerHTML = sw(MB.own, '自家') + sw(MB.ally, '盟友') + sw(MB.ok, '名分あり') + sw(MB.no, '私戦になる') + sw(MB.kokujin, '国人（問わない）');
  else if (view.mode === 'chian') el.innerHTML = rampBar(CHIAN_RAMP, '0', '100', '治安');
  else if (view.mode === 'ember') el.innerHTML = rampBar(EMBER_RAMP, '0', '60+', '残り火') + '<span>強いと蜂起しやすい</span>';
  else if (view.mode === 'front') {
    const fs = (st.fronts ?? []).filter((f) => st.generals[f.leader]);
    el.innerHTML = (fs.length ? fs.map((f) => sw(FRONT_COLORS[f.id % FRONT_COLORS.length], esc(frontName(st, f)))).join('') : '<span>城持ちなし</span>') + sw('#e9dcc0', '直轄（蔵入地）') + sw('#8c8577', '他家');
  } else if (view.mode === 'supply') {
    el.innerHTML = sw(SUP.home, '本国') + sw(SUP.sea, '飛び地（海路）') + sw(SUP.enclave, '飛び地') + sw(SUP.near, '補給が届く') + sw(SUP.far, '届くが遠い') + sw(SUP.none, '届かない') + `<span>届く距離 ${supplyRange(st, st.player)}</span>`;
  } else if (view.mode === 'shugo') {
    const n = new Map<string, number>();
    for (const c of Object.values(bk(st).shugo)) if (c && st.clans[c]?.alive) n.set(c, (n.get(c) ?? 0) + 1);
    const top = [...n].sort((a, b) => (b[0] === st.player ? 1 : 0) - (a[0] === st.player ? 1 : 0) || b[1] - a[1]).slice(0, 8);
    el.innerHTML = '<span>国ごとの守護（太線は国境）</span>' + top.map(([c, k]) => sw(st.clans[c].color, `${esc(clanName(st, c))}${k}`)).join('') + sw('#958d7a', '空き');
  }
}
const STAT_TIP: Record<string, string> = { 鉄砲: '持っている鉄砲の数。部隊に配って使う（軍事 → 部隊）。', 兵: '今いる兵／動員できる上限（全城の石高と治安から）。', 金: '金（貫）。商業から毎月入る。' };
const statTip = (k: string) => STAT_TIP[k] ?? GLOSSARY.find(([w]) => w === k)?.[2] ?? '';
const stat = (k: string, v: string) => `<div title="${esc(statTip(k))}" data-tip="${esc(k)}"><dt>${k}</dt><dd>${esc(v)}</dd></div>`;

function syncSelection() {
  if (!s) return;
  view.sel = { army: null, hex: null, reach: null, targets: [] };
  if (mode.kind === 'army' || mode.kind === 'attack') {
    const id = mode.kind === 'army' ? mode.id : mode.army;
    const a = s.armies[id];
    if (!a) { mode = { kind: 'none' }; return; }
    view.sel.army = a.id;
    if (a.clan === s.player && !s.over && !delegatedArmy(s, a)) {
      if (!a.acted && a.mp > 0) view.sel.reach = reachable(s, a);
      view.sel.targets = attackTargets(s, a);
    }
    if (mode.kind === 'attack') view.sel.hex = mode.target.hex;
  } else if (mode.kind === 'castle') view.sel.hex = s.castles[mode.i].hex;
  else if (mode.kind === 'hex') view.sel.hex = mode.i;
}

function select(m: PanelMode) { mode = m; picker = null; refresh(); }

function renderLog() {
  if (!s) return;
  const items = s.log.filter((l) => l.mine || l.kind === 'castle' || l.kind === 'death').slice(-60).reverse();
  $('log').innerHTML = items.map((l) => `<li class="k-${l.kind}${l.mine ? ' mine' : ''}"><span class="t">${turnLabel(l.turn)}</span>${esc(l.text)}</li>`).join('');
}
function turnLabel(turn: number) {
  const m0 = (s?.startMonth ?? R.START_MONTH) - 1 + (turn - 1);
  return `${(s?.startYear ?? R.START_YEAR) + Math.floor(m0 / 12)}.${(m0 % 12) + 1}`;
}

let toastTimer = 0;
function toast(msg: string) {
  if (/[0-9,]+貫|加増|買|投じ|献金/.test(msg) && !/足りない|できない|要る/.test(msg)) sfx('coin'); // 金の出入り
  const t = $('toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => (t.hidden = true), 2600);
}

// ───────── 地図操作 ─────────
function onHexClick(hex: number) {
  if (!s || busy || s.over) { if (s && s.over) inspectHex(hex); return; }
  const occ = occupancy(s);
  if (mode.kind === 'attack') { mode = { kind: 'army', id: mode.army }; }
  if (mode.kind === 'army') {
    const a = s.armies[mode.id];
    if (a && a.clan === s.player && !delegatedArmy(s, a)) {
      const tgt = view.sel.targets.find((t) => t.hex === hex);
      if (tgt) { select({ kind: 'attack', army: a.id, target: tgt }); return; }
      const reach = view.sel.reach;
      if (reach && reach.cost.has(hex)) { doMove(a, hex, reach.cost.get(hex)!, pathTo(reach, a.hex, hex)); return; }
    }
  }
  inspectHex(hex, occ);
}

function inspectHex(hex: number, occ = occupancy(s!)) {
  if (isForeignHex(hex) && !s!.clans[hexOwner(s!, hex) ?? '']?.alive) { select({ kind: 'hex', i: hex }); return; } // 国外: 様子を見るだけ
  const army = occ.get(hex);
  if (army) { select({ kind: 'army', id: army.id }); return; }
  const c = castleAt(s!, hex);
  if (c) { select({ kind: 'castle', i: c.i }); return; }
  select({ kind: 'hex', i: hex });
}

function doMove(a: Army, hex: number, cost: number, path: number[]) {
  busy = true;
  view.sel.reach = null; view.sel.targets = [];
  const before = s!.castles.filter((c) => c.owner === s!.player).length;
  view.animateMove(a.id, path, () => {
    moveArmy(s!, a, hex, cost);
    busy = false;
    if (s!.castles.filter((c) => c.owner === s!.player).length > before) { toast(`${castleAt(s!, hex)?.name ?? '城'}を占領した`); view.flashHex(hex); }
    afterAction();
    select({ kind: 'army', id: a.id });
  });
  view.redraw();
}

function afterAction() {
  if (!s) return;
  checkVictory(s);
  if (s.over) showGameOver();
  else karairiScenes(s);
}

function nextArmy() {
  if (!s) return;
  const list = clanArmies(s, s.player).filter((a) => !delegatedArmy(s!, a) && !a.acted && (a.mp > 0 || attackTargets(s!, a).length) && !a.routed);
  if (!list.length) { toast('行動可能な部隊はありません'); return; }
  const cur = mode.kind === 'army' ? list.findIndex((a) => a.id === (mode as { id: number }).id) : -1;
  const a = list[(cur + 1) % list.length];
  view.centerOn(a.hex);
  select({ kind: 'army', id: a.id });
}

// ───────── パネル ─────────
function renderPanel() {
  const p = $('panel');
  if (!s) { p.innerHTML = ''; return; }
  switch (mode.kind) {
    case 'army': p.innerHTML = armyPanel(s.armies[mode.id]); break;
    case 'castle': p.innerHTML = castlePanel(s.castles[mode.i]); break;
    case 'hex': p.innerHTML = hexPanel(mode.i); break;
    case 'attack': p.innerHTML = attackPanel(s.armies[mode.army], mode.target); break;
    default: p.innerHTML = overviewPanel();
  }
  softDisable(p);
}

// 顔画像（あれば）。size: 表示幅（高さは4:5）
function face(id: string | null | undefined, w: number, cls = 'face') {
  const src = id ? PORTRAITS[id] ?? (id.startsWith('gihei_') ? PORTRAITS[`gihei_face_${1 + ([...id].reduce((a, c) => a + c.charCodeAt(0), 0) % 3)}`] : undefined) : undefined; // 名のない義兵は共通の顔（3人から）
  return src ? `<img class="${cls}" src="${src}" width="${w}" height="${Math.round(w * 1.25)}" alt="" loading="lazy">` : '';
}
// 顔があれば顔、なければ家紋風の丸
const faceOrMon = (id: string | null | undefined, name: string, color: string, w = 80) => face(id, w) || mon(name, color);
function mon(name: string, color: string) {
  const light = parseInt(color.slice(1, 3), 16) * 0.299 + parseInt(color.slice(3, 5), 16) * 0.587 + parseInt(color.slice(5, 7), 16) * 0.114 > 140;
  return `<span class="mon" style="background:${color};color:${light ? '#1a1410' : '#fbf5e6'}">${esc(name.slice(-2))}</span>`;
}

function abilBlock(st: { bra: number; int: number; lea: number; cha: number } | null) {
  const cell = (k: string, v: number | null) => `<div class="${v === null ? 'hidden' : ''}"><b>${v === null ? '？' : Math.round(v)}</b><span>${k}</span></div>`;
  return `<div class="abil">${cell('武勇', st ? st.bra : null)}${cell('知略', st ? st.int : null)}${cell('統率', st ? st.lea : null)}${cell('魅力', st ? st.cha : null)}</div>`;
}
const known = (g: General) => !!s && (g.clan === s.player || s.revealed.includes(g.id));

function moraleMeter(m: number, cap: number, rout = R.ROUT_BASE) {
  // 自動決着の退却・壊乱の線（壊乱閾値の平均0.40からの差でずれる）
  const ret = R.RETREAT_MORALE + rout - R.ROUT_BASE, rt = R.ROUT_MORALE + rout - R.ROUT_BASE;
  const cls = m < rt ? 'bad' : m < ret + 0.15 ? 'warn' : '';
  const max = 1.5;
  return `<div class="mlabel"><span>士気</span><b>${m.toFixed(2)} / ${cap.toFixed(2)}</b></div>
    <div class="meter morale ${cls}"><i style="width:${Math.min(100, (m / max) * 100)}%"></i>
    <span class="tick" style="left:${(ret / max) * 100}%"></span><span class="tick" style="left:${(rt / max) * 100}%"></span></div>`;
}
function troopMeter(t: number, max: number) {
  return `<div class="mlabel"><span>兵数</span><b>${fmt(t)} / ${fmt(max)}</b></div><div class="meter"><i style="width:${Math.min(100, (t / max) * 100)}%"></i></div>`;
}

function terrainLabel(hex: number) {
  const c = castleAt(s!, hex);
  if (c) return `${R.CASTLE_KIND[c.kind ?? 'hira'].name}（守×${castleDef(c).toFixed(1)}）`;
  const t = HEXES[hex].t;
  return `${TERRAIN_NAME[t]}${t === 'P' ? '' : t === 'R' ? `（攻×${R.RIVER_ATTACK}）` : `（守×${R.DEF_MULT[t]}）`}`;
}

function armyPanel(a: Army | undefined) {
  if (!a || !s) return overviewPanel();
  const st = s;
  const mine = a.clan === st.player;
  const g = st.generals[a.main];
  const clan = st.clans[a.clan];
  const show = mine || known(g);
  const stats = show ? armyStats(st, a) : null;
  const sp = armySupply(st, a);
  const supplied = sp.ok;
  const pills: string[] = [];
  if (mine) pills.push(a.acted ? '<span class="pill">行動済</span>' : `<span class="pill good">移動力 ${a.mp}</span>`);
  if (a.routed) pills.push('<span class="pill bad">壊乱</span>');
  if (!a.ikki) {
    const carry = carryOf(a);
    const where = sp.kind === 'sea' ? '海路' : sp.kind === 'enclave' ? '飛び地' : sp.dist > 0 ? `遠征${sp.dist}` : '';
    pills.push(supplied ? `<span class="pill good" title="自城から補給が届いている。遠いほど運ぶ兵糧が増える">補給下${where ? `（${where}）` : ''}</span>`
      : carry > 0 ? `<span class="pill warn" title="補給が届かない。小荷駄（持ち歩く兵糧）を食べている">補給切れ 残り${carry.toFixed(1)}か月</span>` : '<span class="pill bad" title="兵糧が尽きた。毎月、士気が大きく下がり兵が逃げる">兵糧尽き</span>');
  }
  if (a.monto) pills.push('<span class="pill">門徒結束</span>');
  if (g.sick) pills.push('<span class="pill bad">大将が病</span>');
  if (!mine && treatyOf(st, st.player, a.clan)) pills.push(`<span class="pill good">${treatyOf(st, st.player, a.clan)!.kind === 'marriage' ? '婚姻' : '同盟'}</span>`);
  if (mine && a.troops < a.departTroops * R.DIFFICULTY.normal.rotation) pills.push('<span class="pill warn">出陣時の70%未満</span>');
  const parts = [`<div class="ph">${faceOrMon(g.id, g.name, clan.color)}<div><h2>${esc(g.name)}隊</h2><div class="sub">${esc(clan.name)}家${g.born !== undefined ? `　${st.year - g.born}歳` : ''}${staffOf(a).length ? `　傘下${staffOf(a).length}人` : ''}</div></div></div>`];
  parts.push(abilBlock(stats));
  const cb = armyCombat(st, a);
  parts.push(show
    ? `<dl class="kv"><dt>攻撃力</dt><dd>${cb.atk.toFixed(2)}</dd><dt>防御力</dt><dd>${cb.def.toFixed(2)}</dd><dt>壊乱閾値</dt><dd>${cb.rout.toFixed(2)}${a.monto ? '（門徒結束）' : ''}</dd></dl>`
    : '');
  if (!show) parts.push('<p class="hint">未交戦の武将は能力が分からない。一度戦えば判明する。</p>');
  parts.push(troopMeter(mine ? a.troops : Math.round(a.troops / 100) * 100, maxTroops(st, a)));
  parts.push(`<dl class="kv"><dt>練度</dt><dd>${show || mine ? `${Math.round(drillOf(a))}<span class="hint" style="margin:0">（上限${Math.round(R.drillCap(a.ashi ?? 0))}・攻防×${R.drillMult(drillOf(a)).toFixed(2)}）</span>` : '？'}</dd>${mine ? `<dt>足軽</dt><dd>${fmt(ashiOf(a))}人<span class="hint" style="margin:0">（残りは農兵）</span></dd>` : ''}</dl>`);
  if (a.cannon) parts.push(`<dl class="kv"><dt>大筒</dt><dd>${a.cannon}門（攻城で城門を撃つ）</dd></dl>`);
  if (a.guns || mine) parts.push(`<dl class="kv"><dt>鉄砲</dt><dd>${mine ? `${fmt(a.guns ?? 0)} / ${fmt(gunCap(a))}丁` : (a.guns ?? 0) >= R.GUN_MIN_UNIT ? 'あり' : 'なし'}${(a.guns ?? 0) >= R.GUN_MIN_UNIT ? '（合戦で鉄砲隊になる）' : ''}</dd></dl>`);
  parts.push(moraleMeter(a.morale, initialMorale(st, a), show ? cb.rout : R.ROUT_BASE));
  parts.push(`<div>${pills.join('')}</div>`);
  if (show && staffOf(a).length) parts.push(`<div class="corps-mini"><span class="hint" style="margin:0">傘下 ${staffOf(a).length}人</span>${treeOf(st, a).slice(1).map(({ g: x, depth }) => `<div style="padding-left:${(depth - 1) * 14}px">${depth > 1 ? '└ ' : ''}${esc(x.name)}<span class="hint" style="margin:0">　${rankName(st, x)}</span></div>`).join('')}</div>`);
  parts.push(`<dl class="kv"><dt>地形</dt><dd>${terrainLabel(a.hex)}</dd><dt>所在</dt><dd>${esc(PROVINCES[HEXES[a.hex].p].name)}</dd></dl>`);
  const here = castleAt(st, a.hex);
  if (here) parts.push(`<div class="actions" style="margin-top:4px"><button class="act" data-act="view-castle" data-id="${here.i}">${esc(here.name)}を見る${!mine && here.owner !== st.player ? '（調略）' : ''}</button></div>`);
  if (a.ikki) parts.push(`<p class="hint">一向一揆。家の指図は受けず、蜂起した${esc(st.castles[a.ikki.castle].name)}へ自ら攻めかかる。${Math.max(0, a.ikki.until - st.turn)}か月で散る。</p>`);
  if (mine && !st.over && !a.ikki && delegatedArmy(st, a)) {
    const f0 = frontOfArmy(st, a), f = f0 ? policyOf(st, f0) : undefined;
    parts.push(`<div class="est" style="margin-top:6px">${f ? `<b>${esc(frontName(st, f))}</b>の部隊（${R.FRONT_POLICY_NAME[f.policy]}${f.policy === 'attack' ? `・目標 ${esc(targetLabel(st, f))}` : ''}${f0?.boss ? `・${esc(frontName(st, frontById(st, f0.boss)!))}の与力` : ''}）。` : '軍事を委任中。'}出陣・移動・編成は評定終了のときに${f ? '領主' : 'AI'}が決める。</div>`);
    parts.push(`<div class="actions"><button class="act" data-act="open-fronts">${f ? '知行を見る（人事）' : '委任を見る（内政）'}</button><button class="act" data-act="next">次の部隊 (N)</button></div>`);
  }
  if (mine && !st.over && !a.ikki && !delegatedArmy(st, a)) {
    const c = castleAt(st, a.hex);
    const inOwn = !!c && c.owner === st.player;
    const nearOwn = inOwn || NEIGHBORS[a.hex].some((j) => castleAt(st, j)?.owner === st.player);
    const targets = attackTargets(st, a);
    const acts: string[] = [];
    const ord = orderFor(st, a.id);
    if (ord) {
      const occ2 = occupancy(st).get(ord.hex);
      const tn = occ2 ? `${st.generals[occ2.main].name}隊` : castleAt(st, ord.hex)?.name ?? '敵陣';
      const oc = castleAt(st, ord.hex), sv = oc ? st.sieges?.[oc.i] : undefined;
      const besiege = !!sv && sv.clan === st.player;
      parts.push(`<div class="est" style="margin-top:6px">出陣命令: <b>${esc(tn)}</b>（${ord.command ? '自ら指揮' : '委任'}）。${besiege ? `<b>包囲${sv!.months + 1}か月目</b>。評定終了で先月の続きから攻める。` : '評定終了で開戦。'}</div>`);
      acts.push(`<button class="act" data-act="cancel-order">${besiege ? '囲みを解く（出陣を取り消す）' : '出陣を取り消す'}</button>`);
    }
    if (karairiOn(st) && crossingEnds().includes(a.hex)) { const why = crossBlock(st, a); parts.push(`<div class="est" style="margin-top:6px">渡海: ${why ? esc(why) : `この軍団（兵${fmt(a.troops)}）は今月、船で海を渡れる（あと${fmt(troopsLeft(st))}人分）`}</div>`); }
    if (targets.length) acts.push(`<span class="hint" style="width:100%;margin:0">赤枠の敵をクリックで攻撃（${targets.length}）</span>`);
    acts.push(`<button class="act" data-act="next">次の部隊 (N)</button>`);
    if (!a.acted) acts.push(`<button class="act" data-act="wait">待機</button>`);
    // 合流（隣の自軍と）・分遣
    for (const j of NEIGHBORS[a.hex]) { const b = occupancy(st).get(j); if (!b || b.clan !== st.player || b.ikki) continue; const why = mergeBlock(st, a, b); acts.push(`<button class="act" data-act="merge-ask" data-id="${b.id}" ${why ? `disabled title="${esc(why)}"` : ''}>合流: ${esc(st.generals[b.main].name)}隊と</button>`); }
    { const why = splitBlock(st, a); acts.push(`<button class="act" data-act="split-ask" ${why ? `disabled title="${esc(why)}"` : ''}>分ける</button>`); }
    { const why = fillBlock(st, a); if (!why) acts.push(`<button class="act" data-act="fill-army">空きを埋める（おまかせ）</button>`); }
    acts.push(`<button class="act" data-act="open-corps">軍団の編成（人事）</button>`);
    if (nearOwn && st.clans[st.player].guns > 0 && (a.guns ?? 0) < gunCap(a)) acts.push(`<button class="act" data-act="arm-guns">鉄砲を持たせる（蔵${fmt(st.clans[st.player].guns)}丁）</button>`);
    if (nearOwn && (a.guns ?? 0) > 0) acts.push(`<button class="act" data-act="unarm-guns">鉄砲を蔵へ戻す</button>`);
    if (nearOwn && (st.clans[st.player].cannon ?? 0) > 0 && (a.cannon ?? 0) < R.CANNON_MAX) acts.push(`<button class="act" data-act="arm-cannon">大筒を持たせる（蔵${st.clans[st.player].cannon}門）</button>`);
    if (nearOwn && (a.cannon ?? 0) > 0) acts.push(`<button class="act" data-act="unarm-cannon">大筒を蔵へ戻す</button>`);
    const room = ashiRoom(st, a);
    if (room > 0) acts.push(`<button class="act" data-act="hire-ashi">足軽を雇う（${fmt(room)}人・${fmt(room * R.ASHI_HIRE)}貫）</button>`);
    if (inOwn) acts.push(`<button class="act" data-act="disband">解散</button>`);
    parts.push(`<div class="actions">${acts.join('')}</div>`);
    parts.push(`<p class="hint">移動: 明るいヘックスをクリック。敵に隣接すると停止（ZOC）。自城とその隣で毎月補充される。</p>`);
  }
  return parts.join('');
}

function freeGenerals(): General[] {
  return Object.values(s!.generals).filter((g) => g.clan === s!.player && g.status === 'free' && !g.liege).sort((a, b) => capOf(b) - capOf(a) || b.lea + b.bra - (a.lea + a.bra));
}
// 身分を含めた兵数の上限
const capOf = (g: General) => Math.round(((3000 + g.lea * 100) * troopMult(s!, g)) / 100) * 100;

function castlePanel(c: Castle) {
  const st = s!;
  const mine = c.owner === st.player;
  const color = c.owner ? st.clans[c.owner].color : '#7d735c';
  const gov = c.governor ? st.generals[c.governor] : null;
  const parts = [`<div class="ph">${mon(c.name.replace(/城$|館$|御所$|御堂$/, ''), color)}<div><h2>${esc(c.name)}</h2><div class="sub">${esc(clanName(st, c.owner))}${c.owner ? '家' : '（独立）'}　${esc(PROVINCES[HEXES[c.hex].p].name)}</div></div></div>`];
  const kd = R.CASTLE_KIND[c.kind ?? 'hira'];
  parts.push(`<dl class="kv"><dt>縄張り</dt><dd>${kd.name}${c.tsume ? `（詰城 ${esc(c.tsume)}）` : ''}　守り×${castleDef(c).toFixed(1)}・曲輪${'一二三'[kd.rings - 1]}重</dd><dt>石高</dt><dd>${man(castleKoku(c))}</dd><dt>開発</dt><dd>${Math.round(c.dev * 100)}%${c.owner ? `<span class="hint" style="margin:0">　月+${(devRate(st, c) * 100).toFixed(2)}%${c.dev >= R.devCap(c.chian) ? `（上限${Math.round(R.devCap(c.chian) * 100)}%）` : besieged(st, c) ? '（包囲中）' : !c.governor ? '（城主不在で半分）' : ''}</span>` : ''}</dd>
    <dt>商業</dt><dd>月${fmt(castleCom(c))}貫（${Math.round(c.cdev * 100)}%${c.owner ? `　月+${(devRate(st, c, undefined, 'com') * 100).toFixed(2)}%` : ''}${c.rakuichi !== undefined ? `・上限${Math.round(comCap(c) * 100)}%` : ''}）</dd>
    ${minesAt(c).length ? `<dt>鉱山</dt><dd>${minesAt(c).map(([, n, k, v]) => `${esc(n)}（${MINE_KIND_NAME[k]}・${fmt(v)}貫）`).join('・')}${c.owner ? `　今月 ${fmt(castleMine(st, c))}貫` : ''}<span class="hint" style="margin:0">　知行に関わらず当家に入る</span></dd>` : ''}
    ${productsAt(c).length ? `<dt>特産</dt><dd>${productsAt(c).map(([, n, k, v]) => `${esc(n)}（${k === 'com' ? `商い+${v}貫` : esc(PRODUCT_KIND_NAME[k]) + (k === 'horse' ? '・突撃の損害減' : k === 'powder' ? '・鉄砲の維持費減' : '・鉄砲が安い')}）`).join('・')}</dd>` : ''}
    ${c.owner === st.player ? (() => {
      const b = (act: string, label: string, why: string | null) => `<button class="mini" data-act="${act}" data-id="${c.i}" ${why ? `disabled title="${esc(why)}"` : ''}>${label}</button>`;
      const ib = (role: InvestRole) => b(role === 'agri' ? 'inv-agri' : 'inv-com', `${role === 'agri' ? '開発' : '商業'}+${R.INVEST_STEP * 100}%（${fmt(investCost(c, role))}貫）`, investBlock(st, st.player, c, role));
      return `<dt>投資</dt><dd>${ib('agri')} ${ib('com')}</dd>
        <dt>新田開発</dt><dd>${c.shinden ? `工事中（あと${c.shinden.until - st.turn}か月・成れば石高+${(c.baseKoku * R.SHINDEN_GAIN).toFixed(1)}万石）` : shindenDone(c) >= R.SHINDEN_MAX ? `${R.SHINDEN_MAX}度済み` : b('shinden', `始める（${fmt(shindenCost(c))}貫・${R.SHINDEN_MONTHS}か月・石高+${(c.baseKoku * R.SHINDEN_GAIN).toFixed(1)}万石）`, shindenBlock(st, st.player, c))}${shindenDone(c) && shindenDone(c) < R.SHINDEN_MAX ? `<span class="hint" style="margin:0">　${shindenDone(c)}度済み</span>` : ''}</dd>
        <dt>普請</dt><dd>${esc(FORT_NAME[fortOf(c)])}${c.fortBuild ? `（${esc(FORT_NAME[fortOf(c) + 1])}を普請中・あと${c.fortBuild.until - st.turn}か月）` : fortOf(c) < FORT_NAME.length - 1 ? ` ${b('fort', `${FORT_NAME[fortOf(c) + 1]}を築く（${fmt(fortCost(c))}貫・${fortMonths(st, c)}か月）`, fortBlock(st, st.player, c))}` : ''}${fortOf(c) ? `<span class="hint" style="margin:0">　守り+${(fortOf(c) * R.FORT_DEF).toFixed(2)}・城兵+${Math.round(fortOf(c) * R.FORT_GARRISON * 100)}%・城門+${Math.round(fortOf(c) * R.FORT_GATE * 100)}%</span>` : ''}</dd>`;
    })() : ''}
    ${c.rakuichi !== undefined ? `<dt>楽市楽座</dt><dd>布いている${st.turn - c.rakuichi < R.RAKUICHI_MONTHS ? `（反発 あと${c.rakuichi + R.RAKUICHI_MONTHS - st.turn}か月）` : ''}</dd>` : c.owner === st.player ? `<dt>楽市楽座</dt><dd><button class="mini" data-act="rakuichi" data-id="${c.i}" title="商業の伸び×${R.RAKUICHI_GROW}・上限+${R.RAKUICHI_CAP * 100}%。${R.RAKUICHI_MONTHS}か月は治安${R.RAKUICHI_CHIAN}/月">楽市楽座を布く</button></dd>` : ''}
    <dt>治水</dt><dd>${Math.round(c.chisui)}（収穫×${R.harvestMult(c.chisui).toFixed(2)}）</dd>
    <dt>治安</dt><dd>${Math.round(c.chian)}（動員${Math.round(R.manpowerPer(c.chian))}人/万石・開発の上限${Math.round(R.devCap(c.chian) * 100)}%）${c.owner ? `<span class="hint" style="margin:0">　${(() => { const d = chianDelta(st, st.clans[c.owner!], c, besieged(st, c), st.clans[c.owner!].food <= 0); return `月${d.total >= 0 ? '+' : ''}${d.total.toFixed(1)}${d.parts.length ? `（${d.parts.map(([k, v]) => `${k}${v >= 0 ? '+' : ''}${v.toFixed(1)}`).join('・')}）` : ''}`; })()}</span>` : ''}</dd>
    <dt>守護</dt><dd>${(() => { const h = bk(st).shugo[provName(c.hex)]; return h ? `${esc(clanName(st, h))}家（${esc(provName(c.hex))}守護）` : '空き'; })()}</dd>
    ${c.ember && c.ember >= 1 ? `<dt>残り火</dt><dd>${Math.round(c.ember)}${c.oldOwner ? `（旧主 ${esc(clanName(st, c.oldOwner))}）` : ''}<span class="hint" style="margin:0">　治安${R.EMBER_FLARE_CHIAN}未満で燃え上がることがある</span></dd>` : ''}
    ${c.owner === st.player ? (() => {
      const f = frontOfCastle(st, c);
      const cands = leaderCands(st).filter((g) => !grantBlock(st, g, c));
      const sel = cands.length && (!f || f.vacant) ? `<div style="margin-top:4px"><select data-fgrantc="${c.i}" aria-label="${esc(c.name)}を与える武将"><option value="">この城を与える…</option>${genOpts(cands, (g) => `<option value="${g.id}">${esc(g.name)}（未払い${dueOf(g)}・恩${Math.round(onOf(g))}${fiefOf(st, g) ? `・${fiefOf(st, g)!.castles.length}城` : ''}）</option>`)}</select></div>` : '';
      return `<dt>知行</dt><dd>${f ? `${esc(frontName(st, f))}${f.vacant ? '（後継ぎ待ち）' : `（${R.FRONT_POLICY_NAME[policyOf(st, f).policy]}）`} <button class="mini" data-act="open-fiefs">知行を見る</button>` : '直轄（蔵入地）'}${sel}</dd>`;
    })() : ''}
    ${isPort(st, c) ? `<dt>南蛮港</dt><dd>${esc(portName(c.id))}${(st.ships ?? []).some((x) => x.port === c.id) ? '　<b>南蛮船が来航中</b>' : ''}</dd>` : ''}
    ${isKaraPort(c) ? `<dt>唐船</dt><dd>${esc(karaPortName(c.id))}（明の商人の船が来る港）${karasenAt(st, c.id) ? `　<b>唐船が来航中（月+${fmt(R.KARASEN_TRADE)}貫）</b>` : ''}</dd>` : ''}
    ${c.kiri && c.kiri >= 0.5 ? `<dt>信者</dt><dd>${Math.round(c.kiri)}%（商業+${Math.round(c.kiri * R.KIRI_COM * 100)}%）</dd>` : ''}
    <dt>城兵</dt><dd>${fmt(c.garrison)} / ${fmt(garrisonMax(c))}</dd>
    ${c.owner ? `<dt>城の蔵</dt><dd>${fmt(storeOf(c))}石（城兵の${c.garrison ? (storeOf(c) / Math.max(1, c.garrison * R.FOOD_PER_SOLDIER)).toFixed(1) : '—'}か月分・満${fmt(storeMax(c))}）${(() => { const k = castleSupply(st, c); return k === 'enclave' ? '<span class="pill warn" title="本国と陸でも海でもつながらない。家の蔵から兵糧が届かず、収穫はこの城の蔵に入る">飛び地</span>' : k === 'sea' ? '<span class="pill" title="本国と陸ではつながらないが、港どうしで兵糧を運べる（1割減る）">飛び地（海路）</span>' : ''; })()}${cutOff(st, c) ? '<span class="pill warn" title="敵に囲まれ、外から兵糧を入れられない。城兵が蔵を食べ、尽きると飢えて崩れる">兵糧攻め</span>' : ''}${st.sieges?.[c.i] ? `<span class="pill warn" title="城攻めが月をまたいで続いている。盤面（門の傷・部隊の位置）は翌月に持ち越す">${esc(clanName(st, st.sieges[c.i].clan))}家の包囲${st.sieges[c.i].months}か月</span>` : ''}${isCoast(c) ? '<span class="hint" style="margin:0">　港あり</span>' : ''}</dd>` : ''}
    <dt>城主</dt><dd>${gov ? `${face(gov.id, 32, 'face face-sm')}${esc(gov.name)}` : 'なし'}</dd></dl>`);
  if (mine && !st.over && shiokiPending(st).some((p) => p.castle === c.i)) parts.push(`<div class="est" style="margin-top:6px">仕置を決める（次の評定終了まで）</div><div class="actions">${shiokiButtons(st, c)}</div>`);
  if (mine && !st.over) parts.push(`<div class="actions" style="margin-top:4px"><button class="act" data-act="focus-castle">${st.clans[st.player].focus === c.i ? '重点の城を解く' : '予算の重点にする'}</button></div>`);
  if (mine && !st.over) {
    const occ = occupancy(st);
    const spot = formSpot(c, occ);
    const capLeft = clanCapacity(st, st.player) - clanTroops(st, st.player);
    const acts = [
      `<button class="act" data-act="pick-form" ${spot === null || capLeft < 500 ? 'disabled' : ''}>軍団を編成</button>`,
      `<button class="act" data-act="pick-governor">${gov ? '城主を替える' : '城主を任命'}</button>`,
    ];
    if (gov) acts.push(`<button class="act" data-act="drop-governor">城主を解任</button>`);
    { const n = Object.values(st.armies).filter((x) => x.clan === st.player && !x.ikki && (x.hex === c.hex || NEIGHBORS[c.hex].includes(x.hex))).length; if (n) acts.push(`<button class="act" data-act="castle-reorg" title="城と隣にいる軍団の主将はそのまま、傘下と城の待機の武将を能力順に振り分け直す">この城の軍団を組み直す（おまかせ・${n}隊）</button>`); }
    parts.push(`<div class="actions">${acts.join('')}</div>`);
    if (spot === null) parts.push('<p class="hint">城と周囲に空きがないため編成できない。</p>');
    if (picker === 'governor') {
      const free = freeGenerals();
      parts.push(`<div class="picker"><label for="sel-gov">城主（城主のいない城は開発が半分。調略への守りは城主の知略）</label>
        <select id="sel-gov">${free.map((x) => `<option value="${x.id}">${esc(x.name)}　知${x.int} 統${x.lea}</option>`).join('')}</select>
        <div class="row"><button class="act primary" data-act="set-governor" ${free.length ? '' : 'disabled'}>任命</button><button class="act" data-act="cancel-pick">やめる</button></div></div>`);
    }
    if (picker === 'form') {
      const free = freeGenerals();
      const maxT = Math.max(0, Math.min(capLeft, Math.floor(st.clans[st.player].food / R.RECRUIT_COST), Math.max(0, ...free.map(capOf))));
      const steps = [500, 1000, 2000, 3000, 5000, 8000].filter((x) => x <= maxT);
      parts.push(`<div class="picker"><label for="sel-form">大将</label>
        <select id="sel-form">${free.map((x) => `<option value="${x.id}">${esc(x.name)}（${rankName(st, x)}）　武${x.bra} 統${x.lea}　上限${fmt(capOf(x))}</option>`).join('')}</select>
        <label for="sel-troops">初期兵数（1人あたり兵糧${R.RECRUIT_COST}石）</label>
        <select id="sel-troops">${steps.map((x) => `<option value="${x}" ${x === Math.min(2000, steps[steps.length - 1]) ? 'selected' : ''}>${fmt(x)}人（${fmt(x * R.RECRUIT_COST)}石）</option>`).join('')}</select>
        <div class="row"><button class="act primary" data-act="form" ${free.length && steps.length ? '' : 'disabled'}>編成</button><button class="act" data-act="cancel-pick">やめる</button></div>
        ${free.length ? '' : '<span class="hint">待機中の武将がいない。城主を解任するか、浪人・捕虜を登用する。</span>'}</div>`);
    }
    const ronin = Object.values(st.generals).filter((g) => g.status === 'ronin' && g.loc === c.i);
    if (ronin.length) {
      parts.push(`<h3 style="margin-top:14px">在野の武将</h3><ul class="list">${ronin.map((g) => `<li><button data-act="ronin" data-id="${g.id}" ${g.triedTurn === st.turn || st.clans[st.player].gold < R.RONIN_GOLD ? 'disabled' : ''} title="金${fmt(R.RONIN_GOLD)}貫"><span class="grow">${esc(g.name)}</span><span class="num">武${g.bra} 知${g.int} 統${g.lea} 魅${g.cha}</span><span class="num">登用${Math.round(roninChance(st, st.player) * 100)}%</span></button></li>`).join('')}</ul><p class="hint">登用には金${fmt(R.RONIN_GOLD)}貫（断られても戻らない）。</p>`);
    }
  } else {
    if (c.owner && treatyOf(st, st.player, c.owner)) parts.push(`<div><span class="pill good">${treatyOf(st, st.player, c.owner)!.kind === 'marriage' ? '婚姻' : '同盟'}を結んだ家の城</span></div>`);
    if (naioActive(st, c, st.player)) parts.push(`<div><span class="pill good">内応あり（${turnLabel(c.naio!)}まで）</span></div><p class="hint">攻城戦では外門が一つ開き、城兵の士気が${R.NAIO_MORALE}下がった状態で始まる。</p>`);
    parts.push(`<p class="hint">${c.garrison > 0 ? '城兵がいる城は、隣接して攻撃し城兵を崩すと落城する。攻城戦では火計も使える。' : '城兵がいない。隣接ヘックスから入れば占領できる。'}</p>`);
    if (!st.over && st.player === R.IKKI_CLAN && c.owner && c.owner !== st.player) {
      const why = ikkiBlock(st, st.player, c);
      parts.push(`<div class="actions"><button class="act" data-act="ikki" ${why ? 'disabled' : ''}>一揆を起こす（金${fmt(R.IKKI_COST)}貫・一揆勢${fmt(ikkiSize(c))}人）</button></div><p class="hint">${why ? esc(why) + '。' : ''}門徒が城の隣で蜂起し、手番の終わりに攻めかかる。忠誠や治安では防げない。百姓なので弱いが、討った分だけその城の開発と治安が下がる。${R.IKKI_MONTHS}か月で散る。</p>`);
    }
    if (!st.over && !(c.owner && treatyOf(st, st.player, c.owner))) {
      const reach = canPlot(st, st.player, c);
      const free = freeGenerals().filter((g) => g.plotTurn !== st.turn).sort((a, b) => b.int - a.int);
      const food = st.clans[st.player].gold >= R.PLOT_GOLD;
      parts.push(`<div class="actions"><button class="act" data-act="pick-plot" ${reach && food && free.length ? '' : 'disabled'}>調略</button></div>`);
      if (!reach) parts.push(`<p class="hint">調略は自城か自軍から${R.PLOT_RANGE}ヘックス以内の城にだけ仕掛けられる。</p>`);
      else if (!free.length) parts.push('<p class="hint">調略には待機中の武将が要る（今月まだ調略していない者）。</p>');
      else if (!food) parts.push(`<p class="hint">金が${fmt(R.PLOT_GOLD)}貫に足りない。</p>`);
      if (picker === 'plot' && reach && free.length) {
        parts.push(`<div class="picker"><label for="sel-plot">調略に向かう武将（金${fmt(R.PLOT_GOLD)}貫）</label>
          <select id="sel-plot">${free.map((x) => `<option value="${x.id}">${esc(x.name)}　知${x.int}　成功${Math.round(plotChance(st, x, c, st.player) * 100)}%</option>`).join('')}</select>
          <div class="row"><button class="act primary" data-act="plot">調略する</button><button class="act" data-act="cancel-pick">やめる</button></div>
          <span class="hint">${c.owner ? `成功すると翌月まで内応。失敗すると${R.PLOT_CAUGHT * 100}%で武将が捕らえられる。` : '成功すると国人衆が寝返り、城と支配域がそのまま手に入る。'}成功率＝${R.PLOT_BASE}＋(知略−城主の知略)÷100＋(威信差)÷200${c.owner ? '' : '＋0.15（国人衆）'}。</span></div>`);
      }
    }
  }
  return parts.join('');
}

function formSpot(c: Castle, occ: Map<number, Army>): number | null {
  const spots = [c.hex, ...NEIGHBORS[c.hex].filter((j) => hexOwner(s!, j) === s!.player && !castleAt(s!, j))];
  return spots.find((h) => !occ.has(h)) ?? null;
}

function hexPanel(i: number) {
  const st = s!;
  const h = HEXES[i];
  const owner = hexOwner(st, i);
  const dc = st.castles[h.d];
  if (isForeignHex(i) && !st.clans[owner ?? '']?.alive) return `<div class="ph"><div><h2>${esc(PROVINCES[h.p].name)}</h2><div class="sub">国外（${esc(clanName(st, owner))}）　${esc(dc.name)}の辺り</div></div></div>
  <dl class="kv"><dt>地形</dt><dd>${esc(TERRAIN_NAME[h.t])}</dd></dl>
  <p class="hint">海の向こうの国。ここへは攻め入れない。天下を統一したのちの唐入りで、対馬から船で渡れるようになる。</p>`;
  return `<div class="ph"><div><h2>${esc(PROVINCES[h.p].name)}</h2><div class="sub">${esc(clanName(st, owner))}${owner ? '家' : ''}領　${esc(dc.name)}の支配域</div></div></div>
  <dl class="kv"><dt>地形</dt><dd>${terrainLabel(i)}</dd><dt>石高</dt><dd>${man(h.k * dc.dev)}</dd><dt>移動</dt><dd>${R.MOVE_COST[h.t]}</dd></dl>
  <p class="hint">防御倍率は守備側が受ける損害を割る。山から平地・森・川への攻撃は高地補正 ×${R.HIGH_GROUND}。</p>`;
}

function verdict(e: number) {
  return e >= 0.65 ? ['圧倒', 'good'] : e >= 0.55 ? ['優勢', 'good'] : e >= 0.45 ? ['互角', 'warn'] : ['劣勢', 'bad'];
}

function attackPanel(a: Army | undefined, t: Target) {
  if (!a || !s) return overviewPanel();
  const st = s;
  const est = estimate(st, a, t, false);
  const [v, cls] = verdict(est);
  const defName = t.kind === 'army' ? `${st.generals[t.army.main].name}隊（${clanName(st, t.army.clan)}）` : `${st.castles[t.castle].name}城兵（${clanName(st, st.castles[t.castle].owner)}）`;
  const defTroops = t.kind === 'army' ? Math.round(t.army.troops / 100) * 100 : st.castles[t.castle].garrison;
  const defClan = t.kind === 'army' ? t.army.clan : st.castles[t.castle].owner;
  const ordered = ordersAt(st, t.hex, st.player).map((o) => st.armies[o.army]).filter((x) => x && x.id !== a.id);
  const allies = supportArmies(st, a, t.hex, defClan).filter((o) => o.clan !== a.clan);
  const backers = defenderSupports(st, defClan, t.hex, a.clan, t.kind === 'army' ? t.army.id : null);
  const notes = [terrainLabel(t.hex)];
  if (HEXES[a.hex].t === 'M' && HEXES[t.hex].t !== 'M') notes.push(`高地 ×${R.HIGH_GROUND}`);
  return `<div class="ph"><div><h2>出陣</h2><div class="sub">${esc(st.generals[a.main].name)}隊 → ${esc(defName)}</div></div></div>
  <dl class="kv"><dt>自軍</dt><dd>${fmt(a.troops)}人　士気${a.morale.toFixed(2)}</dd>
    ${ordered.length ? `<dt>合流</dt><dd>${ordered.map((x) => esc(st.generals[x.main].name)).join('、')}（出陣命令済み）</dd>` : ''}
    ${allies.length ? `<dt>援軍</dt><dd>${allies.map((x) => `${esc(clanName(st, x.clan))}・${esc(st.generals[x.main].name)}`).join('、')}</dd>` : ''}
    <dt>敵軍</dt><dd>約${fmt(defTroops)}人</dd>
    ${backers.length ? `<dt>後詰め</dt><dd>${backers.map((x) => `${esc(clanName(st, x.clan))}・${esc(st.generals[x.main].name)}`).join('、')}</dd>` : ''}
    <dt>条件</dt><dd>${notes.map(esc).join('、')}</dd>
    ${(() => { const m = meibun(st, st.player, defClan, t.hex); return `<dt>大義</dt><dd class="${m.ok ? '' : 'bad-t'}">${esc(meibunLabel(m))}${m.ok ? '' : `<span class="hint" style="margin:0">　加わる武将の恩−${R.SHISEN_ON}・全城の治安−${R.SHISEN_CHIAN}・威信−${R.SHISEN_PRESTIGE}、落とした城の残り火+${R.SHISEN_EMBER}、諸家と結びにくくなる</span>`}</dd>`; })()}</dl>
  <div class="est"><span class="big">${Math.round(est * 100)}%</span><span class="verdict" style="color:var(--${cls})">${v}</span>
    <div class="hint" style="margin-top:4px">推定優勢度（兵数・士気・地形・隣接する味方のみ。武将能力は含まない）。出陣を命じた軍団は全員が合戦に加わるので、実際はこれより有利になる。</div></div>
  <div class="actions"><button class="act primary" data-act="order-cmd">出陣（自ら指揮）</button><button class="act" data-act="order-auto">出陣（委任）</button><button class="act" data-act="back">やめる</button></div>
  <p class="hint">合戦は評定終了のときに始まる。それまでに同じ目標へ隣接した軍団にも出陣を命じれば、まとめて攻めかかる。目標に隣接する同盟国の軍勢は援軍に、敵の隣にいる敵の味方は後詰めに加わる。</p>
  <p class="hint">${castleAt(st, t.hex)
    ? `攻城戦: 城門を破って本丸を制圧すれば落城。城内の兵は壁越しに弓を射る。城攻めは一か月がかり（15手番、山城は20手番で30日）。月末までに落とせなければ、囲んだまま翌月へ続き、盤面（門の傷・部隊の位置）もそのまま。囲みを解けば城門は月20%ずつ直る。`
    : `野戦: 敵の本陣（◎）を潰走か壊滅させれば勝ち。10刻で決着しなければ引き分け。`}</p>`;
}

function overviewPanel() {
  const st = s!;
  const me = st.clans[st.player];
  const leader = me.leader ? st.generals[me.leader] : null;
  const armies = clanArmies(st, st.player).sort((a, b) => Number(a.acted) - Number(b.acted) || b.troops - a.troops);
  const ready = armies.filter((a) => !a.acted && !a.routed).length;
  const todo = todoItems(st);
  return `<div class="ph">${faceOrMon(leader?.id, leader?.name ?? me.name, me.color)}<div><h2>${esc(me.name)}家</h2><div class="sub">当主 ${esc(leader?.name ?? '—')}</div></div></div>
  ${todo.length ? `<div class="todo-box"><h3>今月の要件</h3><ul class="list">${todo.map((x) => `<li><button data-act="todo"><span class="grow">${esc(x.label)}</span><span class="num">${x.n}</span></button></li>`).join('')}</ul></div>` : ''}
  <dl class="kv"><dt>動員</dt><dd>${fmt(clanTroops(st, st.player))} / ${fmt(clanCapacity(st, st.player))}人</dd>
  <dt>兵糧</dt><dd>${fmt(me.food)}石（月 −${fmt(clanUpkeep(st, st.player))}）</dd>
  <dt>収穫</dt><dd>十月　見込 ${fmt(clanKoku(st, st.player) * R.HARVEST_RATE)}石</dd></dl>
  <h3 style="margin-top:12px">軍団　未行動 ${ready}</h3>
  <ul class="list">${armies.map((a) => `<li><button data-act="goto" data-id="${a.id}"><span class="swatch" style="background:${a.acted ? '#5c5046' : me.color}"></span><span class="grow">${esc(st.generals[a.main].name)}${a.routed ? '（壊乱）' : ''}${orderFor(st, a.id) ? '　⚔出陣' : ''}</span><span class="num">${fmt(a.troops)}</span><span class="num">${a.morale.toFixed(2)}</span></button></li>`).join('') || '<li class="hint">軍団がない。城から編成する。</li>'}</ul>
  <p class="hint">部隊を選び、明るいヘックスへ移動。赤枠の敵や城をクリックで出陣を命じる。合戦は「評定終了」（E）のときに、同じ目標へ命じた軍団すべてで始まる。</p>`;
}

function onPanelClick(e: Event) {
  const btn = (e.target as HTMLElement).closest('button[data-act]') as HTMLButtonElement | null;
  if (!btn || !s || busy) return;
  const act = btn.dataset.act!;
  const st = s;
  if (act === 'goto') { const a = st.armies[+btn.dataset.id!]; if (a) { view.centerOn(a.hex); select({ kind: 'army', id: a.id }); } return; }
  if (act === 'next') { nextArmy(); return; }
  if (act === 'todo') { openTodo(); return; }
  if (act === 'view-castle') { select({ kind: 'castle', i: +btn.dataset.id! }); return; }
  if (act === 'shioki') { const [ci, k] = btn.dataset.id!.split(':'); const c = st.castles[+ci]; if (c && shiokiPending(st).some((p) => p.castle === c.i)) { applyShioki(st, c, k as R.Shioki); toast(`${c.name}: ${R.SHIOKI_NAME[k as R.Shioki]}`); } refresh(); return; }
  if (act === 'cancel-pick') { picker = null; renderPanel(); return; }
  if (act === 'back' && mode.kind === 'attack') { select({ kind: 'army', id: mode.army }); return; }
  if ((act === 'order-cmd' || act === 'order-auto') && mode.kind === 'attack') {
    const a = st.armies[mode.army];
    orderAttack(st, a, mode.target.hex, act === 'order-cmd');
    const n = ordersAt(st, mode.target.hex, st.player).length;
    toast(`${st.generals[a.main].name}隊に出陣を命じた${n > 1 ? `（${n}隊で攻める）` : ''}。評定終了で開戦`);
    nextOrRefresh();
    return;
  }
  if (act === 'inv-agri' || act === 'inv-com' || act === 'shinden' || act === 'fort') {
    const c = st.castles[+(btn.dataset.id ?? -1)];
    if (c) {
      const why = act === 'shinden' ? shindenBlock(st, st.player, c) : act === 'fort' ? fortBlock(st, st.player, c) : investBlock(st, st.player, c, act === 'inv-agri' ? 'agri' : 'com');
      if (why) toast(why);
      else if (act === 'shinden') { startShinden(st, st.player, c); toast(`${c.name}で新田開発を始めた`); }
      else if (act === 'fort') { const nm = FORT_NAME[fortOf(c) + 1]; startFort(st, st.player, c); toast(`${c.name}で${nm}の普請を始めた`); }
      else { invest(st, st.player, c, act === 'inv-agri' ? 'agri' : 'com'); toast(`${c.name}の${act === 'inv-agri' ? '開発' : '商業'}に投じた`); }
      refresh();
    }
    return;
  }
  if (act === 'open-fiefs') { openMenu('jinji', 'fronts'); return; }
  if (act === 'rakuichi') { const c = st.castles[+(btn.dataset.id ?? -1)]; if (c) { const why = rakuichiBlock(st, c); if (why) toast(why); else { enactRakuichi(st, c); toast(`${c.name}に楽市楽座を布いた`); } refresh(); } return; }
  if (act === 'cancel-order' && mode.kind === 'army') { cancelOrder(st, mode.id); select({ kind: 'army', id: mode.id }); return; }
  if (mode.kind === 'army') {
    const a = st.armies[mode.id];
    if (!a) return;
    if (act === 'wait') { a.acted = true; a.mp = 0; nextOrRefresh(); return; }
    if (act === 'open-corps') { openMenu('jinji', 'corps'); return; }
    if (act === 'fill-army') { const n = fillArmy(st, a).length; toast(n ? `${n}人を配属した` : '入れられる武将がいなかった'); select({ kind: 'army', id: a.id }); return; }
    if (act === 'merge-ask') { const b = st.armies[+(btn.dataset.id ?? -1)]; if (b) openMergeSheet(st, a, b); return; }
    if (act === 'split-ask') { openSplitSheet(st, a); return; }
    if (act === 'open-fronts') { if (frontOfArmy(st, a)) openMenu('jinji', 'fronts'); else openMenu('naisei', 'deleg'); return; }
    if (act === 'disband') { disband(st, a); select({ kind: 'none' }); return; }
    if (act === 'hire-ashi') { const n = hireAshi(st, a, R.ASHI_STEP); if (n) toast(`${st.generals[a.main].name}隊に足軽${fmt(n)}人を雇った`); select({ kind: 'army', id: a.id }); return; }
    if (act === 'arm-guns') { armGuns(st, a, gunCap(a)); toast(`${st.generals[a.main].name}隊に鉄砲${fmt(a.guns ?? 0)}丁を持たせた`); select({ kind: 'army', id: a.id }); return; }
    if (act === 'unarm-guns') { armGuns(st, a, -(a.guns ?? 0)); select({ kind: 'army', id: a.id }); return; }
    if (act === 'arm-cannon') { armCannon(st, a, R.CANNON_MAX); toast(`${st.generals[a.main].name}隊に大筒${a.cannon}門を持たせた`); select({ kind: 'army', id: a.id }); return; }
    if (act === 'unarm-cannon') { armCannon(st, a, -(a.cannon ?? 0)); select({ kind: 'army', id: a.id }); return; }
  }
  if (mode.kind === 'castle') {
    const c = st.castles[mode.i];
    if (act === 'focus-castle') { const me = st.clans[st.player]; me.focus = me.focus === c.i ? null : c.i; toast(me.focus === c.i ? `${c.name}を予算の重点にした（治水・施しの半分を先に回す）` : '重点の城を解いた'); select({ kind: 'castle', i: c.i }); return; }
    if (act === 'pick-governor') { picker = 'governor'; renderPanel(); return; }
    if (act === 'pick-plot') { picker = 'plot'; renderPanel(); return; }
    if (act === 'ikki') { const a = raiseIkki(st, st.player, c); if (a) { toast(`${c.name}で一揆が起きた（評定終了で攻めかかる）`); view.flashHex(a.hex); } refresh(); select({ kind: 'castle', i: c.i }); return; }
    if (act === 'plot') {
      const g = st.generals[($('sel-plot') as HTMLSelectElement).value];
      if (!g) return;
      const r = doPlot(st, g, c, st.player);
      if (r !== 'caught') cutin(st, g, r === 'defect' ? 'plotOk' : r === 'naio' ? 'plotNaio' : 'plotNg', { castle: c.name });
      toast(r === 'defect' ? `${c.name}が寝返った！` : r === 'naio' ? `${c.name}に内応者ができた` : r === 'caught' ? `${g.name}が捕らえられた` : '調略は不調に終わった');
      if (r === 'defect') view.flashHex(c.hex);
      afterAction();
      select({ kind: 'castle', i: c.i });
      return;
    }
    if (act === 'pick-form') { picker = 'form'; renderPanel(); return; }
    if (act === 'castle-reorg') { const r = reshuffleAt(st, c.hex, st.player); toast(`${r.armies}つの軍団を組み直した`); afterAction(); select({ kind: 'castle', i: c.i }); return; }
    if (act === 'set-governor') {
      const g = st.generals[($('sel-gov') as HTMLSelectElement).value];
      if (!g) return;
      if (c.governor) { const old = st.generals[c.governor]; old.status = 'free'; }
      c.governor = g.id; g.status = 'governor'; g.loc = c.i;
      toast(`${g.name}を${c.name}の城主に任じた`); select({ kind: 'castle', i: c.i }); return;
    }
    if (act === 'drop-governor' && c.governor) { st.generals[c.governor].status = 'free'; c.governor = null; select({ kind: 'castle', i: c.i }); return; }
    if (act === 'form') {
      const g = st.generals[($('sel-form') as HTMLSelectElement).value];
      const troops = g ? Math.min(+($('sel-troops') as HTMLSelectElement).value, capOf(g)) : 0;
      const spot = formSpot(c, occupancy(st));
      if (!g || spot === null || !troops) return;
      g.loc = c.i;
      const a = formArmy(st, st.player, c, g.id, troops, spot);
      if (a) { toast(`${g.name}隊を編成した（来月から行動）`); select({ kind: 'army', id: a.id }); }
      return;
    }
    if (act === 'ronin') {
      const g = st.generals[btn.dataset.id!];
      if (g) { const ok = recruitRonin(st, g, st.player); if (ok) g.loc = c.i; toast(ok ? `${g.name}が仕官した` : `${g.name}は仕官を断った`); select({ kind: 'castle', i: c.i }); }
      return;
    }
  }
}

function nextOrRefresh() {
  const list = clanArmies(s!, s!.player).filter((a) => !a.acted && !a.routed);
  if (list.length) nextArmy(); else select({ kind: 'none' });
}

// ───────── ターン ─────────
function doEndTurn() {
  if (!s || busy || s.over) return;
  busy = true;
  $('btn-end').setAttribute('disabled', '');
  sfx('turn');
  toast('諸大名が動いている…');
  setTimeout(async () => {
    const st = s!;
    await endTurn(st);
    busy = false;
    $('btn-end').removeAttribute('disabled');
    $('toast').hidden = true;
    store(AUTO_KEY, JSON.stringify(st));
    mode = { kind: 'none' };
    refresh();
    if (st.over) { showGameOver(); return; }
    mapMood(st);
    if (st.log.some((l) => l.turn === st.turn - 1 && l.kind === 'castle' && l.text.includes(`${st.clans[st.player].name}家が`) && l.text.includes('を攻略'))) sfx('castle');
    playEvents(st, () => afterTurnReports(st));
  }, 30);
}
function afterTurnReports(st: GameState) {
  {
    const reps = st.reports.slice();
    const news = st.log.filter((l) => l.turn === st.turn - 1 && l.mine && l.kind !== 'battle');
    if (reps.length || news.length || vacantFiefs(st).length || st.offers?.length || st.missionVisit || shiokiPending(st).length || st.kanOffer || st.returnOffer || st.quarrel || st.willAsked === st.turn - 1 || rewardWaiting(st).some((g) => dueOf(g) >= R.ON_DUE_FREE && !delegateOf(st).staff) || (st.scenes?.length && cutinOn())) showReports(reps, `${dateLabel(st)}　諸国の動き`, news.map((l) => l.text));
    else toast(`${dateLabel(st)}`);
  }
}

// ───────── モーダル ─────────
function openModal(html: string, closable = true) {
  menuShown = false; reportShown = null;
  $('modal-body').innerHTML = html;
  labelTables($('modal-body'));
  softDisable($('modal-body'));
  $('modal-close').style.display = closable ? '' : 'none';
  $('modal').hidden = false;
  ($('modal').querySelector('.sheet') as HTMLElement).scrollTop = 0;
}
// 列の多い表は、狭い画面でカードに組み直せるよう各セルに見出しを持たせる
function labelTables(root: HTMLElement) {
  root.querySelectorAll('table').forEach((tb) => {
    const heads = Array.from(tb.querySelectorAll('thead th')).map((h) => h.textContent?.trim() ?? '');
    if (heads.length < 6) return;
    tb.classList.add('cardable');
    tb.querySelectorAll('tbody tr').forEach((tr) => {
      const cells = Array.from(tr.children) as HTMLElement[];
      if (cells.some((c) => (c as HTMLTableCellElement).colSpan > 1)) { tr.classList.add('note'); return; }
      cells.forEach((c, k) => { if (heads[k]) c.dataset.l = heads[k]; if (!heads[k] || (k > 0 && c.querySelectorAll('button, select').length >= 2)) c.classList.add('acts'); });
    });
  });
}
// 触れる画面（マウスの乗らない端末）: 押せない札は理由が見えないので、押せない見た目のまま押せるようにし、押すと理由を出す
const touchUI = () => window.matchMedia('(hover: none)').matches;
function softDisable(root: HTMLElement) {
  if (!touchUI()) return;
  root.querySelectorAll<HTMLButtonElement>('button[disabled][title]').forEach((b) => { if (!b.title.trim()) return; b.disabled = false; b.setAttribute('aria-disabled', 'true'); b.classList.add('off'); });
}
function closeModal() { $('modal').hidden = true; menuShown = false; reportShown = null; }

function battleHtml(r: BattleReport) {
  const st = s!;
  const ac = r.attackerClan ? st.clans[r.attackerClan] : null, dc = r.defenderClan ? st.clans[r.defenderClan] : null;
  return `<div class="battle">
    <div class="vs"><div><div class="who"><span class="swatch" style="background:${ac?.color}"></span> ${esc(r.attackerName)}${r.charge ? '（突撃）' : ''}</div><div class="cl">${esc(ac?.name ?? '')}家・攻</div><div class="tr">${fmt(r.aStart)} → ${fmt(r.aEnd)}</div></div>
    <div class="stamp">${esc(r.outcome.replace('の勝利', '勝'))}</div>
    <div class="side-b"><div class="who">${esc(r.defenderName)} <span class="swatch" style="background:${dc?.color ?? '#7d735c'}"></span></div><div class="cl">${esc(dc ? dc.name + '家' : '国人衆')}・守　${esc(terrainLabel(r.hex))}</div><div class="tr">${fmt(r.dStart)} → ${fmt(r.dEnd)}</div></div></div>
    <ol>${r.rounds.map((x) => `<li>攻 −${fmt(x.aLoss)}（士気${x.aMorale.toFixed(2)}）　守 −${fmt(x.dLoss)}（士気${x.dMorale.toFixed(2)}）${x.note ? '　' + esc(x.note) : ''}</li>`).join('')}</ol>
    ${r.events.length ? `<div class="ev">${r.events.map(esc).join('、')}</div>` : ''}
  </div>`;
}

// 与力を選ぶ一覧（寄親の札の中）: 他の城持ちをチェックで選ぶ。近い順。寄親に従う領は寄親になれない
function yorikiList(st: GameState, f: Front) {
  const seat = st.castles[f.seat ?? f.castles[0]];
  const dist = (x: Front) => Math.min(...x.castles.map((i) => hexDist(st.castles[i].hex, seat.hex)));
  const cands = frontsOf(st).filter((x) => !x.vacant && x.id !== f.id).sort((a, b) => dist(a) - dist(b));
  if (!cands.length) return '<p class="hint">ほかに城持ちがいない。</p>';
  return `<div class="yoriki-list">${cands.map((x) => { const g = st.generals[x.leader], other = x.boss !== undefined && x.boss !== f.id ? frontById(st, x.boss) : null, sub = frontsOf(st).filter((y) => y.boss === x.id).length;
    return `<label class="il-opt il-radio"><input type="checkbox" name="yoriki" value="${x.id}" ${x.boss === f.id ? 'checked' : ''}><b>${esc(g.name)}（${esc(R.RANK_NAME[g.rank])}）</b><span>${x.castles.map((i) => esc(st.castles[i].name)).join('・')}　${fiefKoku(st, x).toFixed(1)}万石・${dist(x)}ヘックス${other ? `・<span class="warn">今は${esc(frontName(st, other))}の与力</span>` : ''}${sub ? `・与力${sub}（${esc(g.name)}ごとこちらへ移る）` : ''}</span></label>`; }).join('')}</div>
    <div class="actions"><button class="act primary" data-act="yoriki-apply" data-id="${f.id}">決める</button><button class="act" data-act="yoriki-open" data-id="${f.id}">やめる</button></div>`;
}

// 茶会の場面: 亭主の城の茶室で、亭主の口上・湯の音・客の言葉（気性ごと）・結び
const TEA_HOST: Record<string, string[]> = {
  bold: ['堅苦しいことは抜きじゃ。まずは一服、飲まれよ。', '戦の話は置いておけ。今日は茶じゃ。'],
  wise: ['一期一会と申します。今日のこの一服は、二度とは巡ってまいりませぬ。', '茶の湯は、心を静めて人を見る場にござる。'],
  gentle: ['皆さま、日頃のお働き、まことにかたじけなく。ささやかながら一服を。', '肩の力を抜いて、ゆるりとなされませ。'],
  steady: ['点前は拙いが、心は込めた。召し上がれ。', '一服、差し上げよう。'],
};
const TEA_GUEST: Record<string, string[]> = {
  bold: ['……茶など柄ではないが、悪くない。', 'ふむ、この一碗で、ちと腹の虫が収まったわ。'],
  wise: ['一碗の茶に、殿のお心遣いを見ました。', 'この静けさの中でこそ、見えるものもござる。'],
  gentle: ['身に余るおもてなし、痛み入りまする。', 'ありがたや……。胸の内のわだかまりが、溶けていくようにござる。'],
  steady: ['結構な点前にござった。', '馳走になった。この御恩、働きでお返しいたす。'],
};
function teaBeats(st: GameState, host: General, guests: General[], on0: Map<string, number>): OpeningBeat[] {
  const castle = st.castles[host.loc]?.owner === st.player ? st.castles[host.loc] : capitalCastle(st);
  const at = castle?.id, pick = <T,>(xs: T[], k: number) => xs[(k + st.turn) % xs.length];
  const tea = host.tea ? st.items[host.tea] : null;
  const shown = guests.slice(0, 3);
  const beats: OpeningBeat[] = [
    { head: '茶会', text: `${castle ? `${castle.name}の` : ''}茶室。亭主の${host.name}が、${guests.map((g) => g.name).join('・')}を招いた。`, at, zoom: 1.8, light: [st.player], mark: at ? [at] : [] },
    { who: host.id, name: host.name, label: '亭主', text: tea ? `今日は「${tea.name}」で一服差し上げよう。${pick(TEA_HOST[temperOf(host)], 0)}` : pick(TEA_HOST[temperOf(host)], 1), at, zoom: 1.8, light: [st.player] },
    { head: '', text: '釜の湯がしずかに鳴る。茶筅の音のほかは、何も聞こえない。', at, zoom: 1.8, light: [st.player] },
    ...shown.map((g, k): OpeningBeat => { const own = g.tea ? st.items[g.tea] : null; return { who: g.id, name: g.name, label: own ? `客・「${own.name}」を持参` : '客', text: own ? `わたしも「${own.name}」を持ってまいった。名物どうし、並べて眺めるのもまた一興。` : pick(TEA_GUEST[temperOf(g)], k), at, zoom: 1.8, light: [st.player] }; }),
    { head: '茶会のあと', text: `${tea ? `亭主の名物「${tea.name}」で、客の皆の恩がさらに+${teaGrade(st, host)}。` : ''}${guests.some((g) => teaGrade(st, g)) ? '茶器を持参した客は、その格の分さらに上がった。' : ''}${guests.map((g) => `${g.name}（恩${Math.round(on0.get(g.id) ?? 0)}→${Math.round(g.on ?? 0)}）`).join('、')}。`, at, zoom: 1.6, light: [st.player] },
  ];
  return beats;
}
const capitalCastle = (st: GameState) => { const L = st.clans[st.player].leader ? st.generals[st.clans[st.player].leader!] : null; return L ? st.castles[L.loc] : clanCastles(st, st.player)[0]; };

// 忍びの場面: 夜の潜入 → 忍び頭のひとこと → 首尾（成った・しくじった・捕らわれた）
function ninjaBeats(st: GameState, kind: NinjaAct, head: General, tg: { gen?: General; castle?: Castle }, r: 'ok' | 'fail' | 'caught', c0: { chian: number; store: number; gov: General | null; on: number } | null): OpeningBeat[] {
  const hex = tg.castle ? tg.castle.hex : tg.gen ? genHex(st, tg.gen) ?? st.castles[tg.gen.loc].hex : 0;
  const near = tg.castle ?? [...st.castles].sort((a, b) => hexDist(a.hex, hex) - hexDist(b.hex, hex))[0];
  const at = near.id, place = tg.castle ? tg.castle.name : tg.gen?.army !== null && tg.gen?.army !== undefined ? `${near.name}の近くの陣` : near.name;
  const foe = tg.gen?.clan ?? tg.castle?.owner ?? null, foeName = foe ? `${clanName(st, foe)}家` : '国人衆';
  const base = { at, zoom: 1.9, light: foe ? [foe] : [], mark: [at] };
  const intro: Record<NinjaAct, string> = {
    assassinate: `月のない夜。忍び頭の${head.name}が、${tg.gen?.name ?? ''}のいる${place}へ忍び入る。`,
    rumor: `${place}の城下。旅の商人や虚無僧に化けた者たちが、市や辻に紛れ込んでいく。`,
    arson: `風の強い夜。${head.name}の手の者が、${place}の蔵と城門に近づく。`,
    spy: `${head.name}の手の者が、${tg.gen?.name ?? ''}のいる${place}に紛れ込む。`,
  };
  const word: Record<NinjaAct, string> = { assassinate: '……一太刀で、終わらせる。', rumor: '噂というものは、刀より深く刺さるものよ。', arson: '火は、風が運んでくれる。', spy: '見るだけ、聞くだけ。それで足りる。' };
  const beats: OpeningBeat[] = [
    { head: `夜陰 ― ${NINJA_NAME[kind]}`, text: intro[kind], ...base, sound: 'clap' },
    { who: head.id, name: head.name, label: '忍び頭', text: word[kind], ...base },
  ];
  const c = tg.castle, gv = c0?.gov ?? null;
  if (r === 'ok') {
    if (kind === 'assassinate') beats.push({ head: '暗殺', text: `翌朝、${tg.gen!.name}は寝所で冷たくなっていたと伝わる。${foeName}は将を一人失った。`, ...base, sound: 'clash' });
    if (kind === 'rumor') {
      if (gv) beats.push({ who: gv.id, name: gv.name, label: `${c!.name}の城主`, text: '……殿は、わしを疑っておられるのか。あの噂は、誰が流したのだ。', ...base });
      beats.push({ head: '流言', text: `${c!.name}の治安は${Math.round(c0!.chian)}→${Math.round(c!.chian)}に乱れた。${gv ? `城主${gv.name}の主家への恩も${Math.round(c0!.on)}→${Math.round(gv.on ?? 0)}に下がった。` : ''}`, ...base });
    }
    if (kind === 'arson') beats.push({ head: '放火', text: `夜空を焦がす火の手が上がった。${c!.name}の蔵の兵糧は${fmt(c0!.store)}→${fmt(c!.store ?? 0)}石、城門も焼けた。`, ...base, sound: 'fire' });
    if (kind === 'spy') { const t = tg.gen!, a = t.army !== null ? st.armies[t.army] : undefined; beats.push({ head: '探り', text: `${t.name}の力量が明らかになった。武勇${t.bra}・知略${t.int}・統率${t.lea}・魅力${t.cha}。${a ? `率いる隊は兵${fmt(a.troops)}・鉄砲${fmt(a.guns ?? 0)}。` : ''}`, ...base }); }
  } else {
    if (tg.gen && kind === 'assassinate') beats.push({ who: tg.gen.id, name: tg.gen.name, label: foeName, text: '何奴！ 曲者じゃ、出あえ、出あえ！', ...base, sound: 'clash' });
    else beats.push({ head: '露見', text: `${place}の者たちが騒ぎ出した。手の者は闇に紛れて逃げた。`, ...base });
    if (r === 'caught') beats.push({ who: head.id, name: head.name, label: '捕らわれた', text: '……不覚。', ...base, sound: 'lose' }, { head: 'しくじり', text: `${head.name}は${foeName}に捕らわれた。忍び頭の座は空いた。${foeName}は当家を恨んでいる。`, ...base });
    else beats.push({ head: 'しくじり', text: `${NINJA_NAME[kind]}はしくじった。${foeName}は当家を恨んでいる。`, ...base });
  }
  return beats;
}

// ───────── 大きな出来事の場面（家督相続・滅亡・降伏・謀反） ─────────
const EVENTS_KEY = 'sengoku-events';
// 出すか（設定で切れる）。自動テスト（webdriver）では、明示して「on」にしたときだけ出す
const eventsOn = () => { try { const v = localStorage.getItem(EVENTS_KEY); if (v === 'off') return false; if ((navigator as Navigator & { webdriver?: boolean }).webdriver) return v === 'on'; } catch { /* 読めなければ出す */ } return true; };
// 親しい者の呼び方: 姓を除いた名（「織田信広」→「信広」）
const callName = (g: General) => (g.name.length >= 3 ? g.name.slice(-2) : g.name);
const OPENING_IDS = new Set(OPENING_PEOPLE.map(([id]) => id));
function eventBeats(st: GameState, e: BigEvent): { title: string; mood: Mood; beats: OpeningBeat[] } {
  const P = st.player, C = st.clans[P], lord = C.leader ? st.generals[C.leader] : undefined;
  const gen = (id: string | null | undefined) => (id ? st.generals[id] : undefined);
  const capId = (capital(st, P) ?? clanCastles(st, P)[0])?.id;
  if (e.kind === 'katoku') {
    const old = gen(e.old), heir = gen(e.heir)!, regent = gen(e.regent);
    const base = { at: capId, zoom: 1.6, light: [P], mark: capId ? [capId] : [] };
    const will = e.will ? R.WILL_NAME[e.will as keyof typeof R.WILL_NAME] : null;
    const beats: OpeningBeat[] = [{ head: `${old?.name ?? '当主'}、逝く`, text: `${C.name}家の当主${old?.name ?? ''}が世を去った。家中の者が、急ぎ${capId ? st.castles.find((c) => c.id === capId)!.name : '本城'}に集まる。`, ...base, sound: 'turn' }];
    if (old) beats.push({ who: old.id, name: old.name, label: '最期の言葉', text: will ? `${callName(heir)}……あとは任せた。${will}。それを忘れねば、家は残る……。` : `${callName(heir)}……この家を、頼んだぞ……。`, ...base });
    if (regent) beats.push({ who: regent.id, name: regent.name, label: '後見役', text: e.young ? `若殿は、この${regent.name}が命に代えてお支えいたしまする。` : `新しき殿のもと、家中を一つにまとめまする。`, ...base });
    beats.push({ who: heir.id, name: heir.name, label: '家督を継ぐ', text: e.young ? '……父上のあとは、わたしが継ぎまする。皆、力を貸してくだされ。' : `${C.name}の家は、わしが継ぐ。皆、ついて来い。`, ...base });
    beats.push({ head: '家督相続', text: `${C.name}家は${heir.name}が継いだ。${will ? `遺言「${will}」は家中に伝えられた。` : ''}代替わりに、家中にも領内にも動揺が広がっている。`, ...base });
    return { title: '家督相続', mood: 'somber', beats };
  }
  if (e.kind === 'ruin') {
    const foe = gen(e.leader), base = { at: e.castle, zoom: 1.7, light: [P], mark: [e.castle] };
    const cname = st.castles.find((c) => c.id === e.castle)?.name ?? '';
    const beats: OpeningBeat[] = [{ head: `${e.name}家、滅ぶ`, text: `${cname}が落ち、${e.name}家は最後の城を失った。`, ...base, sound: 'castle' }];
    if (foe && foe.status !== 'dead') beats.push({ who: foe.id, name: foe.name, label: `${e.name}家の当主`, text: '無念……。わが家も、ここまでか。', ...base });
    else if (foe) beats.push({ head: '', text: `当主の${foe.name}は、すでにこの世になかった。`, ...base });
    if (lord) beats.push({ who: lord.id, name: lord.name, label: `${C.name}家の当主`, text: `${e.name}の旧領は、当家が治める。民を安んじよ。`, ...base });
    beats.push({ head: '滅亡', text: `${e.name}家の旧臣は散り散りになった。浪人や捕虜を召し抱えるか否かは、殿の胸ひとつ。`, ...base });
    return { title: `${e.name}家の滅亡`, mood: 'war', beats };
  }
  if (e.kind === 'surrender') {
    const foe = gen(e.leader), at = e.seat ?? capId, base = { at, zoom: 1.6, light: [P], mark: at ? [at] : [] };
    const beats: OpeningBeat[] = [{ head: `${e.name}家、降る`, text: `${e.name}家が、当家の降伏勧告を受け入れた。`, ...base, sound: 'clap' }];
    if (foe) beats.push({ who: foe.id, name: foe.name, label: `${e.name}家の当主`, text: `本領を安堵いただけるなら、${e.name}の家は貴家の旗の下に入りまする。`, ...base });
    if (lord) beats.push({ who: lord.id, name: lord.name, label: `${C.name}家の当主`, text: 'よかろう。これよりは当家の城持ちとして、その地を守れ。', ...base });
    beats.push({ head: '本領安堵', text: foe ? `${foe.name}は本領${e.castles}城を安堵され、外様の城持ちとなった。家臣${e.baishin}人はその陪臣。` : `${e.name}家の${e.castles}城が当家に加わった。`, ...base });
    return { title: `${e.name}家の降伏`, mood: 'peace', beats };
  }
  if (e.kind === 'ikki') {
    const c = st.castles.find((x) => x.id === e.castle)!, base = { at: e.castle, zoom: 1.8, light: [P, e.clan], mark: [e.castle] };
    const kennyo = st.generals.honganji_kennyo, kAlive = kennyo && kennyo.clan === e.clan && !['dead', 'captive'].includes(kennyo.status);
    const beats: OpeningBeat[] = [
      { head: '一向一揆', text: `${c.name}の領内で、門徒が蜂起した。寺の鐘が鳴り、筵旗が立つ。${fmt(e.troops)}人の一揆勢が、城へ迫る。`, ...base, sound: 'horn' },
      { who: 'ikki_toryo', name: '一揆の旗頭', label: '門徒', text: '進まば往生極楽、退かば無間地獄！ 仏敵を討て！', ...base },
    ];
    if (kAlive) beats.push({ who: kennyo.id, name: kennyo.name, label: '本願寺の門主', text: '門徒の衆よ、法敵に屈してはならぬ。', ...base });
    beats.push({ head: '門徒の戦', text: '一揆勢は百姓だが、死を恐れない。城兵だけで支えるか、兵を向けて散らすか。', ...base });
    return { title: '一向一揆', mood: 'battle', beats };
  }
  if (e.kind === 'treaty') {
    const O = st.clans[e.other], ol = O?.leader ? st.generals[O.leader] : undefined, ocap = capital(st, e.other)?.id, both = [P, e.other];
    const base = { at: ocap ?? capId, zoom: 1.2, light: both, mark: [ocap, capId].filter((x): x is string => !!x) };
    if (e.treaty === 'alliance') {
      const beats: OpeningBeat[] = [{ head: '同盟', text: `${O.name}家と同盟を結んだ。互いに攻めず、背を預け合う（${DIP.ALLIANCE_MONTHS}か月）。`, ...base, sound: 'clap' }];
      if (ol) beats.push({ who: ol.id, name: ol.name, label: `${O.name}家の当主`, text: '互いに背を預けよう。これで前の敵だけを見ていられる。', ...base });
      if (lord) beats.push({ who: lord.id, name: lord.name, label: `${C.name}家の当主`, text: 'よしなに頼む。この盟約、違えることのなきように。', ...base });
      return { title: `${O.name}家との同盟`, mood: 'peace', beats };
    }
    const hime = `hime_${1 + ([...e.other].reduce((t, ch) => t + ch.charCodeAt(0), 0) % 3)}`;
    const beats: OpeningBeat[] = [{ head: '婚姻', text: `${O.name}家と婚姻を結んだ。${O.name}家の姫が、${capId ? st.castles.find((c) => c.id === capId)!.name : '本城'}へ輿入れする。`, ...base, arrow: ocap && capId ? [[ocap, capId]] : [], sound: 'clap' }];
    beats.push({ who: hime, name: `${O.name}家の姫`, label: '輿入れ', text: '末永く、よしなに……。両家の縁を、つなぎとうございます。', ...base });
    if (ol) beats.push({ who: ol.id, name: ol.name, label: `${O.name}家の当主`, text: '娘を頼む。これで両家の縁は固い。', ...base });
    if (lord) beats.push({ who: lord.id, name: lord.name, label: `${C.name}家の当主`, text: '確かに迎えた。両家の縁、大事にいたそう。', ...base });
    beats.push({ head: '縁を結ぶ', text: '婚姻に期限はない。手切れにすれば、同盟より重く威信を失う。', ...base });
    return { title: `${O.name}家との婚姻`, mood: 'peace', beats };
  }
  if (e.kind === 'ship') {
    const base = { at: e.port, zoom: 1.7, light: [P], mark: [e.port] };
    return { title: '南蛮船', mood: 'peace', beats: [
      { head: '南蛮船', text: `${portName(e.port)}の沖に、見たこともない大船が現れた。黒い船体に、幾重もの帆。湊は人だかりで埋まった。`, ...base, sound: 'horn' },
      { who: 'capitan', name: '南蛮船のカピタン', label: 'ポルトガルの商人', text: 'わたしどもはポルトガルの商人です。鉄砲も、大筒も、珍しい品もございます。よいお取引を。', ...base },
      { head: '南蛮市', text: `南蛮船は${R.SHIP_STAY}か月とどまる。「商い」の南蛮市で鉄砲・大筒・南蛮の品を買える。来ている間は貿易の利も入る。`, ...base },
    ] };
  }
  if (e.kind === 'mission') {
    const md = misDef(e.mis), base = { at: capId, zoom: 1.6, light: [P], mark: capId ? [capId] : [] };
    return { title: '宣教師の来訪', mood: 'peace', beats: [
      { head: '宣教師の来訪', text: `黒い衣の異国の僧、${md?.[1] ?? '宣教師'}が、布教の許しを願って訪ねてきた。`, ...base, sound: 'ponn' },
      { who: e.mis, name: md?.[1] ?? '宣教師', label: '宣教師', text: 'デウスの教えを、この国の民に伝えることを、どうかお許しください。', ...base },
      { head: '許すか、禁じるか', text: '布教を許せば南蛮船が来やすくなるが、寺社は反発する。返事は今月の要件で。', ...base },
    ] };
  }
  if (e.kind === 'kan') {
    const r = e.rank, nm = R.COURT[r].name, high = r >= R.KAMPAKU, base = { at: 'kyo', zoom: 1.6, light: [P], mark: ['kyo'] };
    const head = r === R.SHOGUN ? '征夷大将軍' : r === R.KAMPAKU ? '関白' : r >= 5 ? '大臣の列' : '公卿に列す';
    const kuge = personaActive('konoe_sakihisa', st.year) ? 'konoe_sakihisa' : ['kajuji_haretoyo', 'kajuji_harumigi', 'yamashina_tokitsugu'].find((id) => personaActive(id, st.year));
    const beats: OpeningBeat[] = [{ head, text: `勅使が京から下り、${C.name}家の当主${lord?.name ?? ''}を${nm}に任ずる宣旨を伝えた。`, ...base, sound: 'clap' }];
    beats.push({ who: 'misu', name: '御簾の内より', label: '帝', text: r === R.SHOGUN ? `${nm}に任ずる。武家の棟梁として、天下の静謐を守れ。` : r === R.KAMPAKU ? `${nm}に任ずる。天下の政を、そなたに託す。` : `${nm}に任ずる。いよいよ朝廷のために励め。`, ...base });
    if (kuge) beats.push({ who: kuge, name: PERSONAS[kuge].name, label: PERSONAS[kuge].title, text: r === R.SHOGUN ? '将軍の宣下、まことにめでたい。これよりは天下の武家の棟梁にござる。' : r === R.KAMPAKU ? '武家にして関白とは、前代未聞。されど、時がそれを求めておるのでしょう。' : '公卿の列に加わられたこと、まことにめでたい。', ...base });
    if (lord) beats.push({ who: lord.id, name: lord.name, label: `${C.name}家の当主`, text: high ? '謹んでお受けいたす。この国の乱れ、必ず鎮めてみせよう。' : 'ありがたき幸せ。いよいよ励みまする。', ...base });
    beats.push({ head: '任官', text: `威信+${R.COURT[r].pres}、攻められにくさ${Math.round(R.COURT[r].deter * 100)}%。${r === R.SHOGUN ? '将軍として、自ら御内書を下し、職を与えられる。' : r === R.KAMPAKU ? '関白は天下に一人。' : ''}`, ...base });
    return { title: `${nm}への任官`, mood: 'triumph', beats };
  }
  if (e.kind === 'sponsor') {
    const sg = gen(e.gen)!, base = { at: 'kyo', zoom: 1.7, light: [P, 'ashikaga'], mark: ['kyo'] };
    const beats: OpeningBeat[] = [{ head: '将軍擁立', text: `${C.name}家は${sg.name}を奉じて京に入り、足利の将軍家を再び立てた。`, ...base, arrow: capId ? [[capId, 'kyo']] : [], sound: 'horn' }];
    beats.push({ who: sg.id, name: sg.name, label: '将軍', text: 'そなたの忠義、決して忘れぬ。共に天下を正そうぞ。', ...base });
    if (lord) beats.push({ who: lord.id, name: lord.name, label: `${C.name}家の当主`, text: '公方様の御為に。……天下は、ここから動き出す。', ...base });
    beats.push({ head: '公方を奉じる', text: '擁立した将軍は、当家の願う御内書を出しやすい。だが当家が大きくなりすぎれば、手を切って諸家に討伐を命じることもある。', ...base });
    return { title: '将軍擁立', mood: 'triumph', beats };
  }
  if (e.kind === 'anecdote') {
    const a = ANECDOTES.find((x) => x.id === e.id)!, main = st.generals[a.who[0]];
    const loc = st.castles[main.loc], base = { at: loc?.id, zoom: 1.5, light: main.clan ? [main.clan] : [], mark: loc ? [loc.id] : [] };
    const clanOf = (id: string) => { const c = st.generals[id]?.clan; return c && st.clans[c] ? `${st.clans[c].name}家` : '在野'; };
    const extra = (id: string) => id.startsWith('g_') || OPENING_IDS.has(id) || !!PERSONAS[id]; // 武将でない話し手（汎用の顔・序幕の人物・茶人や公家などの人物）
    const here = (id: string) => { const g = st.generals[id]; return !!g && g.status !== 'dead'; };
    // 脇役: g_ で始まる id は汎用の顔（名は beat の name）。武将の脇役がいなければ alt の語りに置き換えるか飛ばす。need の武将がいなければ飛ばす
    const src = a.beats.flatMap((b): OpeningBeat[] => {
      if (b.need && !here(b.need)) return [];
      if (b.who && PERSONAS[b.who] && !personaActive(b.who, st.year)) return b.alt ? [{ text: b.alt, bg: b.bg }] : [];
      if (b.who && !extra(b.who) && !here(b.who)) return b.alt ? [{ text: b.alt, bg: b.bg }] : [];
      return [b];
    });
    const beats: OpeningBeat[] = src.map((b) => ({ ...b, bg: b.bg ?? a.bg })).map((b) => b.who && extra(b.who) ? { ...b, ...base, name: b.name ?? '', label: b.label ?? '', text: fillNames(st, b.text) } : b.who ? { ...b, ...base, name: st.generals[b.who]?.name ?? '', label: b.label || clanOf(b.who), text: fillNames(st, b.text) } : { ...b, ...base, head: b.head && fillNames(st, b.head), text: fillNames(st, b.text) });
    const gains = new Map<string, string[]>();
    for (const [id, k, n] of a.gain) gains.set(id, [...(gains.get(id) ?? []), `${STAT_NAME[k]}+${n}`]);
    beats.push({ bg: a.bg, head: '逸話', text: `${[...gains].map(([id, xs]) => `${st.generals[id]?.name ?? ''}（${clanOf(id)}）: ${xs.join('・')}`).join('、')}`, ...base });
    return { title: `逸話 ― ${a.title}`, mood: 'peace', beats };
  }
  if (e.kind === 'tenshu') {
    const c = st.castles.find((x) => x.id === e.castle)!, gv = c.governor ? st.generals[c.governor] : undefined, base = { at: c.id, zoom: 1.9, light: [P], mark: [c.id] };
    const beats: OpeningBeat[] = [
      { head: '天守、成る', text: `${c.name}に、幾重にも屋根を重ねた天守がそびえ立った。城下の者は皆、見上げて息をのんだ。`, ...base, sound: 'win' },
      { who: 'daiku_toryo', name: '大工の棟梁', label: '普請', text: '長い普請、ようやく成りました。この天守、百年は保ちましょう。', ...base },
    ];
    if (gv && gv.id !== lord?.id) beats.push({ who: gv.id, name: gv.name, label: `${c.name}の城主`, text: 'これほどの城、敵も攻めあぐねましょう。', ...base });
    if (lord) beats.push({ who: lord.id, name: lord.name, label: `${C.name}家の当主`, text: '見事じゃ。この天守が、当家の威光を天下に示す。', ...base });
    beats.push({ head: '天守', text: `威信+${R.TENSHU_PRESTIGE}。${c.name}の守り・城兵・城門は、土塁のころよりずっと固くなった。`, ...base });
    return { title: `${c.name}の天守`, mood: 'triumph', beats };
  }
  const reb = gen(e.leader)!, at = e.seat ?? capId, base = { at, zoom: 1.6, light: e.clan ? [e.clan, P] : [P], mark: at ? [at] : [] };
  const odoso = e.why === 'odoso', heir = gen(e.heir);
  const beats: OpeningBeat[] = [
    { head: odoso ? 'お家騒動' : '謀反', text: odoso ? `家督をめぐって、${reb.name}が${heir?.name ?? '新しい当主'}の跡目を認めず、${e.castles}城を率いて家を割った。` : `${reb.name}が謀反を起こした！ ${e.castles}城が当家を離れ、${e.name}家を立てた。`, ...base, sound: 'horn' },
    { who: reb.id, name: reb.name, label: odoso ? '一門' : '城持ち', text: odoso ? '頼りない若輩に、この家は任せられぬ。' : '恩賞は薄く、疑いばかり……。もはや、主と仰ぐことはできぬ。', ...base },
  ];
  if (lord) beats.push({ who: lord.id, name: lord.name, label: `${C.name}家の当主`, text: odoso ? `……ならば、力で家をまとめるまで。` : `……${reb.name}め、恩を仇で返すか！`, ...base });
  beats.push({ head: odoso ? '家が割れた' : '離れた領', text: `${e.name ? `${e.name}家は、いまや敵である。` : ''}離れた城を取り戻すか、和を探るか。`, ...base });
  return { title: odoso ? 'お家騒動' : '謀反', mood: 'war', beats };
}
// 出来事の場面を順に見せ、終わったら then
// 場面の背景の絵: from 枚目から先の、bg のない一枚に付ける（最初の一枚は地図で場所を見せることが多い）
const withBg = (beats: OpeningBeat[], key: string, from = 1) => { beats.forEach((b, k) => { if (k >= from && !b.bg) b.bg = key; }); return beats; };
const EVENT_BG: Partial<Record<BigEvent['kind'], [string, number]>> = {
  katoku: ['zashiki_night', 0], ruin: ['fire_castle', 0], surrender: ['jinmaku', 1], rebel: ['zashiki_night', 1], ikki: ['mura', 1], treaty: ['zashiki_day', 1],
  ship: ['minato', 1], mission: ['zashiki_day', 1], kan: ['gosho', 0], sponsor: ['gosho', 1], tenshu: ['ishigaki', 1],
};
function playEvents(st: GameState, then: () => void) {
  const evs = (st.events ?? []).splice(0);
  if (!evs.length || !eventsOn()) { then(); return; }
  closeModal();
  const next = (k: number) => {
    if (k >= evs.length) { mapMood(st); refresh(); then(); return; }
    const { title, mood: m, beats } = eventBeats(st, evs[k]);
    const eb = EVENT_BG[evs[k].kind]; if (eb) withBg(beats, eb[0], eb[1]);
    mood(m);
    playScene(view, st, title, beats, (id, w) => face(id, w), () => next(k + 1));
  };
  next(0);
}

// 領主のいなくなった領の後継ぎ
function heirBlock(st: GameState) {
  const vs = vacantFiefs(st);
  if (!vs.length) return '';
  return `<h3 class="sect-h">後継ぎを決める領</h3>${vs.map((f) => {
    const cs = fiefHeirCands(st, f), old = st.generals[f.leader];
    return `<div class="front-card"><p style="margin:0 0 6px">${esc(old?.name ?? '')}の領（${f.castles.map((i) => esc(st.castles[i].name)).join('・')}、${fiefKoku(st, f).toFixed(1)}万石）。陪臣${Object.values(st.generals).filter((g) => g.liege === f.leader && g.clan === st.player).length}人。</p>
      <div class="actions" style="margin:0">${cs.length ? `<select id="sel-heir-${f.id}" aria-label="後継ぎ">${cs.map((g) => `<option value="${g.id}">${esc(g.name)}（${g.liege ? '陪臣・' : ''}${esc(R.RANK_NAME[g.rank])}・${fiefCap(g) === Infinity ? '城の上限なし' : `${fiefCap(g)}城まで`}）</option>`).join('')}</select><button class="act primary" data-act="fief-heir" data-id="${f.id}">継がせる</button>` : '<span class="hint" style="margin:0">継げる者がいない</span>'}<button class="act" data-act="front-off" data-id="${f.id}">召し上げて直轄に</button></div></div>`;
  }).join('')}`;
}

// ───────── 月の報告と今月の要件 ─────────
// 決めること（要件）と知らせ（諸国の動き）をタブで分ける。要件は閉じても右の画面と「要件」ボタンに残る
const decisionsHtml = (st: GameState) => heirBlock(st) + bushiBlock(st) + willBlock(st) + shiokiBlock(st) + rewardsBlock(st) + missionVisitBlock(st) + offersBlock(st);
function todoItems(st: GameState): { label: string; n: number }[] {
  const out: { label: string; n: number }[] = [];
  const add = (label: string, n: number) => { if (n) out.push({ label, n }); };
  add('後継ぎを決める領', vacantFiefs(st).length);
  add('恩賞を待つ者', delegateOf(st).staff ? 0 : rewardWaiting(st).filter((g) => dueOf(g) >= R.ON_DUE_FREE).length);
  add('仕置を決める城', shiokiPending(st).length);
  add('仕官の願い出', (st.offers ?? []).length);
  add('宣教師の来訪', st.missionVisit ? 1 : 0);
  add('官の誘い', st.kanOffer && st.generals[st.kanOffer.gen]?.clan === st.player ? 1 : 0);
  add('帰参の願い', st.returnOffer && st.generals[st.returnOffer.gen]?.status === 'ronin' ? 1 : 0);
  add('喧嘩の裁き', st.quarrel && st.generals[st.quarrel.gen]?.clan === st.player ? 1 : 0);
  const L = st.clans[st.player].leader ? st.generals[st.clans[st.player].leader!] : null;
  add('遺言', L?.sick && st.willAsked === st.turn - 1 ? 1 : 0);
  return out;
}
const todoCount = (st: GameState) => todoItems(st).reduce((t, x) => t + x.n, 0);
let reportShown: [BattleReport[], string, string[], 'todo' | 'news' | 'only'] | null = null;
let newsAll = false;
function showReports(reps: BattleReport[], title: string, news: string[] = [], tab?: 'todo' | 'news' | 'only') {
  const st = s!;
  const dec = decisionsHtml(st), n = todoCount(st);
  if (!tab) tab = dec ? 'todo' : 'news';
  if (tab === 'todo' && !dec) tab = 'news';
  if (tab === 'only' && !dec) { closeModal(); toast('今月決めることはない'); return; }
  const allNews = newsAll ? st.log.filter((l) => l.turn === st.turn - 1 && l.kind !== 'battle').map((l) => l.text) : news;
  const tabs = tab === 'only' ? '' : `<div class="tabs" role="tablist"><button role="tab" data-act="rtab" data-id="todo" aria-selected="${tab === 'todo'}" ${dec ? '' : 'disabled'}>今月の要件${n ? ` <span class="badge">${n}</span>` : ''}</button><button role="tab" data-act="rtab" data-id="news" aria-selected="${tab === 'news'}">諸国の動き</button></div>`;
  const body = tab === 'news'
    ? `${scenesBlock(st)}
      <div class="actions" style="margin:4px 0"><button class="mini" data-act="rnews" aria-pressed="${newsAll}">${newsAll ? '自家の知らせだけ' : '全国の知らせも見る'}</button></div>
      ${allNews.length ? `<ul class="lede" style="padding-left:1.2em">${allNews.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '<p class="hint">知らせはない。</p>'}
      ${reps.map(battleHtml).join('')}`
    : dec || '<p class="hint">今月決めることはない。</p>';
  openModal(`<h2 id="modal-title">${esc(title)}</h2>${tabs}${body}
    <div class="actions"><button class="act primary" data-act="close">${tab === 'todo' && n ? 'あとで決める' : '了解'}</button></div>`);
  reportShown = [reps, title, news, tab === 'only' ? 'only' : tab];
  genShown = null;
}
function openTodo() { if (s) showReports([], `${dateLabel(s)}　今月の要件`, [], 'only'); }
// 画面の中で操作したあと、開いていた画面を描き直す
function reopen() {
  if (genShown) openGeneral(genShown, genBack);
  else if (reportShown) showReports(reportShown[0], reportShown[1], reportShown[2], reportShown[3] === 'only' ? 'only' : reportShown[3]);
  else if (menuShown) openMenu();
}

function openTitle() {
  const auto = load(AUTO_KEY);
  mood('title');
  closeModal();
  openTitleScreen({
    auto, autoLabel: auto ? `${dateLabel(auto)}・${auto.clans[auto.player].name}家` : '',
    help: (st) => TABS.help(st), face: (id, w) => face(id, w),
    start: (clan, diff, scen) => { startWith(scen === S1592.id ? newKarairiGame(diff) : newGame(clan, diff, undefined, scen)); store(AUTO_KEY, JSON.stringify(s)); if (scen === S1592.id) openMenu('gunji', 'karairi'); },
    resume: () => { if (auto) startWith(auto); },
  });
}

// ───────── 主メニュー（内政・軍事・外交・情報・商い・記録） ─────────
type MenuKey = 'naisei' | 'gunji' | 'jinji' | 'gaiko' | 'akinai' | 'kiroku';
// やりたいことでまとめたメニュー（いくつかのタブは旧タブを束ねたもの: COMPOSITE）
const MENUS: { key: MenuKey; name: string; tabs: [string, string][] }[] = [
  { key: 'naisei', name: '内政', tabs: [['shiro', '城'], ['yosan', '予算と動員'], ['bugyo', '奉行'], ['deleg', '委任']] },
  { key: 'gunji', name: '軍事', tabs: [['butai', '部隊'], ['corps', '軍団'], ['karairi', '唐入り']] },
  { key: 'jinji', name: '人事', tabs: [['vassals', '家臣団'], ['rewards', '恩賞'], ['fronts', '知行'], ['katoku', '家督'], ['tsukai', '使番'], ['gift', '下賜'], ['tokusei', '特性'], ['jinzai', '人材']] },
  { key: 'gaiko', name: '外交', tabs: [['gaike', '諸大名'], ['bakufu', '幕府'], ['court', '朝廷'], ['mission', '布教']] },
  { key: 'akinai', name: '商い', tabs: [['rice', '兵糧'], ['gunbuy', '鉄砲'], ['item', '名物の市場'], ['nanban', '南蛮市']] },
  { key: 'kiroku', name: '記録', tabs: [['log', '全記録'], ['save', '保存と設定'], ['help', '遊び方']] },
];
// 束ねたタブ: [見出し, 旧タブ]（見出しが空なら見出しなし）
const COMPOSITE: Record<string, [string, string][]> = {
  shiro: [['', 'castles'], ['城主', 'governors']],
  yosan: [['', 'budget'], ['動員目標', 'mobilize']],
  butai: [['', 'armies'], ['足軽と練度', 'ashi'], ['鉄砲・大筒の配備', 'guns']],
  jinzai: [['在野', 'ronin'], ['捕虜', 'captive'], ['判明した敵将', 'known']],
};
// 旧タブの名で開かれたら、束ねたタブへ
const ALIAS: Record<string, string> = { ...Object.fromEntries(Object.entries(COMPOSITE).flatMap(([k, v]) => v.map(([, old]) => [old, k]))), clans: 'gaike', dip: 'gaike', ichiba: 'rice' };
// 束ねたタブの中の小見出し（一度に一つだけ見せる）。見出しが空のものはこの名で
const SUB_NAME: Record<string, string> = { castles: '城一覧', budget: '予算', armies: '部隊一覧' };
const lastSub: Record<string, string> = {};
const menuOfTab = (tab: string) => MENUS.find((m) => m.tabs.some(([k]) => k === tab))?.key;
let curMenu: MenuKey = 'naisei';
let menuShown = false;
let vasSort: { key: string; dir: 1 | -1 } | null = null; // 家臣団の並べ替え
let vasFilter: { role: string; q: string; rank: string; page: number } = { role: 'all', q: '', rank: '', page: 1 }; // 家臣団の絞り込み
const VAS_PAGE = 60;
let rwAll = false, rwPage = 1; // 恩賞: 全員を出すか（初めは報いるべき者だけ）・何ページまで出すか
const RW_PAGE = 30;
let corpsAll = false; const corpsOpen = new Set<number>();
let yorikiFor: number | null = null; // 知行: 与力を選ぶ一覧を開いている寄親の領
let castFilter = 'all', armyFilter = 'all'; const regOpen = new Map<string, boolean>(); // 城・部隊の一覧: 絞り込みと、地方ごとの開閉 // 軍団: 空きのない隊も出すか／開いている隊
const lastTab = Object.fromEntries(MENUS.map((m) => [m.key, m.tabs[0][0]])) as Record<MenuKey, string>;

function openMenu(m: MenuKey = curMenu, tab: string = lastTab[m]) {
  if (!s) return;
  const st = s, me = st.clans[st.player];
  if (ALIAS[tab]) { if (COMPOSITE[ALIAS[tab]]) lastSub[ALIAS[tab]] = tab; tab = ALIAS[tab]; }
  const owner = menuOfTab(tab);
  if (owner && owner !== m) m = owner;
  const def = MENUS.find((x) => x.key === m)!;
  if (!def.tabs.some(([k]) => k === tab) || (tab === 'karairi' && !karairiOn(st))) tab = def.tabs[0][0];
  curMenu = m; lastTab[m] = tab;
  const caps = Object.values(st.generals).filter((g) => g.status === 'captive' && g.captor === st.player).length;
  const tabName = (k: string, l: string) => (k === 'tsukai' ? tsukaiLabel(st.player) : k === 'jinzai' && caps ? `${l} ${caps}` : l);
  // 束ねたタブは小見出しを切り替えて一つずつ見せる（縦に並べると長くなるため）
  const subs = COMPOSITE[tab];
  const sub = subs ? (subs.some(([, k]) => k === lastSub[tab]) ? lastSub[tab] : subs[0][1]) : null;
  if (subs) lastSub[tab] = sub!;
  const body = subs
    ? `<div class="subtabs" role="tablist" aria-label="小見出し">${subs.map(([h, k]) => `<button type="button" role="tab" data-act="sub" data-id="${k}" aria-selected="${k === sub}">${esc(h || SUB_NAME[k] || k)}</button>`).join('')}</div><section class="sect">${safeTab(sub!, st)}</section>`
    : safeTab(tab, st);
  openModal(`<h2 id="modal-title">${def.name}</h2><p class="lede">${esc(dateLabel(st))}　金 ${fmt(me.gold)}貫（月+${fmt(clanIncome(st, st.player))}${clanMine(st, st.player) ? `、うち鉱山${fmt(clanMine(st, st.player))}` : ''}）・兵糧 ${fmt(me.food)}石・城${clanCastles(st, st.player).length}・兵${fmt(clanTroops(st, st.player))}</p>
    <div class="tabs menu-tabs" role="tablist" aria-label="主メニュー">${MENUS.map((x, k) => `<button role="tab" data-act="mtab" data-id="${x.key}" aria-selected="${x.key === m}" title="${x.name} (${k + 1})">${x.name}</button>`).join('')}</div>
    <div class="tabs" role="tablist" aria-label="${def.name}">${def.tabs.filter(([k]) => k !== 'karairi' || karairiOn(st)).map(([k, l]) => `<button role="tab" data-act="stab" data-id="${k}" aria-selected="${k === tab}">${tabName(k, l)}</button>`).join('')}</div>${body}`);
  menuShown = true; genShown = null;
  $('modal-body').querySelectorAll<HTMLSelectElement>('select[data-move]').forEach((sel) => sel.addEventListener('change', () => {
    const g = st.generals[sel.dataset.move!]; g.loc = +sel.value; toast(`${g.name}を${st.castles[g.loc].name}へ移した`);
  }));
}

// タブの中身で不具合が起きても、メニュー全体が開かなくならないようにし、内容を画面に出す
function safeTab(k: string, st: GameState) {
  try { return TABS[k](st); } catch (e) {
    console.error(e);
    const m = e instanceof Error ? `${e.message}\n${(e.stack ?? '').split('\n').slice(1, 4).join('\n')}` : String(e);
    return `<div class="hint warn"><p style="margin:0">この欄を表示できませんでした（不具合）。お手数ですが、この文を知らせてください。</p><pre class="errbox">${esc(`${k}: ${m}`)}</pre></div>`;
  }
}

// 説明はふだん畳んでおく（開いた状態はこの画面のあいだ保つ）
const hints = (items: string[]) => `<details class="hintbox"${hintsOpen ? ' open' : ''}><summary>？ 説明</summary><ul class="hint" style="padding-left:1.2em">${items.map((x) => `<li>${x}</li>`).join('')}</ul></details>`;
let hintsOpen = false;
const ROLE_NAME = { agri: '農政', com: '商業', hyoro: '兵站' } as const;
// 兵站奉行の働き（奉行の画面）
const hyoroLine = (st: GameState) => { const h = hyoroBugyo(st, st.player); return `兵站 ${h ? `${esc(h.name)}（知略${h.int}）` : 'なし'} → 補給の届く距離 ${supplyRange(st, st.player)}ヘックス・運送の減り×${h ? R.hyoroLoss(h.int).toFixed(2) : '1.00'}`; };
const helpList = (items: string[]) => `<ul class="hint helplist" style="padding-left:1.2em">${items.map((x) => `<li>${x}</li>`).join('')}</ul>`;
const KEYS_HTML = `<dl class="kv keys"><dt>1〜6</dt><dd>内政・軍事・人事・外交・商い・記録</dd><dt>T</dt><dd>今月の要件</dd><dt>M</dt><dd>地図の表示を切り替える（勢力・名分・治安・残り火・知行・守護・補給）</dd><dt>N</dt><dd>次の未行動の部隊</dd><dt>E</dt><dd>評定終了（月を進める）</dd><dt>Esc</dt><dd>閉じる・選択を外す</dd></dl>`;
// 用語集（遊び方）。[語, 読み, 説明]
const GLOSSARY: [string, string, string][] = [
  ['石高', 'こくだか', '城の米の取れ高。動員できる兵の上限と収穫を決める。開発度で伸びる。'],
  ['貫', 'かん', '金の単位。商業から毎月入り、足軽・調略・外交・恩賞・献金に使う。'],
  ['兵糧', 'ひょうろう', '米（石）。兵は毎月食い、十月に収穫する。京の近くでは倍食う。'],
  ['威信', 'いしん', '家の重み。外交・仕官の願い出・寝返りの判定に効く。'],
  ['治安', 'ちあん', '城の落ち着き。動員の上限と開発の上限を決め、低いと一揆・残り火の蜂起が起きる。'],
  ['治水', 'ちすい', '収穫の倍率。予算で上げる。'],
  ['開発', 'かいはつ', '城の石高と商業の伸び。奉行が進める。'],
  ['恩', 'おん', '家臣が当家から受けた御恩の手応え（0〜100）。低いと出奔・寝返り・謀反。未払いの功があると下がる。'],
  ['功績', 'こうせき', '戦や役目で積む手柄。恩賞（感状・加増・取り立て・下賜）で報いる。'],
  ['名声', 'めいせい', '武名（0〜100）。勝ち戦で上がり、士気が少し上がる。高すぎると外から官の誘いが来る。'],
  ['縁', 'えん', '武将どうしの結びつき（縁者・旧友・師弟・乳兄弟・戦友・不仲）。登用・調略・去就に効く。'],
  ['名分', 'めいぶん', '戦の正しさ。将軍の御内書・幕府の職・守護職・旧領・仇討ち・反撃・救援などから生まれる。'],
  ['私戦', 'しせん', '名分のない戦。禁じられてはいないが、恩・治安・威信・外交が損なわれ、落とした城に残り火が燃える。'],
  ['御内書', 'ごないしょ', '将軍の命令書。名指しされた家を討つ名分になる。'],
  ['守護', 'しゅご', '国ごとの幕府の職。その国の城を攻める名分になる。'],
  ['信任', 'しんにん', '幕府からの信頼。御内書や職の願い出の成否を決める。'],
  ['出仕', 'しゅっし', '職の持ち主に従うこと。同盟になり、その職の名分から外れる。'],
  ['残り火', 'のこりび', '落とした城に残る旧主の残党・門徒の火種。治安が低いと蜂起する。仕置で鎮める。'],
  ['仕置', 'しおき', '落とした城の扱い（撫育・見せしめ・焼き討ち）。治安・開発・残り火が変わる。'],
  ['知行', 'ちぎょう', '家臣に与えた土地（城）。城持ちの家臣は自分の領の年貢で兵と陪臣を養い、方針（攻略・防衛・軍備増強）に従って動く。'],
  ['陪臣', 'ばいしん', '家臣の家来。主（城持ち）から恩賞を受け、当家は直接は使えない。'],
  ['蔵入地', 'くらいりち', '家臣に与えず、当主が直接治める城（直轄）。年貢・商いはすべて当家に入る。'],
  ['練度', 'れんど', '部隊の慣れ。足軽は100まで、農兵は60まで上がる。'],
  ['士気', 'しき', '戦う気力。壊乱閾値を下回ると潰走する。'],
  ['兵站', 'へいたん', '軍勢へ兵糧を届けること。自城から自領・同盟領をたどり、その外は3ヘックスほどまで届く（兵站奉行の知略で延びる）。遠いほど運ぶ兵糧が増え、敵の部隊に道を塞がれると切れる。'],
  ['小荷駄', 'こにだ', '部隊が持ち歩く兵糧（1か月分）。補給が切れるとこれを食べ、尽きると毎月士気が大きく下がり兵が逃げる。'],
  ['飛び地', 'とびち', '本国（当主の城のある領地のまとまり）と、敵の領地で隔てられた城。家の蔵から兵糧が届かず、収穫はその城の蔵に入る。本国と飛び地の両方に港があれば海路で運べる（1割減る）。'],
  ['城の蔵', 'しろのくら', '籠城の備え（城兵の6か月分）。ふだんは家の蔵から満たされ、囲まれると城兵が食べる。尽きると城兵が飢えて崩れる（兵糧攻め）。'],
  ['包囲', 'ほうい', '城攻めは一か月がかり（合戦画面の日数で30日）。月末までに決着しなければ、囲んだまま翌月へ続く。門の傷も部隊の位置もそのまま、翌月は続きから攻める。包囲のあいだ城は外から兵糧を入れられず、城の蔵を食べる。攻め手の出陣を取り消すか軍団が離れれば囲みは解ける。'],
  ['一門・宿老', 'いちもん・しゅくろう', '当主の血縁と、家中の最上位の家臣。大きな領の主や家督の候補になる。'],
];
const GLOSSARY_HTML = `<dl class="kv glossary">${GLOSSARY.map(([w, y, d]) => `<dt>${w}<small>${y}</small></dt><dd>${d}</dd>`).join('')}</dl>`;
const dNote = (st: GameState, k: DelegateKey) => (delegateOf(st)[k] ? '<p class="hint warn" style="margin-top:0">委任中: 毎月の評定終了時にAIが決める（手で変えても翌月に上書きされる）。</p>' : '');
const nearOwn = (st: GameState, a: Army) => castleAt(st, a.hex)?.owner === st.player || NEIGHBORS[a.hex].some((j) => castleAt(st, j)?.owner === st.player);
const selPct = (key: string, v: number, steps: number[]) => `<select data-budget="${key}">${steps.map((x) => `<option value="${x}" ${x === v ? 'selected' : ''}>${x}%</option>`).join('')}</select>`;
const effOf = (it: Item) => { const b = R.itemBonus(it.kind, it.grade); return it.kind === 'tea' ? `魅力+${b.cha} 知略+${b.int}` : it.kind === 'sword' ? `武勇+${b.bra} 統率+${b.lea}` : `全能力+${b.bra}`; };
const bugyoLine = (k: string, x: ReturnType<typeof bugyoCoef>) => `${k} 係数${x.coef.toFixed(2)}（自然増${R.DEV_NATURAL}＋奉行${x.base.toFixed(2)}${x.cover < 1 ? `×目の届く割合${Math.round(x.cover * 100)}%` : ''}）→ 城主のいる城は月+${(R.BUGYO_RATE * x.coef * 100).toFixed(2)}%`;
const stats4 = (st: GameState, g: General) => { const b = bonusOf(st, g); const c = (v: number, x: number) => `<td class="n">${v}${x ? `<span class="hint" style="margin:0">(+${x})</span>` : ''}</td>`; return c(g.bra, b.bra) + c(g.int, b.int) + c(g.lea, b.lea) + c(g.cha, b.cha); };
const ageCell = (st: GameState, g: General) => { const a = ageOf(st, g); return a === null || a < 0 ? '—' : `${a}`; };
const isFree = (st: GameState, g: General) => g.clan === st.player && g.status === 'free' && st.clans[st.player].leader !== g.id && !g.liege;

const onCell = (g: General) => { const v = Math.round(onOf(g)); return `<span class="${v < 30 ? 'bad-t' : v >= 75 ? 'good-t' : ''}" title="${onLabel(v)}">${v}</span>`; };
// 仕置: 落とした城の治め方（月の報告と城の画面）
const shiokiPending = (st: GameState) => (st.shioki ?? []).filter((p) => st.castles[p.castle].owner === st.player);
function shiokiButtons(st: GameState, c: Castle) {
  return (['buiku', 'misesime', 'yakiuchi'] as const).map((k) => `<button class="mini" data-act="shioki" data-id="${c.i}:${k}">${R.SHIOKI_NAME[k]}</button>`).join(' ');
}
function shiokiBlock(st: GameState) {
  const ps = shiokiPending(st);
  if (!ps.length) return '';
  return `<h3 style="margin-top:4px">仕置</h3><p class="hint" style="margin-top:0">落とした城の治め方を決める（次の評定終了まで。決めなければ撫育、領の城は領主が決める）。撫育: そのまま。見せしめ: 治安+${R.MISESIME.chian}・開発×${R.MISESIME.dev}・残り火半分。焼き討ち: 治安${R.YAKIUCHI.chian}まで・開発×${R.YAKIUCHI.dev}・残り火を断つ・威信−${R.YAKIUCHI.prestige}。</p>
    <div class="tbl-wrap"><table><thead><tr><th>城</th><th>旧主</th><th class="n">残り火</th><th class="n">治安</th><th class="n">開発</th><th></th></tr></thead><tbody>
    ${ps.map((p) => { const c = st.castles[p.castle]; return `<tr><td>${esc(c.name)}</td><td>${esc(clanName(st, c.oldOwner ?? null))}${c.oldOwner && st.clans[c.oldOwner]?.alive ? '' : c.oldOwner ? '（滅亡）' : ''}</td><td class="n">${Math.round(c.ember ?? 0)}</td><td class="n">${Math.round(c.chian)}</td><td class="n">${Math.round(c.dev * 100)}%</td><td>${shiokiButtons(st, c)}</td></tr>`; }).join('')}
    </tbody></table></div>`;
}
// 遺言（当主が病に倒れた月の報告と、人事の家督）
function willForm(st: GameState) {
  const C = st.clans[st.player], heir = heirOf(st, C), regent = regentOf(st, C);
  const hc = heirCands(st, st.player), rc = regentCands(st, st.player, heir?.id);
  const opt = (g: General) => `${esc(g.name)}（${g.kin ? '一門' : '宿老'}・${ageOf(st, g) ?? '?'}歳・魅力${g.cha}・統率${g.lea}）`;
  return `<div class="actions" style="flex-wrap:wrap"><label class="hint" style="margin:0">跡継ぎ <select data-heir aria-label="跡継ぎ"><option value="">（定めず: 一門の年長から）</option>${hc.map((g) => `<option value="${g.id}" ${heir?.id === g.id ? 'selected' : ''}>${opt(g)}</option>`).join('')}</select></label>
    <label class="hint" style="margin:0">後見役 <select data-regent aria-label="後見役"><option value="">（定めず）</option>${rc.map((g) => `<option value="${g.id}" ${regent?.id === g.id ? 'selected' : ''}>${opt(g)}</option>`).join('')}</select></label>
    <label class="hint" style="margin:0">遺言 <select data-will aria-label="遺言"><option value="">（残さず）</option>${(['retainers', 'land', 'tenka'] as const).map((k) => `<option value="${k}" ${C.will === k ? 'selected' : ''}>${R.WILL_NAME[k]}</option>`).join('')}</select></label></div>`;
}
function bushiBlock(st: GameState) {
  const out: string[] = [];
  const k = st.kanOffer, rt = st.returnOffer, q = st.quarrel;
  if (k && st.generals[k.gen]?.clan === st.player) { const g = st.generals[k.gen]; out.push(`<h3 style="margin-top:4px">官の誘い</h3>${quoteHtml(st, lineFor(st, g, 'kan'), 64)}<p class="hint" style="margin:4px 0">${esc(g.name)}（名声${Math.round(g.fame ?? 0)}・恩${Math.round(onOf(g))}）に${esc(giverName(st, k.from))}から官の誘い。許せば恩+${R.KAN_FORGIVE}・名声+5だが、外に戻る門を持つ（出奔・寝返り・謀反を起こしやすくなる）。咎めれば恩−${R.KAN_SCOLD}。返事をしなければ受けてしまう。</p><div class="actions"><button class="mini" data-act="kan-yes">許す</button> <button class="mini" data-act="kan-no">咎める</button></div>`); }
  if (rt && st.generals[rt.gen]?.status === 'ronin') { const g = st.generals[rt.gen]; out.push(`<h3 style="margin-top:4px">帰参の願い</h3><p class="hint" style="margin:0 0 4px">追放した${esc(g.name)}が勝手に戦に加わり、首を挙げて帰参を願っている。許せば恩${R.RETURN_ON}・功績+${R.RETURN_MERIT}で戻る。</p><div class="actions"><button class="mini" data-act="ret-yes">帰参を許す</button> <button class="mini" data-act="ret-no">許さぬ</button></div>`); }
  if (q && st.generals[q.gen]?.clan === st.player) { const g = st.generals[q.gen]; out.push(`<h3 style="margin-top:4px">喧嘩の裁き</h3><p class="hint" style="margin:0 0 4px">${esc(g.name)}が喧嘩の末に${esc(q.victim)}を${q.killed ? '斬った' : '斬りつけた'}。裁きを決める（決めなければ追放）。不問にすれば家臣全員の恩−${R.QUARREL_LET}。</p><div class="actions"><button class="mini" data-act="qr-seppuku">切腹</button> <button class="mini" data-act="qr-exile">追放</button> <button class="mini" data-act="qr-let">不問</button></div>`); }
  return out.join('');
}
function willBlock(st: GameState) {
  const C = st.clans[st.player], L = C.leader ? st.generals[C.leader] : null;
  if (!L || st.willAsked !== st.turn - 1 || !L.sick) return '';
  return `<h3 style="margin-top:4px">当主、病に倒れる</h3><p class="hint" style="margin-top:0">${esc(L.name)}（${ageOf(st, L)}歳）が病に倒れた。もしもの時に備え、跡継ぎと後見役を定め、遺言を残しておけば家督が乱れにくい（「人事」の家督でも変えられる）。</p>${willForm(st)}`;
}
// 恩賞の沙汰の一行（人事の恩賞と月の報告で使う）
function rewardRow(st: GameState, g: General, compact = false) {
  const due = dueOf(g), kb = kanjoBlock(st, g), pb = promoteBlockOf(st, g), cost = kazoCost(g), gold = st.clans[st.player].gold;
  const btns = `<button class="mini" data-act="rw-kanjo" data-id="${g.id}" ${kb ? `disabled title="${esc(kb)}"` : ''}>感状</button>
    <button class="mini" data-act="rw-kazo" data-id="${g.id}" ${due <= 0 || gold < cost ? `disabled title="${due <= 0 ? '報いる功がない' : '金が足りない'}"` : ''}>加増（${fmt(cost)}貫）</button>
    <button class="mini" data-act="rw-promote" data-id="${g.id}" ${pb ? `disabled title="${esc(pb)}"` : ''}>${pb ? '取り立て' : `${R.RANK_NAME[g.rank - 1]}に取り立て`}</button>`;
  return `<tr><td class="gname">${face(g.id, 32, 'face face-sm')}${nameLink(g)}</td><td>${rankName(st, g)}</td><td class="n">${onCell(g)}<span class="hint" style="margin:0">（${onLabel(onOf(g))}）</span></td><td class="n">${due >= R.ON_DUE_FREE ? `<b>${due}</b>` : due}</td>${compact ? '' : `<td>${g.home !== undefined ? esc(st.castles[g.home].name) + (g.homeLost ? '<span class="pill bad">敵の手</span>' : '') : '—'}</td>`}<td>${btns}</td></tr>`;
}
const rewardHead = (compact = false) => `<thead><tr><th>武将</th><th>身分</th><th class="n">恩</th><th class="n">未払いの功</th>${compact ? '' : '<th>本領</th>'}<th></th></tr></thead>`;
const rewardWaiting = (st: GameState) => vassalsOf(st, st.player).filter((g) => !g.liege && (dueOf(g) >= R.ON_DUE_FREE || !promoteBlockOf(st, g))).sort((a, b) => dueOf(b) - dueOf(a));
// 恩賞のまとめ操作の札（対象の人数と、加増の予算）
function rewardBulk(st: GameState, list: General[]) {
  const gold = st.clans[st.player].gold;
  const kan = list.filter((g) => dueOf(g) > 0 && !kanjoBlock(st, g)).length;
  const pro = list.filter((g) => !promoteBlockOf(st, g)).length;
  const kz = list.filter((g) => dueOf(g) > 0);
  const need = kz.reduce((t, g) => t + kazoCost(g), 0);
  return `<div class="actions" style="flex-wrap:wrap;gap:6px;margin:6px 0"><button class="act" data-act="rw-bulk-kanjo" ${kan ? '' : 'disabled'}>感状をまとめて（${kan}人・金はかからない）</button>
    <select id="rw-budget" aria-label="加増の予算">${[0.1, 0.3, 0.5, 1].map((r) => `<option value="${r}" ${r === 0.3 ? 'selected' : ''}>金の${r === 1 ? '全額' : `${r * 10}割`}まで（${fmt(Math.floor(gold * r))}貫）</option>`).join('')}</select><button class="act" data-act="rw-bulk-kazo" ${kz.length ? '' : 'disabled'}>未払いの多い順に加増（${kz.length}人・全員で${fmt(need)}貫）</button>
    <button class="act" data-act="rw-bulk-promote" ${pro ? '' : 'disabled'}>取り立てをまとめて（${pro}人）</button></div>`;
}
function rewardsBlock(st: GameState) {
  if (delegateOf(st).staff) return '';
  const w = rewardWaiting(st);
  if (!w.length) return '';
  return `<h3 style="margin-top:4px">恩賞の沙汰</h3><p class="hint" style="margin-top:0">功を立てた者が恩賞を待っている（未払いの功が${R.ON_DUE_FREE}を超えると毎月恩が下がる）。家の御恩の評判 ${Math.round(goodwill(st, st.player))}。全員は「人事」の恩賞で。</p>
    ${rewardBulk(st, w)}<div class="tbl-wrap"><table>${rewardHead(true)}<tbody>${w.slice(0, 6).map((g) => rewardRow(st, g, true)).join('')}</tbody></table></div>${w.length > 6 ? `<p class="hint">ほか${w.length - 6}人（まとめて報いるか、「人事」の恩賞で一人ずつ）。</p>` : ''}`;
}
// 選択欄: 城は地方ごと、武将は身分ごとに見出しを付けてまとめる
const castleRegion = (c: Castle) => regionOf(provName(c.hex));
function castleOpts(cs: Castle[], opt: (c: Castle) => string): string {
  const by = new Map<string, Castle[]>();
  for (const c of cs) { const r = castleRegion(c); if (!by.has(r)) by.set(r, []); by.get(r)!.push(c); }
  if (by.size <= 1 || cs.length <= 8) return cs.map(opt).join('');
  return REGION_ORDER.filter((r) => by.has(r)).map((r) => `<optgroup label="${r}（${by.get(r)!.length}城）">${by.get(r)!.map(opt).join('')}</optgroup>`).join('');
}
function genOpts(gs: General[], opt: (g: General) => string): string {
  if (gs.length <= 8) return gs.map(opt).join('');
  const by = new Map<number, General[]>();
  for (const g of gs) { if (!by.has(g.rank)) by.set(g.rank, []); by.get(g.rank)!.push(g); }
  return [...by.keys()].sort((a, b) => a - b).map((k) => `<optgroup label="${R.RANK_NAME[k] ?? '—'}（${by.get(k)!.length}人）">${by.get(k)!.map(opt).join('')}</optgroup>`).join('');
}
// 地方ごとにたたむ一覧。key は開閉を覚える名前（城・部隊で別）。少なければたたまない
function regionGroups<T>(key: string, items: T[], regionOfItem: (x: T) => string, head: (r: string, xs: T[]) => string, table: (xs: T[]) => string): string {
  const by = new Map<string, T[]>();
  for (const x of items) { const r = regionOfItem(x); if (!by.has(r)) by.set(r, []); by.get(r)!.push(x); }
  if (items.length <= 15 || by.size <= 1) return table(items);
  return REGION_ORDER.filter((r) => by.has(r)).map((r) => { const k = `${key}:${r}`, open = regOpen.get(k) ?? false; return `<details class="reg"${open ? ' open' : ''}><summary data-act="reg-toggle" data-id="${esc(k)}">${head(r, by.get(r)!)}</summary>${table(by.get(r)!)}</details>`; }).join('');
}
const nameLink = (g: General) => `<button type="button" class="glink" data-act="gen" data-id="${g.id}">${esc(g.name)}</button>`;
// 能力が見えるか: 自家・在野・自家の捕虜・交戦した武将
const statsKnown = (st: GameState, g: General) => g.clan === st.player || g.status === 'ronin' || g.captor === st.player || st.revealed.includes(g.id);
function genStatus(st: GameState, g: General) {
  if (g.status === 'dead') return '故人';
  if (g.status === 'young') return (g.born ?? 0) > st.year ? `誕生前（${g.born}年生）` : `元服前（${g.genpuku}年に元服）`;
  if (g.status === 'ronin') return '在野';
  if (g.status === 'captive') return `捕虜（${clanName(st, g.captor)}家）`;
  if (g.clan && st.clans[g.clan]?.leader === g.id) return '当主';
  if (g.status === 'army') return g.army && st.armies[g.army]?.main === g.id ? '部隊長' : '補佐';
  if (g.status === 'governor') return `城主（${st.castles.find((c) => c.governor === g.id)?.name ?? ''}）`;
  if (g.status === 'bugyo') return `奉行（${roleOf(g) === 'com' ? '商業' : '農政'}）`;
  if (g.status === 'tsukai') return tsukaiLabel(g.clan);
  return '待機';
}
// 武将の詳細の操作（この武将への命令をここにまとめる）
let genShown: string | null = null, genBack = false;
function genActions(st: GameState, g: General) {
  const C = st.clans[st.player];
  const due = dueOf(g), kb = kanjoBlock(st, g), pb = promoteBlockOf(st, g), cost = kazoCost(g);
  const rows: string[] = [];
  if (g.liege) {
    const lord = st.generals[g.liege];
    rows.push(`<dt>主</dt><dd>${lord ? nameLink(lord) : '？'}の陪臣（恩賞と役目は主が決める）</dd>`);
    rows.push(`<dt>知行</dt><dd><button class="mini" data-act="fief-direct" data-id="${g.id}">直参に引き上げる</button> <span class="hint" style="margin:0">主の恩が${Math.round((R.FIEF_PULL_ON[g.rank] ?? 3) * (st.generals[g.liege]?.tozama ? R.TOZAMA_PULL : 1))}下がる</span></dd>`);
    rows.push(`<dt>その他</dt><dd><button class="mini" data-act="exile" data-id="${g.id}">追放する</button></dd>`);
    return `<h3 style="margin-top:12px">命令</h3><dl class="kv">${rows.join('')}</dl>`;
  }
  const myFief = fiefOf(st, g);
  rows.push(`<dt>恩賞</dt><dd><button class="mini" data-act="rw-kanjo" data-id="${g.id}" ${kb ? `disabled title="${esc(kb)}"` : ''}>感状</button> <button class="mini" data-act="rw-kazo" data-id="${g.id}" ${due <= 0 || C.gold < cost ? 'disabled' : ''}>加増（${fmt(cost)}貫）</button> <button class="mini" data-act="rw-promote" data-id="${g.id}" ${pb ? `disabled title="${esc(pb)}"` : ''}>${pb ? '取り立て' : `${R.RANK_NAME[g.rank - 1]}に取り立て`}</button></dd>`);
  const role: string[] = [];
  if (g.status === 'free') {
    const why = canBugyo(st, g), whyT = canTsukai(st, g);
    role.push(`<button class="mini" data-act="bugyo-on" data-id="${g.id}" ${why ? `disabled title="${esc(why)}"` : ''}>奉行に</button>`);
    if (g.rank >= R.TSUKAI_MAX_RANK) role.push(`<button class="mini" data-act="tsukai-on" data-id="${g.id}" ${whyT ? `disabled title="${esc(whyT)}"` : ''}>${tsukaiLabel(st.player)}に</button>`);
    role.push(`<select data-govg="${g.id}" aria-label="城主に任じる城"><option value="">城主に任じる…</option>${castleOpts(clanCastles(st, st.player).filter((c) => !frontOfCastle(st, c) || frontOfCastle(st, c)!.vacant), (c) => `<option value="${c.i}">${esc(c.name)}${c.governor ? `（今は${esc(st.generals[c.governor].name)}）` : ''}</option>`)}</select>`);
    role.push(`<select data-move="${g.id}" aria-label="移動先">${castleOpts(clanCastles(st, st.player), (c) => `<option value="${c.i}" ${c.i === g.loc ? 'selected' : ''}>${esc(c.name)}へ移す</option>`)}</select>`);
  }
  if (g.status === 'bugyo') role.push(`<button class="mini" data-act="bugyo-off" data-id="${g.id}">奉行を解く</button>`);
  if (g.status === 'tsukai') role.push(`<button class="mini" data-act="tsukai-off" data-id="${g.id}">${tsukaiLabel(st.player)}を解く</button>`);
  if (g.status === 'governor' && !myFief) { const c = st.castles.find((x) => x.governor === g.id); if (c && !frontOfCastle(st, c)) role.push(`<button class="mini" data-act="gov-out" data-id="${c.i}">城主を解く</button>`); }
  if (g.status === 'army' || g.status === 'free') role.push(`<button class="mini" data-act="open-corps-m">軍団の編成へ</button>`);
  if (role.length) rows.push(`<dt>役目</dt><dd class="actions" style="margin:0">${role.join(' ')}</dd>`);
  // 知行: 城を与える（身分の枠まで）・陪臣に付ける
  if (myFief) rows.push(`<dt>知行</dt><dd>${esc(frontName(st, myFief))} ${myFief.castles.length}城・${fiefKoku(st, myFief).toFixed(1)}万石（${fiefCap(g) === Infinity ? '城の数に上限なし' : `${fiefCap(g)}城まで`}） <button class="mini" data-act="open-fiefs">知行を見る</button></dd>`);
  if (g.clan === st.player && st.clans[st.player].leader !== g.id && !['young', 'captive', 'dead', 'ronin'].includes(g.status)) {
    const room = fiefCap(g) - (myFief?.castles.length ?? 0);
    const cs = room > 0 ? clanCastles(st, st.player).filter((c) => !grantBlock(st, g, c)) : [];
    if (cs.length) rows.push(`<dt>${myFief ? '加増' : '城を与える'}</dt><dd><select data-fgrant="${g.id}" aria-label="与える城"><option value="">城を与える…</option>${castleOpts(cs, (c) => { const o = frontOfCastle(st, c); return `<option value="${c.i}">${esc(c.name)}（${castleKoku(c).toFixed(1)}万石${o ? `・今は${esc(frontName(st, o))}` : ''}）</option>`; })}</select></dd>`);
    else if (fiefCap(g) <= 0 && !myFief) rows.push(`<dt>知行</dt><dd class="hint" style="margin:0">${R.RANK_NAME[g.rank]}は城を持てない（足軽大将に取り立てると1城）</dd>`);
    const fs = myFief ? [] : frontsOf(st).filter((f) => !f.vacant && !baishinBlock(st, g, f));
    if (fs.length) rows.push(`<dt>陪臣に</dt><dd><select data-fbai-g="${g.id}" aria-label="仕える城持ち"><option value="">城持ちの陪臣に付ける…</option>${fs.map((f) => `<option value="${f.id}">${esc(st.generals[f.leader].name)}（${esc(frontName(st, f))}）</option>`).join('')}</select></dd>`);
  }
  if (g.clan === st.player && st.clans[st.player].leader !== g.id && !['young', 'captive', 'dead', 'ronin'].includes(g.status)) {
    const kb2 = kanBlock(st, g), next = Math.min(R.KAN_VASSAL_MAX, kanOf(g) + 1);
    rows.push(`<dt>官位</dt><dd>${kanOf(g) ? esc(kanName(g)) : '無位'}${kanOf(g) < R.KAN_VASSAL_MAX ? ` <button class="mini" data-act="kan-up" data-id="${g.id}" ${kb2 ? `disabled title="${esc(kb2)}"` : ''}>${esc(R.COURT[next].name)}に推挙（${fmt(kanCost(g))}貫）</button>` : ''}</dd>`);
    const provs = shugoProvs(st);
    if (g.shugodai) rows.push(`<dt>守護代</dt><dd>${esc(g.shugodai)}守護代 <button class="mini" data-act="sgd-off" data-id="${g.id}">解く</button></dd>`);
    else if (provs.length) rows.push(`<dt>守護代</dt><dd><select data-sgd="${g.id}" aria-label="守護代に任じる国"><option value="">守護代に任じる…</option>${provs.map((pv) => { const h = shugodaiOf(st, pv); return `<option value="${esc(pv)}">${esc(pv)}${h ? `（今は${esc(h.name)}）` : ''}</option>`; }).join('')}</select></dd>`);
  }
  const items = clanItems(st, st.player).filter((it) => it.holder !== g.id);
  if (items.length) rows.push(`<dt>下賜</dt><dd><select data-equipg="${g.id}" aria-label="下賜する名物"><option value="">名物を下賜する…</option>${items.map((it) => `<option value="${it.id}">${esc(itemLabel(it))}${it.holder ? `（${esc(st.generals[it.holder].name)}から）` : ''}</option>`).join('')}</select></dd>`);
  rows.push(`<dt>その他</dt><dd><button class="mini" data-act="exile" data-id="${g.id}">追放する</button></dd>`);
  return `<h3 style="margin-top:12px">命令</h3><dl class="kv">${rows.join('')}</dl>`;
}
function openGeneral(id: string, back: boolean) {
  if (!s) return;
  const st = s, g = st.generals[id];
  if (!g) return;
  const known = statsKnown(st, g);
  const b = bonusOf(st, g);
  const stat = (k: string, v: number, x: number) => `<div class="gstat"><span>${k}</span><b>${known ? v : '？'}</b>${known && x ? `<small>(+${x})</small>` : ''}</div>`;
  const loc = g.status === 'army' && g.army && st.armies[g.army] ? PROVINCES[HEXES[st.armies[g.army].hex].p].name : st.castles[g.loc]?.name ?? '';
  const age = ageOf(st, g);
  const next = g.clan === st.player && g.rank > 0 && g.status !== 'young' && st.clans[st.player].leader !== g.id ? ` / 次の昇進 ${R.MERIT_AT[g.rank - 1]}` : '';
  const items = [g.tea, g.sword, g.nanban].filter((x) => x && st.items[x]).map((x) => esc(itemLabel(st.items[x!])));
  const bio = BIO[g.id] ?? KOREA_BIOS[g.id];
  openModal(`<div class="gdetail">${face(g.id, 180, 'gface')}
    <h2 id="modal-title">${esc(g.name)}</h2>
    <p class="lede">${esc(g.clan ? clanName(st, g.clan) + '家' : g.formerClan ? `在野（旧${clanName(st, g.formerClan)}家）` : '在野')}${g.clan ? `　${rankName(st, g)}` : ''}${g.kin ? '　一門' : ''}${g.kiri ? '　洗礼' : ''}${age !== null && age >= 0 ? `　${age}歳（${g.born}年生）` : ''}${traitOf(g) ? `　<span class="pill trait" title="${esc(TRAIT_NOTE[traitOf(g)!])}">${esc(traitName(g))}</span>` : ''}</p>${traitOf(g) ? `<p class="hint" style="margin:0 0 4px">特性「${esc(traitName(g))}」: ${esc(TRAIT_NOTE[traitOf(g)!])}</p>` : ''}
    <dl class="kv"><dt>状態</dt><dd>${esc(genStatus(st, g))}${g.sick ? ' <span class="pill bad">病</span>' : ''}</dd><dt>所在</dt><dd>${esc(loc)}</dd>
      ${g.clan === st.player && g.status !== 'young' ? `<dt>功績</dt><dd>${Math.floor(g.merit)}${next}</dd>` : ''}
      ${g.clan === st.player && g.status !== 'young' && st.clans[st.player].leader !== g.id ? `<dt>恩</dt><dd>${onCell(g)}　未払いの功 ${dueOf(g)}${g.home !== undefined ? `　本領 ${esc(st.castles[g.home].name)}${g.homeLost ? '（敵の手に）' : ''}` : ''}</dd>` : ''}
      ${items.length ? `<dt>名物</dt><dd>${items.join('、')}</dd>` : ''}</dl>
    <div class="gstats">${stat('武勇', g.bra, b.bra)}${stat('知略', g.int, b.int)}${stat('統率', g.lea, b.lea)}${stat('魅力', g.cha, b.cha)}</div>
    ${known ? '' : '<p class="hint">能力は交戦すると判明する。</p>'}
    <dl class="kv" style="margin-top:6px"><dt>名声</dt><dd>${Math.round(g.fame ?? 0)}${g.outer ? `　<span class="pill">${esc(giverName(st, g.outer))}の官</span>` : ''}${g.exiledFrom ? `　<span class="pill bad">${esc(clanName(st, g.exiledFrom))}家を追放</span>` : ''}</dd>
      ${bondsOf(st, g).length ? `<dt>縁</dt><dd>${bondsOf(st, g).map((x) => `${nameLink(x.g)}<span class="${x.kind === 'rival' ? 'bad-t' : 'hint'}" style="margin:0">（${BOND_NAME[x.kind]}）</span>`).join('、')}</dd>` : ''}</dl>
    ${g.clan === st.player && st.clans[st.player].leader !== g.id && !['young', 'captive', 'dead'].includes(g.status) && !st.over ? genActions(st, g) : ''}
    <h3 style="margin-top:14px">略歴</h3><p class="bio">${bio ? esc(bio) : '<span class="hint" style="margin:0">略歴はまだない。</span>'}</p>
    <div class="actions">${back ? '<button class="act" data-act="gen-back">戻る</button>' : ''}<button class="act primary" data-act="close">閉じる</button></div></div>`);
  genShown = id; genBack = back;
  $('modal-body').querySelectorAll<HTMLSelectElement>('select[data-move]').forEach((sel) => sel.addEventListener('change', () => {
    const x = st.generals[sel.dataset.move!]; x.loc = +sel.value; toast(`${x.name}を${st.castles[x.loc].name}へ移した`); refresh(); openGeneral(x.id, back);
  }));
}

const TABS: Record<string, (st: GameState) => string> = {
  // ── 内政 ──
  budget: (st) => {
    const me = st.clans[st.player], inc = clanIncome(st, st.player), lb = me.lastBudget;
    return `${dNote(st, 'budget')}<dl class="kv">
      <dt>治水</dt><dd>${selPct('chisui', me.budget.chisui, R.BUDGET_STEPS)}　月およそ${fmt((inc * me.budget.chisui) / 100)}貫${lb ? `（先月${fmt(lb.chisui)}貫）` : ''}</dd>
      <dt>施し</dt><dd>${selPct('hodo', me.budget.hodo, R.BUDGET_STEPS)}　月およそ${fmt((inc * me.budget.hodo) / 100)}貫${lb ? `（先月${fmt(lb.hodo)}貫）` : ''}</dd>
      <dt>重点の城</dt><dd>${me.focus !== null && me.focus !== undefined ? esc(st.castles[me.focus].name) : 'なし（城の画面で指定）'}</dd></dl>
      <h3 style="margin-top:12px">年貢の率</h3>
      <div class="subtabs">${(['low', 'mid', 'high'] as Tax[]).map((t) => `<button aria-selected="${taxOf(st, st.player) === t}" data-act="tax" data-id="${t}">${TAX[t].name}</button>`).join('')}</div>
      <p class="hint" style="margin-top:0">${(['low', 'mid', 'high'] as Tax[]).map((t) => `<b>${TAX[t].name}</b>（${TAX[t].note}）: 年貢・商いの収入×${TAX[t].income}${TAX[t].chian ? `・治安 毎月${TAX[t].chian > 0 ? '+' : ''}${TAX[t].chian}` : ''}${TAX[t].grow !== 1 ? `・開発の伸び×${TAX[t].grow}` : ''}${TAX[t].cap !== 1 ? `・動員上限×${TAX[t].cap}` : ''}${TAX[t].ember !== 1 ? `・残り火の鎮まり×${TAX[t].ember}` : ''}`).join('<br>')}<br>鉱山と貿易の稼ぎは年貢の率に関わらない。</p>
      ${(() => {
        const cs = clanCastles(st, st.player);
        const need = (role: InvestRole) => cs.filter((c) => !investBlock(st, st.player, c, role) || (investBlock(st, st.player, c, role) ?? '').startsWith('金'));
        const works = cs.filter((c) => c.shinden || c.fortBuild);
        return `<h3 style="margin-top:12px">城への投資をまとめて</h3>
        <div class="actions" style="flex-wrap:wrap;gap:6px"><select id="inv-budget" aria-label="投資の予算">${[0.1, 0.3, 0.5, 1].map((r) => `<option value="${r}" ${r === 0.3 ? 'selected' : ''}>金の${r === 1 ? '全額' : `${r * 10}割`}まで（${fmt(Math.floor(me.gold * r))}貫）</option>`).join('')}</select>
        <button class="act" data-act="inv-bulk" data-id="agri" ${need('agri').length ? '' : 'disabled'}>開発の低い城から（${need('agri').length}城）</button><button class="act" data-act="inv-bulk" data-id="com" ${need('com').length ? '' : 'disabled'}>商業の低い城から（${need('com').length}城）</button></div>
        <p class="hint">一度に開発（または商業）+${R.INVEST_STEP * 100}%ずつ、上限（治安で決まる）まで。新田開発と普請は城の画面で。${works.length ? `工事中: ${works.map((c) => `${esc(c.name)}（${c.shinden ? '新田' : ''}${c.shinden && c.fortBuild ? '・' : ''}${c.fortBuild ? FORT_NAME[fortOf(c) + 1] : ''}）`).join('、')}` : ''}</p>`;
      })()}
      ${hints([
        `毎月の収入のうち、決めた割合を治水と施しに回す。重点の城に半分を先に回し、残りは低い城から自動で配る。治水1＝基本石高×${R.CHISUI_COST}貫、治安1（施し）＝基本石高×${R.HODO_COST}貫。城ごとの値は「城の一覧」で見られる。`,
        '治水: 収穫＝石高×（0.7＋治水×0.006）。0で70%、50で100%、100で130%。',
        '治安: 動員上限＝石高×（200＋治安×1.5）人、開発の上限＝100%＋治安×0.6%。上限を超えた開発度は毎月少しずつ下がる。',
        `治安が下がる: 動員率（兵÷動員上限）が50%を超えた分×10が毎月（100%で−5）、包囲${R.CHIAN_SIEGE}、兵糧切れ${R.CHIAN_STARVE}、落とした城は${R.CHIAN_CAPTURED}から。上がる: 城主の魅力（(魅力−40)÷20）、戦のない月+${R.CHIAN_PEACE}、施し。動員目標は「軍事」で決める。`,
      ])}`;
  },
  castles: (st) => {
    const me = st.clans[st.player];
    const all = clanCastles(st, st.player).sort((a, b) => castleKoku(b) - castleKoku(a));
    const FIL: [string, string, (c: Castle) => boolean][] = [['all', 'すべて', () => true], ['nogov', '城主不在', (c) => !c.governor], ['low', '治安40未満', (c) => c.chian < 40], ['siege', '包囲中', (c) => besieged(st, c)], ['direct', '直轄', (c) => { const f = frontOfCastle(st, c); return !f || !!f.vacant; }], ['fief', '領', (c) => { const f = frontOfCastle(st, c); return !!f && !f.vacant; }]];
    const fl = FIL.find(([k]) => k === castFilter) ?? FIL[0];
    const cs = all.filter(fl[2]);
    const chips = all.length > 8 ? `<div class="subtabs">${FIL.map(([k, l, f]) => { const n = all.filter(f).length; return n || k === 'all' ? `<button aria-selected="${castFilter === k}" data-act="cast-filter" data-id="${k}">${l} ${n}</button>` : ''; }).join('')}</div>` : '';
    const table = (xs: Castle[]) => `<div class="tbl-wrap"><table><thead><tr><th>城</th><th>縄張り</th><th>城主</th><th class="n">石高</th><th class="n">城兵</th><th class="n">治安</th><th class="n">治水</th><th class="n">開発</th><th class="n">上限</th><th class="n">商業</th></tr></thead><tbody>
      ${xs.map((c) => `<tr><td><button class="mini" data-act="goto-castle" data-id="${c.i}">${esc(c.name)}</button>${me.focus === c.i ? ' <span class="pill warn">重点</span>' : ''}${besieged(st, c) ? ' <span class="pill bad">包囲</span>' : ''}${fortOf(c) ? ` <span class="pill">${FORT_NAME[fortOf(c)]}</span>` : ''}${c.shinden ? ' <span class="pill good">新田</span>' : ''}${c.fortBuild ? ' <span class="pill good">普請</span>' : ''}</td>
        <td>${R.CASTLE_KIND[c.kind ?? 'hira'].name}</td><td>${c.governor ? esc(st.generals[c.governor].name) : '<span class="hint" style="margin:0">不在</span>'}</td><td class="n">${man(castleKoku(c))}</td><td class="n">${fmt(c.garrison)}</td>
        <td class="n">${Math.round(c.chian)}</td><td class="n">${Math.round(c.chisui)}</td><td class="n">${Math.round(c.dev * 100)}%</td><td class="n">${Math.round(R.devCap(c.chian) * 100)}%</td><td class="n">${fmt(Math.round(castleCom(c)))}</td></tr>`).join('')}
      </tbody></table></div>`;
    const head = (r: string, xs: Castle[]) => `${r}　${xs.length}城・${xs.reduce((t, c) => t + castleKoku(c), 0).toFixed(0)}万石${xs.some((c) => !c.governor) ? `・<span class="warn">城主不在${xs.filter((c) => !c.governor).length}</span>` : ''}${xs.some((c) => c.chian < 40) ? `・<span class="warn">治安の低い城${xs.filter((c) => c.chian < 40).length}</span>` : ''}`;
    return `${chips}${cs.length ? regionGroups('cast', cs, castleRegion, head, table) : '<p class="hint">当てはまる城はない。</p>'}<p class="hint">城の名を押すとその城へ移る（城主の任命・重点の指定・登用は城の画面で）。商業は毎月の金の収入。城が多いときは地方ごとにたたむ（見出しを押すと開く）。</p>`;
  },
  bugyo: (st) => {
    const bs = bugyoOf(st, st.player);
    const cands = Object.values(st.generals).filter((g) => isFree(st, g)).sort((a, b) => b.int - a.int);
    const full = bs.length >= bugyoSlots(st, st.player);
    const row = (g: General, act: string) => `<tr><td class="gname">${face(g.id, 32, 'face face-sm')}${nameLink(g)}${g.sick ? ' <span class="pill bad">病</span>' : ''}${g.liege ? ` <span class="pill" title="${esc(st.generals[g.liege]?.name ?? '')}の陪臣">陪臣</span>` : ''}</td><td>${rankName(st, g)}</td>${stats4(st, g)}<td>${act}</td></tr>`;
    return `${dNote(st, 'staff')}<p class="hint" style="margin-top:0">奉行 ${bs.length} / ${bugyoSlots(st, st.player)}人。${bugyoLine('農政（石高）', bugyoCoef(st, st.player))}。${bugyoLine('商業', bugyoCoef(st, st.player, 'com'))}。${hyoroLine(st)}。奉行1人で${R.BUGYO_CASTLES}城まで目が届く（今${clanCastles(st, st.player).length}城）。</p>
      <div class="tbl-wrap"><table><thead><tr><th>奉行</th><th>身分</th><th class="n">武勇</th><th class="n">知略</th><th class="n">統率</th><th class="n">魅力</th><th>担当</th></tr></thead><tbody>
      ${bs.length ? bs.map((g) => row(g, `${ROLE_NAME[roleOf(g)]} <button class="mini" data-act="bugyo-role" data-id="${g.id}">${ROLE_NAME[roleOf(g) === 'agri' ? 'com' : roleOf(g) === 'com' ? 'hyoro' : 'agri']}へ</button> <button class="mini" data-act="bugyo-off" data-id="${g.id}">奉行を解く</button>`)).join('') : '<tr><td colspan="7" class="hint">奉行はいない。</td></tr>'}
      </tbody></table></div>
      <h3 style="margin-top:12px">待機中の武将（知略の高い順）</h3>${cands.length ? `<div class="tbl-wrap"><table><thead><tr><th>武将</th><th>身分</th><th class="n">武勇</th><th class="n">知略</th><th class="n">統率</th><th class="n">魅力</th><th></th></tr></thead><tbody>
      ${cands.map((g) => row(g, `<button class="mini" data-act="bugyo-on" data-id="${g.id}" ${full ? 'disabled title="枠がない"' : ''}>奉行に</button>`)).join('')}
      </tbody></table></div>` : '<p class="lede">待機中の武将はいない。</p>'}
      ${hints([`奉行は農政・商業・兵站のどれかを担当する。兵站は知略の最も高い一人の腕で、補給の届く距離（知略75で+1、90で+2）と運送の減り（知略が高いほど少ない）が決まる。どの身分からでも任じられ、部隊・城主には就かず全城の開発を進める。毎月功績+${R.BUGYO_MERIT}。`, `係数＝${R.DEV_NATURAL}＋Σ 重み×知略÷100（重みは知略の高い順に${R.BUGYO_WEIGHT.join('・')}）。城主のいない城は半分、包囲中は進まない。枠は石高で増える。`])}`;
  },
  deleg: (st) => {
    const dg = delegateOf(st);
    return `<p class="lede">任せた項目は、毎月の評定終了時にAIの諸大名と同じ判断で処理する。したことは記録に「委任:」で残る。</p>
      <ul class="list">${(Object.keys(DELEGATE_NAME) as DelegateKey[]).map((k) => `<li><button data-act="deleg" data-id="${k}" aria-pressed="${dg[k]}"><span class="grow">${esc(DELEGATE_NAME[k])}</span><span class="pill ${dg[k] ? 'good' : ''}">${dg[k] ? '委任中' : '自分で'}</span></button></li>`).join('')}</ul>
      ${hints([
        '予算・動員目標: 治安が低いほど施しを厚くし、金に余裕があれば治水へ。動員目標は方針（攻勢・守勢）と治安で決める。治安の最も低い城を重点にする。',
        '商い: 兵糧が3か月分を切れば買い、余れば高い時期に売る。鉄砲は兵の20%まで買い、自城の近くの部隊に持たせる。金に余裕があれば半年に一度、名物を買う。',
        '人事: 武将に余裕があれば奉行（知略の高い順、農政と商業を交互に）と使番（武勇の高い順）を埋め、蔵の名物を部隊長に下賜する。恩賞（未払いの多い者に加増か感状）と、功績の満ちた者の取り立ても行う。',
        '官位: 金が次の献金の2倍あれば官位を上げる。',
        '軍事: 領に入れていない直轄の部隊と城を、AIの諸大名と同じ判断（攻勢・均衡・守勢）で動かす。部隊の出陣・移動・新しい部隊の編成・軍団の傘下・城主・鉄砲と大筒の配備・足軽の雇い入れまで。家臣に城を与えて任せるのは「人事」の知行で。',
      ])}`;
  },
  // ── 軍事 ──
  armies: (st) => {
    const all = clanArmies(st, st.player).filter((a) => !a.ikki).sort((a, b) => b.troops - a.troops);
    const FIL: [string, string, (a: Army) => boolean][] = [['all', 'すべて', () => true], ['idle', '未行動', (a) => !a.acted && !orderFor(st, a.id) && !delegatedArmy(st, a)], ['order', '出陣命令', (a) => !!orderFor(st, a.id)], ['direct', '直轄', (a) => !delegatedArmy(st, a)], ['deleg', '領・委任', (a) => delegatedArmy(st, a)]];
    const fl = FIL.find(([k]) => k === armyFilter) ?? FIL[0];
    const as = all.filter(fl[2]);
    const chips = all.length > 8 ? `<div class="subtabs">${FIL.map(([k, l, f]) => { const n = all.filter(f).length; return n || k === 'all' ? `<button aria-selected="${armyFilter === k}" data-act="army-filter" data-id="${k}">${l} ${n}</button>` : ''; }).join('')}</div>` : '';
    const head = (r: string, xs: Army[]) => `${r}　${xs.length}隊・兵${fmt(xs.reduce((t, a) => t + a.troops, 0))}${xs.some((a) => !a.acted && !orderFor(st, a.id) && !delegatedArmy(st, a)) ? `・<span class="good">未行動${xs.filter((a) => !a.acted && !orderFor(st, a.id) && !delegatedArmy(st, a)).length}</span>` : ''}`;
    const table = (xs: Army[]) => `<div class="tbl-wrap"><table><thead><tr><th>部隊</th><th>傘下</th><th>所在</th><th class="n">兵</th><th class="n">足軽</th><th class="n">練度</th><th class="n">士気</th><th class="n">鉄砲</th><th>状態</th></tr></thead><tbody>
      ${xs.map((a) => {
        const ord = orderFor(st, a.id);
        const occ = ord ? occupancy(st).get(ord.hex) : null;
        const tn = ord ? (occ ? `${st.generals[occ.main].name}隊` : castleAt(st, ord.hex)?.name ?? '敵陣') : '';
        const here = castleAt(st, a.hex);
        return `<tr><td class="gname">${face(a.main, 32, 'face face-sm')}<button class="mini" data-act="goto-army" data-id="${a.id}">${esc(st.generals[a.main].name)}隊</button></td><td>${staffOf(a).length ? `${staffOf(a).length}人` : '—'}</td>
        <td>${esc(here ? here.name : PROVINCES[HEXES[a.hex].p].name)}</td><td class="n">${fmt(a.troops)}</td><td class="n">${fmt(ashiOf(a))}</td><td class="n">${Math.round(drillOf(a))}</td><td class="n">${a.morale.toFixed(2)}</td><td class="n">${fmt(a.guns ?? 0)}</td>
        <td>${ord ? `<span class="pill warn">出陣: ${esc(tn)}</span>` : a.routed ? '<span class="pill bad">潰走</span>' : delegatedArmy(st, a) ? '領・委任' : a.acted ? '行動済み' : '<span class="pill good">未行動</span>'}</td></tr>`;
      }).join('')}
      </tbody></table></div>`;
    return all.length ? `${chips}${as.length ? regionGroups('army', as, (a) => regionOf(provName(a.hex)), head, table) : '<p class="hint">当てはまる部隊はない。</p>'}<p class="hint">部隊の名を押すと地図でその部隊を選ぶ。移動・攻撃・補佐の付け替えは部隊の画面で。部隊が多いときは地方ごとにたたむ（見出しを押すと開く）。</p>` : '<p class="lede">部隊はない。城の画面で編成する。</p>';
  },
  ashi: (st) => {
    const me = st.clans[st.player];
    const as = clanArmies(st, st.player).filter((a) => !a.ikki).sort((a, b) => b.troops - a.troops);
    const wage = Math.round(clanAshi(st, st.player) * R.ASHI_WAGE);
    return `<dl class="kv"><dt>足軽</dt><dd>${fmt(clanAshi(st, st.player))}人・給金 月${fmt(wage)}貫（収入 月${fmt(clanIncome(st, st.player))}貫）</dd><dt>金</dt><dd>${fmt(me.gold)}貫</dd></dl>
      ${as.length ? `<div class="tbl-wrap" style="margin-top:8px"><table><thead><tr><th>部隊</th><th class="n">兵</th><th class="n">足軽</th><th class="n">練度</th><th class="n">上限</th><th class="n">攻防</th><th></th></tr></thead><tbody>
      ${as.map((a) => { const room = ashiRoom(st, a); return `<tr><td><button class="mini" data-act="goto-army" data-id="${a.id}">${esc(st.generals[a.main].name)}隊</button></td><td class="n">${fmt(a.troops)}</td><td class="n">${fmt(ashiOf(a))}</td><td class="n">${Math.round(drillOf(a))}</td><td class="n">${Math.round(R.drillCap(a.ashi ?? 0))}</td><td class="n">×${R.drillMult(drillOf(a)).toFixed(2)}</td>
        <td>${room > 0 ? `<button class="mini" data-act="hire-ashi-m" data-id="${a.id}">足軽を雇う（${fmt(room)}人・${fmt(room * R.ASHI_HIRE)}貫）</button>` : '<span class="hint" style="margin:0">自城の近くで・上限まで</span>'}</td></tr>`; }).join('')}
      </tbody></table></div>` : '<p class="lede">部隊はない。</p>'}
      ${hints([
        `練度（0〜100）: 攻撃・防御 ×（0.8＋練度÷250）、崩れにくさも上がる（練度20で×0.88、50で×1.0、100で×1.2）。自城か隣で過ごした月は統率に応じて+${R.drillGain(0)}〜${R.drillGain(100)}、合戦を経た月は+${R.DRILL_BATTLE}、出陣中（補給下）は+${R.DRILL_FIELD}。補充した農兵は練度${R.DRILL_RECRUIT}で、その分だけ部隊の練度が薄まる。`,
        `練度の上限: 農兵だけの部隊は60、足軽だけなら100（足軽の割合で決まる）。`,
        `足軽（常備兵）: 自城か隣にいる部隊に、1人${R.ASHI_HIRE}貫で一度に${R.ASHI_STEP}人まで雇える（練度${R.DRILL_ASHI}で加わる）。兵数の上限を超える分は、農兵を帰して足軽に入れ替える。給金は1人月${R.ASHI_WAGE}貫で、払えなければ毎月1割が去る。動員上限を使わず、動員による治安の低下にも数えない。`,
        `農繁期（${R.FARM_MONTHS.join('・')}月）に領外へ出陣している農兵の分だけ、十月の収穫が減る（減り＝${R.FARM_LOSS}×農繁期に領外にいた農兵の平均÷動員上限、最大${R.FARM_LOSS_MAX * 100}%）。足軽は季節を問わない。`,
      ])}`;
  },
  mobilize: (st) => {
    const me = st.clans[st.player], rate = mobilizeRate(st, st.player), drop = mobilizeDrop(st, st.player);
    return `${dNote(st, 'budget')}<dl class="kv">
      <dt>動員目標</dt><dd>${selPct('mobilize', me.mobilize ?? R.MOBILIZE_DEFAULT, R.MOBILIZE_STEPS)}　毎月の補充はここまで</dd>
      <dt>兵</dt><dd>${fmt(clanTroops(st, st.player))}人（うち足軽${fmt(clanAshi(st, st.player))}人）／動員上限 ${fmt(clanCapacity(st, st.player))}人（農兵の動員率${Math.round(rate * 100)}%）</dd>
      <dt>治安</dt><dd>${drop ? `動員で毎月−${drop.toFixed(1)}（すべての城）` : '動員による低下なし'}</dd>
      <dt>兵糧</dt><dd>${fmt(me.food)}石（月 −${fmt(clanUpkeep(st, st.player))}）</dd></dl>
      ${hints([`自城と隣のヘックスにいる部隊・城兵は、動員率がこの目標に届くまで毎月補充される（兵糧${R.RECRUIT_COST}石/人）。`, `動員率が${R.MOBILIZE_FREE * 100}%を超えた分×${R.MOBILIZE_DROP}だけ、家のすべての城の治安が毎月下がる。治安が下がると動員上限と開発の上限も下がる。`])}`;
  },
  tsukai: (st) => {
    const label = tsukaiLabel(st.player), ts = tsukaiOf(st, st.player);
    const cands = Object.values(st.generals).filter((g) => isFree(st, g) && g.rank >= R.TSUKAI_MAX_RANK).sort((a, b) => b.bra - a.bra);
    const row = (g: General, act: string) => `<tr><td class="gname">${face(g.id, 32, 'face face-sm')}${nameLink(g)}</td><td>${rankName(st, g)}</td><td class="n">${Math.floor(g.merit)}</td>${stats4(st, g)}<td>${act}</td></tr>`;
    const head = (k: string) => `<thead><tr><th>${k}</th><th>身分</th><th class="n">功績</th><th class="n">武勇</th><th class="n">知略</th><th class="n">統率</th><th class="n">魅力</th><th></th></tr></thead>`;
    return `${dNote(st, 'staff')}<p class="hint" style="margin-top:0">${label} ${ts.length} / ${tsukaiSlots(st, st.player)}人${ts.length ? `（筆頭 ${esc(ts[0].name)}）` : ''}。合戦では本陣から${R.CMD_RANGE + (ts.length ? R.CMD_HEAD_BONUS : 0)}ヘックス以内の部隊を自由に指揮でき、その外の部隊へは伝令を手番ごと（野戦は一刻、城攻めは約2日）に${R.COURIER_BASE + ts.length}回まで送れる（1 + ${label}の人数）。筆頭がいれば指揮範囲+${R.CMD_HEAD_BONUS}。</p>
      <div class="tbl-wrap"><table>${head(label)}<tbody>${ts.length ? ts.map((g, k) => row(g, `${k === 0 ? '<span class="pill good">筆頭</span> ' : ''}<button class="mini" data-act="tsukai-off" data-id="${g.id}">${label}を解く</button>`)).join('') : `<tr><td colspan="8" class="hint">${label}はいない。</td></tr>`}</tbody></table></div>
      <h3 style="margin-top:12px">任じられる武将（足軽大将・足軽組頭・待機中）</h3>${cands.length ? `<div class="tbl-wrap"><table>${head('武将')}<tbody>
      ${cands.map((g) => { const why = canTsukai(st, g); return row(g, `<button class="mini" data-act="tsukai-on" data-id="${g.id}" ${why ? `disabled title="${esc(why)}"` : ''}>${label}に</button>`); }).join('')}
      </tbody></table></div>` : '<p class="lede">任じられる武将はいない。</p>'}
      ${hints([`${label}は家が戦った月に部隊長の${R.TSUKAI_MULT}倍の功績を得る。侍大将に上がると抜ける。枠は石高で増える。`])}`;
  },
  guns: (st) => {
    const me = st.clans[st.player];
    const as = clanArmies(st, st.player).filter((a) => !a.ikki).sort((a, b) => b.troops - a.troops);
    return `<dl class="kv"><dt>蔵</dt><dd>${fmt(me.guns)}丁（全体 ${fmt(clanGuns(st, st.player))}丁・維持費 月${fmt(Math.round(clanGuns(st, st.player) * R.GUN_UPKEEP))}貫）</dd>${clanCannon(st, st.player) ? `<dt>大筒</dt><dd>蔵 ${me.cannon ?? 0}門（全体 ${clanCannon(st, st.player)}門・維持費 月${fmt(clanCannon(st, st.player) * R.CANNON_UPKEEP)}貫）</dd>` : ''}</dl>
      ${as.length ? `<div class="tbl-wrap" style="margin-top:8px"><table><thead><tr><th>部隊</th><th class="n">兵</th><th class="n">鉄砲</th><th class="n">上限</th><th></th><th class="n">大筒</th><th></th></tr></thead><tbody>
      ${as.map((a) => {
        const near = nearOwn(st, a), cur = a.guns ?? 0, cn = a.cannon ?? 0;
        const cbtn = !near ? '' : `<button class="mini" data-act="arm-cannon-m" data-id="${a.id}" ${(me.cannon ?? 0) > 0 && cn < R.CANNON_MAX ? '' : 'disabled'}>持たせる</button> <button class="mini" data-act="unarm-cannon-m" data-id="${a.id}" ${cn > 0 ? '' : 'disabled'}>戻す</button>`;
        const btns = !near ? '<span class="hint" style="margin:0">自城の近くでのみ</span>'
          : `<button class="mini" data-act="arm-guns-m" data-id="${a.id}" ${me.guns > 0 && cur < gunCap(a) ? '' : 'disabled'}>持たせる</button> <button class="mini" data-act="unarm-guns-m" data-id="${a.id}" ${cur > 0 ? '' : 'disabled'}>蔵へ戻す</button>`;
        return `<tr><td><button class="mini" data-act="goto-army" data-id="${a.id}">${esc(st.generals[a.main].name)}隊</button></td><td class="n">${fmt(a.troops)}</td><td class="n">${fmt(cur)}${cur > 0 && cur < R.GUN_MIN_UNIT ? '<span class="hint" style="margin:0">（隊にならない）</span>' : ''}</td><td class="n">${fmt(gunCap(a))}</td><td>${btns}</td><td class="n">${cn}</td><td>${cbtn}</td></tr>`;
      }).join('')}
      </tbody></table></div>` : '<p class="lede">部隊はない。</p>'}
      ${hints([`自城か自城の隣にいる部隊に、兵の${R.GUN_SHARE * 100}%まで持たせられる。${R.GUN_MIN_UNIT}丁以上で合戦に鉄砲隊が出る。鉄砲は「商い」で買う。`, `大筒は1部隊に${R.CANNON_MAX}門まで。「商い」の南蛮市で買う。`])}`;
  },
  // ── 外交 ──
  dip: (st) => {
    const near = neighbors(st, st.player, 6);
    const rows = Object.values(st.clans).filter((c) => c.alive && c.id !== st.player)
      .sort((a, b) => Number(near.has(b.id)) - Number(near.has(a.id)) || Number(!!treatyOf(st, st.player, b.id)) - Number(!!treatyOf(st, st.player, a.id)) || clanPower(st, b.id) - clanPower(st, a.id));
    const myP = clanPower(st, st.player);
    return `<p class="lede">同盟・婚姻を結んだ家とは互いに攻められず、領内も通れない（城には入れない）。断られると${DIP.COOLDOWN}か月は同じ家と交渉できない。数字は成功の見込み。</p>
    <div class="picker" style="margin:0 0 10px"><label for="sel-gift">名物を添える（成功率＋格×${R.ITEM_GIFT * 100}%。応じれば相手の家へ渡る。断られれば手元に残る）</label>
      <select id="sel-gift"><option value="">添えない</option>${clanItems(st, st.player).map((it) => `<option value="${it.id}" ${dipGift === it.id ? 'selected' : ''}>${esc(itemLabel(it))}　+${Math.round(it.grade * R.ITEM_GIFT * 100)}%${it.holder ? `（${esc(st.generals[it.holder].name)}が所持）` : ''}</option>`).join('')}</select></div>
    <div class="tbl-wrap"><table><thead><tr><th>勢力</th><th>当主</th><th class="n">城</th><th class="n">国力比</th><th class="n">威信</th><th>官位</th><th>関係</th><th>交渉</th></tr></thead><tbody>
    ${rows.map((c) => {
      const t = treatyOf(st, st.player, c.id);
      const ratio = myP / Math.max(1, clanPower(st, c.id));
      return `<tr><td><span class="swatch" style="background:${c.color}"></span> ${esc(c.name)}${near.has(c.id) ? '' : ' <span class="hint" style="margin:0">遠方</span>'}</td>
        <td>${c.leader ? nameLink(st.generals[c.leader]) : '—'}</td><td class="n">${clanCastles(st, c.id).length}</td><td class="n">${ratio.toFixed(1)}倍</td><td class="n">${c.prestige}</td><td>${courtOf(st, c.id) ? esc(courtName(st, c.id)) : '—'}</td><td>${relationLabel(st, c.id)}</td>
        <td>${dipButton(st, 'alliance', c.id)} ${dipButton(st, 'marriage', c.id)} ${dipButton(st, 'surrender', c.id)}${t ? ` <button class="mini" data-act="dip-break" data-id="${c.id}">手切れ（威信−${t.kind === 'marriage' ? DIP.BREAK_MARRIAGE : DIP.BREAK_ALLIANCE}）</button>` : ''}</td></tr>`;
    }).join('')}
    </tbody></table></div>
    ${hints([
      `同盟: 金${fmt(DIP.ALLIANCE_COST)}貫。${DIP.ALLIANCE_MONTHS}か月続く。相手が狙っている家・半年以内に戦った家とは結びにくい。相手の近くに強敵がいれば結びやすい。`,
      `婚姻: 金${fmt(DIP.MARRIAGE_COST)}貫。同盟${DIP.MARRIAGE_AFTER}か月後から。期限がなく、両家の威信+${DIP.MARRIAGE_PRESTIGE}。`,
      `降伏勧告: 金${fmt(DIP.SURRENDER_COST)}貫。城が${DIP.NEIGHBOR_RANGE}ヘックス以内で接し、国力が${DIP.SURRENDER_RATIO}倍以上の相手だけ。応じれば城・軍団・武将・捕虜・蔵の物資がそのまま臣従する。婚姻相手は応じやすい。`,
      '手切れ: 同盟・婚姻を破る。威信を失い、その家とは半年は結び直しにくい。',
    ])}`;
  },
  bakufu: (st) => {
    const B = bk(st), me = st.clans[st.player], sh = shogunClan(st);
    const shName = sh ? `${esc(clanName(st, sh))}家${st.clans[sh].leader ? `（${esc(st.generals[st.clans[sh].leader!].name)}）` : ''}` : '空位';
    const foes = Object.values(st.clans).filter((C) => C.alive && C.id !== st.player && C.id !== sh && clanCastles(st, C.id).length).sort((a, b) => a.name.localeCompare(b.name, 'ja'));
    const myOrders = B.orders.filter((o) => o.until >= st.turn && (o.to === 'all' || o.to.includes(st.player) || o.target === st.player));
    const postRow = (p: Post, area: string) => { const h = postHolder(st, p), why = postBlock(st, st.player, p); return `<tr><td>${esc(postName(p))}</td><td class="hint" style="margin:0">${esc(area)}</td><td>${h ? esc(clanName(st, h)) + '家' : p.kind === 'shoban' ? esc(B.shoban.map((c) => clanName(st, c)).join('・') || '—') : '空き'}</td><td>${why ? `<span class="hint" style="margin:0">${esc(why)}</span>` : `<button class="mini" data-act="bk-post" data-id="${p.kind === 'office' ? 'o:' + p.id : p.kind === 'shugo' ? 's:' + p.prov : 'b:'}">願う（${fmt(postCost(p))}貫・${Math.round(postChance(st, st.player, p) * 100)}%）</button>`}</td></tr>`; };
    const myProvs = [...new Set(clanCastles(st, st.player).map((c) => provName(c.hex)))];
    const holders = [...new Set(OFFICES.filter((o) => B.offices[o.id] && B.offices[o.id] !== st.player).map((o) => B.offices[o.id]!))];
    const sb = sponsorBlock(st, st.player);
    return `<dl class="kv"><dt>将軍</dt><dd>${shName}${B.sponsor ? `（${esc(clanName(st, B.sponsor))}家が擁立）` : ''}</dd><dt>当家の信任</dt><dd>${Math.round(trustOf(st, st.player))}${B.shoban.includes(st.player) ? '　<span class="pill good">御相伴衆</span>' : ''}${me.usurp ? '　<span class="pill bad">僭称</span>' : ''}</dd><dt>金</dt><dd>${fmt(me.gold)}貫</dd></dl>
      ${sh && sh !== st.player ? `<div class="actions" style="margin-top:6px"><button class="act" data-act="bk-donate" ${me.gold < R.DONATE_GOLD || me.usurp ? 'disabled' : ''}>将軍に献金（${fmt(R.DONATE_GOLD)}貫・信任+${R.DONATE_TRUST}）</button></div>` : ''}
      ${!sh ? `<div class="actions" style="margin-top:6px"><button class="act primary" data-act="bk-sponsor" ${sb ? 'disabled' : ''}>足利一門を将軍に立てる（${fmt(R.SPONSOR_GOLD)}貫）</button></div><p class="hint">${sb ? esc(sb) + '。' : ''}将軍の候補: ${candidates(st).map((g) => `${esc(g.name)}（${esc(genStatus(st, g))}）`).join('、') || 'いない'}。京を押さえ、候補を迎えれば立てられる。立てた将軍は御内書を出しやすいが、当家が大きくなりすぎると手を切って諸家に討伐を命じることがある。</p>` : ''}
      <h3 style="margin-top:12px">御内書（討伐の命）</h3>
      ${myOrders.length ? `<ul class="lede" style="padding-left:1.2em">${myOrders.map((o) => `<li>${esc(clanName(st, o.target))}家討伐 → ${o.to === 'all' ? '諸国へ' : esc(o.to.map((c) => clanName(st, c)).join('・')) + '家へ'}（あと${o.until - st.turn + 1}か月）</li>`).join('')}</ul>` : '<p class="hint">当家に関わる御内書はない。</p>'}
      ${sh ? `<div class="actions"><select id="sel-order" aria-label="討伐を願う相手">${foes.map((C) => { const b = orderBlock(st, st.player, C.id); return `<option value="${C.id}" ${b ? 'disabled' : ''}>${esc(C.name)}家${b ? `（${esc(b)}）` : `（${sh === st.player ? '下す' : Math.round(orderChance(st, st.player, C.id) * 100) + '%'}）`}</option>`; }).join('')}</select><button class="act" data-act="bk-order">${sh === st.player ? '討伐の御内書を下す' : `御内書を願う（${fmt(R.ORDER_GOLD)}貫）`}</button></div>` : ''}
      <h3 style="margin-top:12px">幕府の職と格式</h3>
      <div class="tbl-wrap"><table><thead><tr><th>職</th><th>管内</th><th>持ち主</th><th></th></tr></thead><tbody>
      ${OFFICES.map((o) => postRow({ kind: 'office', id: o.id }, o.area.join('・'))).join('')}
      ${postRow({ kind: 'shoban' }, '格式（何家でも）')}
      ${myProvs.map((prov) => postRow({ kind: 'shugo', prov }, '当家の城のある国')).join('')}
      </tbody></table></div>
      ${OFFICES.some((o) => B.offices[o.id] === st.player) ? `<h3 style="margin-top:12px">出仕を求める（管内の家）</h3><div class="actions" style="flex-wrap:wrap">${inJurisdiction(st, st.player).filter((C) => !B.shussi[C.id]).map((C) => `<button class="mini" data-act="bk-demand" data-id="${C.id}">${esc(C.name)}家</button>`).join('') || '<span class="hint" style="margin:0">管内に従っていない家はない</span>'}</div>` : ''}
      ${(() => {
        const provs = shugoProvs(st);
        if (!provs.length) return '';
        const vs = Object.values(st.generals).filter((g) => g.clan === st.player && !g.liege && g.id !== st.clans[st.player].leader && ['free', 'army', 'governor', 'bugyo', 'tsukai'].includes(g.status)).sort((a, b) => a.rank - b.rank || b.cha - a.cha);
        return `<h3 style="margin-top:12px">守護代（当家が守護の国）</h3><p class="hint" style="margin-top:0">家臣を守護代に任じると恩+${R.SHUGODAI_ON}、その国の当家の城の治安が毎月+${R.SHUGODAI_CHIAN}。解く・代えると恩−${R.SHUGODAI_OFF}。守護でなくなれば外れる。</p>
        <div class="tbl-wrap"><table><thead><tr><th>国</th><th>守護代</th><th>任じる</th></tr></thead><tbody>
        ${provs.map((pv) => { const h = shugodaiOf(st, pv); return `<tr><td>${esc(pv)}</td><td>${h ? `${nameLink(h)} <button class="mini" data-act="sgd-off" data-id="${h.id}">解く</button>` : '<span class="hint" style="margin:0">不在</span>'}</td><td><select data-sgdp="${esc(pv)}" aria-label="${esc(pv)}の守護代"><option value="">${h ? '代える武将を選ぶ…' : '任じる武将を選ぶ…'}</option>${vs.filter((g) => g !== h).map((g) => `<option value="${g.id}">${esc(g.name)}（${esc(R.RANK_NAME[g.rank])}・魅${g.cha}${g.shugodai ? `・今は${esc(g.shugodai)}守護代` : ''}）</option>`).join('')}</select></td></tr>`; }).join('')}
        </tbody></table></div>`;
      })()}
      ${holders.length ? `<h3 style="margin-top:12px">出仕する（職の持ち主に従う）</h3><div class="actions" style="flex-wrap:wrap">${holders.map((h) => `<button class="mini" data-act="bk-shussi" data-id="${h}" ${shussiBlock(st, st.player, h) ? 'disabled' : ''}>${esc(clanName(st, h))}家（${esc(OFFICES.filter((o) => B.offices[o.id] === h).map((o) => o.name).join('・'))}）</button>`).join('')}</div>` : ''}
      ${hints([
        '大義名分: 攻める相手ごとに名分を問う。名分があるのは、将軍家の討伐、将軍の御内書、僭称の家、将軍に弓を引いた家、職の管内で従わない家、守護職の国、旧領の回復（5年以内に失った城）、仇討ち（一門・宿老を討った家、10年）、反撃（半年以内に攻めてきた家）、同盟相手の救援、謀反・お家騒動で割れた家。国人衆の城は問わない。',
        `名分のない戦（私戦）は、加わった武将の恩−${R.SHISEN_ON}、全城の治安−${R.SHISEN_CHIAN}と威信−${R.SHISEN_PRESTIGE}（月に一度）、落とした城の残り火+${R.SHISEN_EMBER}、半年は外交の成功率−${R.SHISEN_DIP * 100}%。名分のある戦で落とした城は残り火−${R.MEIBUN_EMBER}。AIは名分のある相手を狙い、私戦には慎重。`,
        `幕府の信任: 献金・将軍との同盟・御内書に応じた出兵で上がり、将軍家とその味方を攻めると大きく下がる。御内書は信任${R.ORDER_TRUST}から（${fmt(R.ORDER_GOLD)}貫、${R.ORDER_MONTHS}か月有効）、職・守護職・御相伴衆は信任${R.POST_TRUST}から。御相伴衆は御内書の通りがよい。`,
        '出仕: 職の持ち主に従えば同盟を結び、その職の名分から外れる。持ち主は管内の家に出仕を求められる（弱い家ほど応じる）。',
        '将軍家が滅べば空位になり、御内書と職の任官は止まる。京を押さえて足利一門を迎えれば将軍に立てられる。征夷大将軍になった家は自ら御内書を下し、職を与えられる。',
      ])}`;
  },
  court: (st) => {
    const cur = courtOf(st, st.player), why = courtBlock(st, st.player);
    const kampaku = holderOf(st, R.KAMPAKU), shogun = holderOf(st, R.SHOGUN);
    return `${dNote(st, 'court')}<dl class="kv"><dt>官位</dt><dd>${esc(R.COURT[cur].name)}（威信+${R.COURT[cur].pres}・攻められにくさ${Math.round(R.COURT[cur].deter * 100)}%）</dd>
      <dt>関白</dt><dd>${kampaku ? `${esc(kampaku.name)}家` : '空席（公家）'}</dd><dt>征夷大将軍</dt><dd>${shogun ? `${esc(shogun.name)}家` : '空席'}</dd></dl>
      ${st.clans[st.player].usurp ? '<p class="hint warn">官を自ら名乗った（僭称）。朝廷は官を与えず、諸家とは結びにくく、討つ大義を与えている。</p>' : `<div class="actions" style="margin-top:8px"><button class="act" data-act="usurp">官を自ら名乗る（僭称）</button></div><p class="hint" style="margin-top:2px">朝廷を経ずに名乗れば威信+${R.USURP_PRESTIGE}。だが以後は献金で官位を得られず、外交の成功率−${Math.round(R.USURP_DIP * 100)}%、他家に討つ大義を与える（狙われやすくなる）。取り消せない。</p>`}
      ${cur + 1 < R.COURT.length ? `<div class="actions" style="margin-top:8px"><button class="act primary" data-act="court-buy" ${why ? 'disabled' : ''}>献金して${esc(R.COURT[cur + 1].name)}に（${fmt(R.COURT[cur + 1].cost)}貫）</button></div>${why ? `<p class="hint">${esc(why)}</p>` : ''}` : ''}
      <div class="tbl-wrap" style="margin-top:8px"><table><thead><tr><th>官位</th><th class="n">献金</th><th class="n">威信</th><th class="n">攻められにくさ</th></tr></thead><tbody>
      ${R.COURT.slice(1).map((c, k) => `<tr${k + 1 === cur ? ' class="me"' : ''}><td>${esc(c.name)}</td><td class="n">${fmt(c.cost)}貫</td><td class="n">+${c.pres}</td><td class="n">${Math.round(c.deter * 100)}%</td></tr>`).join('')}
      </tbody></table></div>
      ${(() => {
        const vs = Object.values(st.generals).filter((g) => g.clan === st.player && !g.liege && g.id !== st.clans[st.player].leader && ['free', 'army', 'governor', 'bugyo', 'tsukai'].includes(g.status))
          .sort((a, b) => kanOf(b) - kanOf(a) || (b.fame ?? 0) - (a.fame ?? 0) || a.rank - b.rank).slice(0, 40);
        return `<h3 style="margin-top:12px">家臣の推挙</h3><p class="hint" style="margin-top:0">家臣のために朝廷へ官位を願う（当家の官位より下、大納言まで。献金はその官位の${Math.round(R.KAN_RATE * 100)}%）。恩と名声が上がり、外から官の誘いが来なくなる。外から官を受けていた者は、その縁が切れる。陪臣の官位は主が決める。</p>
        <div class="tbl-wrap"><table><thead><tr><th>武将</th><th>身分</th><th class="n">名声</th><th class="n">恩</th><th>官位</th><th></th></tr></thead><tbody>
        ${vs.map((g) => { const why = kanBlock(st, g), next = Math.min(R.KAN_VASSAL_MAX, kanOf(g) + 1); return `<tr><td>${nameLink(g)}${g.outer ? ' <span class="pill bad">外の官</span>' : ''}</td><td>${esc(R.RANK_NAME[g.rank])}</td><td class="n">${Math.round(g.fame ?? 0)}</td><td class="n">${Math.round(onOf(g))}</td><td>${kanOf(g) ? esc(kanName(g)) : '無位'}</td><td>${kanOf(g) < R.KAN_VASSAL_MAX ? `<button class="mini" data-act="kan-up" data-id="${g.id}" ${why ? `disabled title="${esc(why)}"` : ''}>${esc(R.COURT[next].name)}に（${fmt(kanCost(g))}貫）</button>` : ''}</td></tr>`; }).join('')}
        </tbody></table></div>`;
      })()}
      ${hints([
        '朝廷への献金で、1つ下から順に官位が上がる。威信の上乗せは外交・調略・登用の計算に効く（威信の上限100を超えて効く）。',
        '攻められにくさ: AIがこの家を攻める相手に選びにくくなり、攻めかかる判断も慎重になる。',
        `関白と征夷大将軍は天下に1人。将軍は総石高${R.SHOGUN_KOKU}万石か${R.SHOGUN_CASTLES}城を持ち、京（二条御所）を押さえた家だけが買える。将軍を奪われた家は内大臣相当に下がる。`,
      ])}`;
  },
  // ── 情報 ──
  // 諸大名: 一覧（押すとその家の詳しい札と交渉）。一覧と交渉を一つにまとめる
  gaike: (st) => {
    const near = neighbors(st, st.player, 6);
    const others = Object.values(st.clans).filter((c) => c.alive && c.id !== st.player)
      .sort((a, b) => Number(near.has(b.id)) - Number(near.has(a.id)) || Number(!!treatyOf(st, st.player, b.id)) - Number(!!treatyOf(st, st.player, a.id)) || clanPower(st, b.id) - clanPower(st, a.id));
    const myP = clanPower(st, st.player);
    const c = dipFocus ? st.clans[dipFocus] : null;
    if (c && c.alive && c.id !== st.player) {
      const k = others.findIndex((x) => x.id === c.id);
      const prev = others[(k - 1 + others.length) % others.length], next = others[(k + 1) % others.length];
      const t = treatyOf(st, st.player, c.id);
      const lg = c.leader ? st.generals[c.leader] : null;
      const age = lg ? ageOf(st, lg) : null;
      return `<div class="dip-nav"><button class="act" data-act="dip-back">← 諸大名の一覧</button><span class="grow"></span><button class="mini" data-act="dip-open" data-id="${prev.id}" title="前の家">◀ ${esc(prev.name)}</button><button class="mini" data-act="dip-open" data-id="${next.id}" title="次の家">${esc(next.name)} ▶</button></div>
      <div class="dip-card">
        ${faceOrMon(c.leader, c.name, c.color, 96)}
        <div class="dip-card-t">
          <h3 class="sect-h" style="margin-top:0"><span class="swatch" style="background:${c.color}"></span> ${esc(c.name)}家 ${near.has(c.id) ? '' : '<span class="hint" style="margin:0">遠方</span>'} ${t ? relationLabel(st, c.id) : ''}</h3>
          <dl class="kv"><dt>当主</dt><dd>${lg ? nameLink(lg) : '—'}${age !== null ? `（${age}歳）` : ''}</dd><dt>官位</dt><dd>${courtOf(st, c.id) ? esc(courtName(st, c.id)) : '—'}</dd>
          <dt>城・石高</dt><dd>${clanCastles(st, c.id).length}城・${clanKoku(st, c.id).toFixed(1)}万石</dd><dt>兵</dt><dd>${fmt(clanTroops(st, c.id))}</dd>
          <dt>国力比</dt><dd>当家の${(myP / Math.max(1, clanPower(st, c.id))).toFixed(1)}倍</dd><dt>威信</dt><dd>${c.prestige}</dd>
          <dt>方針</dt><dd>${c.stance}${c.target ? `・主攻 ${esc(clanName(st, c.target))}` : ''}</dd></dl>
        </div>
      </div>
      <h3 class="sect-h">交渉</h3>
      <p class="hint" style="margin-top:0">数字は成功の見込み。断られると${DIP.COOLDOWN}か月は同じ家と交渉できない。押せない交渉は、押す（触れる）と理由が出る。</p>
      <div class="picker" style="margin:0 0 10px"><label for="sel-gift">名物を添える（成功率＋格×${R.ITEM_GIFT * 100}%。応じれば相手の家へ渡る。断られれば手元に残る）</label>
        <select id="sel-gift"><option value="">添えない</option>${clanItems(st, st.player).map((it) => `<option value="${it.id}" ${dipGift === it.id ? 'selected' : ''}>${esc(itemLabel(it))}　+${Math.round(it.grade * R.ITEM_GIFT * 100)}%${it.holder ? `（${esc(st.generals[it.holder].name)}が所持）` : ''}</option>`).join('')}</select></div>
      <div class="actions dip-acts">${dipButton(st, 'alliance', c.id, true)}${dipButton(st, 'marriage', c.id, true)}${dipButton(st, 'surrender', c.id, true)}${t ? `<button class="act" data-act="dip-break" data-id="${c.id}">手切れ（威信−${t.kind === 'marriage' ? DIP.BREAK_MARRIAGE : DIP.BREAK_ALLIANCE}）</button>` : ''}</div>
      ${hints([
        `同盟: 金${fmt(DIP.ALLIANCE_COST)}貫。${DIP.ALLIANCE_MONTHS}か月のあいだ互いに攻められず、領内も通れる（城には入れない）。相手が狙っている家・半年以内に戦った家とは結びにくい。相手の近くに強敵がいれば結びやすい。`,
        `婚姻: 金${fmt(DIP.MARRIAGE_COST)}貫。同盟${DIP.MARRIAGE_AFTER}か月後から。期限がなく、両家の威信+${DIP.MARRIAGE_PRESTIGE}。`,
        `降伏勧告: 金${fmt(DIP.SURRENDER_COST)}貫。城が${DIP.NEIGHBOR_RANGE}ヘックス以内で接し、国力が${DIP.SURRENDER_RATIO}倍以上の相手だけ。応じれば城・軍団・武将・捕虜・蔵の物資がそのまま臣従する。婚姻相手は応じやすい。`,
        '手切れ: 同盟・婚姻を破る。威信を失い、その家とは半年は結び直しにくい。',
      ])}`;
    }
    dipFocus = null;
    const me = st.clans[st.player];
    const row = (x: typeof me) => {
      const mine = x.id === st.player;
      return `<tr${mine ? ' class="me"' : ''}><td>${mine ? `<span class="swatch" style="background:${x.color}"></span> ${esc(x.name)}（当家）` : `<button class="linkish" data-act="dip-open" data-id="${x.id}"><span class="swatch" style="background:${x.color}"></span> ${esc(x.name)}</button>${near.has(x.id) ? '' : ' <span class="hint" style="margin:0">遠方</span>'}`}</td>
        <td>${x.leader ? nameLink(st.generals[x.leader]) : '—'}</td><td class="n">${clanCastles(st, x.id).length}</td><td class="n">${clanKoku(st, x.id).toFixed(1)}</td><td class="n">${fmt(clanTroops(st, x.id))}</td>
        <td class="n">${mine ? '—' : `${(myP / Math.max(1, clanPower(st, x.id))).toFixed(1)}倍`}</td><td>${mine ? '—' : relationLabel(st, x.id)}</td>
        <td class="dip-cell">${mine ? '' : x.foreign ? '<span class="pill warn">国外・唐入りの敵</span>' : `${dipButton(st, 'alliance', x.id)}${dipButton(st, 'marriage', x.id)}${dipButton(st, 'surrender', x.id)}${(() => { const t = treatyOf(st, st.player, x.id); return t ? `<button class="mini" data-act="dip-break" data-id="${x.id}" title="同盟・婚姻を破る（威信−${t.kind === 'marriage' ? DIP.BREAK_MARRIAGE : DIP.BREAK_ALLIANCE}）">手切れ</button>` : ''; })()}`}</td></tr>`;
    };
    const shown = dipAll ? others : others.filter((x) => near.has(x.id) || treatyOf(st, st.player, x.id));
    return `<p class="lede" style="margin-top:0">存続 ${others.length + 1}家。国人衆の城 ${st.castles.filter((x) => !x.owner).length}。全${domesticCount(st)}城の制圧で天下統一。同盟・婚姻・降伏勧告はこの一覧から申し入れられる（数字は成功の見込み。押せないものは押す・触れると理由が出る）。家の名を押すと、その家の詳しい様子が開く。</p>
    <div class="picker" style="margin:0 0 10px"><label for="sel-gift">名物を添える（成功率＋格×${R.ITEM_GIFT * 100}%。応じれば相手の家へ渡る。断られれば手元に残る）</label>
      <select id="sel-gift"><option value="">添えない</option>${clanItems(st, st.player).map((it) => `<option value="${it.id}" ${dipGift === it.id ? 'selected' : ''}>${esc(itemLabel(it))}　+${Math.round(it.grade * R.ITEM_GIFT * 100)}%${it.holder ? `（${esc(st.generals[it.holder].name)}が所持）` : ''}</option>`).join('')}</select></div>
    <div class="subtabs" role="group" aria-label="表示する家"><button type="button" data-act="dip-filter" data-id="near" aria-selected="${!dipAll}">近隣と盟友（${others.filter((x) => near.has(x.id) || treatyOf(st, st.player, x.id)).length}）</button><button type="button" data-act="dip-filter" data-id="all" aria-selected="${dipAll}">すべての家（${others.length}）</button></div>
    <div class="tbl-wrap"><table class="gaike-tbl"><thead><tr><th>勢力</th><th>当主</th><th class="n">城</th><th class="n">石高</th><th class="n">兵</th><th class="n">国力比</th><th>関係</th><th>交渉</th></tr></thead><tbody>
    ${row(me)}${shown.map(row).join('')}
    </tbody></table></div>
    ${hints([
      `同盟: 金${fmt(DIP.ALLIANCE_COST)}貫。${DIP.ALLIANCE_MONTHS}か月のあいだ互いに攻められず、領内も通れる（城には入れない）。相手が狙っている家・半年以内に戦った家とは結びにくい。相手の近くに強敵がいれば結びやすい。`,
      `婚姻: 金${fmt(DIP.MARRIAGE_COST)}貫。同盟${DIP.MARRIAGE_AFTER}か月後から。期限がなく、両家の威信+${DIP.MARRIAGE_PRESTIGE}。`,
      `降伏勧告: 金${fmt(DIP.SURRENDER_COST)}貫。城が${DIP.NEIGHBOR_RANGE}ヘックス以内で接し、国力が${DIP.SURRENDER_RATIO}倍以上の相手だけ。応じれば城・軍団・武将・捕虜・蔵の物資がそのまま臣従する。婚姻相手は応じやすい。`,
      `手切れ: 同盟・婚姻を破る。威信を失い、その家とは半年は結び直しにくい。断られると${DIP.COOLDOWN}か月は同じ家と交渉できない。`,
    ])}`;
  },
  clans: (st) => {
    const rows = Object.values(st.clans).filter((c) => c.alive).sort((a, b) => clanKoku(st, b.id) - clanKoku(st, a.id));
    return `<p class="lede">存続 ${rows.length}家。国人衆の城 ${st.castles.filter((c) => !c.owner).length}。全${domesticCount(st)}城の制圧で天下統一。</p>
    <div class="tbl-wrap"><table><thead><tr><th>勢力</th><th>当主</th><th class="n">城</th><th class="n">石高</th><th class="n">兵</th><th class="n">威信</th><th>官位</th><th>方針</th><th>主攻</th><th>関係</th></tr></thead><tbody>
    ${rows.map((c) => `<tr${c.id === st.player ? ' class="me"' : ''}><td><span class="swatch" style="background:${c.color}"></span> ${esc(c.name)}</td><td>${c.leader ? nameLink(st.generals[c.leader]) : '—'}</td><td class="n">${clanCastles(st, c.id).length}</td><td class="n">${clanKoku(st, c.id).toFixed(1)}</td><td class="n">${fmt(clanTroops(st, c.id))}</td><td class="n">${c.prestige}</td><td>${courtOf(st, c.id) ? esc(courtName(st, c.id)) : '—'}</td><td>${c.id === st.player ? '—' : c.stance}</td><td>${c.id === st.player || !c.target ? '—' : esc(clanName(st, c.target))}</td><td>${c.id === st.player ? '—' : relationLabel(st, c.id)}</td></tr>`).join('')}
    </tbody></table></div>`;
  },
  vassals: (st) => {
    const label = tsukaiLabel(st.player), ts = tsukaiOf(st, st.player);
    const leaderId = st.clans[st.player].leader;
    const statusName = (g: General) => g.status === 'army' ? (g.army && st.armies[g.army]?.main === g.id ? '部隊長' : '補佐') : g.status === 'governor' ? '城主' : g.status === 'free' ? '待機'
      : g.status === 'bugyo' ? `奉行（${roleOf(g) === 'com' ? '商業' : '農政'}）` : g.status === 'tsukai' ? (ts[0]?.id === g.id ? `${label}筆頭` : label) : g.status === 'young' ? ((g.born ?? 0) > st.year ? `誕生前（${g.born}年生）` : `元服前（${g.genpuku}年）`) : g.status;
    const nextAt = (g: General) => g.rank > 0 ? R.MERIT_AT[g.rank - 1] : null;
    const all = Object.values(st.generals).filter((g) => g.clan === st.player && !g.ikki && g.status !== 'dead' && g.status !== 'captive');
    const isFiefLord = (g: General) => (st.fronts ?? []).some((f) => f.leader === g.id && !f.vacant);
    const ROLES: [string, string, (g: General) => boolean][] = [
      ['all', '全員', () => true], ['free', '待機', (g) => g.status === 'free' && !g.liege], ['governor', '城主', (g) => g.status === 'governor' && !g.liege], ['army', '部隊', (g) => g.status === 'army' && !g.liege],
      ['yaku', '奉行・' + label, (g) => g.status === 'bugyo' || g.status === 'tsukai'], ['fief', '城持ち', isFiefLord], ['baishin', '陪臣', (g) => !!g.liege], ['young', '元服前', (g) => g.status === 'young'],
    ];
    const vf = vasFilter;
    const roleF = ROLES.find(([k]) => k === vf.role) ?? ROLES[0];
    const own = all.filter((g) => roleF[2](g) && (vf.rank === '' || String(g.rank) === vf.rank) && (!vf.q || g.name.includes(vf.q)));
    const order = (g: General) => (g.id === leaderId ? -1 : g.status === 'young' ? 9 : g.rank);
    const locName = (g: General) => g.status === 'army' && g.army && st.armies[g.army] ? PROVINCES[HEXES[st.armies[g.army].hex].p].name : st.castles[g.loc]?.name ?? '—';
    // 見出しを押すと並べ替え（数値は高い順から。もう一度押すと逆順）。所在は城の順（部隊は後ろに部隊ごと）、役職は同じ役職がまとまる
    const keyOf: Record<string, (g: General) => number | string> = {
      name: (g) => g.name, rank: (g) => order(g), age: (g) => ageOf(st, g) ?? -1, merit: (g) => (g.status === 'young' || g.id === leaderId ? -1 : g.merit),
      bra: (g) => g.bra, int: (g) => g.int, lea: (g) => g.lea, cha: (g) => g.cha, on: (g) => (g.id === leaderId ? 999 : onOf(g)), role: (g) => statusName(g), loc: (g) => (g.status === 'army' && g.army ? 10000 + g.army : g.loc),
    };
    const vs = vasSort && keyOf[vasSort.key] ? vasSort : null;
    const cmp = (a: General, b: General) => {
      if (!vs) return order(a) - order(b) || b.merit - a.merit;
      const x = keyOf[vs.key](a), y = keyOf[vs.key](b);
      const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'ja');
      return c * vs.dir || order(a) - order(b) || b.merit - a.merit;
    };
    const th = (key: string, label: string, num = false) => {
      const on = vs?.key === key;
      return `<th${num ? ' class="n"' : ''} aria-sort="${on ? (vs!.dir > 0 ? 'ascending' : 'descending') : 'none'}"><button type="button" class="th-sort${on ? ' on' : ''}" data-act="vsort" data-id="${key}" data-num="${num ? 1 : 0}">${label}${on ? (vs!.dir > 0 ? '▲' : '▼') : ''}</button></th>`;
    };
    const shown = vf.page * VAS_PAGE;
    return `<p class="lede">${all.length}名${own.length !== all.length ? `（絞り込み ${own.length}名）` : ''}。名前を押すと、その武将への命令が出る。見出しを押すと並べ替え${vs ? '（<button type="button" class="glink" data-act="vsort" data-id="">身分順に戻す</button>）' : ''}。</p>
    <div class="subtabs">${ROLES.map(([k, l, f]) => { const n = all.filter(f).length; return n || k === 'all' ? `<button aria-selected="${vf.role === k}" data-act="vfilter" data-id="${k}">${esc(l)} ${n}</button>` : ''; }).join('')}</div>
    <div class="actions" style="margin:6px 0;gap:6px"><input type="search" data-vq value="${esc(vf.q)}" placeholder="名前で探す" aria-label="名前で探す" style="max-width:12em"><select data-vrank aria-label="身分"><option value="">身分すべて</option>${R.RANK_NAME.map((n, k) => `<option value="${k}" ${vf.rank === String(k) ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>${vf.q || vf.rank || vf.role !== 'all' ? '<button class="mini" data-act="vfilter" data-id="reset">絞り込みを解く</button>' : ''}</div>
    <div class="tbl-wrap"><table><thead><tr>${th('name', '武将')}${th('rank', '身分')}${th('age', '年齢', true)}${th('merit', '功績', true)}${th('bra', '武勇', true)}${th('int', '知略', true)}${th('lea', '統率', true)}${th('cha', '魅力', true)}${th('on', '恩', true)}${th('role', '役職')}${th('loc', '所在')}</tr></thead><tbody>
    ${own.sort(cmp).slice(0, shown).map((g) => {
      return `<tr${leaderId === g.id ? ' class="me"' : ''}><td class="gname">${face(g.id, 32, 'face face-sm')}${nameLink(g)}${g.kin ? ' <span class="pill">一門</span>' : ''}${[g.tea, g.sword, g.nanban].filter((x) => x && st.items[x]).map((x) => ` <span class="pill good" title="${esc(itemLabel(st.items[x!]))}">${({ tea: '茶', sword: '刀', nanban: '南' } as const)[st.items[x!].kind]}</span>`).join('')}${g.kiri ? ' <span class="pill" title="洗礼を受けた">洗礼</span>' : ''}${g.sick ? ' <span class="pill bad">病</span>' : ''}</td><td>${rankName(st, g)}</td>
      <td class="n">${ageCell(st, g)}</td><td class="n">${g.status === 'young' || g.id === leaderId ? '—' : `${Math.floor(g.merit)}${nextAt(g) !== null ? `<span class="hint" style="margin:0">/${nextAt(g)}</span>` : ''}`}</td>
      ${stats4(st, g)}<td class="n">${g.id === leaderId || g.status === 'young' ? '—' : onCell(g)}</td><td>${statusName(g)}</td>
      <td>${esc(locName(g))}</td></tr>`;
    }).join('')}
    </tbody></table></div>
    ${own.length > shown ? `<div class="actions"><button class="act" data-act="vmore">さらに${Math.min(VAS_PAGE, own.length - shown)}人を見る（残り${own.length - shown}人）</button></div>` : ''}
    ${hints([
      `身分で率いられる兵の上限が変わる: 当主×${R.LEADER_TROOP}、宿老×${R.RANK_TROOP[0]}、侍大将×${R.RANK_TROOP[1]}、足軽大将×${R.RANK_TROOP[2]}、足軽組頭×${R.RANK_TROOP[3]}。一門は侍大将以上として扱う。`,
      `功績: 合戦の勝ち+${R.MERIT.WIN}（城を落とせばさらに+${R.MERIT.CASTLE}）、負け+${R.MERIT.LOSE}、引き分け+${R.MERIT.DRAW}、調略の成功+${R.MERIT.PLOT}、城主は毎月+${R.MERIT.GOV}、奉行は毎月+${R.BUGYO_MERIT}。${label}は家が戦った月に部隊長の${R.TSUKAI_MULT}倍の功績を得る。`,
      `功績が数字の右の値に達すると月末に昇進する。宿老は石高に応じた枠（一門は枠外）。${label}は足軽大将・足軽組頭から選び、侍大将に上がると抜ける。`,
    ])}`;
  },
  ronin: (st) => {
    const me = st.clans[st.player];
    const all = Object.values(st.generals).filter((g) => g.status === 'ronin' && !g.ikki).sort((a, b) => fame(b) - fame(a));
    const offers = st.offers?.length ? `<h3>仕官の願い出</h3><div class="tbl-wrap"><table>${offerHead}<tbody>${offerRows(st)}</tbody></table></div>` : '';
    return `${offers}<p class="lede">在野 ${all.length}人。在野の武将は毎月${Math.round(R.RONIN_MOVE * 100)}%で${R.RONIN_RANGE}ヘックスほど先の城へ移り、威信の高い家の城へ向かいやすい。自家の城に来れば仕官を願い出ることがある。</p>
    ${all.length ? `<div class="tbl-wrap"><table><thead><tr><th>武将</th><th class="n">年齢</th><th class="n">武勇</th><th class="n">知略</th><th class="n">統率</th><th class="n">魅力</th><th>旧主</th><th>所在</th><th class="n">当家へ</th><th></th></tr></thead><tbody>
    ${all.map((g) => {
      const c = st.castles[g.loc], here = c.owner === st.player;
      return `<tr><td class="gname">${face(g.id, 32, 'face face-sm')}${nameLink(g)}${cutinOn() ? `<div class="hint pitch">「${esc(lineFor(st, g, 'offerPitch').text)}」</div>` : ''}</td><td class="n">${ageCell(st, g)}</td>${stats4(st, g)}<td>${esc(g.formerClan ? clanName(st, g.formerClan) + '家' : '—')}</td>
        <td>${esc(c.name)}<span class="hint" style="margin:0">（${esc(c.owner ? clanName(st, c.owner) : '国人衆')}）</span></td><td class="n">${Math.round(offerChance(st, g, st.player) * 100)}%</td>
        <td>${here ? `<button class="mini" data-act="ronin-m" data-id="${g.id}" ${g.triedTurn === st.turn || me.gold < R.RONIN_GOLD ? 'disabled' : ''}>登用 ${Math.round(roninChance(st, st.player) * 100)}%（${fmt(R.RONIN_GOLD)}貫）</button>` : ''}</td></tr>`;
    }).join('')}</tbody></table></div>` : '<p class="lede">在野の武将はいない。</p>'}
    ${hints([
      `仕官の願い出: 自家の城に来た在野の武将が、毎月の評定の後に願い出ることがある。見込み＝${R.RONIN_OFFER_BASE * 100}%＋（家の魅力 − 武将の能力の平均 − 20）÷100（3〜50%）。家の魅力＝威信（官位を含む）＋当主の魅力÷2。名のある者ほど大きな家を望む。`,
      `召し抱えるには金${fmt(R.RONIN_GOLD)}貫。能力の平均が${R.RONIN_FAME_SAMURAI}以上なら侍大将、それ以外は足軽大将で迎える。断られた家には${R.RONIN_REFUSED_MONTHS}か月願い出ない。旧主家を滅ぼした家には仕えず、その領地にも向かわない。`,
      `こちらから声をかける登用（自家の城にいる者だけ）: 金${fmt(R.RONIN_GOLD)}貫、成功率は当主の魅力で決まる（断られても金は戻らない）。人事を委任していれば、願い出はAIが決める。`,
    ])}`;
  },
  captive: (st) => {
    const caps = Object.values(st.generals).filter((g) => g.status === 'captive' && g.captor === st.player);
    return caps.length ? `<div class="tbl-wrap"><table><thead><tr><th>捕虜</th><th>旧主</th><th class="n">武</th><th class="n">知</th><th class="n">統</th><th class="n">魅</th><th class="n">登用率</th><th></th></tr></thead><tbody>
      ${caps.map((g) => `<tr><td>${nameLink(g)}</td><td>${esc(clanName(st, g.formerClan))}</td><td class="n">${g.bra}</td><td class="n">${g.int}</td><td class="n">${g.lea}</td><td class="n">${g.cha}</td><td class="n">${Math.round(recruitChance(st, g, st.player) * 100)}%</td>
      <td><button class="mini" data-act="cap-recruit" data-id="${g.id}" ${g.triedTurn === st.turn ? 'disabled' : ''}>登用</button> <button class="mini" data-act="cap-release" data-id="${g.id}">解放</button> <button class="mini" data-act="cap-execute" data-id="${g.id}">処断</button></td></tr>`).join('')}
      </tbody></table></div><p class="hint">登用率 = 0.4 +（当主の魅力 − 旧主家の威信）÷100。大名本人は登用できない。登用は毎月1回。</p>` : '<p class="lede">捕虜はいない。</p>';
  },
  known: (st) => {
    const knownG = st.revealed.map((id) => st.generals[id]).filter((g) => g && g.clan !== st.player && g.status !== 'dead');
    return knownG.length ? `<p class="lede">交戦した敵将の能力は恒久的に判明する。</p><div class="tbl-wrap"><table><thead><tr><th>武将</th><th>所属</th><th class="n">年齢</th><th class="n">武勇</th><th class="n">知略</th><th class="n">統率</th><th class="n">魅力</th></tr></thead><tbody>
      ${knownG.map((g) => `<tr><td>${nameLink(g)}</td><td>${esc(g.clan ? clanName(st, g.clan) : g.status === 'captive' ? '捕虜' : '在野')}</td><td class="n">${ageCell(st, g)}</td><td class="n">${g.bra}</td><td class="n">${g.int}</td><td class="n">${g.lea}</td><td class="n">${g.cha}</td></tr>`).join('')}</tbody></table></div>` : '<p class="lede">まだ交戦した敵将はいない。交戦した敵将の能力は恒久的に判明する。</p>';
  },
  // ── 商い ──
  rice: (st) => {
    const me = st.clans[st.player], price = ricePrice(st);
    const buyable = (n: number) => me.gold >= Math.ceil(n * price);
    return `${dNote(st, 'trade')}<dl class="kv"><dt>相場</dt><dd>1石 ${price.toFixed(2)}貫（売りは${(price * R.RICE_SELL).toFixed(2)}貫）</dd><dt>兵糧</dt><dd>${fmt(me.food)}石（月 −${fmt(clanUpkeep(st, st.player))}）</dd><dt>金</dt><dd>${fmt(me.gold)}貫</dd></dl>
      <h3 style="margin-top:10px">買う</h3><div class="actions">${[1000, 5000, 10000, 30000].map((n) => `<button class="mini" data-act="rice-buy" data-id="${n}" ${buyable(n) ? '' : 'disabled'}>${fmt(n)}石（${fmt(Math.ceil(n * price))}貫）</button>`).join('')}</div>
      <h3 style="margin-top:10px">売る</h3><div class="actions">${[1000, 5000, 10000, 30000].map((n) => `<button class="mini" data-act="rice-sell" data-id="${n}" ${me.food >= n ? '' : 'disabled'}>${fmt(n)}石（${fmt(Math.floor(n * price * R.RICE_SELL))}貫）</button>`).join('')}</div>
      <p class="hint">相場は月ごとに動く: 収穫後の10〜12月は×0.7と安く、6〜8月は×1.3と高い。</p>`;
  },
  gunbuy: (st) => {
    const me = st.clans[st.player], gp = gunPrice(st, st.player), total = clanGuns(st, st.player);
    return `${dNote(st, 'trade')}<dl class="kv"><dt>鉄砲</dt><dd>蔵 ${fmt(me.guns)}丁・全体 ${fmt(total)}丁</dd><dt>値段</dt><dd>1丁 ${gp}貫${hasGunSource(st, st.player) ? '（産地を持つ）' : `（産地を持てば${R.GUN_PRICE_SOURCE}貫）`}${hasProduct(st, st.player, 'iron') ? `・鉄の産地で${Math.round(R.IRON_GUN * 100)}%` : ''}</dd><dt>維持費</dt><dd>月 ${fmt(Math.round(total * R.GUN_UPKEEP * (hasProduct(st, st.player, 'powder') ? R.POWDER_UPKEEP : 1)))}貫（1丁${R.GUN_UPKEEP}貫${hasProduct(st, st.player, 'powder') ? `・硫黄・煙硝の産地で${Math.round(R.POWDER_UPKEEP * 100)}%` : ''}）</dd><dt>金</dt><dd>${fmt(me.gold)}貫</dd></dl>
      <h3 style="margin-top:10px">買う</h3><div class="actions">${[100, 300, 500, 1000].map((n) => `<button class="mini" data-act="gun-buy" data-id="${n}" ${me.gold >= n * gp ? '' : 'disabled'}>${fmt(n)}丁（${fmt(n * gp)}貫）</button>`).join('')}</div>
      ${hints([
        '産地: 堺（岸和田城）・国友（小谷城）・根来寺・雑賀城。',
        `買った鉄砲は蔵に入る。「軍事」の鉄砲の配備か部隊の画面で、自城か自城の隣にいる部隊に持たせる（兵の${R.GUN_SHARE * 100}%まで）。${R.GUN_MIN_UNIT}丁以上で合戦に鉄砲隊が出る。`,
        '鉄砲隊は2ヘックス先まで撃てて反撃を受けない。攻撃力は武将によらず1.5。防御は低く、隣に敵がいると射撃×0.7。丘×1.1・城内×1.2・森×0.6・川や湿地×0.7。',
        '隊が兵を失うと鉄砲もその分失う。維持費が払えないと毎月5%が使えなくなる。',
      ])}`;
  },
  gift: (st) => {
    const mineI = clanItems(st, st.player).sort((a, b) => b.grade - a.grade);
    const gens = Object.values(st.generals).filter((g) => g.clan === st.player && ['free', 'army', 'governor', 'tsukai', 'bugyo'].includes(g.status));
    return `${dNote(st, 'staff')}${mineI.length ? `<div class="tbl-wrap"><table><thead><tr><th>名物</th><th>効果</th><th>所持</th></tr></thead><tbody>
      ${mineI.map((it) => `<tr><td>${esc(itemLabel(it))}</td><td>${effOf(it)}</td><td><select data-equip="${it.id}" aria-label="${esc(it.name)}を持たせる武将"><option value="">蔵に置く</option>${genOpts(gens, (g) => `<option value="${g.id}" ${it.holder === g.id ? 'selected' : ''}>${esc(g.name)}${g[it.kind] && g[it.kind] !== it.id ? `（${esc(st.items[g[it.kind]!].name)}と替える）` : ''}</option>`)}</select></td></tr>`).join('')}
      </tbody></table></div>` : '<p class="lede">蔵に名物はない（「商い」の名物の市場で買える）。</p>'}
      ${hints([
        `武将1人に茶器・刀剣・南蛮の品を1点ずつ持たせられる（下賜）。茶器は魅力+格×2・知略+格、刀剣は武勇+格×2・統率+格、南蛮の品は全能力+格。初めて下賜した名物は恩+格×${R.ON_ITEM}（未払いの功を格×${R.ON_ITEM_PAY}まで報いる）。`,
        '持たせた武将が討死すると蔵へ戻り、捕らえられると敵の家へ渡る。',
      ])}`;
  },
  item: (st) => {
    const me = st.clans[st.player];
    return `${dNote(st, 'trade')}<h3>堺の市場</h3>${marketItems(st).length ? `<div class="tbl-wrap"><table><thead><tr><th>名物</th><th>効果</th><th class="n">値</th><th></th></tr></thead><tbody>
      ${marketItems(st).sort((a, b) => b.grade - a.grade).map((it) => `<tr><td>${esc(itemLabel(it))}</td><td>${effOf(it)}</td><td class="n">${fmt(itemPrice(st, st.player, it))}貫</td><td><button class="mini" data-act="item-buy" data-id="${it.id}" ${me.gold >= itemPrice(st, st.player, it) ? '' : 'disabled'}>買う</button></td></tr>`).join('')}
      </tbody></table></div>` : '<p class="lede">市場に名物は出ていない。</p>'}
      ${hints([
        `持っている名物の格の合計だけ威信が上がる。「外交」で名物を添えると成功率+格×${R.ITEM_GIFT * 100}%。買った名物は「人事」の下賜で武将に持たせる。`,
        '家が滅べば、その家の名物は滅ぼした家のものになる。堺（岸和田城）を持てば市場の名物は2割引。',
      ])}`;
  },
  nanban: (st) => {
    const me = st.clans[st.player], ships = shipsOf(st, st.player);
    const all = (st.ships ?? []).map((x) => `${esc(portName(x.port))}（${portOwner(st, x.port) ? esc(clanName(st, portOwner(st, x.port))) + '家' : '国人'}・あと${Math.max(1, x.until - st.turn + 1)}か月）`);
    const odds = shipOdds(st).sort((a, b) => b.p - a.p).map((o) => `${esc(portName(o.id))}${portOwner(st, o.id) === st.player ? '（当家）' : ''} ${Math.round(o.p * 100)}%`).join('・');
    const items = shipItems(st, st.player);
    const market = ships.length ? `<dl class="kv"><dt>金</dt><dd>${fmt(me.gold)}貫</dd><dt>鉄砲</dt><dd>残り${fmt(shipGuns(st, st.player))}丁・1丁${R.NANBAN_GUN_PRICE}貫（蔵${fmt(me.guns)}丁）</dd><dt>大筒</dt><dd>残り${shipCannon(st, st.player)}門・1門${fmt(R.CANNON_PRICE)}貫（蔵${me.cannon ?? 0}門）</dd></dl>
      <h3 style="margin-top:10px">鉄砲</h3><div class="actions">${[100, 200, 300, 600].map((n) => `<button class="mini" data-act="ship-guns" data-id="${n}" ${shipGuns(st, st.player) >= n && me.gold >= n * R.NANBAN_GUN_PRICE ? '' : 'disabled'}>${fmt(n)}丁（${fmt(n * R.NANBAN_GUN_PRICE)}貫）</button>`).join('')}</div>
      <h3 style="margin-top:10px">大筒</h3><div class="actions"><button class="mini" data-act="ship-cannon" ${shipCannon(st, st.player) > 0 && me.gold >= R.CANNON_PRICE ? '' : 'disabled'}>1門（${fmt(R.CANNON_PRICE)}貫）</button></div>
      <h3 style="margin-top:10px">南蛮の品</h3>${items.length ? `<div class="tbl-wrap"><table><thead><tr><th>品</th><th>効果</th><th class="n">値</th><th></th></tr></thead><tbody>
      ${items.map((it) => `<tr><td>${esc(itemLabel(it))}</td><td>${effOf(it)}</td><td class="n">${fmt(nanbanItemPrice(it))}貫</td><td><button class="mini" data-act="ship-item" data-id="${it.id}" ${me.gold >= nanbanItemPrice(it) ? '' : 'disabled'}>買う</button></td></tr>`).join('')}
      </tbody></table></div>` : '<p class="hint">積荷の品は売り切れた。</p>'}`
      : `<p class="lede">${clanPorts(st, st.player).length ? `当家の港（${clanPorts(st, st.player).map(([id]) => esc(portName(id))).join('・')}）に南蛮船は来ていない。` : '当家は南蛮港を持っていない。'}南蛮市は、南蛮船が当家の港に来ている間だけ開く。</p>`;
    return `${dNote(st, 'trade')}${market}
      <dl class="kv" style="margin-top:10px"><dt>来航中</dt><dd>${all.length ? all.join('、') : 'なし'}</dd><dt>来航の見込み</dt><dd>${odds}</dd><dt>唐船</dt><dd>${(st.karasen ?? []).length ? (st.karasen ?? []).map((x) => `${esc(karaPortName(x.port))}（${portOwner(st, x.port) ? esc(clanName(st, portOwner(st, x.port))) + '家' : '国人'}・あと${Math.max(1, x.until - st.turn + 1)}か月）`).join('、') : '来ていない（平戸・坊津・博多に、ときどき来る）'}</dd>${silverTrade(st, st.player) ? `<dt>銀の上乗せ</dt><dd>船が来ている月は+${fmt(silverTrade(st, st.player))}貫</dd>` : ''}</dl>
      ${hints([
        `南蛮船は毎年${R.SHIP_MONTH}月に1〜2隻が来て、${R.SHIP_STAY}か月とどまる。港: 平戸・府内・坊津（内城）・堺（岸和田城）、${'1570'}年から長崎（三城）。`,
        `布教を許した家の港には${R.SHIP_W_ALLOW}倍来やすく、禁教の家の港にはほとんど来ない（「外交」の布教）。`,
        `来航中は港の持ち主に貿易の利が月${fmt(R.SHIP_TRADE)}貫入る（銀山を持てば、その産出の${R.SILVER_TRADE * 100}%を上乗せ）。唐船（明の商人の密貿易の船）も平戸・坊津・博多にときどき来て、${R.KARASEN_STAY}か月のあいだ月${fmt(R.KARASEN_TRADE)}貫が入る（唐入りのあいだは来ない）。貿易の利は港を家臣に与えても当家に入る。1隻が鉄砲${R.SHIP_GUNS}丁・大筒${R.SHIP_CANNON}門・南蛮の品を積んでくる。`,
        `大筒（維持費 月${R.CANNON_UPKEEP}貫/門）は部隊に${R.CANNON_MAX}門まで持たせる。攻城の初めに城門を1門ごとに${R.CANNON_GATE * 100}%削り、城兵を怯ませ、その後も攻め手の手番ごとに城門を撃つ。自動の決着では城の守りを弱める。部隊が壊滅すると失う。`,
      ])}`;
  },
  mission: (st) => {
    const me = st.clans[st.player];
    const mis = Object.keys(st.missions ?? {}).filter((id) => missionaryActive(st, id));
    const bA = missionBlock(st, st.player, 'allow'), bB = missionBlock(st, st.player, 'ban');
    const kiri = clanCastles(st, st.player).filter((c) => (c.kiri ?? 0) >= 0.5).sort((a, b) => (b.kiri ?? 0) - (a.kiri ?? 0));
    const al = Object.values(st.clans).filter((C) => C.alive);
    const bap = baptized(st, st.player);
    return `<dl class="kv"><dt>当家</dt><dd><b>${missionLabel(me.mission)}</b>${missionHome(st, st.player).length ? `（${missionHome(st, st.player).map((id) => esc(misName(id))).join('・')}が身を寄せている）` : ''}</dd>
      <dt>洗礼を受けた家臣</dt><dd>${bap.length ? bap.map((g) => nameLink(g)).join('、') : 'なし'}</dd>
      <dt>信者のいる城</dt><dd>${kiri.length ? kiri.slice(0, 12).map((c) => `${esc(c.name)} ${Math.round(c.kiri!)}%`).join('・') : 'なし'}</dd></dl>
      <div class="actions" style="margin-top:8px"><button class="act" data-act="mission-set" data-id="allow" ${bA ? 'disabled' : ''}>布教を許す</button><button class="act" data-act="mission-set" data-id="ban" ${bB ? 'disabled' : ''}>切支丹を禁じる</button></div>
      ${bA && bB ? `<p class="hint">${esc(bA === 'すでに許している' || bA === 'すでに禁じている' ? bB : bA)}</p>` : ''}
      <h3 style="margin-top:12px">宣教師</h3>${mis.length ? `<div class="tbl-wrap"><table><thead><tr><th>宣教師</th><th>身を寄せる家</th><th>人物</th></tr></thead><tbody>
      ${mis.map((id) => { const d = misDef(id)!, m = st.missions![id]; return `<tr><td class="gname">${face(id, 32, 'face face-sm')}${esc(d[1])}</td><td>${m.home ? esc(clanName(st, m.home)) + '家' : '—'}</td><td class="hint" style="margin:0">${esc(d[6])}</td></tr>`; }).join('')}
      </tbody></table></div>` : '<p class="lede">日本にいる宣教師はいない。</p>'}
      <h3 style="margin-top:12px">諸家</h3><p class="lede">許す: ${al.filter((C) => C.mission === 'allow').map((C) => esc(C.name)).join('・') || 'なし'}<br>禁教: ${al.filter((C) => C.mission === 'ban').map((C) => esc(C.name)).join('・') || 'なし'}</p>
      ${hints([
        `布教を許すと、領内の城に信者が増え（上限${R.KIRI_MAX}%）、信者1%ごとに商業+${R.KIRI_COM * 100}%。宣教師が身を寄せる家、洗礼を受けた城主の城、南蛮港では早く増える。南蛮船も${R.SHIP_W_ALLOW}倍来やすい。`,
        `その代わり寺社が反発し、信者の多い城ほど治安が毎月下がる（信者${Math.round(1 / R.KIRI_CHIAN)}%で−1）。本願寺は許した家の城に一向一揆を起こしやすい。`,
        `禁じると信者は毎月${R.KIRI_DECAY}%ずつ減るが、信者が残る城は治安${R.BAN_CHIAN}。洗礼を受けた家臣（当主・一門を除く）は毎月${R.BAN_LEAVE * 100}%で出奔する。南蛮船はほとんど来なくなる。`,
        `許す・禁じるは何度でも改められるが、改めてから${R.MISSION_COOLDOWN}か月は変えられない。宣教師が訪ねてきたときに許すと、その宣教師が当家に身を寄せる。`,
      ])}`;
  },
  // ── 人事: 軍団・城主 ──
  katoku: (st) => {
    const C = st.clans[st.player], L = C.leader ? st.generals[C.leader] : null;
    return `<dl class="kv"><dt>当主</dt><dd>${L ? `${nameLink(L)}（${ageOf(st, L) ?? '?'}歳）${L.sick ? ' <span class="pill bad">病</span>' : ''}` : '—'}</dd><dt>跡継ぎ</dt><dd>${heirOf(st, C) ? esc(heirOf(st, C)!.name) + '（指名）' : '定めていない'}</dd><dt>後見役</dt><dd>${regentOf(st, C) ? esc(regentOf(st, C)!.name) : '定めていない'}</dd><dt>遺言</dt><dd>${C.will ? R.WILL_NAME[C.will] : '残していない'}</dd></dl>
      <h3 style="margin-top:10px">定める</h3>${willForm(st)}
      ${hints([
        `跡継ぎを指名しておけば、家督を継いだときの威信と治安の下がりが半分になる（指名がなければ一門の子の世代の年長者、一門、元服前の子、家臣の順）。`,
        `遺言は指名した跡継ぎが継いだときに効く。家臣を大事にせよ: 家臣全員の恩+${R.WILL.retainers}。領国を固めよ: 全城の治安+${R.WILL.land}。天下を目指せ: 威信+${R.WILL.tenka}。`,
        `お家騒動: 跡継ぎが幼い（18歳未満）か頼りない（魅力＋統率110未満）とき、それより${R.ODOSO_GAP}以上人望のある一門がいて恩が薄いと、その一門が城と部隊を率いて家を割ることがある。後見役の魅力が高いほど、跡継ぎを指名してあるほど起きにくい。AIの家でも起きる。`,
      ])}`;
  },
  rewards: (st) => {
    const allv = vassalsOf(st, st.player).filter((g) => !g.liege).sort((a, b) => dueOf(b) - dueOf(a) || onOf(a) - onOf(b));
    const waiting = allv.filter((g) => dueOf(g) >= R.ON_DUE_FREE || !promoteBlockOf(st, g) || onOf(g) < 30);
    const vs = rwAll ? allv : waiting;
    const gw = goodwill(st, st.player);
    return `${dNote(st, 'staff')}<dl class="kv"><dt>御恩の評判</dt><dd>${Math.round(gw)}（家臣の恩の平均。仕官の願い出・捕虜の登用に効く）</dd><dt>金</dt><dd>${fmt(st.clans[st.player].gold)}貫</dd><dt>不満の者</dt><dd>${allv.filter((g) => onOf(g) < 30).length}人</dd></dl>
      <div class="subtabs" style="margin-top:8px"><button aria-selected="${!rwAll}" data-act="rw-all" data-id="0">報いるべき者（${waiting.length}人）</button><button aria-selected="${rwAll}" data-act="rw-all" data-id="1">直参の全員（${allv.length}人）</button></div>
      ${rewardBulk(st, waiting)}
      ${vs.length ? `<div class="tbl-wrap" style="margin-top:8px"><table>${rewardHead()}<tbody>${vs.slice(0, rwPage * RW_PAGE).map((g) => rewardRow(st, g)).join('')}</tbody></table></div>${vs.length > rwPage * RW_PAGE ? `<div class="actions"><button class="act" data-act="rw-more">さらに${Math.min(RW_PAGE, vs.length - rwPage * RW_PAGE)}人を見る（残り${vs.length - rwPage * RW_PAGE}人）</button></div>` : ''}` : '<p class="hint">いま報いるべき者はいない（未払いの功が溜まった者・取り立てられる者・恩の低い者を出す）。</p>'}
      ${hints([
        `恩（0〜100）: 合戦・調略・方面の働きで功績が増えると「未払いの功」になる（陪臣の恩賞は主が払う）。${R.ON_DUE_FREE}を超えたまま報いずにいると、毎月恩が下がる（多いほど速い）。報われていれば少しずつ${R.ON_TARGET}（一門は+10）へ戻る。城主は知行の手応えで毎月少し上がる。城主・奉行の日々の務めは未払いにならない。`,
        `報い方: 城を与える（「知行」で。いちばん重い恩賞）、感状（金はかからず未払い${R.ON_KANJO_PAY}まで・恩+${R.ON_KANJO}、${R.ON_KANJO_MONTHS}か月に一度）、加増（未払い1につき${R.ON_GOLD}貫・未払いをすべて消して恩+2〜12）、取り立て（功績が満ちた者・恩+${R.ON_PROMOTE}、未払い${R.ON_PROMOTE_PAY}まで）、下賜（初めての名物・恩+格×${R.ON_ITEM}）。`,
        `本領: 武将の縁のある城。敵に取られている間は毎月恩−${R.ON_HOME_LOST}、取り戻せば+${R.ON_HOME_BACK}。`,
        `恩が低いと: ${R.ON_LEAVE}未満で出奔することがある。${R.ON_BETRAY}未満の城主は、近くに敵の城があれば城ごと寝返ることがある。${R.ON_REBEL}未満の城持ちは、領の城と部隊と陪臣を率いて謀反を起こすことがある。他家の調略にも乗りやすい（城主の恩0で+20%）。高いと部隊の初めの士気が上がる。`,
        '新参（登用・仕官・降った家の者）は恩45から始まる。「内政」の委任で人事を任せると、恩賞と取り立ても自動で行う。',
      ])}`;
  },
  // 特性: 忍び頭（暗殺・流言・放火・探り）・茶会・普請、特性のある家臣の一覧
  tokusei: (st) => {
    const me = st.clans[st.player];
    const own = Object.values(st.generals).filter((g) => g.clan === st.player && traitOf(g) && g.status !== 'dead' && g.status !== 'captive');
    const head = ninjaHead(st, st.player);
    const ninjas = own.filter((g) => traitOf(g) === 'ninja' && g.status === 'free' && !g.liege);
    const tg = ninjaTargetOf(st);
    const why = ninjaBlock(st, st.player, ninjaSel.act, tg);
    const reach = ninjaReach(st, st.player);
    const castleOpts = st.castles.filter((c) => c.owner && hostile(st, st.player, c.owner) && reach[c.hex] <= NINJA_RANGE).sort((a, b) => reach[a.hex] - reach[b.hex]).slice(0, 40);
    const genOpts = Object.values(st.generals).filter((g) => g.clan && hostile(st, st.player, g.clan) && (g.status === 'army' || g.status === 'governor' || g.status === 'free') && (genHex(st, g) ?? -1) >= 0 && reach[genHex(st, g)!] <= NINJA_RANGE).sort((a, b) => a.rank - b.rank || b.lea - a.lea).slice(0, 60);
    const isGen = ninjaSel.act === 'assassinate' || ninjaSel.act === 'spy';
    const chajins = own.filter((g) => traitOf(g) === 'chajin' && g.status !== 'young');
    if (!teaHost || !chajins.some((g) => g.id === teaHost)) teaHost = chajins[0]?.id ?? '';
    const tw = teaBlock(st, st.generals[teaHost]);
    const fushinCs = clanCastles(st, st.player).filter((c) => govTrait(st, c) === 'chikujo');
    const roleOf2 = (g: General) => (g.id === me.ninja && head ? '忍び頭' : g.status === 'governor' ? `城主（${esc(st.castles[g.loc].name)}）` : g.status === 'army' ? `${esc(st.generals[st.armies[g.army!]?.main ?? g.id]?.name ?? '')}隊` : g.status === 'free' ? '待機' : g.status === 'bugyo' ? '奉行' : g.status === 'tsukai' ? esc(tsukaiLabel(st.player)) : g.status === 'young' ? '元服前' : g.status === 'ronin' ? '在野' : g.status);
    return `<h3 class="sect-h" style="margin-top:0">忍び頭</h3>
    <div class="picker" style="margin:0 0 8px"><label for="sel-ninja-head">待機の「忍び」から一人。部隊や役に就けると外れる</label>
      <select id="sel-ninja-head"><option value="">（置かない）</option>${ninjas.map((g) => `<option value="${g.id}" ${head?.id === g.id ? 'selected' : ''}>${esc(g.name)}　知${g.int}・武${g.bra}</option>`).join('')}</select></div>
    ${head ? `<div class="actions" style="flex-wrap:wrap;gap:6px"><select id="sel-ninja-act" aria-label="忍びの働き">${(Object.keys(NINJA_NAME) as NinjaAct[]).map((k) => `<option value="${k}" ${ninjaSel.act === k ? 'selected' : ''}>${NINJA_NAME[k]}（金${fmt(NINJA_COST[k])}貫）</option>`).join('')}</select>
      <select id="sel-ninja-target" aria-label="狙う相手"><option value="">${isGen ? '狙う武将を選ぶ' : '狙う城を選ぶ'}</option>${isGen ? genOpts.map((g) => `<option value="g:${g.id}" ${ninjaSel.target === `g:${g.id}` ? 'selected' : ''}>${esc(clanName(st, g.clan))}・${esc(g.name)}${st.clans[g.clan!]?.leader === g.id ? '（当主）' : ''}</option>`).join('') : castleOpts.map((c) => `<option value="c:${c.i}" ${ninjaSel.target === `c:${c.i}` ? 'selected' : ''}>${esc(clanName(st, c.owner))}・${esc(c.name)}</option>`).join('')}</select>
      <button class="act primary" data-act="ninja-do" ${why ? `disabled title="${esc(why)}"` : ''}>${NINJA_NAME[ninjaSel.act]}を命じる${why ? '' : `（見込み ${Math.round(ninjaChance(st, st.player, ninjaSel.act, tg) * 100)}%）`}</button></div>
      ${why && ninjaSel.target ? `<p class="hint" style="margin:2px 0">${esc(why)}</p>` : ''}` : `<p class="hint">${ninjas.length ? '忍び頭を置けば、月に一度、忍びを使える。' : '待機の「忍び」の家臣がいない（在野の忍びを登用できる）。'}</p>`}
    <h3 class="sect-h">茶会</h3>
    ${chajins.length ? `<div class="actions" style="gap:6px"><select id="sel-tea-host" aria-label="亭主">${chajins.map((g) => `<option value="${g.id}" ${teaHost === g.id ? 'selected' : ''}>${esc(g.name)}</option>`).join('')}</select><button class="act" data-act="tea-do" ${tw ? `disabled title="${esc(tw)}"` : ''}>茶会を開く（金${TEA_COST}貫・恩の低い${TEA_GUESTS}人の恩+${TEA_ON + teaGrade(st, st.generals[teaHost])}）</button></div><p class="hint" style="margin-top:2px">${teaGrade(st, st.generals[teaHost]) ? `亭主の名物「${esc(st.items[st.generals[teaHost].tea!].name)}」で客の皆に+${teaGrade(st, st.generals[teaHost])}。` : '亭主が名物の茶器を持てば、客の皆にその格の分だけ恩が上乗せされる。'}客が自分の茶器を持っていれば、その客はさらに格の分上がる（下賜で持たせる）。</p>` : '<p class="hint">「茶人」の家臣がいない。</p>'}
    <h3 class="sect-h">普請</h3>
    ${fushinCs.length ? `<div class="actions" style="flex-wrap:wrap;gap:6px">${fushinCs.map((c) => { const w = fushinBlock(st, c); return `<button class="act" data-act="fushin" data-id="${c.i}" ${w ? `disabled title="${esc(w)}"` : ''}>${esc(c.name)}（${esc(R.CASTLE_KIND[c.kind ?? 'hira'].name)}）を改める・金${fmt(FUSHIN_COST)}貫</button>`; }).join('')}</div>` : '<p class="hint">「築城」の家臣を城主に置けば、城の造りを一段改められる（砦・館→平城→平山城）。</p>'}
    <h3 class="sect-h">特性のある家臣（${own.length}人）</h3>
    <div class="tbl-wrap"><table><thead><tr><th>武将</th><th>特性</th><th>いま</th><th>働き</th></tr></thead><tbody>
    ${own.sort((a, b) => traitOf(a)!.localeCompare(traitOf(b)!)).map((g) => `<tr><td>${nameLink(g)}</td><td><span class="pill trait">${esc(traitName(g))}</span></td><td>${roleOf2(g)}</td><td class="hint" style="margin:0">${esc(TRAIT_NOTE[traitOf(g)!])}</td></tr>`).join('')}
    </tbody></table></div>
    ${hints([
      '特性は一人に一つまで。効き目は特性で決まり、能力は少し効くだけ。',
      `忍び: 暗殺は当主なら3〜10%、ほかの武将は5〜45%（宿老は難しい）。流言は城の治安−15と城主の恩−10、放火は城の蔵の兵糧−35%と城門−30%、探りは武将の力量と軍勢の中身を明かす。相手に忍び頭がいれば防がれやすい。しくじると相手の家に恨まれ、捕らわれることもある（暗殺は4割）。自城・自軍から${NINJA_RANGE}マス以内だけ。`,
      '剣豪・砲術・軍師は軍団の傘下に置けば働く。築城・僧は城主に置けば働く。算勘は奉行（兵站奉行）に就ければ働く。外交は家にいれば（待機・奉行・城主）外交と和議に効く。水軍は唐入りで水軍の将に。',
    ])}`;
  },
  // 唐入り: 渡海の路・船・水軍の将・李舜臣
  karairi: (st) => {
    if (!karairiOn(st)) return '<p class="hint">天下を統一し、唐入りを決めると開く。</p>';
    const k = st.karairi;
    const open = crossingOpen(st);
    const left = troopsLeft(st), cap = troopCap(st);
    const tsu = st.castles.find((c) => c.id === 'kaneishi'), bus = st.castles.find((c) => c.id === 'busan');
    const abroad = Object.values(st.armies).filter((a) => a.clan === st.player && isForeignHex(a.hex));
    const atTsu = Object.values(st.armies).filter((a) => a.clan === st.player && crossingEnds().includes(a.hex) && !isForeignHex(a.hex));
    const cands = Object.values(st.generals).filter((g) => g.clan === st.player && g.status === 'free' && g.id !== st.clans[st.player].leader && !g.liege).sort((a, b) => Number(ADMIRALS.has(b.id)) - Number(ADMIRALS.has(a.id)) || (b.lea + b.int) - (a.lea + a.int));
    const sel = (n: number) => { const cur = k.escort[n] ?? ''; return `<select data-escort="${n}" aria-label="水軍の将${n + 1}"><option value="">（なし）</option>${cands.map((g) => `<option value="${g.id}" ${g.id === cur ? 'selected' : ''}>${esc(g.name)}${ADMIRALS.has(g.id) ? '（水軍）' : ''}　統${g.lea}・知${g.int}</option>`).join('')}</select>`; };
    const yi = k.yi >= 0.8 ? '盛ん' : k.yi >= 0.5 ? 'やや衰え' : '衰えている';
    return `<dl class="kv">
      <dt>渡海の路</dt><dd>${open ? `対馬（${esc(tsu?.name ?? '')}）〜釜山（${esc(bus?.name ?? '')}）　<span class="pill good">開いている</span>` : `<span class="pill warn">${k.openTurn - st.turn}か月後に開く</span>（朝鮮の返事を待っている）`}</dd>
      <dt>船</dt><dd>${fmt(k.fleet)}艘　→ 月に兵${fmt(cap)}人・兵糧${fmt(foodCap(st))}石まで海を渡せる</dd>
      <dt>今月の渡海</dt><dd>あと兵${fmt(Math.max(0, left))}人</dd>
      <dt>海の向こう</dt><dd>${abroad.length ? `${abroad.length}隊・兵${fmt(abroad.reduce((t, a) => t + a.troops, 0))}（毎月 兵糧およそ${fmt(Math.round(abroad.reduce((t, a) => t + a.troops, 0) * R.FOOD_PER_SOLDIER * (1 + R.SEA_LOSS)))}石を船で送る）` : 'まだ誰も渡っていない'}</dd>
      <dt>対馬に集結</dt><dd>${atTsu.length ? atTsu.map((a) => `${esc(st.generals[a.main].name)}隊 ${fmt(a.troops)}`).join('、') : '—'}</dd>
      <dt>朝鮮の水軍</dt><dd>李舜臣の勢い: ${yi}　これまでの襲撃 ${k.raids}度${k.raid && k.raid.turn === st.turn - 1 ? `　<span class="pill ${k.raid.repelled ? 'good' : 'warn'}">先月の海戦: ${k.raid.choice === 'fight' ? (k.raid.repelled ? '打って出て退けた' : `打って出て敗れた（船${k.raid.lostShips ?? 0}艘）`) : k.raid.choice === 'port' ? '湊に籠もった' : '荷を守って抜けた'}${k.raid.sunk ? `・兵糧${fmt(k.raid.sunk)}石` : ''}${k.raid.troops ? `・兵${fmt(k.raid.troops)}` : ''}を失う</span>` : ''}</dd>
      <dt>護り</dt><dd>現れる見込み −${Math.round(escortCut(st) * 60)}%　海戦で打って出て勝つ見込み ${k.escort.length ? `${Math.round(navalWinP(st) * 100)}%` : '—（水軍の将がいない）'}</dd>
      <dt>朝鮮の王</dt><dd>${(() => { const g = st.generals.seonjo; return g && g.status !== 'dead' ? `宣祖は${esc(st.castles[g.loc].name)}にいる` : '—'; })()}</dd>
      <dt>朝鮮の軍勢</dt><dd>${(() => { const J = Object.values(st.armies).filter((a) => a.clan === 'joseon'); const gh = J.filter((a) => a.main.startsWith('gihei_') || ['gwak_jaeu', 'kim_cheonil', 'go_gyeongmyeong', 'hyujeong', 'yujeong'].includes(a.main)); return `${J.length}隊・兵${fmt(J.reduce((t, a) => t + a.troops, 0))}（うち義兵${gh.length}隊）`; })()}</dd>
      <dt>明</dt><dd>${st.clans.ming?.alive ? `援軍${Object.values(st.armies).filter((a) => a.clan === 'ming').length}隊・兵${fmt(Object.values(st.armies).filter((a) => a.clan === 'ming').reduce((t, a) => t + a.troops, 0))}` : '鴨緑江の向こうで様子を見ている（平壌が落ちるか、義州に迫るか、時が経てば動く）'}</dd>
      <dt>取った城</dt><dd>${st.castles.filter((c) => isForeignHex(c.hex) && c.owner === st.player).length} / ${st.castles.filter((c) => isForeignHex(c.hex)).length}</dd>
      <dt>厭戦</dt><dd><div class="meter" style="max-width:240px"><i style="width:${Math.round(k.weary ?? 0)}%;background:${(k.weary ?? 0) >= 70 ? 'var(--bad)' : (k.weary ?? 0) >= 40 ? 'var(--warn)' : 'var(--good)'}"></i></div>${Math.round(k.weary ?? 0)} / 100${(k.weary ?? 0) > W.UNREST ? '　<span class="pill warn">国内の治安と家臣の恩が月ごとに下がっている</span>' : ''}</dd>
      <dt>海の向こうの損害</dt><dd>当家 ${fmt(k.lost ?? 0)}・朝鮮 ${fmt(k.joseonLost ?? 0)}・明 ${fmt(k.mingLost ?? 0)}</dd>
    </dl>
    <h3 class="sect-h">戦の終わらせ方</h3>
    <div class="actions">${(() => { const why = peaceBlock(st); return `<button class="act" data-act="kr-peace" ${why ? `disabled title="${esc(why)}"` : ''}>和議を探る（沈惟敬の仲立ち・成る見込み ${why ? '—' : `${Math.round(peaceChance(st) * 100)}%`}）</button>`; })()}<button class="act" data-act="kr-withdraw">撤兵する</button></div>
    <p class="hint" style="margin-top:2px">和議が成れば、今の占領地を保ったまま戦を終える（取った城が多く、明の損害が大きいほど成りやすい。厭戦が高いと足元を見られる）。流れれば厭戦が上がり、3か月は探れない。撤兵すれば、取った城を捨てて兵を引く。九連城（明）を落とせば、大明へ攻め入る道が開く。</p>
    <div class="actions"><button class="act" data-act="kr-build" ${st.clans[st.player].gold < K.BUILD_COST ? 'disabled title="金が足りない"' : ''}>造船（金${fmt(K.BUILD_COST)}貫で${K.BUILD_SHIPS}艘）</button></div>
    <h3 class="sect-h">水軍の将（渡海の路を守る・3人まで）</h3>
    <div class="actions" style="flex-wrap:wrap;gap:6px">${sel(0)}${sel(1)}${sel(2)}</div>
    ${hints([
      '軍勢を対馬の金石城（渡海の路の端）へ集め、そこから釜山鎮を攻める。釜山を落とせば、そこから朝鮮の地へ進める。',
      `海を渡れる兵は月に船1艘あたり${K.SHIP_TROOPS}人、兵糧は${K.SHIP_FOOD}石。海の向こうの軍勢は、日の本の蔵から船で兵糧を受け取る（1割減る）。船が足りない月は、取った城の蔵と小荷駄で食いつなぐ。`,
      '李舜臣の水軍は、どこからともなく島陰から現れて渡海の船を襲う。海を一度押さえても安心はできない。現れると海戦になり、「打って出る」「荷を守って抜ける」「湊に籠もる」を選ぶ。打って出て勝てば李舜臣の勢いが大きく衰える（月ごとに戻る）。負ければ船と荷を多く失う。',
      '水軍の将（統率と知略。九鬼嘉隆・脇坂安治・藤堂高虎・加藤嘉明・村上武吉・村上元吉・来島通康・乃美宗勝・安宅冬康・小早川隆景は腕が上がる）を置けば、現れにくく、抜けるときの損も減り、打って出られる。',
      '水軍の将は「待機」の家臣から選ぶ。部隊に加えたり役に就けたりすると外れる。',
      '朝鮮の王は、日本の軍勢が都に迫ると北へ退く（漢城→開城→平壌→安州→義州）。',
      '取った朝鮮の城の辺りには、義兵（儒者・僧・農民）が起つ。残り火が強いほど起ちやすい。軍勢から離れた所に現れて道を断つので、補給の網が切れやすい。人の売り買いを禁じていれば、少し起ちにくい。',
      '明は、平壌が落ちるか、日本の軍勢が義州に迫るか、渡海から8か月が経つと援軍を出す（先手は祖承訓、その4か月後に李如松の本隊と大砲）。',
      '冬（11〜2月）、黄海・平安・咸鏡・江原の道にいる軍勢は凍えて兵と士気を失う。',
    ])}`;
  },
  fronts: (st) => {
    const fs = frontsOf(st).filter((f) => !f.vacant);
    const castles = clanCastles(st, st.player);
    const direct = castles.filter((c) => { const f = frontOfCastle(st, c); return !f || f.vacant; });
    const kokuAll = castles.reduce((t, c) => t + castleKoku(c), 0), kokuDirect = direct.reduce((t, c) => t + castleKoku(c), 0);
    const cands = leaderCands(st);
    const card = (f: (typeof fs)[number]) => {
      const g = st.generals[f.leader];
      const pf = policyOf(st, f), boss = frontById(st, f.boss);
      const tc = targetCands(st, f);
      const tsel = !boss && f.policy === 'attack' ? `<select data-ftgt="${f.id}" aria-label="攻略目標"><option value="">目標は領主に任せる</option>
        ${tc.clans.map((id) => `<option value="clan:${id}" ${f.target === `clan:${id}` ? 'selected' : ''}>${esc(clanName(st, id))}家</option>`).join('')}
        ${tc.castles.map((c) => `<option value="castle:${c.i}" ${f.target === `castle:${c.i}` ? 'selected' : ''}>${esc(c.name)}（${esc(clanName(st, c.owner))}${c.owner ? '家' : ''}）</option>`).join('')}
        ${f.target && !tc.clans.some((id) => f.target === `clan:${id}`) && !tc.castles.some((c) => f.target === `castle:${c.i}`) ? `<option value="${f.target}" selected>${esc(targetLabel(st, f))}</option>` : ''}</select>` : '';
      const bsel = boss ? `<span class="hint" style="margin:0">${esc(frontName(st, boss))}の与力</span> <button class="mini" data-act="yoriki-off" data-id="${f.id}">与力を外す</button>` : '';
      const fa = frontArmies(st, f), fc = f.castles.map((i) => st.castles[i]);
      const bs = baishinOf(st, f);
      const addable = Object.values(st.generals).filter((x) => isFree(st, x) && !baishinBlock(st, x, f) && !fiefOf(st, x)).sort((x, y) => x.rank - y.rank || y.lea - x.lea);
      const room = fiefCap(g) - f.castles.length;
      const more = room > 0 ? castles.filter((c) => !grantBlock(st, g, c)) : [];
      const yoriko = fs.filter((x) => x.boss === f.id);
      return `<div class="front-card"><div class="ph">${face(g.id, 48, 'face')}<div><h3 style="margin:0">${esc(frontName(st, f))}</h3><div class="sub">領主 ${nameLink(g)}　${rankName(st, g)}${g.tozama ? `・外様（旧${esc(clanName(st, g.tozama))}家）` : ''}　恩${Math.round(onOf(g))}（${onLabel(onOf(g))}）・統率${g.lea}・魅力${g.cha}</div></div></div>
        <div class="actions" style="margin:6px 0">${boss ? `<span class="hint" style="margin:0">方針は寄親に従う（${R.FRONT_POLICY_NAME[pf.policy]}）</span>` : `<select data-fpol="${f.id}" aria-label="方針">${(['attack', 'defend', 'build'] as const).map((p) => `<option value="${p}" ${f.policy === p ? 'selected' : ''}>${R.FRONT_POLICY_NAME[p]}</option>`).join('')}</select>${tsel}`}${bsel}</div>
        <dl class="kv"><dt>知行</dt><dd>${fiefKoku(st, f).toFixed(1)}万石・${f.castles.length}城${fiefCap(g) === Infinity ? '' : ` / ${fiefCap(g)}城まで`}</dd>
          <dt>城</dt><dd>${fc.map((c) => `${esc(c.name)}${c.i === f.seat ? '（居城）' : ''} <button class="mini" data-act="fief-remove" data-id="${c.i}" title="召し上げると恩が${Math.round(R.fiefOn(castleKoku(c)))}下がる">召し上げ</button>`).join('　')}</dd>
          ${more.length ? `<dt>加増</dt><dd><select data-fgrant="${g.id}" aria-label="加増する城"><option value="">城を足す…</option>${castleOpts(more, (c) => { const o = frontOfCastle(st, c); return `<option value="${c.i}">${esc(c.name)}（${castleKoku(c).toFixed(1)}万石${o ? `・今は${esc(frontName(st, o))}` : ''}）</option>`; })}</select></dd>` : ''}
          <dt>領の蔵</dt><dd>金${fmt(f.gold ?? 0)}貫・兵糧${fmt(f.food ?? 0)}石</dd>
          <dt>陪臣</dt><dd>${bs.length ? bs.map((x) => `${nameLink(x)}（${esc(R.RANK_NAME[x.rank])}・恩${Math.round(onOf(x))}） <button class="mini" data-act="fief-direct" data-id="${x.id}" title="主の恩が${Math.round((R.FIEF_PULL_ON[x.rank] ?? 3) * (g.tozama ? R.TOZAMA_PULL : 1))}下がる">${g.tozama ? '引き抜く' : '直参に'}</button>`).join('　') : 'なし'}
            ${addable.length ? `<div style="margin-top:4px"><select data-fbai="${f.id}" aria-label="陪臣に付ける"><option value="">直参を陪臣に付ける…</option>${genOpts(addable, (x) => `<option value="${x.id}">${esc(x.name)}（統${x.lea}・${esc(st.castles[x.loc].name)}）</option>`)}</select></div>` : ''}</dd>
          <dt>部隊</dt><dd>${fa.length ? fa.map((a) => `${esc(st.generals[a.main].name)}隊 ${fmt(a.troops)}`).join('・') : 'なし'}（計${fmt(fa.reduce((x, a) => x + a.troops, 0))}人）</dd>
          ${!boss ? `<dt>与力</dt><dd>${yoriko.length ? yoriko.map((x) => esc(frontName(st, x))).join('・') : 'なし'}${fs.length > 1 ? ` <button class="mini" data-act="yoriki-open" data-id="${f.id}" aria-expanded="${yorikiFor === f.id}">${yorikiFor === f.id ? '閉じる' : '与力を付ける・外す'}</button>` : ''}</dd>` : ''}
          <dt>領主の力</dt><dd>補充 月+${Math.round(g.lea * R.FRONT_REINF)}人/部隊・領の城の治安 月+${R.frontChian(g.cha).toFixed(1)}</dd></dl>
        ${!boss && yorikiFor === f.id ? `<h4 style="margin:10px 0 0">${esc(g.name)}の与力にする城持ち（チェックした者が与力。近い順）</h4>${yorikiList(st, f)}` : ''}
        <div class="actions"><button class="mini" data-act="front-off" data-id="${f.id}">領をすべて召し上げる</button></div></div>`;
    };
    return `${heirBlock(st)}<p class="lede">城持ち ${fs.length}人。知行 ${(kokuAll - kokuDirect).toFixed(1)}万石・直轄（蔵入地）${kokuDirect.toFixed(1)}万石（${direct.length}城）。領の年貢・商いは8割が領に入り、${Math.round(R.FIEF_TRIBUTE * 100)}%が上納される。領の部隊は自分では動かせず、評定終了のときに領主が方針に従って動かす。</p>
      <p class="hint" style="margin:0 0 4px">地図で当家の城を押し、城の札の「知行」からその城を与えることもできる。</p>
      ${cands.length ? `<div class="actions"><select id="sel-fief-gen" aria-label="城を与える武将">${genOpts(cands, (g) => `<option value="${g.id}">${esc(g.name)}（未払い${dueOf(g)}・恩${Math.round(onOf(g))}${fiefOf(st, g) ? `・${fiefOf(st, g)!.castles.length}城` : ''}）</option>`)}</select><select id="sel-fief-castle" aria-label="与える城">${castleOpts(castles, (c) => { const o = frontOfCastle(st, c); return `<option value="${c.i}">${esc(c.name)}（${castleKoku(c).toFixed(1)}万石${o && !o.vacant ? `・${esc(frontName(st, o))}` : ''}）</option>`; })}</select><button class="act primary" data-act="fief-grant">城を与える</button></div>` : '<p class="hint">城を与えられる者がいない（足軽大将以上の直参）。</p>'}
      ${fs.map(card).join('')}
      ${hints([
        `城を与えると、その石高1万石ごとに未払いの功${R.FIEF_PAY}を報い、恩が上がる（8〜25）。召し上げると同じだけ下がる。持てる城は宿老なら上限なし、侍大将${R.FIEF_CAP[1]}城、足軽大将${R.FIEF_CAP[2]}城、足軽組頭は持てない。飛び地でもよい。`,
        '領の蔵: 年貢・商いの8割が入り、領の部隊の兵糧と足軽の給金、陪臣の恩賞をここから払う。余った金は領の城の開発に回る。直轄の城の年貢・商いはすべて当家に入る。',
        `降った家: 降伏勧告に応じた家の当主は本領をそのまま安堵されて城持ち（外様）になり、家臣はその陪臣になる。蔵の兵糧と金はその領の蔵に、鉄砲は当家の蔵に入る。外様の家臣を引き抜く（直参に引き上げる）と、主の恩は${R.TOZAMA_PULL}倍下がる。外様は宿老の枠を使わない。`,
        '陪臣: 城持ちの家来。恩賞と取り立ては主が行い、当家は直接は使えない。主が謀反すれば主に従う。直参に引き上げると当家で使えるが、主の恩が下がる（重臣ほど大きく）。',
        '方針 — 攻略: 目標の家か城へ攻め込む。防衛: 領の城を守り、迫った敵だけを叩く。軍備増強: 城にとどまって兵を補充し、足軽を雇い、練度を上げる。与力にすると寄親の方針と目標に従う。',
        '領の部隊が落とした城は、身分の枠に空きがあればその領に入る（なければ直轄）。領主が亡くなったり家を去ったりしたら、後継ぎを選ぶ（それまでは直轄として扱う）。',
      ])}`;
  },
  corps: (st) => {
    const asAll = clanArmies(st, st.player).filter((a) => !a.ikki && !delegatedArmy(st, a)).sort((a, b) => b.troops - a.troops);
    const nDeleg = clanArmies(st, st.player).filter((a) => !a.ikki && delegatedArmy(st, a)).length;
    const free = Object.values(st.generals).filter((g) => isFree(st, g));
    const near = (a: Army) => castleAt(st, a.hex)?.owner === st.player || NEIGHBORS[a.hex].some((j) => castleAt(st, j)?.owner === st.player);
    // 隊の空き（主将から下へ、身分の枠ごと）
    const slotsOf = (a: Army): number => { const walk = (gid: string): number => { const lv = levelOf(st, st.generals[gid]), kids = childrenOf(st, a, gid); return (lv < 3 ? R.CORPS_CHILDREN - kids.length : 0) + kids.reduce((t, k) => t + walk(k.id), 0); }; return walk(a.main); };
    const withRoom = asAll.filter((a) => near(a) && slotsOf(a) > 0 && !fillBlock(st, a)); // 待機の武将で埋められる空きがある隊
    const as = corpsAll ? asAll : withRoom;
    const fillable = withRoom.filter((a) => !fillBlock(st, a));
    const line = (a: Army) => {
      const open = corpsOpen.has(a.id), editable = near(a), sl = slotsOf(a), why = editable ? fillBlock(st, a) : '出陣中';
      return `<div class="corps-card"><div class="corps-head"><button class="mini" data-act="goto-army" data-id="${a.id}">${esc(st.generals[a.main].name)}隊</button>　兵${fmt(a.troops)} / ${fmt(maxTroops(st, a))}・傘下${staffOf(a).length}人${sl && editable ? `・<b>空き${sl}</b>` : ''}${editable ? '' : '<span class="hint" style="margin:0">（出陣中）</span>'}
        ${editable && sl ? ` <button class="mini" data-act="corps-fill" data-id="${a.id}" ${why ? `disabled title="${esc(why)}"` : ''}>空きを埋める</button>` : ''} <button class="mini" data-act="corps-open" data-id="${a.id}" aria-expanded="${open}">${open ? '閉じる' : '顔ぶれ・入れ替え'}</button></div>${open ? card(a) : ''}</div>`;
    };
    const card = (a: Army) => {
      const editable = near(a);
      const node = (g: General, depth: number): string => {
        const lv = levelOf(st, g), kids = childrenOf(st, a, g.id);
        const slots = lv < 3 ? R.CORPS_CHILDREN - kids.length : 0;
        const cands = free.filter((x) => !attachBlock(st, a, g.id, x)).sort((x, y) => y.lea + y.bra - (x.lea + x.bra));
        const slotRow = slots > 0 && editable ? `<div class="corps-row" style="--d:${depth + 1}"><span class="hint" style="margin:0">空き ${slots}（${R.RANK_NAME[lv + 1]}）</span>
          ${cands.length ? `<select data-corps="${a.id}:${g.id}" aria-label="${esc(g.name)}の下に置く武将"><option value="">配属する武将を選ぶ</option>${cands.map((x) => `<option value="${x.id}">${esc(x.name)}　統${x.lea} 武${x.bra}（${esc(st.castles[x.loc].name)}）</option>`).join('')}</select>` : '<span class="hint" style="margin:0">待機中の該当者なし</span>'}</div>` : '';
        const row = `<div class="corps-row" style="--d:${depth}">${depth ? '└ ' : ''}${face(g.id, 32, 'face face-sm')}${nameLink(g)}<span class="pill">${depth === 0 ? '主将' : rankName(st, g)}</span><span class="hint corps-stat" style="margin:0">統${g.lea} 武${g.bra} 知${g.int}</span>${depth > 0 && editable ? ` <button class="mini" data-act="corps-out" data-id="${g.id}">外す</button>` : ''}</div>`;
        return row + kids.map((k) => node(k, depth + 1)).join('') + slotRow;
      };
      return `<div style="margin-top:6px">${node(st.generals[a.main], 0)}</div>`;
    };
    return `${dNote(st, 'staff')}<p class="lede">待機中の武将 ${free.length}人。主将の下に、ひとつ下の身分の武将を${R.CORPS_CHILDREN}人まで置ける（その下にも${R.CORPS_CHILDREN}人まで）。${nDeleg ? `領・委任の部隊（${nDeleg}隊）はここに出ない（領主・AIが編成する）。` : ''}</p>
      <div class="subtabs"><button aria-selected="${!corpsAll}" data-act="corps-all" data-id="0">埋められる空きのある隊（${withRoom.length}）</button><button aria-selected="${corpsAll}" data-act="corps-all" data-id="1">すべての隊（${asAll.length}）</button></div>
      ${fillable.length && free.length ? `<div class="actions" style="margin:4px 0 8px"><button class="act primary" data-act="corps-fill-all">すべての隊の空きをおまかせで埋める（${fillable.length}隊・待機${free.length}人から）</button></div>` : ''}
      ${as.length ? as.map(line).join('') : `<p class="lede">${asAll.length ? '待機の武将で埋められる空きはない（「すべての隊」で顔ぶれを入れ替えられる）。' : '軍団はない。城の画面で編成する。'}</p>`}
      ${hints([
        '当主・宿老の下に侍大将、侍大将の下に足軽大将、足軽大将の下に足軽組頭を、それぞれ2人まで置ける。一門は侍大将以上として扱う。自城か隣にいる軍団だけ編成を変えられる。',
        `兵数の上限＝主将の上限×${R.CORPS_MAIN_TROOP}＋傘下の武将それぞれの上限×${R.CORPS_SUB_TROOP}（武将の上限＝（3000＋統率×100）×身分の倍率）。`,
        `合戦では主将と、主将のすぐ下の武将（最大${R.CORPS_CHILDREN}人）がそれぞれ1隊を率いる。その下の武将は属する隊の兵を厚くし、1人ごとに攻防+${R.CORPS_UNIT_BONUS * 100}%（最大+${R.CORPS_UNIT_BONUS_MAX * 100}%）。自動決着では主将とすぐ下の武将のうち高い武勇・知略を使う。`,
        `傘下の武将1人ごとに訓練で練度+${R.CORPS_DRILL}（最大+${R.CORPS_DRILL_MAX}）。軍団が戦えば傘下の全員に功績が入る。主将が討死・捕縛されたら筆頭が継ぎ、抜けた武将の下の者は一段上へ繰り上がる。`,
      ])}`;
  },
  governors: (st) => {
    const free = Object.values(st.generals).filter((g) => isFree(st, g)).sort((a, b) => b.int + b.cha - (a.int + a.cha));
    const cs = clanCastles(st, st.player).sort((a, b) => castleKoku(b) - castleKoku(a));
    return `<div class="tbl-wrap"><table><thead><tr><th>城</th><th class="n">石高</th><th>城主</th><th class="n">統率</th><th class="n">魅力</th><th>替える</th></tr></thead><tbody>
      ${cs.map((c) => { const g = c.governor ? st.generals[c.governor] : null; return `<tr><td><button class="mini" data-act="goto-castle" data-id="${c.i}">${esc(c.name)}</button></td><td class="n">${man(castleKoku(c))}</td><td>${g ? nameLink(g) : '<span class="hint" style="margin:0">不在</span>'}</td><td class="n">${g ? g.lea : '—'}</td><td class="n">${g ? g.cha : '—'}</td>
        <td><select data-gov="${c.i}" aria-label="${esc(c.name)}の城主"><option value="">${g ? '（替える武将を選ぶ）' : '（任じる武将を選ぶ）'}</option>${free.map((x) => `<option value="${x.id}">${esc(x.name)}　統${x.lea} 魅${x.cha}（${esc(st.castles[x.loc].name)}）</option>`).join('')}</select>${g ? ` <button class="mini" data-act="gov-out" data-id="${c.i}">解任</button>` : ''}</td></tr>`; }).join('')}
      </tbody></table></div>
      ${hints(['城主は城の開発（城主不在なら半分）と治安（魅力）に効き、毎月功績を得る。待機中の武将ならどこにいても任じられ、その城へ移る。'])}`;
  },

  // ── 記録 ──
  log: (st) => `<ol class="hint" style="padding-left:1.2em">${st.log.slice(-200).reverse().map((l) => `<li>${turnLabel(l.turn)}　${esc(l.text)}</li>`).join('')}</ol>`,
  save: () => {
    const saved = load(SAVE_KEY);
    return `<div class="actions" style="margin-top:0"><button class="act primary" data-act="save">保存</button><button class="act" data-act="load" ${saved ? '' : 'disabled'}>読込${saved ? `（${dateLabel(saved)}・${esc(saved.clans[saved.player].name)}）` : ''}</button><button class="act" data-act="newgame">最初から</button></div>
      <div class="actions"><button class="act" data-act="cutin-toggle" aria-pressed="${cutinOn()}">顔見せ（返事や節目のセリフ）: ${cutinOn() ? '出す' : '出さない'}</button></div>
      ${(() => { const so = soundSettings(); return `<div class="actions" style="align-items:center;gap:10px;flex-wrap:wrap"><button class="act" data-act="snd-music" aria-pressed="${so.music}">音楽: ${so.music ? '出す' : '出さない'}</button><label class="hint" style="margin:0;display:flex;align-items:center;gap:6px">音量<input type="range" min="0" max="100" value="${Math.round(so.vm * 100)}" data-vol="vm" aria-label="音楽の音量"></label></div>
      <div class="actions" style="align-items:center;gap:10px;flex-wrap:wrap"><button class="act" data-act="snd-sfx" aria-pressed="${so.sfx}">効果音: ${so.sfx ? '出す' : '出さない'}</button><label class="hint" style="margin:0;display:flex;align-items:center;gap:6px">音量<input type="range" min="0" max="100" value="${Math.round(so.vs * 100)}" data-vol="vs" aria-label="効果音の音量"></label></div>`; })()}
      <div class="actions"><button class="act" data-act="events-toggle" aria-pressed="${eventsOn()}">大きな出来事の場面（家督相続・滅亡・降伏・謀反・一揆・同盟と婚姻・南蛮・任官・天守など）: ${eventsOn() ? '出す' : '出さない'}</button></div>
      <div class="actions"><button class="act" data-act="opening-toggle" aria-pressed="${openingOn()}">序幕（始める前の時代の紹介）: ${openingOn() ? '出す' : '出さない'}</button></div>
      <div class="actions"><button class="act" data-act="battle-style">合戦の部隊の印: ${UNIT_STYLE_NAME[getBattleStyle()]}</button></div>
      <div class="actions"><button class="act" data-act="army-style" aria-pressed="${view.armyStyle === 'hayashi'}">地図の部隊の印: ${view.armyStyle === 'hayashi' ? '幟の林（兵が多いほど幟が増える）' : '丸（武将名と兵数の弧）'}</button></div>
    <p class="hint">保存はこのブラウザ内のみ。毎月自動保存される。</p>`;
  },
  help: () => `<h3 class="sect-h">操作</h3>${KEYS_HTML}<h3 class="sect-h">用語集</h3>${GLOSSARY_HTML}<h3 class="sect-h">仕組み</h3>` + helpList([
    `1ターン＝1か月。軍団は移動力${R.MOVE_POINTS}（平地1・森/川2・山3・城1）。敵軍に隣接すると止まる。1ヘックスに1軍団。`,
    `隣接する敵軍・城を攻撃すると、その月の会戦を最大${R.ROUNDS}合で解決。損害は相手の戦闘力に比例し、兵が多いほど有利。`,
    '兵科はない。武将の能力が部隊の性格になる。攻撃力＝0.5＋(武勇×0.6＋統率×0.4)÷100、防御力＝0.5＋(統率×0.6＋知略×0.2＋魅力×0.2)÷100、壊乱閾値＝0.60−(魅力×0.2＋統率×0.1)÷100。補佐は知略を補い（高いほうを使う）、武勇は主将との差の半分だけ補う。',
    '与える損害＝攻撃力×兵×士気÷(地形の防御倍率×相手の防御力)。士気が壊乱閾値を下回ると潰走。川・湿地では閾値+0.05、城内では−0.10、門徒は−0.10。',
    '地形で活きる能力が変わる: 平地の突撃は×1.3（他は×1.1）。森にいると計略+15%、知略で15以上勝れば森からの攻撃が伏兵×1.2。丘からの攻撃×1.15。',
    `同じ敵に隣接する味方は戦闘力の${R.FLANK_SUPPORT * 100}%で支援し、敵士気を下げる（側面${R.MORALE_FLANK}、包囲${R.MORALE_SURROUND}）。退路がなければ壊滅。`,
    `城は城兵が守る。城兵を崩せば落城し、その支配域を得る。自城と隣接ヘックスで毎月補充（兵糧${R.RECRUIT_COST}石/人）。兵は月${R.FOOD_PER_SOLDIER}石を消費。十月に収穫。`,
    `奉行（「内政」の奉行で任命）は農政か商業を担当する。農政の奉行が全城の開発を進め、石高・動員上限・収穫を上げる。月の伸び＝${R.BUGYO_RATE * 100}%×係数。係数＝${R.DEV_NATURAL}＋Σ 重み×知略÷100（重みは知略の高い順に${R.BUGYO_WEIGHT.join('・')}）。奉行1人で${R.BUGYO_CASTLES}城まで目が届き、城が多いと効率が落ちる。城主のいない城は半分、包囲中は進まない。開発の上限は治安で決まる（100〜160%）。`,
    '治水は収穫の倍率、治安は動員上限と開発の上限を決める。どちらも「内政」の予算で金を回して上げる。兵を集めすぎる（動員率5割超）と治安が毎月下がる。補充の上限は「軍事」の動員目標で決める。',
    '官位は「外交」の朝廷で献金して買う。威信の上乗せと、AIに攻められにくくなる効果がある。関白・征夷大将軍は天下に1人（将軍は大領と京が条件）。',
    '本願寺だけは他家の城に一向一揆を起こせる（城の画面）。一揆勢は攻め込まれたのと同じ扱いで、討った分だけその城の開発と治安が下がる。忠誠・治安でも金でも防げない。',
    `金（貫）は城の商業値から毎月入る。商業値＝石高×${R.COM_PER_KOKU}＋要所の上乗せ（堺・京・博多・津島など）、商業の開発度は商業担当の奉行が上げる。調略・外交・在野の登用は金で払う。「商い」で兵糧の売買・鉄砲・名物を扱う。`,
    '年齢と病: 武将は年を取る。25歳までは毎年伸び、56歳から武勇、60歳から統率、68歳から知略が毎年下がる。寿命はなく、病にかかったときだけ死ぬ。病は年を取るほどかかりやすく、重くなる（1〜5か月続き、その間は毎月亡くなるおそれがある）。',
    '家督: 当主が亡くなると、一門の子の世代の年長者が継ぐ。いなければ一門、元服前の子（急ぎ元服させる）、家臣の順。威信と全城の治安が下がり、一門でない者や幼い者が継ぐとさらに下がる。',
    `在野の武将は諸国を巡り、自家の城に来れば仕官を願い出ることがある（召し抱えるには${fmt(R.RONIN_GOLD)}貫）。威信が高く当主の魅力がある家ほど願い出が多い。旧主家を滅ぼした家には仕えない。「情報」の在野で全員の所在と能力が見られる。`,
    `練度と足軽: 部隊には練度があり、自城の近くで過ごすと上がり、農兵を補充すると下がる。足軽（常備兵）は金で雇い（1人${R.ASHI_HIRE}貫、給金 月${R.ASHI_WAGE}貫）、練度を100まで上げられ、季節を問わない。農繁期（田植え・刈り入れ）に農兵を領外へ出すと秋の収穫が減る。詳しくは「軍事」の足軽と練度。`,
    `軍団の編成（「人事」の軍団）: 当主・宿老の下に侍大将、その下に足軽大将、その下に足軽組頭を、それぞれ${R.CORPS_CHILDREN}人まで置ける。兵数の上限＝主将の上限×${R.CORPS_MAIN_TROOP}＋傘下の武将それぞれの上限×${R.CORPS_SUB_TROOP}。合戦では主将と主将のすぐ下の武将が隊を率いる。軍団が戦えば傘下の全員に功績が入る。`,
    `南蛮貿易と布教: 毎年${R.SHIP_MONTH}月に南蛮船が南蛮港（平戸・府内・坊津・堺、1570年から長崎）に来て、港の持ち主に南蛮市が開く（鉄砲が安く、大筒と南蛮の品が買える）。宣教師が布教の許しを願い出てくる。許せば商業と来航が伸びるが寺社が反発し、禁じれば洗礼を受けた家臣が去ることがある（「外交」の布教）。`,
    `知行（「人事」の知行）: 足軽大将以上の直参に城を与えると城持ちになる（宿老は何城でも、侍大将${R.FIEF_CAP[1]}城、足軽大将${R.FIEF_CAP[2]}城）。領の年貢・商いの8割は領に入り、${Math.round(R.FIEF_TRIBUTE * 100)}%が上納される。領の部隊は方針（攻略・防衛・軍備増強）に従って領主が動かし、陪臣の恩賞も領主が払う。領主がいなくなれば後継ぎを選ぶ。「内政」の委任で軍事を任せれば、直轄の部隊と城もAIが動かす。`,
    '御恩と奉公: 家臣には恩がある。功を立てたら「人事」の恩賞で報いる（感状・加増・取り立て・下賜）。報いずにいれば恩が下がり、出奔・城ごとの寝返り・城持ちの謀反を招く。名声の高い家臣には外から官の誘いが来る。縁のある者は去就を共にする。落とした城は仕置を決め、残り火に気をつける。当主が病に倒れたら跡継ぎと遺言を定める。',
    '大義名分: 戦には名分が要る。名分は将軍から発する（御内書・幕府の職・守護職）ほか、旧領の回復・仇討ち・反撃・救援など。名分のない戦（私戦）は家臣・民・諸家に支持されない。出陣の画面で名分を確かめ、「外交」の幕府で願い出る。',
  ]),
};

// ───────── 外交 ─────────
function relationLabel(st: GameState, c: string) {
  const t = treatyOf(st, st.player, c);
  if (!t) return '—';
  return t.kind === 'marriage' ? '<span class="pill good">婚姻</span>' : `<span class="pill good">同盟 残り${(t.until ?? 0) - st.turn}か月</span>`;
}

let dipGift: string | null = null;
const ninjaSel: { act: NinjaAct; target: string } = { act: 'rumor', target: '' }; // 忍びの働きと狙い（'g:武将id' か 'c:城の番号'）
let teaHost = '';
const ninjaTargetOf = (st: GameState) => (ninjaSel.target.startsWith('g:') ? { gen: st.generals[ninjaSel.target.slice(2)] } : ninjaSel.target.startsWith('c:') ? { castle: st.castles[+ninjaSel.target.slice(2)] } : {});
let dipFocus: string | null = null; // 諸大名: 交渉を開いている家
let dipAll = false; // 諸大名: 遠方の家も並べる
function dipButton(st: GameState, kind: DipKind, c: string, big = false) {
  const o = evaluate(st, kind, st.player, c, dipGift);
  const label = `${DIP_NAME[kind]}${o.ok ? ` ${Math.round(o.p * 100)}%` : ''}`;
  return `<button class="${big ? 'act' : 'mini'}" data-act="dip" data-kind="${kind}" data-id="${c}" ${o.ok ? '' : 'disabled'} title="${esc(o.ok ? `金${fmt(o.cost)}貫` : o.reason)}">${label}</button>`;
}

let askResolve: ((v: boolean) => void) | null = null;
// 海戦: 李舜臣が現れたとき、水軍の将の応じ方を選ぶ
let navalResolve: ((v: NavalChoice) => void) | null = null;
function askNaval(st: GameState, info: NavalInfo): Promise<NavalChoice> {
  $('toast').hidden = true;
  const yi = envoyLine(st, 'yiAppear', { id: 'yi_sunsin', name: '李舜臣' });
  const L = info.leader;
  const pct = (x: number) => `${Math.round(x * 100)}%`;
  const convoyCut = info.base * (0.6 - escortCut(st) * 0.4);
  return new Promise((resolve) => {
    navalResolve = resolve;
    openModal(`<h2 id="modal-title">海戦　李舜臣、島陰より</h2>
      <img class="naval-art" src="${SHIMAKAGE_ART}" alt="霧の多島海の島陰から現れる朝鮮の水軍">
      ${quoteHtml(st, yi, 96)}
      <p class="lede" style="margin-top:8px">朝鮮海峡の島陰から、朝鮮の水軍が現れた。${info.shipped ? `今月渡った兵${fmt(info.shipped)}人と、` : ''}海の向こうの${info.abroad}隊へ送る兵糧の船団が狙われている。李舜臣の勢いは${info.yi >= 0.8 ? '盛ん' : info.yi >= 0.5 ? 'やや衰え' : '衰えている'}。</p>
      ${L ? `<div class="ph" style="margin:6px 0">${faceOrMon(L.id, L.name, st.clans[st.player].color, 64)}<div><b>${esc(L.name)}</b>（統${L.lea}・知${L.int}${KADM.has(L.id) ? '・水軍の将' : ''}）が水軍を率いる。護りは${info.escorts.length}人。</div></div>` : '<p class="hint warn">水軍の将がいない。打って出ることはできない（唐入りの札で選べる）。</p>'}
      <div class="il-opts naval-opts">
        <button class="il-opt" data-act="naval" data-id="fight" ${L ? '' : 'disabled'}><b>打って出る　勝つ見込み ${pct(info.winP)}</b><span>勝てば李舜臣の勢いが大きく衰え、沈む荷は少ない（約${pct(info.base * 0.25)}）。負ければ船の1割ほどと、多くの荷（約${pct(Math.min(0.6, info.base * 1.5))}）を失う。</span></button>
        <button class="il-opt" data-act="naval" data-id="convoy"><b>荷を守って抜ける</b><span>戦わずに海峡を抜ける。運ぶ兵糧の約${pct(convoyCut)}が沈む（護りが厚いほど少ない）。李舜臣の勢いは変わらない。</span></button>
        <button class="il-opt" data-act="naval" data-id="port"><b>湊に籠もる</b><span>この月は船を出さない。何も沈まないが、海の向こうへ兵糧が届かず、軍勢は取った城の蔵と小荷駄で食いつなぐ。</span></button>
      </div>`, false);
  });
}
function askPlayer(st: GameState, from: string, kind: DipKind): Promise<boolean> {
  $('toast').hidden = true;
  const c = st.clans[from];
  const leader = c.leader ? st.generals[c.leader].name : '';
  return new Promise((resolve) => {
    askResolve = resolve;
    openModal(`<h2 id="modal-title">${esc(c.name)}家より使者</h2>
      ${face(c.leader, 120, 'face face-lg')}${c.leader && cutinOn() && (kind === 'alliance' || kind === 'marriage') ? `<p class="pitch-big">「${esc(lineFor(st, st.generals[c.leader], kind === 'marriage' ? 'envoyMarriage' : 'envoyAlliance').text)}」</p>` : ''}<p class="lede">${esc(leader)}より${DIP_NAME[kind]}の申し入れ。${DIP.ALLIANCE_MONTHS}か月のあいだ互いに攻めず、領内の通行を認め合う。</p>
      <dl class="kv"><dt>城</dt><dd>${clanCastles(st, from).length}</dd><dt>国力比</dt><dd>${(clanPower(st, st.player) / Math.max(1, clanPower(st, from))).toFixed(1)}倍（自家／相手）</dd><dt>威信</dt><dd>${c.prestige}</dd></dl>
      <div class="actions"><button class="act primary" data-act="ask-yes">受ける</button><button class="act" data-act="ask-no">断る</button></div>`, false);
  });
}

// ───────── 仕官の願い出（月の報告の画面と在野の一覧に出す） ─────────
function offerRows(st: GameState) {
  const me = st.clans[st.player];
  return (st.offers ?? []).map((o) => {
    const g = st.generals[o.gen];
    const rank = fame(g) >= R.RONIN_FAME_SAMURAI ? 1 : 2;
    return `<tr><td class="gname">${face(g.id, 32, 'face face-sm')}${nameLink(g)}</td><td class="n">${ageCell(st, g)}</td>${stats4(st, g)}<td>${esc(g.formerClan ? clanName(st, g.formerClan) + '家' : '—')}</td><td>${esc(st.castles[o.castle].name)}</td><td>${R.RANK_NAME[rank]}</td>
      <td><button class="mini" data-act="offer-hire" data-id="${g.id}" ${me.gold < R.RONIN_GOLD ? 'disabled title="金が足りない"' : ''}>召し抱える（${fmt(R.RONIN_GOLD)}貫）</button> <button class="mini" data-act="offer-refuse" data-id="${g.id}">断る</button></td></tr>`;
  }).join('');
}
const offerHead = '<thead><tr><th>武将</th><th class="n">年齢</th><th class="n">武勇</th><th class="n">知略</th><th class="n">統率</th><th class="n">魅力</th><th>旧主</th><th>来た城</th><th>身分</th><th></th></tr></thead>';
function offersBlock(st: GameState) {
  if (!st.offers?.length) return '';
  return `<h3 style="margin-top:4px">仕官の願い出</h3><p class="hint" style="margin-top:0">在野の武将が当家を見込んで願い出ている。召し抱えるには金${fmt(R.RONIN_GOLD)}貫（今${fmt(st.clans[st.player].gold)}貫）。この月のうちは「情報」の在野からも決められる。</p>
    <div class="tbl-wrap"><table>${offerHead}<tbody>${offerRows(st)}</tbody></table></div>`;
}

// ───────── 顔見せ（返事や節目の顔とセリフ） ─────────
const CUTIN_KEY = 'sengoku1560-cutin';
const cutinOn = () => { try { return localStorage.getItem(CUTIN_KEY) !== 'off'; } catch { return true; } };
const cutinQueue: SceneLine[] = [];
let cutinTimer = 0;
function quoteHtml(st: GameState, l: SceneLine, w = 96) {
  const g = l.who ? undefined : st.generals[l.gen];
  const name = l.who?.name ?? g?.name ?? '';
  const color = l.who?.color ?? (g?.clan ? st.clans[g.clan]?.color ?? '#7d735c' : g?.formerClan ? st.clans[g.formerClan]?.color ?? '#7d735c' : '#7d735c');
  const label = l.jisei ? '辞世' : l.label ?? SCENE_LABEL[l.scene as Scene];
  // 顔のない話し手（顔待ちの商人・公家など）は、顔と同じ大きさの札に名の二字を縦に
  const ph = `<span class="mon mon-q" style="width:${w}px;height:${Math.round(w * 1.25)}px;font-size:${Math.round(w * 0.26)}px;background:${color}">${esc((PERSONAS[l.gen]?.title ?? name).slice(0, 2))}</span>`;
  return `<div class="quote">${face(l.gen, w) || ph}<div class="qbody"><div class="qname">${esc(name)}<span>${esc(label)}</span></div><p class="${l.jisei ? 'jisei' : ''}">「${esc(l.text)}」</p></div></div>`;
}
// 返事の顔見せ: 画面の中央に出し、押すか数秒で閉じる（続けて出たものは順に）
function cutin(st: GameState, gen: General | undefined, scene: Scene, vars: Record<string, string> = {}) {
  if (!gen || !cutinOn()) return;
  cutinQueue.push(lineFor(st, gen, scene, vars));
  if (cutinQueue.length === 1) showCutin(st);
}
// 幕府・南蛮などとのやり取りの顔見せ
function cutinLine(st: GameState, l: SceneLine | null) {
  if (!l || !cutinOn()) return;
  cutinQueue.push(l);
  if (cutinQueue.length === 1) showCutin(st);
}
// 将軍（将軍家の当主）と、取次の幕臣（将軍家の家臣で知略の最も高い者）
function shogunGen(st: GameState) { const sc = shogunClan(st); const id = sc ? st.clans[sc]?.leader : null; return id ? st.generals[id] : undefined; }
function toritsugi(st: GameState) {
  const sc = shogunClan(st), lead = shogunGen(st);
  if (!sc) return undefined;
  return Object.values(st.generals).filter((g) => g.clan === sc && g.id !== lead?.id && (g.status === 'free' || g.status === 'governor' || g.status === 'bugyo' || g.status === 'army')).sort((a, b) => b.int - a.int)[0] ?? lead;
}
const leaderGen = (st: GameState, clan: string) => { const id = st.clans[clan]?.leader; return id ? st.generals[id] : undefined; };
// 当家に関わる宣教師（来訪中・当家にいる・活動中の順）
function missionaryFor(st: GameState): { id: string; name: string } | null {
  const id = st.missionVisit?.mis ?? missionHome(st, st.player)[0] ?? MISSIONARIES.find(([m]) => missionaryActive(st, m))?.[0];
  const d = id ? misDef(id) : undefined;
  return d ? { id: d[0], name: d[1] } : null;
}
let shipTalk = -1; // 南蛮市の顔見せは月に一度
const merchantTalk: Record<string, number> = {}; // 商人ごとに月に一度
const persona = (id: string) => ({ id, name: PERSONAS[id].name });
// 九州・長門・周防に本拠があれば博多の商人
const WEST = new Set(['chikuzen', 'chikugo', 'buzen', 'bungo', 'hizen', 'higo', 'hyuga', 'osumi', 'satsuma', 'iki', 'tsushima', 'nagato', 'suo']);
function riceMerchant(st: GameState) {
  const c = capital(st, st.player);
  const prov = c ? PROVINCES[HEXES[c.hex].p]?.id : '';
  if (prov && WEST.has(prov) && personaActive('shimai_soshitsu', st.year)) return 'shimai_soshitsu';
  if (personaActive('chaya_shirojiro', st.year) && (st.player === 'matsudaira' || prov === 'yamashiro')) return 'chaya_shirojiro';
  return personaActive('tsuda_sogyu', st.year) ? 'tsuda_sogyu' : personaActive('imai_sokyu', st.year) ? 'imai_sokyu' : null;
}
function merchantSay(st: GameState, id: string | null, scene: EnvoyScene, vars: Record<string, string>, always = false) {
  if (!id || !personaActive(id, st.year)) return;
  if (!always && merchantTalk[id] === st.turn) return;
  merchantTalk[id] = st.turn;
  cutinLine(st, envoyLine(st, scene, persona(id), vars));
}
// 叙任: 御簾の内のお言葉と、伝奏（高い官位は近衛前久）の取り次ぎ
function courtSay(st: GameState, rank: number) {
  const name = R.COURT[rank].name;
  cutinLine(st, envoyLine(st, 'courtEdict', persona('misu'), { rank: name }));
  const high = rank >= R.COURT.length - 3 && personaActive('konoe_sakihisa', st.year);
  const kuge = ['yamashina_tokitsugu', 'kajuji_harumigi', 'kajuji_haretoyo'].filter((id) => personaActive(id, st.year));
  const who = high ? 'konoe_sakihisa' : kuge[(st.turn + rank) % Math.max(1, kuge.length)];
  if (who) cutinLine(st, envoyLine(st, high ? 'courtHigh' : 'courtRank', persona(who), { rank: name }));
}
function showCutin(st: GameState) {
  sfx('ponn');
  let el = document.getElementById('cutin');
  if (!el) {
    el = document.createElement('div'); el.id = 'cutin'; el.setAttribute('role', 'status');
    el.addEventListener('click', () => nextCutin(st));
    document.body.appendChild(el);
  }
  const l = cutinQueue[0];
  if (!l) { el.hidden = true; return; }
  el.innerHTML = quoteHtml(st, l, 120);
  el.hidden = false;
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  clearTimeout(cutinTimer);
  cutinTimer = window.setTimeout(() => nextCutin(st), l.jisei ? 7000 : 4200);
}
function nextCutin(st: GameState) { cutinQueue.shift(); showCutin(st); }
// 月の報告: 節目の顔見せ
function scenesBlock(st: GameState) {
  if (!st.scenes?.length || !cutinOn()) return '';
  return `<div class="quotes">${st.scenes.map((l) => quoteHtml(st, l, 64)).join('')}</div>`;
}

// 宣教師の願い出（月の報告の画面）
function missionVisitBlock(st: GameState) {
  const v = st.missionVisit;
  if (!v) return '';
  const d = misDef(v.mis);
  if (!d) return '';
  const me = st.clans[st.player];
  const bA = missionBlock(st, st.player, 'allow'), bB = missionBlock(st, st.player, 'ban');
  return `<h3 style="margin-top:4px">宣教師の来訪</h3><div class="ph" style="align-items:flex-start">${faceOrMon(v.mis, d[1], '#5a4a3a')}<div>
    <p style="margin:0"><b>${esc(d[1])}</b>が布教の許しを願い出ている。当家はいま「${missionLabel(me.mission)}」。</p>${cutinOn() ? `<p class="pitch-big" style="margin:4px 0">「${esc(envoyLine(st, 'misVisit', { id: d[0], name: d[1] }).text)}」</p>` : ''}<p class="hint" style="margin:2px 0 0">${esc(d[6])}</p></div></div>
    <div class="actions"><button class="mini" data-act="mis-allow" ${bA ? `disabled title="${esc(bA)}"` : ''}>布教を許す</button> <button class="mini" data-act="mis-ban" ${bB ? `disabled title="${esc(bB)}"` : ''}>禁じる</button> <button class="mini" data-act="mis-hold">返事を見合わせる</button></div>
    <p class="hint" style="margin-top:2px">許せば信者が増えて商業が伸び、南蛮船が来やすくなるが、寺社が反発する。詳しくは「外交」の布教。</p>`;
}

// 天下統一のエンディング: 絵を一面に、下に言葉と記録
function showEnding(st: GameState) {
  mood('triumph'); sfx('win');
  closeModal();
  let el = document.getElementById('ending');
  if (!el) { el = document.createElement('div'); el.id = 'ending'; document.body.appendChild(el); el.addEventListener('click', onModalClick); }
  const me = st.clans[st.player];
  const lord = me.leader ? st.generals[me.leader] : null;
  const span = st.startYear ? (st.year - st.startYear) * 12 + st.month - (st.startMonth ?? st.month) : null; // 起ってからの月数
  const vassals = Object.values(st.generals).filter((g) => g.clan === st.player && g.status !== 'dead' && g.status !== 'young').length;
  el.innerHTML = `<img class="end-art" src="${ENDING_ART}" alt="天守から城下と海を見渡す当主の後ろ姿">
    <div class="end-veil"></div>
    <div class="end-text">
      <h1>天下統一<small>${esc(dateLabel(st))}</small></h1>
      <p>${lord ? `${esc(lord.name)}は` : ''}全国${domesticCount(st)}城を制し、${esc(me.name)}家の旗のもとに戦国の世を終わらせた。</p>
      <p class="end-sub">長き乱世は去り、城下には市が立ち、湊には船が満ちる。</p>
      <dl class="kv end-kv">${span !== null && span >= 0 ? `<dt>年月</dt><dd>${st.startYear}年から${span >= 12 ? `${Math.floor(span / 12)}年` : ''}${span % 12 || span < 12 ? `${span % 12}か月` : ''}</dd>` : ''}<dt>石高</dt><dd>${clanKoku(st, st.player).toFixed(1)}万石</dd><dt>兵</dt><dd>${fmt(clanTroops(st, st.player))}</dd><dt>家臣</dt><dd>${vassals}人</dd><dt>官位</dt><dd>${esc(courtName(st, st.player))}</dd></dl>
      <div class="actions">${st.karairi ? '' : '<button class="act primary" data-act="end-next">その後……</button>'}<button class="act${st.karairi ? ' primary' : ''}" data-act="end-new">新しく始める</button><button class="act" data-act="end-close">地図を見る</button></div>
    </div>`;
  el.hidden = false;
}

// ───────── 幕間（唐入りの動機）: 天下統一ののち、五つの章を続けて見せ、大評定で決する ─────────
// 語りは人物ごとの言い分として出す（地の文で断定しない）。数字はゲームの状態から
type ILine = { gen: string; name: string; color: string; label: string; text: string };
type IStep = { ch: string; art: 'hyojo' | 'sekaizu' | 'minato' } & ({ t: 'line'; l: ILine } | { t: 'choice'; id: string; prompt: string; opts: [string, string, string][] });
type IVars = { offer: 'mis' | 'capitan' | 'merchant'; speaker: string; investigated: boolean; slaveBan: boolean; misId: string | null; ships: boolean; expel: boolean; cause: string };
const IVARS0 = (): IVars => ({ offer: 'merchant', speaker: '', investigated: false, slaveBan: false, misId: null, ships: false, expel: false, cause: 'onsho' });
let isteps: IStep[] = [], istep = 0, ivars: IVars = IVARS0();
// 場面の絵
const IART = () => ({ hyojo: HYOJO_ART, sekaizu: SEKAIZU_ART, minato: MINATO_ART });
const CH = ['第一章　恩賞の行き詰まり', '第二章　世界図', '第三章　湊の噂', '第四章　南の海の知らせ', '第五章　国の疲れ', '大評定'];

function icast(st: GameState) {
  const me = st.clans[st.player];
  const lord = me.leader ? st.generals[me.leader] : undefined;
  const vassals = Object.values(st.generals).filter((g) => g.clan === st.player && g.id !== me.leader && g.status !== 'dead' && g.status !== 'young' && g.status !== 'captive');
  const used = new Set<string>();
  const pick = (f: (g: General) => number, filt: (g: General) => boolean = () => true) => { const g = vassals.filter((x) => !used.has(x.id) && filt(x)).sort((a, b) => f(b) - f(a))[0]; if (g) used.add(g.id); return g; };
  const elder = pick((g) => dueOf(g) * 1000 + g.merit);
  const hawk = pick((g) => g.bra + (dueOf(g) > 0 ? 30 : 0));
  const wise = pick((g) => g.int);
  const kiri = pick((g) => g.int, (g) => !!g.kiri);
  const dove = pick((g) => g.lea + g.cha);
  const bugyo = hyoroBugyo(st, st.player) ?? bugyoOf(st, st.player).sort((a, b) => b.int - a.int)[0] ?? pick((g) => g.int + g.lea);
  const mis = me.mission === 'ban' ? null : ((st.year >= 1581 && st.year <= 1590) ? misDef('coelho') : MISSIONARIES.find(([m]) => missionaryActive(st, m))) ?? null;
  return { me, lord, vassals, elder, hawk, wise, kiri, dove, bugyo, mis };
}
const gl = (st: GameState, g: General | undefined, label: string, text: string): ILine | null => g ? { gen: g.id, name: g.name, color: g.clan ? st.clans[g.clan].color : '#5a4a3a', label, text } : null;
const pl = (id: string, label: string, text: string): ILine => ({ gen: id, name: PERSONAS[id]?.name ?? misName(id), color: PERSONAS[id]?.color ?? '#3a3a44', label, text });
const merchantId = (st: GameState) => personaActive('shimai_soshitsu', st.year) ? 'shimai_soshitsu' : personaActive('imai_sokyu', st.year) ? 'imai_sokyu' : 'tsuda_sogyu';
const tradeId = (st: GameState) => personaActive('imai_sokyu', st.year) ? 'imai_sokyu' : 'tsuda_sogyu';

function iscript(st: GameState): IStep[] {
  const c = icast(st);
  const L: IStep[] = [];
  const line = (ch: number, art: IStep['art'], l: ILine | null) => { if (l) L.push({ ch: CH[ch], art, t: 'line', l }); };
  const lordShort = c.lord ? c.lord.name.slice(-2) : '殿';
  // 第一章
  const waiting = c.vassals.filter((g) => dueOf(g) > 0).length;
  const ronin = Object.values(st.generals).filter((g) => g.status === 'ronin').length;
  line(0, 'hyojo', gl(st, c.elder, '恩賞の訴え', `${lordShort}様、天下はついに治まり申した。……されど、功ある者に与える土地は、もはや日の本のどこにもございませぬ。恩賞を待つ者は${waiting}人。皆、口には出さねど、次の沙汰を待っておりまする。`));
  if (ronin >= 5) line(0, 'hyojo', gl(st, c.hawk, '浪人', `主を失った浪人も諸国に溢れ、聞こえるだけで${ronin}人。刀を置けぬ者どもが、次の戦を待っておるのです。このままでは、いずれ国の中で火を噴きましょう。`));
  // 第二章
  if (c.mis) {
    ivars.offer = 'mis'; ivars.speaker = ivars.misId = c.mis[0];
    const m = c.mis[0];
    line(1, 'sekaizu', pl(m, '世界図の献上', '天下一統、まことにおめでとうございます。お祝いに、南蛮の地球儀と世界図をお持ちいたしました。日の本は、この海の東の端にございます。'));
    line(1, 'sekaizu', pl(m, '海の外', '海を渡れば朝鮮、その先に大明。明は日の本の十倍も広く、さらに西には天竺、その果てに我らの国々がございます。世界は、かくも広いのです。'));
    line(1, 'sekaizu', pl(m, '大船の申し出', 'もし殿が唐へ渡られるお考えなら、ポルトガルの大船を二艘、わが会がご用意いたしましょう。その代わり、殿の国々で教えを広めることを、末永くお許しくださいませ。'));
    L.push({ ch: CH[1], art: 'sekaizu', t: 'choice', id: 'ships', prompt: '宣教師の申し出を、どうするか。', opts: [['yes', '大船を借りる', '唐へ渡るときの船が増える。その代わり、布教を許し続けることになる。'], ['no', '断る', '借りは作らない。']] });
  } else if (c.me.mission === 'ban' || (st.ships ?? []).length) {
    ivars.offer = 'capitan'; ivars.speaker = 'capitan';
    line(1, 'sekaizu', pl('capitan', '世界図の献上', '殿、天下一統のお祝いです。南蛮の世界図と地球儀、ごらんください。日の本は、ここ。海の向こうに朝鮮と大明、その先は天竺と南蛮です。'));
    line(1, 'sekaizu', pl('capitan', '大船の申し出', '唐へ渡られるなら、大船も鉄砲も、銀次第でいかようにも。わたしどもは商人です。よいお取引を。'));
    L.push({ ch: CH[1], art: 'sekaizu', t: 'choice', id: 'ships', prompt: 'カピタンの申し出を、どうするか。', opts: [['yes', '大船を買い入れる', '銀で南蛮の船を雇う。唐へ渡るときの船が増える。'], ['no', '見送る', '今は船を求めない。']] });
  } else {
    ivars.offer = 'merchant'; ivars.speaker = tradeId(st);
    line(1, 'sekaizu', pl(tradeId(st), '世界図の献上', '天下一統、祝着至極に存じまする。堺の蔵より、南蛮渡りの世界図を献じまする。大明との勘合が絶えて久しく、商いは細るばかりでござる。'));
  }
  // 第三章（調べるかどうかで、この先が足される）
  line(2, 'minato', pl(merchantId(st), '湊の噂', `${lordShort}様、湊でよからぬ噂がございます。南蛮の船に、日の本の者が売られて積まれていくと……。男も女も、子どもまで。`));
  L.push({ ch: CH[2], art: 'minato', t: 'choice', id: 'investigate', prompt: '湊の噂を、どうするか。', opts: [['yes', '調べさせる', '湊の代官と商人に、売り買いの次第を調べさせる。'], ['no', '捨て置く', '商いの邪魔はしない。']] });
  return L;
}
// 第三章の続き〜第五章・大評定（選んだあとに足す）
function iscriptRest(st: GameState, investigated: boolean): IStep[] {
  const c = icast(st);
  const L: IStep[] = [];
  const line = (ch: number, art: IStep['art'], l: ILine | null) => { if (l) L.push({ ch: CH[ch], art, t: 'line', l }); };
  if (investigated) {
    line(2, 'minato', pl(merchantId(st), '調べの次第', '調べがつきました。売り手の多くは国内の人買いと、戦の乱取りで人を攫った者ども。買うのは南蛮の商人にございます。長崎では、伴天連が売り買いの証文に名を添えていた、と申す者もおりまする。'));
    line(2, 'minato', gl(st, c.dove, '恥', '……戦で村から人を攫ったのは、我らの兵でもございます。南蛮ばかりを責めるわけにはまいりませぬ。'));
    if (c.mis) {
      const m = c.mis[0];
      line(2, 'minato', gl(st, c.lord, '詰問', '伴天連に問う。一つ、なぜ日の本の者を売り買いさせるのか。一つ、なぜ信者に寺社を壊させるのか。一つ、なぜ民に改宗を強いるのか。一つ、なぜ牛馬を食うのか。'));
      line(2, 'minato', pl(m, '答え', m === 'coelho'
        ? '人を売るのは日本の方々です。我らはそれを止めようとしております。止めたくば、殿が売る者をお禁じになればよろしい。寺社のことは、信者が自ら為したことにございます。'
        : '仰せのことには、我らにも恥ずべき点がございます。ポルトガルの王も人の売り買いを禁じております。我らも商人たちに固く申し付けましょう。寺社と改宗のことも、二度と無理はさせませぬ。'));
    }
    L.push({ ch: CH[2], art: 'minato', t: 'choice', id: 'slave', prompt: '人の売り買いを、どうするか。', opts: [['ban', '人の売り買いを禁じる', '国の内外で人を売り買いすることを禁じる。南蛮の商いは少し細るが、民は安堵する（全城の治安＋3）。'], ['keep', '今はまだ禁じない', '湊の商いを優先する。']] });
  }
  // 第四章
  const sea = ivars.offer === 'capitan' || c.me.mission === 'ban' ? 'capitan' : merchantId(st);
  line(3, 'minato', pl(sea, '南の海の知らせ', sea === 'capitan'
    ? 'イスパニアの者どもは、呂宋（ルソン）を取りました。わたしどもポルトガルは天竺のゴアとマラッカに砦を持ちますが、商い一筋です。……イスパニアは違う。あの国は、取れる国はみな取ります。'
    : '南の海の噂をお聞きになりましたか。呂宋はイスパニアの国となり、天竺のゴアもマラッカも、とうに南蛮の手にございます。湊の者どもは、次はどこかと囁いておりまする。'));
  if (ivars.misId === 'coelho') line(3, 'minato', gl(st, c.elder, '博多の小船', '先ごろ、伴天連が大筒を積んだ小船で博多の湊に参りました。商いの船にも、祈りの船にも見えませなんだ。'));
  line(3, 'minato', gl(st, c.wise, '見方', '教えを広めた先に兵が来る、と見る者もおりまする。呂宋がそうであったと。……また、南蛮が明を取る前に、日の本が先に明を押さえるべし、と申す者もございます。'));
  if (c.kiri) line(3, 'minato', gl(st, c.kiri, '反論', '伴天連は国を奪いはしませぬ。わたしは教えに救われ申した。疑うなら、銀に目の眩んだ南蛮の商人をこそ疑われよ。'));
  line(3, 'minato', pl(tradeId(st), '反論', '明を取るなど夢物語にございます。南蛮の船は、銀と生糸のために来る。恐れるより、商いで富むことをお考えくだされ。'));
  if (ivars.misId) L.push({ ch: CH[3], art: 'minato', t: 'choice', id: 'expel', prompt: '伴天連を、どうするか。', opts: [['expel', '伴天連を追放する', `宣教師を国外へ退ける（禁教）。南蛮の商いも細る。${ivars.ships && ivars.offer === 'mis' ? '借りるはずの大船の話も流れる。' : ''}`], ['stay', '留め置く', '布教はこれまでどおり許す。']] });
  // 第五章
  const low = clanCastles(st, st.player).filter((x) => x.chian < 40).length;
  const ember = clanCastles(st, st.player).filter((x) => (x.ember ?? 0) > 0).length;
  const me = st.clans[st.player];
  line(4, 'hyojo', gl(st, c.bugyo, '国の様子', `国の様子をご報告いたします。治安の悪い城が${low}、残り火の燻る城が${ember}。蔵の兵糧は${fmt(me.food)}石、鉄砲は${fmt(clanGuns(st, st.player))}丁。……長い戦で田は荒れ、民は疲れております。この国力で、南蛮の大船と大筒に抗えましょうか。そして、海の外の戦に耐えられましょうか。`));
  // 大評定
  line(5, 'hyojo', gl(st, c.hawk, '出兵', '海を渡れば土地は限りない。功ある者に報いるには、これしかございませぬ！ 日の本の武を、明の者どもに見せてやりましょうぞ。'));
  line(5, 'hyojo', gl(st, c.wise, '先んじる', '南蛮が明を取れば、次は日の本。ならば先に明を押さえ、海を我らのものとすべきかと存じます。……ただし、これは賭けにございます。'));
  line(5, 'hyojo', pl(tradeId(st), '交易', 'まずは使いを出し、明に勘合を開かせるべし。戦は商いを潰しまする。堺も博多も、戦より銀を望んでおりまする。'));
  line(5, 'hyojo', gl(st, c.dove, '慎重', '国の傷はまだ癒えておりませぬ。今は田を耕し、城を直すときでございます。'));
  L.push({ ch: CH[5], art: 'hyojo', t: 'choice', id: 'cause', prompt: '海の外へ、兵を出すか。何を大義とするか。', opts: [['onsho', '恩賞のため', '功ある者に海の外の土地で報いる。武断の家臣が喜び、慎重な者は不満を抱く。'], ['saki', '南蛮に先んじて', '南蛮が明を取る前に。知略の家臣が乗り、交易を望む商人は渋る。'], ['kango', '勘合を開かせる', '明に交易を認めさせるため。商人が後押しする。'], ['ikou', '天下人の威光', '日の本の主の名を海の外に轟かせる。'], ['peace', '海の外へは出ない', '天下の静謐を守り、太平の世を築く。ここで物語を締めくくる。']] });
  return L;
}
// 出兵と決めたあと: 朝鮮への最初の一手
function iscriptFirst(st: GameState): IStep[] {
  const c = icast(st);
  const L: IStep[] = [];
  const line = (l: ILine | null) => { if (l) L.push({ ch: CH[5], art: 'hyojo', t: 'line', l }); };
  line(gl(st, c.dove, '最初の一手', 'ならば、せめて最初の一手は慎重に。まず対馬の宗氏を通じて朝鮮に使いを出し、道を開かれませ。断られれば、それが名分となりましょう。'));
  line(gl(st, c.hawk, '最初の一手', '使いなど無用。時を与えれば、朝鮮も明も備えを固めまする。ただちに陣触を下されませ！'));
  L.push({ ch: CH[5], art: 'hyojo', t: 'choice', id: 'first', prompt: '朝鮮への最初の一手は。', opts: [['envoy', '対馬の宗氏を通じて使いを送る', '朝鮮に道を開くよう求める。断られれば、それが出兵の名分になる。'], ['now', 'ただちに陣触を下す', '使いは送らず、全国の大名に渡海の支度を命じる。']] });
  return L;
}

function openInterlude(st: GameState) {
  mood('somber');
  $('ending').hidden = true;
  let el = document.getElementById('interlude');
  if (!el) { el = document.createElement('div'); el.id = 'interlude'; document.body.appendChild(el); el.addEventListener('click', onInterludeClick); }
  ivars = IVARS0();
  isteps = iscript(st); istep = 0;
  drawInterlude(st);
  el.hidden = false;
}
function drawInterlude(st: GameState) {
  const el = $('interlude');
  const p = isteps[istep];
  if (!p) return;
  let body = '';
  if (p.t === 'line') {
    const l = p.l;
    body = `<div class="il-quote" data-act="il-next"><div class="quote">${face(l.gen, 120) || `<span class="mon mon-q" style="width:120px;height:150px;font-size:30px;background:${l.color}">${esc(l.name.slice(0, 2))}</span>`}<div class="qbody"><div class="qname">${esc(l.name)}<span>${esc(l.label)}</span></div><p>「${esc(l.text)}」</p></div></div><div class="il-more">押すと次へ</div></div>`;
  } else {
    body = `<p class="il-ask">${esc(p.prompt)}</p><div class="il-opts">${p.opts.map(([k, t, d]) => `<button class="il-opt" data-act="il-choose" data-id="${k}"><b>${esc(t)}</b><span>${esc(d)}</span></button>`).join('')}</div>${p.id === 'cause' ? '<p class="hint il-note">唐入りは、朝鮮と明の人々にとっては侵略の戦である。この戦が何を残すのか──この先では渡海の兵站、義兵や水軍の抵抗、厭戦も描く。</p>' : ''}`;
  }
  el.innerHTML = `<img class="end-art" src="${IART()[p.art]}" alt=""><div class="end-veil"></div>
    <div class="il-head"><h2>${esc(p.ch)}</h2><small>${esc(dateLabel(st))}　天下一統ののち</small></div>
    <div class="end-text il-text">${body}</div>`;
}
const CAUSE_NAME: Record<string, string> = { onsho: '恩賞のため', saki: '南蛮に先んじて', kango: '勘合を開かせる', ikou: '天下人の威光', peace: '海の外へは出ない' };
function onInterludeClick(e: Event) {
  const t = (e.target as HTMLElement).closest('[data-act]') as HTMLElement | null;
  if (!t || !s) return;
  const st = s, act = t.dataset.act;
  if (act === 'il-next') { istep++; drawInterlude(st); return; }
  if (act === 'il-choose') {
    const p = isteps[istep];
    if (p.t !== 'choice') return;
    const v = t.dataset.id ?? '';
    const c = icast(st);
    const after: IStep[] = [];
    const say = (l: ILine | null) => { if (l) after.push({ ch: p.ch, art: p.art, t: 'line', l }); };
    if (p.id === 'ships') {
      ivars.ships = v === 'yes';
      const sp = ivars.speaker;
      say(pl(sp, ivars.ships ? '承知' : '残念', sp === 'capitan'
        ? (ivars.ships ? 'よいお取引です。船は湊にお回しいたします。銀のご用意を。' : 'さようですか。お気が変わりましたら、いつでも。')
        : (ivars.ships ? 'ありがたき仰せ。大船二艘、必ずお届けいたします。教えのこと、なにとぞお忘れなきよう。' : '……残念に存じます。されど、殿のお考えが変わることを、神に祈っております。')));
    }
    if (p.id === 'investigate') { ivars.investigated = v === 'yes'; after.push(...iscriptRest(st, ivars.investigated)); }
    if (p.id === 'slave' && v === 'ban') { ivars.slaveBan = true; banSlaveTrade(st); }
    if (p.id === 'expel') {
      ivars.expel = v === 'expel';
      if (ivars.expel) { if (ivars.offer === 'mis') ivars.ships = false; setMission(st, st.player, 'ban'); addLog(st, '伴天連を国外へ追放した。', 'info', true); }
      if (ivars.expel && c.kiri) say(gl(st, c.kiri, '嘆き', '……殿のご裁断とあらば、従いまする。されど、わが胸の内の教えまでは、追い出せませぬ。'));
      else if (!ivars.expel && ivars.misId) say(pl(ivars.misId, '安堵', '殿のご寛容に感謝いたします。我らも、疑いを招かぬよう努めます。'));
    }
    if (p.id === 'cause') {
      ivars.cause = v;
      if (v === 'peace') { decideInterlude(st, 'envoy'); return; }
      after.push(...iscriptFirst(st));
    }
    if (p.id === 'first') { decideInterlude(st, v); return; }
    isteps.splice(istep + 1, 0, ...after);
    istep++; drawInterlude(st); return;
  }
  if (act === 'il-new') { $('interlude').hidden = true; store(AUTO_KEY, null); s = null; openTitle(); return; }
  if (act === 'il-close') { $('interlude').hidden = true; return; }
  if (act === 'il-start') {
    $('interlude').hidden = true;
    startKarairi(st); store(AUTO_KEY, JSON.stringify(st));
    const t = st.castles.find((c) => c.id === 'kaneishi'); if (t) view.centerOn(t.hex, 1.6);
    refresh(); openMenu('gunji', 'karairi');
    return;
  }
}
function decideInterlude(st: GameState, first: string) {
  const cause = ivars.cause, go = cause !== 'peace';
  // 大義に沿った者は恩が上がり、退けられた者は下がる
  const c = icast(st);
  const nudge = (g: General | undefined, d: number) => { if (g) g.on = Math.max(0, Math.min(100, onOf(g) + d)); };
  nudge(c.hawk, go && cause === 'onsho' ? 6 : go ? 2 : -8);
  nudge(c.wise, cause === 'saki' ? 6 : 0);
  nudge(c.dove, go ? -6 : 6);
  st.karairi = { choice: go ? 'go' : 'peace', cause, ships: ivars.ships, expel: ivars.expel, slaveBan: ivars.slaveBan, envoy: go && first === 'envoy', investigated: ivars.investigated, turn: st.turn, speaker: ivars.speaker };
  addLog(st, go ? `「${CAUSE_NAME[cause]}」を掲げ、唐入りを決した。` : '海の外へは兵を出さぬと決めた。', 'info', true);
  if (go) { try { localStorage.setItem('sengoku-karairi', JSON.stringify({ clan: st.player, name: st.clans[st.player].name, year: st.year, month: st.month, scenario: st.scenario, ...st.karairi })); } catch { /* 記録できなくても続ける */ } }
  store(AUTO_KEY, JSON.stringify(st));
  finale(st);
}
function banSlaveTrade(st: GameState) {
  for (const c of clanCastles(st, st.player)) c.chian = Math.min(100, c.chian + 3);
  addLog(st, '国の内外で人を売り買いすることを禁じた。', 'info', true);
}
function finale(st: GameState) {
  const el = $('interlude');
  const k = st.karairi!;
  const lord = st.clans[st.player].leader ? st.generals[st.clans[st.player].leader!].name : '';
  const peace = k.choice === 'peace';
  const extra = [k.slaveBan ? '人の売り買いは固く禁じられた。' : '', k.expel ? '伴天連は国を追われた。' : '', k.ships ? '南蛮の大船が湊に入る。' : ''].filter(Boolean).join('');
  el.innerHTML = `<img class="end-art" src="${peace ? ENDING_ART : NAGOYA_ART}" alt=""><div class="end-veil"></div>
    <div class="end-text">
      <h1>${peace ? '太平' : '陣触'}<small>${esc(dateLabel(st))}</small></h1>
      ${peace
        ? `<p>${esc(lord)}は海の外へ目を向けなかった。${extra}刀は蔵に納められ、田には稲が実り、街道には旅人が行き交う。</p><p class="end-sub">戦国の世は終わり、長い太平が始まった。</p>`
        : `<p>${esc(lord)}は「${esc(CAUSE_NAME[k.cause!])}」を掲げ、唐入りを決した。${extra}${k.envoy ? 'まず対馬の宗氏を通じて、朝鮮に使いが送られる。' : '全国の大名に陣触が下り、湊に船と兵糧が集まり始める。'}</p><p class="end-sub">軍勢を対馬へ集め、船で釜山へ渡る。海を渡れる兵と兵糧は船の数しだい。島陰には朝鮮の水軍が潜む。</p>`}
      <div class="actions">${peace ? '' : '<button class="act primary" data-act="il-start">唐入りを始める</button>'}<button class="act${peace ? ' primary' : ''}" data-act="il-new">新しく始める</button><button class="act" data-act="il-close">地図を見る</button></div>
    </div>`;
}

// 国内の城の数（国外の朝鮮・遼東は数えない）
const domesticCount = (st: GameState) => st.castles.filter((c) => !isForeignHex(c.hex)).length;

// 唐入りの結末: 絵を一面に、締めの言葉と、戦の重さを数字で
const KEND: Record<string, { h: string; art: () => string; text: (lord: string, k: NonNullable<GameState['karairi']>) => string; sub: string }> = {
  daimin: { h: '大明へ', art: () => ENDING_ART, text: (l) => `${l}の軍勢は鴨緑江を越え、遼東の九連城を落とした。大明の門は開かれた。`, sub: 'だが、海の向こうの戦はまだ終わらない。この先にも、海を越えた兵と、焼かれた村と、帰らぬ人々がいる。' },
  wagi: { h: '和議', art: () => KOWA_ART, text: (l) => `${l}は沈惟敬の仲立ちで明と和を結び、取った城を保ったまま兵を休めた。`, sub: '和議の文は、双方の使者が互いに都合よく書き換えたものだったとも伝わる。この平和が長く続くかは、誰にも分からない。' },
  withdraw: { h: '撤兵', art: () => MINATO_ART, text: (l, k) => k.endWhy === 'lordDied' ? `唐入りを始めた当主が世を去った。遺された者たちは、ひそかに兵を海の向こうから呼び戻した。` : `${l}は唐入りを止め、兵を海の向こうから引き揚げた。`, sub: '七年にも及ぶかもしれなかった戦は、何を残したのか。朝鮮の地には焼け跡が、日の本には疲れと恨みが残った。' },
  collapse: { h: '国の崩れ', art: () => HYOJO_ART, text: (l) => `終わらない唐入りに、国の内は疲れ果てた。${l}の天下は内から崩れ始める。`, sub: '海の向こうに兵を送り続けた代償は、あまりに大きかった。' },
};
function showKarairiEnd(st: GameState) {
  mood('somber');
  closeModal();
  const k = st.karairi!;
  const E = KEND[k.end!];
  let el = document.getElementById('ending');
  if (!el) { el = document.createElement('div'); el.id = 'ending'; document.body.appendChild(el); el.addEventListener('click', onModalClick); }
  const lord = st.clans[st.player].leader ? st.generals[st.clans[st.player].leader!].name : '当主';
  const months = st.turn - (k.startTurn ?? st.turn);
  const held = st.castles.filter((c) => isForeignHex(c.hex) && c.owner === st.player).length;
  el.innerHTML = `<img class="end-art" src="${E.art()}" alt="">
    <div class="end-veil"></div>
    <div class="end-text">
      <h1>${E.h}<small>${esc(dateLabel(st))}　唐入りの結末</small></h1>
      <p>${esc(E.text(lord, k))}</p>
      <p class="end-sub">${esc(E.sub)}</p>
      <dl class="kv end-kv"><dt>唐入り</dt><dd>${months >= 12 ? `${Math.floor(months / 12)}年` : ''}${months % 12}か月</dd><dt>取った城</dt><dd>${held}</dd><dt>失った兵（当家）</dt><dd>${fmt(k.lost ?? 0)}</dd><dt>朝鮮・明の損害</dt><dd>${fmt((k.joseonLost ?? 0) + (k.mingLost ?? 0))}</dd><dt>厭戦</dt><dd>${Math.round(k.weary ?? 0)}</dd><dt>李舜臣との海戦</dt><dd>${k.raids ?? 0}度</dd></dl>
      <div class="actions"><button class="act primary" data-act="end-new">新しく始める</button><button class="act" data-act="end-close">地図を見る</button></div>
    </div>`;
  el.hidden = false;
}

// 合流の札: 大将の決め方（身分 → 当主 → 方面軍団長 → 一門 → 統率 → 功績）と、面目・不仲の知らせ
function openMergeSheet(st: GameState, a: Army, b: Army) {
  const { keep, other, alt } = mergeLeaders(st, a, b);
  const opt = (k: Army, o: Army, rec: boolean) => {
    const K = st.generals[k.main], pv = mergePreview(st, k, o), cap = maxTroops(st, k);
    return `<button class="il-opt" data-act="merge-do" data-id="${k.id}:${o.id}"><b>${esc(K.name)}を大将に${rec ? '（おすすめ）' : ''}</b><span>${esc(rankName(st, K))}・統率${K.lea}・功績${Math.floor(K.merit)}。兵 ${fmt(Math.min(pv.total, cap))}${pv.total > cap ? `（上限${fmt(cap)}。残り${fmt(pv.total - cap)}は${st.generals[o.main].name}が率いて残るか、村へ帰る）` : ''}</span>${pv.face ? `<span class="warn-text">${esc(st.generals[o.main].name)}は功績で勝るのに大将を譲り、面目を失う（恩−${FACE_ON}）</span>` : ''}${pv.rivals.length ? `<span class="warn-text">不仲の${esc(pv.rivals.map((g) => g.name).join('・'))}と同じ軍団になる（双方の恩−${RIVAL_ON}）</span>` : ''}</button>`;
  };
  openModal(`<h2 id="modal-title">合流　${esc(st.generals[a.main].name)}隊 と ${esc(st.generals[b.main].name)}隊</h2>
    <p class="lede">二つの軍団を一つにする。大将は身分の高いほう。同じ身分なら、当主・城持ち・一門・統率の高いほうの順に決まる（選び直せる）。入りきらない武将は、余った兵を率いて残るか、近くの城で待機する。この月の行動を使う。</p>
    <div class="il-opts naval-opts">${opt(keep, other, true)}${alt ? opt(alt, keep, false) : ''}</div>
    <div class="actions"><button class="act" data-act="close">やめる</button></div>`);
}
// 分遣の札: 主将のすぐ下の武将と、兵の割合を選ぶ
function openSplitSheet(st: GameState, a: Army) {
  const subs = directOf(st, a);
  openModal(`<h2 id="modal-title">${esc(st.generals[a.main].name)}隊を分ける</h2>
    <p class="lede">主将のすぐ下の武将を一人選び、その傘下ごと隣の空きマスに新しい軍団として独立させる。兵は分ける割合で。この月の行動を使う。</p>
    ${subs.map((g) => { const sub = treeOf(st, a).filter((x) => x.boss === g.id).length; return `<div class="split-row">${face(g.id, 40, 'face face-sm')}<div class="grow"><b>${esc(g.name)}</b><span class="hint" style="margin:0">　${esc(rankName(st, g))}・統率${g.lea}・武勇${g.bra}${sub ? `・傘下${sub}人` : ''}</span></div>
      ${[[1 / 3, '3分の1'], [1 / 2, '半分'], [2 / 3, '3分の2']].map(([f, l]) => `<button class="mini" data-act="split-do" data-id="${a.id}:${g.id}:${f}">兵${l}（${fmt(Math.round(a.troops * (f as number) / 100) * 100)}）</button>`).join('')}</div>`; }).join('')}
    <div class="actions"><button class="act" data-act="close">やめる</button></div>`);
}

// 唐入りの節目の場面（一度だけ）: 名護屋の陣・釜山上陸・義兵起つ・北の冬
const KSCENE: Record<string, { h: string; art: () => string; text: string; when: (st: GameState) => boolean }> = {
  nagoya: { h: '名護屋の陣', art: () => NAGOYA_ART, text: '肥前名護屋の丘を、諸大名の陣屋が埋めつくした。湾には大小の船がひしめく。全国から集った兵は風を待ち、一番隊の目は海の向こうを見つめている。', when: (st) => st.scenario === S1592.id && st.turn === st.karairi?.startTurn },
  busan: { h: '釜山上陸', art: () => BUSAN_ART, text: '夜明けの海を埋めた船団が釜山の湊に迫り、狼煙が上がった。釜山鎮は落ち、日の本の軍勢は朝鮮の地に足を踏み入れた。この先に何が待つのかを知る者はいない。', when: (st) => st.castles.find((c) => c.id === 'busan')?.owner === st.player },
  gihei: { h: '義兵起つ', art: () => GIHEI_ART, text: '国を奪われた民は黙っていなかった。儒者が檄を飛ばし、僧が経を置き、農民が鍬を取った。義兵は山と谷を知り尽くし、どこからともなく現れて道を断つ。', when: (st) => Object.values(st.armies).some((a) => a.clan === 'joseon' && (a.main.startsWith('gihei_') || ['gwak_jaeu', 'kim_cheonil', 'go_gyeongmyeong', 'hyujeong', 'yujeong'].includes(a.main))) },
  winter: { h: '北の冬', art: () => FUYU_ART, text: '北の冬は、日の本の兵が知る冬ではなかった。大河は凍り、兵糧は届かず、焚き火を囲む兵の数は日ごとに減っていく。', when: (st) => [11, 12, 1, 2].includes(st.month) && Object.values(st.armies).some((a) => a.clan === st.player && isForeignHex(a.hex) && ['hwanghae', 'pyongan', 'hamgyong', 'gangwon', 'liaodong'].includes(PROVINCES[HEXES[a.hex].p].id)) },
};
function karairiScenes(st: GameState) {
  const k = st.karairi;
  if (!k?.active || k.end || st.over) return;
  const el0 = document.getElementById('interlude');
  if (el0 && !el0.hidden) return;
  for (const [key, sc] of Object.entries(KSCENE)) {
    if ((k.seen ?? []).includes(key) || !sc.when(st)) continue;
    (k.seen ??= []).push(key);
    let el = document.getElementById('interlude');
    if (!el) { el = document.createElement('div'); el.id = 'interlude'; document.body.appendChild(el); el.addEventListener('click', onInterludeClick); }
    el.innerHTML = `<img class="end-art" src="${sc.art()}" alt=""><div class="end-veil"></div>
      <div class="end-text"><h1>${esc(sc.h)}<small>${esc(dateLabel(st))}</small></h1><p>${esc(sc.text)}</p>
      <div class="actions"><button class="act primary" data-act="il-close">続ける</button></div></div>`;
    el.hidden = false;
    return; // 一度に一つ
  }
}

function showGameOver() {
  mood('somber'); sfx('lose');
  const st = s!;
  const win = st.over === 'win';
  if (st.karairi?.end) { showKarairiEnd(st); return; }
  if (win) { showEnding(st); return; }
  openModal(`<div class="opening"><h1 id="modal-title">${win ? '天下統一' : '落日'}<small>${esc(dateLabel(st))}</small></h1>
    <p>${win ? `${esc(st.clans[st.player].name)}家は全国${domesticCount(st)}城を制し、戦国の世を終わらせた。` : `${esc(st.clans[st.player].name)}家は最後の城を失った。`}</p>
    <div class="actions"><button class="act primary" data-act="newgame">新しく始める</button><button class="act" data-act="close">地図を見る</button></div></div>`, true);
}

function onModalClick(e: Event) {
  const btn = (e.target as HTMLElement).closest('button[data-act]') as HTMLButtonElement | null;
  if (!btn) return;
  const act = btn.dataset.act!, id = btn.dataset.id ?? '';
  if (act === 'naval') { const r = navalResolve; navalResolve = null; closeModal(); r?.(id as NavalChoice); return; }
  if (act === 'ask-yes' || act === 'ask-no') { const r = askResolve; askResolve = null; closeModal(); r?.(act === 'ask-yes'); return; }
  if (act === 'close') { closeModal(); return; }
  if (act === 'newgame') { store(AUTO_KEY, null); s = null; openTitle(); return; }
  if (act === 'end-next') { if (s) openInterlude(s); return; }
  if (act === 'end-new' || act === 'end-close') { $('ending').hidden = true; if (act === 'end-new') { store(AUTO_KEY, null); s = null; openTitle(); } return; }
  if (!s) return;
  const st = s;
  if (act === 'offer-hire' || act === 'offer-refuse') {
    const g = st.generals[id];
    if (act === 'offer-hire') { if (hire(st, g, st.player)) { toast(`${g.name}を召し抱えた`); cutin(st, g, 'offerHire'); } } else { refuse(st, g, st.player); toast(`${g.name}の仕官を断った`); cutin(st, g, 'offerRefused'); }
    refresh();
    reopen();
    return;
  }
  if (act === 'mis-allow' || act === 'mis-ban' || act === 'mis-hold') {
    const m = missionaryFor(st);
    answerMission(st, act === 'mis-allow' ? 'allow' : act === 'mis-ban' ? 'ban' : 'hold');
    if (m) cutinLine(st, envoyLine(st, act === 'mis-allow' ? 'misAllow' : act === 'mis-ban' ? 'misBan' : 'misHold', m));
    refresh();
    reopen();
    return;
  }
  if (act === 'mission-set') { const p = id as 'allow' | 'ban'; if (!missionBlock(st, st.player, p)) { const m = missionaryFor(st); setMission(st, st.player, p); toast(p === 'allow' ? '領内での布教を許した' : '切支丹を禁じた'); if (m) cutinLine(st, envoyLine(st, p === 'allow' ? 'misAllow' : 'misBan', m)); } refresh(); openMenu(); return; }
  const capitan = (scene: EnvoyScene, vars: Record<string, string>) => { if (shipTalk === st.turn && scene !== 'shipItem') return; shipTalk = st.turn; cutinLine(st, envoyLine(st, scene, { id: 'capitan', name: '南蛮船のカピタン' }, vars)); };
  if (act === 'ship-guns') { const n = buyShipGuns(st, st.player, +id); if (n) { toast(`南蛮の鉄砲${fmt(n)}丁を買った`); capitan('shipGuns', { n: fmt(n) }); } refresh(); openMenu(); return; }
  if (act === 'ship-cannon') { if (buyShipCannon(st, st.player, 1)) { toast('大筒1門を買った'); capitan('shipCannon', {}); } refresh(); openMenu(); return; }
  if (act === 'ship-item') { const it = st.items[id]; if (it && buyShipItem(st, st.player, id)) { toast(`「${it.name}」を手に入れた`); capitan('shipItem', { item: it.name }); } refresh(); openMenu(); return; }
  if (act === 'arm-cannon-m' || act === 'unarm-cannon-m') { const a = st.armies[+id]; if (a && nearOwn(st, a)) armCannon(st, a, act === 'arm-cannon-m' ? R.CANNON_MAX : -(a.cannon ?? 0)); refresh(); openMenu(); return; }
  if (act === 'ronin-m') { const g = st.generals[id]; const ok = recruitRonin(st, g, st.player); toast(ok ? `${g.name}が仕官した` : `${g.name}は仕官を断った`); cutin(st, g, ok ? 'roninYes' : 'roninNo'); refresh(); openMenu(); return; }
  if (act === 'gen') { openGeneral(id, menuShown); return; }
  if (act === 'gen-back') { openMenu(); return; }
  if (act === 'rakuichi') { const c = st.castles[+id]; const why = rakuichiBlock(st, c); if (why) toast(why); else { enactRakuichi(st, c); toast(`${c.name}に楽市楽座を布いた`); } refresh(); reopen(); return; }
  if (act === 'kan-up') { const g = st.generals[id]; if (g) { const why = kanBlock(st, g); if (why) toast(why); else { recommendKan(st, g); toast(`${g.name}が${kanName(g)}に任じられた`); cutin(st, g, 'ninkan', { kan: kanName(g) }); } } refresh(); reopen(); return; }
  if (act === 'sgd-off') { const g = st.generals[id]; if (g) { dismissShugodai(st, g); toast(`${g.name}の守護代を解いた`); } refresh(); reopen(); return; }
  if (act === 'fief-grant') {
    const gid = ($('modal-body').querySelector('#sel-fief-gen') as HTMLSelectElement | null)?.value, ci = ($('modal-body').querySelector('#sel-fief-castle') as HTMLSelectElement | null)?.value;
    const g = gid ? st.generals[gid] : undefined, c = ci ? st.castles[+ci] : undefined;
    if (g && c) { const why = grantBlock(st, g, c); if (why) toast(why); else { grantCastle(st, g, c); toast(`${g.name}に${c.name}を与えた`); cutin(st, g, 'chigyo', { castle: c.name }); } }
    refresh(); reopen(); return;
  }
  if (act === 'yoriki-open') { yorikiFor = yorikiFor === +id ? null : +id; reopen(); return; }
  if (act === 'yoriki-off') { const f = frontById(st, +id); if (f) { setFrontBoss(st, f, null); toast(`${frontName(st, f)}は与力を離れ、自らの方針で動く`); } refresh(); reopen(); return; }
  if (act === 'yoriki-apply') {
    const f = frontById(st, +id);
    if (f) {
      const on = new Set(Array.from($('modal-body').querySelectorAll<HTMLInputElement>('input[name="yoriki"]:checked'), (x) => +x.value));
      let add = 0, del = 0;
      for (const x of frontsOf(st)) {
        if (x.id === f.id || x.vacant) continue;
        if (on.has(x.id) && x.boss !== f.id) { setFrontBoss(st, x, f); add++; }
        else if (!on.has(x.id) && x.boss === f.id) { setFrontBoss(st, x, null); del++; }
      }
      yorikiFor = null;
      toast(add || del ? `${frontName(st, f)}の与力: ${add ? `${add}人を付け` : ''}${add && del ? '、' : ''}${del ? `${del}人を外した` : ''}` : '与力は変わらない');
    }
    refresh(); reopen(); return;
  }
  if (act === 'fief-remove') { const c = st.castles[+id], f = frontOfCastle(st, c); if (f) { removeCastle(st, f, c); toast(`${c.name}を召し上げた`); } refresh(); reopen(); return; }
  if (act === 'fief-direct') { const g = st.generals[id]; if (g?.liege) { makeDirect(st, g); toast(`${g.name}を直参に引き上げた`); } refresh(); reopen(); return; }
  if (act === 'fief-heir') { const f = frontById(st, +id), v = ($('modal-body').querySelector(`#sel-heir-${id}`) as HTMLSelectElement | null)?.value; const g = v ? st.generals[v] : undefined; if (f && g && setHeir(st, f, g)) { toast(`${g.name}に領を継がせた`); cutin(st, g, 'chigyo', { castle: st.castles[f.seat ?? f.castles[0]].name }); } refresh(); reopen(); return; }
  if (act === 'open-fiefs') { openMenu('jinji', 'fronts'); return; }
  if (act === 'front-off') { const f = frontById(st, +id); if (f) { if (f.vacant) dissolveFront(st, f, '（召し上げて直轄に）'); else { const n = frontName(st, f); for (const i of [...f.castles]) removeCastle(st, f, st.castles[i], true); toast(`${n}をすべて召し上げた`); } } refresh(); reopen(); return; }
  if (act === 'rw-kanjo' || act === 'rw-kazo' || act === 'rw-promote') {
    const g = st.generals[id];
    if (g) {
      const ok = act === 'rw-kanjo' ? kanjo(st, g) : act === 'rw-kazo' ? kazo(st, g) : promoteOne(st, g);
      if (ok) { toast(act === 'rw-kanjo' ? `${g.name}に感状を与えた` : act === 'rw-kazo' ? `${g.name}に加増した` : `${g.name}を${R.RANK_NAME[g.rank]}に取り立てた`); cutin(st, g, act === 'rw-kanjo' ? 'kanjo' : act === 'rw-kazo' ? 'reward' : 'promote', { rank: R.RANK_NAME[g.rank] }); }
    }
    refresh();
    reopen();
    return;
  }
  if (['kan-yes', 'kan-no', 'ret-yes', 'ret-no', 'qr-seppuku', 'qr-exile', 'qr-let'].includes(act)) {
    if (act === 'kan-yes' || act === 'kan-no') answerKan(st, act === 'kan-yes');
    else if (act === 'ret-yes' || act === 'ret-no') { const g = st.returnOffer ? st.generals[st.returnOffer.gen] : undefined; answerReturn(st, act === 'ret-yes'); if (g && act === 'ret-yes') cutin(st, g, 'offerHire'); }
    else judgeQuarrel(st, act === 'qr-seppuku' ? 'seppuku' : act === 'qr-exile' ? 'exile' : 'let');
    refresh();
    reopen();
    return;
  }
  // 取り返しのつかないものは二度押し
  if (act === 'exile' || act === 'usurp') { btn.dataset.act = act + '-ok'; btn.textContent = act === 'exile' ? 'もう一度押すと追放する' : 'もう一度押すと名乗る（取り消せない）'; btn.classList.add('warn'); return; }
  if (act === 'exile-ok') { const g = st.generals[id]; if (g) { cutin(st, g, 'exiled'); exile(st, g); toast(`${g.name}を追放した`); refresh(); } genShown = null; openMenu(); return; }
  if (act === 'usurp-ok') { usurp(st, st.player); toast('官を自ら名乗った'); refresh(); openMenu(); return; }
  if (act.startsWith('bk-')) {
    const say = (scene: EnvoyScene, g: General | undefined, vars: Record<string, string> = {}) => { if (g) cutinLine(st, envoyLine(st, scene, g, vars)); };
    if (act === 'bk-donate') { const g = toritsugi(st); if (donate(st, st.player)) { toast('将軍に献金した'); say('bkDonate', g); } }
    if (act === 'bk-sponsor') { if (sponsor(st, st.player)) { toast('足利一門を将軍に立てた'); if (st.events?.length && eventsOn()) { refresh(); playEvents(st, () => openMenu()); return; } say('bkSponsor', shogunGen(st)); } }
    if (act === 'bk-order') { const v = ($('modal-body').querySelector('#sel-order') as HTMLSelectElement | null)?.value; if (v) { const g = shogunGen(st); const r = requestOrder(st, st.player, v); if (r !== null) { toast(r ? `${clanName(st, v)}家討伐の御内書を得た` : '御内書は下されなかった'); say(r ? 'bkOrderYes' : 'bkOrderNo', g, { foe: clanName(st, v) }); } } }
    if (act === 'bk-post') { const [k, v] = id.split(':'); const p: Post = k === 'o' ? { kind: 'office', id: v as OfficeId } : k === 's' ? { kind: 'shugo', prov: v } : { kind: 'shoban' }; const g = shogunGen(st); const r = requestPost(st, st.player, p); if (r !== null) { toast(r ? `${postName(p)}に任じられた` : `${postName(p)}の任官は退けられた`); say(r ? 'bkPostYes' : 'bkPostNo', g, { post: postName(p) }); } }
    if (act === 'bk-demand') { const g = leaderGen(st, id); const ok = demandShussi(st, st.player, id); toast(ok ? `${clanName(st, id)}家が出仕した` : `${clanName(st, id)}家は出仕を拒んだ`); say(ok ? 'bkDemandYes' : 'bkDemandNo', g); }
    if (act === 'bk-shussi') { const g = leaderGen(st, id); doShussi(st, st.player, id); toast(`${clanName(st, id)}家に出仕した`); say('bkShussi', g); }
    refresh(); openMenu(); return;
  }
  if (act === 'shioki') {
    const [ci, k] = id.split(':'); const c = st.castles[+ci];
    if (c && c.owner === st.player && shiokiPending(st).some((p) => p.castle === c.i)) { applyShioki(st, c, k as R.Shioki); toast(`${c.name}: ${R.SHIOKI_NAME[k as R.Shioki]}`); }
    refresh();
    reopen();
    return;
  }
  if (act === 'rtab' && reportShown) { showReports(reportShown[0], reportShown[1], reportShown[2], id as 'todo' | 'news'); return; }
  if (act === 'rnews' && reportShown) { newsAll = !newsAll; showReports(reportShown[0], reportShown[1], reportShown[2], 'news'); return; }
  if (act === 'battle-style') { const ks = Object.keys(UNIT_STYLE_NAME) as UnitStyle[]; setBattleStyle(ks[(ks.indexOf(getBattleStyle()) + 1) % ks.length]); openMenu(); return; }
  if (act === 'army-style') { view.armyStyle = view.armyStyle === 'hayashi' ? 'round' : 'hayashi'; try { localStorage.setItem('sengoku-armystyle', view.armyStyle); } catch { /* 保存できなくても続ける */ } view.redraw(); openMenu(); return; }
  if (act === 'cutin-toggle') { try { localStorage.setItem(CUTIN_KEY, cutinOn() ? 'off' : 'on'); } catch { /* 保存できなくても続ける */ } openMenu(); return; }
  if (act === 'vsort') {
    // 身分は上から、数値は高い順、文字は五十音順を初めの向きにする
    const first: 1 | -1 = btn.dataset.num === '1' ? -1 : 1;
    vasSort = !id ? null : vasSort?.key === id ? { key: id, dir: (vasSort.dir * -1) as 1 | -1 } : { key: id, dir: first };
    openMenu(); return;
  }
  if (act === 'mtab') { openMenu(id as MenuKey); return; }
  if (act === 'stab') { openMenu(curMenu, id); return; }
  if (act === 'kr-peace') { const ok = seekPeace(st); toast(ok ? '和議が成った' : '和議は流れた'); refresh(); if (st.over) { closeModal(); showGameOver(); } else openMenu(); return; }
  if (act === 'kr-withdraw') { btn.dataset.act = 'kr-withdraw-ok'; btn.textContent = 'もう一度押すと撤兵する（取った城を捨てる）'; btn.classList.add('warn'); return; }
  if (act === 'kr-withdraw-ok') { withdraw(st); refresh(); closeModal(); showGameOver(); return; }
  if (act === 'merge-do') { const [k, o] = id.split(':').map(Number); const keep = st.armies[k], other = st.armies[o]; if (keep && other && !mergeBlock(st, keep, other)) { mergeArmies(st, keep, other); toast(`${st.generals[keep.main].name}隊に合流した`); select({ kind: 'army', id: keep.id }); } closeModal(); refresh(); return; }
  if (act === 'split-do') { const [aid, gid, f] = id.split(':'); const a = st.armies[+aid], g = st.generals[gid]; const b = a && g ? splitArmy(st, a, g, +f) : null; if (b) { toast(`${g.name}隊が分かれた`); select({ kind: 'army', id: b.id }); } closeModal(); refresh(); return; }
  if (act === 'corps-open') { const k = +id; if (corpsOpen.has(k)) corpsOpen.delete(k); else corpsOpen.add(k); reopen(); return; }
  if (act === 'corps-all') { corpsAll = id === '1'; reopen(); return; }
  if (act === 'corps-fill-all') {
    let n = 0, k = 0;
    for (const a of clanArmies(st, st.player).filter((x) => !x.ikki && !delegatedArmy(st, x)).sort((x, y) => y.troops - x.troops)) { if (fillBlock(st, a)) continue; const got = fillArmy(st, a).length; if (got) { n += got; k++; } }
    toast(n ? `${k}隊に${n}人を配属した` : '入れられる武将がいなかった'); refresh(); openMenu(); return;
  }
  if (act === 'vfilter') { if (id === 'reset') vasFilter = { role: 'all', q: '', rank: '', page: 1 }; else { vasFilter.role = id; vasFilter.page = 1; } reopen(); return; }
  if (act === 'vmore') { vasFilter.page++; reopen(); return; }
  if (act === 'cast-filter') { castFilter = id; reopen(); return; }
  if (act === 'army-filter') { armyFilter = id; reopen(); return; }
  if (act === 'tax') { setTax(st, st.player, id as Tax); toast(`年貢の率を${TAX[id as Tax].name}にした`); refresh(); reopen(); return; }
  if (act === 'inv-bulk') {
    const role = id as InvestRole;
    let budget = Math.floor(st.clans[st.player].gold * +((document.getElementById('inv-budget') as HTMLSelectElement | null)?.value ?? 0.3)), n = 0, spent = 0;
    for (let round = 0; round < 20; round++) {
      const cs = clanCastles(st, st.player).filter((c) => !investBlock(st, st.player, c, role) && investCost(c, role) <= budget).sort((a, b) => (role === 'agri' ? a.dev - b.dev : a.cdev - b.cdev));
      if (!cs.length) break;
      for (const c of cs) { const k = investCost(c, role); if (k > budget) continue; if (invest(st, st.player, c, role)) { budget -= k; spent += k; n++; } }
    }
    toast(n ? `${n}度投じた（${fmt(spent)}貫）` : '投じられる城がなかった'); refresh(); reopen(); return;
  }
  if (act === 'snd-music') { setSound({ music: !soundSettings().music }); reopen(); return; }
  if (act === 'snd-sfx') { setSound({ sfx: !soundSettings().sfx }); reopen(); if (soundSettings().sfx) sfx('ponn'); return; }
  if (act === 'events-toggle') { try { localStorage.setItem(EVENTS_KEY, eventsOn() ? 'off' : 'on'); } catch { /* 記録できなくても続ける */ } reopen(); return; }
  if (act === 'opening-toggle') { setOpeningOn(!openingOn()); reopen(); return; }
  if (act === 'rw-all') { rwAll = id === '1'; rwPage = 1; reopen(); return; }
  if (act === 'rw-more') { rwPage++; reopen(); return; }
  if (act === 'rw-bulk-kanjo' || act === 'rw-bulk-kazo' || act === 'rw-bulk-promote') {
    const list = rewardWaiting(st);
    let n = 0, spent = 0;
    if (act === 'rw-bulk-kanjo') for (const g of list) { if (dueOf(g) > 0 && kanjo(st, g)) n++; }
    if (act === 'rw-bulk-kazo') {
      const r = +((document.getElementById('rw-budget') as HTMLSelectElement | null)?.value ?? 0.3);
      let budget = Math.floor(st.clans[st.player].gold * r);
      for (const g of list.filter((x) => dueOf(x) > 0)) { const c = kazoCost(g); if (c > budget) continue; if (kazo(st, g)) { n++; budget -= c; spent += c; } }
    }
    if (act === 'rw-bulk-promote') for (const g of list) { if (promoteOne(st, g)) n++; }
    toast(n ? (act === 'rw-bulk-kanjo' ? `${n}人に感状を与えた` : act === 'rw-bulk-kazo' ? `${n}人に加増した（${fmt(spent)}貫）` : `${n}人を取り立てた`) : 'できる者がいなかった');
    refresh(); reopen(); return;
  }
  if (act === 'corps-fill') { const a = st.armies[+id]; if (a) { const n = fillArmy(st, a).length; toast(n ? `${n}人を配属した` : '入れられる武将がいなかった'); } refresh(); openMenu(); return; }
  if (act === 'ninja-do') {
    const tg = ninjaTargetOf(st), head = ninjaHead(st, st.player), kind = ninjaSel.act;
    const c0 = tg.castle ? { chian: tg.castle.chian, store: tg.castle.store ?? 0, gov: tg.castle.governor ? st.generals[tg.castle.governor] : null, on: tg.castle.governor ? st.generals[tg.castle.governor].on ?? 0 : 0 } : null;
    const r = ninjaDo(st, st.player, kind, tg);
    const msg = r === 'ok' ? `${NINJA_NAME[kind]}は成った` : r === 'caught' ? '忍びが捕らわれた' : r === 'fail' ? `${NINJA_NAME[kind]}はしくじった` : 'できない';
    ninjaSel.target = '';
    if (!r || !head) { toast(msg); refresh(); if (!st.over) openMenu(); return; }
    closeModal(); refresh(); mood('somber');
    playScene(view, st, `忍び ― ${NINJA_NAME[kind]}`, withBg(ninjaBeats(st, kind, head, tg, r, c0), ({ assassinate: 'tsukiyo', rumor: 'ichi', arson: 'night_fire', spy: 'zashiki_night' } as Record<NinjaAct, string>)[kind]), (id, w) => face(id, w), () => { mapMood(st); toast(msg); refresh(); });
    return;
  }
  if (act === 'tea-do') {
    const g = st.generals[teaHost];
    const on0 = new Map(Object.values(st.generals).map((x) => [x.id, x.on ?? 0]));
    const gs2 = g ? teaCeremony(st, g) : [];
    if (!g || !gs2.length) { toast('茶会を開けない'); refresh(); openMenu(); return; }
    closeModal(); refresh();
    mood('title'); // 静かな曲に
    playScene(view, st, '茶会', withBg(teaBeats(st, g, gs2, on0), 'chashitsu'), (id, w) => face(id, w), () => { mapMood(st); toast(`茶会で${gs2.length}人をもてなした`); refresh(); });
    return;
  }
  if (act === 'fushin') { const c = st.castles[+id]; if (c && fushin(st, c)) toast(`${c.name}を改めた`); refresh(); openMenu(); return; }
  if (act === 'kr-build') { if (buildShips(st)) toast(`船${K.BUILD_SHIPS}艘を造った`); refresh(); openMenu(); return; }
  if (act === 'sub') { lastSub[lastTab[curMenu]] = id; openMenu(); document.querySelector('#modal .sheet')!.scrollTop = 0; return; }
  if (act === 'dip-open') { dipFocus = id; openMenu(curMenu, 'gaike'); document.querySelector('#modal .sheet')!.scrollTop = 0; return; }
  if (act === 'dip-filter') { dipAll = id === 'all'; openMenu(curMenu, 'gaike'); return; }
  if (act === 'dip-back') { dipFocus = null; openMenu(curMenu, 'gaike'); return; }
  if (act === 'goto-army') { const a = st.armies[+id]; if (a) { closeModal(); view.centerOn(a.hex); select({ kind: 'army', id: a.id }); } return; }
  if (act === 'goto-castle') { const c = st.castles[+id]; if (c) { closeModal(); view.centerOn(c.hex); select({ kind: 'castle', i: c.i }); } return; }
  if (act === 'corps-out') { const g = st.generals[id]; const army = g?.army !== null && g ? st.armies[g.army!] : null; if (g && army) { const off: General[] = []; leaveArmy(st, g, off); const c = castleAt(st, army.hex)?.owner === st.player ? castleAt(st, army.hex)! : st.castles.find((x) => x.owner === st.player && NEIGHBORS[army.hex].includes(x.hex)); for (const h of [g, ...off]) { h.status = 'free'; if (c) h.loc = c.i; } toast(`${g.name}を軍団から外した${off.length ? `（${off.map((h) => h.name).join('・')}も城へ戻った）` : ''}`); } refresh(); openMenu(); return; }
  if (act === 'gov-out') { const c = st.castles[+id]; if (c.governor) { st.generals[c.governor].status = 'free'; c.governor = null; } refresh(); reopen(); return; }
  if (act === 'open-corps-m') { openMenu('gunji', 'corps'); return; }
  if (act === 'hire-ashi-m') { const a = st.armies[+id]; if (a) { const n = hireAshi(st, a, R.ASHI_STEP); if (n) toast(`${st.generals[a.main].name}隊に足軽${fmt(n)}人を雇った`); } refresh(); openMenu(); return; }
  if (act === 'arm-guns-m' || act === 'unarm-guns-m') { const a = st.armies[+id]; if (a && nearOwn(st, a)) armGuns(st, a, act === 'arm-guns-m' ? gunCap(a) : -(a.guns ?? 0)); refresh(); openMenu(); return; }
  if (act === 'rice-buy' || act === 'rice-sell') { const n = +id; if ((act === 'rice-buy' ? buyRice : sellRice)(st, st.player, n)) merchantSay(st, riceMerchant(st), act === 'rice-buy' ? 'mRiceBuy' : 'mRiceSell', { n: fmt(n) }, n >= 10000); refresh(); openMenu(); return; }
  if (act === 'deleg') { const dg = delegateOf(st); const k = id as DelegateKey; dg[k] = !dg[k]; toast(`${DELEGATE_NAME[k]}を${dg[k] ? '委任した' : '自分で行う'}`); refresh(); openMenu(); return; }
  if (act === 'court-buy') { if (buyCourt(st, st.player)) { toast(`${courtName(st, st.player)}に任じられた`); if (st.events?.length && eventsOn()) { refresh(); playEvents(st, () => openMenu()); return; } courtSay(st, courtOf(st, st.player)); } refresh(); openMenu(); return; }
  if (act === 'gun-buy') { if (buyGuns(st, st.player, +id)) { toast(`鉄砲${fmt(+id)}丁を買った`); merchantSay(st, 'imai_sokyu', 'mGuns', { n: fmt(+id) }, +id >= 300); } refresh(); openMenu(); return; }
  if (act === 'item-buy') { const it = st.items[id]; if (it && buyItem(st, st.player, it)) { toast(`「${it.name}」を手に入れた`); const tea = it.kind === 'tea'; merchantSay(st, tea && personaActive('sen_soeki', st.year) ? 'sen_soeki' : 'tsuda_sogyu', tea ? 'mTea' : 'mItem', { item: it.name }, true); } refresh(); openMenu(); return; }
  if (act === 'dip') {
    const kind = btn.dataset.kind as DipKind;
    const name = clanName(st, id);
    const lead = st.clans[id].leader ? st.generals[st.clans[id].leader!] : undefined;
    const r = propose(st, kind, st.player, id, dipGift);
    if (r === 'accepted' && st.events?.length && eventsOn()) { if (dipGift && st.items[dipGift]?.clan !== st.player) dipGift = null; afterAction(); refresh(); playEvents(st, () => { toast(kind === 'surrender' ? `${name}家が降った！` : `${name}家と${DIP_NAME[kind]}を結んだ`); if (!st.over) openMenu(); }); return; } // 降伏・同盟・婚姻が成れば、その場で場面を
    if (r) cutin(st, lead, (kind === 'surrender' ? 'surrender' : kind === 'marriage' ? 'marriage' : 'alliance') + (r === 'accepted' ? 'Yes' : 'No') as Scene, { foe: name });
    if (dipGift && st.items[dipGift]?.clan !== st.player) dipGift = null;
    toast(r === 'accepted' ? (kind === 'surrender' ? `${name}家が降った！` : `${name}家と${DIP_NAME[kind]}を結んだ`) : `${name}家は${DIP_NAME[kind]}を退けた`);
    afterAction(); refresh();
    if (!st.over) openMenu();
    return;
  }
  if (act === 'dip-break') { breakTreaty(st, st.player, id); refresh(); openMenu(); return; }
  if (act === 'save') { toast(store(SAVE_KEY, JSON.stringify(st)) ? '保存した' : '保存できなかった（ブラウザの保存領域が使えない）'); openMenu(); return; }
  if (act === 'load') { const sv = load(SAVE_KEY); if (sv) { startWith(sv); toast('読み込んだ'); } return; }
  const g = st.generals[id];
  if (!g) return;
  if (act === 'bugyo-role') { const r = roleOf(g); g.role = r === 'agri' ? 'com' : r === 'com' ? 'hyoro' : 'agri'; toast(`${g.name}を${ROLE_NAME[g.role]}の担当にした`); refresh(); reopen(); return; }
  if (act === 'bugyo-on' || act === 'bugyo-off') {
    if (act === 'bugyo-on' && canBugyo(st, g)) return;
    setBugyo(st, g, act === 'bugyo-on');
    toast(act === 'bugyo-on' ? `${g.name}を奉行に任じた` : `${g.name}を奉行から外した`);
    refresh(); reopen(); return;
  }
  if (act === 'tsukai-on' || act === 'tsukai-off') {
    if (act === 'tsukai-on' && canTsukai(st, g)) return;
    setTsukai(st, g, act === 'tsukai-on');
    toast(act === 'tsukai-on' ? `${g.name}を${tsukaiLabel(st.player)}に加えた` : `${g.name}を${tsukaiLabel(st.player)}から外した`);
    refresh(); reopen(); return;
  }
  if (act === 'cap-recruit') { g.triedTurn = st.turn; const foe = g.formerClan ? clanName(st, g.formerClan) : '旧主'; const ok = recruit(st, g); toast(ok ? `${g.name}が仕官した` : `${g.name}は登用を拒んだ`); cutin(st, g, ok ? 'recruitYes' : 'recruitNo', { foe }); }
  if (act === 'cap-release') { const foe = g.formerClan ? clanName(st, g.formerClan) : '旧主'; release(st, g); toast(`${g.name}を解放した`); cutin(st, g, 'release', { foe }); }
  if (act === 'cap-execute') { const foe = g.formerClan ? clanName(st, g.formerClan) : '旧主'; cutin(st, g, 'execute', { foe }); execute(st, g, st.player); }
  refresh();
  reopen();
}

declare global {
  interface Window { claude?: { hot?: { snapshot?: (f: () => unknown) => void; ready?: (f: (d: unknown) => void) => void; data?: unknown } }; }
}
