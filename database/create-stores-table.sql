-- ============================================================================
-- Create stores table for location management
-- ============================================================================
-- This table stores information about different store/work locations
-- ============================================================================

CREATE TABLE IF NOT EXISTS stores (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    store_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) DEFAULT NULL,
    email VARCHAR(100) DEFAULT NULL,
    address VARCHAR(255) DEFAULT NULL,
    city VARCHAR(100) DEFAULT NULL,
    state VARCHAR(50) DEFAULT NULL,
    zip_code VARCHAR(10) DEFAULT NULL,
    is_primary ENUM('yes', 'no') NOT NULL DEFAULT 'no',
    status ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_store_name (store_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default store locations
INSERT INTO stores (store_name, is_primary, status) VALUES
('Main Store', 'yes', 'Active'),
('Bon Aqua', 'no', 'Active'),
('North Branch', 'no', 'Active')
ON DUPLICATE KEY UPDATE store_name = VALUES(store_name);
