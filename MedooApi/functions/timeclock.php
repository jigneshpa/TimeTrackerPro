<?php

function handle_clock_in() {
    $employee = authenticate_user();
    $data = json_decode(file_get_contents('php://input'), true);

    $db = get_db_connection();
    $activeEntry = $db->get('time_entries_timetrackpro', 'id', [
        'employee_id' => $employee['id'],
        'clock_out' => null,
        'status' => 'active'
    ]);

    if ($activeEntry) {
        send_error_response('You already have an active time entry', 400);
    }

    $insertData = [
        'employee_id' => $employee['id'],
        'clock_in' => date('Y-m-d H:i:s'),
        'notes' => $data['notes'] ?? null,
        'status' => 'active'
    ];

    $db->insert('time_entries_timetrackpro', $insertData);
    $entryId = $db->id();

    $entry = $db->get('time_entries_timetrackpro', '*', ['id' => $entryId]);

    send_success_response($entry, 'Clocked in successfully', 201);
}

function handle_clock_out() {
    $employee = authenticate_user();
    $data = json_decode(file_get_contents('php://input'), true);

    $db = get_db_connection();
    $activeEntry = $db->get('time_entries_timetrackpro', '*', [
        'employee_id' => $employee['id'],
        'clock_out' => null,
        'status' => 'active'
    ]);

    if (!$activeEntry) {
        send_error_response('No active time entry found', 404);
    }

    $db->update('time_entries_timetrackpro', [
        'clock_out' => date('Y-m-d H:i:s'),
        'break_duration' => $data['break_duration'] ?? 0,
        'status' => 'completed'
    ], [
        'id' => $activeEntry['id']
    ]);

    $entry = $db->get('time_entries_timetrackpro', '*', ['id' => $activeEntry['id']]);

    send_success_response($entry, 'Clocked out successfully');
}

function handle_get_active_entry() {
    $employee = authenticate_user();

    $db = get_db_connection();
    $activeEntry = $db->get('time_entries_timetrackpro', '*', [
        'employee_id' => $employee['id'],
        'clock_out' => null,
        'status' => 'active'
    ]);

    send_success_response($activeEntry);
}

function handle_get_today_entries() {
    $employee = authenticate_user();

    $db = get_db_connection();
    $entries = $db->select('time_entries_timetrackpro', '*', [
        'employee_id' => $employee['id'],
        'clock_in[>=]' => date('Y-m-d 00:00:00'),
        'clock_in[<=]' => date('Y-m-d 23:59:59'),
        'ORDER' => ['clock_in' => 'DESC']
    ]);

    send_success_response($entries);
}

function handle_get_entries() {
    $employee = authenticate_user();

    $startDate = $_GET['start_date'] ?? date('Y-m-d', strtotime('-30 days'));
    $endDate = $_GET['end_date'] ?? date('Y-m-d');

    $db = get_db_connection();
    $entries = $db->select('time_entries_timetrackpro', '*', [
        'employee_id' => $employee['id'],
        'clock_in[>=]' => $startDate . ' 00:00:00',
        'clock_in[<=]' => $endDate . ' 23:59:59',
        'ORDER' => ['clock_in' => 'DESC']
    ]);

    send_success_response($entries);
}

function handle_update_entry() {
    $employee = authenticate_user();
    $data = json_decode(file_get_contents('php://input'), true);

    if (!isset($data['id'])) {
        send_error_response('Entry ID is required', 400);
    }

    $db = get_db_connection();
    $entry = $db->get('time_entries_timetrackpro', '*', [
        'id' => $data['id'],
        'employee_id' => $employee['id']
    ]);

    if (!$entry) {
        send_error_response('Entry not found', 404);
    }

    $updateData = [];
    if (isset($data['clock_in'])) $updateData['clock_in'] = $data['clock_in'];
    if (isset($data['clock_out'])) $updateData['clock_out'] = $data['clock_out'];
    if (isset($data['break_duration'])) $updateData['break_duration'] = $data['break_duration'];
    if (isset($data['notes'])) $updateData['notes'] = $data['notes'];

    if ($entry['status'] === 'completed') {
        $updateData['status'] = 'edited';
    }

    if (!empty($updateData)) {
        $db->update('time_entries_timetrackpro', $updateData, ['id' => $data['id']]);
    }

    $updatedEntry = $db->get('time_entries_timetrackpro', '*', ['id' => $data['id']]);

    send_success_response($updatedEntry, 'Entry updated successfully');
}
