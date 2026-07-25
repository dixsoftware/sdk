import uuid
from urllib.parse import urlencode

import requests

from .errors import DixBaseError
from .utils import to_camel, to_snake, transform_keys
from .webhooks import Webhooks


class DixBase:
    def __init__(self, api_key, base_url="https://app.dixbase.com/v1", timeout=30):
        if not api_key:
            raise ValueError("DixBase api_key is required.")
        self._http = _HttpClient(api_key=api_key, base_url=base_url, timeout=timeout)
        self.checkout = Checkout(self._http)
        self.webhooks = Webhooks(self._http)


class Checkout:
    def __init__(self, http):
        self._http = http

    def create(self, payload, idempotency_key=None):
        return self._http.post(
            "/business/api/checkout/sessions",
            payload,
            idempotency_key=idempotency_key or str(uuid.uuid4()),
        )

    def create_session(self, payload, idempotency_key=None):
        return self.create(payload, idempotency_key=idempotency_key)

    def create_sandbox(self, payload, idempotency_key=None):
        body = dict(payload)
        if body.get("forceStatus") == "completed":
            body["forceStatus"] = "complete"
        return self._http.post(
            "/business/api/sandbox/checkout/sessions",
            body,
            idempotency_key=idempotency_key or str(uuid.uuid4()),
        )

    def create_sandbox_session(self, payload, idempotency_key=None):
        return self.create_sandbox(payload, idempotency_key=idempotency_key)

    def retrieve(self, checkout_id):
        return self._http.get(f"/business/api/checkout/sessions/{checkout_id}")

    def list(self, params=None):
        return self._http.get("/business/api/checkout/sessions", params=params or {})

    def cancel(self, checkout_id):
        return self._http.post(f"/business/api/checkout/sessions/{checkout_id}/cancel")

    def currencies(self):
        return self._http.get("/business/api/checkout/currencies")


class _HttpClient:
    def __init__(self, api_key, base_url, timeout):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    def get(self, path, params=None):
        query = f"?{urlencode(transform_keys(params or {}, to_snake))}" if params else ""
        return self._request("GET", f"{path}{query}")

    def post(self, path, body=None, idempotency_key=None):
        return self._request("POST", path, body=body, idempotency_key=idempotency_key)

    def _request(self, method, path, body=None, idempotency_key=None):
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "User-Agent": "dixbase-python/1.0.0",
        }
        if method == "POST" and idempotency_key:
            headers["Idempotency-Key"] = idempotency_key

        response = requests.request(
            method,
            self._url(path),
            json=transform_keys(body, to_snake) if body is not None else None,
            headers=headers,
            timeout=self.timeout,
        )
        data = response.json() if response.text else {}

        if response.status_code >= 400:
            error = data.get("error", data) if isinstance(data, dict) else {}
            message = error.get("message") or error.get("detail") or f"DixBase API request failed with status {response.status_code}."
            code = error.get("code") or error.get("detail")
            raise DixBaseError(
                message,
                status_code=response.status_code,
                code=code,
                request_id=response.headers.get("x-request-id") or response.headers.get("request-id"),
                details=data,
            )

        return transform_keys(data, to_camel)

    def _url(self, path):
        if self.base_url.endswith("/business/api") and path.startswith("/business/api/"):
            return self.base_url + path[len("/business/api") :]
        return self.base_url + path
