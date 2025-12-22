import path from 'path';
import fs from 'fs';

jest.mock('fs', () => ({
    readdirSync: jest.fn(),
    readFileSync: jest.fn(),
}));

import {getPostDir, getSortedPost} from '../../utils/mdx';

const mockedFs = fs as jest.Mocked<typeof fs>;

describe('mdx utilities', () => {
    it('returns sorted posts by date', async () => {
        const postsDir = path.join(process.cwd(), 'posts');
        mockedFs.readdirSync.mockReturnValue(['a.mdx', 'b.mdx']);
        mockedFs.readFileSync.mockImplementation((filePath) => {
            if (filePath === path.join(postsDir, 'a.mdx')) {
                return `---\ntitle: Alpha\ndate: 2024-01-10\n---\nAlpha content`;
            }
            return `---\ntitle: Beta\ndate: 2024-02-05\n---\nBeta content`;
        });

        const posts = await getSortedPost();
        expect(posts?.[0].title).toBe('Beta');
        expect(posts?.[1].title).toBe('Alpha');
    });

    it('returns the post directory listing', async () => {
        mockedFs.readdirSync.mockReturnValue(['a.mdx', 'b.mdx']);
        const dirs = await getPostDir();
        expect(dirs).toEqual(['a.mdx', 'b.mdx']);
    });
});
