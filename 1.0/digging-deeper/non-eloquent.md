# Non-Eloquent Resources

[[toc]]

## Introduction

Some application may have objects that are not Eloquent models, that need to be
represented in your API as JSON:API resources. This is possible
using our `laravel-json-api/non-eloquent` package. This chapter describes
how to use that package to add *Non-Eloquent Resources* to your API.

:::tip
If you are using non-Eloquent resources, we assume you are comfortable with
exploring classes and interfaces via your IDE. This chapter does not document
everything you can do with non-Eloquent resources: so you will need to explore
the classes and interfaces as you build your non-Eloquent resources.
:::

### Example Scenario

To illustrate the capability in this chapter, we are going to use the following
example scenario. Imagine our Laravel application has a `Site` class which looks
something like this:

```php
namespace App\Entities;

use Illuminate\Contracts\Support\Arrayable;

class Site implements Arrayable
{

    /**
     * @var string
     */
    private string $slug;

    /**
     * @var string|null
     */
    private ?string $domain;

    /**
     * @var string|null
     */
    private ?string $name;

    /**
     * Create a new site entity from an array.
     *
     * @param string $slug
     * @param array $values
     * @return Site
     */
    public static function fromArray(string $slug, array $values)
    {
        $site = new self($slug);
        $site->setDomain($values['domain'] ?? null);
        $site->setName($values['name'] ?? null);

        return $site;
    }

    /**
     * Site constructor.
     *
     * @param string $slug
     */
    public function __construct(string $slug)
    {
        $this->slug = $slug;
    }

    /**
     * Get the site slug.
     *
     * @return string
     */
    public function getSlug(): string
    {
        return $this->slug;
    }

    /**
     * Get the site domain.
     *
     * @param string|null $domain
     * @return $this
     */
    public function setDomain(?string $domain): self
    {
        $this->domain = $domain ?: null;

        return $this;
    }

    /**
     * Get the site domain.
     *
     * @return string|null
     */
    public function getDomain(): ?string
    {
        return $this->domain;
    }

    /**
     * Set the site name.
     *
     * @param string|null $name
     * @return $this
     */
    public function setName(?string $name): self
    {
        $this->name = $name ?: null;

        return $this;
    }

    /**
     * Get the site's name.
     *
     * @return string|null
     */
    public function getName(): ?string
    {
        return $this->name;
    }

    // ...Other Getters & Setters...

    /**
     * @inheritDoc
     */
    public function toArray()
    {
        return [
            'domain' => $this->getDomain(),
            'name' => $this->getName(),
        ];
    }

}
```

You'll notice the `Site` entity is `Arrayable`. This is because our application
stores the site entities in a file in our application's `storage` directory.
Retrieving and storing `Site` entities occurs via a `SiteStorage` class,
which might look something like this:

```php

namespace App\Entities;

use Illuminate\Contracts\Filesystem\Filesystem;

class SiteStorage
{

    /**
     * @var Filesystem
     */
    private Filesystem $files;

    /**
     * @var array
     */
    private array $sites;

    /**
     * SiteStorage constructor.
     *
     * @param Filesystem $files
     */
    public function __construct(Filesystem $files)
    {
        $this->files = $files;
        $this->sites = json_decode($files->get('sites.json'), true);
    }

    /**
     * Find a site by its slug.
     *
     * @param string $slug
     * @return Site|null
     */
    public function find(string $slug): ?Site
    {
        if (isset($this->sites[$slug])) {
            return Site::fromArray($slug, $this->sites[$slug]);
        }

        return null;
    }

    /**
     * @return \Generator
     */
    public function cursor(): \Generator
    {
        foreach ($this->sites as $slug => $values) {
            yield $slug => Site::fromArray($slug, $values);
        }
    }

    /**
     * Get all sites.
     *
     * @return array
     */
    public function all(): array
    {
        return iterator_to_array($this->cursor());
    }

    /**
     * Store a site.
     *
     * @param Site $site
     * @return void
     */
    public function store(Site $site): void
    {
        $this->sites[$site->getSlug()] = $site->toArray();

        $this->write();
    }

    /**
     * Remove a site.
     *
     * @param Site|string $site
     * @return void
     */
    public function remove($site): void
    {
        if ($site instanceof Site) {
            $site = $site->getSlug();
        }

        unset($this->sites[$site]);

        $this->write();
    }

    /**
     * @return void
     */
    private function write(): void
    {
        $this->files->put('sites.json', json_encode($this->sites));
    }

}
```

## Installation

The first thing we need to do is add the `laravel-json-api/non-eloquent`
package to our application, via Composer:

```bash
composer require laravel-json-api/non-eloquent
```

## Concept & Initial Setup

For each *Non-Eloquent resource*, we need three classes: a `Schema`, `Resource`
and a `Repository`.

Unlike Eloquent schemas, our non-Eloquent schemas cannot be used to serialize
the class they represent to a JSON:API resource. This means that the `Resource`
class is compulsory for non-Eloquent resources (unlike the Eloquent ones, where
the `Resource` class is optional).

The `Repository` class is the class that plugs the non-Eloquent resource into
the JSON:API implementation. For Eloquent resources you do not need a
`Repository` class because our Eloquent implementation is able to use a generic
repository that works for all Eloquent models. However, in the non-Eloquent
implementation, we need you to write the `Repository` class as we do not know
how to interface with your non-Eloquent resource.

We will now create these three classes for our `Site` entity.

### Schema

To generate a schema for a non-Eloquent resource, using the `jsonapi:schema`
generator command with the `--non-eloquent` flag. For example:

```bash
php artisan jsonapi:schema sites --non-eloquent --model "\App\Entities\Site"
```

This will generate the following schema, which we will add some attributes to:

```php

namespace App\JsonApi\V1\Sites;

use App\Entities\Site;
use LaravelJsonApi\Contracts\Repository;
use LaravelJsonApi\Core\Schema\Schema;
use LaravelJsonApi\NonEloquent\Fields\Attribute;
use LaravelJsonApi\NonEloquent\Fields\ID;
use LaravelJsonApi\NonEloquent\Fields\ToMany;
use LaravelJsonApi\NonEloquent\Fields\ToOne;
use LaravelJsonApi\NonEloquent\Filters\Filter;

class SiteSchema extends Schema
{

    /**
     * The model the schema corresponds to.
     *
     * @var string
     */
    public static string $model = Site::class;

    /**
     * @inheritDoc
     */
    public function fields(): iterable
    {
        return [
            ID::make(),
            Attribute::make('domain'),
            Attribute::make('name'),
            ToOne::make('owner'),
            ToMany::make('tags'),
        ];
    }

    /**
     * @inheritDoc
     */
    public function filters(): iterable
    {
        return [
            Filter::make('slugs'),
        ];
    }

    /**
     * Get the resource repository.
     *
     * @return Repository
     */
    public function repository(): Repository
    {
        // @TODO
    }

}
```

There are a few things to note about this class. Unlike the Eloquent schema,
this schema extends `LaravelJsonApi\Core\Schema\Schema`, which is our base
abstract schema. Notice also that the fields use classes from the
`LaravelJsonApi\NonEloquent\Fields` namespace. These help you to define the
JSON:API fields for a non-Eloquent resource. You can use the following fields:

- `ID`: Similar to the Eloquent `ID` class, you can call `matchAs()` to set the
  ID pattern.
- `Attribute`: A generic attribute that takes the JSON:API field name for the
  attribute.
- `ToOne`: A generic relationship field for a *to-one* relationship.
- `ToMany`: A generic relationship field for a *to-many* relationship.

We also use the `LaravelJsonApi\NonEloquent\Filters\Filter` class to list
any filters that our resource supports. Note that this class is very basic: it
just lists the JSON:API filter key that is supported. You will need to implement
filtering yourself, as shown in the [Query All Capability](#query-all-capability)
later in this chapter.

### Resource

Generate a `Resource` class for your non-Eloquent resource using the
`jsonapi:resource` command:

```bash
php artisan jsonapi:resource sites
```

Our `SiteResource` will look like this:

```php
namespace App\JsonApi\V1\Sites;

use Illuminate\Http\Request;
use LaravelJsonApi\Core\Resources\JsonApiResource;

class SiteResource extends JsonApiResource
{

    /**
     * Get the resource id.
     *
     * @return string
     */
    public function id(): string
    {
        return $this->resource->getSlug();
    }

    /**
     * Get the resource's attributes.
     *
     * @param Request|null $request
     * @return iterable
     */
    public function attributes($request): iterable
    {
        return [
            'domain' => $this->resource->getDomain(),
            'name' => $this->resource->getName(),
        ];
    }

    /**
     * Get the resource's relationships.
     *
     * @param Request|null $request
     * @return iterable
     */
    public function relationships($request): iterable
    {
        return [
            $this->relation('owner')->withData($this->resource->getOwner()),
            $this->relation('tags')->withData($this->resource->getTags()),
        ];
    }
}
```

The only significant differences here are to do with the resource `id` and
the relationship `data` member.

In the non-Eloquent resource shown above, we have implemented the `id()` method.
Unlike our Eloquent implementation, the resource class does not know how to read
the `id` value from the `Site` class, so the `id()` method must be implemented.

In the relationships, we have also specified the `data` member of the
relationship using the `withData()` method. Again, this is omitted in Eloquent
resources because the Eloquent implementation knows how to get the value from a
model. However the non-Eloquent relationship does not know how to do this
automatically, so the data must be manually set.

### Repository

The final class we need to implement is our `SiteRepository`. We provide an
`AbstractRepository` for you to extend, so you'll need to create the class
that will look like this for our `sites` resource:

```php
namespace App\JsonApi\V1\Sites;

use App\Entities\SiteStorage;
use LaravelJsonApi\NonEloquent\AbstractRepository;

class SiteRepository extends AbstractRepository
{

    /**
     * @var SiteStorage
     */
    private SiteStorage $storage;

    /**
     * SiteRepository constructor.
     *
     * @param SiteStorage $storage
     */
    public function __construct(SiteStorage $storage)
    {
        $this->storage = $storage;
    }

    /**
     * @inheritDoc
     */
    public function find(string $resourceId): ?object
    {
        return $this->storage->find($resourceId);
    }

}
```

This class is pretty simple because the `AbstractRepository` implements the
majority of the compulsory repository methods. All you need to implement is
the `find` method. This receives a JSON:API resource ID and is expected to
return the object it represents (our `Site` class in this example) or `null`
if the resource with that id does not exist.

For our `Site` class we have used constructor dependency injection to inject
the `SiteStorage` class into our repository, so that we can retrieve the `Site`
object.

:::tip
If your non-Eloquent resource is not retrievable by a resource `id`, just
return `null` from the `find()` method.
:::

Once we have created our `SiteRepository`, we need to register it by adding
it to the `repository()` method on our `SiteSchema`:

```php
use LaravelJsonApi\Contracts\Store\Repository;

class SiteSchema extends Schema
{
    // ...other methods

    public function repository(): Repository
    {
        return SiteRepository::make()
            ->withServer($this->server)
            ->withSchema($this);
    }
}
```

There are a few things to note here. Firstly, the static `make()` method takes
care of using the Laravel container to construct the class,
allowing dependencies to be injected via the constructor. Secondly, we use
the `withServer()` and `withSchema()` methods to inject the JSON:API server
instance and the schema into the repository. This is because these may be
needed by the *Capabilities* that we can add to a repository.

:::tip
It is worth checking the implementation of the `exists()` and `findMany()`
methods on the `AbstractRepository` class. Both these methods are implemented
by using the `find` method. Depending on how you store and retrieve your
non-Eloquent classes (e.g. the `Site` class), you may be able to implement
these methods in a more efficient way. If this is the case, overload the
methods on your repository class.
:::

## Capabilities

Once we have completed the above steps, the following minimum *capabilities*
have been implemented for our `sites` resource:

- Retrieving a resource by its `id`, i.e. `GET /api/v1/sites/{slug}`.
- Retrieving resource relationship values, i.e. `GET /api/v1/sites/{slug}/{field}`
  and `GET /api/v1/sites/{slug}/relationships/{field}`.
- Parsing resource identifiers in JSON:API documents that have the `sites`
  resource `type`.

This is because our implementation now understands how to retrieve a `sites`
resource via the `SiteRepository::find()` method, and can retrieve the value
of a relationship by reading it from the `SiteResource` class.

All other *capabilities*, e.g. creating, updating and deleting a `sites`
resource, can be added to your `SiteRepository` class. You only need to add the
capabilities you want to support. For example, if a `sites` resource can be
created via your API you will need to add the create capability. However, if
you do not need `sites` resources to be deleted via the API, you never need
to implement a delete capability.

The following capabilities can be added to a repository:

- [Query All](#query-all-capability) for retrieving zero-to-many resources.
- [CRUD](#crud-capability) if your resource can be created, read, updated *and* deleted.
- [Create](#create-capability) if your resource can be created.
- [Modify](#modify-capability) if your resource can be updated.
- [Delete](#delete-capability) if your resource can be deleted.
- [Modify Relations](#modify-relations-capability) if your resource's relationships
  can be modified via relationship endpoints.

In addition, while the following capabilities already exist on the `AbstractRepository`,
you can re-implement them if you need to write custom behaviour:

- [Query One](#query-one-capability) for retrieving zero-to-one resource.
- [Query To-One](#query-to-one-capability) for retrieving the value of a to-one relationship.
- [Query To-Many](#query-to-many-capability) for retrieving the value of a to-many relationship.

:::tip
To add capabilities to your repository, you typically need to add an interface
and then a method that returns your capability class. One other thing to note...
In the example capabilities you will notice we put the capabilities in the
`App\JsonApi\V1\Sites\Capabilities` namespace. It is totally up to you whether
you put the capability classes in the `Sites` namespace or a sub-namespace.
:::

### Query All Capability

This capability allows your resource to be retrieved on the index route, i.e.
this request:

```http
GET /api/v1/sites HTTP/1.1
Accept: application/vnd.api+json
```

To implement this capability, create a new class that extends the
`LaravelJsonApi\NonEloquent\Capabilities\QueryAll` class. For example:

```php
namespace App\JsonApi\V1\Sites\Capabilities;

use App\Entities\SiteStorage;
use LaravelJsonApi\NonEloquent\Capabilities\QueryAll;

class QuerySites extends QueryAll
{

    /**
     * @var SiteStorage
     */
    private SiteStorage $sites;

    /**
     * QuerySites constructor.
     *
     * @param SiteStorage $sites
     */
    public function __construct(SiteStorage $sites)
    {
        parent::__construct();
        $this->sites = $sites;
    }

    /**
     * @inheritDoc
     */
    public function get(): iterable
    {
        return $this->sites->all();
    }

}
```

Once you have written this class, you must add it to your repository, by:

1. Adding the `LaravelJsonApi\Contracts\Store\QueriesAll` interface to your
repository; AND
2. Returning the capability from the `queryAll()` method.

For example, on our `SiteRepository`:

```php
namespace App\JsonApi\V1\Sites;

use LaravelJsonApi\Contracts\Store\QueriesAll;
use LaravelJsonApi\Contracts\Store\QueryManyBuilder;
use LaravelJsonApi\NonEloquent\AbstractRepository;

class SiteRepository extends AbstractRepository implements QueriesAll
{

    // ...

    /**
     * @inheritDoc
     */
    public function queryAll(): QueryManyBuilder
    {
        return Capabilities\QuerySites::make()
            ->withServer($this->server)
            ->withSchema($this->schema);
    }

}
```

:::tip
The `make()` method on the capability class takes care of any constructor
dependency injection, and we use the `withServer()` and `withSchema()` methods
to inject the JSON:API server and schema in case these are needed in the
capability.
:::

Our `QuerySites` capability implements the `get()` method. At its most basic
implementation, this returns *all* the resources that should be listed for an
index request. In the above example, we return all the `Site` objects from our
`SiteStorage` class.

You can use the `get()` method to implement other features as needed. For example,
our `SiteSchema` had a `slugs` filter on it. We could implement that in our
`QuerySites` class by updating the `get()` method:

```php
public function get(): iterable
{
    $sites = collect($this->sites->all());
    $filters = $this->queryParameters->filter();

    if ($filters && is_array($slugs = $filters->value('slugs'))) {
        $sites = $sites->filter(
            fn(Site $site) => in_array($site->getSlug(), $slugs)
        );
    }

    return $sites;
}
```

This would mean the following request would be supported:

```http
GET /api/v1/sites?filter[slugs][]=foo&filter[slugs][]=bar HTTP/1.1
Accept: application/vnd.api+json
```

:::tip
The `QuerySites` capability is also where support for pagination is added,
if needed. See the [Pagination](#pagination) section for examples.
:::

### CRUD Capability

This capability allows your resource to be created, updated and deleted,
using a single class to add all these capabilities.

To implement this capability, create a new class that extends the
`LaravelJsonApi\NonEloquent\Capabilities\Crud` class. For example:

```php
namespace App\JsonApi\V1\Sites\Capabilities;

use App\Entities\Site;
use App\Entities\SiteStorage;
use LaravelJsonApi\NonEloquent\Capabilities\Crud;

class CrudSite extends Crud
{

    /**
     * @var SiteStorage
     */
    private SiteStorage $storage;

    /**
     * CrudSite constructor.
     *
     * @param SiteStorage $storage
     */
    public function __construct(SiteStorage $storage)
    {
        parent::__construct();
        $this->storage = $storage;
    }

    /**
     * Create a new site.
     *
     * @param array $validatedData
     * @return Site
     */
    public function create(array $validatedData): Site
    {
        $site = Site::fromArray($validatedData['slug'], $validatedData);

        $this->storage->store($site);

        return $site;
    }

    /**
     * Update the supplied site.
     *
     * @param Site $site
     * @param array $validatedData
     * @return void
     */
    public function update(Site $site, array $validatedData): void
    {
        if (array_key_exists('domain', $validatedData)) {
            $site->setDomain($validatedData['domain']);
        }

        if (array_key_exists('name', $validatedData)) {
            $site->setName($validatedData['name']);
        }

        if (array_key_exists('owner', $validatedData)) {
            $site->setOwner($this->toOne($validatedData['owner']));
        }

        if (isset($validatedData['tags'])) {
            $site->setTags(...$this->toMany($validatedData['tags']));
        }

        $this->storage->store($site);
    }

    /**
     * Delete the supplied site.
     *
     * @param Site $site
     * @return void
     */
    public function delete(Site $site): void
    {
        $this->storage->remove($site);
    }
}
```

Once you have written this CRUD class, you must add it to your repository, by:

1. Adding the `CreatesResources`, `UpdatesResources` and `DeletesResources`
interfaces to your repository; AND
2. Adding the `HasCrudCapability` trait to your repository; AND
3. Returning your CRUD Capability class from the `crud()` method.

For example, on our `SiteRepository` class:

```php
namespace App\JsonApi\V1\Sites;

use LaravelJsonApi\Contracts\Store\CreatesResources;
use LaravelJsonApi\Contracts\Store\DeletesResources;
use LaravelJsonApi\Contracts\Store\UpdatesResources;
use LaravelJsonApi\NonEloquent\AbstractRepository;
use LaravelJsonApi\NonEloquent\Capabilities\Crud;
use LaravelJsonApi\NonEloquent\Concerns\HasCrudCapability;

class SiteRepository extends AbstractRepository implements
    CreatesResources,
    UpdatesResources,
    DeletesResources
{

    use HasCrudCapability;

    // ...

    /**
     * @inheritDoc
     */
    protected function crud(): Crud
    {
        return Capabilities\Crud::make();
    }

}
```

:::tip
The CRUD capabilty's `make()` method takes care of any constructor dependency
injection. Note that unlike other capabilities, we do not need to call the
`withServer()` and `withSchema()` methods on our capability. This is because
the `HasCrudCapability` trait takes care of this for you.
:::

As you can see from the example `CrudSite` capability shown above, the class
implements three methods: `create`, `update` and `delete`. Each method implements
the relevant logic.

Note that in the example above, the `update()` method calls the `toOne()` and
`toMany()` helper methods. These take care of converting JSON:API relationship
identifiers to instances of the classes that the identifiers represent. This
enables you to set relationship as needed, without having to worry about how
to look up related classes from JSON:API identifiers.

### Create Capability

This capability allows API clients to create resources, i.e. this request:

```http
POST /api/v1/sites HTTP/1.1
Accept: application/vnd.api+json
Content-Type: application/vnd.api+json

{
    //...
}
```

To implement this capability, create a new class that extends the
`LaravelJsonApi\NonEloquent\Capabilities\CreateResource` class. For example:

```php
namespace App\JsonApi\V1\Sites\Capabilities;

use App\Entities\Site;
use App\Entities\SiteStorage;
use LaravelJsonApi\NonEloquent\Capabilities\CreateResource;

class CreateSite extends CreateResource
{

    /**
     * @var SiteStorage
     */
    private SiteStorage $storage;

    /**
     * CreateSite constructor.
     *
     * @param SiteStorage $storage
     */
    public function __construct(SiteStorage $storage)
    {
        parent::__construct();
        $this->storage = $storage;
    }

    /**
     * Create a new site.
     *
     * @param array $validatedData
     * @return Site
     */
    public function create(array $validatedData): Site
    {
        $owner = $this->toOne($validatedData['owner'] ?? null);
        $tags = $this->toMany($validatedData['tags'] ?? []);

        $site = new Site($validatedData['slug']);
        $site->setDomain($validatedData['domain'] ?? null);
        $site->setName($validatedData['name'] ?? null);
        $site->setOwner($owner);
        $site->setTags(...$tags);

        $this->storage->store($site);

        return $site;
    }

}
```

Once you have written this class, you must add it to your repository, by:

1. Adding the `LaravelJsonApi\Contracts\Store\CreatesResources` interface to
your repository; AND
2. Returning the capability from the `create()` method.

For example, on our `SiteRepository`:

```php
namespace App\JsonApi\V1\Sites;

use LaravelJsonApi\Contracts\Store\CreatesResources;
use LaravelJsonApi\Contracts\Store\ResourceBuilder;
use LaravelJsonApi\NonEloquent\AbstractRepository;

class SiteRepository extends AbstractRepository implements CreatesResources
{

    // ...

    /**
     * @inheritDoc
     */
    public function create(): ResourceBuilder
    {
        return Capabilities\CreateSite::make()
            ->withServer($this->server)
            ->withSchema($this->schema);
    }

}
```

:::tip
As with other capabilities, the `make()` method takes care of constructor
dependency injection, while the `withServer()` and `withSchema()` methods
inject the JSON:API server and schema in case they are needed within the
capability.
:::

Our `CreateSite` capability class is relatively simple: it implements a
`create` method. This receives the validated data received from the API client,
and returns the created `Site` object.

Note that if the validated data contains JSON:API resource identifiers for
relationships, you can use the `toOne()` and `toMany()` methods to convert
the identifiers to actual instances of the related classes. This makes it
easy to set relationships when creating new resources - as shown in the
`CreateSite` example above.

### Modify Capability

This capability allows API clients to update resources, i.e. this request:

```http
PATCH /api/v1/sites/<SLUG> HTTP/1.1
Accept: application/vnd.api+json
Content-Type: application/vnd.api+json

{
    //...
}
```

To implement this capability, create a new class that extends the
`LaravelJsonApi\NonEloquent\Capabilities\ModifyResource` class. For example:

```php
namespace App\JsonApi\V1\Sites\Capabilities;

use App\Entities\Site;
use App\Entities\SiteStorage;
use LaravelJsonApi\NonEloquent\Capabilities\ModifyResource;

class ModifySite extends ModifyResource
{

    /**
     * @var SiteStorage
     */
    private SiteStorage $storage;

    /**
     * ModifySite constructor.
     *
     * @param SiteStorage $storage
     */
    public function __construct(SiteStorage $storage)
    {
        parent::__construct();
        $this->storage = $storage;
    }

    /**
     * Update the site.
     *
     * @param Site $site
     * @param array $validatedData
     * @return Site
     */
    public function update(Site $site, array $validatedData): Site
    {
        if (array_key_exists('domain', $validatedData)) {
            $site->setDomain($validatedData['domain']);
        }

        if (array_key_exists('name', $validatedData)) {
            $site->setName($validatedData['name']);
        }

        if (array_key_exists('owner', $validatedData)) {
            $site->setOwner($this->toOne($validatedData['owner']));
        }

        if (isset($validatedData['tags'])) {
            $site->setTags(...$this->toMany($validatedData['tags']));
        }

        $this->storage->store($site);

        return $site;
    }

}
```
Once you have written this class, you must add it to your repository, by:

1. Adding the `LaravelJsonApi\Contracts\Store\UpdatesResources` interface to
your repository; AND
2. Returning the capability from the `update()` method.

For example, on our `SiteRepository`:

```php
namespace App\JsonApi\V1\Sites;

use LaravelJsonApi\Contracts\Store\CreatesResources;
use LaravelJsonApi\Contracts\Store\ResourceBuilder;
use LaravelJsonApi\NonEloquent\AbstractRepository;

class SiteRepository extends AbstractRepository implements CreatesResources
{

    // ...

    /**
     * @inheritDoc
     */
    public function update($modelOrResourceId): ResourceBuilder
    {
        return Capabilities\ModifySite::make()
            ->withServer($this->server)
            ->withSchema($this->schema)
            ->withRepository($this)
            ->withModelOrResourceId($modelOrResourceId);
    }

}
```

:::tip
As with other capabilities, the `make()` method takes care of constructor
dependency injection, while the `withServer()` and `withSchema()` methods
inject the JSON:API server and schema in case they are needed within the
capability.

With this capability we also inject the repository via the `withRepository()`
method, and pass in the `$modelOrResourceId` that is being updated.
:::

Our `ModifySite` capability class is relatively simple: it implements an
`update` method. This receives the `Site` being updated and the validated data
received from the API client.

Note that if the validated data contains JSON:API resource identifiers for
relationships, you can use the `toOne()` and `toMany()` methods to convert
the identifiers to actual instances of the related classes.

### Delete Capability

This capability allows API clients to delete resource, i.e. this request:

```http
DELETE /api/v1/sites/<SLUG> HTTP/1.1
Accept: application/vnd.api+json
```

This capability does not need a separate capability class - it is implemented
on the repository by:

1. Adding the `LaravelJsonApi\Contracts\Store\DeletesResources` interface to the
repository; AND
2. Implementing the `delete` method.

For example, on our `SiteRepository`:

```php
namespace App\JsonApi\V1\Sites;

use LaravelJsonApi\Contracts\Store\DeletesResources;
use LaravelJsonApi\NonEloquent\AbstractRepository;

class SiteRepository extends AbstractRepository implements DeletesResources
{

    // ...

    /**
     * @inheritDoc
     */
    public function delete($modelOrResourceId): void
    {
        if (\is_string($modelOrResourceId)) {
            $site = $this->findOrFail($modelOrResourceId);
        } else {
            $site = $modelOrResourceId;
        }

        $this->storage->remove($site);
    }

}
```

As the delete method receives either a string resource `id` or the actual
model itself (in this case, the `Site` object), we handle both as shown in
the example. Afterwards, we take care of deleting the object, which in this
case involves calling the `SiteStorage::remove()` method.

### Modify Relations Capability

This capability allows API clients to modify a resource's relationships
via relationship endpoints. For example:

```http
PATCH /api/v1/sites/<SLUG>/relationships/tags HTTP/1.1
Accept: application/vnd.api+json
Content-Type: application/vnd.api+json

{
    // ...
}
```

To implement this capability, create a new class that extends the
`LaravelJsonApi\NonEloquent\Capabilities\ModifyRelations` class. For example:

```php
namespace App\JsonApi\Sites\Capabilities;

use App\Entities\Site;
use App\Entities\SiteStorage;
use App\Entities\Tag;
use App\Entities\User;
use LaravelJsonApi\NonEloquent\Capabilities\ModifyRelations;

class ModifySiteRelationships extends ModifyRelations
{

    /**
     * @var SiteStorage
     */
    private SiteStorage $storage;

    /**
     * ModifySiteRelationships constructor.
     *
     * @param SiteStorage $storage
     */
    public function __construct(SiteStorage $storage)
    {
        parent::__construct();
        $this->storage = $storage;
    }

    /**
     * Set the owner relationship.
     *
     * @param Site $site
     * @param User|null $user
     * @return void
     */
    public function setOwner(Site $site, ?User $user): void
    {
        $site->setOwner($user);

        $this->storage->store($site);
    }

    /**
     * Set the tags relationship.
     *
     * @param Site $site
     * @param array $tags
     */
    public function setTags(Site $site, array $tags): void
    {
        $site->setTags(...$tags);

        $this->storage->store($site);
    }

    /**
     * Attach tags to the provided site.
     *
     * @param Site $site
     * @param array $tags
     */
    public function attachTags(Site $site, array $tags): void
    {
        $all = collect($site->getTags())
            ->merge($tags)
            ->unique(fn (Tag $tag) => $tag->getSlug());

        $site->setTags(...$all);

        $this->storage->store($site);
    }

    /**
     * Detach tags from the provided site.
     *
     * @param Site $site
     * @param array $tags
     * @return void
     */
    public function detachTags(Site $site, array $tags): void
    {
        $remove = collect($tags)
            ->map(fn(Tag $tag) => $tag->getSlug());

        $all = collect($site->getTags())
            ->reject(fn(Tag $tag) => $remove->contains($tag->getSlug()));

        $site->setTags(...$all);

        $this->storage->store($site);
    }
}
```

Once you have written this class, you must add it to your repository, by:

1. Adding the `LaravelJsonApi\Contracts\Store\ModifiesToOne` and `ModifiesToMany`
interfaces to your repository; AND
2. Adding the `HasModifyRelationsCapability` trait to your repository; AND
3. Implementing the `relations()` method on your repository.

For example, on our `SiteRepository`:

```php
namespace App\JsonApi\V1\Sites;

use LaravelJsonApi\Contracts\Store\ModifiesToOne;
use LaravelJsonApi\Contracts\Store\ModifiesToMany;
use LaravelJsonApi\NonEloquent\AbstractRepository;
use LaravelJsonApi\NonEloquent\Capabilities\Crud;
use LaravelJsonApi\NonEloquent\Concerns\HasModifyRelationsCapability;

class SiteRepository extends AbstractRepository implements
    ModifiesToOne,
    ModifiesToMany
{

    use HasModifyRelationsCapability;

    // ...

    /**
     * @inheritDoc
     */
    protected function relations(): ModifyRelations
    {
        return ModifySiteRelationships::make();
    }

}
```

:::tip
The capabilty's `make()` method takes care of any constructor dependency
injection. Note that unlike other capabilities, we do not need to call the
`withServer()` and `withSchema()` methods on our capability. This is because
the `HasModifyRelationsCapability` trait takes care of this for you.
:::

As you can see from the `ModifySiteRelationships` example above, we support
modifying specific relations by adding methods to the capability class.

For a *to-one* relationship, we add a method called `set<Relation>`, e.g.
in our example class the `setOwner` method. This receives the `Site` that
is being modified and the related class or `null`.

For a *to-many* relationship, we can add the following methods:

- `set<Relation>`, to completely replace the relationship value.
- `attach<Relation>`, to attach objects to the relationship.
- `detach<Relation`, to remove objects from the relationship.

The *to-many* methods receive the `Site` that is being modified, and an array
of the related objects. This is shown in the example `setTags()`, `attachTags()`
and `detachTags()` methods above.

### Query One Capability

This capability is already implemented on our `AbstractRepository` class, and
allows a resource to be retrieved using its resource `id`, i.e. this request:

```http
GET /api/v1/sites/<SLUG> HTTP/1.1
Accept: application/vnd.api+json
```

You only need to implement this capability yourself if you want to add
additional features. For example, you might want to support filters, such as
this request:

```http
GET /api/v1/sites/<SLUG>?filter[name]=Test HTTP/1.1
Accept: application/vnd.api+json
```

In this example, the client is asking whether the site with the provided slug
has a name of `Test`. To support this, we will either need to add our own
*query-one* capability; or if we are already using the *CRUD* capability, we
can add it to that class.

To implement this capability when not using the *CRUD* capability, create a new
class that extends the `LaravelJsonApi\NonEloquent\Capabilities\QueryOne` class.
For example:

```php
namespace App\JsonApi\V1\Sites\Capabilities;

use App\Entities\Site;
use Illuminate\Support\Str;
use LaravelJsonApi\NonEloquent\Capabilities\QueryOne;

class QuerySite extends QueryOne
{

    /**
     * Read the supplied site.
     *
     * @param Site $site
     * @return Site|null
     */
    public function read(Site $site): ?Site
    {
        $filters = $this->queryParameters->filter();

        if ($filters && $name = $filters->value('name')) {
            return Str::contains($site->getName(), $name) ? $site : null;
        }

        return $site;
    }

}
```

We would then need to add this capability to our repository, by overloading
the `queryOne()` method to return our `QuerySite` class:

```php
namespace App\JsonApi\V1\Sites;

use LaravelJsonApi\Contracts\Store\QueryOneBuilder;
use LaravelJsonApi\NonEloquent\AbstractRepository;

class SiteRepository extends AbstractRepository
{

    // ...

    /**
     * @inheritDoc
     */
    public function queryOne($modelOrResourceId): QueryOneBuilder
    {
        return Capabilities\QuerySite::make()
            ->withServer($this->server)
            ->withSchema($this->schema)
            ->withRepository($this)
            ->withModelOrResourceId($modelOrResourceId);
    }

}
```

If you are using the *CRUD* capability, then just add the `read()` method
(as shown above on the `QuerySite` class) to your CRUD capability class.
You **do not** need to make any changes to your repository when doing this.

### Query To-One Capability

This capability is already implemented on our `AbstractRepository` class, and
allows a relationship to be read using a relationship endpoint. For example:

```http
GET /api/v1/sites/<SLUG>/owner HTTP/1.1
Accept: application/vnd.api+json
```

You only need to implement this capability yourself if you want to add additional
features, for example supporting filters.

To implement this capability, create a new class that extends the
`LaravelJsonApi\NonEloquent\Capabilities\QueryToOne` class. For example:

```php
namespace App\JsonApi\V1\Sites\Capabilities;

use LaravelJsonApi\NonEloquent\Capabilities\QueryToOne;

class QuerySiteToOneRelation extends QueryToOne
{

    /**
     * Read the site's owner relationship.
     *
     * @param Site $site
     * @return User|null
     */
    public function getOwner(Site $site): ?User
    {
        $user = $site->getOwner();

        // implement any features you want, e.g. filters.

        return $user;
    }

}
```

We would then need to add this capability to our repository, by overloading
the `queryToOne()` method to return the `QuerySiteToOneRelation` capability:

```php
namespace App\JsonApi\V1\Sites;

use LaravelJsonApi\Contracts\Store\QueryOneBuilder;
use LaravelJsonApi\NonEloquent\AbstractRepository;

class SiteRepository extends AbstractRepository
{

    // ...

    /**
     * @inheritDoc
     */
    public function queryToOne($modelOrResourceId, string $fieldName): QueryOneBuilder
    {
      return Capabilities\QuerySiteToOneRelation::make()
          ->withServer($this->server)
          ->withSchema($this->schema)
          ->withRepository($this)
          ->withModelOrResourceId($modelOrResourceId)
          ->withFieldName($fieldName);
    }

}
```

As shown in the above examples, we implement a `get<FieldName>` method on the
capability class. This is where we can add features, such as filters.

If you do not implement a method for a relationship field, the capability class
falls back to our default implementation. This is to read the relationship value
from the resource class, i.e. `SiteResource` in our example.

### Query To-Many Capability

This capability is already implemented on our `AbstractRepository` class, and
allows a relationship to be read using a relationship endpoint. For example:

```http
GET /api/v1/sites/<SLUG>/tags HTTP/1.1
Accept: application/vnd.api+json
```

You only need to implement this capability yourself if you want to add
additional features, for example supporting filters.

To implement this capability, create a new class that extends the
`LaravelJsonApi\NonEloquent\Capabilities\QueryToMany` class. For example:

```php
namespace App\JsonApi\V1\Sites\Capabilities;

use LaravelJsonApi\NonEloquent\Capabilities\QueryToMany;

class QuerySiteToManyRelation extends QueryToMany
{

    /**
     * Read the site's tags relationship.
     *
     * @param Site $site
     * @return array
     */
    public function getTags(Site $site): array
    {
        $tags = $site->getTags();

        // implement any features you want, e.g. filters.

        return $tags;
    }

}
```
We would then need to add this capability to our repository, by overloading
the `queryToMany()` method to return the `QuerySiteToOneRelation` capability:

```php
namespace App\JsonApi\V1\Sites;

use LaravelJsonApi\Contracts\Store\QueryManyBuilder;
use LaravelJsonApi\NonEloquent\AbstractRepository;

class SiteRepository extends AbstractRepository
{

    // ...

    /**
     * @inheritDoc
     */
    public function queryToMany($modelOrResourceId, string $fieldName): QueryManyBuilder
    {
      return Capabilities\QuerySiteToManyRelation::make()
          ->withServer($this->server)
          ->withSchema($this->schema)
          ->withRepository($this)
          ->withModelOrResourceId($modelOrResourceId)
          ->withFieldName($fieldName);
    }

}
```

As shown in the above examples, we implement a `get<FieldName>` method on the
capability class. This is where we can add features, such as filters.

If you do not implement a method for a relationship field, the capability class
falls back to our default implementation. This is to read the relationship value
from the resource class, i.e. `SiteResource` in our example.

## Pagination

If you want to support pagination, you can add this to your
[Query All](#query-all-capability) capability. For ease of use, we provide
an `EnumerablePagination` implementation, that paginates your data using the
Laravel's [collection `forPage()` method](https://laravel.com/docs/collections#method-forpage).
However, you can also use your own pagination implementation if required.

### Enumerable Pagination

This pagination uses Laravel's `Enumerable::forPage()` method to paginate
your resources. Effectively this works by loading all matching resources,
then using the `forPage()` method to reduce the collection to a specific page.

Firstly, you will need to return an instance of the
`LaravelJsonApi\NonEloquent\Pagination\EnumerablePagination` class from
your schema's `pagination` method. For example, on our `SiteSchema`:

```php
use LaravelJsonApi\Core\Schema\Schema;
use LaravelJsonApi\NonEloquent\Pagination\EnumerablePagination;

class SiteSchema extends Schema
{

    // ...

    /**
     * @inheritDoc
     */
    public function pagination(): ?Paginator
    {
        return EnumerablePagination::make();
    }

}
```

The `EnumerablePagination` class has the same methods as our Eloquent
`PagePagination` class, so you can refer
[to the documentation for that class](../schemas/pagination.md#page-based-pagination)
for available methods. For example, if we wanted to customise the page keys:

```php
EnumerablePagination::make()
    ->withPageKey('page')
    ->withPerPageKey('limit');
```

Once we've added the paginator to our schema, we then need to update our
*query-all* class, making the following changes:

1. Adding the `LaravelJsonApi\Contracts\Store\HasPagination` interface; AND
2. Adding the `LaravelJsonApi\NonEloquent\Concerns\PaginatesEnumerables` trait.

For example, on our `QuerySites` class:

```php
namespace App\JsonApi\Sites\Capabilities;

use App\Entities\Site;
use App\Entities\SiteStorage;
use LaravelJsonApi\Contracts\Store\HasPagination;
use LaravelJsonApi\NonEloquent\Capabilities\QueryAll;
use LaravelJsonApi\NonEloquent\Concerns\PaginatesEnumerables;

class QuerySites extends QueryAll implements HasPagination
{

    use PaginatesEnumerables;

    /**
     * @var SiteStorage
     */
    private SiteStorage $sites;

    /**
     * QuerySites constructor.
     *
     * @param SiteStorage $sites
     */
    public function __construct(SiteStorage $sites)
    {
        parent::__construct();
        $this->sites = $sites;
    }

    /**
     * @inheritDoc
     */
    public function get(): iterable
    {
        $sites = collect($this->sites->all());
        $filters = $this->queryParameters->filter();

        if ($filters && is_array($slugs = $filters->value('slugs'))) {
            $sites = $sites->filter(
                fn(Site $site) => in_array($site->getSlug(), $slugs)
            );
        }

        return $sites->values();
    }

}
```

Now that our capability is updated, our `sites` resource now supports the
following request:

```http
GET /api/v1/sites?page[number]=1&page[size]=25
Accept: application/vnd.api+json
```

Under the hood, the `PaginatesEnumerables` trait adds methods that use
`QuerySites::get()` to retrieve all of the sites, then the correct page is
pulled out using Laravel's `Enumerable::forPage()` method.

### Custom Pagination

If you need to write your own pagination strategy for your non-Eloquent resource,
you will need to write two classes:

- A paginator class, that implements the `LaravelJsonApi\Contracts\Pagination\Paginator`
interface. This is the class you return from a schema's `pagination()` method.
- A page class, that extends the `LaravelJsonApi\Core\Pagination\AbstractPage`
class.

We strongly recommend taking a look at our `EnumerablePagination` and
`EnumerablePage` classes, to see how we have implemented the enumerable
pagination capability.
[Those classes can be viewed here.](https://github.com/laravel-json-api/non-eloquent/tree/develop/src/Pagination)

Once you have written those classes, you will need to return an instance of the
pagination class from your schema's `pagination()` method. (See the example
`SiteSchema::pagination()` method above, that returns an instance of the
`EnumerablePagination` class.)

Then you will need to update your *query-all* capability class, by:

1. Adding the `LaravelJsonApi\Contracts\Store\HasPagination` interface; AND
2. Adding the `paginate()` and `getOrPaginate()` methods to your query-all capability.

For example:

```php
namespace App\JsonApi\Sites\Capabilities;

use App\Entities\Site;
use App\Entities\SiteStorage;
use LaravelJsonApi\Contracts\Pagination\Page;
use LaravelJsonApi\Contracts\Store\HasPagination;
use LaravelJsonApi\NonEloquent\Capabilities\QueryAll;

class QuerySites extends QueryAll implements HasPagination
{

    // ...

    /**
     * @inheritDoc
     */
    public function get(): iterable
    {
        return $this->sites->all();
    }

    /**
     * @inheritDoc
     */
    public function paginate(array $page): Page
    {
        // an instance of your custom paginator...
        $paginator = $this->schema()->pagination();

        // ...return your custom page class using the settings from the paginator.
    }

    /**
     * @inheritDoc
     */
    public function getOrPaginate(?array $page): iterable
    {
        if (empty($page)) {
            return $this->get();
        }

        return $this->paginate($page);
    }

}
```

As shown in the above example, the `paginate()` method needs to retrieve the
paginator instance from the schema. It then uses the settings on that to return
a page - the logic for doing that will be down to you to implement based on how
your custom pagination works. Typically we implement a method on the paginator
class to execute the pagination.

You also need to implement the `getOrPaginate()` method. Typically you can copy
and paste the example method above. This returns a page if the client has
provided page parameters, otherwise it returns all the results using the
query-all capability's `get()` method.

## Singular Filters

Typically a query-all capability will return *zero-to-many* resources. Singular
filters are filters that change the result of the request to returning
*zero-to-one* resource, i.e. the resource object or `null`.

If you want to support singular filters on your non-Eloquent resource, you
will need to:

1. Add the `LaravelJsonApi\Contracts\Store\HasSingularFilters` to your query-all
capability class; AND
2. Implement the `firstOrMany()` and `firstOrPaginate()` methods to your
capability class.

In this example, we are going to add a `slug` singular filter to our `sites`
resource. We will make these changes to the `QuerySites` class as follows:

```php
namespace App\JsonApi\Sites\Capabilities;

use App\Entities\Site;
use App\Entities\SiteStorage;
use LaravelJsonApi\Contracts\Store\HasPagination;
use LaravelJsonApi\Contracts\Store\HasSingularFilters;
use LaravelJsonApi\NonEloquent\Capabilities\QueryAll;
use LaravelJsonApi\NonEloquent\Concerns\PaginatesEnumerables;

class QuerySites extends QueryAll implements HasPagination, HasSingularFilters
{

    use PaginatesEnumerables;

    /**
     * @var SiteStorage
     */
    private SiteStorage $sites;

    /**
     * QuerySites constructor.
     *
     * @param SiteStorage $sites
     */
    public function __construct(SiteStorage $sites)
    {
        parent::__construct();
        $this->sites = $sites;
    }

    /**
     * @inheritDoc
     */
    public function get(): iterable
    {
        return $this->sites->all();
    }

    /**
     * @inheritDoc
     */
    public function firstOrMany()
    {
        $filters = $this->queryParameters->filter();

        if ($filters && $filters->exists('slug')) {
            return $this->sites->find(
                $filters->value('slug')
            );
        }

        return $this->get();
    }

    /**
     * @inheritDoc
     */
    public function firstOrPaginate(?array $page)
    {
        if (empty($page)) {
            return $this->firstOrMany();
        }

        return $this->paginate($page);
    }

}
```

As you can see from the example, we implement the singular filter in the
`firstOrMany()` method. This checks for the existence of the `slug` filter,
and if it exists, returns the matching `Site` class via the `SiteStorage::find()`
method. Otherwise it returns the value from the `get()` method - i.e. the list
of resources.

You also need to implement the `firstOrPaginate()` method. Typically you can copy
and paste the example method above. This returns the `firstOrMany()` method
if the client has not provided page parameters; otherwise it returns the page
from the `paginate()` method. If your resource **does not** support pagination,
the `firstOrPaginate()` method should always return the result from the
`firstOrMany()` method.
