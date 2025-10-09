-- ============================================================================
-- Time Tracking System - MySQL Database Schema
-- ============================================================================
-- Database Name: rc_kabba
-- Table Suffix: _timetrackpro
-- This schema supports a comprehensive time tracking system with:
-- - Employee management with roles (admin, employee)
-- - Time clock entries (clock in/out)
-- - Vacation/PTO tracking
-- - Work schedules
-- - Reporting and analytics
-- ============================================================================

-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS rc_kabba;
USE rc_kabba;

-- Drop tables if they exist (for clean setup)
DROP TABLE IF EXISTS time_entries_timetrackpro;
DROP TABLE IF EXISTS vacation_requests_timetrackpro;
DROP TABLE IF EXISTS work_schedules_timetrackpro;
DROP TABLE IF EXISTS employees_timetrackpro;
DROP TABLE IF EXISTS model_has_roles;
DROP TABLE IF EXISTS role_has_permissions;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS permissions;
DROP TABLE IF EXISTS users;

-- ============================================================================
-- PERMISSIONS TABLE
-- ============================================================================
-- Stores system permissions
CREATE TABLE IF NOT EXISTS permissions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    guard_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NULL DEFAULT NULL,
    updated_at TIMESTAMP NULL DEFAULT NULL,
    UNIQUE KEY permissions_name_guard_name_unique (name, guard_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- ROLES TABLE
-- ============================================================================
-- Stores user roles
CREATE TABLE IF NOT EXISTS roles (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    unique_id VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    guard_name VARCHAR(255) NOT NULL,
    short_name VARCHAR(255) DEFAULT NULL,
    status ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
    color VARCHAR(255) DEFAULT NULL,
    description TEXT DEFAULT NULL,
    created_at TIMESTAMP NULL DEFAULT NULL,
    updated_at TIMESTAMP NULL DEFAULT NULL,
    UNIQUE KEY roles_name_guard_name_unique (name, guard_name),
    INDEX idx_unique_id (unique_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- USERS TABLE
-- ============================================================================
-- Stores user authentication and profile information
CREATE TABLE IF NOT EXISTS users (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    unique_id VARCHAR(255) NOT NULL UNIQUE,
    employee_code VARCHAR(6) NOT NULL UNIQUE,
    first_name VARCHAR(255) NOT NULL,
    middle_name VARCHAR(255) DEFAULT NULL,
    last_name VARCHAR(255) DEFAULT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    mobile_phone VARCHAR(255) DEFAULT NULL,
    phone_number VARCHAR(255) DEFAULT NULL,
    street_address VARCHAR(255) DEFAULT NULL,
    city VARCHAR(255) DEFAULT NULL,
    state VARCHAR(255) DEFAULT NULL,
    zip_code VARCHAR(255) DEFAULT NULL,
    country VARCHAR(255) DEFAULT NULL,
    start_date DATE DEFAULT NULL,
    end_date DATE DEFAULT NULL,
    pay_type VARCHAR(255) DEFAULT NULL,
    limit_start_time TINYINT(1) NOT NULL DEFAULT 0,
    limit_end_time TINYINT(1) NOT NULL DEFAULT 0,
    email_verified_at TIMESTAMP NULL DEFAULT NULL,
    password VARCHAR(255) DEFAULT NULL,
    status ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
    remember_token VARCHAR(100) DEFAULT NULL,
    created_at TIMESTAMP NULL DEFAULT NULL,
    updated_at TIMESTAMP NULL DEFAULT NULL,
    INDEX idx_unique_id (unique_id),
    INDEX idx_employee_code (employee_code),
    INDEX idx_email (email),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- MODEL_HAS_ROLES TABLE
-- ============================================================================
-- Links users to roles
CREATE TABLE IF NOT EXISTS model_has_roles (
    role_id BIGINT UNSIGNED NOT NULL,
    model_type VARCHAR(255) NOT NULL,
    model_id BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (role_id, model_id, model_type),
    INDEX model_has_roles_model_id_model_type_index (model_id, model_type),
    CONSTRAINT model_has_roles_role_id_foreign FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- ROLE_HAS_PERMISSIONS TABLE
-- ============================================================================
-- Links roles to permissions
CREATE TABLE IF NOT EXISTS role_has_permissions (
    permission_id BIGINT UNSIGNED NOT NULL,
    role_id BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (permission_id, role_id),
    INDEX role_has_permissions_role_id_foreign (role_id),
    CONSTRAINT role_has_permissions_permission_id_foreign FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
    CONSTRAINT role_has_permissions_role_id_foreign FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- EMPLOYEES TABLE
-- ============================================================================
-- Stores employee vacation data linked to users table
-- User details (name, email, phone, hire_date) are in users table
-- Role information is in model_has_roles table
CREATE TABLE employees_timetrackpro (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL UNIQUE,
    vacation_days_total DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    vacation_days_used DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TIME_ENTRIES TABLE
-- ============================================================================
-- Stores clock in/out records for employees
CREATE TABLE `time_entries_timetrackpro` (
  `id` int(10) UNSIGNED NOT NULL,
  `employee_id` int(10) UNSIGNED NOT NULL,
  `clock_in` datetime NOT NULL,
  `clock_out` datetime DEFAULT NULL,
  `break_duration` int(10) UNSIGNED DEFAULT 0 COMMENT 'Break duration in minutes',
  `notes` text DEFAULT NULL,
  `status` enum('active','completed','edited') NOT NULL DEFAULT 'active',
  `total_hours` decimal(5,2) DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `time_entries_timetrackpro`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_employee_id` (`employee_id`),
  ADD KEY `idx_clock_in` (`clock_in`),
  ADD KEY `idx_clock_out` (`clock_out`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_employee_date` (`employee_id`,`clock_in`);


ALTER TABLE `time_entries_timetrackpro`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;


--
ALTER TABLE `time_entries_timetrackpro`
  ADD CONSTRAINT `time_entries_timetrackpro_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees_timetrackpro` (`id`) ON DELETE CASCADE;
COMMIT;


-- ============================================================================
-- VACATION_REQUESTS TABLE
-- ============================================================================
-- Stores vacation/PTO requests and approvals
CREATE TABLE vacation_requests_timetrackpro (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    employee_id INT UNSIGNED NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_requested DECIMAL(5,2) NOT NULL,
    request_type ENUM('vacation', 'sick', 'personal', 'unpaid') NOT NULL DEFAULT 'vacation',
    status ENUM('pending', 'approved', 'denied', 'cancelled') NOT NULL DEFAULT 'pending',
    notes TEXT,
    approved_by INT UNSIGNED NULL,
    approved_at DATETIME NULL,
    denial_reason TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees_timetrackpro(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES employees_timetrackpro(id) ON DELETE SET NULL,
    INDEX idx_employee_id (employee_id),
    INDEX idx_status (status),
    INDEX idx_dates (start_date, end_date),
    INDEX idx_request_type (request_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- WORK_SCHEDULES TABLE
-- ============================================================================
-- Stores employee work schedules
CREATE TABLE work_schedules_timetrackpro (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    employee_id INT UNSIGNED NOT NULL,
    day_of_week TINYINT NOT NULL COMMENT '0=Sunday, 1=Monday, ..., 6=Saturday',
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_working_day BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees_timetrackpro(id) ON DELETE CASCADE,
    INDEX idx_employee_id (employee_id),
    INDEX idx_day_of_week (day_of_week),
    UNIQUE KEY unique_employee_day (employee_id, day_of_week)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- SYSTEM_SETTINGS TABLE
-- ============================================================================
-- Stores global system settings that apply to all employees
CREATE TABLE IF NOT EXISTS system_settings_timetrackpro (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT,
    setting_type ENUM('string', 'number', 'boolean', 'json') NOT NULL DEFAULT 'string',
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_setting_key (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- HOLIDAYS TABLE
-- ============================================================================
-- Stores company holidays for each year
CREATE TABLE IF NOT EXISTS holidays_timetrackpro (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    holiday_date DATE NOT NULL,
    year INT NOT NULL,
    is_paid BOOLEAN NOT NULL DEFAULT TRUE,
    is_floating BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_year (year),
    INDEX idx_holiday_date (holiday_date),
    UNIQUE KEY unique_name_year (name, year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- DAILY_SHIFT_SETTINGS TABLE
-- ============================================================================
-- Stores default shift settings for each day of the week
CREATE TABLE IF NOT EXISTS daily_shift_settings_timetrackpro (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    day_of_week TINYINT NOT NULL COMMENT '0=Sunday, 1=Monday, ..., 6=Saturday',
    is_working_day BOOLEAN NOT NULL DEFAULT TRUE,
    start_time TIME NULL,
    end_time TIME NULL,
    lunch_required BOOLEAN NOT NULL DEFAULT FALSE,
    total_hours DECIMAL(4,2) NULL COMMENT 'Total shift length in hours',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_day (day_of_week)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================================================
-- Password for all test users: password
-- Note: Password hash generated using PHP password_hash() with PASSWORD_BCRYPT

-- Insert roles
INSERT INTO roles (unique_id, name, guard_name, short_name, status, color, description, created_at, updated_at) VALUES
('ROLE-ZYRE-C6BL', 'Master Admin', 'web', 'master_admin', 'Active', '#ef4444', 'Full access to all system features and settings.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('ROLE-DC4E-KFYN', 'Admin', 'web', 'admin', 'Active', '#3b82f6', 'Manage core administrative tasks.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('ROLE-RXZN-9RU0', 'Sales', 'web', 'sales', 'Active', '#10b981', 'Access to sales modules and client management.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('ROLE-SHCC-ALJ4', 'Technician', 'web', 'technician', 'Active', '#8b5cf6', 'Handle technical operations and support.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Insert admin user into users table
INSERT INTO users (
    unique_id,
    employee_code,
    first_name,
    last_name,
    email,
    password,
    status,
    start_date,
    created_at,
    updated_at
) VALUES (
    'USR001',
    'EMP001',
    'Admin',
    'User',
    'admin@example.com',
    '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'Active',
    CURDATE(),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Insert employee user into users table
INSERT INTO users (
    unique_id,
    employee_code,
    first_name,
    last_name,
    email,
    password,
    status,
    start_date,
    created_at,
    updated_at
) VALUES (
    'USR002',
    'EMP002',
    'John',
    'Doe',
    'employee@example.com',
    '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'Active',
    CURDATE(),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Create admin employee vacation record linked to user
INSERT INTO employees_timetrackpro (
    user_id,
    vacation_days_total,
    vacation_days_used
) VALUES (
    1,
    20.00,
    0.00
);

-- Create sample employee vacation record linked to user
INSERT INTO employees_timetrackpro (
    user_id,
    vacation_days_total,
    vacation_days_used
) VALUES (
    2,
    15.00,
    0.00
);

-- Assign roles to users
-- Admin user gets Master Admin role
INSERT INTO model_has_roles (role_id, model_type, model_id) VALUES
(1, 'App\\Models\\Iam\\Personnel\\User', 1);

-- Employee user gets Sales role
INSERT INTO model_has_roles (role_id, model_type, model_id) VALUES
(3, 'App\\Models\\Iam\\Personnel\\User', 2);

-- ============================================================================
-- DEFAULT SYSTEM SETTINGS
-- ============================================================================
INSERT INTO system_settings_timetrackpro (setting_key, setting_value, setting_type, description) VALUES
('pay_increment_minutes', '30', 'number', 'Pay increment rounding in minutes'),
('pay_period_type', 'bi-weekly', 'string', 'Pay period type: weekly, bi-weekly, semi-monthly, monthly'),
('pay_period_start_date', '2025-01-01', 'string', 'Pay period start date'),
('default_lunch_duration', '60', 'number', 'Default lunch duration in minutes'),
('limit_start_time', '0', 'boolean', 'Limit employee start time to scheduled shift start'),
('limit_end_time', '0', 'boolean', 'Limit employee end time to scheduled shift end'),
('auto_clock_out_minutes', '60', 'number', 'Auto clock-out minutes after shift end'),
('first_reminder_minutes', '15', 'number', 'First reminder minutes after shift start'),
('first_reminder_message', 'Reminder: Please clock in for your shift. Tap/Click to exit now.', 'string', 'First reminder message'),
('second_reminder_minutes', '60', 'number', 'Second reminder minutes after shift end'),
('second_reminder_message', 'First reminder: You haven''t clocked-out yet. Please clock-out now or contact your supervisor.', 'string', 'Second reminder message'),
('auto_clock_out_message', 'You were automatically clocked-out at shift end with lunch deducted. Contact HR if incorrect.', 'string', 'Auto clock-out message');

-- ============================================================================
-- DEFAULT DAILY SHIFT SETTINGS
-- ============================================================================
INSERT INTO daily_shift_settings_timetrackpro (day_of_week, is_working_day, start_time, end_time, lunch_required, total_hours) VALUES
(1, TRUE, '08:00:00', '17:00:00', TRUE, 9.0),  -- Monday
(2, TRUE, '08:00:00', '17:00:00', TRUE, 9.0),  -- Tuesday
(3, TRUE, '08:00:00', '17:00:00', TRUE, 9.0),  -- Wednesday
(4, TRUE, '08:00:00', '17:00:00', TRUE, 9.0),  -- Thursday
(5, TRUE, '08:00:00', '17:00:00', TRUE, 9.0),  -- Friday
(6, FALSE, NULL, NULL, FALSE, 0.0),             -- Saturday
(0, FALSE, NULL, NULL, FALSE, 0.0);             -- Sunday

-- ============================================================================
-- DEFAULT HOLIDAYS FOR 2025
-- ============================================================================
INSERT INTO holidays_timetrackpro (name, holiday_date, year, is_paid, is_floating) VALUES
('New Year''s Day', '2025-01-01', 2025, TRUE, FALSE),
('Memorial Day', '2025-05-26', 2025, TRUE, FALSE),
('Independence Day', '2025-07-04', 2025, TRUE, FALSE),
('Labor Day', '2025-09-01', 2025, TRUE, FALSE),
('Thanksgiving Day', '2025-11-27', 2025, TRUE, FALSE),
('Christmas Day', '2025-12-25', 2025, TRUE, FALSE);

-- ============================================================================
-- VIEWS FOR REPORTING
-- ============================================================================

-- View for current active time entries
CREATE OR REPLACE VIEW active_time_entries_timetrackpro AS
SELECT
    te.id,
    te.employee_id,
    CONCAT(u.first_name, ' ', COALESCE(u.last_name, '')) AS employee_name,
    u.employee_code,
    te.clock_in,
    te.notes,
    TIMESTAMPDIFF(SECOND, te.clock_in, NOW()) / 3600 AS hours_elapsed
FROM time_entries_timetrackpro te
JOIN employees_timetrackpro e ON te.employee_id = e.id
JOIN users u ON e.user_id = u.id
WHERE te.clock_out IS NULL AND te.status = 'active';

-- View for daily time summaries
CREATE OR REPLACE VIEW daily_time_summary_timetrackpro AS
SELECT
    DATE(te.clock_in) AS work_date,
    te.employee_id,
    CONCAT(u.first_name, ' ', COALESCE(u.last_name, '')) AS employee_name,
    COUNT(*) AS entry_count,
    SUM(te.total_hours) AS total_hours,
    SUM(te.break_duration) AS total_break_minutes
FROM time_entries_timetrackpro te
JOIN employees_timetrackpro e ON te.employee_id = e.id
JOIN users u ON e.user_id = u.id
WHERE te.clock_out IS NOT NULL
GROUP BY DATE(te.clock_in), te.employee_id, u.first_name, u.last_name;

-- View for vacation balances
CREATE OR REPLACE VIEW vacation_balances_timetrackpro AS
SELECT
    e.id AS employee_id,
    u.id AS user_id,
    CONCAT(u.first_name, ' ', COALESCE(u.last_name, '')) AS employee_name,
    e.vacation_days_total,
    e.vacation_days_used,
    (e.vacation_days_total - e.vacation_days_used) AS vacation_days_remaining,
    COUNT(vr.id) AS pending_requests
FROM employees_timetrackpro e
JOIN users u ON e.user_id = u.id
LEFT JOIN vacation_requests_timetrackpro vr ON e.id = vr.employee_id AND vr.status = 'pending'
WHERE u.status = 'Active'
GROUP BY e.id, u.id, u.first_name, u.last_name, e.vacation_days_total, e.vacation_days_used;

-- ============================================================================
-- USEFUL QUERIES FOR YOUR LARAVEL API
-- ============================================================================

-- Get employee with current time entry status
-- SELECT e.*,
--        te.id as active_entry_id,
--        te.clock_in as current_clock_in
-- FROM employees_timetrackpro e
-- LEFT JOIN time_entries_timetrackpro te ON e.id = te.employee_id
--     AND te.clock_out IS NULL
--     AND te.status = 'active'
-- WHERE e.id = ?;

-- Get time entries for a date range
-- SELECT te.*, CONCAT(e.first_name, ' ', e.last_name) as employee_name
-- FROM time_entries_timetrackpro te
-- JOIN employees_timetrackpro e ON te.employee_id = e.id
-- WHERE te.clock_in BETWEEN ? AND ?
-- ORDER BY te.clock_in DESC;

-- Get pending vacation requests
-- SELECT vr.*,
--        CONCAT(e.first_name, ' ', e.last_name) as employee_name,
--        e.employee_number
-- FROM vacation_requests_timetrackpro vr
-- JOIN employees_timetrackpro e ON vr.employee_id = e.id
-- WHERE vr.status = 'pending'
-- ORDER BY vr.created_at ASC;

-- ============================================================================
-- STORED PROCEDURES (Optional but useful)
-- ============================================================================

DELIMITER //

-- Procedure to clock in an employee
CREATE PROCEDURE clock_in_employee_timetrackpro(
    IN p_employee_id INT,
    IN p_notes TEXT
)
BEGIN
    -- Check if employee already has an active entry
    IF EXISTS (
        SELECT 1 FROM time_entries_timetrackpro
        WHERE employee_id = p_employee_id
        AND clock_out IS NULL
        AND status = 'active'
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Employee already has an active time entry';
    ELSE
        INSERT INTO time_entries_timetrackpro (employee_id, clock_in, notes, status)
        VALUES (p_employee_id, NOW(), p_notes, 'active');

        SELECT LAST_INSERT_ID() as entry_id;
    END IF;
END //

-- Procedure to clock out an employee
CREATE PROCEDURE clock_out_employee_timetrackpro(
    IN p_employee_id INT,
    IN p_break_duration INT
)
BEGIN
    DECLARE v_entry_id INT;

    -- Find active entry
    SELECT id INTO v_entry_id
    FROM time_entries_timetrackpro
    WHERE employee_id = p_employee_id
    AND clock_out IS NULL
    AND status = 'active'
    LIMIT 1;

    IF v_entry_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'No active time entry found for employee';
    ELSE
        UPDATE time_entries_timetrackpro
        SET clock_out = NOW(),
            break_duration = p_break_duration,
            status = 'completed'
        WHERE id = v_entry_id;

        SELECT v_entry_id as entry_id;
    END IF;
END //

DELIMITER ;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================


CREATE TABLE vacation_accruals_timetrackpro (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    employee_id INT UNSIGNED NOT NULL,
    accrual_date DATE NOT NULL,
    hours_worked DECIMAL(10,2) NOT NULL,
    hours_accrued DECIMAL(10,2) NOT NULL,
    cumulative_accrued DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees_timetrackpro(id)
);
