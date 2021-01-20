# Identifier

[[toc]]

## The ID Field

The `LaravelJsonApi\Eloquent\Fields\ID` field describes the ID member of
an Eloquent resource. It must be defined in a schema's `fields` method -
omitting it will cause an exception to be thrown.

The ID is added using the static `make` method, for example:

```php
use LaravelJsonApi\Eloquent\Fields\ID;

/**
 * @inheritDoc
 */
public function fields(): array
{
    return [
        ID::make(),
        // ...other fields
    ];
}
```

## Column Name

If no arguments are provided to the `make` method, the schema will assume
that the column name for the `id` value will be the same as the model's
route key - i.e. the column name returned by the `Model::getRouteKeyName()`
method.

If you need to use a different column to the route key name, provide this
as the first argument to the `make` method. For example:

```php
ID::make('uuid')
```

## Sorting

When attaching the `ID` field to a schema, we assume that you want to allow
an API client to sort your resource by the `id`. If this is not the case,
use the `notSortable` method to remove sorting:

```php
ID::make()->notSortable()
```

## Pattern

The `ID` field also defines the regex pattern for the resource's `id` value.
This pattern is used both when registering routes for the resource, and
when parsing values provided by the client.

By default, the `ID` field pattern is `[0-9]+`. Therefore you do not need
to do anything if your Eloquent model has numeric ids.

If your model uses UUIDs, call the `uuid()` method when registering the `ID`
field:

```php
ID::make()->uuid()
```

To use a custom pattern, call the `matchAs` method:

```php
ID::make()->matchAs('[A-Z_]+')
```

By default `id` pattern matching is **case insensitive**. To use case-sensitive
matching, call the `matchCase` method:

```php
ID::make()->matchAs('[a-z]+')->matchCase()
```

## Client-Generated IDs

The JSON:API specification allows servers to accept
[client-generated IDs](https://jsonapi.org/format/#crud-creating-client-ids)
along with a request to create a resource.

To enable client-generated IDs for a resource type, use the `clientIds`
method on the `ID` field. For example:

```php
ID::make()->clientIds()
```

:::warning
If you enable client-generated IDs for a resource, make sure you always
add [validation rules](../requests/resources.md#client-generated-ids)
for the `id` field to your resource request class.
:::
