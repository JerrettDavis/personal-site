const fs = require('fs/promises');
const path = require('path');

const OUTPUT_PATH = path.join(process.cwd(), 'data', 'nuget-packages.json');
const GENERATED_PROJECTS_PATH = path.join(process.cwd(), 'data', 'projects.generated.ts');
const ENV_FILES = ['.env.local', '.env'];
const NUGET_PROFILE_ENV = 'NUGET_PROFILE';
const NUGET_PROFILE_URL_ENV = 'NUGET_PROFILE_URL';
const MAX_PROFILE_PAGES = 10;
const NUGET_SEARCH_URL = 'https://api-v2v3search-0.nuget.org/query';
const MAX_GITHUB_PAGES = 10;
const REPORT_LIMIT_ENV = 'NUGET_REPORT_LIMIT';
const DEFAULT_REPORT_LIMIT = 20;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

const readProjectsSource = async () => {
    const sourcePath = path.join(process.cwd(), 'data', 'projects.ts');
    return fs.readFile(sourcePath, 'utf8');
};

const readGeneratedProjectsSource = async () => {
    try {
        return await fs.readFile(GENERATED_PROJECTS_PATH, 'utf8');
    } catch {
        return '';
    }
};

const extractGithubUsername = (source) => {
    const match = source.match(/GITHUB_USERNAME\s*=\s*'([^']+)'/);
    return match ? match[1] : null;
};

const extractRepos = (source, defaultOwner) => {
    const repos = new Set();
    const regex = /repo:\s*'([^']+)'/g;
    let match;
    while ((match = regex.exec(source)) !== null) {
        const repo = match[1];
        if (!repo) continue;
        if (repo.includes('/')) {
            repos.add(repo);
        } else if (defaultOwner) {
            repos.add(`${defaultOwner}/${repo}`);
        }
    }
    return Array.from(repos.values());
};

const extractNugetProfileName = (source) => {
    const match = source.match(/NUGET_PROFILE\s*=\s*'([^']+)'/);
    return match ? match[1] : null;
};

const buildGithubHeaders = () => {
    const headers = {
        Accept: 'application/vnd.github+json',
    };
    if (process.env.GITHUB_TOKEN) {
        headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }
    return headers;
};

const fetchGithubRepos = async (owner) => {
    if (!owner) return [];
    const repos = new Set();
    const headers = buildGithubHeaders();
    const perPage = 100;
    for (let page = 1; page <= MAX_GITHUB_PAGES; page += 1) {
        const url = new URL(`https://api.github.com/users/${owner}/repos`);
        url.searchParams.set('per_page', String(perPage));
        url.searchParams.set('page', String(page));
        url.searchParams.set('type', 'owner');
        const response = await fetch(url.toString(), {headers});
        if (!response.ok) {
            break;
        }
        const payload = await response.json();
        if (!Array.isArray(payload) || payload.length === 0) {
            break;
        }
        payload.forEach((repo) => {
            if (repo?.fork) return;
            const fullName = repo?.full_name || (repo?.name ? `${owner}/${repo.name}` : null);
            if (fullName) {
                repos.add(fullName);
            }
        });
        if (payload.length < perPage) {
            break;
        }
        await sleep(120);
    }
    return Array.from(repos.values());
};

const resolveProfileName = (profileName) => {
    if (process.env[NUGET_PROFILE_URL_ENV]) {
        try {
            const profileUrl = new URL(process.env[NUGET_PROFILE_URL_ENV]);
            const parts = profileUrl.pathname.split('/').filter(Boolean);
            const name = parts[parts.length - 1];
            if (name) return name;
        } catch {
            // ignore invalid URL
        }
    }
    return profileName || null;
};

const fetchSearchPage = async (query, skip, take) => {
    const url = new URL(NUGET_SEARCH_URL);
    url.searchParams.set('q', query);
    url.searchParams.set('prerelease', 'true');
    url.searchParams.set('semVerLevel', '2.0.0');
    url.searchParams.set('skip', String(skip));
    url.searchParams.set('take', String(take));
    const response = await fetch(url.toString());
    if (!response.ok) {
        return null;
    }
    return response.json();
};

const extractIdsFromSearch = (payload) => {
    if (!payload || !Array.isArray(payload.data)) return [];
    return payload.data
        .map((entry) => (entry?.id ? String(entry.id).trim() : ''))
        .filter(Boolean);
};

const fetchPackagesForQuery = async (query) => {
    const packages = new Set();
    const take = 100;
    let skip = 0;
    let totalHits = 0;
    let pageCount = 0;
    do {
        const payload = await fetchSearchPage(query, skip, take);
        if (!payload) break;
        extractIdsFromSearch(payload).forEach((id) => packages.add(id));
        totalHits = Number(payload.totalHits ?? 0);
        if (!Number.isFinite(totalHits)) {
            totalHits = 0;
        }
        skip += take;
        pageCount += 1;
        if (skip < totalHits) {
            await sleep(120);
        }
    } while (skip < totalHits && pageCount < MAX_PROFILE_PAGES);
    return packages;
};

const fetchProfilePackages = async (profileName) => {
    const resolvedName = resolveProfileName(profileName);
    if (!resolvedName) return [];
    const packages = new Set();
    const queries = [`owner:${resolvedName}`, `author:${resolvedName}`];
    for (const query of queries) {
        const matches = await fetchPackagesForQuery(query);
        matches.forEach((id) => packages.add(id));
    }
    return Array.from(packages.values());
};

const normalizeRepoUrl = (url) =>
    url
        .toLowerCase()
        .replace(/\.git$/, '')
        .replace(/\/$/, '');

const buildRepoNameIndex = (repos) => {
    const index = new Map();
    repos.forEach((repo) => {
        const parts = repo.split('/');
        const name = parts[parts.length - 1]?.toLowerCase();
        if (!name) return;
        const existing = index.get(name) ?? [];
        existing.push(repo);
        index.set(name, existing);
    });
    return index;
};

const matchRepoByName = (repoNameIndex, repoName) => {
    if (!repoName) return null;
    const matches = repoNameIndex.get(repoName.toLowerCase()) ?? [];
    if (matches.length === 1) return matches[0];
    return null;
};

const matchRepoFromUrl = (repos, repoNameIndex, url) => {
    if (!url) return null;
    const normalized = normalizeRepoUrl(url);
    for (const repo of repos) {
        const repoPath = `github.com/${repo.toLowerCase()}`;
        if (normalized.includes(repoPath)) {
            return repo;
        }
    }
    const match = normalized.match(/github\.com\/([^/]+)\/([^/]+)$/i);
    if (match?.[2]) {
        return matchRepoByName(repoNameIndex, match[2]);
    }
    return null;
};

const matchesPrefix = (repoName, packageId) => {
    if (!repoName || !packageId) return false;
    const repoLower = repoName.toLowerCase();
    const pkgLower = packageId.toLowerCase();
    if (pkgLower === repoLower) return true;
    return (
        pkgLower.startsWith(`${repoLower}.`) ||
        pkgLower.startsWith(`${repoLower}-`) ||
        pkgLower.startsWith(`${repoLower}_`)
    );
};

const matchRepoFromPackageId = (repoNameIndex, packageId) => {
    if (!packageId) return null;
    for (const repoName of repoNameIndex.keys()) {
        if (matchesPrefix(repoName, packageId)) {
            const matched = matchRepoByName(repoNameIndex, repoName);
            if (matched) return matched;
        }
    }
    return null;
};

const fetchNugetRegistration = async (packageId) => {
    const url = `https://api.nuget.org/v3/registration5-gz-semver2/${packageId.toLowerCase()}/index.json`;
    const response = await fetch(url);
    if (!response.ok) {
        return null;
    }
    return response.json();
};

const extractRepositoryFromRegistration = async (registration) => {
    if (!registration?.items?.length) return {url: null, source: null};
    const pages = registration.items;
    const pageCandidates = [];
    for (const page of pages) {
        if (Array.isArray(page?.items)) {
            pageCandidates.push(...page.items);
            continue;
        }
        if (page?.['@id']) {
            const pageResponse = await fetch(page['@id']);
            if (pageResponse.ok) {
                const pageJson = await pageResponse.json();
                if (Array.isArray(pageJson?.items)) {
                    pageCandidates.push(...pageJson.items);
                }
            }
        }
    }
    if (pageCandidates.length === 0) return {url: null, source: null};
    for (let index = pageCandidates.length - 1; index >= 0; index -= 1) {
        const entry = pageCandidates[index];
        const catalog = entry?.catalogEntry ?? entry ?? null;
        if (!catalog) continue;
        if (catalog.repository?.url) {
            return {url: catalog.repository.url, source: 'repository'};
        }
        if (catalog.projectUrl) {
            return {url: catalog.projectUrl, source: 'projectUrl'};
        }
    }
    return {url: null, source: null};
};

const updateNugetPackages = async () => {
    await loadEnv();
    const source = await readProjectsSource();
    const generatedSource = await readGeneratedProjectsSource();
    const owner = extractGithubUsername(source);
    const reposFromFile = extractRepos(source, owner);
    const reposFromGenerated = extractRepos(generatedSource, owner);
    const reposFromGithub = await fetchGithubRepos(owner);
    const repos = Array.from(
        new Set([
            ...reposFromFile,
            ...reposFromGenerated,
            ...reposFromGithub,
        ]),
    );
    const defaultProfile =
        process.env[NUGET_PROFILE_ENV] ||
        extractNugetProfileName(source) ||
        'JerrettDavis';
    const output = {
        generatedAt: new Date().toISOString(),
        repos: {},
    };

    const repoSet = Array.from(
        new Set(repos.map((repo) => repo.toLowerCase())),
    );
    const repoNameIndex = buildRepoNameIndex(repoSet);
    if (process.env.NUGET_DEBUG === '1') {
        console.log(`Repo count: ${repoSet.length}`);
        console.log(
            `Repo name index includes ExperimentFramework: ${repoNameIndex.has('experimentframework')}`,
        );
        console.log(
            `Repo name index includes Slncs: ${repoNameIndex.has('slncs')}`,
        );
    }
    const profilePackages = await fetchProfilePackages(defaultProfile);
    if (profilePackages.length === 0) {
        console.warn('No packages found from NuGet profile.');
    }

    const mappedPackages = new Set();
    const unmappedDetails = [];
    for (const packageId of profilePackages) {
        const registration = await fetchNugetRegistration(packageId);
        if (!registration) {
            unmappedDetails.push({
                id: packageId,
                reason: 'registration_missing',
            });
            continue;
        }
        const repoInfo = await extractRepositoryFromRegistration(registration);
        const repoUrl = repoInfo?.url ?? null;
        let matchedRepo = repoUrl
            ? matchRepoFromUrl(repoSet, repoNameIndex, repoUrl)
            : null;
        if (!matchedRepo) {
            matchedRepo = matchRepoFromPackageId(repoNameIndex, packageId);
        }
        if (!matchedRepo && process.env.NUGET_DEBUG === '1') {
            if (
                packageId.toLowerCase().startsWith('experimentframework') ||
                packageId.toLowerCase().startsWith('slncs')
            ) {
                console.log(`Debug: prefix match failed for ${packageId}`);
            }
        }
        if (!matchedRepo) {
            if (repoUrl) {
                unmappedDetails.push({
                    id: packageId,
                    reason: 'repo_not_in_list',
                    repoUrl,
                });
            } else {
                unmappedDetails.push({
                    id: packageId,
                    reason: 'missing_repo_url',
                });
            }
            await sleep(150);
            continue;
        }
        const key = matchedRepo.toLowerCase();
        const existing = Array.isArray(output.repos[key])
            ? output.repos[key]
            : [];
        output.repos[key] = Array.from(new Set([...existing, packageId])).sort();
        mappedPackages.add(packageId);
        await sleep(150);
    }

    const serialized = `${JSON.stringify(output, null, 2)}\n`;
    await fs.writeFile(OUTPUT_PATH, serialized, 'utf8');
    const reportLimit = Math.max(
        0,
        Number.parseInt(process.env[REPORT_LIMIT_ENV] || String(DEFAULT_REPORT_LIMIT), 10),
    );
    const unmapped = profilePackages.filter((pkg) => !mappedPackages.has(pkg));
    const unmappedByReason = unmappedDetails.reduce((acc, entry) => {
        acc[entry.reason] = (acc[entry.reason] || 0) + 1;
        return acc;
    }, {});
    console.log(`NuGet mapping updated for ${Object.keys(output.repos).length} repos.`);
    console.log(`Packages found: ${profilePackages.length}`);
    console.log(`Packages mapped: ${mappedPackages.size}`);
    console.log(`Packages unmapped: ${unmapped.length}`);
    if (Object.keys(unmappedByReason).length > 0) {
        console.log('Unmapped reasons:');
        Object.entries(unmappedByReason)
            .sort((a, b) => b[1] - a[1])
            .forEach(([reason, count]) => console.log(`- ${reason}: ${count}`));
    }
    if (reportLimit > 0 && unmapped.length > 0) {
        console.log(`Unmapped packages (first ${Math.min(reportLimit, unmapped.length)}):`);
        unmappedDetails.slice(0, reportLimit).forEach((entry) => {
            const suffix = entry.repoUrl ? ` -> ${entry.repoUrl}` : '';
            console.log(`- ${entry.id} (${entry.reason})${suffix}`);
        });
    }
    const topRepos = Object.entries(output.repos)
        .map(([repo, packages]) => ({repo, count: packages.length}))
        .sort((a, b) => b.count - a.count)
        .slice(0, reportLimit || DEFAULT_REPORT_LIMIT);
    if (topRepos.length > 0) {
        console.log('Top repos by package count:');
        topRepos.forEach((entry) => console.log(`- ${entry.repo}: ${entry.count}`));
    }
    return output;
};

if (require.main === module) {
    updateNugetPackages().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}

module.exports = {updateNugetPackages};
