<?php

namespace CookersDelight\TableSession\Models;

use Igniter\Flame\Database\Model;
use Illuminate\Database\Eloquent\Builder;

class CdAnnouncement extends Model
{
    protected $table = 'cd_announcements';

    protected $fillable = [
        'title', 'description', 'link',
        'background_color', 'text_color',
        'status', 'start_date', 'end_date',
    ];

    protected $casts = [
        'status'     => 'integer',
        'start_date' => 'date',
        'end_date'   => 'date',
    ];

    public function scopeActive(Builder $query): Builder
    {
        $today = now()->toDateString();

        return $query->where('status', 1)
            ->where(fn ($q) => $q
                ->whereNull('start_date')
                ->orWhere('start_date', '<=', $today)
            )
            ->where(fn ($q) => $q
                ->whereNull('end_date')
                ->orWhere('end_date', '>=', $today)
            );
    }
}
