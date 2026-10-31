// 人事の総当たり: 月を進めながら、人事の各タブ・武将の詳細・その中の命令を開き、エラーと「開かない」を記録する
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const out = process.argv[2];
const clan = process.argv[3] || 'oda';
const months = +(process.argv[4] || 24);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1360, height: 820 } });
const errors = [];
p.on('pageerror', (e) => errors.push(`pageerror ${e.message} @${e.stack?.split('\n')[1]?.trim()}`));
p.on('console', (m) => { if (m.type() === 'error' && !/fonts|net::/.test(m.text())) errors.push('console ' + m.text()); });
await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(500);
await p.click('[data-act="t-new"]'); await p.click('[data-act="pick-scen"][data-id="1560"]'); await p.click(`[data-act="pick-clan"][data-id="${clan}"]`);
await p.click('[data-act="start"]'); await p.waitForTimeout(300);
const closeAll = async () => { for (let k = 0; k < 8 && await p.$('#modal:not([hidden])'); k++) { const c = await p.$('#modal:not([hidden]) [data-act="close"]'); if (c) await c.click().catch(() => {}); else await p.click('#modal-close').catch(() => {}); await p.waitForTimeout(60); } };
const fails = [];
const TABS = ['vassals', 'rewards', 'katoku', 'tsukai', 'gift', 'jinzai'];
for (let m = 0; m < months; m++) {
  await closeAll();
  const date = await p.evaluate(() => document.getElementById('date').textContent);
  // ボタンで開く
  await p.click('#btn-jinji'); await p.waitForTimeout(80);
  if (!await p.$('#modal:not([hidden]) .menu-tabs')) fails.push(`${date} 人事ボタンで開かない`);
  for (const t of TABS) {
    const before = errors.length;
    await p.click(`[data-act="stab"][data-id="${t}"]`, { timeout: 2000 }).catch(() => fails.push(`${date} タブ${t}が押せない`));
    await p.waitForTimeout(60);
    const sel = await p.evaluate(() => document.querySelector('#modal .tabs:not(.menu-tabs) [aria-selected="true"]')?.textContent);
    if (errors.length > before) fails.push(`${date} タブ${t}でエラー`);
    if (!sel) fails.push(`${date} タブ${t}が選ばれていない`);
  }
  // 家臣団 → 武将の詳細を数人
  await p.click('[data-act="stab"][data-id="vassals"]').catch(() => {});
  const ids = await p.evaluate(() => [...document.querySelectorAll('#modal [data-act="gen"]')].map((x) => x.dataset.id).filter((v, i, a) => a.indexOf(v) === i));
  for (const id of ids.slice(0, 40)) {
    await p.evaluate(() => document.querySelector('#modal [data-act="stab"][data-id="vassals"]')?.click());
    const before = errors.length;
    const ok = await p.evaluate((id) => { const e = document.querySelector(`#modal [data-act="gen"][data-id="${id}"]`); if (!e) return 'nolink'; e.click(); return 'ok'; }, id);
    await p.waitForTimeout(30);
    const shown = await p.evaluate(() => !!document.querySelector('#modal .gdetail'));
    if (ok === 'ok' && !shown) fails.push(`${date} ${id}の詳細が開かない`);
    if (errors.length > before) fails.push(`${date} ${id}の詳細でエラー`);
    await p.evaluate(() => document.querySelector('#modal [data-act="gen-back"], #modal [data-act="back"]')?.click());
  }
  // キーでも開く
  await closeAll(); await p.keyboard.press('3'); await p.waitForTimeout(60);
  if (!await p.$('#modal:not([hidden]) .menu-tabs')) fails.push(`${date} キー3で開かない`);
  await closeAll();
  // 月を進める
  await p.click('#btn-end');
  for (let k = 0; k < 300; k++) {
    await p.waitForTimeout(80);
    if (await p.evaluate(() => !document.getElementById('battle').hidden)) { if (await p.$('[data-bact="leave"]')) await p.click('[data-bact="leave"]'); else await p.click('#bt-auto').catch(() => {}); continue; }
    const no = await p.$('#modal:not([hidden]) [data-act="ask-no"]'); if (no) { await no.click(); continue; }
    if (await p.evaluate(() => !document.getElementById('btn-end').disabled)) break;
  }
  await p.waitForTimeout(150);
  if (await p.evaluate(() => window.__sengoku.state?.over)) break;
}
console.log(JSON.stringify({ clan, fails: fails.slice(0, 40), nfails: fails.length, errors: [...new Set(errors)].slice(0, 10) }, null, 1));
await p.screenshot({ path: `${out}/310-fuzz-${clan}.png` });
await b.close();
