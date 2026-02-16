/*
  # Create SMS Campaigns System

  1. New Tables
    - `regions`
      - `id` (uuid, primary key) - Unique identifier
      - `name` (text) - Region name (e.g., Khomas, Erongo, Zambezi)
      - `created_at` (timestamptz) - Creation timestamp
      
    - `sms_campaigns`
      - `id` (uuid, primary key) - Unique identifier
      - `title` (text) - Campaign title/name
      - `message` (text) - SMS message content
      - `filter_type` (text) - Filtering method: 'all', 'region', 'membership_status'
      - `filter_value` (text, nullable) - Specific filter value (region name, status, etc)
      - `status` (text) - Status: 'draft', 'scheduled', 'sending', 'sent', 'failed'
      - `scheduled_for` (timestamptz, nullable) - When to send (null = immediate)
      - `sent_at` (timestamptz, nullable) - When it was actually sent
      - `recipient_count` (integer) - Number of recipients
      - `success_count` (integer) - Number of successful deliveries
      - `failed_count` (integer) - Number of failed deliveries
      - `created_by` (uuid, foreign key) - References profiles table
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Profile Updates
    - Add region and membership_status columns to profiles table if they don't exist
    
  3. Security
    - Enable RLS on all new tables
    - Add policies for authenticated users to manage SMS campaigns
    - Add policies for reading regions
*/

-- Create regions table
CREATE TABLE IF NOT EXISTS regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on regions
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;

-- Policies for regions
CREATE POLICY "Anyone can read regions"
  ON regions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage regions"
  ON regions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Insert Namibia's regions
INSERT INTO regions (name) VALUES
  ('Zambezi'),
  ('Kavango East'),
  ('Kavango West'),
  ('Kunene'),
  ('Omusati'),
  ('Oshana'),
  ('Ohangwena'),
  ('Oshikoto'),
  ('Otjozondjupa'),
  ('Omaheke'),
  ('Khomas'),
  ('Erongo'),
  ('Hardap'),
  ('Karas')
ON CONFLICT (name) DO NOTHING;

-- Add region and membership_status columns to profiles if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'region'
  ) THEN
    ALTER TABLE profiles ADD COLUMN region text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'membership_status'
  ) THEN
    ALTER TABLE profiles ADD COLUMN membership_status text DEFAULT 'active' CHECK (membership_status IN ('active', 'inactive', 'suspended', 'pending'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'phone_number'
  ) THEN
    ALTER TABLE profiles ADD COLUMN phone_number text;
  END IF;
END $$;

-- Create sms_campaigns table
CREATE TABLE IF NOT EXISTS sms_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  filter_type text NOT NULL CHECK (filter_type IN ('all', 'region', 'membership_status')),
  filter_value text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'failed')),
  scheduled_for timestamptz,
  sent_at timestamptz,
  recipient_count integer DEFAULT 0,
  success_count integer DEFAULT 0,
  failed_count integer DEFAULT 0,
  created_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on sms_campaigns
ALTER TABLE sms_campaigns ENABLE ROW LEVEL SECURITY;

-- Policies for sms_campaigns
CREATE POLICY "Authenticated users can read all campaigns"
  ON sms_campaigns FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create campaigns"
  ON sms_campaigns FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own campaigns"
  ON sms_campaigns FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete their own campaigns"
  ON sms_campaigns FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sms_campaigns_status ON sms_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_sms_campaigns_scheduled_for ON sms_campaigns(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_sms_campaigns_created_by ON sms_campaigns(created_by);
CREATE INDEX IF NOT EXISTS idx_profiles_region ON profiles(region);
CREATE INDEX IF NOT EXISTS idx_profiles_membership_status ON profiles(membership_status);

-- Create updated_at trigger for sms_campaigns
CREATE OR REPLACE FUNCTION update_sms_campaigns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sms_campaigns_updated_at_trigger
  BEFORE UPDATE ON sms_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_sms_campaigns_updated_at();