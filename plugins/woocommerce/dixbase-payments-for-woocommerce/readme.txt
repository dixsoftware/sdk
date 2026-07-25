=== DixBase Payments for WooCommerce ===
Contributors: dixbase
Tags: dixbase, woocommerce, payments, checkout, crypto
Requires at least: 6.5
Tested up to: 7.0
Requires PHP: 7.4
Stable tag: 0.1.0
Requires Plugins: woocommerce
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Accept DixBase hosted checkout payments in WooCommerce.

== Description ==

DixBase Payments for WooCommerce lets stores accept payments through DixBase hosted checkout.

The plugin creates a DixBase checkout session from the WooCommerce checkout, redirects the customer to the hosted DixBase payment page, and confirms paid orders through signed webhooks.

This plugin connects your store to the DixBase payment service. To use it, you need a DixBase business account, an API key with checkout permissions, and a webhook signing secret. The plugin sends order payment data required to create the checkout session, including order amount, customer email, return URLs, order reference, and basic metadata.

The plugin does not store customer payment credentials, private keys, seed phrases, or wallet withdrawal permissions. Payment processing happens on DixBase hosted checkout.

Service documentation: https://app.dixbase.com/docs/

Source code: https://github.com/dixsoftware/sdk

== External Service ==

This plugin connects to DixBase at `https://app.dixbase.com/v1` to create hosted checkout sessions. A request is sent when a customer chooses DixBase at WooCommerce checkout and places an order.

The request includes the order amount, customer email, success URL, cancel URL, WooCommerce order ID as `client_reference_id`, and metadata needed to reconcile the payment with the WooCommerce order.

DixBase sends signed webhook requests to your store when payment events occur. The plugin verifies these webhooks using the configured signing secret.

Service documentation: https://app.dixbase.com/docs/

Service terms: https://dixbase.com/terms/

== Requirements ==

* WordPress 6.5 or newer.
* WooCommerce active.
* PHP 7.4 or newer.
* A DixBase business API key with `checkout:write`.
* A DixBase webhook signing secret.

== Installation ==

1. Upload the `dixbase-payments` folder to `/wp-content/plugins/`, or install the ZIP from the WordPress admin plugin screen.
2. Activate `DixBase Payments for WooCommerce`.
3. Go to WooCommerce > Settings > Payments.
4. Enable DixBase.
5. Enter your DixBase API key, optional DixBase currency ID, and webhook signing secret.
6. Configure this webhook URL in DixBase:

`https://your-store.example/wc-api/dixbase_webhook`

== Frequently Asked Questions ==

= Does this plugin withdraw funds from my DixBase account? =

No. The plugin only creates hosted checkout sessions and receives signed payment webhooks.

= Which DixBase scopes are required? =

The checkout flow requires `checkout:write`. Webhook delivery is verified with the webhook signing secret configured in DixBase.

= Does the plugin collect analytics or tracking data? =

No. It only contacts DixBase when creating a checkout session and when customers complete payment through the hosted checkout flow.

= What data is sent to DixBase? =

The plugin sends order amount, customer email, return URLs, the WooCommerce order ID as `client_reference_id`, and basic metadata needed to reconcile the payment with the WooCommerce order.

== Changelog ==

= 0.1.0 =
* Initial WooCommerce gateway for DixBase hosted checkout.
