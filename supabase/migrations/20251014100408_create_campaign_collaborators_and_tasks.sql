/*
  # Campaign Collaborators and Tasks

  1. New Tables
    - `campaign_collaborators`
      - `id` (uuid, primary key)
      - `campaign_id` (uuid, references campaigns)
      - `user_id` (uuid, references profiles)
      - `role` (text) - Role in campaign (coordinator, volunteer, etc)
      - `created_at` (timestamp)
      - `created_by` (uuid, references auth.users)
    
    - `campaign_tasks`
      - `id` (uuid, primary key)
      - `campaign_id` (uuid, references campaigns)
      - `title` (text)
      - `description` (text)
      - `assigned_to` (uuid, references profiles)
      - `status` (text) - pending, in_progress, completed
      - `due_date` (date)
      - `priority` (text) - low, medium, high
      - `created_at` (timestamp)
      - `created_by` (uuid, references auth.users)
      - `completed_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their campaign collaborators and tasks
*/

-- Create campaign_collaborators table
CREATE TABLE IF NOT EXISTS campaign_collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'volunteer',
  created_at timestamptz DEFAULT now(),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  UNIQUE(campaign_id, user_id)
);

-- Create campaign_tasks table
CREATE TABLE IF NOT EXISTS campaign_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status text DEFAULT 'pending',
  due_date date,
  priority text DEFAULT 'medium',
  created_at timestamptz DEFAULT now(),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  completed_at timestamptz,
  CONSTRAINT valid_status CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  CONSTRAINT valid_priority CHECK (priority IN ('low', 'medium', 'high'))
);

-- Enable RLS
ALTER TABLE campaign_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_tasks ENABLE ROW LEVEL SECURITY;

-- Policies for campaign_collaborators
CREATE POLICY "Users can view collaborators of campaigns they're part of"
  ON campaign_collaborators FOR SELECT
  TO authenticated
  USING (
    auth.uid() = created_by 
    OR 
    EXISTS (
      SELECT 1 FROM campaign_collaborators cc 
      WHERE cc.campaign_id = campaign_collaborators.campaign_id 
      AND cc.user_id IN (SELECT id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Campaign creators can add collaborators"
  ON campaign_collaborators FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns 
      WHERE id = campaign_id 
      AND created_by = auth.uid()
    )
  );

CREATE POLICY "Campaign creators can remove collaborators"
  ON campaign_collaborators FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns 
      WHERE id = campaign_id 
      AND created_by = auth.uid()
    )
  );

-- Policies for campaign_tasks
CREATE POLICY "Users can view tasks for campaigns they're part of"
  ON campaign_tasks FOR SELECT
  TO authenticated
  USING (
    auth.uid() = created_by
    OR
    assigned_to IN (SELECT id FROM profiles WHERE id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM campaign_collaborators 
      WHERE campaign_id = campaign_tasks.campaign_id 
      AND user_id IN (SELECT id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Campaign collaborators can create tasks"
  ON campaign_tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns 
      WHERE id = campaign_id 
      AND created_by = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM campaign_collaborators 
      WHERE campaign_id = campaign_tasks.campaign_id 
      AND user_id IN (SELECT id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Task assignees and creators can update tasks"
  ON campaign_tasks FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = created_by
    OR
    assigned_to IN (SELECT id FROM profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    auth.uid() = created_by
    OR
    assigned_to IN (SELECT id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Campaign creators can delete tasks"
  ON campaign_tasks FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM campaigns 
      WHERE id = campaign_id 
      AND created_by = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_campaign_collaborators_campaign_id ON campaign_collaborators(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_collaborators_user_id ON campaign_collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_campaign_tasks_campaign_id ON campaign_tasks(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_tasks_assigned_to ON campaign_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_campaign_tasks_status ON campaign_tasks(status);
