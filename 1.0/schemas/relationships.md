# Relationships

[[toc]]


## Relationship Fields

In addition to the variety of attributes we've already discussed, Laravel
JSON:API has full support for all of Laravel's Eloquent relationships. To
add a relationship to a schema, we can simply add it to the schema's
`fields` method.

Our relationship fields take care of querying and hydrating
relationships.

To create a relationship, we use the static `make` method, providing the
JSON:API field name as the first argument. For example, if our `Post`
schema had `author` and `tags` relationships:

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
    ];
}
```

## Model Method Names

By default, the field will expect the method for the relationship on the
Eloquent model to be the *camel-case* form of the JSON:API field name.
For example, for a relationship field name of `postal-address`, the
expected method on the Eloquent model would be `postalAddress`.

To use a different method name than the default, provide the method name
as the second argument to the `make` method:

```php
BelongsTo::make('address', 'postalAddress');
```

## Inverse Type

Every relationship must have an inverse resource type. This is the JSON:API
resource type that is returned by the relationship.

For relationships that return zero-to-one related resources (known as
**to-one** relations), we assume the inverse type is the dasherized and
pluralized form of the Eloquent method name. For example:

```php
BelongsTo::make('blogPost') // assumed 'blog-posts'
BelongsTo::make('author', 'user') // assumed 'users'
```

For relationships that return zero-to-many related resources (known as
**to-many** relations), we assume the inverse type is the dasherized
form of the Eloquent method name. For example:

```php
HasMany::make('postTags') // assumed 'post-tags'
HasMany::make('tags', 'postTags') // assumed 'post-tags'
```

In either case, to use a different inverse resource type, just call the
`inverseType()` method. For example if our `Post` schema has an
`author` relationship field, but the inverse type was `users`:

```php
BelongsTo::make('author')->inverseType('users')
```

## Eager Loading

By default, all relationship field types are allowed as
[include paths](https://jsonapi.org/format/#fetching-includes). This
is the equivalent of Eloquent's eager loading capability.

If you do not want to allow a relationship field to be an include path,
use the `cannotEagerLoad` method:

```php
BelongsTo::make('author')->cannotEagerLoad()
```

For more detail, see the [Eager Loading chapter.](./eager-loading.md)

## Sparse Fields

By default, all relationship field types are allowed as
[sparse fields](https://jsonapi.org/format/#fetching-sparse-fieldsets).
If you do not want to allow an relationship to be a sparse field, you should
use the `notSparseField` method:

```php
BelongsTo::make('author')->notSparseField()
```

## Read-Only Fields

The majority of our relationship fields are writeable, with the exception
of the `HasOneThrough` and `HasManyThrough` relationships which are always
read-only.

For the other relationship fields, there are times when you may want to allow
the client to only create or update certain relationships on the resource.
You can do this by using the `readOnly` method, which will prevent the field
from being filled in certain circumstances.

Pass a closure to the `readOnly()` method. It will receive the current
request as the first argument:

```php
BelongsTo::make('author')->readOnly(
    static fn($request) => !$request->user()->isAdmin()
);
```

If you only want to set the relationship to read only when creating or
updating resources, you may use the `readOnlyOnCreate` or
`readOnlyOnUpdate` methods:

```php
BelongsTo::make('author')->readOnlyOnUpdate();
```

:::danger
The read-only methods on relationships only affect the relationship when
it is being filled as a result of a `POST` or `PATCH` request for a
resource type. For example, the `author` field on a `posts` resource
will have its read-only state checked when the client has submitted a request
to create or update a `posts` resource, i.e. a request to
`POST /api/v1/posts` or `PATCH /api/v1/posts/123`

The read-only methods do not affect changing relationships via relationship
end-points: e.g. `PATCH /api/v1/posts/123/relationships/author`. There is
no need for us to check the read-only status in this circumstance because
this relationship route should not be registered with the Laravel router
if the relationship is read-only.
:::

## Relationship Types

Laravel JSON:API ships with field types that work with all of the
Eloquent relationships. The types are:

| JSON:API Type | Eloquent Type(s) | Writeable |
| --- | --- | --- |
| [Has One](#has-one) | `hasOne`, `morphOne` | Yes |
| [Has Many](#has-many) | `hasMany`, `morphMany` | Yes |
| [Has One Through](#has-one-through) | `hasOneThrough` | No |
| [Has Many Through](#has-many-through) | `hasManyThrough` | No |
| [Belongs To](#belongs-to) | `belongsTo` | Yes |
| [Belongs To Many](#belongs-to-many) | `belongsToMany`, `morphToMany`, `morphedByMany` | Yes |
| [Morph To](#morph-to) | `morphTo` | Yes |

### Has One

The `HasOne` field corresponds to either a `hasOne` or `morphOne` Eloquent
relationship. For example, let's assume a `User` model `hasOne` `Address`
model. We may add the relationship to our `User` schema like so:

```php
use LaravelJsonApi\Eloquent\Fields\Relations\HasOne;

HasOne::make('address')
```

As described above, this will assume the method name on the model is `address`.
If this is not the case, the method name can be provided as the second
argument:

```php
HasOne::make('address', 'postalAddress')
```

The inverse resource type is assumed to be the pluralized and dasherized form
of the Eloquent method name. If this is not the case, use the `inverseType`
method:

```php
HasOne::make('address') // assumed 'addresses'
HasOne::make('address')->inverseType('user-addresses')
```

### Has Many

The `HasMany` field corresponds to a `hasMany` or a `morphMany` Eloquent
relationship. For example, let's assume that our `Video` model `hasMany`
`Comment` models. We may add the relationship to our `Video` schema like so:

```php
use LaravelJsonApi\Eloquent\Fields\Relations\HasMany;

HasMany::make('comments')
```

As described above, this will assume the method name on the model is `comments`.
If this is not the case, the method name can be provided as the second
argument:

```php
HasMany::make('comments', 'userComments')
```

The inverse resource type is assumed to be the dasherized form of the Eloquent
method name. If this is not the case, use the `inverseType` method:

```php
HasMany::make('comments') // assumed 'comments'
HasMany::make('comments')->inverseType('video-comments')
```

### Has One Through

The `HasOneThrough` field corresponds to a `hasOneThrough` Eloquent
relationship. For example, let's assume a `Mechanic` model has one `Car`,
and each `Car` may have one `Owner`. While the `Mechanic` and the `Owner`
has no direct connection, the `Mechanic` can access the `Owner` through
the `Car` itself.

You can add this relationship to your `Mechanic` schema as follows:

```php
use LaravelJsonApi\Eloquent\Fields\Relations\HasOneThrough;

HasOneThrough::make('owner')
```

As described above, this will assume the method name on the model is `owner`.
If this is not the case, the method name can be provided as the second
argument:

```php
HasOneThrough::make('owner', 'carOwner');
```

The inverse resource type is assumed to be the pluralized and dasherized form
of the Eloquent method name. If this is not the case, use the `inverseType`
method:

```php
HasOneThrough::make('owner') // assumed 'owners'
HasOneThrough::make('owner')->inverseType('car-owners')
```

:::warning
The `HasOneThrough` field **cannot** be hydrated (filled). This is because
the intermediary resource should be created or updated instead.

Using our example, a JSON:API client can create or update a `cars` resource,
and its related owner and mechanic. That would change the `mechanics`
has-one-through `owner` relation.
:::


### Has Many Through

The `HasManyThrough` field corresponds to a `hasManyThrough` Eloquent
relationship. For example, a `Country` model might have many `Post` models
through an intermediate `User` model. In this example, you could easily
gather all blog posts for a given country.

You can add this relationship to your `Country` schema as follows:

```php
use LaravelJsonApi\Eloquent\Fields\Relations\HasManyThrough;

HasManyThrough::make('posts')
```

As described above, this will assume the method name on the model is `posts`.
If this is not the case, the method name can be provided as the second
argument:

```php
HasManyThrough::make('posts', 'blogPosts')
```

The inverse resource type is assumed to be the dasherized form of the Eloquent
method name. If this is not the case, use the `inverseType` method:

```php
HasManyThrough::make('posts') // assumed 'posts'
HasManyThrough::make('posts')->inverseType('blog-posts')
```

:::warning
The `HasManyThrough` field **cannot** be hydrated (filled). This is because
the intermediary resource should be created or updated instead.

Using our example, the contents of the `Country`'s `posts` relationship is
generated by the `User` models that are linked to `Post` models. Therefore a
JSON:API client would create or update a `posts` resource, and/or change the
country linked to a `users` resource, to amend the country's `posts`
relationship.
:::

### Belongs To

The `BelongsTo` field corresponds to a `belongsTo` Eloquent relationship.
For example. let's assume a `Post` model `belongsTo` a `User` model. We
may add the relationship to our `Post` schema like so:

```php
use LaravelJsonApi\Eloquent\Fields\Relations\BelongsTo;

BelongsTo::make('user')
```

As described above, this will assume the method name on the model is `user`.
If this is not the case, the method name can be provided as the second
argument:

```php
BelongsTo::make('author', 'user')
```

The inverse resource type is assumed to be the pluralized and dasherized form
of the Eloquent method name. If this is not the case, use the `inverseType`
method:

```php
BelongsTo::make('author', 'user') // assumed 'users'
BelongsTo::make('author')->inverseType('users')
```

### Belongs To Many

The `BelongsToMany` field corresponds to a `belongsToMany`, `morphToMany`
or `morphedByMany` Eloquent relationship. For example, let's assume a
`User` model `belongsToMany` `Role` models. We may add the relationship to
our `User` schema like so:

```php
use LaravelJsonApi\Eloquent\Fields\Relations\BelongsToMany;

BelongsToMany::make('roles');
```

As described above, this will assume the method name on the model is `roles`.
If this is not the case, the method name can be provided as the second
argument:

```php
BelongsToMany::make('roles', 'accessRoles')
```

The inverse resource type is assumed to be the dasherized form of the Eloquent
method name. If this is not the case, use the `inverseType` method:

```php
BelongsToMany::make('roles') // assumed 'roles'
BelongsToMany::make('roles')->inverseType('access-roles')
```

#### Pivot Table

If your `BelongsToMany` relationship interacts with additional *pivot* columns
that are stored on the intermediate table of the relationship, you may also
attach these to the relationship.

:::tip
The JSON:API specification does not allow attributes to be sent with relationship
identifiers. It is therefore important to understand that the follow examples
only allow us to add *server-calculated* values to a pivot table.

If you need the client to provide values for a pivot table, then you should
use a pivot model for the intermediary table, and add that model to your API
as its own resource type. So in the following example, we would have a
`RoleUser` model for the intermediary `role_user` table, and have a JSON:API
resource called `role-users`.
:::

For example, let's assume our `User` model `belongsToMany` `Role` models.
On our `role_user` intermediate table, let's imagine that we have an
`approved` column that contains a flag as to whether an administrator
created the relationship between the `User` and the `Role`. We can
store this information by providing a callback to the `fields` method
on the relationship:

```php
BelongsToMany::make('roles')->fields(static fn($parent, $related) => [
  'approved' => \Auth::user()->admin,
]);
```

:::tip
The callback receives two arguments: the parent of the relationship, and
the models that are being attached. In this example, the parent would be
the `User` model, and the related models would be `Role` models.
:::

To provide values that require no calculation, pass an `array` to the `fields`
method:

```php
BelongsToMany::make('roles')->fields(['approved' => false]);
```

Of course we could also add this pivot data on the inverse of the relationship.
So, if we define the `BelongsToMany` field on the `User` schema, we would
also define its inverse on the `Role` schema:

```php
BelongsToMany::make('users')->fields(static fn() => [
  'approved' => \Auth::user()->admin,
]);
```

Since defining the field on both ends of the relationship can cause some
code duplication, we allow you to pass an invokable object to the `fields`
method:

```php
BelongsToMany::make('roles')->fields(new ApprovedPivot())
```

In this example, the `ApprovedPivot` could be a simple, invokable class that
returns the array of pivot fields:

```php
namespace App\JsonApi\Pivots;

use Illuminate\Support\Facades\Auth;
use function boolval;
use function optional;

class ApprovedPivot
{

    /**
     * Get the pivot attributes.
     *
     * @param $parent
     * @param $related
     * @return array
     */
    public function __invoke($parent, $related): array
    {
        return [
            'approved' => boolval(optional(Auth::user())->admin),
        ];
    }

}
```

### Morph One

Use the [`HasOne` field](#has-one) for an Eloquent `morphOne` relation.

### Morph Many

Use the [`HasMany` field](#has-many) for an Eloquent `morphMany` relation.

### Morph To

The `MorphTo` field corresponds to a `morphTo` Eloquent relationship.
For example, let's assume a `Comment` model has a polymorphic relationship
with both the `Post` and `Video` models. We may add the relationship to our
`Comment` schema like so:

```php
use LaravelJsonApi\Eloquent\Fields\Relations\MorphTo;

MorphTo::make('commentable')->types('posts', 'videos')
```

As you can see from the above example, the `types` method is used to
instruct the `MorphTo` field what its inverse JSON:API resource types are.

As described above, this will assume the method name on the model is
`commentable`. If this is not the case, the method name can be provided as the
second argument:

```php
MorphTo::make('commentable', 'items')
```

### Morph To Many

Use the [`BelongsToMany` field](#belongs-to-many)  for an Eloquent
`morphToMany` relation.
