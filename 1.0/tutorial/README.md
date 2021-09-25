# Getting Started

[[toc]]

## Introduction

Laravel JSON:API is a library for creating JSON:API server implementations
(backends) using the Laravel application framework.

To try it out, let's create a simple blog application. This will comprise of
blog *posts* that are created by an *author* (the signed-in user). The author
will be allowed to *tag* posts, while other users can *comment* on a blog post.

By following this tutorial, you'll learn how the JSON:API specification works,
and how to implement a JSON:API compliant server in a Laravel application.

In this chapter, we'll setup our Laravel application so we're ready to develop
our blog application.

## Requirements

To follow this tutorial, you'll need the following:

- Composer
- Docker

This tutorial assumes you are using Laravel Sail to run your application in
Docker. There are other ways of running Laravel - e.g. Homestead. If you want
to use an alternative method then make sure you follow the relevant Laravel
documentation on how to setup an application.

You'll also need a method of submitting AJAX requests to your application. For
example, Postman, PHPStorm HTTP requests, or cURL. The tutorial shows the HTTP
requests you'll need to submit, but how to do that will depend on the HTTP client
you are using.

## Example Application

You will learn more if you follow this tutorial and incrementally build the
application. Learning by doing is always the best way to learn!

However, if you want to see the complete application, you can find it on
Github in the [laravel-json-api/tutorial-app](https://github.com/laravel-json-api/tutorial-app)
repository.

## Installation

To get started, we'll need to create our new Laravel application. To do this,
we'll follow the [Your First Laravel Project](https://laravel.com/docs/8.x#your-first-laravel-project)
instructions. This contains information on creating your first project and
running it using Docker - there's instructions for MacOS, Windows and Linux.

Assuming you have Docker installed and running, on Linux we create our
application by running the following command:

```bash
curl -s https://laravel.build/jsonapi-tutorial | bash
```

Once this has finished running, we'll use Laravel Sail to start our new
application:

```bash
cd jsonapi-tutorial && ./vendor/bin/sail up
```

To check your application is running, go to [http://localhost/](http://localhost)
in your browser. You should see a default Laravel page.

:::tip
As this tutorial is about JSON:API, we haven't included extensive information
on starting the project for the first time. Refer to the Laravel installation
documentation for more details.
:::

For this tutorial, you'll also need to run Artisan commands. Check that Artisan
is working by running:

```bash
vendor/bin/sail artisan -V
```

That command should output the Laravel version, for example:

```
Laravel Framework 8.61.0
```

## In Summary

You've create a brand new Laravel application, and are running it locally.

In the [next chapter](./01-models.md) we'll add the database tables and models
required for our blog application.
