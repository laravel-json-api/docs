# 8. Fetching Resources

[[toc]]

## Introduction

In previous chapters, we've learnt how to use JSON:API requests to create,
read, update and delete a single blog post. In this chapter we'll explore how
you can use the JSON:API specification to retrieve multiple blog posts in one
request.

We'll learn how to:

- paginate the resources returned in the response;
- filter resources; and
- sort resources.

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
vendor/bin/sail make:factory PostFactory
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
