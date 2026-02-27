/*
  # Add Leadership Level Hierarchy

  1. Changes
    - Add `level` column to `about_leadership` table to support hierarchy (National, Regional, District, Community)
    - Update existing records to have a default level of 'national'
    - Add check constraint to ensure level is one of the valid values

  2. Notes
    - Existing leaders will be assigned to 'national' level by default
    - Sort order will be maintained within each level
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'about_leadership' AND column_name = 'level'
  ) THEN
    ALTER TABLE about_leadership ADD COLUMN level text DEFAULT 'national' NOT NULL;
    
    ALTER TABLE about_leadership ADD CONSTRAINT level_check 
      CHECK (level IN ('national', 'regional', 'district', 'community'));
  END IF;
END $$;