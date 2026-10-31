// 主メニュー（内政・軍事・外交・情報・商い・記録）の全タブを開く
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
await p.click('[data-act="t-new"]'); await p.click('[data-act="pick-scen"][data-id="1560"]'); await p.click('[data-act="pick-clan"][data-id="oda"]');
await p.click('[data-act="start"]');
await p.waitForTimeout(300);
const header = await p.evaluate(() => { const bs = [...document.querySelectorAll('.cmds button')]; return { n: bs.length, tops: [...new Set(bs.map((x) => Math.round(x.getBoundingClientRect().top)))], scrollW: document.documentElement.scrollWidth, w: innerWidth }; });
await p.screenshot({ path: `${out}/140-header${mobile ? '-m' : ''}.png` });
const seen = [];
for (const m of ['naisei', 'gunji', 'jinji', 'gaiko', 'akinai', 'kiroku']) {
  await p.click(`#btn-${m}`); await p.waitForTimeout(100);
  const tabs = await p.evaluate(() => [...document.querySelectorAll('[data-act="stab"]')].map((x) => x.dataset.id));
  for (const t of tabs) {
    await p.click(`[data-act="stab"][data-id="${t}"]`); await p.waitForTimeout(80);
    const len = await p.evaluate(() => document.getElementById('modal-body').textContent.length);
    seen.push(`${m}/${t}:${len}`);
    if (!mobile) await p.screenshot({ path: `${out}/141-${m}-${t}.png` });
  }
  await p.click('#modal-close'); await p.waitForTimeout(60);
}
if (mobile) { await p.click('#btn-naisei'); await p.click('[data-act="stab"][data-id="shiro"]'); await p.waitForTimeout(100); await p.screenshot({ path: `${out}/142-castles-m.png` }); await p.click('#modal-close'); }
// 前回のタブを覚えている / 数字キー
await p.click('#btn-gunji'); await p.click('[data-act="stab"][data-id="butai"]'); await p.click('#modal-close');
await p.keyboard.press('2'); await p.waitForTimeout(80);
const remembered = await p.evaluate(() => document.querySelector('[data-act="stab"][aria-selected="true"]')?.dataset.id);
await p.keyboard.press('3'); await p.waitForTimeout(80);
const key4 = await p.evaluate(() => document.getElementById('modal-title').textContent);
// 鉄砲の配備（蔵が空なので買ってから）
await p.keyboard.press('5'); await p.click('[data-act="stab"][data-id="gunbuy"]'); await p.click('[data-act="gun-buy"][data-id="300"]'); await p.waitForTimeout(80);
await p.keyboard.press('2'); await p.click('[data-act="stab"][data-id="butai"]');
const armBtn = await p.$('[data-act="arm-guns-m"]:not([disabled])');
if (armBtn) { await armBtn.click(); await p.waitForTimeout(80); }
const guns = await p.evaluate(() => { const s = window.__sengoku.state; return { kura: s.clans.oda.guns, armies: Object.values(s.armies).filter((a) => a.clan === 'oda').map((a) => a.guns ?? 0) }; });
// 部隊の一覧から地図の部隊へ
await p.click('[data-act="stab"][data-id="butai"]');
await p.click('[data-act="goto-army"]'); await p.waitForTimeout(150);
const jumped = await p.evaluate(() => ({ modal: document.getElementById('modal').hidden, panel: document.getElementById('panel').textContent.slice(0, 40) }));
// 城の一覧から城へ
await p.keyboard.press('1'); await p.click('[data-act="stab"][data-id="shiro"]');
await p.click('[data-act="goto-castle"]'); await p.waitForTimeout(150);
const jumpedC = await p.evaluate(() => ({ modal: document.getElementById('modal').hidden, panel: document.getElementById('panel').textContent.slice(0, 30) }));
console.log({ mobile, header, seen, remembered, key4, guns, jumped, jumpedC, errors: errors.length ? errors : 'none' });
await b.close();
