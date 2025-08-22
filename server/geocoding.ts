import { Client } from '@googlemaps/google-maps-services-js';

const client = new Client({});

interface GeocodeResult {
  latitude: number;
  longitude: number;
  formattedAddress?: string;
}

export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  try {
    const response = await client.geocode({
      params: {
        address: address,
        key: process.env.GOOGLE_MAPS_API_KEY!,
      },
    });

    if (response.data.results && response.data.results.length > 0) {
      const result = response.data.results[0];
      const location = result.geometry.location;
      
      return {
        latitude: location.lat,
        longitude: location.lng,
        formattedAddress: result.formatted_address,
      };
    }

    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

export async function geocodeVenue(venueName: string, city?: string): Promise<GeocodeResult | null> {
  try {
    // Construct a more specific address for venues
    const searchQuery = city ? `${venueName}, ${city}` : venueName;
    
    const response = await client.geocode({
      params: {
        address: searchQuery,
        key: process.env.GOOGLE_MAPS_API_KEY!,
      },
    });

    if (response.data.results && response.data.results.length > 0) {
      const result = response.data.results[0];
      const location = result.geometry.location;
      
      return {
        latitude: location.lat,
        longitude: location.lng,
        formattedAddress: result.formatted_address,
      };
    }

    return null;
  } catch (error) {
    console.error('Venue geocoding error:', error);
    return null;
  }
}