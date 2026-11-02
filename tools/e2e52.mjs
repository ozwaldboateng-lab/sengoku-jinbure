// 与力: 寄親の札から「与力を付ける・外す」の一覧で、チェックした城持ちをまとめて与力に。与力の札からは外すだけ
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
await p.keyboard.press('3'); await p.click('[data-act="stab"][data-id="fronts"]'); await p.waitForTimeout(150);
// 当主の居城以外の3城を、3人の宿老に一つずつ
const plan = await p.evaluate(() => { const s = window.__sengoku.state, L = s.generals[s.clans.oda.leader]; const cs = s.castles.filter((c) => c.owner === 'oda' && c.i !== L.loc).map((c) => String(c.i)); const gs = [...document.querySelectorAll('#sel-fief-gen option')].map((o) => o.value).slice(0, cs.length); return { cs, gs }; });
for (let k = 0; k < plan.cs.length; k++) { await p.selectOption('#sel-fief-gen', plan.gs[k]); await p.selectOption('#sel-fief-castle', plan.cs[k]); await p.click('[data-act="fief-grant"]'); await p.waitForTimeout(150); }
const fs = () => p.evaluate(() => window.__sengoku.state.fronts.map((f) => ({ id: f.id, name: window.__sengoku.state.generals[f.leader].name, boss: f.boss ?? null })));
const f0 = await fs();
// 一人目の札で与力の一覧を開き、残り全員をチェックして決める
await p.click('[data-act="yoriki-open"] >> nth=0'); await p.waitForTimeout(150);
const listN = await p.evaluate(() => document.querySelectorAll('input[name="yoriki"]').length);
await p.evaluate(() => document.querySelectorAll('.cutin, #cutin').forEach((x) => x.remove())); await p.evaluate(() => document.querySelector('.yoriki-list')?.scrollIntoView({ block: 'center' })); await p.waitForTimeout(200); await p.screenshot({ path: `${out}/520-yoriki-list${sfx}.png` });
for (const cb of await p.$$('input[name="yoriki"]')) await cb.check();
await p.click('[data-act="yoriki-apply"]'); await p.waitForTimeout(150);
const t1 = await p.evaluate(() => document.getElementById('toast').textContent);
const f1 = await fs();
// 一人を外す（一覧でチェックを外す）
await p.click('[data-act="yoriki-open"]'); await p.waitForTimeout(150);
await (await p.$$('input[name="yoriki"]'))[0].uncheck();
await p.click('[data-act="yoriki-apply"]'); await p.waitForTimeout(150);
const f2 = await fs();
// 与力の札の「与力を外す」
const offBtn = await p.$('[data-act="yoriki-off"]');
if (offBtn) { await offBtn.click(); await p.waitForTimeout(150); }
const f3 = await fs();
await p.screenshot({ path: `${out}/521-yoriki-after${sfx}.png`, fullPage: true });
const sw = await p.evaluate(() => document.documentElement.scrollWidth);
console.log(JSON.stringify({ f0, listN, t1, f1, f2, f3, sw, errors: errors.length ? errors : 'none' }));
await b.close();
