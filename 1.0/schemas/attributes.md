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

## Read Only Fields

There are times when you may want to allow the client to only create
or update certain attributes on the resource. You can do this by using
the `readOnly` method on the attribute, which will prevent the field
from being filled in certain circumstances.

Pass a closure to the `readOnly()` method. It will receive the current
request as the first argument:

```php
Str::make('name')->readOnly(
    static fn($request) => !$request->user()->isAdmin()
);
```

If you only want to set the attribute to read only when creating or
updating resources, you may use the `readOnlyOnCreate` or
`readOnlyOnUpdate` methods:

```php
Str::make('name')->readOnlyOnUpdate();
```

## Nullable Fields

It is not necessary to mark fields as nullable. This is because we only
fill validated data into the model. If a field does not support a `null`
value, you should ensure that the value is rejected when it is validated.

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
values that can be received in a JSON document:

- [Array](#array-field)
- [Boolean](#boolean-field)
- [Hash](#hash-field)
- [Number](#number-field)
- [String](#string-field)

We also support the following additional attribute types:

- [DateTime](#datetime-field)


### Array Field

The `Arr` (array) field may be used to represent an attribute that is an
array list in JSON. Typically your database column will be a JSON column
in which you store the array.

For example, assuming your database has a JSON column called `permissions`,
you may attach an `Arr` field to your schema like so:

```php
use LaravelJsonApi\Eloquent\Fields\Arr;

Arr::make('permissions');
```

:::tip
In JSON, there is a distinction between an array list and an object.
Laravel decodes both to PHP arrays, however you should only use the `Arr`
attribute for an array list. Use the [`Hash`](#hash-field) attribute if
the expected JSON type is an object hash (PHP associative array).
:::

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

### Boolean Field

The `Boolean` field may be used to represent a field that is a boolean
in the JSON - and typically a "tiny integer" column in your database.
For example, assuming your database has a boolean column named `active`,
you may attach a `Boolean` field to your schema like so:

```php
use LaravelJsonApi\Eloquent\Fields\Boolean;

Boolean::make('active')
```

### Hash Field

The `Hash` field may be used to represent an attribute that is a JSON
object. Laravel decodes such objects to PHP associative arrays.

Typically your JSON hash will either be a JSON database column, or
it may map to multiple columns in your database. Our `Hash` field
supports both approaches.

Firstly, let's assume that your database has a JSON column named
`options`. You may attach a `Hash` field to your schema like so:

```php
use LaravelJsonApi\Eloquent\Fields\Hash;

Hash::make('options');
```

When storing a JSON object into your database, you may need to
convert the case of the keys in the object. For example, if your
JSON:API resource object uses camel-case keys, but you prefer
to store objects using snake-case keys to follow the Eloquent
convention. You may use the `snake` method to convert
the keys:

```php
Hash::make('options')->snake()
```

We support the following key conversions:

- `camelize()`: convert to camel-case keys.
- `dasherize()`: convert to dash-case keys.
- `snake()` or `underscore()`: convert to snake-case (underscored) keys.

The second use-case for the `Hash` field is when the JSON object
represents values that must be mapped to different columns in your
database. In this case you will need to provide a map as the second
argument to the `make` method:

```php
use LaravelJsonApi\Eloquent\Fields\Hash;
use LaravelJsonApi\Eloquent\Fields\Str;

Hash::make('options', [
  Str::make('foo', 'option_foo'),
  Str::make('bar', 'option_bar'),
]);
```

:::tip
Note that the map uses attribute field types, and the column names
are provided in the `make` method of each field type if needed. Key
conversion methods described above - e.g. `snake()` - should **not** be
used in this scenario.
:::

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
