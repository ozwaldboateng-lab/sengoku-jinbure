import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const out = process.argv[2];
const vp = process.argv[3] === 'mobile' ? { width: 400, height: 860 } : { width: 1360, height: 820 };
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: vp });
const errors = [];
p.on('pageerror', (e) => errors.push('pageerror ' + e.message));
p.on('console', (m) => { if (m.type() === 'error') errors.push('console ' + m.text()); });
await p.goto('file://' + process.cwd() + '/dist/index.html');
await p.waitForTimeout(800);
await p.screenshot({ path: `${out}/01-title.png` });
await p.click('[data-act="start"]');
await p.waitForTimeout(500);
await p.screenshot({ path: `${out}/02-map.png` });
// 最初の軍団を選択
await p.click('[data-act="goto"]');
await p.waitForTimeout(300);
await p.screenshot({ path: `${out}/03-army.png` });
// 移動先を1つ選んでクリック
const pt = await p.evaluate(() => null);
// 3ターン進める
for (let i = 0; i < 3; i++) {
  await p.click('#btn-end');
  await p.waitForTimeout(400);
  if (await p.isVisible('#modal:not([hidden])')) { await p.screenshot({ path: `${out}/04-report-${i}.png` }); const c = await p.$('[data-act="close"]'); if (c) await c.click(); }
}
await p.click('#btn-jinji'); await p.click('[data-act="stab"][data-id="gaike"]'); await p.waitForTimeout(200); await p.screenshot({ path: `${out}/05-clans.png` }); await p.click('#modal-close');
await p.click('#btn-jinji'); await p.click('[data-act="stab"][data-id="vassals"]'); await p.waitForTimeout(200); await p.screenshot({ path: `${out}/06-generals.png` }); await p.click('#modal-close');
const date = await p.textContent('#date');
console.log('date', date, 'errors', errors.length ? errors : 'none', pt);
await b.close();
