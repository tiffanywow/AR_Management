/*
  # Add trigger to update poll statistics

  1. Changes
    - Create function to update poll total_votes and total_participants
    - Add trigger on poll_votes to automatically update these counts
    - Backfill existing polls with correct participant counts
  
  2. Details
    - total_votes: Sum of all votes across all options
    - total_participants: Count of unique users who voted
    - Trigger fires on INSERT, UPDATE, and DELETE of poll_votes
*/

-- Function to update poll statistics
CREATE OR REPLACE FUNCTION update_poll_statistics()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the poll statistics
  UPDATE polls
  SET 
    total_participants = (
      SELECT COUNT(DISTINCT user_id)
      FROM poll_votes
      WHERE poll_id = COALESCE(NEW.poll_id, OLD.poll_id)
    ),
    total_votes = (
      SELECT COUNT(*)
      FROM poll_votes
      WHERE poll_id = COALESCE(NEW.poll_id, OLD.poll_id)
    )
  WHERE id = COALESCE(NEW.poll_id, OLD.poll_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for poll_votes
DROP TRIGGER IF EXISTS update_poll_stats_trigger ON poll_votes;
CREATE TRIGGER update_poll_stats_trigger
  AFTER INSERT OR UPDATE OR DELETE ON poll_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_poll_statistics();

-- Backfill existing polls with correct statistics
UPDATE polls p
SET 
  total_participants = (
    SELECT COUNT(DISTINCT user_id)
    FROM poll_votes
    WHERE poll_id = p.id
  ),
  total_votes = (
    SELECT COUNT(*)
    FROM poll_votes
    WHERE poll_id = p.id
  );
