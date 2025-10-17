-- Work Schedules Table Migration
-- This table stores employee work schedules with shift times and locations
-- Note: Uses existing 'stores' table for store_location reference

CREATE TABLE IF NOT EXISTS work_schedules_timetrackpro (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT UNSIGNED NOT NULL,
    schedule_date DATE NOT NULL,
    start_time TIME NULL,
    end_time TIME NULL,
    total_hours DECIMAL(5,2) DEFAULT 0.00,
    store_location VARCHAR(255) DEFAULT NULL COMMENT 'References stores.store_name',
    is_enabled BOOLEAN DEFAULT true,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (employee_id) REFERENCES employees_timetrackpro(id) ON DELETE CASCADE,
    UNIQUE KEY unique_employee_date (employee_id, schedule_date),
    INDEX idx_schedule_date (schedule_date),
    INDEX idx_employee_date (employee_id, schedule_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Note: This migration uses the existing 'stores' table for store locations
-- The store_location field stores the store_name value from the stores table
