/*
  # Create Trigger to Auto-Update Community Member Counts

  1. Changes
    - Creates a function to update community member_count automatically
    - Creates triggers on INSERT, UPDATE, DELETE for community_members table
    - Ensures member_count is always accurate in real-time
  
  2. Purpose
    - Eliminates manual member count updates
    - Prevents count discrepancies
    - Improves data integrity
*/

CREATE OR REPLACE FUNCTION update_community_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
    UPDATE communities
    SET member_count = member_count + 1
    WHERE id = NEW.community_id;
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'active' THEN
    UPDATE communities
    SET member_count = GREATEST(0, member_count - 1)
    WHERE id = OLD.community_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'active' AND NEW.status != 'active' THEN
      UPDATE communities
      SET member_count = GREATEST(0, member_count - 1)
      WHERE id = NEW.community_id;
    ELSIF OLD.status != 'active' AND NEW.status = 'active' THEN
      UPDATE communities
      SET member_count = member_count + 1
      WHERE id = NEW.community_id;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_community_member_count ON community_members;

CREATE TRIGGER trigger_update_community_member_count
AFTER INSERT OR UPDATE OR DELETE ON community_members
FOR EACH ROW
EXECUTE FUNCTION update_community_member_count();
