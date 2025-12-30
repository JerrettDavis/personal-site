const fs = require('fs/promises');
const path = require('path');

const METRICS_PATH = path.join(process.cwd(), 'data', 'githubMetricsHistory.json');
const TEMP_PATH = `${METRICS_PATH}.tmp`;
const LOCK_PATH = path.join(process.cwd(), 'data', '.githubMetrics.lock');
const LOCK_STALE_MS = 4 * 60 * 60 * 1000;
const ENV_FILES = ['.env.local', '.env'];

const loadEnvFile = async (filePath) => {
    try {
        const raw = await fs.readFile(filePath, 'utf8');
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

const loadEnv = async () => {
    for (const fileName of ENV_FILES) {
        const filePath = path.join(process.cwd(), fileName);
        try {
            await fs.access(filePath);
            await loadEnvFile(filePath);
        } catch {
            // ignore missing env files
        }
    }
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));        
const DAY_MS = 24 * 60 * 60 * 1000;

const requestJson = async (url, init) => {
    const response = await fetch(url, init);
    if (response.status === 202) {
        return {status: 202, data: null, headers: response.headers};
    }
    const body = await response.text();
    if (!response.ok) {
        throw new Error(`GitHub request failed ${response.status}: ${body}`);
    }
    if (!body) {
        console.warn(`GitHub response empty: ${url}`);
        return {status: response.status, data: null, headers: response.headers};
    }
    try {
        const data = JSON.parse(body);
        return {status: response.status, data, headers: response.headers};
    } catch (error) {
        throw new Error(`GitHub response parse failed ${response.status}: ${body}`);
    }
};

const fetchJson = async (url, init) => {
    const {data} = await requestJson(url, init);
    return data;
};

const requestGraphql = async (query, variables, headers) => {
    const response = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: {
            ...headers,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({query, variables}),
    });
    const body = await response.text();
    if (!response.ok) {
        throw new Error(`GitHub GraphQL failed ${response.status}: ${body}`);
    }
    if (!body) {
        throw new Error('GitHub GraphQL response empty.');
    }
    const parsed = JSON.parse(body);
    if (parsed?.errors?.length) {
        throw new Error(`GitHub GraphQL error: ${JSON.stringify(parsed.errors)}`);
    }
    return parsed?.data ?? null;
};

const resolveLoginFromEnv = () => {
    if (process.env.METRICS_GITHUB_OWNER) {
        return process.env.METRICS_GITHUB_OWNER;
    }
    if (process.env.GITHUB_REPOSITORY_OWNER) {
        return process.env.GITHUB_REPOSITORY_OWNER;
    }
    if (process.env.GITHUB_ACTOR) {
        return process.env.GITHUB_ACTOR;
    }
    if (process.env.GITHUB_REPOSITORY) {
        const [owner] = process.env.GITHUB_REPOSITORY.split('/');
        if (owner) return owner;
    }
    return null;
};

const fetchUser = async (headers) => fetchJson('https://api.github.com/user', {headers});

const resolveLogin = async (headers) => {
    const envLogin = resolveLoginFromEnv();
    if (envLogin) return envLogin;
    try {
        const user = await fetchUser(headers);
        if (user?.login) return user.login;
    } catch (error) {
        throw new Error(
            `Unable to resolve GitHub login. Set METRICS_GITHUB_OWNER or use a user token. (${error?.message ?? error})`,
        );
    }
    throw new Error('Unable to resolve GitHub login. Set METRICS_GITHUB_OWNER or use a user token.');
};

const fetchRepos = async (login, headers) => {
    if (!login) {
        throw new Error('Missing GitHub login for repository lookup.');
    }
    const repos = [];
    let page = 1;
    while (true) {
        const url = `https://api.github.com/users/${encodeURIComponent(
            login,
        )}/repos?per_page=100&type=owner&sort=updated&direction=desc&page=${page}`;
        const pageData = await fetchJson(url, {headers});
        if (!Array.isArray(pageData) || pageData.length === 0) break;
        repos.push(...pageData);
        if (pageData.length < 100) break;
        page += 1;
    }
    return repos;
};

const fetchContributorStats = async (fullName, headers) => {
    const url = `https://api.github.com/repos/${fullName}/stats/contributors`;
    for (let attempt = 0; attempt < 4; attempt += 1) {
        const {status, data, headers: responseHeaders} = await requestJson(url, {headers});
        if (status === 202) {
            await sleep(1200 + attempt * 800);
            continue;
        }
        const remaining = Number(responseHeaders.get('x-ratelimit-remaining') ?? '1');
        if (!Number.isNaN(remaining) && remaining <= 0) {
            const reset = Number(responseHeaders.get('x-ratelimit-reset') ?? '0');
            if (!Number.isNaN(reset) && reset > 0) {
                throw new Error(`Rate limit reached. Reset at ${new Date(reset * 1000).toISOString()}`);
            }
        }
        return Array.isArray(data) ? data : [];
    }
    return [];
};

const fetchContributionDays = async (login, fromIso, toIso, headers) => {
    const query = `
        query($login: String!, $from: DateTime!, $to: DateTime!) {
            user(login: $login) {
                contributionsCollection(from: $from, to: $to) {
                    contributionCalendar {
                        weeks {
                            contributionDays {
                                date
                                contributionCount
                            }
                        }
                    }
                }
            }
        }
    `;
    const data = await requestGraphql(query, {login, from: fromIso, to: toIso}, headers);
    const weeks =
        data?.user?.contributionsCollection?.contributionCalendar?.weeks ?? [];
    const days = [];
    weeks.forEach((week) => {
        const contributionDays = Array.isArray(week?.contributionDays)
            ? week.contributionDays
            : [];
        contributionDays.forEach((day) => {
            if (!day?.date) return;
            days.push({
                date: day.date,
                count: day.contributionCount ?? 0,
            });
        });
    });
    return days.sort((a, b) => String(a.date).localeCompare(String(b.date)));
};

const loadExisting = async () => {
    try {
        const raw = await fs.readFile(METRICS_PATH, 'utf8');
        return JSON.parse(raw);
    } catch {
        return null;
    }
};

const trimSnapshots = (snapshots, cutoffMs) =>
    snapshots.filter((snapshot) => new Date(snapshot.date).getTime() >= cutoffMs);

const WEEK_MS = 7 * DAY_MS;
const trimWeeks = (weeks, cutoffMs) =>
    weeks.filter((week) => week.week * 1000 + WEEK_MS >= cutoffMs);

const parseRetentionDays = () => {
    const raw = process.env.GITHUB_METRICS_RETENTION_DAYS;
    if (!raw) return 365;
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed < 0) {
        console.warn(
            `Invalid GITHUB_METRICS_RETENTION_DAYS "${raw}". Using 365 days.`,
        );
        return 365;
    }
    return parsed;
};

const writePayload = async (payload) => {
    const serialized = `${JSON.stringify(payload, null, 2)}\n`;
    try {
        await fs.writeFile(TEMP_PATH, serialized, 'utf8');
        await fs.rename(TEMP_PATH, METRICS_PATH);
    } catch (error) {
        await fs.writeFile(METRICS_PATH, serialized, 'utf8');
        try {
            await fs.unlink(TEMP_PATH);
        } catch {
            // ignore temp cleanup
        }
        if (error && error.code && !['EPERM', 'EEXIST'].includes(error.code)) {
            throw error;
        }
    }
};

const DEFAULT_MIN_INTERVAL_MS = 60 * 60 * 1000;

const readLock = async () => {
    try {
        const raw = await fs.readFile(LOCK_PATH, 'utf8');
        const parsed = JSON.parse(raw);
        if (!parsed?.startedAt) return null;
        return parsed;
    } catch {
        return null;
    }
};

const writeLock = async (payload) => {
    await fs.writeFile(LOCK_PATH, JSON.stringify(payload, null, 2), 'utf8');
};

const clearLock = async () => {
    try {
        await fs.unlink(LOCK_PATH);
    } catch {
        // ignore missing lock
    }
};

const fileStore = {
    getHistory: loadExisting,
    saveHistory: writePayload,
    getLock: readLock,
    setLock: writeLock,
    clearLock,
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

const resolveAdapterModule = async (adapterPath) => {
    if (!adapterPath) {
        throw new Error('Missing metrics store adapter path.');
    }
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
};

const resolveStore = async () => {
    const mode = process.env.METRICS_STORE;
    const adapterPath = resolveAdapterPath();
    const useAdapter = mode !== 'file' && (mode === 'custom' || Boolean(adapterPath));
    if (useAdapter) {
        try {
            if (!adapterPath) {
                console.warn('Metrics store adapter not configured. Using file store.');
                return fileStore;
            }
            const adapter = await resolveAdapterModule(adapterPath);
            const factory =
                adapter.createMetricsStore ??
                adapter.default ??
                adapter.metricsStore ??
                adapter;
            const store = typeof factory === 'function' ? await factory() : factory;
            if (
                store?.getHistory &&
                store?.saveHistory &&
                store?.getLock &&
                store?.setLock &&
                store?.clearLock
            ) {
                return store;
            }
            console.warn('Custom metrics store missing required methods. Using file store.');
        } catch (error) {
            console.warn(`Custom metrics store load failed: ${error}`);
        }
    }
    return fileStore;
};

const updateGithubMetrics = async (options = {}) => {
    const shouldLoadEnv = options.loadEnv !== false;
    const forceUpdate = options.force === true;
    if (shouldLoadEnv) {
        await loadEnv();
    }
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
        throw new Error('Missing GITHUB_TOKEN.');
    }

    let lockCreated = false;
    let activeStore = null;

    try {
        const store = await resolveStore();
        activeStore = store;
        const existingLock = await store.getLock();
        const lockStartedAt = existingLock?.startedAt
            ? new Date(existingLock.startedAt).getTime()
            : 0;
        if (lockStartedAt && Date.now() - lockStartedAt < LOCK_STALE_MS) {
            return {status: 'in_progress'};
        }
        const existing = await store.getHistory();
        const minIntervalRaw = process.env.METRICS_UPDATE_MIN_INTERVAL_MS ?? '';
        let minIntervalMs = DEFAULT_MIN_INTERVAL_MS;
        if (String(minIntervalRaw).trim() !== '') {
            const parsed = Number.parseInt(minIntervalRaw, 10);
            if (Number.isFinite(parsed) && parsed >= 0) {
                minIntervalMs = parsed;
            } else {
                console.warn(
                    `Invalid METRICS_UPDATE_MIN_INTERVAL_MS "${minIntervalRaw}". Using default ${DEFAULT_MIN_INTERVAL_MS}ms.`,
                );
            }
        }
        if (!forceUpdate && minIntervalMs > 0) {
            const updatedAt = existing?.generatedAt ? Date.parse(existing.generatedAt) : 0;
            if (updatedAt && Date.now() - updatedAt < minIntervalMs) {
                return {
                    status: 'skipped',
                    updatedAt: existing?.generatedAt ?? null,
                    nextAllowedAt: new Date(updatedAt + minIntervalMs).toISOString(),
                };
            }
        }
        await store.setLock({pid: process.pid, startedAt: new Date().toISOString()});
        lockCreated = true;
        const headers = {
            Accept: 'application/vnd.github+json',
            Authorization: `Bearer ${token}`,
        };
        const login = await resolveLogin(headers);
        const repos = await fetchRepos(login, headers);
        const now = new Date();
        const snapshotDate = now.toISOString().slice(0, 10);
        const retentionDays = parseRetentionDays();
        const snapshotCutoff = retentionDays
            ? now.getTime() - retentionDays * 24 * 60 * 60 * 1000
            : 0;
        const contributionWindowDays =
            retentionDays && retentionDays > 0 ? retentionDays : 365;
        const contributionsFrom = new Date(
            now.getTime() - contributionWindowDays * DAY_MS,
        ).toISOString();
        const contributionsTo = now.toISOString();
        let contributions = existing?.contributions ?? null;
        try {
            const days = await fetchContributionDays(
                login,
                contributionsFrom,
                contributionsTo,
                headers,
            );
            if (days.length > 0) {
                contributions = {
                    from: contributionsFrom,
                    to: contributionsTo,
                    days: days.slice(-contributionWindowDays),
                };
            }
        } catch (error) {
            console.warn(`GitHub contributions fetch failed: ${error}`);
        }
        const existingMap = new Map(
            Array.isArray(existing?.repos)
                ? existing.repos.map((repo) => [repo.fullName, repo])
                : [],
        );

        const ownedRepos = repos.filter(
            (repo) =>
                !repo.private &&
                !repo.fork &&
                !repo.archived &&
                repo.owner?.login === login,
        );

        const progress = {
            totalRepos: ownedRepos.length,
            processedRepos: 0,
            startedAt: now.toISOString(),
            updatedAt: now.toISOString(),
            finishedAt: null,
        };
        const basePayload = {
            generatedAt: now.toISOString(),
            user: login,
            progress,
            contributions: contributions ?? undefined,
            repos: ownedRepos.map((repo) => {
                const previous = existingMap.get(repo.full_name);
                return {
                    id: repo.id,
                    name: repo.name,
                    fullName: repo.full_name,
                    description: repo.description ?? null,
                    htmlUrl: repo.html_url,
                    stars: repo.stargazers_count ?? 0,
                    forks: repo.forks_count ?? 0,
                    pushedAt: repo.pushed_at ?? null,
                    visibility: repo.private ? 'private' : 'public',
                    updatedAt: previous?.updatedAt ?? null,
                    weeks: Array.isArray(previous?.weeks) ? previous.weeks : [],
                    snapshots: Array.isArray(previous?.snapshots)
                        ? previous.snapshots
                        : [],
                };
            }),
        };
        const repoIndex = new Map(
            basePayload.repos.map((repo, index) => [repo.fullName, index]),
        );

        let processedRepos = 0;
        for (const repo of ownedRepos) {
            const fullName = repo.full_name;
            const contributorStats = await fetchContributorStats(fullName, headers);
            const contributor = contributorStats.find(
                (entry) => entry.author && entry.author.login === login,
            );
            const weeks = Array.isArray(contributor?.weeks)
                ? contributor.weeks.map((week) => ({
                      week: week.w,
                      commits: week.c,
                      additions: week.a,
                      deletions: week.d,
                  }))
                : [];
            const trimmedWeeks = retentionDays
                ? trimWeeks(weeks, snapshotCutoff)
                : weeks;
            const previous = existingMap.get(fullName);
            const previousSnapshots = Array.isArray(previous?.snapshots)
                ? previous.snapshots
                : [];
            const trimmedSnapshots = retentionDays
                ? trimSnapshots(previousSnapshots, snapshotCutoff).filter(
                      (snapshot) => snapshot.date !== snapshotDate,
                  )
                : previousSnapshots.filter((snapshot) => snapshot.date !== snapshotDate);
            const snapshots = [
                ...trimmedSnapshots,
                {
                    date: snapshotDate,
                    stars: repo.stargazers_count ?? 0,
                    forks: repo.forks_count ?? 0,
                    pushedAt: repo.pushed_at ?? null,
                },
            ];

            const updatedRepo = {
                id: repo.id,
                name: repo.name,
                fullName: repo.full_name,
                description: repo.description ?? null,
                htmlUrl: repo.html_url,
                stars: repo.stargazers_count ?? 0,
                forks: repo.forks_count ?? 0,
                pushedAt: repo.pushed_at ?? null,
                visibility: repo.private ? 'private' : 'public',
                weeks: trimmedWeeks,
                snapshots,
                updatedAt: new Date().toISOString(),
            };
            const index = repoIndex.get(fullName);
            if (index !== undefined) {
                basePayload.repos[index] = updatedRepo;
            } else {
                basePayload.repos.push(updatedRepo);
            }
            processedRepos += 1;
            basePayload.progress.processedRepos = processedRepos;
            basePayload.progress.updatedAt = new Date().toISOString();
            basePayload.generatedAt = basePayload.progress.updatedAt;
            await store.saveHistory(basePayload);
            await sleep(250);
        }

        basePayload.repos.sort((a, b) => {
            if (!a.pushedAt) return 1;
            if (!b.pushedAt) return -1;
            return a.pushedAt < b.pushedAt ? 1 : -1;
        });

        basePayload.progress.processedRepos = basePayload.progress.totalRepos;
        basePayload.progress.finishedAt = new Date().toISOString();
        basePayload.progress.updatedAt = basePayload.progress.finishedAt;
        basePayload.generatedAt = basePayload.progress.finishedAt;
        await store.saveHistory(basePayload);
        console.log(`Updated GitHub metrics for ${basePayload.repos.length} repos.`);
        return {status: 'updated', repos: basePayload.repos.length, updatedAt: basePayload.generatedAt};
    } finally {
        if (lockCreated && activeStore?.clearLock) {
            await activeStore.clearLock();
        }
    }
};

if (require.main === module) {
    updateGithubMetrics()
        .catch((error) => {
            console.error(error);
            process.exitCode = 1;
        });
}

module.exports = {updateGithubMetrics, loadEnv};
