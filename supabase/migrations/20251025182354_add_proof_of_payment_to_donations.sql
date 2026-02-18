/*
  # Add Proof of Payment to Donations

  1. Changes
    - Add proof_of_payment column to donations table to store POP file URL
    - Allow NULL values as POP is optional

  2. Security
    - No RLS changes needed
    - Existing policies handle access control
*/

-- Add proof_of_payment column to donations table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'donations' AND column_name = 'proof_of_payment'
  ) THEN
    ALTER TABLE donations ADD COLUMN proof_of_payment text;
  END IF;
END $$;
