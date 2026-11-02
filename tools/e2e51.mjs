// 城ごとの金の使い道: 内政への投資・新田開発・普請（石垣〜天守）・年貢の率・まとめて投資
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const out = process.argv[2], mobile = process.argv[3] === 'mobile', sfx = mobile ? '-m' : '';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: mobile ? { width: 390, height: 844 } : { width: 1360, height: 820 } });
const errors = [];
p.on('pageerror', (e) => errors.push('pageerror ' + e.message));
await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(400);
await p.click('[data-act="t-new"]'); await p.click('[data-act="pick-scen"][data-id="1560"]'); await p.click('[data-act="pick-clan"][data-id="oda"]');
await p.click('[data-act="start"]'); await p.waitForTimeout(300);
for (let k = 0; k < 4; k++) if (await p.$('#modal:not([hidden])')) await p.click('#modal-close').catch(() => {});
await p.evaluate(() => { window.__sengoku.state.clans.oda.gold = 100000; });
const C = () => p.evaluate(() => { const s = window.__sengoku.state, c = s.castles.find((x) => x.id === 'kiyosu'); return { dev: +c.dev.toFixed(3), cdev: +c.cdev.toFixed(3), koku: +c.baseKoku.toFixed(2), shinden: c.shinden ?? null, fort: c.fort ?? 0, fortBuild: c.fortBuild ?? null, gold: Math.round(s.clans.oda.gold) }; });
await p.keyboard.press('1'); await p.click('[data-act="stab"][data-id="shiro"]'); await p.waitForTimeout(100);
await p.click('[data-act="goto-castle"] >> text=清洲城'); await p.waitForTimeout(200);
const c0 = await C();
await p.click('#panel [data-act="inv-agri"]'); await p.waitForTimeout(100);
await p.click('#panel [data-act="inv-com"]'); await p.waitForTimeout(100);
await p.click('#panel [data-act="shinden"]'); await p.waitForTimeout(100);
await p.click('#panel [data-act="fort"]'); await p.waitForTimeout(100);
const c1 = await C();
const panel = await p.evaluate(() => document.body.innerText.match(/投資[\s\S]{0,40}|新田開発\n[^\n]*|普請\n[^\n]*/g));
await p.screenshot({ path: `${out}/510-invest${sfx}.png` });
// 年貢の率とまとめて投資
await p.keyboard.press('1'); await p.click('[data-act="stab"][data-id="yosan"]'); await p.waitForTimeout(100);
await p.click('[data-act="tax"][data-id="low"]'); await p.waitForTimeout(100);
await p.click('[data-act="inv-bulk"][data-id="agri"]'); await p.waitForTimeout(150);
const bulk = await p.evaluate(() => document.getElementById('toast').textContent);
await p.screenshot({ path: `${out}/511-budget${sfx}.png`, fullPage: true });
await p.click('#modal-close');
// 工事を翌月に終わる形にして月を送る
await p.evaluate(() => { const s = window.__sengoku.state, c = s.castles.find((x) => x.id === 'kiyosu'); c.shinden.until = s.turn + 1; c.fortBuild.until = s.turn + 1; });
await p.click('#btn-end');
for (let k = 0; k < 300 && (await p.evaluate(() => window.__sengoku.state.turn)) < 2; k++) {
  const auto = await p.$('#bt-auto:not([disabled])'); if (auto && await auto.isVisible()) await auto.click().catch(() => {});
  const leave = await p.$('[data-bact="leave"]'); if (leave && await leave.isVisible()) await leave.click().catch(() => {});
  await p.waitForTimeout(300);
}
await p.waitForTimeout(300);
const c2 = await C();
const tax = await p.evaluate(() => window.__sengoku.state.clans.oda.tax);
const log = await p.evaluate(() => window.__sengoku.state.log.filter((l) => l.mine && /新田|石垣|普請|年貢/.test(l.text)).map((l) => l.text));
const sw = await p.evaluate(() => document.documentElement.scrollWidth);
console.log(JSON.stringify({ c0, c1, panel, bulk, c2, tax, log, sw, errors: errors.length ? errors : 'none' }, null, 1));
await b.close();
