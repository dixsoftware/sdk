<?php

declare(strict_types=1);

namespace DixBase\Payments;

class DixBaseException extends \RuntimeException
{
    public int $statusCode;
    public ?string $errorCode;
    public ?string $requestId;
    public mixed $details;

    public function __construct(
        string $message,
        int $statusCode = 0,
        ?string $errorCode = null,
        ?string $requestId = null,
        mixed $details = null
    ) {
        $this->statusCode = $statusCode;
        $this->errorCode = $errorCode;
        $this->requestId = $requestId;
        $this->details = $details;
        parent::__construct($message, $statusCode);
    }
}
