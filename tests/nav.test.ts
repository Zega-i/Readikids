/**
 * Unit test navigasi berbasis hash (src/utils/nav.ts).
 * Menjamin back/forward sistem (Android & browser) bisa memulihkan layar.
 * Jalankan: npx tsx tests/nav.test.ts
 */
import assert from 'node:assert/strict';
import { decodeHash, encodeHash, type NavContext } from '../src/utils/nav';

let passed = 0;
function test(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
    console.log(`  ✅ ${name}`);
  } catch (err) {
    console.error(`  ❌ ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

const base = (over: Partial<NavContext> = {}): NavContext => ({
  screen: 'landing',
  phase: null,
  skill: null,
  viewingSessionId: null,
  ...over,
});

test('decode hash kosong → landing', () => {
  assert.deepEqual(decodeHash(''), base());
  assert.deepEqual(decodeHash('#/'), base());
});

test('round-trip layar sederhana', () => {
  const screens: NavContext[] = [
    base({ screen: 'consent' }),
    base({ screen: 'map' }),
    base({ screen: 'penutup' }),
    base({ screen: 'cilo-menulis' }),
    base({ screen: 'beranda-pendamping' }),
    base({ screen: 'kelola' }),
    base({ screen: 'riwayat' }),
    base({ screen: 'tentang' }),
    base({ screen: 'landing' }),
  ];
  for (const ctx of screens) {
    assert.deepEqual(decodeHash(encodeHash(ctx)), ctx);
  }
});

test('world-hub membawa fase', () => {
  const ctx = base({ screen: 'world-hub', phase: 2 });
  assert.equal(encodeHash(ctx), '#/world-hub/2');
  assert.deepEqual(decodeHash('#/world-hub/2'), ctx);
});

test('game membawa fase + skill', () => {
  const ctx = base({ screen: 'game', phase: 0, skill: 'letter_name' });
  assert.equal(encodeHash(ctx), '#/game/0/letter_name');
  assert.deepEqual(decodeHash('#/game/0/letter_name'), ctx);
});

test('dashboard membawa viewingSessionId', () => {
  const ctx = base({ screen: 'dashboard-pendamping', viewingSessionId: 'sess-123' });
  assert.equal(encodeHash(ctx), '#/dashboard?session=sess-123');
  assert.deepEqual(decodeHash('#/dashboard?session=sess-123'), ctx);
  assert.equal(encodeHash(base({ screen: 'dashboard-pendamping' })), '#/dashboard');
});

test('decode hash tak valid → null', () => {
  assert.equal(decodeHash('#/world-hub/9'), null);
  assert.equal(decodeHash('#/world-hub/-1'), null);
  assert.equal(decodeHash('#/game/0'), null);
  assert.equal(decodeHash('#/game/abc/letter_name'), null);
  assert.equal(decodeHash('#/hal-tak-dikenal'), null);
});

test('encode konteks tidak lengkap jatuh ke landing', () => {
  assert.equal(encodeHash(base({ screen: 'world-hub' })), '#/');
  assert.equal(encodeHash(base({ screen: 'game', phase: 1 })), '#/');
});

console.log(`\n${passed} test(s) lulus (nav)`);