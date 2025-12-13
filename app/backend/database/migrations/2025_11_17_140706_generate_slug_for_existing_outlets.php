<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Generate slug for existing businesses that don't have slug (if any)
        $businesses = DB::table('businesses')
            ->whereNull('slug')
            ->orWhere('slug', '')
            ->get();

        foreach ($businesses as $business) {
            $slug = Str::slug($business->name);
            $originalSlug = $slug;
            $counter = 1;

            // Ensure unique slug
            while (DB::table('businesses')
                ->where('slug', $slug)
                ->where('id', '!=', $business->id)
                ->exists()) {
                $slug = $originalSlug . '-' . Str::random(6);
                $counter++;
            }

            DB::table('businesses')
                ->where('id', $business->id)
                ->update(['slug' => $slug]);
        }

        // Generate slug for existing outlets that don't have slug
        $outlets = DB::table('outlets')
            ->whereNull('slug')
            ->orWhere('slug', '')
            ->get();

        foreach ($outlets as $outlet) {
            $slug = Str::slug($outlet->name);
            $originalSlug = $slug;
            $counter = 1;

            // Ensure unique slug
            while (DB::table('outlets')
                ->where('slug', $slug)
                ->where('id', '!=', $outlet->id)
                ->exists()) {
                $slug = $originalSlug . '-' . $counter;
                $counter++;
            }

            DB::table('outlets')
                ->where('id', $outlet->id)
                ->update([
                    'slug' => $slug,
                    'is_public' => $outlet->is_public ?? true, // Set default if null
                ]);
        }

        // Also ensure all outlets have is_public set
        DB::table('outlets')
            ->whereNull('is_public')
            ->update(['is_public' => true]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // This migration doesn't need to be reversed
        // We don't want to remove slugs that were generated
    }
};
