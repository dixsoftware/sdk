<?php

declare(strict_types=1);

namespace DixBase\Payments;

final class Webhooks
{
    private const DEFAULT_TOLERANCE_SECONDS = 300;
    private ?HttpClient $http;

    public function __construct(?HttpClient $http = null)
    {
        $this->http = $http;
    }

    public function previewSandbox(array $payload): array
    {
        if ($this->http === null) {
            throw new \RuntimeException('DixBase HTTP client is not configured.');
        }

        if (!isset($payload['event']) && isset($payload['eventType'])) {
            $payload['event'] = $payload['eventType'];
            unset($payload['eventType']);
        }

        return $this->http->post('/business/api/sandbox/webhooks/preview', $payload);
    }

    public function listDeliveries(array $params = []): array
    {
        if ($this->http === null) {
            throw new \RuntimeException('DixBase HTTP client is not configured.');
        }

        return $this->http->get('/business/api/webhooks/deliveries', $params);
    }

    public function verifySignature(string $rawBody, ?string $signature, string $secret, int $toleranceSeconds = self::DEFAULT_TOLERANCE_SECONDS): array
    {
        if ($signature === null || $signature === '') {
            throw new WebhookSignatureException('Missing DixBase webhook signature.');
        }

        if ($secret === '') {
            throw new WebhookSignatureException('Missing DixBase webhook secret.');
        }

        [$timestamp, $signatures] = self::parseSignatureHeader($signature);
        $signedPayload = $timestamp === null ? $rawBody : $timestamp . '.' . $rawBody;
        $expected = hash_hmac('sha256', $signedPayload, $secret);

        $valid = false;
        foreach ($signatures as $candidate) {
            $candidate = str_starts_with($candidate, 'sha256=') ? substr($candidate, 7) : $candidate;

            if (preg_match('/^[a-f0-9]{64}$/i', $candidate) === 1 && hash_equals($expected, $candidate)) {
                $valid = true;
                break;
            }
        }

        if (!$valid) {
            throw new WebhookSignatureException('Invalid DixBase webhook signature.');
        }

        if ($timestamp !== null && abs(time() - $timestamp) > $toleranceSeconds) {
            throw new WebhookSignatureException('DixBase webhook signature timestamp is outside tolerance.');
        }

        return json_decode($rawBody, true, flags: JSON_THROW_ON_ERROR);
    }

    private static function parseSignatureHeader(string $header): array
    {
        $timestamp = null;
        $signatures = [];

        foreach (array_map('trim', explode(',', $header)) as $part) {
            [$key, $value] = array_pad(explode('=', $part, 2), 2, null);

            if ($key === 't' && is_numeric($value)) {
                $timestamp = (int) $value;
                continue;
            }

            if (($key === 'v1' || $key === 'signature') && $value !== null) {
                $signatures[] = $value;
                continue;
            }

            if ($value === null) {
                $signatures[] = $part;
            }
        }

        if ($signatures === []) {
            $signatures[] = $header;
        }

        return [$timestamp, $signatures];
    }
}
