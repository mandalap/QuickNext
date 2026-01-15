<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OutletSetting extends Model
{
    use HasFactory;

    protected $table = 'outlet_settings';

    protected $fillable = [
        'outlet_id',
        'setting_key',
        'setting_value',
        'data_type',
        'description',
    ];

    public $timestamps = true;

    /**
     * Get the outlet that owns the setting.
     */
    public function outlet(): BelongsTo
    {
        return $this->belongsTo(Outlet::class);
    }

    /**
     * Get the setting value with proper type casting.
     */
    public function getValueAttribute()
    {
        return match ($this->data_type) {
            'integer' => (int) $this->setting_value,
            'boolean' => filter_var($this->setting_value, FILTER_VALIDATE_BOOLEAN),
            'json' => json_decode($this->setting_value, true),
            default => $this->setting_value,
        };
    }

    /**
     * Set the setting value with proper type conversion.
     */
    public function setValueAttribute($value)
    {
        $this->attributes['setting_value'] = match ($this->data_type) {
            'json' => json_encode($value),
            'boolean' => $value ? '1' : '0',
            default => (string) $value,
        };
    }

    /**
     * Scope a query to filter by setting key.
     */
    public function scopeByKey($query, $key)
    {
        return $query->where('setting_key', $key);
    }
}
