// 茶会の場面: 茶人の家臣を亭主に茶会を開くと、地図を暗くして亭主の城へ寄せ、口上・客の言葉・結びを一枚ずつ。閉じると元の地図へ
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const out = process.argv[2], mobile = process.argv[3] === 'mobile', sfx = mobile ? '-m' : '';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage(mobile ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1360, height: 820 } });
const errors = [];
p.on('pageerror', (e) => errors.push('pageerror ' + e.message));
await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(400);
await p.click('[data-act="t-new"]'); await p.click('[data-act="pick-scen"][data-id="1560"]'); await p.click('[data-act="pick-clan"][data-id="oda"]');
await p.click('[data-act="start"]'); await p.waitForTimeout(300);
for (let k = 0; k < 4; k++) if (await p.$('#modal:not([hidden])')) await p.click('#modal-close').catch(() => {});
// 細川藤孝（茶人）を当家に、名物の茶器を持たせて
await p.evaluate(() => { const s = window.__sengoku.state, g = s.generals.hosokawa_fujitaka; g.clan = 'oda'; g.status = 'free'; g.loc = s.castles.find((c) => c.id === 'kiyosu').i; s.clans.oda.gold = 20000; const teas = Object.values(s.items).filter((i) => i.kind === 'tea').sort((a, b) => b.grade - a.grade); const give = (it, x) => { if (!it) return; if (it.holder && s.generals[it.holder]) s.generals[it.holder].tea = undefined; it.clan = 'oda'; it.holder = x.id; x.tea = it.id; }; give(teas[0], g); give(teas[1], s.generals.shibata_katsuie); window.__teaG = [teas[0]?.grade, teas[1]?.grade]; });
const view0 = await p.evaluate(() => { const v = window.__sengoku.view; return [Math.round(v.scale * 100), Math.round(v.ox), Math.round(v.oy)]; });
await p.keyboard.press('3'); await p.click('[data-act="stab"][data-id="tokusei"]'); await p.waitForTimeout(150);
await p.selectOption('#sel-tea-host', 'hosokawa_fujitaka').catch(() => {}); await p.waitForTimeout(100);
await p.click('[data-act="tea-do"]'); await p.waitForTimeout(500);
const beats = [];
for (let k = 0; k < 12; k++) {
  const st = await p.evaluate(() => { const el = document.getElementById('scene'); if (!el || el.hidden) return null; const box = el.querySelector('.op-box'); return { head: box.querySelector('h2')?.textContent ?? box.querySelector('.op-name')?.textContent ?? '', text: (box.querySelector('.op-line, .op-narr p')?.textContent ?? '').slice(0, 160), face: !!box.querySelector('img.face') }; });
  if (!st) break;
  beats.push(`${st.head}｜${st.text}${st.face ? '（顔）' : ''}`);
  if ([0, 1, 3].includes(k)) { await p.waitForTimeout(800); await p.screenshot({ path: `${out}/55-tea-${k}${sfx}.png` }); }
  await p.click('#scene .op-box'); await p.waitForTimeout(250);
}
await p.waitForTimeout(300);
const after = await p.evaluate(() => { const v = window.__sengoku.view; return { scene: !document.getElementById('scene')?.hidden, view: [Math.round(v.scale * 100), Math.round(v.ox), Math.round(v.oy)], toast: document.getElementById('toast').textContent, log: window.__sengoku.state.log.filter((l) => /茶会/.test(l.text)).map((l) => l.text) }; });
const sw = await p.evaluate(() => document.documentElement.scrollWidth);
const grades = await p.evaluate(() => window.__teaG);
console.log(JSON.stringify({ grades, n: beats.length, beats, view0, after, sw, errors: errors.length ? errors : 'none' }, null, 1));
await b.close();
