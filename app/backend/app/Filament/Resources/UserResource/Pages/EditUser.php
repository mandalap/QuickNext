<?php

namespace App\Filament\Resources\UserResource\Pages;

use App\Filament\Resources\UserResource;
use Filament\Actions;
use Filament\Actions\DeleteAction;
use Filament\Actions\ForceDeleteAction;
use Filament\Actions\RestoreAction;
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
                        ->required(fn () => auth()->id() === $this->record->id)
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
                                ->numbers(),
                        ])
                        ->confirmed()
                        ->helperText('Minimal 8 karakter dengan kombinasi huruf besar, huruf kecil, dan angka.'),
                    
                    Forms\Components\TextInput::make('password_confirmation')
                        ->label('Konfirmasi Password Baru')
                        ->password()
                        ->revealable()
                        ->required(),
                ])
                ->action(function (array $data) {
                    try {
                        // Validate current password if editing own account
                        if (auth()->id() === $this->record->id) {
                            if (empty($data['current_password'])) {
                                Notification::make()
                                    ->title('Password saat ini wajib diisi')
                                    ->body('Silakan masukkan password saat ini untuk melanjutkan.')
                                    ->danger()
                                    ->send();
                                return;
                            }
                            
                            if (!Hash::check($data['current_password'], $this->record->password)) {
                                Notification::make()
                                    ->title('Password saat ini salah')
                                    ->body('Password yang Anda masukkan tidak sesuai dengan password saat ini.')
                                    ->danger()
                                    ->send();
                                return;
                            }
                        }
                        
                        // Validate password confirmation
                        if (!isset($data['password_confirmation']) || $data['password'] !== $data['password_confirmation']) {
                            Notification::make()
                                ->title('Konfirmasi password tidak cocok')
                                ->body('Password baru dan konfirmasi password harus sama.')
                                ->danger()
                                ->send();
                            return;
                        }
                        
                        // Update password
                        $this->record->update([
                            'password' => Hash::make($data['password']),
                        ]);
                        
                        Notification::make()
                            ->title('Password berhasil diubah')
                            ->body('Password pengguna telah berhasil diperbarui.')
                            ->success()
                            ->send();
                    } catch (\Exception $e) {
                        Notification::make()
                            ->title('Gagal mengubah password')
                            ->body('Terjadi kesalahan saat mengubah password: ' . $e->getMessage())
                            ->danger()
                            ->send();
                    }
                })
                ->requiresConfirmation()
                ->modalHeading('Ubah Password')
                ->modalDescription('Masukkan password baru untuk pengguna ini.')
                ->modalSubmitActionLabel('Simpan Password')
                ->visible(fn () => !$this->record->trashed()),
            DeleteAction::make()
                ->visible(fn () => !$this->record->trashed()),
            RestoreAction::make()
                ->visible(fn () => $this->record->trashed()),
            ForceDeleteAction::make()
                ->visible(fn () => $this->record->trashed())
                ->requiresConfirmation()
                ->modalHeading('Hapus Permanen')
                ->modalDescription('Apakah Anda yakin ingin menghapus pengguna ini secara permanen? Tindakan ini tidak dapat dibatalkan dan akan menghapus semua data terkait.')
                ->modalSubmitActionLabel('Ya, Hapus Permanen')
                ->color('danger'),
        ];
    }

    protected function getRedirectUrl(): string
    {
        return $this->getResource()::getUrl('index');
    }
}

