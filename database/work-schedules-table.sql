-- Work Schedules Table Migration
-- This table stores employee work schedules with shift times and locations

CREATE TABLE IF NOT EXISTS work_schedules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    schedule_date DATE NOT NULL,
    start_time TIME NULL,
    end_time TIME NULL,
    total_hours DECIMAL(5,2) DEFAULT 0.00,
    store_location VARCHAR(255) DEFAULT NULL,
    is_enabled BOOLEAN DEFAULT true,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (employee_id) REFERENCES employees_timetrackpro(id) ON DELETE CASCADE,
    UNIQUE KEY unique_employee_date (employee_id, schedule_date),
    INDEX idx_schedule_date (schedule_date),
    INDEX idx_employee_date (employee_id, schedule_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Store Locations Table
CREATE TABLE IF NOT EXISTS store_locations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT NULL,
    is_active BOOLEAN DEFAULT true,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY unique_store_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default store locations
INSERT INTO store_locations (name, is_active, display_order) VALUES
('Main Store', true, 1),
('North Branch', true, 2),
('South Branch', true, 3),
('East Location', true, 4),
('West Location', true, 5),
('Downtown', true, 6)
ON DUPLICATE KEY UPDATE name = name;
