import type {NextApiRequest, NextApiResponse} from 'next';
import type {ProjectDetailResponse} from '../../lib/projectDetails';
import {renderMarkdown} from '../../lib/markdown-render';
import {getActiveRepos} from '../../lib/github';
import {
    GITHUB_USERNAME,
    PROJECT_ACTIVITY_DAYS,
    PROJECT_OVERRIDES,
} from '../../data/projects';
import {
    checkManualRefresh,
    clearInFlight,
    getCacheEntry,
    getInFlight,
    getRateLimit,
    setCacheEntry,
    setInFlight,
    setRateLimit,
} from '../../lib/cacheStore';

type RepoPayload = {
    open_issues_count: number;
    html_url: string;
    private?: boolean;
    owner?: {login?: string | null};
    default_branch?: string | null;
};

type ReadmePayload = {
    content?: string;
    html_url?: string;
};

type PullPayload = {
    id: number;
};

type ReleasePayload = {
    tag_name: string;
    html_url: string;
    published_at: string | null;
};

const CACHE_PREFIX = 'project-detail';
const PROVIDER = 'github';
const DEFAULT_CACHE_TTL_MS = 10 * 60 * 1000;
const STALE_TTL_MS = 60 * 60 * 1000;
const MANUAL_REFRESH_COOLDOWN_MS = 60 * 1000;
const ALLOWLIST_CACHE_KEY = 'project-detail-allowlist';
const ALLOWLIST_TTL_MS = 10 * 60 * 1000;
const ALLOWLIST_STALE_MS = 60 * 60 * 1000;

const buildHeaders = () => {
    const headers: Record<string, string> = {
        Accept: 'application/vnd.github+json',
    };
    if (process.env.GITHUB_TOKEN) {
        headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }
    return headers;
};

type AllowlistResult = {
    allowlist: Set<string>;
    error: string | null;
};

const buildAllowlist = async (): Promise<AllowlistResult> => {
    const resolveOverrideName = (repo: string) =>
        repo.includes('/') ? repo : `${GITHUB_USERNAME}/${repo}`;
    const allowlist = new Set(
        PROJECT_OVERRIDES.map(
            (project) => resolveOverrideName(project.repo).toLowerCase(),       
        ),
    );
    const {repos, error} = await getActiveRepos({
        username: GITHUB_USERNAME,
        lookbackDays: PROJECT_ACTIVITY_DAYS,
        includeForks: false,
        includeArchived: false,
        onRateLimit: (until) => setRateLimit(PROVIDER, until, 'allowlist'),     
    });
    if (error) {
        console.warn(error);
    }
    repos.forEach((repo) => {
        allowlist.add(repo.full_name.toLowerCase());
    });
    return {allowlist, error};
};

const getAllowlist = async (): Promise<AllowlistResult> => {
    const now = Date.now();
    const cacheEntry = getCacheEntry<AllowlistResult>(ALLOWLIST_CACHE_KEY);
    if (cacheEntry && now < cacheEntry.expiresAt) {
        return cacheEntry.data;
    }
    const allowlistResult = await buildAllowlist();
    setCacheEntry(
        ALLOWLIST_CACHE_KEY,
        allowlistResult,
        ALLOWLIST_TTL_MS,
        ALLOWLIST_STALE_MS,
    );
    return allowlistResult;
};

const parseRateLimit = (headers: Headers) => {
    const remaining = Number(headers.get('x-ratelimit-remaining') ?? '1');
    if (Number.isNaN(remaining) || remaining > 0) return null;
    const reset = Number(headers.get('x-ratelimit-reset') ?? '0');
    if (!Number.isNaN(reset) && reset > 0) {
        return reset * 1000;
    }
    return Date.now() + 5 * 60 * 1000;
};

const updateRateLimit = (headers: Headers, reason: string) => {
    const limitReset = parseRateLimit(headers);
    if (limitReset) {
        setRateLimit(PROVIDER, limitReset, reason);
    }
    return limitReset;
};

const getCountFromLinkHeader = (linkHeader: string | null, fallback: number) => {
    if (!linkHeader) return fallback;
    const match = linkHeader.match(/page=(\d+)>; rel=\"last\"/);
    if (!match) return fallback;
    const value = Number(match[1]);
    return Number.isNaN(value) ? fallback : value;
};

const buildMarkdownSnippet = (content: string, maxLines = 18) => {
    const lines = content.split('\n');
    if (lines.length === 0) return {snippet: '', truncated: false};
    const truncated = lines.length > maxLines;
    const snippetLines = lines.slice(0, maxLines);
    const fenceCount = snippetLines.filter((line) => line.trim().startsWith('```')).length;
    if (fenceCount % 2 === 1) {
        snippetLines.push('```');
    }
    return {
        snippet: snippetLines.join('\n').trim(),
        truncated,
    };
};

const fetchRepoData = async (
    fullName: string,
    headers: Record<string, string>,
) => {
    const response = await fetch(`https://api.github.com/repos/${fullName}`, {
        headers,
    });
    updateRateLimit(response.headers, 'repo');
    if (!response.ok) {
        throw new Error(`Repo fetch failed (${response.status}).`);
    }
    return (await response.json()) as RepoPayload;
};

const fetchReadme = async (
    fullName: string,
    headers: Record<string, string>,
    defaultBranch?: string | null,
) => {
    const response = await fetch(`https://api.github.com/repos/${fullName}/readme`, {
        headers,
    });
    updateRateLimit(response.headers, 'readme');
    if (response.ok) {
        const payload = (await response.json()) as ReadmePayload;
        if (!payload.content) return null;
        const decoded = Buffer.from(payload.content, 'base64').toString('utf-8');
        const {snippet, truncated} = buildMarkdownSnippet(decoded);
        if (!snippet) return null;
        const contentHtml = await renderMarkdown(snippet, false);
        return {
            contentHtml,
            truncated,
            url: payload.html_url ?? null,
        };
    }

    const rawFallback = await fetchReadmeRaw(fullName, defaultBranch);
    if (rawFallback) return rawFallback;
    if (response.status === 404) return null;
    throw new Error(`Readme fetch failed (${response.status}).`);
};

const fetchReadmeRaw = async (
    fullName: string,
    defaultBranch?: string | null,
) => {
    const branches = [
        defaultBranch,
        defaultBranch === 'main' ? null : 'main',
        defaultBranch === 'master' ? null : 'master',
    ].filter((branch): branch is string => Boolean(branch));
    const candidates = [
        'README.md',
        'README.MD',
        'readme.md',
        'readme.MD',
        'README',
        'readme',
    ];
    for (const branch of branches) {
        for (const candidate of candidates) {
            const response = await fetch(
                `https://raw.githubusercontent.com/${fullName}/${branch}/${candidate}`,
            );
            if (!response.ok) continue;
            const content = await response.text();
            const {snippet, truncated} = buildMarkdownSnippet(content);
            if (!snippet) return null;
            const contentHtml = await renderMarkdown(snippet, false);
            return {
                contentHtml,
                truncated,
                url: `https://github.com/${fullName}/blob/${branch}/${candidate}`,
            };
        }
    }
    return null;
};

const fetchPullCount = async (
    fullName: string,
    headers: Record<string, string>,
) => {
    const response = await fetch(
        `https://api.github.com/repos/${fullName}/pulls?state=open&per_page=1`,
        {headers},
    );
    updateRateLimit(response.headers, 'pulls');
    if (!response.ok) {
        throw new Error(`Pull request fetch failed (${response.status}).`);
    }
    const payload = (await response.json()) as PullPayload[];
    const fallback = payload.length;
    return getCountFromLinkHeader(response.headers.get('link'), fallback);
};

const fetchLatestRelease = async (
    fullName: string,
    headers: Record<string, string>,
) => {
    const response = await fetch(
        `https://api.github.com/repos/${fullName}/releases/latest`,
        {headers},
    );
    updateRateLimit(response.headers, 'release');
    if (response.status === 404) return null;
    if (!response.ok) {
        throw new Error(`Release fetch failed (${response.status}).`);
    }
    const payload = (await response.json()) as ReleasePayload;
    return {
        tag: payload.tag_name,
        url: payload.html_url,
        publishedAt: payload.published_at,
    };
};

const buildPayload = async (
    fullName: string,
): Promise<ProjectDetailResponse> => {
    const headers = buildHeaders();
    const rateLimit = getRateLimit(PROVIDER);
    if (rateLimit) {
        return {
            repoFullName: fullName,
            readme: null,
            openIssues: null,
            openPulls: null,
            latestRelease: null,
            fetchedAt: new Date().toISOString(),
            error: 'GitHub rate limit reached.',
            rateLimitedUntil: new Date(rateLimit.until).toISOString(),
        };
    }

    const repoPayload = await fetchRepoData(fullName, headers);
    if (repoPayload.private) {
        return {
            repoFullName: fullName,
            readme: null,
            openIssues: null,
            openPulls: null,
            latestRelease: null,
            fetchedAt: new Date().toISOString(),
            error: 'Repository is private.',
        };
    }
    let readme: ProjectDetailResponse['readme'] = null;
    let openPulls: number | null = null;
    let latestRelease: ProjectDetailResponse['latestRelease'] = null;

    try {
        readme = await fetchReadme(fullName, headers, repoPayload.default_branch ?? null);
    } catch {
        readme = null;
    }

    try {
        openPulls = await fetchPullCount(fullName, headers);
    } catch {
        openPulls = null;
    }

    try {
        latestRelease = await fetchLatestRelease(fullName, headers);
    } catch {
        latestRelease = null;
    }

    const openIssues = openPulls === null
        ? repoPayload.open_issues_count
        : Math.max(repoPayload.open_issues_count - openPulls, 0);
    const rateLimitedUntil = getRateLimit(PROVIDER)?.until ?? null;

    return {
        repoFullName: fullName,
        readme,
        openIssues,
        openPulls,
        latestRelease,
        fetchedAt: new Date().toISOString(),
        rateLimitedUntil: rateLimitedUntil ? new Date(rateLimitedUntil).toISOString() : null,
    };
};

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<ProjectDetailResponse>,
) {
    try {
        const repo = typeof req.query.repo === 'string' ? req.query.repo : null;
        if (!repo) {
            return res.status(200).json({
                repoFullName: '',
                readme: null,
                openIssues: null,
                openPulls: null,
                latestRelease: null,
                fetchedAt: new Date().toISOString(),
                error: 'Missing repo query parameter.',
            });
        }

        const normalizedRepo = repo.trim().toLowerCase();
        const {allowlist, error: allowlistError} = await getAllowlist();
        const isOwnedRepo = normalizedRepo.startsWith(`${GITHUB_USERNAME}/`);
        if (!allowlist.has(normalizedRepo) && !(allowlistError && isOwnedRepo)) {
            return res.status(200).json({
                repoFullName: repo,
                readme: null,
                openIssues: null,
                openPulls: null,
                latestRelease: null,
                fetchedAt: new Date().toISOString(),
                error: 'Repository is not available.',
            });
        }

        const cacheKey = `${CACHE_PREFIX}:${repo.toLowerCase()}`;
        const now = Date.now();
        const forceRefresh = req.query.refresh === '1';
        const cacheEntry = getCacheEntry<ProjectDetailResponse>(cacheKey);
        const rateLimit = getRateLimit(PROVIDER);

        if (rateLimit) {
            if (cacheEntry && now < cacheEntry.staleUntil) {
                res.setHeader('Retry-After', Math.ceil((rateLimit.until - now) / 1000));
                return res.status(200).json({
                    ...cacheEntry.data,
                    rateLimitedUntil: new Date(rateLimit.until).toISOString(),
                });
            }
            res.setHeader('Retry-After', Math.ceil((rateLimit.until - now) / 1000));
            return res.status(200).json({
                repoFullName: repo,
                readme: null,
                openIssues: null,
                openPulls: null,
                latestRelease: null,
                fetchedAt: new Date().toISOString(),
                error: 'GitHub rate limit reached.',
                rateLimitedUntil: new Date(rateLimit.until).toISOString(),
            });
        }

        if (!forceRefresh && cacheEntry && now < cacheEntry.expiresAt) {
            res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1200');
            return res.status(200).json(cacheEntry.data);
        }

        if (forceRefresh) {
            const refresh = checkManualRefresh(cacheKey, MANUAL_REFRESH_COOLDOWN_MS);
            if (!refresh.allowed) {
                const refreshLockedUntil = new Date(refresh.nextAllowedAt).toISOString();
                if (cacheEntry) {
                    return res.status(200).json({
                        ...cacheEntry.data,
                        refreshLockedUntil,
                    });
                }
                return res.status(200).json({
                    repoFullName: repo,
                    readme: null,
                    openIssues: null,
                    openPulls: null,
                    latestRelease: null,
                    fetchedAt: new Date().toISOString(),
                    refreshLockedUntil,
                });
            }
        }

        const inflight = getInFlight<ProjectDetailResponse>(cacheKey);
        if (inflight) {
            const payload = await inflight;
            return res.status(200).json(payload);
        }

        const promise = buildPayload(repo)
            .then((payload) => {
                setCacheEntry(cacheKey, payload, DEFAULT_CACHE_TTL_MS, STALE_TTL_MS);
                return payload;
            })
            .finally(() => {
                clearInFlight(cacheKey);
            });
        setInFlight(cacheKey, promise);
        const payload = await promise;
        res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1200');
        return res.status(200).json(payload);
    } catch (error) {
        return res.status(200).json({
            repoFullName: '',
            readme: null,
            openIssues: null,
            openPulls: null,
            latestRelease: null,
            fetchedAt: new Date().toISOString(),
            error: `Project detail error: ${error}`,
        });
    }
}
