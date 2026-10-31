// 武士の性質: 武将の詳細の名声・縁・追放（二度押し）、月の報告の官の誘い・喧嘩の裁き、朝廷の僭称
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
const closeAll = async () => { for (let k = 0; k < 3; k++) if (await p.$('#modal:not([hidden])')) await p.click('#modal-close').catch(() => {}); };
// 前田利家の詳細（縁: 秀吉・勝家・成政・恒興）
await p.keyboard.press('3'); await p.click('[data-act="stab"][data-id="vassals"]'); await p.waitForTimeout(100);
await p.click('[data-act="gen"][data-id="maeda_toshiie"]'); await p.waitForTimeout(150);
const bonds = await p.evaluate(() => document.querySelector('#modal').textContent.match(/縁[^名]*/)?.[0]?.slice(0, 80) ?? null);
await p.screenshot({ path: `${out}/260-bonds${sfx}.png` });
await p.click('[data-act="exile"]'); await p.waitForTimeout(100);
const first = await p.evaluate(() => window.__sengoku.state.generals.maeda_toshiie.status);
await p.click('[data-act="exile-ok"]'); await p.waitForTimeout(200);
const exiled = await p.evaluate(() => { const g = window.__sengoku.state.generals.maeda_toshiie; return { status: g.status, from: g.exiledFrom }; });
await p.click('#cutin').catch(() => {});
await closeAll();
// 官の誘いと喧嘩を仕込んで評定終了
await p.evaluate(() => { const s = window.__sengoku.state; s.kanOffer = { gen: 'shibata_katsuie', from: 'court', turn: s.turn }; s.quarrel = { gen: 'sassa_narimasa', victim: '某', killed: true, turn: s.turn }; });
await p.keyboard.press('e');
for (let k = 0; k < 120 && !(await p.$('#modal [data-act="kan-yes"]')); k++) { const ask = await p.$('[data-act="ask-no"]'); if (ask) await ask.click().catch(() => {}); await p.waitForTimeout(500); }
await p.screenshot({ path: `${out}/261-report-bushi${sfx}.png` });
const stale = await p.evaluate(() => ({ kan: !!window.__sengoku.state.kanOffer, q: !!window.__sengoku.state.quarrel }));
await p.click('#modal [data-act="kan-no"]'); await p.waitForTimeout(150);
const qBtn = await p.$('#modal [data-act="qr-let"]');
if (qBtn) { await qBtn.click(); await p.waitForTimeout(150); }
const after = await p.evaluate(() => { const s = window.__sengoku.state; return { kan: s.kanOffer, q: s.quarrel, katsuieOuter: s.generals.shibata_katsuie.outer ?? null }; });
await closeAll();
// 僭称
await p.keyboard.press('4'); await p.click('[data-act="stab"][data-id="court"]'); await p.waitForTimeout(100);
const pr0 = await p.evaluate(() => window.__sengoku.state.clans.oda.prestige);
await p.click('[data-act="usurp"]'); await p.waitForTimeout(80); await p.click('[data-act="usurp-ok"]'); await p.waitForTimeout(150);
const us = await p.evaluate(() => ({ usurp: window.__sengoku.state.clans.oda.usurp, pr: window.__sengoku.state.clans.oda.prestige, buy: document.querySelector('[data-act="court-buy"]')?.disabled ?? null }));
const sw = await p.evaluate(() => document.documentElement.scrollWidth);
console.log({ mobile, bonds, first, exiled, stale, after, pr0, us, sw, errors: errors.length ? errors : 'none' });
await b.close();
