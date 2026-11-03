// 逸話の場面: 当家の話（利家の帰参）と他家の話（姫若子・三子教訓状）を流し、名前の置き換えと能力の伸びを見る
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const out = process.argv[2], mobile = process.argv[3] === 'mobile', sfx = mobile ? '-m' : '';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage(mobile ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1360, height: 820 } });
const errors = [];
p.on('pageerror', (e) => errors.push('pageerror ' + e.message));
await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.evaluate(() => localStorage.setItem('sengoku-events', 'on')); await p.reload(); await p.waitForTimeout(400);
await p.click('[data-act="t-new"]'); await p.click('[data-act="pick-scen"][data-id="1560"]'); await p.click('[data-act="pick-clan"][data-id="oda"]');
await p.click('[data-act="start"]'); await p.waitForTimeout(300);
for (let k = 0; k < 4; k++) if (await p.$('#modal:not([hidden])')) await p.click('#modal-close').catch(() => {});
const walk = async (tag) => {
  const done = p.evaluate(() => window.__sengoku.playEvents());
  await p.waitForTimeout(500);
  const beats = [];
  for (let k = 0; k < 30; k++) {
    const st = await p.evaluate(() => { const el = document.getElementById('scene'); if (!el || el.hidden) return null; const box = el.querySelector('.op-box'); return `${document.querySelector('#scene .op-scen')?.textContent}｜${box.querySelector('h2')?.textContent ?? box.querySelector('.op-name')?.textContent ?? ''}｜${(box.querySelector('.op-line, .op-narr p')?.textContent ?? '').slice(0, 70)}｜${box.querySelector('img') ? '顔' : ''}`; });
    if (!st) break;
    beats.push(st);
    if (k === 2 || st.includes('｜逸話｜')) { await p.waitForTimeout(800); await p.screenshot({ path: `${out}/58-${tag}${k}${sfx}.png` }); }
    await p.click('#scene .op-box'); await p.waitForTimeout(220);
  }
  await done;
  return beats;
};
const before = await p.evaluate(() => window.__sengoku.state.generals.maeda_toshiie.bra);
await p.evaluate(() => window.__sengoku.anecdote('toshiie'));
const toshiie = await walk('toshiie');
const after = await p.evaluate(() => window.__sengoku.state.generals.maeda_toshiie.bra);
await p.evaluate(() => window.__sengoku.anecdote('sanshi'));
const sanshi = await walk('sanshi');
const log = await p.evaluate(() => window.__sengoku.state.log.filter((l) => l.text.startsWith('【逸話】')).map((l) => l.text));
console.log(JSON.stringify({ toshiie, sanshi, bra: [before, after], log, errors }, null, 1));
const ok = toshiie.length === 5 && sanshi.length === 5 && after === Math.min(100, before + 2) && log.length === 2 && !toshiie.join('').includes('{') && !errors.length;
console.log(ok ? 'OK' : 'NG');
await b.close();
