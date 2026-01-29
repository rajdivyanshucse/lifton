import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/layout/Navbar';
import { BookingForm } from '@/components/dashboard/BookingForm';
import { BookingHistory } from '@/components/dashboard/BookingHistory';
import { ActiveBooking } from '@/components/dashboard/ActiveBooking';
import { WalletCard } from '@/components/wallet/WalletCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { PlusCircle, History, MapPin, Wallet } from 'lucide-react';

const UserDashboard = () => {
  const { user, loading, userRole } = useAuth();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('book');
  const [activeBookings, setActiveBookings] = useState<{
    id: string;
    status: string;
    service_type: string;
    pickup_address: string;
    drop_address: string;
    pickup_lat: number | null;
    pickup_lng: number | null;
    drop_lat: number | null;
    drop_lng: number | null;
    estimated_fare: number;
    final_fare: number | null;
    distance_km: number | null;
    driver_id: string | null;
    created_at: string;
  }[]>([]);

  useEffect(() => {
    if (user) {
      fetchActiveBookings();
      
      // Subscribe to realtime updates
      const channel = supabase
        .channel('user-bookings')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'bookings',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            fetchActiveBookings();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchActiveBookings = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('bookings')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['pending', 'accepted', 'in_progress'])
      .order('created_at', { ascending: false });
    
    setActiveBookings(data || []);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-primary">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Redirect drivers and admins to their dashboards
  if (userRole === 'driver') {
    return <Navigate to="/driver" replace />;
  }
  if (userRole === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 pt-24 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="font-display text-3xl font-bold mb-2">
            Welcome back!
          </h1>
          <p className="text-muted-foreground mb-8">
            Book a ride or track your deliveries
          </p>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              {/* Active Bookings Banner */}
              {activeBookings.length > 0 && (
                <div className="mb-8">
                  <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-primary" />
                    Active Rides ({activeBookings.length})
                  </h2>
                  <div className="grid gap-4">
                    {activeBookings.map((booking) => (
                      <ActiveBooking key={booking.id} booking={booking} onUpdate={fetchActiveBookings} />
                    ))}
                  </div>
                </div>
              )}

              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-6">
                  <TabsTrigger value="book" className="gap-2">
                    <PlusCircle className="w-4 h-4" />
                    Book Now
                  </TabsTrigger>
                  <TabsTrigger value="history" className="gap-2">
                    <History className="w-4 h-4" />
                    History
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="book">
                  <BookingForm 
                    defaultService={searchParams.get('service') || undefined}
                    onSuccess={fetchActiveBookings}
                  />
                </TabsContent>

                <TabsContent value="history">
                  <BookingHistory />
                </TabsContent>
              </Tabs>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <WalletCard />
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default UserDashboard;
