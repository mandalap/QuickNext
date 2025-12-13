<?php

namespace App\Observers;

use App\Models\Business;
use App\Models\Outlet;
use Illuminate\Support\Str;

class BusinessObserver
{
    /**
     * Handle the Business "created" event.
     */
    public function created(Business $business): void
    {
        // ✅ FIX: Check if outlet already exists to prevent duplicate creation
        // This prevents race conditions if outlet is created elsewhere
        $existingOutlet = Outlet::where('business_id', $business->id)->first();
        
        if ($existingOutlet) {
            \Log::info('Outlet already exists for business, skipping observer creation', [
                'business_id' => $business->id,
                'outlet_id' => $existingOutlet->id,
            ]);
            return;
        }

        // Automatically create a default outlet when a new business is created
        // Only if BusinessController didn't create one
        $outletName = $business->name . ' - Main Outlet';
        $outletSlug = Str::slug($outletName);
        
        // Ensure unique slug
        $originalSlug = $outletSlug;
        $counter = 1;
        while (Outlet::where('slug', $outletSlug)->exists()) {
            $outletSlug = $originalSlug . '-' . $counter;
            $counter++;
        }

        // Generate random outlet code
        $outletCode = 'OUT-' . strtoupper(Str::random(6));
        
        // Ensure unique code
        while (Outlet::where('code', $outletCode)->exists()) {
            $outletCode = 'OUT-' . strtoupper(Str::random(6));
        }

        Outlet::create([
            'business_id' => $business->id,
            'name' => $outletName,
            'code' => $outletCode,
            'slug' => $outletSlug,
            'address' => $business->address ?? null,
            'phone' => $business->phone ?? null,
            'is_active' => true,
            'is_public' => true,
        ]);

        \Log::info('Default outlet created by observer for business', [
            'business_id' => $business->id,
            'business_name' => $business->name,
            'outlet_code' => $outletCode,
            'outlet_slug' => $outletSlug
        ]);
    }

    /**
     * Handle the Business "updated" event.
     */
    public function updated(Business $business): void
    {
        //
    }

    /**
     * Handle the Business "deleted" event.
     */
    public function deleted(Business $business): void
    {
        //
    }

    /**
     * Handle the Business "restored" event.
     */
    public function restored(Business $business): void
    {
        //
    }

    /**
     * Handle the Business "force deleted" event.
     */
    public function forceDeleted(Business $business): void
    {
        //
    }
}
