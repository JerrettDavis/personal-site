/**
 * Unit tests for syndication filtering logic
 * 
 * These tests verify the post filtering logic without actually calling APIs.
 */

describe('Syndication Filtering Logic', () => {
    /**
     * Mock implementation of shouldSyndicate function
     * This mirrors the logic from syndicate.mjs
     */
    function shouldSyndicate(post, config, maxAgeDays = null, now = Date.now()) {
        const { frontmatter } = post;
        
        // Explicit frontmatter override
        if (frontmatter.syndicate === false) {
            return false;
        }
        
        if (frontmatter.syndicate === true) {
            return true;
        }
        
        // Check default setting
        if (!config.defaults.syndicateByDefault) {
            return false;
        }
        
        // Check tag filters
        const postTags = Array.isArray(frontmatter.tags) ? frontmatter.tags : [];
        if (config.filters.excludedTags && config.filters.excludedTags.length > 0) {
            const hasExcludedTag = postTags.some(tag => 
                config.filters.excludedTags.includes(tag)
            );
            if (hasExcludedTag) return false;
        }
        
        if (config.filters.includedTags && config.filters.includedTags.length > 0) {
            const hasIncludedTag = postTags.some(tag => 
                config.filters.includedTags.includes(tag)
            );
            if (!hasIncludedTag) return false;
        }
        
        // Check category filters
        const postCategories = Array.isArray(frontmatter.categories) ? frontmatter.categories : [];
        if (config.filters.excludedCategories && config.filters.excludedCategories.length > 0) {
            const hasExcludedCategory = postCategories.some(cat => 
                config.filters.excludedCategories.includes(cat)
            );
            if (hasExcludedCategory) return false;
        }
        
        if (config.filters.includedCategories && config.filters.includedCategories.length > 0) {
            const hasIncludedCategory = postCategories.some(cat =>
                config.filters.includedCategories.includes(cat)
            );
            if (!hasIncludedCategory) return false;
        }

        if (maxAgeDays) {
            const publishedAt = frontmatter.date instanceof Date
                ? frontmatter.date.getTime()
                : Date.parse(frontmatter.date);
            if (Number.isFinite(publishedAt)) {
                const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
                if (now - publishedAt > maxAgeMs) {
                    return false;
                }
            }
        }

        return true;
    }

    const baseConfig = {
        defaults: { syndicateByDefault: true },
        filters: {
            includedTags: [],
            excludedTags: [],
            includedCategories: [],
            excludedCategories: []
        }
    };

    describe('Frontmatter Override', () => {
        it('should not syndicate when syndicate is explicitly false', () => {
            const post = {
                id: 'test-post',
                frontmatter: { syndicate: false, tags: ['webdev'] }
            };
            expect(shouldSyndicate(post, baseConfig)).toBe(false);
        });

        it('should syndicate when syndicate is explicitly true, even with excluded tags', () => {
            const config = {
                ...baseConfig,
                filters: { ...baseConfig.filters, excludedTags: ['draft'] }
            };
            const post = {
                id: 'test-post',
                frontmatter: { syndicate: true, tags: ['draft'] }
            };
            expect(shouldSyndicate(post, config)).toBe(true);
        });

        it('should syndicate when syndicate is explicitly true, even when default is false', () => {
            const config = {
                ...baseConfig,
                defaults: { syndicateByDefault: false }
            };
            const post = {
                id: 'test-post',
                frontmatter: { syndicate: true, tags: ['webdev'] }
            };
            expect(shouldSyndicate(post, config)).toBe(true);
        });
    });

    describe('Default Behavior', () => {
        it('should not syndicate when syndicateByDefault is false and no frontmatter override', () => {
            const config = {
                ...baseConfig,
                defaults: { syndicateByDefault: false }
            };
            const post = {
                id: 'test-post',
                frontmatter: { tags: ['webdev'] }
            };
            expect(shouldSyndicate(post, config)).toBe(false);
        });

        it('should syndicate when syndicateByDefault is true and no filters apply', () => {
            const post = {
                id: 'test-post',
                frontmatter: { tags: ['webdev'] }
            };
            expect(shouldSyndicate(post, baseConfig)).toBe(true);
        });
    });

    describe('Tag Filtering', () => {
        it('should not syndicate posts with excluded tags', () => {
            const config = {
                ...baseConfig,
                filters: { ...baseConfig.filters, excludedTags: ['draft', 'private'] }
            };
            const post = {
                id: 'test-post',
                frontmatter: { tags: ['webdev', 'draft'] }
            };
            expect(shouldSyndicate(post, config)).toBe(false);
        });

        it('should syndicate posts without excluded tags', () => {
            const config = {
                ...baseConfig,
                filters: { ...baseConfig.filters, excludedTags: ['draft', 'private'] }
            };
            const post = {
                id: 'test-post',
                frontmatter: { tags: ['webdev', 'javascript'] }
            };
            expect(shouldSyndicate(post, config)).toBe(true);
        });

        it('should only syndicate posts with included tags when includedTags is set', () => {
            const config = {
                ...baseConfig,
                filters: { ...baseConfig.filters, includedTags: ['webdev', 'programming'] }
            };
            const postWithIncluded = {
                id: 'test-post-1',
                frontmatter: { tags: ['webdev', 'javascript'] }
            };
            const postWithoutIncluded = {
                id: 'test-post-2',
                frontmatter: { tags: ['personal', 'travel'] }
            };
            expect(shouldSyndicate(postWithIncluded, config)).toBe(true);
            expect(shouldSyndicate(postWithoutIncluded, config)).toBe(false);
        });

        it('should handle posts with no tags', () => {
            const config = {
                ...baseConfig,
                filters: { ...baseConfig.filters, excludedTags: ['draft'] }
            };
            const post = {
                id: 'test-post',
                frontmatter: { tags: null }
            };
            expect(shouldSyndicate(post, config)).toBe(true);
        });

        it('should handle posts with empty tags array', () => {
            const config = {
                ...baseConfig,
                filters: { ...baseConfig.filters, includedTags: ['webdev'] }
            };
            const post = {
                id: 'test-post',
                frontmatter: { tags: [] }
            };
            expect(shouldSyndicate(post, config)).toBe(false);
        });
    });

    describe('Category Filtering', () => {
        it('should not syndicate posts with excluded categories', () => {
            const config = {
                ...baseConfig,
                filters: { ...baseConfig.filters, excludedCategories: ['Private', 'Personal'] }
            };
            const post = {
                id: 'test-post',
                frontmatter: { categories: ['Programming', 'Private'] }
            };
            expect(shouldSyndicate(post, config)).toBe(false);
        });

        it('should syndicate posts without excluded categories', () => {
            const config = {
                ...baseConfig,
                filters: { ...baseConfig.filters, excludedCategories: ['Private', 'Personal'] }
            };
            const post = {
                id: 'test-post',
                frontmatter: { categories: ['Programming', 'Web Development'] }
            };
            expect(shouldSyndicate(post, config)).toBe(true);
        });

        it('should only syndicate posts with included categories when includedCategories is set', () => {
            const config = {
                ...baseConfig,
                filters: { ...baseConfig.filters, includedCategories: ['Programming', 'Technology'] }
            };
            const postWithIncluded = {
                id: 'test-post-1',
                frontmatter: { categories: ['Programming', 'Web Development'] }
            };
            const postWithoutIncluded = {
                id: 'test-post-2',
                frontmatter: { categories: ['Personal', 'Travel'] }
            };
            expect(shouldSyndicate(postWithIncluded, config)).toBe(true);
            expect(shouldSyndicate(postWithoutIncluded, config)).toBe(false);
        });

        it('should handle posts with no categories', () => {
            const config = {
                ...baseConfig,
                filters: { ...baseConfig.filters, excludedCategories: ['Private'] }
            };
            const post = {
                id: 'test-post',
                frontmatter: { categories: null }
            };
            expect(shouldSyndicate(post, config)).toBe(true);
        });
    });

    describe('Age Filtering', () => {
        const now = new Date('2025-01-01T00:00:00Z').getTime();

        it('should skip posts older than the max age', () => {
            const post = {
                id: 'old-post',
                frontmatter: { date: '2023-01-01T00:00:00Z' }
            };
            expect(shouldSyndicate(post, baseConfig, 365, now)).toBe(false);
        });

        it('should allow posts within the max age', () => {
            const post = {
                id: 'recent-post',
                frontmatter: { date: '2024-12-15T00:00:00Z' }
            };
            expect(shouldSyndicate(post, baseConfig, 365, now)).toBe(true);
        });

        it('should allow posts without dates', () => {
            const post = {
                id: 'no-date',
                frontmatter: {}
            };
            expect(shouldSyndicate(post, baseConfig, 365, now)).toBe(true);
        });

        it('should allow explicit syndication overrides for older posts', () => {
            const post = {
                id: 'override-post',
                frontmatter: { syndicate: true, date: '2020-01-01T00:00:00Z' }
            };
            expect(shouldSyndicate(post, baseConfig, 365, now)).toBe(true);
        });
    });

    describe('Edge Cases', () => {
        it('should handle posts with undefined frontmatter properties', () => {
            const post = {
                id: 'test-post',
                frontmatter: {}
            };
            expect(shouldSyndicate(post, baseConfig)).toBe(true);
        });

        it('should handle empty filter arrays', () => {
            const config = {
                ...baseConfig,
                filters: {
                    includedTags: [],
                    excludedTags: [],
                    includedCategories: [],
                    excludedCategories: []
                }
            };
            const post = {
                id: 'test-post',
                frontmatter: { tags: ['webdev'], categories: ['Programming'] }
            };
            expect(shouldSyndicate(post, config)).toBe(true);
        });
    });
});
