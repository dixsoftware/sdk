<?php
/**
 * Plugin Name: DixBase Payments for WooCommerce
 * Plugin URI: https://github.com/dixsoftware/sdk
 * Description: Accept DixBase hosted checkout payments in WooCommerce.
 * Version: 0.1.0
 * Requires at least: 6.5
 * Requires PHP: 7.4
 * Author: DixBase
 * Author URI: https://app.dixbase.com/
 * Text Domain: dixbase-payments-for-woocommerce
 * Domain Path: /languages
 * Requires Plugins: woocommerce
 * License: GPLv2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 *
 * @package DixBasePayments
 */

if (!defined('ABSPATH')) {
    exit;
}

define('DIXBASE_PAYMENTS_VERSION', '0.1.0');
define('DIXBASE_PAYMENTS_API_BASE_URL', 'https://app.dixbase.com/v1');

add_action('plugins_loaded', 'dixbase_payments_init_gateway', 11);
add_action('admin_notices', 'dixbase_payments_missing_woocommerce_notice');

/**
 * Shows a dependency notice when WooCommerce is not active.
 */
function dixbase_payments_missing_woocommerce_notice(): void
{
    if (!current_user_can('activate_plugins') || class_exists('WooCommerce')) {
        return;
    }

    echo '<div class="notice notice-warning"><p>';
    echo esc_html__('DixBase Payments for WooCommerce requires WooCommerce to be installed and active.', 'dixbase-payments-for-woocommerce');
    echo '</p></div>';
}

/**
 * Registers the DixBase WooCommerce payment gateway.
 */
function dixbase_payments_init_gateway(): void
{
    if (!class_exists('WC_Payment_Gateway')) {
        return;
    }

    class DixBase_Payments_For_WooCommerce_Gateway extends WC_Payment_Gateway
    {
        /**
         * Gateway API key.
         *
         * @var string
         */
        protected $api_key = '';

        /**
         * Optional DixBase currency identifier.
         *
         * @var string
         */
        protected $currency_id = '';

        /**
         * Webhook signing secret.
         *
         * @var string
         */
        protected $webhook_secret = '';

        /**
         * API base URL.
         *
         * @var string
         */
        protected $base_url = DIXBASE_PAYMENTS_API_BASE_URL;

        public function __construct()
        {
            $this->id = 'dixbase';
            $this->method_title = __('DixBase', 'dixbase-payments-for-woocommerce');
            $this->method_description = __('Accept crypto payments with DixBase hosted checkout.', 'dixbase-payments-for-woocommerce');
            $this->has_fields = false;
            $this->supports = ['products'];
            $this->icon = '';

            $this->init_form_fields();
            $this->init_settings();

            $this->title = $this->get_option('title', __('DixBase', 'dixbase-payments-for-woocommerce'));
            $this->description = $this->get_option('description', __('Pay securely with DixBase.', 'dixbase-payments-for-woocommerce'));
            $this->enabled = $this->get_option('enabled', 'no');
            $this->api_key = $this->get_option('api_key', '');
            $this->currency_id = $this->get_option('currency_id', '');
            $this->webhook_secret = $this->get_option('webhook_secret', '');
            $this->base_url = DIXBASE_PAYMENTS_API_BASE_URL;

            add_action('woocommerce_update_options_payment_gateways_' . $this->id, [$this, 'process_admin_options']);
            add_action('woocommerce_api_dixbase_webhook', [$this, 'handle_webhook']);
        }

        public function init_form_fields()
        {
            $webhook_url = esc_url(home_url('/wc-api/dixbase_webhook'));

            $this->form_fields = [
                'enabled' => [
                    'title' => __('Enable', 'dixbase-payments-for-woocommerce'),
                    'type' => 'checkbox',
                    'label' => __('Enable DixBase payments', 'dixbase-payments-for-woocommerce'),
                    'default' => 'no',
                ],
                'title' => [
                    'title' => __('Title', 'dixbase-payments-for-woocommerce'),
                    'type' => 'text',
                    'default' => __('DixBase', 'dixbase-payments-for-woocommerce'),
                    'desc_tip' => true,
                    'description' => __('Payment method title shown to customers at checkout.', 'dixbase-payments-for-woocommerce'),
                ],
                'description' => [
                    'title' => __('Description', 'dixbase-payments-for-woocommerce'),
                    'type' => 'textarea',
                    'default' => __('Pay securely with DixBase.', 'dixbase-payments-for-woocommerce'),
                    'desc_tip' => true,
                    'description' => __('Payment method description shown to customers at checkout.', 'dixbase-payments-for-woocommerce'),
                ],
                'api_key' => [
                    'title' => __('DixBase API key', 'dixbase-payments-for-woocommerce'),
                    'type' => 'password',
                    'description' => __('Use a live or sandbox API key from your DixBase business account with checkout:write scope.', 'dixbase-payments-for-woocommerce'),
                ],
                'currency_id' => [
                    'title' => __('DixBase price currency ID', 'dixbase-payments-for-woocommerce'),
                    'type' => 'text',
                    'description' => __('Optional. Use an ID returned by /checkout/currencies, for example cur_xxxxx.', 'dixbase-payments-for-woocommerce'),
                ],
                'webhook_secret' => [
                    'title' => __('Webhook signing secret', 'dixbase-payments-for-woocommerce'),
                    'type' => 'password',
                    'description' => sprintf(
                        /* translators: %s: webhook URL */
                        __('Configure this webhook URL in DixBase: %s', 'dixbase-payments-for-woocommerce'),
                        '<code>' . esc_html($webhook_url) . '</code>'
                    ),
                ],
            ];
        }

        public function validate_title_field($key, $value)
        {
            return sanitize_text_field($value);
        }

        public function validate_description_field($key, $value)
        {
            return sanitize_textarea_field($value);
        }

        public function validate_api_key_field($key, $value)
        {
            return sanitize_text_field($value);
        }

        public function validate_currency_id_field($key, $value)
        {
            return sanitize_text_field($value);
        }

        public function validate_webhook_secret_field($key, $value)
        {
            return sanitize_text_field($value);
        }

        public function process_payment($order_id)
        {
            $order = wc_get_order($order_id);
            if (!$order) {
                wc_add_notice(__('DixBase could not load the WooCommerce order.', 'dixbase-payments-for-woocommerce'), 'error');
                return ['result' => 'failure'];
            }

            if (empty($this->api_key)) {
                wc_add_notice(__('DixBase is not configured. Please contact the store owner.', 'dixbase-payments-for-woocommerce'), 'error');
                return ['result' => 'failure'];
            }

            $body = [
                'name' => sprintf(
                    /* translators: %s: WooCommerce order number */
                    __('WooCommerce Order #%s', 'dixbase-payments-for-woocommerce'),
                    $order->get_order_number()
                ),
                'amount' => (float) $order->get_total(),
                'customer_email' => $order->get_billing_email(),
                'success_url' => $this->get_return_url($order),
                'cancel_url' => wc_get_checkout_url(),
                'client_reference_id' => (string) $order_id,
                'metadata' => [
                    'order_id' => (string) $order_id,
                    'source' => 'woocommerce',
                    'plugin_version' => DIXBASE_PAYMENTS_VERSION,
                ],
            ];

            if (!empty($this->currency_id)) {
                $body['currency'] = $this->currency_id;
            }

            $response = wp_safe_remote_post($this->base_url . '/business/api/checkout/sessions', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->api_key,
                    'Content-Type' => 'application/json',
                    'Idempotency-Key' => 'wc-order-' . $order_id,
                    'User-Agent' => 'dixbase-woocommerce/' . DIXBASE_PAYMENTS_VERSION,
                ],
                'body' => wp_json_encode($body),
                'timeout' => 30,
            ]);

            if (is_wp_error($response)) {
                wc_add_notice(
                    sprintf(
                        /* translators: %s: error message */
                        __('DixBase payment error: %s', 'dixbase-payments-for-woocommerce'),
                        $response->get_error_message()
                    ),
                    'error'
                );
                return ['result' => 'failure'];
            }

            $status_code = (int) wp_remote_retrieve_response_code($response);
            $payload = json_decode(wp_remote_retrieve_body($response), true);

            if ($status_code >= 400 || !is_array($payload) || empty($payload['checkout_url'])) {
                $order->add_order_note(__('DixBase could not create the checkout session.', 'dixbase-payments-for-woocommerce'));
                wc_add_notice(__('DixBase could not create the checkout session.', 'dixbase-payments-for-woocommerce'), 'error');
                return ['result' => 'failure'];
            }

            $checkout_id = isset($payload['id']) ? sanitize_text_field((string) $payload['id']) : '';
            if ($checkout_id) {
                $order->update_meta_data('_dixbase_checkout_id', $checkout_id);
            }
            $order->save();

            return [
                'result' => 'success',
                'redirect' => esc_url_raw($payload['checkout_url']),
            ];
        }

        public function handle_webhook()
        {
            $raw_body = file_get_contents('php://input');
            $raw_body = is_string($raw_body) ? $raw_body : '';
            $signature = isset($_SERVER['HTTP_X_DIXBASE_SIGNATURE']) ? sanitize_text_field(wp_unslash($_SERVER['HTTP_X_DIXBASE_SIGNATURE'])) : '';

            if (!$this->verify_signature($raw_body, $signature, $this->webhook_secret)) {
                status_header(401);
                exit;
            }

            $event = json_decode($raw_body, true);
            if (!is_array($event)) {
                status_header(400);
                exit;
            }

            $reference = $event['data']['client_reference_id'] ?? $event['data']['invoice']['client_reference_id'] ?? null;
            if (!$reference) {
                status_header(200);
                exit;
            }

            $order = wc_get_order(absint($reference));
            if (!$order) {
                status_header(200);
                exit;
            }

            $event_type = isset($event['type']) ? sanitize_text_field((string) $event['type']) : '';
            $event_id = isset($event['id']) ? sanitize_text_field((string) $event['id']) : '';
            $last_event_id = (string) $order->get_meta('_dixbase_last_event_id');

            if ($event_id && hash_equals($last_event_id, $event_id)) {
                status_header(200);
                exit;
            }

            if (in_array($event_type, ['checkout.session.completed', 'payment.succeeded'], true)) {
                if (!$order->is_paid()) {
                    $order->payment_complete();
                }
                $order->add_order_note(__('DixBase payment confirmed by signed webhook.', 'dixbase-payments-for-woocommerce'));
            }

            if ($event_id) {
                $order->update_meta_data('_dixbase_last_event_id', $event_id);
                $order->save();
            }

            status_header(200);
            exit;
        }

        private function verify_signature(string $raw_body, string $header, string $secret): bool
        {
            if (!$header || !$secret) {
                return false;
            }

            $timestamp = null;
            $signature = null;
            foreach (explode(',', $header) as $part) {
                [$key, $value] = array_pad(explode('=', trim($part), 2), 2, null);
                if ($key === 't') {
                    $timestamp = $value;
                }
                if ($key === 'v1') {
                    $signature = $value;
                }
            }

            if (!$timestamp || !$signature || abs(time() - (int) $timestamp) > 300) {
                return false;
            }

            $expected = hash_hmac('sha256', $timestamp . '.' . $raw_body, $secret);
            return hash_equals($expected, $signature);
        }
    }

    add_filter('woocommerce_payment_gateways', static function (array $gateways): array {
        $gateways[] = 'DixBase_Payments_For_WooCommerce_Gateway';
        return $gateways;
    });
}
