-- ============================================================================
-- Add primary_location column to employees_timetrackpro table
-- ============================================================================
-- This migration adds a primary_location field to track each employee's
-- default work location for scheduling purposes.
-- ============================================================================

ALTER TABLE employees_timetrackpro
ADD COLUMN IF NOT EXISTS primary_location VARCHAR(100) DEFAULT 'Main Store'
COMMENT 'Primary work location for the employee';

-- Create index for faster filtering by location
CREATE INDEX IF NOT EXISTS idx_primary_location ON employees_timetrackpro(primary_location);
