-- Create vacation_accruals table for TimeTrackPro
-- This table stores historical vacation accrual calculations
-- Accrual Rate: 1 hour of vacation per 26 hours worked
-- NOTE: employees_timetrackpro.vacation_days_total and vacation_days_used store HOURS (not days)

CREATE TABLE IF NOT EXISTS vacation_accruals_timetrackpro (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    employee_id INT UNSIGNED NOT NULL,
    accrual_date DATE NOT NULL,
    hours_worked DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Total hours worked this year',
    hours_accrued DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Vacation hours earned (hours_worked / 26)',
    cumulative_accrued DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Total accrued vacation hours',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Prevent duplicate entries for same employee/date
    UNIQUE KEY unique_employee_date (employee_id, accrual_date),

    -- Correctly formed foreign key
    FOREIGN KEY (employee_id) REFERENCES employees_timetrackpro(id) ON DELETE CASCADE,

    -- Indexes
    INDEX idx_employee_id (employee_id),
    INDEX idx_accrual_date (accrual_date DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
