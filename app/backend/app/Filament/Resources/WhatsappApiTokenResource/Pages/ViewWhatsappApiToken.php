<?php

namespace App\Filament\Resources\WhatsappApiTokenResource\Pages;

use App\Filament\Resources\WhatsappApiTokenResource;
use Filament\Actions;
use Filament\Resources\Pages\ViewRecord;

class ViewWhatsappApiToken extends ViewRecord
{
    protected static string $resource = WhatsappApiTokenResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\EditAction::make(),
        ];
    }
}

