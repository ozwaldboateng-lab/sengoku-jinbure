// 地図の下絵: なし・濃・中・淡の切り替え、保存、凡例と表示の切り替えとの重なり
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const out = process.argv[2];
const mobile = process.argv[3] === 'mobile';
const sfx = mobile ? '-m' : '';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await b.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1360, height: 820 } });
const p = await ctx.newPage();
const errors = [];
p.on('pageerror', (e) => errors.push('pageerror ' + e.message));
await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(500);
await p.click('[data-act="t-new"]'); await p.click('[data-act="pick-scen"][data-id="1560"]'); await p.click('[data-act="pick-clan"][data-id="oda"]');
await p.click('[data-act="start"]'); await p.waitForTimeout(300);
for (let k = 0; k < 4; k++) if (await p.$('#modal:not([hidden])')) await p.click('#modal-close').catch(() => {});
const res = {};
for (const [a, n] of [['off', 'none'], ['0.8', 'dark'], ['0.55', 'mid'], ['0.35', 'light']]) {
  await p.click(`#mapbase [data-alpha="${a}"]`); await p.waitForTimeout(150);
  res[n] = await p.evaluate(() => ({ alpha: window.__sengoku.view.hexAlpha, pressed: document.querySelector('#mapbase [aria-pressed="true"]')?.textContent }));
  await p.screenshot({ path: `${out}/330-base-${n}${sfx}.png` });
}
// 拡大して近江（琵琶湖）を見る
await p.evaluate(() => { const v = window.__sengoku.view, s = v.state; const c = s.castles.find((x) => x.id === 'kannonji'); v.centerOn(c.hex, 3); });
await p.waitForTimeout(150); await p.screenshot({ path: `${out}/331-base-biwa${sfx}.png` });
await p.click('#mapmode [data-mode="meibun"]'); await p.waitForTimeout(150); await p.screenshot({ path: `${out}/332-base-meibun${sfx}.png` });
await p.reload(); await p.waitForTimeout(500);
const kept = await p.evaluate(() => window.__sengoku.view.hexAlpha);
const sw = await p.evaluate(() => document.documentElement.scrollWidth);
console.log({ mobile, res, kept, sw, errors: errors.length ? errors : 'none' });
await b.close();
