import {
    clearInFlight,
    getCacheEntry,
    getInFlight,
    setCacheEntry,
    setInFlight,
} from './cacheStore';
import fs from 'fs';
import path from 'path';
import type {ProjectMeta} from '../data/projects';
import {GITHUB_USERNAME, PROJECTS} from '../data/projects';

export type NugetPackageSnapshot = {
    id: string;
    totalDownloads: number;
    version: string | null;
    url: string | null;
};

export type NugetMetricsResponse = {
    packages: NugetPackageSnapshot[];
    totalDownloads: number;
    fetchedAt: string;
    error?: string | null;
    refreshLockedUntil?: string | null;
};

const NUGET_CACHE_PREFIX = 'nuget-package';
const NUGET_TTL_MS = 6 * 60 * 60 * 1000;
const NUGET_STALE_MS = 24 * 60 * 60 * 1000;
const MAX_PACKAGES = 24;
const NUGET_MAP_PATH = path.join(process.cwd(), 'data', 'nuget-packages.json');

type NugetPackageMap = {
    generatedAt?: string;
    repos?: Record<string, string[]>;
};

let nugetMapCache: Record<string, string[]> | null | undefined;

const resolveOverrideName = (repo: string) =>
    repo.includes('/') ? repo : `${GITHUB_USERNAME}/${repo}`;

const normalizePackageList = (values: unknown) => {
    if (!Array.isArray(values)) return [];
    return values
        .map((value) => (typeof value === 'string' ? value.trim() : ''))
        .filter(Boolean);
};

const loadNugetPackageMap = () => {
    if (nugetMapCache !== undefined) {
        return nugetMapCache;
    }
    try {
        const raw = fs.readFileSync(NUGET_MAP_PATH, 'utf8');
        const parsed = JSON.parse(raw) as NugetPackageMap;
        const repos: Record<string, string[]> = {};
        if (parsed?.repos && typeof parsed.repos === 'object') {
            Object.entries(parsed.repos).forEach(([repo, values]) => {
                const packages = normalizePackageList(values);
                if (packages.length > 0) {
                    repos[repo.toLowerCase()] = packages;
                }
            });
        }
        nugetMapCache = repos;
    } catch {
        nugetMapCache = null;
    }
    return nugetMapCache;
};

const getMappedPackagesForRepo = (fullName: string) => {
    const map = loadNugetPackageMap();
    if (!map) return [];
    return map[fullName.toLowerCase()] ?? [];
};

export const parseNugetPackageId = (url: string) => {
    try {
        const parsed = new URL(url);
        if (!parsed.hostname.includes('nuget.org')) return null;
        const parts = parsed.pathname.split('/').filter(Boolean);
        const packageIndex = parts.findIndex((part) => part.toLowerCase() === 'packages');
        if (packageIndex === -1) return null;
        const id = parts[packageIndex + 1];
        return id ? decodeURIComponent(id) : null;
    } catch {
        return null;
    }
};

export const collectNugetPackages = (meta: ProjectMeta | null): string[] => {
    if (!meta) return [];
    const explicit = Array.isArray(meta.nugetPackages) ? meta.nugetPackages : [];
    const linkPackages = (meta.links ?? [])
        .map((link) => parseNugetPackageId(link.url))
        .filter((value): value is string => Boolean(value));
    return Array.from(new Set([...explicit, ...linkPackages]));
};

export const getNugetPackagesForRepo = (fullName: string): string[] => {
    const normalized = resolveOverrideName(fullName).toLowerCase();
    const meta =
        PROJECTS.find(
            (project) => resolveOverrideName(project.repo).toLowerCase() === normalized,
        ) ?? null;
    const explicitPackages = collectNugetPackages(meta);
    const mappedPackages = getMappedPackagesForRepo(normalized);
    return Array.from(new Set([...explicitPackages, ...mappedPackages]));
};

export const getNugetPackagesForProjects = () => {
    const mapped = loadNugetPackageMap();
    const mappedIds = mapped
        ? Object.keys(mapped)
            .sort((a, b) => a.localeCompare(b))
            .flatMap((repo) => mapped[repo] ?? [])
        : [];
    const ids = [
        ...PROJECTS.flatMap((project) => collectNugetPackages(project)),
        ...mappedIds,
    ];
    return Array.from(new Set(ids)).slice(0, MAX_PACKAGES);
};

type NugetSearchEntry = {
    id?: string;
    version?: string;
    totalDownloads?: number;
};

type NugetSearchResponse = {
    data?: NugetSearchEntry[];
};

const fetchNugetPackage = async (
    packageId: string,
): Promise<NugetPackageSnapshot | null> => {
    const url = new URL('https://api-v2v3search-0.nuget.org/query');
    url.searchParams.set('q', `packageid:${packageId}`);
    url.searchParams.set('prerelease', 'true');
    url.searchParams.set('semVerLevel', '2.0.0');
    const response = await fetch(url.toString());
    if (!response.ok) {
        throw new Error(`NuGet fetch failed (${response.status}).`);
    }
    const payload = (await response.json()) as NugetSearchResponse;
    const candidates = Array.isArray(payload.data) ? payload.data : [];
    if (candidates.length === 0) return null;
    const match =
        candidates.find((entry) => entry.id?.toLowerCase() === packageId.toLowerCase())
        ?? candidates[0];
    if (!match?.id) return null;
    return {
        id: match.id,
        totalDownloads: match.totalDownloads ?? 0,
        version: match.version ?? null,
        url: `https://www.nuget.org/packages/${encodeURIComponent(match.id)}`,
    };
};

export const getNugetSnapshot = async (
    packageId: string,
): Promise<NugetPackageSnapshot | null> => {
    const cacheKey = `${NUGET_CACHE_PREFIX}:${packageId.toLowerCase()}`;
    const now = Date.now();
    const cacheEntry = getCacheEntry<NugetPackageSnapshot>(cacheKey);
    if (cacheEntry && now < cacheEntry.expiresAt) {
        return cacheEntry.data;
    }
    const inflight = getInFlight<NugetPackageSnapshot>(cacheKey);
    if (inflight) {
        return inflight;
    }
    const promise = fetchNugetPackage(packageId)
        .then((snapshot) => {
            if (snapshot) {
                setCacheEntry(cacheKey, snapshot, NUGET_TTL_MS, NUGET_STALE_MS);
            }
            return snapshot;
        })
        .catch(() => {
            if (cacheEntry && now < cacheEntry.staleUntil) {
                return cacheEntry.data;
            }
            return null;
        })
        .finally(() => {
            clearInFlight(cacheKey);
        });
    setInFlight(cacheKey, promise);
    return promise;
};

export const fetchNugetPackageSnapshots = async (packageIds: string[]) => {
    const snapshots = await Promise.all(
        packageIds.map((id) => getNugetSnapshot(id)),
    );
    return snapshots.filter(
        (entry): entry is NugetPackageSnapshot => Boolean(entry),
    );
};
