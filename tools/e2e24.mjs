// 御恩と奉公: 恩賞の画面（感状・加増・取り立て）、月の報告の恩賞の沙汰、家臣団の恩の列
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
const ids = await p.evaluate(() => {
  const s = window.__sengoku.state;
  const vs = Object.values(s.generals).filter((g) => g.clan === 'oda' && ['free', 'army', 'governor'].includes(g.status) && s.clans.oda.leader !== g.id);
  const a = vs[0], k = vs[1], pr = vs.find((g) => g.rank === 2 && g !== a && g !== k);
  a.merit += 40; k.merit += 30; pr.merit = Math.max(pr.merit, 125);
  return { a: a.id, k: k.id, pr: pr.id };
});
const g = (id) => p.evaluate((id) => { const x = window.__sengoku.state.generals[id]; return { on: Math.round(x.on), due: Math.round(x.merit - x.paid), rank: x.rank }; }, id);
const before = { a: await g(ids.a), k: await g(ids.k), pr: await g(ids.pr) };
await p.keyboard.press('3'); await p.click('[data-act="stab"][data-id="rewards"]'); await p.waitForTimeout(150);
await p.screenshot({ path: `${out}/240-rewards${sfx}.png` });
await p.click(`[data-act="rw-kazo"][data-id="${ids.a}"]`); await p.waitForTimeout(200);
const cutKazo = await p.evaluate(() => document.getElementById('cutin')?.textContent.replace(/\s+/g, ' ').trim() ?? null);
await p.click('#cutin').catch(() => {});
await p.click(`[data-act="rw-kanjo"][data-id="${ids.k}"]`); await p.waitForTimeout(150); await p.click('#cutin').catch(() => {});
await p.click(`[data-act="rw-promote"][data-id="${ids.pr}"]`); await p.waitForTimeout(150); await p.click('#cutin').catch(() => {});
const after = { a: await g(ids.a), k: await g(ids.k), pr: await g(ids.pr) };
// 家臣団の恩の列で並べ替え
await p.click('[data-act="stab"][data-id="vassals"]'); await p.waitForTimeout(100);
await p.click('[data-act="vsort"][data-id="on"]'); await p.waitForTimeout(100);
const onSorted = await p.evaluate(() => { const v = [...document.querySelectorAll('#modal tbody tr')].map((tr) => parseInt(tr.children[8].textContent, 10)).filter((x) => !isNaN(x)); return v.every((x, i) => i === 0 || v[i - 1] >= x); });
// 月の報告の恩賞の沙汰
await p.evaluate(() => { const s = window.__sengoku.state; const x = Object.values(s.generals).find((g) => g.clan === 'oda' && g.status === 'army'); x.merit += 50; });
for (let k = 0; k < 3; k++) if (await p.$('#modal:not([hidden])')) await p.click('#modal-close').catch(() => {});
await p.keyboard.press('e');
await p.waitForSelector('#modal [data-act="rw-kazo"]', { timeout: 90000 });
await p.screenshot({ path: `${out}/241-report-rewards${sfx}.png` });
const sw = await p.evaluate(() => document.documentElement.scrollWidth);
console.log({ mobile, before, after, cutKazo, onSorted, sw, errors: errors.length ? errors : 'none' });
await b.close();
