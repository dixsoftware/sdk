<?php
/**
 * Uninstall handler for DixBase Payments for WooCommerce.
 *
 * @package DixBasePayments
 */

if (!defined('WP_UNINSTALL_PLUGIN')) {
    exit;
}

delete_option('woocommerce_dixbase_settings');
