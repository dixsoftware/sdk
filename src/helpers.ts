import type { IncomingMessage } from "node:http";
import { DixBase } from "./index";
import type { DixBaseWebhookEvent } from "./types";

export async function readRawBody(request: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export function verifyExpressWebhook<T = unknown>(
  dixbase: DixBase,
  rawBody: Buffer | string,
  signature: string | string[] | undefined,
  secret: string
): DixBaseWebhookEvent<T> {
  const header = Array.isArray(signature) ? signature[0] : signature;
  return dixbase.webhooks.verifySignature<T>(rawBody, header, secret);
}

export async function verifyNextWebhook<T = unknown>(
  dixbase: DixBase,
  request: Request,
  secret: string
): Promise<DixBaseWebhookEvent<T>> {
  const rawBody = await request.text();
  const signature = request.headers.get("X-DixBase-Signature") ?? request.headers.get("DixBase-Signature");
  return dixbase.webhooks.verifySignature<T>(rawBody, signature, secret);
}
