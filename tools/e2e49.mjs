// 唐船: 港の札・南蛮市の表示、来航中は港の持ち主に貿易の利が入る
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const out = process.argv[2], mobile = process.argv[3] === 'mobile', sfx = mobile ? '-m' : '';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: mobile ? { width: 390, height: 844 } : { width: 1360, height: 820 } });
const errors = [];
p.on('pageerror', (e) => errors.push('pageerror ' + e.message));
await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(400);
await p.click('[data-act="t-new"]'); await p.click('[data-act="pick-scen"][data-id="1560"]'); await p.click('[data-act="pick-clan"][data-id="shimazu"]');
await p.click('[data-act="start"]'); await p.waitForTimeout(300);
for (let k = 0; k < 4; k++) if (await p.$('#modal:not([hidden])')) await p.click('#modal-close').catch(() => {});
await p.evaluate(() => { const s = window.__sengoku.state; s.karasen = [{ port: 'uchi', until: s.turn + 3 }]; s.ships = []; });
await p.keyboard.press('5'); await p.click('[data-act="stab"][data-id="nanban"]'); await p.waitForTimeout(150);
const tab = await p.evaluate(() => [...document.querySelectorAll('#modal-body dt')].filter((d) => /唐船|銀/.test(d.textContent)).map((d) => d.textContent + '=' + d.nextElementSibling.textContent));
await p.click('#modal-close');
await p.keyboard.press('1'); await p.click('[data-act="stab"][data-id="shiro"]'); await p.waitForTimeout(100);
await p.click('[data-act="goto-castle"] >> text=内城'); await p.waitForTimeout(200);
const panel = await p.evaluate(() => document.body.innerText.match(/唐船[^\n]*\n?[^\n]*/)?.[0]);
await p.screenshot({ path: `${out}/490-karasen${sfx}.png` });
// 月を送る（合戦は自動で決着）: 唐船の利の分（700）が入っている
const g0 = await p.evaluate(() => window.__sengoku.state.clans.shimazu.gold);
const inc = await p.evaluate(() => window.__sengoku.state.log.length);
await p.click('#btn-end');
for (let k = 0; k < 300 && (await p.evaluate(() => window.__sengoku.state.turn)) < 2; k++) {
  const auto = await p.$('#bt-auto:not([disabled])'); if (auto && await auto.isVisible()) await auto.click().catch(() => {});
  const leave = await p.$('[data-bact="leave"]'); if (leave && await leave.isVisible()) await leave.click().catch(() => {});
  await p.waitForTimeout(300);
}
const after = await p.evaluate(() => ({ gold: Math.round(window.__sengoku.state.clans.shimazu.gold), karasen: window.__sengoku.state.karasen }));
const sw = await p.evaluate(() => document.documentElement.scrollWidth);
console.log(JSON.stringify({ tab, panel, gold: `${Math.round(g0)}→${after.gold}`, karasen: after.karasen, sw, errors: errors.length ? errors : 'none' }, null, 1));
await b.close();
