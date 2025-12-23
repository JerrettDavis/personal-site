const nextJest = require('next/jest');

const createJestConfig = nextJest({
    dir: './',
});

const customJestConfig = {
    testEnvironment: 'jest-environment-jsdom',
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    moduleNameMapper: {
        '\\.(css|less|sass|scss)$': 'identity-obj-proxy',
        '\\.(gif|png|jpg|jpeg|svg|webp|avif|ico)$': '<rootDir>/__mocks__/fileMock.js',
    },
    testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
    transformIgnorePatterns: [
        '/node_modules/(?!(remark|rehype|unified|strip-markdown|lowlight|vfile|unist|mdast|hast|micromark|character-entities|decode-named-character-reference|bail|trough|is-plain-obj|property-information|space-separated-tokens|comma-separated-tokens)/)',
    ],
};

module.exports = createJestConfig(customJestConfig);
