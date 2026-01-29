import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, TrendingDown, Check, X, Clock, Loader2 } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type BargainStatus = Database['public']['Enums']['bargain_status'];

interface PriceBargainingProps {
  bookingId: string;
  userId: string;
  originalFare: number;
  onFareConfirmed: (finalFare: number) => void;
  isDriver?: boolean;
  driverId?: string;
}

interface Bargain {
  id: string;
  user_offer: number | null;
  driver_counter: number | null;
  final_fare: number | null;
  status: BargainStatus;
  expires_at: string;
}

export const PriceBargaining = ({
  bookingId,
  userId,
  originalFare,
  onFareConfirmed,
  isDriver = false,
  driverId,
}: PriceBargainingProps) => {
  const { toast } = useToast();
  const [bargain, setBargain] = useState<Bargain | null>(null);
  const [offerAmount, setOfferAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    fetchBargain();
    
    // Subscribe to bargain updates
    const channel = supabase
      .channel(`bargain-${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'booking_bargains',
          filter: `booking_id=eq.${bookingId}`,
        },
        (payload) => {
          const newBargain = payload.new as Bargain;
          setBargain(newBargain);
          
          if (newBargain.status === 'accepted' && newBargain.final_fare) {
            onFareConfirmed(newBargain.final_fare);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bookingId]);

  // Countdown timer
  useEffect(() => {
    if (!bargain?.expires_at) return;
    
    const interval = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.floor((new Date(bargain.expires_at).getTime() - Date.now()) / 1000)
      );
      setTimeLeft(remaining);
      
      if (remaining === 0 && bargain.status === 'pending') {
        // Auto-expire
        updateBargainStatus('expired');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [bargain?.expires_at]);

  const fetchBargain = async () => {
    const { data } = await supabase
      .from('booking_bargains')
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setBargain(data);
    }
  };

  const submitOffer = async () => {
    const amount = parseFloat(offerAmount);
    if (isNaN(amount) || amount <= 0) return;

    setLoading(true);
    try {
      if (bargain) {
        // Update existing bargain
        const updates: Record<string, unknown> = isDriver
          ? { driver_counter: amount, status: 'countered' }
          : { user_offer: amount, status: 'pending' };

        const { error } = await supabase
          .from('booking_bargains')
          .update(updates)
          .eq('id', bargain.id);

        if (error) throw error;
      } else {
        // Create new bargain
        const { error } = await supabase.from('booking_bargains').insert({
          booking_id: bookingId,
          user_id: userId,
          driver_id: driverId,
          original_fare: originalFare,
          user_offer: isDriver ? null : amount,
          driver_counter: isDriver ? amount : null,
          status: 'pending',
        });

        if (error) throw error;
      }

      setOfferAmount('');
      toast({
        title: 'Offer Sent!',
        description: 'Waiting for response...',
      });
    } catch (error: any) {
      toast({
        title: 'Failed to send offer',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateBargainStatus = async (status: BargainStatus, finalFare?: number) => {
    if (!bargain) return;

    setLoading(true);
    try {
      const updates: Record<string, unknown> = { status };
      if (finalFare) updates.final_fare = finalFare;

      const { error } = await supabase
        .from('booking_bargains')
        .update(updates)
        .eq('id', bargain.id);

      if (error) throw error;

      if (status === 'accepted' && finalFare) {
        onFareConfirmed(finalFare);
        toast({ title: 'Price Confirmed!', description: `Final fare: ₹${finalFare}` });
      }
    } catch (error: any) {
      toast({
        title: 'Action failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const acceptOffer = () => {
    const fare = isDriver ? bargain?.user_offer : bargain?.driver_counter;
    if (fare) {
      updateBargainStatus('accepted', fare);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusBadge = () => {
    if (!bargain) return null;

    const statusConfig: Record<BargainStatus, { color: string; text: string }> = {
      pending: { color: 'bg-yellow-500/20 text-yellow-400', text: 'Negotiating' },
      countered: { color: 'bg-blue-500/20 text-blue-400', text: 'Counter Offer' },
      accepted: { color: 'bg-green-500/20 text-green-400', text: 'Accepted' },
      rejected: { color: 'bg-red-500/20 text-red-400', text: 'Rejected' },
      expired: { color: 'bg-muted text-muted-foreground', text: 'Expired' },
    };

    const config = statusConfig[bargain.status];
    return (
      <Badge className={config.color}>
        {config.text}
      </Badge>
    );
  };

  const isCompleted = bargain?.status === 'accepted' || bargain?.status === 'rejected' || bargain?.status === 'expired';

  return (
    <Card className="bg-card/50 backdrop-blur border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Price Bargaining
          </CardTitle>
          <div className="flex items-center gap-2">
            {!isCompleted && timeLeft > 0 && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span className={timeLeft < 60 ? 'text-red-400' : ''}>
                  {formatTime(timeLeft)}
                </span>
              </div>
            )}
            {getStatusBadge()}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Original fare */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Original Fare</span>
          <span className="font-semibold">₹{originalFare}</span>
        </div>

        {/* Bargain history */}
        <AnimatePresence>
          {bargain && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2"
            >
              {bargain.user_offer && (
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                  <span className="text-sm text-muted-foreground">User Offer</span>
                  <span className="font-medium text-primary">₹{bargain.user_offer}</span>
                </div>
              )}
              {bargain.driver_counter && (
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                  <span className="text-sm text-muted-foreground">Driver Counter</span>
                  <span className="font-medium text-blue-400">₹{bargain.driver_counter}</span>
                </div>
              )}
              {bargain.final_fare && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                  <span className="text-sm font-medium text-green-400">Final Price</span>
                  <span className="text-lg font-bold text-green-400">₹{bargain.final_fare}</span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions */}
        {!isCompleted && (
          <>
            {/* Accept/Reject buttons for counter offers */}
            {((!isDriver && bargain?.driver_counter) || (isDriver && bargain?.user_offer)) && (
              <div className="flex gap-2">
                <Button
                  variant="default"
                  className="flex-1"
                  onClick={acceptOffer}
                  disabled={loading}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                  Accept
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => updateBargainStatus('rejected')}
                  disabled={loading}
                >
                  <X className="w-4 h-4 mr-2" />
                  Reject
                </Button>
              </div>
            )}

            {/* Make offer input */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                <Input
                  type="number"
                  value={offerAmount}
                  onChange={(e) => setOfferAmount(e.target.value)}
                  placeholder={isDriver ? 'Counter offer' : 'Your offer'}
                  className="pl-8"
                  min={1}
                />
              </div>
              <Button onClick={submitOffer} disabled={loading || !offerAmount}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingDown className="w-4 h-4 mr-2" />}
                {isDriver ? 'Counter' : 'Offer'}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              💡 Tip: Offer a fair price for faster acceptance
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
};
