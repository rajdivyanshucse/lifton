import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, Navigation, Clock, Car } from 'lucide-react';

interface DriverLocation {
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  created_at: string;
}

interface LiveDriverMapProps {
  bookingId: string;
  pickupLat: number;
  pickupLng: number;
  dropLat?: number;
  dropLng?: number;
}

export const LiveDriverMap = ({
  bookingId,
  pickupLat,
  pickupLng,
  dropLat,
  dropLng,
}: LiveDriverMapProps) => {
  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null);
  const [eta, setEta] = useState<number | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Subscribe to driver location updates
    const channel = supabase
      .channel(`driver-location-${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'driver_locations',
          filter: `booking_id=eq.${bookingId}`,
        },
        (payload) => {
          const location = payload.new as DriverLocation;
          setDriverLocation(location);
          
          // Calculate ETA based on distance and speed
          if (location.speed && location.speed > 0) {
            const distance = calculateHaversineDistance(
              location.latitude,
              location.longitude,
              pickupLat,
              pickupLng
            );
            const etaMinutes = (distance / location.speed) * 60;
            setEta(Math.round(etaMinutes));
          }
        }
      )
      .subscribe();

    // Fetch latest location
    fetchLatestLocation();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bookingId, pickupLat, pickupLng]);

  const fetchLatestLocation = async () => {
    const { data } = await supabase
      .from('driver_locations')
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setDriverLocation(data);
    }
  };

  const calculateHaversineDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  return (
    <Card className="p-4 bg-card/50 backdrop-blur">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Navigation className="w-5 h-5 text-primary" />
          Live Tracking
        </h3>
        {eta !== null && (
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-primary font-medium">{eta} min</span>
            <span className="text-muted-foreground">away</span>
          </div>
        )}
      </div>

      {/* Map Visualization using CSS */}
      <div
        ref={mapRef}
        className="relative h-48 rounded-lg bg-gradient-to-br from-muted/50 to-muted overflow-hidden"
      >
        {/* Grid lines */}
        <div className="absolute inset-0 opacity-20">
          {[...Array(10)].map((_, i) => (
            <div
              key={`h-${i}`}
              className="absolute w-full h-px bg-primary/30"
              style={{ top: `${i * 10}%` }}
            />
          ))}
          {[...Array(10)].map((_, i) => (
            <div
              key={`v-${i}`}
              className="absolute h-full w-px bg-primary/30"
              style={{ left: `${i * 10}%` }}
            />
          ))}
        </div>

        {/* Pickup marker */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute bottom-4 left-1/4 transform -translate-x-1/2"
        >
          <div className="relative">
            <MapPin className="w-8 h-8 text-green-500" />
            <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-xs whitespace-nowrap bg-card/90 px-2 py-0.5 rounded">
              Pickup
            </span>
          </div>
        </motion.div>

        {/* Drop marker */}
        {dropLat && dropLng && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
            className="absolute top-4 right-1/4 transform translate-x-1/2"
          >
            <div className="relative">
              <MapPin className="w-8 h-8 text-red-500" />
              <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-xs whitespace-nowrap bg-card/90 px-2 py-0.5 rounded">
                Drop
              </span>
            </div>
          </motion.div>
        )}

        {/* Driver marker with animation */}
        {driverLocation && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{
              scale: 1,
              x: [0, 5, 0, -5, 0],
              y: [0, -3, 0, -3, 0],
            }}
            transition={{
              scale: { duration: 0.3 },
              x: { duration: 2, repeat: Infinity },
              y: { duration: 1.5, repeat: Infinity },
            }}
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
            style={{
              rotate: driverLocation.heading ? `${driverLocation.heading}deg` : '0deg',
            }}
          >
            <div className="relative">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/30">
                <Car className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="absolute -inset-2 bg-primary/20 rounded-full animate-ping" />
            </div>
          </motion.div>
        )}

        {/* Route line */}
        <svg className="absolute inset-0 w-full h-full">
          <defs>
            <linearGradient id="routeGradient" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.8" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
            </linearGradient>
          </defs>
          <path
            d="M 25% 85% Q 50% 50% 75% 15%"
            fill="none"
            stroke="url(#routeGradient)"
            strokeWidth="3"
            strokeDasharray="8,4"
            className="animate-pulse"
          />
        </svg>
      </div>

      {/* Driver info */}
      {driverLocation && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span>Speed:</span>
            <span className="text-foreground font-medium">
              {driverLocation.speed ? `${Math.round(driverLocation.speed)} km/h` : 'N/A'}
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            Last updated: {new Date(driverLocation.created_at).toLocaleTimeString()}
          </div>
        </div>
      )}
    </Card>
  );
};
