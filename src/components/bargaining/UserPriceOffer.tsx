import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { MessageSquare, TrendingDown, Check } from 'lucide-react';

interface UserPriceOfferProps {
  estimatedFare: number;
  minFare?: number;
  onOfferSubmit: (offeredPrice: number) => void;
  onSkip: () => void;
}

export const UserPriceOffer = ({
  estimatedFare,
  minFare,
  onOfferSubmit,
  onSkip,
}: UserPriceOfferProps) => {
  const minimumOffer = minFare || Math.round(estimatedFare * 0.7); // Min 70% of estimated
  const [offeredPrice, setOfferedPrice] = useState(Math.round(estimatedFare * 0.9));

  const handleSliderChange = (value: number[]) => {
    setOfferedPrice(value[0]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || minimumOffer;
    setOfferedPrice(Math.max(minimumOffer, Math.min(estimatedFare, value)));
  };

  const savingsPercent = Math.round(((estimatedFare - offeredPrice) / estimatedFare) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="bg-card/50 backdrop-blur border-primary/20">
        <CardContent className="p-5 space-y-5">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Name Your Price</h3>
              <p className="text-sm text-muted-foreground">Offer a fair price to drivers</p>
            </div>
          </div>

          {/* Estimated fare display */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
            <span className="text-sm text-muted-foreground">Estimated Fare</span>
            <span className="font-semibold">₹{estimatedFare}</span>
          </div>

          {/* Price slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Your Offer</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">₹</span>
                <Input
                  type="number"
                  value={offeredPrice}
                  onChange={handleInputChange}
                  className="w-24 text-center font-bold text-lg h-10"
                  min={minimumOffer}
                  max={estimatedFare}
                />
              </div>
            </div>

            <Slider
              value={[offeredPrice]}
              onValueChange={handleSliderChange}
              min={minimumOffer}
              max={estimatedFare}
              step={5}
              className="py-2"
            />

            <div className="flex justify-between text-xs text-muted-foreground">
              <span>₹{minimumOffer}</span>
              <span>₹{estimatedFare}</span>
            </div>
          </div>

          {/* Savings indicator */}
          {savingsPercent > 0 && (
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className="flex items-center justify-center gap-2 p-2 rounded-lg bg-success/10 border border-success/20"
            >
              <TrendingDown className="w-4 h-4 text-success" />
              <span className="text-sm font-medium text-success">
                Save ₹{estimatedFare - offeredPrice} ({savingsPercent}% off)
              </span>
            </motion.div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onSkip}
            >
              Use Estimated Price
            </Button>
            <Button
              className="flex-1"
              onClick={() => onOfferSubmit(offeredPrice)}
            >
              <Check className="w-4 h-4 mr-2" />
              Offer ₹{offeredPrice}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            💡 Lower offers may take longer to get accepted
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
};