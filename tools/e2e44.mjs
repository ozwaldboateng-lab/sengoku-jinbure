// おまかせ編成: 軍団の「空きを埋める」と、城の「この城の軍団を組み直す」
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const out = process.argv[2], mobile = process.argv[3] === 'mobile';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage(mobile ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1360, height: 820 } });
const errors = []; p.on('pageerror', (e) => errors.push(e.message));
await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(300);
await p.click('[data-act="t-new"]'); await p.click('[data-act="pick-scen"][data-id="1560"]'); await p.click('[data-act="pick-clan"][data-id="oda"]');
await p.click('[data-act="start"]'); await p.waitForTimeout(300);
for (let k = 0; k < 4; k++) if (await p.$('#modal:not([hidden])')) await p.click('#modal-close').catch(() => {});
// 信長の隊の傘下を外して待機に戻し、清洲に置く
const setup = await p.evaluate(() => { const s = window.__sengoku.state; const k = s.castles.find((c) => c.id === 'kiyosu'); const A = Object.values(s.armies).find((a) => a.main === 'oda_nobunaga'); A.hex = k.hex; for (const id of A.staff ?? []) { const g = s.generals[id]; g.status = 'free'; g.army = null; g.boss = undefined; g.loc = k.i; } A.staff = []; A.deputy = null; window.__sengoku.view.centerOn(k.hex, 2); return { A: A.id, hex: k.hex, free: Object.values(s.generals).filter((g) => g.clan === 'oda' && g.status === 'free').length }; });
await p.waitForTimeout(300);
const click = async (hex) => { const pt = await p.evaluate((h) => { const v = window.__sengoku.view; const c = window.__sengoku.center(h); const r = v.canvas.getBoundingClientRect(); return { x: r.left + c[0] * v.scale + v.ox, y: r.top + c[1] * v.scale + v.oy }; }, hex); await p.mouse.click(pt.x, pt.y); await p.waitForTimeout(250); };
await click(setup.hex);
const btn = await p.$('[data-act="fill-army"]');
let fill = null;
if (btn) { await btn.click(); await p.waitForTimeout(250); fill = await p.evaluate((id) => ({ staff: window.__sengoku.state.armies[id].staff.map((x) => window.__sengoku.state.generals[x].name), toast: document.getElementById('toast')?.textContent }), setup.A); }
// 城の画面で組み直す
await p.click('[data-act="view-castle"]').catch(() => {}); await p.waitForTimeout(250);
const reorgBtn = await p.evaluate(() => document.querySelector('[data-act="castle-reorg"]')?.textContent ?? null);
await p.screenshot({ path: `${out}/480-castle-reorg${mobile ? '-m' : ''}.png` });
let reorg = null;
if (reorgBtn) { await p.click('[data-act="castle-reorg"]'); await p.waitForTimeout(250); reorg = await p.evaluate((id) => ({ staff: window.__sengoku.state.armies[id].staff.length, log: window.__sengoku.state.log.slice(-1)[0].text }), setup.A); }
// 軍事 › 軍団の札のボタン
await p.keyboard.press('2'); await p.click('[data-act="stab"][data-id="corps"]'); await p.waitForTimeout(200);
const corpsBtns = await p.evaluate(() => document.querySelectorAll('[data-act="corps-fill"]').length);
await p.screenshot({ path: `${out}/481-corps-fill${mobile ? '-m' : ''}.png` });
console.log(JSON.stringify({ setup, fill, reorgBtn, reorg, corpsBtns, errors: errors.length ? errors : 'none' }, null, 1));
await b.close();
