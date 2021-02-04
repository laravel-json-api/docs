# Custom Actions

[[toc]]

## Introduction

As well as registering routes defined by the JSON:API specification, our
implementation also allows you to register custom resource actions. This
allows you to implement capabilities that are not defined by the specification.

In this chapter, we will demonstrate how to do this using two actions:

- A *purge* action, that allows an adminstrator to delete all `posts` resources.
- A *publish* action, that allows the author of a specific `posts` resource
  to publish it.

## Routing

To register custom actions, use the `actions()` method when registering
resource routes. For example, we can add our *purge* and *publish* actions
to our `posts` resource as follows:

```php
$server->resource('posts')->actions('-actions', function ($actions) {
    $actions->delete('purge');
    $actions->withId()->post('publish');
});
```

This would register the following routes:

| Verb | URI | Action | Route Name |
| --- | --- | --- | --- |
| DELETE | `/posts/-actions/purge` | purge | posts.purge |
| POST | `/posts/{post}/-actions/publish` | publish | posts.publish |

:::tip
Notice that we used the `withId()` method to indicate that the `publish`
action relates to a specific resource.
:::

The `$actions` helper supports all the typical HTTP verbs:

- `get`
- `post`
- `patch`
- `put`
- `delete`
- `options`

As the above example shows, the `actions()` method was provided with a URL
prefix and a callback. The prefix is optional, for example:

```php
$server->resource('posts')->actions(function ($actions) {
    $actions->delete('purge');
    $actions->withId()->post('publish');
});
```

Would register the following routes:

| Verb | URI | Action | Route Name |
| --- | --- | --- | --- |
| DELETE | `/posts/purge` | purge | posts.purge |
| POST | `/posts/{post}/publish` | publish | posts.publish |

:::warning
When adding custom actions, we recommend thinking carefully about the naming
of the URLs for the actions. As additions may be made to the JSON:API
specification in the future, it is important to choose a URL that will
avoid any potential future conflicts with the specification.

For this reason, we recommend using a prefix. We also recommend choosing one
like `/-actions` instead of `/actions`. This will help prevent any future
conflicts with additions to the specification.
:::

### Controller Action

By default we camel-case the action URI to get the controller method name.
For example:

```php
$actions->post('bulk-import');
```

Will expect the controller method name to be `bulkImport`. If you need to
use a different controller method name, pass it as the second argument:

```php
$actions->post('bulk-import', 'import');
```

### Route Name

By default we use the controller method name as the route name. So as shown
in the examples above, the route names were `posts.purge` and `posts.publish`.

All the action methods return the Laravel route object, so if you want to use
a different route name, use the `name()` method:

```php
// route name will be posts.deleteAll
$actions->delete('purge')->name('deleteAll');
```

## Resources Example

In this example, we want to add a route that will allow an administrator to
delete all `posts` resources.

Firstly we will register the action in our routing:

```php
JsonApiRoute::server('v1')
    ->prefix('v1')
    ->namespace('Api\V1')
    ->resources(function ($server) {
        $server->resource('posts')->relationships(function ($relationships) {
            $relationships->hasOne('author')->readOnly();
            $relationships->hasMany('tags');
        })->actions('-actions', function ($actions) {
            $actions->delete('purge');
        });

        // ...other resources
    });
```

Next we need to write our controller action. This is expected to be on the
resource's `PostController`:

```php
namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use LaravelJsonApi\Laravel\Http\Controllers\Actions;

class PostController extends Controller
{

    // ...

    /**
     * @return \Illuminate\Http\Response
     * @throws \Illuminate\Auth\Access\AuthorizationException
     */
    public function purge(): \Illuminate\Http\Response
    {
        $this->authorize('deleteAll', Post::class);

        Post::query()->delete();

        return response('', 204);
    }

}
```

As we are authorizing the request using the `deleteAll` ability, we will also
need to add that to our `PostPolicy`:

```php
namespace App\Policies;

use App\Models\User;

class PostPolicy
{

    // ... other methods

    /**
     * @param User|null $user
     * @return bool
     */
    public function deleteAll(?User $user): bool
    {
        return $user && $user->isAdmin();
    }

}
```

Once this is done, the following HTTP request by an administrator will delete
all the `posts` resources (bearing in mind that how you authenticate the
request will depend on your authentication implementation):

```http
DELETE /api/v1/posts/-actions/purge HTTP/1.1
Accept: application/vnd.api+json
Authorization: Bearer <API_TOKEN>
```

Which will receive the following response if successful:

```http
HTTP/1.1 204 No Content
```

## Resource Example

In this example, we want to add a route that must be hit for an author to
publish a specific `posts` resource.

Firstly we will register the action in our routing, using the `withId()` method
to indicate that the URL relates to a specific resource:

```php
JsonApiRoute::server('v1')
    ->prefix('v1')
    ->namespace('Api\V1')
    ->resources(function ($server) {
        $server->resource('posts')->relationships(function ($relationships) {
            $relationships->hasOne('author')->readOnly();
            $relationships->hasMany('tags');
        })->actions('-actions', function ($actions) {
            $actions->withId()->post('purge');
        });

        // ...other resources
    });
```

Next we need to write our controller action. This is expected to be on the
resource's `PostController`:

```php
namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Events\PostPublished;
use App\JsonApi\V1\Posts\PostQuery;
use App\JsonApi\V1\Posts\PostSchema;
use App\Models\Post;
use LaravelJsonApi\Laravel\Http\Controllers\Actions;

class PostController extends Controller
{

    // ...

    /**
     * Publish a post.
     *
     * @param PostSchema $schema
     * @param PostQuery $query
     * @param Post $post
     * @return Responsable
     */
    public function publish(
        PostSchema $schema,
        PostQuery $query,
        Post $post
    ): Responsable
    {
        $this->authorize('update', $post);

        abort_if($post->published_at, 403, 'Post is already published.');

        $post->update(['published_at' => now()]);

        PostPublished::dispatch($post);

        $model = $schema
            ->repository()
            ->queryOne($post)
            ->using($query)
            ->first();

        return new DataResponse($model);
    }
}
```

As we want to support JSON:API query parameters on this action, we inject
both the `PostSchema` and the `PostQuery` classes. The schema allows us
to ensure the model is configured correctly if the client has used any
JSON:API query parameters, while the `PostQuery` validates any parameters
provided by the client.

As we are authorizing the request using the `update` ability, we will also need
to add that to our `PostPolicy`:

```php
namespace App\Policies;

use App\Models\Post;
use App\Models\User;

class PostPolicy
{

    // ... other methods

    /**
     * @param User|null $user
     * @return bool
     */
    public function update(?User $user, Post $post): bool
    {
        return $user && $user->is($post->author);
    }

}
```

Once this is done, the following HTTP request by the post's author will
publish the post (bearing in mind that how you authenticate the
request will depend on your authentication implementation):

```http
POST /api/v1/posts/1/-actions/publish?include=tags HTTP/1.1
Accept: application/vnd.api+json
Authorization: Bearer <API_TOKEN>
```

Which will receive the following response if successful:

```http
HTTP/1.1 200 OK
Content-Type: application/vnd.api+json

{
  "data": {
    "type": "posts",
    "id": "1",
    "attributes": {
      "content": "...",
      "publishedAt": "2021-01-04T15:37:00.000000Z",
      "title": "Hello World!"
    },
    "relationships": {
      "author": {
        "links": {
          "related": "http://localhost/api/v1/posts/123/author",
          "self": "http://localhost/api/v1/posts/123/relationships/author"
        }
      },
      "tags": {
        "data": [
          {
            "type": "tags",
            "id": "4"
          }
        ],
        "links": {
          "related": "http://localhost/api/v1/posts/123/tags",
          "self": "http://localhost/api/v1/posts/123/relationships/tags"
        }
      }
    },
    "links": {
      "self": "http://localhost/api/v1/posts/123"
    }
  },
  "included": [
    {
      "type": "tags",
      "id": "4",
      "attributes": {
        "displayName": "Laravel"
      }
    }
  ]
}
```
