// 降伏勧告の札（PC・スマホ）: 条件を満たせば押せる。スマホで押せない札を押すと理由が出る
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const out = process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const mobile of [false, true]) {
  const ctx = await b.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1360, height: 820 }, hasTouch: mobile, isMobile: mobile });
  const p = await ctx.newPage();
  const errors = []; p.on('pageerror', (e) => errors.push(e.message));
  await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(500);
  await p.click('[data-act="t-new"]'); await p.click('[data-act="pick-scen"][data-id="1560"]'); await p.click('[data-act="pick-clan"][data-id="oda"]');
  await p.click('[data-act="start"]'); await p.waitForTimeout(300);
  for (let k = 0; k < 4; k++) if (await p.$('#modal:not([hidden])')) await p.click('#modal-close').catch(() => {});
  // 織田を強くし、遠山（岩村）を弱くする
  await p.evaluate(() => { const s = window.__sengoku.state; s.clans.oda.gold = 50000; for (const c of s.castles) if (['saito', 'imagawa', 'matsudaira'].includes(c.owner)) c.owner = 'oda'; });
  await p.evaluate(() => document.getElementById('zhome').click());
  await p.click('#btn-gaiko'); await p.waitForTimeout(200);
  const btns = await p.evaluate(() => [...document.querySelectorAll('#modal [data-act="dip"][data-kind="surrender"]')].map((b) => { const r = b.getBoundingClientRect(); return { id: b.dataset.id, dis: b.disabled || b.getAttribute("aria-disabled") === "true", t: b.textContent, w: Math.round(r.width), h: Math.round(r.height), vis: r.width > 0 && r.height > 0 }; }));
  const enabled = btns.filter((x) => !x.dis);
  console.log(mobile ? 'MOBILE' : 'DESKTOP', 'surrender buttons', btns.length, 'enabled', enabled.map((x) => `${x.id}:${x.t}:${x.w}x${x.h}`).join(' '), '| disabled sample', btns.filter((x) => x.dis).slice(0, 3).map((x) => x.id + ':' + x.w + 'x' + x.h).join(' '));
  if (enabled[0]) {
    const sel = `#modal [data-act="dip"][data-kind="surrender"][data-id="${enabled[0].id}"]`;
    await p.locator(sel).scrollIntoViewIfNeeded();
    const at = await p.evaluate((sel) => { const b = document.querySelector(sel); const r = b.getBoundingClientRect(); const e = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return e === b ? 'button' : e?.outerHTML.slice(0, 80); }, sel);
    console.log(' topmost at button center:', at);
    await p.screenshot({ path: `${out}/350-surr${mobile ? '-m' : ''}.png` });
    if (mobile) {
      const off = '#modal [data-act="dip"][data-kind="surrender"][data-id="asakura"]';
      await p.locator(off).scrollIntoViewIfNeeded(); await p.tap(off, { force: true }); await p.waitForTimeout(200);
      console.log(' tap disabled asakura → toast:', await p.evaluate(() => document.getElementById('toast').textContent), 'aria', await p.evaluate((o) => document.querySelector(o).getAttribute('aria-disabled'), off));
      await p.locator(sel).scrollIntoViewIfNeeded(); await p.screenshot({ path: `${out}/351-surr-m.png` });
    }
    if (mobile) await p.tap(sel).catch((e) => console.log(' tap fail', e.message.split('\n')[0])); else await p.click(sel);
    await p.waitForTimeout(600);
    console.log(' after tap: modal title', await p.evaluate(() => document.getElementById('modal-title')?.textContent), 'toast', await p.evaluate(() => document.getElementById('toast').textContent));
  }
  console.log(' errors', errors);
  await ctx.close();
}
await b.close();
