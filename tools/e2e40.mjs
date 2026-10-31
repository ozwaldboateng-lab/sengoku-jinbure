// 唐入り（第二段）: 幕間から「唐入りを始める」→ 唐入りの札、対馬の軍勢が釜山を攻められる、造船、水軍の将
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const out = process.argv[2], mobile = process.argv[3] === 'mobile';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage(mobile ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1360, height: 820 } });
const errors = []; p.on('pageerror', (e) => errors.push(e.message));
await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(300);
await p.click('[data-act="t-new"]'); await p.click('[data-act="pick-scen"][data-id="1560"]'); await p.click('[data-act="pick-clan"][data-id="oda"]');
await p.click('[data-act="start"]'); await p.waitForTimeout(300);
for (let k = 0; k < 4; k++) if (await p.$('#modal:not([hidden])')) await p.click('#modal-close').catch(() => {});
await p.evaluate(() => { const s = window.__sengoku.state; for (const c of s.castles) if (!c.hex || true) { if (!['joseon', 'ming'].includes(c.owner)) c.owner = s.player; } for (const a of Object.values(s.armies)) if (a.clan !== s.player) delete s.armies[a.id]; for (const c of Object.values(s.clans)) if (c.id !== s.player && !c.foreign) c.alive = false; s.clans[s.player].gold = 30000; });
{ if (await p.$('#interlude:not([hidden]) [data-act="il-close"]')) { await p.click('#interlude [data-act="il-close"]'); await p.waitForTimeout(150); } } await p.click('#btn-end');
for (let k = 0; k < 60 && !(await p.$('#ending:not([hidden])')); k++) await p.waitForTimeout(200);
await p.waitForTimeout(1200);
await p.click('[data-act="end-next"]'); await p.waitForTimeout(1200);
for (let k = 0; k < 40; k++) {
  if (await p.$('[data-act="il-decide"]')) break;
  if (await p.$('[data-act="il-next"]')) await p.click('[data-act="il-next"]');
  else if (await p.$('[data-act="il-choose"]')) await p.click('[data-act="il-choose"] >> nth=0');
  await p.waitForTimeout(80);
}
await p.evaluate(() => { const r = document.querySelector('input[name="first"][value="now"]'); if (r) r.checked = true; });
await p.click('[data-act="il-decide"]'); await p.waitForTimeout(300);
await p.click('[data-act="il-start"]'); await p.waitForTimeout(400);
const tab = await p.evaluate(() => ({ sel: document.querySelector('[data-act="stab"][aria-selected="true"]')?.dataset.id, kv: [...document.querySelectorAll('#modal-body .kv dt')].map((d) => d.textContent + '=' + d.nextElementSibling.textContent).slice(0, 3) }));
await p.screenshot({ path: `${out}/440-karairi-tab${mobile ? '-m' : ''}.png`, fullPage: mobile });
const fleet0 = await p.evaluate(() => window.__sengoku.state.karairi.fleet);
await p.click('[data-act="kr-build"]'); await p.waitForTimeout(150);
const fleet1 = await p.evaluate(() => window.__sengoku.state.karairi.fleet);
const opt = await p.$eval('select[data-escort="0"] option:nth-child(2)', (o) => o.value).catch(() => null);
if (opt) { await p.selectOption('select[data-escort="0"]', opt); await p.waitForTimeout(150); }
const escort = await p.evaluate(() => window.__sengoku.state.karairi.escort);
await p.click('#modal-close');
// 対馬に軍勢を置いて選ぶ
const hex = await p.evaluate(() => { const s = window.__sengoku.state; const a = Object.values(s.armies).filter((x) => x.clan === s.player).sort((x, y) => y.troops - x.troops)[0]; const t = s.castles.find((c) => c.id === 'kaneishi'); a.hex = t.hex; a.mp = 4; a.acted = false; a.abroad = false; window.__sengoku.view.centerOn(t.hex, 1.8); return { a: a.id, hex: t.hex }; });
await p.waitForTimeout(300);
const pt = await p.evaluate((h) => { const v = window.__sengoku.view; const c = window.__sengoku.center(h); const r = v.canvas.getBoundingClientRect(); return { x: r.left + c[0] * v.scale + v.ox, y: r.top + c[1] * v.scale + v.oy }; }, hex.hex);
await p.mouse.click(pt.x, pt.y); await p.waitForTimeout(300);
const panel = await p.evaluate(() => document.getElementById('panel')?.innerText.match(/渡海:[^\n]*|赤枠の敵[^\n]*/g));
const targets = await p.evaluate(() => window.__sengoku.view.sel.targets.map((t) => t.hex));
await p.screenshot({ path: `${out}/441-tsushima${mobile ? '-m' : ''}.png` });
// 釜山を当家のものにして軍勢を置き、隣に朝鮮の軍勢を置いて月を送る（朝鮮が攻めてくれば合戦画面）
await p.evaluate(() => { const s = window.__sengoku.state; const X = window.__sengoku; const b = s.castles.find((c) => c.id === 'busan'); b.owner = s.player; const a = Object.values(s.armies).filter((x) => x.clan === s.player)[0]; a.hex = b.hex; a.troops = 3000; a.abroad = true; const j = Object.values(s.armies).find((x) => x.clan === 'joseon'); const g = s.generals.sin_rip; if (g && g.status === 'governor') { s.castles[g.loc].governor = null; } for (const y of Object.values(s.armies)) if (y.clan === 'joseon' && X.neighbors(b.hex).includes(y.hex)) delete s.armies[y.id]; const nb = X.neighbors(b.hex).find((h) => !Object.values(s.armies).some((y) => y.hex === h) && !s.castles.some((c) => c.hex === h)) ?? X.neighbors(b.hex).find((h) => !Object.values(s.armies).some((y) => y.hex === h)); s.nextArmyId = s.nextArmyId || 999; const id = s.nextArmyId++; s.armies[id] = { id, clan: 'joseon', main: 'sin_rip', deputy: null, troops: 9000, morale: 1.4, hex: nb, mp: 4, acted: false, departTroops: 9000, routed: false, monto: false, drill: 50, ashi: 0 }; g.status = 'army'; g.army = id; });
{ if (await p.$('#interlude:not([hidden]) [data-act="il-close"]')) { await p.click('#interlude [data-act="il-close"]'); await p.waitForTimeout(150); } } await p.click('#btn-end');
let battle = false;
for (let k = 0; k < 60; k++) { if (await p.evaluate(() => !document.getElementById('battle').hidden)) { battle = true; break; } if (!(await p.evaluate(() => document.getElementById('btn-end').disabled))) break; await p.waitForTimeout(200); }
let bt = null;
if (battle) { await p.waitForTimeout(500); if (await p.$('[data-bact="deploy-done"]')) await p.click('[data-bact="deploy-done"]'); await p.waitForTimeout(300); bt = await p.evaluate(() => ({ title: document.getElementById('bt-title').textContent, sub: document.getElementById('bt-sub').textContent, units: window.__sengoku_bt.t.units.filter((u) => u.side === 'A').map((u) => u.name) })); await p.screenshot({ path: `${out}/442-korea-battle${mobile ? '-m' : ''}.png` }); await p.click('#bt-auto').catch(() => {}); await p.waitForTimeout(1500); if (await p.$('[data-bact="leave"]')) await p.click('[data-bact="leave"]'); }
for (let k = 0; k < 60 && await p.evaluate(() => document.getElementById('btn-end').disabled); k++) await p.waitForTimeout(200);
await p.waitForTimeout(500);
const after = await p.evaluate(() => ({ month: window.__sengoku.state.month, log: window.__sengoku.state.log.slice(-6).map((l) => l.text) }));
console.log(JSON.stringify({ battle, bt, after }, null, 1));
console.log(JSON.stringify({ tab, fleet0, fleet1, escort, panel, targets, busan: await p.evaluate(() => window.__sengoku.state.castles.find((c) => c.id === 'busan').hex), joseon: await p.evaluate(() => window.__sengoku.state.clans.joseon.alive), over: await p.evaluate(() => window.__sengoku.state.over), errors: errors.length ? errors : 'none' }, null, 1));
await b.close();
