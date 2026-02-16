/*
  # Fix Store RLS Policies

  1. Changes
    - Drop existing admin-only policies for store tables
    - Create new policies that check for super_admin and administrator roles
    - Update all store table policies to use correct role names
  
  2. Security
    - Admins (super_admin and administrator) can manage all store data
    - Public users can view active products and categories
    - Regular users can manage their own orders
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage categories" ON store_categories;
DROP POLICY IF EXISTS "Admins can manage products" ON store_products;
DROP POLICY IF EXISTS "Admins can view all orders" ON store_orders;
DROP POLICY IF EXISTS "Admins can update all orders" ON store_orders;

-- Store Categories Policies
CREATE POLICY "Super admins and administrators can manage categories"
  ON store_categories
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'administrator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'administrator')
    )
  );

-- Store Products Policies
CREATE POLICY "Super admins and administrators can manage products"
  ON store_products
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'administrator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'administrator')
    )
  );

-- Store Orders Policies
CREATE POLICY "Super admins and administrators can view all orders"
  ON store_orders
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'administrator')
    )
  );

CREATE POLICY "Super admins and administrators can update all orders"
  ON store_orders
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'administrator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'administrator')
    )
  );
