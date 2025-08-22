import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MapPin, Heart, Search, Loader2, Star, Camera, Music, Palette, BookOpen, ArrowLeft, Calendar, Clock, ExternalLink, MapPin as LocationIcon, Map, CalendarDays, Info } from "lucide-react";
import { useLocation } from "wouter";
import { GoogleMap } from "@/components/google-map";
import { MobileLayout } from "@/components/mobile-layout";
import { useIsMobile } from "@/hooks/use-mobile";
import { RefynLogo } from "@/components/refyn-logo";

interface DiscoveryLocation {
  id: number | string;
  name: string;
  description: string;
  latitude: string;
  longitude: string;
  address: string;
  category: string;
  culturalSignificance?: string;
  aiGenerated?: boolean;
  createdAt?: string;
  venue?: string;
  startDate?: string;
  endDate?: string;
  price?: string;
  website?: string;
  organizer?: string;
  isEvent?: boolean;
}

interface FavoriteLocation {
  id: number;
  locationId: number;
  notes?: string;
  createdAt: string;
}

interface SavedDiscovery {
  id: number;
  name: string;
  description: string;
  centerLatitude: string;
  centerLongitude: string;
  searchQuery: string;
  userInterests: string[];
  createdAt: string;
}

interface CulturalEvent {
  title: string;
  description: string;
  startDate: string;
  endDate?: string;
  venue: string;
  address: string;
  category: string;
  price?: string;
  website?: string;
  organizer?: string;
  latitude?: string;
  longitude?: string;
  geocoded?: boolean;
  formattedAddress?: string;
}

interface FavoriteEvent {
  id: number;
  userId: string;
  title: string;
  description: string;
  startDate: string;
  endDate?: string;
  venue: string;
  address: string;
  category: string;
  price?: string;
  website?: string;
  organizer?: string;
  notes?: string;
  createdAt: string;
}

const categoryIcons = {
  museum: <Palette className="w-4 h-4" />,
  gallery: <Camera className="w-4 h-4" />,
  historic_site: <MapPin className="w-4 h-4" />,
  performance_venue: <Music className="w-4 h-4" />,
  artist_studio: <Palette className="w-4 h-4" />,
  library: <BookOpen className="w-4 h-4" />,
  default: <Star className="w-4 h-4" />
};

export default function CulturalDiscovery() {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState("");
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [discoveryResults, setDiscoveryResults] = useState<DiscoveryLocation[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<DiscoveryLocation | null>(null);
  const [mapViewOpen, setMapViewOpen] = useState(false);
  const [currentSearchCenter, setCurrentSearchCenter] = useState<{ latitude: number; longitude: number; searchQuery?: string } | null>(null);
  const [mapCenter, setMapCenter] = useState<{ latitude: number; longitude: number } | null>(null);
  const [mapMode, setMapMode] = useState<'current' | 'favorites'>('current');
  const [focusedLocation, setFocusedLocation] = useState<DiscoveryLocation | null>(null);
  const [activeTab, setActiveTab] = useState<string>('locations');
  const [locationsView, setLocationsView] = useState<'all' | 'favorites'>('all');
  const [eventsView, setEventsView] = useState<'all' | 'favorites'>('all');
  const [mapDataType, setMapDataType] = useState<'locations' | 'events'>('locations');
  const [mapView, setMapView] = useState<'current' | 'favorites'>('current');
  const [discoveredEvents, setDiscoveredEvents] = useState<CulturalEvent[]>([]);
  const [eventsLocation, setEventsLocation] = useState<string>('');
  const [selectedEvent, setSelectedEvent] = useState<CulturalEvent | null>(null);

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
          console.log("Location obtained:", position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          console.log("Location access denied or failed:", error);
          toast({
            title: "Location Access",
            description: "Location access was denied. You can still search by city name.",
            variant: "destructive",
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000
        }
      );
    }
  }, [toast]);

  // Fetch discovered locations
  const { data: locationsData, isLoading: locationsLoading } = useQuery({
    queryKey: ["/api/discovered-locations"],
  });

  // Fetch favorite locations
  const { data: favoritesData } = useQuery({
    queryKey: ["/api/favorite-locations"],
  });

  // Fetch favorite events
  const { data: favoriteEventsData } = useQuery({
    queryKey: ["/api/favorite-events"],
  });

  // Fetch saved discoveries
  const { data: savedDiscoveriesData } = useQuery({
    queryKey: ["/api/saved-discoveries"],
  });

  // Discover new locations mutation
  const discoverLocationsMutation = useMutation({
    mutationFn: async (params: { latitude?: number; longitude?: number; searchQuery?: string }) => {
      const response = await apiRequest("POST", "/api/discover-locations", params);
      const data = await response.json();
      return data;
    },
    onSuccess: (data, variables) => {
      setDiscoveryResults(data.locations || []);
      
      // Set search center based on search type
      let centerLat = variables.latitude || 0;
      let centerLng = variables.longitude || 0;
      
      // If searching by location name and we have results, use the first result's coordinates
      if (variables.searchQuery && data.locations && data.locations.length > 0) {
        centerLat = parseFloat(data.locations[0].latitude);
        centerLng = parseFloat(data.locations[0].longitude);
      }
      
      setCurrentSearchCenter({
        latitude: centerLat,
        longitude: centerLng,
        searchQuery: variables.searchQuery
      });
      setMapCenter({
        latitude: centerLat,
        longitude: centerLng
      });
      setMapMode('current');
      setFocusedLocation(null);
      
      toast({
        title: "Locations Discovered",
        description: `Found ${data.locations?.length || 0} cultural points of interest`,
      });
    },
    onError: (error) => {
      toast({
        title: "Discovery Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Add to favorites mutation
  const addToFavoritesMutation = useMutation({
    mutationFn: async (params: { locationId: number; notes?: string }) => {
      return await apiRequest("POST", "/api/favorite-location", params);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorite-locations"] });
      toast({
        title: "Added to Favorites",
        description: "Location saved to your favorites",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to Favorite",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Remove from favorites mutation
  const removeFromFavoritesMutation = useMutation({
    mutationFn: async (locationId: number) => {
      return await apiRequest("DELETE", `/api/favorite-location/${locationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorite-locations"] });
      toast({
        title: "Removed from Favorites",
        description: "Location removed from your favorites",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to Remove",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Discover cultural events mutation
  const discoverEventsMutation = useMutation({
    mutationFn: async (params: { location: string; dateRange?: { start: string; end: string } }) => {
      const response = await apiRequest("POST", "/api/discover-events", params);
      const data = await response.json();
      return data;
    },
    onSuccess: (data, variables) => {
      setDiscoveredEvents(data.events || []);
      setEventsLocation(variables.location);
      
      toast({
        title: "Events Discovered",
        description: `Found ${data.events?.length || 0} cultural events in ${variables.location}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Events Discovery Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Add event to favorites mutation
  const addEventToFavoritesMutation = useMutation({
    mutationFn: async (event: CulturalEvent) => {
      return await apiRequest("POST", "/api/favorite-event", event);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorite-events"] });
      toast({
        title: "Added to Favorites",
        description: "Event saved to your favorites",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to Favorite",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const removeEventFromFavoritesMutation = useMutation({
    mutationFn: async (eventId: number) => {
      return await apiRequest("DELETE", `/api/favorite-event/${eventId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorite-events"] });
      toast({
        title: "Removed from Favorites",
        description: "Event removed from your favorites",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to Remove",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const removeFavoriteEvent = (eventId: number) => {
    removeEventFromFavoritesMutation.mutate(eventId);
  };



  const handleDiscoverNearby = () => {
    if (userLocation) {
      discoverLocationsMutation.mutate({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude
      });
    } else {
      // Retry getting location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setUserLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            });
            discoverLocationsMutation.mutate({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            });
          },
          (error) => {
            toast({
              title: "Location Access Required",
              description: "Please enable location access in your browser to discover nearby places, or search by city name instead.",
              variant: "destructive",
            });
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
        );
      } else {
        toast({
          title: "Location Not Supported",
          description: "Your browser doesn't support location services. Please search by city name instead.",
          variant: "destructive",
        });
      }
    }
  };

  const handleSearchLocation = () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Search Query Required",
        description: "Please enter a location to search",
        variant: "destructive",
      });
      return;
    }
    
    discoverLocationsMutation.mutate({ searchQuery });
  };

  const handleSearchEvents = () => {
    if (!eventsLocation.trim()) {
      toast({
        title: "Location Required",
        description: "Please enter a location to search for events",
        variant: "destructive",
      });
      return;
    }
    
    discoverEventsMutation.mutate({ location: eventsLocation });
  };

  const handleDiscoverNearbyEvents = () => {
    if (!userLocation) {
      toast({
        title: "Location Access Required",
        description: "Please enable location access to discover nearby events",
        variant: "destructive",
      });
      return;
    }

    // Create a location string from coordinates
    const locationString = `${userLocation.latitude}, ${userLocation.longitude}`;
    setEventsLocation(locationString);
    
    discoverEventsMutation.mutate({ location: locationString });
  };

  // Unified discovery function that fetches both locations and events
  const handleDiscoverUnified = () => {
    if (!userLocation) {
      // Try to get location first
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const newLocation = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            };
            setUserLocation(newLocation);
            
            // Fetch both locations and events
            const locationString = `${position.coords.latitude}, ${position.coords.longitude}`;
            discoverLocationsMutation.mutate(newLocation);
            discoverEventsMutation.mutate({ location: locationString });
            setEventsLocation(locationString);
            
            toast({
              title: "Discovering nearby culture",
              description: "Finding both places and events in your area...",
            });
          },
          (error) => {
            toast({
              title: "Location Access Required",
              description: "Please enable location access to discover nearby culture, or search by city name instead.",
              variant: "destructive",
            });
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
        );
      } else {
        toast({
          title: "Location Not Supported",
          description: "Your browser doesn't support location services. Please search by city name instead.",
          variant: "destructive",
        });
      }
    } else {
      // Use existing location
      const locationString = `${userLocation.latitude}, ${userLocation.longitude}`;
      discoverLocationsMutation.mutate(userLocation);
      discoverEventsMutation.mutate({ location: locationString });
      setEventsLocation(locationString);
      
      toast({
        title: "Discovering nearby culture",
        description: "Finding both places and events in your area...",
      });
    }
  };

  const handleLocationClick = (location: DiscoveryLocation) => {
    setSelectedLocation(location);
    setMapViewOpen(true);
  };

  const isFavorite = (locationId: number) => {
    return (favoritesData as any)?.favorites?.some((fav: FavoriteLocation) => fav.locationId === locationId);
  };

  const toggleFavorite = (locationId: number) => {
    if (isFavorite(locationId)) {
      removeFromFavoritesMutation.mutate(locationId);
    } else {
      addToFavoritesMutation.mutate({ locationId });
    }
  };

  // Helper to safely convert location ID to number
  const safeToggleFavorite = (location: DiscoveryLocation) => {
    const id = typeof location.id === 'string' ? parseInt(location.id) : location.id;
    toggleFavorite(id);
  };

  const isEventFavorited = (event: CulturalEvent) => {
    return (favoriteEventsData as any)?.favorites?.some((fav: FavoriteEvent) => 
      fav.title === event.title && fav.venue === event.venue && fav.startDate === event.startDate
    );
  };

  const toggleEventFavorite = (event: CulturalEvent) => {
    const favoriteEvent = (favoriteEventsData as any)?.favorites?.find((fav: FavoriteEvent) => 
      fav.title === event.title && fav.venue === event.venue && fav.startDate === event.startDate
    );
    
    if (favoriteEvent) {
      removeEventFromFavoritesMutation.mutate(favoriteEvent.id);
    } else {
      addEventToFavoritesMutation.mutate(event);
    }
  };

  const centerMapOnLocation = (location: DiscoveryLocation) => {
    setMapCenter({
      latitude: parseFloat(location.latitude),
      longitude: parseFloat(location.longitude)
    });
    setFocusedLocation(location);
    
    // Determine if this location is from favorites or current results
    const isFromFavorites = (favoritesData as any)?.favorites?.some((fav: any) => fav.locationId === location.id);
    if (isFromFavorites) {
      setMapMode('favorites');
    } else {
      setMapMode('current');
    }
    
    // Switch to map view tab
    setActiveTab('map-view');
  };

  const showAllCurrentResults = () => {
    if (currentSearchCenter) {
      setMapCenter(currentSearchCenter);
      setMapMode('current');
      setFocusedLocation(null);
    }
  };

  const showAllFavorites = () => {
    if (userLocation) {
      setMapCenter(userLocation);
      setMapMode('favorites');
      setFocusedLocation(null);
    }
  };

  // Convert events with accurate coordinates to event locations for map display
  // Only include events that have been properly geocoded with real coordinates
  const convertEventsToMapData = (events: CulturalEvent[]): any[] => {
    return events.filter(event => {
      // Only include events that have been successfully geocoded with accurate coordinates
      return event.latitude && event.longitude && event.geocoded;
    }).map((event, index) => ({
      id: `event-${index}`,
      name: event.title,
      description: event.description,
      latitude: event.latitude,
      longitude: event.longitude,
      address: event.formattedAddress || event.address,
      category: 'event',
      venue: event.venue,
      startDate: event.startDate,
      endDate: event.endDate,
      price: event.price,
      website: event.website,
      organizer: event.organizer,
      isEvent: true, // Flag to identify this as an event
      geocoded: event.geocoded
    }));
  };

  // Convert favorited events to map data for favorites view
  const convertFavoriteEventsToMapData = (favoriteEvents: FavoriteEvent[]): any[] => {
    return favoriteEvents.filter(event => {
      // Check if we have the original event data with coordinates
      const originalEvent = discoveredEvents.find(e => 
        e.title === event.title && e.venue === event.venue && e.startDate === event.startDate
      );
      return originalEvent && originalEvent.latitude && originalEvent.longitude && originalEvent.geocoded;
    }).map((event, index) => {
      const originalEvent = discoveredEvents.find(e => 
        e.title === event.title && e.venue === event.venue && e.startDate === event.startDate
      );
      return {
        id: `fav-event-${index}`,
        name: event.title,
        description: event.description,
        latitude: originalEvent!.latitude,
        longitude: originalEvent!.longitude,
        address: originalEvent!.formattedAddress || event.address,
        category: 'event',
        venue: event.venue,
        startDate: event.startDate,
        endDate: event.endDate,
        price: event.price,
        website: event.website,
        organizer: event.organizer,
        isEvent: true,
        isFavorite: true,
        notes: event.notes
      };
    });
  };

  const handleEventClick = (event: CulturalEvent) => {
    setSelectedEvent(event);
  };

  // Center map on event venue if it has coordinates
  const centerMapOnEvent = (event: CulturalEvent) => {
    if (event.latitude && event.longitude && event.geocoded) {
      setMapCenter({
        latitude: parseFloat(event.latitude),
        longitude: parseFloat(event.longitude)
      });
      setFocusedLocation({
        id: `event-${event.title}`,
        name: event.title,
        description: event.description,
        latitude: event.latitude,
        longitude: event.longitude,
        address: event.formattedAddress || event.address || '',
        category: 'event',
        venue: event.venue,
        startDate: event.startDate,
        endDate: event.endDate,
        price: event.price,
        website: event.website,
        organizer: event.organizer,
        isEvent: true
      } as any);
      setActiveTab('map-view');
      toast({
        title: "Event Located",
        description: `Centered map on ${event.title} at ${event.venue}`,
      });
    } else {
      setSelectedEvent(event);
      toast({
        title: "Event Selected",
        description: `Selected ${event.title} - location coordinates not available for map display.`,
      });
    }
  };

  const pageContent = (
    <div className="min-h-screen bg-background">
      {/* Header - only show on desktop */}
      {!isMobile && (
        <header className="bg-card border-b border-border px-3 sm:px-6 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <RefynLogo size={64} showTitle={true} />
            <Button
              variant="ghost"
              onClick={() => setLocation('/')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
          </div>
        </header>
      )}
      
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Cultural Discovery</h1>
            <p className="text-muted-foreground">
              Discover cultural and creative points of interest based on your location and interests
            </p>
          </div>
        </div>
        
        {/* Unified Discovery Button */}
        <div className="flex justify-center">
          <Button 
            onClick={handleDiscoverUnified}
            disabled={discoverLocationsMutation.isPending || discoverEventsMutation.isPending}
            size="lg"
            className="flex items-center gap-2 px-6 py-3"
          >
            {(discoverLocationsMutation.isPending || discoverEventsMutation.isPending) ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <MapPin className="w-5 h-5" />
            )}
            Find Culture Near Me
          </Button>
        </div>
      </div>

      {/* Tabs for different views */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="w-full">
          <TabsTrigger value="locations" className="flex-1">
            {isMobile ? (
              <>
                <MapPin className="w-4 h-4" />
                <span className="sr-only">Locations</span>
              </>
            ) : (
              <>
                <MapPin className="w-4 h-4 mr-2" />
                Locations
              </>
            )}
          </TabsTrigger>
          <TabsTrigger value="events" className="flex-1">
            {isMobile ? (
              <>
                <CalendarDays className="w-4 h-4" />
                <span className="sr-only">Events</span>
              </>
            ) : (
              <>
                <CalendarDays className="w-4 h-4 mr-2" />
                Events
              </>
            )}
          </TabsTrigger>
          <TabsTrigger value="map-view" className="flex-1">
            {isMobile ? (
              <>
                <Map className="w-4 h-4" />
                <span className="sr-only">Map View</span>
              </>
            ) : (
              <>
                <Map className="w-4 h-4 mr-2" />
                Map View
              </>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="locations">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="w-5 h-5" />
                    Discover Places
                  </CardTitle>
                  <CardDescription>
                    Find cultural landmarks, galleries, studios, and creative spaces
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={locationsView === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setLocationsView('all')}
                  >
                    {isMobile ? 'All' : 'All'}
                  </Button>
                  <Button
                    variant={locationsView === 'favorites' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setLocationsView('favorites')}
                  >
                    {isMobile ? (
                      <Heart className="w-4 h-4" />
                    ) : (
                      <>
                        <Heart className="w-4 h-4 mr-1" />
                        Favorites
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {locationsView === 'all' && (
                <>
                  {/* Search Controls */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter a city, neighborhood, or location..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearchLocation()}
                      className="flex-1"
                    />
                    <Button 
                      onClick={handleSearchLocation}
                      disabled={discoverLocationsMutation.isPending}
                    >
                      {discoverLocationsMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Search className="w-4 h-4" />
                      )}
                      Search
                    </Button>
                  </div>
                  
                  <div className="flex justify-center">
                    <Button 
                      variant="outline" 
                      onClick={handleDiscoverNearby}
                      disabled={discoverLocationsMutation.isPending || !userLocation}
                    >
                      {discoverLocationsMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <MapPin className="w-4 h-4 mr-2" />
                      )}
                      Discover Nearby Places
                    </Button>
                  </div>
                </>
              )}

              {/* Results */}
              {locationsView === 'all' ? (
                <>
                  {discoveryResults.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {discoveryResults.map((location) => (
                    <Card 
                      key={location.id} 
                      className="h-fit cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => handleLocationClick(location)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg leading-tight">
                              {location.name}
                            </CardTitle>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary" className="text-xs">
                                {categoryIcons[location.category as keyof typeof categoryIcons] || categoryIcons.default}
                                <span className="ml-1 capitalize">{location.category.replace('_', ' ')}</span>
                              </Badge>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                centerMapOnLocation(location);
                              }}
                              className="text-muted-foreground hover:text-blue-500"
                              title="Center map on this location"
                            >
                              <MapPin className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                safeToggleFavorite(location);
                              }}
                              className="text-muted-foreground hover:text-red-500"
                            >
                              <Heart className={`w-4 h-4 ${isFavorite(typeof location.id === 'string' ? parseInt(location.id) : location.id) ? 'fill-current text-red-500' : ''}`} />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-3">
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {location.description}
                        </p>
                        <div className="text-xs text-muted-foreground">
                          <MapPin className="w-3 h-3 inline mr-1" />
                          {location.address}
                        </div>
                        <div className="text-xs">
                          <strong>Cultural Significance:</strong>
                          <p className="mt-1 text-muted-foreground">
                            {location.culturalSignificance}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                  ) : (
                    <div className="text-center p-8 text-muted-foreground">
                      <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Search for a location or use "Discover Nearby Places" to see cultural points of interest here.</p>
                    </div>
                  )}
                </>
              ) : (
                // Favorites view - show favorited locations
                (favoritesData as any)?.favorites?.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {(favoritesData as any).favorites.map((favorite: any) => {
                      // Find the location data from stored locations or current results
                      const location = (locationsData as any)?.locations?.find((loc: DiscoveryLocation) => loc.id === favorite.locationId) || 
                                     discoveryResults.find((loc: DiscoveryLocation) => loc.id === favorite.locationId);
                      
                      // Skip if location data not found
                      if (!location) return null;
                      
                      return (
                        <Card 
                          key={location.id} 
                          className="h-fit cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => handleLocationClick(location)}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <CardTitle className="text-lg leading-tight">
                                  {location.name}
                                </CardTitle>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="secondary" className="text-xs">
                                    {categoryIcons[location.category as keyof typeof categoryIcons] || categoryIcons.default}
                                    <span className="ml-1 capitalize">{location.category.replace('_', ' ')}</span>
                                  </Badge>
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    centerMapOnLocation(location);
                                  }}
                                  className="text-muted-foreground hover:text-blue-500"
                                  title="Center map on this location"
                                >
                                  <MapPin className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    safeToggleFavorite(location);
                                  }}
                                  className="text-red-500"
                                >
                                  <Heart className="w-4 h-4 fill-current" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0 space-y-3">
                            <p className="text-sm text-muted-foreground line-clamp-3">
                              {location.description}
                            </p>
                            <div className="text-xs text-muted-foreground">
                              <MapPin className="w-3 h-3 inline mr-1" />
                              {location.address}
                            </div>
                            {favorite.notes && (
                              <div className="text-xs">
                                <strong>Your Notes:</strong>
                                <p className="mt-1 text-muted-foreground">
                                  {favorite.notes}
                                </p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center p-8 text-muted-foreground">
                    <Heart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No favorite locations yet. Heart some locations to see them here.</p>
                  </div>
                )
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Cultural Events
                  </CardTitle>
                  <CardDescription>
                    Discover cultural events and activities based on your interests
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={eventsView === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setEventsView('all')}
                  >
                    All
                  </Button>
                  <Button
                    variant={eventsView === 'favorites' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setEventsView('favorites')}
                  >
                    {isMobile ? (
                      <Heart className="w-4 h-4" />
                    ) : (
                      <>
                        <Heart className="w-4 h-4 mr-1" />
                        Favorites
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {eventsView === 'all' && (
                <>
                  {/* Events Search */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter a city or location for events..."
                      value={eventsLocation}
                      onChange={(e) => setEventsLocation(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearchEvents()}
                      className="flex-1"
                    />
                    <Button 
                      onClick={handleSearchEvents}
                      disabled={discoverEventsMutation.isPending}
                    >
                      {discoverEventsMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Search className="w-4 h-4" />
                      )}
                      Search Events
                    </Button>
              </div>

              <div className="flex justify-center">
                <Button 
                  variant="outline" 
                  onClick={handleDiscoverNearbyEvents}
                  disabled={discoverEventsMutation.isPending || !userLocation}
                >
                  {discoverEventsMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <MapPin className="w-4 h-4 mr-2" />
                  )}
                  Discover Nearby Events
                </Button>
              </div>

              {/* Events Results */}
              {discoveredEvents.length > 0 ? (
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    Found {discoveredEvents.length} events in {eventsLocation}
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    {discoveredEvents.map((event, index) => (
                      <Card key={index} className="h-fit">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-lg leading-tight">
                                {event.title}
                              </CardTitle>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className="text-xs">
                                  <Music className="w-3 h-3 mr-1" />
                                  {event.category}
                                </Badge>
                                {event.price && (
                                  <Badge variant="outline" className="text-xs">
                                    {event.price}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-1">
                              {event.website && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => window.open(event.website, '_blank')}
                                  className="text-muted-foreground hover:text-blue-500"
                                  title="Visit website"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleEventFavorite(event)}
                                className={isEventFavorited(event) ? "text-red-500" : "text-muted-foreground hover:text-red-500"}
                                title={isEventFavorited(event) ? "Remove from favorites" : "Add to favorites"}
                              >
                                <Heart className={`w-4 h-4 ${isEventFavorited(event) ? "fill-current" : ""}`} />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0 space-y-3">
                          <p className="text-sm text-muted-foreground line-clamp-3">
                            {event.description}
                          </p>
                          
                          <div className="space-y-2 text-xs">
                            <div className="flex items-center text-muted-foreground">
                              <Clock className="w-3 h-3 mr-1" />
                              {new Date(event.startDate).toLocaleDateString()}
                              {event.endDate && event.endDate !== event.startDate && (
                                <span> - {new Date(event.endDate).toLocaleDateString()}</span>
                              )}
                            </div>
                            
                            <div className="flex items-center text-muted-foreground">
                              <LocationIcon className="w-3 h-3 mr-1" />
                              {event.venue}
                            </div>
                            
                            {event.address && (
                              <div className="text-muted-foreground pl-4">
                                {event.address}
                              </div>
                            )}
                            
                            {event.organizer && (
                              <div className="text-muted-foreground">
                                <strong>Organizer:</strong> {event.organizer}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center p-8 text-muted-foreground">
                  <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Search for a location to discover cultural events and activities.</p>
                </div>
              )}
              </>
              )}

              {eventsView === 'favorites' && (
                // Favorites view - show favorited events
                (favoriteEventsData as any)?.favorites?.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {(favoriteEventsData as any).favorites.map((favoriteEvent: any, index: number) => (
                      <Card key={index} className="h-fit">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-lg leading-tight">
                                {favoriteEvent.title}
                              </CardTitle>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className="text-xs">
                                  <Music className="w-3 h-3 mr-1" />
                                  {favoriteEvent.category}
                                </Badge>
                                {favoriteEvent.price && (
                                  <Badge variant="outline" className="text-xs">
                                    {favoriteEvent.price}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-1">
                              {favoriteEvent.website && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => window.open(favoriteEvent.website, '_blank')}
                                  className="text-muted-foreground hover:text-blue-500"
                                  title="Visit website"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeFavoriteEvent(favoriteEvent.id)}
                                className="text-red-500"
                                title="Remove from favorites"
                              >
                                <Heart className="w-4 h-4 fill-current" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0 space-y-3">
                          <p className="text-sm text-muted-foreground line-clamp-3">
                            {favoriteEvent.description}
                          </p>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Clock className="w-3 h-3 mr-1" />
                            {new Date(favoriteEvent.startDate).toLocaleDateString()}
                            {favoriteEvent.endDate && favoriteEvent.endDate !== favoriteEvent.startDate && (
                              <span> - {new Date(favoriteEvent.endDate).toLocaleDateString()}</span>
                            )}
                          </div>
                          
                          <div className="flex items-center text-muted-foreground">
                            <LocationIcon className="w-3 h-3 mr-1" />
                            {favoriteEvent.venue}
                          </div>
                          
                          {favoriteEvent.notes && (
                            <div className="text-xs">
                              <strong>Your Notes:</strong>
                              <p className="mt-1 text-muted-foreground">
                                {favoriteEvent.notes}
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-8 text-muted-foreground">
                    <Heart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No favorite events yet. Heart some events to see them here.</p>
                  </div>
                )
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="map-view">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Map View</CardTitle>
                  <CardDescription>
                    {discoveryResults.length > 0 && currentSearchCenter
                      ? `Showing ${discoveryResults.length} locations on the map`
                      : "Search for locations to see them on the map"
                    }
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={mapView === 'current' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setMapView('current')}
                  >
                    {isMobile ? (
                      <Search className="w-4 h-4" />
                    ) : (
                      <>
                        <Search className="w-4 h-4 mr-1" />
                        Current Results
                      </>
                    )}
                  </Button>
                  <Button
                    variant={mapView === 'favorites' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setMapView('favorites')}
                  >
                    {isMobile ? (
                      <Heart className="w-4 h-4" />
                    ) : (
                      <>
                        <Heart className="w-4 h-4 mr-1" />
                        Favorites
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {(discoveryResults.length > 0 || discoveredEvents.length > 0) || mapView === 'favorites' ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {mapView === 'favorites' 
                      ? (() => {
                          const favLocations = (favoritesData as any)?.favorites?.length || 0;
                          const favEvents = convertFavoriteEventsToMapData((favoriteEventsData as any)?.favorites || []).length;
                          return `Showing ${favLocations} favorite locations and ${favEvents} favorite events on the map`;
                        })()
                      : (() => {
                          const geocodedEvents = convertEventsToMapData(discoveredEvents);
                          return `Showing ${discoveryResults.length} locations (color-coded) and ${geocodedEvents.length} geocoded events (red markers)`;
                        })()
                    }
                  </p>

                  {/* Google Map */}
                  <GoogleMap
                    locations={mapView === 'current' ? 
                      [...discoveryResults, ...convertEventsToMapData(discoveredEvents)] : 
                      [
                        ...((favoritesData as any)?.favorites?.map((fav: FavoriteLocation) => {
                          return (locationsData as any)?.locations?.find((loc: DiscoveryLocation) => loc.id === fav.locationId);
                        }).filter(Boolean) || []),
                        ...convertFavoriteEventsToMapData((favoriteEventsData as any)?.favorites || [])
                      ]}
                    center={mapView === 'favorites' && ((favoritesData as any)?.favorites?.length > 0 || (favoriteEventsData as any)?.favorites?.length > 0) ? 
                      (() => {
                        // Try to get first favorite location
                        const firstFavLocation = ((favoritesData as any)?.favorites?.[0]);
                        if (firstFavLocation) {
                          const firstLocation = (locationsData as any)?.locations?.find((loc: DiscoveryLocation) => loc.id === firstFavLocation.locationId);
                          if (firstLocation) {
                            return { latitude: parseFloat(firstLocation.latitude), longitude: parseFloat(firstLocation.longitude) };
                          }
                        }
                        
                        // Try to get first favorite event with coordinates
                        const firstFavEvent = ((favoriteEventsData as any)?.favorites?.[0]);
                        if (firstFavEvent) {
                          const originalEvent = discoveredEvents.find(e => 
                            e.title === firstFavEvent.title && e.venue === firstFavEvent.venue && e.startDate === firstFavEvent.startDate
                          );
                          if (originalEvent && originalEvent.latitude && originalEvent.longitude) {
                            return { latitude: parseFloat(originalEvent.latitude), longitude: parseFloat(originalEvent.longitude) };
                          }
                        }
                        
                        return null;
                      })() || { latitude: 53.683, longitude: -1.496 } :
                      mapCenter || currentSearchCenter || userLocation || { latitude: 53.683, longitude: -1.496 }}
                    onLocationClick={handleLocationClick}
                    focusedLocation={focusedLocation}
                  />
                  
                  {/* Location list for map legend */}
                  <div>
                    <h4 className="text-sm font-medium mb-3">
                      {mapView === 'favorites' ? 'Favorite Locations & Events on Map' : 'Current Locations & Events on Map'}
                    </h4>
                    <div className="grid gap-2 max-h-64 overflow-y-auto">
                      {(mapView === 'current' ? 
                        [...discoveryResults, ...convertEventsToMapData(discoveredEvents)] : 
                        [
                          ...((favoritesData as any)?.favorites?.map((fav: FavoriteLocation) => {
                            return (locationsData as any)?.locations?.find((loc: DiscoveryLocation) => loc.id === fav.locationId);
                          }).filter(Boolean) || []),
                          ...convertFavoriteEventsToMapData((favoriteEventsData as any)?.favorites || [])
                        ]
                      ).map((location: DiscoveryLocation, index: number) => (
                        <div 
                          key={location.id}
                          className="flex items-center gap-3 p-3 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                          onClick={() => {
                            // Just center the map on this location when clicked
                            setMapCenter({ latitude: parseFloat(location.latitude), longitude: parseFloat(location.longitude) });
                            setFocusedLocation(location);
                          }}
                        >
                          <div 
                            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium text-white"
                            style={{ 
                              backgroundColor: 
                                location.category === 'museum' ? '#8B5CF6' :
                                location.category === 'gallery' ? '#06B6D4' :
                                location.category === 'historic_site' ? '#F59E0B' :
                                location.category === 'performance_venue' ? '#EF4444' :
                                location.category === 'artist_studio' ? '#10B981' :
                                location.category === 'library' ? '#3B82F6' :
                                location.category === 'creative_district' ? '#F97316' :
                                location.category === 'community_space' ? '#84CC16' :
                                '#6B7280'
                            }}
                          >
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{location.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{location.address}</p>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {categoryIcons[location.category as keyof typeof categoryIcons] || categoryIcons.default}
                          </Badge>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleLocationClick(location);
                              }}
                              className="text-muted-foreground hover:text-blue-500"
                              title="View location information"
                            >
                              <Info className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                safeToggleFavorite(location);
                              }}
                              className="text-muted-foreground hover:text-red-500"
                            >
                              <Heart className={`w-4 h-4 ${isFavorite(typeof location.id === 'string' ? parseInt(location.id) : location.id) ? 'fill-current text-red-500' : ''}`} />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center p-8 text-muted-foreground">
                  {mapDataType === 'events' ? (
                    <>
                      <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Search for events in the Events tab first, then switch to Events view here to see them on the map.</p>
                    </>
                  ) : (
                    <>
                      <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Search for a location to see it on the map with discovered cultural points of interest.</p>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Location Detail Modal */}
      <Dialog open={!!selectedLocation} onOpenChange={() => setSelectedLocation(null)}>
        <DialogContent className="max-w-2xl">
          {selectedLocation && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {categoryIcons[selectedLocation.category as keyof typeof categoryIcons] || categoryIcons.default}
                  {selectedLocation.name}
                </DialogTitle>
                <DialogDescription>
                  <Badge variant="secondary" className="text-xs">
                    <span className="capitalize">{selectedLocation.category.replace('_', ' ')}</span>
                  </Badge>
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-sm text-muted-foreground">{selectedLocation.description}</p>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Location</h4>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {selectedLocation.address}
                  </p>
                  {selectedLocation.latitude !== "0" && selectedLocation.longitude !== "0" && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Coordinates: {selectedLocation.latitude}, {selectedLocation.longitude}
                    </p>
                  )}
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Cultural Significance</h4>
                  <p className="text-sm text-muted-foreground">{selectedLocation.culturalSignificance}</p>
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button
                    variant={isFavorite(selectedLocation.id) ? "default" : "outline"}
                    onClick={() => toggleFavorite(selectedLocation.id)}
                    className="flex-1"
                  >
                    <Heart className={`w-4 h-4 mr-2 ${isFavorite(selectedLocation.id) ? 'fill-current' : ''}`} />
                    {isFavorite(selectedLocation.id) ? 'Favorited' : 'Add to Favorites'}
                  </Button>
                  <Button variant="outline" onClick={() => setSelectedLocation(null)}>
                    Close
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Event Detail Modal */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="max-w-2xl">
          {selectedEvent && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  {selectedEvent.title}
                </DialogTitle>
                <DialogDescription>
                  <div className="flex gap-2">
                    <Badge variant="secondary" className="text-xs">
                      <Music className="w-3 h-3 mr-1" />
                      {selectedEvent.category}
                    </Badge>
                    {selectedEvent.price && (
                      <Badge variant="outline" className="text-xs">
                        {selectedEvent.price}
                      </Badge>
                    )}
                  </div>
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-sm text-muted-foreground">{selectedEvent.description}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Date</h4>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(selectedEvent.startDate).toLocaleDateString()}
                      {selectedEvent.endDate && selectedEvent.endDate !== selectedEvent.startDate && (
                        <span> - {new Date(selectedEvent.endDate).toLocaleDateString()}</span>
                      )}
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Venue</h4>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {selectedEvent.venue}
                    </p>
                    {selectedEvent.address && (
                      <p className="text-xs text-muted-foreground mt-1">{selectedEvent.address}</p>
                    )}
                  </div>
                </div>
                
                {selectedEvent.organizer && (
                  <div>
                    <h4 className="font-medium mb-2">Organizer</h4>
                    <p className="text-sm text-muted-foreground">{selectedEvent.organizer}</p>
                  </div>
                )}
                
                <div className="flex gap-2 pt-4">
                  <Button
                    variant={isEventFavorited(selectedEvent) ? "default" : "outline"}
                    onClick={() => toggleEventFavorite(selectedEvent)}
                    className="flex-1"
                  >
                    <Heart className={`w-4 h-4 mr-2 ${isEventFavorited(selectedEvent) ? 'fill-current' : ''}`} />
                    {isEventFavorited(selectedEvent) ? 'Favorited' : 'Add to Favorites'}
                  </Button>
                  {selectedEvent.website && selectedEvent.website !== 'Not found' && (
                    <Button 
                      variant="outline" 
                      onClick={() => window.open(selectedEvent.website, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Visit Website
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => setSelectedEvent(null)}>
                    Close
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );

  if (isMobile) {
    return <MobileLayout>{pageContent}</MobileLayout>;
  }

  return pageContent;
}
