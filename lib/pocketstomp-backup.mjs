export const POCKETSTOMP_STORAGE = Object.freeze({
  profile: 'pocketstomp.profile.v2',
  sessions: 'pocketstomp.sessions.v2',
  settings: 'pocketstomp.settings.v2',
});

export const POCKETSTOMP_BACKUP = Object.freeze({
  app: 'PocketStomp',
  schema: 'pocketstomp-backup-v1',
  version: 1,
  maxBytes: 5 * 1024 * 1024,
  maxInputSessions: 1000,
  maxStoredSessions: 100,
  maxDepth: 24,
});

const BLOCKED_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

export function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
}

export function sanitizeBackupValue(value, depth = 0) {
  if (depth > POCKETSTOMP_BACKUP.maxDepth) throw new Error('Backup data is nested too deeply.');
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Backup contains a non-finite number.');
    return value;
  }
  if (Array.isArray(value)) return value.map((item) => sanitizeBackupValue(item, depth + 1));
  if (!isPlainObject(value)) throw new Error('Backup contains an unsupported value type.');

  const clean = Object.create(null);
  for (const [key, child] of Object.entries(value)) {
    if (BLOCKED_KEYS.has(key)) continue;
    clean[key] = sanitizeBackupValue(child, depth + 1);
  }
  return clean;
}

function parseStoredJson(storage, key, fallback) {
  const raw = storage.getItem(key);
  if (!raw) return fallback;
  try {
    return sanitizeBackupValue(JSON.parse(raw));
  } catch {
    return fallback;
  }
}

function normalizedSessions(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((session) => isPlainObject(session))
    .map((session) => sanitizeBackupValue(session));
}

function mergeObjectsPreferCurrent(current, backup) {
  const currentObject = isPlainObject(current) ? sanitizeBackupValue(current) : Object.create(null);
  const backupObject = isPlainObject(backup) ? sanitizeBackupValue(backup) : Object.create(null);
  const merged = Object.create(null);

  for (const [key, value] of Object.entries(backupObject)) merged[key] = value;
  for (const [key, value] of Object.entries(currentObject)) {
    if (isPlainObject(value) && isPlainObject(backupObject[key])) {
      merged[key] = mergeObjectsPreferCurrent(value, backupObject[key]);
    } else {
      merged[key] = value;
    }
  }
  return merged;
}

function sessionIdentity(session) {
  if (typeof session?.id === 'string' && session.id.trim()) return `id:${session.id.trim()}`;
  const fallback = {
    startedAt: session?.startedAt ?? null,
    endedAt: session?.endedAt ?? null,
    duration: session?.duration ?? null,
    totalScore: session?.totalScore ?? null,
    maxSpeed: session?.maxSpeed ?? null,
    vertical: session?.vertical ?? null,
    bestTrick: session?.bestTrick?.name ?? null,
    trickCount: Array.isArray(session?.tricks) ? session.tricks.length : null,
  };
  return `fallback:${stableStringify(fallback)}`;
}

export function mergeSessionsPreferCurrent(currentSessions, backupSessions) {
  const current = normalizedSessions(currentSessions);
  const backup = normalizedSessions(backupSessions);
  const seen = new Set();
  const merged = [];

  for (const session of [...current, ...backup]) {
    const identity = sessionIdentity(session);
    if (seen.has(identity)) continue;
    seen.add(identity);
    merged.push(session);
    if (merged.length >= POCKETSTOMP_BACKUP.maxStoredSessions) break;
  }
  return merged;
}

export function mergePocketStompState(current, backup) {
  const currentProfile = isPlainObject(current?.profile) ? current.profile : null;
  const backupProfile = isPlainObject(backup?.profile) ? backup.profile : null;
  const currentSettings = isPlainObject(current?.settings) ? current.settings : null;
  const backupSettings = isPlainObject(backup?.settings) ? backup.settings : null;

  return {
    profile: currentProfile || backupProfile
      ? mergeObjectsPreferCurrent(currentProfile || Object.create(null), backupProfile || Object.create(null))
      : null,
    sessions: mergeSessionsPreferCurrent(current?.sessions, backup?.sessions),
    settings: currentSettings || backupSettings
      ? mergeObjectsPreferCurrent(currentSettings || Object.create(null), backupSettings || Object.create(null))
      : null,
  };
}

export function readPocketStompState(storage) {
  return {
    profile: parseStoredJson(storage, POCKETSTOMP_STORAGE.profile, null),
    sessions: normalizedSessions(parseStoredJson(storage, POCKETSTOMP_STORAGE.sessions, [])),
    settings: parseStoredJson(storage, POCKETSTOMP_STORAGE.settings, null),
  };
}

export function buildPocketStompBackup(storage, metadata = {}) {
  const state = readPocketStompState(storage);
  return {
    app: POCKETSTOMP_BACKUP.app,
    schema: POCKETSTOMP_BACKUP.schema,
    version: POCKETSTOMP_BACKUP.version,
    exportedAt: new Date().toISOString(),
    source: {
      appVersion: typeof metadata.appVersion === 'string' ? metadata.appVersion : '1.0.0',
      platform: typeof metadata.platform === 'string' ? metadata.platform : 'web',
      purpose: typeof metadata.purpose === 'string' ? metadata.purpose : 'user-backup',
    },
    data: state,
  };
}

export function validatePocketStompBackup(input) {
  if (!isPlainObject(input)) throw new Error('Backup file must contain a JSON object.');
  if (input.app !== POCKETSTOMP_BACKUP.app) throw new Error('This backup belongs to a different app.');
  if (input.schema !== POCKETSTOMP_BACKUP.schema) throw new Error('Unsupported PocketStomp backup schema.');
  if (!Number.isInteger(input.version) || input.version < 1) throw new Error('Backup version is invalid.');
  if (input.version > POCKETSTOMP_BACKUP.version) throw new Error('This backup was created by a newer PocketStomp version.');
  if (!isPlainObject(input.data)) throw new Error('Backup data is missing or invalid.');

  const data = sanitizeBackupValue(input.data);
  if (data.profile !== null && data.profile !== undefined && !isPlainObject(data.profile)) {
    throw new Error('Backup rider profile is invalid.');
  }
  if (!Array.isArray(data.sessions)) throw new Error('Backup session archive is invalid.');
  if (data.sessions.length > POCKETSTOMP_BACKUP.maxInputSessions) throw new Error('Backup contains too many session records.');
  if (data.settings !== null && data.settings !== undefined && !isPlainObject(data.settings)) {
    throw new Error('Backup Coach settings are invalid.');
  }

  return {
    profile: data.profile ?? null,
    sessions: normalizedSessions(data.sessions),
    settings: data.settings ?? null,
  };
}

export function parsePocketStompBackupText(text) {
  if (typeof text !== 'string') throw new Error('Backup file could not be read.');
  const bytes = new TextEncoder().encode(text).byteLength;
  if (bytes > POCKETSTOMP_BACKUP.maxBytes) throw new Error('Backup file is larger than the 5 MB safety limit.');
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Backup file is not valid JSON.');
  }
  return validatePocketStompBackup(parsed);
}

function encodeStoredValue(value) {
  return value === null || value === undefined ? null : JSON.stringify(value);
}

function restoreRaw(storage, key, raw) {
  if (raw === null) storage.removeItem(key);
  else storage.setItem(key, raw);
}

export function writePocketStompStateTransactionally(storage, state) {
  const rollback = new Map([
    [POCKETSTOMP_STORAGE.profile, storage.getItem(POCKETSTOMP_STORAGE.profile)],
    [POCKETSTOMP_STORAGE.sessions, storage.getItem(POCKETSTOMP_STORAGE.sessions)],
    [POCKETSTOMP_STORAGE.settings, storage.getItem(POCKETSTOMP_STORAGE.settings)],
  ]);

  const writes = [
    [POCKETSTOMP_STORAGE.profile, encodeStoredValue(state.profile)],
    [POCKETSTOMP_STORAGE.sessions, encodeStoredValue(state.sessions || [])],
    [POCKETSTOMP_STORAGE.settings, encodeStoredValue(state.settings)],
  ];

  try {
    for (const [key, raw] of writes) {
      if (raw === null) storage.removeItem(key);
      else storage.setItem(key, raw);
    }
  } catch (error) {
    for (const [key, raw] of rollback) {
      try { restoreRaw(storage, key, raw); } catch {}
    }
    throw new Error(`PocketStomp restore failed and prior device data was rolled back: ${error?.message || 'storage write error'}`);
  }
}

export function mergePocketStompBackupIntoStorage(storage, backupState) {
  const current = readPocketStompState(storage);
  const merged = mergePocketStompState(current, backupState);
  writePocketStompStateTransactionally(storage, merged);
  return merged;
}
