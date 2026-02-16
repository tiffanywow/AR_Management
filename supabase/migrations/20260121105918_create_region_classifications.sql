/*
  # Create Region Classifications Table

  1. New Tables
    - `region_classifications`
      - `id` (uuid, primary key)
      - `region_name` (text, unique)
      - `region_code` (text, unique)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `updated_by` (uuid, references profiles)

  2. Security
    - Enable RLS on region_classifications table
    - Allow all authenticated users to read region classifications
    - Only super_admin and administrator roles can update region classifications

  3. Initial Data
    - Populate with default Namibian region classifications (A-N)
*/

CREATE TABLE IF NOT EXISTS region_classifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region_name text UNIQUE NOT NULL,
  region_code text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE region_classifications ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read region classifications
CREATE POLICY "Authenticated users can view region classifications"
  ON region_classifications FOR SELECT
  TO authenticated
  USING (true);

-- Allow administrators to update region classifications
CREATE POLICY "Administrators can update region classifications"
  ON region_classifications FOR UPDATE
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

-- Allow administrators to insert region classifications
CREATE POLICY "Administrators can insert region classifications"
  ON region_classifications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'administrator')
      AND profiles.is_active = true
    )
  );

-- Insert default region classifications
INSERT INTO region_classifications (region_name, region_code) VALUES
  ('Kharas', 'A'),
  ('Erongo', 'B'),
  ('Hardap', 'C'),
  ('Kavango East', 'D'),
  ('Kavango West', 'E'),
  ('Khomas', 'F'),
  ('Kunene', 'G'),
  ('Ohangwena', 'H'),
  ('Omaheke', 'I'),
  ('Omusati', 'J'),
  ('Oshana', 'K'),
  ('Oshikoto', 'L'),
  ('Otjozondjupa', 'M'),
  ('Zambezi', 'N')
ON CONFLICT (region_name) DO NOTHING;

-- Create trigger for updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_region_classifications_updated_at'
  ) THEN
    CREATE TRIGGER update_region_classifications_updated_at
      BEFORE UPDATE ON region_classifications
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;