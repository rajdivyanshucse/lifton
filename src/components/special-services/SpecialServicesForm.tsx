import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Baby, Heart, Shield, Phone, AlertTriangle, Loader2, UserPlus, Check } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type SpecialServiceType = Database['public']['Enums']['special_service_type'];

interface SpecialServicesFormProps {
  bookingId: string;
  onComplete: () => void;
}

interface GuardianContact {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  relationship: string;
  is_primary: boolean;
}

export const SpecialServicesForm = ({ bookingId, onComplete }: SpecialServicesFormProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [serviceType, setServiceType] = useState<SpecialServiceType>('kids_pickup');
  const [passengerName, setPassengerName] = useState('');
  const [passengerAge, setPassengerAge] = useState('');
  const [passengerPhone, setPassengerPhone] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [guardians, setGuardians] = useState<GuardianContact[]>([]);
  const [selectedGuardian, setSelectedGuardian] = useState<string>('');
  const [newGuardian, setNewGuardian] = useState({
    name: '',
    phone: '',
    email: '',
    relationship: '',
  });
  const [showAddGuardian, setShowAddGuardian] = useState(false);
  const [loading, setLoading] = useState(false);

  useState(() => {
    fetchGuardians();
  });

  const fetchGuardians = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('guardian_contacts')
      .select('*')
      .eq('user_id', user.id)
      .order('is_primary', { ascending: false });

    setGuardians(data || []);
    if (data && data.length > 0) {
      const primary = data.find((g) => g.is_primary);
      setSelectedGuardian(primary?.id || data[0].id);
    }
  };

  const addGuardian = async () => {
    if (!user || !newGuardian.name || !newGuardian.phone) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('guardian_contacts')
        .insert({
          user_id: user.id,
          name: newGuardian.name,
          phone: newGuardian.phone,
          email: newGuardian.email || null,
          relationship: newGuardian.relationship,
          is_primary: guardians.length === 0,
        })
        .select()
        .single();

      if (error) throw error;

      setGuardians([...guardians, data]);
      setSelectedGuardian(data.id);
      setNewGuardian({ name: '', phone: '', email: '', relationship: '' });
      setShowAddGuardian(false);

      toast({ title: 'Guardian Added', description: 'Emergency contact saved' });
    } catch (error: any) {
      toast({
        title: 'Failed to add guardian',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const generateOTP = () => Math.floor(1000 + Math.random() * 9000).toString();

  const submitSpecialService = async () => {
    if (!passengerName || !selectedGuardian) {
      toast({
        title: 'Missing Information',
        description: 'Please fill all required fields',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const pickupOTP = generateOTP();
      const dropOTP = generateOTP();

      const { error } = await supabase.from('special_service_details').insert({
        booking_id: bookingId,
        service_type: serviceType,
        passenger_name: passengerName,
        passenger_age: passengerAge ? parseInt(passengerAge) : null,
        passenger_phone: passengerPhone || null,
        guardian_contact_id: selectedGuardian,
        special_instructions: specialInstructions || null,
        pickup_otp: pickupOTP,
        drop_otp: dropOTP,
      });

      if (error) throw error;

      toast({
        title: 'Special Service Configured',
        description: `Pickup OTP: ${pickupOTP}, Drop OTP: ${dropOTP}. Share these with the passenger.`,
      });

      onComplete();
    } catch (error: any) {
      toast({
        title: 'Failed to configure service',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-card/50 backdrop-blur border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Shield className="w-5 h-5 text-primary" />
          Special Care Service
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Service Type Selection */}
        <div className="space-y-3">
          <Label>Service Type</Label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setServiceType('kids_pickup')}
              className={`p-4 rounded-xl border-2 transition-all text-left ${
                serviceType === 'kids_pickup'
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <Baby className={`w-6 h-6 mb-2 ${serviceType === 'kids_pickup' ? 'text-primary' : 'text-muted-foreground'}`} />
              <div className="font-medium">Kids Pickup</div>
              <div className="text-xs text-muted-foreground">Safe school/activity transport</div>
            </button>
            <button
              type="button"
              onClick={() => setServiceType('senior_citizen')}
              className={`p-4 rounded-xl border-2 transition-all text-left ${
                serviceType === 'senior_citizen'
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <Heart className={`w-6 h-6 mb-2 ${serviceType === 'senior_citizen' ? 'text-primary' : 'text-muted-foreground'}`} />
              <div className="font-medium">Senior Care</div>
              <div className="text-xs text-muted-foreground">Assisted elderly transport</div>
            </button>
          </div>
        </div>

        {/* Safety Features Badge */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="text-green-400 border-green-500/30">
            <Check className="w-3 h-3 mr-1" /> Verified Driver
          </Badge>
          <Badge variant="outline" className="text-blue-400 border-blue-500/30">
            <Shield className="w-3 h-3 mr-1" /> Live Tracking
          </Badge>
          <Badge variant="outline" className="text-purple-400 border-purple-500/30">
            <Phone className="w-3 h-3 mr-1" /> Guardian Alerts
          </Badge>
        </div>

        {/* Passenger Details */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="passenger-name">Passenger Name *</Label>
            <Input
              id="passenger-name"
              value={passengerName}
              onChange={(e) => setPassengerName(e.target.value)}
              placeholder="Enter passenger name"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="passenger-age">Age</Label>
              <Input
                id="passenger-age"
                type="number"
                value={passengerAge}
                onChange={(e) => setPassengerAge(e.target.value)}
                placeholder="Age"
                min={1}
                max={120}
              />
            </div>
            <div>
              <Label htmlFor="passenger-phone">Phone (Optional)</Label>
              <Input
                id="passenger-phone"
                type="tel"
                value={passengerPhone}
                onChange={(e) => setPassengerPhone(e.target.value)}
                placeholder="+91..."
              />
            </div>
          </div>
        </div>

        {/* Guardian Selection */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Emergency Contact *</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAddGuardian(!showAddGuardian)}
            >
              <UserPlus className="w-4 h-4 mr-1" />
              Add New
            </Button>
          </div>

          {showAddGuardian ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-3 p-4 rounded-lg bg-muted/30 border border-border"
            >
              <Input
                placeholder="Guardian Name *"
                value={newGuardian.name}
                onChange={(e) => setNewGuardian({ ...newGuardian, name: e.target.value })}
              />
              <Input
                placeholder="Phone Number *"
                type="tel"
                value={newGuardian.phone}
                onChange={(e) => setNewGuardian({ ...newGuardian, phone: e.target.value })}
              />
              <Input
                placeholder="Email (Optional)"
                type="email"
                value={newGuardian.email}
                onChange={(e) => setNewGuardian({ ...newGuardian, email: e.target.value })}
              />
              <Select
                value={newGuardian.relationship}
                onValueChange={(v) => setNewGuardian({ ...newGuardian, relationship: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Relationship" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="parent">Parent</SelectItem>
                  <SelectItem value="spouse">Spouse</SelectItem>
                  <SelectItem value="sibling">Sibling</SelectItem>
                  <SelectItem value="child">Child</SelectItem>
                  <SelectItem value="friend">Friend</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button size="sm" onClick={addGuardian} disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowAddGuardian(false)}>
                  Cancel
                </Button>
              </div>
            </motion.div>
          ) : (
            <Select value={selectedGuardian} onValueChange={setSelectedGuardian}>
              <SelectTrigger>
                <SelectValue placeholder="Select guardian contact" />
              </SelectTrigger>
              <SelectContent>
                {guardians.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name} ({g.relationship}) - {g.phone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Special Instructions */}
        <div>
          <Label htmlFor="instructions">Special Instructions</Label>
          <Textarea
            id="instructions"
            value={specialInstructions}
            onChange={(e) => setSpecialInstructions(e.target.value)}
            placeholder="Any specific care instructions, medical conditions, preferences..."
            rows={3}
          />
        </div>

        {/* Safety Notice */}
        <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-yellow-400">Safety OTP Required</p>
            <p className="text-muted-foreground text-xs mt-1">
              Driver must verify pickup and drop OTPs with the passenger/guardian for added security.
            </p>
          </div>
        </div>

        <Button
          className="w-full"
          onClick={submitSpecialService}
          disabled={loading || !passengerName || !selectedGuardian}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Shield className="w-4 h-4 mr-2" />
          )}
          Confirm Special Service
        </Button>
      </CardContent>
    </Card>
  );
};
