require('@testing-library/jest-dom');

const React = require('react');

jest.mock('next/link', () => ({
    __esModule: true,
    default: ({href, children, ...props}) => {
        const resolvedHref = typeof href === 'string' ? href : href?.pathname || '';
        return React.createElement('a', {href: resolvedHref, ...props}, children);
    },
}));

jest.mock('next/image', () => ({
    __esModule: true,
    default: ({src, alt, fill, ...props}) => {
        const resolvedSrc = typeof src === 'string' ? src : src?.src || '';
        return React.createElement('img', {src: resolvedSrc, alt, ...props});
    },
}));

if (!global.IntersectionObserver) {
    global.IntersectionObserver = class IntersectionObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
    };
}
