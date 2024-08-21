# 8. Fetching Resources

[[toc]]

## Introduction

In previous chapters, we've learnt how to use JSON:API requests to create,
read, update and delete a single blog post. In this chapter we'll explore how
you can use the JSON:API specification to fetch multiple blog posts in one
request.

We'll learn how to:

- paginate the resources returned in the response;
- filter resources;
- sort resources; and
- request specific fields per-resource type to reduce the response size.

## Fetching Post Resources

In JSON:API, you can fetch many resources in one request using the `GET` method
against the resource index. For example, we can retrieve many blog posts using
the following request:

```http
GET http://localhost/api/v1/posts HTTP/1.1
Content-Type: application/vnd.api+json
```

Give this request a go, and you should see the following response:

```http
HTTP/1.1 401 Unauthorized
Content-Type: application/vnd.api+json

{
  "jsonapi": {
    "version": "1.0"
  },
  "errors": [
    {
      "detail": "Unauthenticated.",
      "status": "401",
      "title": "Unauthorized"
    }
  ]
}
```

This tells us we need to update our authentication logic. Let's do that now.

### Authorization

Open the `app/Policies/PostPolicy.php` file and make the following changes to
the `viewAny()` method:

```diff
 /**
  * Determine whether the user can view any models.
  *
- * @param  \App\Models\User  $user
+ * @param  \App\Models\User|null  $user
  * @return \Illuminate\Auth\Access\Response|bool
  */
-public function viewAny(User $user)
+public function viewAny(?User $user)
 {
-    //
+    return true;
 }
```

By making the `$user` parameter nullable, we tell Laravel that guests are
allowed to view any post. This makes sense because we want the public to read
our blog posts.

However, it wouldn't make sense for a guest to see our draft blog posts. If you
remember from an earlier chapter, our authentication logic for accessing a
specific post said that only the author of the post could see a draft post.
That logic is in the `PostPolicy::view()` method.

Laravel JSON:API provides us with a way to filter out any draft posts if there
is no authenticated user. Open the `app/JsonApi/V1/Posts/PostSchema.php` file,
and make the following changes:

```diff
 namespace App\JsonApi\V1\Posts;

 use App\Models\Post;
 use Illuminate\Database\Eloquent\Builder;
 use Illuminate\Http\Request;
 use LaravelJsonApi\Eloquent\Contracts\Paginator;
 use LaravelJsonApi\Eloquent\Fields\DateTime;
 use LaravelJsonApi\Eloquent\Fields\ID;
 use LaravelJsonApi\Eloquent\Fields\Relations\BelongsTo;
 use LaravelJsonApi\Eloquent\Fields\Relations\BelongsToMany;
 use LaravelJsonApi\Eloquent\Fields\Relations\HasMany;
 use LaravelJsonApi\Eloquent\Fields\Str;
 use LaravelJsonApi\Eloquent\Filters\WhereIdIn;
 use LaravelJsonApi\Eloquent\Pagination\PagePagination;
 use LaravelJsonApi\Eloquent\Schema;

 class PostSchema extends Schema
 {

     /**
      * The model the schema corresponds to.
      *
      * @var string
      */
     public static string $model = Post::class;

     /**
      * The maximum include path depth.
      *
      * @var int
      */
     protected int $maxDepth = 3;

     /**
      * Get the resource fields.
      *
      * @return array
      */
     public function fields(): array
     {
         return [
             ID::make(),
             BelongsTo::make('author')->type('users')->readOnly(),
             HasMany::make('comments')->readOnly(),
             Str::make('content'),
             DateTime::make('createdAt')->sortable()->readOnly(),
             DateTime::make('publishedAt')->sortable(),
             Str::make('slug'),
             BelongsToMany::make('tags'),
             Str::make('title')->sortable(),
             DateTime::make('updatedAt')->sortable()->readOnly(),
         ];
     }

     /**
      * Get the resource filters.
      *
      * @return array
      */
     public function filters(): array
     {
         return [
             WhereIdIn::make($this),
         ];
     }

     /**
      * Get the resource paginator.
      *
      * @return Paginator|null
      */
     public function pagination(): ?Paginator
     {
         return PagePagination::make();
     }
+
+    /**
+     * Build an index query for this resource.
+     *
+     * @param Request|null $request
+     * @param Builder $query
+     * @return Builder
+     */
+    public function indexQuery(?Request $request, Builder $query): Builder
+    {
+        if ($user = optional($request)->user()) {
+            return $query->where(function (Builder $q) use ($user) {
+                return $q->whereNotNull('published_at')->orWhere('author_id', $user->getKey());
+            });
+        }
+
+        return $query->whereNotNull('published_at');
+    }

}
```

The `indexQuery()` method is called whenever the `posts` resource is being
fetched via the index route. This logic says that if there is a logged in user
(retrieved via the `$request`), then posts either need to be published (i.e.
have a value in their `published_at` column), or they need to belong to the
user (via the `author_id` column).

If there is no logged in user, then only posts that have a `published_at` value
will be returned.

### Fetching the Resources

Let's try our HTTP request again:

```http
GET http://localhost/api/v1/posts HTTP/1.1
Content-Type: application/vnd.api+json
```

This time we should see a success response, containing the one post that is
currently in our database:

```http
HTTP/1.1 200 OK
Content-Type: application/vnd.api+json

{
  "jsonapi": {
    "version": "1.0"
  },
  "data": [
    {
      "type": "posts",
      "id": "1",
      "attributes": {
        "content": "In our first blog post, you will learn all about Laravel JSON:API...",
        "createdAt": "2021-11-04T17:30:52.000000Z",
        "publishedAt": "2021-11-04T17:30:52.000000Z",
        "slug": "welcome-to-laravel-jsonapi",
        "title": "Welcome to Laravel JSON:API",
        "updatedAt": "2021-11-04T17:30:52.000000Z"
      },
      "relationships": {
        "author": {
          "links": {
            "related": "http:\/\/localhost\/api\/v1\/posts\/1\/author",
            "self": "http:\/\/localhost\/api\/v1\/posts\/1\/relationships\/author"
          }
        },
        "comments": {
          "links": {
            "related": "http:\/\/localhost\/api\/v1\/posts\/1\/comments",
            "self": "http:\/\/localhost\/api\/v1\/posts\/1\/relationships\/comments"
          }
        },
        "tags": {
          "links": {
            "related": "http:\/\/localhost\/api\/v1\/posts\/1\/tags",
            "self": "http:\/\/localhost\/api\/v1\/posts\/1\/relationships\/tags"
          }
        }
      },
      "links": {
        "self": "http:\/\/localhost\/api\/v1\/posts\/1"
      }
    }
  ]
}
```

Notice that the top-level `data` member is an array. This is because when we
are fetching many post resources, the response can have zero-to-many resources
in the `data` array.

## Model Factories

At the moment our blog application only has the one blog post. However, in a
real-life blog application there could be 10s, 100s or even 1000s of blog posts.
To try out the JSON:API features for paginating, filtering and sorting resources,
we will need to fill our database with a lot more `Post` models.

Laravel provides *Model Factories* to help us seed our database with lots of
models. If you open the `database/factories` folder, you'll see that we already
have a `UserFactory.php` file that helps us create `User` models.

Add a factory for our `Post` model using the following command:

```bash
vendor/bin/sail artisan make:factory PostFactory
```

That will create the `database/factories/PostFactory.php` file. Open that up
and make the following changes:

```diff
 namespace Database\Factories;

 use App\Models\Post;
+use App\Models\User;
 use Illuminate\Database\Eloquent\Factories\Factory;

 class PostFactory extends Factory
 {
     /**
      * The name of the factory's corresponding model.
      *
      * @var string
      */
     protected $model = Post::class;

     /**
      * Define the model's default state.
      *
      * @return array
      */
     public function definition()
     {
         return [
-            //
+            'author_id' => User::factory(),
+            'content' => $this->faker->paragraphs(3, true),
+            'published_at' => $this->faker->boolean(75) ? $this->faker->dateTime : null,
+            'slug' => $this->faker->unique()->slug,
+            'title' => $this->faker->words(5, true),
         ];
     }
 }
```

Here the definition tells the factory how to create a `Post` model, using random
data supplied via a package called Faker.

We then need to create a database seed that will use this factory to fill our
`posts` database table with data. Run the following command:

```bash
vendor/bin/sail artisan make:seed PostsSeeder
```

This will create the `database/seeders/PostsSeeder.php` class. Open it and make
the following changes:

```diff
 namespace Database\Seeders;

+use App\Models\Post;
+use App\Models\User;
 use Illuminate\Database\Seeder;

 class PostsSeeder extends Seeder
 {
     /**
      * Run the database seeds.
      *
      * @return void
      */
     public function run()
     {
-        //
+       $users = User::factory()->count(5)->create();
+
+       Post::factory()->count(100)->create([
+           'author_id' => fn() => $users->random(),
+       ]);
     }
 }
```

This creates 100 `Post` models, assigned to five different authors. Run the seed
now:

```bash
vendor/bin/sail artisan db:seed --class PostsSeeder
```

Once you've done this, try the HTTP request again:

```http
GET http://localhost/api/v1/posts HTTP/1.1
Content-Type: application/vnd.api+json
```

You should now see that the top-level `data` member of the response JSON contains
lots of `posts` resources. In fact, it contains all 101 that are in the database.

## Pagination

Retrieving all the `posts` in one request can be quite inefficient. JSON:API
specifies that the `page` query parameter can be used by a client to obtain
a subset of the resources.

If you open your `app/JsonApi/V1/Posts/PostSchema.php` file, you'll notice
it already has a `pagination` method. This means our schema is already
configured to support pagination.

Say we wanted to retrieve the first page, with only 5 posts per-page, we
would use the following request:

```http
GET http://localhost/api/v1/posts?page[number]=1&page[size]=5 HTTP/1.1
Accept: application/vnd.api+json
```

You will see a response like this:

```http
HTTP/1.1 200 OK
Content-Type: application/vnd.api+json

{
  "meta": {
    "page": {
      "currentPage": 1,
      "from": 1,
      "lastPage": 16,
      "perPage": 5,
      "to": 5,
      "total": 76
    }
  },
  "jsonapi": {
    "version": "1.0"
  },
  "links": {
    "first": "http:\/\/localhost\/api\/v1\/posts?page%5Bnumber%5D=1&page%5Bsize%5D=5",
    "last": "http:\/\/localhost\/api\/v1\/posts?page%5Bnumber%5D=16&page%5Bsize%5D=5",
    "next": "http:\/\/localhost\/api\/v1\/posts?page%5Bnumber%5D=2&page%5Bsize%5D=5"
  },
  "data": [
    {
      "type": "posts",
      "id": "1",
      "attributes": {
        "content": "In our first blog post, you will learn all about Laravel JSON:API...",
        "createdAt": "2021-11-04T17:30:52.000000Z",
        "publishedAt": "2021-11-04T17:30:52.000000Z",
        "slug": "welcome-to-laravel-jsonapi",
        "title": "Welcome to Laravel JSON:API",
        "updatedAt": "2021-11-04T17:30:52.000000Z"
      },
      "relationships": {
        "author": {
          "links": {
            "related": "http:\/\/localhost\/api\/v1\/posts\/1\/author",
            "self": "http:\/\/localhost\/api\/v1\/posts\/1\/relationships\/author"
          }
        },
        "comments": {
          "links": {
            "related": "http:\/\/localhost\/api\/v1\/posts\/1\/comments",
            "self": "http:\/\/localhost\/api\/v1\/posts\/1\/relationships\/comments"
          }
        },
        "tags": {
          "links": {
            "related": "http:\/\/localhost\/api\/v1\/posts\/1\/tags",
            "self": "http:\/\/localhost\/api\/v1\/posts\/1\/relationships\/tags"
          }
        }
      },
      "links": {
        "self": "http:\/\/localhost\/api\/v1\/posts\/1"
      }
    },
    {
      "type": "posts",
      "id": "3",
      "attributes": {
        "content": "Ullam nihil perferendis impedit ratione in eum. Tempora qui ab quasi ipsam esse cumque officia. Quia quia ut ducimus sapiente harum qui expedita. Eos quisquam aliquam commodi qui aut et.\n\nEveniet ut assumenda qui dolores pariatur nemo. Dolor et voluptatibus officiis eius molestias voluptate adipisci. Molestiae quia voluptatem reiciendis ipsam ipsum praesentium quisquam. Et esse odio aliquid nisi optio reiciendis et. Voluptatem repellat est harum.\n\nVoluptas consectetur fugit eligendi numquam blanditiis error delectus. Iste deserunt repellat voluptate. Cupiditate vero doloremque id. Ut facilis qui sint vero. Laborum est occaecati numquam veritatis.",
        "createdAt": "2021-11-04T19:19:00.000000Z",
        "publishedAt": "1994-04-23T14:16:56.000000Z",
        "slug": "et-et-praesentium-quis",
        "title": "sed impedit error et non",
        "updatedAt": "2021-11-04T19:19:00.000000Z"
      },
      "relationships": {
        "author": {
          "links": {
            "related": "http:\/\/localhost\/api\/v1\/posts\/3\/author",
            "self": "http:\/\/localhost\/api\/v1\/posts\/3\/relationships\/author"
          }
        },
        "comments": {
          "links": {
            "related": "http:\/\/localhost\/api\/v1\/posts\/3\/comments",
            "self": "http:\/\/localhost\/api\/v1\/posts\/3\/relationships\/comments"
          }
        },
        "tags": {
          "links": {
            "related": "http:\/\/localhost\/api\/v1\/posts\/3\/tags",
            "self": "http:\/\/localhost\/api\/v1\/posts\/3\/relationships\/tags"
          }
        }
      },
      "links": {
        "self": "http:\/\/localhost\/api\/v1\/posts\/3"
      }
    },
    {
      "type": "posts",
      "id": "5",
      "attributes": {
        "content": "Eos repudiandae tenetur architecto voluptatem. Velit vero error ut libero animi vitae rerum. Quidem provident molestias dolorem aut in consequatur molestias. Sed recusandae voluptas facere est nobis dolores dicta.\n\nQuos similique sit dicta odit. Ab suscipit eos rerum blanditiis. Dolorem aut odit alias quo laudantium perferendis quo. Quos laudantium omnis voluptatem illo vitae ea quod repellat.\n\nArchitecto quis enim impedit vel adipisci. A quia quia dolore. Magni dolores quas et velit delectus facere. Incidunt aperiam vel impedit laboriosam.",
        "createdAt": "2021-11-04T19:19:00.000000Z",
        "publishedAt": "1993-01-18T02:55:30.000000Z",
        "slug": "voluptatem-excepturi-non-impedit-in-et-voluptas",
        "title": "repudiandae impedit et facere sint",
        "updatedAt": "2021-11-04T19:19:00.000000Z"
      },
      "relationships": {
        "author": {
          "links": {
            "related": "http:\/\/localhost\/api\/v1\/posts\/5\/author",
            "self": "http:\/\/localhost\/api\/v1\/posts\/5\/relationships\/author"
          }
        },
        "comments": {
          "links": {
            "related": "http:\/\/localhost\/api\/v1\/posts\/5\/comments",
            "self": "http:\/\/localhost\/api\/v1\/posts\/5\/relationships\/comments"
          }
        },
        "tags": {
          "links": {
            "related": "http:\/\/localhost\/api\/v1\/posts\/5\/tags",
            "self": "http:\/\/localhost\/api\/v1\/posts\/5\/relationships\/tags"
          }
        }
      },
      "links": {
        "self": "http:\/\/localhost\/api\/v1\/posts\/5"
      }
    },
    {
      "type": "posts",
      "id": "7",
      "attributes": {
        "content": "Optio aut nemo quis eius rem sint molestias eaque. Sequi quam ut doloribus et. Blanditiis ad minus voluptas amet nostrum commodi. Excepturi cupiditate explicabo nam velit fugit occaecati iure in.\n\nDelectus autem nostrum rerum rem. Optio voluptas officiis quidem ratione. Quo omnis et in qui facere aut ad. Quas a ullam occaecati hic ullam.\n\nNon ducimus similique est est nulla excepturi. Voluptatem in vel cumque incidunt sed. Officia alias pariatur repellendus sit rerum.",
        "createdAt": "2021-11-04T19:19:00.000000Z",
        "publishedAt": "1985-07-15T01:17:17.000000Z",
        "slug": "autem-itaque-et-aut-harum-et-laudantium",
        "title": "omnis est quis atque ipsum",
        "updatedAt": "2021-11-04T19:19:00.000000Z"
      },
      "relationships": {
        "author": {
          "links": {
            "related": "http:\/\/localhost\/api\/v1\/posts\/7\/author",
            "self": "http:\/\/localhost\/api\/v1\/posts\/7\/relationships\/author"
          }
        },
        "comments": {
          "links": {
            "related": "http:\/\/localhost\/api\/v1\/posts\/7\/comments",
            "self": "http:\/\/localhost\/api\/v1\/posts\/7\/relationships\/comments"
          }
        },
        "tags": {
          "links": {
            "related": "http:\/\/localhost\/api\/v1\/posts\/7\/tags",
            "self": "http:\/\/localhost\/api\/v1\/posts\/7\/relationships\/tags"
          }
        }
      },
      "links": {
        "self": "http:\/\/localhost\/api\/v1\/posts\/7"
      }
    },
    {
      "type": "posts",
      "id": "9",
      "attributes": {
        "content": "Qui autem non non aspernatur eligendi. Impedit et sit inventore facilis est. Ut minus provident iure qui. Dolores ab ratione dolorem nulla quod.\n\nSimilique quasi et nihil provident dolores. Expedita quia fugit blanditiis impedit vel quidem quis eos. Minima dolores esse nisi error architecto. Sed amet culpa id architecto consectetur sint qui.\n\nOccaecati minima voluptas placeat voluptas est est consequatur. Facilis repellat velit voluptas. Odio iure quia sed quia nesciunt eum aut.",
        "createdAt": "2021-11-04T19:19:00.000000Z",
        "publishedAt": "1984-05-29T14:26:49.000000Z",
        "slug": "consequatur-harum-optio-laboriosam-cumque",
        "title": "earum provident sit tenetur sint",
        "updatedAt": "2021-11-04T19:19:00.000000Z"
      },
      "relationships": {
        "author": {
          "links": {
            "related": "http:\/\/localhost\/api\/v1\/posts\/9\/author",
            "self": "http:\/\/localhost\/api\/v1\/posts\/9\/relationships\/author"
          }
        },
        "comments": {
          "links": {
            "related": "http:\/\/localhost\/api\/v1\/posts\/9\/comments",
            "self": "http:\/\/localhost\/api\/v1\/posts\/9\/relationships\/comments"
          }
        },
        "tags": {
          "links": {
            "related": "http:\/\/localhost\/api\/v1\/posts\/9\/tags",
            "self": "http:\/\/localhost\/api\/v1\/posts\/9\/relationships\/tags"
          }
        }
      },
      "links": {
        "self": "http:\/\/localhost\/api\/v1\/posts\/9"
      }
    }
  ]
}
```

As you can see from the response, there is a top-level `links` member that
provides URLs for the `first`, `next` and `last` pages. We also have a top-level
`meta` member that contains information about the page we've received in the
response.

:::tip
Have a go at modifying the request `page` parameters to retrieve different
pages. You'll find that if you retrieve a page greater than `1`, there will be
a `prev` link - which is a link to the previous page.
:::

## Filtering

The JSON:API specification reserves the `filter` query parameter for filtering
data. The specification is agnostic about how filtering should be implemented -
it is up to each application to decide what filtering strategies they should use.
Laravel JSON:API makes it easy to implement filters via a resource's schema.

If you open the `app/JsonApi/V1/Posts/PostSchema.php` file, you'll notice that
the post schema already has a `filters()` method that looks like this:

```php
/**
 * Get the resource filters.
 *
 * @return array
 */
public function filters(): array
{
    return [
        WhereIdIn::make($this),
    ];
}
```

The `WhereIdIn` filter allows an API client to retrieve posts that have the
specified resource id. For example, if a client wanted to retrieve the `posts`
resources with ids `1`, `3` and `5`, it can use the following request:

```http
GET http://localhost/api/v1/posts?filter[id][]=1&filter[id][]=3&filter[id][]=5 HTTP/1.1
Accept: application/vnd.api+json
```

When you give this request a go, you'll see a response like this:

```http
HTTP/1.1 200 OK
Content-Type: application/vnd.api+json

{
  "jsonapi": {
    "version": "1.0"
  },
  "data": [
    {
      "type": "posts",
      "id": "1",
      "attributes": {
        "content": "In our first blog post, you will learn all about Laravel JSON:API...",
        "createdAt": "2021-11-04T17:30:52.000000Z",
        "publishedAt": "2021-11-04T17:30:52.000000Z",
        "slug": "welcome-to-laravel-jsonapi",
        "title": "Welcome to Laravel JSON:API",
        "updatedAt": "2021-11-04T17:30:52.000000Z"
      },
      "relationships": {
        "author": {
          "links": {
            "related": "http:\/\/localhost\/api\/v1\/posts\/1\/author",
            "self": "http:\/\/localhost\/api\/v1\/posts\/1\/relationships\/author"
          }
        },
        "comments": {
          "links": {
            "related": "http:\/\/localhost\/api\/v1\/posts\/1\/comments",
            "self": "http:\/\/localhost\/api\/v1\/posts\/1\/relationships\/comments"
          }
        },
        "tags": {
          "links": {
            "related": "http:\/\/localhost\/api\/v1\/posts\/1\/tags",
            "self": "http:\/\/localhost\/api\/v1\/posts\/1\/relationships\/tags"
          }
        }
      },
      "links": {
        "self": "http:\/\/localhost\/api\/v1\/posts\/1"
      }
    },
    {
      "type": "posts",
      "id": "3",
      "attributes": {
        "content": "Ullam nihil perferendis impedit ratione in eum. Tempora qui ab quasi ipsam esse cumque officia. Quia quia ut ducimus sapiente harum qui expedita. Eos quisquam aliquam commodi qui aut et.\n\nEveniet ut assumenda qui dolores pariatur nemo. Dolor et voluptatibus officiis eius molestias voluptate adipisci. Molestiae quia voluptatem reiciendis ipsam ipsum praesentium quisquam. Et esse odio aliquid nisi optio reiciendis et. Voluptatem repellat est harum.\n\nVoluptas consectetur fugit eligendi numquam blanditiis error delectus. Iste deserunt repellat voluptate. Cupiditate vero doloremque id. Ut facilis qui sint vero. Laborum est occaecati numquam veritatis.",
        "createdAt": "2021-11-04T19:19:00.000000Z",
        "publishedAt": "1994-04-23T14:16:56.000000Z",
        "slug": "et-et-praesentium-quis",
        "title": "sed impedit error et non",
        "updatedAt": "2021-11-04T19:19:00.000000Z"
      },
      "relationships": {
        "author": {
          "links": {
            "related": "http:\/\/localhost\/api\/v1\/posts\/3\/author",
            "self": "http:\/\/localhost\/api\/v1\/posts\/3\/relationships\/author"
          }
        },
        "comments": {
          "links": {
            "related": "http:\/\/localhost\/api\/v1\/posts\/3\/comments",
            "self": "http:\/\/localhost\/api\/v1\/posts\/3\/relationships\/comments"
          }
        },
        "tags": {
          "links": {
            "related": "http:\/\/localhost\/api\/v1\/posts\/3\/tags",
            "self": "http:\/\/localhost\/api\/v1\/posts\/3\/relationships\/tags"
          }
        }
      },
      "links": {
        "self": "http:\/\/localhost\/api\/v1\/posts\/3"
      }
    },
    {
      "type": "posts",
      "id": "5",
      "attributes": {
        "content": "Eos repudiandae tenetur architecto voluptatem. Velit vero error ut libero animi vitae rerum. Quidem provident molestias dolorem aut in consequatur molestias. Sed recusandae voluptas facere est nobis dolores dicta.\n\nQuos similique sit dicta odit. Ab suscipit eos rerum blanditiis. Dolorem aut odit alias quo laudantium perferendis quo. Quos laudantium omnis voluptatem illo vitae ea quod repellat.\n\nArchitecto quis enim impedit vel adipisci. A quia quia dolore. Magni dolores quas et velit delectus facere. Incidunt aperiam vel impedit laboriosam.",
        "createdAt": "2021-11-04T19:19:00.000000Z",
        "publishedAt": "1993-01-18T02:55:30.000000Z",
        "slug": "voluptatem-excepturi-non-impedit-in-et-voluptas",
        "title": "repudiandae impedit et facere sint",
        "updatedAt": "2021-11-04T19:19:00.000000Z"
      },
      "relationships": {
        "author": {
          "links": {
            "related": "http:\/\/localhost\/api\/v1\/posts\/5\/author",
            "self": "http:\/\/localhost\/api\/v1\/posts\/5\/relationships\/author"
          }
        },
        "comments": {
          "links": {
            "related": "http:\/\/localhost\/api\/v1\/posts\/5\/comments",
            "self": "http:\/\/localhost\/api\/v1\/posts\/5\/relationships\/comments"
          }
        },
        "tags": {
          "links": {
            "related": "http:\/\/localhost\/api\/v1\/posts\/5\/tags",
            "self": "http:\/\/localhost\/api\/v1\/posts\/5\/relationships\/tags"
          }
        }
      },
      "links": {
        "self": "http:\/\/localhost\/api\/v1\/posts\/5"
      }
    }
  ]
}
```

### Implementing Filters

Laravel JSON:API ships with a lot of different filter classes you can add to
your schema. It is also easy to write your own filter classes if needed. We'll
demonstrate this now by adding a new filter to our `PostSchema` class.

Let's say we wanted to allow a client to filter `posts` by author. To do this,
we'll add a `WhereIn` filter to our `PostSchema`. Make the following changes to
class:

```diff
 namespace App\JsonApi\V1\Posts;

 use App\Models\Post;
 use Illuminate\Database\Eloquent\Builder;
 use Illuminate\Http\Request;
 use LaravelJsonApi\Eloquent\Contracts\Paginator;
 use LaravelJsonApi\Eloquent\Fields\DateTime;
 use LaravelJsonApi\Eloquent\Fields\ID;
 use LaravelJsonApi\Eloquent\Fields\Relations\BelongsTo;
 use LaravelJsonApi\Eloquent\Fields\Relations\BelongsToMany;
 use LaravelJsonApi\Eloquent\Fields\Relations\HasMany;
 use LaravelJsonApi\Eloquent\Fields\Str;
 use LaravelJsonApi\Eloquent\Filters\WhereIdIn;
+use LaravelJsonApi\Eloquent\Filters\WhereIn;
 use LaravelJsonApi\Eloquent\Pagination\PagePagination;
 use LaravelJsonApi\Eloquent\Schema;

 class PostSchema extends Schema
 {

     /**
      * The model the schema corresponds to.
      *
      * @var string
      */
     public static string $model = Post::class;

     /**
      * The maximum include path depth.
      *
      * @var int
      */
     protected int $maxDepth = 3;

     /**
      * Get the resource fields.
      *
      * @return array
      */
     public function fields(): array
     {
         return [
             ID::make(),
             BelongsTo::make('author')->type('users')->readOnly(),
             HasMany::make('comments')->readOnly(),
             Str::make('content'),
             DateTime::make('createdAt')->sortable()->readOnly(),
             DateTime::make('publishedAt')->sortable(),
             Str::make('slug'),
             BelongsToMany::make('tags'),
             Str::make('title')->sortable(),
             DateTime::make('updatedAt')->sortable()->readOnly(),
         ];
     }

     /**
      * Get the resource filters.
      *
      * @return array
      */
     public function filters(): array
     {
         return [
             WhereIdIn::make($this),
+            WhereIn::make('author', 'author_id'),
         ];
     }

     /**
      * Get the resource paginator.
      *
      * @return Paginator|null
      */
     public function pagination(): ?Paginator
     {
         return PagePagination::make();
     }

     /**
      * Build an index query for this resource.
      *
      * @param Request|null $request
      * @param Builder $query
      * @return Builder
      */
     public function indexQuery(?Request $request, Builder $query): Builder
     {
         if ($user = optional($request)->user()) {
             return $query->where(function (Builder $q) use ($user) {
                 return $q->whereNotNull('published_at')->orWhere('author_id', $user->getKey());
             });
         }

         return $query->whereNotNull('published_at');
     }
 }
```

Here we have add a filter called `author`, which will be applied to the `author_id`
column. Now if our client wants to retrieve `posts` that were written by authors
`1` and `3`, it can send the following request:

```http
GET http://localhost/api/v1/posts?filter[author][]=1&filter[author][]=3&include=author&page[number]=1&page[size]=5 HTTP/1.1
Accept: application/vnd.api+json
```

Notice we've used an `include` path of `author`. We covered include paths in a
previous chapter. Here we include the author so that we can see in the response
that the posts returned belong to the two authors we filtered by. We've also
requested a `page` - so that we get a sensible amount of resources returned.

Give the request a go, and you should see a response like this:

```http
HTTP/1.1 200 OK
Content-Type: application/vnd.api+json

{
  "meta": {
    "page": {
      "currentPage": 1,
      "from": 1,
      "lastPage": 3,
      "perPage": 5,
      "to": 5,
      "total": 12
    }
  },
  "jsonapi": {
    "version": "1.0"
  },
  "links": {
    "first": "http:\/\/localhost\/api\/v1\/posts?filter%5Bauthor%5D%5B0%5D=1&filter%5Bauthor%5D%5B1%5D=3&include=author&page%5Bnumber%5D=1&page%5Bsize%5D=5",
    "last": "http:\/\/localhost\/api\/v1\/posts?filter%5Bauthor%5D%5B0%5D=1&filter%5Bauthor%5D%5B1%5D=3&include=author&page%5Bnumber%5D=3&page%5Bsize%5D=5",
    "next": "http:\/\/localhost\/api\/v1\/posts?filter%5Bauthor%5D%5B0%5D=1&filter%5Bauthor%5D%5B1%5D=3&include=author&page%5Bnumber%5D=2&page%5Bsize%5D=5"
  },
  "data": [
    {
      "type": "posts",
      "id": "1",
      "attributes": {
        "content": "In our first blog post, you will learn all about Laravel JSON:API...",
        "createdAt": "2021-11-04T17:30:52.000000Z",
        "publishedAt": "2021-11-04T17:30:52.000000Z",
        "slug": "welcome-to-laravel-jsonapi",
        "title": "Welcome to Laravel JSON:API",
        "updatedAt": "2021-11-04T17:30:52.000000Z"
      },
      "relationships": {
        "author": {
          "links": {
            "related": "http:\/\/localhost\/api\/v1\/posts\/1\/author",
            "self": "http:\/\/localhost\/api\/v1\/posts\/1\/relationships\/author"
          },
          "data": {
            "type": "users",
            "id": "1"
          }
        },
        "comments": {
          "links": {
            "related": "http:\/\/localhost\/api\/v1\/posts\/1\/comments",
            "self": "http:\/\/localhost\/api\/v1\/posts\/1\/relationships\/comments"
          }
        },
        "tags": {
          "links": {
            "related": "http:\/\/localhost\/api\/v1\/posts\/1\/tags",
            "self": "http:\/\/localhost\/api\/v1\/posts\/1\/relationships\/tags"
          }
        }
      },
      "links": {
        "self": "http:\/\/localhost\/api\/v1\/posts\/1"
      }
    },
    {
      "type": "posts",
      "id": "7",
      "attributes": {
        "content": "Optio aut nemo quis eius rem sint molestias eaque. Sequi quam ut doloribus et. Blanditiis ad minus voluptas amet nostrum commodi. Excepturi cupiditate explicabo nam velit fugit occaecati iure in.\n\nDelectus autem nostrum rerum rem. Optio voluptas officiis quidem ratione. Quo omnis et in qui facere aut ad. Quas a ullam occaecati hic ullam.\n\nNon ducimus similique est est nulla excepturi. Voluptatem in vel cumque incidunt sed. Officia alias pariatur repellendus sit rerum.",
        "createdAt": "2021-11-04T19:19:00.000000Z",
        "publishedAt": "1985-07-15T01:17:17.000000Z",
        "slug": "autem-itaque-et-aut-harum-et-laudantium",
        "title": "omnis est quis atque ipsum",
        "updatedAt": "2021-11-04T19:19:00.000000Z"
      },
      "relationships": {
        "author": {
          "links": {
            "related": "http:\/\/localhost\/api\/v1\/posts\/7\/author",
            "self": "http:\/\/localhost\/api\/v1\/posts\/7\/relationships\/author"
          },
          "data": {
            "type": "users",
            "id": "3"
          }
        },
        "comments": {
          "links": {
            "related": "http:\/\/localhost\/api\/v1\/posts\/7\/comments",
            "self": "http:\/\/localhost\/api\/v1\/posts\/7\/relationships\/comments"
          }
        },
        "tags": {
          "links": {
            "related": "http:\/\/localhost\/api\/v1\/posts\/7\/tags",
            "self": "http:\/\/localhost\/api\/v1\/posts\/7\/relationships\/tags"
          }
        }
      },
      "links": {
        "self": "http:\/\/localhost\/api\/v1\/posts\/7"
      }
    },
    {
      "type": "posts",
      "id": "12",
      "attributes": {
        "content": "Omnis quis deserunt consectetur ullam fugit sunt cumque voluptatum. Eaque qui consequuntur ducimus est voluptatem id minus. Rerum quia fuga recusandae id beatae non dolorem ullam.\n\nVelit omnis ut nihil. Recusandae delectus perspiciatis quia aut. Eos at est veritatis. Quisquam qui distinctio blanditiis sint cupiditate accusantium a et. Aut id autem maxime minus aliquam repellendus quidem.\n\nDolorum delectus eum quisquam molestiae perspiciatis numquam. Eveniet aut natus ullam sunt et voluptas omnis pariatur. Porro non qui nihil illo et atque explicabo ut.",
        "createdAt": "2021-11-04T19:19:00.000000Z",
        "publishedAt": "2015-10-01T17:30:17.000000Z",
        "slug": "qui-quisquam-consectetur-molestiae-laboriosam-perferendis-earum-repellat",
        "title": "quis accusantium molestiae tenetur quis",
        "updatedAt": "2021-11-04T19:19:00.000000Z"
      },
      "relationships": {
        "author": {
          "links": {
            "related": "http:\/\/localhost\/api\/v1\/posts\/12\/author",
            "self": "http:\/\/localhost\/api\/v1\/posts\/12\/relationships\/author"
          },
          "data": {
            "type": "users",
            "id": "3"
          }
        },
        "comments": {
          "links": {
            "related": "http:\/\/localhost\/api\/v1\/posts\/12\/comments",
            "self": "http:\/\/localhost\/api\/v1\/posts\/12\/relationships\/comments"
          }
        },
        "tags": {
          "links": {
            "related": "http:\/\/localhost\/api\/v1\/posts\/12\/tags",
            "self": "http:\/\/localhost\/api\/v1\/posts\/12\/relationships\/tags"
          }
        }
      },
      "links": {
        "self": "http:\/\/localhost\/api\/v1\/posts\/12"
      }
    },
    {
      "type": "posts",
      "id": "15",
      "attributes": {
        "content": "Minus libero debitis corrupti reiciendis excepturi qui laborum. Amet repellat expedita quasi ut eius impedit et dolor. Odio atque nihil perferendis sunt et aperiam. Aperiam quas ab nam quis in dolorem. Maxime ratione iusto cupiditate rerum ea.\n\nFugiat veritatis fugiat nobis quisquam et consequuntur magnam. Eligendi asperiores ex sequi expedita. Aut impedit est beatae voluptas ducimus eveniet debitis.\n\nAtque eum fugiat laborum velit vel dolores. Ut culpa adipisci rem porro nisi. Aut consectetur architecto sint aut ratione sed. Consequatur ut dicta officiis.",
        "createdAt": "2021-11-04T19:19:00.000000Z",
        "publishedAt": "2004-03-25T15:52:19.000000Z",
        "slug": "facilis-explicabo-minus-sunt-enim-architecto-recusandae",
        "title": "culpa vel quidem quia modi",
        "updatedAt": "2021-11-04T19:19:00.000000Z"
      },
      "relationships": {
        "author": {
          "links": {
            "related": "http:\/\/localhost\/api\/v1\/posts\/15\/author",
            "self": "http:\/\/localhost\/api\/v1\/posts\/15\/relationships\/author"
          },
          "data": {
            "type": "users",
            "id": "3"
          }
        },
        "comments": {
          "links": {
            "related": "http:\/\/localhost\/api\/v1\/posts\/15\/comments",
            "self": "http:\/\/localhost\/api\/v1\/posts\/15\/relationships\/comments"
          }
        },
        "tags": {
          "links": {
            "related": "http:\/\/localhost\/api\/v1\/posts\/15\/tags",
            "self": "http:\/\/localhost\/api\/v1\/posts\/15\/relationships\/tags"
          }
        }
      },
      "links": {
        "self": "http:\/\/localhost\/api\/v1\/posts\/15"
      }
    },
    {
      "type": "posts",
      "id": "19",
      "attributes": {
        "content": "Molestiae recusandae provident est nobis accusamus expedita. Nam minus veniam quis ad repellat cupiditate. Adipisci repellat consectetur ipsam aliquam. Rerum deleniti est repudiandae alias quaerat.\n\nVeritatis qui nulla eos quos est non voluptas. Expedita voluptatem a eos quia. Aut sint rem optio consequuntur velit est. Id fugit labore a dolore sapiente repellat.\n\nUnde quia odio aperiam distinctio aliquid quasi. Quos non error atque aut. Ipsum saepe officia et iste eveniet veniam fugit cupiditate. Ab dolorem in totam ea. Id sed quia nobis quae quae et.",
        "createdAt": "2021-11-04T19:19:00.000000Z",
        "publishedAt": "2014-10-16T00:22:02.000000Z",
        "slug": "officia-molestias-omnis-accusantium-praesentium-quidem-numquam-hic",
        "title": "atque nostrum at commodi ex",
        "updatedAt": "2021-11-04T19:19:00.000000Z"
      },
      "relationships": {
        "author": {
          "links": {
            "related": "http:\/\/localhost\/api\/v1\/posts\/19\/author",
            "self": "http:\/\/localhost\/api\/v1\/posts\/19\/relationships\/author"
          },
          "data": {
            "type": "users",
            "id": "3"
          }
        },
        "comments": {
          "links": {
            "related": "http:\/\/localhost\/api\/v1\/posts\/19\/comments",
            "self": "http:\/\/localhost\/api\/v1\/posts\/19\/relationships\/comments"
          }
        },
        "tags": {
          "links": {
            "related": "http:\/\/localhost\/api\/v1\/posts\/19\/tags",
            "self": "http:\/\/localhost\/api\/v1\/posts\/19\/relationships\/tags"
          }
        }
      },
      "links": {
        "self": "http:\/\/localhost\/api\/v1\/posts\/19"
      }
    }
  ],
  "included": [
    {
      "type": "users",
      "id": "1",
      "attributes": {
        "createdAt": "2021-11-04T17:30:52.000000Z",
        "name": "Artie Shaw",
        "updatedAt": "2021-11-04T17:30:52.000000Z"
      },
      "links": {
        "self": "http:\/\/localhost\/api\/v1\/users\/1"
      }
    },
    {
      "type": "users",
      "id": "3",
      "attributes": {
        "createdAt": "2021-11-04T19:19:00.000000Z",
        "name": "Joel Buckridge IV",
        "updatedAt": "2021-11-04T19:19:00.000000Z"
      },
      "links": {
        "self": "http:\/\/localhost\/api\/v1\/users\/3"
      }
    }
  ]
}
```

You'll notice in the above response that only `posts` written by the `users`
with ids of `1` and `3` have been returned.

## Sorting

The JSON:API specification reserves the `sort` query parameter for clients to
request resource in a specific order. Our `PostSchema` already has a few fields
configured to be sortable in the `fields()` method:

```php
public function fields(): array
{
    return [
        ID::make(),
        BelongsTo::make('author')->type('users')->readOnly(),
        HasMany::make('comments')->readOnly(),
        Str::make('content'),
        DateTime::make('createdAt')->sortable()->readOnly(),
        DateTime::make('publishedAt')->sortable(),
        Str::make('slug'),
        BelongsToMany::make('tags'),
        Str::make('title')->sortable(),
        DateTime::make('updatedAt')->sortable()->readOnly(),
    ];
}
```

Notice how the `createdAt`, `publishedAt`, `title` and `updatedAt` fields are
marked as sortable via the `sortable()` method.

Let's say our client wanted to retrieve the 3 most recently published blog posts.
We can retrieve these using a `sort` query parameter with a value of `-publishedAt`,
with the `-` denoting a descending order. To get only 3 blog posts, we'll combine
this `sort` query parameter with the `page` query parameter.

Our request looks like this:

```http
GET http://localhost/api/v1/posts?sort=-publishedAt&page[number]=1&page[size]=3 HTTP/1.1
Accept: application/vnd.api+json
```

Give it a go, and you should see the 3 most recently published `posts` resources
in the response.

## Sparse Fieldsets

The JSON:API specification has a feature called *Sparse Fieldsets*. This allows
an API client to request only specific fields in the response on a per-resource
type basis. The `fields` query parameter is used for this feature.

Let's say our API client was a frontend application. In this application, we
might want to display a list of blog posts - but only show the title, author
name and published date.

In this example, our client only needs the `author`, `publishedAt` and `title`
fields of the `posts` resource. For the `users` resource that will be in the
`author` relationship, we only need the `name` field (so that we can display
the author's name).

We can specify this in the request by listing these fields on a per-resource type
basis:

```
fields[posts]=author,publishedAt,title&fields[users]=name
```

As we want the author to be included in the response, we will need to use the
`include` path. We will also add page information so we only retrieve 5 results
at once. Putting these together, our request looks like this:

```http
GET http://localhost/api/v1/posts?fields[posts]=author,publishedAt,title&fields[users]=name&include=author&page[number]=1&page[size]=5 HTTP/1.1
Accept: application/vnd.api+json
```

Give this request a go, and you should see a response like this:

```http
HTTP/1.1 200 OK
Content-Type: application/vnd.api+json

{
  "meta": {
    "page": {
      "currentPage": 1,
      "from": 1,
      "lastPage": 16,
      "perPage": 5,
      "to": 5,
      "total": 76
    }
  },
  "jsonapi": {
    "version": "1.0"
  },
  "links": {
    "first": "http:\/\/localhost\/api\/v1\/posts?include=author&page%5Bnumber%5D=1&page%5Bsize%5D=5",
    "last": "http:\/\/localhost\/api\/v1\/posts?include=author&page%5Bnumber%5D=16&page%5Bsize%5D=5",
    "next": "http:\/\/localhost\/api\/v1\/posts?include=author&page%5Bnumber%5D=2&page%5Bsize%5D=5"
  },
  "data": [
    {
      "type": "posts",
      "id": "1",
      "attributes": {
        "publishedAt": "2021-11-04T17:30:52.000000Z",
        "title": "Welcome to Laravel JSON:API"
      },
      "relationships": {
        "author": {
          "links": {
            "related": "http:\/\/localhost\/api\/v1\/posts\/1\/author",
            "self": "http:\/\/localhost\/api\/v1\/posts\/1\/relationships\/author"
          },
          "data": {
            "type": "users",
            "id": "1"
          }
        }
      },
      "links": {
        "self": "http:\/\/localhost\/api\/v1\/posts\/1"
      }
    },
    {
      "type": "posts",
      "id": "3",
      "attributes": {
        "publishedAt": "1994-04-23T14:16:56.000000Z",
        "title": "sed impedit error et non"
      },
      "relationships": {
        "author": {
          "links": {
            "related": "http:\/\/localhost\/api\/v1\/posts\/3\/author",
            "self": "http:\/\/localhost\/api\/v1\/posts\/3\/relationships\/author"
          },
          "data": {
            "type": "users",
            "id": "6"
          }
        }
      },
      "links": {
        "self": "http:\/\/localhost\/api\/v1\/posts\/3"
      }
    },
    {
      "type": "posts",
      "id": "5",
      "attributes": {
        "publishedAt": "1993-01-18T02:55:30.000000Z",
        "title": "repudiandae impedit et facere sint"
      },
      "relationships": {
        "author": {
          "links": {
            "related": "http:\/\/localhost\/api\/v1\/posts\/5\/author",
            "self": "http:\/\/localhost\/api\/v1\/posts\/5\/relationships\/author"
          },
          "data": {
            "type": "users",
            "id": "4"
          }
        }
      },
      "links": {
        "self": "http:\/\/localhost\/api\/v1\/posts\/5"
      }
    },
    {
      "type": "posts",
      "id": "7",
      "attributes": {
        "publishedAt": "1985-07-15T01:17:17.000000Z",
        "title": "omnis est quis atque ipsum"
      },
      "relationships": {
        "author": {
          "links": {
            "related": "http:\/\/localhost\/api\/v1\/posts\/7\/author",
            "self": "http:\/\/localhost\/api\/v1\/posts\/7\/relationships\/author"
          },
          "data": {
            "type": "users",
            "id": "3"
          }
        }
      },
      "links": {
        "self": "http:\/\/localhost\/api\/v1\/posts\/7"
      }
    },
    {
      "type": "posts",
      "id": "9",
      "attributes": {
        "publishedAt": "1984-05-29T14:26:49.000000Z",
        "title": "earum provident sit tenetur sint"
      },
      "relationships": {
        "author": {
          "links": {
            "related": "http:\/\/localhost\/api\/v1\/posts\/9\/author",
            "self": "http:\/\/localhost\/api\/v1\/posts\/9\/relationships\/author"
          },
          "data": {
            "type": "users",
            "id": "6"
          }
        }
      },
      "links": {
        "self": "http:\/\/localhost\/api\/v1\/posts\/9"
      }
    }
  ],
  "included": [
    {
      "type": "users",
      "id": "1",
      "attributes": {
        "name": "Artie Shaw"
      },
      "links": {
        "self": "http:\/\/localhost\/api\/v1\/users\/1"
      }
    },
    {
      "type": "users",
      "id": "6",
      "attributes": {
        "name": "Araceli Kertzmann DDS"
      },
      "links": {
        "self": "http:\/\/localhost\/api\/v1\/users\/6"
      }
    },
    {
      "type": "users",
      "id": "4",
      "attributes": {
        "name": "Dr. Sasha Boehm II"
      },
      "links": {
        "self": "http:\/\/localhost\/api\/v1\/users\/4"
      }
    },
    {
      "type": "users",
      "id": "3",
      "attributes": {
        "name": "Joel Buckridge IV"
      },
      "links": {
        "self": "http:\/\/localhost\/api\/v1\/users\/3"
      }
    }
  ]
}
```

Notice how each `posts` resource now only has the `publishedAt` and `title`
attributes; and in the relationships, only `author` appears. Our `users`
resources that are in the top-level `included` member of the response only
have the `name` field.

This means our frontend application has received only the fields it actually
intends to display, which makes the response more efficient in terms of data
transfer size.

## Validating Query Parameters

When writing HTTP applications, it is important to ensure that data sent by a
client is always validated. In all of the above requests, Laravel JSON:API
performs some basic validation to ensure that the query parameters match what
is in the `PostSchema` class - e.g. ensuring that a provided `sort` parameter
is a field that is actually marked as sortable.

We can improve the validation to ensure there are some more specific rules,
e.g. ensuring the `author` filter only receives integer ids.

Run the following command:

```bash
vendor/bin/sail artisan jsonapi:query posts --collection
```

This will generate the `app/JsonApi/V1/Posts/PostCollectionQuery.php` file. This
is where we need to put the rules that apply to query parameters when the client
is requesting zero-to-many `posts` resources.

Open the file and make the following changes:

```diff
 namespace App\JsonApi\V1\Posts;

 use LaravelJsonApi\Laravel\Http\Requests\ResourceQuery;
 use LaravelJsonApi\Validation\Rule as JsonApiRule;

 class PostCollectionQuery extends ResourceQuery
 {

     /**
      * Get the validation rules that apply to the request query parameters.
      *
      * @return array
      */
     public function rules(): array
     {
         return [
             'fields' => [
                 'nullable',
                 'array',
                 JsonApiRule::fieldSets(),
             ],
             'filter' => [
                 'nullable',
                 'array',
                 JsonApiRule::filter(),
             ],
+            'filter.author' => 'array',
+            'filter.author.*' => 'integer',
+            'filter.id' => 'array',
+            'filter.id.*' => 'integer',
             'include' => [
                 'nullable',
                 'string',
                 JsonApiRule::includePaths(),
             ],
             'page' => [
                 'nullable',
                 'array',
                 JsonApiRule::page(),
             ],
+            'page.number' => ['integer', 'min:1'],
+            'page.size' => ['integer', 'between:1,100'],
             'sort' => [
                 'nullable',
                 'string',
                 JsonApiRule::sort(),
             ],
             'withCount' => [
                 'nullable',
                 'string',
                 JsonApiRule::countable(),
             ],
         ];
     }
 }
```

Here we have done a number of things:

- Our `filter[author]` will now only accept integers.
- Our `filter[id]` will also now only accept integers.
- The `page[number]` is correctly validated as an integer with a mimimum of `1`.
- The `page[size]` is correctly validated as an integer between `1` and `100`.

The following request now has an invalid page size:

```http
GET http://localhost/api/v1/posts?page[number]=1&page[size]=150 HTTP/1.1
Accept: application/vnd.api+json
```

Give it a go, and you'll see this response:

```http
HTTP/1.1 400 Bad Request
Content-Type: application/vnd.api+json

{
  "jsonapi": {
    "version": "1.0"
  },
  "errors": [
    {
      "detail": "The page.size must be between 1 and 100.",
      "source": {
        "parameter": "page.size"
      },
      "status": "400",
      "title": "Invalid Query Parameter"
    }
  ]
}
```

Notice that in the error above there is a `source.parameter` field that points
to where in the query parameters the error has occurred.

## In Summary

In this chapter, we covered fetching many blog posts in one request. We explored
several different JSON:API features - pagination, filtering, sorting and sparse
fieldsets.

That's the end of our tutorial. You should now have a good grasp of JSON:API,
and how Laravel JSON:API makes implementing this specification in Laravel
easy.

Good luck building your first Laravel JSON:API application!
