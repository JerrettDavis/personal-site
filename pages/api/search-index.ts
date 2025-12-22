import type {NextApiRequest, NextApiResponse} from 'next';
import {buildSearchIndex} from '../../lib/search';

const CACHE_TTL_MS = 5 * 60 * 1000;
let cached: { data: Awaited<ReturnType<typeof buildSearchIndex>>; timestamp: number } | null = null;

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
    try {
        const now = Date.now();
        if (cached && now - cached.timestamp < CACHE_TTL_MS) {
            res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=900');
            res.status(200).json(cached.data);
            return;
        }

        const data = await buildSearchIndex();
        cached = {data, timestamp: now};
        res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=900');
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({error: 'Search index unavailable.'});
    }
}
