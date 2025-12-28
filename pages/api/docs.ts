import type {NextApiRequest, NextApiResponse} from 'next';
import {getDocBySlug} from '../../lib/docs';

type DocsApiResponse = {
    doc?: Awaited<ReturnType<typeof getDocBySlug>>;
    error?: string;
};

const parseSlug = (slug: string | string[] | undefined) => {
    if (!slug) return [];
    if (Array.isArray(slug)) return slug.filter(Boolean);
    return slug
        .split('/')
        .map((part) => part.trim())
        .filter(Boolean);
};

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<DocsApiResponse>,
) {
    if (req.method && req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return res.status(405).json({error: 'Method not allowed.'});
    }

    try {
        const slug = parseSlug(req.query.slug);
        const doc = await getDocBySlug(slug);
        return res.status(200).json({doc});
    } catch (error) {
        return res.status(404).json({error: 'Documentation not found.'});
    }
}
