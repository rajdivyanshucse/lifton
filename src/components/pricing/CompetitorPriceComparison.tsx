import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Check, Zap } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type ServiceType = Database['public']['Enums']['service_type'];

interface CompetitorPrice {
  id: string;
  competitor_name: string;
  base_fare: number;
  per_km_rate: number;
  surge_multiplier: number;
}

interface CompetitorPriceComparisonProps {
  serviceType: ServiceType;
  distanceKm: number;
  ourFare: number;
}

// Anonymous platform names
const anonymousNames = [
  'Platform A',
  'Platform B', 
  'Platform C',
  'Platform D',
  'Platform E',
];

// Anonymous icons
const anonymousIcons = ['🚕', '🚖', '🚗', '🚙', '🛺'];

export const CompetitorPriceComparison = ({
  serviceType,
  distanceKm,
  ourFare,
}: CompetitorPriceComparisonProps) => {
  const [competitors, setCompetitors] = useState<CompetitorPrice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCompetitorPrices();
  }, [serviceType]);

  const fetchCompetitorPrices = async () => {
    const { data } = await supabase
      .from('competitor_prices')
      .select('*')
      .eq('service_type', serviceType);

    setCompetitors(data || []);
    setLoading(false);
  };

  const calculateCompetitorFare = (competitor: CompetitorPrice) => {
    return Math.round(
      (competitor.base_fare + distanceKm * competitor.per_km_rate) *
        competitor.surge_multiplier
    );
  };

  if (loading || competitors.length === 0 || distanceKm <= 0) {
    return null;
  }

  // Use the actual fare passed from the booking - estimated fare IS our platform fare
  const actualOurFare = ourFare;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="p-4 bg-card/50 backdrop-blur border-border/50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            Compare & Save
          </h3>
        </div>

        {/* Our price highlight - in green using success token */}
        <div className="mb-4 p-3 rounded-lg bg-success/10 border border-success/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🚀</span>
              <div>
                <span className="font-semibold text-success">LIFTON</span>
                <div className="flex items-center gap-1 text-xs text-success">
                  <Check className="w-3 h-3" />
                  Best Value
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-success">₹{actualOurFare}</div>
            </div>
          </div>
        </div>

        {/* Competitor prices - anonymous */}
        <div className="space-y-2">
          {competitors.slice(0, 4).map((competitor, index) => {
            const competitorFare = calculateCompetitorFare(competitor);

            return (
              <motion.div
                key={competitor.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{anonymousIcons[index % anonymousIcons.length]}</span>
                  <span className="text-sm font-medium text-muted-foreground">
                    {anonymousNames[index % anonymousNames.length]}
                  </span>
                </div>
                <span className="font-semibold text-muted-foreground">
                  ₹{competitorFare}
                </span>
              </motion.div>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground mt-3 text-center">
          *Prices are estimated based on current market rates
        </p>
      </Card>
    </motion.div>
  );
};