// 人事が開かなくなる不具合の再発防止: 一揆の頭など消えた武将が「判明した敵将」に残っていても、人事（人材）が開く
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1360, height: 820 } });
const errors = [];
p.on('pageerror', (e) => errors.push(e.message));
await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(500);
await p.click('[data-act="t-new"]'); await p.click('[data-act="pick-scen"][data-id="1560"]'); await p.click('[data-act="pick-clan"][data-id="oda"]');
await p.click('[data-act="start"]'); await p.waitForTimeout(300);
// 人材を見てから閉じる → 一揆の頭が消えた状態にする
await p.click('#btn-jinji'); await p.click('[data-act="stab"][data-id="jinzai"]'); await p.click('#modal-close');
await p.evaluate(() => { window.__sengoku.state.revealed.push('ikki_9999'); });
await p.click('#btn-jinji'); await p.waitForTimeout(200);
const errbox = !!await p.$('#modal .errbox');
console.log({ errbox, open: !!await p.$('#modal:not([hidden]) .menu-tabs'), errors, body: await p.evaluate(() => document.querySelector('#modal:not([hidden]) .sect-h')?.textContent ?? null) });
await b.close();
