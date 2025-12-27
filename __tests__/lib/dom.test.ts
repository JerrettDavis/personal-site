import {shouldIgnoreKeyEvent} from '../../lib/dom';

describe('shouldIgnoreKeyEvent', () => {
    it('returns false for null targets', () => {
        expect(shouldIgnoreKeyEvent(null)).toBe(false);
    });

    it('returns true for form controls', () => {
        const input = document.createElement('input');
        const textarea = document.createElement('textarea');
        const select = document.createElement('select');

        expect(shouldIgnoreKeyEvent(input)).toBe(true);
        expect(shouldIgnoreKeyEvent(textarea)).toBe(true);
        expect(shouldIgnoreKeyEvent(select)).toBe(true);
    });

    it('returns true for content editable elements', () => {
        const div = document.createElement('div');
        Object.defineProperty(div, 'isContentEditable', {value: true});

        expect(shouldIgnoreKeyEvent(div)).toBe(true);
    });

    it('returns false for regular elements', () => {
        const div = document.createElement('div');
        expect(shouldIgnoreKeyEvent(div)).toBe(false);
    });
});
