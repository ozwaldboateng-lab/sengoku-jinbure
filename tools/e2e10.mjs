// e2e3 と同じ流れで、織田の部隊に鉄砲を持たせて合戦する
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const out = process.argv[2], mobile = process.argv[3] === 'mobile';
const pre = (mobile ? 'm-' : '') + 'gun-';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: mobile ? { width: 400, height: 860 } : { width: 1360, height: 820 }, deviceScaleFactor: mobile ? 2 : 1 });
const errors = [];
p.on('pageerror', (e) => errors.push('pageerror ' + e.message));
p.on('console', (m) => { if (m.type() === 'error') errors.push('console ' + m.text()); });
await p.goto('file://' + process.cwd() + '/dist/index.html');
await p.waitForTimeout(400);
await p.click('[data-act="t-new"]'); await p.click('[data-act="pick-scen"][data-id="1560"]'); await p.click('[data-act="pick-clan"][data-id="oda"]');
await p.click('[data-act="start"]');
await p.waitForTimeout(300);
await p.evaluate(() => { const s = window.__sengoku.state; for (const a of Object.values(s.armies)) if (a.clan === 'oda') a.guns = Math.floor(a.troops * 0.4); });
const battleOpen = () => p.evaluate(() => !document.getElementById('battle').hidden);
const closeModal = () => p.evaluate(() => document.querySelector('#modal:not([hidden]) [data-act="close"]')?.click());
// プレイヤー側の合戦を1手番分操作: 選択中部隊に行動があれば最初の選択肢を実行
async function playPhase(shot) {
  for (let k = 0; k < 12; k++) {
    const pt = await p.evaluate(() => {
      const v = window.__sengoku_bt; if (!v || !v.acts.length) return null;
      const a = v.acts.find((x) => x.kind !== 'ruse') ?? v.acts[0];
      const tile = 'tile' in a ? a.tile : a.target.tile;
      const [x, y] = v.center(tile); const r = v.canvas.getBoundingClientRect();
      return { x: r.left + x, y: r.top + y };
    });
    if (pt) {
      await p.mouse.click(pt.x, pt.y); await p.waitForTimeout(80);
      if (shot) { await p.screenshot({ path: `${out}/${pre}21-bt-target.png`, fullPage: mobile }); shot = false; }
      const ok = await p.$('[data-bact="do"]'); if (ok) { await ok.click(); await p.waitForTimeout(80); continue; }
    }
    // 移動: 範囲の中で敵に最も近いヘックス
    const mv = await p.evaluate(() => {
      const v = window.__sengoku_bt; if (!v || !v.reach.size || v.sel === null) return null;
      const t = v.t; const en = t.units.filter((u) => !u.out && u.side !== t.playerSide);
      let best = null, bd = 1e9;
      for (const [i] of v.reach) { const [x, y] = v.center(i); for (const e of en) { const [ex, ey] = v.center(e.tile); const d = (x - ex) ** 2 + (y - ey) ** 2; if (d < bd) { bd = d; best = { x, y }; } } }
      const r = v.canvas.getBoundingClientRect(); return best && { x: r.left + best.x, y: r.top + best.y };
    });
    if (mv) { await p.mouse.click(mv.x, mv.y); await p.waitForTimeout(260); const again = await p.evaluate(() => window.__sengoku_bt?.acts.length); if (again) continue; }
    const w = await p.$('[data-bact="wait"]'); if (w) { await w.click(); await p.waitForTimeout(40); } else break;
  }
}
async function fight(label) {
  await p.screenshot({ path: `${out}/${pre}20-${label}-start.png`, fullPage: mobile });
  for (let ph = 0; ph < 25; ph++) {
    if (await p.$('[data-bact="leave"]')) break;
    const mine = await p.evaluate(() => document.getElementById('bt-phase').classList.contains('mine'));
    if (mine) { await playPhase(ph === 0); if (await p.$('[data-bact="leave"]')) break; await p.click('#bt-end'); }
    await p.waitForTimeout(500);
  }
  await p.waitForTimeout(400);
  if (!(await p.$('[data-bact="leave"]'))) { await p.click('#bt-auto'); await p.waitForTimeout(200); }
  await p.screenshot({ path: `${out}/${pre}22-${label}-result.png`, fullPage: mobile });
  await p.click('[data-bact="leave"]');
  await p.waitForTimeout(250);
  await p.screenshot({ path: `${out}/${pre}23-${label}-report.png` });
  await closeModal();
}
// 自軍の攻撃で合戦を開く
let fought = 0;
for (let turn = 0; turn < 8 && fought < 2; turn++) {
  const target = await p.evaluate(() => {
    const { state: s } = window.__sengoku;
    for (const a of Object.values(s.armies)) if (a.clan === s.player && !a.acted) { const btn = document.querySelector(`[data-act="goto"][data-id="${a.id}"]`); if (!btn) continue; btn.click(); const v = window.__sengoku.view; if (v.sel.targets.length) { const t = v.sel.targets[0]; const c = window.__sengoku.center(t.hex); const r = v.canvas.getBoundingClientRect(); return { x: r.left + c[0] * v.scale + v.ox, y: r.top + c[1] * v.scale + v.oy, kind: t.kind }; } }
    return null;
  });
  if (target) {
    await p.mouse.click(target.x, target.y); await p.waitForTimeout(150);
    const btn = await p.$('[data-act="order-cmd"]');
    if (btn) {
      await btn.click(); await p.waitForTimeout(150);
      await p.screenshot({ path: `${out}/${pre}19-order.png`, fullPage: mobile });
      await p.click('#btn-end');
      for (let k = 0; k < 60 && !(await battleOpen()); k++) await p.waitForTimeout(150);
      if (await battleOpen()) { await fight(`own${fought}`); fought++; }
      for (let k = 0; k < 80; k++) { await p.waitForTimeout(200); if (await battleOpen()) { await fight(`ai${fought}`); fought++; } if (await p.evaluate(() => !document.getElementById('btn-end').disabled)) break; }
      await closeModal();
      continue;
    }
  }
  await p.click('#btn-end');
  for (let k = 0; k < 30; k++) { await p.waitForTimeout(300); if (await battleOpen()) { await fight(`ai${fought}`); fought++; } if (await p.evaluate(() => !document.getElementById('btn-end').disabled)) break; }
  await closeModal();
}
console.log({ fought, date: await p.textContent('#date'), errors: errors.length ? errors : 'none' });
await b.close();
