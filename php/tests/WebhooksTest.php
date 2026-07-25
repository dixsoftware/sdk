<?php

declare(strict_types=1);

namespace DixBase\Payments\Tests;

use DixBase\Payments\WebhookSignatureException;
use DixBase\Payments\Webhooks;
use PHPUnit\Framework\TestCase;

final class WebhooksTest extends TestCase
{
    public function testVerifiesTimestampedSignature(): void
    {
        $rawBody = json_encode([
            'id' => 'evt_123',
            'type' => 'checkout.session.completed',
            'data' => ['id' => 'chk_123'],
        ], JSON_THROW_ON_ERROR);
        $timestamp = time();
        $signature = hash_hmac('sha256', $timestamp . '.' . $rawBody, 'whsec_test');

        $event = (new Webhooks())->verifySignature($rawBody, 't=' . $timestamp . ',v1=' . $signature, 'whsec_test');

        self::assertSame('checkout.session.completed', $event['type']);
        self::assertSame('chk_123', $event['data']['id']);
    }

    public function testRejectsInvalidSignature(): void
    {
        $this->expectException(WebhookSignatureException::class);

        (new Webhooks())->verifySignature('{}', 'v1=bad', 'whsec_test');
    }
}
