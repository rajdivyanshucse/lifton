import { useState, useCallback, useRef } from 'react';

export interface LocationResult {
  display_name: string;
  lat: string;
  lon: string;
  place_id: string;
}

export const useLocationSearch = () => {
  const [results, setResults] = useState<LocationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout>();

  const searchLocation = useCallback(async (query: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.length < 3) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=in`,
          {
            headers: {
              'Accept': 'application/json',
            },
          }
        );
        const data = await response.json();
        setResults(data);
      } catch (error) {
        console.error('Location search error:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
  }, []);

  return { results, loading, searchLocation, clearResults };
};

// Haversine formula for distance calculation
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Radius of Earth in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const toRad = (deg: number): number => deg * (Math.PI / 180);

// Estimate travel time based on distance and service type
export const estimateTravelTime = (distanceKm: number, serviceType: string): number => {
  const avgSpeedKmh: Record<string, number> = {
    bike_taxi: 25,
    auto_rickshaw: 20,
    cab: 30,
    parcel_delivery: 20,
    heavy_goods: 15,
    packers_movers: 15,
    intercity_goods: 40,
  };
  const speed = avgSpeedKmh[serviceType] || 20;
  return Math.round((distanceKm / speed) * 60); // minutes
};
