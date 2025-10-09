<?php

// ============================================================================
// SYSTEM SETTINGS
// ============================================================================

function handle_get_system_settings() {
    require_admin();

    $db = get_db_connection();

    $settings = $db->select('system_settings_timetrackpro', '*', [
        'ORDER' => ['setting_key' => 'ASC']
    ]);

    $formatted = [];
    foreach ($settings as $setting) {
        $value = $setting['setting_value'];

        // Convert value based on type
        switch ($setting['setting_type']) {
            case 'number':
                $value = is_numeric($value) ? (float)$value : 0;
                break;
            case 'boolean':
                $value = (bool)((int)$value);
                break;
            case 'json':
                $value = json_decode($value, true);
                break;
        }

        $formatted[$setting['setting_key']] = $value;
    }

    send_success_response($formatted);
}

function handle_update_system_settings() {
    require_admin();
    $data = json_decode(file_get_contents('php://input'), true);

    if (empty($data) || !is_array($data)) {
        send_error_response('Settings data is required', 400);
    }

    $db = get_db_connection();

    foreach ($data as $key => $value) {
        $existing = $db->get('system_settings_timetrackpro', '*', [
            'setting_key' => $key
        ]);

        if ($existing) {
            // Determine type and format value
            $settingType = $existing['setting_type'];
            $formattedValue = $value;

            switch ($settingType) {
                case 'boolean':
                    $formattedValue = $value ? '1' : '0';
                    break;
                case 'json':
                    $formattedValue = json_encode($value);
                    break;
                default:
                    $formattedValue = (string)$value;
            }

            $db->update('system_settings_timetrackpro', [
                'setting_value' => $formattedValue,
                'updated_at' => date('Y-m-d H:i:s')
            ], [
                'setting_key' => $key
            ]);
        } else {
            // Create new setting
            $settingType = 'string';
            $formattedValue = $value;

            if (is_bool($value)) {
                $settingType = 'boolean';
                $formattedValue = $value ? '1' : '0';
            } elseif (is_numeric($value)) {
                $settingType = 'number';
                $formattedValue = (string)$value;
            } elseif (is_array($value)) {
                $settingType = 'json';
                $formattedValue = json_encode($value);
            }

            $db->insert('system_settings_timetrackpro', [
                'setting_key' => $key,
                'setting_value' => $formattedValue,
                'setting_type' => $settingType
            ]);
        }
    }

    send_success_response(null, 'System settings updated successfully');
}

// ============================================================================
// DAILY SHIFT SETTINGS
// ============================================================================

function handle_get_daily_shifts() {
    require_admin();

    $db = get_db_connection();

    $shifts = $db->select('daily_shift_settings_timetrackpro', '*', [
        'ORDER' => ['day_of_week' => 'ASC']
    ]);

    send_success_response($shifts);
}

function handle_update_daily_shift() {
    require_admin();
    $data = json_decode(file_get_contents('php://input'), true);

    if (!isset($data['day_of_week'])) {
        send_error_response('Day of week is required', 400);
    }

    $db = get_db_connection();

    $existing = $db->get('daily_shift_settings_timetrackpro', 'id', [
        'day_of_week' => $data['day_of_week']
    ]);

    $shiftData = [
        'is_working_day' => $data['is_working_day'] ?? false,
        'start_time' => $data['start_time'] ?? null,
        'end_time' => $data['end_time'] ?? null,
        'lunch_required' => $data['lunch_required'] ?? false,
        'total_hours' => $data['total_hours'] ?? 0,
        'updated_at' => date('Y-m-d H:i:s')
    ];

    if ($existing) {
        $db->update('daily_shift_settings_timetrackpro', $shiftData, [
            'day_of_week' => $data['day_of_week']
        ]);
    } else {
        $shiftData['day_of_week'] = $data['day_of_week'];
        $db->insert('daily_shift_settings_timetrackpro', $shiftData);
    }

    $updated = $db->get('daily_shift_settings_timetrackpro', '*', [
        'day_of_week' => $data['day_of_week']
    ]);

    send_success_response($updated, 'Daily shift settings updated successfully');
}

function handle_bulk_update_daily_shifts() {
    require_admin();
    $data = json_decode(file_get_contents('php://input'), true);

    if (empty($data) || !is_array($data)) {
        send_error_response('Shifts data is required', 400);
    }

    $db = get_db_connection();

    foreach ($data as $shift) {
        if (!isset($shift['day_of_week'])) {
            continue;
        }

        $existing = $db->get('daily_shift_settings_timetrackpro', 'id', [
            'day_of_week' => $shift['day_of_week']
        ]);

        $shiftData = [
            'is_working_day' => $shift['is_working_day'] ?? false,
            'start_time' => $shift['start_time'] ?? null,
            'end_time' => $shift['end_time'] ?? null,
            'lunch_required' => $shift['lunch_required'] ?? false,
            'total_hours' => $shift['total_hours'] ?? 0,
            'updated_at' => date('Y-m-d H:i:s')
        ];

        if ($existing) {
            $db->update('daily_shift_settings_timetrackpro', $shiftData, [
                'day_of_week' => $shift['day_of_week']
            ]);
        } else {
            $shiftData['day_of_week'] = $shift['day_of_week'];
            $db->insert('daily_shift_settings_timetrackpro', $shiftData);
        }
    }

    $shifts = $db->select('daily_shift_settings_timetrackpro', '*', [
        'ORDER' => ['day_of_week' => 'ASC']
    ]);

    send_success_response($shifts, 'Daily shift settings updated successfully');
}

// ============================================================================
// HOLIDAYS
// ============================================================================

function handle_get_holidays() {
    require_admin();

    $year = $_GET['year'] ?? date('Y');

    $db = get_db_connection();

    $holidays = $db->select('holidays_timetrackpro', '*', [
        'year' => $year,
        'ORDER' => ['holiday_date' => 'ASC']
    ]);

    send_success_response($holidays);
}

function handle_create_holiday() {
    require_admin();
    $data = json_decode(file_get_contents('php://input'), true);

    $required = ['name', 'holiday_date', 'year'];
    foreach ($required as $field) {
        if (!isset($data[$field]) || empty($data[$field])) {
            send_error_response("Field '$field' is required", 400);
        }
    }

    $db = get_db_connection();

    $existing = $db->get('holidays_timetrackpro', 'id', [
        'name' => $data['name'],
        'year' => $data['year']
    ]);

    if ($existing) {
        send_error_response('Holiday already exists for this year', 400);
    }

    $insertData = [
        'name' => $data['name'],
        'holiday_date' => $data['holiday_date'],
        'year' => $data['year'],
        'is_paid' => $data['is_paid'] ?? true,
        'is_floating' => $data['is_floating'] ?? false
    ];

    $db->insert('holidays_timetrackpro', $insertData);
    $holidayId = $db->id();

    $holiday = $db->get('holidays_timetrackpro', '*', ['id' => $holidayId]);

    send_success_response($holiday, 'Holiday created successfully', 201);
}

function handle_update_holiday() {
    require_admin();
    $data = json_decode(file_get_contents('php://input'), true);

    if (!isset($data['id'])) {
        send_error_response('Holiday ID is required', 400);
    }

    $db = get_db_connection();

    $existing = $db->get('holidays_timetrackpro', 'id', ['id' => $data['id']]);
    if (!$existing) {
        send_error_response('Holiday not found', 404);
    }

    $updateData = [];
    if (isset($data['name'])) $updateData['name'] = $data['name'];
    if (isset($data['holiday_date'])) $updateData['holiday_date'] = $data['holiday_date'];
    if (isset($data['is_paid'])) $updateData['is_paid'] = $data['is_paid'];
    if (isset($data['is_floating'])) $updateData['is_floating'] = $data['is_floating'];

    if (!empty($updateData)) {
        $updateData['updated_at'] = date('Y-m-d H:i:s');
        $db->update('holidays_timetrackpro', $updateData, ['id' => $data['id']]);
    }

    $holiday = $db->get('holidays_timetrackpro', '*', ['id' => $data['id']]);

    send_success_response($holiday, 'Holiday updated successfully');
}

function handle_delete_holiday() {
    require_admin();
    $data = json_decode(file_get_contents('php://input'), true);

    if (!isset($data['id'])) {
        send_error_response('Holiday ID is required', 400);
    }

    $db = get_db_connection();

    $existing = $db->get('holidays_timetrackpro', 'id', ['id' => $data['id']]);
    if (!$existing) {
        send_error_response('Holiday not found', 404);
    }

    $db->delete('holidays_timetrackpro', ['id' => $data['id']]);

    send_success_response(null, 'Holiday deleted successfully');
}

function handle_bulk_update_holidays() {
    require_admin();
    $data = json_decode(file_get_contents('php://input'), true);

    if (!isset($data['year']) || !isset($data['holidays'])) {
        send_error_response('Year and holidays data are required', 400);
    }

    $db = get_db_connection();
    $year = $data['year'];
    $holidays = $data['holidays'];

    foreach ($holidays as $holiday) {
        if (!isset($holiday['id'])) {
            continue;
        }

        $updateData = [];
        if (isset($holiday['is_paid'])) $updateData['is_paid'] = $holiday['is_paid'];
        if (isset($holiday['holiday_date'])) $updateData['holiday_date'] = $holiday['holiday_date'];

        if (!empty($updateData)) {
            $updateData['updated_at'] = date('Y-m-d H:i:s');
            $db->update('holidays_timetrackpro', $updateData, ['id' => $holiday['id']]);
        }
    }

    $updatedHolidays = $db->select('holidays_timetrackpro', '*', [
        'year' => $year,
        'ORDER' => ['holiday_date' => 'ASC']
    ]);

    send_success_response($updatedHolidays, 'Holidays updated successfully');
}

// ============================================================================
// GET ALL SETTINGS (Combined endpoint)
// ============================================================================

function handle_get_all_settings() {
    require_admin();

    $db = get_db_connection();

    // Get system settings
    $systemSettings = $db->select('system_settings_timetrackpro', '*');
    $formattedSettings = [];
    foreach ($systemSettings as $setting) {
        $value = $setting['setting_value'];
        switch ($setting['setting_type']) {
            case 'number':
                $value = is_numeric($value) ? (float)$value : 0;
                break;
            case 'boolean':
                $value = (bool)((int)$value);
                break;
            case 'json':
                $value = json_decode($value, true);
                break;
        }
        $formattedSettings[$setting['setting_key']] = $value;
    }

    // Get daily shifts
    $dailyShifts = $db->select('daily_shift_settings_timetrackpro', '*', [
        'ORDER' => ['day_of_week' => 'ASC']
    ]);

    // Get holidays for current year
    $year = date('Y');
    $holidays = $db->select('holidays_timetrackpro', '*', [
        'year' => $year,
        'ORDER' => ['holiday_date' => 'ASC']
    ]);

    $response = [
        'system_settings' => $formattedSettings,
        'daily_shifts' => $dailyShifts,
        'holidays' => $holidays,
        'current_year' => $year
    ];

    send_success_response($response);
}
