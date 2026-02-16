/*
  # Create Regional Authorities and Candidates System

  1. New Tables
    - `regional_authorities`
      - `id` (uuid, primary key)
      - `name` (text, unique, not null) - Name of the regional authority
      - `description` (text) - Description of the regional authority
      - `is_active` (boolean, default true) - Whether the authority is active
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())
    
    - `constituencies`
      - `id` (uuid, primary key)
      - `regional_authority_id` (uuid, foreign key) - Reference to regional authority
      - `name` (text, not null) - Name of the constituency
      - `description` (text) - Description of the constituency
      - `is_active` (boolean, default true) - Whether the constituency is active
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())
    
    - `regional_authority_candidates`
      - `id` (uuid, primary key)
      - `regional_authority_id` (uuid, foreign key) - Reference to regional authority
      - `full_name` (text, not null) - Candidate's full name
      - `bio` (text) - Candidate biography
      - `photo_url` (text) - URL to candidate photo
      - `position` (text) - Position running for
      - `party_affiliation` (text) - Political party
      - `contact_email` (text)
      - `contact_phone` (text)
      - `is_active` (boolean, default true)
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())
    
    - `constituency_candidates`
      - `id` (uuid, primary key)
      - `constituency_id` (uuid, foreign key) - Reference to constituency
      - `full_name` (text, not null) - Candidate's full name
      - `bio` (text) - Candidate biography
      - `photo_url` (text) - URL to candidate photo
      - `position` (text) - Position running for
      - `party_affiliation` (text) - Political party
      - `contact_email` (text)
      - `contact_phone` (text)
      - `is_active` (boolean, default true)
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())

  2. Security
    - Enable RLS on all tables
    - Super admins and administrators can manage all data
    - Public users can view active authorities, constituencies, and candidates
*/

-- Create regional_authorities table
CREATE TABLE IF NOT EXISTS regional_authorities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create constituencies table
CREATE TABLE IF NOT EXISTS constituencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  regional_authority_id uuid REFERENCES regional_authorities(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(regional_authority_id, name)
);

-- Create regional_authority_candidates table
CREATE TABLE IF NOT EXISTS regional_authority_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  regional_authority_id uuid REFERENCES regional_authorities(id) ON DELETE CASCADE NOT NULL,
  full_name text NOT NULL,
  bio text,
  photo_url text,
  position text,
  party_affiliation text,
  contact_email text,
  contact_phone text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create constituency_candidates table
CREATE TABLE IF NOT EXISTS constituency_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  constituency_id uuid REFERENCES constituencies(id) ON DELETE CASCADE NOT NULL,
  full_name text NOT NULL,
  bio text,
  photo_url text,
  position text,
  party_affiliation text,
  contact_email text,
  contact_phone text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE regional_authorities ENABLE ROW LEVEL SECURITY;
ALTER TABLE constituencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE regional_authority_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE constituency_candidates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for regional_authorities
CREATE POLICY "Public can view active regional authorities"
  ON regional_authorities
  FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Admins can manage regional authorities"
  ON regional_authorities
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'administrator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'administrator')
    )
  );

-- RLS Policies for constituencies
CREATE POLICY "Public can view active constituencies"
  ON constituencies
  FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Admins can manage constituencies"
  ON constituencies
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'administrator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'administrator')
    )
  );

-- RLS Policies for regional_authority_candidates
CREATE POLICY "Public can view active regional authority candidates"
  ON regional_authority_candidates
  FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Admins can manage regional authority candidates"
  ON regional_authority_candidates
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'administrator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'administrator')
    )
  );

-- RLS Policies for constituency_candidates
CREATE POLICY "Public can view active constituency candidates"
  ON constituency_candidates
  FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Admins can manage constituency candidates"
  ON constituency_candidates
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'administrator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'administrator')
    )
  );

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_constituencies_regional_authority 
  ON constituencies(regional_authority_id);

CREATE INDEX IF NOT EXISTS idx_regional_authority_candidates_authority 
  ON regional_authority_candidates(regional_authority_id);

CREATE INDEX IF NOT EXISTS idx_constituency_candidates_constituency 
  ON constituency_candidates(constituency_id);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers to update updated_at
DROP TRIGGER IF EXISTS update_regional_authorities_updated_at ON regional_authorities;
CREATE TRIGGER update_regional_authorities_updated_at
  BEFORE UPDATE ON regional_authorities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_constituencies_updated_at ON constituencies;
CREATE TRIGGER update_constituencies_updated_at
  BEFORE UPDATE ON constituencies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_regional_authority_candidates_updated_at ON regional_authority_candidates;
CREATE TRIGGER update_regional_authority_candidates_updated_at
  BEFORE UPDATE ON regional_authority_candidates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_constituency_candidates_updated_at ON constituency_candidates;
CREATE TRIGGER update_constituency_candidates_updated_at
  BEFORE UPDATE ON constituency_candidates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
