// 方面軍団: 設ける・方針と目標・城と部隊の割り当て・方面の部隊は手で動かせない・評定終了で軍団長が動かす・軍事の委任
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
const st = () => p.evaluate(() => { const s = window.__sengoku.state; return { fronts: (s.fronts ?? []).map((f) => ({ ...f })), armies: Object.values(s.armies).filter((a) => a.clan === 'oda').map((a) => ({ id: a.id, front: a.front ?? null, hex: a.hex })) }; });
await p.keyboard.press('2'); await p.click('[data-act="stab"][data-id="fronts"]'); await p.waitForTimeout(150);
await p.click('[data-act="front-new"]'); await p.waitForTimeout(150);
const made = await st();
await p.selectOption('select[data-fpol]', 'attack'); await p.waitForTimeout(150);
const tgt = await p.$eval('select[data-ftgt]', (s) => s.options[1]?.value ?? '');
if (tgt) { await p.selectOption('select[data-ftgt]', tgt); await p.waitForTimeout(150); }
// 全部の城と部隊をこの方面へ
const fid = String(made.fronts[0].id);
for (const kind of ['fcastle', 'farmy']) {
  const n = (await p.$$(`select[data-${kind}]`)).length;
  for (let i = 0; i < n; i++) { await p.locator(`select[data-${kind}]`).nth(i).selectOption(fid); await p.waitForTimeout(80); }
}
await p.screenshot({ path: `${out}/220-fronts${sfx}.png`, fullPage: true });
const set = await st();
// 方面の部隊を選んでも移動先が出ない
await p.click('#modal-close');
const a0 = set.armies[0];
await p.evaluate((id) => { const s = window.__sengoku.state; window.__sengoku.view.centerOn(s.armies[id].hex); }, a0.id);
await p.keyboard.press('n'); await p.waitForTimeout(150);
const nextMsg = await p.evaluate(() => document.querySelector('#toast')?.textContent ?? '');
const panelLock = await p.evaluate(() => { const s = window.__sengoku.state; return { reach: window.__sengoku.view.sel?.reach ?? null }; });
// 評定終了
const logBefore = await p.evaluate(() => window.__sengoku.state.log.length);
await p.keyboard.press('e');
await p.waitForFunction(() => window.__sengoku.state.turn >= 2, null, { timeout: 90000 });
await p.waitForTimeout(400);
const after = await st();
const moved = after.armies.filter((a) => set.armies.find((x) => x.id === a.id)?.hex !== a.hex).length;
const flog = await p.evaluate((n) => window.__sengoku.state.log.slice(n).filter((l) => l.mine).map((l) => l.text).slice(0, 8), logBefore);
for (let k = 0; k < 3; k++) if (await p.$('#modal:not([hidden])')) await p.click('#modal-close').catch(() => {});
// 城の画面に方面
const castleFront = await p.evaluate(() => { const s = window.__sengoku.state; const c = s.castles.find((x) => x.owner === 'oda'); return !!c; });
// 軍事の委任
await p.keyboard.press('1'); await p.click('[data-act="stab"][data-id="deleg"]'); await p.waitForTimeout(100);
await p.click('[data-act="deleg"][data-id="military"]'); await p.waitForTimeout(100);
const mil = await p.evaluate(() => window.__sengoku.state.clans.oda.delegate.military);
await p.screenshot({ path: `${out}/221-deleg${sfx}.png` });
const sw = await p.evaluate(() => document.documentElement.scrollWidth);
console.log({ mobile, made: made.fronts.length, front: set.fronts[0], assigned: set.armies.filter((a) => a.front).length + '/' + set.armies.length, nextMsg, panelLock: panelLock.reach === null, moved, flog, mil, castleFront, sw, errors: errors.length ? errors : 'none' });
await b.close();
