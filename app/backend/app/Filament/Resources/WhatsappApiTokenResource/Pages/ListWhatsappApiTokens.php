<?php

namespace App\Filament\Resources\WhatsappApiTokenResource\Pages;

use App\Filament\Resources\WhatsappApiTokenResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListWhatsappApiTokens extends ListRecords
{
    protected static string $resource = WhatsappApiTokenResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\CreateAction::make(),
        ];
    }
}

