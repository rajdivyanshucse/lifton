import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/layout/Navbar';
import { DeliveryPartnerDashboard } from '@/components/delivery-partner/DeliveryPartnerDashboard';
import { useAuth } from '@/contexts/AuthContext';

const DeliveryPartner = () => {
  const { user, loading, userRole } = useAuth();

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

  // Only drivers can access this page
  if (userRole !== 'driver') {
    return <Navigate to="/dashboard" replace />;
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
            Delivery Partner Dashboard
          </h1>
          <p className="text-muted-foreground mb-8">
            Accept orders, track earnings, and manage deliveries
          </p>

          <DeliveryPartnerDashboard />
        </motion.div>
      </main>
    </div>
  );
};

export default DeliveryPartner;
