<?php

namespace App\Filament\Resources\UserResource\Pages;

use App\Filament\Resources\UserResource;
use Filament\Actions;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Notifications\Notification;
use Filament\Resources\Pages\EditRecord;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class EditUser extends EditRecord
{
    protected static string $resource = UserResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\ViewAction::make(),
            Actions\Action::make('changePassword')
                ->label('Ubah Password')
                ->icon('heroicon-o-key')
                ->color('warning')
                ->form([
                    Forms\Components\TextInput::make('current_password')
                        ->label('Password Saat Ini')
                        ->password()
                        ->revealable()
                        ->required()
                        ->currentPassword()
                        ->visible(fn () => auth()->id() === $this->record->id),
                    
                    Forms\Components\TextInput::make('password')
                        ->label('Password Baru')
                        ->password()
                        ->revealable()
                        ->required()
                        ->rules([
                            Password::min(8)
                                ->letters()
                                ->mixedCase()
                                ->numbers()
                                ->symbols(),
                        ])
                        ->confirmed(),
                    
                    Forms\Components\TextInput::make('password_confirmation')
                        ->label('Konfirmasi Password Baru')
                        ->password()
                        ->revealable()
                        ->required(),
                ])
                ->action(function (array $data) {
                    // Validate current password if editing own account
                    if (auth()->id() === $this->record->id && isset($data['current_password'])) {
                        if (!Hash::check($data['current_password'], $this->record->password)) {
                            Notification::make()
                                ->title('Password saat ini salah')
                                ->danger()
                                ->send();
                            return;
                        }
                    }
                    
                    // Update password
                    $this->record->update([
                        'password' => Hash::make($data['password']),
                    ]);
                    
                    Notification::make()
                        ->title('Password berhasil diubah')
                        ->success()
                        ->send();
                })
                ->requiresConfirmation()
                ->modalHeading('Ubah Password')
                ->modalDescription('Masukkan password baru untuk pengguna ini.')
                ->modalSubmitActionLabel('Simpan Password'),
            Actions\DeleteAction::make(),
        ];
    }

    protected function getRedirectUrl(): string
    {
        return $this->getResource()::getUrl('index');
    }
}

