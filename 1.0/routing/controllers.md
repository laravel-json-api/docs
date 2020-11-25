# Controllers

[[toc]]

## Introduction

Laravel JSON:API's resource routing assigns routes for a specific
resource type to a single controller. As described in the
[Routing section on controllers](./#controllers-and-namespaces),
the controller name is either inferred from the resource type,
or can be explicitly specified when registering resource routes.

## Generating Controllers

JSON:API controllers should be generated using the `jsonapi:controller`
command, instead of using Laravel's `make:controller` command. This
is so that we can generate a controller that has all the actions
required for JSON:API routing. For example:

```bash
php artisan jsonapi:controller Api\V1\PostController
```

This will generate a controller at
`app/Http/Controllers/Api/V1/PostController.php`. This means the controller's
fully-qualified class name will be `App\Http\Controllers\Api\V1\PostController`.

The generated controller will look like this:

```php
namespace App\Http\Controllers\Api\V1;

use LaravelJsonApi\Laravel\Http\Controllers\Actions;

class PostController
{

    use Actions\FetchMany;
    use Actions\FetchOne;
    use Actions\Store;
    use Actions\Update;
    use Actions\Destroy;
    use Actions\FetchRelated;
    use Actions\FetchRelationship;
    use Actions\UpdateRelationship;
    use Actions\AttachRelationship;
    use Actions\DetachRelationship;

}
```

As you can see, the methods needed for all the JSON:API route actions
are added via traits. Our action traits handle requests and generate
responses that conform with the JSON:API specification. They also
allow you to specify controller hooks that are called during the action
methods.

These actions and hooks are described later in this chapter. However, it
is important to explain at this point that we use traits so that it is
easier for you to implement custom actions if you need to deviate from our
default implementation.

For example, say we only needed a custom implementation for the `show` route.
We would remove the `Actions\FetchOne` trait, but leave all the other traits.
Then we would just need to write our own `show` method on the controller.

## JSON:API Controller

If you have a resource type that does not need to use any controller hooks,
and does not need to override any of our default action implementations,
you can use our `JsonApiController`. This removes the need for you to
generate a controller for a resource type.

To use, specify the controller when registering the resource routes.
If you are using route namespacing, you will need to specify the controller
as follows:

```php
use LaravelJsonApi\Laravel\Http\Controllers\JsonApiController;

JsonApiRoute::server('v1')
    ->prefix('v1')
    ->namespace('Api\V1')
    ->resources(function ($server) {
        $server->resource('posts', '\\' . JsonApiController::class);
    });
```

If you are not using route namespacing, specify the controller as follows:

```php
use LaravelJsonApi\Laravel\Http\Controllers\JsonApiController;

JsonApiRoute::server('v1')
    ->prefix('v1')
    ->resources(function ($server) {
        $server->resource('posts', JsonApiController::class);
    });
```

## Controller Hooks

Each of our default controller actions will invoke methods on the controller
if they are implemented. For example, the `store` action will invoke the
`saving`, `creating`, `created` and `saved` hooks, if they are implemented
on the controller.

These hooks allow you to easily implement application specific actions,
such as firing events or dispatching jobs. They also allow you to return
customised responses.

## Actions

### Fetch-Many (Index)

Our `LaravelJsonApi\Laravel\Http\Controllers\Actions\FetchMany` trait
implements the `index` controller action. This fetches a list of resources.

#### Hooks

This action has two hooks: `searching` and `searched`.

The `searching` hook will be called with the validated query parameters
for the resource collection. This will either be an instance of
`LaravelJsonApi\Laravel\Http\Requests\AnonymousCollectionQuery`, or
the specific class if you have generated one for your resource,
for example:

```php
use App\JsonApi\V1\Posts\PostCollectionQuery;

public function searching(PostCollectionQuery $query): void
{
  // do something...
}
```

:::tip
Both the `AnonymousCollectionQuery` and `PostCollectionQuery` extend
Laravel's `FormRequest` class. More details are available in the
[Requests](../requests/) chapters.
:::

The `searched` hook will be called once models have been retrieved from
the database. The first argument will be the result of the query,
and the second will be the query request class. For example:

```php
use App\JsonApi\V1\Posts\PostCollectionQuery;

public function searched($data, PostCollectionQuery $query): void
{
  // e.g. dispatch a job.
}
```

The `searched` hook can return a response to override the default response
created by the `FetchMany` trait.

:::warning
The `$data` argument provided to the `searched` hook could be a mixture
of types. For example, it could be an Eloquent collection or a JSON:API
page object - or even a model or null if a singular filter was used.
It is therefore likely you will need to check the type before taking
action within your `searched` hook.
:::

#### Custom Action

If you want to write your own `index` controller action, remove the
`FetchMany` trait, and implement the `index` method yourself.

The typical JSON:API flow with this action is to:

1. Validate JSON:API query parameters. This is done by type-hinting
the query request class (either `PostCollectionQuery` or
`AnonymousCollectionQuery`).
2. Use the correct schema (e.g. `PostSchema`) to query models using the
JSON:API query parameters.
3. Return a response with the result in the `data` member of the JSON:API
document.

This is an example custom action:

```php
use App\JsonApi\V1\Posts\PostCollectionQuery;
use App\JsonApi\V1\Posts\PostSchema;
use LaravelJsonApi\Core\Responses\DataResponse;

/**
 * Fetch zero to many JSON API resources.
 *
 * @param PostSchema $schema
 * @param PostCollectionQuery $request
 * @return \Illuminate\Contracts\Support\Responsable|\Illuminate\Http\Response
 */
public function index(PostSchema $schema, PostCollectionQuery $request)
{
  $models = $schema
    ->repository()
    ->queryAll()
    ->using($request)
    ->paginate($request->page());

  // do something custom...

  return new DataResponse($models);
}
```

### Fetch-One (Show)

Our `LaravelJsonApi\Laravel\Http\Controllers\Actions\FetchOne` trait
implements the `show` controller action. This fetches a specified
resource.

#### Hooks

This action has two hooks: `reading` and `read`.

The `reading` hook will be called with the validated query parameters
for the resource. This will either be an instance of
`LaravelJsonApi\Laravel\Http\Requests\AnonymousQuery`, or
the specific class if you have generated one for your resource,
for example:

```php
use App\JsonApi\V1\Posts\PostQuery;

public function reading(PostQuery $query): void
{
  // do something...
}
```

:::tip
Both the `AnonymousQuery` and `PostQuery` classes extend
Laravel's `FormRequest` class. More details are available in the
[Requests](../requests/) chapters.
:::

The `read` hook will be called once model has been retrieved from
the database. The first argument will be the model,
and the second will be the query request class. For example:

```php
use App\JsonApi\V1\Posts\PostQuery;
use App\Models\Post;

public function read(?Post $post, PostCollectionQuery $query): void
{
  // e.g. dispatch a job.
}
```

The `read` hook can return a response to override the default response
created by the `FetchOne` trait.

:::warning
The `$model` argument provided to the `read` hook is `nullable` for a
reason. If the client provides filter query parameters, the model
may not match the filters and therefore the result of retrieving
it from the database will be `null`.

Whatever you do in the `read` hook,
you should ensure that it handles a `null` value safely.
:::

#### Custom Action

If you want to write your own `show` controller action, remove the
`FetchOne` trait, and implement the `show` method yourself.

The typical JSON:API flow with this action is to:

1. Validate JSON:API query parameters. This is done by type-hinting
the query request class (either `PostQuery` or `AnonymousQuery`).
2. Use the correct schema (e.g. `PostSchema`) to check whether the
model the route relates to matches any filter parameters.
3. Return a response with the result in the `data` member of the JSON:API
document.

This is an example custom action:

```php
use App\JsonApi\V1\Posts\PostQuery;
use App\JsonApi\V1\Posts\PostSchema;
use App\Models\Post;
use LaravelJsonApi\Core\Responses\DataResponse;

/**
 * Fetch zero to one JSON API resource by id.
 *
 * @param PostSchema $schema
 * @param PostQuery $request
 * @param Post $post
 * @return \Illuminate\Contracts\Support\Responsable|\Illuminate\Http\Response
 */
public function show(PostSchema $schema, PostQuery $request, Post $post)
{
  $model = $schema
    ->repository()
    ->queryOne($post)
    ->using($request)
    ->first();

  // do something custom...

  return new DataResponse($model);
}
```

### Store

Our `LaravelJsonApi\Laravel\Http\Controllers\Actions\Store` trait
implements the `store` controller action. This creates a new resource.

#### Hooks

This action has four hooks: `saving`, `creating`, `created` and `saved`.
Note that the `saving` and `saved` hooks are also called by the
[Update action.](#update)

The `saving` hook will be called with three arguments:

1. `null` to indicate that this is a create, not an update.
2. The JSON:API request class for the resource, which will have validated
the JSON document in the request, e.g. `PostRequest`.
3. The validated query parameters - either an instance of
`LaravelJsonApi\Laravel\Http\Requests\AnonymousQuery`, or
the specific class if you have generated one for your resource
(e.g. `PostQuery`).

For example:

```php
use App\JsonApi\V1\Posts\PostQuery;
use App\JsonApi\V1\Posts\PostRequest;
use App\Models\Post;

public function saving(?Post $post, PostRequest $request, PostQuery $query): void
{
  // do something on creating and updating...
}
```

The `creating` hook will only receive the request classes, for example:

```php
use App\JsonApi\V1\Posts\PostQuery;
use App\JsonApi\V1\Posts\PostRequest;

public function creating(PostRequest $request, PostQuery $query): void
{
  // do something only on creating...
}
```

:::tip
All the `PostRequest`, `AnonymousQuery` and `PostQuery` classes extend
Laravel's `FormRequest` class. More details are available in the
[Requests](../requests/) chapters.
:::

The `saved` and `created` hooks will be called once model has been created
and stored in the database. They both receive three arguments:

1. The model that was created.
2. The JSON:API request class for the resource.
3. The validated query parameters.

For example:

```php
use App\JsonApi\V1\Posts\PostQuery;
use App\JsonApi\V1\Posts\PostRequest;
use App\Models\Post;

public function saved(Post $post, PostRequest $request, PostQuery $query): void
{
  // do something on created and updated...
}

public function created(Post $post, PostRequest $request, PostQuery $query): void
{
  // do something only on created...
}
```

Both the `saved` and `created` hooks can return a response to override
the default response created by the `Store` trait. Note that if the
`saved` hook returns a response, the `created` hook **will not** be
invoked.

#### Custom Action

If you want to write your own `store` controller action, remove the
`Store` trait, and implement the `store` method yourself.

The typical JSON:API flow with this action is to:

1. Validate the JSON document to ensure it is valid for the resource
type being created. This is done by type-hinting the specific
request class, e.g. `PostRequest`.
2. Validate JSON:API query parameters. This is done by type-hinting
the query request class (either `PostQuery` or `AnonymousQuery`).
3. Use the correct schema (e.g. `PostSchema`) to create a new
model in the database.
4. Return a response with the new resource in the `data` member of
the JSON:API document.

This is an example custom action:

```php
use App\JsonApi\V1\Posts\PostQuery;
use App\JsonApi\V1\Posts\PostSchema;
use LaravelJsonApi\Core\Responses\DataResponse;

/**
 * Create a new resource.
 *
 * @param PostSchema $schema
 * @param PostRequest $request
 * @param PostQuery $query
 * @return \Illuminate\Contracts\Support\Responsable|\Illuminate\Http\Response
 */
public function show(PostSchema $schema, PostRequest $request, PostQuery $query)
{
  $model = $schema
    ->repository()
    ->create()
    ->using($query)
    ->store($request->validated());

  // do something custom...

  return new DataResponse($model);
}
```

### Update

Our `LaravelJsonApi\Laravel\Http\Controllers\Actions\Update` trait
implements the `update` controller action. This updates an existing resource.

#### Hooks

This action has four hooks: `saving`, `updating`, `updated` and `saved`.
Note that the `saving` and `saved` hooks are also called by the
[Store action.](#store)

The `saving` and `updating` hooks will be called with three arguments:

1. The model that is being updated.
2. The JSON:API request class for the resource, which will have validated
the JSON document in the request, e.g. `PostRequest`.
3. The validated query parameters - either an instance of
`LaravelJsonApi\Laravel\Http\Requests\AnonymousQuery`, or
the specific class if you have generated one for your resource
(e.g. `PostQuery`).

For example:

```php
use App\JsonApi\V1\Posts\PostQuery;
use App\JsonApi\V1\Posts\PostRequest;
use App\Models\Post;

public function saving(?Post $post, PostRequest $request, PostQuery $query): void
{
  // do something on creating and updating...
}

public function updating(Post $post, PostRequest $request, PostQuery $query): void
{
  // do something only on updating...
}
```

:::tip
All the `PostRequest`, `AnonymousQuery` and `PostQuery` classes extend
Laravel's `FormRequest` class. More details are available in the
[Requests](../requests/) chapters.
:::

The `saved` and `updated` hooks will be called once model has been updated
and stored in the database. They both receive the same three arguments.

For example:

```php
use App\JsonApi\V1\Posts\PostQuery;
use App\JsonApi\V1\Posts\PostRequest;
use App\Models\Post;

public function saved(Post $post, PostRequest $request, PostQuery $query): void
{
  // do something on created and updated...
}

public function updated(Post $post, PostRequest $request, PostQuery $query): void
{
  // do something only on created...
}
```

Both the `saved` and `updated` hooks can return a response to override
the default response created by the `Update` trait. Note that if the
`saved` hook returns a response, the `updated` hook **will not** be
invoked.

#### Custom Action

If you want to write your own `update` controller action, remove the
`Update` trait, and implement the `update` method yourself.

The typical JSON:API flow with this action is to:

1. Validate the JSON document to ensure it is valid for the resource
type being updated. This is done by type-hinting the specific
request class, e.g. `PostRequest`.
2. Validate JSON:API query parameters. This is done by type-hinting
the query request class (either `PostQuery` or `AnonymousQuery`).
3. Use the correct schema (e.g. `PostSchema`) to update the model
with the validated data.
4. Return a response with the updated resource in the `data` member of
the JSON:API document.

This is an example custom action:

```php
use App\JsonApi\V1\Posts\PostQuery;
use App\JsonApi\V1\Posts\PostSchema;
use App\Models\Post;
use LaravelJsonApi\Core\Responses\DataResponse;

/**
 * Update an existing resource.
 *
 * @param PostSchema $schema
 * @param PostRequest $request
 * @param PostQuery $query
 * @param Post $post
 * @return \Illuminate\Contracts\Support\Responsable|\Illuminate\Http\Response
 */
public function update(
  PostSchema $schema,
  PostRequest $request,
  PostQuery $query,
  Post $post
) {
  $model = $schema
    ->repository()
    ->update($post)
    ->using($query)
    ->store($request->validated());

  // do something custom...

  return new DataResponse($model);
}
```
