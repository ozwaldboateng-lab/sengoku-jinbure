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
await p.click('#btn-gaiko'); await p.click('[data-act="stab"][data-id="gaike"]'); await p.waitForTimeout(150);
await p.screenshot({ path: `${out}/50-dip.png` });
// 同盟を申し込む（最初に押せるもの）
const res = [];
for (let k = 0; k < 3; k++) {
  const btn = await p.$('[data-act="dip"][data-kind="alliance"]:not([disabled])');
  if (!btn) break;
  const who = await btn.getAttribute('data-id');
  await btn.click(); await p.waitForTimeout(150);
  res.push(who + ':' + await p.textContent('#toast'));
}
await p.screenshot({ path: `${out}/51-dip-after.png` });
await p.click('#modal-close');
let asked = 0, battles = 0;
for (let turn = 0; turn < 8; turn++) {
  await p.click('#btn-end');
  for (let k = 0; k < 80; k++) {
    await p.waitForTimeout(150);
    if (await p.$('[data-act="ask-yes"]')) { if (!asked) await p.screenshot({ path: `${out}/52-ask.png` }); asked++; await p.click('[data-act="ask-yes"]'); }
    if (await p.evaluate(() => !document.getElementById('battle').hidden)) { battles++; if (!(await p.$('[data-bact="leave"]'))) await p.click('#bt-auto'); await p.waitForTimeout(100); await p.click('[data-bact="leave"]'); }
    if (await p.evaluate(() => !document.getElementById('btn-end').disabled && document.getElementById('battle').hidden)) break;
  }
  await p.evaluate(() => document.querySelector('#modal:not([hidden]) [data-act="close"]')?.click());
}
const info = await p.evaluate(() => { const s = window.__sengoku.state; return { date: document.getElementById('date').textContent, treaties: s.treaties.filter((t) => t.a === s.player || t.b === s.player).map((t) => `${s.clans[t.a === s.player ? t.b : t.a].name}:${t.kind}`), all: s.treaties.length }; });
await p.click('#btn-gaiko'); await p.click('[data-act="stab"][data-id="gaike"]'); await p.waitForTimeout(150);
await p.screenshot({ path: `${out}/53-dip-later.png` });
console.log({ res, asked, battles, ...info, errors: errors.length ? errors : 'none' });
await b.close();
