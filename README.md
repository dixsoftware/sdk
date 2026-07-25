# DixBase Payments SDK

SDK oficial para que empresas acepten pagos con DixBase sin construir manualmente llamadas HTTP.

Paquete npm: `@dixbase/payments`

## DixConnect

DixConnect es la capa de integracion para empresas que quieren aceptar pagos con DixBase mediante checkout alojado, API keys, sandbox y webhooks firmados. La guia completa esta en `docs/dixconnect.md`.

Flujo recomendado:

1. La empresa crea una API key de DixBase con permisos de checkout.
2. Su backend crea una sesion de checkout con el SDK.
3. El cliente paga en la pagina alojada por DixBase.
4. DixBase envia un webhook firmado al backend.
5. El backend verifica la firma y actualiza el pedido.

DixConnect no guarda claves privadas, no firma transacciones y no permite retirar fondos desde billeteras. Cada empresa usa su propia API key y sus propios scopes.

## Estado de soporte

Stable:

- Node.js / TypeScript SDK
- PHP SDK
- Python SDK
- OpenAPI
- Postman collection
- Express and Next.js examples

Experimental:

- Go SDK
- .NET SDK
- Java SDK
- Rust SDK
- Ruby SDK
- Laravel package
- WooCommerce plugin

Los componentes experimentales estan incluidos para acelerar integraciones y recibir feedback, pero deben probarse en sandbox antes de usarse en produccion.

## Instalacion

```bash
npm install @dixbase/payments
```

Requiere Node.js 18 o superior.

## Configuracion

```ts
import { DixBase } from "@dixbase/payments";

const dixbase = new DixBase({
  apiKey: process.env.DIXBASE_API_KEY,
  environment: "production"
});
```

La API key debe crearse desde el panel de empresa y tener los scopes necesarios:

- `checkout:read`
- `checkout:write`
- `webhooks:read` para preview sandbox y entregas de webhooks
- `webhooks:write` solo si se gestionan endpoints webhook desde el panel/API autenticada de empresa

Base URL publica de produccion:

```txt
https://app.dixbase.com/v1
```

Este SDK usa las rutas modernas de checkout bajo `/business/api/checkout`. No usa rutas legacy de `/invoice/`.

## Crear checkout

`currency` debe ser el ID de moneda DixBase, por ejemplo `cur_xxxxx`. No uses `USD` o `EUR` salvo que DixBase devuelva esa moneda como ID.

```ts
const session = await dixbase.checkout.create({
  name: "Plan Professional",
  description: "Suscripcion mensual",
  amount: 99,
  currency: "cur_xxxxx",
  acceptedCurrencies: ["cur_xxxxx", "cur_yyyyy"],
  customerEmail: "cliente@email.com",
  successUrl: "https://miweb.com/success",
  cancelUrl: "https://miweb.com/cancel",
  clientReferenceId: "order_123",
  metadata: {
    organizationId: "org_123",
    plan: "professional"
  },
  expiresInMinutes: 30
});

res.redirect(session.checkoutUrl);
```

El SDK envia automaticamente:

- `Authorization: Bearer sk_live_xxxxx`
- `Content-Type: application/json`
- `User-Agent: dixbase-node/1.0.0`
- `Idempotency-Key: uuid-v4` en creaciones de checkout

Tambien puedes pasar tu propia idempotencia:

```ts
await dixbase.checkout.create(payload, {
  idempotencyKey: "order_123_create_checkout"
});
```

## Monedas disponibles

```ts
const currencies = await dixbase.checkout.currencies();
```

Endpoint usado: `GET /business/api/checkout/currencies`.

## Sandbox

```ts
const session = await dixbase.checkout.createSandbox({
  name: "Prueba sandbox",
  amount: 10,
  currency: "cur_xxxxx",
  customerEmail: "sandbox@example.com",
  clientReferenceId: "sandbox-123",
  forceStatus: "complete",
  metadata: {
    source: "sdk_test"
  }
});
```

Endpoint usado: `POST /business/api/sandbox/checkout/sessions`.

Tambien existen alias explicitos:

```ts
await dixbase.checkout.createSession(payload);
await dixbase.checkout.createSandboxSession(payload);
```

## Consultar, listar y cancelar

```ts
const session = await dixbase.checkout.retrieve("chk_xxxxx");

const sessions = await dixbase.checkout.list({
  limit: 20,
  status: "open"
});

const canceled = await dixbase.checkout.cancel("chk_xxxxx");
```

## Webhooks

Verifica siempre la firma usando el raw body exacto. No parsees JSON antes de verificar.

```ts
app.post("/webhooks/dixbase", express.raw({ type: "application/json" }), (req, res) => {
  const signature = req.header("X-DixBase-Signature");

  try {
    const event = dixbase.webhooks.verifySignature(
      req.body,
      signature,
      process.env.DIXBASE_WEBHOOK_SECRET
    );

    if (event.type === "checkout.session.completed" || event.type === "payment.succeeded") {
      // Marca tu orden como pagada aqui, despues de verificar la firma.
    }

    res.sendStatus(200);
  } catch {
    res.sendStatus(400);
  }
});
```

Header oficial: `X-DixBase-Signature`.

Eventos soportados:

- `checkout.session.created`
- `checkout.session.completed`
- `checkout.session.expired`
- `checkout.session.canceled`
- `payment.succeeded`
- `payment.failed`

La verificacion usa HMAC SHA-256, comparacion constant-time y rechaza firmas con timestamp fuera de tolerancia. La tolerancia por defecto es 300 segundos.

### Preview sandbox de webhooks

```ts
const preview = await dixbase.webhooks.previewSandbox({
  event: "checkout.session.completed",
  checkoutId: "chk_test_xxxxx",
  amount: 10,
  currency: "EUR"
});
```

Endpoint usado: `POST /business/api/sandbox/webhooks/preview`.

### Entregas de webhooks

```ts
const deliveries = await dixbase.webhooks.listDeliveries({
  limit: 20,
  status: "delivered"
});
```

Endpoint usado: `GET /business/api/webhooks/deliveries`.

## Errores

Los errores de API se normalizan como `DixBaseError`:

```ts
import { DixBaseError } from "@dixbase/payments";

try {
  await dixbase.checkout.retrieve("cs_missing");
} catch (error) {
  if (error instanceof DixBaseError) {
    console.log(error.statusCode);
    console.log(error.code);
    console.log(error.requestId);
    console.log(error.details);
  }
}
```

Casos esperados:

- `400`: payload invalido
- `401`: API key invalida
- `403`: scope insuficiente
- `404`: checkout no encontrado
- `409`: idempotencia o conflicto
- `422`: validacion
- `429`: rate limit
- `500`: error DixBase

## Seguridad

- Nunca expongas API keys en frontend.
- No crees checkouts desde un navegador publico.
- No aceptes webhooks sin verificar firma.
- No confies solo en `success_url`.
- No marques pedidos como pagados sin webhook verificado o consulta confirmada.

## Ejemplos

- `examples/node-create-checkout.ts`
- `examples/express.ts`
- `examples/nextjs-route.ts`
- `examples/php-create-checkout.php`

## SDK PHP

Tambien se incluye un SDK PHP Composer en `php/`:

```php
use DixBase\Payments\DixBase;

$dixbase = new DixBase([
    'apiKey' => getenv('DIXBASE_API_KEY'),
]);

$session = $dixbase->checkout->create([
    'name' => 'Plan Professional',
    'amount' => 99,
    'currency' => 'cur_xxxxx',
    'successUrl' => 'https://miweb.com/success',
    'cancelUrl' => 'https://miweb.com/cancel',
]);
```

## SDK Python

Tambien se incluye un SDK Python publicable en PyPI como `dixbase-payments`:

```python
from dixbase_payments import DixBase

dixbase = DixBase(api_key=os.environ["DIXBASE_API_KEY"])
session = dixbase.checkout.create({
    "name": "Order #1001",
    "amount": 49.90,
    "currency": "cur_xxxxx",
})
```

## SDK Rust

Tambien se incluye un SDK Rust publicable en crates.io como `dixbase-payments`:

```rust
use dixbase_payments::DixBase;
use serde_json::json;

let dixbase = DixBase::new(std::env::var("DIXBASE_API_KEY")?)?;
let session = dixbase.checkout().create(json!({
    "name": "Order #1001",
    "amount": 49.90,
    "currency": "cur_xxxxx",
    "successUrl": "https://miweb.com/success",
    "cancelUrl": "https://miweb.com/cancel"
})).await?;
```

## CLI

Despues de instalar el paquete globalmente:

```bash
dixbase currencies
dixbase checkout:sandbox --currency cur_xxxxx --amount 10
dixbase webhooks:verify --body payload.json --signature "t=...,v1=..." --secret whsec_xxxxx
```

## OpenAPI

El contrato OpenAPI esta en:

```txt
openapi/openapi.yaml
```

## SDKs adicionales

Esta carpeta tambien incluye paquetes para los ecosistemas mas usados:

- `go/` para Go modules (`github.com/dixsoftware/sdk/go`)
- `dotnet/` para NuGet
- `java/` para Maven Central
- `rust/` para crates.io
- `ruby/` para RubyGems
- `laravel/` para Packagist/Laravel

## Postman

Coleccion oficial:

```txt
postman/dixbase-business-api.postman_collection.json
```

## WooCommerce

Plugin beta:

```txt
plugins/woocommerce/dixbase-payments-for-woocommerce
```

Webhook URL:

```txt
https://tu-tienda.com/wc-api/dixbase_webhook
```

Debe probarse con pedidos sandbox y WordPress/WooCommerce reales antes de marcarlo como estable.

## Desarrollo

```bash
npm install
npm run typecheck
npm test
npm run build
```

Pruebas de integracion contra sandbox real:

```bash
DIXBASE_API_KEY=sk_test_xxxxx DIXBASE_TEST_CURRENCY_ID=cur_xxxxx npm run test:integration
```

En Windows PowerShell:

```powershell
$env:DIXBASE_API_KEY="sk_test_xxxxx"
$env:DIXBASE_TEST_CURRENCY_ID="cur_xxxxx"
npm run test:integration
```

Mas documentacion:

- `docs/dixconnect.md`
- `docs/api-reference.md`
- `docs/node-sdk.md`
- `docs/php-sdk.md`
- `docs/rust-sdk.md`
- `docs/integration-testing.md`
- `docs/publishing.md`

## Publicacion

```bash
git tag v1.0.0
git push origin v1.0.0
```

El workflow de release publica npm/PyPI/crates.io, empaqueta NuGet/Ruby/Java/WooCommerce y adjunta OpenAPI/Postman al release. Ver `docs/publishing.md`.
