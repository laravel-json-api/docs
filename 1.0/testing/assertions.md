# Test Assertions

[[toc]]

## Introduction

This chapter provides details of the available JSON:API response assertions.
Our test assertions are built to provide detailed and human-readable
JSON diffs, so you can spot exactly where a JSON:API document differs
from the expected JSON.

## Resource Objects

You should use the following assertions when you expect *zero-to-one*
resource object in the response:

- [assertFetchedOne](#assertfetchedone)
- [assertFetchedOneExact](#assertfetchedoneexact)
- [assertFetchedNull](#assertfetchednull)

### assertFetchedOne

The `assertFetchedOne` method asserts that:

- The response has a `200 OK` response status;
- The response content type is `application/vnd.api+json`; AND
- The `data` member of the JSON:API document matches the expected resource.

You can provide either an `array` representation of the expected resource,
or a model.

Providing a model just matches the resource based on the expected `type`
and the model's route key.

If providing an `array`, you can provide a *partial* representation
of the expected resource - i.e. you do not need to provide every `attribute`,
`relationship` and `link`. The assertion will just match those you provided.

For example:

```php
use App\Models\Post;

$model = Post::factory()->create();

$response = $this
    ->jsonApi()
    ->expects('posts')
    ->get('/api/v1/posts/' . $post->getRouteKey());

$response->assertFetchedOne($model);

// or...

$response->assertFetchedOne([
    'type' => 'posts',
    'id' => (string) $post->getRouteKey(),
    'attributes' => [
        'slug' => $post->slug,
        'title' => $post->title,
    ],
]);
```

### assertFetchedOneExact

The `assertFetchedOneExact` method asserts that:

- The response has a `200 OK` response status;
- The response content type is `application/vnd.api+json`; AND
- The `data` member of the JSON:API document **exactly** matches the
provided array.

When providing the expected array, you will need to provide the *entire*
expected resource object. For example:

```php
use App\Models\Post;

$model = Post::factory()->create();

$uri = "http://localhost/api/v1/posts/{$post->getRouteKey()}";

$response = $this
    ->jsonApi()
    ->expects('posts')
    ->get($uri);

$response->assertFetchedOneExact([
    'type' => 'posts',
    'id' => (string) $post->getRouteKey(),
    'attributes' => [
        'content' => $post->content,
        'createdAt' => $post->created_at->jsonSerialize(),
        'slug' => $post->slug,
        'title' => $post->title,
        'updatedAt' => $post->updated_at->jsonSerialize(),
    ],
    'relationships' => [
        'author' => [
            'links' => [
                'self' => "{$uri}/relationships/author",
                'related' => "{$uri}/author",
            ],
        ],
        'tags' => [
            'links' => [
                'self' => "{$uri}/relationships/tags",
                'related' => "{$uri}/tags",
            ],
        ],
    ],
    'links' => [
        'self' => $uri,
    ],
]);
```

### assertFetchedNull

The `assertFetchedNull` method asserts that:

- The response has a `200 OK` response status;
- The response content type is `application/vnd.api+json`; AND
- The `data` member of the JSON:API document is `null`.

For example:

```php

$model = Post::factory()->create(['slug' => 'foo-bar']);

$response = $this
    ->jsonApi()
    ->expects('posts')
    ->filter(['slug' => 'baz-bat'])
    ->get('/api/v1/posts/' . $post->getRouteKey());

$response->assertFetchedNull();
```

## Resource Collections

You should use the following assertions when you expect *zero-to-many*
resource objects in the response:

- [assertFetchedMany](#assertfetchedmany)
- [assertFetchedManyExact](#assertfetchedmanyexact)
- [assertFetchedManyInOrder](#assertfetchedmanyinorder)
- [assertFetchedNone](#assertfetchednone)

### assertFetchedMany

The `assertFetchedMany` method asserts that:

- The response has a `200 OK` response status;
- The response content type is `application/vnd.api+json`; AND
- The `data` member of the JSON:API document is an array matching
the expected resources.

:::tip
The order of the expected resources is not considered when matching with
the actual resources. This makes this assertion useful for tests where
you want to check the right resources were returned, but do not care about
the order.

If you do care about matching the order, use the
[assertFetchedManyInOrder](#assertfetchedmanyinorder) assertion.
:::

You can provide either an `array` representation of the expected resources,
or a collection of models.

Providing models just matches the resources based on the expected `type`
and each model's route key.

If providing an `array`, you can provide a *partial* representation
of each expected resource - i.e. you do not need to provide every `attribute`,
`relationship` and `link`. The assertion will just match those you provided.

For example:

```php
use App\Models\Post;

$models = Post::factory()->count(2)->create();

$response = $this
    ->jsonApi()
    ->expects('posts')
    ->get('/api/v1/posts');

$response->assertFetchedMany($models);

// or...

$response->assertFetchedMany([
    [
        'type' => 'posts',
        'id' => (string) $models[0]->getRouteKey(),
        'attributes' => [
            'slug' => $models[0]->slug,
            'title' => $models[0]->title,
        ],
    ],
    [
        'type' => 'posts',
        'id' => (string) $models[1]->getRouteKey(),
        'attributes' => [
            'slug' => $models[1]->slug,
            'title' => $models[1]->title,
        ],
    ],
]);
```

### assertFetchedManyExact

The `assertFetchedManyExact` assertion does the same as the
[assertFetchedMany](#assertfetchedmany) method, except it does an *exact*
match on each expected resource objects. I.e. it asserts that:

- The response has a `200 OK` response status;
- The response content type is `application/vnd.api+json`; AND
- The `data` member of the JSON:API document is an array *exactly* matching
the provided resources.

This means you cannot provide models, and your array representation of each
expected resource would need to include all `attributes`, `relationships` and
`links`.

### assertFetchedManyInOrder

The `assertFetchedManyInOrder` assertion does the same as the
[assertFetchedMany](#assertfetchedmany) method, except that it also asserts
that the actual resources appear in the same order as the expected resources.
I.e. it asserts that:

- The response has a `200 OK` response status;
- The response content type is `application/vnd.api+json`; AND
- The `data` member of the JSON:API document is an array matching
the expected resources, in the same order.

For example, this is useful when testing the `sort` query parameter:

```php
use App\Models\Post;

$posts = Post::factory()->count(3)->create();

$response = $this
    ->jsonApi()
    ->expects('posts')
    ->sort('-publishedAt')
    ->get('/api/v1/posts');

$response->assertFetchedManyInOrder($posts->sortByDesc('published_at'));
```

### assertFetchedNone

The `assertFetchedNone` method asserts that:

- The response has a `200 OK` response status;
- The response content type is `application/vnd.api+json`; AND
- The `data` member of the JSON:API document is an empty `array`.

For example:

```php
use App\Models\Post;

Post::factory()->count(3)->create(['published_at' => null]);

$response = $this
    ->jsonApi()
    ->expects('posts')
    ->filter(['published' => 'true'])
    ->get('/api/v1/posts');

$response->assertFetchedNone();
```
