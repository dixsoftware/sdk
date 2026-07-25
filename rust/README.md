# DixBase Payments SDK for Rust

SDK Rust oficial para crear sesiones de checkout alojado con DixBase, consultar monedas, revisar entregas de webhooks y verificar firmas de webhooks.

## Instalacion

```bash
cargo add dixbase-payments
```

Mientras se usa desde este repositorio:

```toml
[dependencies]
dixbase-payments = { path = "./rust" }
serde_json = "1"
tokio = { version = "1", features = ["macros", "rt-multi-thread"] }
```

## Crear checkout

```rust
use dixbase_payments::DixBase;
use serde_json::json;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let dixbase = DixBase::new(std::env::var("DIXBASE_API_KEY")?)?;

    let session = dixbase
        .checkout()
        .create(json!({
            "name": "Order #1001",
            "amount": 49.90,
            "currency": "cur_xxxxx",
            "customerEmail": "cliente@example.com",
            "successUrl": "https://miweb.com/success",
            "cancelUrl": "https://miweb.com/cancel",
            "clientReferenceId": "order_1001"
        }))
        .await?;

    println!("{}", session["checkoutUrl"]);
    Ok(())
}
```

El SDK envia automaticamente:

- `Authorization: Bearer <api_key>`
- `Content-Type: application/json`
- `User-Agent: dixbase-rust/1.0.0`
- `Idempotency-Key` en creaciones de checkout

## Sandbox

```rust
let session = dixbase
    .checkout()
    .create_sandbox(serde_json::json!({
        "name": "Prueba sandbox",
        "amount": 10,
        "currency": "cur_xxxxx",
        "forceStatus": "complete",
        "clientReferenceId": "sandbox_1001"
    }))
    .await?;
```

## Consultar, listar, cancelar y monedas

```rust
let currencies = dixbase.checkout().currencies().await?;
let session = dixbase.checkout().retrieve("chk_xxxxx").await?;
let sessions = dixbase.checkout().list(Some(&[("limit", "20"), ("status", "open")])).await?;
let canceled = dixbase.checkout().cancel("chk_xxxxx").await?;
```

## Webhooks

Verifica siempre la firma usando el raw body exacto recibido por tu servidor.

```rust
use dixbase_payments::verify_webhook_signature;
use serde_json::Value;
use std::time::Duration;

let event: Value = verify_webhook_signature(
    raw_body,
    signature_header,
    std::env::var("DIXBASE_WEBHOOK_SECRET")?.as_str(),
    Some(Duration::from_secs(300)),
)?;
```

Tambien puedes verificar desde el cliente:

```rust
let event: serde_json::Value = dixbase.webhooks().verify_signature(
    raw_body,
    signature_header,
    std::env::var("DIXBASE_WEBHOOK_SECRET")?.as_str(),
)?;
```

Header oficial: `X-DixBase-Signature`.

La verificacion usa HMAC SHA-256, payload firmado `timestamp.raw_body`, comparacion constant-time y tolerancia por defecto de 300 segundos.

## Endpoints cubiertos

- `POST /business/api/checkout/sessions`
- `POST /business/api/sandbox/checkout/sessions`
- `GET /business/api/checkout/sessions/{id}`
- `GET /business/api/checkout/sessions`
- `POST /business/api/checkout/sessions/{id}/cancel`
- `GET /business/api/checkout/currencies`
- `GET /business/api/webhooks/deliveries`
- `POST /business/api/sandbox/webhooks/preview`

## Desarrollo

```bash
cd rust
cargo fmt
cargo test
cargo clippy --all-targets -- -D warnings
```
