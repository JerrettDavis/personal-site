export interface GitHubRepo {
    id: number;
    name: string;
    full_name: string;
    description: string | null;
    html_url: string;
    homepage: string | null;
    language: string | null;
    topics?: string[];
    stargazers_count: number;
    forks_count: number;
    archived: boolean;
    fork: boolean;
    pushed_at: string;
    updated_at: string;
}

export interface GitHubRepoFetchResult {
    repos: GitHubRepo[];
    error: string | null;
}

interface RepoFetchOptions {
    username: string;
    lookbackDays?: number;
    includeForks?: boolean;
    includeArchived?: boolean;
}

const getLookbackDate = (lookbackDays: number) => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - lookbackDays);
    return cutoff;
};

export const getActiveRepos = async ({
                                         username,
                                         lookbackDays = 365,
                                         includeForks = false,
                                         includeArchived = false,
                                     }: RepoFetchOptions): Promise<GitHubRepoFetchResult> => {
    const url = `https://api.github.com/users/${username}/repos?per_page=100&sort=updated&direction=desc`;
    const headers: Record<string, string> = {
        Accept: 'application/vnd.github+json, application/vnd.github.mercy-preview+json',
    };

    if (process.env.GITHUB_TOKEN) {
        headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    try {
        const response = await fetch(url, {headers});
        if (!response.ok) {
            const errorMessage = `GitHub repo fetch failed: ${response.status} ${response.statusText}`;
            console.warn(errorMessage);
            return {repos: [], error: errorMessage};
        }

        const repos = (await response.json()) as GitHubRepo[];
        const cutoff = getLookbackDate(lookbackDays);

        return {
            repos: repos
                .filter((repo) => (includeForks ? true : !repo.fork))
                .filter((repo) => (includeArchived ? true : !repo.archived))
                .filter((repo) => new Date(repo.pushed_at) >= cutoff)
                .sort((a, b) => (a.pushed_at < b.pushed_at ? 1 : -1)),
            error: null,
        };
    } catch (error) {
        const errorMessage = `GitHub repo fetch failed: ${error}`;
        console.warn(errorMessage);
        return {repos: [], error: errorMessage};
    }
};
