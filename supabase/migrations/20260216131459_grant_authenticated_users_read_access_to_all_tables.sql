/*
  # Grant Read Access to All Authenticated Users

  1. Purpose
    - Allow any authenticated user to view data across all tables
    - This enables dashboards and analytics to function properly
    - Write operations still require appropriate roles

  2. Changes
    - Add SELECT policies for authenticated users on all core tables
    - Removes restrictions that block dashboard data display

  3. Security Note
    - This is permissive for development/testing
    - All write operations still protected by existing role-based policies
    - Consider more restrictive policies for production if needed
*/

-- Core system tables
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON profiles;
CREATE POLICY "Authenticated users can view profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can view memberships" ON memberships;
CREATE POLICY "Authenticated users can view memberships"
  ON memberships FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can view users" ON users;
CREATE POLICY "Authenticated users can view users"
  ON users FOR SELECT
  TO authenticated
  USING (true);

-- Campaign tables
DROP POLICY IF EXISTS "Authenticated users can view campaigns" ON campaigns;
CREATE POLICY "Authenticated users can view campaigns"
  ON campaigns FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can view campaign budgets" ON campaign_budgets;
CREATE POLICY "Authenticated users can view campaign budgets"
  ON campaign_budgets FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can view campaign expenses" ON campaign_expenses;
CREATE POLICY "Authenticated users can view campaign expenses"
  ON campaign_expenses FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can view campaign collaborators" ON campaign_collaborators;
CREATE POLICY "Authenticated users can view campaign collaborators"
  ON campaign_collaborators FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can view campaign tasks" ON campaign_tasks;
CREATE POLICY "Authenticated users can view campaign tasks"
  ON campaign_tasks FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can view campaign attendance" ON campaign_attendance;
CREATE POLICY "Authenticated users can view campaign attendance"
  ON campaign_attendance FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can view campaign budget items" ON campaign_budget_items;
CREATE POLICY "Authenticated users can view campaign budget items"
  ON campaign_budget_items FOR SELECT
  TO authenticated
  USING (true);

-- Financial tables
DROP POLICY IF EXISTS "Authenticated users can view donations" ON donations;
CREATE POLICY "Authenticated users can view donations"
  ON donations FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can view party revenue" ON party_revenue;
CREATE POLICY "Authenticated users can view party revenue"
  ON party_revenue FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can view party expenses" ON party_expenses;
CREATE POLICY "Authenticated users can view party expenses"
  ON party_expenses FOR SELECT
  TO authenticated
  USING (true);

-- Broadcasting tables
DROP POLICY IF EXISTS "Authenticated users can view broadcasts" ON broadcasts;
CREATE POLICY "Authenticated users can view broadcasts"
  ON broadcasts FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can view broadcast comments" ON broadcast_comments;
CREATE POLICY "Authenticated users can view broadcast comments"
  ON broadcast_comments FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can view broadcast reactions" ON broadcast_reactions;
CREATE POLICY "Authenticated users can view broadcast reactions"
  ON broadcast_reactions FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can view broadcast views" ON broadcast_views;
CREATE POLICY "Authenticated users can view broadcast views"
  ON broadcast_views FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can view broadcast shares" ON broadcast_shares;
CREATE POLICY "Authenticated users can view broadcast shares"
  ON broadcast_shares FOR SELECT
  TO authenticated
  USING (true);

-- Poll tables
DROP POLICY IF EXISTS "Authenticated users can view polls" ON polls;
CREATE POLICY "Authenticated users can view polls"
  ON polls FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can view poll votes" ON poll_votes;
CREATE POLICY "Authenticated users can view poll votes"
  ON poll_votes FOR SELECT
  TO authenticated
  USING (true);

-- Community tables
DROP POLICY IF EXISTS "Authenticated users can view communities" ON communities;
CREATE POLICY "Authenticated users can view communities"
  ON communities FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can view community members" ON community_members;
CREATE POLICY "Authenticated users can view community members"
  ON community_members FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can view community posts" ON community_posts;
CREATE POLICY "Authenticated users can view community posts"
  ON community_posts FOR SELECT
  TO authenticated
  USING (true);

-- Store tables
DROP POLICY IF EXISTS "Authenticated users can view store products" ON store_products;
CREATE POLICY "Authenticated users can view store products"
  ON store_products FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can view store orders" ON store_orders;
CREATE POLICY "Authenticated users can view store orders"
  ON store_orders FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can view store order items" ON store_order_items;
CREATE POLICY "Authenticated users can view store order items"
  ON store_order_items FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can view store categories" ON store_categories;
CREATE POLICY "Authenticated users can view store categories"
  ON store_categories FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can view store cart items" ON store_cart_items;
CREATE POLICY "Authenticated users can view store cart items"
  ON store_cart_items FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can view store inventory transactions" ON store_inventory_transactions;
CREATE POLICY "Authenticated users can view store inventory transactions"
  ON store_inventory_transactions FOR SELECT
  TO authenticated
  USING (true);

-- Regional tables
DROP POLICY IF EXISTS "Authenticated users can view regional authorities" ON regional_authorities;
CREATE POLICY "Authenticated users can view regional authorities"
  ON regional_authorities FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can view regional authority candidates" ON regional_authority_candidates;
CREATE POLICY "Authenticated users can view regional authority candidates"
  ON regional_authority_candidates FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can view regions" ON regions;
CREATE POLICY "Authenticated users can view regions"
  ON regions FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can view constituencies" ON constituencies;
CREATE POLICY "Authenticated users can view constituencies"
  ON constituencies FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can view constituency candidates" ON constituency_candidates;
CREATE POLICY "Authenticated users can view constituency candidates"
  ON constituency_candidates FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can view region classifications" ON region_classifications;
CREATE POLICY "Authenticated users can view region classifications"
  ON region_classifications FOR SELECT
  TO authenticated
  USING (true);

-- Notification tables
DROP POLICY IF EXISTS "Authenticated users can view push notifications" ON push_notifications;
CREATE POLICY "Authenticated users can view push notifications"
  ON push_notifications FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can view notifications" ON notifications;
CREATE POLICY "Authenticated users can view notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (true);

-- Advert and SMS tables
DROP POLICY IF EXISTS "Authenticated users can view app adverts" ON app_adverts;
CREATE POLICY "Authenticated users can view app adverts"
  ON app_adverts FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can view advert impressions" ON advert_impressions;
CREATE POLICY "Authenticated users can view advert impressions"
  ON advert_impressions FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can view advert interactions" ON advert_interactions;
CREATE POLICY "Authenticated users can view advert interactions"
  ON advert_interactions FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can view sms campaigns" ON sms_campaigns;
CREATE POLICY "Authenticated users can view sms campaigns"
  ON sms_campaigns FOR SELECT
  TO authenticated
  USING (true);

-- System and audit tables
DROP POLICY IF EXISTS "Authenticated users can view system settings" ON system_settings;
CREATE POLICY "Authenticated users can view system settings"
  ON system_settings FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can view audit logs" ON audit_logs;
CREATE POLICY "Authenticated users can view audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (true);

-- Content tables
DROP POLICY IF EXISTS "Authenticated users can view membership applications" ON membership_applications;
CREATE POLICY "Authenticated users can view membership applications"
  ON membership_applications FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can view about general" ON about_general;
CREATE POLICY "Authenticated users can view about general"
  ON about_general FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can view about mission" ON about_mission;
CREATE POLICY "Authenticated users can view about mission"
  ON about_mission FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can view about values" ON about_values;
CREATE POLICY "Authenticated users can view about values"
  ON about_values FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can view about leadership" ON about_leadership;
CREATE POLICY "Authenticated users can view about leadership"
  ON about_leadership FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can view about achievements" ON about_achievements;
CREATE POLICY "Authenticated users can view about achievements"
  ON about_achievements FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can view about contact" ON about_contact;
CREATE POLICY "Authenticated users can view about contact"
  ON about_contact FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can view behind scenes content" ON behind_scenes_content;
CREATE POLICY "Authenticated users can view behind scenes content"
  ON behind_scenes_content FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can view impact stories" ON impact_stories;
CREATE POLICY "Authenticated users can view impact stories"
  ON impact_stories FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can view policy explainers" ON policy_explainers;
CREATE POLICY "Authenticated users can view policy explainers"
  ON policy_explainers FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can view fact checks" ON fact_checks;
CREATE POLICY "Authenticated users can view fact checks"
  ON fact_checks FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can view misinformation tracker" ON misinformation_tracker;
CREATE POLICY "Authenticated users can view misinformation tracker"
  ON misinformation_tracker FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can view source citations" ON source_citations;
CREATE POLICY "Authenticated users can view source citations"
  ON source_citations FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can view verification badges" ON verification_badges;
CREATE POLICY "Authenticated users can view verification badges"
  ON verification_badges FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can view budget transparency reports" ON budget_transparency_reports;
CREATE POLICY "Authenticated users can view budget transparency reports"
  ON budget_transparency_reports FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can view safety alerts" ON safety_alerts;
CREATE POLICY "Authenticated users can view safety alerts"
  ON safety_alerts FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can view emergency broadcasts" ON emergency_broadcasts;
CREATE POLICY "Authenticated users can view emergency broadcasts"
  ON emergency_broadcasts FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can view crisis responses" ON crisis_responses;
CREATE POLICY "Authenticated users can view crisis responses"
  ON crisis_responses FOR SELECT
  TO authenticated
  USING (true);
