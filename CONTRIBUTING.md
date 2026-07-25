# Contributing

Thanks for helping improve the DixBase SDK.

Public contributors should fork the repository and open a pull request. External users cannot push directly to `main`; maintainers review each change before it is merged.

Before opening a pull request:

1. Keep the change focused on one SDK, plugin, documentation page, or API contract.
2. Do not include API keys, webhook secrets, private URLs, customer data, logs with personal data, or screenshots that expose credentials.
3. Update docs and examples when behavior, scopes, request fields, response fields, or installation steps change.
4. Keep generated package artifacts out of pull requests unless they are release assets intentionally tracked by this repository.
5. Run the relevant checks locally when possible.

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
DIXBASE_API_KEY=dbx_live_or_test_xxxxx DIXBASE_TEST_CURRENCY_ID=cur_xxxxx npm run test:integration
```

Do not commit real API keys, webhook secrets, `node_modules`, Composer `vendor`, package tarballs, or local env files.

## Pull request review

Maintainers review pull requests for:

- API compatibility with DixBase checkout and webhook behavior.
- Safe handling of API keys, webhook secrets, and raw webhook bodies.
- Consistent behavior across Node, PHP, Python, Go, Java, .NET, Ruby, Laravel, and WooCommerce where applicable.
- Documentation updates for any merchant-facing or developer-facing change.
- No new withdrawal, custody, private-key, or seed-phrase handling behavior.
