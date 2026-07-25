import { createHmac } from "node:crypto";
import { describe, expect, it, vi, afterEach } from "vitest";
import { DixBase, DixBaseWebhookSignatureError } from "../src";

const originalFetch = globalThis.fetch;

describe("DixBase webhooks", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("verifies a timestamped signature and returns the parsed event", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-29T10:00:00Z"));

    const dixbase = new DixBase({ apiKey: "sk_live_test" });
    const rawBody = JSON.stringify({
      id: "evt_123",
      type: "checkout.session.completed",
      data: { id: "chk_123" }
    });
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = createHmac("sha256", "whsec_test").update(`${timestamp}.${rawBody}`).digest("hex");

    const event = dixbase.webhooks.verifySignature(rawBody, `t=${timestamp},v1=${signature}`, "whsec_test");

    expect(event.type).toBe("checkout.session.completed");
    expect(event.data).toEqual({ id: "chk_123" });
  });

  it("rejects missing signatures", () => {
    const dixbase = new DixBase({ apiKey: "sk_live_test" });

    expect(() => dixbase.webhooks.verifySignature("{}", undefined, "whsec_test")).toThrow(
      DixBaseWebhookSignatureError
    );
  });

  it("rejects invalid signatures", () => {
    const dixbase = new DixBase({ apiKey: "sk_live_test" });

    expect(() => dixbase.webhooks.verifySignature("{}", "v1=bad", "whsec_test")).toThrow(
      DixBaseWebhookSignatureError
    );
  });

  it("rejects old timestamped signatures", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-29T10:00:00Z"));

    const dixbase = new DixBase({ apiKey: "sk_live_test" });
    const rawBody = "{}";
    const timestamp = Math.floor(Date.now() / 1000) - 3600;
    const signature = createHmac("sha256", "whsec_test").update(`${timestamp}.${rawBody}`).digest("hex");

    expect(() => dixbase.webhooks.verifySignature(rawBody, `t=${timestamp},v1=${signature}`, "whsec_test")).toThrow(
      DixBaseWebhookSignatureError
    );
  });

  it("lists webhook deliveries with the documented route", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          object: "list",
          data: [
            {
              id: "whe_123",
              event_id: "evt_123",
              event_type: "checkout.session.completed",
              status: "delivered",
              attempts: 1,
              created_at: "2026-06-29T10:00:00Z",
              updated_at: "2026-06-29T10:00:01Z",
              delivered_at: "2026-06-29T10:00:01Z"
            }
          ],
          has_more: false
        }),
        { status: 200 }
      )
    );
    globalThis.fetch = fetchMock;

    const dixbase = new DixBase({ apiKey: "sk_live_test" });
    const deliveries = await dixbase.webhooks.listDeliveries({ limit: 10, status: "delivered" });

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://app.dixbase.com/v1/business/api/webhooks/deliveries?limit=10&status=delivered");
    expect(deliveries.data[0].eventId).toBe("evt_123");
  });
});
