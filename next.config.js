/** @type {import('next').NextConfig} */
const nextConfig = {
    outputFileTracingIncludes: {
        '/api/**': [
            './scripts/metricsStoreAdapters/postgres.js',
            './scripts/metricsStoreAdapters/sqlite.js',
            './node_modules/pg/**',
            './node_modules/pg-types/**',
            './node_modules/pg-connection-string/**',
            './node_modules/pg-int8/**',
            './node_modules/postgres-array/**',
            './node_modules/postgres-bytea/**',
            './node_modules/postgres-date/**',
            './node_modules/postgres-interval/**',
            './node_modules/better-sqlite3/**',
        ],
    },
};

module.exports = nextConfig;
