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

    // Get current time
    $currentTime = date('Y-m-d H:i:s');

    // Enforce minimum lunch duration for lunch_in
    if ($data['entry_type'] === 'lunch_in' && $lastEntry && $lastEntry['entry_type'] === 'lunch_out') {
        $lunchOutTime = strtotime($lastEntry['timestamp']);
        $lunchInTime = strtotime($currentTime);
        $actualLunchMinutes = ($lunchInTime - $lunchOutTime) / 60;

        // Get default lunch duration from settings
        $defaultLunchDuration = (int)($db->get('system_settings_timetrackpro', 'setting_value', [
            'setting_key' => 'default_lunch_duration'
        ]) ?? 60);

        // If actual lunch is less than default, adjust the lunch_in time to enforce minimum
        if ($actualLunchMinutes < $defaultLunchDuration) {
            $adjustedLunchInTime = $lunchOutTime + ($defaultLunchDuration * 60);
            $currentTime = date('Y-m-d H:i:s', $adjustedLunchInTime);
        }
    }

    // Apply pay increment rounding based on entry type
    // Round UP for: clock_in, lunch_in, unpaid_in (starting work/resuming work)
    // Round DOWN for: clock_out, lunch_out, unpaid_out (stopping work/taking break)
    $roundUpTypes = ['clock_in', 'lunch_in', 'unpaid_in'];
    $isClockIn = in_array($data['entry_type'], $roundUpTypes);

    // Use the rounding function from timeclock.php
    require_once __DIR__ . '/timeclock.php';
    $roundedTime = apply_pay_increment_rounding($currentTime, $isClockIn);

    // Prevent breaks/clock_out from being recorded with timestamps that create logical inconsistencies
    // If starting a break (lunch_out or unpaid_out), ensure it's not earlier than the last clock_in
    if (in_array($data['entry_type'], ['lunch_out', 'unpaid_out']) && $lastEntry && $lastEntry['entry_type'] === 'clock_in') {
        $lastClockInTime = strtotime($lastEntry['timestamp']);
        $breakStartTime = strtotime($roundedTime);

        // If the rounded break time would be before the clock_in, adjust it to match clock_in
        if ($breakStartTime < $lastClockInTime) {
            $roundedTime = $lastEntry['timestamp'];
        }
    }

    // If clocking out and there's a recent break/lunch return, ensure clock_out is not before that
    if ($data['entry_type'] === 'clock_out' && $lastEntry && in_array($lastEntry['entry_type'], ['lunch_in', 'unpaid_in', 'clock_in'])) {
        $lastEntryTime = strtotime($lastEntry['timestamp']);
        $clockOutTime = strtotime($roundedTime);

        // If the rounded clock_out would be before the last activity, adjust it to match
        if ($clockOutTime < $lastEntryTime) {
            $roundedTime = $lastEntry['timestamp'];
        }
    }

    $insertData = [
        'employee_id' => $user['employee_id'],
        'entry_type' => $data['entry_type'],
        'timestamp' => $roundedTime,
        'notes' => $data['notes'] ?? null
    ];

    $db->insert('time_entry_events_timetrackpro', $insertData);
    $entryId = $db->id();

    $entry = $db->get('time_entry_events_timetrackpro', '*', ['id' => $entryId]);

    // Convert timestamp to ISO 8601 format with timezone
    if ($entry && isset($entry['timestamp'])) {
        $dt = new DateTime($entry['timestamp'], new DateTimeZone('America/Chicago'));
        $entry['timestamp'] = $dt->format('c'); // ISO 8601 format with timezone
    }

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

    // Convert timestamps to ISO 8601 format with timezone
    foreach ($entries as &$entry) {
        if (isset($entry['timestamp'])) {
            $dt = new DateTime($entry['timestamp'], new DateTimeZone('America/Chicago'));
            $entry['timestamp'] = $dt->format('c');
        }
    }

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

    // Convert timestamps to ISO 8601 format with timezone
    foreach ($entries as &$entry) {
        if (isset($entry['timestamp'])) {
            $dt = new DateTime($entry['timestamp'], new DateTimeZone('America/Chicago'));
            $entry['timestamp'] = $dt->format('c');
        }
    }

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
