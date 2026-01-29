-- Create enum for bid status
CREATE TYPE public.bid_status AS ENUM ('pending', 'accepted', 'rejected', 'expired');

-- Create driver_bids table for real-time bidding
CREATE TABLE public.driver_bids (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  bid_amount NUMERIC NOT NULL,
  is_lowest BOOLEAN DEFAULT false,
  status bid_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '5 minutes'),
  UNIQUE(booking_id, driver_id)
);

-- Add insurance and fee columns to bookings
ALTER TABLE public.bookings 
ADD COLUMN insurance_opt_in BOOLEAN DEFAULT false,
ADD COLUMN insurance_fee NUMERIC DEFAULT 0,
ADD COLUMN platform_fee NUMERIC DEFAULT 0,
ADD COLUMN base_fare NUMERIC DEFAULT 0,
ADD COLUMN accepted_bid_id UUID REFERENCES public.driver_bids(id);

-- Enable RLS on driver_bids
ALTER TABLE public.driver_bids ENABLE ROW LEVEL SECURITY;

-- RLS Policies for driver_bids
CREATE POLICY "Users can view bids on their bookings"
ON public.driver_bids FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.bookings 
  WHERE bookings.id = driver_bids.booking_id 
  AND bookings.user_id = auth.uid()
));

CREATE POLICY "Drivers can insert bids"
ON public.driver_bids FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.drivers 
  WHERE drivers.id = driver_bids.driver_id 
  AND drivers.user_id = auth.uid()
  AND drivers.status = 'approved'
  AND drivers.is_online = true
));

CREATE POLICY "Drivers can update own bids"
ON public.driver_bids FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.drivers 
  WHERE drivers.id = driver_bids.driver_id 
  AND drivers.user_id = auth.uid()
));

CREATE POLICY "Drivers can view pending booking bids"
ON public.driver_bids FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.bookings b
  JOIN public.drivers d ON d.user_id = auth.uid()
  WHERE b.id = driver_bids.booking_id 
  AND b.status = 'pending'
  AND d.status = 'approved'
));

-- Function to update lowest bid flag
CREATE OR REPLACE FUNCTION public.update_lowest_bid()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  min_bid_id UUID;
BEGIN
  -- Reset all is_lowest flags for this booking
  UPDATE public.driver_bids 
  SET is_lowest = false 
  WHERE booking_id = COALESCE(NEW.booking_id, OLD.booking_id);
  
  -- Find and set the lowest bid
  SELECT id INTO min_bid_id
  FROM public.driver_bids
  WHERE booking_id = COALESCE(NEW.booking_id, OLD.booking_id)
    AND status = 'pending'
  ORDER BY bid_amount ASC
  LIMIT 1;
  
  IF min_bid_id IS NOT NULL THEN
    UPDATE public.driver_bids 
    SET is_lowest = true 
    WHERE id = min_bid_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger to auto-update lowest bid
CREATE TRIGGER on_bid_change
AFTER INSERT OR UPDATE OR DELETE ON public.driver_bids
FOR EACH ROW
EXECUTE FUNCTION public.update_lowest_bid();

-- Function to calculate insurance fee (₹1 to ₹15 based on distance)
CREATE OR REPLACE FUNCTION public.calculate_insurance_fee(distance_km NUMERIC)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  -- Formula: Math.min(15, Math.max(1, distance * 0.5))
  RETURN LEAST(15, GREATEST(1, distance_km * 0.5));
END;
$$;

-- Enable realtime for driver_bids
ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_bids;