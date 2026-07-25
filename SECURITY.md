# Security Policy

Report suspected vulnerabilities privately to `support@dixbase.com`.

Do not open public issues for API key exposure, webhook bypasses, signature validation issues, payment state inconsistencies, or sensitive data leaks.

You may also use GitHub private vulnerability reporting when it is enabled for this repository.

## SDK Security Rules

- Keep DixBase API keys on trusted servers only.
- Verify `X-DixBase-Signature` with the exact raw request body.
- Fulfill orders only after `payment_status=paid` from a verified webhook or server-to-server status check.
- Never store card data, passwords, private keys, seeds, documents, or secrets in checkout metadata.

The SDKs create checkout sessions and verify payment webhooks. They must not withdraw funds, move wallet balances, custody merchant funds, request wallet seed phrases, or request private keys.
