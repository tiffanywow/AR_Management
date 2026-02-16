/*
  # Add Location Fields to Regional Authorities

  1. Changes
    - Add latitude column to regional_authorities
    - Add longitude column to regional_authorities
    - Add location_name column for display purposes
  
  2. Notes
    - Latitude and longitude enable plotting on Google Maps
    - Location fields are optional to support existing records
*/

-- Add location fields to regional_authorities
ALTER TABLE regional_authorities
ADD COLUMN IF NOT EXISTS latitude numeric(10, 8),
ADD COLUMN IF NOT EXISTS longitude numeric(11, 8),
ADD COLUMN IF NOT EXISTS location_name text;

-- Add index for location queries
CREATE INDEX IF NOT EXISTS idx_regional_authorities_location
  ON regional_authorities(latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
