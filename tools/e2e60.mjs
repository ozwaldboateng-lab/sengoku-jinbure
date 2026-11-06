// 陣立て（軍事の操作をメニューにまとめる）: 城を選ぶ・新しい軍団（傘下つき）・主将の交代・傘下を外す・城の画面からの入口
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const out = process.argv[2], mobile = process.argv[3] === 'mobile', sfx = mobile ? '-m' : '';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage(mobile ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1360, height: 820 } });
const errors = [];
p.on('pageerror', (e) => errors.push('pageerror ' + e.message));
await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(400);
await p.click('[data-act="t-new"]'); await p.click('[data-act="pick-scen"][data-id="1560"]'); await p.click('[data-act="pick-clan"][data-id="oda"]');
await p.click('[data-act="start"]'); await p.waitForTimeout(300);
for (let k = 0; k < 4; k++) if (await p.$('#modal:not([hidden])')) await p.click('#modal-close').catch(() => {});
const S = () => p.evaluate(() => { const s = window.__sengoku.state; return { armies: [...Object.values(s.armies), ...Object.values(s.camps ?? {})].filter((a) => a.clan === 'oda').map((a) => ({ id: a.id, main: s.generals[a.main].name, staff: (a.staff ?? []).map((x) => s.generals[x].name), troops: a.troops })) }; });
const res = { before: await S() };
// メニューから陣立てを開く（軍事 → 陣立て）
await p.keyboard.press('2'); await p.waitForTimeout(300);
res.tabs = await p.evaluate(() => [...document.querySelectorAll('#modal-body [data-act="stab"]')].map((x) => x.textContent));
res.castle = await p.evaluate(() => document.querySelector('[data-jin-castle]')?.selectedOptions[0]?.textContent);
await p.screenshot({ path: `${out}/60-jindate${sfx}.png` });
// 新しい軍団: 大将・傘下二人を選んで編成
const form = await p.evaluate(() => {
  const opts = (id) => [...document.querySelectorAll(`#${id} option`)].map((o) => o.value).filter(Boolean);
  const mains = opts('jin-main'); if (!mains.length) return { ok: false, why: document.querySelector('.jin-form')?.textContent?.slice(0, 120) };
  const s = window.__sengoku.state;
  // 大将は侍大将以上、傘下はその一つ下の身分から
  const lvl = (g) => (s.clans[g.clan]?.leader === g.id ? 0 : g.kin ? Math.min(g.rank, 1) : g.rank);
  const main = mains.find((x) => lvl(s.generals[x]) <= 1);
  const subs = mains.filter((x) => x !== main && lvl(s.generals[x]) === lvl(s.generals[main]) + 1).slice(0, 2);
  document.getElementById('jin-main').value = main;
  if (subs[0]) document.getElementById('jin-sub1').value = subs[0];
  if (subs[1]) document.getElementById('jin-sub2').value = subs[1];
  return { ok: true, main: s.generals[main].name, subs: subs.map((x) => s.generals[x].name) };
});
res.form = form;
if (form.ok) { await p.click('[data-act="jin-form"]'); await p.waitForTimeout(300); }
res.afterForm = await S();
await p.screenshot({ path: `${out}/60-formed${sfx}.png` });
// 主将の交代: 新しい軍団の主将を傘下の一人と替える
const newA = res.afterForm.armies.find((a) => !res.before.armies.some((x) => x.id === a.id));
res.newArmy = newA;
if (newA && !newA.staff.length) {
  // 傘下がいなければ、身分を合わせた待機の武将を一人作って、空き枠の欄から配属する
  await p.evaluate((aid) => { const s = window.__sengoku.state; const a = s.armies[aid] ?? s.camps[aid]; const m = s.generals[a.main]; const lv = s.clans[m.clan]?.leader === m.id ? 0 : m.kin ? Math.min(m.rank, 1) : m.rank; const g = Object.values(s.generals).find((x) => x.clan === 'oda' && x.status === 'free' && !x.kin && !x.liege && s.clans.oda.leader !== x.id); g.rank = lv + 1; }, newA.id);
  await p.keyboard.press('2'); await p.waitForTimeout(300);
  await p.evaluate((aid) => { const sel = document.querySelector(`select[data-corps^="${aid}:"]`); sel.value = [...sel.options].map((o) => o.value).find(Boolean); sel.dispatchEvent(new Event('change', { bubbles: true })); }, newA.id);
  await p.waitForTimeout(300);
  newA.staff = (await S()).armies.find((a) => a.id === newA.id).staff;
}
if (newA && newA.staff.length) {
  await p.evaluate((aid) => { const sel = document.querySelector(`select[data-jinmain="${aid}"]`); const o = [...sel.options].find((x) => x.parentElement.label === '傘下から'); sel.value = o.value; sel.dispatchEvent(new Event('change', { bubbles: true })); }, newA.id);
  await p.waitForTimeout(300);
  res.afterSwap = (await S()).armies.find((a) => a.id === newA.id);
  // 傘下を外す
  const btn = await p.$(`[data-act="jin-out"][data-id^="${newA.id}:"]`);
  if (btn) { await btn.click(); await p.waitForTimeout(300); }
  res.afterOut = (await S()).armies.find((a) => a.id === newA.id);
}
// 城の画面からの入口
await p.click('#modal-close').catch(() => {});
await p.evaluate(() => { const s = window.__sengoku.state; const c = s.castles.find((x) => x.owner === 'oda'); window.__sengoku.view.selectCastle?.(c.i); });
res.errors = errors;
console.log(JSON.stringify(res, null, 1));
const ok = res.tabs?.[0] === '陣立て' && form.ok && newA && newA.staff.length >= 1 && res.afterSwap && res.afterSwap.main !== newA.main && res.afterOut && res.afterOut.staff.length < res.afterSwap.staff.length + 1 && !errors.length;
console.log(ok ? 'OK' : 'NG');
await b.close();
