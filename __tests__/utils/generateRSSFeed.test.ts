import fs from 'fs';
import generateRssFeed from '../../utils/generateRSSFeed';
import {Feed} from 'feed';

jest.mock('../../lib/posts', () => ({
    getSortedPostsData: jest.fn(),
}));

jest.mock('feed', () => ({
    Feed: jest.fn().mockImplementation(() => ({
        addItem: jest.fn(),
        rss2: jest.fn(() => '<rss/>'),
        json1: jest.fn(() => '{}'),
        atom1: jest.fn(() => '<atom/>'),
    })),
}));

import {getSortedPostsData} from '../../lib/posts';

describe('generateRssFeed', () => {
    const writeSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});

    afterEach(() => {
        writeSpy.mockClear();
    });

    it('writes feed outputs for all formats', async () => {
        const mockedPosts = getSortedPostsData as jest.MockedFunction<typeof getSortedPostsData>;
        mockedPosts.mockResolvedValue([
            {
                id: 'post-one',
                title: 'Post One',
                description: 'First',
                date: '2024-01-01',
                stub: 'First',
                tags: [],
                categories: [],
            },
        ]);

        await generateRssFeed();

        expect(Feed).toHaveBeenCalledTimes(1);
        const feedInstance = (Feed as jest.Mock).mock.results[0].value;
        expect(feedInstance.addItem).toHaveBeenCalledWith(
            expect.objectContaining({
                title: 'Post One',
                link: expect.stringContaining('/blog/posts/post-one'),
            })
        );

        expect(writeSpy).toHaveBeenCalledWith('./public/rss.xml', '<rss/>');
        expect(writeSpy).toHaveBeenCalledWith('./public/rss.json', '{}');
        expect(writeSpy).toHaveBeenCalledWith('./public/atom.xml', '<atom/>');
    });
});
