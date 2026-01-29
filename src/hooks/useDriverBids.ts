import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

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

export const useDriverBids = (bookingId: string | null) => {
  const [bids, setBids] = useState<DriverBid[]>([]);
  const [lowestBid, setLowestBid] = useState<DriverBid | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchBids = useCallback(async () => {
    if (!bookingId) return;
    
    setLoading(true);
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
      
      // Find lowest bid using Math.min approach
      if (data && data.length > 0) {
        const minBid = data.reduce((min, bid) => 
          bid.bid_amount < min.bid_amount ? bid : min
        , data[0]);
        setLowestBid(minBid);
      } else {
        setLowestBid(null);
      }
    }
    setLoading(false);
  }, [bookingId]);

  useEffect(() => {
    if (!bookingId) return;

    fetchBids();

    // Real-time subscription
    let channel: RealtimeChannel;
    
    const setupSubscription = () => {
      channel = supabase
        .channel(`bids-${bookingId}`)
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
    };

    setupSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [bookingId, fetchBids]);

  const acceptBid = async (
    bidId: string, 
    driverId: string, 
    insuranceFee: number = 0
  ) => {
    const bid = bids.find(b => b.id === bidId);
    if (!bid || !bookingId) return { success: false, error: 'Bid not found' };

    try {
      // Update bid status to accepted
      const { error: bidError } = await supabase
        .from('driver_bids')
        .update({ status: 'accepted' })
        .eq('id', bidId);

      if (bidError) throw bidError;

      // Reject all other bids
      await supabase
        .from('driver_bids')
        .update({ status: 'rejected' })
        .eq('booking_id', bookingId)
        .neq('id', bidId);

      // Calculate total fare with insurance (server-side validation)
      const totalFare = bid.bid_amount + insuranceFee;

      // Update booking with accepted bid
      const { error: bookingError } = await supabase
        .from('bookings')
        .update({
          status: 'accepted',
          driver_id: driverId,
          accepted_bid_id: bidId,
          final_fare: totalFare,
          base_fare: bid.bid_amount,
          insurance_fee: insuranceFee,
          accepted_at: new Date().toISOString(),
        })
        .eq('id', bookingId);

      if (bookingError) throw bookingError;

      return { success: true, totalFare };
    } catch (error) {
      console.error('Error accepting bid:', error);
      return { success: false, error: 'Failed to accept bid' };
    }
  };

  return {
    bids,
    lowestBid,
    loading,
    fetchBids,
    acceptBid,
    bidCount: bids.length,
  };
};
