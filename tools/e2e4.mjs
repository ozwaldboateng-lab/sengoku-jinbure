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
// 調略: 稲葉山城（斎藤）を地図でクリック
const clickHex = async (hex) => { const pt = await p.evaluate((hex) => { const v = window.__sengoku.view; const c = window.__sengoku.center(hex); const r = v.canvas.getBoundingClientRect(); v.centerOn(hex); return null; }, hex); await p.waitForTimeout(100); const pt2 = await p.evaluate((hex) => { const v = window.__sengoku.view; const c = window.__sengoku.center(hex); const r = v.canvas.getBoundingClientRect(); return { x: r.left + c[0] * v.scale + v.ox, y: r.top + c[1] * v.scale + v.oy }; }, hex); await p.mouse.click(pt2.x, pt2.y); await p.waitForTimeout(150); };
const castleHex = (id) => p.evaluate((id) => window.__sengoku.state.castles.find((c) => c.id === id).hex, id);
await clickHex(await castleHex('inabayama'));
if (await p.$('[data-act="view-castle"]')) { await p.click('[data-act="view-castle"]'); await p.waitForTimeout(100); }
await p.click('[data-act="pick-plot"]');
await p.waitForTimeout(100);
await p.screenshot({ path: `${out}/40-plot.png` });
await p.click('[data-act="plot"]');
await p.waitForTimeout(200);
await p.screenshot({ path: `${out}/41-plot-result.png` });
const naio = await p.evaluate(() => { const c = window.__sengoku.state.castles.find((c) => c.id === 'inabayama'); return { naio: c.naio, by: c.naioBy, log: window.__sengoku.state.log.slice(-2).map((l) => l.text) }; });
console.log('plot', JSON.stringify(naio));
// 攻城戦を開き、火計を探して実行
await p.keyboard.press('Escape'); await p.waitForTimeout(100);
// 調略の返事の顔見せ（カットイン）は押して閉じる
for (let k = 0; k < 3 && await p.$('#cutin:not([hidden])'); k++) { await p.click('#cutin'); await p.waitForTimeout(150); }
// 部隊を選ぶと地図がその部隊へ寄るので、寄り終えてから目標の位置を測る
const pick = await p.evaluate(() => {
  const { state: s } = window.__sengoku;
  for (const a of Object.values(s.armies)) if (a.clan === s.player) { const b = document.querySelector(`[data-act="goto"][data-id="${a.id}"]`); if (!b) continue; b.click(); const v = window.__sengoku.view; const t = v.sel.targets.find((t) => s.castles.some((c) => c.hex === t.hex)); if (t) return { army: a.id, hex: t.hex }; }
  return null;
});
await p.waitForTimeout(600);
const target = pick && await p.evaluate((hex) => { const v = window.__sengoku.view; const c = window.__sengoku.center(hex); const r = v.canvas.getBoundingClientRect(); return { x: r.left + c[0] * v.scale + v.ox, y: r.top + c[1] * v.scale + v.oy }; }, pick.hex);
let fired = false;
if (target) {
  await p.mouse.click(target.x, target.y); await p.waitForTimeout(150);
  await p.click('[data-act="order-cmd"]'); await p.waitForTimeout(100); await p.click('#btn-end');
  for (let k = 0; k < 60 && !(await p.evaluate(() => !document.getElementById('battle').hidden)); k++) await p.waitForTimeout(150);
  await p.waitForTimeout(300);
  for (let ph = 0; ph < 12 && !fired; ph++) {
    // 自軍手番: 城へ近づき、火計があれば使う
    for (let k = 0; k < 8 && !fired; k++) {
      const st = await p.evaluate(() => { const v = window.__sengoku_bt; if (!v || v.sel === null) return null; const f = v.acts.find((a) => a.kind === 'fire'); const r = v.canvas.getBoundingClientRect(); if (f) { const [x, y] = v.center(f.tile); return { fire: true, x: r.left + x, y: r.top + y }; } let best = null, bd = 1e9; const keep = v.t.tiles.indexOf('K'); const [kx, ky] = v.center(keep); for (const [i] of v.reach) { const [x, y] = v.center(i); const d = (x - kx) ** 2 + (y - ky) ** 2; if (d < bd) { bd = d; best = { x: r.left + x, y: r.top + y }; } } return best ? { fire: false, ...best } : { fire: false, none: true }; });
      if (!st) break;
      if (st.fire) { await p.mouse.click(st.x, st.y); await p.waitForTimeout(100); await p.screenshot({ path: `${out}/42-fire-option.png` }); const btn = await p.$('[data-bact="do"]'); await btn.click(); await p.waitForTimeout(250); await p.screenshot({ path: `${out}/43-fire-result.png` }); fired = true; break; }
      if (!st.none) { await p.mouse.click(st.x, st.y); await p.waitForTimeout(250); }
      const w = await p.$('[data-bact="wait"]'); if (w) await w.click();
    }
    if (fired || await p.$('[data-bact="leave"]')) break;
    await p.click('#bt-end'); await p.waitForTimeout(2500);
  }
  if (!(await p.$('[data-bact="leave"]'))) await p.click('#bt-auto');
  await p.waitForTimeout(200);
  await p.click('[data-bact="leave"]');
}
console.log({ fired, errors: errors.length ? errors : 'none' });
await b.close();
