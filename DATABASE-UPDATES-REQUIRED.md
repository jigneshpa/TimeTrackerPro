# Database Updates Required for Work Schedule

## Issue
The Work Schedule page cannot display employees because:
1. The `stores` table doesn't exist
2. The `employees_timetrackpro` table is missing the `primary_location` column

## Solution - Execute These SQL Scripts

### Step 1: Create the Stores Table
Run the following SQL in your database (phpMyAdmin or MySQL client):

```sql
-- File: database/create-stores-table.sql

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
```

### Step 2: Add primary_location Column to employees_timetrackpro
Run the following SQL:

```sql
-- File: database/add-primary-location-migration.sql

ALTER TABLE employees_timetrackpro
ADD COLUMN IF NOT EXISTS primary_location VARCHAR(100) DEFAULT 'Main Store'
COMMENT 'Primary work location for the employee';

-- Create index for faster filtering by location
CREATE INDEX IF NOT EXISTS idx_primary_location ON employees_timetrackpro(primary_location);
```

## After Running These Scripts

1. Refresh your Work Schedule page
2. You should now see:
   - A list of all employees in the left column
   - Days of the week across the top
   - Checkboxes in each cell

## How to Use the Work Schedule

1. **Check the checkbox** for any employee/day combination
2. The cell will turn **green** and show:
   - Start time input
   - End time input
   - Hours calculated
   - Store location dropdown
   - Edit button

3. **Uncheck the checkbox** to disable that day for the employee

4. Click **"Save Schedule"** at the bottom to save all changes

## Optional: Update Employee Locations

If you want to set specific locations for employees, run:

```sql
UPDATE employees_timetrackpro
SET primary_location = 'Bon Aqua'
WHERE id = 1;  -- Replace with actual employee ID

-- Or update multiple at once
UPDATE employees_timetrackpro
SET primary_location = 'North Branch'
WHERE id IN (2, 3, 4);
```
