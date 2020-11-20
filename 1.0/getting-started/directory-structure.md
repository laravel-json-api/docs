# Directory Structure

[[toc]]

## Convention

Laravel JSON API follows the principle of **"Convention is better than configuration"**.
The recommended structure is as follows, demonstrated using a server
named `v1` with `posts` and `users` resources:

```
├── app
|   ├── Http
|   |   ├── Controllers
|   |   |   ├── Api
|   |   |   |   ├── V1
|   |   |   |   |   ├── PostController.php
|   |   |   |   |   ├── UserController.php
|   ├── JsonApi
|   |   ├── V1
|   |   |   ├── Posts
|   |   |   |   ├── PostCollectionQuery.php (optional)
|   |   |   |   ├── PostQuery.php (optional)
|   |   |   |   ├── PostRequest.php (required if writable)
|   |   |   |   ├── PostResource.php
|   |   |   |   ├── PostSchema.php
|   |   |   ├── Users
|   |   |   |   ├── UserResource.php
|   |   |   |   ├── UserSchema.php
|   |   |   ├── Server.php
```

## Auto-Discovery

As described in the `Schema` documentation, each schema class is registered
in your API's `Server` class.

Once the `Schema` is registered, all the other classes (`Query`, `Request`
and `Resource`) are then auto-discovered. The package expects these
additional classes to be in the same namespace as the `Schema` class.

In the above example, the fully qualified class name for the `posts`
schema is `App\JsonApi\V1\Posts\PostSchema`. The package will therefore
auto-discover the resource class as `App\JsonApi\V1\Posts\PostResource`.
