import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { MapPin, X, Phone, MessageSquare, Navigation } from 'lucide-react';
import { LiveDriverMap } from '@/components/map/LiveDriverMap';
import { PriceBargaining } from '@/components/bargaining/PriceBargaining';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface Booking {
  id: string;
  status: string;
  service_type: string;
  pickup_address: string;
  drop_address: string;
  pickup_lat: number | null;
  pickup_lng: number | null;
  drop_lat: number | null;
  drop_lng: number | null;
  estimated_fare: number;
  final_fare: number | null;
  distance_km: number | null;
  driver_id: string | null;
}

interface ActiveBookingProps {
  booking: Booking;
  onUpdate: () => void;
}

export const ActiveBooking = ({ booking, onUpdate }: ActiveBookingProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showTracking, setShowTracking] = useState(false);
  const [showBargaining, setShowBargaining] = useState(false);
  const [currentFare, setCurrentFare] = useState(booking.final_fare || booking.estimated_fare);

  const handleCancel = async () => {
    const { error } = await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: 'Cancelled by user',
      })
      .eq('id', booking.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Could not cancel booking',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Booking Cancelled',
        description: 'Your booking has been cancelled',
      });
      onUpdate();
    }
  };

  const handleFareConfirmed = async (finalFare: number) => {
    setCurrentFare(finalFare);
    await supabase
      .from('bookings')
      .update({ final_fare: finalFare })
      .eq('id', booking.id);
    onUpdate();
  };

  const getStatusMessage = () => {
    switch (booking.status) {
      case 'pending':
        return 'Looking for drivers...';
      case 'accepted':
        return 'Driver is on the way!';
      case 'in_progress':
        return 'Ride in progress';
      default:
        return booking.status;
    }
  };

  const getStatusColor = () => {
    switch (booking.status) {
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'accepted':
        return 'bg-green-500/20 text-green-400';
      case 'in_progress':
        return 'bg-primary/20 text-primary';
      default:
        return 'bg-muted';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <Card className="dashboard-card border-primary/50">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <Badge className={getStatusColor()}>
                {getStatusMessage()}
              </Badge>
              <div className="mt-2 text-sm text-muted-foreground">
                {booking.service_type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
              </div>
            </div>
            {booking.status === 'pending' && (
              <Button variant="ghost" size="sm" onClick={handleCancel}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          <div className="space-y-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-green-500" />
              </div>
              <div className="flex-1">
                <div className="text-xs text-muted-foreground">Pickup</div>
                <div className="font-medium text-sm">{booking.pickup_address}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-red-500" />
              </div>
              <div className="flex-1">
                <div className="text-xs text-muted-foreground">Drop</div>
                <div className="font-medium text-sm">{booking.drop_address}</div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {booking.distance_km} km
              </div>
            </div>
            <div className="font-display text-xl font-bold text-primary">
              ₹{currentFare}
            </div>
          </div>

          {/* Driver Actions */}
          {booking.status === 'accepted' && (
            <div className="mt-4 pt-4 border-t border-border space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Driver assigned
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    <Phone className="w-4 h-4 mr-1" />
                    Call
                  </Button>
                  <Button size="sm" variant="outline">
                    <MessageSquare className="w-4 h-4 mr-1" />
                    Chat
                  </Button>
                </div>
              </div>

              {/* Live Tracking Toggle */}
              <Collapsible open={showTracking} onOpenChange={setShowTracking}>
                <CollapsibleTrigger asChild>
                  <Button variant="secondary" className="w-full">
                    <Navigation className="w-4 h-4 mr-2" />
                    {showTracking ? 'Hide' : 'Show'} Live Tracking
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4">
                  {booking.pickup_lat && booking.pickup_lng && (
                    <LiveDriverMap
                      bookingId={booking.id}
                      pickupLat={booking.pickup_lat}
                      pickupLng={booking.pickup_lng}
                      dropLat={booking.drop_lat || undefined}
                      dropLng={booking.drop_lng || undefined}
                    />
                  )}
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}

          {/* In Progress - Show Tracking */}
          {booking.status === 'in_progress' && booking.pickup_lat && booking.pickup_lng && (
            <div className="mt-4 pt-4 border-t border-border">
              <LiveDriverMap
                bookingId={booking.id}
                pickupLat={booking.pickup_lat}
                pickupLng={booking.pickup_lng}
                dropLat={booking.drop_lat || undefined}
                dropLng={booking.drop_lng || undefined}
              />
            </div>
          )}

          {/* Price Bargaining for Pending Bookings */}
          {booking.status === 'pending' && user && (
            <Collapsible open={showBargaining} onOpenChange={setShowBargaining}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full mt-4">
                  💰 {showBargaining ? 'Hide' : 'Negotiate'} Price
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4">
                <PriceBargaining
                  bookingId={booking.id}
                  userId={user.id}
                  originalFare={booking.estimated_fare}
                  onFareConfirmed={handleFareConfirmed}
                />
              </CollapsibleContent>
            </Collapsible>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};
