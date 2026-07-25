<?php

declare(strict_types=1);

namespace DixBase\Payments;

final class DixBase
{
    public CheckoutClient $checkout;
    public Webhooks $webhooks;

    public function __construct(array $config)
    {
        $http = new HttpClient($config);
        $this->checkout = new CheckoutClient($http);
        $this->webhooks = new Webhooks($http);
    }
}
