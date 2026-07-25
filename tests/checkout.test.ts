import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { DixBase, DixBaseError } from "../src";

const originalFetch = globalThis.fetch;

describe("DixBase checkout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-29T10:00:00Z"));
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("creates a checkout session with bearer auth and idempotency", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "chk_123",
          object: "checkout.session",
          status: "open",
          payment_status: "unpaid",
          mode: "payment",
          amount: "99.00",
          currency: "cur_123",
          metadata: {},
          checkout_url: "https://pay.dixbase.com/checkout/chk_123"
        }),
        { status: 200 }
      )
    );
    globalThis.fetch = fetchMock;

    const dixbase = new DixBase({ apiKey: "sk_live_test" });
    const session = await dixbase.checkout.create(
      {
        name: "Plan Professional",
        amount: 99,
        currency: "cur_123",
        customerEmail: "cliente@example.com",
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
        clientReferenceId: "order_123",
        acceptedCurrencies: ["cur_123", "cur_456"],
        expiresInMinutes: 30,
        metadata: {
          userId: "123"
        }
      },
      { idempotencyKey: "idem_123" }
    );

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://app.dixbase.com/v1/business/api/checkout/sessions");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      Authorization: "Bearer sk_live_test",
      "Content-Type": "application/json",
      "Idempotency-Key": "idem_123",
      "User-Agent": "dixbase-node/1.0.0"
    });
    expect(JSON.parse(init.body as string)).toMatchObject({
      customer_email: "cliente@example.com",
      success_url: "https://example.com/success",
      cancel_url: "https://example.com/cancel",
      client_reference_id: "order_123",
      accepted_currencies: ["cur_123", "cur_456"],
      expires_in_minutes: 30,
      metadata: {
        userId: "123"
      }
    });
    expect(session.paymentStatus).toBe("unpaid");
    expect(session.checkoutUrl).toBe("https://pay.dixbase.com/checkout/chk_123");
  });

  it("uses sandbox checkout route", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "cs_sandbox",
          object: "checkout.session",
          status: "open",
          payment_status: "unpaid",
          mode: "payment",
          amount: "10.00",
          currency: "cur_123",
          metadata: {},
          checkout_url: "https://pay.dixbase.com/checkout/cs_sandbox"
        }),
        { status: 200 }
      )
    );
    globalThis.fetch = fetchMock;

    const dixbase = new DixBase({ apiKey: "sk_test_123" });
    await dixbase.checkout.createSandbox({
      name: "Sandbox",
      amount: 10,
      currency: "cur_123",
      forceStatus: "open"
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://app.dixbase.com/v1/business/api/sandbox/checkout/sessions");
    expect(JSON.parse(init.body as string)).toMatchObject({ force_status: "open" });
    expect((init.headers as Record<string, string>)["Idempotency-Key"]).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it("supports explicit session aliases", async () => {
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            id: "cs_alias",
            object: "checkout.session",
            status: "open",
            payment_status: "unpaid",
            mode: "payment",
            amount: "10.00",
            currency: "cur_123",
            metadata: {},
            checkout_url: "https://pay.dixbase.com/checkout/cs_alias"
          }),
          { status: 200 }
        )
      )
    );
    globalThis.fetch = fetchMock;

    const dixbase = new DixBase({ apiKey: "sk_test_123" });
    await dixbase.checkout.createSession({ name: "Plan", amount: 10, currency: "cur_123" });
    await dixbase.checkout.createSandboxSession({ name: "Sandbox", amount: 10, currency: "cur_123" });

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "https://app.dixbase.com/v1/business/api/checkout/sessions",
      "https://app.dixbase.com/v1/business/api/sandbox/checkout/sessions"
    ]);
  });

  it("accepts the canonical /business/api base URL without duplicating the path", async () => {
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            id: "chk_live_123",
            object: "checkout.session",
            status: "open",
            payment_status: "unpaid",
            mode: "payment",
            amount: "10.00",
            currency: "EUR",
            metadata: {},
            checkout_url: "https://pay.dixbase.com/checkout/chk_live_123"
          }),
          { status: 200 }
        )
      )
    );
    globalThis.fetch = fetchMock;

    const dixbase = new DixBase({
      apiKey: "dbx_live_test",
      baseUrl: "https://app.dixbase.com/v1/business/api"
    });
    await dixbase.checkout.create({ name: "Plan", amount: 10, currency: "cur_123" });

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://app.dixbase.com/v1/business/api/checkout/sessions");
  });

  it("maps completed sandbox status to the backend force_status value", async () => {
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            id: "chk_test_123",
            object: "checkout.session",
            status: "complete",
            payment_status: "paid",
            mode: "payment",
            amount: "10.00",
            currency: "EUR",
            metadata: {},
            checkout_url: "https://pay.dixbase.com/sandbox/checkout/chk_test_123"
          }),
          { status: 200 }
        )
      )
    );
    globalThis.fetch = fetchMock;

    const dixbase = new DixBase({ apiKey: "dbx_live_test" });
    await dixbase.checkout.createSandbox({ name: "Sandbox", amount: 10, forceStatus: "completed" });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toMatchObject({ force_status: "complete" });
  });

  it("retrieves, lists, cancels and lists currencies with the documented routes", async () => {
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }))
    );
    globalThis.fetch = fetchMock;

    const dixbase = new DixBase({ apiKey: "sk_live_test" });
    await dixbase.checkout.retrieve("chk_123");
    await dixbase.checkout.list({ limit: 10, status: "open" });
    await dixbase.checkout.cancel("chk_123");
    await dixbase.checkout.currencies();

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "https://app.dixbase.com/v1/business/api/checkout/sessions/chk_123",
      "https://app.dixbase.com/v1/business/api/checkout/sessions?limit=10&status=open",
      "https://app.dixbase.com/v1/business/api/checkout/sessions/chk_123/cancel",
      "https://app.dixbase.com/v1/business/api/checkout/currencies"
    ]);
  });

  it("creates sandbox webhook previews", async () => {
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify({ id: "preview_123", signature: "sig" }), { status: 200 }))
    );
    globalThis.fetch = fetchMock;

    const dixbase = new DixBase({ apiKey: "sk_test_123" });
    const preview = await dixbase.webhooks.previewSandbox({
      eventType: "checkout.session.completed",
      checkoutId: "chk_test_123",
      amount: 10,
      currency: "EUR"
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://app.dixbase.com/v1/business/api/sandbox/webhooks/preview");
    expect(JSON.parse(init.body as string)).toMatchObject({
      event: "checkout.session.completed",
      checkout_id: "chk_test_123",
      amount: 10,
      currency: "EUR"
    });
    expect(preview.signature).toBe("sig");
  });

  it("normalizes API errors", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: { message: "Scope insuficiente", code: "forbidden" } }), {
        status: 403,
        headers: { "x-request-id": "req_123" }
      })
    );

    const dixbase = new DixBase({ apiKey: "sk_live_test" });

    await expect(dixbase.checkout.retrieve("cs_missing")).rejects.toMatchObject({
      name: "DixBaseError",
      statusCode: 403,
      code: "forbidden",
      requestId: "req_123"
    });
  });

  it("normalizes FastAPI detail errors", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ detail: "missing_scope" }), { status: 403 })
    );

    const dixbase = new DixBase({ apiKey: "sk_live_test" });

    await expect(dixbase.checkout.retrieve("chk_missing")).rejects.toMatchObject({
      name: "DixBaseError",
      statusCode: 403,
      code: "missing_scope",
      message: "missing_scope"
    });
  });
});
