import { CheckoutResource } from "./checkout";
import { HttpClient } from "./http";
import { WebhooksResource } from "./webhooks";
import type { DixBaseConfig } from "./types";

export class DixBase {
  readonly checkout: CheckoutResource;
  readonly webhooks: WebhooksResource;

  constructor(config: DixBaseConfig) {
    const http = new HttpClient(config);
    this.checkout = new CheckoutResource(http);
    this.webhooks = new WebhooksResource(http);
  }
}

export { DixBaseError, DixBaseWebhookSignatureError } from "./errors";
export { readRawBody, verifyExpressWebhook, verifyNextWebhook } from "./helpers";
export type {
  CheckoutCurrency,
  CheckoutMetadata,
  CheckoutSession,
  CheckoutSessionStatus,
  CreateCheckoutSessionPayload,
  CreateSandboxCheckoutSessionPayload,
  DixBaseConfig,
  DixBaseEnvironment,
  DixBaseWebhookEvent,
  DixBaseWebhookEventType,
  ListCheckoutSessionsParams,
  ListResponse,
  PaymentStatus,
  RequestOptions,
  SandboxWebhookPreview,
  SandboxWebhookPreviewPayload,
  VerifySignatureOptions
} from "./types";
