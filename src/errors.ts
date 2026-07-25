export interface DixBaseErrorOptions {
  message: string;
  statusCode: number;
  code?: string;
  requestId?: string;
  details?: unknown;
}

export class DixBaseError extends Error {
  readonly statusCode: number;
  readonly code?: string;
  readonly requestId?: string;
  readonly details?: unknown;

  constructor(options: DixBaseErrorOptions) {
    super(options.message);
    this.name = "DixBaseError";
    this.statusCode = options.statusCode;
    this.code = options.code;
    this.requestId = options.requestId;
    this.details = options.details;
  }
}

export class DixBaseWebhookSignatureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DixBaseWebhookSignatureError";
  }
}
