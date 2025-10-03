<?php

function handle_get_vacation_balance() {
    $employee = authenticate_user();

    $db = get_db_connection();
    $balance = $db->get('employees', [
        'vacation_days_total',
        'vacation_days_used'
    ], [
        'id' => $employee['id']
    ]);

    $balance['vacation_days_remaining'] = $balance['vacation_days_total'] - $balance['vacation_days_used'];

    send_success_response($balance);
}

function handle_get_vacation_requests() {
    $employee = authenticate_user();

    $db = get_db_connection();
    $requests = $db->select('vacation_requests', '*', [
        'employee_id' => $employee['id'],
        'ORDER' => ['created_at' => 'DESC']
    ]);

    foreach ($requests as &$request) {
        if ($request['approved_by']) {
            $approver = $db->get('employees', [
                'first_name',
                'last_name'
            ], [
                'id' => $request['approved_by']
            ]);
            $request['approved_by_name'] = $approver['first_name'] . ' ' . $approver['last_name'];
        }
    }

    send_success_response($requests);
}

function handle_create_vacation_request() {
    $employee = authenticate_user();
    $data = json_decode(file_get_contents('php://input'), true);

    $required = ['start_date', 'end_date', 'days_requested'];
    foreach ($required as $field) {
        if (!isset($data[$field]) || empty($data[$field])) {
            send_error_response("Field '$field' is required", 400);
        }
    }

    $db = get_db_connection();
    $balance = $db->get('employees', [
        'vacation_days_total',
        'vacation_days_used'
    ], [
        'id' => $employee['id']
    ]);

    $remainingDays = $balance['vacation_days_total'] - $balance['vacation_days_used'];

    if ($data['days_requested'] > $remainingDays) {
        send_error_response('Insufficient vacation days available', 400);
    }

    $insertData = [
        'employee_id' => $employee['id'],
        'start_date' => $data['start_date'],
        'end_date' => $data['end_date'],
        'days_requested' => $data['days_requested'],
        'request_type' => $data['request_type'] ?? 'vacation',
        'notes' => $data['notes'] ?? null,
        'status' => 'pending'
    ];

    $db->insert('vacation_requests', $insertData);
    $requestId = $db->id();

    $request = $db->get('vacation_requests', '*', ['id' => $requestId]);

    send_success_response($request, 'Vacation request created successfully', 201);
}

function handle_update_vacation_request() {
    $employee = authenticate_user();
    $data = json_decode(file_get_contents('php://input'), true);

    if (!isset($data['id'])) {
        send_error_response('Request ID is required', 400);
    }

    $db = get_db_connection();
    $request = $db->get('vacation_requests', '*', [
        'id' => $data['id'],
        'employee_id' => $employee['id']
    ]);

    if (!$request) {
        send_error_response('Request not found', 404);
    }

    if ($request['status'] !== 'pending') {
        send_error_response('Can only update pending requests', 400);
    }

    $updateData = [];
    if (isset($data['start_date'])) $updateData['start_date'] = $data['start_date'];
    if (isset($data['end_date'])) $updateData['end_date'] = $data['end_date'];
    if (isset($data['days_requested'])) $updateData['days_requested'] = $data['days_requested'];
    if (isset($data['request_type'])) $updateData['request_type'] = $data['request_type'];
    if (isset($data['notes'])) $updateData['notes'] = $data['notes'];

    if (!empty($updateData)) {
        $db->update('vacation_requests', $updateData, ['id' => $data['id']]);
    }

    $updatedRequest = $db->get('vacation_requests', '*', ['id' => $data['id']]);

    send_success_response($updatedRequest, 'Request updated successfully');
}

function handle_cancel_vacation_request() {
    $employee = authenticate_user();
    $data = json_decode(file_get_contents('php://input'), true);

    if (!isset($data['id'])) {
        send_error_response('Request ID is required', 400);
    }

    $db = get_db_connection();
    $request = $db->get('vacation_requests', '*', [
        'id' => $data['id'],
        'employee_id' => $employee['id']
    ]);

    if (!$request) {
        send_error_response('Request not found', 404);
    }

    if ($request['status'] === 'cancelled') {
        send_error_response('Request already cancelled', 400);
    }

    $db->update('vacation_requests', [
        'status' => 'cancelled'
    ], [
        'id' => $data['id']
    ]);

    $updatedRequest = $db->get('vacation_requests', '*', ['id' => $data['id']]);

    send_success_response($updatedRequest, 'Request cancelled successfully');
}
