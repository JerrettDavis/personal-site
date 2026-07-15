const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);
const MAX_BODY_SNIPPET_LENGTH = 200;

const toSingleLine = (value) =>
    String(value ?? '')
        .replace(/\s+/g, ' ')
        .trim();

const bodySnippet = (value) => {
    const normalized = toSingleLine(value);
    if (normalized.length <= MAX_BODY_SNIPPET_LENGTH) {
        return normalized;
    }
    return `${normalized.slice(0, MAX_BODY_SNIPPET_LENGTH)}…`;
};

const createHashnodeError = (message, retryable = false) => {
    const error = new Error(message);
    error.retryable = retryable;
    return error;
};

const interpretHashnodeResponse = async (response) => {
    const rawBody = await response.text();

    if (!response.ok) {
        throw createHashnodeError(
            `Hashnode API error: ${response.status} - ${bodySnippet(rawBody)}`,
            RETRYABLE_STATUS_CODES.has(response.status),
        );
    }

    let parsed;
    try {
        parsed = JSON.parse(rawBody);
    } catch {
        const contentType = response.headers?.get?.('content-type') ?? 'unknown';
        throw createHashnodeError(
            `Hashnode API returned invalid JSON (content-type: ${contentType}): ${bodySnippet(rawBody)}`,
            true,
        );
    }

    if (parsed?.errors) {
        throw createHashnodeError(
            `Hashnode GraphQL error: ${JSON.stringify(parsed.errors)}`,
            false,
        );
    }

    return parsed;
};

module.exports = {
    interpretHashnodeResponse,
};
