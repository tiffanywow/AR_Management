/*
  # Set Card Payments as Confirmed by Default

  1. Changes
    - Create trigger function to automatically set card payments to 'confirmed' status
    - EFT payments remain 'pending' and need manual confirmation by finance/super admin
    - Trigger runs before insert on donations table

  2. Security
    - No RLS changes needed
    - Finance and super admin can still update payment status via existing policies
*/

-- Create function to auto-confirm card payments
CREATE OR REPLACE FUNCTION auto_confirm_card_payments()
RETURNS TRIGGER AS $$
BEGIN
  -- If payment method is 'card', set payment_status to 'confirmed'
  IF NEW.payment_method = 'card' THEN
    NEW.payment_status := 'confirmed';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to run before insert
DROP TRIGGER IF EXISTS confirm_card_payments_trigger ON donations;
CREATE TRIGGER confirm_card_payments_trigger
  BEFORE INSERT ON donations
  FOR EACH ROW
  EXECUTE FUNCTION auto_confirm_card_payments();
