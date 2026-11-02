// 城が増えたあとの画面（68城・家臣270人）: 主なタブの長さを測り、恩賞のまとめ操作・家臣団の絞り込み・軍団のまとめ編成を試す
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const out = process.argv[2], mobile = process.argv[3] === 'mobile', sfx = mobile ? '-m' : '';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage(mobile ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1360, height: 820 } });
const errors = [];
p.on('pageerror', (e) => errors.push(e.message));
await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(400);
await p.click('[data-act="t-new"]'); await p.click('[data-act="pick-scen"][data-id="1560"]'); await p.click('[data-act="pick-clan"][data-id="oda"]');
await p.click('[data-act="start"]'); await p.waitForTimeout(300);
for (let k = 0; k < 4; k++) if (await p.$('#modal:not([hidden])')) await p.click('#modal-close').catch(() => {});
// 本州の東半分と近畿をすべて当家に（約70城）。その家の武将も当家に。部隊も
const n = await p.evaluate(() => {
  const s = window.__sengoku.state;
  const take = new Set(['imagawa', 'saito', 'takeda', 'hojo', 'uesugi', 'asakura', 'azai', 'rokkaku', 'miyoshi', 'kitabatake', 'satomi', 'satake', 'utsunomiya', 'yuki', 'chiba', 'ashikaga', 'anegakoji', 'mizuno', 'tokugawa', 'matsudaira', 'hatano', 'tsutsui', 'hatakeyama_k', 'jinbo', 'shiina', 'wakasa_takeda', 'yamana', 'ikko']);
  for (const c of s.castles) if (take.has(c.owner)) c.owner = 'oda';
  for (const g of Object.values(s.generals)) if (take.has(g.clan) && g.status !== 'dead') { g.clan = 'oda'; g.on = 55; }
  for (const a of Object.values(s.armies)) if (take.has(a.clan)) a.clan = 'oda';
  for (const id of take) if (s.clans[id]) s.clans[id].alive = false;
  s.clans.oda.gold = 300000;
  for (const g of Object.values(s.generals)) if (g.clan === 'oda') g.merit += 80;
  return s.castles.filter((c) => c.owner === 'oda').length;
});
await p.evaluate(() => window.__sengoku.view.centerOn(window.__sengoku.state.castles.find((c) => c.id === 'kiyosu').hex, 0.7));
await p.waitForTimeout(300);
await p.screenshot({ path: `${out}/00-map${sfx}.png` });
await p.keyboard.press('Escape'); await p.keyboard.press('n'); await p.waitForTimeout(200); await p.keyboard.press('Escape'); await p.waitForTimeout(200);
await p.screenshot({ path: `${out}/01-side${sfx}.png` });
const side = await p.evaluate(() => { const el = document.querySelector('#side, aside, .side'); return el ? { h: el.scrollHeight, vh: el.clientHeight } : null; });
const shots = [['1', 'shiro'], ['1', 'bugyo'], ['1', 'deleg'], ['2', 'butai'], ['2', 'corps'], ['3', 'vassals'], ['3', 'rewards'], ['3', 'fronts'], ['3', 'gift'], ['4', 'gaike'], ['4', 'bakufu'], ['4', 'court'], ['5', 'gunbuy']];
const res = [];
for (const [key, tab] of shots) {
  await p.keyboard.press(key); await p.waitForTimeout(80);
  const t0 = Date.now();
  await p.click(`[data-act="stab"][data-id="${tab}"]`).catch(() => {});
  await p.waitForTimeout(120);
  const ms = Date.now() - t0;
  const m = await p.evaluate(() => {
    const sh = document.querySelector('#modal .sheet'), body = document.getElementById('modal-body');
    return { h: sh?.scrollHeight ?? 0, vh: sh?.clientHeight ?? 0, rows: body.querySelectorAll('tbody tr').length, selects: body.querySelectorAll('select').length, maxOpts: Math.max(0, ...[...body.querySelectorAll('select')].map((x) => x.options.length)), buttons: body.querySelectorAll('button').length, sw: document.documentElement.scrollWidth };
  });
  res.push({ tab, ms, ...m, screens: +(m.h / Math.max(1, m.vh)).toFixed(1) });
  await p.screenshot({ path: `${out}/${tab}${sfx}.png` });
  await p.click('#modal-close').catch(() => {});
}
// 恩賞のまとめ操作
await p.keyboard.press('3'); await p.click('[data-act="stab"][data-id="rewards"]'); await p.waitForTimeout(100);
const rw0 = await p.evaluate(() => document.querySelectorAll('#modal-body tbody tr').length);
await p.click('[data-act="rw-bulk-kanjo"]'); await p.waitForTimeout(150);
const t1 = await p.evaluate(() => document.getElementById('toast').textContent);
await p.selectOption('#rw-budget', '0.5'); await p.click('[data-act="rw-bulk-kazo"]'); await p.waitForTimeout(150);
const t2 = await p.evaluate(() => document.getElementById('toast').textContent);
const rw1 = await p.evaluate(() => document.querySelectorAll('#modal-body tbody tr').length);
await p.screenshot({ path: `${out}/rewards-after${sfx}.png` });
// 家臣団の絞り込み
await p.click('[data-act="stab"][data-id="vassals"]'); await p.waitForTimeout(100);
await p.click('[data-act="vfilter"][data-id="free"]'); await p.waitForTimeout(100);
const vfree = await p.evaluate(() => document.querySelector('#modal-body .lede').textContent);
await p.fill('[data-vq]', '田'); await p.press('[data-vq]', 'Enter'); await p.waitForTimeout(150);
const vq = await p.evaluate(() => ({ lede: document.querySelector('#modal-body .lede').textContent, rows: document.querySelectorAll('#modal-body tbody tr').length }));
await p.screenshot({ path: `${out}/vassals-filter${sfx}.png` });
await p.click('[data-act="vfilter"][data-id="reset"]'); await p.waitForTimeout(100);
const vrows = await p.evaluate(() => document.querySelectorAll('#modal-body tbody tr').length);
// 軍団のまとめ編成
await p.click('#modal-close'); await p.keyboard.press('2'); await p.click('[data-act="stab"][data-id="corps"]'); await p.waitForTimeout(100);
const c0 = await p.evaluate(() => document.querySelector('#modal-body [data-act="corps-fill-all"]')?.textContent);
if (c0) { await p.click('[data-act="corps-fill-all"]'); await p.waitForTimeout(150); }
const t3 = await p.evaluate(() => document.getElementById('toast').textContent);
await p.click('[data-act="corps-open"] >> nth=0').catch(() => {}); await p.waitForTimeout(100);
await p.screenshot({ path: `${out}/corps-after${sfx}.png` });
const corpsH = await p.evaluate(() => { const sh = document.querySelector('#modal .sheet'); return +(sh.scrollHeight / sh.clientHeight).toFixed(1); });
await p.click('#modal-close');
console.log('OPS', JSON.stringify({ rw0, t1, t2, rw1, vfree, vq, vrows, c0, t3, corpsH }));
// 城と部隊の一覧: 地方を一つ開く・絞り込み
await p.keyboard.press('1'); await p.click('[data-act="stab"][data-id="shiro"]'); await p.waitForTimeout(100);
const regs = await p.evaluate(() => [...document.querySelectorAll('#modal-body details.reg > summary')].map((x) => x.textContent.trim()));
await p.click('#modal-body details.reg > summary >> nth=1'); await p.waitForTimeout(100);
await p.click('[data-act="cast-filter"][data-id="nogov"]').catch(() => {}); await p.waitForTimeout(100);
const castAfter = await p.evaluate(() => ({ open: [...document.querySelectorAll('#modal-body details.reg[open]')].length, rows: document.querySelectorAll('#modal-body tbody tr').length, h: +(document.querySelector('#modal .sheet').scrollHeight / document.querySelector('#modal .sheet').clientHeight).toFixed(1) }));
await p.screenshot({ path: `${out}/castles-reg${sfx}.png` });
await p.click('#modal-close'); await p.keyboard.press('2'); await p.click('[data-act="stab"][data-id="butai"]'); await p.waitForTimeout(100);
const armyRegs = await p.evaluate(() => [...document.querySelectorAll('#modal-body details.reg > summary')].map((x) => x.textContent.trim()).slice(0, 3));
await p.screenshot({ path: `${out}/armies-reg${sfx}.png` });
await p.click('#modal-close');
// 地図の城の札から与える
await p.evaluate(() => { const s = window.__sengoku.state; const c = s.castles.find((x) => x.id === 'odawara'); window.__sengoku.view.centerOn(c.hex, 1.6); });
await p.keyboard.press('1'); await p.click('[data-act="stab"][data-id="shiro"]'); await p.waitForTimeout(100);
await p.click('[data-act="cast-filter"][data-id="direct"]'); await p.waitForTimeout(100);
await p.click('#modal-body details.reg > summary >> nth=0'); await p.waitForTimeout(100);
await p.click('#modal-body details.reg[open] [data-act="goto-castle"] >> nth=1'); await p.waitForTimeout(250);
const cOpt = await p.evaluate(() => { const sel = document.querySelector('#panel select[data-fgrantc]'); return sel ? { n: sel.options.length, groups: sel.querySelectorAll('optgroup').length, ci: sel.dataset.fgrantc, gid: sel.options[1]?.value } : null; });
if (cOpt) { await p.selectOption('#panel select[data-fgrantc]', cOpt.gid); await p.waitForTimeout(200); }
const granted = await p.evaluate((o) => o ? (window.__sengoku.state.fronts ?? []).some((f) => f.castles.includes(+o.ci)) : null, cOpt);
await p.screenshot({ path: `${out}/castle-grant${sfx}.png` });
console.log('GRANT', JSON.stringify({ cOpt, granted }));
console.log('REG', JSON.stringify({ regs, castAfter, armyRegs }));
// 武将の画面（城を与える選択肢の長さ）
await p.keyboard.press('3'); await p.click('[data-act="stab"][data-id="vassals"]'); await p.waitForTimeout(100);
await p.click('#modal-body [data-act="gen"] >> nth=3').catch(() => {}); await p.waitForTimeout(150);
const gen = await p.evaluate(() => { const sh = document.querySelector('#modal .sheet'); return { h: sh.scrollHeight, vh: sh.clientHeight, selects: [...document.querySelectorAll('#modal-body select')].map((x) => `${x.options.length}件/${x.querySelectorAll('optgroup').length}組`) }; });
await p.screenshot({ path: `${out}/general${sfx}.png` });
console.log(JSON.stringify({ castles: n, mobile, res, gen, errors }, null, 0).replace(/\},\{/g, '},\n{'));
await b.close();
