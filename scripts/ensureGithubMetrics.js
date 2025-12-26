const fs = require('fs');
const path = require('path');
const {spawn} = require('child_process');

const METRICS_PATH = path.join(process.cwd(), 'data', 'githubMetricsHistory.json');
const LOCK_PATH = path.join(process.cwd(), 'data', '.githubMetrics.lock');
const LOCK_STALE_MS = 4 * 60 * 60 * 1000;
const ENV_FILES = ['.env.local', '.env'];

const loadEnvFile = (filePath) => {
    try {
        const raw = fs.readFileSync(filePath, 'utf8');
        raw.split(/\r?\n/).forEach((line) => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) return;
            const separatorIndex = trimmed.indexOf('=');
            if (separatorIndex === -1) return;
            const key = trimmed.slice(0, separatorIndex).trim();
            if (!key || process.env[key]) return;
            let value = trimmed.slice(separatorIndex + 1).trim();
            if (
                (value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))
            ) {
                value = value.slice(1, -1);
            }
            process.env[key] = value;
        });
    } catch {
        // ignore missing env files
    }
};

const loadEnv = () => {
    ENV_FILES.forEach((fileName) => {
        const filePath = path.join(process.cwd(), fileName);
        if (fs.existsSync(filePath)) {
            loadEnvFile(filePath);
        }
    });
};

const shouldGenerate = (metrics) => {
    if (!metrics) return true;
    if (!metrics.generatedAt) return true;
    if (!Array.isArray(metrics.repos)) return true;
    return metrics.repos.length === 0;
};

const fileStore = {
    getHistory: async () => {
        try {
            const raw = fs.readFileSync(METRICS_PATH, 'utf8');
            return JSON.parse(raw);
        } catch {
            return null;
        }
    },
    getLock: async () => {
        try {
            if (!fs.existsSync(LOCK_PATH)) return null;
            const raw = fs.readFileSync(LOCK_PATH, 'utf8');
            const parsed = JSON.parse(raw);
            if (!parsed?.startedAt) return null;
            return parsed;
        } catch {
            return null;
        }
    },
};

const hasPostgresUrl = () =>
    Boolean(
        process.env.METRICS_PG_URL ||
            process.env.POSTGRES_URL ||
            process.env.POSTGRES_URL_NON_POOLING ||
            process.env.POSTGRES_PRISMA_URL ||
            process.env.DATABASE_URL ||
            process.env.PG_CONNECTION_STRING,
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

const resolveAdapterModule = async () => {
    const adapterPath = resolveAdapterPath();
    if (adapterPath) {
        const resolved = path.isAbsolute(adapterPath)
            ? adapterPath
            : path.join(process.cwd(), adapterPath);
        try {
            return require(resolved);
        } catch (error) {
            if (error?.code === 'ERR_REQUIRE_ESM') {
                const {pathToFileURL} = require('url');
                return import(pathToFileURL(resolved).href);
            }
            throw error;
        }
    }
    return require('./metricsStoreAdapter');
};

const resolveStore = async () => {
    const mode = process.env.METRICS_STORE || 'file';
    const adapterPath = resolveAdapterPath();
    const useAdapter = mode !== 'file' && (mode === 'custom' || Boolean(adapterPath));
    if (useAdapter) {
        try {
            const adapter = await resolveAdapterModule();
            const factory =
                adapter.createMetricsStore ??
                adapter.default ??
                adapter.metricsStore ??
                adapter;
            const store = typeof factory === 'function' ? await factory() : factory;
            if (store?.getHistory && store?.getLock) {
                return store;
            }
            console.warn('Custom metrics store missing required methods. Using file store.');
        } catch (error) {
            console.warn(`Custom metrics store load failed: ${error}`);
        }
    }
    return fileStore;
};

const isLockActive = async (store) => {
    try {
        const lock = await store.getLock();
        const startedAt = lock?.startedAt ? new Date(lock.startedAt).getTime() : NaN;
        if (Number.isNaN(startedAt)) return false;
        return Date.now() - startedAt < LOCK_STALE_MS;
    } catch {
        return false;
    }
};

const main = async () => {
    loadEnv();
    const store = await resolveStore();
    const metrics = await store.getHistory();
    if (!shouldGenerate(metrics)) {
        return;
    }

    if (!process.env.GITHUB_TOKEN) {
        console.warn(
            'GitHub metrics snapshot missing. Set GITHUB_TOKEN (or .env.local) to generate metrics.',
        );
        return;
    }

    if (await isLockActive(store)) {
        console.warn('GitHub metrics update already running. Using existing snapshot.');
        return;
    }

    const child = spawn('node', ['scripts/updateGithubMetrics.js'], {
        detached: true,
        stdio: 'ignore',
        env: process.env,
    });
    child.unref();
};

main().catch((error) => {
    console.warn(`GitHub metrics bootstrap failed: ${error}`);
});
