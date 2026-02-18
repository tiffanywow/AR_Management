/*
  # Multi-User Political Party Management System

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key, references auth.users)
      - `email` (text, unique)
      - `full_name` (text)
      - `role` (text: 'super_admin', 'administrator', 'finance')
      - `created_at` (timestamptz)
      - `created_by` (uuid, references profiles)
      - `is_active` (boolean)
      
    - `campaigns`
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `location_name` (text)
      - `location_lat` (numeric)
      - `location_lng` (numeric)
      - `start_date` (date)
      - `end_date` (date)
      - `target_amount` (numeric)
      - `raised_amount` (numeric)
      - `status` (text: 'draft', 'active', 'completed', 'cancelled')
      - `created_by` (uuid, references profiles)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      
    - `campaign_budgets`
      - `id` (uuid, primary key)
      - `campaign_id` (uuid, references campaigns)
      - `category` (text: 'venue', 'transport', 'marketing', 'catering', 'equipment', 'other')
      - `description` (text)
      - `budgeted_amount` (numeric)
      - `actual_amount` (numeric)
      - `created_by` (uuid, references profiles)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      
    - `campaign_expenses`
      - `id` (uuid, primary key)
      - `campaign_id` (uuid, references campaigns)
      - `budget_id` (uuid, references campaign_budgets, nullable)
      - `description` (text)
      - `amount` (numeric)
      - `expense_date` (date)
      - `receipt_url` (text)
      - `status` (text: 'pending', 'approved', 'rejected')
      - `created_by` (uuid, references profiles)
      - `approved_by` (uuid, references profiles, nullable)
      - `created_at` (timestamptz)
      
    - `donations`
      - `id` (uuid, primary key)
      - `campaign_id` (uuid, references campaigns, nullable)
      - `donor_name` (text)
      - `donor_email` (text)
      - `donor_phone` (text)
      - `amount` (numeric)
      - `payment_method` (text: 'eft', 'card', 'cash', 'wallet')
      - `payment_reference` (text, unique)
      - `payment_status` (text: 'pending', 'confirmed', 'failed', 'refunded')
      - `reconciled` (boolean)
      - `reconciled_by` (uuid, references profiles, nullable)
      - `reconciled_at` (timestamptz, nullable)
      - `donation_date` (timestamptz)
      - `created_at` (timestamptz)
      
    - `party_revenue`
      - `id` (uuid, primary key)
      - `source` (text: 'donations', 'membership_fees', 'merchandise', 'events', 'other')
      - `description` (text)
      - `amount` (numeric)
      - `revenue_date` (date)
      - `reference_number` (text)
      - `created_by` (uuid, references profiles)
      - `created_at` (timestamptz)
      
    - `party_expenses`
      - `id` (uuid, primary key)
      - `category` (text: 'salaries', 'rent', 'utilities', 'marketing', 'transport', 'supplies', 'other')
      - `description` (text)
      - `amount` (numeric)
      - `expense_date` (date)
      - `receipt_url` (text)
      - `status` (text: 'pending', 'approved', 'paid')
      - `created_by` (uuid, references profiles)
      - `approved_by` (uuid, references profiles, nullable)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Policies for role-based access:
      - Super admins can do everything
      - Administrators can manage campaigns
      - Finance users can manage budgets, expenses, donations, and reconciliation
      - Users can only see data relevant to their role
      
  3. Important Notes
    - Payment reference numbers are auto-generated for EFT donations
    - All financial amounts stored as numeric for precision
    - Comprehensive audit trail with created_by and created_at fields
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('super_admin', 'administrator', 'finance')),
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  is_active boolean DEFAULT true
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Super admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
      AND profiles.is_active = true
    )
  );

CREATE POLICY "Super admins can insert profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
      AND profiles.is_active = true
    )
  );

CREATE POLICY "Super admins can update profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
      AND profiles.is_active = true
    )
  );

-- Create campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  location_name text,
  location_lat numeric,
  location_lng numeric,
  start_date date,
  end_date date,
  target_amount numeric DEFAULT 0,
  raised_amount numeric DEFAULT 0,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and super admins can view campaigns"
  ON campaigns FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'administrator')
      AND profiles.is_active = true
    )
  );

CREATE POLICY "Finance users can view campaigns"
  ON campaigns FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'finance'
      AND profiles.is_active = true
    )
  );

CREATE POLICY "Admins and super admins can create campaigns"
  ON campaigns FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'administrator')
      AND profiles.is_active = true
    )
  );

CREATE POLICY "Admins and super admins can update campaigns"
  ON campaigns FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'administrator')
      AND profiles.is_active = true
    )
  );

-- Create campaign_budgets table
CREATE TABLE IF NOT EXISTS campaign_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  category text NOT NULL CHECK (category IN ('venue', 'transport', 'marketing', 'catering', 'equipment', 'other')),
  description text NOT NULL,
  budgeted_amount numeric NOT NULL DEFAULT 0,
  actual_amount numeric DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE campaign_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance and super admins can manage budgets"
  ON campaign_budgets FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'finance')
      AND profiles.is_active = true
    )
  );

CREATE POLICY "Admins can view budgets"
  ON campaign_budgets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'administrator'
      AND profiles.is_active = true
    )
  );

-- Create campaign_expenses table
CREATE TABLE IF NOT EXISTS campaign_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  budget_id uuid REFERENCES campaign_budgets(id) ON DELETE SET NULL,
  description text NOT NULL,
  amount numeric NOT NULL,
  expense_date date NOT NULL,
  receipt_url text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  approved_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE campaign_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance and super admins can manage expenses"
  ON campaign_expenses FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'finance')
      AND profiles.is_active = true
    )
  );

CREATE POLICY "Admins can view expenses"
  ON campaign_expenses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'administrator'
      AND profiles.is_active = true
    )
  );

-- Create donations table
CREATE TABLE IF NOT EXISTS donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES campaigns(id) ON DELETE SET NULL,
  donor_name text NOT NULL,
  donor_email text,
  donor_phone text,
  amount numeric NOT NULL,
  payment_method text NOT NULL CHECK (payment_method IN ('eft', 'card', 'cash', 'wallet')),
  payment_reference text UNIQUE NOT NULL,
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'confirmed', 'failed', 'refunded')),
  reconciled boolean DEFAULT false,
  reconciled_by uuid REFERENCES auth.users(id),
  reconciled_at timestamptz,
  donation_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE donations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance and super admins can manage donations"
  ON donations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'finance')
      AND profiles.is_active = true
    )
  );

-- Create party_revenue table
CREATE TABLE IF NOT EXISTS party_revenue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL CHECK (source IN ('donations', 'membership_fees', 'merchandise', 'events', 'other')),
  description text NOT NULL,
  amount numeric NOT NULL,
  revenue_date date NOT NULL,
  reference_number text,
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE party_revenue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance and super admins can manage revenue"
  ON party_revenue FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'finance')
      AND profiles.is_active = true
    )
  );

-- Create party_expenses table
CREATE TABLE IF NOT EXISTS party_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL CHECK (category IN ('salaries', 'rent', 'utilities', 'marketing', 'transport', 'supplies', 'other')),
  description text NOT NULL,
  amount numeric NOT NULL,
  expense_date date NOT NULL,
  receipt_url text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid')),
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  approved_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE party_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finance and super admins can manage party expenses"
  ON party_expenses FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'finance')
      AND profiles.is_active = true
    )
  );

-- Create function to generate payment reference
CREATE OR REPLACE FUNCTION generate_payment_reference()
RETURNS text AS $$
BEGIN
  RETURN 'AR-' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0') || '-' || TO_CHAR(NOW(), 'YYYYMMDD');
END;
$$ LANGUAGE plpgsql;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for campaigns updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_campaigns_updated_at'
  ) THEN
    CREATE TRIGGER update_campaigns_updated_at
      BEFORE UPDATE ON campaigns
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Create trigger for campaign_budgets updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_campaign_budgets_updated_at'
  ) THEN
    CREATE TRIGGER update_campaign_budgets_updated_at
      BEFORE UPDATE ON campaign_budgets
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;