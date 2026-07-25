# Publicacion

Este repositorio esta preparado para publicar el SDK principal y adjuntar paquetes de los demas ecosistemas desde GitHub Actions.

## Versiones

Antes de crear un release, actualiza la misma version en:

- `package.json`
- `python/pyproject.toml`
- `dotnet/DixBase.Payments/DixBase.Payments.csproj`
- `java/pom.xml`
- `ruby/dixbase_payments.gemspec`
- `CHANGELOG.md`

Usa versionado semantico: `MAJOR.MINOR.PATCH`.

## Secrets de GitHub

Configura estos secrets en el repositorio:

- `NPM_TOKEN`: token de npm con permiso para publicar `@dixbase/payments`.
- `PYPI_TOKEN`: token de PyPI para publicar `dixbase-payments`.
- `NUGET_API_KEY`: opcional; publica `DixBase.Payments` en NuGet si esta configurado.
- `RUBYGEMS_API_KEY`: opcional; publica `dixbase_payments` en RubyGems si esta configurado.

Packagist normalmente no requiere publicar desde Actions: registra el repositorio en Packagist y deja que lea los tags.

Maven Central requiere alta de namespace, firma GPG y credenciales de Sonatype/Central Portal. El workflow actual construye y adjunta el `.jar` al GitHub Release; cuando DixBase tenga Central Portal configurado se puede activar publicacion automatica.

## Validacion local

Ejecuta esto antes de etiquetar:

```bash
npm ci
npm run typecheck
npm test
npm run build
npm audit --omit=dev
npm pack --dry-run
```

Para integracion real con DixBase:

```bash
DIXBASE_API_KEY=... DIXBASE_TEST_CURRENCY_ID=cur_xxxxx npm run test:integration
```

No guardes claves reales en archivos del repositorio.

## Publicar release

1. Confirma que `main` esta limpio y actualizado.
2. Crea y empuja el tag:

```bash
git tag v1.0.0
git push origin v1.0.0
```

3. GitHub Actions ejecuta `.github/workflows/release.yml`.

El workflow:

- publica `@dixbase/payments` en npm;
- construye y publica `dixbase-payments` en PyPI;
- construye y, si hay token, publica `DixBase.Payments` en NuGet;
- construye y, si hay token, publica `dixbase_payments` en RubyGems;
- construye el paquete Java y lo adjunta al release;
- crea el ZIP del plugin WooCommerce y lo adjunta al release;
- adjunta OpenAPI y Postman al GitHub Release.

## Composer y Laravel

Registra estos paquetes en Packagist apuntando a este repositorio:

- `dixbase/payments`, con codigo en `php/`
- `dixbase/laravel-payments`, con codigo en `laravel/`

Si Packagist requiere repositorios separados por paquete, crea repositorios dedicados o usa split/subtree automatico.

## Go

El modulo Go usa:

```text
github.com/dixsoftware/sdk/go
```

Los usuarios pueden instalarlo desde el tag del repo:

```bash
go get github.com/dixsoftware/sdk/go@v1.0.0
```

## WooCommerce

El release adjunta `dixbase-payments-for-woocommerce.zip`. Antes de enviarlo al directorio oficial de WordPress:

1. Probarlo en WordPress + WooCommerce actualizado.
2. Confirmar textos, capturas y requisitos del directorio.
3. Validar que la configuracion no expone API keys ni webhook secrets.
