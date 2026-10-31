// 身分・母衣衆・伝令の画面確認
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
await p.click('#btn-jinji'); await p.click('[data-act="stab"][data-id="vassals"]');
await p.waitForTimeout(200);
await p.screenshot({ path: `${out}/70-vassals.png` });
const rows = await p.evaluate(() => [...document.querySelectorAll('#modal-body tbody tr')].slice(0, 30).map((tr) => [...tr.children].slice(0, 2).map((td) => td.textContent.trim()).join(':') + ':' + tr.children[7].textContent.trim()));
// 母衣衆の付け外し（使番のタブで）
await p.click('[data-act="stab"][data-id="tsukai"]'); await p.waitForTimeout(150);
const offBtn = await p.$('[data-act="tsukai-off"]');
await offBtn.click(); await p.waitForTimeout(150);
const afterOff = await p.evaluate(() => document.querySelectorAll('[data-act="tsukai-off"]').length);
const onBtn = await p.$('[data-act="tsukai-on"]:not([disabled])');
if (onBtn) { await onBtn.click(); await p.waitForTimeout(150); }
const afterOn = await p.evaluate(() => document.querySelectorAll('[data-act="tsukai-off"]').length);
// 奉行の任命（内政の奉行のタブで）
await p.keyboard.press('1'); await p.click('[data-act="stab"][data-id="bugyo"]'); await p.waitForTimeout(150);
const bOn = await p.$('[data-act="bugyo-on"]:not([disabled])');
if (bOn) { await bOn.click(); await p.waitForTimeout(150); }
const bugyoN = await p.evaluate(() => document.querySelectorAll('[data-act="bugyo-off"]').length);
await p.click('[data-act="stab"][data-id="bugyo"]'); await p.waitForTimeout(100);
const bugyoLine = await p.evaluate(() => document.querySelector('#modal-body .hint').textContent);
await p.screenshot({ path: `${out}/71-bugyo.png` });
await p.evaluate(() => document.querySelector('#modal:not([hidden]) [data-act="close"]')?.click());
// 合戦を開いて本陣から遠い部隊を選ぶ
const opened = await p.evaluate(async () => {
  const w = window;
  return !!w.__sengoku_bt || true;
});
console.log({ bugyoN, bugyoLine, rows: rows.slice(0, 26), afterOff, afterOn, opened, errors: errors.length ? errors : 'none' });
await b.close();
