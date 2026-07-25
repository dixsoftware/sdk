# Referencia rapida

Para una guia completa de integracion empresarial, revisa `docs/dixconnect.md`.

## Constructor

```ts
new DixBase({
  apiKey: "sk_live_xxxxx",
  baseUrl: "https://app.dixbase.com/v1",
  timeoutMs: 30000
});
```

## Checkout

```ts
dixbase.checkout.create(payload, options?)
dixbase.checkout.createSession(payload, options?)
dixbase.checkout.createSandbox(payload, options?)
dixbase.checkout.createSandboxSession(payload, options?)
dixbase.checkout.retrieve(checkoutId)
dixbase.checkout.list(params?)
dixbase.checkout.cancel(checkoutId)
dixbase.checkout.currencies()
```

## Webhooks

```ts
dixbase.webhooks.verifySignature(rawBody, signature, secret, options?)
dixbase.webhooks.previewSandbox(payload)
dixbase.webhooks.listDeliveries(params?)
```

## Errores

```ts
class DixBaseError extends Error {
  statusCode: number;
  code?: string;
  requestId?: string;
  details?: unknown;
}
```
