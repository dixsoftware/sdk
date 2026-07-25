# DixBase Payments for WooCommerce

WooCommerce gateway plugin for DixBase hosted checkout.

## Install

1. Upload `dixbase-payments-for-woocommerce.zip` from this directory in WordPress admin, or copy `dixbase-payments-for-woocommerce/` into `wp-content/plugins/`.
2. Activate "DixBase Payments for WooCommerce".
3. Configure:
   - DixBase API key
   - DixBase price currency ID, optional
   - Webhook signing secret
4. Set webhook URL in DixBase:

```txt
https://your-store.example/wc-api/dixbase_webhook
```

## WordPress.org submission

Submit `dixbase-payments-for-woocommerce.zip` at:

```txt
https://wordpress.org/plugins/developers/add/
```

The ZIP has been validated locally with WordPress Plugin Check using the `dixbase-payments-for-woocommerce` slug.

After approval, WordPress.org will provide SVN access. Commit the release to `trunk/` and tag stable versions under `tags/0.1.0/`.

Before enabling it in production, test at least one real WooCommerce sandbox order end to end.