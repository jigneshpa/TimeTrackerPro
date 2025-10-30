<?php

function handle_get_work_schedules() {
    $startDate = $_GET['start_date'] ?? null;
    $endDate = $_GET['end_date'] ?? null;
    $employeeIdsParam = $_GET['employee_ids'] ?? '';

    // Clean up employee IDs - remove empty values
    $employeeIds = array_filter(
        array_map('trim', explode(',', $employeeIdsParam)),
        function($id) { return $id !== ''; }
    );

    if (!$startDate || !$endDate) {
        send_error_response('Start date and end date are required', 400);
    }

    $db = get_db_connection();

    $sql = "SELECT
        ws.id,
        ws.employee_id,
        ws.schedule_date,
        ws.start_time,
        ws.end_time,
        ws.total_hours,
        ws.store_id,
        ws.is_enabled,
        ws.notes
    FROM work_schedules_timetrackpro ws
    WHERE ws.schedule_date BETWEEN ? AND ?";

    $params = [$startDate, $endDate];

    if (!empty($employeeIds)) {
        $placeholders = implode(',', array_fill(0, count($employeeIds), '?'));
        $sql .= " AND ws.employee_id IN ($placeholders)";
        $params = array_merge($params, $employeeIds);
    }

    $sql .= " ORDER BY ws.schedule_date ASC, ws.employee_id ASC";

    $stmt = $db->pdo->prepare($sql);
    $stmt->execute($params);
    $schedules = $stmt->fetchAll(PDO::FETCH_ASSOC);

    send_success_response($schedules);
}

function handle_save_work_schedule() {
    $data = json_decode(file_get_contents('php://input'), true);

    if (!isset($data['employee_id']) || !isset($data['schedule_date'])) {
        send_error_response('Employee ID and schedule date are required', 400);
    }

    $db = get_db_connection();

    $employeeId = $data['employee_id'];
    $scheduleDate = $data['schedule_date'];
    $startTime = $data['start_time'] ?? null;
    $endTime = $data['end_time'] ?? null;
    $storeId = $data['store_id'] ?? null;
    $isEnabled = isset($data['is_enabled']) ? (bool)$data['is_enabled'] : true;
    $notes = $data['notes'] ?? null;

    // Calculate total hours
    $totalHours = 0.00;
    if ($startTime && $endTime) {
        $start = new DateTime($startTime);
        $end = new DateTime($endTime);
        $diff = $start->diff($end);
        $totalHours = $diff->h + ($diff->i / 60);

        // Deduct lunch for shifts over 6 hours
        if ($totalHours > 6) {
            $totalHours -= 1; // 1 hour lunch deduction
        }
    }

    // Check if schedule exists
    $existing = $db->get('work_schedules_timetrackpro', 'id', [
        'employee_id' => $employeeId,
        'schedule_date' => $scheduleDate
    ]);

    if ($existing) {
        // Update existing schedule
        $db->update('work_schedules_timetrackpro', [
            'start_time' => $startTime,
            'end_time' => $endTime,
            'total_hours' => $totalHours,
            'store_id' => $storeId,
            'is_enabled' => $isEnabled,
            'notes' => $notes
        ], [
            'id' => $existing
        ]);
        send_success_response(['id' => $existing, 'message' => 'Schedule updated successfully']);
    } else {
        // Insert new schedule
        $db->insert('work_schedules_timetrackpro', [
            'employee_id' => $employeeId,
            'schedule_date' => $scheduleDate,
            'start_time' => $startTime,
            'end_time' => $endTime,
            'total_hours' => $totalHours,
            'store_id' => $storeId,
            'is_enabled' => $isEnabled,
            'notes' => $notes
        ]);
        $id = $db->id();
        send_success_response(['id' => $id, 'message' => 'Schedule created successfully']);
    }
}

function handle_bulk_save_work_schedules() {
    $data = json_decode(file_get_contents('php://input'), true);

    if (!isset($data['schedules']) || !is_array($data['schedules'])) {
        send_error_response('Schedules array is required', 400);
    }

    $db = get_db_connection();
    $db->pdo->beginTransaction();

    try {
        foreach ($data['schedules'] as $schedule) {
            if (!isset($schedule['schedule_date'])) {
                continue;
            }

            $employeeId = $schedule['employee_id'] ?? null;
            $userId = $schedule['user_id'] ?? null;

            if (!$employeeId && !$userId) {
                continue;
            }

            if (!$employeeId && $userId) {
                $stmt = $db->pdo->prepare("SELECT id FROM employees_timetrackpro WHERE user_id = ?");
                $stmt->execute([$userId]);
                $employeeId = $stmt->fetchColumn();

                if (!$employeeId) {
                    $getUserStmt = $db->pdo->prepare("SELECT first_name, middle_name, last_name, email, mobile_phone, phone_number, employee_code, start_date FROM users WHERE id = ?");
                    $getUserStmt->execute([$userId]);
                    $user = $getUserStmt->fetch(PDO::FETCH_ASSOC);

                    if ($user) {
                        // Get user roles to determine if admin
                        $getRolesStmt = $db->pdo->prepare("
                            SELECT r.short_name
                            FROM model_has_roles mr
                            JOIN roles r ON mr.role_id = r.id
                            WHERE mr.model_id = ? AND mr.model_type = 'App\\\\Models\\\\Iam\\\\Personnel\\\\User'
                        ");
                        $getRolesStmt->execute([$userId]);
                        $roleShortNames = $getRolesStmt->fetchAll(PDO::FETCH_COLUMN);

                        $adminRoles = ['admin', 'master_admin'];
                        $isAdmin = !empty(array_intersect($roleShortNames, $adminRoles));
                        $role = $isAdmin ? 'admin' : 'employee';

                        $phone = $user['mobile_phone'] ?? $user['phone_number'];

                        $insertStmt = $db->pdo->prepare("INSERT INTO employees_timetrackpro (user_id, first_name, last_name, email, phone, hire_date, role, is_active, vacation_days_total, vacation_days_used) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0, 0)");
                        $insertStmt->execute([
                            $userId,
                            $user['first_name'],
                            $user['last_name'],
                            $user['email'],
                            $phone,
                            $user['start_date'] ?? date('Y-m-d'),
                            $role
                        ]);
                        $employeeId = $db->pdo->lastInsertId();
                    }

                    if (!$employeeId) {
                        continue;
                    }
                }
            }

            $scheduleDate = $schedule['schedule_date'];
            $startTime = $schedule['start_time'] ?? null;
            $endTime = $schedule['end_time'] ?? null;
            $storeId = $schedule['store_id'] ?? null;
            $isEnabled = isset($schedule['is_enabled']) ? (bool)$schedule['is_enabled'] : true;
            $notes = $schedule['notes'] ?? null;

            // Calculate total hours
            $totalHours = 0.00;
            if ($startTime && $endTime) {
                $start = new DateTime($startTime);
                $end = new DateTime($endTime);
                $diff = $start->diff($end);
                $totalHours = $diff->h + ($diff->i / 60);

                // Deduct lunch for shifts over 6 hours
                if ($totalHours > 6) {
                    $totalHours -= 1;
                }
            }

            // Check if schedule exists
            $stmt = $db->pdo->prepare("SELECT id FROM work_schedules_timetrackpro WHERE employee_id = ? AND schedule_date = ?");
            $stmt->execute([$employeeId, $scheduleDate]);
            $existing = $stmt->fetchColumn();

            if ($existing) {
                // Update existing schedule
                $stmt = $db->pdo->prepare("UPDATE work_schedules_timetrackpro SET start_time = ?, end_time = ?, total_hours = ?, store_id = ?, is_enabled = ?, notes = ? WHERE id = ?");
                $stmt->execute([$startTime, $endTime, $totalHours, $storeId, $isEnabled, $notes, $existing]);
            } else {
                // Insert new schedule
                $stmt = $db->pdo->prepare("INSERT INTO work_schedules_timetrackpro (employee_id, schedule_date, start_time, end_time, total_hours, store_id, is_enabled, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute([$employeeId, $scheduleDate, $startTime, $endTime, $totalHours, $storeId, $isEnabled, $notes]);
            }
        }

        $db->pdo->commit();
        send_success_response(['message' => 'Schedules saved successfully']);
    } catch (Exception $e) {
        $db->pdo->rollBack();
        send_error_response('Failed to save schedules: ' . $e->getMessage(), 500);
    }
}

function handle_delete_work_schedule() {
    $id = $_GET['id'] ?? null;

    if (!$id) {
        send_error_response('Schedule ID is required', 400);
    }

    $db = get_db_connection();
    $db->delete('work_schedules_timetrackpro', ['id' => $id]);

    send_success_response(['message' => 'Schedule deleted successfully']);
}

function handle_clear_week_schedules() {
    $data = json_decode(file_get_contents('php://input'), true);

    if (!isset($data['start_date']) || !isset($data['end_date']) || !isset($data['employee_ids'])) {
        send_error_response('Start date, end date, and employee IDs are required', 400);
    }

    $db = get_db_connection();
    $startDate = $data['start_date'];
    $endDate = $data['end_date'];
    $employeeIds = $data['employee_ids'];

    if (empty($employeeIds)) {
        send_error_response('At least one employee must be selected', 400);
    }

    $placeholders = implode(',', array_fill(0, count($employeeIds), '?'));
    $sql = "DELETE FROM work_schedules_timetrackpro WHERE schedule_date BETWEEN ? AND ? AND employee_id IN ($placeholders)";
    $params = array_merge([$startDate, $endDate], $employeeIds);

    $stmt = $db->pdo->prepare($sql);
    $stmt->execute($params);

    send_success_response(['message' => 'Week schedules cleared successfully']);
}

function handle_copy_week_schedules() {
    $data = json_decode(file_get_contents('php://input'), true);

    if (!isset($data['source_start_date']) || !isset($data['target_start_date']) || !isset($data['employee_ids'])) {
        send_error_response('Source date, target date, and employee IDs are required', 400);
    }

    $db = get_db_connection();
    $sourceStartDate = new DateTime($data['source_start_date']);
    $targetStartDate = new DateTime($data['target_start_date']);
    $employeeIds = $data['employee_ids'];
    $periodDays = $data['period_days'] ?? 7;

    if (empty($employeeIds)) {
        send_error_response('At least one employee must be selected', 400);
    }

    $sourceEndDate = clone $sourceStartDate;
    $sourceEndDate->modify('+' . ($periodDays - 1) . ' days');

    // Get source schedules
    $placeholders = implode(',', array_fill(0, count($employeeIds), '?'));
    $sql = "SELECT * FROM work_schedules_timetrackpro WHERE schedule_date BETWEEN ? AND ? AND employee_id IN ($placeholders)";
    $params = array_merge([$sourceStartDate->format('Y-m-d'), $sourceEndDate->format('Y-m-d')], $employeeIds);

    $stmt = $db->pdo->prepare($sql);
    $stmt->execute($params);
    $sourceSchedules = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($sourceSchedules)) {
        send_error_response('No schedules found to copy', 404);
    }

    $db->pdo->beginTransaction();

    try {
        foreach ($sourceSchedules as $schedule) {
            $sourceDate = new DateTime($schedule['schedule_date']);
            $daysDiff = $sourceDate->diff($sourceStartDate)->days;
            $targetDate = clone $targetStartDate;
            $targetDate->modify('+' . $daysDiff . ' days');

            // Check if target schedule exists
            $stmt = $db->pdo->prepare("SELECT id FROM work_schedules_timetrackpro WHERE employee_id = ? AND schedule_date = ?");
            $stmt->execute([$schedule['employee_id'], $targetDate->format('Y-m-d')]);
            $existing = $stmt->fetchColumn();

            if ($existing) {
                // Update existing
                $stmt = $db->pdo->prepare("UPDATE work_schedules_timetrackpro SET start_time = ?, end_time = ?, total_hours = ?, store_id = ?, is_enabled = ?, notes = ? WHERE id = ?");
                $stmt->execute([
                    $schedule['start_time'],
                    $schedule['end_time'],
                    $schedule['total_hours'],
                    $schedule['store_id'],
                    $schedule['is_enabled'],
                    $schedule['notes'],
                    $existing
                ]);
            } else {
                // Insert new
                $stmt = $db->pdo->prepare("INSERT INTO work_schedules_timetrackpro (employee_id, schedule_date, start_time, end_time, total_hours, store_id, is_enabled, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute([
                    $schedule['employee_id'],
                    $targetDate->format('Y-m-d'),
                    $schedule['start_time'],
                    $schedule['end_time'],
                    $schedule['total_hours'],
                    $schedule['store_id'],
                    $schedule['is_enabled'],
                    $schedule['notes']
                ]);
            }
        }

        $db->pdo->commit();
        send_success_response(['message' => 'Week schedules copied successfully']);
    } catch (Exception $e) {
        $db->pdo->rollBack();
        send_error_response('Failed to copy schedules: ' . $e->getMessage(), 500);
    }
}

function handle_get_store_locations() {
    $db = get_db_connection();

    $locations = $db->select('stores', [
        'id',
        'store_name',
        'phone',
        'email',
        'address',
        'city',
        'zip_code',
        'is_primary',
        'status'
    ], [
        'status' => 'Active',
        'ORDER' => ['is_primary' => 'DESC', 'store_name' => 'ASC']
    ]);

    send_success_response($locations);
}
