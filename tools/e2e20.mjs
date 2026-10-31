// 南蛮貿易と布教: 宣教師の来訪（月の報告）・南蛮市での購入・大筒の配備・布教の画面
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
await p.click('[data-act="t-new"]'); await p.click('[data-act="pick-scen"][data-id="1560"]'); await p.click('[data-act="pick-clan"][data-id="shimazu"]');
await p.click('[data-act="start"]'); await p.waitForTimeout(300);
// 坊津に南蛮船、宣教師の願い出を仕込む
await p.evaluate(() => { const st = window.__sengoku.state; st.ships = [{ port: 'uchi', until: st.turn + 3, guns: 600, cannon: 2, cargo: ['chikyugi', 'tokei'] }]; st.clans.shimazu.gold = 30000; st.clans.shimazu.mission = undefined; st.missionVisit = { mis: 'torres', turn: st.turn }; });
const closeAll = async () => { for (let k = 0; k < 3; k++) if (await p.$('#modal:not([hidden])')) await p.click('#modal-close').catch(() => {}); };
await closeAll();
await p.keyboard.press('e');
await p.waitForSelector('[data-act="mis-allow"]', { timeout: 60000 });
await p.screenshot({ path: `${out}/200-visit${sfx}.png` });
await p.click('[data-act="mis-allow"]'); await p.waitForTimeout(150);
const mission = await p.evaluate(() => { const st = window.__sengoku.state; return { m: st.clans.shimazu.mission, home: st.missions?.torres?.home, visit: st.missionVisit }; });
await closeAll();
// 南蛮市
await p.keyboard.press('5'); await p.click('[data-act="stab"][data-id="nanban"]'); await p.waitForTimeout(150);
await p.screenshot({ path: `${out}/201-nanban${sfx}.png` });
const g0 = await p.evaluate(() => window.__sengoku.state.clans.shimazu.guns);
await p.click('[data-act="ship-guns"][data-id="300"]'); await p.waitForTimeout(100);
await p.click('[data-act="ship-cannon"]'); await p.waitForTimeout(100);
await p.click('[data-act="ship-item"][data-id="chikyugi"]'); await p.waitForTimeout(100);
const bought = await p.evaluate((g0) => { const st = window.__sengoku.state, C = st.clans.shimazu; return { guns: C.guns - g0, cannon: C.cannon, item: st.items.chikyugi.clan, left: st.ships[0]?.guns, gold: C.gold }; }, g0);
// 大筒を部隊へ
await p.keyboard.press('2'); await p.click('[data-act="stab"][data-id="butai"]'); await p.waitForTimeout(100);
const ab = await p.$('[data-act="arm-cannon-m"]:not([disabled])');
if (ab) { await ab.click(); await p.waitForTimeout(100); }
await p.screenshot({ path: `${out}/202-guns${sfx}.png` });
const armed = await p.evaluate(() => Object.values(window.__sengoku.state.armies).filter((a) => a.clan === 'shimazu').map((a) => a.cannon ?? 0));
// 布教の画面と下賜
await p.keyboard.press('4'); await p.click('[data-act="stab"][data-id="mission"]'); await p.waitForTimeout(100);
await p.screenshot({ path: `${out}/203-mission${sfx}.png` });
const mtext = await p.evaluate(() => document.querySelector('#modal').textContent.slice(0, 120));
await p.keyboard.press('3'); await p.click('[data-act="stab"][data-id="gift"]'); await p.waitForTimeout(100);
const gift = await p.evaluate(() => document.querySelector('#modal').textContent.includes('地球儀'));
const sw = await p.evaluate(() => document.documentElement.scrollWidth);
await closeAll();
// 城の画面（南蛮港）
await p.evaluate(() => { const st = window.__sengoku.state; const c = st.castles.find((x) => x.id === 'uchi'); c.kiri = 12; });
await p.mouse.click(5, 5);
console.log({ mobile, mission, bought, armed, mtext, gift, sw, errors: errors.length ? errors : 'none' });
await b.close();
