// 忍びの場面: 流言・放火・暗殺・探りを順に行い、夜の潜入 → 忍び頭 → 首尾の場面が出て、閉じると元に戻るか
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const out = process.argv[2], mobile = process.argv[3] === 'mobile', sfx = mobile ? '-m' : '';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage(mobile ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1360, height: 820 } });
const errors = [];
p.on('pageerror', (e) => errors.push('pageerror ' + e.message));
await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(400);
await p.click('[data-act="t-new"]'); await p.click('[data-act="pick-scen"][data-id="1560"]'); await p.click('[data-act="pick-clan"][data-id="oda"]');
await p.click('[data-act="start"]'); await p.waitForTimeout(300);
for (let k = 0; k < 4; k++) if (await p.$('#modal:not([hidden])')) await p.click('#modal-close').catch(() => {});
const res = {};
if (process.argv[4]) await p.evaluate((v) => { window.__seedTry = +v; }, process.argv[4]);
for (const act of ['rumor', 'arson', 'assassinate', 'spy']) {
  // 忍び頭（百地丹波）を据え直し、月に一度の決まりと金を戻す
  await p.evaluate(() => { const s = window.__sengoku.state, g = s.generals.momochi_tanba, k = s.castles.find((c) => c.id === 'kiyosu'); g.clan = 'oda'; g.status = 'free'; g.army = null; g.captor = null; g.loc = k.i; s.clans.oda.ninja = g.id; s.clans.oda.ninjaTurn = -9; s.clans.oda.gold = 50000; if (window.__seedTry !== undefined) s.seed = window.__seedTry; });
  await p.keyboard.press('3'); await p.click('[data-act="stab"][data-id="tokusei"]'); await p.waitForTimeout(150);
  await p.selectOption('#sel-ninja-act', act).catch(() => {}); await p.waitForTimeout(150);
  const opt = await p.$eval('#sel-ninja-target option:nth-child(2)', (o) => o.value).catch(() => null);
  if (!opt) { res[act] = 'no target'; await p.click('#modal-close'); continue; }
  await p.selectOption('#sel-ninja-target', opt); await p.waitForTimeout(150);
  await p.click('[data-act="ninja-do"]'); await p.waitForTimeout(500);
  const beats = [];
  for (let k = 0; k < 10; k++) {
    const st = await p.evaluate(() => { const el = document.getElementById('scene'); if (!el || el.hidden) return null; const box = el.querySelector('.op-box'); return `${box.querySelector('h2')?.textContent ?? box.querySelector('.op-name')?.textContent ?? ''}｜${(box.querySelector('.op-line, .op-narr p')?.textContent ?? '').slice(0, 70)}`; });
    if (!st) break;
    beats.push(st);
    if (k === 2) { await p.waitForTimeout(800); await p.screenshot({ path: `${out}/56-${act}${sfx}.png` }); }
    await p.click('#scene .op-box'); await p.waitForTimeout(220);
  }
  res[act] = beats;
  await p.waitForTimeout(300);
  if (await p.$('#modal:not([hidden])')) await p.click('#modal-close').catch(() => {});
}
const sw = await p.evaluate(() => document.documentElement.scrollWidth);
console.log(JSON.stringify({ res, sw, errors: errors.length ? errors : 'none' }, null, 1));
await b.close();
