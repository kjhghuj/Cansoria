// Run only against the isolated, non-persistent Redis instance described in SECURITY_AUDIT.md.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const Redis = require('ioredis');
const { transformSync } = require('../../backend/node_modules/@swc/core');

const redisUrl = 'redis://127.0.0.1:16491/15';
const keys = ['{cansoria-chat}:budget', '{cansoria-chat}:leases'];
const clientKeys = Array.from({ length: 16 }, (_, index) => `{cansoria-chat}:ip:integration-${index}`);
const redis = new Redis(redisUrl, { maxRetriesPerRequest: 0, retryStrategy: () => null, connectTimeout: 1500 });
redis.on('error', () => undefined);
process.env.CHAT_REDIS_URL = redisUrl;
process.env.NODE_ENV = 'production';

function independentControls() {
  const filename = path.resolve(__dirname, '../src/lib/chat-controls.ts');
  const compiled = transformSync(fs.readFileSync(filename, 'utf8'), {
    filename, jsc: { parser: { syntax: 'typescript' }, target: 'es2022' }, module: { type: 'commonjs' },
  }).code;
  const instance = new Module(filename, module);
  instance.filename = filename;
  instance.paths = Module._nodeModulePaths(path.dirname(filename));
  instance._compile(compiled, filename);
  return instance.exports;
}

async function verify() {
  await redis.ping();
  const instances = [independentControls(), independentControls()];
  await redis.del(...keys, ...clientKeys);
  process.env.CHAT_DAILY_CALL_BUDGET = '50';
  const parallel = await Promise.allSettled(Array.from({ length: 12 }, (_, index) => instances[index % 2].admitChatRequest(`integration-${index}`)));
  const admitted = parallel.filter(result => result.status === 'fulfilled');
  assert.equal(admitted.length, 4, 'two independent instances must share the four-call concurrency limit');
  for (const result of parallel.filter(result => result.status === 'rejected')) assert.equal(result.reason.status, 429);
  await Promise.all(admitted.map(result => result.value()));
  const afterRelease = await instances[1].admitChatRequest('integration-15');
  await afterRelease();

  await redis.del(...keys, ...clientKeys);
  process.env.CHAT_DAILY_CALL_BUDGET = '3';
  for (let index = 0; index < 3; index++) await (await instances[index % 2].admitChatRequest(`integration-${index}`))();
  await assert.rejects(instances[1].admitChatRequest('integration-4'), error => error.status === 429);
  assert.equal(await redis.hget(keys[0], 'count'), '3', 'rejected calls must not exceed the shared paid-call budget');

  await redis.del(...keys, ...clientKeys);
  process.env.CHAT_DAILY_CALL_BUDGET = '50';
  for (let index = 0; index < 10; index++) await (await instances[index % 2].admitChatRequest('integration-0'))();
  await assert.rejects(instances[1].admitChatRequest('integration-0'), error => error.status === 429);

  await redis.del(...keys, ...clientKeys);
  await redis.zadd(keys[1], Date.now() - 60_000, 'expired-aborted-call');
  const recovered = await instances[0].admitChatRequest('integration-0');
  assert.equal(await redis.zcard(keys[1]), 1, 'expired leases must be recovered before admission');
  await recovered();
  console.log('PASS Redis: multi-instance concurrency, daily budget, per-client rate, release and expired-lease recovery');
}

verify().then(async () => {
  await redis.del(...keys, ...clientKeys);
  redis.disconnect();
  process.exit(0); // Close the independent module instances' test-only Redis connections.
}, error => {
  console.error(error instanceof Error ? error.message : 'Redis verification failed');
  redis.disconnect();
  process.exit(1);
});
