import {buildSummary, parseOrderValue} from '../../lib/markdown';

describe('buildSummary', () => {
    it('returns an empty string when content is blank', () => {
        expect(buildSummary('   ')).toBe('');
    });

    it('truncates with an ellipsis when exceeding max length', () => {
        const text = 'word '.repeat(50);
        const summary = buildSummary(text, {maxLength: 20});
        expect(summary.endsWith('...')).toBe(true);
        expect(summary.length).toBe(23);
    });

    it('can force a suffix even when content is short', () => {
        const summary = buildSummary('Short text', {ensureSuffix: true});
        expect(summary).toBe('Short text...');
    });
});

describe('parseOrderValue', () => {
    it('parses numbers and numeric strings', () => {
        expect(parseOrderValue(3)).toBe(3);
        expect(parseOrderValue('4')).toBe(4);
    });

    it('returns null for invalid values', () => {
        expect(parseOrderValue('')).toBeNull();
        expect(parseOrderValue('abc')).toBeNull();
    });
});
