# The Basics

[[toc]]

## Introduction

Schemas describe JSON:API resources that exist within your server.
For Eloquent models, they also describe how the JSON:API server interacts
with the database to query, create, read, update and delete resources.

## Defining Schemas

By default, schemas are stored in a folder relative to where your
`Server` class is stored. The pluralized form of the JSON:API resource
type is used as the folder name.

For example, if the `App\JsonApi\V1\Server` has a resource called
`posts`, the schema will exist as `App\JsonApi\V1\Server\Posts\PostSchema`.

You may generate a new schema using the `jsonapi:schema` Artisan command:

```bash
php artisan jsonapi:schema posts --server=v1
```

::: tip
The `--server` option is not required if you only have one server.
:::

The most basic and fundamental property of a schema is its `model`
property. This property tells the server which Eloquent model the schema
corresponds to:

```php
/**
 * The model the schema corresponds to.
 *
 * @var string
 */
public static string $model = \App\Models\Post::class;
```

Freshly created schemas only contain `id`, `createdAt` and `updatedAt`
fields. Don't worry, we'll add more fields to our schema soon.

## Registering Schemas

Before resources are available in your server, they must first be registered
with the server. Resources are registered in the `allSchemas()` method
of your server class.

For example, to register our `PostSchema`:

```php
namespace App\JsonApi\V1;

use LaravelJsonApi\Core\Server\Server as BaseServer;

class Server extends BaseServer
{

    // ...

    /**
     * Get the server's list of schemas.
     *
     * @return array
     */
    protected function allSchemas(): array
    {
        return [
            Posts\PostSchema::class,
        ];
    }
}
```

::: tip
We do not support automatic discovery of schemas intentionally.
Although our directory conventions means it would be possible to detect
schemas, it is inefficient to run discovery code on every HTTP request.
Manually registering schemas makes your API more efficient.
:::

Once your schema class is registered, your server is able to auto-discover
the additional `Resource` and `Request` classes for the schema's resource
type.

## Resource Type

By default, the JSON:API resource type is the plural and dasherized version
of the class name that appears before `Schema`.

For example, the resource type for `PostSchema` will be `posts`. For
`BlogPostSchema` it will be `blog-posts`.

You can easily override this default behaviour if needed. For example,
if we wanted the resource type for our `PostSchema` to be `blog_posts`,
we would implement the static `type()` method on our schema:

```php
class PostSchema extends Schema
{

    /**
     * Get the JSON API resource type.
     *
     * @return string
     */
    public static function type(): string
    {
        return 'blog_posts';
    }
}
```
