// ビルド: src/main.ts を1ファイルのHTMLにまとめる
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const res = await build({ entryPoints: ['src/main.ts'], bundle: true, minify: true, format: 'iife', target: 'es2020', write: false, legalComments: 'none' });
const js = res.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const css = readFileSync('src/ui/style.css', 'utf8');
const shell = readFileSync('src/ui/shell.html', 'utf8');
const fonts = 'https://fonts.googleapis.com/css2?family=Shippori+Mincho+B1:wght@400;600;700&family=Yuji+Syuku&family=Zen+Kaku+Gothic+New:wght@400;500&display=swap';
const fragment = `<title>陣触 ― 戦国群雄記</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${fonts}">
<style>${css}</style>
${shell}
<script>${js}</script>
`;
mkdirSync('dist', { recursive: true });
writeFileSync('dist/sengoku1560.html', fragment);
writeFileSync('dist/index.html', `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"></head><body>${fragment}</body></html>`);
console.log('built', (fragment.length / 1024).toFixed(0) + 'KB');
