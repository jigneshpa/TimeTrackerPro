-- Create vacation_accruals table for TimeTrackPro
-- This table stores historical vacation accrual calculations

CREATE TABLE IF NOT EXISTS vacation_accruals_timetrackpro (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    employee_id CHAR(36) NOT NULL,
    accrual_date DATE NOT NULL,
    hours_worked DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    hours_accrued DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    cumulative_accrued DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Unique constraint to prevent duplicate entries for same employee on same date
    UNIQUE KEY unique_employee_date (employee_id, accrual_date),

    -- Foreign key to employees table
    FOREIGN KEY (employee_id) REFERENCES employees_timetrackpro(id) ON DELETE CASCADE,

    -- Indexes for performance
    INDEX idx_employee_id (employee_id),
    INDEX idx_accrual_date (accrual_date DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
