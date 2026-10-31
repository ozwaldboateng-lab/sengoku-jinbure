// 本願寺で一向一揆を起こし、評定終了で一揆勢が攻めかかるか
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
await p.click('[data-act="t-new"]'); await p.click('[data-act="pick-scen"][data-id="1560"]'); await p.click('[data-act="pick-clan"][data-id="honganji"]');
await p.click('[data-act="start"]');
await p.waitForTimeout(300);
const clickHex = async (hex) => { await p.evaluate((hex) => window.__sengoku.view.centerOn(hex), hex); await p.waitForTimeout(80); const pt = await p.evaluate((hex) => { const v = window.__sengoku.view; const c = window.__sengoku.center(hex); const r = v.canvas.getBoundingClientRect(); return { x: r.left + c[0] * v.scale + v.ox, y: r.top + c[1] * v.scale + v.oy }; }, hex); await p.mouse.click(pt.x, pt.y); await p.waitForTimeout(150); };
const target = await p.evaluate(() => { const s = window.__sengoku.state; const c = s.castles.find((x) => x.id === 'koshimizu'); return { hex: c.hex, name: c.name, owner: c.owner, dev: c.dev, chian: c.chian }; });
await clickHex(target.hex);
const vc = await p.$('[data-act="view-castle"]'); if (vc) { await vc.click(); await p.waitForTimeout(150); }
const btn = await p.$('[data-act="ikki"]');
const disabled = btn ? await btn.evaluate((x) => x.disabled) : 'nobutton';
await p.screenshot({ path: `${out}/95-ikki-panel.png` });
if (btn && !disabled) { await btn.click(); await p.waitForTimeout(200); }
const army = await p.evaluate(() => Object.values(window.__sengoku.state.armies).filter((a) => a.ikki).map((a) => ({ troops: a.troops, hex: a.hex })));
await p.screenshot({ path: `${out}/96-ikki-raised.png` });
await p.click('#btn-end');
for (let k = 0; k < 150; k++) {
  await p.waitForTimeout(150);
  if (await p.evaluate(() => !document.getElementById('battle').hidden)) { if (await p.$('[data-bact="leave"]')) await p.click('[data-bact="leave"]'); else await p.click('#bt-auto').catch(() => {}); continue; }
  if (await p.evaluate(() => !document.getElementById('modal').hidden)) { const no = await p.$('#modal [data-act="ask-no"]'); if (no) await no.click(); else await p.click('#modal-close').catch(() => {}); continue; }
  if (await p.evaluate(() => !document.getElementById('btn-end').disabled)) break;
}
const after = await p.evaluate(() => { const s = window.__sengoku.state; const c = s.castles.find((x) => x.id === 'koshimizu'); return { owner: c.owner, dev: c.dev.toFixed(3), chian: Math.round(c.chian), garrison: c.garrison, logs: s.log.filter((l) => /一揆|蜂起|越水/.test(l.text)).map((l) => l.text).slice(0, 6) }; });
console.log({ target, disabled, army, after, errors: errors.length ? errors : 'none' });
await b.close();
