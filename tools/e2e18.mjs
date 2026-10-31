// 練度と足軽（部隊の画面・軍事の足軽と練度・雇う）
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
await p.click('[data-act="start"]'); await p.waitForTimeout(300);
await p.keyboard.press('n'); await p.waitForTimeout(200);
const panel = await p.evaluate(() => [...document.querySelectorAll('#panel dt')].filter((d) => ['練度', '足軽'].includes(d.textContent)).map((d) => d.textContent + ':' + d.nextElementSibling.textContent));
const hireBtn = await p.$('#panel [data-act="hire-ashi"]');
const before = await p.evaluate(() => { const s = window.__sengoku.state; return { gold: s.clans.oda.gold }; });
if (hireBtn) { await hireBtn.click(); await p.waitForTimeout(150); }
await p.screenshot({ path: `${out}/180-army-ashi.png` });
const after = await p.evaluate(() => { const s = window.__sengoku.state; const a = Object.values(s.armies).filter((x) => x.clan === 'oda').sort((x, y) => (y.ashi ?? 0) - (x.ashi ?? 0))[0]; return { gold: s.clans.oda.gold, troops: a.troops, ashi: Math.round(a.troops * (a.ashi ?? 0)), drill: Math.round(a.drill) }; });
await p.keyboard.press('2'); await p.click('[data-act="stab"][data-id="butai"]'); await p.waitForTimeout(150);
const m = await p.$('[data-act="hire-ashi-m"]'); if (m) { await m.click(); await p.waitForTimeout(150); }
await p.screenshot({ path: `${out}/181-tab-ashi.png` });
const rows = await p.evaluate(() => [...document.querySelectorAll('#modal-body tbody tr')].map((tr) => tr.textContent.replace(/\s+/g, ' ').trim()).slice(0, 4));
console.log({ panel, hasHire: !!hireBtn, before, after, rows, errors: errors.length ? errors : 'none' });
await b.close();
