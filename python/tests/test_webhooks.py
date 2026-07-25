import hashlib
import hmac
import json
import time

import pytest

from dixbase_payments import DixBase
from dixbase_payments.errors import DixBaseWebhookSignatureError


def test_verify_signature():
    dixbase = DixBase(api_key="dbx_live_test")
    body = json.dumps({"type": "checkout.session.completed", "data": {"id": "chk_123"}})
    timestamp = int(time.time())
    signature = hmac.new(
        b"whsec_test",
        f"{timestamp}.{body}".encode(),
        hashlib.sha256,
    ).hexdigest()

    event = dixbase.webhooks.verify_signature(body, f"t={timestamp},v1={signature}", "whsec_test")

    assert event["type"] == "checkout.session.completed"


def test_rejects_bad_signature():
    dixbase = DixBase(api_key="dbx_live_test")
    with pytest.raises(DixBaseWebhookSignatureError):
        dixbase.webhooks.verify_signature("{}", "v1=bad", "whsec_test")
