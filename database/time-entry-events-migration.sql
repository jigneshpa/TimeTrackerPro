-- ============================================================================
-- Time Entry Events Table Migration
-- ============================================================================
-- This table tracks individual time clock events (clock in, clock out, lunch, breaks)
-- Each action is recorded as a separate event for granular tracking
-- ============================================================================

USE rc_kabba;

-- Create time entry events table
CREATE TABLE IF NOT EXISTS time_entry_events_timetrackpro (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    employee_id INT UNSIGNED NOT NULL,
    entry_type ENUM('clock_in', 'clock_out', 'lunch_out', 'lunch_in', 'unpaid_out', 'unpaid_in') NOT NULL,
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees_timetrackpro(id) ON DELETE CASCADE,
    INDEX idx_employee_id (employee_id),
    INDEX idx_entry_type (entry_type),
    INDEX idx_timestamp (timestamp),
    INDEX idx_employee_date (employee_id, timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- VIEW: Today's Time Entry Events
-- ============================================================================
CREATE OR REPLACE VIEW today_time_events_timetrackpro AS
SELECT
    tee.id,
    tee.employee_id,
    CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
    e.employee_number,
    tee.entry_type,
    tee.timestamp,
    tee.notes
FROM time_entry_events_timetrackpro tee
JOIN employees_timetrackpro e ON tee.employee_id = e.id
WHERE DATE(tee.timestamp) = CURDATE()
ORDER BY tee.timestamp ASC;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
