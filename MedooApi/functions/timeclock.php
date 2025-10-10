<?php

/**
 * Get system setting value
 */
function get_setting($key, $default = null) {
    $db = get_db_connection();
    $setting = $db->get('system_settings_timetrackpro', ['setting_value', 'setting_type'], [
        'setting_key' => $key
    ]);

    if (!$setting) {
        return $default;
    }

    $value = $setting['setting_value'];

    switch ($setting['setting_type']) {
        case 'number':
            return is_numeric($value) ? (float)$value : $default;
        case 'boolean':
            return (bool)((int)$value);
        case 'json':
            return json_decode($value, true);
        default:
            return $value;
    }
}

/**
 * Round time to nearest pay increment
 * For clock in: round UP to next increment
 * For clock out: round DOWN to previous increment
 *
 * Examples with 15-minute increments:
 * - Clock in at 8:03 AM -> Rounded to 8:15 AM
 * - Clock in at 8:16 AM -> Rounded to 8:30 AM
 * - Clock out at 5:12 PM -> Rounded to 5:00 PM
 * - Clock out at 5:47 PM -> Rounded to 5:45 PM
 *
 * @param string $timestamp The timestamp to round (Y-m-d H:i:s format)
 * @param bool $isClockIn True to round UP, false to round DOWN
 * @return string Rounded timestamp (Y-m-d H:i:s format)
 */
function apply_pay_increment_rounding($timestamp, $isClockIn = true) {
    $payIncrements = get_setting('pay_increments', 15);

    $time = strtotime($timestamp);
    $minutes = (int)date('i', $time);
    $seconds = (int)date('s', $time);

    // Calculate minutes past the hour including seconds
    $totalMinutes = $minutes + ($seconds / 60);

    if ($isClockIn) {
        // Round UP to next increment for clock in
        $roundedMinutes = ceil($totalMinutes / $payIncrements) * $payIncrements;
    } else {
        // Round DOWN to previous increment for clock out
        $roundedMinutes = floor($totalMinutes / $payIncrements) * $payIncrements;
    }

    // Create new timestamp with rounded minutes
    $hour = (int)date('H', $time);
    $date = date('Y-m-d', $time);

    // Handle overflow to next hour
    if ($roundedMinutes >= 60) {
        $hour++;
        $roundedMinutes -= 60;
    }

    return sprintf('%s %02d:%02d:00', $date, $hour, $roundedMinutes);
}

function handle_clock_in() {
    $user = authenticate_user();
    $data = json_decode(file_get_contents('php://input'), true);

    $db = get_db_connection();
    $activeEntry = $db->get('time_entries_timetrackpro', 'id', [
        'employee_id' => $user['employee_id'],
        'clock_out' => null,
        'status' => 'active'
    ]);

    if ($activeEntry) {
        send_error_response('You already have an active time entry', 400);
    }

    // Get current time
    $currentTime = date('Y-m-d H:i:s');

    // Apply pay increment rounding (round UP for clock in)
    $roundedTime = apply_pay_increment_rounding($currentTime, true);

    $insertData = [
        'employee_id' => $user['employee_id'],
        'clock_in' => $roundedTime,
        'notes' => $data['notes'] ?? null,
        'status' => 'active'
    ];

    $db->insert('time_entries_timetrackpro', $insertData);
    $entryId = $db->id();

    $entry = $db->get('time_entries_timetrackpro', '*', ['id' => $entryId]);

    send_success_response($entry, 'Clocked in successfully', 201);
}

function handle_clock_out() {
    $user = authenticate_user();
    $data = json_decode(file_get_contents('php://input'), true);

    $db = get_db_connection();
    $activeEntry = $db->get('time_entries_timetrackpro', '*', [
        'employee_id' => $user['employee_id'],
        'clock_out' => null,
        'status' => 'active'
    ]);

    if (!$activeEntry) {
        send_error_response('No active time entry found', 404);
    }

    // Get current time
    $currentTime = date('Y-m-d H:i:s');

    // Apply pay increment rounding (round DOWN for clock out)
    $roundedTime = apply_pay_increment_rounding($currentTime, false);

    $db->update('time_entries_timetrackpro', [
        'clock_out' => $roundedTime,
        'break_duration' => $data['break_duration'] ?? 0,
        'status' => 'completed'
    ], [
        'id' => $activeEntry['id']
    ]);

    $entry = $db->get('time_entries_timetrackpro', '*', ['id' => $activeEntry['id']]);

    send_success_response($entry, 'Clocked out successfully');
}

function handle_get_active_entry() {
    $user = authenticate_user();

    $db = get_db_connection();
    $activeEntry = $db->get('time_entries_timetrackpro', '*', [
        'employee_id' => $user['employee_id'],
        'clock_out' => null,
        'status' => 'active'
    ]);

    send_success_response($activeEntry);
}

function handle_get_today_entries() {
    $user = authenticate_user();

    $db = get_db_connection();
    $entries = $db->select('time_entries_timetrackpro', '*', [
        'employee_id' => $user['employee_id'],
        'clock_in[>=]' => date('Y-m-d 00:00:00'),
        'clock_in[<=]' => date('Y-m-d 23:59:59'),
        'ORDER' => ['clock_in' => 'DESC']
    ]);

    send_success_response($entries);
}

function handle_get_entries() {
    $user = authenticate_user();

    $startDate = $_GET['start_date'] ?? date('Y-m-d', strtotime('-30 days'));
    $endDate = $_GET['end_date'] ?? date('Y-m-d');

    $db = get_db_connection();
    $entries = $db->select('time_entries_timetrackpro', '*', [
        'employee_id' => $user['employee_id'],
        'clock_in[>=]' => $startDate . ' 00:00:00',
        'clock_in[<=]' => $endDate . ' 23:59:59',
        'ORDER' => ['clock_in' => 'DESC']
    ]);

    send_success_response($entries);
}

function handle_update_entry() {
    $user = authenticate_user();
    $data = json_decode(file_get_contents('php://input'), true);

    if (!isset($data['id'])) {
        send_error_response('Entry ID is required', 400);
    }

    $db = get_db_connection();
    $entry = $db->get('time_entries_timetrackpro', '*', [
        'id' => $data['id'],
        'employee_id' => $user['employee_id']
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
