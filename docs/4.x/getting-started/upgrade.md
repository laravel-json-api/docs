# Upgrade Guide

## Upgrading to 4.x from 3.x

Version 4 upgrades from Laravel 10 to Laravel 11. Otherwise, there are no other changes.

### Upgrading

```bash
composer require laravel-json-api/laravel --no-update
composer require laravel-json-api/testing --dev --no-update
```

### Exception Handler

If you are removing your exception handler class to align with Laravel 11 - which configures the exception handler in
the `boostrap/app.php` file - then you will need to update how you configure the handler for JSON:API.

Refer to the [Installation Guide](./index.md) for basic details on how to configure the exception handler.

If you need more advanced configuration options, refer to the [Errors chapter.](../responses/errors.md)
