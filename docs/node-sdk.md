# SDK Node.js/TypeScript

El paquete `@dixbase/payments` permite crear sesiones de checkout, consultar sesiones, cancelar sesiones, listar monedas DixBase y verificar webhooks.

## Rutas usadas

```txt
POST /business/api/checkout/sessions
POST /business/api/sandbox/checkout/sessions
POST /business/api/sandbox/webhooks/preview
GET  /business/api/webhooks/deliveries
GET  /business/api/checkout/sessions
GET  /business/api/checkout/sessions/{checkout_id}
POST /business/api/checkout/sessions/{checkout_id}/cancel
GET  /business/api/checkout/currencies
```

No usa rutas legacy de `/invoice/`.

## Uso minimo

```ts
import { DixBase } from "@dixbase/payments";

const dixbase = new DixBase({
  apiKey: process.env.DIXBASE_API_KEY
});

const session = await dixbase.checkout.create({
  name: "Plan Professional",
  amount: 99,
  currency: "cur_xxxxx",
  customerEmail: "cliente@email.com",
  successUrl: "https://miweb.com/success",
  cancelUrl: "https://miweb.com/cancel",
  clientReferenceId: "order_123"
});
```

## Checklist de seguridad

- Crear checkouts solo desde backend.
- Usar IDs de moneda DixBase devueltos por `checkout.currencies()`.
- Verificar webhooks con raw body.
- Leer la firma desde `X-DixBase-Signature`.
- Confirmar pagos por webhook verificado o consulta al checkout.
- No exponer API keys en frontend.
