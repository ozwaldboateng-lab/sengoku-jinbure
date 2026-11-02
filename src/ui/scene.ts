// ゲームの途中で見せる場面（序幕と同じ見せ方）: 地図を暗くして場所へ寄せ、語りと人物のセリフを一枚ずつ。茶会・歴史の出来事などで使う
import type { OpeningBeat } from '../data/openings';
import type { GameState } from '../engine/types';
import type { MapView } from './render';
import { sfx, type Sfx } from './sound';

const esc = (x: string) => x.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
let playing: { beats: OpeningBeat[]; i: number; view: MapView; st: GameState; title: string; face: (id: string, w: number) => string; done: () => void; keep: { scale: number; ox: number; oy: number; highlight: MapView['highlight']; marks: MapView['marks'] } } | null = null;
export const sceneOpen = () => !!playing;

export function playScene(view: MapView, st: GameState, title: string, beats: OpeningBeat[], face: (id: string, w: number) => string, done: () => void = () => {}) {
  if (!beats.length) { done(); return; }
  let el = document.getElementById('scene');
  if (!el) {
    el = document.createElement('div'); el.id = 'scene'; document.body.appendChild(el);
    el.addEventListener('click', (e) => { const b = (e.target as HTMLElement).closest('[data-sact]') as HTMLElement | null; if (!b) return; if (b.dataset.sact === 'skip') end(); else next(); });
    document.addEventListener('keydown', (e) => {
      if (!playing) return;
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') { e.preventDefault(); e.stopImmediatePropagation(); next(); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); end(); }
    }, true);
  }
  playing = { beats, i: 0, view, st, title, face, done, keep: { scale: view.scale, ox: view.ox, oy: view.oy, highlight: view.highlight, marks: view.marks } };
  el.hidden = false;
  document.body.classList.add('in-scene');
  view.resize(); // 地図を画面いっぱいに
  apply(true); draw();
}
function next() {
  const p = playing; if (!p) return;
  if (p.i >= p.beats.length - 1) { end(); return; }
  p.i++; apply(false); draw();
  const sb = p.beats[p.i]; if (sb.sound) sfx(sb.sound as Sfx); else if (sb.who) sfx('ponn');
}
function end() {
  const p = playing; if (!p) return;
  playing = null;
  document.getElementById('scene')!.hidden = true;
  document.body.classList.remove('in-scene');
  const v = p.view; v.resize(); Object.assign(v, { scale: p.keep.scale, ox: p.keep.ox, oy: p.keep.oy, highlight: p.keep.highlight, marks: p.keep.marks }); v.invalidate();
  p.done();
}
// 地図を場面の場所へ（なめらかに）。光らせる家・輪・矢印も
function apply(instant: boolean) {
  const p = playing!, b = p.beats[p.i], v = p.view, st = p.st;
  const byId = (id: string) => st.castles.find((c) => c.id === id);
  v.highlight = b.light?.length ? b.light : null;
  v.marks = { hexes: (b.mark ?? []).map((id) => byId(id)?.hex).filter((h): h is number => h !== undefined), arrows: (b.arrow ?? []).map(([a, c]) => [byId(a)?.hex, byId(c)?.hex]).filter((x): x is [number, number] => x[0] !== undefined && x[1] !== undefined) };
  const hx = b.at ? byId(b.at)?.hex : undefined;
  if (hx === undefined) { v.invalidate(); return; }
  const narrow = window.innerWidth <= 760;
  const from = { scale: v.scale, ox: v.ox, oy: v.oy };
  v.centerOn(hx, (b.zoom ?? 1.6) * (narrow ? 0.9 : 1.4));
  if (narrow) v.oy -= v.h * 0.16; else { v.ox += v.w * 0.12; v.oy -= v.h * 0.13; }
  const to = { scale: v.scale, ox: v.ox, oy: v.oy };
  v.invalidate();
  if (instant || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  Object.assign(v, from);
  const t0 = performance.now(), D = 700;
  const step = () => { const k = Math.min(1, (performance.now() - t0) / D), e = 1 - Math.pow(1 - k, 3); v.scale = from.scale + (to.scale - from.scale) * e; v.ox = from.ox + (to.ox - from.ox) * e; v.oy = from.oy + (to.oy - from.oy) * e; v.redraw(); if (k < 1 && playing) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
function draw() {
  const p = playing!, b = p.beats[p.i], n = p.beats.length;
  const body = b.who
    ? `<div class="op-who">${p.face(b.who, 168) || `<span class="op-noface">${esc((b.name ?? '').slice(0, 2))}</span>`}<div><div class="op-name">${esc(b.name ?? '')}<span>${esc(b.label ?? '')}</span></div><p class="op-line">「${esc(b.text)}」</p></div></div>`
    : `<div class="op-narr">${b.head ? `<h2>${esc(b.head)}</h2>` : ''}<p>${esc(b.text)}</p></div>`;
  document.getElementById('scene')!.innerHTML = `<div class="scene-veil" data-sact="next"></div><div class="op-top"><span class="op-scen">${esc(p.title)}</span><button type="button" class="ttl-back op-skip" data-sact="skip">閉じる ›</button></div>
    <div class="op-box" data-sact="next" role="button" aria-label="次へ（Enter）">${body}
      <div class="op-foot"><span class="op-dots">${p.beats.map((_, k) => `<i${k === p.i ? ' class="on"' : k < p.i ? ' class="done"' : ''}></i>`).join('')}</span><span class="op-more">${p.i === n - 1 ? '押すと閉じる' : '押すと次へ'}</span></div></div>`;
}
