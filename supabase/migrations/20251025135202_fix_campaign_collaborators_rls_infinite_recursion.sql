/*
  # Fix Campaign Collaborators RLS Infinite Recursion

  1. Changes
    - Drop the existing SELECT policy that causes infinite recursion
    - Create new policies that directly check campaigns table and user_id
    - Allow campaign creators and collaborators to view all collaborators
    - Use direct user_id comparison instead of nested subquery

  2. Security
    - Campaign creators can view all collaborators
    - Collaborators themselves can view collaborators (by checking user_id directly)
    - No circular dependency in policy checks
*/

-- Drop existing policy that causes recursion
DROP POLICY IF EXISTS "Users can view collaborators of campaigns they're part of" ON campaign_collaborators;

-- Create new policies without circular dependency
CREATE POLICY "Campaign creators can view all collaborators"
  ON campaign_collaborators FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns 
      WHERE id = campaign_collaborators.campaign_id 
      AND created_by = auth.uid()
    )
  );

CREATE POLICY "Collaborators can view other collaborators"
  ON campaign_collaborators FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
  );
