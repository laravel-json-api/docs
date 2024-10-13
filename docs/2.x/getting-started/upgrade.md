# Upgrade Guide

## Upgrading to 2.x from 1.x

Version 2.0 adds support for PHP 8.1, and supports both Laravel 8 and 9.
Although we had to make some breaking changes to support PHP 8.1, these will
not affect the majority of applications. You should therefore find you can
upgrade very quickly to the new version.

This chapter provides details of the main changes that in theory could affect
applications.

### Updating Dependencies

#### Laravel Version

If you are still on Laravel 8, the minimum supported version is now `8.76`.
Ensure you are on at least this version before upgrading.

#### Composer Dependencies

To upgrade, first run the following commands:

```bash
composer require laravel-json-api/laravel --no-update
composer require laravel-json-api/testing --dev --no-update
```

Then if you have installed any of the following optional packages, run the
appropriate command from the following:

```bash
composer require laravel-json-api/hashids --no-update
composer require laravel-json-api/non-eloquent --no-update
composer require laravel-json-api/cursor-pagination --no-update
composer require laravel-json-api/boolean-softdeletes --no-update
```

Then finally run the following command to updated all the dependencies:

```bash
composer up laravel-json-api/* cloudcreativity/*
```

### PHP Return Types

PHP is beginning to transition to requiring return type definitions on PHP
methods such as `offsetGet`, `offsetSet`, etc. In light of this, Laravel
JSON:API has implemented these return types in its code base. Typically,
this should not affect user written code; however, if you are overriding one
of these methods by extending Laravel JSON:API's classes, you will need to add
these return types to your own application.

### Servers

Previously `Server` classes had a protected `$app` property, that you could use
to access the application instance. This property is now private. If you are
accessing it via `$this->app` in your `Server` class, you should now use the
`$this->app()` method instead.

### Eloquent Fields

PHP 8.1 introduced `readonly` as a keyword. Previously the Laravel JSON:API
Eloquent package had both an interface and a trait called `ReadOnly`. We have
therefore had to rename this interface and trait. Both are now called
`IsReadOnly`.

You are only likely to be using either of these if you have written your own
field classes. In which case, you need to make the following changes:

- `LaravelJsonApi\Eloquent\Contracts\ReadOnly` is now
  `LaravelJsonApi\Eloquent\Contracts\IsReadOnly`
- `LaravelJsonApi\Eloquent\Fields\Concerns\ReadOnly` is now
  `LaravelJsonApi\Eloquent\Fields\Concerns\IsReadOnly`

### Testing

When upgrading the testing package, we removed some methods that were marked as
deprecated some time ago. These methods were also not documented in the testing
chapters, so hopefully you have not been using them.

The removed methods are documented here, just in case:

- The `assertUpdated()` method was removed. Use `assertFetchedOne()` instead,
  as shown in [the example update test.](../testing/resources.md#update-testing)
- The `assertDeleted()` method was removed. Use `assertNoContent()` or
  `assertMetaWithoutData()` depending on what your delete action returns. See
  [the example delete test if needed.](../testing/resources.md#destroy-aka-delete-testing)
