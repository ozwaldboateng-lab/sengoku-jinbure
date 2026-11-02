// 特性: 人事 › 特性 の忍び頭（流言・暗殺）・茶会・普請、武将の詳細の特性の札
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
// 忍び（百地丹波）・茶人（細川藤孝）を織田に、丹羽長秀を砦の城主に
const setup = await p.evaluate(() => { const s = window.__sengoku.state; const kiyosu = s.castles.find((c) => c.id === 'kiyosu'); for (const id of ['momochi_tanba', 'hosokawa_fujitaka']) { const g = s.generals[id]; g.clan = 'oda'; g.status = 'free'; g.army = null; g.loc = kiyosu.i; } s.clans.oda.gold = 50000; const toride = s.castles.find((c) => c.owner === 'oda' && (c.kind === 'toride' || c.kind === 'hira')) ?? kiyosu; const n = s.generals.niwa_nagahide; if (n.status === 'army' && n.army !== null) { const a = s.armies[n.army]; a.staff = (a.staff ?? []).filter((x) => x !== n.id); } n.status = 'governor'; n.army = null; n.loc = toride.i; toride.governor = n.id; return { toride: toride.name, kind0: toride.kind }; });
await p.keyboard.press('3'); await p.click('[data-act="stab"][data-id="tokusei"]'); await p.waitForTimeout(200);
await p.selectOption('#sel-ninja-head', 'momochi_tanba'); await p.waitForTimeout(200);
const opt = await p.$eval('#sel-ninja-target option:nth-child(2)', (o) => o.value).catch(() => null);
let rumor = null;
if (opt) { await p.selectOption('#sel-ninja-target', opt); await p.waitForTimeout(200); const btn = await p.$eval('[data-act="ninja-do"]', (b) => ({ text: b.textContent, disabled: b.disabled })); await p.screenshot({ path: `${out}/490-tokusei${mobile ? '-m' : ''}.png`, fullPage: mobile }); await p.click('[data-act="ninja-do"]'); await p.waitForTimeout(200); rumor = { btn, log: await p.evaluate(() => window.__sengoku.state.log.slice(-1)[0].text) }; }
// 茶会と普請
await p.click('[data-act="tea-do"]').catch(() => {}); await p.waitForTimeout(300);
const tea = await p.evaluate(() => window.__sengoku.state.log.slice(-1)[0].text);
// 茶会の場面を閉じて、特性の画面に戻る
if (await p.$('#scene:not([hidden])')) { await p.click('#scene [data-sact="skip"]'); await p.waitForTimeout(200); }
await p.keyboard.press('3'); await p.click('[data-act="stab"][data-id="tokusei"]'); await p.waitForTimeout(200);
const fbtn = await p.$('[data-act="fushin"]:not([disabled])');
let fushin = null; if (fbtn) { await fbtn.click(); await p.waitForTimeout(200); fushin = await p.evaluate(() => window.__sengoku.state.log.slice(-1)[0].text); }
// 武将の詳細の特性の札
await p.evaluate(() => { const b = [...document.querySelectorAll('#modal-body .glink')].find((x) => x.textContent.includes('百地')); b?.click(); }); await p.waitForTimeout(250);
const detail = await p.evaluate(() => document.querySelector('.gdetail .pill.trait')?.textContent ?? null);
console.log(JSON.stringify({ setup, rumor, tea, fushin, detail, errors: errors.length ? errors : 'none' }, null, 1));
await b.close();
