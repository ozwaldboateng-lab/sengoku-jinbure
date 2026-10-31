// 将軍と大義名分: 幕府の画面（献金・御内書・職の願い出）、出陣の画面の名分
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
await p.evaluate(() => { window.__sengoku.state.clans.oda.gold = 60000; });
await p.keyboard.press('4'); await p.click('[data-act="stab"][data-id="bakufu"]'); await p.waitForTimeout(150);
const head = await p.evaluate(() => document.querySelector('#modal .kv').textContent.replace(/\s+/g, ' ').slice(0, 80));
const t0 = await p.evaluate(() => window.__sengoku.state.bakufu.trust.oda);
for (let k = 0; k < 3; k++) { await p.click('[data-act="bk-donate"]'); await p.waitForTimeout(80); }
const t1 = await p.evaluate(() => window.__sengoku.state.bakufu.trust.oda);
await p.selectOption('#sel-order', 'saito'); await p.click('[data-act="bk-order"]'); await p.waitForTimeout(150);
const orders = await p.evaluate(() => window.__sengoku.state.bakufu.orders.map((o) => o.target + '>' + (o.to === 'all' ? 'all' : o.to.join(','))));
const postBtn = await p.$('[data-act="bk-post"][data-id="s:尾張"]');
if (postBtn) { await postBtn.click(); await p.waitForTimeout(150); }
const shugo = await p.evaluate(() => window.__sengoku.state.bakufu.shugo['尾張'] ?? null);
await p.screenshot({ path: `${out}/270-bakufu${sfx}.png`, fullPage: true });
await p.click('#modal-close');
// 出陣の画面: 斎藤の城（隣）を狙う部隊を選んで名分を見る
const shown = await p.evaluate(async () => {
  const S = window.__sengoku, s = S.state;
  return null;
});
const sw = await p.evaluate(() => document.documentElement.scrollWidth);
console.log({ mobile, head, t0, t1, orders, shugo, sw, errors: errors.length ? errors : 'none' });
await b.close();
