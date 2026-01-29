-- Drop ALL existing triggers on driver_bids first
DROP TRIGGER IF EXISTS update_lowest_bid_trigger ON public.driver_bids;
DROP TRIGGER IF EXISTS on_bid_change ON public.driver_bids;
DROP TRIGGER IF EXISTS update_lowest_bid_on_status_trigger ON public.driver_bids;

-- Now drop the function
DROP FUNCTION IF EXISTS public.update_lowest_bid() CASCADE;
DROP FUNCTION IF EXISTS public.update_lowest_bid_on_status_change() CASCADE;

-- Create a fixed version that prevents recursion
CREATE OR REPLACE FUNCTION public.update_lowest_bid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  target_booking_id UUID;
  min_bid_id UUID;
BEGIN
  -- Get the booking ID from either NEW or OLD record
  target_booking_id := COALESCE(NEW.booking_id, OLD.booking_id);
  
  -- Find the minimum pending bid for this booking
  SELECT id INTO min_bid_id
  FROM public.driver_bids
  WHERE booking_id = target_booking_id
    AND status = 'pending'
  ORDER BY bid_amount ASC
  LIMIT 1;
  
  -- Reset all is_lowest to false for this booking (only if currently true and not the min)
  UPDATE public.driver_bids 
  SET is_lowest = false 
  WHERE booking_id = target_booking_id
    AND is_lowest = true
    AND (min_bid_id IS NULL OR id != min_bid_id);
  
  -- Set the minimum bid as lowest (only if not already set)
  IF min_bid_id IS NOT NULL THEN
    UPDATE public.driver_bids 
    SET is_lowest = true 
    WHERE id = min_bid_id
      AND is_lowest = false;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger ONLY for INSERT and DELETE (not UPDATE - this prevents infinite loop)
CREATE TRIGGER update_lowest_bid_on_insert_delete
AFTER INSERT OR DELETE ON public.driver_bids
FOR EACH ROW
EXECUTE FUNCTION public.update_lowest_bid();

-- Create driver_subscriptions table for premium plans
CREATE TABLE IF NOT EXISTS public.driver_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('bike_premium', 'auto_premium', 'cab_premium')),
  price NUMERIC NOT NULL,
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  payment_reference TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.driver_subscriptions ENABLE ROW LEVEL SECURITY;

-- Drivers can view their own subscriptions
CREATE POLICY "Drivers can view own subscriptions" 
ON public.driver_subscriptions 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM drivers 
  WHERE drivers.id = driver_subscriptions.driver_id 
  AND drivers.user_id = auth.uid()
));

-- Drivers can insert their own subscriptions
CREATE POLICY "Drivers can insert own subscriptions" 
ON public.driver_subscriptions 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM drivers 
  WHERE drivers.id = driver_subscriptions.driver_id 
  AND drivers.user_id = auth.uid()
));

-- Admins can manage all subscriptions
CREATE POLICY "Admins can manage subscriptions" 
ON public.driver_subscriptions 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::user_role));

-- Update trigger for updated_at
CREATE TRIGGER update_driver_subscriptions_updated_at
BEFORE UPDATE ON public.driver_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();