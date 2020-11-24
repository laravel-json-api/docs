# Meta

[[toc]]

## Introduction

A resource object may have a [meta object](https://jsonapi.org/format/#document-meta)
containing non-standard meta-information about a resource that cannot be
represented as an attribute or relationship.

## Defining Meta

To define a resource object's meta, use the `meta` method, and return
an array of meta information.

In the following example, we will serialize the model's `created_at` and
`updated_at` values as meta, rather than as attributes:

```php
namespace App\JsonApi\V1\Posts;

use LaravelJsonApi\Core\Resources\JsonApiResource;

class PostResource extends JsonApiResource
{

    /**
     * Get the resource's attributes.
     *
     * @return iterable
     */
    public function attributes(): iterable
    {
        return [
            'content' => $this->content,
            'slug' => $this->slug,
            'synopsis' => $this->synopsis,
            'title' => $this->title,
        ];
    }

    /**
     * Get the resource's meta.
     *
     * @return array
     */
    public function meta(): array
    {
        return [
            'createdAt' => $this->created_at,
            'updatedAt' => $this->updated_at,
        ];
    }

}
```

This would result in the following resource object:

```json
{
  "type": "posts",
  "id": "123",
  "attributes": {
    "content": "...",
    "slug": "hello-world",
    "synopsis": "My first article.",
    "title": "Hello World!"
  },
  "meta": {
    "createdAt": "2020-07-10T12:42:17.000000Z",
    "updatedAt": "2020-07-10T13:53:01.000000Z"
  }
}
```
