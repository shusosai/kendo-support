import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

// CSPのハッシュはタグを含まない内容のみを対象にする。
// check-site.shのSCRIPT_SHA（タグと末尾改行を含む）とは異なる。
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)];
const styles = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi)];
assert.equal(scripts.length, 1, 'CSP expects one inline script');
assert.equal(styles.length, 1, 'CSP expects one inline style block');
const hash = text => createHash('sha256').update(text).digest('base64');
const expected = [
  "default-src 'none'",
  "base-uri 'none'",
  "object-src 'none'",
  "form-action 'none'",
  "frame-src 'none'",
  "img-src 'self'",
  `style-src 'sha256-${hash(styles[0][1])}'`,
  "style-src-attr 'none'",
  `script-src 'sha256-${hash(scripts[0][1])}'`,
  "script-src-attr 'none'",
  'connect-src https://kendo-support-counter.shusosai.workers.dev',
].join('; ');

// 表示のみ。HTMLや承認済みのJavaScriptを自動で変更しない。
if (process.argv.includes('--print')) {
  console.log(`<meta http-equiv="Content-Security-Policy" content="${expected}">`);
} else {
  const metas = [...html.matchAll(/<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]*)"\s*>/gi)];
  assert.equal(metas.length, 1, 'Expected exactly one CSP meta element');
  assert.equal(metas[0][1], expected,
    'CSP differs from the approved resource policy or current inline content. Review the change, then inspect: node tools/check-csp.mjs --print');
  assert.ok(metas[0].index < styles[0].index && metas[0].index < scripts[0].index,
    'CSP must precede styles and scripts');
  assert.ok(!/\sstyle\s*=|\son[a-z]+\s*=/i.test(html), 'Inline style/event attributes are not permitted');
  console.log('OK: CSP hashes and resource restrictions match');
}
