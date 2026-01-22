<?php

namespace App\Providers\Filament;

use Filament\Http\Middleware\Authenticate;
use Filament\Http\Middleware\AuthenticateSession;
use Filament\Http\Middleware\DisableBladeIconComponents;
use Filament\Http\Middleware\DispatchServingFilamentEvent;
use Filament\Pages\Dashboard;
use Filament\Panel;
use Filament\PanelProvider;
use App\Filament\Pages\CustomDashboard;
use App\Filament\Widgets\ExpiringSubscriptionsWidget;
use App\Filament\Widgets\PopularPlanWidget;
use App\Filament\Widgets\SubscriptionStatsWidget;
use App\Filament\Widgets\SubscriptionRevenueChartWidget;
use Filament\Support\Colors\Color;
use Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse;
use Illuminate\Cookie\Middleware\EncryptCookies;
use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken;
use Illuminate\Routing\Middleware\SubstituteBindings;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\View\Middleware\ShareErrorsFromSession;

class AdminPanelProvider extends PanelProvider
{
    public function panel(Panel $panel): Panel
    {
        return $panel
            ->default()
            ->id('admin')
            ->path('admin')
            ->login()
            ->colors([
                'primary' => Color::Amber,
            ])
            // ✅ QuickKasir branding
            ->favicon(asset('logo-qk.png'))
            // Gunakan view kustom supaya logo + teks "QuickKasir" tampil berdampingan
            ->brandLogo(fn () => view('filament.parts.brand-logo'))
            ->brandLogoHeight('2.5rem')
            ->brandName('QuickKasir')
            // ✅ Optional: Add dark mode logo (if different)
            // ->darkModeBrandLogo(asset('logo-qk-dark.png'))
            ->discoverResources(in: app_path('Filament/Resources'), for: 'App\Filament\Resources')
            ->discoverPages(in: app_path('Filament/Pages'), for: 'App\Filament\Pages')
            ->pages([
                CustomDashboard::class,
            ])
            ->discoverWidgets(in: app_path('Filament/Widgets'), for: 'App\Filament\Widgets')
            ->widgets([
                SubscriptionStatsWidget::class,
                SubscriptionRevenueChartWidget::class,
                PopularPlanWidget::class,
                ExpiringSubscriptionsWidget::class,
            ])
            ->middleware([
                EncryptCookies::class,
                AddQueuedCookiesToResponse::class,
                StartSession::class,
                AuthenticateSession::class,
                ShareErrorsFromSession::class,
                VerifyCsrfToken::class,
                SubstituteBindings::class,
                DisableBladeIconComponents::class,
                DispatchServingFilamentEvent::class,
            ])
            ->authMiddleware([
                Authenticate::class,
            ]);
    }
}
