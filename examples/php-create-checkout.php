<?php

$apiKey = getenv('DIXBASE_API_KEY');
$idempotencyKey = bin2hex(random_bytes(16));

$payload = [
    'name' => 'Plan Professional',
    'description' => 'Suscripcion mensual',
    'amount' => 99,
    'currency' => 'cur_xxxxx',
    'customer_email' => 'cliente@email.com',
    'success_url' => 'https://miweb.com/success',
    'cancel_url' => 'https://miweb.com/cancel',
    'client_reference_id' => 'order_123',
    'metadata' => [
        'plan' => 'professional',
    ],
];

$ch = curl_init('https://app.dixbase.com/v1/business/api/checkout/sessions');
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        'Authorization: Bearer ' . $apiKey,
        'Content-Type: application/json',
        'Idempotency-Key: ' . $idempotencyKey,
        'User-Agent: dixbase-php-example/1.0.0',
    ],
    CURLOPT_POSTFIELDS => json_encode($payload),
]);

$response = curl_exec($ch);
$statusCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($statusCode >= 400) {
    throw new RuntimeException('DixBase error: ' . $response);
}

$session = json_decode($response, true);
header('Location: ' . $session['checkout_url'], true, 303);
