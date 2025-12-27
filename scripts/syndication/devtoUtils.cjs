const sanitizeTitle = (value) =>
    String(value ?? '')
        .replace(/[\u0000-\u001F\u007F]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

const normalizeTitleKey = (value) =>
    sanitizeTitle(value)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');

const DEVTO_TAG_MAPPINGS = {
    'c#': 'csharp',
    'f#': 'fsharp',
    'c++': 'cpp',
};

const normalizeDevtoTag = (tag) => {
    const raw = String(tag ?? '').trim();
    if (!raw) return '';
    const lower = raw.toLowerCase();
    // Apply explicit mappings before stripping punctuation (e.g. "c++" -> "cpp").
    if (Object.prototype.hasOwnProperty.call(DEVTO_TAG_MAPPINGS, lower)) {
        return DEVTO_TAG_MAPPINGS[lower];
    }
    return lower.replace(/[^a-z0-9]/g, '');
};

const buildDevtoTags = (tags, maxTags) => {
    const cleaned = (Array.isArray(tags) ? tags : [])
        .map((tag) => normalizeDevtoTag(tag))
        .filter(Boolean);
    // Note: tags are normalized before de-duplication. When multiple originals
    // normalize to the same value, the first occurrence is kept (Set preserves
    // insertion order), so earlier tags have priority.
    return Array.from(new Set(cleaned)).slice(0, maxTags);
};

const buildDevtoCollisionIndex = (articles) => {
    const byCanonical = new Map();
    const byTitle = new Map();

    (Array.isArray(articles) ? articles : []).forEach((article) => {
        const canonical = article?.canonical_url || article?.canonicalUrl;
        if (canonical) {
            byCanonical.set(String(canonical).toLowerCase(), article);
        }

        const titleKey = normalizeTitleKey(article?.title);
        if (titleKey) {
            byTitle.set(titleKey, article);
        }
    });

    return { byCanonical, byTitle };
};

const findDevtoCollision = (prepared, index) => {
    if (!index) return null;

    const canonicalKey = prepared.canonicalUrl
        ? String(prepared.canonicalUrl).toLowerCase()
        : '';
    if (canonicalKey && index.byCanonical.has(canonicalKey)) {
        return index.byCanonical.get(canonicalKey);
    }

    const titleKey = normalizeTitleKey(prepared.title);
    if (titleKey && index.byTitle.has(titleKey)) {
        return index.byTitle.get(titleKey);
    }

    return null;
};

const interpretDevtoResponse = async (response, prepared) => {
    if (response.status === 429) {
        return { skipped: true, reason: 'Rate limited', rateLimited: true };
    }

    if (!response.ok) {
        const errorText = await response.text();
        if (
            response.status === 422 &&
            errorText.includes('Canonical url has already been taken')
        ) {
            const publishedAt = prepared.publishedAt
                ? new Date(prepared.publishedAt).toISOString()
                : new Date().toISOString();
            return {
                skipped: true,
                reason: 'Already published',
                markAsPublished: true,
                url: prepared.canonicalUrl,
                publishedAt,
                lastUpdated: new Date().toISOString(),
            };
        }
        throw new Error(`Dev.to API error: ${response.status} - ${errorText}`);
    }

    return null;
};

module.exports = {
    sanitizeTitle,
    normalizeTitleKey,
    normalizeDevtoTag,
    buildDevtoTags,
    buildDevtoCollisionIndex,
    findDevtoCollision,
    interpretDevtoResponse,
};
