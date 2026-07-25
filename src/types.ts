export type DixBaseEnvironment = "production" | "sandbox";

export interface DixBaseConfig {
  apiKey: string;
  environment?: DixBaseEnvironment;
  /**
   * Defaults to the DixBase production API:
   * https://app.dixbase.com/v1
   */
  baseUrl?: string;
  timeoutMs?: number;
}

export interface RequestOptions {
  idempotencyKey?: string;
  signal?: AbortSignal;
}

export interface SandboxWebhookPreviewPayload {
  event?: DixBaseWebhookEventType;
  /**
   * Convenience alias accepted by the SDK. It is sent to DixBase as `event`.
   */
  eventType?: DixBaseWebhookEventType;
  checkoutId?: string;
  amount: number;
  currency?: string;
  clientReferenceId?: string;
  metadata?: CheckoutMetadata;
}

export interface SandboxWebhookPreview {
  object: "sandbox.webhook_preview";
  livemode: false;
  payload: DixBaseWebhookEvent;
  signature: string;
  signingSecret: string;
  [key: string]: unknown;
}

export interface ListWebhookDeliveriesParams {
  limit?: number;
  status?: WebhookDeliveryStatus | string;
}

export interface ListCheckoutSessionsParams {
  limit?: number;
  status?: CheckoutSessionStatus;
}

export type CheckoutSessionStatus = "open" | "complete" | "expired" | "canceled";
export type SandboxForceStatus = CheckoutSessionStatus | "completed";
export type PaymentStatus = "unpaid" | "paid";

export interface CheckoutMetadata {
  [key: string]: string | number | boolean | null | CheckoutMetadata | CheckoutMetadata[];
}

export interface CreateCheckoutSessionPayload {
  name: string;
  amount: number | string;
  currency?: string;
  description?: string;
  acceptedCurrencies?: string[];
  wallet?: string;
  customerEmail?: string;
  successUrl?: string;
  cancelUrl?: string;
  clientReferenceId?: string;
  metadata?: CheckoutMetadata;
  expiresInMinutes?: number;
}

export interface CreateSandboxCheckoutSessionPayload extends CreateCheckoutSessionPayload {
  forceStatus?: SandboxForceStatus;
}

export interface CheckoutSession {
  id: string;
  object: "checkout.session";
  status: CheckoutSessionStatus;
  paymentStatus: PaymentStatus;
  mode: "payment" | string;
  amount: string;
  currency: string;
  customerEmail?: string | null;
  clientReferenceId?: string | null;
  metadata: CheckoutMetadata;
  checkoutUrl: string;
  invoiceId?: string | null;
  successUrl?: string | null;
  cancelUrl?: string | null;
  createdAt?: string;
  expiresAt?: string | null;
  completedAt?: string | null;
  canceledAt?: string | null;
  livemode?: boolean;
  paymentAttempts?: CheckoutPaymentAttempt[];
  webhookEvent?: DixBaseWebhookEvent;
  webhookSignature?: string;
}

export interface CheckoutCurrency {
  id: string;
  name: string;
  ticker: string;
  decimals: number;
  image?: string | null;
  networks: CheckoutNetwork[];
}

export interface CheckoutNetwork {
  id: string;
  name: string;
  handler: string;
  contract?: string | null;
  decimals: number;
  confirmations?: number | null;
}

export interface CheckoutPaymentAttempt {
  id: number;
  status: string;
  amount: string;
  currency: string;
  network?: string | null;
  address?: string | null;
  addressExtra?: string | null;
  txHash?: string | null;
  createdAt: string;
}

export interface ListResponse<T> {
  object?: "list";
  data: T[];
  hasMore?: boolean;
  nextCursor?: string | null;
}

export type DixBaseWebhookEventType =
  | "checkout.session.created"
  | "checkout.session.completed"
  | "checkout.session.expired"
  | "checkout.session.canceled"
  | "payment.succeeded"
  | "payment.failed"
  | string;

export interface DixBaseWebhookEvent<T = unknown> {
  id?: string;
  object?: "event" | string;
  type: DixBaseWebhookEventType;
  created?: string | number;
  livemode?: boolean;
  data: T;
}

export type WebhookDeliveryStatus = "pending" | "retrying" | "delivered" | "failed";

export interface WebhookDelivery {
  id: string;
  eventId: string;
  eventType: DixBaseWebhookEventType;
  status: WebhookDeliveryStatus | string;
  attempts: number;
  webhookId?: string | null;
  url?: string | null;
  lastHttpStatus?: number | null;
  lastError?: string | null;
  lastResponseBody?: string | null;
  createdAt: string;
  updatedAt: string;
  nextRetryAt?: string | null;
  deliveredAt?: string | null;
}

export interface VerifySignatureOptions {
  toleranceSeconds?: number;
}
