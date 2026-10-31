// 天正十年（1582）本能寺の変: 時代の札、明智・羽柴で始める、名分（主殺しの仇）、将軍の空位、亡い者が出ない
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const out = process.argv[2];
const mobile = process.argv[3] === 'mobile';
const sfx = mobile ? '-m' : '';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const res = {};
const errors = [];
for (const clan of ['hashiba', 'akechi']) {
  const p = await b.newPage({ viewport: mobile ? { width: 390, height: 844 } : { width: 1360, height: 820 } });
  p.on('pageerror', (e) => errors.push('pageerror ' + e.message));
  await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(500);
  await p.click('[data-act="t-new"]'); await p.waitForTimeout(100);
  res.eras = await p.evaluate(() => [...document.querySelectorAll('.era-card .era-n')].map((x) => x.textContent));
  if (clan === 'hashiba') await p.screenshot({ path: `${out}/340-era3${sfx}.png` });
  await p.click('[data-act="pick-scen"][data-id="1582"]'); await p.waitForTimeout(300);
  await p.click(`[data-act="pick-clan"][data-id="${clan}"]`); await p.waitForTimeout(200);
  res[clan + 'Pick'] = await p.evaluate(() => ({ name: document.getElementById('ttl-clan').textContent, blurb: document.querySelector('.ttl-blurb').textContent, feat: document.querySelectorAll('.ttl-feat .clan-card').length }));
  await p.screenshot({ path: `${out}/341-pick-${clan}${sfx}.png` });
  await p.click('[data-act="start"]'); await p.waitForTimeout(400);
  for (let k = 0; k < 4; k++) if (await p.$('#modal:not([hidden])')) await p.click('#modal-close').catch(() => {});
  res[clan] = await p.evaluate(() => {
    const s = window.__sengoku.state;
    return { date: document.getElementById('date').textContent, leader: s.generals[s.clans[s.player].leader].name, nobunaga: s.generals.oda_nobunaga.status, shingen: s.generals.takeda_shingen.status, shogun: Object.values(s.clans).some((c) => c.alive && c.court === 8), yoshiaki: s.generals.ashikaga_yoshiaki.clan, foesAkechi: Object.keys(s.bakufu.foes).filter((k) => k.endsWith('|akechi')).length };
  });
  await p.screenshot({ path: `${out}/342-start-${clan}${sfx}.png` });
  if (clan === 'hashiba') {
    await p.keyboard.press('4'); await p.waitForTimeout(150);
    res.dipRows = await p.evaluate(() => document.querySelectorAll('#modal tbody tr').length);
    await p.keyboard.press('Escape');
  }
  await p.close();
}
console.log(JSON.stringify({ mobile, ...res, errors: errors.length ? errors : 'none' }, null, 1));
await b.close();
