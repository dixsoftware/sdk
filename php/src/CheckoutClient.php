<?php

declare(strict_types=1);

namespace DixBase\Payments;

final class CheckoutClient
{
    private HttpClient $http;

    public function __construct(HttpClient $http)
    {
        $this->http = $http;
    }

    public function create(array $payload, array $options = []): array
    {
        $options['idempotencyKey'] ??= self::uuidV4();
        return $this->http->post('/business/api/checkout/sessions', $payload, $options);
    }

    public function createSession(array $payload, array $options = []): array
    {
        return $this->create($payload, $options);
    }

    public function createSandbox(array $payload, array $options = []): array
    {
        $options['idempotencyKey'] ??= self::uuidV4();
        if (($payload['forceStatus'] ?? null) === 'completed') {
            $payload['forceStatus'] = 'complete';
        }
        return $this->http->post('/business/api/sandbox/checkout/sessions', $payload, $options);
    }

    public function createSandboxSession(array $payload, array $options = []): array
    {
        return $this->createSandbox($payload, $options);
    }

    public function retrieve(string $checkoutId): array
    {
        self::assertCheckoutId($checkoutId);
        return $this->http->get('/business/api/checkout/sessions/' . rawurlencode($checkoutId));
    }

    public function list(array $params = []): array
    {
        return $this->http->get('/business/api/checkout/sessions', $params);
    }

    public function cancel(string $checkoutId): array
    {
        self::assertCheckoutId($checkoutId);
        return $this->http->post('/business/api/checkout/sessions/' . rawurlencode($checkoutId) . '/cancel');
    }

    public function currencies(): array
    {
        return $this->http->get('/business/api/checkout/currencies');
    }

    private static function assertCheckoutId(string $checkoutId): void
    {
        if ($checkoutId === '') {
            throw new \InvalidArgumentException('checkoutId is required.');
        }
    }

    private static function uuidV4(): string
    {
        $data = random_bytes(16);
        $data[6] = chr((ord($data[6]) & 0x0f) | 0x40);
        $data[8] = chr((ord($data[8]) & 0x3f) | 0x80);

        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }
}
