/*
  # Create System Settings Table

  1. New Tables
    - `system_settings`
      - `id` (uuid, primary key)
      - `key` (text, unique) - Setting identifier (e.g., 'twilio_account_sid')
      - `value` (text) - Setting value (encrypted for sensitive data)
      - `category` (text) - Setting category (e.g., 'twilio', 'database', 'notifications')
      - `is_encrypted` (boolean) - Whether the value is sensitive
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `updated_by` (uuid) - User who last updated the setting
  
  2. Security
    - Enable RLS on `system_settings` table
    - Only administrators can read/write settings
    - Service role can read/write for system operations
*/

CREATE TABLE IF NOT EXISTS system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text,
  category text NOT NULL,
  is_encrypted boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Administrators can view all settings
CREATE POLICY "Administrators can view all settings"
  ON system_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'administrator')
      AND profiles.is_active = true
    )
  );

-- Administrators can insert settings
CREATE POLICY "Administrators can create settings"
  ON system_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'administrator')
      AND profiles.is_active = true
    )
  );

-- Administrators can update settings
CREATE POLICY "Administrators can update settings"
  ON system_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'administrator')
      AND profiles.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'administrator')
      AND profiles.is_active = true
    )
  );

-- Administrators can delete settings
CREATE POLICY "Administrators can delete settings"
  ON system_settings
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'administrator')
      AND profiles.is_active = true
    )
  );

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);
