# Routing

[[toc]]

## Introduction

Laravel JSON:API routing provides a fluent interface for defining the
the resource routes defined in the JSON:API specification. Routes
are added using the `JsonApiRoute` facade.

:::tip
Our routing implementation expects to access the `Schema` class for each
resource type. So before you add resource routes, make sure you have
[generated a Schema for the resource type.](../schemas/)
:::

## Defining Servers

To define routes available in a JSON:API server, register the API in
your `routes/api.php` file as follows:

```php
JsonApiRoute::server('v1')
    ->prefix('v1')
    ->namespace('Api\V1')
    ->resources(function ($server) {
        $server->resource('posts');
        $server->resource('tags');
        $server->resource('users');
    });
```

As you can see with this example, this registers the JSON:API server called
`v1`. This must match the key of the server in your `jsonapi.servers`
configuration array.

The object returned by the `JsonApiRoute::server()` method allows a number
of typical Laravel routing methods to be called. In the example above,
we call `prefix` and `namespace` to set the URL prefix for the server,
and the controller namespace. The other available methods are described
below.

After calling any of these methods, we finish with a call to the `resources`
method. This receives a `Closure` in which we register the routes for each
resource type in our server. This is similar to a
[Laravel routing group.](https://laravel.com/docs/routing#route-groups)

### Controllers and Namespaces

Laravel's route groups have traditionally allowed controller namespaces
to be set via groups. In the following example, the `namespace` method
is called, instructing Laravel that controllers for our server are
in the `App\Http\Controllers\Api\V1` namespace:

```php
JsonApiRoute::server('v1')
    ->prefix('v1')
    ->namespace('Api\V1')
    ->resources(function ($server) {
        $server->resource('posts');
    });
```

This will work if the `$namespace` property is set on your
`App\Providers\RouteServiceProvider`. In this case, we do not need to
specify a controller when registering a resource type using the `resource`
method. The controller is assumed to be the singular form of the resource
type. For example, the `blog-posts` resource type would be expected to have
a `BlogPostController` in the specified namespace.

If your controller does not conform to this convention, provide the
controller name as the second argument to the `resource` method:

```php
JsonApiRoute::server('v1')
    ->prefix('v1')
    ->namespace('Api\V1')
    ->resources(function ($server) {
        $server->resource('blog-posts', 'PostController');
    });
```

**If you are not using namespacing**, i.e. the `$namespace` property is not
set on your `App\Providers\RouteServiceProvider`, you will **always** need
to provide the fully-qualified controller class name to the `resource`
method. For example:

```php
use App\Http\Controllers\Api\V1\PostController;
use App\Http\Controllers\Api\V1\TagController;

JsonApiRoute::server('v1')
    ->prefix('v1')
    ->resources(function ($server) {
        $server->resource('posts', PostController::class);
        $server->resources('tags', TagController::class);
    });
```

:::tip
As explained in the [Controllers chapter](./controllers.md), it is also
possible to use a default `JsonApiController`. This can be used when
you do not need to customise any of our default action implementations.
:::

### Server Domain

If you need to set a domain for your server, use the `domain` method.
For example:

```php
JsonApiRoute::server('v1')
    ->domain('api.myapp.com')
    ->resources(function ($server) {
        $server->resource('posts');
        $server->resource('tags');
        $server->resource('users');
    });
```

Or if you had wildcard sub-domains:

```php
JsonApiRoute::server('v1')
    ->domain('{account}.myapp.com')
    ->resources(function ($server) {
        $server->resource('posts');
        $server->resource('tags');
        $server->resource('users');
    });
```

### Server Middleware

When you call `JsonApiRoute::server()`, what you are effectively doing is
adding server routes that all run within the `jsonapi` middleware.
This middleware receives the name of the JSON:API server the routes belong
to, so it knows which server to [bootstrap.](../servers/events.md#http-only-events)

If you call the `middleware` method *after* the `server` method, your
middleware will be added *after* the `jsonapi` middleware.

In this example:

```php
JsonApiRoute::server('v1')
    ->middleware('my-middleware1', 'my-middleware2')
    ->prefix('v1')
    ->namespace('Api\V1')
    ->resources(function ($server) {
        $server->resource('posts');
    });
```

All the server's routes will be wrapped in the following middleware:

1. `jsonapi:v1`
2. `my-middleware1`
3. `my-middleware2`

If you need to add middleware to run *before* the `jsonapi` middleware,
use a Laravel route group. For example:

```php
Route::middleware('my-middleware1')->group(function () {
    JsonApiRoute::server('v1')
      ->middleware('my-middleware2')
      ->prefix('v1')
      ->namespace('Api\V1')
      ->resources(function ($server) {
          $server->resource('posts');
      });
});
```

In this example, the middleware order will be as follows:

1. `my-middleware1`
2. `jsonapi:v1`
3. `my-middleware2`

### Server Route Names

By default, the `JsonApiRoute::server` method will set the route name to
the name of the server. You do not therefore need to call the `name`
method unless you want to override this behaviour.

In the following example, we override the default route name of `v1` to
`api:v1`:

```php
JsonApiRoute::server('v1')
    ->name('api:v1')
    ->prefix('v1')
    ->namespace('Api\V1')
    ->resources(function ($server) {
        $server->resource('posts');
    });
```

## Defining Resources

To define routes for a specific resource type, we call the `resource`
method on the `$server` variable passed to our `resources` closure.

For example, the following registers routes for the `posts`, `tags` and
`users` resources:

```php
JsonApiRoute::server('v1')
    ->prefix('v1')
    ->namespace('Api\V1')
    ->resources(function ($server) {
        $server->resource('posts');
        $server->resource('tags');
        $server->resource('users');
    });
```

### Resource Actions

For each resource type, this registers the following actions:

| Verb | URI | Action | Route Name |
| --- | --- | --- | --- |
| GET | `/posts` | index | posts.index |
| POST | `/posts` | store | posts.store |
| GET |  `/posts/{post}` | show | posts.show |
| PATCH | `/posts/{post}` | update | posts.update |
| DELETE | `/posts/{post}` | destroy | posts.destroy |

:::tip
The naming of these actions mirrors those used by Laravel's
[resource controllers.](https://laravel.com/docs/controllers#resource-controllers)
:::

### Partial Resource Routes

When declaring a resource route, you may specific a subset of actions
the controller should handle instead of the full set of default actions:

```php
$server->resource('posts')->only('index', 'show');
$server->resource('posts')->except('store', 'destroy');
```

We also include the `readOnly` helper, which ensures that only the `index`
and `show` actions are registered:

```php
$server->resource('posts')->readOnly();
```

### Resource URI and Parameter

When registering the resource URIs, we use the dash-case form of the
resource type by default. If you need to use something else,
you can override this on your [resource's schema.](../schemas/#uri-type)

For the parameter, Laravel does not allow dashes for parameter names.
We therefore underscore (snake-case) the singular form of the resource
type for the parameter name. E.g. `blog-posts` will become `blog_post`.

The parameter can be customised using the `parameter` method:

```php
$server->resource('blogPosts')->parameter('post');
```

The above example would register routes using `/blog-posts` and
`/blog-posts/{post}`.

### ID Constraints

We will automatically add ID contraints for a resource type. This is worked
out from your schema's [ID pattern.](../schemas/identifier.md#pattern)

### Naming Resource Routes

As shown in the table above, all resource routes are named. However, you
can override these names by calling the `name` or `names` methods.
For example:

```php
$server->resource('posts')
    ->name('store', 'posts.build')
    ->name('update', 'posts.modify');
// is identical to...
$server->resource('posts')->names([
  'store' => 'posts.build',
  'update' => 'posts.modify',
]);
```

### Resource Middleware

It is possible to add middleware for all of a resource's routes. Just
use the `middleware` method:

```php
$server->resource('posts')->middleware('my_middlware1', 'my_middlware2');
```

:::tip
If you want to add middleware to specific resource actions, you should
use [Controller middleware.](https://laravel.com/docs/controllers#controller-middleware)
:::

## Defining Relationships

To define relationship routes for a specific resource type, call the
`relationships` method when registering the resource type. The method
is provided with a closure that allows you to fluently define resource
relationship routes.

For example, if we want to register routes for a `posts` resource's
`author`, `comments` and `tags` relationships:

```php
$server->resource('posts')->relationships(function ($relationships) {
  $relationships->hasOne('author');
  $relationships->hasMany('comments');
  $relationships->hasMany('tags');
});
```

### To-One Actions

For each to-one relationship, the following actions are registered:

| Verb | URI | Action | Route Name |
| --- | --- | --- | --- |
| GET | `/author` | showRelated | posts.author |
| GET | `/relationships/author` | showRelationship | posts.author.show |
| PATCH | `/relationships/author` | updateRelationship | posts.author.update |

### To-Many Actions

For each to-many relationship, the following actions are registered:

| Verb | URI | Action | Route Name |
| --- | --- | --- | --- |
| GET | `/tags` | showRelated | posts.tags |
| GET | `/relationships/tags` | showRelationship | posts.tags.show |
| PATCH | `/relationships/tags` | updateRelationship | posts.tags.update |
| POST | `/relationships/tags` | attachRelationship | posts.tags.attach |
| DELETE | `/relationships/tags` | detachRelationship | posts.tags.detach |

### Partial Relationship Routes

When declaring a relationship, you may specify a subset of actions the
controller should handle instead of the full set of default actions.
To do this, use the short-hand action names of `related`, `show`,
`update`, `attach` and `detach`.

For example:

```php
$relationships->hasOne('author')->only('related', 'show');
$relationships->hasMany('tags')->except('update');
```

We also include the `readOnly` helper, which ensures only the `related` and
`show` actions are registered:

```php
$relationships->hasOne('author')->readOnly();
$relationships->hasMany('comments')->readOnly();
```

### Relationship URI

When registering relationship routes, we use the relationship field name
to work out the URI. We follow our convention of dash-casing relationships
field names in URIs. So if the relationship is called `blogPost`,
the URI will be `blog-post`.

If you need to use something else, you can configure this on the
[relation field in the resource's schema.](../schemas/relationships.md#uri-name)

### Naming Relationship Routes

As shown in the table above, all relationship routes are named. However, you
can override these names by calling the `name` or `names` methods.
Use our short-hands of `related`, `show`, `update`, `attach` and `detach`
for the actions:

```php
$relationships->hasOne('author')
  ->name('related', 'author.related')
  ->name('show', 'author.relationships.show');
// is identical to...
$relationships->hasOne('author')->names([
  'related' => 'author.related',
  'show' => 'author.relationships.show',
]);
```

### Relationship Middleware

It is possible to add middleware for all of a relationship's routes. Just
use the `middleware` method.

The following example adds middleware to our `tags` relationship routes:

```php
$relationships->hasMany('tags')->middleware('my_middlware1', 'my_middlware2');
```
