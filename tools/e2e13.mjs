// 野戦: 伏兵の配置と一斉攻撃
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
await p.waitForTimeout(400);
await p.click('[data-act="t-new"]'); await p.click('[data-act="pick-scen"][data-id="1560"]'); await p.click('[data-act="pick-clan"][data-id="oda"]');
await p.click('[data-act="start"]');
await p.waitForTimeout(300);
// 信長隊（兵を増やす）と、隣の平地に置いた今川の部隊で野戦
const ids = await p.evaluate(() => {
  const s = window.__sengoku.state;
  const a = Object.values(s.armies).find((x) => x.clan === 'oda' && x.main === 'oda_nobunaga');
  const e = Object.values(s.armies).find((x) => x.clan === 'imagawa');
  a.troops = 8000; a.deputy = a.deputy ?? 'niwa_nagahide';
  if (s.generals.niwa_nagahide.status !== 'army') { s.generals.niwa_nagahide.status = 'army'; s.generals.niwa_nagahide.army = a.id; }
  e.troops = 7000; e.hex = 304; // 清洲城の隣
  window.__sengoku.battle(a.id, e.id);
  return { a: a.id, e: e.id };
});
await p.waitForTimeout(500);
const phase = await p.evaluate(() => document.getElementById('bt-phase').textContent);
await p.screenshot({ path: `${out}/97-deploy.png` });
// 伏兵を1隊置く: 本陣以外の自部隊を選び、明るいヘックスをクリック
const placed = await p.evaluate(() => {
  const v = window.__sengoku_bt; const t = v.t;
  const u = t.units.find((x) => x.side === t.playerSide && !x.hq && !x.out);
  const [x, y] = v.center(u.tile); const r = v.canvas.getBoundingClientRect();
  return { ux: r.left + x, uy: r.top + y };
});
await p.mouse.click(placed.ux, placed.uy); await p.waitForTimeout(150);
const tile = await p.evaluate(() => { const v = window.__sengoku_bt; const [i] = [...v.reach.keys()]; if (i === undefined) return null; const [x, y] = v.center(i); const r = v.canvas.getBoundingClientRect(); return { x: r.left + x, y: r.top + y }; });
if (tile) { await p.mouse.click(tile.x, tile.y); await p.waitForTimeout(250); }
const hidden = await p.evaluate(() => window.__sengoku_bt.t.units.filter((u) => u.hidden && u.side === window.__sengoku_bt.t.playerSide).length);
await p.screenshot({ path: `${out}/98-deployed.png` });
await p.click('[data-bact="deploy-done"]'); await p.waitForTimeout(800);
// 物見: 敵陣の方へ
let scout = null;
for (let k = 0; k < 10 && !scout; k++) {
  if (await p.evaluate(() => document.getElementById('bt-phase').classList.contains('mine'))) {
    await p.screenshot({ path: `${out}/100-fog.png` });
    const sb = await p.$('[data-bact="scout"]');
    if (sb) {
      await sb.click(); await p.waitForTimeout(100);
      const pt = await p.evaluate(() => { const v = window.__sengoku_bt; const t = v.t; const i = Math.floor(t.h / 2) * t.w + 7; const [x, y] = v.center(i); const r = v.canvas.getBoundingClientRect(); return { x: r.left + x, y: r.top + y }; });
      await p.mouse.click(pt.x, pt.y); await p.waitForTimeout(200);
      scout = await p.evaluate(() => window.__sengoku_bt.t.log.filter((l) => /物見/.test(l)).slice(-1)[0]);
      await p.screenshot({ path: `${out}/101-scouted.png` });
    }
    break;
  }
  await p.waitForTimeout(400);
}
// 自軍の手番まで待ち、隣接する敵がいれば一斉攻撃ボタンが出るか確認（数手番進める）
let volleyShown = false, volleyDone = false;
for (let ph = 0; ph < 14 && !volleyDone; ph++) {
  if (await p.$('[data-bact="leave"]')) break;
  const mine = await p.evaluate(() => document.getElementById('bt-phase').classList.contains('mine'));
  if (!mine) { await p.waitForTimeout(500); continue; }
  for (let k = 0; k < 6; k++) {
    const pt = await p.evaluate(() => { const v = window.__sengoku_bt; const a = v.acts.find((x) => x.kind === 'attack'); if (!a) return null; const [x, y] = v.center(a.target.tile); const r = v.canvas.getBoundingClientRect(); return { x: r.left + x, y: r.top + y }; });
    if (pt) { await p.mouse.click(pt.x, pt.y); await p.waitForTimeout(100); const vb = await p.$('[data-bact="volley"]'); if (vb) { volleyShown = true; await p.screenshot({ path: `${out}/99-volley.png` }); await vb.click(); volleyDone = true; await p.waitForTimeout(200); break; } }
    // 前進
    const mv = await p.evaluate(() => { const v = window.__sengoku_bt; if (!v.reach.size) return null; const t = v.t; const en = t.units.filter((u) => !u.out && u.side !== t.playerSide && !u.hidden); let best = null, bd = 1e9; for (const [i] of v.reach) { const [x, y] = v.center(i); for (const e of en) { const [ex, ey] = v.center(e.tile); const d = (x - ex) ** 2 + (y - ey) ** 2; if (d < bd) { bd = d; best = { x, y }; } } } const r = v.canvas.getBoundingClientRect(); return best && { x: r.left + best.x, y: r.top + best.y }; });
    if (mv) { await p.mouse.click(mv.x, mv.y); await p.waitForTimeout(200); continue; }
    const w = await p.$('[data-bact="wait"]'); if (w) { await w.click(); await p.waitForTimeout(60); } else break;
  }
  if (!volleyDone && !(await p.$('[data-bact="leave"]'))) { await p.click('#bt-end'); await p.waitForTimeout(600); }
}
const log = await p.evaluate(() => window.__sengoku_bt.t ? window.__sengoku_bt.t.log.filter((l) => /伏兵|一斉/.test(l)) : []);
console.log({ scout, phase, hidden, volleyShown, volleyDone, log: log.slice(0, 6), errors: errors.length ? errors : 'none' });
await b.close();
