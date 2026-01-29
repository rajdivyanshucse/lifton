import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  Package, MapPin, Check, X, Clock, Navigation, 
  Wallet, TrendingUp, Star, Loader2, Play, CheckCircle,
  Phone, MessageSquare
} from 'lucide-react';
import { WalletCard } from '@/components/wallet/WalletCard';
import { PriceBargaining } from '@/components/bargaining/PriceBargaining';
import type { Database } from '@/integrations/supabase/types';

type BookingStatus = Database['public']['Enums']['booking_status'];

interface Booking {
  id: string;
  service_type: string;
  pickup_address: string;
  drop_address: string;
  distance_km: number | null;
  estimated_fare: number;
  final_fare: number | null;
  status: BookingStatus;
  payment_mode: string;
  notes: string | null;
  created_at: string;
  user_id: string;
}

interface DriverInfo {
  id: string;
  is_online: boolean;
  rating: number | null;
  total_rides: number | null;
  total_earnings: number | null;
  wallet_balance: number | null;
}

export const DeliveryPartnerDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [driver, setDriver] = useState<DriverInfo | null>(null);
  const [pendingBookings, setPendingBookings] = useState<Booking[]>([]);
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);
  const [completedBookings, setCompletedBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchDriverData();
      subscribeToPendingBookings();
    }
  }, [user]);

  const fetchDriverData = async () => {
    if (!user) return;

    // Fetch driver info
    const { data: driverData } = await supabase
      .from('drivers')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (driverData) {
      setDriver(driverData);

      // Fetch active booking
      const { data: active } = await supabase
        .from('bookings')
        .select('*')
        .eq('driver_id', driverData.id)
        .in('status', ['accepted', 'in_progress'])
        .maybeSingle();

      setActiveBooking(active);

      // Fetch completed bookings
      const { data: completed } = await supabase
        .from('bookings')
        .select('*')
        .eq('driver_id', driverData.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(10);

      setCompletedBookings(completed || []);
    }

    // Fetch pending bookings (available for pickup)
    const { data: pending } = await supabase
      .from('bookings')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10);

    setPendingBookings(pending || []);
    setLoading(false);
  };

  const subscribeToPendingBookings = () => {
    const channel = supabase
      .channel('pending-bookings')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: 'status=eq.pending',
        },
        () => {
          fetchDriverData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const toggleOnlineStatus = async () => {
    if (!driver) return;

    const newStatus = !driver.is_online;
    const { error } = await supabase
      .from('drivers')
      .update({ is_online: newStatus })
      .eq('id', driver.id);

    if (!error) {
      setDriver({ ...driver, is_online: newStatus });
      toast({
        title: newStatus ? 'You are now Online' : 'You are now Offline',
        description: newStatus ? 'You will receive booking requests' : 'You will not receive new requests',
      });
    }
  };

  const acceptBooking = async (bookingId: string) => {
    if (!driver) return;

    setActionLoading(bookingId);
    try {
      const { error } = await supabase
        .from('bookings')
        .update({
          driver_id: driver.id,
          status: 'accepted',
          accepted_at: new Date().toISOString(),
        })
        .eq('id', bookingId)
        .eq('status', 'pending'); // Only if still pending

      if (error) throw error;

      toast({ title: 'Booking Accepted!', description: 'Navigate to pickup location' });
      fetchDriverData();
    } catch (error: any) {
      toast({
        title: 'Failed to accept',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const updateBookingStatus = async (bookingId: string, status: BookingStatus) => {
    setActionLoading(bookingId);
    try {
      const updates: Record<string, unknown> = { status };
      
      if (status === 'in_progress') {
        updates.started_at = new Date().toISOString();
      } else if (status === 'completed') {
        updates.completed_at = new Date().toISOString();
        
        // Update driver stats
        if (driver && activeBooking) {
          const fare = activeBooking.final_fare || activeBooking.estimated_fare;
          await supabase
            .from('drivers')
            .update({
              total_rides: (driver.total_rides || 0) + 1,
              total_earnings: (driver.total_earnings || 0) + fare,
            })
            .eq('id', driver.id);
        }
      }

      const { error } = await supabase
        .from('bookings')
        .update(updates)
        .eq('id', bookingId);

      if (error) throw error;

      toast({ 
        title: status === 'completed' ? 'Ride Completed!' : 'Status Updated',
        description: status === 'completed' ? 'Earnings added to your account' : 'Booking status changed',
      });
      fetchDriverData();
    } catch (error: any) {
      toast({
        title: 'Failed to update',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const updateLocation = async () => {
    if (!driver || !activeBooking) return;

    // In production, use actual GPS
    const mockLat = 12.9716 + (Math.random() - 0.5) * 0.01;
    const mockLng = 77.5946 + (Math.random() - 0.5) * 0.01;

    await supabase.from('driver_locations').insert({
      driver_id: driver.id,
      booking_id: activeBooking.id,
      latitude: mockLat,
      longitude: mockLng,
      speed: Math.random() * 30 + 10,
      heading: Math.random() * 360,
    });
  };

  // Update location periodically when on active booking
  useEffect(() => {
    if (!activeBooking || activeBooking.status !== 'in_progress') return;

    const interval = setInterval(updateLocation, 10000); // Every 10 seconds
    updateLocation(); // Initial update

    return () => clearInterval(interval);
  }, [activeBooking]);

  const getServiceIcon = (type: string) => {
    return type.includes('parcel') || type.includes('goods') ? Package : MapPin;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!driver) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <p className="text-muted-foreground">Driver profile not found. Please register as a delivery partner.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 backdrop-blur">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Today's Earnings</p>
                <p className="text-2xl font-bold text-primary">
                  ₹{(driver.total_earnings || 0).toLocaleString()}
                </p>
              </div>
              <Wallet className="w-8 h-8 text-primary/50" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50 backdrop-blur">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Rides</p>
                <p className="text-2xl font-bold">{driver.total_rides || 0}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50 backdrop-blur">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Rating</p>
                <p className="text-2xl font-bold flex items-center gap-1">
                  {driver.rating?.toFixed(1) || '5.0'}
                  <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                </p>
              </div>
              <Star className="w-8 h-8 text-yellow-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${driver.is_online ? 'bg-green-500' : 'bg-muted'}`} />
                  <span className="font-medium">{driver.is_online ? 'Online' : 'Offline'}</span>
                </div>
              </div>
              <Switch checked={driver.is_online} onCheckedChange={toggleOnlineStatus} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Booking */}
      {activeBooking && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-primary/50 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Navigation className="w-5 h-5 text-primary" />
                Active {activeBooking.status === 'accepted' ? 'Pickup' : 'Delivery'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500 mt-1.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Pickup</p>
                      <p className="font-medium">{activeBooking.pickup_address}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500 mt-1.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Drop</p>
                      <p className="font-medium">{activeBooking.drop_address}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Distance</span>
                    <span className="font-medium">{activeBooking.distance_km} km</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fare</span>
                    <span className="font-bold text-primary">
                      ₹{activeBooking.final_fare || activeBooking.estimated_fare}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Payment</span>
                    <Badge variant="outline">{activeBooking.payment_mode}</Badge>
                  </div>
                </div>
              </div>

              {activeBooking.notes && (
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-sm text-muted-foreground">{activeBooking.notes}</p>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  <Phone className="w-4 h-4 mr-2" />
                  Call
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Chat
                </Button>
              </div>

              {activeBooking.status === 'accepted' && (
                <Button
                  className="w-full"
                  onClick={() => updateBookingStatus(activeBooking.id, 'in_progress')}
                  disabled={actionLoading === activeBooking.id}
                >
                  {actionLoading === activeBooking.id ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Play className="w-4 h-4 mr-2" />
                  )}
                  Start Delivery
                </Button>
              )}

              {activeBooking.status === 'in_progress' && (
                <Button
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={() => updateBookingStatus(activeBooking.id, 'completed')}
                  disabled={actionLoading === activeBooking.id}
                >
                  {actionLoading === activeBooking.id ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  )}
                  Complete Delivery
                </Button>
              )}

              {/* Bargaining Section */}
              {driver && (
                <PriceBargaining
                  bookingId={activeBooking.id}
                  userId={activeBooking.user_id}
                  originalFare={activeBooking.estimated_fare}
                  onFareConfirmed={(fare) => {
                    setActiveBooking({ ...activeBooking, final_fare: fare });
                  }}
                  isDriver
                  driverId={driver.id}
                />
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Tabs for Pending/Completed */}
      <Tabs defaultValue="pending">
        <TabsList className="grid grid-cols-2">
          <TabsTrigger value="pending">
            Pending ({pendingBookings.length})
          </TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4 mt-4">
          {pendingBookings.length === 0 ? (
            <Card className="text-center py-8">
              <CardContent>
                <Clock className="w-12 h-12 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-muted-foreground">No pending bookings</p>
                <p className="text-xs text-muted-foreground/70">Stay online to receive requests</p>
              </CardContent>
            </Card>
          ) : (
            pendingBookings.map((booking, index) => {
              const Icon = getServiceIcon(booking.service_type);
              return (
                <motion.div
                  key={booking.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="bg-card/50 backdrop-blur hover:border-primary/50 transition-colors">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-2">
                            <Icon className="w-5 h-5 text-primary" />
                            <Badge variant="secondary">
                              {booking.service_type.replace('_', ' ')}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(booking.created_at).toLocaleTimeString()}
                            </span>
                          </div>
                          <div className="space-y-1 text-sm">
                            <div className="flex items-start gap-2">
                              <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5" />
                              <span className="line-clamp-1">{booking.pickup_address}</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5" />
                              <span className="line-clamp-1">{booking.drop_address}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-muted-foreground">
                              {booking.distance_km} km
                            </span>
                            <span className="font-bold text-primary">
                              ₹{booking.estimated_fare}
                            </span>
                            <Badge variant="outline">{booking.payment_mode}</Badge>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button
                            size="sm"
                            onClick={() => acceptBooking(booking.id)}
                            disabled={!!activeBooking || actionLoading === booking.id}
                          >
                            {actionLoading === booking.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Check className="w-4 h-4 mr-1" />
                                Accept
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4 mt-4">
          {completedBookings.length === 0 ? (
            <Card className="text-center py-8">
              <CardContent>
                <CheckCircle className="w-12 h-12 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-muted-foreground">No completed deliveries yet</p>
              </CardContent>
            </Card>
          ) : (
            completedBookings.map((booking) => (
              <Card key={booking.id} className="bg-card/50 backdrop-blur">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          {booking.service_type.replace('_', ' ')}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(booking.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {booking.pickup_address} → {booking.drop_address}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-500">
                        +₹{booking.final_fare || booking.estimated_fare}
                      </p>
                      <p className="text-xs text-muted-foreground">{booking.distance_km} km</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Wallet Section */}
      <WalletCard />
    </div>
  );
};
