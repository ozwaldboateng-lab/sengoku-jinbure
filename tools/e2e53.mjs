// 序幕: 時代（シナリオ）を選ぶと、家選びの前に暗い地図の上で背景を語る。押すと次へ、最後で家選びへ。飛ばせる
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const out = process.argv[2], mobile = process.argv[3] === 'mobile', sfx = mobile ? '-m' : '';
const scen = process.argv[4] ?? '1560';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage(mobile ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1360, height: 820 } });
const errors = [];
p.on('pageerror', (e) => errors.push('pageerror ' + e.message));
await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.evaluate(() => { localStorage.setItem('sengoku-opening', 'on'); localStorage.setItem('sengoku-karairi', JSON.stringify({ clan: 'oda' })); }); await p.reload(); await p.waitForTimeout(400);
await p.click('[data-act="t-new"]'); await p.click(`[data-act="pick-scen"][data-id="${scen}"]`); await p.waitForTimeout(500);
const beats = [];
for (let k = 0; k < 30; k++) {
  const st = await p.evaluate(() => { const t = document.getElementById('title'); if (t.hidden || t.dataset.screen !== 'opening') return null; const box = document.querySelector('.op-box'); return box ? { head: box.querySelector('h2')?.textContent ?? box.querySelector('.op-name')?.textContent ?? '', face: !!box.querySelector('img.face'), dots: box.querySelectorAll('.op-dots i').length } : null; });
  if (!st) break;
  beats.push(`${st.head}${st.face ? '（顔）' : ''}`);
  if ([0, 2, 4, 6].includes(k)) await p.waitForTimeout(800), await p.screenshot({ path: `${out}/53-op-${scen}-${k}${sfx}.png` });
  await p.click('.op-box'); await p.waitForTimeout(mobile ? 250 : 200);
}
const atClan = await p.evaluate(() => document.getElementById('title').dataset.screen);
await p.click('[data-act="start"]'); await p.waitForTimeout(400);
const started = await p.evaluate(() => ({ atClan: null, title: !document.getElementById('title').hidden, turn: window.__sengoku.state?.turn, scen: window.__sengoku.state?.scenario }));
started.atClan = atClan;
// 飛ばす
await p.evaluate(() => localStorage.removeItem('sengoku-autosave'));
await p.reload(); await p.waitForTimeout(400);
await p.click('[data-act="t-new"]'); await p.click(`[data-act="pick-scen"][data-id="${scen}"]`); await p.waitForTimeout(300);
await p.click('[data-act="op-skip"]'); await p.waitForTimeout(300);
const skipped = await p.evaluate(() => document.getElementById('title').dataset.screen === 'clan');
const sw = await p.evaluate(() => document.documentElement.scrollWidth);
console.log(JSON.stringify({ scen, n: beats.length, beats, started, skipped, sw, errors: errors.length ? errors : 'none' }));
await b.close();
