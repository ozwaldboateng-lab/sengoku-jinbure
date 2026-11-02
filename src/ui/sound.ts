// 音: 効果音と音楽を、ファイルを使わずブラウザの中で合成する（Web Audio）
// 楽器は琴（はじく音）・尺八（息の音）・太鼓・鼓・拍子木・法螺貝。音階は都節（陰）・律・民謡の三つ。
// ブラウザは画面に一度触れるまで音を出せないので、最初の操作で鳴らし始める

export type Mood = 'title' | 'peace' | 'war' | 'battle' | 'somber' | 'triumph' | null;
export type Sfx = 'tick' | 'turn' | 'horn' | 'gun' | 'clash' | 'charge' | 'gate' | 'fire' | 'ponn' | 'coin' | 'castle' | 'win' | 'lose' | 'clap';

const KEY = 'sengoku-sound';
const MUSIC_K = 0.65; // 音楽の全体の大きさ（音量の設定に掛ける）
type Settings = { music: boolean; sfx: boolean; vm: number; vs: number };
let set: Settings = { music: true, sfx: true, vm: 0.45, vs: 0.6 };
try { const t = localStorage.getItem(KEY); if (t) set = { ...set, ...JSON.parse(t) }; } catch { /* 読めなければ初期値 */ }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(set)); } catch { /* 記録できなくても続ける */ } };
export const soundSettings = () => ({ ...set });
export function setSound(p: Partial<Settings>) {
  set = { ...set, ...p }; save();
  if (musicBus) musicBus.gain.setTargetAtTime(set.music ? set.vm * MUSIC_K : 0, ctx!.currentTime, 0.2);
  if (sfxBus) sfxBus.gain.setTargetAtTime(set.sfx ? set.vs : 0, ctx!.currentTime, 0.05);
  if (set.music && want && !playing) startMood(want);
}

let ctx: AudioContext | null = null;
let master: GainNode, musicBus: GainNode | null = null, sfxBus: GainNode | null = null, noiseBuf: AudioBuffer;
let unlocked = false;
// 自動テスト（webdriver）では鳴らさない（音の装置がない環境で止まらないように）
const silent = () => { try { return !!(navigator as Navigator & { webdriver?: boolean }).webdriver; } catch { return false; } };

function init() {
  if (ctx || silent()) return;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = 0.9;
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
  master.connect(comp); comp.connect(ctx.destination);
  musicBus = ctx.createGain(); musicBus.gain.value = set.music ? set.vm * MUSIC_K : 0; musicBus.connect(master);
  sfxBus = ctx.createGain(); sfxBus.gain.value = set.sfx ? set.vs : 0; sfxBus.connect(master);
  hall(ctx, musicBus, master); // 広間の響き
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}
// 広間の響き: 減衰していく雑音から作った残響（左右で少し違えて広がりを）
function hall(c: AudioContext, from: AudioNode, to: AudioNode) {
  const len = Math.floor(c.sampleRate * 2.6), ir = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) { const x = i / len; d[i] = (Math.random() * 2 - 1) * Math.pow(1 - x, 2.6) * (i < c.sampleRate * 0.012 ? i / (c.sampleRate * 0.012) : 1); } }
  const conv = c.createConvolver(); conv.buffer = ir;
  const pre = c.createDelay(); pre.delayTime.value = 0.025; const tone = c.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 6500;
  const wet = c.createGain(); wet.gain.value = 0.42;
  from.connect(pre); pre.connect(conv); conv.connect(tone); tone.connect(wet); wet.connect(to);
}
// 最初の操作で鳴らし始める
export function wireSound() {
  const go = () => {
    if (unlocked) return;
    init(); if (!ctx) return;
    unlocked = true;
    ctx.resume().then(() => { if (want) startMood(want); }).catch(() => {});
  };
  window.addEventListener('pointerdown', go, { capture: true });
  window.addEventListener('keydown', go, { capture: true });
}

// ───────── 楽器 ─────────
const env = (g: GainNode, t: number, a: number, peak: number, dec: number) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); };
function osc(type: OscillatorType, f: number, t: number, dur: number, bus: AudioNode) { const o = ctx!.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.connect(bus); o.start(t); o.stop(t + dur + 0.05); return o; }
function noise(t: number, dur: number, bus: AudioNode) { const n = ctx!.createBufferSource(); n.buffer = noiseBuf; n.connect(bus); n.start(t, Math.random() * 0.5); n.stop(t + dur); return n; }
function chain(...nodes: AudioNode[]) { for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]); return nodes[0]; }

// 琴: はじいた弦。爪で弾いた明るい立ち上がりと、長く残る余韻（明るさはゆっくり落とす）
function koto(t: number, f: number, v: number, bus: AudioNode, len = 2.8) {
  const c = ctx!, g = c.createGain(), lp = c.createBiquadFilter(), body = c.createBiquadFilter();
  lp.type = 'lowpass'; lp.Q.value = 0.7; lp.frequency.setValueAtTime(Math.min(12000, f * 16), t); lp.frequency.exponentialRampToValueAtTime(Math.min(8000, f * 5), t + len * 0.8);
  body.type = 'peaking'; body.frequency.value = 1400; body.Q.value = 1.2; body.gain.value = 4; // 胴の鳴り
  chain(lp, body, g, bus);
  // 二段の減衰: 弾いた直後に少し落ち、そのあと長く残る
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.003); g.gain.exponentialRampToValueAtTime(v * 0.38, t + 0.22); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  const parts: [OscillatorType, number, number, number][] = [['sawtooth', 1, 0.55, 0], ['triangle', 2, 0.45, 4], ['sine', 3, 0.18, -3], ['sine', 4.01, 0.08, 0]];
  for (const [type, m, lv, det] of parts) {
    const pg = c.createGain(); pg.gain.value = lv; pg.connect(lp);
    const o = c.createOscillator(); o.type = type; o.detune.value = det;
    o.frequency.setValueAtTime(f * m * 1.012, t); o.frequency.exponentialRampToValueAtTime(f * m, t + 0.05); // 爪で弾いた瞬間の音の揺れ
    o.connect(pg); o.start(t); o.stop(t + len + 0.05);
  }
  const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2500; const hg = c.createGain(); env(hg, t, 0.001, v * 0.35, 0.03); chain(hp, hg, bus); noise(t, 0.04, hp); // 爪の当たる音
}
// 尺八: 息の混じった柔らかい笛（ゆっくり立ち上がり、ゆれる）
function shaku(t: number, f: number, dur: number, v: number, bus: AudioNode) {
  const g = ctx!.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + Math.min(0.25, dur * 0.3)); g.gain.setValueAtTime(v, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.3);
  const lp = ctx!.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = f * 4; chain(lp, g, bus);
  const o = osc('sine', f, t, dur + 0.3, lp); const o3 = osc('triangle', f, t, dur + 0.3, lp); o3.detune.value = 4;
  const lfo = ctx!.createOscillator(), lg = ctx!.createGain(); lfo.frequency.value = 5; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.012, t + dur); chain(lfo, lg); lg.connect(o.frequency); lg.connect(o3.frequency); lfo.start(t); lfo.stop(t + dur + 0.3);
  const bp = ctx!.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f * 2; bp.Q.value = 2; const ng = ctx!.createGain(); ng.gain.setValueAtTime(0.0001, t); ng.gain.linearRampToValueAtTime(v * 0.35, t + 0.08); ng.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.2); chain(bp, ng, bus);
  const n = ctx!.createBufferSource(); n.buffer = noiseBuf; n.loop = true; n.connect(bp); n.start(t); n.stop(t + dur + 0.3);
}
// 太鼓: 胴の鳴り（低い音が下がる）と皮の当たり
function taiko(t: number, v: number, bus: AudioNode, p = 1) {
  const g = ctx!.createGain(); chain(g, bus); env(g, t, 0.003, v, 0.55);
  const o = osc('sine', 120 * p, t, 0.6, g); o.frequency.exponentialRampToValueAtTime(48 * p, t + 0.35);
  const lp = ctx!.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; const ng = ctx!.createGain(); env(ng, t, 0.002, v * 0.6, 0.08); chain(lp, ng, bus); noise(t, 0.1, lp);
}
// 鼓: 「ポン」（高めの皮が少し下がる）
function tsuzumi(t: number, v: number, bus: AudioNode) {
  const g = ctx!.createGain(); chain(g, bus); env(g, t, 0.002, v, 0.35);
  const o = osc('sine', 440, t, 0.4, g); o.frequency.exponentialRampToValueAtTime(300, t + 0.12);
  const hp = ctx!.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2000; const ng = ctx!.createGain(); env(ng, t, 0.001, v * 0.4, 0.03); chain(hp, ng, bus); noise(t, 0.04, hp);
}
// 拍子木: 乾いた木の「カン」
function clapper(t: number, v: number, bus: AudioNode) {
  for (const f of [1900, 2600]) { const g = ctx!.createGain(); chain(g, bus); env(g, t, 0.001, v * 0.6, 0.07); osc('square', f, t, 0.08, g); }
  const bp = ctx!.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2400; bp.Q.value = 6; const ng = ctx!.createGain(); env(ng, t, 0.001, v, 0.05); chain(bp, ng, bus); noise(t, 0.06, bp);
}

// ───────── 効果音 ─────────
let lastTick = -1;
export function sfx(k: Sfx) {
  if (!ctx || !sfxBus || !set.sfx || !unlocked) return;
  const t = ctx.currentTime + 0.01, b = sfxBus;
  switch (k) {
    case 'tick': if (lastTick >= 0 && t - lastTick < 0.06) return; lastTick = t; { const g = ctx.createGain(); chain(g, b); env(g, t, 0.002, 0.16, 0.05); osc('sine', 1350, t, 0.06, g); } break;
    case 'turn': taiko(t, 0.9, b, 1); taiko(t + 0.32, 0.75, b, 1.05); break; // 評定終了: ドン、ドン
    case 'horn': { // 法螺貝: 鋸歯の太い音がゆっくり立ち上がり、少し上がって落ちる
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.32, t + 0.35); g.gain.setValueAtTime(0.32, t + 1.1); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.7);
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.Q.value = 3; chain(lp, g, b);
      for (const [m, d] of [[1, 0], [1, 7], [2, -5]] as const) { const o = osc('sawtooth', 196 * m, t, 1.7, lp); o.detune.value = d; o.frequency.linearRampToValueAtTime(205 * m, t + 0.4); o.frequency.linearRampToValueAtTime(186 * m, t + 1.6); }
      break;
    }
    case 'gun': { // 鉄砲: 破裂音と低い響き
      const bp = ctx.createBiquadFilter(); bp.type = 'lowpass'; bp.frequency.setValueAtTime(5000, t); bp.frequency.exponentialRampToValueAtTime(300, t + 0.3); const g = ctx.createGain(); env(g, t, 0.001, 1.6, 0.35); chain(bp, g, b); noise(t, 0.4, bp);
      const g2 = ctx.createGain(); chain(g2, b); env(g2, t, 0.001, 0.9, 0.25); const o = osc('sine', 90, t, 0.3, g2); o.frequency.exponentialRampToValueAtTime(40, t + 0.25);
      break;
    }
    case 'clash': case 'charge': { // 刀を打ち合う金属の音（突撃なら鬨の太鼓も）
      for (const [f, d] of [[2310, 0.25], [3720, 0.18], [5130, 0.12]] as const) { const g = ctx.createGain(); chain(g, b); env(g, t, 0.001, 0.28, d); osc('square', f, t, d, g); }
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3000; const ng = ctx.createGain(); env(ng, t, 0.001, 0.9, 0.08); chain(hp, ng, b); noise(t, 0.1, hp);
      if (k === 'charge') { taiko(t, 0.8, b, 0.9); taiko(t + 0.15, 0.7, b, 0.95); }
      break;
    }
    case 'gate': taiko(t, 1, b, 0.7); { const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 400; const g = ctx.createGain(); env(g, t, 0.005, 0.5, 0.4); chain(lp, g, b); noise(t, 0.5, lp); } break;
    case 'fire': { const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(600, t); bp.frequency.linearRampToValueAtTime(1800, t + 0.8); bp.Q.value = 0.8; const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.5, t + 0.25); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1); chain(bp, g, b); noise(t, 1.2, bp); break; }
    case 'ponn': tsuzumi(t, 1.3, b); break;
    case 'clap': clapper(t, 0.6, b); clapper(t + 0.16, 0.5, b); break;
    case 'coin': for (const [dt, f] of [[0, 2093], [0.07, 2637]] as const) { const g = ctx.createGain(); chain(g, b); env(g, t + dt, 0.002, 0.3, 0.25); osc('triangle', f, t + dt, 0.3, g); osc('sine', f * 2.7, t + dt, 0.15, g); } break;
    case 'castle': taiko(t, 1, b, 0.8); taiko(t + 0.22, 0.9, b, 0.8); taiko(t + 0.44, 1, b, 0.7); { const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 300; const g = ctx.createGain(); env(g, t + 0.4, 0.05, 0.6, 1.2); chain(lp, g, b); noise(t + 0.4, 1.4, lp); } break;
    case 'win': taiko(t, 0.8, b); [0, 2, 4, 7].forEach((s, i) => koto(t + 0.25 + i * 0.13, 293.66 * Math.pow(2, RITSU[s % 5] / 12 + Math.floor(s / 5)), 0.3, b)); break;
    case 'lose': [4, 3, 1, 0].forEach((s, i) => koto(t + i * 0.28, 146.83 * Math.pow(2, MIYAKO[s] / 12), 0.28, b, 2)); taiko(t + 1.1, 0.6, b, 0.8); break;
  }
}

// ───────── 音楽: 気分ごとに、その場で旋律を組み立て続ける ─────────
const MIYAKO = [0, 1, 5, 7, 8]; // 都節（陰）: 憂い・緊張
const RITSU = [0, 2, 5, 7, 9]; // 律: 雅・明るい
const MINYO = [0, 3, 5, 7, 10]; // 民謡: 力強い
type MoodDef = { scale: number[]; root: number; bpm: number; koto: number; shaku: number; taiko: number[]; drone: boolean; density: number };
const MOODS: Record<Exclude<Mood, null>, MoodDef> = {
  title: { scale: MIYAKO, root: 146.83, bpm: 62, koto: 0.27, shaku: 0.15, taiko: [0.5, 0, 0, 0, 0, 0, 0, 0], drone: true, density: 0.4 },
  peace: { scale: RITSU, root: 164.81, bpm: 76, koto: 0.25, shaku: 0.12, taiko: [0.25, 0, 0, 0, 0, 0, 0, 0], drone: false, density: 0.48 },
  war: { scale: MINYO, root: 146.83, bpm: 100, koto: 0.18, shaku: 0.13, taiko: [0.6, 0, 0.3, 0, 0.55, 0, 0.3, 0.3], drone: true, density: 0.6 },
  battle: { scale: MIYAKO, root: 130.81, bpm: 128, koto: 0.17, shaku: 0.14, taiko: [0.75, 0.25, 0.5, 0.25, 0.7, 0.25, 0.6, 0.45], drone: true, density: 0.7 },
  somber: { scale: MIYAKO, root: 138.59, bpm: 52, koto: 0.26, shaku: 0.15, taiko: [0.35, 0, 0, 0, 0, 0, 0, 0], drone: true, density: 0.35 },
  triumph: { scale: RITSU, root: 174.61, bpm: 92, koto: 0.27, shaku: 0.14, taiko: [0.6, 0, 0.35, 0, 0.6, 0.3, 0.35, 0], drone: true, density: 0.65 },
};
let want: Mood = null, playing: Mood = null, timer: number | null = null, nextT = 0, step = 0, walker = 5, phraseLeft = 0;
const pitch = (d: MoodDef, deg: number) => d.root * Math.pow(2, (d.scale[((deg % 5) + 5) % 5] + 12 * Math.floor(deg / 5)) / 12);

export function mood(m: Mood) {
  if (m === want) return;
  want = m;
  if (!ctx || !unlocked) return;
  startMood(m);
}
function startMood(m: Mood) {
  if (!ctx || !musicBus) return;
  const bus = musicBus, now = ctx.currentTime;
  bus.gain.cancelScheduledValues(now); bus.gain.setTargetAtTime(0, now, 0.25); // いまの曲を絞る
  if (timer !== null) { clearInterval(timer); timer = null; }
  playing = null;
  if (!m || !set.music) return;
  window.setTimeout(() => {
    if (want !== m || !ctx || !musicBus) return;
    playing = m; step = 0; walker = 5; phraseLeft = 0; nextT = ctx.currentTime + 0.1;
    musicBus.gain.cancelScheduledValues(ctx.currentTime); musicBus.gain.setTargetAtTime(set.vm * MUSIC_K, ctx.currentTime, 0.6);
    timer = window.setInterval(() => tickMusic(), 90);
  }, 700);
}
function tickMusic(now?: number) {
  if (!ctx || !musicBus || !playing) return;
  const d = MOODS[playing], eighth = 30 / d.bpm, bus = musicBus;
  while (nextT < (now ?? ctx.currentTime) + 0.4) {
    const t = nextT, k = step % 8, bar = Math.floor(step / 8);
    // 太鼓の型
    const tv = d.taiko[k]; if (tv) taiko(t, tv * (k === 0 && bar % 4 === 0 ? 1.15 : 1), bus, k % 2 ? 1.25 : 1);
    // 持続音（四小節ごと）
    if (d.drone && step % 32 === 0) { for (const m of [0.5, 0.75]) { const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.05, t + 2); g.gain.setValueAtTime(0.05, t + eighth * 28); g.gain.linearRampToValueAtTime(0.0001, t + eighth * 32); chain(g, bus); osc('sine', d.root * m, t, eighth * 32, g); } }
    // 琴: 音階の上を歩く。拍の頭では弾きやすく、ときどき二音の重ね
    if (Math.random() < (k % 2 === 0 ? d.density : d.density * 0.45)) {
      walker += [-2, -1, -1, 1, 1, 2, 0][Math.floor(Math.random() * 7)]; walker = Math.max(0, Math.min(11, walker));
      koto(t, pitch(d, walker), d.koto * (k === 0 ? 1.1 : 0.85), bus);
      if (k === 0 && Math.random() < 0.35) koto(t + 0.03, pitch(d, walker - 3), d.koto * 0.6, bus);
    }
    // 尺八: 二小節ごとに長い音の句
    if (k === 0 && bar % 2 === 0 && phraseLeft <= 0 && Math.random() < 0.6) phraseLeft = 2 + Math.floor(Math.random() * 3);
    if (phraseLeft > 0 && k % 4 === 0) { phraseLeft--; shaku(t, pitch(d, 5 + Math.floor(Math.random() * 5)) * 2, eighth * (3 + Math.random() * 3), d.shaku, bus); }
    nextT += eighth * (k % 2 ? 0.92 : 1.08); step++; // わずかに跳ねる（間）
  }
}

// ───────── 試聴用: 曲・効果音を音声ファイル（WAV）に書き出す（画面の外で使う） ─────────
export async function renderPreview(what: Mood | Sfx, seconds: number, sampleRate = 22050): Promise<string> {
  const off = new OfflineAudioContext(1, Math.ceil(seconds * sampleRate), sampleRate);
  const keep = { ctx, master, musicBus, sfxBus, noiseBuf, unlocked, set: { ...set } };
  ctx = off as unknown as AudioContext;
  master = off.createGain(); master.gain.value = 0.9; const comp = off.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; master.connect(comp); comp.connect(off.destination);
  musicBus = off.createGain(); musicBus.gain.value = MUSIC_K * 0.9; musicBus.connect(master);
  sfxBus = off.createGain(); sfxBus.gain.value = 0.8; sfxBus.connect(master);
  hall(off as unknown as AudioContext, musicBus, master);
  noiseBuf = off.createBuffer(1, sampleRate * 1.5, sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  unlocked = true; set = { ...set, music: true, sfx: true };
  try {
    if (what && what in MOODS) {
      playing = what as Mood; step = 0; walker = 5; phraseLeft = 0; nextT = 0.05;
      tickMusic(seconds - 1.4); // 曲の終わりまで一度に組む
    } else sfx(what as Sfx);
    const buf = await off.startRendering();
    return wavBase64(buf.getChannelData(0), sampleRate);
  } finally {
    ({ ctx, master, musicBus, sfxBus, noiseBuf, unlocked } = keep as typeof keep & { master: GainNode; noiseBuf: AudioBuffer }); set = keep.set; playing = null;
  }
}
function wavBase64(data: Float32Array, rate: number) {
  const n = data.length, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
  const w = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, data[i])) * 0x7fff, true);
  let s = ''; const u = new Uint8Array(buf); for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
  return btoa(s);
}
