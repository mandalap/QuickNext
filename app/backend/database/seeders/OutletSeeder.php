<?php

namespace Database\Seeders;

use App\Models\Business;
use App\Models\Outlet;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class OutletSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create default outlet for each business that doesn't have one
        $businesses = Business::all();

        foreach ($businesses as $business) {
            // Check if business already has an outlet
            $existingOutlet = Outlet::where('business_id', $business->id)->first();

            if (!$existingOutlet) {
                $outletName = $business->name . ' - Main Outlet';
                $outletSlug = Str::slug($outletName);
                
                // Ensure unique slug
                $originalSlug = $outletSlug;
                $counter = 1;
                while (Outlet::where('slug', $outletSlug)->exists()) {
                    $outletSlug = $originalSlug . '-' . $counter;
                    $counter++;
                }

                Outlet::create([
                    'business_id' => $business->id,
                    'name' => $outletName,
                    'code' => 'OUT-' . strtoupper(Str::random(6)),
                    'slug' => $outletSlug,
                    'address' => $business->address ?? 'Main Location',
                    'phone' => $business->phone ?? null,
                    'is_active' => true,
                    'is_public' => true,
                ]);

                $this->command->info("Created outlet for business: {$business->name} (slug: {$outletSlug})");
            }
        }
    }
}
