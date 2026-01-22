<?php

namespace App\Filament\Resources\WhatsappApiTokenResource\Pages;

use App\Filament\Resources\WhatsappApiTokenResource;
use App\Models\WhatsappApiToken;
use Filament\Resources\Pages\CreateRecord;

class CreateWhatsappApiToken extends CreateRecord
{
    protected static string $resource = WhatsappApiTokenResource::class;

    protected function mutateFormDataBeforeCreate(array $data): array
    {
        // Jika status aktif, nonaktifkan yang lain
        if (isset($data['status']) && $data['status'] === 'active') {
            WhatsappApiToken::where('status', 'active')
                ->update(['status' => 'inactive']);
        }

        return $data;
    }
}

