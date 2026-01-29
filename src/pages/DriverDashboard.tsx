import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/layout/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DriverRegistration } from '@/components/driver/DriverRegistration';
import { DriverBidForm } from '@/components/driver/DriverBidForm';
import { DriverPremiumPlans } from '@/components/driver/DriverPremiumPlans';
import {
  Power, MapPin, CheckCircle, XCircle, Clock,
  Wallet, TrendingUp, Star, Package, Car, Gavel, Crown
} from 'lucide-react';
import { format } from 'date-fns';

const DriverDashboard = () => {
  const { user, loading, userRole } = useAuth();
  const { toast } = useToast();
  const [driver, setDriver] = useState<any>(null);
  const [pendingBookings, setPendingBookings] = useState<any[]>([]);
  const [myBookings, setMyBookings] = useState<any[]>([]);
  const [driverLoading, setDriverLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDriverProfile();
    }
  }, [user]);

  useEffect(() => {
    if (driver?.status === 'approved' && driver?.is_online) {
      fetchPendingBookings();
      
      // Subscribe to new bookings
      const channel = supabase
        .channel('pending-bookings')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'bookings',
          },
          () => {
            fetchPendingBookings();
            fetchMyBookings();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [driver]);

  const fetchDriverProfile = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('drivers')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    
    setDriver(data);
    setDriverLoading(false);

    if (data) {
      fetchMyBookings();
    }
  };

  const fetchPendingBookings = async () => {
    if (!driver) return;
    
    const { data } = await supabase
      .from('bookings')
      .select('*')
      .eq('status', 'pending')
      .eq('service_type', driver.vehicle_type)
      .order('created_at', { ascending: true })
      .limit(10);
    
    setPendingBookings(data || []);
  };

  const fetchMyBookings = async () => {
    if (!driver) return;
    
    const { data } = await supabase
      .from('bookings')
      .select('*')
      .eq('driver_id', driver.id)
      .in('status', ['accepted', 'in_progress', 'completed'])
      .order('created_at', { ascending: false })
      .limit(20);
    
    setMyBookings(data || []);
  };

  const toggleOnline = async () => {
    if (!driver) return;

    const { error } = await supabase
      .from('drivers')
      .update({ is_online: !driver.is_online })
      .eq('id', driver.id);

    if (!error) {
      setDriver({ ...driver, is_online: !driver.is_online });
      toast({
        title: driver.is_online ? 'You are now offline' : 'You are now online',
        description: driver.is_online ? 'You will not receive new requests' : 'You will start receiving booking requests',
      });
    }
  };

  const acceptBooking = async (bookingId: string) => {
    const { error } = await supabase
      .from('bookings')
      .update({
        driver_id: driver.id,
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      })
      .eq('id', bookingId)
      .eq('status', 'pending');

    if (error) {
      toast({
        title: 'Could not accept',
        description: 'This booking may have been taken by another driver',
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Booking accepted!' });
      fetchPendingBookings();
      fetchMyBookings();
    }
  };

  const updateBookingStatus = async (bookingId: string, status: string) => {
    const updates: any = { status };
    
    if (status === 'in_progress') {
      updates.started_at = new Date().toISOString();
    } else if (status === 'completed') {
      updates.completed_at = new Date().toISOString();
      
      // Update driver earnings
      const booking = myBookings.find(b => b.id === bookingId);
      if (booking) {
        await supabase
          .from('drivers')
          .update({
            total_rides: driver.total_rides + 1,
            total_earnings: driver.total_earnings + (booking.final_fare || booking.estimated_fare),
          })
          .eq('id', driver.id);
      }
    }

    await supabase.from('bookings').update(updates).eq('id', bookingId);
    fetchMyBookings();
    toast({ title: `Booking ${status.replace('_', ' ')}` });
  };

  if (loading || driverLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-primary">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (userRole !== 'driver') {
    return <Navigate to="/dashboard" replace />;
  }

  // Show registration form if driver hasn't registered
  if (!driver) {
    return <DriverRegistration onSuccess={fetchDriverProfile} />;
  }

  // Show pending status if not approved
  if (driver.status === 'pending') {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 pt-24">
          <Card className="dashboard-card max-w-md mx-auto text-center py-12">
            <Clock className="w-16 h-16 mx-auto mb-4 text-warning" />
            <h2 className="font-display text-2xl font-bold mb-2">Application Under Review</h2>
            <p className="text-muted-foreground">
              Your driver application is being reviewed. You'll be notified once approved.
            </p>
          </Card>
        </main>
      </div>
    );
  }

  if (driver.status === 'rejected' || driver.status === 'suspended') {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 pt-24">
          <Card className="dashboard-card max-w-md mx-auto text-center py-12">
            <XCircle className="w-16 h-16 mx-auto mb-4 text-destructive" />
            <h2 className="font-display text-2xl font-bold mb-2">
              Account {driver.status === 'rejected' ? 'Rejected' : 'Suspended'}
            </h2>
            <p className="text-muted-foreground">
              Please contact support for more information.
            </p>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 pt-24 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-display text-3xl font-bold">Driver Dashboard</h1>
              <div className="flex items-center gap-2 mt-2">
                <Star className="w-4 h-4 text-primary fill-primary" />
                <span className="font-medium">{driver.rating}</span>
                <span className="text-muted-foreground">• {driver.total_rides} rides</span>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Status</div>
                <div className={`font-medium ${driver.is_online ? 'text-success' : 'text-muted-foreground'}`}>
                  {driver.is_online ? 'Online' : 'Offline'}
                </div>
              </div>
              <Switch
                checked={driver.is_online}
                onCheckedChange={toggleOnline}
              />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card className="stat-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Total Earnings</div>
                  <div className="font-display text-xl font-bold">₹{driver.total_earnings}</div>
                </div>
              </div>
            </Card>
            <Card className="stat-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                  <Package className="w-5 h-5 text-success" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Total Rides</div>
                  <div className="font-display text-xl font-bold">{driver.total_rides}</div>
                </div>
              </div>
            </Card>
            <Card className="stat-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Wallet</div>
                  <div className="font-display text-xl font-bold">₹{driver.wallet_balance}</div>
                </div>
              </div>
            </Card>
            <Card className="stat-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                  <Star className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Rating</div>
                  <div className="font-display text-xl font-bold">{driver.rating} ★</div>
                </div>
              </div>
            </Card>
          </div>

          {/* Premium Plans Card */}
          <div className="mb-8">
            <DriverPremiumPlans
              driverId={driver.id}
              vehicleType={driver.vehicle_type}
            />
          </div>

          <Tabs defaultValue="bidding">
            <TabsList className="mb-6">
              <TabsTrigger value="bidding" className="gap-1">
                <Gavel className="w-4 h-4" />
                Bid on Rides {pendingBookings.length > 0 && `(${pendingBookings.length})`}
              </TabsTrigger>
              <TabsTrigger value="requests">
                Direct Requests
              </TabsTrigger>
              <TabsTrigger value="active">Active Rides</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            <TabsContent value="bidding">
              {!driver.is_online ? (
                <Card className="dashboard-card text-center py-12">
                  <Power className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-display text-xl mb-2">You're offline</h3>
                  <p className="text-muted-foreground mb-4">Go online to bid on rides</p>
                  <Button onClick={toggleOnline}>Go Online</Button>
                </Card>
              ) : pendingBookings.length === 0 ? (
                <Card className="dashboard-card text-center py-12">
                  <Gavel className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-display text-xl mb-2">No bookings to bid on</h3>
                  <p className="text-muted-foreground">New ride requests will appear here for bidding</p>
                </Card>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {pendingBookings.map((booking) => (
                    <DriverBidForm
                      key={booking.id}
                      booking={booking}
                      driverId={driver.id}
                      onBidSubmitted={fetchPendingBookings}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="requests">
              {!driver.is_online ? (
                <Card className="dashboard-card text-center py-12">
                  <Power className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-display text-xl mb-2">You're offline</h3>
                  <p className="text-muted-foreground mb-4">Go online to receive booking requests</p>
                  <Button onClick={toggleOnline}>Go Online</Button>
                </Card>
              ) : pendingBookings.length === 0 ? (
                <Card className="dashboard-card text-center py-12">
                  <MapPin className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-display text-xl mb-2">No new requests</h3>
                  <p className="text-muted-foreground">New booking requests will appear here</p>
                </Card>
              ) : (
                <div className="space-y-4">
                  {pendingBookings.map((booking) => (
                    <Card key={booking.id} className="dashboard-card">
                      <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-3">
                              <Badge variant="outline">
                                {booking.service_type.replace(/_/g, ' ')}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {booking.distance_km} km
                              </span>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-success" />
                                <span className="text-sm">{booking.pickup_address}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-destructive" />
                                <span className="text-sm">{booking.drop_address}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="font-display text-2xl font-bold text-primary">
                                ₹{booking.estimated_fare}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {booking.payment_mode}
                              </div>
                            </div>
                            <Button onClick={() => acceptBooking(booking.id)}>
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Accept
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="active">
              {myBookings.filter(b => ['accepted', 'in_progress'].includes(b.status)).length === 0 ? (
                <Card className="dashboard-card text-center py-12">
                  <Car className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-display text-xl mb-2">No active rides</h3>
                  <p className="text-muted-foreground">Accept a booking to start a ride</p>
                </Card>
              ) : (
                <div className="space-y-4">
                  {myBookings
                    .filter(b => ['accepted', 'in_progress'].includes(b.status))
                    .map((booking) => (
                      <Card key={booking.id} className="dashboard-card border-primary/50">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <Badge className={booking.status === 'accepted' ? 'bg-warning' : 'bg-primary'}>
                              {booking.status === 'accepted' ? 'Pickup Pending' : 'In Progress'}
                            </Badge>
                            <span className="font-display text-xl font-bold">
                              ₹{booking.estimated_fare}
                            </span>
                          </div>
                          <div className="space-y-2 mb-4">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-success" />
                              <span>{booking.pickup_address}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-destructive" />
                              <span>{booking.drop_address}</span>
                            </div>
                          </div>
                          <div className="flex gap-3">
                            {booking.status === 'accepted' && (
                              <Button onClick={() => updateBookingStatus(booking.id, 'in_progress')}>
                                Start Ride
                              </Button>
                            )}
                            {booking.status === 'in_progress' && (
                              <Button onClick={() => updateBookingStatus(booking.id, 'completed')}>
                                Complete Ride
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="history">
              {myBookings.filter(b => b.status === 'completed').length === 0 ? (
                <Card className="dashboard-card text-center py-12">
                  <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-display text-xl mb-2">No completed rides yet</h3>
                  <p className="text-muted-foreground">Your completed rides will appear here</p>
                </Card>
              ) : (
                <div className="space-y-4">
                  {myBookings
                    .filter(b => b.status === 'completed')
                    .map((booking) => (
                      <Card key={booking.id} className="dashboard-card">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">{booking.pickup_address}</div>
                              <div className="text-sm text-muted-foreground">to {booking.drop_address}</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {format(new Date(booking.completed_at), 'MMM d, yyyy h:mm a')}
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge className="bg-success mb-1">Completed</Badge>
                              <div className="font-display text-xl font-bold">
                                ₹{booking.final_fare || booking.estimated_fare}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>
    </div>
  );
};

export default DriverDashboard;
