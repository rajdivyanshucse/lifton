import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Bike, Car, Truck, Package, Home, MapPin, CreditCard, Wallet, Banknote, Baby, Heart, Clock, MessageSquare } from 'lucide-react';
import { LocationAutocomplete } from '@/components/location/LocationAutocomplete';
import { CompetitorPriceComparison } from '@/components/pricing/CompetitorPriceComparison';
import { InsuranceToggle } from '@/components/bidding/InsuranceToggle';
import { DriverBidsList } from '@/components/bidding/DriverBidsList';
import { UserPriceOffer } from '@/components/bargaining/UserPriceOffer';
import { calculateDistance, estimateTravelTime } from '@/hooks/useLocationSearch';
import type { Database } from '@/integrations/supabase/types';

type ServiceType = Database['public']['Enums']['service_type'];
type PaymentMode = Database['public']['Enums']['payment_mode'];

interface BookingFormProps {
  defaultService?: string;
  onSuccess?: () => void;
}

const services: { id: ServiceType; icon: React.ElementType; name: string }[] = [
  { id: 'bike_taxi', icon: Bike, name: 'Bike Taxi' },
  { id: 'auto_rickshaw', icon: Car, name: 'Auto Rickshaw' },
  { id: 'cab', icon: Car, name: 'Cab' },
  { id: 'parcel_delivery', icon: Package, name: 'Parcel Delivery' },
  { id: 'heavy_goods', icon: Truck, name: 'Heavy Goods' },
  { id: 'packers_movers', icon: Home, name: 'Packers & Movers' },
  { id: 'intercity_goods', icon: MapPin, name: 'Intercity Goods' },
];

const paymentModes: { id: PaymentMode; icon: React.ElementType; name: string }[] = [
  { id: 'cash', icon: Banknote, name: 'Cash' },
  { id: 'online', icon: CreditCard, name: 'Online Payment' },
  { id: 'wallet', icon: Wallet, name: 'Wallet' },
];

interface LocationData {
  address: string;
  lat?: number;
  lng?: number;
}

export const BookingForm = ({ defaultService, onSuccess }: BookingFormProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [serviceType, setServiceType] = useState<ServiceType>(
    (defaultService as ServiceType) || 'cab'
  );
  const [pickup, setPickup] = useState<LocationData>({ address: '' });
  const [drop, setDrop] = useState<LocationData>({ address: '' });
  const [notes, setNotes] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash');
  const [estimatedFare, setEstimatedFare] = useState<number | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [eta, setEta] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [pricing, setPricing] = useState<{
    service_type: string;
    base_fare: number;
    per_km_rate: number;
    minimum_fare: number;
  }[]>([]);
  const [specialService, setSpecialService] = useState<'standard' | 'kids' | 'senior'>('standard');
  const [insuranceEnabled, setInsuranceEnabled] = useState(false);
  const [insuranceFee, setInsuranceFee] = useState(0);
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null);
  const [showBidding, setShowBidding] = useState(false);
  const [userOfferedPrice, setUserOfferedPrice] = useState<number | null>(null);
  const [showPriceOffer, setShowPriceOffer] = useState(false);

  useEffect(() => {
    fetchPricing();
  }, []);

  useEffect(() => {
    if (pickup.lat && pickup.lng && drop.lat && drop.lng && pricing.length > 0) {
      calculateFare();
    }
  }, [pickup, drop, serviceType, pricing]);

  const fetchPricing = async () => {
    const { data } = await supabase.from('service_pricing').select('*');
    setPricing(data || []);
  };

  const calculateFare = () => {
    if (!pickup.lat || !pickup.lng || !drop.lat || !drop.lng) return;

    const calculatedDistance = calculateDistance(
      pickup.lat,
      pickup.lng,
      drop.lat,
      drop.lng
    );
    
    // Add 20% for road distance approximation
    const roadDistance = calculatedDistance * 1.2;
    setDistance(Math.round(roadDistance * 10) / 10);
    
    // Calculate ETA
    const travelTime = estimateTravelTime(roadDistance, serviceType);
    setEta(travelTime);

    const servicePricing = pricing.find(p => p.service_type === serviceType);
    if (servicePricing) {
      let fare = Math.max(
        servicePricing.minimum_fare,
        servicePricing.base_fare + (roadDistance * servicePricing.per_km_rate)
      );
      
      // Add premium for special services
      if (specialService === 'kids') fare *= 1.15;
      if (specialService === 'senior') fare *= 1.1;
      
      setEstimatedFare(Math.round(fare));
    }
  };

  const handleInsuranceToggle = (enabled: boolean, fee: number) => {
    setInsuranceEnabled(enabled);
    setInsuranceFee(fee);
  };

  const handleSubmit = async (e: React.FormEvent, offeredPrice?: number) => {
    e.preventDefault();
    if (!user || !estimatedFare) return;

    // If no price offered yet and user wants to bargain, show offer UI
    if (!offeredPrice && !userOfferedPrice && !showPriceOffer) {
      setShowPriceOffer(true);
      return;
    }

    const finalOfferedPrice = offeredPrice || userOfferedPrice || estimatedFare;

    setLoading(true);
    try {
      // Calculate insurance fee server-side: Math.min(15, Math.max(1, distance * 0.5))
      const calculatedInsuranceFee = insuranceEnabled && distance 
        ? Math.min(15, Math.max(1, Math.round(distance * 0.5)))
        : 0;

      const { data: booking, error } = await supabase.from('bookings').insert({
        user_id: user.id,
        service_type: serviceType,
        pickup_address: pickup.address,
        pickup_lat: pickup.lat || null,
        pickup_lng: pickup.lng || null,
        drop_address: drop.address,
        drop_lat: drop.lat || null,
        drop_lng: drop.lng || null,
        distance_km: distance,
        estimated_fare: finalOfferedPrice,
        base_fare: estimatedFare,
        insurance_opt_in: insuranceEnabled,
        insurance_fee: calculatedInsuranceFee,
        platform_fee: Math.round(estimatedFare * 0.05), // 5% platform fee
        payment_mode: paymentMode,
        notes: notes || null,
        status: 'pending',
      }).select().single();

      if (error) throw error;

      // Create special service details if applicable
      if (specialService !== 'standard' && booking) {
        // This will be handled by SpecialServicesForm modal
      }

      toast({
        title: 'Booking Created!',
        description: 'Drivers are now bidding on your ride...',
      });

      // Show bidding UI
      setActiveBookingId(booking.id);
      setShowBidding(true);
      
      onSuccess?.();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      toast({
        title: 'Booking Failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBidAccepted = () => {
    setShowBidding(false);
    setActiveBookingId(null);
    setPickup({ address: '' });
    setDrop({ address: '' });
    setNotes('');
    setEstimatedFare(null);
    setDistance(null);
    setEta(null);
    setInsuranceEnabled(false);
    setInsuranceFee(0);
    setUserOfferedPrice(null);
    setShowPriceOffer(false);
    
    toast({
      title: 'Driver Confirmed!',
      description: 'Your driver is on the way.',
    });
  };

  const handlePriceOfferSubmit = (price: number) => {
    setUserOfferedPrice(price);
    setShowPriceOffer(false);
  };

  const handlePriceOfferSkip = () => {
    setUserOfferedPrice(estimatedFare);
    setShowPriceOffer(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle className="font-display">Book a Ride</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Service Selection */}
            <div>
              <Label className="mb-3 block">Select Service</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {services.map((service) => {
                  const IconComponent = service.icon;
                  return (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => setServiceType(service.id)}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        serviceType === service.id
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <IconComponent className={`w-6 h-6 mx-auto mb-2 ${
                        serviceType === service.id ? 'text-primary' : 'text-muted-foreground'
                      }`} />
                      <div className={`text-sm font-medium ${
                        serviceType === service.id ? 'text-primary' : ''
                      }`}>
                        {service.name}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Special Service Toggle */}
            <div>
              <Label className="mb-3 block">Service Type</Label>
              <Tabs value={specialService} onValueChange={(v) => setSpecialService(v as typeof specialService)}>
                <TabsList className="grid grid-cols-3">
                  <TabsTrigger value="standard">Standard</TabsTrigger>
                  <TabsTrigger value="kids" className="flex items-center gap-1">
                    <Baby className="w-4 h-4" />
                    Kids
                  </TabsTrigger>
                  <TabsTrigger value="senior" className="flex items-center gap-1">
                    <Heart className="w-4 h-4" />
                    Senior
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="kids" className="mt-3">
                  <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 text-sm">
                    <p className="font-medium text-blue-400">Kids Safe Pickup</p>
                    <p className="text-muted-foreground text-xs mt-1">
                      Verified drivers, OTP verification, live tracking, guardian alerts
                    </p>
                  </div>
                </TabsContent>
                <TabsContent value="senior" className="mt-3">
                  <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/30 text-sm">
                    <p className="font-medium text-purple-400">Senior Care Service</p>
                    <p className="text-muted-foreground text-xs mt-1">
                      Assisted transport, doorstep pickup, patient drivers
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Pickup & Drop with Autocomplete */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="pickup">Pickup Location</Label>
                <LocationAutocomplete
                  id="pickup"
                  value={pickup.address}
                  onChange={(address, lat, lng) => setPickup({ address, lat, lng })}
                  placeholder="Enter pickup address"
                />
              </div>
              <div>
                <Label htmlFor="drop">Drop Location</Label>
                <LocationAutocomplete
                  id="drop"
                  value={drop.address}
                  onChange={(address, lat, lng) => setDrop({ address, lat, lng })}
                  placeholder="Enter drop address"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="notes">Additional Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Any special instructions..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>

            {/* Payment Mode */}
            <div>
              <Label className="mb-3 block">Payment Mode</Label>
              <div className="flex gap-3">
                {paymentModes.map((mode) => {
                  const IconComponent = mode.icon;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setPaymentMode(mode.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                        paymentMode === mode.id
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <IconComponent className="w-4 h-4" />
                      {mode.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Fare Estimate */}
            {estimatedFare && distance && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 rounded-xl bg-primary/10 border border-primary/20"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-sm text-muted-foreground">Estimated Distance</div>
                    <div className="font-semibold">{distance} km</div>
                  </div>
                  {eta && (
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        ETA
                      </div>
                      <div className="font-semibold">{eta} min</div>
                    </div>
                  )}
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Estimated Fare</div>
                    <div className="font-display text-2xl font-bold text-primary">₹{estimatedFare}</div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Insurance Toggle */}
            {distance && distance > 0 && (
              <InsuranceToggle
                distanceKm={distance}
                enabled={insuranceEnabled}
                onToggle={handleInsuranceToggle}
              />
            )}

            {/* Competitor Price Comparison */}
            {estimatedFare && distance && (
              <CompetitorPriceComparison
                serviceType={serviceType}
                distanceKm={distance}
                ourFare={estimatedFare + insuranceFee}
              />
            )}

            {/* User Price Offer Section */}
            {showPriceOffer && estimatedFare && !showBidding && (
              <UserPriceOffer
                estimatedFare={estimatedFare}
                onOfferSubmit={handlePriceOfferSubmit}
                onSkip={handlePriceOfferSkip}
              />
            )}

            {/* Show offered price if set */}
            {userOfferedPrice && !showPriceOffer && !showBidding && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 rounded-xl bg-success/10 border border-success/20"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-success" />
                    <span className="font-medium text-success">Your Offered Price</span>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-2xl font-bold text-success">₹{userOfferedPrice}</div>
                    {userOfferedPrice < (estimatedFare || 0) && (
                      <div className="text-xs text-success">
                        Save ₹{(estimatedFare || 0) - userOfferedPrice}
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 text-muted-foreground"
                  onClick={() => {
                    setShowPriceOffer(true);
                    setUserOfferedPrice(null);
                  }}
                >
                  Change Offer
                </Button>
              </motion.div>
            )}

            <Button 
              type="submit" 
              className="w-full" 
              size="lg" 
              disabled={loading || !estimatedFare || showPriceOffer}
              onClick={(e) => {
                if (userOfferedPrice) {
                  handleSubmit(e as unknown as React.FormEvent, userOfferedPrice);
                }
              }}
            >
              {loading ? 'Finding Drivers...' : userOfferedPrice 
                ? `Confirm Booking • ₹${userOfferedPrice + insuranceFee}` 
                : `Set Your Price${insuranceEnabled ? ` • ₹${estimatedFare + insuranceFee}` : ''}`
              }
            </Button>
          </form>

          {/* Driver Bidding Section */}
          {showBidding && activeBookingId && (
            <div className="mt-6">
              <DriverBidsList
                bookingId={activeBookingId}
                estimatedFare={userOfferedPrice || estimatedFare || 0}
                insuranceFee={insuranceFee}
                onBidAccepted={handleBidAccepted}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};
