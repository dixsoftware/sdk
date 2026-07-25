use std::collections::HashMap;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use hmac::{Hmac, Mac};
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION, CONTENT_TYPE, USER_AGENT};
use serde::de::DeserializeOwned;
use serde_json::Value;
use sha2::Sha256;
use subtle::ConstantTimeEq;
use uuid::Uuid;

const DEFAULT_BASE_URL: &str = "https://app.dixbase.com/v1";
const USER_AGENT_VALUE: &str = "dixbase-rust/1.0.0";
const DEFAULT_WEBHOOK_TOLERANCE: Duration = Duration::from_secs(300);

type HmacSha256 = Hmac<Sha256>;

#[derive(Debug, thiserror::Error)]
pub enum DixBaseError {
    #[error("DixBase api key is required.")]
    MissingApiKey,
    #[error("Webhook secret is required.")]
    MissingWebhookSecret,
    #[error("DixBase API request failed with status {status}: {body}")]
    Api { status: u16, body: String },
    #[error("HTTP request failed: {0}")]
    Http(#[from] reqwest::Error),
    #[error("JSON serialization failed: {0}")]
    Json(#[from] serde_json::Error),
    #[error("Invalid HTTP header: {0}")]
    Header(#[from] reqwest::header::InvalidHeaderValue),
    #[error("Webhook signature error: {0}")]
    WebhookSignature(String),
}

pub type Result<T> = std::result::Result<T, DixBaseError>;

#[derive(Clone)]
pub struct DixBase {
    http: HttpClient,
}

impl DixBase {
    pub fn new(api_key: impl Into<String>) -> Result<Self> {
        Self::with_base_url(api_key, DEFAULT_BASE_URL)
    }

    pub fn with_base_url(api_key: impl Into<String>, base_url: impl Into<String>) -> Result<Self> {
        let api_key = api_key.into();
        if api_key.trim().is_empty() {
            return Err(DixBaseError::MissingApiKey);
        }

        let base_url = base_url.into().trim_end_matches('/').to_owned();

        Ok(Self {
            http: HttpClient {
                client: reqwest::Client::new(),
                api_key,
                base_url,
            },
        })
    }

    pub fn checkout(&self) -> CheckoutClient {
        CheckoutClient {
            http: self.http.clone(),
        }
    }

    pub fn webhooks(&self) -> WebhookClient {
        WebhookClient {
            http: self.http.clone(),
        }
    }
}

#[derive(Clone)]
struct HttpClient {
    client: reqwest::Client,
    api_key: String,
    base_url: String,
}

impl HttpClient {
    async fn get(&self, path: &str, query: Option<&[(&str, &str)]>) -> Result<Value> {
        let mut request = self.client.get(self.url(path)).headers(self.headers(None)?);
        if let Some(query) = query {
            request = request.query(query);
        }
        self.send(request).await
    }

    async fn post(
        &self,
        path: &str,
        payload: &Value,
        idempotency_key: Option<&str>,
    ) -> Result<Value> {
        let request = self
            .client
            .post(self.url(path))
            .headers(self.headers(idempotency_key)?)
            .json(payload);
        self.send(request).await
    }

    async fn send(&self, request: reqwest::RequestBuilder) -> Result<Value> {
        let response = request.send().await?;
        let status = response.status();
        let body = response.text().await?;

        if !status.is_success() {
            return Err(DixBaseError::Api {
                status: status.as_u16(),
                body,
            });
        }

        if body.trim().is_empty() {
            return Ok(Value::Null);
        }

        Ok(serde_json::from_str(&body)?)
    }

    fn headers(&self, idempotency_key: Option<&str>) -> Result<HeaderMap> {
        let mut headers = HeaderMap::new();
        headers.insert(USER_AGENT, HeaderValue::from_static(USER_AGENT_VALUE));
        headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));
        headers.insert(
            AUTHORIZATION,
            HeaderValue::from_str(&format!("Bearer {}", self.api_key))?,
        );

        if let Some(idempotency_key) = idempotency_key {
            headers.insert("Idempotency-Key", HeaderValue::from_str(idempotency_key)?);
        }

        Ok(headers)
    }

    fn url(&self, path: &str) -> String {
        format!("{}{}", self.base_url, path)
    }
}

#[derive(Clone)]
pub struct CheckoutClient {
    http: HttpClient,
}

impl CheckoutClient {
    pub async fn create(&self, payload: Value) -> Result<Value> {
        self.create_with_idempotency(payload, None).await
    }

    pub async fn create_with_idempotency(
        &self,
        payload: Value,
        idempotency_key: Option<&str>,
    ) -> Result<Value> {
        let generated_key = Uuid::new_v4().to_string();
        let key = idempotency_key.unwrap_or(&generated_key);
        self.http
            .post("/business/api/checkout/sessions", &payload, Some(key))
            .await
    }

    pub async fn create_session(&self, payload: Value) -> Result<Value> {
        self.create(payload).await
    }

    pub async fn create_sandbox(&self, payload: Value) -> Result<Value> {
        self.create_sandbox_with_idempotency(payload, None).await
    }

    pub async fn create_sandbox_with_idempotency(
        &self,
        payload: Value,
        idempotency_key: Option<&str>,
    ) -> Result<Value> {
        let generated_key = Uuid::new_v4().to_string();
        let key = idempotency_key.unwrap_or(&generated_key);
        self.http
            .post(
                "/business/api/sandbox/checkout/sessions",
                &payload,
                Some(key),
            )
            .await
    }

    pub async fn create_sandbox_session(&self, payload: Value) -> Result<Value> {
        self.create_sandbox(payload).await
    }

    pub async fn retrieve(&self, checkout_id: &str) -> Result<Value> {
        self.http
            .get(
                &format!("/business/api/checkout/sessions/{checkout_id}"),
                None,
            )
            .await
    }

    pub async fn list(&self, query: Option<&[(&str, &str)]>) -> Result<Value> {
        self.http
            .get("/business/api/checkout/sessions", query)
            .await
    }

    pub async fn cancel(&self, checkout_id: &str) -> Result<Value> {
        self.http
            .post(
                &format!("/business/api/checkout/sessions/{checkout_id}/cancel"),
                &Value::Object(Default::default()),
                None,
            )
            .await
    }

    pub async fn currencies(&self) -> Result<Value> {
        self.http
            .get("/business/api/checkout/currencies", None)
            .await
    }
}

#[derive(Clone)]
pub struct WebhookClient {
    http: HttpClient,
}

impl WebhookClient {
    pub fn verify_signature<T: DeserializeOwned>(
        &self,
        raw_body: &[u8],
        signature_header: &str,
        secret: &str,
    ) -> Result<T> {
        verify_webhook_signature(
            raw_body,
            signature_header,
            secret,
            Some(DEFAULT_WEBHOOK_TOLERANCE),
        )
    }

    pub async fn list_deliveries(&self, query: Option<&[(&str, &str)]>) -> Result<Value> {
        self.http
            .get("/business/api/webhooks/deliveries", query)
            .await
    }

    pub async fn preview_sandbox(&self, payload: Value) -> Result<Value> {
        self.http
            .post("/business/api/sandbox/webhooks/preview", &payload, None)
            .await
    }
}

pub fn verify_webhook_signature<T: DeserializeOwned>(
    raw_body: &[u8],
    signature_header: &str,
    secret: &str,
    tolerance: Option<Duration>,
) -> Result<T> {
    if secret.trim().is_empty() {
        return Err(DixBaseError::MissingWebhookSecret);
    }

    let parsed = parse_signature_header(signature_header)?;
    if let (Some(timestamp), Some(tolerance)) = (parsed.timestamp, tolerance) {
        enforce_timestamp_tolerance(timestamp, tolerance)?;
    }

    let signed_payload = match parsed.timestamp {
        Some(timestamp) => {
            let mut payload = timestamp.to_string().into_bytes();
            payload.push(b'.');
            payload.extend_from_slice(raw_body);
            payload
        }
        None => raw_body.to_vec(),
    };

    let mut mac = HmacSha256::new_from_slice(secret.as_bytes())
        .map_err(|_| DixBaseError::WebhookSignature("invalid webhook secret".to_owned()))?;
    mac.update(&signed_payload);
    let expected = mac.finalize().into_bytes();
    let received = hex::decode(parsed.signature)
        .map_err(|_| DixBaseError::WebhookSignature("invalid signature encoding".to_owned()))?;

    if expected.as_slice().ct_eq(received.as_slice()).unwrap_u8() != 1 {
        return Err(DixBaseError::WebhookSignature(
            "signature verification failed".to_owned(),
        ));
    }

    Ok(serde_json::from_slice(raw_body)?)
}

struct ParsedSignature {
    timestamp: Option<i64>,
    signature: String,
}

fn parse_signature_header(header: &str) -> Result<ParsedSignature> {
    let mut values = HashMap::new();
    for part in header.split(',') {
        let trimmed = part.trim();
        if let Some((key, value)) = trimmed.split_once('=') {
            values.insert(key.trim(), value.trim());
        }
    }

    let timestamp = values
        .get("t")
        .map(|value| {
            value
                .parse::<i64>()
                .map_err(|_| DixBaseError::WebhookSignature("invalid timestamp".to_owned()))
        })
        .transpose()?;

    let signature = values
        .get("v1")
        .or_else(|| values.get("signature"))
        .copied()
        .unwrap_or(header.trim())
        .strip_prefix("sha256=")
        .unwrap_or_else(|| {
            values
                .get("v1")
                .or_else(|| values.get("signature"))
                .copied()
                .unwrap_or(header.trim())
        })
        .to_owned();

    if signature.len() != 64
        || !signature
            .chars()
            .all(|character| character.is_ascii_hexdigit())
    {
        return Err(DixBaseError::WebhookSignature(
            "invalid signature format".to_owned(),
        ));
    }

    Ok(ParsedSignature {
        timestamp,
        signature,
    })
}

fn enforce_timestamp_tolerance(timestamp: i64, tolerance: Duration) -> Result<()> {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|_| DixBaseError::WebhookSignature("system time before unix epoch".to_owned()))?
        .as_secs() as i64;
    let difference = now.abs_diff(timestamp);

    if difference > tolerance.as_secs() {
        return Err(DixBaseError::WebhookSignature(
            "timestamp outside tolerance".to_owned(),
        ));
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn signed_header(payload: &[u8], secret: &str, timestamp: i64) -> String {
        let mut signed_payload = timestamp.to_string().into_bytes();
        signed_payload.push(b'.');
        signed_payload.extend_from_slice(payload);

        let mut mac = HmacSha256::new_from_slice(secret.as_bytes()).unwrap();
        mac.update(&signed_payload);
        format!(
            "t={timestamp},v1={}",
            hex::encode(mac.finalize().into_bytes())
        )
    }

    #[test]
    fn verifies_signed_webhook_payload() {
        let payload = br#"{"type":"payment.succeeded","data":{"id":"chk_test"}}"#;
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;
        let header = signed_header(payload, "whsec_test", timestamp);

        let event: Value = verify_webhook_signature(
            payload,
            &header,
            "whsec_test",
            Some(Duration::from_secs(300)),
        )
        .unwrap();

        assert_eq!(event["type"], json!("payment.succeeded"));
    }

    #[test]
    fn rejects_invalid_webhook_signature() {
        let payload = br#"{"type":"payment.succeeded"}"#;
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;
        let header = signed_header(payload, "whsec_test", timestamp);

        let error =
            verify_webhook_signature::<Value>(payload, &header, "wrong_secret", None).unwrap_err();

        assert!(matches!(error, DixBaseError::WebhookSignature(_)));
    }

    #[test]
    fn rejects_stale_webhook_timestamp() {
        let payload = br#"{"type":"payment.succeeded"}"#;
        let header = signed_header(payload, "whsec_test", 1);

        let error = verify_webhook_signature::<Value>(
            payload,
            &header,
            "whsec_test",
            Some(Duration::from_secs(300)),
        )
        .unwrap_err();

        assert!(matches!(error, DixBaseError::WebhookSignature(_)));
    }
}
