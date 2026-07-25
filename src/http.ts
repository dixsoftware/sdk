import { randomUUID } from "node:crypto";
import { DixBaseError } from "./errors";
import { buildQuery, stripTrailingSlash, toCamelCase, toSnakeCase, transformKeys } from "./utils";
import type { DixBaseConfig, RequestOptions } from "./types";

const DEFAULT_BASE_URL = "https://app.dixbase.com/v1";
const USER_AGENT = "dixbase-node/1.0.0";

export class HttpClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(config: DixBaseConfig) {
    if (!config.apiKey) {
      throw new Error("DixBase apiKey is required.");
    }

    this.apiKey = config.apiKey;
    this.baseUrl = stripTrailingSlash(config.baseUrl ?? DEFAULT_BASE_URL);
    this.timeoutMs = config.timeoutMs ?? 30000;
  }

  async get<T>(path: string, params?: Record<string, unknown>, options?: RequestOptions): Promise<T> {
    return this.request<T>("GET", `${path}${buildQuery(params)}`, undefined, options);
  }

  async post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>("POST", path, body, options);
  }

  private async request<T>(
    method: "GET" | "POST",
    path: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    const signal = options?.signal ?? controller.signal;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
      "User-Agent": USER_AGENT
    };

    if (method === "POST" && options?.idempotencyKey) {
      headers["Idempotency-Key"] = options.idempotencyKey;
    }

    try {
      const response = await fetch(this.buildUrl(path), {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(transformKeys(body, toSnakeCase)),
        signal
      });

      const responseText = await response.text();
      const responseBody = parseJson(responseText);

      if (!response.ok) {
        throw normalizeError(response, responseBody);
      }

      return transformKeys(responseBody, toCamelCase) as T;
    } catch (error) {
      if (error instanceof DixBaseError) {
        throw error;
      }

      if (error instanceof Error && error.name === "AbortError") {
        throw new DixBaseError({
          message: "DixBase request timed out.",
          statusCode: 0,
          code: "request_timeout"
        });
      }

      throw new DixBaseError({
        message: error instanceof Error ? error.message : "DixBase request failed.",
        statusCode: 0,
        code: "request_failed",
        details: error
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  private buildUrl(path: string): string {
    if (this.baseUrl.endsWith("/business/api") && path.startsWith("/business/api/")) {
      return `${this.baseUrl}${path.slice("/business/api".length)}`;
    }

    return `${this.baseUrl}${path}`;
  }
}

function parseJson(value: string): unknown {
  if (!value) {
    return {};
  }

  try {
    return JSON.parse(value);
  } catch {
    return { raw: value };
  }
}

function normalizeError(response: Response, body: unknown): DixBaseError {
  const data = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const error = data.error && typeof data.error === "object" ? (data.error as Record<string, unknown>) : data;
  const requestId = response.headers.get("x-request-id") ?? response.headers.get("request-id") ?? undefined;

  return new DixBaseError({
    message:
      typeof error.message === "string"
        ? error.message
        : typeof error.detail === "string"
          ? error.detail
        : `DixBase API request failed with status ${response.status}.`,
    statusCode: response.status,
    code:
      typeof error.code === "string"
        ? error.code
        : typeof error.detail === "string"
          ? error.detail
          : undefined,
    requestId,
    details: body
  });
}

export function createIdempotencyKey(): string {
  return randomUUID();
}
