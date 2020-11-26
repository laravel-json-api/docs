# Resource Requests

[[toc]]

## Introduction

Our resource request classes allow you to validate the JSON:API document
sent by the client against your application-specific validation rules.
For any resource type that you allow to be created, updated and/or
deleted (including updating relationships), you will need to create
a resource request class.

Do this using the `jsonapi:request` Artisan command:

To generate a resource request, use the `jsonapi:request` Artisan
command:

```bash
php artisan jsonapi:request posts --server=v1
```

This will generate the following request class:
`App\JsonApi\V1\Posts\PostRequest`

:::tip
The `--server` option is not required if you only have one server.
:::

Resource objects are validated using
[Laravel form request validators](https://laravel.com/docs/validation#form-request-validation).
If any field fails the validation rules, a `422 Unprocessable Entity` response
will be sent. JSON:API errors will be included, containing the Laravel
validation messages in the `detail` member of the error object. Each error
will also have a JSON source point set identifying the location in the request
content of the validation failure.

## Validation Data

### Creating Resources

Validators are provided with the
[resource fields](http://jsonapi.org/format/#document-resource-object-fields)
that were submitted by the client. Collectively these are the
`type`, `id`, `attributes` and `relationships` of the resource.
To make it easier to write validation rules, we set the value of relationship
fields to the `data` member of the relationship.

This is best illustrated with an example. Given this request:

```http
POST /api/v1/posts HTTP/1.1
Content-Type: application/vnd.api+json
Accept: application/vnd.api+json

{
  "data": {
    "type": "posts",
    "attributes": {
      "content": "...",
      "slug": "hello-world",
      "title": "Hello World"
    },
    "relationships": {
      "author": {
        "data": {
          "type": "users",
          "id": "123"
        }
      },
      "tags": {
        "data": [
          {
            "type": "tags",
            "id": "1"
          },
          {
            "type": "tags",
            "id": "3"
          }
        ]
      }
    }
  }
}
```

Your validator will be provided with the following array of data:

```php
[
    "author" => [
      "type" => "users",
      "id" => "123",
    ],
    "content" => "...",
    "id" => null,
    "slug" => "hello-world",
    "tags" => [
        ["type" => "tags", "id" => "1"],
        ["type" => "tags", "id" => "3"],
    ],
    "title" => "Hello World",
    "type" => "posts",
];
```

### Updating Resources

When updating resources, the JSON:API specification says:

> If a request does not include all of the attributes for a resource,
the server MUST interpret the missing attributes as if they were included
with their current values. The server MUST NOT interpret missing attributes
as null values.

As Laravel provides validation rules that allow you to compare values that
are being validated (e.g. a date that must be `before` another value),
we take the existing field values of your resource and merge the values
provided by the client over the top.

For example, given this request:


```http
PATCH /api/v1/posts/1 HTTP/1.1
Content-Type: application/vnd.api+json
Accept: application/vnd.api+json

{
  "data": {
    "type": "posts",
    "id": "1",
    "attributes": {
      "title": "Hello World"
    },
    "relationships": {
      "tags": {
        "data": [
          {
            "type": "tags",
            "id": "1"
          }
        ]
      }
    }
  }
}
```

If your `posts` resource had a `content` and `slug` attributes that were not
provided by the client, your validator will be provided with the following
array of data:

```php
[
    "content" => "...",
    "id" => "1",
    "slug" => "hello-world",
    "tags" => [
        ["type" => "tags", "id" => "1"],
    ],
    "title" => "Hello World",
    "type" => "posts",
];
```

:::tip
We use the `attributes` method on the `PostResource` class to acquire the
current values of the resource's attributes.
:::

If you need the current values of relationships, you must mark the relation
as required for validation when defining it in your resource class.
For example, we may want our `PostResource` to merge the current value of
the `tags` relationship if it is not provided by the client. On our
`PostResource` class we would call the `mustValidate` method on our `tags`
relation:

```php
class PostResource extends JsonApiResource
{
    // ...

    /**
     * Get the resource's relationships.
     *
     * @return iterable
     */
    public function relationships(): iterable
    {
        return [
            $this->relation('author'),
            $this->relation('comments'),
            $this->relation('tags')->mustValidate(),
        ];
    }
}
```

:::tip
The reason why relationships have to be explicitly marked as required for
validation is because it would be extremely inefficient for us to read
the value of every relation. For example, our `PostResource` could have
hundreds of `comments`, which are not required for validation.
:::

#### Customising Existing Values

If you want to adjust the extraction of current attributes, overload
the `existingAttributes` method. For example, if you are using the `not_present`
rule for an attribute, you would not want the existing value to be merged in.
In this case you could forget the existing value as follows:

```php
class PostRequest extends ResourceRequest
{
    // ...

    /**
     * @param \App\Post $record
     * @return iterable
     */
    protected function existingAttributes(object $record): iterable
    {
        return collect(parent::existingAttributes($record))->forget('foobar');
    }
}
```

For relationships, overload the `existingRelationships` method. In the
following example we manually add the author to the existing relationships:

```php
class PostRequest extends ResourceRequest
{
    // ...

    /**
     * @param \App\Post $record
     * @return iterable
     */
    protected function existingRelationships(object $record): iterable
    {
        return collect(parent::existingAttributes($record))
          ->put('author', $record->author);
    }
}
```

## Validation Rules

To validate this data, you define the validation rules in the `rules`
method of your `PostRequest` class. For example:

```php
namespace App\JsonApi\V1\Posts;

use App\Models\Post;
use Illuminate\Validation\Rule;
use LaravelJsonApi\Laravel\Http\Requests\ResourceRequest;
use LaravelJsonApi\Validation\Rule as JsonApiRule;

class PostRequest extends ResourceRequest
{

    /**
     * @return array
     */
    public function rules(): array
    {
        $unique = Rule::unique('posts');

        if ($post = $this->model()) {
            $unique->ignore($post);
        }

        return [
            'author' => JsonApiRule::toOne(),
            'content' => ['required', 'string'],
            'slug' => ['required', 'string', $unique],
            'tags' => JsonApiRule::toMany(),
            'title' => ['required', 'string'],
        ];
    }
}
```

:::tip
You may type-hint any dependencies you need within the rules method's
signature. They will automatically be resolved via the Laravel service
container.

Notice that if we need to access the model that is subject of the request,
we use the `$this->model()` method.
:::

You'll notice that the `exists` rule is not used in the validation for
the `author` or `tags` relationships. This is because the package complies
with the JSON:API spec and validates all resource identifiers in relationships
to check that they exist. If any do not exist, the request will be rejected
when the document is [parsed for compliance](./compliance#document-compliance)
with the JSON:API specification.

Instead for relationships all we need to do is provide the
`JsonApiRule::toOne()` and `JsonApiRule::toMany()` rules. These use the
schema for the request resource type to ensure that the relationships contain
the correct *type* of resource.
