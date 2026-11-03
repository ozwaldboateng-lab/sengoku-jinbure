// 大きな出来事の場面: 家督相続（当主の死）・降伏（降伏勧告が通る）・謀反（城持ちの領）・滅亡（最後の城を落とす）
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const out = process.argv[2], mobile = process.argv[3] === 'mobile', sfx = mobile ? '-m' : '';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage(mobile ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1360, height: 820 } });
const errors = [];
p.on('pageerror', (e) => errors.push('pageerror ' + e.message));
await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.evaluate(() => localStorage.setItem('sengoku-events', 'on')); await p.reload(); await p.waitForTimeout(400);
await p.click('[data-act="t-new"]'); await p.click('[data-act="pick-scen"][data-id="1560"]'); await p.click('[data-act="pick-clan"][data-id="oda"]');
await p.click('[data-act="start"]'); await p.waitForTimeout(300);
for (let k = 0; k < 4; k++) if (await p.$('#modal:not([hidden])')) await p.click('#modal-close').catch(() => {});
const walk = async (tag) => {
  const done = p.evaluate(() => window.__sengoku.playEvents());
  await p.waitForTimeout(500);
  const beats = [];
  for (let k = 0; k < 30; k++) {
    const st = await p.evaluate(() => { const el = document.getElementById('scene'); if (!el || el.hidden) return null; const box = el.querySelector('.op-box'); return `${document.querySelector('#scene .op-scen')?.textContent}｜${box.querySelector('h2')?.textContent ?? box.querySelector('.op-name')?.textContent ?? ''}｜${(box.querySelector('.op-line, .op-narr p')?.textContent ?? '').slice(0, 60)}`; });
    if (!st) break;
    beats.push(st);
    if (k === 1 || (tag === 'more' && k === 8) || (tag === 'honor' && k === 20)) { await p.waitForTimeout(800); await p.screenshot({ path: `${out}/57-${tag}${k}${sfx}.png` }); }
    await p.click('#scene .op-box'); await p.waitForTimeout(220);
  }
  await done;
  return beats;
};
const res = {};
// 家督相続: 当主に遺言と跡継ぎを定めてから討ち死に
await p.evaluate(() => { const s = window.__sengoku.state; s.clans.oda.will = 'tenka'; s.clans.oda.heir = 'oda_nobutada' in s.generals && s.generals.oda_nobutada.status !== 'young' ? 'oda_nobutada' : undefined; window.__sengoku.kill(s.clans.oda.leader); });
res.katoku = await walk('katoku');
// 降伏: 斎藤家が降る
await p.evaluate(() => window.__sengoku.surrender('saito'));
res.surrender = await walk('surrender');
// 謀反: 降った斎藤の領が謀反
await p.evaluate(() => { const s = window.__sengoku.state; const f = s.fronts[0]; if (f) window.__sengoku.rebel(f.id); });
res.rebel = await walk('rebel');
// 滅亡: 今川の城をすべて当家のものにし、最後の一つを攻め落としたことにする（城を落とす処理を通す）
const ruin = await p.evaluate(async () => { const s = window.__sengoku.state; const cs = s.castles.filter((c) => c.owner === 'imagawa'); for (const c of cs.slice(1)) c.owner = 'oda'; return cs[0]?.id; });
await p.evaluate((id) => window.__sengoku.capture?.(id), ruin);
res.ruin = await walk('ruin');
// 一揆・同盟・婚姻・南蛮船・宣教師（出来事を積んで流す）
const port = await p.evaluate(() => { const s = window.__sengoku.state; const c = s.castles.find((x) => x.id === 'hirado'); return c.id; });
await p.evaluate((port) => { const s = window.__sengoku.state; const kiyosu = s.castles.find((c) => c.owner === 'oda'); s.events = [{ kind: 'ikki', castle: kiyosu.id, troops: 3200, clan: 'honganji' }, { kind: 'treaty', treaty: 'alliance', other: 'takeda' }, { kind: 'treaty', treaty: 'marriage', other: 'azai' }, { kind: 'ship', port }, { kind: 'mission', mis: 'vilela' }]; }, port);
res.more = await walk('more');
// 任官（参議・関白・将軍）・将軍擁立・天守
await p.evaluate(() => { const s = window.__sengoku.state; const k = s.castles.find((c) => c.owner === 'oda'); s.events = [{ kind: 'kan', rank: 4 }, { kind: 'kan', rank: 7 }, { kind: 'kan', rank: 8 }, { kind: 'sponsor', gen: 'ashikaga_yoshiaki' in s.generals ? 'ashikaga_yoshiaki' : 'ashikaga_yoshiteru' }, { kind: 'tenshu', castle: k.id }]; });
res.honor = await walk('honor');
const sw = await p.evaluate(() => document.documentElement.scrollWidth);
console.log(JSON.stringify({ res, leader: await p.evaluate(() => window.__sengoku.state.generals[window.__sengoku.state.clans.oda.leader].name), sw, errors: errors.length ? errors : 'none' }, null, 1));
await b.close();
