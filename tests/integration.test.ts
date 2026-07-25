import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { DixBase, DixBaseError } from "../src";

const apiKey = process.env.DIXBASE_API_KEY;
const currency = process.env.DIXBASE_TEST_CURRENCY_ID;
const baseUrl = process.env.DIXBASE_BASE_URL;

const runIntegration = Boolean(apiKey && currency);

describe.skipIf(!runIntegration)("DixBase sandbox integration", () => {
  it("creates a sandbox checkout and previews a signed webhook", async () => {
    const dixbase = new DixBase({
      apiKey: apiKey!,
      baseUrl
    });

    const created = await dixbase.checkout.createSandbox(
      {
        name: "SDK integration test",
        amount: 1,
        currency: currency!,
        customerEmail: "sdk-test@example.com",
        clientReferenceId: `sdk-test-${Date.now()}`,
        forceStatus: "open",
        metadata: {
          source: "sdk_integration_test"
        }
      },
      {
        idempotencyKey: `sdk-it-${randomUUID()}`
      }
    );

    expect(created.id).toMatch(/^chk_/);
    expect(created.livemode).toBe(false);
    expect(created.checkoutUrl).toBeTruthy();
    expect(created.webhookSignature).toMatch(/^t=\d+,v1=[a-f0-9]{64}$/);

    try {
      const preview = await dixbase.webhooks.previewSandbox({
        event: "checkout.session.completed",
        checkoutId: created.id,
        amount: 1,
        currency: "EUR",
        clientReferenceId: `sdk-preview-${Date.now()}`
      });
      expect(preview.object).toBe("sandbox.webhook_preview");
      expect(preview.signature).toMatch(/^t=\d+,v1=[a-f0-9]{64}$/);
    } catch (error) {
      if (error instanceof DixBaseError && error.code === "missing_scope") {
        console.warn("Skipping sandbox webhook preview: API key is missing webhooks:read scope.");
        return;
      }

      throw error;
    }
  });

  it("lists checkout currencies", async () => {
    const dixbase = new DixBase({
      apiKey: apiKey!,
      baseUrl
    });

    const currencies = await dixbase.checkout.currencies();
    const data = Array.isArray(currencies) ? currencies : currencies.data;

    expect(data.length).toBeGreaterThan(0);
    expect(data.some((item) => item.id === currency)).toBe(true);
  });
});
