// 唐入り（第五段）: タイトルの「文禄元年 唐入り」（唐入りを決めた記録があるときだけ）、厭戦の札、和議・撤兵、結末の画面
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const out = process.argv[2], mobile = process.argv[3] === 'mobile';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage(mobile ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1360, height: 820 } });
const errors = []; p.on('pageerror', (e) => errors.push(e.message));
await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(300);
await p.click('[data-act="t-new"]'); await p.waitForTimeout(150);
const before = await p.evaluate(() => [...document.querySelectorAll('[data-act="pick-scen"]')].map((x) => x.dataset.id));
await p.evaluate(() => localStorage.setItem('sengoku-karairi', JSON.stringify({ clan: 'oda' })));
await p.click('[data-act="t-back"]'); await p.click('[data-act="t-new"]'); await p.waitForTimeout(150);
const after = await p.evaluate(() => [...document.querySelectorAll('[data-act="pick-scen"]')].map((x) => x.dataset.id));
await p.screenshot({ path: `${out}/460-era${mobile ? '-m' : ''}.png` });
await p.click('[data-act="pick-scen"][data-id="1592"]'); await p.waitForTimeout(500);
const clan = await p.evaluate(() => ({ name: document.getElementById('ttl-clan')?.textContent, blurb: document.querySelector('.ttl-blurb')?.textContent.slice(0, 30), cards: [...document.querySelectorAll('[data-act="pick-clan"]')].map((x) => x.dataset.id) }));
await p.click('[data-act="start"]'); await p.waitForTimeout(600);
const scene = await p.evaluate(() => { const e = document.getElementById('interlude'); return e && !e.hidden ? e.querySelector('h1')?.textContent : null; });
await p.screenshot({ path: `${out}/463-nagoya${mobile ? '-m' : ''}.png` });
if (scene) { await p.click('#interlude [data-act="il-close"]'); await p.waitForTimeout(200); }
const tab = await p.evaluate(() => ({ sel: document.querySelector('[data-act="stab"][aria-selected="true"]')?.dataset.id, weary: [...document.querySelectorAll('#modal-body .kv dt')].find((d) => d.textContent === '厭戦')?.nextElementSibling.textContent, peace: document.querySelector('[data-act="kr-peace"]')?.disabled, date: document.getElementById('stats')?.textContent.slice(0, 0) }));
await p.screenshot({ path: `${out}/461-1592-tab${mobile ? '-m' : ''}.png`, fullPage: mobile });
await p.click('[data-act="kr-withdraw"]'); await p.waitForTimeout(100);
await p.click('[data-act="kr-withdraw-ok"]'); await p.waitForTimeout(1800);
const end = await p.evaluate(() => { const e = document.getElementById('ending'); return e && !e.hidden ? e.querySelector('.end-text')?.textContent.replace(/\s+/g, ' ').trim().slice(0, 160) : null; });
await p.screenshot({ path: `${out}/462-withdraw${mobile ? '-m' : ''}.png` });
console.log(JSON.stringify({ before, after, clan, scene, tab, end, errors: errors.length ? errors : 'none' }, null, 1));
await b.close();
