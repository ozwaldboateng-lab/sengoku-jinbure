// 内政の委任: 全項目を任せて数か月進め、記録に「委任:」が残るか
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const out = process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1360, height: 820 } });
const errors = [];
p.on('pageerror', (e) => errors.push('pageerror ' + e.message));
p.on('console', (m) => { if (m.type() === 'error') errors.push('console ' + m.text()); });
await p.goto('file://' + process.cwd() + '/dist/index.html');
await p.waitForTimeout(400);
await p.click('[data-act="t-new"]'); await p.click('[data-act="pick-scen"][data-id="1560"]'); await p.click('[data-act="pick-clan"][data-id="oda"]');
await p.click('[data-act="start"]');
await p.waitForTimeout(300);
await p.click('#btn-naisei'); await p.waitForTimeout(150);
await p.click('[data-act="stab"][data-id="deleg"]'); await p.waitForTimeout(100);
for (const k of ['budget', 'trade', 'staff', 'court']) { await p.click(`[data-act="deleg"][data-id="${k}"]`); await p.waitForTimeout(80); }
await p.screenshot({ path: `${out}/90-deleg.png` });
const flags = await p.evaluate(() => window.__sengoku.state.clans.oda.delegate);
await p.click('#modal-close'); await p.waitForTimeout(100);
// 自軍の行動はせずに数か月進める（合戦が開いたら委任して戦場を去る）
for (let m = 0; m < 4; m++) {
  await p.click('#btn-end');
  for (let k = 0; k < 120; k++) {
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
const st = await p.evaluate(() => { const s = window.__sengoku.state; const c = s.clans.oda; return { date: `${s.year}/${s.month}`, budget: c.budget, mob: c.mobilize, court: c.court, gold: c.gold, logs: s.log.filter((l) => l.text.startsWith('委任')).map((l) => l.text) }; });
console.log({ flags, st, errors: errors.length ? errors : 'none' });
await b.close();
