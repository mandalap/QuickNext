<?php

namespace App\Providers;

use App\Events\SubscriptionCreated;
use App\Events\SubscriptionPaid;
use App\Listeners\SendSubscriptionNotification;
use Illuminate\Foundation\Support\Providers\EventServiceProvider as ServiceProvider;

class EventServiceProvider extends ServiceProvider
{
    /**
     * The event to listener mappings for the application.
     *
     * @var array<class-string, array<int, class-string>>
     */
    protected $listen = [
        SubscriptionCreated::class => [
            SendSubscriptionNotification::class,
        ],
        SubscriptionPaid::class => [
            SendSubscriptionNotification::class,
        ],
    ];

    /**
     * Register any events for your application.
     */
    public function boot(): void
    {
        //
    }

    /**
     * Determine if events and listeners should be automatically discovered.
     */
    public function shouldDiscoverEvents(): bool
    {
        return false;
    }
}

