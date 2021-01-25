# Core Concepts

[[toc]]

## Servers

Your Laravel application can have any number of JSON:API compliant
APIs. We refer to each API as a **Server**.

You do not have to use multiple servers: a simple application
may only have one server. However, there are a number of use cases where
you may decide to implement multiple servers. For example:

- If you have a public-facing API, and a private API (e.g. only accessible
by administrators).
- If you want to maintain multiple versions of an API, each version can
have its own server.

## Resources

Every server has a defined set of JSON:API resources. These are the domain
models that clients can access via your API.

For example, a blog application may have `posts`, `comments` and `users`
resources to represent the blog posts, comments on those posts, and the
users who have authored posts or comments.

For each resource in your server, you will have two PHP classes -
a `Resource` class and a `Schema` class. For example, the `posts` resource
would have a `PostResource` and a `PostSchema` class.

### API Resources

**`PostResource`** defines how a `Post` model is serialized to a JSON:API
[resource object](https://jsonapi.org/format/#document-resource-objects).

These are the JSON:API equivalent of Laravel's
[Eloquent API Resources](https://laravel.com/docs/eloquent-resources).

### Schemas

**`PostSchema`** describes the structure of the `PostResource` and
translates JSON:API requests into database queries to create, read,
update and delete `Post` models.

The design of the `Schema` classes
is inspired by the [Laravel Nova](https://nova.laravel.com/docs) approach.

## Requests

Laravel JSON:API makes extensive use of Laravel
[Form Requests](https://laravel.com/docs/validation#form-request-validation)
to process client requests in accordance with the JSON:API specification.

Our request classes take care of:

- [Negotiating content](https://jsonapi.org/format/#content-negotiation)
between the client and the server;
- Parsing JSON documents sent by client against the JSON:API specification,
rejecting any non-compliant documents with detailed error messages.
- Validating query parameters and JSON resources against your application's
specific validation logic.

A resource can have up to three request classes. Using the `posts` resource
as an example, the three classes would be:

- **`PostQuery`**: parses query parameters for when the server will respond with
zero-to-one `posts` resources.
- **`PostCollectionQuery`**: parses query parameters for when the server will
response with zero-to-many `posts` resources.
- **`PostRequest`**: parses the JSON content of a request to create, update,
or delete a `posts` resource. This includes parsing requests to modify
any of the relationships of the `posts` resource.

:::tip
Not all resources will use all three request classes: it depends on what
JSON:API capabilities you allow a client to execute for each resource type.
:::
