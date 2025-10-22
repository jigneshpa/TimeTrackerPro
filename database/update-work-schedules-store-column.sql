-- Migration: Update work_schedules_timetrackpro to use store_id instead of store_location
-- This migration changes the store reference from store_name (VARCHAR) to store_id (INT)

-- Step 1: Add the new store_id column
ALTER TABLE work_schedules_timetrackpro
ADD COLUMN store_id INT NULL AFTER total_hours;

-- Step 2: Migrate existing data from store_location to store_id
-- This maps store names to their IDs from the stores table
UPDATE work_schedules_timetrackpro ws
INNER JOIN stores s ON ws.store_location = s.store_name
SET ws.store_id = s.id
WHERE ws.store_location IS NOT NULL;

-- Step 3: Add foreign key constraint
ALTER TABLE work_schedules_timetrackpro
ADD CONSTRAINT fk_work_schedule_store
FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE SET NULL;

-- Step 4: Add index for performance
ALTER TABLE work_schedules_timetrackpro
ADD INDEX idx_store_id (store_id);

-- Step 5: Drop the old store_location column
ALTER TABLE work_schedules_timetrackpro
DROP COLUMN store_location;
