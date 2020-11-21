# Events

[[toc]]

## Resource Events

All JSON:API operations use the typical Eloquent methods you are familiar
with, i.e. `save`, `delete`, `forceDelete` and `restore`. Therefore
it is easy to listen for model events triggered by JSON:API operations and
react to them.

The easiest approach is to simply attach
[model listeners or observers](https://laravel.com/docs/eloquent#events)
to a model:

```php
namespace App\Providers;

use App\User;
use App\Observers\UserObserver;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Bootstrap any application services.
     *
     * @return void
     */
    public function boot()
    {
        User::observe(UserObserver::class);
    }

    /**
     * Register the service provider.
     *
     * @return void
     */
    public function register()
    {
        //
    }
}
```

## HTTP-Only Events

If you would like to attach a listener or observer **only during** JSON:API
related HTTP requests, you may register them using your server's `serving()`
method. This hook is only invoked if the server is handling a HTTP request:

```php
namespace App\JsonApi\V1;

use App\User;
use App\Observers\UserObserver;
use LaravelJsonApi\Core\Server\Server as BaseServer;

class Server extends BaseServer
{

    // ...

    /**
     * Bootstrap the server when it is handling an HTTP request.
     *
     * @return void
     */
    public function serving(): void
    {
        User::observe(UserObserver::class);
    }

}
```
