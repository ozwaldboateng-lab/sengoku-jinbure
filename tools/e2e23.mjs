// 顔見せ: 捕虜の登用・外交の返事・月の報告の節目（取り立て）・設定で止める
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
const cut = () => p.evaluate(() => { const el = document.getElementById('cutin'); return el && !el.hidden ? el.textContent.replace(/\s+/g, ' ').trim() : null; });
// 捕虜を仕込んで登用
await p.evaluate(() => { const s = window.__sengoku.state; const g = s.generals.shibata_katsuie.clan === 'oda' ? Object.values(s.generals).find((x) => x.clan === 'imagawa' && x.status === 'free') : null; g.formerClan = g.clan; g.status = 'captive'; g.captor = 'oda'; window.__cap = g.id; });
await p.keyboard.press('3'); await p.click('[data-act="stab"][data-id="jinzai"]'); await p.waitForTimeout(150);
await p.click('[data-act="sub"][data-id="captive"]'); await p.waitForTimeout(150);
await p.click('[data-act="cap-recruit"]'); await p.waitForTimeout(400);
const recruitCut = await cut();
await p.screenshot({ path: `${out}/230-cutin-recruit${sfx}.png` });
await p.click('#cutin'); await p.waitForTimeout(200);
// 外交
await p.keyboard.press('4'); await p.click('[data-act="stab"][data-id="gaike"]'); await p.waitForTimeout(150);
await p.evaluate(() => { window.__sengoku.state.clans.oda.gold = 99999; });
const dipBtn = await p.$('[data-act="dip"]:not([disabled])');
let dipCut = null;
if (dipBtn) { await dipBtn.click(); await p.waitForTimeout(400); dipCut = await cut(); await p.click('#cutin').catch(() => {}); }
// 取り立て（月の報告）
await p.evaluate(() => { const s = window.__sengoku.state; const g = Object.values(s.generals).find((x) => x.clan === 'oda' && x.rank >= 2 && ['free', 'army', 'governor'].includes(x.status)); g.merit = 9999; window.__pro = g.id; s.clans.oda.delegate = { ...(s.clans.oda.delegate ?? {}), staff: true }; });
for (let k = 0; k < 3; k++) if (await p.$('#modal:not([hidden])')) await p.click('#modal-close').catch(() => {});
await p.keyboard.press('e');
await p.waitForSelector('#modal .quotes', { timeout: 90000 });
const quotes = await p.$$eval('#modal .quotes .quote', (xs) => xs.map((x) => x.textContent.replace(/\s+/g, ' ').trim()).slice(0, 4));
await p.screenshot({ path: `${out}/231-report-quotes${sfx}.png` });
for (let k = 0; k < 3; k++) if (await p.$('#modal:not([hidden])')) await p.click('#modal-close').catch(() => {});
// 設定で止める
await p.keyboard.press('6'); await p.click('[data-act="stab"][data-id="save"]'); await p.waitForTimeout(100);
await p.click('[data-act="cutin-toggle"]'); await p.waitForTimeout(100);
const off = await p.evaluate(() => localStorage.getItem('sengoku1560-cutin'));
const sw = await p.evaluate(() => document.documentElement.scrollWidth);
console.log({ mobile, recruitCut, dipCut, quotes, off, sw, errors: errors.length ? errors : 'none' });
await b.close();
