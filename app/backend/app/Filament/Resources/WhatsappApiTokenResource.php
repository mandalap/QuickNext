<?php

namespace App\Filament\Resources;

use App\Filament\Resources\WhatsappApiTokenResource\Pages;
use App\Models\WhatsappApiToken;
use Carbon\Carbon;
use Filament\Actions;
use Filament\Forms;
use Filament\Resources\Resource;
use Filament\Schemas\Components\Section as SchemaSection;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Support\Facades\Hash;

class WhatsappApiTokenResource extends Resource
{
    protected static ?string $model = WhatsappApiToken::class;

    protected static ?string $navigationLabel = 'WhatsApp Config';

    protected static ?string $modelLabel = 'Konfigurasi WhatsApp';

    protected static ?string $pluralModelLabel = 'Konfigurasi WhatsApp';

    protected static ?int $navigationSort = 10;

    public static function getNavigationGroup(): ?string
    {
        return 'Pengaturan';
    }

    public static function getNavigationIcon(): ?string
    {
        return 'heroicon-o-chat-bubble-left-right';
    }

    public static function form(Schema $schema): Schema
    {
        return $schema
            ->schema([
                SchemaSection::make('Informasi Konfigurasi')
                    ->schema([
                        Forms\Components\TextInput::make('name')
                            ->label('Nama Konfigurasi')
                            ->required()
                            ->maxLength(255)
                            ->placeholder('Contoh: Wablitz Production')
                            ->helperText('Nama untuk mengidentifikasi konfigurasi ini')
                            ->columnSpanFull(),

                        Forms\Components\Textarea::make('description')
                            ->label('Deskripsi')
                            ->rows(3)
                            ->maxLength(500)
                            ->placeholder('Deskripsi singkat tentang konfigurasi ini')
                            ->columnSpanFull(),

                        Forms\Components\Select::make('provider')
                            ->label('Provider')
                            ->options([
                                'wablitz' => 'Wablitz',
                                'fonnte' => 'Fonnte',
                                'wablas' => 'Wablas',
                                'kirimwa' => 'KirimWA',
                            ])
                            ->default('wablitz')
                            ->required()
                            ->native(false)
                            ->helperText('Pilih provider WhatsApp yang digunakan'),

                        Forms\Components\Select::make('status')
                            ->label('Status')
                            ->options([
                                'active' => 'Aktif',
                                'inactive' => 'Tidak Aktif',
                            ])
                            ->default('inactive')
                            ->required()
                            ->native(false)
                            ->helperText('Hanya satu konfigurasi yang bisa aktif pada satu waktu')
                            ->columnSpanFull(),
                    ])
                    ->columns(2),

                SchemaSection::make('Konfigurasi API')
                    ->schema([
                        Forms\Components\TextInput::make('api_token')
                            ->label('API Key / Token')
                            ->required()
                            ->maxLength(255)
                            ->password()
                            ->revealable()
                            ->helperText('API Key atau Token dari provider WhatsApp')
                            ->columnSpanFull(),

                        Forms\Components\TextInput::make('sender')
                            ->label('Sender / Nomor Pengirim')
                            ->required()
                            ->maxLength(255)
                            ->placeholder('Contoh: 6281234567890')
                            ->helperText('Nomor WhatsApp pengirim (format: 62xxxxxxxxxx)')
                            ->columnSpanFull()
                            ->rules(['regex:/^62\d{9,12}$/'])
                            ->validationMessages([
                                'regex' => 'Format nomor harus dimulai dengan 62 diikuti 9-12 digit angka',
                            ]),

                        Forms\Components\TextInput::make('url')
                            ->label('URL Endpoint')
                            ->required()
                            ->url()
                            ->maxLength(500)
                            ->default('https://wablitz.web.id/send-message')
                            ->placeholder('https://wablitz.web.id/send-message')
                            ->helperText('URL endpoint untuk mengirim pesan WhatsApp (contoh: https://wablitz.web.id/send-message)')
                            ->columnSpanFull()
                            ->rules(['url', 'max:500']),
                    ])
                    ->columns(1),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('name')
                    ->label('Nama')
                    ->searchable()
                    ->sortable()
                    ->weight('bold'),

                Tables\Columns\TextColumn::make('provider')
                    ->label('Provider')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'wablitz' => 'success',
                        'fonnte' => 'info',
                        'wablas' => 'warning',
                        'kirimwa' => 'danger',
                        default => 'gray',
                    })
                    ->formatStateUsing(fn (string $state): string => match ($state) {
                        'wablitz' => 'Wablitz',
                        'fonnte' => 'Fonnte',
                        'wablas' => 'Wablas',
                        'kirimwa' => 'KirimWA',
                        default => $state,
                    })
                    ->sortable(),

                Tables\Columns\TextColumn::make('sender')
                    ->label('Sender')
                    ->searchable()
                    ->copyable()
                    ->copyMessage('Nomor sender disalin!')
                    ->copyMessageDuration(1500)
                    ->toggleable(),

                Tables\Columns\TextColumn::make('url')
                    ->label('URL')
                    ->limit(40)
                    ->tooltip(fn ($record) => $record->url)
                    ->copyable()
                    ->copyMessage('URL disalin!')
                    ->copyMessageDuration(1500)
                    ->toggleable(isToggledHiddenByDefault: true),

                Tables\Columns\IconColumn::make('status')
                    ->label('Status')
                    ->boolean()
                    ->trueIcon('heroicon-o-check-circle')
                    ->falseIcon('heroicon-o-x-circle')
                    ->trueColor('success')
                    ->falseColor('danger')
                    ->getStateUsing(fn ($record) => $record->status === 'active')
                    ->sortable(),

                Tables\Columns\TextColumn::make('created_at')
                    ->label('Dibuat')
                    ->dateTime('d F Y H:i')
                    ->formatStateUsing(fn ($state) => $state ? Carbon::parse($state)->locale('id')->translatedFormat('d F Y H:i') : '-')
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),

                Tables\Columns\TextColumn::make('updated_at')
                    ->label('Diperbarui')
                    ->dateTime('d F Y H:i')
                    ->formatStateUsing(fn ($state) => $state ? Carbon::parse($state)->locale('id')->translatedFormat('d F Y H:i') : '-')
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('status')
                    ->label('Status')
                    ->options([
                        'active' => 'Aktif',
                        'inactive' => 'Tidak Aktif',
                    ])
                    ->native(false),

                Tables\Filters\SelectFilter::make('provider')
                    ->label('Provider')
                    ->options([
                        'wablitz' => 'Wablitz',
                        'fonnte' => 'Fonnte',
                        'wablas' => 'Wablas',
                        'kirimwa' => 'KirimWA',
                    ])
                    ->native(false),
            ])
            ->actions([
                Actions\Action::make('test_whatsapp')
                    ->label('Test WhatsApp')
                    ->icon('heroicon-o-paper-airplane')
                    ->color('info')
                    ->form([
                        Forms\Components\TextInput::make('test_phone')
                            ->label('Nomor Telepon Test')
                            ->required()
                            ->placeholder('6281234567890')
                            ->helperText('Masukkan nomor WhatsApp untuk test (format: 62xxxxxxxxxx)')
                            ->rules(['regex:/^62\d{9,12}$/']),
                        Forms\Components\Textarea::make('test_message')
                            ->label('Pesan Test')
                            ->default('Ini adalah pesan test dari sistem POS. Jika Anda menerima pesan ini, berarti konfigurasi WhatsApp sudah berjalan dengan baik. ✅')
                            ->rows(3)
                            ->required(),
                    ])
                    ->modalHeading('Test Konfigurasi WhatsApp')
                    ->modalDescription('Kirim pesan test untuk memastikan konfigurasi WhatsApp berfungsi dengan baik.')
                    ->modalSubmitActionLabel('Kirim Test')
                    ->action(function (WhatsappApiToken $record, array $data) {
                        try {
                            $phone = $data['test_phone'];
                            $message = $data['test_message'];
                            
                            // Format phone number
                            $phone = preg_replace('/[^0-9]/', '', $phone);
                            if (substr($phone, 0, 1) === '0') {
                                $phone = '62' . substr($phone, 1);
                            } elseif (substr($phone, 0, 2) !== '62') {
                                $phone = '62' . $phone;
                            }

                            // Prepare data
                            $requestData = [
                                'api_key' => $record->api_token,
                                'sender' => $record->sender,
                                'number' => $phone,
                                'message' => $message,
                            ];

                            // Send via cURL
                            $curl = curl_init();
                            curl_setopt_array($curl, [
                                CURLOPT_URL => $record->url,
                                CURLOPT_RETURNTRANSFER => true,
                                CURLOPT_ENCODING => '',
                                CURLOPT_MAXREDIRS => 10,
                                CURLOPT_TIMEOUT => 10,
                                CURLOPT_FOLLOWLOCATION => true,
                                CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
                                CURLOPT_CUSTOMREQUEST => 'POST',
                                CURLOPT_POSTFIELDS => json_encode($requestData),
                                CURLOPT_HTTPHEADER => [
                                    'Content-Type: application/json',
                                ],
                            ]);

                            $response = curl_exec($curl);
                            $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
                            $error = curl_error($curl);
                            curl_close($curl);

                            if ($error) {
                                throw new \Exception("CURL Error: {$error}");
                            }

                            if ($httpCode >= 200 && $httpCode < 300) {
                                \Filament\Notifications\Notification::make()
                                    ->title('Test berhasil!')
                                    ->body("Pesan test berhasil dikirim ke {$phone}. HTTP Code: {$httpCode}")
                                    ->success()
                                    ->send();
                            } else {
                                throw new \Exception("HTTP Error: {$httpCode}. Response: {$response}");
                            }
                        } catch (\Exception $e) {
                            \Filament\Notifications\Notification::make()
                                ->title('Test gagal!')
                                ->body("Gagal mengirim pesan test: " . $e->getMessage())
                                ->danger()
                                ->send();
                        }
                    }),

                Actions\Action::make('activate')
                    ->label('Aktifkan')
                    ->icon('heroicon-o-check-circle')
                    ->color('success')
                    ->requiresConfirmation()
                    ->modalHeading('Aktifkan Konfigurasi')
                    ->modalDescription('Apakah Anda yakin ingin mengaktifkan konfigurasi ini? Konfigurasi lain yang aktif akan dinonaktifkan.')
                    ->action(function (WhatsappApiToken $record) {
                        // Deactivate all other tokens
                        WhatsappApiToken::where('id', '!=', $record->id)
                            ->where('status', 'active')
                            ->update(['status' => 'inactive']);

                        // Activate this token
                        $record->update(['status' => 'active']);
                    })
                    ->visible(fn (WhatsappApiToken $record) => $record->status !== 'active')
                    ->successNotificationTitle('Konfigurasi berhasil diaktifkan'),

                Actions\Action::make('deactivate')
                    ->label('Nonaktifkan')
                    ->icon('heroicon-o-x-circle')
                    ->color('danger')
                    ->requiresConfirmation()
                    ->modalHeading('Nonaktifkan Konfigurasi')
                    ->modalDescription('Apakah Anda yakin ingin menonaktifkan konfigurasi ini?')
                    ->action(function (WhatsappApiToken $record) {
                        $record->update(['status' => 'inactive']);
                    })
                    ->visible(fn (WhatsappApiToken $record) => $record->status === 'active')
                    ->successNotificationTitle('Konfigurasi berhasil dinonaktifkan'),

                Actions\ViewAction::make(),
                Actions\EditAction::make(),
                Actions\DeleteAction::make(),
            ])
            ->bulkActions([
                Actions\BulkAction::make('activate')
                    ->label('Aktifkan yang Dipilih')
                    ->icon('heroicon-o-check-circle')
                    ->color('success')
                    ->requiresConfirmation()
                    ->action(function ($records) {
                        // Deactivate all active tokens first
                        WhatsappApiToken::where('status', 'active')->update(['status' => 'inactive']);

                        // Activate selected tokens
                        foreach ($records as $record) {
                            $record->update(['status' => 'active']);
                        }
                    })
                    ->successNotificationTitle('Konfigurasi berhasil diaktifkan'),

                Actions\BulkAction::make('deactivate')
                    ->label('Nonaktifkan yang Dipilih')
                    ->icon('heroicon-o-x-circle')
                    ->color('danger')
                    ->requiresConfirmation()
                    ->action(function ($records) {
                        foreach ($records as $record) {
                            $record->update(['status' => 'inactive']);
                        }
                    })
                    ->successNotificationTitle('Konfigurasi berhasil dinonaktifkan'),

                Actions\BulkActionGroup::make([
                    Actions\DeleteBulkAction::make(),
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
            'index' => Pages\ListWhatsappApiTokens::route('/'),
            'create' => Pages\CreateWhatsappApiToken::route('/create'),
            'view' => Pages\ViewWhatsappApiToken::route('/{record}'),
            'edit' => Pages\EditWhatsappApiToken::route('/{record}/edit'),
        ];
    }
}

