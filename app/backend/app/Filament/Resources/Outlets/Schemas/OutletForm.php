<?php

namespace App\Filament\Resources\Outlets\Schemas;

use Filament\Forms\Components\FileUpload;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TimePicker;
use Filament\Forms\Components\Toggle;
use Filament\Schemas\Schema;

class OutletForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                TextInput::make('business_id')
                    ->required()
                    ->numeric(),
                TextInput::make('business_type_id')
                    ->numeric(),
                TextInput::make('name')
                    ->required(),
                TextInput::make('code')
                    ->required(),
                TextInput::make('slug')
                    ->required(),
                Textarea::make('address')
                    ->columnSpanFull(),
                TextInput::make('latitude')
                    ->numeric(),
                TextInput::make('longitude')
                    ->numeric(),
                TextInput::make('attendance_radius')
                    ->required()
                    ->numeric()
                    ->default(100),
                TimePicker::make('shift_pagi_start'),
                TimePicker::make('shift_pagi_end'),
                TimePicker::make('shift_siang_start'),
                TimePicker::make('shift_siang_end'),
                TimePicker::make('shift_malam_start'),
                TimePicker::make('shift_malam_end'),
                Textarea::make('description')
                    ->columnSpanFull(),
                TextInput::make('phone')
                    ->tel(),
                Textarea::make('logo')
                    ->columnSpanFull(),
                FileUpload::make('cover_image')
                    ->image(),
                Toggle::make('is_active')
                    ->required(),
                Toggle::make('is_public')
                    ->required(),
                TextInput::make('payment_gateway_config'),
                TextInput::make('tax_rate')
                    ->numeric(),
                TextInput::make('whatsapp_provider'),
                Textarea::make('whatsapp_api_key')
                    ->columnSpanFull(),
                TextInput::make('whatsapp_phone_number')
                    ->tel(),
                Toggle::make('whatsapp_enabled')
                    ->required(),
                Toggle::make('self_service_enabled')
                    ->label('Aktifkan Self Service')
                    ->helperText('Aktifkan fitur Self Service untuk outlet ini. Jika dinonaktifkan, halaman self-service tidak dapat diakses.')
                    ->default(false),
            ]);
    }
}
