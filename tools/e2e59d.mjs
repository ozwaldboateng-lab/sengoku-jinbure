// 逸話の場面を1582年（本能寺の変の直後）の盤面で流す
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const out = process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1360, height: 820 } });
const errors = [];
p.on('pageerror', (e) => errors.push('pageerror ' + e.message));
await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.evaluate(() => localStorage.setItem('sengoku-events', 'on')); await p.reload(); await p.waitForTimeout(400);
await p.click('[data-act="t-new"]'); await p.click('[data-act="pick-scen"][data-id="1582"]'); await p.click('[data-act="pick-clan"][data-id="hashiba"]');
await p.click('[data-act="start"]'); await p.waitForTimeout(300);
for (let k = 0; k < 4; k++) if (await p.$('#modal:not([hidden])')) await p.click('#modal-close').catch(() => {});
const ids = await p.evaluate(() => window.__sengoku.anecdoteIds());
const res = {}, bad = [];
for (const id of ids) {
  const ok = await p.evaluate((id) => { const s = window.__sengoku.state; return window.__sengoku.anecdoteWho(id).every((g) => s.generals[g] && s.generals[g].status !== 'dead'); }, id);
  if (!ok) { res[id] = 'skip'; continue; }
  await p.evaluate((id) => window.__sengoku.anecdote(id), id);
  const done = p.evaluate(() => window.__sengoku.playEvents());
  await p.waitForTimeout(300);
  const beats = [];
  for (let k = 0; k < 16; k++) {
    const st = await p.evaluate(() => { const el = document.getElementById('scene'); if (!el || el.hidden) return null; const box = el.querySelector('.op-box'); return { t: box.textContent, who: !!box.querySelector('.op-who'), face: !!box.querySelector('.op-who img') }; });
    if (!st) break;
    beats.push(st);
    if (/\{|undefined|null/.test(st.t) || (st.who && !st.face)) bad.push(`${id}#${k}: ${st.t.slice(0, 50)} face=${st.face}`);
    if (id === 'ikkiuchi' && k === 2) await p.screenshot({ path: `${out}/59-${id}.png` });
    await p.click('#scene .op-box'); await p.waitForTimeout(120);
  }
  await done;
  res[id] = beats.length;
}
console.log(JSON.stringify({ res, bad, errors }, null, 1));
console.log(!errors.length && !bad.filter((x) => !x.includes('face=false')).length ? 'OK' : 'NG');
await b.close();
