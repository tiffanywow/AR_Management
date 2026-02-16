/*
  # Broadcasting and Engagement System

  1. New Tables
    - `party_members`
      - Core member information with demographics for targeting
      - Fields: full_name, email, phone, date_of_birth, gender, region, town, membership_type

    - `app_adverts`
      - Advertisement management with media, scheduling, and targeting
      - Fields: title, content_type, media_url, display_duration, call_to_action, targeting filters
      - Analytics: impressions, clicks, unique_views

    - `broadcasts`
      - Social feed posts with targeting and scheduling
      - Fields: message_text, published_at, scheduled_for, target filters
      - Engagement: like_count

    - `broadcast_attachments`
      - Images, PDFs, and campaign links for broadcasts
      - Fields: broadcast_id, attachment_type, file_url, campaign_id

    - `broadcast_reactions`
      - User likes/reactions tracking
      - Fields: broadcast_id, user_id, reaction_type

    - `polls`
      - Polling system with targeting
      - Fields: question, closes_at, target filters, total_responses

    - `poll_options`
      - Poll answer choices with vote counts
      - Fields: poll_id, option_text, vote_count

    - `poll_responses`
      - User vote tracking
      - Fields: poll_id, option_id, user_id

    - `communities`
      - Group management for targeted messaging
      - Fields: name, description, image_url, member_count

    - `community_members`
      - Community membership tracking
      - Fields: community_id, user_id, role, joined_at

    - `advert_analytics`
      - Detailed advert tracking with demographics
      - Fields: advert_id, user_id, event_type, user demographics

  2. Security
    - Enable RLS on all tables
    - Admins and super_admins can manage all content
    - Proper policies for user data access

  3. Important Notes
    - All timestamps use timestamptz for accuracy
    - JSONB fields for flexible targeting filters
    - Comprehensive indexes for performance
*/

-- Create party_members table
CREATE TABLE IF NOT EXISTS party_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text,
  date_of_birth date,
  gender text CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  region text,
  town text,
  address text,
  membership_type text DEFAULT 'supporter' CHECK (membership_type IN ('supporter', 'member', 'volunteer', 'donor', 'vip')),
  membership_status text DEFAULT 'active' CHECK (membership_status IN ('active', 'inactive', 'suspended')),
  joined_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE party_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage party members"
  ON party_members FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'administrator')
      AND profiles.is_active = true
    )
  );

-- Create app_adverts table
CREATE TABLE IF NOT EXISTS app_adverts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content_type text NOT NULL CHECK (content_type IN ('text', 'image', 'video')),
  text_content text,
  media_url text,
  thumbnail_url text,
  content_url text,
  display_duration_seconds integer DEFAULT 10,
  call_to_action_type text CHECK (call_to_action_type IN ('phone', 'website', 'app_link', 'none')),
  call_to_action_value text,
  scheduled_for timestamptz,
  expires_at timestamptz,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'active', 'completed', 'cancelled')),
  target_gender text,
  target_age_min integer,
  target_age_max integer,
  target_regions text[],
  target_membership_types text[],
  impressions integer DEFAULT 0,
  unique_views integer DEFAULT 0,
  clicks integer DEFAULT 0,
  views integer DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE app_adverts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage adverts"
  ON app_adverts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'administrator')
      AND profiles.is_active = true
    )
  );

-- Create broadcasts table
CREATE TABLE IF NOT EXISTS broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_text text NOT NULL,
  published_at timestamptz,
  scheduled_for timestamptz,
  is_draft boolean DEFAULT false,
  target_type text DEFAULT 'all' CHECK (target_type IN ('all', 'community', 'region', 'age_range', 'gender', 'membership_type', 'custom')),
  target_filter jsonb,
  like_count integer DEFAULT 0,
  has_attachments boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage broadcasts"
  ON broadcasts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'administrator')
      AND profiles.is_active = true
    )
  );

-- Create broadcast_attachments table
CREATE TABLE IF NOT EXISTS broadcast_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id uuid REFERENCES broadcasts(id) ON DELETE CASCADE NOT NULL,
  attachment_type text NOT NULL CHECK (attachment_type IN ('image', 'pdf', 'campaign_link')),
  file_url text,
  file_name text,
  file_size integer,
  campaign_id uuid REFERENCES campaigns(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE broadcast_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage broadcast attachments"
  ON broadcast_attachments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'administrator')
      AND profiles.is_active = true
    )
  );

-- Create broadcast_reactions table (for mobile app sync)
CREATE TABLE IF NOT EXISTS broadcast_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id uuid REFERENCES broadcasts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  reaction_type text DEFAULT 'like' CHECK (reaction_type IN ('like')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(broadcast_id, user_id)
);

ALTER TABLE broadcast_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reactions"
  ON broadcast_reactions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage reactions"
  ON broadcast_reactions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'administrator')
      AND profiles.is_active = true
    )
  );

-- Create polls table
CREATE TABLE IF NOT EXISTS polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  description text,
  closes_at timestamptz NOT NULL,
  is_active boolean DEFAULT true,
  target_type text DEFAULT 'all' CHECK (target_type IN ('all', 'community', 'region', 'age_range', 'gender', 'membership_type', 'custom')),
  target_filter jsonb,
  total_responses integer DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE polls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage polls"
  ON polls FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'administrator')
      AND profiles.is_active = true
    )
  );

-- Create poll_options table
CREATE TABLE IF NOT EXISTS poll_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid REFERENCES polls(id) ON DELETE CASCADE NOT NULL,
  option_text text NOT NULL,
  option_order integer NOT NULL,
  vote_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage poll options"
  ON poll_options FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'administrator')
      AND profiles.is_active = true
    )
  );

-- Create poll_responses table (for mobile app sync)
CREATE TABLE IF NOT EXISTS poll_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid REFERENCES polls(id) ON DELETE CASCADE NOT NULL,
  option_id uuid REFERENCES poll_options(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  responded_at timestamptz DEFAULT now(),
  UNIQUE(poll_id, user_id)
);

ALTER TABLE poll_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view poll responses"
  ON poll_responses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage poll responses"
  ON poll_responses FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'administrator')
      AND profiles.is_active = true
    )
  );

-- Create communities table
CREATE TABLE IF NOT EXISTS communities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  image_url text,
  member_count integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE communities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage communities"
  ON communities FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'administrator')
      AND profiles.is_active = true
    )
  );

-- Create community_members table
CREATE TABLE IF NOT EXISTS community_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid REFERENCES communities(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  role text DEFAULT 'member' CHECK (role IN ('member', 'moderator', 'admin')),
  joined_at timestamptz DEFAULT now(),
  invited_by uuid REFERENCES auth.users(id),
  UNIQUE(community_id, user_id)
);

ALTER TABLE community_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage community members"
  ON community_members FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'administrator')
      AND profiles.is_active = true
    )
  );

-- Create advert_analytics table
CREATE TABLE IF NOT EXISTS advert_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advert_id uuid REFERENCES app_adverts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid,
  event_type text NOT NULL CHECK (event_type IN ('view', 'click', 'impression')),
  user_region text,
  user_age integer,
  user_gender text,
  user_membership_type text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE advert_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view analytics"
  ON advert_analytics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'administrator')
      AND profiles.is_active = true
    )
  );

CREATE POLICY "System can insert analytics"
  ON advert_analytics FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_party_members_region ON party_members(region);
CREATE INDEX IF NOT EXISTS idx_party_members_membership_type ON party_members(membership_type);
CREATE INDEX IF NOT EXISTS idx_party_members_membership_status ON party_members(membership_status);
CREATE INDEX IF NOT EXISTS idx_party_members_email ON party_members(email);

CREATE INDEX IF NOT EXISTS idx_app_adverts_status ON app_adverts(status);
CREATE INDEX IF NOT EXISTS idx_app_adverts_scheduled_for ON app_adverts(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_app_adverts_created_by ON app_adverts(created_by);

CREATE INDEX IF NOT EXISTS idx_broadcasts_published_at ON broadcasts(published_at);
CREATE INDEX IF NOT EXISTS idx_broadcasts_scheduled_for ON broadcasts(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_broadcasts_is_draft ON broadcasts(is_draft);
CREATE INDEX IF NOT EXISTS idx_broadcasts_created_by ON broadcasts(created_by);

CREATE INDEX IF NOT EXISTS idx_broadcast_attachments_broadcast_id ON broadcast_attachments(broadcast_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_reactions_broadcast_id ON broadcast_reactions(broadcast_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_reactions_user_id ON broadcast_reactions(user_id);

CREATE INDEX IF NOT EXISTS idx_polls_is_active ON polls(is_active);
CREATE INDEX IF NOT EXISTS idx_polls_closes_at ON polls(closes_at);
CREATE INDEX IF NOT EXISTS idx_poll_options_poll_id ON poll_options(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_responses_poll_id ON poll_responses(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_responses_user_id ON poll_responses(user_id);

CREATE INDEX IF NOT EXISTS idx_communities_is_active ON communities(is_active);
CREATE INDEX IF NOT EXISTS idx_community_members_community_id ON community_members(community_id);
CREATE INDEX IF NOT EXISTS idx_community_members_user_id ON community_members(user_id);

CREATE INDEX IF NOT EXISTS idx_advert_analytics_advert_id ON advert_analytics(advert_id);
CREATE INDEX IF NOT EXISTS idx_advert_analytics_event_type ON advert_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_advert_analytics_created_at ON advert_analytics(created_at);

-- Create triggers for updated_at timestamps
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_party_members_updated_at'
  ) THEN
    CREATE TRIGGER update_party_members_updated_at
      BEFORE UPDATE ON party_members
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_app_adverts_updated_at'
  ) THEN
    CREATE TRIGGER update_app_adverts_updated_at
      BEFORE UPDATE ON app_adverts
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_broadcasts_updated_at'
  ) THEN
    CREATE TRIGGER update_broadcasts_updated_at
      BEFORE UPDATE ON broadcasts
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_polls_updated_at'
  ) THEN
    CREATE TRIGGER update_polls_updated_at
      BEFORE UPDATE ON polls
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_communities_updated_at'
  ) THEN
    CREATE TRIGGER update_communities_updated_at
      BEFORE UPDATE ON communities
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Create function to update broadcast like count
CREATE OR REPLACE FUNCTION update_broadcast_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE broadcasts
    SET like_count = like_count + 1
    WHERE id = NEW.broadcast_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE broadcasts
    SET like_count = like_count - 1
    WHERE id = OLD.broadcast_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_broadcast_like_count_trigger'
  ) THEN
    CREATE TRIGGER update_broadcast_like_count_trigger
      AFTER INSERT OR DELETE ON broadcast_reactions
      FOR EACH ROW
      EXECUTE FUNCTION update_broadcast_like_count();
  END IF;
END $$;

-- Create function to update poll response counts
CREATE OR REPLACE FUNCTION update_poll_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment option vote count
    UPDATE poll_options
    SET vote_count = vote_count + 1
    WHERE id = NEW.option_id;

    -- Increment poll total responses
    UPDATE polls
    SET total_responses = total_responses + 1
    WHERE id = NEW.poll_id;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement option vote count
    UPDATE poll_options
    SET vote_count = vote_count - 1
    WHERE id = OLD.option_id;

    -- Decrement poll total responses
    UPDATE polls
    SET total_responses = total_responses - 1
    WHERE id = OLD.poll_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_poll_counts_trigger'
  ) THEN
    CREATE TRIGGER update_poll_counts_trigger
      AFTER INSERT OR DELETE ON poll_responses
      FOR EACH ROW
      EXECUTE FUNCTION update_poll_counts();
  END IF;
END $$;

-- Create function to update community member count
CREATE OR REPLACE FUNCTION update_community_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE communities
    SET member_count = member_count + 1
    WHERE id = NEW.community_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE communities
    SET member_count = member_count - 1
    WHERE id = OLD.community_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_community_member_count_trigger'
  ) THEN
    CREATE TRIGGER update_community_member_count_trigger
      AFTER INSERT OR DELETE ON community_members
      FOR EACH ROW
      EXECUTE FUNCTION update_community_member_count();
  END IF;
END $$;
