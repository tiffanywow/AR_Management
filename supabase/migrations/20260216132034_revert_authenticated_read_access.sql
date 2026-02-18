/*
  # Revert Authenticated Read Access

  1. Purpose
    - Remove permissive SELECT policies created in previous migration
    - Restore original restrictive access patterns
    - Requires users to have appropriate roles to view data

  2. Changes
    - Drop all "Authenticated users can view" policies
    - Reverts back to role-based access control

  3. Security
    - Restores original restrictive RLS policies
    - Only users with proper roles can access data
*/

-- Drop all permissive SELECT policies
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can view memberships" ON memberships;
DROP POLICY IF EXISTS "Authenticated users can view users" ON users;
DROP POLICY IF EXISTS "Authenticated users can view campaigns" ON campaigns;
DROP POLICY IF EXISTS "Authenticated users can view campaign budgets" ON campaign_budgets;
DROP POLICY IF EXISTS "Authenticated users can view campaign expenses" ON campaign_expenses;
DROP POLICY IF EXISTS "Authenticated users can view campaign collaborators" ON campaign_collaborators;
DROP POLICY IF EXISTS "Authenticated users can view campaign tasks" ON campaign_tasks;
DROP POLICY IF EXISTS "Authenticated users can view campaign attendance" ON campaign_attendance;
DROP POLICY IF EXISTS "Authenticated users can view campaign budget items" ON campaign_budget_items;
DROP POLICY IF EXISTS "Authenticated users can view donations" ON donations;
DROP POLICY IF EXISTS "Authenticated users can view party revenue" ON party_revenue;
DROP POLICY IF EXISTS "Authenticated users can view party expenses" ON party_expenses;
DROP POLICY IF EXISTS "Authenticated users can view broadcasts" ON broadcasts;
DROP POLICY IF EXISTS "Authenticated users can view broadcast comments" ON broadcast_comments;
DROP POLICY IF EXISTS "Authenticated users can view broadcast reactions" ON broadcast_reactions;
DROP POLICY IF EXISTS "Authenticated users can view broadcast views" ON broadcast_views;
DROP POLICY IF EXISTS "Authenticated users can view broadcast shares" ON broadcast_shares;
DROP POLICY IF EXISTS "Authenticated users can view polls" ON polls;
DROP POLICY IF EXISTS "Authenticated users can view poll votes" ON poll_votes;
DROP POLICY IF EXISTS "Authenticated users can view communities" ON communities;
DROP POLICY IF EXISTS "Authenticated users can view community members" ON community_members;
DROP POLICY IF EXISTS "Authenticated users can view community posts" ON community_posts;
DROP POLICY IF EXISTS "Authenticated users can view store products" ON store_products;
DROP POLICY IF EXISTS "Authenticated users can view store orders" ON store_orders;
DROP POLICY IF EXISTS "Authenticated users can view store order items" ON store_order_items;
DROP POLICY IF EXISTS "Authenticated users can view store categories" ON store_categories;
DROP POLICY IF EXISTS "Authenticated users can view store cart items" ON store_cart_items;
DROP POLICY IF EXISTS "Authenticated users can view store inventory transactions" ON store_inventory_transactions;
DROP POLICY IF EXISTS "Authenticated users can view regional authorities" ON regional_authorities;
DROP POLICY IF EXISTS "Authenticated users can view regional authority candidates" ON regional_authority_candidates;
DROP POLICY IF EXISTS "Authenticated users can view regions" ON regions;
DROP POLICY IF EXISTS "Authenticated users can view constituencies" ON constituencies;
DROP POLICY IF EXISTS "Authenticated users can view constituency candidates" ON constituency_candidates;
DROP POLICY IF EXISTS "Authenticated users can view region classifications" ON region_classifications;
DROP POLICY IF EXISTS "Authenticated users can view push notifications" ON push_notifications;
DROP POLICY IF EXISTS "Authenticated users can view notifications" ON notifications;
DROP POLICY IF EXISTS "Authenticated users can view app adverts" ON app_adverts;
DROP POLICY IF EXISTS "Authenticated users can view advert impressions" ON advert_impressions;
DROP POLICY IF EXISTS "Authenticated users can view advert interactions" ON advert_interactions;
DROP POLICY IF EXISTS "Authenticated users can view sms campaigns" ON sms_campaigns;
DROP POLICY IF EXISTS "Authenticated users can view system settings" ON system_settings;
DROP POLICY IF EXISTS "Authenticated users can view audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Authenticated users can view membership applications" ON membership_applications;
DROP POLICY IF EXISTS "Authenticated users can view about general" ON about_general;
DROP POLICY IF EXISTS "Authenticated users can view about mission" ON about_mission;
DROP POLICY IF EXISTS "Authenticated users can view about values" ON about_values;
DROP POLICY IF EXISTS "Authenticated users can view about leadership" ON about_leadership;
DROP POLICY IF EXISTS "Authenticated users can view about achievements" ON about_achievements;
DROP POLICY IF EXISTS "Authenticated users can view about contact" ON about_contact;
DROP POLICY IF EXISTS "Authenticated users can view behind scenes content" ON behind_scenes_content;
DROP POLICY IF EXISTS "Authenticated users can view impact stories" ON impact_stories;
DROP POLICY IF EXISTS "Authenticated users can view policy explainers" ON policy_explainers;
DROP POLICY IF EXISTS "Authenticated users can view fact checks" ON fact_checks;
DROP POLICY IF EXISTS "Authenticated users can view misinformation tracker" ON misinformation_tracker;
DROP POLICY IF EXISTS "Authenticated users can view source citations" ON source_citations;
DROP POLICY IF EXISTS "Authenticated users can view verification badges" ON verification_badges;
DROP POLICY IF EXISTS "Authenticated users can view budget transparency reports" ON budget_transparency_reports;
DROP POLICY IF EXISTS "Authenticated users can view safety alerts" ON safety_alerts;
DROP POLICY IF EXISTS "Authenticated users can view emergency broadcasts" ON emergency_broadcasts;
DROP POLICY IF EXISTS "Authenticated users can view crisis responses" ON crisis_responses;
