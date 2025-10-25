import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Hono } from 'hono';
import { handle } from 'hono/vercel';
import dotenv from 'dotenv';

dotenv.config();

// Import error utilities
import { ValidationError, AuthError, ExternalServiceError, errorEnvelope, toResponse, successEnvelope } from '../app/api/errors';

// Create a minimal Hono app for this endpoint
const app = new Hono();

async function handleAgentRequest(input: string) {
    if (!input || typeof input !== 'string') {
        throw new ValidationError('Input is required and must be a string', { providedType: typeof input });
    }

    // Validate API key early to avoid ambiguous downstream errors
    const apiKey = process.env.LANGBASE_API_KEY;
    if (!apiKey) {
        throw new AuthError('LANGBASE_API_KEY missing from environment', { expected: 'user_... or org_...' });
    }

    if (!/^user_|^org_/.test(apiKey)) {
        console.warn("[langbase] Unexpected API key prefix. Key should start with user_ or org_. Provided prefix:", apiKey.slice(0, 8));
    }

    const response = await fetch("https://api.langbase.com/helloak921173071/heal-eye-agent-699b", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            input: input
        })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        if (response.status === 400 && errorData && /Invalid User\/Org API key/i.test(errorData.message || "")) {
            throw new AuthError('Langbase rejected the API key', {
                original: errorData, troubleshooting: [
                    'Regenerate a new key (user or org) and update .env',
                    'Restart the dev server after changes',
                    'Ensure .env resides in process.cwd() directory when starting server'
                ]
            });
        }
        throw new ExternalServiceError(`Langbase request failed`, response.status, errorData || { status: response.status });
    }

    const data = await response.json();
    return successEnvelope(data);
}

app.post('/api/langbase', async (c) => {
    try {
        const body = await c.req.json();
        const result = await handleAgentRequest(body.input);
        return c.json(result);
    } catch (error) {
        console.error("Error in handleAgentRequest:", error);
        const envelope = errorEnvelope(error);
        return c.json(envelope, 500);
    }
});

export default handle(app);
