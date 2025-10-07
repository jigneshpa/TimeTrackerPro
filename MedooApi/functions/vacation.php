<?php

function handle_get_vacation_balance() {
    $user = authenticate_user();

    $db = get_db_connection();
    $balance = $db->get('employees_timetrackpro', [
        'vacation_days_total',
        'vacation_days_used'
    ], [
        'id' => $user['employee_id']
    ]);

    $balance['vacation_days_remaining'] = $balance['vacation_days_total'] - $balance['vacation_days_used'];

    send_success_response($balance);
}

function handle_get_vacation_requests() {
    $user = authenticate_user();

    $db = get_db_connection();
    $requests = $db->select('vacation_requests_timetrackpro', '*', [
        'employee_id' => $user['employee_id'],
        'ORDER' => ['created_at' => 'DESC']
    ]);

    foreach ($requests as &$request) {
        if ($request['approved_by']) {
            $sql = "SELECT CONCAT(u.first_name, ' ', COALESCE(u.last_name, '')) AS approver_name
                    FROM employees_timetrackpro e
                    JOIN users u ON e.user_id = u.id
                    WHERE e.id = ?";
            $stmt = $db->query($sql, [$request['approved_by']]);
            $approver = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($approver) {
                $request['approved_by_name'] = $approver['approver_name'];
            }
        }
    }

    send_success_response($requests);
}

function handle_create_vacation_request() {
    $user = authenticate_user();
    $data = json_decode(file_get_contents('php://input'), true);

    $required = ['start_date', 'end_date', 'days_requested'];
    foreach ($required as $field) {
        if (!isset($data[$field]) || empty($data[$field])) {
            send_error_response("Field '$field' is required", 400);
        }
    }

    $db = get_db_connection();
    $balance = $db->get('employees_timetrackpro', [
        'vacation_days_total',
        'vacation_days_used'
    ], [
        'id' => $user['employee_id']
    ]);

    $remainingDays = $balance['vacation_days_total'] - $balance['vacation_days_used'];

    if ($data['days_requested'] > $remainingDays) {
        send_error_response('Insufficient vacation days available', 400);
    }

    $insertData = [
        'employee_id' => $user['employee_id'],
        'start_date' => $data['start_date'],
        'end_date' => $data['end_date'],
        'days_requested' => $data['days_requested'],
        'request_type' => $data['request_type'] ?? 'vacation',
        'notes' => $data['notes'] ?? null,
        'status' => 'pending'
    ];

    $db->insert('vacation_requests_timetrackpro', $insertData);
    $requestId = $db->id();

    $request = $db->get('vacation_requests_timetrackpro', '*', ['id' => $requestId]);

    send_success_response($request, 'Vacation request created successfully', 201);
}

function handle_update_vacation_request() {
    $user = authenticate_user();
    $data = json_decode(file_get_contents('php://input'), true);

    if (!isset($data['id'])) {
        send_error_response('Request ID is required', 400);
    }

    $db = get_db_connection();
    $request = $db->get('vacation_requests_timetrackpro', '*', [
        'id' => $data['id'],
        'employee_id' => $user['employee_id']
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
        $db->update('vacation_requests_timetrackpro', $updateData, ['id' => $data['id']]);
    }

    $updatedRequest = $db->get('vacation_requests_timetrackpro', '*', ['id' => $data['id']]);

    send_success_response($updatedRequest, 'Request updated successfully');
}

function handle_cancel_vacation_request() {
    $user = authenticate_user();
    $data = json_decode(file_get_contents('php://input'), true);

    if (!isset($data['id'])) {
        send_error_response('Request ID is required', 400);
    }

    $db = get_db_connection();
    $request = $db->get('vacation_requests_timetrackpro', '*', [
        'id' => $data['id'],
        'employee_id' => $user['employee_id']
    ]);

    if (!$request) {
        send_error_response('Request not found', 404);
    }

    if ($request['status'] === 'cancelled') {
        send_error_response('Request already cancelled', 400);
    }

    $db->update('vacation_requests_timetrackpro', [
        'status' => 'cancelled'
    ], [
        'id' => $data['id']
    ]);

    $updatedRequest = $db->get('vacation_requests_timetrackpro', '*', ['id' => $data['id']]);

    send_success_response($updatedRequest, 'Request cancelled successfully');
}
