import { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

interface DiscoveryLocation {
  id: number;
  name: string;
  description: string;
  latitude: string;
  longitude: string;
  address: string;
  category: string;
  culturalSignificance: string;
  aiGenerated: boolean;
  createdAt: string;
}

interface GoogleMapProps {
  locations: DiscoveryLocation[];
  center: { latitude: number; longitude: number };
  onLocationClick?: (location: DiscoveryLocation) => void;
  focusedLocation?: DiscoveryLocation | null;
}

const categoryColors = {
  museum: '#8B5CF6',
  gallery: '#06B6D4',
  historic_site: '#F59E0B',
  performance_venue: '#EF4444',
  artist_studio: '#10B981',
  library: '#3B82F6',
  creative_district: '#F97316',
  community_space: '#84CC16',
  default: '#6B7280'
};

export function GoogleMap({ locations, center, onLocationClick, focusedLocation }: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markers, setMarkers] = useState(new Map());
  const [infoWindows, setInfoWindows] = useState(new Map());

  useEffect(() => {
    if (!locations.length || !center) return;

    const initMap = async () => {
      try {
        if (!mapRef.current) {
          setError('Map container not available');
          setIsLoading(false);
          return;
        }

        const loader = new Loader({
          apiKey: import.meta.env.VITE_GOOGLE_API_KEY || '',
          version: 'weekly',
          libraries: ['maps']
        });

        const google = await loader.load();

        const mapInstance = new google.maps.Map(mapRef.current, {
          center: { lat: center.latitude, lng: center.longitude },
          zoom: 12,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false
        });

        setMap(mapInstance);

        // Add markers for each location
        locations.forEach((location) => {
          const lat = parseFloat(location.latitude);
          const lng = parseFloat(location.longitude);
          
          if (isNaN(lat) || isNaN(lng)) return;

          const marker = new google.maps.Marker({
            position: { lat, lng },
            map: mapInstance,
            title: location.name,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 12,
              fillColor: categoryColors[location.category as keyof typeof categoryColors] || categoryColors.default,
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 3
            }
          });

          const infoWindow = new google.maps.InfoWindow({
            content: `
              <div style="max-width: 250px;">
                <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold;">${location.name}</h3>
                <p style="margin: 0 0 8px 0; font-size: 14px; color: #666;">${location.description}</p>
                <p style="margin: 0; font-size: 12px; color: #888;"><strong>Address:</strong> ${location.address}</p>
              </div>
            `
          });

          marker.addListener('click', () => {
            onLocationClick?.(location);
          });

          marker.addListener('mouseover', () => {
            infoWindow.open(mapInstance, marker);
          });

          marker.addListener('mouseout', () => {
            infoWindow.close();
          });
        });

        // Add center marker
        new google.maps.Marker({
          position: { lat: center.latitude, lng: center.longitude },
          map: mapInstance,
          title: 'Search Center',
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#1f2937',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2
          }
        });

        setIsLoading(false);
      } catch (err) {
        console.error('Error loading Google Maps:', err);
        setError('Failed to load map. Please check your internet connection.');
        setIsLoading(false);
      }
    };

    initMap();
  }, [locations, center, onLocationClick]);

  // Update map center when it changes
  useEffect(() => {
    if (map && center) {
      map.setCenter({ lat: center.latitude, lng: center.longitude });
    }
  }, [map, center]);

  // Handle focused location changes
  useEffect(() => {
    if (map && focusedLocation) {
      const lat = parseFloat(focusedLocation.latitude);
      const lng = parseFloat(focusedLocation.longitude);
      
      if (!isNaN(lat) && !isNaN(lng)) {
        map.setCenter({ lat, lng });
        map.setZoom(15);
      }
    }
  }, [focusedLocation, map]);

  if (error) {
    return (
      <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-8 min-h-[400px] flex flex-col items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p className="mb-2">Unable to load map</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div 
        ref={mapRef} 
        className="w-full h-[400px] rounded-lg"
        style={{ minHeight: '400px' }}
      />
      {isLoading && (
        <div className="absolute inset-0 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2" />
            <p>Loading map...</p>
          </div>
        </div>
      )}
    </div>
  );
}