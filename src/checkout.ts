import { createIdempotencyKey, HttpClient } from "./http";
import type {
  CheckoutCurrency,
  CheckoutSession,
  CreateCheckoutSessionPayload,
  CreateSandboxCheckoutSessionPayload,
  ListCheckoutSessionsParams,
  ListResponse,
  RequestOptions
} from "./types";

export class CheckoutResource {
  constructor(private readonly http: HttpClient) {}

  createSession(payload: CreateCheckoutSessionPayload, options?: RequestOptions): Promise<CheckoutSession> {
    return this.create(payload, options);
  }

  create(payload: CreateCheckoutSessionPayload, options?: RequestOptions): Promise<CheckoutSession> {
    return this.http.post<CheckoutSession>("/business/api/checkout/sessions", payload, {
      ...options,
      idempotencyKey: options?.idempotencyKey ?? createIdempotencyKey()
    });
  }

  createSandboxSession(
    payload: CreateSandboxCheckoutSessionPayload,
    options?: RequestOptions
  ): Promise<CheckoutSession> {
    return this.createSandbox(payload, options);
  }

  createSandbox(
    payload: CreateSandboxCheckoutSessionPayload,
    options?: RequestOptions
  ): Promise<CheckoutSession> {
    return this.http.post<CheckoutSession>("/business/api/sandbox/checkout/sessions", normalizeSandboxPayload(payload), {
      ...options,
      idempotencyKey: options?.idempotencyKey ?? createIdempotencyKey()
    });
  }

  retrieve(checkoutId: string, options?: RequestOptions): Promise<CheckoutSession> {
    assertCheckoutId(checkoutId);
    return this.http.get<CheckoutSession>(`/business/api/checkout/sessions/${checkoutId}`, undefined, options);
  }

  list(params?: ListCheckoutSessionsParams, options?: RequestOptions): Promise<ListResponse<CheckoutSession>> {
    return this.http.get<ListResponse<CheckoutSession>>(
      "/business/api/checkout/sessions",
      params as Record<string, unknown> | undefined,
      options
    );
  }

  cancel(checkoutId: string, options?: RequestOptions): Promise<CheckoutSession> {
    assertCheckoutId(checkoutId);
    return this.http.post<CheckoutSession>(`/business/api/checkout/sessions/${checkoutId}/cancel`, undefined, options);
  }

  currencies(options?: RequestOptions): Promise<ListResponse<CheckoutCurrency> | CheckoutCurrency[]> {
    return this.http.get<ListResponse<CheckoutCurrency> | CheckoutCurrency[]>(
      "/business/api/checkout/currencies",
      undefined,
      options
    );
  }
}

function normalizeSandboxPayload(payload: CreateSandboxCheckoutSessionPayload): CreateSandboxCheckoutSessionPayload {
  if (payload.forceStatus !== "completed") {
    return payload;
  }

  return {
    ...payload,
    forceStatus: "complete"
  };
}

function assertCheckoutId(checkoutId: string): void {
  if (!checkoutId) {
    throw new Error("checkoutId is required.");
  }
}
