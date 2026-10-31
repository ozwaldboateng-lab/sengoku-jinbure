// シナリオ（1552年）・年齢・病の画面確認
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const out = process.argv[2];
const mobile = process.argv[3] === 'mobile';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: mobile ? { width: 390, height: 844 } : { width: 1360, height: 820 } });
const errors = [];
p.on('pageerror', (e) => errors.push('pageerror ' + e.message));
p.on('console', (m) => { if (m.type() === 'error') errors.push('console ' + m.text()); });
await p.goto('file://' + process.cwd() + '/dist/index.html');
await p.waitForTimeout(400);
await p.click('[data-act="t-new"]'); await p.click('[data-act="pick-scen"][data-id="1552"]'); await p.waitForTimeout(300);
await p.screenshot({ path: `${out}/150-title-1552${mobile ? '-m' : ''}.png`, fullPage: true });
const cards = await p.evaluate(() => [...document.querySelectorAll('.clan-card')].map((c) => c.textContent.replace(/\s+/g, ' ').trim()).slice(0, 8));
await p.click('[data-act="pick-clan"][data-id="oda"]');
await p.click('[data-act="start"]'); await p.waitForTimeout(400);
const date = await p.evaluate(() => document.getElementById('date').textContent);
await p.screenshot({ path: `${out}/151-start-1552${mobile ? '-m' : ''}.png` });
await p.keyboard.press('3'); await p.click('[data-act="stab"][data-id="vassals"]'); await p.waitForTimeout(150);
const rows = await p.evaluate(() => [...document.querySelectorAll('#modal-body tbody tr')].slice(0, 12).map((tr) => [...tr.children].slice(0, 3).map((x) => x.textContent.trim()).join(':') + ' ' + tr.children[9].textContent.trim()));
await p.screenshot({ path: `${out}/152-vassals-1552${mobile ? '-m' : ''}.png` });
await p.click('#modal-close');
// 数か月進める（合戦が開けば委任して戦場を去る）
for (let m = 0; m < 3; m++) {
  await p.click('#btn-end');
  for (let k = 0; k < 150; k++) {
    await p.waitForTimeout(150);
    if (await p.evaluate(() => !document.getElementById('battle').hidden)) {
      if (await p.$('[data-bact="leave"]')) await p.click('[data-bact="leave"]'); else await p.click('#bt-auto').catch(() => {});
      continue;
    }
    const modalOpen = await p.evaluate(() => !document.getElementById('modal').hidden);
    if (modalOpen) { const no = await p.$('#modal [data-act="ask-no"]'); if (no) await no.click(); else await p.click('#modal-close').catch(() => {}); continue; }
    if (await p.evaluate(() => !document.getElementById('btn-end').disabled)) break;
  }
}
const after = await p.evaluate(() => { const s = window.__sengoku.state; return { date: document.getElementById('date').textContent, turn: s.turn, scen: s.scenario, start: s.startYear, sick: Object.values(s.generals).filter((g) => g.sick).length, dead: Object.values(s.generals).filter((g) => g.status === 'dead').length }; });
const logTop = await p.evaluate(() => [...document.querySelectorAll('#log li')].slice(0, 3).map((x) => x.textContent));
console.log({ mobile, cards, date, rows, after, logTop, errors: errors.length ? errors : 'none' });
await b.close();
