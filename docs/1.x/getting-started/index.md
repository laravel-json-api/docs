# Installation

## Requirements

- PHP: `^7.4|8.0.*`
- Laravel: `^8.30`

## Installation

Require this package in the `composer.json` of your Laravel project.
This will download the package and its dependent packages.

We also recommend you install our testing package as a development
dependency. This adds test helpers as described in the
[Testing Chapter.](../testing/)

Install both packages using [Composer](https://getcomposer.org):

```bash
composer require laravel-json-api/laravel:^1.1
composer require --dev laravel-json-api/testing:^1.1
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
php artisan vendor:publish --provider="LaravelJsonApi\Laravel\ServiceProvider"
```

This will create a `config/jsonapi.php` file.

## Exception Handler

To ensure that clients receive a JSON:API error response for exceptions
thrown by your application, you need to add the package exception renderer
to your application's exception handler.

Update the `register()` method on your `\App\Exceptions\Handler` class and
add our `JsonApiException` to your `$dontReport` property. Both changes are
shown below:

```php
namespace App\Exceptions;

use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use LaravelJsonApi\Core\Exceptions\JsonApiException;

class Handler extends ExceptionHandler
{
    // ...

    /**
     * A list of the exception types that should not be reported.
     *
     * @var array
     */
    protected $dontReport = [
        JsonApiException::class,
    ];

    /**
     * Register the exception handling callbacks for the application.
     *
     * @return void
     */
    public function register()
    {
        $this->renderable(
            \LaravelJsonApi\Exceptions\ExceptionParser::make()->renderable()
        );
    }
}
```

For more information on exception rendering and reporting, see the
[errors chapter.](../responses/errors.md#error-rendering)
