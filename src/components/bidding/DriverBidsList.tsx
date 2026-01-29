import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { TrendingDown, User, Star, Clock, Shield } from 'lucide-react';

interface DriverBid {
  id: string;
  booking_id: string;
  driver_id: string;
  bid_amount: number;
  is_lowest: boolean;
  status: string;
  created_at: string;
  expires_at: string;
}

interface DriverBidsListProps {
  bookingId: string;
  estimatedFare: number;
  insuranceFee: number;
  onBidAccepted: (bidId: string, driverId: string, amount: number) => void;
}

export const DriverBidsList = ({ 
  bookingId, 
  estimatedFare, 
  insuranceFee,
  onBidAccepted 
}: DriverBidsListProps) => {
  const { toast } = useToast();
  const [bids, setBids] = useState<DriverBid[]>([]);
  const [loading, setLoading] = useState(true);
  const [acceptingBid, setAcceptingBid] = useState<string | null>(null);

  useEffect(() => {
    fetchBids();
    
    // Real-time subscription for driver bids
    const channel = supabase
      .channel(`driver-bids-${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'driver_bids',
          filter: `booking_id=eq.${bookingId}`,
        },
        () => {
          fetchBids();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bookingId]);

  const fetchBids = async () => {
    const { data, error } = await supabase
      .from('driver_bids')
      .select('*')
      .eq('booking_id', bookingId)
      .eq('status', 'pending')
      .order('bid_amount', { ascending: true });

    if (error) {
      console.error('Error fetching bids:', error);
    } else {
      setBids(data || []);
    }
    setLoading(false);
  };

  const handleAcceptBid = async (bid: DriverBid) => {
    setAcceptingBid(bid.id);
    
    try {
      // Update bid status to accepted
      const { error: bidError } = await supabase
        .from('driver_bids')
        .update({ status: 'accepted' })
        .eq('id', bid.id);

      if (bidError) throw bidError;

      // Reject all other bids for this booking
      await supabase
        .from('driver_bids')
        .update({ status: 'rejected' })
        .eq('booking_id', bookingId)
        .neq('id', bid.id);

      // Update booking with accepted bid and driver
      const totalFare = bid.bid_amount + insuranceFee;
      const { error: bookingError } = await supabase
        .from('bookings')
        .update({
          status: 'accepted',
          driver_id: bid.driver_id,
          accepted_bid_id: bid.id,
          final_fare: totalFare,
          base_fare: bid.bid_amount,
          accepted_at: new Date().toISOString(),
        })
        .eq('id', bookingId);

      if (bookingError) throw bookingError;

      toast({
        title: 'Bid Accepted!',
        description: `Driver confirmed at ₹${bid.bid_amount}`,
      });

      onBidAccepted(bid.id, bid.driver_id, bid.bid_amount);
    } catch (error) {
      console.error('Error accepting bid:', error);
      toast({
        title: 'Error',
        description: 'Failed to accept bid. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setAcceptingBid(null);
    }
  };

  const getTimeRemaining = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return 'Expired';
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getSavingsPercent = (bidAmount: number) => {
    if (bidAmount >= estimatedFare) return 0;
    return Math.round(((estimatedFare - bidAmount) / estimatedFare) * 100);
  };

  if (loading) {
    return (
      <Card className="dashboard-card animate-pulse">
        <CardContent className="p-6">
          <div className="h-20 bg-muted rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="dashboard-card border-primary/30">
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-lg flex items-center gap-2">
          <TrendingDown className="w-5 h-5 text-green-500" />
          Driver Bids ({bids.length})
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Drivers are competing to offer you the best price
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <AnimatePresence mode="popLayout">
          {bids.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8 text-muted-foreground"
            >
              <div className="animate-pulse mb-2">🔍</div>
              <p>Waiting for drivers to bid...</p>
              <p className="text-xs mt-1">This usually takes 1-2 minutes</p>
            </motion.div>
          ) : (
            bids.map((bid, index) => (
              <motion.div
                key={bid.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: index * 0.1 }}
                className={`p-4 rounded-xl border-2 transition-all ${
                  bid.is_lowest 
                    ? 'border-green-500 bg-green-500/10' 
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      bid.is_lowest ? 'bg-green-500/20' : 'bg-muted'
                    }`}>
                      <User className={`w-5 h-5 ${bid.is_lowest ? 'text-green-500' : 'text-muted-foreground'}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Driver</span>
                        {bid.is_lowest && (
                          <Badge className="bg-green-500/20 text-green-400 text-xs">
                            Lowest Price
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Star className="w-3 h-3 text-yellow-500" />
                        <span>4.8</span>
                        <span>•</span>
                        <Clock className="w-3 h-3" />
                        <span>{getTimeRemaining(bid.expires_at)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-display text-xl font-bold">
                      ₹{bid.bid_amount}
                    </div>
                    {getSavingsPercent(bid.bid_amount) > 0 && (
                      <div className="text-xs text-green-400">
                        Save {getSavingsPercent(bid.bid_amount)}%
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Shield className="w-3 h-3" />
                    Verified Driver
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleAcceptBid(bid)}
                    disabled={acceptingBid !== null}
                    className={bid.is_lowest ? 'bg-green-500 hover:bg-green-600' : ''}
                  >
                    {acceptingBid === bid.id ? 'Accepting...' : 'Accept'}
                  </Button>
                </div>

                {insuranceFee > 0 && (
                  <div className="mt-2 pt-2 border-t border-border text-xs text-muted-foreground">
                    Total with insurance: ₹{bid.bid_amount + insuranceFee}
                  </div>
                )}
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
};
