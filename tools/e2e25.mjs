// 仕置と家督: 月の報告の仕置（見せしめ）、城の画面の残り火、人事の家督（跡継ぎ・後見役・遺言）、当主が倒れた月の遺言
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const out = process.argv[2];
const mobile = process.argv[3] === 'mobile';
const sfx = mobile ? '-m' : '';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: mobile ? { width: 390, height: 844 } : { width: 1360, height: 820 } });
const errors = [];
p.on('pageerror', (e) => errors.push('pageerror ' + e.message));
p.on('console', (m) => { if (m.type() === 'error') errors.push('console ' + m.text()); });
await p.goto('file://' + process.cwd() + '/dist/index.html');
await p.waitForTimeout(400);
await p.click('[data-act="t-new"]'); await p.click('[data-act="pick-scen"][data-id="1560"]'); await p.click('[data-act="pick-clan"][data-id="oda"]');
await p.click('[data-act="start"]'); await p.waitForTimeout(300);
const ci = await p.evaluate(() => { const s = window.__sengoku.state; const c = s.castles.find((x) => x.owner === 'saito'); c.owner = 'oda'; c.oldOwner = 'saito'; c.ember = 50; c.chian = 30; c.garrison = 20000; s.shioki = [{ castle: c.i, turn: s.turn }]; const L = s.generals[s.clans.oda.leader]; L.sick = 4; s.willAsked = s.turn; return c.i; });
// 家督
await p.keyboard.press('3'); await p.click('[data-act="stab"][data-id="katoku"]'); await p.waitForTimeout(150);
const heirVal = await p.$eval('select[data-heir]', (s) => s.options[1]?.value ?? '');
await p.selectOption('select[data-heir]', heirVal); await p.waitForTimeout(100);
const regVal = await p.$eval('select[data-regent]', (s) => s.options[1]?.value ?? '');
await p.selectOption('select[data-regent]', regVal); await p.waitForTimeout(100);
await p.selectOption('select[data-will]', 'retainers'); await p.waitForTimeout(100);
await p.screenshot({ path: `${out}/250-katoku${sfx}.png` });
const katoku = await p.evaluate(() => { const C = window.__sengoku.state.clans.oda; return { heir: C.heir, regent: C.regent, will: C.will }; });
for (let k = 0; k < 3; k++) if (await p.$('#modal:not([hidden])')) await p.click('#modal-close').catch(() => {});
await p.keyboard.press('e');
for (let k = 0; k < 120 && !(await p.$('#modal [data-act="shioki"]')); k++) { const ask = await p.$('[data-act="ask-no"]'); if (ask) await ask.click().catch(() => {}); await p.waitForTimeout(500); }
const willShown = await p.evaluate(() => !!document.querySelector('#modal select[data-will]'));
await p.screenshot({ path: `${out}/251-report-shioki${sfx}.png` });
const before = await p.evaluate((ci) => { const c = window.__sengoku.state.castles[ci]; return { chian: Math.round(c.chian), ember: Math.round(c.ember), dev: c.dev }; }, ci);
await p.click(`#modal [data-act="shioki"][data-id="${ci}:misesime"]`); await p.waitForTimeout(150);
const after = await p.evaluate((ci) => { const s = window.__sengoku.state, c = s.castles[ci]; return { chian: Math.round(c.chian), ember: Math.round(c.ember), dev: c.dev, pending: (s.shioki ?? []).length }; }, ci);
const sw = await p.evaluate(() => document.documentElement.scrollWidth);
console.log({ mobile, katoku, willShown, before, after, sw, errors: errors.length ? errors : 'none' });
await b.close();
