// 商い（兵糧・鉄砲・名物）と鉄砲隊の画面確認
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
const hud = async () => p.evaluate(() => document.getElementById('stats').textContent);
const h0 = await hud();
await p.click('#btn-naisei'); await p.waitForTimeout(150); await p.click('[data-act="stab"][data-id="yosan"]'); await p.waitForTimeout(100);
await p.selectOption('select[data-budget="hodo"]', '30'); await p.waitForTimeout(100);
await p.click('[data-act="sub"][data-id="mobilize"]'); await p.waitForTimeout(100);
await p.selectOption('select[data-budget="mobilize"]', '80'); await p.waitForTimeout(100);
const budget = await p.evaluate(() => { const s = window.__sengoku.state; const c = s.clans[s.player]; return { ...c.budget, mob: c.mobilize }; });
await p.screenshot({ path: `${out}/85-budget.png` });
await p.click('[data-act="mtab"][data-id="gaiko"]'); await p.click('[data-act="stab"][data-id="court"]'); await p.waitForTimeout(100);
await p.click('[data-act="court-buy"]'); await p.waitForTimeout(100);
const court = await p.evaluate(() => { const s = window.__sengoku.state; return { court: s.clans[s.player].court, gold: s.clans[s.player].gold, shogun: Object.values(s.clans).find((c) => c.court === 8)?.name }; });
await p.screenshot({ path: `${out}/86-court.png` });
await p.click('[data-act="mtab"][data-id="akinai"]'); await p.click('[data-act="stab"][data-id="rice"]'); await p.waitForTimeout(100);
await p.click('[data-act="rice-buy"][data-id="1000"]'); await p.waitForTimeout(100);
await p.click('[data-act="rice-sell"][data-id="5000"]'); await p.waitForTimeout(100);
await p.screenshot({ path: `${out}/80-trade-rice.png` });
await p.click('[data-act="stab"][data-id="gunbuy"]'); await p.waitForTimeout(100);
await p.click('[data-act="gun-buy"][data-id="500"]'); await p.waitForTimeout(100);
await p.screenshot({ path: `${out}/81-trade-gun.png` });
await p.click('[data-act="stab"][data-id="item"]'); await p.waitForTimeout(100);
const buy = await p.$('[data-act="item-buy"]:not([disabled])');
if (buy) { await buy.click(); await p.waitForTimeout(100); }
await p.click('[data-act="mtab"][data-id="jinji"]'); await p.click('[data-act="stab"][data-id="gift"]'); await p.waitForTimeout(100);
// 最初の名物を柴田勝家に持たせる
const sel = await p.$('select[data-equip]');
const eq = await p.evaluate(() => { const s = document.querySelector('select[data-equip]'); const o = [...s.options].find((x) => x.textContent.startsWith('柴田')); return o ? o.value : null; });
if (sel && eq) { await sel.selectOption(eq); await p.waitForTimeout(150); }
await p.screenshot({ path: `${out}/82-trade-item.png` });
const items = await p.evaluate(() => [...document.querySelectorAll('#modal-body tbody tr')].map((tr) => tr.textContent.replace(/\s+/g, ' ').slice(0, 60)));
await p.click('#modal-close'); await p.waitForTimeout(100);
const h1 = await hud();
// 家臣団で柴田の能力に(+)が付いているか
await p.click('#btn-jinji'); await p.click('[data-act="stab"][data-id="vassals"]'); await p.waitForTimeout(150);
const shibata = await p.evaluate(() => [...document.querySelectorAll('#modal-body tbody tr')].find((tr) => tr.textContent.includes('柴田'))?.textContent.replace(/\s+/g, ' '));
await p.click('#modal-close'); await p.waitForTimeout(100);
// 清洲の部隊に鉄砲を持たせる
const armed = await p.evaluate(() => {
  const btn = [...document.querySelectorAll('#panel [data-act]')];
  return btn.map((x) => x.dataset.act).join(',');
});
// 部隊を選ぶ（N キーで次の部隊）
await p.keyboard.press('n'); await p.waitForTimeout(200);
const armBtn = await p.$('[data-act="arm-guns"]');
if (armBtn) { await armBtn.click(); await p.waitForTimeout(150); }
await p.screenshot({ path: `${out}/83-army-guns.png` });
const gunsLine = await p.evaluate(() => [...document.querySelectorAll('#panel dt')].find((d) => d.textContent === '鉄砲')?.nextElementSibling?.textContent);
// 外交: 名物を添える
await p.click('#btn-gaiko'); await p.click('[data-act="stab"][data-id="gaike"]'); await p.waitForTimeout(150);
await p.click('button[data-act="dip-open"][data-id="saito"]'); await p.waitForTimeout(150); // 家の札を開いて交渉
const giftOpts = await p.evaluate(() => [...document.querySelectorAll('#sel-gift option')].map((o) => o.textContent));
const before = await p.evaluate(() => document.querySelector('[data-act="dip"][data-kind="alliance"]:not([disabled])')?.textContent);
if (giftOpts.length > 1) { await p.selectOption('#sel-gift', { index: 1 }); await p.waitForTimeout(150); }
const after = await p.evaluate(() => document.querySelector('[data-act="dip"][data-kind="alliance"]:not([disabled])')?.textContent);
await p.screenshot({ path: `${out}/84-dip-gift.png` });
console.log({ court, budget, h0, h1, items, shibata, gunsLine, giftOpts, before, after, armed: armed.slice(0, 80), errors: errors.length ? errors : 'none' });
await b.close();
