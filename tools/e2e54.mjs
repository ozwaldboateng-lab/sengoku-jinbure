// 音: 自動テストの印（webdriver）を隠して実際に鳴らし、タイトル・地図・評定終了・合戦・設定でエラーが出ないか
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const out = process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 1360, height: 820 } });
await p.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => false }));
const errors = [];
p.on('pageerror', (e) => errors.push('pageerror ' + e.message));
p.on('console', (m) => { if (m.type() === 'error') errors.push('console ' + m.text()); });
await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(400);
await p.evaluate(() => localStorage.setItem('sengoku-opening', 'off'));
await p.click('[data-act="t-new"]'); await p.click('[data-act="pick-scen"][data-id="1560"]'); await p.waitForTimeout(300);
await p.click('[data-act="start"]'); await p.waitForTimeout(1500);
for (let k = 0; k < 4; k++) if (await p.$('#modal:not([hidden])')) await p.click('#modal-close').catch(() => {});
const ctx1 = await p.evaluate(() => typeof AudioContext);
await p.click('#btn-end');
for (let k = 0; k < 300 && (await p.evaluate(() => window.__sengoku.state.turn)) < 2; k++) {
  const auto = await p.$('#bt-auto:not([disabled])'); if (auto && await auto.isVisible()) await auto.click().catch(() => {});
  const leave = await p.$('[data-bact="leave"]'); if (leave && await leave.isVisible()) await leave.click().catch(() => {});
  await p.waitForTimeout(300);
}
await p.waitForTimeout(1200);
for (let k = 0; k < 4; k++) if (await p.$('#modal:not([hidden])')) await p.click('#modal-close').catch(() => {});
// 設定: 音楽と効果音の切り替え・音量
await p.keyboard.press('6'); await p.click('[data-act="stab"][data-id="save"]'); await p.waitForTimeout(150);
const labels0 = await p.evaluate(() => [...document.querySelectorAll('[data-act="snd-music"], [data-act="snd-sfx"]')].map((x) => x.textContent));
await p.click('[data-act="snd-music"]'); await p.waitForTimeout(150);
await p.$eval('input[data-vol="vs"]', (x) => { x.value = '30'; x.dispatchEvent(new Event('change', { bubbles: true })); });
await p.waitForTimeout(150);
const st = await p.evaluate(() => JSON.parse(localStorage.getItem('sengoku-sound')));
await p.click('[data-act="snd-music"]'); await p.waitForTimeout(150);
await p.screenshot({ path: `${out}/540-sound-settings.png` });
console.log(JSON.stringify({ ctx1, turn: await p.evaluate(() => window.__sengoku.state.turn), labels0, st, errors: errors.length ? errors : 'none' }));
await b.close();
