# Attributes

[[toc]]

## Attribute Fields

Fields are used to describe the attributes of an Eloquent resource.
To add an attribute to a schema, we can simply add it to the schema's
`fields` method.

To create an attribute, we use the static `make` method, providing
the JSON:API field name as the first argument. For example, if we had
a `tags` resource that had `createdAt`, `updatedAt` and `name` attributes:

```php
use LaravelJsonApi\Eloquent\Fields\DateTime;
use LaravelJsonApi\Eloquent\Fields\ID;
use LaravelJsonApi\Eloquent\Fields\Str;

/**
 * @inheritDoc
 */
public function fields(): array
{
    return [
        ID::make(),
        DateTime::make('createdAt'),
        Str::make('name'),
        DateTime::make('updatedAt'),
    ];
}
```

## Column Names

By default, the field will expect the column name of the attribute to be
the *snake case* form of the JSON:API field name. So in the example above,
the column names will be `created_at`, `updated_at` and `name`.

To use a different column name than the default, provide the column name
as the second argument to the `make` method:

```php
Str::make('name', 'display_name')
```

## Sortable Attributes

When attaching an attribute to a schema, you may use the `sortable` method
to indicate that the resource can be sorted by the given field:

```php
Str::make('name')->sortable()
```

## Attribute Hydration

On every create or update request, the attribute's corresponding model
attribute will automatically be filled. The value will be the value from
the request JSON.

Given the following request, the `name` field will be filled with
the string `"laravel"`:

```http
POST /api/v1/tags HTTP/1.1
Content-Type: application/vnd.api+json
Accept: application/vnd.api+json

{
  "data": {
    "type": "tags",
    "attributes": {
      "name": "laravel"
    }
  }
}
```

If you want to perform any conversion on the value before it is filled,
you can use the `deserializeUsing` method:

```php
Str::make('name')->deserializeUsing(
    static fn($value) => strtoupper($value)
);
```

When filling the attribute on the model, we use the `fill()` method to
ensure your mass-assignment rules are respected. If you would like
to ignore mass-assignment for a specific attribute, use
the `unguarded` method:

```php
Str::make('name')->unguarded()
```

If you need complete control over how a value is hydrated into the
model attribute, use the `fillUsing` method:

```php
Hash::make('coordinates')->fillUsing(static function ($model, $column, $value) {
  $model->fill([
    "{$column}_longitude" = $value['long'],
    "{$column}_latitude" = $value['lat'],
  ]);
});
```

### Read-Only Fields

There are times when you may want to allow the client to only create
or update certain attributes on the resource. Or you may want a field
to always be read-only.

To ensure an attribute never gets filled, use the `readOnly` method,
which will prevent the field from being filled:

```php
Str::make('name')->readOnly()
```

To make a field read only in certain circumstances, pass a closure to the
`readOnly` method. It will receive the current request as the first
argument:

```php
Str::make('name')->readOnly(
    static fn($request) => !$request->user()->isAdmin()
)
```

If you only want to set the attribute to read only when creating or
updating resources, you may use the `readOnlyOnCreate` or
`readOnlyOnUpdate` methods:

```php
Str::make('name')->readOnlyOnCreate()
Str::make('name')->readOnlyOnUpdate()
```

### Nullable Fields

It is not necessary to mark fields as nullable. This is because we only
fill validated data into the model. If a field does not support a `null`
value, you should ensure that the value is rejected when it is validated.

## Attribute Serialization

Schemas are used to convert models to JSON:API resource objects.
Each attribute field you define will use the value returned by the model
as the value that appears in the serialized JSON.

If you want to perform any conversion on the value before it appears
in the JSON, you can use the `serializeUsing` method:

```php
Str::make('name')->serializeUsing(
  static fn($value) => strtolower($value)
);
```

:::tip
If you need complete control over how a model is serialized to a
JSON:API resource object, you should use a
[`Resource` class.](../resources/) When a model has a resource
class, the schema attributes will **NOT** be used when serializing
the model.
:::

### Hiding Fields

When serializing attributes to JSON, you may want to omit a field from
the JSON. To do this, use the `hidden` method:

```php
Str::make('password')->hidden()
```

To only hide the field in certain circumstances, provide a closure to
the `hidden` method. It will receive the current request as the first
argument:

```php
Str::make('secret')->hidden(
  static fn($request) => !$request->user()->isAdmin()
)
```

Note that if you use JSON:API resources outside of HTTP requests -
for example, queued broadcasting - then your closure should handle
the `$request` parameter being `null`.

:::tip
If you have complex logic for determining what attributes should
appear in the resource's JSON, you should use our
[resource classes](../resources/) which give
you complete control over the serialization. This includes supporting
[conditional attributes.](../resources/attributes.md#conditional-attributes)
:::

## Sparse Fields

By default, all attribute field types are allowed as
[sparse fields](https://jsonapi.org/format/#fetching-sparse-fieldsets).
If you do not want to allow an attribute to be a sparse field, you should
use the `notSparseField` method:

```php
Str::make('name')->notSparseField()
```

## Attribute Types

Laravel JSON:API ships with a variety of attribute types that match the
values that can be received in a decoded JSON document:

- [Array](#array-field)
- [Boolean](#boolean-field)
- [Number](#number-field)
- [String](#string-field)

We also support the following additional attribute types:

- [DateTime](#datetime-field): parses strings containing ISO-8601 date times.
- [Map](#map-field): maps an associative array to multiple database columns.

### Array Fields

The `ArrayList` and `ArrayHash` fields may be used to represent an attribute
that is a PHP array. Typically your database column will be a JSON column in
which you store the array.

You must use `ArrayList` when the value in JSON is a zero-indexed array.
For example, `["a", "b", "c"]` or an empty value of `[]`.

You must use `ArrayHash` when the value is a JSON object - i.e. a PHP
associative array. For example `{"foo": "bar"}` or `null` for an empty
value.

#### Array Lists

Assume your database has a JSON column called `permissions`,
in which you store a list of permission values. You may attach an
`ArrayList` field to your schema like so:

```php
use LaravelJsonApi\Eloquent\Fields\ArrayList;

ArrayList::make('permissions')
```

If you want the array values to always be in a sorted order, use the
`sorted()` method:

```php
ArrayList::make('permissions')->sorted()
```

#### Associative Arrays

Assume your database has a JSON column called `options`, in which
you store an associative array of option values. You may attach an
`ArrayHash` field to your schema like so:

```php
use LaravelJsonApi\Eloquent\Fields\ArrayHash;

ArrayHash::make('options')
```

If you want the array to always be sorted by its keys, use the
`sortKeys()` method:

```php
ArrHash::make('options')->sortKeys()
```

Alternatively, if you want the array to always be sorted by its
values, use the `sorted()` method:

```php
ArrHash::make('options')->sorted()
```

When working with associative arrays, you may find you need to convert
the case of the keys. For example, if your JSON:API resource object
uses camel-case keys, but you prefer to store associative arrays using
the Eloquent convention of snake-case keys. In this scenario we would
use the `camelizeFields()` and `snakeKeys()` methods to indicate the
JSON:API field case and the database key case respectively:

```php
ArrayHash::make('options')
  ->camelizeFields()
  ->snakeKeys()
```

We support the following conversions, with `*Fields` methods indicating
the JSON:API field case, and `*Keys` indicating the model case:

- `camelizeFields()` and `camelizeKeys()`: convert to camel-case.
- `dasherizeFields()` and `dasherizeKeys()`: convert to dash-case.
- `snakeFields()` or `snakeKeys()`: convert to snake-case (underscored).
- `underscoreFields()` and `underscoreKeys()`: convert to underscored (snake).

:::tip
If the above key conversions do not fit your use-case, you can use the
`deserializeUsing` method to fully customise how the input value is
deserialized.
:::

### Boolean Field

The `Boolean` field may be used to represent a field that is a boolean
in the JSON - and typically a "tiny integer" column in your database.
For example, assuming your database has a boolean column named `active`,
you may attach a `Boolean` field to your schema like so:

```php
use LaravelJsonApi\Eloquent\Fields\Boolean;

Boolean::make('active')
```

### DateTime Field

The `DateTime` field may be used to represent an attribute that is a string
in JSON but represents a date time value. You would normally validate
these as ISO-8601 strings. For example, assuming your database has a
timestamp column named `published_at`, you may attach a `DateTime` field
to your schema like so:

```php
use LaravelJsonApi\Eloquent\Fields\DateTime;

DateTime::make('publishedAt');
```

As ISO-8601 strings can denote a time zone, our `DateTime` field allows you
to specify whether the client-specified time zone should be retained, or
whether you need to convert the date time value to a particular time zone
for storage in your database.

By default the date time will be converted to the server-side time zone
configured in your `app.timezone` setting. If you need to store the value
as a different time zone, use the `useTimezone` method:

```php
DateTime::make('publishedAt')->useTimezone('Europe/London');
```

If you want to retain the time zone as provided by the client, use the
`retainTimezone` method:

```php
DateTime::make('publishedAt')->retainTimezone();
```

### Map Field

The `Map` field may be used to map the values of an associative array
to different columns in your database.

For example, assuming you have a resource that has an `options` attribute
that can contain the keys `foo` and `bar`. If the database stores these
into the columns `option_foo` and `option_bar`, we can use a `Map` attribute
as follows:

```php
use LaravelJsonApi\Eloquent\Fields\Map;
use LaravelJsonApi\Eloquent\Fields\Number;
use LaravelJsonApi\Eloquent\Fields\Str;

Map::make('options', [
  Str::make('foo', 'option_foo'),
  Number::make('bar', 'option_bar'),
])
```

As you can see from the example, the `Map` attribute takes an array of
attributes, constructed using the `make` methods of the relevant classes.
Each of these sub-attributes defines the name of the expected key in the
associative array, and the column the value should be mapped to. In our
example, the `options.foo` value will be mapped to the `option_foo` column
in our database.

When mapping values, if any keys are missing the column will retain its
existing values. For example, if the `options` array only had a `foo` key,
then the `option_foo` column will be updated but the `option_bar` column
will retain its existing value.

:::warning
The `Map` attribute does not support the `deserializeUsing` or `fillUsing`
methods, because it delegates filling values to its sub-attributes.
:::

#### Null Values

By default, if the value being mapped is `null` instead of an array, all
columns will be set to `null`. So in our example, if `options` is `null`,
then both the `option_foo` and `option_bar` columns will be set to `null`.

If you do not want this default `null` behaviour, you have two options.
Firstly, because models are only filled with validated values, you
can use validation rules to reject `options` if it is `null`. Otherwise,
you can using the `ignoreNull` method on the `Map` attribute:

```php
Map::make('options', [
  Str::make('foo', 'option_foo'),
  Number::make('bar', 'option_bar'),
])->ignoreNull()
```

### Number Field

The `Number` field may be used to represent an attribute that is an integer
or float in JSON. For example, assuming your database has an integer
column named `failure_count`, you may attach a `Number` field to your
schema like so:

```php
use LaravelJsonApi\Eloquent\Fields\Number;

Number::make('failures', 'failure_count')
```

### String Field

The `Str` (string) field may be used to represent an attribute that is
a string in JSON. For example, assuming your database has a string
column named `display_name`, you may attach a `Str` field to your schema
like so:

```php
use LaravelJsonApi\Eloquent\Fields\Str;

Str::make('displayName');
```
