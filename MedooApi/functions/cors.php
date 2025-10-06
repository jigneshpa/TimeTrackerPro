<?php

function handle_cors() {
    // Allow production and development origins
    $allowed_origins = [
        'http://timetrackerpro.kabba.ai',
        'https://timetrackerpro.kabba.ai',
    ];

    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

    if (in_array($origin, $allowed_origins) || getenv('CORS_ORIGIN')) {
        $allowed_origin = getenv('CORS_ORIGIN') ?: $origin;
        header("Access-Control-Allow-Origin: $allowed_origin");
    } else {
        header("Access-Control-Allow-Origin: *");
    }

    header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization");
    header("Access-Control-Allow-Credentials: true");

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit;
    }
}
