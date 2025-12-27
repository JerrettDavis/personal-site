'use strict';

const {Pool} = require('pg');

const HISTORY_TABLE = process.env.METRICS_PG_HISTORY_TABLE || 'github_metrics_history';
const LOCK_TABLE = process.env.METRICS_PG_LOCK_TABLE || 'github_metrics_lock';
const METRICS_PG_SCHEMA = process.env.METRICS_PG_SCHEMA || 'public';
const METRICS_PG_KEY = process.env.METRICS_PG_KEY || 'default';
const CONNECTION_STRING =
    process.env.METRICS_PG_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.DATABASE_URL ||
    process.env.PG_CONNECTION_STRING;

const hasEnvConfig = () =>
    Boolean(
        CONNECTION_STRING ||
            process.env.PGHOST ||
            process.env.PGUSER ||
            process.env.PGPASSWORD ||
            process.env.PGDATABASE,
    );

const ensureConnectionConfig = () => {
    if (!hasEnvConfig()) {
        throw new Error(
            'Missing Postgres connection config. Set METRICS_PG_URL, POSTGRES_URL, DATABASE_URL, or PGHOST env vars.',
        );
    }
};

const pool = (() => {
    ensureConnectionConfig();
    if (CONNECTION_STRING) {
        return new Pool({connectionString: CONNECTION_STRING});
    }
    return new Pool();
})();

let initPromise = null;

const formatIdent = (value) => value.replace(/"/g, '""');

const buildTableRef = (schema, table) => {
    const schemaName = formatIdent(schema);
    const tableName = formatIdent(table);
    return `"${schemaName}"."${tableName}"`;
};

const init = async () => {
    if (initPromise) return initPromise;
    initPromise = (async () => {
        const schemaName = formatIdent(METRICS_PG_SCHEMA);
        await pool.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
        const historyRef = buildTableRef(METRICS_PG_SCHEMA, HISTORY_TABLE);
        const lockRef = buildTableRef(METRICS_PG_SCHEMA, LOCK_TABLE);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS ${historyRef} (
                key TEXT PRIMARY KEY,
                history_payload JSONB NOT NULL,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS ${lockRef} (
                key TEXT PRIMARY KEY,
                lock_payload JSONB NOT NULL,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `);
    })();
    return initPromise;
};

const getHistory = async () => {
    await init();
    const historyRef = buildTableRef(METRICS_PG_SCHEMA, HISTORY_TABLE);
    const result = await pool.query(
        `SELECT history_payload FROM ${historyRef} WHERE key = $1 LIMIT 1`,
        [METRICS_PG_KEY],
    );
    if (result.rows.length === 0) return null;
    return result.rows[0].history_payload ?? null;
};

const saveHistory = async (history) => {
    await init();
    const historyRef = buildTableRef(METRICS_PG_SCHEMA, HISTORY_TABLE);
    await pool.query(
        `INSERT INTO ${historyRef} (key, history_payload, updated_at)
         VALUES ($1, $2::jsonb, NOW())
         ON CONFLICT (key)
         DO UPDATE SET history_payload = EXCLUDED.history_payload, updated_at = NOW()`,
        [METRICS_PG_KEY, JSON.stringify(history)],
    );
};

const getLock = async () => {
    await init();
    const lockRef = buildTableRef(METRICS_PG_SCHEMA, LOCK_TABLE);
    const result = await pool.query(
        `SELECT lock_payload FROM ${lockRef} WHERE key = $1 LIMIT 1`,
        [METRICS_PG_KEY],
    );
    if (result.rows.length === 0) return null;
    return result.rows[0].lock_payload ?? null;
};

const setLock = async (lock) => {
    await init();
    const lockRef = buildTableRef(METRICS_PG_SCHEMA, LOCK_TABLE);
    await pool.query(
        `INSERT INTO ${lockRef} (key, lock_payload, updated_at)
         VALUES ($1, $2::jsonb, NOW())
         ON CONFLICT (key)
         DO UPDATE SET lock_payload = EXCLUDED.lock_payload, updated_at = NOW()`,
        [METRICS_PG_KEY, JSON.stringify(lock)],
    );
};

const clearLock = async () => {
    await init();
    const lockRef = buildTableRef(METRICS_PG_SCHEMA, LOCK_TABLE);
    await pool.query(`DELETE FROM ${lockRef} WHERE key = $1`, [METRICS_PG_KEY]);
};

const createMetricsStore = async () => ({
    getHistory,
    saveHistory,
    getLock,
    setLock,
    clearLock,
});

module.exports = {createMetricsStore};
