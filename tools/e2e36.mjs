// 兵站（第一段）: 補給の地図表示、部隊の補給の札（補給下・遠征・補給切れ・兵糧尽き）、城の蔵と飛び地、兵站奉行、包囲された城の蔵、月末の兵糧
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
await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(500);
await p.click('[data-act="t-new"]'); await p.click('[data-act="pick-scen"][data-id="1560"]'); await p.click('[data-act="pick-clan"][data-id="oda"]');
await p.click('[data-act="start"]'); await p.waitForTimeout(300);
const closeAll = async () => { for (let k = 0; k < 6 && await p.$('#modal:not([hidden])'); k++) await p.click('#modal-close').catch(() => {}); };
await closeAll();
const res = {};
// 補給の地図
await p.click('#mapmode [data-mode="supply"]'); await p.waitForTimeout(150);
res.legend = await p.evaluate(() => document.getElementById('legend').textContent.replace(/\s+/g, ' ').trim());
await p.screenshot({ path: `${out}/360-supply-map${sfx}.png` });
// 部隊の札: 自領 → 敵地の奥（遠征）→ 補給切れ → 兵糧尽き
const pill = async () => p.evaluate(() => [...document.querySelectorAll('#panel .pill')].map((x) => x.textContent).filter((x) => /補給|兵糧/.test(x)).join(' '));
const a0 = await p.evaluate(() => { const s = window.__sengoku.state; return Object.values(s.armies).find((a) => a.clan === 'oda').id; });
await p.evaluate((id) => { const s = window.__sengoku.state; window.__sengoku.view.onHexClick(s.armies[id].hex); }, a0); await p.waitForTimeout(100);
res.home = await pill();
// 駿府の隣の今川領（清洲から遠い）へ置く
// 自領の外（隣の斎藤領）→ 遠征。駿府の隣（遠い今川領）→ 補給切れ
const sel = async (id) => { await p.keyboard.press('Escape'); await p.evaluate((id) => { const s = window.__sengoku.state; window.__sengoku.view.onHexClick(s.armies[id].hex); }, id); await p.waitForTimeout(100); };
const spot = await p.evaluate(() => { const s = window.__sengoku.state, X = window.__sengoku; const occ = new Set(Object.values(s.armies).map((a) => a.hex)); const own = (h) => { const c = s.castles[window.__sengoku.state.castles.findIndex(() => false)]; return null; };
  const ina = s.castles.find((c) => c.id === 'inabayama').hex; const sun = s.castles.find((c) => c.id === 'sunpu').hex;
  return { near: X.neighbors(ina).find((h) => !occ.has(h)), far: X.neighbors(sun).find((h) => !occ.has(h)) }; });
await p.evaluate(([id, h]) => { window.__sengoku.state.armies[id].hex = h; }, [a0, spot.near]); await sel(a0);
res.near = { pill: await pill(), sup: await p.evaluate((id) => window.__sengoku.supply(id), a0) };
await p.evaluate(([id, h]) => { window.__sengoku.state.armies[id].hex = h; }, [a0, spot.far]); await sel(a0);
res.far = { pill: await pill(), sup: await p.evaluate((id) => window.__sengoku.supply(id), a0) };
await p.evaluate((id) => { window.__sengoku.state.armies[id].food = 0.4; }, a0); await sel(a0);
res.low = await pill();
await p.evaluate((id) => { window.__sengoku.state.armies[id].food = 0; }, a0); await sel(a0);
res.empty = await pill();
await p.screenshot({ path: `${out}/361-army-starve${sfx}.png` });
// 城の画面: 城の蔵
await p.evaluate(() => { const s = window.__sengoku.state; window.__sengoku.view.onHexClick(s.castles.find((c) => c.id === 'kiyosu').hex); }); await p.waitForTimeout(100);
res.store = await p.evaluate(() => [...document.querySelectorAll('#panel dt')].find((d) => d.textContent === '城の蔵')?.nextElementSibling.textContent ?? null);
// 奉行の画面: 兵站
await p.keyboard.press('Escape'); await p.keyboard.press('1'); await p.waitForTimeout(100);
await p.click('[data-act="stab"][data-id="bugyo"]'); await p.waitForTimeout(100);
res.bugyoLine = await p.evaluate(() => (document.querySelector('#modal .hint')?.textContent.match(/兵站[^。]*/) ?? [null])[0]);
const role0 = await p.evaluate(() => document.querySelector('#modal [data-act="bugyo-role"]')?.textContent ?? null);
for (let k = 0; k < 2; k++) { const btn = await p.$('#modal [data-act="bugyo-role"]'); if (btn) { await btn.click(); await p.waitForTimeout(100); } }
res.role = [role0, await p.evaluate(() => document.querySelector('#modal [data-act="bugyo-role"]')?.textContent ?? null), await p.evaluate(() => (document.querySelector('#modal .hint')?.textContent.match(/兵站[^。]*/) ?? [null])[0])];
await closeAll();
// 飛び地: 駿府を織田のものにする（間は今川領）
await p.evaluate(() => { const s = window.__sengoku.state; const c = s.castles.find((x) => x.id === 'sunpu'); c.owner = 'oda'; for (const a of Object.values(s.armies)) if (a.hex === c.hex) a.hex = window.__sengoku.neighbors(c.hex).find((h) => !Object.values(s.armies).some((b) => b.hex === h)); });
await p.keyboard.press('Escape'); await p.evaluate(() => { const s = window.__sengoku.state; window.__sengoku.view.onHexClick(s.castles.find((c) => c.id === 'sunpu').hex); }); await p.waitForTimeout(100);
res.enclave = await p.evaluate(() => [...document.querySelectorAll('#panel .pill')].map((x) => x.textContent).filter((x) => /飛び地/.test(x)).join(' '));
await p.screenshot({ path: `${out}/362-enclave${sfx}.png` });
// 兵糧攻め: 大垣城（斎藤）を織田の2部隊で囲み、蔵を少なくする
const siege = await p.evaluate(() => {
  const s = window.__sengoku.state, X = window.__sengoku; const c = s.castles.find((x) => x.id === 'ogaki');
  const occ = new Set(Object.values(s.armies).map((a) => a.hex));
  const spots = X.neighbors(c.hex).filter((h) => !occ.has(h)).slice(0, 2);
  const mine = Object.values(s.armies).filter((a) => a.clan === 'oda').slice(1, 3);
  mine.forEach((a, k) => { a.hex = spots[k]; a.acted = true; });
  c.store = Math.round(c.garrison * 0.5);
  return { id: c.i, garrison: c.garrison, store: c.store, n: spots.length };
});
res.siege0 = siege;
// 月を進める: 補給切れの部隊は小荷駄が減り、囲まれた城は蔵が減る
await p.evaluate((id) => {
  const s = window.__sengoku.state; const a = s.armies[id]; a.food = 1;
  const iw = s.castles.find((c) => c.owner === 'saito' && c.id === 'inabayama'); // 敵の城を囲む
  const nb = window.__sengoku.state && null;
}, a0);
const before = await p.evaluate((id) => { const s = window.__sengoku.state; return { food: s.armies[id]?.food, clanFood: s.clans.oda.food }; }, a0);
await p.click('#btn-end');
for (let k = 0; k < 300; k++) {
  await p.waitForTimeout(80);
  if (await p.evaluate(() => !document.getElementById('battle').hidden)) { if (await p.$('[data-bact="leave"]')) await p.click('[data-bact="leave"]'); else await p.click('#bt-auto').catch(() => {}); continue; }
  const no = await p.$('#modal:not([hidden]) [data-act="ask-no"]'); if (no) { await no.click(); continue; }
  if (await p.evaluate(() => !document.getElementById('btn-end').disabled)) break;
}
res.after = await p.evaluate((id) => { const s = window.__sengoku.state; const a = s.armies[id]; return { food: a?.food, hex: a?.hex, clanFood: s.clans.oda.food, log: s.log.filter((l) => /補給|兵糧/.test(l.text)).slice(-3).map((l) => l.text) }; }, a0);
res.before = before;
res.siege1 = await p.evaluate((i) => { const c = window.__sengoku.state.castles[i]; return { owner: c.owner, garrison: c.garrison, store: c.store, gMorale: c.gMorale }; }, siege.id);
const sw = await p.evaluate(() => document.documentElement.scrollWidth);
console.log(JSON.stringify({ mobile, ...res, sw, errors: errors.length ? errors : 'none' }, null, 1));
await b.close();
