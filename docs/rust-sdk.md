# SDK Rust

El paquete `dixbase-payments` esta pensado para backends Rust que necesitan crear checkouts alojados, consultar estados y verificar webhooks firmados de DixBase.

## Instalacion

```bash
cargo add dixbase-payments
```

## Uso basico

```rust
use dixbase_payments::DixBase;
use serde_json::json;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let dixbase = DixBase::new(std::env::var("DIXBASE_API_KEY")?)?;

    let session = dixbase.checkout().create(json!({
        "name": "Plan Professional",
        "amount": 99,
        "currency": "cur_xxxxx",
        "successUrl": "https://miweb.com/success",
        "cancelUrl": "https://miweb.com/cancel",
        "clientReferenceId": "order_123"
    })).await?;

    println!("{}", session["checkoutUrl"]);
    Ok(())
}
```

## Seguridad

- Usa el SDK solo desde backend.
- No expongas `DIXBASE_API_KEY` ni `DIXBASE_WEBHOOK_SECRET` en frontend.
- Verifica webhooks con el raw body exacto antes de marcar pedidos como pagados.
- Usa `clientReferenceId` o una idempotencia propia para reconciliar pedidos con tu base de datos.

## Webhooks

```rust
use dixbase_payments::verify_webhook_signature;
use serde_json::Value;
use std::time::Duration;

let event: Value = verify_webhook_signature(
    raw_body,
    signature_header,
    webhook_secret,
    Some(Duration::from_secs(300)),
)?;
```

El header esperado es `X-DixBase-Signature`. Se aceptan firmas con formato `t=<timestamp>,v1=<hex>` y se rechazan timestamps fuera de tolerancia.
