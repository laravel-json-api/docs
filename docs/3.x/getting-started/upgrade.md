# Upgrade Guide

## Upgrading to 3.x from 2.x

Version 3.0 upgrades the package to Laravel 10. There are no significant
breaking changes, so you should be able to immediately upgrade when you
upgrade your application to Laravel 10. The minor breaking changes are
detailed in the [release.](https://github.com/laravel-json-api/laravel/releases/tag/v3.0.0)

To upgrade, run the following commands:

```bash
composer require laravel-json-api/laravel --no-update
composer require laravel-json-api/testing --dev --no-update
composer up "laravel-json-api/*" cloudcreativity/json-api-testing
```
