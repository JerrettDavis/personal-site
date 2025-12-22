import {render, screen} from '@testing-library/react';
import PostSummaries from '../../components/postSummaries';
import type {PostSummary} from '../../lib/posts';

const posts: PostSummary[] = [
    {
        id: 'post-one',
        title: 'Post One',
        date: '2024-01-01',
        stub: 'Short summary',
        tags: ['alpha', 'beta'],
        categories: [],
    },
    {
        id: 'post-two',
        title: 'Post Two',
        date: '2024-02-01',
        stub: 'Another summary',
        tags: ['gamma'],
        categories: [],
        featured: '/image.png',
    },
];

describe('PostSummaries', () => {
    it('renders post titles and tags', () => {
        render(<PostSummaries postSummaries={posts} selectedTag="alpha" />);

        expect(screen.getByText('Post One')).toBeInTheDocument();
        expect(screen.getByText('Post Two')).toBeInTheDocument();
        expect(screen.getByText('#alpha')).toBeInTheDocument();
        expect(screen.getByText('#beta')).toBeInTheDocument();
        expect(screen.getByText('#gamma')).toBeInTheDocument();
    });
});
