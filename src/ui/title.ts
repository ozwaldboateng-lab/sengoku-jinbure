// タイトル画面「陣触 ― 戦国群雄記」: 最初の画面 → 時代を選ぶ → 家を選ぶ（地図の上で）。遊び方もここから読める
import { blurbOf, ERA_NAME } from '../data/blurbs';
import { FEATURED } from '../data/roster';
import { SCENARIOS, scenarioOf } from '../data/scenarios';
import { HEXES } from '../engine/map';
import { OPENINGS } from '../data/openings';
import * as R from '../engine/rules';
import { newGame } from '../engine/setup';
import { newKarairiGame, S1592 } from '../engine/s1592';
import { capital } from '../engine/ops';
import { clanCastles, clanKoku, clanTroops, hexOwner } from '../engine/state';
import type { GameState } from '../engine/types';
import { MapView } from './render';

export interface TitleDeps {
  auto: GameState | null; // 続きから（自動保存）
  autoLabel: string;
  help: (st: GameState) => string;
  face: (id: string | null | undefined, w: number) => string;
  start: (clan: string, diff: R.Difficulty, scen: string) => void;
  resume: () => void;
}

const esc = (x: string) => x.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const fmt = (n: number) => Math.round(n).toLocaleString('ja-JP');
const man = (k: number) => `${k.toFixed(1)}万石`; // clanKoku は万石
const kanjiNum = (n: number) => [...String(n)].map((d) => '〇一二三四五六七八九'[+d]).join('');
const ERA_KANJI: Record<string, string> = { '1552': '天文二十一年', '1560': '永禄三年', '1582': '天正十年', '1592': '文禄元年' };
// 唐入りを決めたことがあれば、タイトルに「文禄元年 唐入り」が出る
const karairiUnlocked = () => { try { return !!localStorage.getItem('sengoku-karairi'); } catch { return false; } };
const DIFF_NOTE: Record<R.Difficulty, string> = { easy: 'AIは慎重に攻め、動員も控えめ。', normal: '標準。', hard: 'AIは攻め気が強く、囲みを狙う。', veryhard: 'AIの見積もりが鋭く、隙を見逃さない。' };

type Screen = 'top' | 'era' | 'clan' | 'help' | 'opening';
let view: MapView | null = null;
let screen: Screen = 'top';
let scen = '1560';
let pick = 'oda';
let diff: R.Difficulty = 'normal';
let preview: GameState | null = null;
let deps: TitleDeps | null = null;
let wired = false;

const $ = (id: string) => document.getElementById(id)!;

export function openTitleScreen(d: TitleDeps) {
  deps = d;
  const root = $('title');
  root.hidden = false;
  if (!wired) {
    wired = true;
    root.addEventListener('click', onClick);
    root.addEventListener('change', (e) => {
      const el = e.target as HTMLSelectElement;
      if (el.id === 'ttl-other' && el.value) choose(el.value, true);
    });
    document.addEventListener('keydown', (e) => {
      if (!$('title').hidden && screen === 'opening' && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight')) { e.preventDefault(); e.stopImmediatePropagation(); nextBeat(); return; }
      if ($('title').hidden || e.key !== 'Escape') return;
      e.stopImmediatePropagation();
      back();
    }, true);
  }
  if (!view) {
    view = new MapView($('ttl-map') as HTMLCanvasElement);
    view.onHexClick = (hex) => {
      if (screen !== 'clan' || !preview) return;
      const o = hexOwner(preview, hex);
      if (o && preview.clans[o]?.alive) choose(o, false);
    };
  }
  setPreview();
  go('top');
}
export const titleOpen = () => !$('title').hidden;
export function closeTitleScreen() { $('title').hidden = true; }

function setPreview() {
  preview = scen === S1592.id ? newKarairiGame('normal', 1) : newGame('oda', 'normal', 1, scen);
  if (scen === S1592.id) pick = 'hashiba';
  if (!preview.clans[pick]?.alive) pick = 'oda';
  view!.state = preview;
  view!.highlight = null;
}

function go(sc: Screen) {
  screen = sc;
  const root = $('title');
  root.dataset.screen = sc;
  render();
  // 地図: 最初の画面と時代選びは暗く沈めて流す、家選びでは触れる
  const v = view!;
  requestAnimationFrame(() => {
    v.resize();
    if (sc === 'clan') { v.highlight = pick; focusClan(); } else { v.highlight = null; v.centerOn(centerHex(), fitScale()); }
    v.invalidate();
  });
}
const centerHex = () => { const c = preview && capital(preview, 'ashikaga'); return c ? c.hex : Math.floor(HEXES.length / 2); };
const fitScale = () => { const w = view!.w || window.innerWidth; return Math.max(0.5, Math.min(1.3, w / 1100)); };
function focusClan() {
  const v = view!, st = preview!;
  const c = capital(st, pick) ?? clanCastles(st, pick)[0];
  if (!c) return;
  const narrow = window.innerWidth <= 760;
  v.centerOn(c.hex, narrow ? 1.5 : 1.7);
  // 横の札（広い画面）・下の札（狭い画面）に隠れないよう寄せる
  if (narrow) v.oy -= v.h * 0.18; else v.ox -= 190;
  v.redraw();
}

function choose(id: string, move: boolean) {
  pick = id;
  view!.highlight = id;
  if (move) focusClan(); else view!.invalidate();
  render();
}

function back() {
  if (screen === 'opening') { endOpening(); return; }
  if (screen === 'clan') go('era');
  else if (screen === 'era' || screen === 'help') go('top');
}

function onClick(e: Event) {
  const btn = (e.target as HTMLElement).closest('[data-act]') as HTMLElement | null;
  if (!btn || !deps) return;
  const act = btn.dataset.act!, id = btn.dataset.id ?? '';
  if (act === 't-new') go('era');
  else if (act === 't-continue') { closeTitleScreen(); deps.resume(); }
  else if (act === 't-help') go('help');
  else if (act === 't-back') back();
  else if (act === 'pick-scen') { scen = id; setPreview(); if (OPENINGS[scen]?.length && openingOn() && !opSeen.has(scen)) { opSeen.add(scen); startOpening(); } else go('clan'); } // 時代を選んだら、まず序幕（同じ時代は一度だけ）
  else if (act === 'pick-clan') choose(id, true);
  else if (act === 'pick-diff') { diff = id as R.Difficulty; render(); }
  else if (act === 'start') { closeTitleScreen(); deps.start(pick, diff, scen); }
  else if (act === 'op-next') nextBeat();
  else if (act === 'op-skip') endOpening();
}

function render() {
  const body = $('ttl-body');
  if (screen === 'opening') { body.innerHTML = openingHtml(); body.scrollTop = 0; $('title').scrollTop = 0; return; } // 押した札へのフォーカスで画面がずれないよう戻す
  if (screen === 'top') body.innerHTML = topHtml();
  else if (screen === 'era') body.innerHTML = eraHtml();
  else if (screen === 'help') body.innerHTML = `<div class="ttl-help"><button type="button" class="ttl-back" data-act="t-back">← 戻る</button><h2>遊び方</h2>${deps!.help(preview!)}</div>`;
  else {
    const keep = body.querySelector('.ttl-feat')?.scrollTop ?? 0;
    body.innerHTML = clanHtml();
    const f = body.querySelector('.ttl-feat'); if (f) f.scrollTop = keep;
  }
}

function brand(small = false) {
  return `<div class="ttl-brand${small ? ' small' : ''}"><h1 id="ttl-name"><ruby>陣触<rt>じんぶれ</rt></ruby></h1><div class="ttl-seal" aria-label="戦国群雄記">戦国群雄記</div></div>`;
}

function topHtml() {
  const d = deps!;
  return `${brand()}
  <nav class="ttl-menu" aria-label="タイトル">
    <button type="button" class="ttl-item" data-act="t-new"><b>新しく始める</b><span>時代と家を選んで出陣する</span></button>
    ${d.auto ? `<button type="button" class="ttl-item" data-act="t-continue"><b>続きから</b><span>${esc(d.autoLabel)}</span></button>` : ''}
    <button type="button" class="ttl-item" data-act="t-help"><b>遊び方</b><span>操作・用語・仕組み</span></button>
  </nav>
  <p class="ttl-foot">戦の前に兵を召し集める触れを「陣触」という。</p>`;
}

function eraHtml() {
  return `<div class="ttl-era">
    <button type="button" class="ttl-back" data-act="t-back">← 戻る</button>
    <h2>時代を選ぶ</h2>
    <div class="era-cards">${[...SCENARIOS, ...(karairiUnlocked() ? [S1592] : [])].sort((a, b) => a.year - b.year).map((x) => `<button type="button" class="era-card" data-act="pick-scen" data-id="${x.id}">
      <span class="era-y">${ERA_KANJI[x.id] ?? kanjiNum(x.year)}<small>（${x.year}）</small></span>
      <span class="era-n">${esc(ERA_NAME[x.id] ?? x.title)}</span>
      <span class="era-l">${esc(x.lede)}</span></button>`).join('')}</div>
  </div>`;
}

function clanHtml() {
  const st = preview!, d = deps!;
  const sc = scenarioOf(scen);
  const c = st.clans[pick];
  const lg = c.leader ? st.generals[c.leader] : null;
  const featured = scen === S1592.id ? ['hashiba'] : (sc.featured ?? FEATURED).filter((id) => st.clans[id]?.alive);
  const others = Object.values(st.clans).filter((x) => x.alive && !x.foreign && !featured.includes(x.id) && x.id !== 'kokujin').sort((a, b) => clanKoku(st, b.id) - clanKoku(st, a.id));
  const chip = (id: string) => { const x = st.clans[id]; return `<button type="button" class="clan-card" data-act="pick-clan" data-id="${id}" aria-pressed="${id === pick}"><span class="nm"><span class="swatch" style="background:${x.color}"></span>${esc(x.name)}</span><span class="fig">城${clanCastles(st, id).length}・${man(clanKoku(st, id))}</span></button>`; };
  return `<aside class="ttl-sheet" aria-label="家を選ぶ">
    <div class="ttl-sheet-top"><button type="button" class="ttl-back" data-act="t-back">← 時代</button><span class="ttl-era-tag">${ERA_KANJI[scen] ?? ''}「${esc(ERA_NAME[scen] ?? '')}」</span></div>
    <div class="ttl-pick">
      ${(lg && d.face(lg.id, 96)) || `<div class="ttl-mon" style="background:${c.color}">${esc(c.name.slice(0, 1))}</div>`}
      <div class="ttl-pick-t">
        <h2 id="ttl-clan"><span class="swatch" style="background:${c.color}"></span>${esc(c.name)}家</h2>
        <div class="ttl-ld">当主 ${esc(lg?.name ?? '—')}${lg?.born !== undefined ? `（${st.year - lg.born}歳）` : ''}</div>
        <div class="ttl-fig">城${clanCastles(st, pick).length}　${man(clanKoku(st, pick))}　兵${fmt(clanTroops(st, pick))}</div>
      </div>
    </div>
    <p class="ttl-blurb">${esc(blurbOf(scen, pick) || '地図の上で領地を押すと、その家を選べる。')}</p>
    <div class="ttl-h">主要な家<span>（地図の領地を押しても選べる）</span></div>
    <div class="ttl-feat clan-grid">${featured.map(chip).join('')}</div>
    <label class="ttl-other"><span>ほかの家</span><select id="ttl-other"><option value="">（選ぶ）</option>${others.map((x) => `<option value="${x.id}" ${x.id === pick ? 'selected' : ''}>${esc(x.name)}　城${clanCastles(st, x.id).length}　${man(clanKoku(st, x.id))}</option>`).join('')}</select></label>
    <div class="ttl-h">難易度</div>
    <div class="seg" role="group" aria-label="難易度">${(Object.keys(R.DIFFICULTY) as R.Difficulty[]).map((k) => `<button type="button" data-act="pick-diff" data-id="${k}" aria-pressed="${k === diff}">${R.DIFFICULTY[k].label}</button>`).join('')}</div>
    <p class="ttl-note">${DIFF_NOTE[diff]}</p>
    <button type="button" class="seal-btn ttl-go" data-act="start">出陣</button>
  </aside>`;
}

// ───────── 序幕: シナリオの背景を、暗い日本地図の上で語る ─────────
const OPENING_KEY = 'sengoku-opening';
// 出すか（設定で切れる）。自動テスト（webdriver）では、明示して「on」にしたときだけ出す
export function openingOn() {
  try { const v = localStorage.getItem(OPENING_KEY); if (v === 'off') return false; if ((navigator as Navigator & { webdriver?: boolean }).webdriver) return v === 'on'; } catch { /* 読めなければ出す */ }
  return true;
}
export function setOpeningOn(on: boolean) { try { localStorage.setItem(OPENING_KEY, on ? 'on' : 'off'); } catch { /* 記録できなくても続ける */ } }
let opIdx = 0;
const opSeen = new Set<string>(); // この画面で見た序幕（家選びから時代に戻って選び直しても、もう一度は出さない）
const opBeats = () => OPENINGS[scen] ?? [];
function startOpening() {
  opIdx = 0;
  screen = 'opening';
  $('title').dataset.screen = 'opening';
  view!.resize();
  applyBeat(true);
  render();
}
function nextBeat() {
  if (opIdx >= opBeats().length - 1) { endOpening(); return; }
  opIdx++; applyBeat(false); render();
}
// 序幕が終わったら家選びへ
function endOpening() {
  const v = view!;
  v.marks = null; v.highlight = null;
  go('clan');
}
// 地図を場面の場所へ寄せる（なめらかに）。光らせる家・輪・矢印も
function applyBeat(instant: boolean) {
  const b = opBeats()[opIdx], v = view!, st = preview!;
  if (!b) return;
  const byId = (id: string) => st.castles.find((c) => c.id === id);
  v.highlight = b.light?.length ? b.light : null;
  v.marks = { hexes: (b.mark ?? []).map((id) => byId(id)?.hex).filter((h): h is number => h !== undefined), arrows: (b.arrow ?? []).map(([a, c]) => [byId(a)?.hex, byId(c)?.hex]).filter((x): x is [number, number] => x[0] !== undefined && x[1] !== undefined) };
  const narrow = window.innerWidth <= 760;
  const hex = b.at ? byId(b.at)?.hex ?? centerHex() : centerHex();
  const from = { scale: v.scale, ox: v.ox, oy: v.oy };
  v.centerOn(hex, b.at ? (b.zoom ?? 1.4) * (narrow ? 0.85 : 1.6) : fitScale() * (narrow ? 0.9 : 1)); // 広い画面は少し寄せて場所を大きく
  if (narrow) v.oy -= v.h * 0.16; else { v.ox += v.w * 0.12; v.oy -= v.h * 0.13; } // 下（狭い画面）・左下（広い画面）の語りの札に隠れないよう、場所を上（右上）へ寄せる
  const to = { scale: v.scale, ox: v.ox, oy: v.oy };
  v.invalidate();
  if (instant || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  Object.assign(v, from);
  const t0 = performance.now(), D = 700;
  const step = () => {
    const k = Math.min(1, (performance.now() - t0) / D), e = 1 - Math.pow(1 - k, 3);
    v.scale = from.scale + (to.scale - from.scale) * e; v.ox = from.ox + (to.ox - from.ox) * e; v.oy = from.oy + (to.oy - from.oy) * e;
    v.redraw();
    if (k < 1 && screen === 'opening') requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
function openingHtml() {
  const bs = opBeats(), b = bs[opIdx];
  if (!b) return '';
  const sc = [...SCENARIOS, S1592].find((x) => x.id === scen);
  const body = b.who
    ? `<div class="op-who">${deps!.face(b.who, 168) || `<span class="op-noface">${esc((b.name ?? '').slice(0, 2))}</span>`}<div><div class="op-name">${esc(b.name ?? '')}<span>${esc(b.label ?? '')}</span></div><p class="op-line">「${esc(b.text)}」</p></div></div>`
    : `<div class="op-narr">${b.head ? `<h2>${esc(b.head)}</h2>` : ''}<p>${esc(b.text)}</p></div>`;
  return `<div class="op-top"><span class="op-scen">序幕　${esc(sc?.title ?? '')}</span><button type="button" class="ttl-back op-skip" data-act="op-skip">飛ばして家選びへ ›</button></div>
    <div class="op-box" data-act="op-next" role="button" aria-label="次へ（Enter）">${body}
      <div class="op-foot"><span class="op-dots">${bs.map((_, k) => `<i${k === opIdx ? ' class="on"' : k < opIdx ? ' class="done"' : ''}></i>`).join('')}</span><span class="op-more">${opIdx === bs.length - 1 ? '押すと家選びへ' : '押すと次へ'}</span></div></div>`;
}
