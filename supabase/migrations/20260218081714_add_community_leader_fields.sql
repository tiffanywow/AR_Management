/*
  # Add Community Leader Support

  1. Changes
    - Add `leader_id` column to `communities` table to store the community leader
    - Add `leader_title` column to store the leader's title (e.g., "Chairman", "Coordinator")
    - Add `leader_contact` column to store the leader's contact information
    - Reference memberships table using id (primary key) instead of user_id
  
  2. Security
    - No RLS changes needed as communities table inherits existing policies
*/

DO $$ 
BEGIN
  -- Add leader_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'communities' AND column_name = 'leader_id'
  ) THEN
    ALTER TABLE communities ADD COLUMN leader_id uuid REFERENCES memberships(id) ON DELETE SET NULL;
  END IF;

  -- Add leader_title column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'communities' AND column_name = 'leader_title'
  ) THEN
    ALTER TABLE communities ADD COLUMN leader_title text DEFAULT 'Community Leader';
  END IF;

  -- Add leader_contact column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'communities' AND column_name = 'leader_contact'
  ) THEN
    ALTER TABLE communities ADD COLUMN leader_contact text;
  END IF;
END $$;