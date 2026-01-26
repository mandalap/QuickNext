<?php

namespace App\Filament\Resources;

use App\Filament\Resources\UserResource\Pages;
use App\Models\User;
use Carbon\Carbon;
use Filament\Actions;
use Filament\Forms;
use Filament\Resources\Resource;
use Filament\Schemas\Components\Section as SchemaSection;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Table;
use Filament\Tables\Filters\TrashedFilter;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class UserResource extends Resource
{
    protected static ?string $model = User::class;

    protected static ?string $navigationLabel = 'Pengguna';

    protected static ?string $modelLabel = 'Pengguna';

    protected static ?string $pluralModelLabel = 'Pengguna';

    protected static ?int $navigationSort = 1;

    public static function getNavigationGroup(): ?string
    {
        return 'Manajemen';
    }

    public static function getNavigationIcon(): ?string
    {
        return 'heroicon-o-users';
    }

    public static function form(Schema $schema): Schema
    {
        return $schema
            ->schema([
                SchemaSection::make('Informasi Pengguna')
                    ->schema([
                        Forms\Components\TextInput::make('name')
                            ->label('Nama')
                            ->required()
                            ->maxLength(255)
                            ->columnSpanFull(),

                        Forms\Components\TextInput::make('email')
                            ->label('Email')
                            ->email()
                            ->required()
                            ->unique(ignoreRecord: true)
                            ->maxLength(255)
                            ->columnSpanFull(),

                        Forms\Components\TextInput::make('phone')
                            ->label('Telepon')
                            ->tel()
                            ->maxLength(20)
                            ->columnSpan(1),

                        Forms\Components\Select::make('role')
                            ->label('Role')
                            ->options([
                                'admin' => 'Admin',
                                'owner' => 'Owner',
                                'cashier' => 'Kasir',
                                'waiter' => 'Waiter',
                                'kitchen' => 'Kitchen',
                                'super_admin' => 'Super Admin',
                            ])
                            ->required()
                            ->default('admin')
                            ->columnSpan(1),

                        Forms\Components\Textarea::make('address')
                            ->label('Alamat')
                            ->rows(3)
                            ->columnSpanFull(),

                        Forms\Components\FileUpload::make('avatar')
                            ->label('Avatar')
                            ->image()
                            ->imageEditor()
                            ->directory('avatars')
                            ->visibility('public')
                            ->columnSpanFull(),
                    ])
                    ->columns(2),

                SchemaSection::make('Keamanan')
                    ->schema([
                        Forms\Components\TextInput::make('password')
                            ->label('Password')
                            ->password()
                            ->revealable()
                            ->dehydrated(fn ($state) => filled($state))
                            ->required(fn (string $context): bool => $context === 'create')
                            ->rules([
                                Password::min(8)
                                    ->letters()
                                    ->mixedCase()
                                    ->numbers()
                                    ->symbols(),
                            ])
                            ->dehydrateStateUsing(fn ($state) => filled($state) ? Hash::make($state) : null)
                            ->helperText(fn (string $context): string => $context === 'edit' ? 'Kosongkan jika tidak ingin mengubah password. Gunakan tombol "Ubah Password" di header untuk mengubah password dengan konfirmasi.' : 'Minimal 8 karakter dengan kombinasi huruf besar, huruf kecil, angka, dan simbol.')
                            ->confirmed()
                            ->columnSpanFull(),

                        Forms\Components\TextInput::make('password_confirmation')
                            ->label('Konfirmasi Password')
                            ->password()
                            ->revealable()
                            ->required(fn ($get, string $context): bool => $context === 'create' || filled($get('password')))
                            ->dehydrated(false)
                            ->columnSpanFull()
                            ->visible(fn ($get): bool => filled($get('password'))),

                        Forms\Components\Toggle::make('is_active')
                            ->label('Aktif')
                            ->default(true)
                            ->columnSpanFull(),
                    ])
                    ->columns(2)
                    ->visibleOn(['create', 'edit']),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\ImageColumn::make('avatar')
                    ->label('Avatar')
                    ->circular()
                    ->defaultImageUrl(url('/images/default-avatar.png'))
                    ->size(40),

                Tables\Columns\TextColumn::make('name')
                    ->label('Nama')
                    ->searchable()
                    ->sortable(),

                Tables\Columns\TextColumn::make('email')
                    ->label('Email')
                    ->searchable()
                    ->sortable()
                    ->copyable()
                    ->copyMessage('Email disalin!'),

                Tables\Columns\TextColumn::make('phone')
                    ->label('Telepon')
                    ->searchable()
                    ->toggleable(),

                Tables\Columns\TextColumn::make('role')
                    ->label('Role')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'super_admin' => 'danger',
                        'admin' => 'warning',
                        'owner' => 'success',
                        'cashier' => 'info',
                        'waiter' => 'primary',
                        'kitchen' => 'secondary',
                        default => 'gray',
                    })
                    ->formatStateUsing(fn (string $state): string => match ($state) {
                        'admin' => 'Admin',
                        'owner' => 'Owner',
                        'cashier' => 'Kasir',
                        'waiter' => 'Waiter',
                        'kitchen' => 'Kitchen',
                        'super_admin' => 'Super Admin',
                        default => $state,
                    })
                    ->sortable(),

                Tables\Columns\IconColumn::make('is_active')
                    ->label('Status')
                    ->boolean()
                    ->sortable(),

                Tables\Columns\TextColumn::make('last_login_at')
                    ->label('Login Terakhir')
                    ->dateTime('d F Y H:i')
                    ->formatStateUsing(fn ($state) => $state ? \Carbon\Carbon::parse($state)->locale('id')->translatedFormat('d F Y H:i') : 'Belum pernah login')
                    ->sortable()
                    ->toggleable(),

                Tables\Columns\TextColumn::make('created_at')
                    ->label('Dibuat')
                    ->dateTime('d F Y H:i')
                    ->formatStateUsing(fn ($state) => $state ? \Carbon\Carbon::parse($state)->locale('id')->translatedFormat('d F Y H:i') : '-')
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),

                Tables\Columns\TextColumn::make('updated_at')
                    ->label('Diperbarui')
                    ->dateTime('d F Y H:i')
                    ->formatStateUsing(fn ($state) => $state ? \Carbon\Carbon::parse($state)->locale('id')->translatedFormat('d F Y H:i') : '-')
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                TrashedFilter::make()
                    ->label('Status Hapus')
                    ->placeholder('Semua')
                    ->trueLabel('Terhapus')
                    ->falseLabel('Aktif'),

                Tables\Filters\SelectFilter::make('role')
                    ->label('Role')
                    ->options([
                        'admin' => 'Admin',
                        'owner' => 'Owner',
                        'cashier' => 'Kasir',
                        'waiter' => 'Waiter',
                        'kitchen' => 'Kitchen',
                        'super_admin' => 'Super Admin',
                    ]),

                Tables\Filters\TernaryFilter::make('is_active')
                    ->label('Status Aktif')
                    ->placeholder('Semua')
                    ->trueLabel('Aktif')
                    ->falseLabel('Tidak Aktif'),

                Tables\Filters\Filter::make('created_at')
                    ->form([
                        Forms\Components\DatePicker::make('created_from')
                            ->label('Dari Tanggal'),
                        Forms\Components\DatePicker::make('created_until')
                            ->label('Sampai Tanggal'),
                    ])
                    ->query(function ($query, array $data) {
                        return $query
                            ->when(
                                $data['created_from'],
                                fn ($query, $date) => $query->whereDate('created_at', '>=', $date),
                            )
                            ->when(
                                $data['created_until'],
                                fn ($query, $date) => $query->whereDate('created_at', '<=', $date),
                            );
                    }),
            ])
            ->actions([
                Actions\ViewAction::make(),
                Actions\EditAction::make(),
                Actions\Action::make('resetPassword')
                    ->label('Reset Password')
                    ->icon('heroicon-o-key')
                    ->color('warning')
                    ->form([
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
                    ->action(function ($record, array $data) {
                        $record->update([
                            'password' => Hash::make($data['password']),
                        ]);
                        
                        \Filament\Notifications\Notification::make()
                            ->title('Password berhasil direset')
                            ->success()
                            ->send();
                    })
                    ->requiresConfirmation()
                    ->modalHeading('Reset Password')
                    ->modalDescription('Masukkan password baru untuk pengguna ini. Password lama akan diganti.')
                    ->modalSubmitActionLabel('Reset Password')
                    ->visible(fn ($record) => !$record->trashed()),
                Actions\DeleteAction::make()
                    ->visible(fn ($record) => !$record->trashed()),
                Actions\RestoreAction::make()
                    ->visible(fn ($record) => $record->trashed()),
                Actions\ForceDeleteAction::make()
                    ->visible(fn ($record) => $record->trashed())
                    ->requiresConfirmation()
                    ->modalHeading('Hapus Permanen')
                    ->modalDescription('Apakah Anda yakin ingin menghapus pengguna ini secara permanen? Tindakan ini tidak dapat dibatalkan dan akan menghapus semua data terkait.')
                    ->modalSubmitActionLabel('Ya, Hapus Permanen')
                    ->color('danger'),
            ])
            ->bulkActions([
                Actions\BulkActionGroup::make([
                    Actions\DeleteBulkAction::make(),
                    Actions\RestoreBulkAction::make(),
                    Actions\ForceDeleteBulkAction::make()
                        ->requiresConfirmation()
                        ->modalHeading('Hapus Permanen')
                        ->modalDescription('Apakah Anda yakin ingin menghapus pengguna yang dipilih secara permanen? Tindakan ini tidak dapat dibatalkan.')
                        ->modalSubmitActionLabel('Ya, Hapus Permanen')
                        ->color('danger'),
                    Actions\BulkAction::make('activate')
                        ->label('Aktifkan')
                        ->icon('heroicon-o-check-circle')
                        ->color('success')
                        ->action(function ($records) {
                            $records->each(function ($record) {
                                $record->update(['is_active' => true]);
                            });
                        })
                        ->requiresConfirmation(),
                    Actions\BulkAction::make('deactivate')
                        ->label('Nonaktifkan')
                        ->icon('heroicon-o-x-circle')
                        ->color('danger')
                        ->action(function ($records) {
                            $records->each(function ($record) {
                                $record->update(['is_active' => false]);
                            });
                        })
                        ->requiresConfirmation(),
                ]),
            ])
            ->defaultSort('created_at', 'desc');
    }

    public static function getRelations(): array
    {
        return [
            //
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListUsers::route('/'),
            'create' => Pages\CreateUser::route('/create'),
            'view' => Pages\ViewUser::route('/{record}'),
            'edit' => Pages\EditUser::route('/{record}/edit'),
        ];
    }
}

