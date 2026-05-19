<?php

return [
    'api_url'             => env('TASTYIGNITER_API_URL', 'http://localhost:8000/api'),
    'api_token'           => env('TASTYIGNITER_API_TOKEN', ''),
    'default_location_id' => (int) env('TASTYIGNITER_DEFAULT_LOCATION_ID', 1),
];
