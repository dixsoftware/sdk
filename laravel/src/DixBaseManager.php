<?php

namespace DixBase\LaravelPayments;

use GuzzleHttp\Client;

class DixBaseManager
{
    private Client $client;
    private string $apiKey;

    public function __construct(array $config)
    {
        $this->apiKey = $config['api_key'] ?? '';
        $this->client = new Client([
            'base_uri' => rtrim($config['base_url'] ?? 'https://app.dixbase.com/v1', '/'),
            'timeout' => $config['timeout'] ?? 30,
        ]);
    }

    public function createCheckout(array $payload, ?string $idempotencyKey = null): array
    {
        return $this->post('/business/api/checkout/sessions', $payload, $idempotencyKey ?? (string) str()->uuid());
    }

    public function currencies(): array
    {
        return $this->request('GET', '/business/api/checkout/currencies');
    }

    public function webhookDeliveries(array $params = []): array
    {
        return $this->request('GET', '/business/api/webhooks/deliveries', [
            'query' => $params,
        ]);
    }

    private function post(string $path, array $payload, string $idempotencyKey): array
    {
        return $this->request('POST', $path, [
            'json' => $payload,
            'headers' => ['Idempotency-Key' => $idempotencyKey],
        ]);
    }

    private function request(string $method, string $path, array $options = []): array
    {
        $options['headers']['Authorization'] = 'Bearer ' . $this->apiKey;
        $options['headers']['User-Agent'] = 'dixbase-laravel/1.0.0';
        $response = $this->client->request($method, $path, $options);
        return json_decode((string) $response->getBody(), true);
    }
}
