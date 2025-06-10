import { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

interface Location {
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
  locations: Location[];
  center: { latitude: number; longitude: number };
  onLocationClick?: (location: Location) => void;
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

export function GoogleMap({ locations, center, onLocationClick }: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initMap = async () => {
      if (!mapRef.current) return;

      try {
        const loader = new Loader({
          apiKey: import.meta.env.VITE_GOOGLE_API_KEY || '',
          version: 'weekly',
          libraries: ['maps', 'marker']
        });

        const { Map } = await loader.importLibrary('maps');
        const { AdvancedMarkerElement } = await loader.importLibrary('marker');

        const mapInstance = new Map(mapRef.current, {
          center: { lat: center.latitude, lng: center.longitude },
          zoom: 12,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          mapId: 'cultural-discovery-map'
        });

        setMap(mapInstance);

        // Add markers for each location
        locations.forEach((location) => {
          const lat = parseFloat(location.latitude);
          const lng = parseFloat(location.longitude);
          
          if (isNaN(lat) || isNaN(lng)) return;

          // Create a colored marker element
          const markerElement = document.createElement('div');
          markerElement.className = 'map-marker';
          markerElement.style.width = '24px';
          markerElement.style.height = '24px';
          markerElement.style.borderRadius = '50%';
          markerElement.style.border = '3px solid white';
          markerElement.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
          markerElement.style.cursor = 'pointer';
          markerElement.style.backgroundColor = categoryColors[location.category as keyof typeof categoryColors] || categoryColors.default;

          const marker = new AdvancedMarkerElement({
            map: mapInstance,
            position: { lat, lng },
            content: markerElement,
            title: location.name
          });

          // Add click handler
          markerElement.addEventListener('click', () => {
            onLocationClick?.(location);
          });

          // Create info window
          const infoWindow = new google.maps.InfoWindow({
            content: `
              <div style="max-width: 250px;">
                <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold;">${location.name}</h3>
                <p style="margin: 0 0 8px 0; font-size: 14px; color: #666;">${location.description}</p>
                <p style="margin: 0; font-size: 12px; color: #888;"><strong>Address:</strong> ${location.address}</p>
              </div>
            `
          });

          // Show info window on marker hover
          markerElement.addEventListener('mouseenter', () => {
            infoWindow.open(mapInstance, marker);
          });

          markerElement.addEventListener('mouseleave', () => {
            infoWindow.close();
          });
        });

        // Add center marker
        const centerMarkerElement = document.createElement('div');
        centerMarkerElement.style.width = '16px';
        centerMarkerElement.style.height = '16px';
        centerMarkerElement.style.borderRadius = '50%';
        centerMarkerElement.style.backgroundColor = '#1f2937';
        centerMarkerElement.style.border = '3px solid white';
        centerMarkerElement.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';

        new AdvancedMarkerElement({
          map: mapInstance,
          position: { lat: center.latitude, lng: center.longitude },
          content: centerMarkerElement,
          title: 'Search Center'
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