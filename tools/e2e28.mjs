// 画面の整理（第一段）: 今月の要件（ボタン・右の画面・T）、月の報告のタブ、武将の詳細の命令、畳んだ説明、束ねたタブ
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const out = process.argv[2];
const mobile = process.argv[3] === 'mobile';
const sfx = mobile ? '-m' : '';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: mobile ? { width: 390, height: 844 } : { width: 1360, height: 820 } });
const errors = [];
p.on('pageerror', (e) => errors.push('pageerror ' + e.message));
p.on('console', (m) => { if (m.type() === 'error') errors.push('console ' + m.text()); });
await p.goto('file://' + process.cwd() + '/dist/index.html');
await p.waitForTimeout(400);
await p.click('[data-act="t-new"]'); await p.click('[data-act="pick-scen"][data-id="1560"]'); await p.click('[data-act="pick-clan"][data-id="oda"]');
await p.click('[data-act="start"]'); await p.waitForTimeout(300);
const closeAll = async () => { for (let k = 0; k < 4; k++) if (await p.$('#modal:not([hidden])')) await p.click('#modal-close').catch(() => {}); };
// 要件を作る: 未払いの功
await p.evaluate(() => { const s = window.__sengoku.state; const g = s.generals.shibata_katsuie; g.merit += 40; });
await p.evaluate(() => document.getElementById('zhome').click()); // 描き直し
await p.keyboard.press('Escape'); await p.waitForTimeout(100);
const todoBtn = await p.evaluate(() => { const b = document.getElementById('btn-todo'); return b.hidden ? null : b.textContent.trim(); });
const panelTodo = await p.evaluate(() => document.querySelector('#panel .todo-box')?.textContent.replace(/\s+/g, ' ').trim() ?? null);
await p.screenshot({ path: `${out}/280-todo-panel${sfx}.png` });
await p.click('#btn-todo'); await p.waitForTimeout(150);
const todoModal = await p.evaluate(() => ({ title: document.getElementById('modal-title')?.textContent, kazo: !!document.querySelector('#modal [data-act="rw-kazo"]') }));
await closeAll();
// 武将の詳細の命令
await p.keyboard.press('3'); await p.click('[data-act="stab"][data-id="vassals"]'); await p.waitForTimeout(100);
const actCol = await p.evaluate(() => document.querySelectorAll('#modal [data-act="bugyo-on"]').length);
await p.click('[data-act="gen"][data-id="niwa_nagahide"]'); await p.waitForTimeout(150);
await p.screenshot({ path: `${out}/281-gen-actions${sfx}.png`, fullPage: true });
const hasCmd = await p.evaluate(() => [...document.querySelectorAll('#modal dt')].map((d) => d.textContent).filter((x) => ['恩賞', '役目', '下賜', 'その他'].includes(x)));
await p.click('#modal [data-act="bugyo-on"]'); await p.waitForTimeout(150);
const afterBugyo = await p.evaluate(() => ({ status: window.__sengoku.state.generals.niwa_nagahide.status, still: document.getElementById('modal-title')?.textContent }));
await closeAll();
// 束ねたタブと畳んだ説明
await p.keyboard.press('2'); await p.waitForTimeout(100);
const butai = await p.evaluate(() => ({ sects: [...document.querySelectorAll('#modal .sect-h')].map((h) => h.textContent), hintsOpen: [...document.querySelectorAll('#modal details.hintbox')].filter((d) => d.open).length, hints: document.querySelectorAll('#modal details.hintbox').length }));
await closeAll();
// 月の報告のタブ
await p.keyboard.press('e');
for (let k = 0; k < 120 && !(await p.$('#modal [data-act="rtab"]')); k++) { const ask = await p.$('[data-act="ask-no"]'); if (ask) await ask.click().catch(() => {}); await p.waitForTimeout(500); }
const rtab0 = await p.evaluate(() => document.querySelector('#modal [data-act="rtab"][aria-selected="true"]')?.dataset.id);
await p.click('#modal [data-act="rtab"][data-id="news"]'); await p.waitForTimeout(100);
const n0 = await p.evaluate(() => document.querySelectorAll('#modal ul.lede li').length);
await p.click('#modal [data-act="rnews"]'); await p.waitForTimeout(100);
const n1 = await p.evaluate(() => document.querySelectorAll('#modal ul.lede li').length);
await p.screenshot({ path: `${out}/282-report-news${sfx}.png` });
const sw = await p.evaluate(() => document.documentElement.scrollWidth);
console.log({ mobile, todoBtn, panelTodo, todoModal, actCol, hasCmd, afterBugyo, butai, rtab0, news: [n0, n1], sw, errors: errors.length ? errors : 'none' });
await b.close();
