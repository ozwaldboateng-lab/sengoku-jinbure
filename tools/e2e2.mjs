import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const out = process.argv[2], mobile = process.argv[3] === 'mobile';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: mobile ? { width: 400, height: 860 } : { width: 1360, height: 820 }, deviceScaleFactor: mobile ? 2 : 1 });
const errors = [];
p.on('pageerror', (e) => errors.push('pageerror ' + e.message));
p.on('console', (m) => { if (m.type() === 'error') errors.push('console ' + m.text()); });
await p.goto('file://' + process.cwd() + '/dist/index.html');
await p.waitForTimeout(500);
if (mobile) await p.screenshot({ path: `${out}/m-01-title.png`, fullPage: true });
await p.click('[data-act="t-new"]'); await p.click('[data-act="pick-scen"][data-id="1560"]'); await p.click('[data-act="pick-clan"][data-id="takeda"]');
await p.click('[data-act="start"]');
await p.waitForTimeout(300);
// 画面座標を求めるヘルパ
const screenOf = (hex) => p.evaluate((hex) => {
  const g = window.__sengoku; const v = g.view; const r = v.canvas.getBoundingClientRect();
  // hexCenter 相当
  return null;
}, hex);
void screenOf;
const clickHex = async (hex) => {
  const pt = await p.evaluate((hex) => {
    const v = window.__sengoku.view; const r = v.canvas.getBoundingClientRect();
    const S = 15, SQ3 = Math.sqrt(3);
    const st = window.__sengoku.state;
    return null;
  }, hex);
  return pt;
};
void clickHex;
let moved = 0, attacks = 0;
for (let turn = 0; turn < 6; turn++) {
  // 各軍団: 攻撃対象があれば攻撃、なければ移動範囲の端へ
  for (let k = 0; k < 8; k++) {
    const info = await p.evaluate(() => {
      const { state: s, view: v } = window.__sengoku;
      const mine = Object.values(s.armies).filter((a) => a.clan === s.player && !a.acted && !a.routed);
      return mine.map((a) => a.id)[0] ?? null;
    });
    if (info === null) break;
    await p.evaluate((id) => { const btn = document.querySelector(`[data-act="goto"][data-id="${id}"]`); if (btn) btn.click(); }, info);
    await p.waitForTimeout(80);
    const pick = await p.evaluate(() => {
      const { state: s, view: v } = window.__sengoku;
      const r = v.canvas.getBoundingClientRect();
      const toScreen = (i) => { const h = window.__sengoku.hexes[i]; return h; };
      void toScreen;
      const sel = v.sel;
      const tgt = sel.targets[0];
      let hex = tgt ? tgt.hex : null;
      if (hex === null && sel.reach) { const arr = [...sel.reach.cost.entries()].sort((a, b) => b[1] - a[1]); hex = arr.length ? arr[Math.floor(arr.length / 2)][0] : null; }
      if (hex === null) return null;
      const c = window.__sengoku.center(hex);
      return { x: r.left + c[0] * v.scale + v.ox, y: r.top + c[1] * v.scale + v.oy, attack: !!tgt, inView: true };
    });
    if (!pick) { await p.evaluate(() => document.querySelector('[data-act="wait"]')?.click()); continue; }
    if (pick.x < 0 || pick.y < 0) { await p.evaluate(() => document.querySelector('[data-act="wait"]')?.click()); continue; }
    await p.mouse.click(pick.x, pick.y);
    await p.waitForTimeout(pick.attack ? 120 : 700);
    if (pick.attack) {
      const ok = await p.$('[data-act="attack"]');
      if (ok) { if (attacks === 0) await p.screenshot({ path: `${out}/${mobile ? 'm-' : ''}10-attack.png`, fullPage: mobile }); await ok.click(); attacks++; await p.waitForTimeout(150); if (attacks === 1) await p.screenshot({ path: `${out}/${mobile ? 'm-' : ''}11-battle.png` }); await p.evaluate(() => document.querySelector('[data-act="close"]')?.click()); }
      else await p.evaluate(() => document.querySelector('[data-act="wait"]')?.click());
    } else moved++;
    await p.evaluate(() => document.querySelector('[data-act="wait"]')?.click());
  }
  await p.click('#btn-end');
  await p.waitForTimeout(350);
  await p.evaluate(() => document.querySelector('[data-act="close"]')?.click());
}
await p.screenshot({ path: `${out}/${mobile ? 'm-' : ''}12-after.png`, fullPage: mobile });
const sum = await p.evaluate(() => { const s = window.__sengoku.state; return { date: document.getElementById('date').textContent, castles: s.castles.filter((c) => c.owner === s.player).length, revealed: s.revealed.length }; });
console.log({ moved, attacks, ...sum, errors: errors.length ? errors : 'none' });
await b.close();
