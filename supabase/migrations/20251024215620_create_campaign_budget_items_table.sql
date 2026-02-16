/*
  # Create Campaign Budget Items Table

  1. New Tables
    - `campaign_budget_items`
      - `id` (uuid, primary key) - Unique identifier for the budget item
      - `campaign_id` (uuid, foreign key) - References campaigns table
      - `category` (text) - Budget category (venue, transport, marketing, catering, equipment, other)
      - `description` (text) - Description of the budget item
      - `budgeted_amount` (numeric) - Planned budget amount
      - `actual_amount` (numeric) - Actual amount spent (defaults to 0)
      - `created_by` (uuid, foreign key) - References profiles table for who created the item
      - `created_at` (timestamptz) - When the item was created
      - `updated_at` (timestamptz) - When the item was last updated
      
  2. Security
    - Enable RLS on `campaign_budget_items` table
    - Add policies for authenticated users to:
      - Read all budget items
      - Create budget items
      - Update budget items they created
      - Delete budget items they created
*/

-- Create campaign_budget_items table
CREATE TABLE IF NOT EXISTS campaign_budget_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('venue', 'transport', 'marketing', 'catering', 'equipment', 'other')),
  description text NOT NULL,
  budgeted_amount numeric(10, 2) NOT NULL DEFAULT 0,
  actual_amount numeric(10, 2) NOT NULL DEFAULT 0,
  created_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE campaign_budget_items ENABLE ROW LEVEL SECURITY;

-- Policies for campaign_budget_items
CREATE POLICY "Authenticated users can read all budget items"
  ON campaign_budget_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create budget items"
  ON campaign_budget_items FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own budget items"
  ON campaign_budget_items FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete their own budget items"
  ON campaign_budget_items FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_campaign_budget_items_campaign_id 
  ON campaign_budget_items(campaign_id);

CREATE INDEX IF NOT EXISTS idx_campaign_budget_items_created_by 
  ON campaign_budget_items(created_by);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_campaign_budget_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_campaign_budget_items_updated_at_trigger
  BEFORE UPDATE ON campaign_budget_items
  FOR EACH ROW
  EXECUTE FUNCTION update_campaign_budget_items_updated_at();