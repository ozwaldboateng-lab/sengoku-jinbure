// 天下統一のエンディング（全城を当家にして月を送る）
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
await p.evaluate(() => { const s = window.__sengoku.state; for (const c of s.castles) c.owner = s.player; for (const a of Object.values(s.armies)) if (a.clan !== s.player) delete s.armies[a.id]; });
await p.click('#btn-end');
for (let k = 0; k < 60 && !(await p.$('#ending:not([hidden])')); k++) await p.waitForTimeout(200);
await p.waitForTimeout(1800);
const shown = await p.evaluate(() => { const e = document.getElementById('ending'); return e && !e.hidden ? e.querySelector('.end-text')?.textContent.replace(/\s+/g, ' ').trim() : null; });
await p.screenshot({ path: `${out}/390-ending${mobile ? '-m' : ''}.png` });
// 幕間「世界図」: セリフを送り、選ぶ
const policy = process.argv[4] ?? 'allow';
await p.evaluate((pol) => { const s = window.__sengoku.state; s.clans[s.player].mission = pol === 'none' ? undefined : pol; if (pol === 'none') s.ships = []; s.year = pol === 'allow' ? 1585 : s.year; }, policy);
await p.click('[data-act="end-next"]'); await p.waitForTimeout(1500);
const lines = [], choices = [], chapters = new Set(); let shot = 0;
for (let k = 0; k < 40; k++) {
  const st = await p.evaluate(() => ({ ch: document.querySelector('.il-head h2')?.textContent, q: document.querySelector('.il-quote .qname')?.textContent, choice: [...document.querySelectorAll('[data-act="il-choose"]')].map((b) => b.dataset.id), final: !!document.querySelector('#interlude h1') }));
  chapters.add(st.ch);
  if (st.final) break;
  if (st.q) { lines.push(`${st.ch}｜${st.q}`); if ([2, 9].includes(k)) await p.screenshot({ path: `${out}/391-interlude-${policy}-${shot++}${mobile ? '-m' : ''}.png` }); await p.click('[data-act="il-next"]'); }
  else if (st.choice.length) { await p.screenshot({ path: `${out}/391b-choice-${k}-${policy}${mobile ? '-m' : ''}.png` }); const want = ['yes', 'ban', 'expel', 'saki', 'envoy'].find((x) => st.choice.includes(x)) ?? st.choice[0]; choices.push(`${st.ch}｜${st.choice.join('/')}→${want}`); await p.click(`[data-act="il-choose"][data-id="${want}"]`); }
  await p.waitForTimeout(100);
}
const fin = await p.evaluate(() => ({ h: document.querySelector('#interlude h1')?.textContent, p: document.querySelector('#interlude .end-text p')?.textContent, k: window.__sengoku.state.karairi, mission: window.__sengoku.state.clans[window.__sengoku.state.player].mission }));
await p.screenshot({ path: `${out}/393-finale-${policy}${mobile ? '-m' : ''}.png` });
await p.click('[data-act="il-close"]'); await p.waitForTimeout(200);
console.log(JSON.stringify({ shown: !!shown, chapters: [...chapters], lines, choices, fin, errors: errors.length ? errors : 'none' }, null, 1));
await b.close();
