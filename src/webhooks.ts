import { createHmac, timingSafeEqual } from "node:crypto";
import { DixBaseWebhookSignatureError } from "./errors";
import type {
  DixBaseWebhookEvent,
  ListResponse,
  ListWebhookDeliveriesParams,
  RequestOptions,
  SandboxWebhookPreview,
  SandboxWebhookPreviewPayload,
  VerifySignatureOptions,
  WebhookDelivery
} from "./types";
import type { HttpClient } from "./http";

const DEFAULT_TOLERANCE_SECONDS = 300;

export class WebhooksResource {
  constructor(private readonly http?: HttpClient) {}

  previewSandbox(
    payload: SandboxWebhookPreviewPayload,
    options?: RequestOptions
  ): Promise<SandboxWebhookPreview> {
    if (!this.http) {
      throw new Error("DixBase HTTP client is not configured.");
    }

    return this.http.post<SandboxWebhookPreview>(
      "/business/api/sandbox/webhooks/preview",
      normalizePreviewPayload(payload),
      options
    );
  }

  listDeliveries(
    params?: ListWebhookDeliveriesParams,
    options?: RequestOptions
  ): Promise<ListResponse<WebhookDelivery>> {
    if (!this.http) {
      throw new Error("DixBase HTTP client is not configured.");
    }

    return this.http.get<ListResponse<WebhookDelivery>>(
      "/business/api/webhooks/deliveries",
      params as Record<string, unknown> | undefined,
      options
    );
  }

  verifySignature<T = unknown>(
    rawBody: string | Buffer,
    signature: string | undefined | null,
    secret: string,
    options: VerifySignatureOptions = {}
  ): DixBaseWebhookEvent<T> {
    if (!signature) {
      throw new DixBaseWebhookSignatureError("Missing DixBase webhook signature.");
    }

    if (!secret) {
      throw new DixBaseWebhookSignatureError("Missing DixBase webhook secret.");
    }

    const parsed = parseSignatureHeader(signature);
    const payload = Buffer.isBuffer(rawBody) ? rawBody.toString("utf8") : rawBody;
    const signedPayload = parsed.timestamp ? `${parsed.timestamp}.${payload}` : payload;
    const expected = createHmac("sha256", secret).update(signedPayload, "utf8").digest("hex");

    if (!hasValidSignature(expected, parsed.signatures)) {
      throw new DixBaseWebhookSignatureError("Invalid DixBase webhook signature.");
    }

    if (parsed.timestamp) {
      assertFreshTimestamp(parsed.timestamp, options.toleranceSeconds ?? DEFAULT_TOLERANCE_SECONDS);
    }

    try {
      return JSON.parse(payload) as DixBaseWebhookEvent<T>;
    } catch {
      throw new DixBaseWebhookSignatureError("Webhook payload is not valid JSON.");
    }
  }
}

function normalizePreviewPayload(payload: SandboxWebhookPreviewPayload): SandboxWebhookPreviewPayload {
  const { eventType, ...rest } = payload;

  return {
    ...rest,
    event: payload.event ?? eventType ?? "checkout.session.completed"
  };
}

function parseSignatureHeader(header: string): { timestamp?: number; signatures: string[] } {
  const parts = header.split(",").map((part) => part.trim());
  const signatures: string[] = [];
  let timestamp: number | undefined;

  for (const part of parts) {
    const [key, value] = part.split("=", 2);

    if (!key || !value) {
      signatures.push(part);
      continue;
    }

    if (key === "t") {
      const parsedTimestamp = Number(value);
      if (Number.isFinite(parsedTimestamp)) {
        timestamp = parsedTimestamp;
      }
      continue;
    }

    if (key === "v1" || key === "signature") {
      signatures.push(value);
    }
  }

  if (signatures.length === 0) {
    signatures.push(header);
  }

  return { timestamp, signatures };
}

function hasValidSignature(expectedHex: string, candidates: string[]): boolean {
  const expected = Buffer.from(expectedHex, "hex");

  return candidates.some((candidate) => {
    const candidateHex = candidate.startsWith("sha256=") ? candidate.slice("sha256=".length) : candidate;

    if (!/^[a-f0-9]{64}$/i.test(candidateHex)) {
      return false;
    }

    const actual = Buffer.from(candidateHex, "hex");
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  });
}

function assertFreshTimestamp(timestamp: number, toleranceSeconds: number): void {
  const now = Math.floor(Date.now() / 1000);
  const age = Math.abs(now - timestamp);

  if (age > toleranceSeconds) {
    throw new DixBaseWebhookSignatureError("DixBase webhook signature timestamp is outside tolerance.");
  }
}
