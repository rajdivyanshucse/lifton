import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Crown, Bike, Car, Truck, Clock, Check, Infinity } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type ServiceType = Database['public']['Enums']['service_type'];

interface DriverPremiumPlansProps {
  driverId: string;
  vehicleType: ServiceType;
  onSubscribed?: () => void;
}

interface PremiumPlan {
  id: string;
  name: string;
  price: number;
  vehicleType: ServiceType;
  icon: React.ReactNode;
  features: string[];
  planType: 'bike_premium' | 'auto_premium' | 'cab_premium';
}

const premiumPlans: PremiumPlan[] = [
  {
    id: 'bike_premium',
    name: 'Bike Premium',
    price: 49,
    vehicleType: 'bike_taxi',
    icon: <Bike className="w-6 h-6" />,
    features: [
      'Unlimited rides for 24 hours',
      'Zero platform commission',
      'Priority in bid listings',
      'Premium badge on profile',
    ],
    planType: 'bike_premium',
  },
  {
    id: 'auto_premium',
    name: 'Auto Premium',
    price: 99,
    vehicleType: 'auto_rickshaw',
    icon: <Truck className="w-6 h-6" />,
    features: [
      'Unlimited rides for 24 hours',
      'Zero platform commission',
      'Priority in bid listings',
      'Premium badge on profile',
    ],
    planType: 'auto_premium',
  },
  {
    id: 'cab_premium',
    name: 'Cab Premium',
    price: 149,
    vehicleType: 'cab',
    icon: <Car className="w-6 h-6" />,
    features: [
      'Unlimited rides for 24 hours',
      'Zero platform commission',
      'Priority in bid listings',
      'Premium badge on profile',
    ],
    planType: 'cab_premium',
  },
];

export const DriverPremiumPlans = ({
  driverId,
  vehicleType,
  onSubscribed,
}: DriverPremiumPlansProps) => {
  const { toast } = useToast();
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [activeSubscription, setActiveSubscription] = useState<any>(null);

  // Find the matching plan for this driver's vehicle type
  const matchingPlan = premiumPlans.find(p => p.vehicleType === vehicleType);

  const handleSubscribe = async (plan: PremiumPlan) => {
    setSubscribing(plan.id);
    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      const { error } = await supabase.from('driver_subscriptions').insert({
        driver_id: driverId,
        plan_type: plan.planType,
        price: plan.price,
        expires_at: expiresAt.toISOString(),
        status: 'active',
      });

      if (error) throw error;

      toast({
        title: 'Premium Activated! 🎉',
        description: `You now have unlimited rides for 24 hours`,
      });

      setActiveSubscription({
        plan_type: plan.planType,
        expires_at: expiresAt.toISOString(),
      });

      onSubscribed?.();
    } catch (error) {
      console.error('Error subscribing:', error);
      toast({
        title: 'Subscription Failed',
        description: 'Could not activate premium plan. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubscribing(null);
    }
  };

  // Check for active subscription on mount
  useEffect(() => {
    const checkSubscription = async () => {
      const { data } = await supabase
        .from('driver_subscriptions')
        .select('*')
        .eq('driver_id', driverId)
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (data) {
        setActiveSubscription(data);
      }
    };
    checkSubscription();
  }, [driverId]);

  if (!matchingPlan) return null;

  const isSubscribed = activeSubscription?.plan_type === matchingPlan.planType;
  const expiresAt = activeSubscription ? new Date(activeSubscription.expires_at) : null;
  const hoursLeft = expiresAt ? Math.max(0, Math.round((expiresAt.getTime() - Date.now()) / 3600000)) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className={`dashboard-card overflow-hidden ${isSubscribed ? 'border-primary' : 'border-primary/30'}`}>
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10 pointer-events-none" />
        
        <CardHeader className="relative pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Crown className="w-6 h-6" />
              </div>
              <div>
                <CardTitle className="font-display text-lg">
                  {matchingPlan.name}
                </CardTitle>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  24 Hour Pass
                </div>
              </div>
            </div>
            {isSubscribed && (
              <Badge className="bg-success/20 text-success">
                Active • {hoursLeft}h left
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="relative space-y-4">
          <div className="flex items-baseline gap-1">
            <span className="font-display text-4xl font-bold text-primary">
              ₹{matchingPlan.price}
            </span>
            <span className="text-muted-foreground">/day</span>
          </div>

          <div className="space-y-2">
            {matchingPlan.features.map((feature, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm">
                {feature.includes('Unlimited') ? (
                  <Infinity className="w-4 h-4 text-primary" />
                ) : (
                  <Check className="w-4 h-4 text-success" />
                )}
                <span>{feature}</span>
              </div>
            ))}
          </div>

          <Button
            onClick={() => handleSubscribe(matchingPlan)}
            disabled={subscribing !== null || isSubscribed}
            className="w-full"
            variant={isSubscribed ? 'outline' : 'default'}
          >
            {subscribing === matchingPlan.id ? (
              'Processing...'
            ) : isSubscribed ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Already Active
              </>
            ) : (
              <>
                <Crown className="w-4 h-4 mr-2" />
                Activate Premium
              </>
            )}
          </Button>

          {!isSubscribed && (
            <p className="text-xs text-center text-muted-foreground">
              Pay ₹{matchingPlan.price} once, ride unlimited for 24 hours
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};
