# DixConnect

DixConnect es la forma recomendada de conectar una tienda, SaaS, marketplace o sistema interno con DixBase usando el SDK de pagos. Su objetivo es que una empresa pueda aceptar pagos con checkout alojado, recibir confirmaciones por webhook y probar la integracion en sandbox sin construir toda la infraestructura de pagos desde cero.

DixConnect no es una wallet, no firma transacciones, no guarda claves privadas y no permite retirar fondos. Cada integracion trabaja con la API key de la cuenta DixBase de esa empresa y solo puede ejecutar las acciones permitidas por los scopes de esa API key.

## Para que sirve

DixConnect sirve para:

- crear sesiones de checkout alojadas por DixBase;
- redirigir al cliente a una pagina de pago segura;
- consultar el estado de una sesion de checkout;
- cancelar sesiones abiertas cuando corresponda;
- listar las monedas y redes disponibles para checkout;
- recibir eventos firmados cuando un pago se completa, expira o se cancela;
- probar flujos completos con sandbox sin mover fondos reales.

El flujo normal es:

1. La empresa crea una API key en DixBase con permisos de checkout.
2. El backend de la empresa usa el SDK con esa API key.
3. El backend crea una sesion de checkout.
4. El cliente es redirigido a `checkout_url`.
5. DixBase procesa el pago en la pagina alojada.
6. DixBase envia un webhook firmado al backend de la empresa.
7. El backend verifica la firma y actualiza el pedido, factura o suscripcion.

## Requisitos

Necesitas:

- una cuenta de empresa en DixBase;
- una API key con scopes adecuados;
- una moneda de checkout activa, por ejemplo `cur_xxxxx`;
- una URL publica HTTPS para recibir webhooks en produccion;
- un backend propio donde guardar la API key de forma segura.

La API key debe estar siempre en el servidor. No debe ponerse en frontend, apps moviles, repositorios publicos ni archivos distribuidos a clientes.

## Scopes recomendados

Para crear checkouts:

```txt
checkout:read
checkout:write
```

Para probar o revisar webhooks desde el SDK:

```txt
webhooks:read
```

Para gestionar endpoints webhook desde herramientas internas o panel/API autenticada de empresa:

```txt
webhooks:write
```

Si una API key no tiene el scope necesario, DixBase responde con `missing_scope`.

## Instalacion Node.js

```bash
npm install @dixbase/payments
```

Configura las variables de entorno:

```bash
DIXBASE_API_KEY=dbx_live_xxxxx
DIXBASE_CURRENCY_ID=cur_xxxxx
DIXBASE_WEBHOOK_SECRET=whsec_xxxxx
```

## Crear un checkout

El checkout debe crearse desde el backend de la empresa.

```ts
import { DixBase } from "@dixbase/payments";

const dixbase = new DixBase({
  apiKey: process.env.DIXBASE_API_KEY!
});

const session = await dixbase.checkout.create({
  name: "Pedido #1001",
  description: "Compra en Mi Tienda",
  amount: 49.99,
  currency: process.env.DIXBASE_CURRENCY_ID,
  customerEmail: "cliente@mitienda.com",
  successUrl: "https://mitienda.com/pago/exito",
  cancelUrl: "https://mitienda.com/pago/cancelado",
  clientReferenceId: "order_1001",
  metadata: {
    orderId: "1001"
  }
});

return Response.redirect(session.checkoutUrl, 303);
```

Endpoint usado:

```txt
POST /v1/business/api/checkout/sessions
```

## Idempotencia

Usa una idempotency key estable por pedido para evitar checkouts duplicados si el usuario hace doble clic o si tu servidor reintenta la peticion.

```ts
const session = await dixbase.checkout.create(
  {
    name: "Pedido #1001",
    amount: 49.99,
    currency: process.env.DIXBASE_CURRENCY_ID,
    clientReferenceId: "order_1001"
  },
  {
    idempotencyKey: "order_1001_checkout"
  }
);
```

Si reutilizas la misma idempotency key con datos distintos, DixBase puede responder `idempotency_key_reused`.

## Verificar webhooks

El webhook es la fuente recomendada para confirmar pagos. No marques un pedido como pagado solo porque el cliente vuelve a tu `successUrl`.

Ejemplo con Express:

```ts
import express from "express";
import { DixBase } from "@dixbase/payments";

const app = express();
const dixbase = new DixBase({ apiKey: process.env.DIXBASE_API_KEY! });

app.post(
  "/webhooks/dixbase",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const signature = req.header("X-DixBase-Signature");

    try {
      const event = dixbase.webhooks.verifySignature(
        req.body,
        signature,
        process.env.DIXBASE_WEBHOOK_SECRET!
      );

      if (event.type === "checkout.session.completed") {
        const checkout = event.data as { id: string; client_reference_id?: string };
        // Actualiza aqui tu pedido usando checkout.id o checkout.client_reference_id.
      }

      res.sendStatus(200);
    } catch {
      res.sendStatus(400);
    }
  }
);
```

Header oficial: `X-DixBase-Signature`.

La firma usa HMAC SHA-256 sobre el cuerpo recibido. Para que la verificacion funcione, debes pasar el cuerpo raw sin modificar.

## Probar con sandbox

Sandbox permite simular estados sin mover fondos reales.

```ts
const session = await dixbase.checkout.createSandbox({
  name: "Prueba sandbox",
  amount: 10,
  currency: process.env.DIXBASE_CURRENCY_ID,
  forceStatus: "complete",
  metadata: {
    testRun: "checkout-complete"
  }
});

console.log(session.webhookEvent);
console.log(session.webhookSignature);
```

Endpoint usado:

```txt
POST /v1/business/api/sandbox/checkout/sessions
```

Tambien puedes crear una vista previa de webhook:

```ts
const preview = await dixbase.webhooks.previewSandbox({
  event: "checkout.session.completed",
  amount: 10,
  currency: "EUR",
  checkoutId: "chk_test_123"
});
```

Endpoint usado:

```txt
POST /v1/business/api/sandbox/webhooks/preview
```

## Consultar estado

```ts
const checkout = await dixbase.checkout.retrieve("chk_xxxxx");

if (checkout.status === "complete" && checkout.paymentStatus === "paid") {
  // El checkout fue pagado.
}
```

Tambien puedes listar sesiones:

```ts
const sessions = await dixbase.checkout.list({
  limit: 20,
  status: "open"
});
```

## Revisar entregas de webhooks

Si tu API key tiene `webhooks:read`, puedes listar intentos de entrega para auditar problemas de integracion:

```ts
const deliveries = await dixbase.webhooks.listDeliveries({
  limit: 20,
  status: "failed"
});
```

Endpoint usado:

```txt
GET /v1/business/api/webhooks/deliveries
```

## Errores comunes

`invalid_api_key`: la API key no existe, fue revocada o no se envio como Bearer token.

`missing_scope`: la API key no tiene el permiso necesario.

`business_inactive`: la cuenta de empresa no esta habilitada para usar checkout.

`invalid_idempotency_key`: la idempotency key esta vacia o supera el limite permitido.

`idempotency_key_reused`: se reutilizo una idempotency key con un cuerpo diferente.

`checkout_not_found`: el checkout no existe o no pertenece a la empresa autenticada.

`checkout_already_completed`: se intento cancelar una sesion que ya fue pagada.

`webhook_not_found`: el webhook no existe o no pertenece a la empresa.

`unsafe_webhook_url`: la URL de webhook fue bloqueada por proteccion SSRF o no es apta para produccion.

## Buenas practicas

- Guarda la API key solo en variables de entorno o gestores de secretos.
- Usa una idempotency key por pedido.
- Verifica siempre la firma del webhook.
- Usa el header oficial `X-DixBase-Signature`.
- Responde `2xx` al webhook solo despues de procesarlo correctamente.
- Mantén `clientReferenceId` o `metadata.orderId` para reconciliar pagos con pedidos internos.
- Usa sandbox antes de activar produccion.
- Registra logs internos con `checkout.id`, `invoiceId` y `clientReferenceId`.
- No uses el SDK para exponer endpoints directos desde frontend.

## Seguridad

DixConnect no incluye funciones de retiro ni de transferencia de fondos. El SDK solo llama endpoints de checkout, sandbox, monedas y webhooks. La capacidad real de una API key depende de los scopes definidos en DixBase.

Para integraciones publicas, crea API keys especificas para checkout y evita reutilizar claves administrativas.
