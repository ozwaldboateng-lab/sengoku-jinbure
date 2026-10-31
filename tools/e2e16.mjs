// 在野武将の仕官（願い出の画面・在野の一覧・召し抱え）
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
// 明智光秀と島清興を清洲に置き、願い出を仕込んで評定終了
await p.evaluate(() => { const s = window.__sengoku.state; const k = s.castles.find((c) => c.id === 'kiyosu').i; for (const id of ['akechi_mitsuhide', 'shima_kiyooki']) s.generals[id].loc = k; s.offers = [{ gen: 'akechi_mitsuhide', castle: k, turn: s.turn }]; });
await p.click('#btn-end');
let shown = false;
for (let k = 0; k < 150; k++) {
  await p.waitForTimeout(150);
  if (await p.evaluate(() => !document.getElementById('battle').hidden)) { if (await p.$('[data-bact="leave"]')) await p.click('[data-bact="leave"]'); else await p.click('#bt-auto').catch(() => {}); continue; }
  if (await p.$('#modal:not([hidden]) [data-act="offer-hire"]')) { shown = true; break; }
  const no = await p.$('#modal:not([hidden]) [data-act="ask-no"]'); if (no) { await no.click(); continue; }
  if (await p.evaluate(() => !document.getElementById('btn-end').disabled && document.getElementById('modal').hidden)) break;
}
await p.screenshot({ path: `${out}/160-offer.png` });
const offerText = await p.evaluate(() => document.querySelector('#modal-body tbody')?.textContent.replace(/\s+/g, ' ').trim());
const gold0 = await p.evaluate(() => window.__sengoku.state.clans.oda.gold);
// 願い出た者のうち最初の一人を召し抱える（浪人はさまようので明智とは限らない）
const hireId = shown ? await p.evaluate(() => document.querySelector('#modal [data-act="offer-hire"]').dataset.id) : 'akechi_mitsuhide';
if (shown) { await p.click(`[data-act="offer-hire"][data-id="${hireId}"]`); await p.waitForTimeout(200); }
const hired = await p.evaluate((id) => { const g = window.__sengoku.state.generals[id]; return { id, clan: g.clan, status: g.status, rank: g.rank, gold: window.__sengoku.state.clans.oda.gold }; }, hireId);
// 報告の画面が続けて出るか（出れば閉じる）
const afterModal = await p.evaluate(() => document.getElementById('modal').hidden ? 'closed' : document.getElementById('modal-title')?.textContent);
await p.evaluate(() => document.querySelector('#modal:not([hidden]) [data-act="close"]')?.click());
for (let k = 0; k < 10 && await p.evaluate(() => !document.getElementById("modal").hidden); k++) { await p.evaluate(() => (document.querySelector("#modal:not([hidden]) [data-act=\"close\"]") ?? document.getElementById("modal-close")).click()); await p.waitForTimeout(100); }
await p.keyboard.press("3"); await p.waitForTimeout(100); await p.click('[data-act="stab"][data-id="jinzai"]', { timeout: 3000 }); await p.waitForTimeout(150);
await p.screenshot({ path: `${out}/161-ronin-tab.png` });
const roninRows = await p.evaluate(() => [...document.querySelectorAll('#modal-body tbody tr')].map((tr) => tr.textContent.replace(/\s+/g, ' ').trim()).slice(0, 5));
const btn = await p.$('[data-act="ronin-m"][data-id="shima_kiyooki"]:not([disabled])');
if (btn) { await btn.click(); await p.waitForTimeout(150); }
const shima = await p.evaluate(() => { const g = window.__sengoku.state.generals.shima_kiyooki; return { clan: g.clan, status: g.status, tried: g.triedTurn }; });
console.log({ shown, offerText, gold0, hired, afterModal, roninRows, shima, errors: errors.length ? errors : 'none' });
await b.close();
