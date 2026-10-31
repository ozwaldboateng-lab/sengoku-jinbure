import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1360, height: 820 } });
const errors = [];
p.on('pageerror', (e) => errors.push('pageerror ' + e.message));
await p.goto('file://' + process.cwd() + '/dist/index.html');
await p.waitForTimeout(300);
await p.click('[data-act="t-new"]'); await p.click('[data-act="pick-scen"][data-id="1560"]'); await p.click('[data-act="pick-clan"][data-id="matsudaira"]');
await p.click('[data-act="start"]');
await p.waitForTimeout(300);
let delegatedInEnemyPhase = 0, battles = 0;
for (let turn = 0; turn < 14 && battles < 2; turn++) {
  await p.click('#btn-end');
  for (let k = 0; k < 120; k++) {
    await p.waitForTimeout(100);
    if (await p.$('[data-act="ask-no"]')) await p.click('[data-act="ask-no"]');
    if (await p.evaluate(() => !document.getElementById('battle').hidden)) {
      battles++;
      const enemyPhase = await p.evaluate(() => !document.getElementById('bt-phase').classList.contains('mine'));
      await p.click('#bt-auto');
      await p.waitForSelector('[data-bact="leave"]', { timeout: 15000 });
      if (enemyPhase) delegatedInEnemyPhase++;
      await p.click('[data-bact="leave"]');
    }
    if (await p.evaluate(() => !document.getElementById('btn-end').disabled && document.getElementById('battle').hidden)) break;
  }
  await p.evaluate(() => document.querySelector('#modal:not([hidden]) [data-act="close"]')?.click());
  if (await p.$('[data-act="newgame"]')) break;
}
console.log({ battles, delegatedInEnemyPhase, errors: errors.length ? errors : 'none' });
await b.close();
