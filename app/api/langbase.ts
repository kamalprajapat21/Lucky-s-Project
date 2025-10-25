import { Context, Hono } from "hono";
import dotenv from "dotenv";
import { ValidationError, AuthError, ExternalServiceError, errorEnvelope, toResponse, successEnvelope } from "./errors";
dotenv.config();

// Basic API endpoint
export const registerLangbaseEndpoint = (app: Hono) => {
  app.post("/api/langbase", async (c: Context) => {
    // Debug: log if API key is loaded
    const apiKeyLoaded = process.env.LANGBASE_API_KEY ? 'yes' : 'no';
    console.log('LANGBASE_API_KEY loaded:', apiKeyLoaded);
    try {
      const request = new Request(c.req.url, {
        method: c.req.method,
        headers: {
          "Content-Type": c.req.header("Content-Type") || "application/json",
          Authorization: c.req.header("Authorization") || "",
        },
        body: JSON.stringify(await c.req.json()),
      });
      return await handleAgentRequest(request);
    } catch (err) {
      // Always log and return error message for debugging
      console.error('Langbase endpoint error:', err);
      return c.json({
        success: false,
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        envLoaded: apiKeyLoaded
      }, 500);
    }
  });
};

// Server-side only: Do NOT include it in any client-side code, that ends up in the browsers.

async function handleAgentRequest(request: Request) {
  try {
    const { input } = await request.json();

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

    return new Response(JSON.stringify(successEnvelope(data)), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Error in handleAgentRequest:", error);
    return toResponse(error);
  }
}