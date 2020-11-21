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

When attached the `ID` field to a schema, you may use the `sortable` method
to indicate that the resource can be sorted by its `id`:

```php
ID::make()->sortable()
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
