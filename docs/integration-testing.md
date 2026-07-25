# Pruebas de integracion

Las pruebas unitarias no llaman a DixBase. Para validar contra sandbox real:

```bash
set DIXBASE_API_KEY=sk_test_xxxxx
set DIXBASE_TEST_CURRENCY_ID=cur_xxxxx
npm run test:integration
```

En macOS/Linux:

```bash
export DIXBASE_API_KEY=sk_test_xxxxx
export DIXBASE_TEST_CURRENCY_ID=cur_xxxxx
npm run test:integration
```

Variables opcionales:

- `DIXBASE_BASE_URL`: cambia la URL base, por ejemplo para staging.

Las pruebas crean una sesion sandbox, generan un preview de webhook firmado y comprueban que la moneda de prueba exista.
