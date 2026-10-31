// 人事: 軍団の編成（配属・外す）と城主・部隊の画面の傘下
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const out = process.argv[2];
const mobile = process.argv[3] === 'mobile';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: mobile ? { width: 390, height: 844 } : { width: 1360, height: 820 } });
const errors = [];
p.on('pageerror', (e) => errors.push('pageerror ' + e.message));
p.on('console', (m) => { if (m.type() === 'error') errors.push('console ' + m.text()); });
await p.goto('file://' + process.cwd() + '/dist/index.html');
await p.waitForTimeout(400);
await p.click('[data-act="t-new"]'); await p.click('[data-act="pick-scen"][data-id="1560"]'); await p.click('[data-act="pick-clan"][data-id="oda"]');
await p.click('[data-act="start"]'); await p.waitForTimeout(300);
const header = await p.evaluate(() => { const bs = [...document.querySelectorAll('.cmds button')].filter((x) => x.offsetParent); return { n: bs.length, tops: [...new Set(bs.map((x) => Math.round(x.getBoundingClientRect().top)))], sw: document.documentElement.scrollWidth }; });
await p.keyboard.press('2'); await p.click('[data-act="stab"][data-id="corps"]'); await p.waitForTimeout(150);
await p.screenshot({ path: `${out}/190-corps${mobile ? '-m' : ''}.png`, fullPage: false });
const before = await p.evaluate(() => Object.values(window.__sengoku.state.armies).filter((a) => a.clan === 'oda').map((a) => (a.staff ?? []).length));
// 空き枠に配属
const sel = await p.$('select[data-corps]');
let attached = null;
if (sel) { const v = await sel.evaluate((s) => s.options[1]?.value); if (v) { await sel.selectOption(v); await p.waitForTimeout(150); attached = v; } }
const mid = await p.evaluate(() => Object.values(window.__sengoku.state.armies).filter((a) => a.clan === 'oda').map((a) => (a.staff ?? []).length));
// 外す
const outBtn = await p.$('[data-act="corps-out"]');
if (outBtn) { await outBtn.click(); await p.waitForTimeout(150); }
const after = await p.evaluate(() => Object.values(window.__sengoku.state.armies).filter((a) => a.clan === 'oda').map((a) => (a.staff ?? []).length));
// 城主
await p.keyboard.press('1'); await p.click('[data-act="stab"][data-id="shiro"]'); await p.waitForTimeout(100);
await p.screenshot({ path: `${out}/191-governors${mobile ? '-m' : ''}.png` });
const gsel = await p.$('select[data-gov]');
let gov = null;
if (gsel) { const v = await gsel.evaluate((s) => s.options[1]?.value); if (v) { await gsel.selectOption(v); await p.waitForTimeout(150); gov = await p.evaluate((id) => window.__sengoku.state.generals[id].status, v); } }
await p.click('#modal-close');
await p.keyboard.press('n'); await p.waitForTimeout(200);
const panel = await p.evaluate(() => document.querySelector('#panel .corps-mini')?.textContent.slice(0, 80) ?? null);
await p.screenshot({ path: `${out}/192-panel-corps${mobile ? '-m' : ''}.png` });
console.log({ mobile, header, before, attached, mid, after, gov, panel, errors: errors.length ? errors : 'none' });
await b.close();
