/*
  # Make Product SKU Required and Unique

  1. Changes
    - Make SKU column NOT NULL
    - Ensure UNIQUE constraint exists on SKU
    - Add check constraint to prevent empty/whitespace SKU values
  
  2. Security
    - No RLS changes needed
*/

-- First, update any existing NULL or empty SKUs with a temporary unique value
UPDATE store_products
SET sku = 'SKU-' || id
WHERE sku IS NULL OR sku = '' OR sku ~ '^\s*$';

-- Make SKU NOT NULL
ALTER TABLE store_products
ALTER COLUMN sku SET NOT NULL;

-- Drop existing unique constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'store_products_sku_key'
    AND table_name = 'store_products'
  ) THEN
    ALTER TABLE store_products DROP CONSTRAINT store_products_sku_key;
  END IF;
END $$;

-- Add unique constraint on SKU
ALTER TABLE store_products
ADD CONSTRAINT store_products_sku_key UNIQUE (sku);

-- Add check constraint to prevent empty or whitespace-only SKUs
ALTER TABLE store_products
ADD CONSTRAINT store_products_sku_not_empty
CHECK (sku IS NOT NULL AND trim(sku) <> '');
