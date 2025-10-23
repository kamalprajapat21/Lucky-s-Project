// Centralized error handling utilities
export interface ErrorJSON {
    code: string;
    message: string;
    details?: any;
    retryable?: boolean;
    docs?: string;
    step?: string;
}

export class BaseAppError extends Error {
    code: string;
    httpStatus: number;
    details?: any;
    retryable?: boolean;
    docs?: string;
    constructor(
        code: string,
        message: string,
        httpStatus: number = 500,
        options: { details?: any; retryable?: boolean; docs?: string } = {}
    ) {
        super(message);
        this.code = code;
        this.httpStatus = httpStatus;
        this.details = options.details;
        this.retryable = options.retryable;
        this.docs = options.docs;
    }
    toJSON(): ErrorJSON {
        return {
            code: this.code,
            message: this.message,
            details: this.details,
            retryable: this.retryable,
            docs: this.docs,
        };
    }
}

export class ValidationError extends BaseAppError {
    constructor(message: string, details?: any) {
        super('VALIDATION_ERROR', message, 400, { details });
    }
}

export class AuthError extends BaseAppError {
    constructor(message: string, details?: any) {
        super('AUTH_ERROR', message, 401, { details });
    }
}

export class ExternalServiceError extends BaseAppError {
    constructor(message: string, httpStatus = 502, details?: any, retryable = true) {
        super('EXTERNAL_SERVICE_ERROR', message, httpStatus, { details, retryable });
    }
}

export class WorkflowStepError extends BaseAppError {
    constructor(step: string, message: string, details?: any, retryable = false) {
        super('WORKFLOW_STEP_ERROR', message, 500, { details, retryable });
    }
    toJSON(): ErrorJSON {
        return {
            ...super.toJSON(),
            step: (this as any).details?.step || undefined,
        };
    }
}

export function successEnvelope<T>(data: T, meta: any = {}) {
    return { success: true, data, meta };
}

export function errorEnvelope(err: unknown) {
    if (err instanceof BaseAppError) {
        return { success: false, error: err.toJSON() };
    }
    if (err instanceof Error) {
        return {
            success: false,
            error: { code: 'UNEXPECTED_ERROR', message: err.message },
        };
    }
    return { success: false, error: { code: 'UNKNOWN', message: 'Unknown error' } };
}

export function toResponse(err: unknown) {
    if (err instanceof BaseAppError) {
        return new Response(JSON.stringify(errorEnvelope(err)), {
            status: err.httpStatus,
            headers: { 'Content-Type': 'application/json' },
        });
    }
    return new Response(JSON.stringify(errorEnvelope(err)), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
    });
}

// Detect overloaded model / transient provider errors
export function isOverloadedError(message: string | undefined) {
    if (!message) return false;
    return /model is overloaded|rate limit|temporarily unavailable|please try again later/i.test(message);
}

export async function withRetries<T>(fn: () => Promise<T>, options: { retries?: number; delayMs?: number; factor?: number } = {}) {
    const { retries = 3, delayMs = 500, factor = 2 } = options;
    let attempt = 0;
    let lastErr: any;
    while (attempt <= retries) {
        try {
            return await fn();
        } catch (e: any) {
            const msg = e?.message || '';
            if (attempt === retries || !isOverloadedError(msg)) {
                throw e;
            }
            const wait = delayMs * Math.pow(factor, attempt);
            await new Promise(r => setTimeout(r, wait));
            attempt++;
        }
    }
    throw lastErr;
}

export function mergeEnvelope(envelope: any) {
    // If data itself is an envelope, flatten
    if (envelope && envelope.success === true && envelope.data && envelope.data.success !== undefined) {
        return {
            success: envelope.data.success,
            ...(envelope.data.success ? { data: envelope.data.data ?? envelope.data } : { error: envelope.data.error }),
            meta: envelope.meta || {},
        };
    }
    return envelope;
}