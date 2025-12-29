import type {NextApiRequest, NextApiResponse} from 'next';
import type {ProjectDetailResponse} from '../../lib/projectDetails';

type RefreshResponse = {
    ok: boolean;
    message?: string;
    data?: ProjectDetailResponse;
    refreshLockedUntil?: string | null;
    rateLimitedUntil?: string | null;
};

const getAuthToken = (req: NextApiRequest, body: Record<string, unknown>) => {
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) {
        return header.slice('Bearer '.length).trim();
    }
    const tokenFromHeader = req.headers['x-project-detail-refresh-token'];
    if (typeof tokenFromHeader === 'string' && tokenFromHeader.trim()) {
        return tokenFromHeader.trim();
    }
    if (typeof req.query.token === 'string' && req.query.token.trim()) {
        return req.query.token.trim();
    }
    if (typeof body.token === 'string' && body.token.trim()) {
        return body.token.trim();
    }
    return '';
};

const parseBody = (req: NextApiRequest) => {
    if (!req.body) return {};
    if (typeof req.body === 'object') return req.body as Record<string, unknown>;
    if (typeof req.body === 'string') {
        try {
            return JSON.parse(req.body) as Record<string, unknown>;
        } catch {
            return {};
        }
    }
    return {};
};

const getBaseUrl = (req: NextApiRequest) => {
    const proto = (req.headers['x-forwarded-proto'] ?? 'http') as string;
    const host = req.headers.host ?? 'localhost:3000';
    return `${proto}://${host}`;
};

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<RefreshResponse>,
) {
    if (req.method && !['GET', 'POST'].includes(req.method)) {
        return res.status(405).json({ok: false, message: 'Method not allowed.'});
    }

    const body = parseBody(req);
    const repoParam = Array.isArray(req.query.repo)
        ? req.query.repo[0]
        : req.query.repo;
    const repoFromBody =
        typeof body.repo === 'string' ? body.repo.trim() : '';
    const repo = typeof repoParam === 'string' ? repoParam.trim() : repoFromBody;

    if (!repo) {
        return res.status(400).json({ok: false, message: 'Missing repo name.'});
    }

    const secret = process.env.PROJECT_DETAIL_REFRESH_SECRET;
    if (secret) {
        const token = getAuthToken(req, body);
        if (!token || token !== secret) {
            return res.status(401).json({ok: false, message: 'Unauthorized.'});
        }
    }

    try {
        const baseUrl = getBaseUrl(req);
        const url = new URL('/api/project-details', baseUrl);
        url.searchParams.set('repo', repo);
        url.searchParams.set('refresh', '1');

        const response = await fetch(url.toString(), {
            headers: {
                Accept: 'application/json',
            },
        });
        const payload = (await response.json()) as ProjectDetailResponse;
        return res.status(200).json({
            ok: true,
            data: payload,
            refreshLockedUntil: payload.refreshLockedUntil ?? null,
            rateLimitedUntil: payload.rateLimitedUntil ?? null,
        });
    } catch (error) {
        return res.status(500).json({
            ok: false,
            message: `Refresh failed: ${error}`,
        });
    }
}
