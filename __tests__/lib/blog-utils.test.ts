import {toSeriesSlug} from '../../lib/blog-utils';

describe('toSeriesSlug', () => {
    it('normalizes whitespace and punctuation', () => {
        expect(toSeriesSlug('Hello World!')).toBe('hello-world');
    });

    it('trims and collapses separators', () => {
        expect(toSeriesSlug('  Systems   Design  Notes  ')).toBe('systems-design-notes');
    });

    it('drops leading and trailing dashes', () => {
        expect(toSeriesSlug('-Ops & Reliability-')).toBe('ops-reliability');
    });
});
