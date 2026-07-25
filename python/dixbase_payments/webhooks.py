import hashlib
import hmac
import json
import time

from .errors import DixBaseWebhookSignatureError
from .utils import to_snake, transform_keys


class Webhooks:
    def __init__(self, http=None):
        self._http = http

    def preview_sandbox(self, payload):
        if self._http is None:
            raise RuntimeError("DixBase HTTP client is not configured.")
        body = dict(payload)
        if "event" not in body and "eventType" in body:
            body["event"] = body.pop("eventType")
        return self._http.post("/business/api/sandbox/webhooks/preview", body)

    def list_deliveries(self, params=None):
        if self._http is None:
            raise RuntimeError("DixBase HTTP client is not configured.")
        return self._http.get("/business/api/webhooks/deliveries", params=params or {})

    def verify_signature(self, raw_body, signature, secret, tolerance_seconds=300):
        if not signature:
            raise DixBaseWebhookSignatureError("Missing DixBase webhook signature.")
        if not secret:
            raise DixBaseWebhookSignatureError("Missing DixBase webhook secret.")

        payload = raw_body.decode("utf-8") if isinstance(raw_body, bytes) else raw_body
        timestamp, signatures = _parse_signature(signature)
        signed_payload = f"{timestamp}.{payload}" if timestamp else payload
        expected = hmac.new(secret.encode("utf-8"), signed_payload.encode("utf-8"), hashlib.sha256).hexdigest()

        if not any(_safe_compare(expected, candidate) for candidate in signatures):
            raise DixBaseWebhookSignatureError("Invalid DixBase webhook signature.")

        if timestamp and abs(time.time() - timestamp) > tolerance_seconds:
            raise DixBaseWebhookSignatureError("DixBase webhook signature timestamp is outside tolerance.")

        return json.loads(payload)


def _parse_signature(header):
    timestamp = None
    signatures = []
    for part in [item.strip() for item in header.split(",")]:
        if "=" not in part:
            signatures.append(part)
            continue
        key, value = part.split("=", 1)
        if key == "t":
            try:
                timestamp = int(value)
            except ValueError:
                pass
        elif key in ("v1", "signature"):
            signatures.append(value)
    return timestamp, signatures or [header]


def _safe_compare(expected, candidate):
    if candidate.startswith("sha256="):
        candidate = candidate[7:]
    if len(candidate) != 64:
        return False
    return hmac.compare_digest(expected, candidate)
