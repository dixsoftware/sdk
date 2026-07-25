# Contributing

## Development

```bash
npm install
npm run typecheck
npm test
npm run build
npm audit --omit=dev
```

## PHP SDK

```bash
cd php
composer install
composer run lint
composer test
composer audit
```

## Integration Tests

Integration tests require real sandbox credentials:

```bash
DIXBASE_API_KEY=dbx_test_xxxxx DIXBASE_TEST_CURRENCY_ID=cur_xxxxx npm run test:integration
```

Do not commit real API keys, webhook secrets, `node_modules`, Composer `vendor`, package tarballs, or local env files.
