import fs from 'fs/promises';
import path from 'path';
import {pathToFileURL} from 'url';
import type {GithubMetricsHistory} from './githubMetricsTypes';

export type MetricsLock = {
    startedAt: string;
    pid?: number | null;
};

export type MetricsStore = {
    getHistory: () => Promise<GithubMetricsHistory | null>;
    saveHistory: (history: GithubMetricsHistory) => Promise<void>;
    getLock: () => Promise<MetricsLock | null>;
    setLock: (lock: MetricsLock) => Promise<void>;
    clearLock: () => Promise<void>;
};

const METRICS_PATH = path.join(process.cwd(), 'data', 'githubMetricsHistory.json');
const LOCK_PATH = path.join(process.cwd(), 'data', '.githubMetrics.lock');

const fileStore: MetricsStore = {
    getHistory: async () => {
        try {
            const raw = await fs.readFile(METRICS_PATH, 'utf8');
            const parsed = JSON.parse(raw) as GithubMetricsHistory;
            if (!parsed || !Array.isArray(parsed.repos)) return null;
            return parsed;
        } catch {
            return null;
        }
    },
    saveHistory: async (history) => {
        const tempPath = `${METRICS_PATH}.tmp`;
        const payload = `${JSON.stringify(history, null, 2)}\n`;
        await fs.writeFile(tempPath, payload, 'utf8');
        try {
            await fs.rename(tempPath, METRICS_PATH);
        } catch (error: any) {
            await fs.writeFile(METRICS_PATH, payload, 'utf8');
            try {
                await fs.unlink(tempPath);
            } catch {
                // ignore temp cleanup
            }
            if (error?.code && !['EPERM', 'EEXIST'].includes(error.code)) {
                throw error;
            }
        }
    },
    getLock: async () => {
        try {
            const raw = await fs.readFile(LOCK_PATH, 'utf8');
            const parsed = JSON.parse(raw) as MetricsLock;
            if (!parsed?.startedAt) return null;
            return parsed;
        } catch {
            return null;
        }
    },
    setLock: async (lock) => {
        await fs.writeFile(LOCK_PATH, JSON.stringify(lock, null, 2), 'utf8');
    },
    clearLock: async () => {
        try {
            await fs.unlink(LOCK_PATH);
        } catch {
            // ignore missing lock
        }
    },
};

const resolveAdapterModule = async (adapterPath?: string) => {
    const requireFallback = (modulePath: string) => {
        const runtimeRequire =
            (globalThis as any).__non_webpack_require__ ?? eval('require');
        return runtimeRequire(modulePath) as any;
    };
    const importFallback = (modulePath: string) => {
        const dynamicImport = new Function(
            'specifier',
            'return import(specifier)',
        ) as (specifier: string) => Promise<any>;
        return dynamicImport(pathToFileURL(modulePath).href);
    };

    if (adapterPath) {
        const resolved = path.isAbsolute(adapterPath)
            ? adapterPath
            : path.join(process.cwd(), adapterPath);
        try {
            return requireFallback(resolved);
        } catch (error: any) {
            if (error?.code === 'ERR_REQUIRE_ESM') {
                return importFallback(resolved);
            }
            throw error;
        }
    }

    try {
        return requireFallback('./metricsStoreAdapter');
    } catch (error: any) {
        if (error?.code === 'ERR_REQUIRE_ESM') {
            return importFallback(path.join(__dirname, 'metricsStoreAdapter'));
        }
        throw error;
    }
};

const hasPostgresUrl = () =>
    Boolean(
        process.env.METRICS_PG_URL ||
            process.env.POSTGRES_URL ||
            process.env.POSTGRES_URL_NON_POOLING ||
            process.env.POSTGRES_PRISMA_URL ||
            process.env.DATABASE_URL_UNPOOLED ||
            process.env.DATABASE_URL ||
            process.env.PG_CONNECTION_STRING ||
            process.env.PGHOST,
    );

const resolveAdapterPath = () => {
    const mode = process.env.METRICS_STORE;
    if (mode === 'file') return null;
    const explicitAdapter = process.env.METRICS_STORE_ADAPTER;
    if (explicitAdapter) return explicitAdapter;
    if (mode) return null;
    if (process.env.NODE_ENV === 'production') {
        if (hasPostgresUrl()) {
            return path.join(
                process.cwd(),
                'scripts',
                'metricsStoreAdapters',
                'postgres.js',
            );
        }
        return null;
    }
    return path.join(process.cwd(), 'scripts', 'metricsStoreAdapters', 'sqlite.js');
};

const resolveStore = async (): Promise<MetricsStore> => {
    const mode = process.env.METRICS_STORE;
    const adapterPath = resolveAdapterPath();
    const useAdapter = mode !== 'file' && (mode === 'custom' || Boolean(adapterPath));

    if (useAdapter) {
        try {
            const adapterModule = await resolveAdapterModule(adapterPath);
            const factory =
                adapterModule.createMetricsStore ??
                adapterModule.default ??
                adapterModule.metricsStore;
            const store = typeof factory === 'function' ? await factory() : factory;
            if (
                store?.getHistory &&
                store?.saveHistory &&
                store?.getLock &&
                store?.setLock &&
                store?.clearLock
            ) {
                return store as MetricsStore;
            }
            console.warn(
                'Custom metrics store is missing required methods. Falling back to file store.',
            );
        } catch (error) {
            console.warn(`Custom metrics store load failed: ${error}`);
        }
    }
    return fileStore;
};

let storePromise: Promise<MetricsStore> | null = null;

export const getMetricsStore = () => {
    if (!storePromise) {
        storePromise = resolveStore();
    }
    return storePromise;
};
