// 陣触と陣払い: 名簿（陣払い）から始まる新しいゲーム、陣立ての陣触・急ぎの陣触、評定終了で現れる、陣払いで名簿に戻る、部隊の一覧、兵糧
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const out = process.argv[2], mobile = process.argv[3] === 'mobile', sfx = mobile ? '-m' : '';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage(mobile ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1360, height: 820 } });
p.setDefaultTimeout(10000);
const errors = [];
p.on('pageerror', (e) => errors.push('pageerror ' + e.message));
await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.evaluate(() => localStorage.setItem('sengoku-camp', 'on')); await p.reload(); await p.waitForTimeout(400);
await p.click('[data-act="t-new"]'); await p.click('[data-act="pick-scen"][data-id="1560"]'); await p.click('[data-act="pick-clan"][data-id="oda"]');
await p.click('[data-act="start"]'); await p.waitForTimeout(300);
for (let k = 0; k < 4; k++) if (await p.$('#modal:not([hidden])')) await p.click('#modal-close').catch(() => {});
const S = () => p.evaluate(() => { const s = window.__sengoku.state; return { field: Object.values(s.armies).filter((a) => a.clan === 'oda').map((a) => ({ id: a.id, main: s.generals[a.main].name, troops: a.troops, left: a.musterLeft ?? 0 })), camps: Object.values(s.camps ?? {}).filter((a) => a.clan === 'oda').map((a) => ({ id: a.id, main: s.generals[a.main].name, troops: a.troops, muster: a.muster ?? null, castle: s.castles[a.camp].name })), food: Math.round(s.clans.oda.food), turn: s.turn }; });
const res = { start: await S() };
// 陣立て: 名簿が見える。一隊に陣触、もう一隊に急ぎの陣触
await p.keyboard.press('2'); await p.waitForTimeout(300);
res.campCards = await p.evaluate(() => document.querySelectorAll('.camp-card').length);
await p.screenshot({ path: `${out}/62-camps${sfx}.png` });
const h1 = await p.$('[data-act="jin-hurry"]:not([disabled])'); if (h1) { await h1.click(); await p.waitForTimeout(300); }
// ほかの城（名簿のある城）を選んで陣触
res.menuAfterHurry = await p.evaluate(() => ({ modal: !document.getElementById('modal').hidden, title: document.getElementById('modal-title')?.textContent }));
if (!(await p.$('[data-jin-castle]'))) { await p.screenshot({ path: `${out}/62-dbg.png` }); console.log('DBG', JSON.stringify(res.menuAfterHurry)); await p.keyboard.press('2'); await p.waitForTimeout(300); }
await p.evaluate(() => { const sel = document.querySelector('[data-jin-castle]'); const o = [...sel.options].find((x) => x.textContent.includes('名簿') && !x.selected); sel.value = o.value; sel.dispatchEvent(new Event('change', { bubbles: true })); });
await p.waitForTimeout(300);
const m1 = await p.$('[data-act="jin-muster"]:not([disabled])'); if (m1) { await m1.click(); await p.waitForTimeout(300); }
res.afterOrders = await S();
// 部隊の一覧に名簿が出る
await p.click('[data-act="stab"][data-id="butai"]'); await p.waitForTimeout(250);
res.butai = await p.evaluate(() => [...document.querySelectorAll('#modal-body .sect-h')].map((x) => x.textContent));
await p.click('#modal-close');
// 評定終了（合戦の画面が出たらおまかせ）
const battleOpen = () => p.evaluate(() => !document.getElementById('battle')?.hidden);
await p.click('#btn-end');
for (let k = 0; k < 80; k++) {
  await p.waitForTimeout(200);
  if (await battleOpen()) { if (await p.$('[data-bact="leave"]')) await p.click('[data-bact="leave"]'); else if (await p.$('#bt-auto')) await p.click('#bt-auto'); continue; }
  if (await p.$('#modal:not([hidden]) [data-act="ask-no"]')) { await p.click('[data-act="ask-no"]'); continue; }
  if (await p.$('#modal:not([hidden]) #modal-close:visible')) await p.click('#modal-close').catch(() => {});
  if (await p.evaluate(() => !document.getElementById('btn-end').disabled)) break;
  if (k % 15 === 14) { await p.screenshot({ path: `${out}/62-stuck.png` }); console.log('STUCK', await p.evaluate(() => [document.getElementById('modal-title')?.textContent, document.getElementById('modal').hidden, document.getElementById('battle')?.hidden, document.querySelector('#battle')?.textContent?.slice(0, 200)].join(' | '))); }
}
for (let k = 0; k < 6; k++) if (await p.$('#modal:not([hidden])')) await p.click('#modal-close').catch(() => {});
res.nextMonth = await S();
// 陣払い: 現れた軍団の一つを名簿に戻す（地図で選んで「陣払い」）
const back = await p.evaluate(() => { const s = window.__sengoku.state; const a = Object.values(s.armies).find((x) => x.clan === 'oda' && !x.acted); return a?.id ?? null; });
if (back !== null) {
  for (let k = 0; k < 4 && !(await p.$('[data-jin-castle]')); k++) { if (await p.$('#modal:not([hidden]) #modal-close')) await p.click('#modal-close').catch(() => {}); await p.click('#btn-gunji').catch(() => {}); await p.waitForTimeout(300); await p.click('[data-act="stab"][data-id="jindate"]').catch(() => {}); await p.waitForTimeout(300); }
  // 陣立ての城を、その軍団がいる城に合わせる（城を順に選んで、陣払いのボタンが出る城を探す）
  const vals = await p.evaluate(() => [...document.querySelector('[data-jin-castle]').options].map((o) => o.value));
  for (const v of vals) {
    if (await p.$(`[data-act="jin-camp"][data-id="${back}"]`)) break;
    await p.evaluate((x) => { const sel = document.querySelector('[data-jin-castle]'); sel.value = x; sel.dispatchEvent(new Event('change', { bubbles: true })); }, v);
    await p.waitForTimeout(200);
  }
  res.campBtn = await p.evaluate((id) => { const b = document.querySelector(`[data-act="jin-camp"][data-id="${id}"]`); return b ? { disabled: b.disabled, title: b.title } : null; }, back);
  const btn = await p.$(`[data-act="jin-camp"][data-id="${back}"]:not([disabled])`);
  if (btn) { await btn.click(); await p.waitForTimeout(300); }
}
res.afterCamp = await S();
res.errors = errors;
console.log(JSON.stringify(res, null, 1));
const ok = res.start.field.length === 0 && res.start.camps.length > 0 && res.campCards > 0
  && res.afterOrders.field.length >= 1 && res.afterOrders.camps.some((c) => c.muster !== null)
  && res.nextMonth.field.length >= 2 && res.butai.some((x) => x.includes('陣払い中'))
  && res.afterCamp.field.length < res.nextMonth.field.length && !errors.length;
console.log(ok ? 'OK' : 'NG');
await b.close();
