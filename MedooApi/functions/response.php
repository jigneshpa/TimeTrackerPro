<?php

function send_json_response($data, $statusCode = 200) {
    http_response_code($statusCode);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

function send_success_response($data = null, $message = 'Success', $statusCode = 200) {
    send_json_response([
        'success' => true,
        'message' => $message,
        'data' => $data
    ], $statusCode);
}

function send_error_response($message = 'Error', $statusCode = 400, $errors = null) {
    send_json_response([
        'success' => false,
        'message' => $message,
        'errors' => $errors
    ], $statusCode);
}
