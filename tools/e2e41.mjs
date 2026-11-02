// 唐入り（第四段）: 海戦の札（李舜臣が現れたときに応じ方を選ぶ）。もとは e2e40 の始め方: 幕間から「唐入りを始める」→ 唐入りの札、対馬の軍勢が釜山を攻められる、造船、水軍の将
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
  if (await p.$('[data-act="il-start"]')) break;
  if (await p.$('[data-act="il-next"]')) await p.click('[data-act="il-next"]');
  else if (await p.$('[data-act="il-choose"][data-id="now"]')) await p.click('[data-act="il-choose"][data-id="now"]');
  else if (await p.$('[data-act="il-choose"]')) await p.click('[data-act="il-choose"] >> nth=0');
  await p.waitForTimeout(80);
}
await p.waitForTimeout(200);
await p.click('[data-act="il-start"]'); await p.waitForTimeout(400);

await p.click('#modal-close').catch(() => {});
// 水軍の将を置き、釜山に軍勢を置いて月を送る（李舜臣が現れれば海戦の札）
await p.evaluate(() => { const s = window.__sengoku.state; const b = s.castles.find((c) => c.id === 'busan'); b.owner = s.player; const a = Object.values(s.armies).filter((x) => x.clan === s.player)[0]; a.hex = b.hex; a.troops = 20000; a.abroad = true; for (const y of Object.values(s.armies)) if (y.clan === 'joseon') delete s.armies[y.id]; const free = Object.values(s.generals).filter((g) => g.clan === s.player && g.status === 'free' && g.id !== s.clans[s.player].leader).sort((x, y) => (y.lea + y.int) - (x.lea + x.int)); s.karairi.escort = free.slice(0, 3).map((g) => g.id); });
let naval = null, picked = null;
for (let m = 0; m < 14 && !naval; m++) {
  { if (await p.$('#interlude:not([hidden]) [data-act="il-close"]')) { await p.click('#interlude [data-act="il-close"]'); await p.waitForTimeout(150); } } await p.click('#btn-end');
  for (let k = 0; k < 80; k++) {
    if (await p.$('[data-act="naval"]')) { naval = await p.evaluate(() => ({ title: document.getElementById('modal-title').textContent, opts: [...document.querySelectorAll('[data-act="naval"] b')].map((b) => b.textContent), quote: document.querySelector('#modal-body .quote .qname')?.textContent })); await p.screenshot({ path: `${out}/450-naval${mobile ? '-m' : ''}.png`, fullPage: mobile }); picked = 'fight'; await p.click('[data-act="naval"][data-id="fight"]'); break; }
    if (await p.evaluate(() => !document.getElementById('battle').hidden)) { await p.click('#bt-auto').catch(() => {}); await p.waitForTimeout(800); if (await p.$('[data-bact="leave"]')) await p.click('[data-bact="leave"]'); }
    if (!(await p.evaluate(() => document.getElementById('btn-end').disabled))) break;
    await p.waitForTimeout(150);
  }
  for (let k = 0; k < 80 && await p.evaluate(() => document.getElementById('btn-end').disabled); k++) { if (await p.$('[data-act="naval"]')) await p.click('[data-act="naval"][data-id="convoy"]'); await p.waitForTimeout(150); }
  for (let k = 0; k < 6; k++) { if (await p.$('#interlude:not([hidden]) [data-act="il-close"]')) { await p.click('#interlude [data-act="il-close"]'); await p.waitForTimeout(100); continue; } if (await p.$('#cutin:not([hidden])')) { await p.click('#cutin'); await p.waitForTimeout(100); continue; } if (await p.$('#modal:not([hidden])')) { await p.click('#modal-close').catch(() => {}); await p.waitForTimeout(100); continue; } break; }
}
const res = await p.evaluate(() => ({ raid: window.__sengoku.state.karairi.raid, log: window.__sengoku.state.log.filter((l) => /李舜臣/.test(l.text)).slice(-2).map((l) => l.text) }));
console.log(JSON.stringify({ naval, picked, res, errors: errors.length ? errors : 'none' }, null, 1));
await b.close();
