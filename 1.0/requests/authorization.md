# Authorization

[[toc]]

## Introduction

Typically requests to your API will need to be authorized. Thankfully,
Laravel JSON:API takes a simple approach to authorization that leverages
many of the Laravel features you are already familiar with.

And if our authorization pattern doesn't work for your use-case, we've
made it exceptionally simple to disable our authorization and implement
your own.

## Policies

To limit which users may view, create, update or delete resources,
Laravel JSON:API leverages Laravel's
[authorization policies](https://laravel.com/docs/authorization#creating-policies).
Policies are simple PHP classes that organize authorization logic for a
particular model or resource. For example, if your application is a blog,
you may have a `Post` model and a corresponding `PostPolicy` within your
application.

When processing API requests, Laravel JSON:API will automatically check
the policy's relevant authorization methods before performing the requested
action. The authorization is triggered by our resource request and query
request classes.

### Resource Authorization

The following table shows the policy authorization method for each resource
request defined by the JSON:API specification:

| Verb | URI | Authorization Method |
| --- | --- | --- |
| GET | `/posts` |  viewAny |
| POST | `/posts` | create |
| GET | `/posts/{post}` | view |
| PATCH | `/posts/{post}` | update |
| DELETE | `/posts/{post}` | delete |

The `viewAny` and `create` policy methods
[will not receive a model](https://laravel.com/docs/authorization#methods-without-models).
The `view`, `update` and `delete` authorization methods will receive the model
that is subject of the request, for example:

```php
namespace App\Policies;

use App\Models\User;
use App\Models\Post;

class PostPolicy
{

    /**
     * Authorize a user to update a post.
     *
     * @param User $user
     * @param Post $post
     * @return bool
     */
    public function update(User $user, Post $post): bool
    {
        return $user->is($post->author);
    }
}
```

:::warning
If a policy exists but is missing a method for a particular action, the user
will not be allowed to perform that action. So, if you have defined a policy,
don't forget to define all of its relevant authorization methods.
:::

### Relationship Authorization

#### To-One

The following table shows the request class and the policy authorization
method for each *to-one* relationship request defined by the JSON:API
specification.

In this example, we have an `author` relationship on a `posts` resource.
The authorization method is invoked on the `PostPolicy`:

| Verb | URI | Authorization Method |
| --- | --- | --- |
| GET | `/posts/{post}/author` | viewAuthor |
| GET | `/posts/{post}/relationships/author` | viewAuthor |
| POST | `/posts/{post}/relationships/author` | updateAuthor |

The `viewAuthor` authorization method receives the `Post` model that is
subject of the request. For example:

```php
namespace App\Policies;

use App\Models\User;
use App\Models\Post;

class PostPolicy
{

    /**
     * Authorize a user to view a post's author.
     *
     * @param User $user
     * @param Post $post
     * @return bool
     */
    public function viewAuthor(User $user, Post $post): bool
    {
        return true;
    }
}
```

The `updateAuthor` authorization method receives both the `Post` model,
and a relation object that allows you to safely check the value the
relationship is being changed to. For example:

```php
namespace App\Policies;

use App\Models\User;
use App\Models\Post;
use LaravelJsonApi\Core\Store\LazyRelation;

class PostPolicy
{

    /**
     * Authorize a user to change a post's author.
     *
     * @param User $user
     * @param Post $post
     * @param LazyRelation $relation
     * @return bool
     */
    public function updateAuthor(
      User $user,
      Post $post,
      LazyRelation $relation
    ): bool
    {
        /** @var User|null $author */
        $author = $relation->get();

        return $user->is($post->author) && !!$author;
    }
}
```

:::tip
Because authorization occurs **before** validation, the `LazyRelation` class
is designed to safely resolve the value that the relation is being changed to,
ignoring the value if it is invalid.

It is also designed so that the cost of resolving the relation value is only
incurred if you actually need to check the value - in this case by calling
the `get` method.
:::

#### To-Many

The following table shows the request class and the policy authorization
method for each *to-many* relationship request defined by the JSON:API
specification.

In this example, we have a `tags` relationship on a `posts` resource.
The authorization method is invoked on the `PostPolicy`:

| Verb | URI | Authorization Method |
| --- | --- | --- |
| GET | `/posts/{post}/tags` | viewTags |
| GET | `/posts/{post}/relationships/tags` | viewTags |
| POST | `/posts/{post}/relationships/tags` | updateTags |
| PATCH | `/posts/{post}/relationships/tags` | attachTags |
| DELETE | `/posts/{post}/relationships/tags` | detachTags |

The `viewTags` authorization method receives the `Post` model that is
subject of the request. For example:

```php
namespace App\Policies;

use App\Models\User;
use App\Models\Post;

class PostPolicy
{

    /**
     * Authorize a user to view a post's tags.
     *
     * @param User $user
     * @param Post $post
     * @return bool
     */
    public function viewTags(User $user, Post $post): bool
    {
        return true;
    }
}
```

The `updateTags`, `attachTags` and `detachTags` authorization methods
receive both the `Post` model, and a relation object that allows you to safely
check the value provided by the client. For example:

```php
namespace App\Policies;

use App\Models\User;
use App\Models\Post;
use LaravelJsonApi\Core\Store\LazyRelation;

class PostPolicy
{

    /**
     * Authorize a user to change a post's tags.
     *
     * @param User $user
     * @param Post $post
     * @param LazyRelation $relation
     * @return bool
     */
    public function updateTags(
      User $user,
      Post $post,
      LazyRelation $relation
    ): bool
    {
        $check = $relation
            ->collect()
            ->every(fn ($tag) => $tag->bloggable);

        return $user->is($post->author) && $check;
    }
}
```

:::tip
Because authorization occurs **before** validation, the `LazyRelation` class
is designed to safely resolve the value provided by the client,
skipping any invalid values.

It is also designed so that the cost of resolving the relation value is only
incurred if you actually need to check the value - in this case by calling
the `collect` method or iterating over the object.
:::

### Guests

If your API can be accessed without users authenticating, then remember
that you can use Laravel's
[Guest Users](https://laravel.com/docs/authorization#guest-users)
feature. This allows you to type-hint the `User` as nullable in your
policy authentication methods.

### Form Request Authorization

Our default authorization strategy is triggered by our form request classes -
i.e. the `PostRequest`, `PostQuery` and `PostCollectionQuery` classes.

On any of these classes, if you implement the
[form request's `authorize` method](https://laravel.com/docs/validation#authorizing-form-requests)
you will prevent our authorization from running.

However, we provide an ability to implement your own authorization plus
run our default authorization if needed. If you return a `boolean` from
the `authorize` method, our default authorization **will not** run.
If you return `null` we will run our default authorization.

For example:

```php
namespace App\JsonApi\V1\Posts\PostRequest;

use LaravelJsonApi\Laravel\Http\Requests\ResourceRequest;

class PostRequest extends ResourceRequest
{

    // ...

    /**
     * Determine if the user is authorized to make this request.
     *
     * @return bool|null
     */
    public function authorize(): ?bool
    {
        if ($this->isMethod('DELETE')) {
          // default authorization will NOT run as we're returning a boolean.
          return false;
        }

        // default authorization will run...
        return null;
    }
}
```

### Disabling Authorization

We provide that ability to disabled our default authorization strategy
at either a resource or server level.

If you do not want a JSON:API resource to be authorized, then you can
override the `authorizable` method on the JSON:API schema:

```php
namespace App\JsonApi\V1\Posts;

use LaravelJsonApi\Eloquent\Schema;

class PostSchema extends Schema
{

    // ...

    /**
     * Determine if the resource is authorizable.
     *
     * @return bool
     */
    public function authorizable(): bool
    {
        return false;
    }
}
```

If you do not want our authorization logic to run for an entire server,
then you can override the `authorizable` method on the server:

```php
namespace App\JsonApi\V1;

use LaravelJsonApi\Core\Server\Server as BaseServer;

class Server extends BaseServer
{
    // ...

    /**
     * Determine if the server is authorizable.
     *
     * @return bool
     */
    public function authorizable(): bool
    {
        return false;
    }
}
```

:::tip
An example of when you might want to disable authorization for an entire server
would be as follows.

If your API can only be accessed by a user, and a user only has access to their
own models in the API. You could disable our authorization on the server class,
and instead use Laravel's
[`auth` middleware](https://laravel.com/docs/8.x/authentication#protecting-routes)
to protect the entire API.
:::
