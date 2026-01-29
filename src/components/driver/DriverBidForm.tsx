import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MapPin, Clock, TrendingDown, Send, Check, MessageSquare } from 'lucide-react';

interface Booking {
  id: string;
  pickup_address: string;
  drop_address: string;
  distance_km: number;
  estimated_fare: number;
  base_fare?: number;
  service_type: string;
  created_at: string;
  insurance_opt_in?: boolean;
}

interface DriverBidFormProps {
  booking: Booking;
  driverId: string;
  onBidSubmitted: () => void;
}

export const DriverBidForm = ({ booking, driverId, onBidSubmitted }: DriverBidFormProps) => {
  const { toast } = useToast();
  const [bidAmount, setBidAmount] = useState(booking.estimated_fare);
  const [submitting, setSubmitting] = useState(false);

  // Check if user has offered a price different from base
  const userOfferedPrice = booking.estimated_fare;
  const originalEstimate = booking.base_fare || booking.estimated_fare;
  const hasUserOffer = userOfferedPrice < originalEstimate;

  // Calculate suggested bid range
  const minBid = Math.round(originalEstimate * 0.7);
  const maxBid = Math.round(originalEstimate * 1.1);

  const handleSubmit = async () => {
    if (bidAmount < minBid) {
      toast({
        title: 'Bid too low',
        description: `Minimum bid is ₹${minBid}`,
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('driver_bids').insert({
        booking_id: booking.id,
        driver_id: driverId,
        bid_amount: bidAmount,
        status: 'pending',
      });

      if (error) {
        if (error.code === '23505') {
          toast({
            title: 'Already Bid',
            description: 'You have already placed a bid on this booking',
            variant: 'destructive',
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: 'Bid Submitted!',
          description: `Your bid of ₹${bidAmount} has been sent`,
        });
        onBidSubmitted();
      }
    } catch (error) {
      console.error('Error submitting bid:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit bid. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getTimeSince = (dateString: string) => {
    const diff = Date.now() - new Date(dateString).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    return `${Math.floor(minutes / 60)}h ago`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="dashboard-card border-primary/30">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {booking.service_type.replace(/_/g, ' ')}
              </Badge>
              {booking.insurance_opt_in && (
                <Badge className="bg-success/20 text-success text-xs">
                  Insured
                </Badge>
              )}
              {hasUserOffer && (
                <Badge className="bg-primary/20 text-primary text-xs">
                  <MessageSquare className="w-3 h-3 mr-1" />
                  User Offer
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              {getTimeSince(booking.created_at)}
            </div>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 mt-1.5 rounded-full bg-success" />
              <span className="text-sm flex-1 line-clamp-1">{booking.pickup_address}</span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 mt-1.5 rounded-full bg-destructive" />
              <span className="text-sm flex-1 line-clamp-1">{booking.drop_address}</span>
            </div>
          </div>

          {/* User Offer Highlight */}
          {hasUserOffer && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-4 p-3 rounded-lg bg-primary/10 border border-primary/30"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">User Offered</div>
                  <div className="font-display text-xl font-bold text-primary">₹{userOfferedPrice}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Original</div>
                  <div className="text-sm line-through text-muted-foreground">₹{originalEstimate}</div>
                </div>
              </div>
              <Button
                onClick={() => {
                  setBidAmount(userOfferedPrice);
                  handleSubmit();
                }}
                disabled={submitting}
                className="w-full mt-3"
                variant="default"
              >
                <Check className="w-4 h-4 mr-2" />
                Accept User Price ₹{userOfferedPrice}
              </Button>
            </motion.div>
          )}

          <div className="flex items-center justify-between mb-4 p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {booking.distance_km} km
              </div>
              <div className="text-muted-foreground">
                {hasUserOffer ? 'Base' : 'Est'}: ₹{originalEstimate}
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              Range: ₹{minBid} - ₹{maxBid}
            </div>
          </div>

          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Label htmlFor={`bid-${booking.id}`} className="text-xs text-muted-foreground">
                {hasUserOffer ? 'Counter Offer' : 'Your Bid'}
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                <Input
                  id={`bid-${booking.id}`}
                  type="number"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(Number(e.target.value))}
                  className="pl-7 font-display text-lg"
                  min={minBid}
                  max={maxBid}
                />
              </div>
            </div>
            <Button 
              onClick={handleSubmit} 
              disabled={submitting}
              className="gap-1"
            >
              <Send className="w-4 h-4" />
              {submitting ? 'Sending...' : hasUserOffer ? 'Counter' : 'Bid'}
            </Button>
          </div>

          {bidAmount < originalEstimate && (
            <div className="mt-2 flex items-center gap-1 text-xs text-success">
              <TrendingDown className="w-3 h-3" />
              {Math.round(((originalEstimate - bidAmount) / originalEstimate) * 100)}% below estimate
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};
