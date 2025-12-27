'use strict';

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DEFAULT_DB_PATH = path.join(process.cwd(), 'data', 'githubMetrics.sqlite');
const DB_PATH = process.env.METRICS_SQLITE_PATH || DEFAULT_DB_PATH;
const METRICS_SQLITE_KEY = process.env.METRICS_SQLITE_KEY || 'default';
const HISTORY_TABLE_RAW =
    process.env.METRICS_SQLITE_HISTORY_TABLE || 'github_metrics_history';
const LOCK_TABLE_RAW =
    process.env.METRICS_SQLITE_LOCK_TABLE || 'github_metrics_lock';

const sanitizeIdentifier = (value, fallback) => {
    if (!value) return fallback;
    const sanitized = value.replace(/[^a-zA-Z0-9_]/g, '');
    return sanitized || fallback;
};

const HISTORY_TABLE = sanitizeIdentifier(HISTORY_TABLE_RAW, 'github_metrics_history');
const LOCK_TABLE = sanitizeIdentifier(LOCK_TABLE_RAW, 'github_metrics_lock');

const ensureDatabasePath = () => {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, {recursive: true});
    }
};

ensureDatabasePath();
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');

db.exec(
    `CREATE TABLE IF NOT EXISTS ${HISTORY_TABLE} (
        key TEXT PRIMARY KEY,
        history_payload TEXT NOT NULL,
        updated_at TEXT NOT NULL
    )`,
);
db.exec(
    `CREATE TABLE IF NOT EXISTS ${LOCK_TABLE} (
        key TEXT PRIMARY KEY,
        lock_payload TEXT NOT NULL,
        updated_at TEXT NOT NULL
    )`,
);

const selectHistory = db.prepare(
    `SELECT history_payload FROM ${HISTORY_TABLE} WHERE key = ? LIMIT 1`,
);
const upsertHistory = db.prepare(
    `INSERT INTO ${HISTORY_TABLE} (key, history_payload, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET
        history_payload = excluded.history_payload,
        updated_at = excluded.updated_at`,
);
const selectLock = db.prepare(
    `SELECT lock_payload FROM ${LOCK_TABLE} WHERE key = ? LIMIT 1`,
);
const upsertLock = db.prepare(
    `INSERT INTO ${LOCK_TABLE} (key, lock_payload, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET
        lock_payload = excluded.lock_payload,
        updated_at = excluded.updated_at`,
);
const deleteLock = db.prepare(`DELETE FROM ${LOCK_TABLE} WHERE key = ?`);

const getHistory = async () => {
    const row = selectHistory.get(METRICS_SQLITE_KEY);
    if (!row?.history_payload) return null;
    try {
        return JSON.parse(row.history_payload);
    } catch {
        return null;
    }
};

const saveHistory = async (history) => {
    const payload = JSON.stringify(history);
    const updatedAt = new Date().toISOString();
    upsertHistory.run(METRICS_SQLITE_KEY, payload, updatedAt);
};

const getLock = async () => {
    const row = selectLock.get(METRICS_SQLITE_KEY);
    if (!row?.lock_payload) return null;
    try {
        return JSON.parse(row.lock_payload);
    } catch {
        return null;
    }
};

const setLock = async (lock) => {
    const payload = JSON.stringify(lock);
    const updatedAt = new Date().toISOString();
    upsertLock.run(METRICS_SQLITE_KEY, payload, updatedAt);
};

const clearLock = async () => {
    deleteLock.run(METRICS_SQLITE_KEY);
};

const createMetricsStore = async () => ({
    getHistory,
    saveHistory,
    getLock,
    setLock,
    clearLock,
});

module.exports = {createMetricsStore};
