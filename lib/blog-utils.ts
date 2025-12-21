export const POSTS_PER_PAGE = 6;

export const toSeriesSlug = (series: string) =>
    series
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
