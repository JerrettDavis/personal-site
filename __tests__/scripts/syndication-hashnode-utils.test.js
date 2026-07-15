const { interpretHashnodeResponse } = require('../../scripts/syndication/hashnodeUtils.cjs');

const createResponse = ({ok = true, status = 200, body = '', contentType = 'application/json'}) => ({
    ok,
    status,
    text: async () => body,
    headers: {
        get: (name) => (name.toLowerCase() === 'content-type' ? contentType : null),
    },
});

describe('Syndication Hashnode helpers', () => {
    it('returns parsed JSON for successful responses', async () => {
        const response = createResponse({
            body: JSON.stringify({
                data: { publishPost: { post: { id: 'abc', url: 'https://example.com' } } },
            }),
        });

        const result = await interpretHashnodeResponse(response);

        expect(result.data.publishPost.post.id).toBe('abc');
    });

    it('marks invalid JSON response bodies as retryable', async () => {
        const response = createResponse({
            body: '<!DOCTYPE html><html><body>temporary error</body></html>',
            contentType: 'text/html',
        });

        await expect(interpretHashnodeResponse(response)).rejects.toMatchObject({
            retryable: true,
        });
    });

    it('marks 5xx errors as retryable', async () => {
        const response = createResponse({
            ok: false,
            status: 503,
            body: 'service unavailable',
            contentType: 'text/plain',
        });

        await expect(interpretHashnodeResponse(response)).rejects.toMatchObject({
            retryable: true,
        });
    });

    it('does not mark GraphQL errors as retryable', async () => {
        const response = createResponse({
            body: JSON.stringify({ errors: [{ message: 'Invalid publication' }] }),
        });

        await expect(interpretHashnodeResponse(response)).rejects.toMatchObject({
            retryable: false,
        });
    });
});
