// 月をまたぐ城攻め: 日没で決着しなければ、翌月は同じ盤面の続きから攻める
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const out = process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1360, height: 820 } });
const errors = [];
p.on('pageerror', (e) => errors.push('pageerror ' + e.message));
p.on('console', (m) => { if (m.type() === 'error') errors.push('console ' + m.text()); });
await p.goto('file://' + process.cwd() + '/dist/index.html');
await p.waitForTimeout(300);
await p.click('[data-act="t-new"]'); await p.click('[data-act="pick-scen"][data-id="1560"]'); await p.click('[data-act="pick-clan"][data-id="oda"]');
await p.click('[data-act="start"]'); await p.waitForTimeout(300);
const closeAll = async () => { for (let k = 0; k < 8; k++) { if (await p.$('#cutin:not([hidden])')) { await p.click('#cutin'); await p.waitForTimeout(120); continue; } if (await p.$('#modal:not([hidden])')) { await p.click('#modal-close').catch(() => {}); await p.waitForTimeout(120); continue; } break; } };
await closeAll();
// 織田の一軍を稲葉山城の隣へ。城兵を厚くして一刻では落ちないようにする
const setup = await p.evaluate(() => {
  const X = window.__sengoku, s = X.state;
  const c = s.castles.find((x) => x.id === 'inabayama');
  for (const a of Object.values(s.armies)) if (a.hex === c.hex || X.neighbors(c.hex).includes(a.hex)) a.hex = 0;
  const a = Object.values(s.armies).filter((x) => x.clan === 'oda').sort((x, y) => y.troops - x.troops)[0];
  a.hex = X.neighbors(c.hex).find((h) => !s.castles.some((k) => k.hex === h));
  a.troops = 5000; a.morale = 1.2; a.mp = 6; a.acted = false;
  c.garrison = 3500; c.gMorale = 1;
  return { army: a.id, castle: c.i, hex: c.hex, ahex: a.hex, store0: c.store };
});
const hexPt = (hex) => p.evaluate((hex) => { const v = window.__sengoku.view; const c = window.__sengoku.center(hex); const r = v.canvas.getBoundingClientRect(); return { x: r.left + c[0] * v.scale + v.ox, y: r.top + c[1] * v.scale + v.oy }; }, hex);
await p.evaluate((hex) => window.__sengoku.view.centerOn(hex), setup.ahex); await p.waitForTimeout(400);
let pt = await hexPt(setup.ahex); await p.mouse.click(pt.x, pt.y); await p.waitForTimeout(200);
pt = await hexPt(setup.hex); await p.mouse.click(pt.x, pt.y); await p.waitForTimeout(200);
await p.click('[data-act="order-cmd"]'); await p.waitForTimeout(100);
const fight = async (btn = 'leave') => {
  for (let k = 0; k < 80 && !(await p.evaluate(() => !document.getElementById('battle').hidden)); k++) await p.waitForTimeout(150);
  await p.waitForTimeout(300);
  if (await p.$('[data-bact="deploy-done"]')) { await p.click('[data-bact="deploy-done"]'); await p.waitForTimeout(500); }
  const info = await p.evaluate(() => ({ turn: document.getElementById('bt-turn').textContent, title: document.getElementById('bt-title').textContent, log: window.__sengoku_bt.t.log.slice(0, 2), gates: { ...window.__sengoku_bt.t.gates }, tiles: window.__sengoku_bt.t.units.filter((u) => u.side === 'A').map((u) => u.tile).sort((a, b) => a - b) }));
  // 何もせず刻を送る（攻め手は動かない）
  for (let k = 0; k < 40 && !(await p.$('[data-bact="leave"]')); k++) { await p.click('#bt-end').catch(() => {}); await p.waitForTimeout(400); }
  const res = await p.evaluate(() => ({ stamp: document.querySelector('.bt-result .stamp')?.textContent, gates: { ...window.__sengoku_bt.t.gates }, tiles: window.__sengoku_bt.t.units.filter((u) => u.side === 'A' && !u.out).map((u) => u.tile).sort((a, b) => a - b) }));
  const btns = await p.evaluate(() => [...document.querySelectorAll('.bt-result [data-bact]')].map((x) => x.textContent));
  await p.screenshot({ path: `${out}/e37-result-${btn}.png` });
  await p.click(`[data-bact="${btn}"]`); await p.waitForTimeout(300);
  return { ...info, ...res, btns };
};
await p.click('#btn-end');
const m1 = await fight();
for (let k = 0; k < 60 && await p.evaluate(() => document.getElementById('btn-end').disabled); k++) await p.waitForTimeout(200);
await p.waitForTimeout(800); await closeAll();
const between = await p.evaluate((st) => { const s = window.__sengoku.state; const sv = s.sieges?.[st.castle]; const c = s.castles[st.castle]; return { siege: sv ? { months: sv.months, clan: sv.clan, armies: sv.armies } : null, order: (s.orders ?? []).filter((o) => o.hex === st.hex).map((o) => o.army), store: c.store, store0: st.store0, cutOff: true }; }, setup);
await p.evaluate((hex) => window.__sengoku.view.centerOn(hex), setup.ahex); await p.waitForTimeout(300);
pt = await hexPt(setup.ahex); await p.mouse.click(pt.x, pt.y); await p.waitForTimeout(200);
const panel = await p.evaluate(() => document.getElementById('panel')?.innerText.match(/包囲[^\n]*/)?.[0] ?? null);
await p.screenshot({ path: `${out}/e37-between.png` });
await p.click('#btn-end');
const m2 = await fight('lift');
for (let k = 0; k < 60 && await p.evaluate(() => document.getElementById('btn-end').disabled); k++) await p.waitForTimeout(200);
await p.waitForTimeout(800); await closeAll();
const after = await p.evaluate((st) => { const s = window.__sengoku.state; return { siege: !!s.sieges?.[st.castle], order: (s.orders ?? []).filter((o) => o.hex === st.hex).length }; }, setup);
console.log(JSON.stringify({ m1: { turn: m1.turn, title: m1.title, stamp: m1.stamp, gatesEnd: m1.gates, tilesEnd: m1.tiles }, between, panel, m2: { title: m2.title, log: m2.log, gatesStart: m2.gates, tilesStart: m2.tiles }, btns: m1.btns, after }, null, 1));
const ok = m1.stamp === '月越し' && between.siege?.months === 1 && between.order.length > 0 && /包囲2か月目/.test(m2.title) && JSON.stringify(m1.gates) === JSON.stringify(m2.gates) && m1.btns.includes('囲みを解いて退く') && !after.siege && after.order === 0;
console.log({ ok, errors: errors.length ? errors : 'none' });
await b.close();
