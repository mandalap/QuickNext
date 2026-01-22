<?php

require_once 'vendor/autoload.php';

$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "Users in database:\n";
$users = \App\Models\User::select('id', 'name', 'email', 'role')->get();

foreach ($users as $user) {
    echo $user->id . ' - ' . $user->name . ' - ' . $user->email . ' - ' . $user->role . "\n";
}

echo "\nTotal users: " . $users->count() . "\n";
