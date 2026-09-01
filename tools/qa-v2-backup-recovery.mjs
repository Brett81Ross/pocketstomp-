import {
  POCKETSTOMP_BACKUP,
  POCKETSTOMP_STORAGE,
  buildPocketStompBackup,
  mergePocketStompBackupIntoStorage,
  mergePocketStompState,
  parsePocketStompBackupText,
  sanitizeBackupValue,
  validatePocketStompBackup,
  writePocketStompStateTransactionally,
} from '../lib/pocketstomp-backup.mjs';

function expect(label, condition) {
  if (!condition) throw new Error(`FAIL: ${label}`);
  console.log(`PASS: ${label}`);
}

function expectThrows(label, fn, pattern) {
  let error = null;
  try { fn(); } catch (reason) { error = reason; }
  expect(label, Boolean(error) && (!pattern || pattern.test(String(error.message))));
}

class MemoryStorage {
  constructor(entries = {}) {
    this.map = new Map(Object.entries(entries));
    this.failKey = null;
    this.failed = false;
  }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
  setItem(key, value) {
    if (this.failKey === key && !this.failed) {
      this.failed = true;
      throw new Error(`simulated failure for ${key}`);
    }
    this.map.set(key, String(value));
  }
  removeItem(key) { this.map.delete(key); }
}

const seedStorage = new MemoryStorage({
  [POCKETSTOMP_STORAGE.profile]: JSON.stringify({
    version: 2,
    threshold: 17,
    baseline: 9.8,
    corrections: { Kickflip: 'Kickflip', Ollie: 'Ollie' },
  }),
  [POCKETSTOMP_STORAGE.sessions]: JSON.stringify([
    { id: 'current-a', startedAt: '2026-08-31T12:00:00.000Z', totalScore: 900, note: 'current wins' },
  ]),
  [POCKETSTOMP_STORAGE.settings]: JSON.stringify({ coachMode: 'full', personality: 'hype', smartCoach: true }),
});

const exported = buildPocketStompBackup(seedStorage, { appVersion: '1.0.0', platform: 'android-direct' });
expect('backup app marker', exported.app === 'PocketStomp');
expect('backup schema marker', exported.schema === 'pocketstomp-backup-v1');
expect('backup version marker', exported.version === 1);
expect('backup contains exact production profile state', exported.data.profile.threshold === 17);
expect('backup contains exact production session archive', exported.data.sessions.length === 1 && exported.data.sessions[0].id === 'current-a');
expect('backup contains Coach settings', exported.data.settings.coachMode === 'full');
expect('backup source metadata is non-sensitive', exported.source.platform === 'android-direct' && !('installationId' in exported.source));

expectThrows(
  'wrong-app backup rejected',
  () => validatePocketStompBackup({ ...exported, app: 'First Bearing' }),
  /different app/i,
);
expectThrows(
  'unknown schema rejected',
  () => validatePocketStompBackup({ ...exported, schema: 'mystery-v9' }),
  /schema/i,
);
expectThrows(
  'future version rejected',
  () => validatePocketStompBackup({ ...exported, version: 99 }),
  /newer/i,
);
expectThrows(
  'invalid JSON rejected',
  () => parsePocketStompBackupText('{not-json'),
  /valid JSON/i,
);
expectThrows(
  'oversized backup rejected',
  () => parsePocketStompBackupText(' '.repeat(POCKETSTOMP_BACKUP.maxBytes + 1)),
  /5 MB/i,
);
expectThrows(
  'excessive session count rejected',
  () => validatePocketStompBackup({
    ...exported,
    data: { ...exported.data, sessions: Array.from({ length: POCKETSTOMP_BACKUP.maxInputSessions + 1 }, (_, index) => ({ id: `s${index}` })) },
  }),
  /too many session/i,
);

const polluted = JSON.parse('{"safe":1,"__proto__":{"polluted":true},"constructor":{"bad":true},"nested":{"prototype":{"bad":true},"ok":2}}');
const sanitized = sanitizeBackupValue(polluted);
expect('safe backup keys retained', sanitized.safe === 1 && sanitized.nested.ok === 2);
expect('prototype-pollution keys stripped', !Object.prototype.hasOwnProperty.call(sanitized, '__proto__') && !Object.prototype.hasOwnProperty.call(sanitized, 'constructor') && !Object.prototype.hasOwnProperty.call(sanitized.nested, 'prototype'));
expect('global Object prototype untouched', ({}).polluted === undefined);

const currentState = {
  profile: {
    version: 2,
    threshold: 18,
    corrections: { Kickflip: 'Kickflip' },
    currentOnly: true,
  },
  sessions: [
    { id: 'dup', totalScore: 1000, source: 'current' },
    { id: 'current-only', totalScore: 800 },
  ],
  settings: { coachMode: 'full', personality: 'hype' },
};
const backupState = {
  profile: {
    version: 2,
    threshold: 12,
    corrections: { Kickflip: 'Heelflip', Ollie: 'Ollie' },
    backupOnly: true,
  },
  sessions: [
    { id: 'dup', totalScore: 200, source: 'backup' },
    { id: 'backup-only', totalScore: 700 },
  ],
  settings: { coachMode: 'off', personality: 'minimal', voiceName: 'Natural Voice' },
};
const merged = mergePocketStompState(currentState, backupState);
expect('profile current-device value wins conflict', merged.profile.threshold === 18 && merged.profile.currentOnly === true);
expect('profile missing field restored from backup', merged.profile.backupOnly === true);
expect('learned corrections merge with current-device precedence', merged.profile.corrections.Kickflip === 'Kickflip' && merged.profile.corrections.Ollie === 'Ollie');
expect('settings current-device values win conflicts', merged.settings.coachMode === 'full' && merged.settings.personality === 'hype');
expect('settings missing field restored from backup', merged.settings.voiceName === 'Natural Voice');
expect('duplicate session not duplicated', merged.sessions.filter((session) => session.id === 'dup').length === 1);
expect('duplicate session current copy wins', merged.sessions.find((session) => session.id === 'dup').source === 'current');
expect('unique backup session restored', merged.sessions.some((session) => session.id === 'backup-only'));

const manyCurrent = Array.from({ length: 80 }, (_, index) => ({ id: `c-${index}` }));
const manyBackup = Array.from({ length: 80 }, (_, index) => ({ id: `b-${index}` }));
const capped = mergePocketStompState({ sessions: manyCurrent }, { sessions: manyBackup });
expect('restored archive remains at production 100-session cap', capped.sessions.length === 100);
expect('current archive retained before backup overflow', capped.sessions.slice(0, 80).every((session, index) => session.id === `c-${index}`));

const rollbackStorage = new MemoryStorage({
  [POCKETSTOMP_STORAGE.profile]: JSON.stringify({ marker: 'before-profile' }),
  [POCKETSTOMP_STORAGE.sessions]: JSON.stringify([{ id: 'before-session' }]),
  [POCKETSTOMP_STORAGE.settings]: JSON.stringify({ marker: 'before-settings' }),
});
const beforeRollback = Object.fromEntries(rollbackStorage.map);
rollbackStorage.failKey = POCKETSTOMP_STORAGE.sessions;
expectThrows(
  'simulated mid-import write failure surfaces rollback result',
  () => writePocketStompStateTransactionally(rollbackStorage, {
    profile: { marker: 'after-profile' },
    sessions: [{ id: 'after-session' }],
    settings: { marker: 'after-settings' },
  }),
  /rolled back/i,
);
expect('profile restored after failed transaction', rollbackStorage.getItem(POCKETSTOMP_STORAGE.profile) === beforeRollback[POCKETSTOMP_STORAGE.profile]);
expect('sessions restored after failed transaction', rollbackStorage.getItem(POCKETSTOMP_STORAGE.sessions) === beforeRollback[POCKETSTOMP_STORAGE.sessions]);
expect('settings restored after failed transaction', rollbackStorage.getItem(POCKETSTOMP_STORAGE.settings) === beforeRollback[POCKETSTOMP_STORAGE.settings]);

const restoreStorage = new MemoryStorage({
  [POCKETSTOMP_STORAGE.profile]: JSON.stringify({ threshold: 19, corrections: { Kickflip: 'Kickflip' } }),
  [POCKETSTOMP_STORAGE.sessions]: JSON.stringify([{ id: 'live', totalScore: 999 }]),
  [POCKETSTOMP_STORAGE.settings]: JSON.stringify({ coachMode: 'full' }),
});
const restored = mergePocketStompBackupIntoStorage(restoreStorage, {
  profile: { threshold: 11, corrections: { Ollie: 'Ollie' }, calibratedAt: '2026-08-01T00:00:00.000Z' },
  sessions: [{ id: 'live', totalScore: 1 }, { id: 'restored', totalScore: 777 }],
  settings: { coachMode: 'off', voiceName: 'Ava' },
});
expect('successful restore keeps live profile conflict', restored.profile.threshold === 19);
expect('successful restore adds missing calibration data', restored.profile.calibratedAt === '2026-08-01T00:00:00.000Z');
expect('successful restore adds learned correction', restored.profile.corrections.Ollie === 'Ollie');
expect('successful restore keeps current duplicate session', restored.sessions.find((session) => session.id === 'live').totalScore === 999);
expect('successful restore adds backup-only session', restored.sessions.some((session) => session.id === 'restored'));
expect('successful restore persists merged state', JSON.parse(restoreStorage.getItem(POCKETSTOMP_STORAGE.sessions)).some((session) => session.id === 'restored'));

const roundTripText = JSON.stringify(exported);
const parsedRoundTrip = parsePocketStompBackupText(roundTripText);
const emptyDevice = new MemoryStorage();
const roundTrip = mergePocketStompBackupIntoStorage(emptyDevice, parsedRoundTrip);
expect('export-to-empty-device round trip restores profile', roundTrip.profile.threshold === 17);
expect('export-to-empty-device round trip restores sessions', roundTrip.sessions.length === 1 && roundTrip.sessions[0].id === 'current-a');
expect('export-to-empty-device round trip restores settings', roundTrip.settings.coachMode === 'full');

console.log('PocketStomp signing-cutover backup/restore functional QA passed.');
