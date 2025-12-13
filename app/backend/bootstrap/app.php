<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        //
        $middleware->api(prepend: [
            \App\Http\Middleware\Cors::class,
        ]);

        // Register middleware aliases
        $middleware->alias([
            'outlet.access' => \App\Http\Middleware\CheckOutletAccess::class,
            'subscription.check' => \App\Http\Middleware\CheckSubscriptionStatus::class,
            'check.admin.role' => \App\Http\Middleware\CheckAdminRole::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
