# SDK PHP

El paquete Composer `dixbase/payments` esta pensado para backends PHP, WordPress, WooCommerce y tiendas clasicas.

## Instalacion

```bash
composer require dixbase/payments
```

## Uso

```php
use DixBase\Payments\DixBase;

$dixbase = new DixBase([
    'apiKey' => getenv('DIXBASE_API_KEY'),
]);

$session = $dixbase->checkout->create([
    'name' => 'Plan Professional',
    'amount' => 99,
    'currency' => 'cur_xxxxx',
    'customerEmail' => 'cliente@email.com',
    'successUrl' => 'https://miweb.com/success',
    'cancelUrl' => 'https://miweb.com/cancel',
]);
```

## Webhooks

```php
$rawBody = file_get_contents('php://input');
$signature = $_SERVER['HTTP_X_DIXBASE_SIGNATURE'] ?? null;
$event = $dixbase->webhooks->verifySignature($rawBody, $signature, getenv('DIXBASE_WEBHOOK_SECRET'));
```
