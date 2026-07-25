# Security

Report suspected vulnerabilities privately to `support@dixbase.com`.

Do not open public issues for API key exposure, webhook bypasses, signature validation issues, payment state inconsistencies, or sensitive data leaks.

## SDK Security Rules

- Keep DixBase API keys on trusted servers only.
- Verify `X-DixBase-Signature` with the exact raw request body.
- Fulfill orders only after `payment_status=paid` from a verified webhook or server-to-server status check.
- Never store card data, passwords, private keys, seeds, documents, or secrets in checkout metadata.
