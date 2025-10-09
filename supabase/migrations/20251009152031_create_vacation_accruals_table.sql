/*
  # Create Vacation Accruals Table

  1. New Tables
    - `vacation_accruals`
      - `id` (uuid, primary key) - Unique identifier for each accrual record
      - `employee_id` (uuid, foreign key) - Reference to employees table
      - `accrual_date` (date) - The date this accrual was calculated for
      - `hours_worked` (decimal) - Total hours worked up to this date
      - `hours_accrued` (decimal) - Hours accrued based on work (calculated at 1 hour per 26 hours worked)
      - `cumulative_accrued` (decimal) - Total accumulated accrued hours
      - `created_at` (timestamptz) - When this record was created
      - `updated_at` (timestamptz) - When this record was last updated

  2. Security
    - Enable RLS on `vacation_accruals` table
    - Add policy for authenticated users to read their own accrual data
    - Add policy for admin users (role = 'admin') to read all accrual data

  3. Indexes
    - Create unique index on (employee_id, accrual_date) to prevent duplicate entries
    - Create index on employee_id for faster lookups

  4. Important Notes
    - The accrual_date represents the date for which the calculation was done
    - Each employee should have only ONE record per date (enforced by unique constraint)
    - hours_accrued = floor(hours_worked / 26) based on standard accrual rate
    - This table provides audit trail and historical tracking of vacation accrual
*/

-- Create vacation_accruals table
CREATE TABLE IF NOT EXISTS vacation_accruals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  accrual_date date NOT NULL,
  hours_worked decimal(10,2) NOT NULL DEFAULT 0.00,
  hours_accrued decimal(10,2) NOT NULL DEFAULT 0.00,
  cumulative_accrued decimal(10,2) NOT NULL DEFAULT 0.00,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create unique index to prevent duplicate accrual entries for same employee on same date
CREATE UNIQUE INDEX IF NOT EXISTS idx_vacation_accruals_employee_date 
  ON vacation_accruals(employee_id, accrual_date);

-- Create index for faster employee lookups
CREATE INDEX IF NOT EXISTS idx_vacation_accruals_employee_id 
  ON vacation_accruals(employee_id);

-- Create index for date range queries
CREATE INDEX IF NOT EXISTS idx_vacation_accruals_date 
  ON vacation_accruals(accrual_date DESC);

-- Enable Row Level Security
ALTER TABLE vacation_accruals ENABLE ROW LEVEL SECURITY;

-- Policy: Employees can read their own vacation accrual data
CREATE POLICY "Employees can view own vacation accruals"
  ON vacation_accruals
  FOR SELECT
  TO authenticated
  USING (
    employee_id = auth.uid()
  );

-- Policy: Admins can view all vacation accruals
CREATE POLICY "Admins can view all vacation accruals"
  ON vacation_accruals
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = auth.uid()
      AND employees.role = 'admin'
    )
  );

-- Policy: System can insert vacation accruals (for authenticated users)
CREATE POLICY "System can insert vacation accruals"
  ON vacation_accruals
  FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id = auth.uid()
  );

-- Policy: System can update vacation accruals (for authenticated users)
CREATE POLICY "System can update vacation accruals"
  ON vacation_accruals
  FOR UPDATE
  TO authenticated
  USING (employee_id = auth.uid())
  WITH CHECK (employee_id = auth.uid());

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_vacation_accruals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS vacation_accruals_updated_at ON vacation_accruals;
CREATE TRIGGER vacation_accruals_updated_at
  BEFORE UPDATE ON vacation_accruals
  FOR EACH ROW
  EXECUTE FUNCTION update_vacation_accruals_updated_at();