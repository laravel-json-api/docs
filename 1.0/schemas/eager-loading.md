# Eager Loading

[[toc]]

## Introduction

The JSON:API `include` query parameter allows a client to customize
which related resources should be returned in a response document.
If the `include` parameter is provided, the response document will be
a [Compound Document](https://jsonapi.org/format/#document-compound-documents)
containing the subject of the request in the `data` member, and the
related resources in the top-level `included` member.

In Laravel terms, the `include` query parameter allows the client to control
[eager loading.](https://laravel.com/docs/8.x/eloquent-relationships#eager-loading)
Each JSON:API include path maps to an Eloquent eager load path.

Eager loading via the `include` parameter allows a client to reduce the
number of HTTP requests. Ideally, a client should be able to retrieve
the resources they need in a single request for a Compound
Document.

## Eager Loading Depth

Our implementation allows you to specify the depth to which a client
can request eager loading. This is defined on the resource type's
schema and by default is set to a depth of `1`.

To illustrate this, take the following `PostSchema`:

```php
use LaravelJsonApi\Eloquent\Fields\ID;
use LaravelJsonApi\Eloquent\Fields\Relations\BelongsTo;
use LaravelJsonApi\Eloquent\Fields\Relations\HasMany;

/**
 * @inheritDoc
 */
public function fields(): array
{
    return [
        ID::make(),
        // ...attribute fields
        BelongsTo::make('user'),
        HasMany::make('tags'),
        HasMany::make('comments'),
    ];
}
```

With a default depth of `1`, the client will be allowed to to request
the following include paths:

- `user`
- `tags`
- `comments`

If we increase the max depth to `2`, the client will be allowed to
request paths *through* the relationships. For example:

- `user`
- `user.profile`
- `tags`
- `comments`
- `comments.user`

### Setting the Depth

To set the depth of include paths on a resource type, use the
`$maxDepth` property:

```php
class PostSchema extends Schema
{

    /**
    * The maximum depth of include paths.
    *
    * @var int
    */
    protected int $maxDepth = 3;
}
```

:::warning
You probably do not want to use a large maximum depth - typically,
a maximum value of `3` or `4` is ideal. For example, the
[Stripe API](https://stripe.com/docs/api/expanding_objects)
allows a maximum depth of `4` levels.
:::

## Disabling On Specific Relations

Typically you should prevent eager loading on relationships that could
(even if only in theory) return hundreds of resources. This is because
it would be exceptionally inefficient for a client to get a compound
document that contains hundreds or thousands of related resources.

Take for example a `posts` resource with a `comments` relationship.
If our blog application is extremely popular, a post could have hundreds
or thousands of comments. In such a scenario, we would want to prevent
the `comments` relationship from being eager loaded, by using the
`cannotEagerLoad` method:

```php
HasMany::make('comments')->cannotEagerLoad()
```

:::tip
In this scenario, our include path *depth* implementation will know not to
allow any paths *through* the relation that is marked as not allowed for
eager loading.
:::

In this scenario, we would instead expect an API client to receive
paginated `comments` for a `posts` resource, by making a request to
the `comments` relationship endpoint:

```http
GET /api/v1/posts/123/comments?page[size]=20&page[number]=1&include=user HTTP/1.1
Accept: application/vnd.api+json
```

In this request, the client asks for the first 20 comments for the `posts`
resource with an `id` of `123`. It also asks for the `user` of the `comments`
to be included, so that it can display each comment with the user who
created it.

:::tip
As this relationship endpoint returns `comments` resources, the allowed
include paths are determined by the `CommentSchema` class.
:::

## Disabling On A Resource Type

To disable eager loading for a resource type, set the `$maxDepth` property
to zero:


```php
class PostSchema extends Schema
{

    /**
    * The maximum depth of include paths.
    *
    * @var int
    */
    protected int $maxDepth = 0;
}
```

## Specifying Custom Paths

If you do not want to use our *depth* implementation, you can specify
allowed include paths on a resource type by implementing the `includePaths`
method on your schema. For example:

```php
public function includePaths(): iterable
{
    return [
      'comments',
      'comments.user',
      'tags',
    ];
}
```

## Default Eager Loading

If you need to access a resource's relationships within a resource's attributes,
you can add the relationship to the `$with` property of your schema. This
property instructs the schema to always eager load the listed model
relationships when retrieving the resource.

For example, if your database had a `users` table and a `user_profiles` table.
Instead of having a `profile` relationship on your `users` resource, you may
want the profile information to always be serialized as an attribute on the
`users` resource. You would therefore need to eager-load the related profile
whenever a `users` resource was retrieved. To do this, we would add the
`profile` relationship to the `UserSchema` `$with` property:

```php
/**
 * The relationships that should be eager loaded.
 *
 * @var array
 */
public static $with = ['profile'];
```

:::tip
You should only need to add model relationships to your `$with` property if
the related model is used when serializing attributes. If a model relationship
is available on your resource as a JSON:API relationship, then eager loading
is controlled via the `include` query parameter.
:::
