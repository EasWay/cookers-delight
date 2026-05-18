<?php

namespace CookersDelight\TableSession\Http\Controllers;

use CookersDelight\TableSession\Models\CdAnnouncement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class CdAnnouncementsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = CdAnnouncement::latest();

        if ($request->boolean('active')) {
            $query->active();
        }

        $announcements = $query->get()->map(fn ($a) => $this->shape($a));

        return response()->json(['data' => $announcements]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title'            => ['required', 'string', 'max:255'],
            'description'      => ['nullable', 'string'],
            'link'             => ['nullable', 'url', 'max:500'],
            'background_color' => ['nullable', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'text_color'       => ['nullable', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'status'           => ['nullable', 'integer', 'in:0,1'],
            'start_date'       => ['nullable', 'date'],
            'end_date'         => ['nullable', 'date', 'after_or_equal:start_date'],
        ]);

        $announcement = CdAnnouncement::create($data);

        return response()->json(['data' => $this->shape($announcement)], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $announcement = CdAnnouncement::findOrFail($id);

        $data = $request->validate([
            'title'            => ['sometimes', 'string', 'max:255'],
            'description'      => ['nullable', 'string'],
            'link'             => ['nullable', 'url', 'max:500'],
            'background_color' => ['nullable', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'text_color'       => ['nullable', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'status'           => ['nullable', 'integer', 'in:0,1'],
            'start_date'       => ['nullable', 'date'],
            'end_date'         => ['nullable', 'date', 'after_or_equal:start_date'],
        ]);

        $announcement->update($data);

        return response()->json(['data' => $this->shape($announcement->fresh())]);
    }

    public function destroy(int $id): JsonResponse
    {
        CdAnnouncement::findOrFail($id)->delete();

        return response()->json(null, 204);
    }

    private function shape(CdAnnouncement $a): array
    {
        return [
            'id'               => $a->id,
            'title'            => $a->title,
            'message'          => $a->title,
            'description'      => $a->description,
            'link'             => $a->link,
            'background_color' => $a->background_color,
            'text_color'       => $a->text_color,
            'status'           => $a->status,
            'is_active'        => $a->status === 1,
            'start_date'       => $a->start_date?->toDateString(),
            'end_date'         => $a->end_date?->toDateString(),
        ];
    }
}
