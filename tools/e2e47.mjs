// 家臣の官位（推挙）と守護代
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
// 無位のうちは推挙できない
await p.keyboard.press('4'); await p.click('[data-act="stab"][data-id="court"]'); await p.waitForTimeout(150);
const blocked = await p.$eval('[data-act="kan-up"]', (x) => x.title || x.getAttribute('aria-disabled')).catch(() => null);
// 当家を従四位上にし、金を足す。一人を外の官を受けた者にしておく
const gid = await p.evaluate(() => { const s = window.__sengoku.state; s.clans.oda.court = 3; s.clans.oda.gold = 50000; const id = document.querySelector('[data-act="kan-up"]').dataset.id; s.generals[id].outer = 'imagawa'; return id; });
await p.click('[data-act="stab"][data-id="bakufu"]'); await p.click('[data-act="stab"][data-id="court"]'); await p.waitForTimeout(150);
const on0 = await p.evaluate((id) => Math.round(window.__sengoku.state.generals[id].on), gid);
await p.click(`[data-act="kan-up"][data-id="${gid}"]`); await p.waitForTimeout(150);
await p.click(`[data-act="kan-up"][data-id="${gid}"]`); await p.waitForTimeout(150);
const third = await p.$eval(`[data-act="kan-up"][data-id="${gid}"]`, (x) => x.title || x.getAttribute('aria-disabled') || 'enabled').catch(() => 'none');
const k = await p.evaluate((id) => { const g = window.__sengoku.state.generals[id]; return { name: g.name, kan: g.kan, on: Math.round(g.on), fame: Math.round(g.fame ?? 0), outer: g.outer ?? null, gold: window.__sengoku.state.clans.oda.gold }; }, gid);
await p.screenshot({ path: `${out}/470-kan${sfx}.png`, fullPage: true });
// 守護代: 当家の城のある国の守護にしておく
await p.click('[data-act="stab"][data-id="bakufu"]'); await p.waitForTimeout(150);
const prov = await p.evaluate(() => { const tr = [...document.querySelectorAll('#modal-body tr')].find((r) => r.children[1]?.textContent.includes('当家の城のある国')); return tr ? tr.children[0].textContent.replace('守護', '') : null; });
await p.evaluate((pv) => { window.__sengoku.state.bakufu.shugo[pv] = 'oda'; }, prov);
await p.click('[data-act="stab"][data-id="court"]'); await p.click('[data-act="stab"][data-id="bakufu"]'); await p.waitForTimeout(150);
const opt = await p.$eval('select[data-sgdp]', (x) => x.options[1]?.value);
await p.selectOption('select[data-sgdp]', opt); await p.waitForTimeout(150);
const sgd = await p.evaluate((id) => { const g = window.__sengoku.state.generals[id]; return { name: g.name, shugodai: g.shugodai, on: Math.round(g.on) }; }, opt);
await p.screenshot({ path: `${out}/471-shugodai${sfx}.png`, fullPage: true });
// 月を送ると治安に守護代の分が入る・守護でなくなれば外れる
await p.click('#modal-close');
await p.evaluate((pv) => { window.__sengoku.state.bakufu.shugo[pv] = 'imagawa'; }, prov);
await p.keyboard.press('e');
await p.waitForFunction(() => window.__sengoku.state.turn >= 2, null, { timeout: 90000 });
await p.waitForTimeout(300);
const gone = await p.evaluate((id) => window.__sengoku.state.generals[id].shugodai ?? null, opt);
const sw = await p.evaluate(() => document.documentElement.scrollWidth);
console.log(JSON.stringify({ blocked, on0, k, third, prov, sgd, gone, sw, errors: errors.length ? errors : 'none' }, null, 1));
await b.close();
