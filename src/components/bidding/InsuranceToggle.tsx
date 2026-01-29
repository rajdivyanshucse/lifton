import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Shield, Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface InsuranceToggleProps {
  distanceKm: number;
  enabled: boolean;
  onToggle: (enabled: boolean, fee: number) => void;
}

export const InsuranceToggle = ({ distanceKm, enabled, onToggle }: InsuranceToggleProps) => {
  const [insuranceFee, setInsuranceFee] = useState(0);

  useEffect(() => {
    // Calculate insurance fee: Math.min(15, Math.max(1, distance * 0.5))
    const fee = Math.min(15, Math.max(1, Math.round(distanceKm * 0.5)));
    setInsuranceFee(fee);
  }, [distanceKm]);

  const handleToggle = (checked: boolean) => {
    onToggle(checked, checked ? insuranceFee : 0);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-xl border-2 transition-all ${
        enabled 
          ? 'border-green-500 bg-green-500/10' 
          : 'border-border hover:border-green-500/50'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            enabled ? 'bg-green-500/20' : 'bg-muted'
          }`}>
            <Shield className={`w-5 h-5 ${enabled ? 'text-green-500' : 'text-muted-foreground'}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Label htmlFor="insurance-toggle" className="font-medium cursor-pointer">
                Ride Insurance
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-4 h-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Covers accident protection, luggage damage, and trip delays. 
                    Fee calculated based on distance: ₹1-₹15.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <p className="text-xs text-muted-foreground">
              Accident & luggage protection
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className={`font-display text-lg font-bold ${enabled ? 'text-green-500' : ''}`}>
              +₹{insuranceFee}
            </div>
            <div className="text-xs text-muted-foreground">
              {distanceKm} km trip
            </div>
          </div>
          <Switch
            id="insurance-toggle"
            checked={enabled}
            onCheckedChange={handleToggle}
          />
        </div>
      </div>

      {enabled && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-3 pt-3 border-t border-green-500/30"
        >
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-center p-2 rounded-lg bg-green-500/10">
              <div className="font-medium text-green-400">Accident</div>
              <div className="text-muted-foreground">₹50,000</div>
            </div>
            <div className="text-center p-2 rounded-lg bg-green-500/10">
              <div className="font-medium text-green-400">Luggage</div>
              <div className="text-muted-foreground">₹10,000</div>
            </div>
            <div className="text-center p-2 rounded-lg bg-green-500/10">
              <div className="font-medium text-green-400">Delay</div>
              <div className="text-muted-foreground">₹500/hr</div>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};
