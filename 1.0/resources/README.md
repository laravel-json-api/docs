# The Basics

[[toc]]

## Introduction

In the JSON:API specification, [resource objects](https://jsonapi.org/format/#document-resource-objects)
represent resources in JSON. When building a JSON:API compliant API, you
need a transformation layer that sits between your Eloquent models and the
JSON:API resource objects returned to your API clients.

Laravel JSON:API's resource classes allow you to expressively and easily
transform your models into JSON:API resource objects. They are designed to
be the JSON:API equivalent of Laravel's
[Eloquent API Resources](https://laravel.com/docs/eloquent-resources).

## Generating Resources

By default, resource classes exist in the same namespace as the schema that
defines the same resource type. For example, if our `v1` server has a
`posts` resource, the `PostResource` class will be placed in the same
namespace as the `PostSchema` - which is `App\JsonApi\V1\Posts`.

To generate a resource class, you may use the `jsonapi:resource` Artisan
command:

```bash
php artisan jsonapi:resource posts --server=v1
```

::: tip
The `--server` option is not required if you only have one server.
:::

### Resource Collections

Laravel's Eloquent API Resources include the ability to generate resource
collection classes, that transform collections of models. In JSON:API this
is not required, because the JSON:API specification defines how to serialize
collections of resources.

The JSON:API specification does allow top-level document `meta` and `links`.
If you need to add these to a collection of resources, you can do this using
our response classes - rather than having to define a specific collection
class.

## Concept Overview

Before diving into all of the options available when writing resource classes,
let's first take a high-level look at how resources are used.

Firstly, the JSON:API specification says that every resource object must have
`type` and `id` members. Together, these uniquely identify the specific
resource. Our resource classes automatically determine the resource `type`
from the class name, and automatically use the model's `getRouteKey()`
method to obtain the `id`. A generated class therefore does not contain
the `type` and `id` members.

Instead, it will contain two methods: `attributes` and `relationships`.
This allows you to serialize column values in the `attributes` member, and
define how relationships should be represented.

For example, a simple `posts` resource class would look like this:

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
            'createdAt' => $this->created_at,
            'slug' => $this->slug,
            'synopsis' => $this->synopsis,
            'title' => $this->title,
            'updatedAt' => $this->updated_at,
        ];
    }

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
            $this->relation('tags'),
        ];
    }

}
```

Notice that we can access model properties from the `$this` variable. This
is because a resource class will automatically proxy property and method
access down to the underlying model for convenient access.

## Type

To work out the resource `type`, we pluralize and dasherize the name of
the class that appears before `Resource`. For example, `PostResource` will
become `posts` and `BlogPostResource` will be `blog-posts`.

To use a different value, add the `$type` property to your resource class:

```php
use LaravelJsonApi\Core\Resources\JsonApiResource;

class PostResource extends JsonApiResource
{

    /**
     * The resource type.
     *
     * @var string
     */
    protected string $type = 'articles';

    // ...

}
```

## ID

To work out the resource `id`, we use the model's `getRouteKey()` method.
To use a different value, or if your resource is not a model, implement
the `id()` method:

```php
use LaravelJsonApi\Core\Resources\JsonApiResource;

class PostResource extends JsonApiResource
{

    /**
     * Get the resource's id.
     *
     * @return string
     */
    public function id(): string
    {
        return $this->uuid;
    }

    // ...

}
```

> If you're using a different column than the route key for your resource
> `id`, don't forget to also update the `ID` object on your resource schema.
