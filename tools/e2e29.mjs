// 画面の整理（第二段）: 地図の表示切り替え（勢力・名分・治安・残り火・方面・守護）と凡例、Mキー、攻め先の名分の色
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const out = process.argv[2];
const mobile = process.argv[3] === 'mobile';
const sfx = mobile ? '-m' : '';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: mobile ? { width: 390, height: 844 } : { width: 1360, height: 820 } });
const errors = [];
p.on('pageerror', (e) => errors.push('pageerror ' + e.message));
p.on('console', (m) => { if (m.type() === 'error') errors.push('console ' + m.text()); });
await p.goto('file://' + process.cwd() + '/dist/index.html');
await p.waitForTimeout(400);
await p.click('[data-act="t-new"]'); await p.click('[data-act="pick-scen"][data-id="1560"]'); await p.click('[data-act="pick-clan"][data-id="oda"]');
await p.click('[data-act="start"]'); await p.waitForTimeout(300);
for (let k = 0; k < 4; k++) if (await p.$('#modal:not([hidden])')) await p.click('#modal-close').catch(() => {});
await p.evaluate(() => { const s = window.__sengoku.state; const c = s.castles.find((x) => x.owner === 'oda' && x.id !== 'kiyosu') ?? s.castles[0]; c.ember = 55; s.castles.find((x) => x.owner === 'imagawa').ember = 30; window.__sengoku.view.zoomBy(0.6); });
const res = {};
for (const m of ['power', 'meibun', 'chian', 'ember', 'front', 'shugo']) {
  await p.click(`#mapmode [data-mode="${m}"]`); await p.waitForTimeout(150);
  res[m] = await p.evaluate(() => ({ mode: window.__sengoku.view.mode, pressed: document.querySelector('#mapmode [aria-pressed="true"]')?.textContent, legend: document.getElementById('legend').textContent.replace(/\s+/g, ' ').trim().slice(0, 80), legendShown: getComputedStyle(document.getElementById('legend')).display !== 'none' }));
  await p.screenshot({ path: `${out}/290-map-${m}${sfx}.png` });
}
await p.keyboard.press('m'); await p.waitForTimeout(80);
const afterM = await p.evaluate(() => window.__sengoku.view.mode);
// 攻め先: 自軍を今川の城の隣へ
await p.click('#mapmode [data-mode="power"]');
const tg = await p.evaluate(() => {
  const s = window.__sengoku.state, v = window.__sengoku.view;
  const a = Object.values(s.armies).find((x) => x.clan === 'oda');
  return { army: a?.id, hex: a?.hex };
});
await p.evaluate((id) => { const s = window.__sengoku.state; const a = s.armies[id]; window.__sengoku.view.centerOn(a.hex, 2.2); }, tg.army);
await p.waitForTimeout(150);
// 隣に今川の部隊を置いて、名分なしの攻め先を出す
const tgs = await p.evaluate((id) => {
  const s = window.__sengoku.state, v = window.__sengoku.view; const a = s.armies[id];
  const en = Object.values(s.armies).find((x) => x.clan === 'imagawa');
  const nb = window.__sengoku.state && [...Array(6)].length; // dummy
  v.onHexClick(a.hex);
  return v.sel.targets.map((t) => t.kind);
}, tg.army);
await p.waitForTimeout(200);
await p.screenshot({ path: `${out}/291-targets${sfx}.png` }); await p.waitForTimeout(180); await p.screenshot({ path: `${out}/291b-targets${sfx}.png` });
const tgInfo = await p.evaluate(() => { const v = window.__sengoku.view, s = v.state; return v.sel.targets.map((t) => [t.hex, t.kind === "army" ? s.generals[t.army.main].name : ""]); });
// 狭い画面の表（カード）と下の帯
const cards = {};
for (const [key, tab] of [['3', 'vassals'], ['4', 'gaike'], ['1', 'shiro']]) {
  await p.keyboard.press('Escape'); await p.keyboard.press(key); await p.waitForTimeout(120);
  await p.click(`[data-act="stab"][data-id="${tab}"]`).catch(() => {}); await p.waitForTimeout(120);
  cards[tab] = await p.evaluate(() => { const t = document.querySelector('#modal table.cardable'); const tr = t?.querySelector('tbody tr'); return t ? { display: getComputedStyle(tr).display, labels: [...tr.children].map((c) => c.dataset.l ?? (c.classList.contains('acts') ? '[acts]' : '')).slice(0, 6) } : null; });
  await p.screenshot({ path: `${out}/292-cards-${tab}${sfx}.png` });
}
await p.keyboard.press('Escape');
for (let k = 0; k < 4; k++) if (await p.$('#modal:not([hidden])')) await p.click('#modal-close').catch(() => {});
const bar = await p.evaluate(() => { const r = document.querySelector('.bar .cmds').getBoundingClientRect(); return { pos: getComputedStyle(document.querySelector('.bar .cmds')).position, bottom: Math.round(r.bottom), h: Math.round(r.height) }; });
await p.screenshot({ path: `${out}/293-main${sfx}.png`, fullPage: false });
await p.keyboard.press('6'); await p.waitForTimeout(100); await p.click('[data-act="stab"][data-id="help"]'); await p.waitForTimeout(100);
const help = await p.evaluate(() => ({ gloss: document.querySelectorAll('#modal .glossary dt').length, keys: document.querySelectorAll('#modal .keys dt').length, items: document.querySelectorAll('#modal .helplist li').length }));
await p.screenshot({ path: `${out}/294-help${sfx}.png` });
await p.keyboard.press('Escape');
const scrollW = await p.evaluate(() => document.documentElement.scrollWidth);
console.log(JSON.stringify({ res, afterM, tgs, tgInfo, cards, bar, help, scrollW, errors }, null, 1));
await b.close();
