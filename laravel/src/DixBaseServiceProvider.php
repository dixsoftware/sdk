<?php

namespace DixBase\LaravelPayments;

use Illuminate\Support\ServiceProvider;

class DixBaseServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__ . '/../config/dixbase.php', 'dixbase');
        $this->app->singleton(DixBaseManager::class, fn () => new DixBaseManager(config('dixbase')));
        $this->app->alias(DixBaseManager::class, 'dixbase');
    }

    public function boot(): void
    {
        $this->publishes([
            __DIR__ . '/../config/dixbase.php' => config_path('dixbase.php'),
        ], 'dixbase-config');
    }
}
