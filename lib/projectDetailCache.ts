import {Pool} from 'pg';
import type {ProjectDetailResponse} from './projectDetails';

export type ProjectDetailCacheEntry = {
    data: ProjectDetailResponse;
    expiresAt: number;
    staleUntil: number;
};

export type ProjectDetailCacheStore = {
    get: (key: string) => Promise<ProjectDetailCacheEntry | null>;
    set: (key: string, entry: ProjectDetailCacheEntry) => Promise<void>;
};

const CACHE_SCHEMA =
    process.env.PROJECT_DETAIL_CACHE_SCHEMA ||
    process.env.PROJECT_CACHE_SCHEMA ||
    'public';
const CACHE_TABLE =
    process.env.PROJECT_DETAIL_CACHE_TABLE ||
    process.env.PROJECT_CACHE_TABLE ||
    'project_detail_cache';
const CACHE_MODE = process.env.PROJECT_DETAIL_CACHE || 'auto';
const CONNECTION_STRING =
    process.env.PROJECT_DETAIL_CACHE_PG_URL ||
    process.env.PROJECT_CACHE_PG_URL ||
    process.env.METRICS_PG_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.DATABASE_URL ||
    process.env.PG_CONNECTION_STRING;

const hasPostgresConfig = () =>
    Boolean(
        CONNECTION_STRING ||
            process.env.PGHOST ||
            process.env.PGUSER ||
            process.env.PGPASSWORD ||
            process.env.PGDATABASE,
    );

const shouldUsePostgres = () => {
    if (CACHE_MODE === 'disabled' || CACHE_MODE === 'memory') return false;
    if (CACHE_MODE === 'postgres') return true;
    return hasPostgresConfig();
};

const formatIdent = (value: string) => value.replace(/"/g, '""');
const buildTableRef = (schema: string, table: string) =>
    `"${formatIdent(schema)}"."${formatIdent(table)}"`;

const createPostgresStore = async (): Promise<ProjectDetailCacheStore> => {
    if (!hasPostgresConfig()) {
        throw new Error('Missing Postgres connection config for project cache.');
    }
    const pool = CONNECTION_STRING
        ? new Pool({connectionString: CONNECTION_STRING})
        : new Pool();
    let initPromise: Promise<void> | null = null;

    const init = async () => {
        if (initPromise) return initPromise;
        initPromise = (async () => {
            const schemaName = formatIdent(CACHE_SCHEMA);
            await pool.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
            const tableRef = buildTableRef(CACHE_SCHEMA, CACHE_TABLE);
            await pool.query(`
                CREATE TABLE IF NOT EXISTS ${tableRef} (
                    cache_key TEXT PRIMARY KEY,
                    payload JSONB NOT NULL,
                    expires_at BIGINT NOT NULL,
                    stale_until BIGINT NOT NULL,
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            `);
        })();
        return initPromise;
    };

    const get = async (key: string) => {
        await init();
        const tableRef = buildTableRef(CACHE_SCHEMA, CACHE_TABLE);
        const result = await pool.query(
            `SELECT payload, expires_at, stale_until
             FROM ${tableRef}
             WHERE cache_key = $1
             LIMIT 1`,
            [key],
        );
        if (result.rows.length === 0) return null;
        const row = result.rows[0];
        return {
            data: row.payload,
            expiresAt: Number(row.expires_at),
            staleUntil: Number(row.stale_until),
        };
    };

    const set = async (key: string, entry: ProjectDetailCacheEntry) => {
        await init();
        const tableRef = buildTableRef(CACHE_SCHEMA, CACHE_TABLE);
        await pool.query(
            `INSERT INTO ${tableRef} (cache_key, payload, expires_at, stale_until, updated_at)
             VALUES ($1, $2::jsonb, $3, $4, NOW())
             ON CONFLICT (cache_key)
             DO UPDATE SET
                payload = EXCLUDED.payload,
                expires_at = EXCLUDED.expires_at,
                stale_until = EXCLUDED.stale_until,
                updated_at = NOW()`,
            [key, JSON.stringify(entry.data), entry.expiresAt, entry.staleUntil],
        );
    };

    return {get, set};
};

let storePromise: Promise<ProjectDetailCacheStore | null> | null = null;

export const getProjectDetailCacheStore = () => {
    if (!storePromise) {
        storePromise = (async () => {
            if (!shouldUsePostgres()) return null;
            try {
                return await createPostgresStore();
            } catch (error) {
                console.warn(`Project detail cache disabled: ${error}`);
                return null;
            }
        })();
    }
    return storePromise;
};
