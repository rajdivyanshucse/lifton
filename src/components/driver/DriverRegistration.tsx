import { useState } from 'react';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/layout/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Truck, ArrowLeft } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type ServiceType = Database['public']['Enums']['service_type'];

interface DriverRegistrationProps {
  onSuccess: () => void;
}

const vehicleTypes: { id: ServiceType; name: string }[] = [
  { id: 'bike_taxi', name: 'Bike' },
  { id: 'auto_rickshaw', name: 'Auto Rickshaw' },
  { id: 'cab', name: 'Cab / Car' },
  { id: 'parcel_delivery', name: 'Delivery Vehicle' },
  { id: 'heavy_goods', name: 'Truck' },
  { id: 'packers_movers', name: 'Moving Truck' },
  { id: 'intercity_goods', name: 'Long-haul Vehicle' },
];

export const DriverRegistration = ({ onSuccess }: DriverRegistrationProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [vehicleType, setVehicleType] = useState<ServiceType>('cab');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('drivers').insert({
        user_id: user.id,
        vehicle_type: vehicleType,
        vehicle_number: vehicleNumber.toUpperCase(),
        license_number: licenseNumber.toUpperCase(),
        status: 'pending',
      });

      if (error) throw error;

      toast({
        title: 'Application Submitted!',
        description: 'Your driver application is under review.',
      });
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 pt-24 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-lg mx-auto"
        >
          <Card className="dashboard-card">
            <CardHeader className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
                <Truck className="w-8 h-8 text-primary-foreground" />
              </div>
              <CardTitle className="font-display text-2xl">Become a Driver Partner</CardTitle>
              <p className="text-muted-foreground mt-2">
                Fill in your vehicle details to start earning
              </p>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label>Vehicle Type</Label>
                  <Select value={vehicleType} onValueChange={(v: ServiceType) => setVehicleType(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicleTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="vehicleNumber">Vehicle Number</Label>
                  <Input
                    id="vehicleNumber"
                    placeholder="e.g., MH01AB1234"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="licenseNumber">Driving License Number</Label>
                  <Input
                    id="licenseNumber"
                    placeholder="e.g., MH0120200012345"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    required
                  />
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading ? 'Submitting...' : 'Submit Application'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
};
