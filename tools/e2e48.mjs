// 金山・銀山・特産品・楽市楽座: 城の札の表示、鉱山の稼ぎは知行に関わらず当家へ、楽市楽座の反発
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const out = process.argv[2], mobile = process.argv[3] === 'mobile', sfx = mobile ? '-m' : '';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: mobile ? { width: 390, height: 844 } : { width: 1360, height: 820 } });
const errors = [];
p.on('pageerror', (e) => errors.push('pageerror ' + e.message));
await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(400);
await p.click('[data-act="t-new"]'); await p.click('[data-act="pick-scen"][data-id="1560"]'); await p.click('[data-act="pick-clan"][data-id="takeda"]');
await p.click('[data-act="start"]'); await p.waitForTimeout(300);
for (let k = 0; k < 4; k++) if (await p.$('#modal:not([hidden])')) await p.click('#modal-close').catch(() => {});
const head = async () => { await p.keyboard.press('1'); await p.waitForTimeout(100); const t = await p.evaluate(() => document.querySelector('#modal-body .lede')?.textContent); await p.click('#modal-close'); return t; };
const lede = await head();
// 躑躅ヶ崎館の札
await p.keyboard.press('1'); await p.click('[data-act="stab"][data-id="shiro"]'); await p.waitForTimeout(100);
await p.click('[data-act="goto-castle"] >> text=躑躅ヶ崎館'); await p.waitForTimeout(200);
const panel = await p.evaluate(() => document.body.innerText.match(/鉱山[^\n]*\n?[^\n]*|特産[^\n]*\n?[^\n]*/g));
await p.screenshot({ path: `${out}/480-mine${sfx}.png` });
// 楽市楽座
const rk = await p.$('[data-act="rakuichi"]');
if (rk) { await rk.click(); await p.waitForTimeout(150); }
const rakuichi = await p.evaluate(() => { const s = window.__sengoku.state; const c = s.castles.find((x) => x.id === 'tsutsujigasaki'); return c.rakuichi; });
// 躑躅ヶ崎館以外に黒川金山はない。家臣に与えても鉱山は当家へ（与えられるのは当主の居城以外なので、金山の城を当主の居城から外す）
const gold0 = await p.evaluate(() => Math.round(window.__sengoku.state.clans.takeda.gold));
const ch0 = await p.evaluate(() => window.__sengoku.state.castles.find((x) => x.id === 'tsutsujigasaki').chian);
await p.click('#modal-close').catch(() => {}); await p.click('#btn-end');
for (let k = 0; k < 300 && (await p.evaluate(() => window.__sengoku.state.turn)) < 2; k++) {
  const auto = await p.$('#bt-auto:not([disabled])'); if (auto && await auto.isVisible()) await auto.click().catch(() => {});
  const leave = await p.$('[data-bact="leave"]'); if (leave && await leave.isVisible()) await leave.click().catch(() => {});
  await p.waitForTimeout(300);
}
await p.waitForTimeout(300);
const after = await p.evaluate(() => { const s = window.__sengoku.state; const c = s.castles.find((x) => x.id === 'tsutsujigasaki'); return { gold: Math.round(s.clans.takeda.gold), chian: c.chian, log: s.log.filter((l) => l.mine && /楽市/.test(l.text)).map((l) => l.text) }; });
const sw = await p.evaluate(() => document.documentElement.scrollWidth);
console.log(JSON.stringify({ lede, panel, rakuichi: rakuichi ?? null, gold: `${gold0}→${after.gold}`, chian: `${ch0}→${after.chian}`, log: after.log, sw, errors: errors.length ? errors : 'none' }, null, 1));
await b.close();
