/** @type {import('next').NextConfig} */
const nextConfig = {
    outputFileTracingIncludes: {
        '/api/**': [
            './scripts/metricsStoreAdapters/postgres.js',
            './scripts/metricsStoreAdapters/sqlite.js',
            './node_modules/pg/**',
            './node_modules/better-sqlite3/**',
        ],
    },
};

module.exports = nextConfig;
