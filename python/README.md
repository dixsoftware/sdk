# DixBase Payments Python

```bash
pip install dixbase-payments
```

```python
import os
from dixbase_payments import DixBase

dixbase = DixBase(api_key=os.environ["DIXBASE_API_KEY"])

session = dixbase.checkout.create({
    "name": "Order #1001",
    "amount": 49.90,
    "currency": "cur_xxxxx",
    "successUrl": "https://store.example/success",
    "cancelUrl": "https://store.example/cancel",
})

print(session["checkoutUrl"])
```
