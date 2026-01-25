<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;

class RolePermissionSeeder extends Seeder
{
    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $permissions = [
            'view dashboard',
            'manage users',
            'manage outlets',
            'manage products',
            'manage transactions',
            'manage subscriptions',
            'view reports',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate([
                'name' => $permission,
                'guard_name' => 'web',
            ]);
        }

        $admin = Role::firstOrCreate([
            'name' => 'admin',
            'guard_name' => 'web',
        ]);

        $owner = Role::firstOrCreate([
            'name' => 'owner',
            'guard_name' => 'web',
        ]);

        $kasir = Role::firstOrCreate([
            'name' => 'kasir',
            'guard_name' => 'web',
        ]);

        $admin->syncPermissions(
            Permission::where('guard_name', 'web')->get()
        );

        $owner->syncPermissions([
            'view dashboard',
            'manage outlets',
            'manage products',
            'manage transactions',
            'view reports',
        ]);

        $kasir->syncPermissions([
            'manage transactions',
        ]);

        $this->command->info('✅ Roles & permissions seeded successfully');
    }
}
