<?php

return [
    'api_key' => env('DIXBASE_API_KEY'),
    'base_url' => env('DIXBASE_BASE_URL', 'https://app.dixbase.com/v1'),
    'webhook_secret' => env('DIXBASE_WEBHOOK_SECRET'),
    'timeout' => 30,
];
