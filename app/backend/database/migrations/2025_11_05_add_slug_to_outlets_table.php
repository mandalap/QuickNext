<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('outlets', function (Blueprint $table) {
            $table->string('slug')->nullable()->unique()->after('code');
            $table->text('description')->nullable()->after('address');
            $table->string('cover_image')->nullable()->after('logo');
            $table->boolean('is_public')->default(true)->after('is_active');

            // Add indexes
            $table->index('slug');
            $table->index(['is_active', 'is_public']);
        });

        // Generate slug for existing outlets
        $outlets = DB::table('outlets')->get();
        foreach ($outlets as $outlet) {
            $slug = Str::slug($outlet->name);
            $originalSlug = $slug;
            $counter = 1;

            // Ensure unique slug
            while (DB::table('outlets')->where('slug', $slug)->where('id', '!=', $outlet->id)->exists()) {
                $slug = $originalSlug . '-' . $counter;
                $counter++;
            }

            DB::table('outlets')->where('id', $outlet->id)->update([
                'slug' => $slug,
                'is_public' => true,
            ]);
        }

        // Make slug non-nullable after generating
        Schema::table('outlets', function (Blueprint $table) {
            $table->string('slug')->nullable(false)->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('outlets', function (Blueprint $table) {
            $table->dropIndex(['slug']);
            $table->dropIndex(['is_active', 'is_public']);
            $table->dropColumn(['slug', 'description', 'cover_image', 'is_public']);
        });
    }
};
