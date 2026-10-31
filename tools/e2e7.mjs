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
await p.click('[data-act="start"]');
await p.waitForTimeout(300);
// 岡崎城（松平）を囲む: 織田2隊＋同盟の今川1隊
const setup = await p.evaluate(() => {
  const g = window.__sengoku, s = g.state;
  const castle = s.castles.find((c) => c.id === 'okazaki');
  const occ = new Set(Object.values(s.armies).map((a) => a.hex));
  // 隣接ヘックスは座標から求める
  const mapHexes = (window.__sengoku_map ??= null);
  return { castleHex: castle.hex };
});
const nb = await p.evaluate((hex) => {
  const v = window.__sengoku.view; const c0 = window.__sengoku.center(hex);
  // 中心から 26km 以内のヘックス＝隣接（ヘックス半径15km）
  const s = window.__sengoku.state; const res = [];
  for (let i = 0; i < 600; i++) { try { const c = window.__sengoku.center(i); const d = Math.hypot(c[0] - c0[0], c[1] - c0[1]); if (d > 1 && d < 27) res.push(i); } catch {} }
  return res;
}, setup.castleHex);
const placed = await p.evaluate(({ hex, nb }) => {
  const s = window.__sengoku.state;
  const occ = new Set(Object.values(s.armies).map((a) => a.hex));
  const free = nb.filter((h) => !occ.has(h) && !s.castles.some((c) => c.hex === h));
  const oda = Object.values(s.armies).filter((a) => a.clan === 'oda').sort((a, b) => b.troops - a.troops).slice(0, 2);
  const ima = Object.values(s.armies).find((a) => a.clan === 'imagawa');
  oda.forEach((a, k) => { a.hex = free[k]; a.acted = false; a.mp = 4; });
  if (free[2] !== undefined) ima.hex = free[2];
  s.treaties.push({ a: 'oda', b: 'imagawa', kind: 'alliance', start: s.turn, until: s.turn + 24 });
  return { oda: oda.map((a) => a.id), ima: ima.id, free: free.slice(0, 3) };
}, { hex: setup.castleHex, nb });
const clickHex = async (hex) => { const pt = await p.evaluate((hex) => { const v = window.__sengoku.view; v.centerOn(hex); const c = window.__sengoku.center(hex); const r = v.canvas.getBoundingClientRect(); return { x: r.left + c[0] * v.scale + v.ox, y: r.top + c[1] * v.scale + v.oy }; }, hex); await p.waitForTimeout(80); const pt2 = await p.evaluate((hex) => { const v = window.__sengoku.view; const c = window.__sengoku.center(hex); const r = v.canvas.getBoundingClientRect(); return { x: r.left + c[0] * v.scale + v.ox, y: r.top + c[1] * v.scale + v.oy }; }, hex); await p.mouse.click(pt2.x, pt2.y); await p.waitForTimeout(120); };
for (const id of placed.oda) {
  await p.keyboard.press('Escape');
  await p.evaluate((id) => document.querySelector(`[data-act="goto"][data-id="${id}"]`).click(), id);
  await p.waitForTimeout(80);
  await clickHex(setup.castleHex);
  await p.screenshot({ path: `${out}/60-order-panel.png` });
  await p.click('[data-act="order-cmd"]');
  await p.waitForTimeout(120);
}
await p.evaluate((hex) => window.__sengoku.view.centerOn(hex, 2.6), setup.castleHex);
await p.waitForTimeout(150);
console.log('orders', JSON.stringify(await p.evaluate(() => window.__sengoku.state.orders)), 'castleHex', setup.castleHex);
await p.waitForTimeout(200);
console.log('badge pixel', JSON.stringify(await p.evaluate((hex) => { const v = window.__sengoku.view; const c = window.__sengoku.center(hex); const x = (c[0] - 15 * 0.62) * v.scale + v.ox, y = (c[1] - 15 * 0.62) * v.scale + v.oy; const d = v.ctx.getImageData(Math.round(x * v.dpr), Math.round(y * v.dpr), 1, 1).data; return { x, y, rgba: [...d], scale: v.scale }; }, setup.castleHex)));
await p.screenshot({ path: `${out}/61-orders-map.png` });
const cpt = await p.evaluate((hex) => { const v = window.__sengoku.view; v.zoomAt(v.w/2, v.h/2, 1); const c = window.__sengoku.center(hex); const r = v.canvas.getBoundingClientRect(); return { x: r.left + c[0] * v.scale + v.ox, y: r.top + c[1] * v.scale + v.oy }; }, setup.castleHex);
await p.waitForTimeout(100);
await p.screenshot({ path: `${out}/61b-orders-zoom.png`, clip: { x: cpt.x - 160, y: cpt.y - 110, width: 320, height: 220 } });
await p.click('#btn-end');
for (let k = 0; k < 60 && !(await p.evaluate(() => !document.getElementById('battle').hidden)); k++) await p.waitForTimeout(150);
await p.waitForTimeout(300);
await p.screenshot({ path: `${out}/62-joint-battle.png` });
const units = await p.evaluate(() => { const t = window.__sengoku_bt.t; return t.units.map((u) => `${u.side}:${u.clan}:${u.name}`); });
// 自軍を全員待機させて手番終了 → 同盟部隊がAIで動くか
const allyTiles = await p.evaluate(() => Object.fromEntries(window.__sengoku_bt.t.units.filter((u) => u.clan === 'imagawa').map((u) => [u.id, u.tile])));
await p.evaluate(() => { for (const u of window.__sengoku_bt.t.units) if (u.side === 'A' && u.clan === 'oda') { u.acted = true; } });
await p.click('#bt-end');
await p.waitForTimeout(600);
const phaseNow = await p.textContent('#bt-phase');
const allyActed = await p.evaluate((before) => window.__sengoku_bt.t.units.filter((u) => u.clan === 'imagawa').some((u) => u.acted || u.tile !== before[u.id]), allyTiles);
await p.click('#bt-auto');
await p.waitForSelector('[data-bact="leave"]', { timeout: 20000 });
await p.click('[data-bact="leave"]');
await p.waitForTimeout(300);
await p.screenshot({ path: `${out}/63-report.png` });
const rep = await p.evaluate(() => window.__sengoku.state.log.filter((l) => l.kind === 'battle').slice(-2).map((l) => l.text));
console.log({ placed, units, allyActed, phaseNow, rep, errors: errors.length ? errors : 'none' });
await b.close();
