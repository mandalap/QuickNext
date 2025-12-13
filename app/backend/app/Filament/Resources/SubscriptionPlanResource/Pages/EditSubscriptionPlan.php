<?php

namespace App\Filament\Resources\SubscriptionPlanResource\Pages;

use App\Filament\Resources\SubscriptionPlanResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class EditSubscriptionPlan extends EditRecord
{
    protected static string $resource = SubscriptionPlanResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\ViewAction::make(),
            Actions\DeleteAction::make(),
        ];
    }

    protected function getRedirectUrl(): string
    {
        return $this->getResource()::getUrl('index');
    }

    /**
     * ✅ FIX: Clear subscription cache after update to ensure users get latest plan features
     */
    protected function afterSave(): void
    {
        $subscriptionPlan = $this->record;
        
        // Clear cache for all users who have this subscription plan
        $usersWithThisPlan = \App\Models\UserSubscription::where('subscription_plan_id', $subscriptionPlan->id)
            ->where('status', 'active')
            ->pluck('user_id')
            ->unique();
        
        foreach ($usersWithThisPlan as $userId) {
            // Clear owner subscription cache
            Cache::forget("subscription:user:{$userId}");
            
            // Clear employee subscription cache (if any employees use this business owner's subscription)
            $owner = \App\Models\User::find($userId);
            if ($owner && $owner->role === 'owner') {
                $employees = \App\Models\Employee::whereHas('business', function($query) use ($owner) {
                    $query->where('owner_id', $owner->id);
                })->pluck('user_id');
                
                foreach ($employees as $employeeId) {
                    Cache::forget("subscription:employee:{$employeeId}");
                }
            }
        }
        
        Log::info('Subscription plan cache cleared after update', [
            'plan_id' => $subscriptionPlan->id,
            'plan_name' => $subscriptionPlan->name,
            'affected_users' => $usersWithThisPlan->count(),
        ]);
    }
}

