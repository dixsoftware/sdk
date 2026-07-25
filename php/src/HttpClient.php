<?php

declare(strict_types=1);

namespace DixBase\Payments;

final class HttpClient
{
    private string $apiKey;
    private string $baseUrl;
    private int $timeoutSeconds;

    public function __construct(array $config)
    {
        if (empty($config['apiKey'])) {
            throw new \InvalidArgumentException('DixBase apiKey is required.');
        }

        $this->apiKey = (string) $config['apiKey'];
        $this->baseUrl = rtrim((string) ($config['baseUrl'] ?? 'https://app.dixbase.com/v1'), '/');
        $this->timeoutSeconds = (int) ($config['timeoutSeconds'] ?? 30);
    }

    public function get(string $path, array $params = []): array
    {
        $query = $params === [] ? '' : '?' . http_build_query(self::snakeKeys($params));
        return $this->request('GET', $path . $query);
    }

    public function post(string $path, ?array $body = null, array $options = []): array
    {
        return $this->request('POST', $path, $body, $options);
    }

    private function request(string $method, string $path, ?array $body = null, array $options = []): array
    {
        $headers = [
            'Authorization: Bearer ' . $this->apiKey,
            'Content-Type: application/json',
            'User-Agent: dixbase-php/1.0.0',
        ];

        if ($method === 'POST' && isset($options['idempotencyKey'])) {
            $headers[] = 'Idempotency-Key: ' . $options['idempotencyKey'];
        }

        $responseHeaders = [];
        $ch = curl_init($this->buildUrl($path));

        curl_setopt_array($ch, [
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => $this->timeoutSeconds,
            CURLOPT_HEADERFUNCTION => static function ($curl, string $header) use (&$responseHeaders): int {
                $length = strlen($header);
                $parts = explode(':', $header, 2);

                if (count($parts) === 2) {
                    $responseHeaders[strtolower(trim($parts[0]))] = trim($parts[1]);
                }

                return $length;
            },
        ]);

        if ($body !== null) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(self::snakeKeys($body), JSON_THROW_ON_ERROR));
        }

        $raw = curl_exec($ch);
        $statusCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($raw === false) {
            throw new DixBaseException($curlError !== '' ? $curlError : 'DixBase request failed.');
        }

        $decoded = $raw === '' ? [] : json_decode($raw, true, flags: JSON_THROW_ON_ERROR);

        if ($statusCode >= 400) {
            $error = is_array($decoded['error'] ?? null) ? $decoded['error'] : $decoded;
            $message = $error['message'] ?? $error['detail'] ?? 'DixBase API request failed with status ' . $statusCode . '.';
            $code = $error['code'] ?? $error['detail'] ?? null;

            throw new DixBaseException(
                (string) $message,
                $statusCode,
                $code === null ? null : (string) $code,
                $responseHeaders['x-request-id'] ?? $responseHeaders['request-id'] ?? null,
                $decoded
            );
        }

        return self::camelKeys($decoded);
    }

    private function buildUrl(string $path): string
    {
        if (str_ends_with($this->baseUrl, '/business/api') && str_starts_with($path, '/business/api/')) {
            return $this->baseUrl . substr($path, strlen('/business/api'));
        }

        return $this->baseUrl . $path;
    }

    private static function snakeKeys(mixed $value): mixed
    {
        if (!is_array($value)) {
            return $value;
        }

        $result = [];

        foreach ($value as $key => $item) {
            $nextKey = is_string($key)
                ? strtolower((string) preg_replace('/(?<!^)[A-Z]/', '_$0', $key))
                : $key;
            $result[$nextKey] = $key === 'metadata' ? $item : self::snakeKeys($item);
        }

        return $result;
    }

    private static function camelKeys(mixed $value): mixed
    {
        if (!is_array($value)) {
            return $value;
        }

        $result = [];

        foreach ($value as $key => $item) {
            $nextKey = is_string($key)
                ? preg_replace_callback('/_([a-z])/', static fn (array $match): string => strtoupper($match[1]), $key)
                : $key;
            $result[$nextKey] = $key === 'metadata' ? $item : self::camelKeys($item);
        }

        return $result;
    }
}
