// 知行: 城を与える・陪臣を付ける・方針・領の部隊は手で動かせない・評定終了で領主が動かす・領の蔵と上納・領主の死と後継ぎ・直参に引き上げ・召し上げ
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
const st = () => p.evaluate(() => {
  const s = window.__sengoku.state;
  return {
    fronts: (s.fronts ?? []).map((f) => ({ ...f, leaderName: s.generals[f.leader]?.name })),
    gold: Math.round(s.clans.oda.gold), food: Math.round(s.clans.oda.food),
    liege: Object.values(s.generals).filter((g) => g.liege).map((g) => g.name + '→' + s.generals[g.liege]?.name),
    armies: Object.values(s.armies).filter((a) => a.clan === 'oda').map((a) => ({ id: a.id, main: s.generals[a.main].name, front: a.front ?? null, hex: a.hex })),
  };
});
const openFief = async () => { await p.keyboard.press('3'); await p.click('[data-act="stab"][data-id="fronts"]'); await p.waitForTimeout(150); };
await openFief();
// 宿老（最初の候補）に、当主の居城でない城を与える
const pick = await p.evaluate(() => {
  const s = window.__sengoku.state, L = s.generals[s.clans.oda.leader];
  const sel = document.getElementById('sel-fief-gen'); const gid = sel?.options[0]?.value;
  const c = s.castles.filter((x) => x.owner === 'oda' && x.i !== L.loc).sort((a, b) => b.baseKoku - a.baseKoku)[0];
  return { gid, ci: String(c.i), on: Math.round(s.generals[gid].on ?? 0), name: s.generals[gid].name, rank: s.generals[gid].rank };
});
await p.selectOption('#sel-fief-castle', pick.ci); await p.click('[data-act="fief-grant"]'); await p.waitForTimeout(200);
const made = await st();
const onAfter = await p.evaluate((id) => Math.round(window.__sengoku.state.generals[id].on), pick.gid);
// 陪臣を一人付け、方針を攻略に
const bai = await p.$eval('select[data-fbai]', (s) => s.options[1]?.value ?? '').catch(() => '');
if (bai) { await p.selectOption('select[data-fbai]', bai); await p.waitForTimeout(150); }
await p.selectOption('select[data-fpol]', 'attack'); await p.waitForTimeout(150);
await p.screenshot({ path: `${out}/220-fief${sfx}.png`, fullPage: true });
const set = await st();
// 陪臣は恩賞の一覧に出ない・城主の替えの候補にも出ない
await p.click('[data-act="stab"][data-id="rewards"]'); await p.waitForTimeout(100);
const bName = set.liege[0]?.split('→')[0];
const inRewards = bName ? await p.evaluate((n) => document.getElementById('modal-body').textContent.includes(n), bName) : false;
// 評定終了: 領の蔵に入り、当家には上納だけ入る
await p.click('#modal-close');
const goldBefore = set.gold;
await p.keyboard.press('e');
await p.waitForFunction(() => window.__sengoku.state.turn >= 2, null, { timeout: 90000 });
await p.waitForTimeout(400);
for (let k = 0; k < 3; k++) if (await p.$('#modal:not([hidden])')) await p.click('#modal-close').catch(() => {});
const after = await st();
const fiefGold = after.fronts[0]?.gold;
// 領主が亡くなる → 後継ぎ待ち → 要件から後継ぎを選ぶ
await p.evaluate((id) => { const s = window.__sengoku.state, g = s.generals[id]; for (const c of s.castles) if (c.governor === id) c.governor = null; if (g.army !== null && s.armies[g.army]) { const a = s.armies[g.army]; a.main = a.staff?.[0] ?? a.main; } g.status = 'dead'; g.army = null; }, pick.gid);
await p.keyboard.press('e');
await p.waitForFunction(() => window.__sengoku.state.turn >= 3, null, { timeout: 90000 });
await p.waitForTimeout(400);
const vacant = await p.evaluate(() => (window.__sengoku.state.fronts ?? []).map((f) => !!f.vacant));
const todo = await p.evaluate(() => !!document.querySelector('#modal:not([hidden]) [data-act="fief-heir"]'));
await p.screenshot({ path: `${out}/221-heir${sfx}.png`, fullPage: mobile });
if (!todo) { await p.click('#modal-close').catch(() => {}); await openFief(); }
const heirOpts = await p.$$eval('[id^="sel-heir-"] option', (os) => os.map((o) => o.textContent)).catch(() => []);
await p.click('[data-act="fief-heir"]').catch(() => {}); await p.waitForTimeout(200);
const heired = await st();
// 直参に引き上げ・召し上げ
await p.click('#modal-close').catch(() => {}); await openFief();
const dbtn = await p.$('[data-act="fief-direct"]');
if (dbtn) { await dbtn.click(); await p.waitForTimeout(150); }
const lifted = await st();
await p.click('[data-act="front-off"]').catch(() => {}); await p.waitForTimeout(150);
const removed = await st();
const sw = await p.evaluate(() => document.documentElement.scrollWidth);
console.log(JSON.stringify({
  mobile, granted: made.fronts.map((f) => `${f.leaderName} 城${f.castles.length} 居城${f.seat}`), on: `${pick.on}→${onAfter}`,
  liege: set.liege, policy: set.fronts[0]?.policy, inRewards,
  month1: { clanGold: `${goldBefore}→${after.gold}`, fiefGold, fiefArmies: after.armies.filter((a) => a.front).map((a) => a.main) },
  vacant, todo, heirOpts: heirOpts.slice(0, 3), heir: heired.fronts.map((f) => `${f.leaderName} vacant=${!!f.vacant}`), liegeAfterHeir: heired.liege,
  lifted: lifted.liege, removed: removed.fronts.length, sw, errors: errors.length ? errors : 'none',
}, null, 1));
await b.close();
