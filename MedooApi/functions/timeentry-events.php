<?php

function handle_create_time_entry_event() {
    $user = authenticate_user();
    $data = json_decode(file_get_contents('php://input'), true);

    if (!isset($data['entry_type'])) {
        send_error_response('Entry type is required', 400);
    }

    $validTypes = ['clock_in', 'clock_out', 'lunch_out', 'lunch_in', 'unpaid_out', 'unpaid_in'];
    if (!in_array($data['entry_type'], $validTypes)) {
        send_error_response('Invalid entry type', 400);
    }

    $db = get_db_connection();

    // Validation logic based on entry type
    $entries = $db->select('time_entry_events_timetrackpro', '*', [
        'employee_id' => $user['employee_id'],
        'timestamp[>=]' => date('Y-m-d 00:00:00'),
        'ORDER' => ['timestamp' => 'DESC']
    ]);

    $lastEntry = !empty($entries) ? $entries[0] : null;

    // Validate state transitions
    switch ($data['entry_type']) {
        case 'clock_in':
            if ($lastEntry && $lastEntry['entry_type'] !== 'clock_out') {
                send_error_response('Cannot clock in. You must clock out first.', 400);
            }
            break;
        case 'clock_out':
            if (!$lastEntry || $lastEntry['entry_type'] === 'clock_out') {
                send_error_response('Cannot clock out. You must be clocked in first.', 400);
            }
            // Must end lunch/unpaid break before clocking out
            if ($lastEntry && in_array($lastEntry['entry_type'], ['lunch_out', 'unpaid_out'])) {
                send_error_response('Cannot clock out. You must end your current break first.', 400);
            }
            break;
        case 'lunch_out':
            if (!$lastEntry || $lastEntry['entry_type'] !== 'clock_in') {
                if ($lastEntry && $lastEntry['entry_type'] === 'lunch_in') {
                    // Allow if last entry was lunch_in (returning from lunch)
                } elseif ($lastEntry && $lastEntry['entry_type'] === 'unpaid_in') {
                    // Allow if last entry was unpaid_in (returning from unpaid)
                } else {
                    send_error_response('Cannot start lunch. You must be clocked in first.', 400);
                }
            }
            break;
        case 'lunch_in':
            if (!$lastEntry || $lastEntry['entry_type'] !== 'lunch_out') {
                send_error_response('Cannot end lunch. You must start lunch first.', 400);
            }
            break;
        case 'unpaid_out':
            if (!$lastEntry || !in_array($lastEntry['entry_type'], ['clock_in', 'lunch_in', 'unpaid_in'])) {
                send_error_response('Cannot start unpaid break. You must be clocked in first.', 400);
            }
            break;
        case 'unpaid_in':
            if (!$lastEntry || $lastEntry['entry_type'] !== 'unpaid_out') {
                send_error_response('Cannot end unpaid break. You must start unpaid break first.', 400);
            }
            break;
    }

    $insertData = [
        'employee_id' => $user['employee_id'],
        'entry_type' => $data['entry_type'],
        'timestamp' => date('Y-m-d H:i:s'),
        'notes' => $data['notes'] ?? null
    ];

    $db->insert('time_entry_events_timetrackpro', $insertData);
    $entryId = $db->id();

    $entry = $db->get('time_entry_events_timetrackpro', '*', ['id' => $entryId]);

    send_success_response($entry, 'Time entry event created successfully', 201);
}

function handle_get_today_time_events() {
    $user = authenticate_user();

    $db = get_db_connection();
    $entries = $db->select('time_entry_events_timetrackpro', '*', [
        'employee_id' => $user['employee_id'],
        'timestamp[>=]' => date('Y-m-d 00:00:00'),
        'timestamp[<=]' => date('Y-m-d 23:59:59'),
        'ORDER' => ['timestamp' => 'ASC']
    ]);

    send_success_response($entries);
}

function handle_get_time_events() {
    $user = authenticate_user();

    $startDate = $_GET['start_date'] ?? date('Y-m-d', strtotime('-30 days'));
    $endDate = $_GET['end_date'] ?? date('Y-m-d');

    $db = get_db_connection();
    $entries = $db->select('time_entry_events_timetrackpro', '*', [
        'employee_id' => $user['employee_id'],
        'timestamp[>=]' => $startDate . ' 00:00:00',
        'timestamp[<=]' => $endDate . ' 23:59:59',
        'ORDER' => ['timestamp' => 'ASC']
    ]);

    send_success_response($entries);
}

function handle_get_current_status() {
    $user = authenticate_user();

    $db = get_db_connection();
    $entries = $db->select('time_entry_events_timetrackpro', '*', [
        'employee_id' => $user['employee_id'],
        'timestamp[>=]' => date('Y-m-d 00:00:00'),
        'ORDER' => ['timestamp' => 'DESC'],
        'LIMIT' => 1
    ]);

    $lastEntry = !empty($entries) ? $entries[0] : null;

    $status = [
        'currentStatus' => 'clocked_out',
        'isOnLunch' => false,
        'isOnUnpaidBreak' => false,
        'lastEntry' => $lastEntry
    ];

    if ($lastEntry) {
        switch ($lastEntry['entry_type']) {
            case 'clock_in':
                $status['currentStatus'] = 'clocked_in';
                break;
            case 'clock_out':
                $status['currentStatus'] = 'clocked_out';
                break;
            case 'lunch_out':
                $status['currentStatus'] = 'on_lunch';
                $status['isOnLunch'] = true;
                break;
            case 'lunch_in':
                $status['currentStatus'] = 'clocked_in';
                break;
            case 'unpaid_out':
                $status['currentStatus'] = 'on_unpaid_break';
                $status['isOnUnpaidBreak'] = true;
                break;
            case 'unpaid_in':
                $status['currentStatus'] = 'clocked_in';
                break;
        }
    }

    send_success_response($status);
}
