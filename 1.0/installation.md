# Installation

[[toc]]

## Installation

Require this package in the `composer.json` of your Laravel project.
This will download the package and its dependent packages.

We also recommend you install our testing package as a development
dependency.

To install both packages using [Composer](https://getcomposer.org):

```bash
$ composer require laravel-json-api/laravel
$ composer require --dev laravel-json-api/testing
```

The `LaravelJsonApi\Laravel\ServiceProvider` is auto-discovered and registered
by default.

### Facades

Two facades are also auto-discovered:

- `LaravelJsonApi\Core\Facades\JsonApi`
- `LaravelJsonApi\Laravel\Facades\JsonApiRoute`

## Configuration

Publish the package configuration using the following Artisan command:

```bash
$ php artisan vendor:publish --provider="LaravelJsonApi\Laravel\ServiceProvider"
```

This will create a `config/json-api.php` file.

## Exception Handler

To ensure that clients receive a JSON API error response for exceptions
thrown by your application, you need to add the package exception renderer
to your application's exception handler.

Update the `register()` method on your `\App\Exceptions\Handler` class
as follows:

```php
<?php

namespace App\Exceptions;

use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Throwable;

class Handler extends ExceptionHandler
{
    // ...

    /**
     * Register the exception handling callbacks for the application.
     *
     * @return void
     */
    public function register()
    {
        $this->renderable(\LaravelJsonApi\Exceptions\ExceptionParser::renderer());
    }
}
```
