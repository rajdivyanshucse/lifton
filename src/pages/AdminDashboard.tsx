import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/layout/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Users, Car, Package, TrendingUp, CheckCircle, XCircle, Clock, Settings } from 'lucide-react';
import { format } from 'date-fns';
import { PricingControls } from '@/components/admin/PricingControls';

const AdminDashboard = () => {
  const { user, loading, userRole } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState({ users: 0, drivers: 0, bookings: 0, revenue: 0 });
  const [pendingDrivers, setPendingDrivers] = useState<any[]>([]);
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [allDrivers, setAllDrivers] = useState<any[]>([]);

  useEffect(() => {
    if (user && userRole === 'admin') {
      fetchStats();
      fetchPendingDrivers();
      fetchAllBookings();
      fetchAllDrivers();
    }
  }, [user, userRole]);

  const fetchStats = async () => {
    const [usersRes, driversRes, bookingsRes] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact' }),
      supabase.from('drivers').select('id', { count: 'exact' }).eq('status', 'approved'),
      supabase.from('bookings').select('estimated_fare, status'),
    ]);
    
    const completedBookings = bookingsRes.data?.filter(b => b.status === 'completed') || [];
    const revenue = completedBookings.reduce((sum, b) => sum + (b.estimated_fare || 0), 0);
    
    setStats({
      users: usersRes.count || 0,
      drivers: driversRes.count || 0,
      bookings: bookingsRes.data?.length || 0,
      revenue,
    });
  };

  const fetchPendingDrivers = async () => {
    const { data: drivers } = await supabase.from('drivers').select('*').eq('status', 'pending');
    if (drivers && drivers.length > 0) {
      const userIds = drivers.map(d => d.user_id);
      const { data: profiles } = await supabase.from('profiles').select('*').in('user_id', userIds);
      const driversWithProfiles = drivers.map(driver => ({
        ...driver,
        profiles: profiles?.find(p => p.user_id === driver.user_id) || null
      }));
      setPendingDrivers(driversWithProfiles);
    } else {
      setPendingDrivers([]);
    }
  };

  const fetchAllBookings = async () => {
    const { data } = await supabase.from('bookings').select('*').order('created_at', { ascending: false }).limit(50);
    setAllBookings(data || []);
  };

  const fetchAllDrivers = async () => {
    const { data: drivers } = await supabase.from('drivers').select('*').order('created_at', { ascending: false });
    if (drivers && drivers.length > 0) {
      const userIds = drivers.map(d => d.user_id);
      const { data: profiles } = await supabase.from('profiles').select('*').in('user_id', userIds);
      const driversWithProfiles = drivers.map(driver => ({
        ...driver,
        profiles: profiles?.find(p => p.user_id === driver.user_id) || null
      }));
      setAllDrivers(driversWithProfiles);
    } else {
      setAllDrivers([]);
    }
  };

  const updateDriverStatus = async (driverId: string, status: 'approved' | 'rejected') => {
    await supabase.from('drivers').update({ status }).eq('id', driverId);
    toast({ title: `Driver ${status}` });
    fetchPendingDrivers();
    fetchAllDrivers();
    fetchStats();
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-pulse text-primary">Loading...</div></div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (userRole !== 'admin') return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-3xl font-bold mb-8">Admin Dashboard</h1>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total Users', value: stats.users, icon: Users, color: 'text-primary' },
              { label: 'Active Drivers', value: stats.drivers, icon: Car, color: 'text-success' },
              { label: 'Total Bookings', value: stats.bookings, icon: Package, color: 'text-warning' },
              { label: 'Revenue', value: `₹${stats.revenue}`, icon: TrendingUp, color: 'text-primary' },
            ].map((stat, i) => (
              <Card key={i} className="stat-card">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-card flex items-center justify-center ${stat.color}`}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                    <div className="font-display text-xl font-bold">{stat.value}</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <Tabs defaultValue="drivers">
            <TabsList className="mb-6">
              <TabsTrigger value="drivers">Pending Approvals ({pendingDrivers.length})</TabsTrigger>
              <TabsTrigger value="all-drivers">All Drivers</TabsTrigger>
              <TabsTrigger value="bookings">Bookings</TabsTrigger>
              <TabsTrigger value="pricing" className="flex items-center gap-1">
                <Settings className="w-3 h-3" /> Pricing
              </TabsTrigger>
            </TabsList>

            <TabsContent value="drivers">
              {pendingDrivers.length === 0 ? (
                <Card className="dashboard-card text-center py-12">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 text-success" />
                  <h3 className="font-display text-xl">All caught up!</h3>
                  <p className="text-muted-foreground">No pending driver approvals</p>
                </Card>
              ) : (
                <div className="space-y-4">
                  {pendingDrivers.map((driver) => (
                    <Card key={driver.id} className="dashboard-card">
                      <CardContent className="p-6 flex items-center justify-between">
                        <div>
                          <div className="font-medium">{driver.profiles?.full_name || 'Unknown'}</div>
                          <div className="text-sm text-muted-foreground">{driver.vehicle_type.replace(/_/g, ' ')} • {driver.vehicle_number}</div>
                          <div className="text-xs text-muted-foreground">License: {driver.license_number}</div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => updateDriverStatus(driver.id, 'approved')}><CheckCircle className="w-4 h-4 mr-1" />Approve</Button>
                          <Button size="sm" variant="destructive" onClick={() => updateDriverStatus(driver.id, 'rejected')}><XCircle className="w-4 h-4 mr-1" />Reject</Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="all-drivers">
              <div className="space-y-4">
                {allDrivers.map((driver) => (
                  <Card key={driver.id} className="dashboard-card">
                    <CardContent className="p-6 flex items-center justify-between">
                      <div>
                        <div className="font-medium">{driver.profiles?.full_name || 'Unknown'}</div>
                        <div className="text-sm text-muted-foreground">{driver.vehicle_number} • {driver.total_rides} rides • ₹{driver.total_earnings} earned</div>
                      </div>
                      <Badge className={driver.status === 'approved' ? 'bg-success' : driver.status === 'pending' ? 'bg-warning' : 'bg-destructive'}>{driver.status}</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="bookings">
              <div className="space-y-4">
                {allBookings.map((booking) => (
                  <Card key={booking.id} className="dashboard-card">
                    <CardContent className="p-6 flex items-center justify-between">
                      <div>
                        <div className="text-sm">{booking.pickup_address} → {booking.drop_address}</div>
                        <div className="text-xs text-muted-foreground">{format(new Date(booking.created_at), 'MMM d, h:mm a')}</div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge className={booking.status === 'completed' ? 'bg-success' : booking.status === 'cancelled' ? 'bg-destructive' : 'bg-warning'}>{booking.status}</Badge>
                        <span className="font-bold">₹{booking.estimated_fare}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="pricing">
              <PricingControls />
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>
    </div>
  );
};

export default AdminDashboard;
