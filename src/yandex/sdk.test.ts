import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMergedLeaderboard, initYandexBridge } from './sdk';

test('initYandexBridge falls back cleanly to local_sandbox outside Yandex iframe', async () => {
  const status = await initYandexBridge();
  assert.equal(status.mode, 'local_sandbox');
  assert.equal(status.sdkReady, true);
  assert.equal(status.loadingApiCalled, true);
});

test('buildMergedLeaderboard ranks current player accurately among rivals', () => {
  const rows = buildMergedLeaderboard('Тестовый Магнат', 10_000_000);
  const me = rows.find((r) => r.isCurrentPlayer);
  assert.ok(me);
  assert.equal(me.name, 'Тестовый Магнат');
  // 10M sits between 24M (#6) and 4.2M (#7), so player should be rank 7
  assert.equal(me.rank, 7);
});
