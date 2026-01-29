-- Add new enums for special services
CREATE TYPE public.special_service_type AS ENUM ('kids_pickup', 'senior_citizen', 'standard');
CREATE TYPE public.bargain_status AS ENUM ('pending', 'countered', 'accepted', 'rejected', 'expired');
CREATE TYPE public.notification_type AS ENUM ('booking_update', 'driver_arrival', 'promotion', 'safety_alert', 'payment');

-- Add wallet and payment tables
CREATE TABLE public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  balance NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID REFERENCES public.wallets(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC NOT NULL,
  transaction_type TEXT NOT NULL, -- 'credit' | 'debit' | 'refund'
  description TEXT,
  reference_id TEXT, -- payment gateway reference
  payment_gateway TEXT, -- 'stripe' | 'razorpay'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'completed' | 'failed'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bargaining table for price negotiation
CREATE TABLE public.booking_bargains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE CASCADE,
  original_fare NUMERIC NOT NULL,
  user_offer NUMERIC,
  driver_counter NUMERIC,
  final_fare NUMERIC,
  status bargain_status NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '5 minutes'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Guardian contacts for special services
CREATE TABLE public.guardian_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  relationship TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Special service bookings extension
CREATE TABLE public.special_service_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL UNIQUE,
  service_type special_service_type NOT NULL,
  passenger_name TEXT NOT NULL,
  passenger_age INTEGER,
  passenger_phone TEXT,
  guardian_contact_id UUID REFERENCES public.guardian_contacts(id),
  special_instructions TEXT,
  otp_verified BOOLEAN NOT NULL DEFAULT false,
  pickup_otp TEXT,
  drop_otp TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Driver location history for tracking
CREATE TABLE public.driver_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID REFERENCES public.drivers(id) ON DELETE CASCADE NOT NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  heading NUMERIC,
  speed NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Competitor pricing cache
CREATE TABLE public.competitor_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type service_type NOT NULL,
  competitor_name TEXT NOT NULL,
  base_fare NUMERIC NOT NULL,
  per_km_rate NUMERIC NOT NULL,
  surge_multiplier NUMERIC NOT NULL DEFAULT 1.0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_bargains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guardian_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.special_service_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitor_prices ENABLE ROW LEVEL SECURITY;

-- Wallet policies
CREATE POLICY "Users can view own wallet" ON public.wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own wallet" ON public.wallets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own wallet" ON public.wallets FOR UPDATE USING (auth.uid() = user_id);

-- Wallet transactions policies
CREATE POLICY "Users can view own transactions" ON public.wallet_transactions FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.wallets WHERE wallets.id = wallet_transactions.wallet_id AND wallets.user_id = auth.uid()));
CREATE POLICY "Users can insert own transactions" ON public.wallet_transactions FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM public.wallets WHERE wallets.id = wallet_transactions.wallet_id AND wallets.user_id = auth.uid()));

-- Bargaining policies
CREATE POLICY "Users can view own bargains" ON public.booking_bargains FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert bargains" ON public.booking_bargains FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own bargains" ON public.booking_bargains FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Drivers can view assigned bargains" ON public.booking_bargains FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.drivers WHERE drivers.user_id = auth.uid() AND drivers.id = booking_bargains.driver_id));
CREATE POLICY "Drivers can update assigned bargains" ON public.booking_bargains FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM public.drivers WHERE drivers.user_id = auth.uid() AND drivers.id = booking_bargains.driver_id));
CREATE POLICY "Admins can manage all bargains" ON public.booking_bargains FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Notification policies
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can insert notifications" ON public.notifications FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

-- Guardian contacts policies
CREATE POLICY "Users can manage own guardians" ON public.guardian_contacts FOR ALL USING (auth.uid() = user_id);

-- Special service details policies
CREATE POLICY "Users can view own special bookings" ON public.special_service_details FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.bookings WHERE bookings.id = special_service_details.booking_id AND bookings.user_id = auth.uid()));
CREATE POLICY "Users can insert special bookings" ON public.special_service_details FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM public.bookings WHERE bookings.id = special_service_details.booking_id AND bookings.user_id = auth.uid()));
CREATE POLICY "Drivers can view assigned special bookings" ON public.special_service_details FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.bookings b JOIN public.drivers d ON b.driver_id = d.id WHERE b.id = special_service_details.booking_id AND d.user_id = auth.uid()));
CREATE POLICY "Drivers can update assigned special bookings" ON public.special_service_details FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM public.bookings b JOIN public.drivers d ON b.driver_id = d.id WHERE b.id = special_service_details.booking_id AND d.user_id = auth.uid()));

-- Driver location policies
CREATE POLICY "Drivers can insert own location" ON public.driver_locations FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM public.drivers WHERE drivers.id = driver_locations.driver_id AND drivers.user_id = auth.uid()));
CREATE POLICY "Users can view driver location for their booking" ON public.driver_locations FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.bookings WHERE bookings.id = driver_locations.booking_id AND bookings.user_id = auth.uid()));
CREATE POLICY "Drivers can view own locations" ON public.driver_locations FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.drivers WHERE drivers.id = driver_locations.driver_id AND drivers.user_id = auth.uid()));

-- Competitor prices - public read
CREATE POLICY "Anyone can view competitor prices" ON public.competitor_prices FOR SELECT USING (true);
CREATE POLICY "Admins can manage competitor prices" ON public.competitor_prices FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Add triggers for updated_at
CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON public.wallets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_booking_bargains_updated_at BEFORE UPDATE ON public.booking_bargains FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for location tracking and bargaining
ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_locations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.booking_bargains;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Insert default competitor pricing data
INSERT INTO public.competitor_prices (service_type, competitor_name, base_fare, per_km_rate, surge_multiplier) VALUES
  ('bike_taxi', 'Rapido', 15, 8, 1.0),
  ('bike_taxi', 'Ola Bike', 20, 9, 1.0),
  ('auto_rickshaw', 'Rapido Auto', 25, 12, 1.0),
  ('auto_rickshaw', 'Ola Auto', 30, 13, 1.0),
  ('cab', 'Uber Go', 50, 14, 1.0),
  ('cab', 'Ola Mini', 55, 15, 1.0),
  ('parcel_delivery', 'Porter', 40, 10, 1.0),
  ('parcel_delivery', 'Dunzo', 35, 12, 1.0),
  ('heavy_goods', 'Porter Truck', 200, 25, 1.0),
  ('heavy_goods', 'Lalamove', 180, 22, 1.0),
  ('packers_movers', 'Porter Packers', 500, 30, 1.0),
  ('intercity_goods', 'Porter Intercity', 300, 20, 1.0);