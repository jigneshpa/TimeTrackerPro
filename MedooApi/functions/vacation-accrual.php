<?php

function handle_calculate_vacation_accrual() {
    $user = authenticate_user();
    $db = get_db_connection();

    $result = calculateVacationAccrual($db, $user['employee_id']);

    if ($result['success']) {
        send_success_response($result['data'], $result['message']);
    } else {
        send_error_response($result['message'], 500);
    }
}

function handle_get_latest_vacation_accrual() {
    $user = authenticate_user();
    $db = get_db_connection();

    $accrual = getLatestVacationAccrual($db, $user['employee_id']);

    if ($accrual) {
        send_success_response($accrual, 'Latest vacation accrual retrieved');
    } else {
        send_success_response(null, 'No vacation accrual found');
    }
}

function handle_get_all_vacation_accruals() {
    $user = authenticate_user();
    $db = get_db_connection();

    $year = isset($_GET['year']) ? intval($_GET['year']) : null;
    $result = getAllVacationAccruals($db, $user['employee_id'], $year);

    if ($result['success']) {
        send_success_response($result['data'], 'Vacation accruals retrieved');
    } else {
        send_error_response($result['message'], 500);
    }
}

function getLatestVacationAccrual($db, $employeeId) {
    try {
        $accrual = $db->get('vacation_accruals_timetrackpro', '*', [
            'employee_id' => $employeeId,
            'ORDER' => ['accrual_date' => 'DESC'],
            'LIMIT' => 1
        ]);

        return $accrual ?: null;
    } catch (Exception $e) {
        error_log("Error fetching vacation accrual: " . $e->getMessage());
        return null;
    }
}

function calculateVacationAccrual($db, $employeeId) {
    try {
        if (!$employeeId) {
            return [
                'success' => false,
                'message' => 'Employee ID is required'
            ];
        }

        $currentYear = date('Y');
        $today = date('Y-m-d');
        $startDate = "$currentYear-01-01";

        $latestAccrual = getLatestVacationAccrual($db, $employeeId);

        if ($latestAccrual && $latestAccrual['accrual_date'] === $today) {
            return [
                'success' => true,
                'message' => 'Accrual already calculated for today',
                'data' => $latestAccrual
            ];
        }

        $timeEntries = $db->select('time_entry_events_timetrackpro', '*', [
            'employee_id' => $employeeId,
            'timestamp[>=]' => $startDate,
            'ORDER' => ['timestamp' => 'ASC']
        ]);

        if (!$timeEntries) {
            $timeEntries = [];
        }

        $hoursWorked = calculateHoursWorkedFromEntries($timeEntries);
        $hoursAccrued = floor($hoursWorked / 26);
        $cumulativeAccrued = $hoursAccrued;

        $accrualData = [
            'employee_id' => $employeeId,
            'accrual_date' => $today,
            'hours_worked' => $hoursWorked,
            'hours_accrued' => $hoursAccrued,
            'cumulative_accrued' => $cumulativeAccrued
        ];

        $existing = $db->get('vacation_accruals_timetrackpro', 'id', [
            'AND' => [
                'employee_id' => $employeeId,
                'accrual_date' => $today
            ]
        ]);

        if ($existing) {
            $db->update('vacation_accruals_timetrackpro', $accrualData, [
                'AND' => [
                    'employee_id' => $employeeId,
                    'accrual_date' => $today
                ]
            ]);
        } else {
            $db->insert('vacation_accruals_timetrackpro', $accrualData);
        }

        $savedAccrual = $db->get('vacation_accruals_timetrackpro', '*', [
            'AND' => [
                'employee_id' => $employeeId,
                'accrual_date' => $today
            ]
        ]);

        return [
            'success' => true,
            'message' => 'Vacation accrual calculated successfully',
            'data' => $savedAccrual
        ];
    } catch (Exception $e) {
        error_log("Error calculating vacation accrual: " . $e->getMessage());
        return [
            'success' => false,
            'message' => 'Failed to calculate vacation accrual: ' . $e->getMessage()
        ];
    }
}

function calculateHoursWorkedFromEntries($entries) {
    $totalHours = 0;

    if (!$entries || count($entries) === 0) {
        return 0;
    }

    $clockInTime = null;
    $lunchOutTime = null;
    $unpaidOutTime = null;

    foreach ($entries as $entry) {
        $timestamp = strtotime($entry['timestamp']);

        switch ($entry['entry_type']) {
            case 'clock_in':
                $clockInTime = $timestamp;
                break;
            case 'clock_out':
                if ($clockInTime) {
                    $totalHours += ($timestamp - $clockInTime) / 3600;
                    $clockInTime = null;
                }
                break;
            case 'lunch_out':
                $lunchOutTime = $timestamp;
                break;
            case 'lunch_in':
                if ($lunchOutTime) {
                    $totalHours -= ($timestamp - $lunchOutTime) / 3600;
                    $lunchOutTime = null;
                }
                break;
            case 'unpaid_out':
                $unpaidOutTime = $timestamp;
                break;
            case 'unpaid_in':
                if ($unpaidOutTime) {
                    $totalHours -= ($timestamp - $unpaidOutTime) / 3600;
                    $unpaidOutTime = null;
                }
                break;
        }
    }

    return max(0, $totalHours);
}

function getAllVacationAccruals($db, $employeeId, $year = null) {
    try {
        $where = ['employee_id' => $employeeId];

        if ($year) {
            $where['accrual_date[>=]'] = "$year-01-01";
            $where['accrual_date[<=]'] = "$year-12-31";
        }

        $accruals = $db->select('vacation_accruals_timetrackpro', '*', [
            'AND' => $where,
            'ORDER' => ['accrual_date' => 'DESC']
        ]);

        return [
            'success' => true,
            'data' => $accruals ?: []
        ];
    } catch (Exception $e) {
        error_log("Error fetching vacation accruals: " . $e->getMessage());
        return [
            'success' => false,
            'message' => 'Failed to fetch vacation accruals: ' . $e->getMessage()
        ];
    }
}
