# Errors

[[toc]]

## Introduction

The JSON:API specification defines [error objects](https://jsonapi.org/format/#errors)
that are used to provide information to a client about problems encountered
while performing an operation.

Errors are returned to the client in the top-level `errors` member of the
JSON document.

Laravel JSON:API makes it easy to return errors to the client - either
as responses, or by throwing exceptions. In addition, the exception
renderer you added to your exception handler during
[installation](../getting-started/#exception-handler) takes care of
converting standard Laravel exceptions to JSON:API error responses
if the client has sent an `Accept: application/vnd.api+json` header.

## Error Objects

Use our `LaravelJsonApi\Core\Document\Error` object to create a JSON:API
error object. The easiest way to construct an error object is using the
static `fromArray` method. For example:

```php
use LaravelJsonApi\Core\Document\Error;

$error = Error::fromArray([
  'status' => 400,
  'detail' => 'Something was wrong with your request.',
]);
```

The `fromArray` method accepts all the error object members
[defined in the specification.](https://jsonapi.org/format/#error-objects)

Alternatively, if you want to use setters, use the static `make` method
to fluently construct your error object:

```php
$error = Error::make()
  ->setStatus(400)
  ->setDetail('Something was wrong with your request.');
```

The available setters are:

- `setAboutLink`
- `setCode`
- `setDetail`
- `setId`
- `setLinks`
- `setMeta`
- `setStatus`
- `setSource`
- `setSourceParameter`
- `setSourcePointer`
- `setTitle`

## Error Lists

If you need to return multiple errors at once, use our
`LaravelJsonApi\Core\Document\ErrorList` class. This accepts any number
of error objects to its constructor. For example:

```php
use LaravelJsonApi\Core\Document\ErrorList;

$errors = new ErrorList(
  Error::make()->setStatus(400)->setDetail('First error.'),
  Error::make()->setStatus(400)->setDetail('Second error.'),
);
```

Use the `push` method to add errors after constructing the error list:

```php
$errors = new ErrorList();

foreach ($warnings as $message) {
  $errors->push(Error::fromArray([
    'status' => 400,
    'detail' => $message,
  ]));
}
```

## Responses

Both the `Error` and `ErrorList` classes implement Laravel's `Responsable`
interface. This means you can return them directly from controller actions
and they will be converted to a JSON:API error response.

If you need to customise the error response, then you need to use our
`LaravelJsonApi\Core\Responses\ErrorResponse` class. Either create
a new one, passing in the `Error` or `ErrorList` object:

```php
use LaravelJsonApi\Core\Responses\ErrorResponse;

$response = ErrorResponse::make($errorOrErrors);
```

Or alternatively, use the `prepareResponse` method on either the `Error`
or `ErrorList` object:

```php
$response = $errorOrErrors->prepareResponse($request);
```

The `ErrorResponse` class has all the [helper methods](./#helper-methods)
required to customise both the headers and the JSON:API document that
is returned in the response.

For example, if we were adding a header and meta to our response:

```php
return $error
    ->prepareResponse($request)
    ->withHeader('X-Foo', 'Bar')
    ->withMeta(['foo' => 'bar']);
// or
return ErrorResponse::make($error)
    ->withHeader('X-Foo', 'Bar')
    ->withMeta(['foo' => 'bar']);
```

### HTTP Status

The JSON:API specification says:

> When a server encounters multiple problems for a single request,
> the most generally applicable HTTP error code SHOULD be used in the response.
> For instance, `400 Bad Request` might be appropriate for multiple 4xx errors
> or `500 Internal Server Error` might be appropriate for multiple 5xx errors.

Our `ErrorResponse` class takes care of calculating the HTTP status for you.

If there is only one error, or all the errors have the same status, then
the response status will match this status.

If you have multiple errors with different statuses, the response status
will be `400 Bad Request` if the error objects only have `4xx` status codes.
If there are any `5xx` status codes, the response status will be
`500 Internal Server Error`.

If the response has no error objects, or none of the error objects have a
status, then the response will have a `500 Internal Server Error` status.

If you want the response to have a specific HTTP status, use the
`withStatus` method. For example:

```php
return $error->prepareResponse($request)->withStatus(418);
// or
return ErrorResponse::make($error)->withStatus(418);
```

## JSON:API Exceptions

Our `LaravelJsonApi\Core\Exceptions\JsonApiException` allows you to terminate
processing of a request by throwing an exception with JSON:API errors
attached.

The exception expects its first argument to be either an `Error` or an
`ErrorList` object. For example:

```php
use LaravelJsonApi\Core\Exceptions\JsonApiException;

throw new JsonApiException($errorOrErrors, $previous);
```

The `JsonApiException` class has all the [helper methods](./#helper-methods)
required to customise both the headers and the JSON:API document that
is returned in the response. Use the static `make` method if you need to
call any of these methods. For example:

```php
throw JsonApiException::make($error)
    ->withHeader('X-Foo', 'Bar')
    ->withMeta(['foo' => 'bar']);
```

There is also a handy static `error` method. This allows you to fluently
construct an exception for a single error, providing either an `Error`
object or an array. For example:

```php
throw JsonApiException::error([
  'status' => 400,
  'detail' => 'Your request is incorrect.',
]);
```

## Validation Errors

Our implementation of [resource requests](../requests/resources.md) and
[query parameter requests](../requests/query-parameters.md) already takes
care of converting Laravel validation error messages to JSON:API errors.

If however you have a scenario where you want to convert a failed validator
to JSON:API errors manually, we provide the ability to do this.

You will need to resolve an instance of `LaravelJsonApi\Validation\Factory`
out of the service container. For example, you could use the `app` helper,
or use dependency injection by type-hinting it in a constructor of a service.

Once you have the factory instance, use the `createErrors` method,
providing it with the validator instance. For example, in a controller
action:

```php
return app(\LaravelJsonApi\Validation\Factory::class)
    ->createErrors($validator);
```

The object this returns is `Responsable` - so you can return it directly
from a controller action. If you want to convert it to an error response,
use our `prepareResponse` pattern as follows:

```php
return app(\LaravelJsonApi\Validation\Factory::class)
    ->createErrors($validator)
    ->prepareResponse($request)
    ->withHeader('X-Foo', 'Bar')
    ->withMeta(['foo' => 'bar']);
```

### Source Pointers

By default this process will convert validation error keys to JSON source
pointers. For example, if you have a failed message for the `foo.bar`
value, the resulting error object will have a source pointer of
`/foo/bar`.

If you need to prefix the pointer value, use the `withSourcePrefix` method.
The following example would convert `foo.bar` to `/data/attributes/foo/bar`:

```php
$errors = $factory
    ->createErrors($validator)
    ->withSourcePrefix('/data/attributes');
```

If you need to fully customise how the validation key should be converted,
provide a `Closure` to the `withPointers` method:

```php
$errors = $factory
    ->createErrors($validator)
    ->withPointers(fn($key) => "/foo/{$key}");
```

## Error Handling

As described in the [installation instructions](../getting-started/#exception-handler),
the following should have been added to your application's exception handler:

```php
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
        $this->renderable(
            \LaravelJsonApi\Exceptions\ExceptionParser::make()->renderable()
        );
    }
}
```

The Laravel exception handler already takes care of converting exceptions to
either `application/json` or `text/html` responses. Our exception handler
effectively adds JSON:API error responses as a *third* media type. If the
client has sent a request with an `Accept` header of `application/vnd.api+json`,
then they will receive the exception response as a JSON:API error response -
even if the endpoint they are hitting is not one of your JSON:API server
endpoints.

### JSON Responses

If a client encounters an exception when using an `Accept` header of
`application/json`, they will still receive Laravel's default JSON exception
response, rather than a JSON:API response.

If you want our exception parser to render JSON exception responses *instead*
of the default Laravel response, use the `acceptsJson()` method when registering
our exception parser:

```php
$this->renderable(
    ExceptionParser::make()->acceptsJson()->renderable()
);
```

### Custom Rendering Logic

If you want your own logic for when a JSON:API exception response should be
rendered, pass a closure to the `accept()` method.

For example, let's say we wanted our API to always return JSON:API exception
responses, regardless of what `Accept` header the client sent. We would use
the request `is()` method to check if the path is our API:

```php
$this->renderable(ExceptionParser::make()
    ->accept(fn(\Throwable $ex, $request) => $request->is('/api*'))
    ->renderable()
);
```

:::tip
If you return `false` from the callback, the normal exception rendering logic
will run - meaning a client that has sent an `Accept` header with the JSON:API
media type will still receive a JSON:API response. This is semantically correct,
as the `Accept` header value should be respected.
:::

### Converting Exceptions

Our exception parser is built so that you can easily add support for
custom exceptions to the JSON:API rendering process. The implementation works
using a pipeline, meaning you can add your own handlers for converting
exceptions to JSON:API errors.

For example, imagine our application had a `PaymentFailed` exception, that
we wanted to convert to JSON:API errors if thrown to the exception handler.
We would write the following class:

```php
namespace App\JsonApi\Exceptions;

use App\Exceptions\PaymentFailedException;
use LaravelJsonApi\Core\Responses\ErrorResponse;

class PaymentFailedHandler
{

    /**
     * Handle the exception.
     *
     * @param \Throwable $ex
     * @param \Closure $next
     * @return ErrorResponse
     */
    public function handle(\Throwable $ex, \Closure $next): ErrorResponse
    {
        if ($ex instanceof PaymentFailedException) {
            return ErrorResponse::error([
                'code' => $ex->getCode(),
                'detail' => $ex->getMessage(),
                'status' => '400',
                'title' => 'Payment Failed'
            ]);
        }

        return $next($ex);
    }
}
```

We can then add it to the JSON:API exception parser using either the
`prepend` or `append` method:

```php
$this->renderable(ExceptionParser::make()
    ->append(\App\JsonApi\Exceptions\PaymentFailedHandler::class)
    ->renderable()
);
```
