import { readFileSync } from 'node:fs';
import { runClanAI } from '../src/engine/ai';
import { aiDiplomacy } from '../src/engine/diplomacy';
import { monthEnd } from '../src/engine/economy';
import { rand } from '../src/engine/state';
import type { GameState } from '../src/engine/types';
const s: GameState = JSON.parse(readFileSync('./nan-before.json', 'utf8'));
const bad = (tag: string) => { const b = Object.values(s.armies).filter((a) => !Number.isFinite(a.troops) || !Number.isFinite(a.morale)); if (b.length) { console.log('NaN after', tag, b.map((a) => `${a.clan}:${s.generals[a.main].name}:${a.troops}:${a.morale}:hex${a.hex}`)); return true; } return false; };
const watch = Object.values(s.armies).find((a) => s.generals[a.main].name === '小山田信茂')!;
console.log('before', watch.troops, watch.morale, watch.hex, 'deputy', watch.deputy);
// runAIOnlyTurn = runClanAI(player) + endTurn
await runClanAI(s, s.player); if (bad('player')) process.exit();
s.reports = [];
const order = Object.keys(s.clans).filter((c) => c !== s.player && s.clans[c].alive);
for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rand(s) * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
for (const c of order) { await aiDiplomacy(s, c); if (bad('dip ' + c)) process.exit(); }
for (const c of order) { const n0 = s.log.length; await runClanAI(s, c); if (bad('ai ' + c)) { console.log(s.log.slice(n0).map((l) => l.text).join('\n')); process.exit(); } }
monthEnd(s); bad('monthEnd');
