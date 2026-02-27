/*
  # Create poll_votes table

  1. New Tables
    - `poll_votes`
      - `id` (uuid, primary key)
      - `poll_id` (uuid, foreign key to polls)
      - `user_id` (uuid, foreign key to auth.users)
      - `option_index` (integer, index of the option in the poll's options array)
      - `created_at` (timestamp)
      - Unique constraint on (poll_id, user_id, option_index) to prevent duplicate votes

  2. Security
    - Enable RLS on `poll_votes` table
    - Users can view all poll votes (for displaying results)
    - Users can insert their own votes
    - Users cannot delete or update votes (votes are permanent)

  3. Notes
    - This table tracks individual votes for polls
    - Works with the existing polls.options JSONB structure
    - option_index refers to the position in the options array (0-based)
    - Each user can vote multiple times on multiple choice polls (one row per selected option)
    - Single choice polls should only have one vote per user (enforced in application logic)
*/

-- Create poll_votes table
CREATE TABLE IF NOT EXISTS poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid REFERENCES polls(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  option_index integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_option_index CHECK (option_index >= 0),
  UNIQUE(poll_id, user_id, option_index)
);

-- Enable RLS
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone authenticated can view all poll votes (for results)
CREATE POLICY "Authenticated users can view poll votes"
  ON poll_votes FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Users can insert their own votes
CREATE POLICY "Users can insert their own votes"
  ON poll_votes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: No updates or deletes (votes are permanent)
-- Intentionally not creating UPDATE or DELETE policies

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll_id ON poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_user_id ON poll_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll_user ON poll_votes(poll_id, user_id);
