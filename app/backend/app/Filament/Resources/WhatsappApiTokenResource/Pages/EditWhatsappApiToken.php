<?php

namespace App\Filament\Resources\WhatsappApiTokenResource\Pages;

use App\Filament\Resources\WhatsappApiTokenResource;
use App\Models\WhatsappApiToken;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;

class EditWhatsappApiToken extends EditRecord
{
    protected static string $resource = WhatsappApiTokenResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\ViewAction::make(),
            Actions\DeleteAction::make(),
        ];
    }

    protected function mutateFormDataBeforeSave(array $data): array
    {
        // Jika status aktif, nonaktifkan yang lain
        if (isset($data['status']) && $data['status'] === 'active') {
            WhatsappApiToken::where('id', '!=', $this->record->id)
                ->where('status', 'active')
                ->update(['status' => 'inactive']);
        }

        return $data;
    }
}

