import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

// Node標準機能だけで実行。本番Worker・KVへの通信や書き込みはしない。
const source = await readFile(new URL('./worker.js', import.meta.url), 'utf8');
const { default: worker } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const allowed = 'https://shusosai.github.io';
const endpoint = 'https://counter.invalid/';

function memoryKV() {
  const values = new Map([['total', '10']]);
  const writes = [];
  let reads = 0;
  return {
    values, writes,
    get reads() { return reads; },
    env: { COUNTER: {
      async get(key) { reads++; return values.get(key) ?? null; },
      async put(key, value, options) { values.set(key, value); writes.push({key, value, options}); },
    } },
  };
}

function request(method, origin, body = 'both') {
  const headers = origin === undefined ? {} : { Origin: origin };
  return new Request(endpoint, { method, headers, ...(method === 'POST' ? {body} : {}) });
}

for (const origin of [undefined, 'null', 'https://other.invalid', 'http://shusosai.github.io',
  'https://shusosai.github.io.other.invalid', 'https://shusosai.github.io/',
  'https://shusosai.github.io/kendo-support/', 'https://shusosai.github.io https://other.invalid']) {
  test(`POST rejects Origin ${String(origin)} before reading body or KV`, async () => {
    const kv = memoryKV();
    const req = request('POST', origin);
    const response = await worker.fetch(req, kv.env);
    assert.equal(response.status, 403);
    assert.equal(req.bodyUsed, false);
    assert.equal(kv.reads, 0);
    assert.deepEqual(kv.writes, []);
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), allowed);
  });
}

for (const origin of [undefined, allowed, 'https://other.invalid']) {
  test(`GET remains readable without writes: ${String(origin)}`, async () => {
    const kv = memoryKV();
    const response = await worker.fetch(request('GET', origin), kv.env);
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.deepEqual(data, {total: 10, today: 0});
    assert.deepEqual(kv.writes, []);
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), allowed);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
  });
}

for (const [body, total, today, count] of [['both',11,1,2], ['day',10,1,1], [' both ',11,1,2], ['none',10,0,0]]) {
  test(`Allowed POST preserves ${JSON.stringify(body)} counting`, async () => {
    const kv = memoryKV();
    const response = await worker.fetch(request('POST', allowed, body), kv.env);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {total, today});
    assert.equal(kv.writes.length, count);
    for (const write of kv.writes) {
      assert.match(write.key, /^(total|day:\d{4}-\d{2}-\d{2})$/);
      assert.equal(write.options?.expirationTtl, write.key === 'total' ? undefined : 3456000);
    }
  });
}

test('OPTIONS keeps existing CORS contract and does not touch KV', async () => {
  const kv = memoryKV();
  const response = await worker.fetch(request('OPTIONS', allowed), kv.env);
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('Access-Control-Allow-Methods'), 'GET, POST, OPTIONS');
  assert.equal(response.headers.get('Access-Control-Allow-Headers'), 'Content-Type');
  assert.equal(response.headers.get('Vary'), 'Origin');
  assert.equal(kv.reads, 0);
  assert.deepEqual(kv.writes, []);
});

test('Other methods remain 405 without KV access', async () => {
  const kv = memoryKV();
  assert.equal((await worker.fetch(request('PUT', allowed), kv.env)).status, 405);
  assert.equal(kv.reads, 0);
  assert.deepEqual(kv.writes, []);
});
