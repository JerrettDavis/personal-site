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
            './node_modules/pg-pool/**',
            './node_modules/pg-protocol/**',
            './node_modules/pgpass/**',
            './node_modules/split2/**',
            './node_modules/through2/**',
            './node_modules/readable-stream/**',
            './node_modules/safe-buffer/**',
            './node_modules/string_decoder/**',
            './node_modules/process-nextick-args/**',
            './node_modules/inherits/**',
            './node_modules/isarray/**',
            './node_modules/core-util-is/**',
            './node_modules/util-deprecate/**',
            './node_modules/xtend/**',
            './node_modules/better-sqlite3/**',
        ],
    },
};

module.exports = nextConfig;
