// タイトル「陣触」: 最初の画面・時代を選ぶ・家を選ぶ（地図で選ぶ・札で選ぶ）・遊び方・続きから
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
p.on('console', (m) => { if (m.type() === 'error' && !/fonts/.test(m.text())) errors.push('console ' + m.text()); });
await p.goto('file://' + process.cwd() + '/dist/index.html');
await p.waitForTimeout(600);
const top = await p.evaluate(() => ({ screen: document.getElementById('title').dataset.screen, items: [...document.querySelectorAll('.ttl-item b')].map((x) => x.textContent), name: document.getElementById('ttl-name').textContent, doc: document.title }));
await p.screenshot({ path: `${out}/300-title${sfx}.png` });
await p.click('[data-act="t-help"]'); await p.waitForTimeout(150);
const help = await p.evaluate(() => document.querySelectorAll('.ttl-help .glossary dt').length);
await p.screenshot({ path: `${out}/301-title-help${sfx}.png` });
await p.keyboard.press('Escape'); await p.waitForTimeout(100);
await p.click('[data-act="t-new"]'); await p.waitForTimeout(150);
const era = await p.evaluate(() => [...document.querySelectorAll('.era-card .era-n')].map((x) => x.textContent));
await p.screenshot({ path: `${out}/302-title-era${sfx}.png` });
await p.click('[data-act="pick-scen"][data-id="1560"]'); await p.waitForTimeout(300);
await p.screenshot({ path: `${out}/303-title-clan${sfx}.png` });
const clan0 = await p.evaluate(() => document.getElementById('ttl-clan').textContent);
// 地図の上で今川の領地を押す
const hit = await p.evaluate(() => {
  const st = window.__sengoku.view; // 本の地図ではなく、タイトルの地図の座標を探す
  const c = document.getElementById('ttl-map').getBoundingClientRect();
  return { w: c.width, h: c.height };
});
let picked = null;
for (const [fx, fy] of [[0.5, 0.5], [0.55, 0.5], [0.6, 0.55], [0.45, 0.45], [0.5, 0.3], [0.35, 0.3]]) {
  await p.mouse.click(Math.round(hit.w * fx * (mobile ? 1 : 0.7)), Math.round(hit.h * fy * (mobile ? 0.8 : 1)));
  await p.waitForTimeout(120);
  picked = await p.evaluate(() => document.getElementById('ttl-clan').textContent);
  if (picked !== clan0) break;
}
await p.click('[data-act="pick-clan"][data-id="takeda"]'); await p.waitForTimeout(200);
const takeda = await p.evaluate(() => ({ name: document.getElementById('ttl-clan').textContent, blurb: document.querySelector('.ttl-blurb').textContent, face: !!document.querySelector('.ttl-pick img') }));
await p.screenshot({ path: `${out}/304-title-takeda${sfx}.png` });
await p.click('[data-act="pick-diff"][data-id="hard"]');
await p.click('[data-act="start"]'); await p.waitForTimeout(400);
const started = await p.evaluate(() => ({ hidden: document.getElementById('title').hidden, player: window.__sengoku.state.player, diff: window.__sengoku.state.difficulty, brand: document.querySelector('.bar .title').textContent }));
// 読み直すと「続きから」
await p.reload(); await p.waitForTimeout(600);
const cont = await p.evaluate(() => document.querySelector('[data-act="t-continue"]')?.textContent ?? null);
await p.click('[data-act="t-continue"]'); await p.waitForTimeout(300);
const resumed = await p.evaluate(() => window.__sengoku.state?.player);
const sw = await p.evaluate(() => document.documentElement.scrollWidth);
console.log({ mobile, top, help, era, clan0, picked, takeda, started, cont, resumed, sw, errors: errors.length ? errors : 'none' });
await b.close();
