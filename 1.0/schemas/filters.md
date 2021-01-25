# Filters

[[toc]]

## Introduction

Laravel JSON:API filters allow you to scope database queries based on a
value in the
[JSON:API `filter` query parameter.](https://jsonapi.org/format/#fetching-filtering)

While the JSON:API specification reserves the `filter` query parameter
for filtering data, it is agnostic about the strategies that the server
should support. Our implementation is therefore unopinionated as to how
you should support filtering, and instead provides a way for you to
attach your own filters to build your implementation.

## Defining Filters

Filter classes are used to describe the filters that a client is allowed
to send for a particular resource type. To add a filter to a schema, we
can simply add it to the schema's `filters` method.

To create a filter, we use the static `make` method, providing the
the key that is expected in the `filter` query parameter. For example,
if our `posts` resource type allowed `id` and `slug` filters:

```php
namespace App\JsonApi\V1\Posts;

use LaravelJsonApi\Eloquent\Filters\Where;
use LaravelJsonApi\Eloquent\Filters\WhereIn;
use LaravelJsonApi\Eloquent\Schema;

class PostSchema extends Schema
{

    // ...

    public function filters(): array
    {
        return [
            WhereIn::make('id', $this->idColumn()),
            Where::make('slug'),
        ];
    }

}
```

A client can now specify either of these filters when querying the `posts`
resource:

```http
GET /api/v1/posts?filter[slug]=hello-world HTTP/1.1
Accept: application/vnd.api+json
```

### Relationship Filters

When accessing a resource type via a relationship, you can use any of the
filters that exist of the resource type's schema.

In the above `posts` schema, we defined `id` and `slug` filters. These
can be used when querying `posts` that exist in a relationship. For example,
if our `users` resource had a `posts` relationship:

```http
GET /api/v1/users/123/posts?filter[slug]=hello-world HTTP/1.1
Accept: application/vnd.api+json
```

We also provide the ability to add additional filters to relationships.
For example, we could add an additional filter for the `users` resource's
`posts` relationship by using the `withFilters` method on the relationship:

```php
namespace App\JsonApi\V1\Users;

use LaravelJsonApi\Eloquent\Fields\Relations\HasMany;
use LaravelJsonApi\Eloquent\Filters\Where;
use LaravelJsonApi\Eloquent\Filters\WhereIn;
use LaravelJsonApi\Eloquent\Schema;

class UserSchema extends Schema
{

    // ...

    public function fields(): array
    {
        return [
            // other fields...
            HasMany::make('posts')->withFilters(
              Where::make('foo'),
              WhereIn::make('bar')
            )
        ];
    }

}
```

### Belongs to Many Pivot Filters

As described in the relationships chapter, our
[Belongs to Many](./relationships.md#belongs-to-many) relation allows you
to define pivot fields on a separate class. This allows the definition
to be used on both resources on either side of the pivot.

You can also define filters on these pivot classes, allowing the filters
to be used for either resource on each side of the pivot. Just add
the filters to a `filters` method on your pivot class.

For example, our [WherePivot](#wherepivot), [WherePivotIn](#wherepivotin)
and [WherePivotNotIn](#wherepivotnotin) filters could be defined on the
pivot class as follows:

```php
namespace App\JsonApi\Pivots;

use Illuminate\Support\Facades\Auth;
use LaravelJsonApi\Eloquent\Filters\WherePivot;
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

    /**
     * Get the pivot filters.
     *
     * @return array
     */
    public function filters(): array
    {
        return [
            WherePivot('approved')->asBoolean(),
        ];
    }

}
```

The client can now request roles for a `users` resource that are approved,
via the relationship:

```http
GET /api/v1/users/123/roles?filter[approved]=true HTTP/1.1
Accept: application/vnd.api+json
```

## Column Names

By default, most filters will expect the column name it filters on to be
the *snake case* form of the filter's key. For example, if we decided
to *dash case* our filters - e.g. `display-name` - the column would
default to `display_name`.

To use a different column name than the default, provide the column name
as the second argument to the `make` method:

```php
Where::make('name', 'display_name')
```

## Filter Values

Each filter is provided the value for their key in the `filter` parameter.
For example, if the client makes the following request:

```http
GET /api/v1/posts?filter[slug]=hello-world HTTP/1.1
Accept: application/vnd.api+json
```

The `slug` filter will be provided with the value `"hello-world"`.

:::tip
It's worth remembering that because the value of the filter comes from an
HTTP query parameter, values will typically be strings, or arrays of strings.
:::

If you need to run any conversion on the value before it is used to scope
a database query, provide a closure to the `deserializeUsing` method. For
example, if we always wanted the `slug` filter value to be lower case:

```php
Where::make('slug')->deserializeUsing(
  fn($value) => strtolower($value)
)
```

### Boolean Values

If your filter expects a boolean value (typically to query a tiny-integer
database column), you can use the `asBoolean` method:

```php
Where::make('accepted')->asBoolean()
```

This is useful because the query parameter value for the `accepted` filter
will be a string. Our `asBoolean` method uses
[PHP's `filter_var`](https://www.php.net/manual/en/function.filter-var.php)
function to parse the string to a boolean.

This means a client can use `"1"`, `"true"`, `"on"` and `"yes"` for a `true`
value. All other values will return `false`.

## Available Filters

Laravel JSON:API ships with the following filters:

- [Scope](#scope)
- [Where](#where)
- [WhereIn](#wherein)
- [WhereNotIn](#wherenotin)
- [WherePivot](#wherepivot)
- [WherePivotIn](#wherepivotin)
- [WherePivotNotIn](#wherepivotnotin)

:::tip
If you want to add additional filters, submit a Pull Request to the
[`laravel-json-api/eloquent` repository.](https://github.com/laravel-json-api/eloquent)
We will typically accept filters that map to Eloquent query builder methods,
and are unopinionated about a server's filter implementation.
:::

### Scope

The `Scope` filter can be used to invoke an
[Eloquent local scope](https://laravel.com/docs/8.x/eloquent#local-scopes)
to filter resources.

For example, if our `User` model defined the following local scope:

```php
/**
 * Scope a query to only include popular users.
 *
 * @param \Illuminate\Database\Eloquent\Builder $query
 * @param bool $popular
 * @return \Illuminate\Database\Eloquent\Builder
 */
public function scopePopular($query, bool $popular)
{
    $operator = $popular ? '>=' : '<';

    return $query->where('votes', $operator, 100);
}
```

We can use a `Scope` filter to add this to our `users` schema:

```php
use LaravelJsonApi\Eloquent\Filters\Scope;

Scope::make('popular')->asBoolean()
```

The client could then request popular users with the following request:

```http
GET /api/v1/users?filter[popular]=true HTTP/1.1
Accept: application/vnd.api+json
```

:::warning
The `Scope` filter differs from our default rule of *snake-casing* the
filter key. As the filter relates to methods on your model class, the
filter key is *camel-cased* by default. So a filter key of `display-name`
would be converted to `displayName` to invoke the scope on the query
builder.
:::

### Where

The `Where` filter is used to invoke the query builder `where` method
for a filter value. For example:

```php
use LaravelJsonApi\Eloquent\Filters\Where;

Where::make('slug')
```

This is equivalent to:

```php
$query->where('slug', '=', $value);
```

To customise the operator, use the `using` method:

```php
Where::make('votes')->using('>');
// equivalent to:
$query->where('votes', '>', $value);
```

We also provide a number of short-hand methods to set the operator:

- `eq` (equal): `=`
- `gt` (greater-than): `>`
- `gte` (greater-than or equal): `>=`
- `lt` (less-than): `<`
- `lte` (less-then or equal): `<=`

For example:

```php
Where::make('votes')->gt();
```

### WhereIn

The `WhereIn` filter is used to invoke the query builder `whereIn` method
for a filter value. For example:

```php
use LaravelJsonApi\Eloquent\Filters\Where;

WhereIn::make('id')
```

This is equivalent to:

```php
$query->whereIn('id', $value);
```

This would allow the client to request multiple resources by `id`:

```http
GET /api/v1/posts?filter[id]=123&filter[id]=456 HTTP/1.1
Accept: application/vnd.api+json
```

Notice how the value of the `id` filter is an `array` of strings.
If you want to accept a `string` value, use the `delimiter` method.
For example, if we wanted to accept a comma-separated string of ids:

```php
WhereIn::make('id')->delimiter(',')
```

The client could then make this request:

```http
GET /api/v1/posts?filter[id]=123,456 HTTP/1.1
Accept: application/vnd.api+json
```

### WhereNotIn

The `WhereNotIn` filter works exactly like the [`WhereIn` filter](#wherein),
except it calls the query builder's `whereNotIn` method.

For example, this filter would allow a client to exclude resources by their
`id`:

```php
use LaravelJsonApi\Eloquent\Filters\WhereNotIn;

WhereNotIn::make('exclude', 'id');
```

The client could then exclude resources by `id` as follows:

```http
GET /api/v1/posts?filter[exclude]=123&filter[exclude]=456 HTTP/1.1
Accept: application/vnd.api+json
```

Just like the `WhereIn` filter, the `WhereNotIn` filter will accept
string values if a delimiter is set:

```php
WhereNotIn('exclude', 'id')->delimiter(',')
```

### WherePivot

The `WherePivot` filter can be used on a
[Belongs to Many relationship](./relationships.md#belongs-to-many)
and is the equivalent of calling the query builder's `wherePivot` method.
You would add this to the relationship's filters.

For example:

```php
use LaravelJsonApi\Eloquent\Filters\WherePivot;

WherePivot::make('accepted')->asBoolean()
```

Is equivalent to:

```php
$query->wherePivot('accepted', $value)
```

:::tip
The `WherePivot` filter extends the [`Where` filter](#where), so you
can use any of the operator methods to set the query operator.
:::

### WherePivotIn

The `WherePivotIn` filter can be used on a
[Belongs to Many relationship](./relationships.md#belongs-to-many)
and is the equivalent of calling the query builder's `wherePivotIn` method.
You would add this to the relationship's filters.

For example:

```php
use LaravelJsonApi\Eloquent\Filters\WherePivotIn;

WherePivotIn::make('flags')
```

Is equivalent to:

```php
$query->wherePivotIn('flags', $value)
```

:::tip
The `WherePivotIn` filter extends the [`WhereIn` filter](#wherein),
so you can set a string delimiter if required by using the `delimiter` method.
:::

### WherePivotNotIn

The `WherePivotNotIn` filter can be used on a
[Belongs to Many relationship](./relationships.md#belongs-to-many)
and is the equivalent of calling the query builder's `wherePivotNotIn` method.
You would add this to the relationship's filters.

For example:

```php
use LaravelJsonApi\Eloquent\Filters\WherePivotNotIn;

WherePivotNotIn::make('category')
```

Is equivalent to:

```php
$query->wherePivotNotIn('category', $value)
```

:::tip
The `WherePivotNotIn` filter extends the [`WhereNotIn` filter](#wherenotin),
so you can set a string delimiter if required by using the `delimiter` method.
:::

## Singular Filters

When a client uses a filter for a resource type, the JSON:API document
returned will contain *zero-to-many* resources. This is a resource
collection, and is represented as an `array` in the `data` member of the
JSON:API document.

There may however be scenarios where you want a filter to return a
*zero-to-one* response. In JSON:API, this is represented as either
a resource object or `null` in the `data` member of the document - not
an `array`.

Our implementation supports this by allowing filters to be defined
as *singular* filters. This is particularly useful when filtering database
columns that contain unique values. Use the `singular` method to mark
a filter as a singular filter.

#### Example

To illustrate this, imagine that our `posts` resource has a `slug` attribute.
This is stored in our database `slug` column, which is unique. We could
define a filter for this column as follows:

```php
Where::make('slug')
```

In this scenario, if the client provides a `slug` filter, we know that
there can only be *zero-to-one* matching resources. For example, if the
client provided the value `"hello-world"` for the `slug` filter, either
a post exists with that slug or it does not.

**Without marking the filter as singular,** the client would receive either
one of these responses (depending on whether there was a post matching the
supplied slug):

```json
{
  "data": []
}
```

Or:

```json
{
  "data": [
    {
      "type": "posts",
      "id": "1",
      "attributes": {
        "content": "...",
        "slug": "hello-world",
        "title": "Hello World!"
      }
    }
  ]
}
```

This would mean that on the client-side, the client would need to check
the length of the received `data` array to determine if a post matched
the provided `slug` filter. Instead we can define that the `slug` filter
will return a *zero-to-one* response by **marking it as singular:**

```php
Where::make('slug')->singular()
```

Then the client would receive either of the following responses
(depending on whether the slug matches a post):

```json
{
  "data": null
}
```

Or:

```json
{
  "data": {
    "type": "posts",
    "id": "1",
    "attributes": {
      "content": "...",
      "slug": "hello-world",
      "title": "Hello World!"
    }
  }
}
```

:::tip
The existence of a singular filter will only alter the response to a
*zero-to-one* resource response when the singular filter is provided
by the client. If the client does not use the singular filter, they
will receive the normal resource collection (*zero-to-many*) response.
:::

:::warning
There are a few cases where the presence of a singular filter **will not**
change the response to a *zero-to-one* document.

Firstly, if the request is to a *to-many* relationship endpoint, then the
client will always receive a resource collection or collection of resource
identifiers.

Secondly, if the client provides `page` query parameters, then they will
receive a *zero-to-many* document even if they use a singular filter. This
is because a page by its nature must have a resource collection.
:::

## Writing Filters

As your implementation grows, you will probably find scenarios where you
need to write your own filter. Our filter classes are designed to be
easy to construct.

To generate a filter, use the `jsonapi:filter` Artisan command as follows:

```bash
php artisan jsonapi:filter CustomFilter
```

This will generate the `App\JsonApi\Filters\CustomFilter` class:

```php
namespace App\JsonApi\Filters;

use LaravelJsonApi\Core\Str;
use LaravelJsonApi\Eloquent\Contracts\Filter;
use LaravelJsonApi\Eloquent\Filters\Concerns\DeserializesValue;
use LaravelJsonApi\Eloquent\Filters\Concerns\IsSingular;

class CustomFilter implements Filter
{
    use DeserializesValue;
    use IsSingular;

    /**
     * @var string
     */
    private string $name;

    /**
     * @var string
     */
    private string $column;

    /**
     * Create a new filter.
     *
     * @param string $name
     * @param string|null $column
     * @return static
     */
    public static function make(string $name, string $column = null): self
    {
        return new static($name, $column);
    }

    /**
     * CustomFilter constructor.
     *
     * @param string $name
     * @param string|null $column
     */
    public function __construct(string $name, string $column = null)
    {
        $this->name = $name;
        $this->column = $column ?: Str::underscore($name);
    }

    /**
     * @inheritDoc
     */
    public function key(): string
    {
        return $this->name;
    }

    /**
     * @inheritDoc
     */
    public function apply($query, $value)
    {
        // @TODO
    }
}
```

:::tip
The `DeserializesValue` trait adds the `deserializeUsing` and `asBoolean`
methods to your filter. You can remove this if it is not required.

The `IsSingular` trait adds the `singular` method that allows the
filter to be marked as a singular filter. You should leave this trait,
because it also implements the `isSingular` method which is required by
the `Filter` interface.
:::

All you now need to do is add your query logic to the `apply` method.
This method receives the query builder instance, and the value the client
provided for the filter.

A really simple example would be as follows:

```php
public function apply($query, $value)
{
    return $query->where(
      $query->getModel()->qualifyColumn($this->column),
      $this->deserialize($value)
    );
}
```

:::tip
As filters can be used when querying relationships, it is important to
qualify the column using the model that is subject of the query.

In the example, the `deserialize` method is provided by the
`DeserializesValue` trait.
:::

Once you've written the query logic for your filter, you can use it in
your schemas:

```php
use App\JsonApi\Filters\CustomFilter;

CustomFilter::make('name');
```
