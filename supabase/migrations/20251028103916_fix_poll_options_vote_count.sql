/*
  # Fix poll options vote count

  1. Changes
    - Update trigger function to recalculate vote counts in the options JSON field
    - Backfill existing polls with correct vote counts per option
  
  2. Details
    - Iterate through each option and count votes
    - Update the options JSON array with correct vote counts
*/

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS update_poll_stats_trigger ON poll_votes;
DROP FUNCTION IF EXISTS update_poll_statistics();

-- Create improved function to update poll statistics including options vote counts
CREATE OR REPLACE FUNCTION update_poll_statistics()
RETURNS TRIGGER AS $$
DECLARE
  poll_options jsonb;
  updated_options jsonb := '[]'::jsonb;
  option_item jsonb;
  option_index int := 0;
  vote_count int;
BEGIN
  -- Get current poll options
  SELECT options INTO poll_options
  FROM polls
  WHERE id = COALESCE(NEW.poll_id, OLD.poll_id);

  -- Loop through each option and count votes
  FOR option_item IN SELECT * FROM jsonb_array_elements(poll_options)
  LOOP
    -- Count votes for this option index
    SELECT COUNT(*) INTO vote_count
    FROM poll_votes
    WHERE poll_id = COALESCE(NEW.poll_id, OLD.poll_id)
      AND selected_options @> jsonb_build_array(option_index);
    
    -- Update the option with new vote count
    updated_options := updated_options || jsonb_build_object(
      'text', option_item->>'text',
      'votes', vote_count
    );
    
    option_index := option_index + 1;
  END LOOP;

  -- Update the poll with new statistics
  UPDATE polls
  SET 
    options = updated_options,
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

-- Recreate trigger
CREATE TRIGGER update_poll_stats_trigger
  AFTER INSERT OR UPDATE OR DELETE ON poll_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_poll_statistics();

-- Backfill existing polls with correct vote counts
DO $$
DECLARE
  poll_record RECORD;
  poll_options jsonb;
  updated_options jsonb;
  option_item jsonb;
  option_index int;
  vote_count int;
BEGIN
  FOR poll_record IN SELECT id, options FROM polls
  LOOP
    poll_options := poll_record.options;
    updated_options := '[]'::jsonb;
    option_index := 0;
    
    FOR option_item IN SELECT * FROM jsonb_array_elements(poll_options)
    LOOP
      -- Count votes for this option index
      SELECT COUNT(*) INTO vote_count
      FROM poll_votes
      WHERE poll_id = poll_record.id
        AND selected_options @> jsonb_build_array(option_index);
      
      -- Build updated option
      updated_options := updated_options || jsonb_build_object(
        'text', option_item->>'text',
        'votes', vote_count
      );
      
      option_index := option_index + 1;
    END LOOP;
    
    -- Update this poll
    UPDATE polls
    SET 
      options = updated_options,
      total_participants = (
        SELECT COUNT(DISTINCT user_id)
        FROM poll_votes
        WHERE poll_id = poll_record.id
      ),
      total_votes = (
        SELECT COUNT(*)
        FROM poll_votes
        WHERE poll_id = poll_record.id
      )
    WHERE id = poll_record.id;
  END LOOP;
END;
$$;
