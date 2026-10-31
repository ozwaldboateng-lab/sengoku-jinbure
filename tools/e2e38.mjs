// 幕府・南蛮とのやり取りの顔見せ（献金・御内書・南蛮船の商い・来航・布教の願い出）
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const out = process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1360, height: 820 } });
const errors = [];
p.on('pageerror', (e) => errors.push('pageerror ' + e.message));
p.on('console', (m) => { if (m.type() === 'error') errors.push('console ' + m.text()); });
await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(300);
await p.click('[data-act="t-new"]'); await p.click('[data-act="pick-scen"][data-id="1560"]'); await p.click('[data-act="pick-clan"][data-id="shimazu"]');
await p.click('[data-act="start"]'); await p.waitForTimeout(300);
for (let k = 0; k < 4; k++) if (await p.$('#modal:not([hidden])')) await p.click('#modal-close').catch(() => {});
const cut = () => p.evaluate(() => { const el = document.getElementById('cutin'); return el && !el.hidden ? el.querySelector('.qname')?.textContent + '｜' + el.querySelector('p')?.textContent : null; });
const close = async () => { for (let k = 0; k < 4 && await p.$('#cutin:not([hidden])'); k++) { await p.click('#cutin'); await p.waitForTimeout(100); } };
await p.evaluate(() => { const s = window.__sengoku.state; s.clans[s.player].gold = 50000; });
// 献金（取次の幕臣）
await p.keyboard.press('4'); await p.click('[data-act="stab"][data-id="bakufu"]'); await p.waitForTimeout(150);
await p.click('[data-act="bk-donate"]'); await p.waitForTimeout(250);
const donate = await cut(); await p.screenshot({ path: `${out}/380-donate.png` }); await close();
// 御内書（将軍）
let order = null;
if (await p.$('#sel-order')) { await p.click('[data-act="bk-order"]').catch(() => {}); await p.waitForTimeout(250); order = await cut(); await close(); }
// 南蛮船を当家の港に置いて商い（カピタン）
await p.evaluate(() => { const s = window.__sengoku.state; const port = ['uchi', 'hirado', 'funai'].find((id) => s.castles.find((c) => c.id === id)?.owner === s.player) ?? 'uchi'; const c = s.castles.find((x) => x.id === port); c.owner = s.player; s.ships = [{ port, until: s.turn + 3, guns: 600, cannon: 2, cargo: [] }]; });
await p.keyboard.press('Escape'); await p.keyboard.press('5'); await p.click('[data-act="stab"][data-id="nanban"]'); await p.waitForTimeout(150);
await p.click('[data-act="ship-guns"][data-id="100"]'); await p.waitForTimeout(250);
const ship = await cut(); await p.screenshot({ path: `${out}/381-capitan.png` }); await close();
await p.click('[data-act="ship-guns"][data-id="100"]'); await p.waitForTimeout(250);
const ship2 = await cut(); // 同じ月の二度目は出ない
// 朝廷: 叙任（御簾のお言葉と伝奏）
await p.keyboard.press('Escape'); await p.evaluate(() => { const s = window.__sengoku.state; s.clans[s.player].gold = 200000; });
await p.keyboard.press('4'); await p.click('[data-act="stab"][data-id="court"]'); await p.waitForTimeout(150);
await p.click('[data-act="court-buy"]'); await p.waitForTimeout(250);
const edict = await cut(); await p.screenshot({ path: `${out}/382-edict.png` }); await p.click('#cutin'); await p.waitForTimeout(150);
const kuge = await cut(); await p.screenshot({ path: `${out}/383-kuge.png` }); await close();
// 商人: 兵糧（博多の島井は1565年から。1560年の島津なら天王寺屋）、鉄砲（今井宗久）、名物（茶器なら千宗易）
await p.keyboard.press('Escape'); await p.keyboard.press('5'); await p.click('[data-act="stab"][data-id="rice"]'); await p.waitForTimeout(150);
await p.click('[data-act="rice-buy"][data-id="1000"]'); await p.waitForTimeout(250);
const rice = await cut(); await close();
await p.click('[data-act="stab"][data-id="gunbuy"]'); await p.waitForTimeout(150);
await p.click('[data-act="gun-buy"]'); await p.waitForTimeout(250);
const gun = await cut(); await p.screenshot({ path: `${out}/384-imai.png` }); await close();
await p.click('[data-act="stab"][data-id="item"]'); await p.waitForTimeout(150);
const ib = await p.$('[data-act="item-buy"]:not([disabled])'); let item = null;
if (ib) { await ib.click(); await p.waitForTimeout(250); item = await cut(); await p.screenshot({ path: `${out}/385-item.png` }); await close(); }
const faces = await p.evaluate(() => ['yamashina_tokitsugu', 'imai_sokyu', 'capitan', 'misu'].map((id) => !!document.querySelector('img') && id));
console.log(JSON.stringify({ donate, order, ship, ship2, edict, kuge, rice, gun, item }, null, 1));
const ok = !!donate && !!ship && !ship2 && /御簾/.test(edict ?? '') && !!kuge && !!rice && !!gun;
console.log({ ok, errors: errors.length ? errors : 'none' });
await b.close();
