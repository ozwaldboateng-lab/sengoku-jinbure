// 軍団の再編成: 合流（大将の決め方・面目の知らせ）と分遣
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
// 織田の二隊を清洲の隣に並べる
const setup = await p.evaluate(() => { const s = window.__sengoku.state, X = window.__sengoku; const k = s.castles.find((c) => c.id === 'kiyosu'); const as = Object.values(s.armies).filter((a) => a.clan === 'oda').sort((a, b) => b.troops - a.troops); const A = as[0], B = as[1]; const occ = new Set(Object.values(s.armies).map((a) => a.hex)); A.hex = k.hex; const nb = X.neighbors(k.hex).find((h) => !occ.has(h) && !s.castles.some((c) => c.hex === h)); B.hex = nb; for (const a of [A, B]) { a.acted = false; a.mp = 4; } X.view.centerOn(k.hex, 2); return { A: A.id, B: B.id, Am: s.generals[A.main].name, Bm: s.generals[B.main].name, n: Object.keys(s.armies).length, tA: A.troops, tB: B.troops }; });
await p.waitForTimeout(300);
const click = async (hex) => { const pt = await p.evaluate((h) => { const v = window.__sengoku.view; const c = window.__sengoku.center(h); const r = v.canvas.getBoundingClientRect(); return { x: r.left + c[0] * v.scale + v.ox, y: r.top + c[1] * v.scale + v.oy }; }, hex); await p.mouse.click(pt.x, pt.y); await p.waitForTimeout(250); };
await click(await p.evaluate((id) => window.__sengoku.state.armies[id].hex, setup.B));
await p.click(`[data-act="merge-ask"][data-id="${setup.A}"]`); await p.waitForTimeout(250);
const sheet = await p.evaluate(() => ({ title: document.getElementById('modal-title')?.textContent, opts: [...document.querySelectorAll('[data-act="merge-do"] b')].map((x) => x.textContent), warn: [...document.querySelectorAll('[data-act="merge-do"] .warn-text')].map((x) => x.textContent) }));
await p.screenshot({ path: `${out}/470-merge${mobile ? '-m' : ''}.png`, fullPage: mobile });
await p.click('[data-act="merge-do"] >> nth=0'); await p.waitForTimeout(300);
const merged = await p.evaluate((st) => { const s = window.__sengoku.state; const A = s.armies[st.A], B = s.armies[st.B]; const k = A ?? B; return { n: Object.keys(s.armies).length, keep: k ? s.generals[k.main].name : null, troops: k?.troops, staff: k?.staff?.length, gone: !A || !B, log: s.log.slice(-1)[0].text }; }, setup);
// 分ける: 翌月にしてから（合流で行動を使ったため）
await p.evaluate((st) => { const s = window.__sengoku.state; for (const a of Object.values(s.armies)) { a.acted = false; a.mp = 4; } }, setup);
const keepId = await p.evaluate((st) => (window.__sengoku.state.armies[st.A] ? st.A : st.B), setup);
await click(await p.evaluate((id) => window.__sengoku.state.armies[id].hex, keepId));
const splitBtn = await p.evaluate(() => { const b = document.querySelector('[data-act="split-ask"]'); return b ? { disabled: b.disabled, title: b.title } : null; });
let split = null;
if (splitBtn && !splitBtn.disabled) { await p.click('[data-act="split-ask"]'); await p.waitForTimeout(250); await p.screenshot({ path: `${out}/471-split${mobile ? '-m' : ''}.png`, fullPage: mobile }); await p.click('[data-act="split-do"] >> nth=1'); await p.waitForTimeout(300); split = await p.evaluate(() => ({ n: Object.keys(window.__sengoku.state.armies).length, log: window.__sengoku.state.log.slice(-1)[0].text })); }
console.log(JSON.stringify({ setup, sheet, merged, splitBtn, split, errors: errors.length ? errors : 'none' }, null, 1));
await b.close();
