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
import { MapPin, Heart, Search, Loader2, Star, Camera, Music, Palette, BookOpen, ArrowLeft, Calendar, Clock, ExternalLink, MapPin as LocationIcon } from "lucide-react";
import { useLocation } from "wouter";
import { GoogleMap } from "@/components/google-map";
import { MobileLayout } from "@/components/mobile-layout";
import { useIsMobile } from "@/hooks/use-mobile";
import { RefynLogo } from "@/components/refyn-logo";

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
  const [activeTab, setActiveTab] = useState<string>('current-results');
  const [eventsResults, setEventsResults] = useState<CulturalEvent[]>([]);
  const [eventsLocation, setEventsLocation] = useState<string>('');

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
      setEventsResults(data.events || []);
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

  // Remove event from favorites mutation
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

  const handleLocationClick = (location: DiscoveryLocation) => {
    setSelectedLocation(location);
    setMapViewOpen(true);
  };

  const isFavorite = (locationId: number) => {
    return favoritesData?.favorites?.some((fav: FavoriteLocation) => fav.locationId === locationId);
  };

  const toggleFavorite = (locationId: number) => {
    if (isFavorite(locationId)) {
      removeFromFavoritesMutation.mutate(locationId);
    } else {
      addToFavoritesMutation.mutate({ locationId });
    }
  };

  const isEventFavorited = (event: CulturalEvent) => {
    return favoriteEventsData?.favorites?.some((fav: FavoriteEvent) => 
      fav.title === event.title && fav.venue === event.venue && fav.startDate === event.startDate
    );
  };

  const toggleEventFavorite = (event: CulturalEvent) => {
    const favoriteEvent = favoriteEventsData?.favorites?.find((fav: FavoriteEvent) => 
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
    const isFromFavorites = favoritesData?.favorites?.some((fav: any) => fav.locationId === location.id);
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
      </div>

      {/* Search Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Discover New Places
          </CardTitle>
          <CardDescription>
            Find cultural landmarks, galleries, studios, and creative spaces
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
        </CardContent>
      </Card>



      {/* Tabs for different views */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="current-results">Locations</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="favorites">Favorites</TabsTrigger>
          <TabsTrigger value="favorite-events">Favorite Events</TabsTrigger>
          <TabsTrigger value="map-view">Map View</TabsTrigger>
        </TabsList>

        <TabsContent value="current-results">
          <Card>
            <CardHeader>
              <CardTitle>Current Search Results</CardTitle>
              <CardDescription>
                {discoveryResults.length > 0 
                  ? `${discoveryResults.length} locations from your most recent search`
                  : "No search results yet. Try searching for a location above."
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
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
                                toggleFavorite(location.id);
                              }}
                              className="text-muted-foreground hover:text-red-500"
                            >
                              <Heart className={`w-4 h-4 ${isFavorite(location.id) ? 'fill-current text-red-500' : ''}`} />
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Cultural Events
              </CardTitle>
              <CardDescription>
                Discover cultural events and activities based on your interests
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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

              {/* Events Results */}
              {eventsResults.length > 0 ? (
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    Found {eventsResults.length} events in {eventsLocation}
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    {eventsResults.map((event, index) => (
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="favorites">
          <Card>
            <CardHeader>
              <CardTitle>Favorite Locations</CardTitle>
              <CardDescription>
                Places you've marked as favorites
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {favoritesData?.favorites?.map((favorite: FavoriteLocation) => {
                  const location = locationsData?.locations?.find((loc: DiscoveryLocation) => loc.id === favorite.locationId);
                  if (!location) return null;
                  
                  return (
                    <Card 
                      key={favorite.id} 
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
                                toggleFavorite(location.id);
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="favorite-events">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5" />
                Favorite Events
              </CardTitle>
              <CardDescription>
                Events you've saved for later
              </CardDescription>
            </CardHeader>
            <CardContent>
              {favoriteEventsData?.favorites && favoriteEventsData.favorites.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {favoriteEventsData.favorites.map((favoriteEvent: FavoriteEvent) => (
                    <Card key={favoriteEvent.id} className="h-fit">
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
                              onClick={() => removeEventFromFavoritesMutation.mutate(favoriteEvent.id)}
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
                        
                        <div className="space-y-2 text-xs">
                          <div className="flex items-center text-muted-foreground">
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
                          
                          {favoriteEvent.address && (
                            <div className="text-muted-foreground pl-4">
                              {favoriteEvent.address}
                            </div>
                          )}
                          
                          {favoriteEvent.organizer && (
                            <div className="text-muted-foreground">
                              <strong>Organizer:</strong> {favoriteEvent.organizer}
                            </div>
                          )}

                          {favoriteEvent.notes && (
                            <div className="text-xs">
                              <strong>Your Notes:</strong>
                              <p className="mt-1 text-muted-foreground">
                                {favoriteEvent.notes}
                              </p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center p-8 text-muted-foreground">
                  <Heart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No favorite events yet. Heart events you'd like to save for later!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="map-view">
          <Card>
            <CardHeader>
              <CardTitle>Map View</CardTitle>
              <CardDescription>
                {discoveryResults.length > 0 && currentSearchCenter
                  ? `Showing ${discoveryResults.length} locations on the map`
                  : "Search for locations to see them on the map"
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(discoveryResults.length > 0 && currentSearchCenter) || 
               (favoritesData?.favorites && favoritesData.favorites.length > 0) || 
               focusedLocation ? (
                <div className="space-y-4">
                  {/* Map Controls */}
                  <div className="flex gap-2 mb-4">
                    <Button
                      variant={mapMode === 'current' ? 'default' : 'outline'}
                      size="sm"
                      onClick={showAllCurrentResults}
                      disabled={!currentSearchCenter}
                    >
                      Show All Current Results
                    </Button>
                    <Button
                      variant={mapMode === 'favorites' ? 'default' : 'outline'}
                      size="sm"
                      onClick={showAllFavorites}
                      disabled={!userLocation}
                    >
                      Show All Favorites
                    </Button>
                  </div>

                  {/* Google Map */}
                  <GoogleMap
                    locations={mapMode === 'current' ? discoveryResults : (favoritesData?.favorites?.map((fav: FavoriteLocation) => {
                      return locationsData?.locations?.find((loc: DiscoveryLocation) => loc.id === fav.locationId);
                    }).filter(Boolean) || [])}
                    center={mapCenter || currentSearchCenter || userLocation || { latitude: 53.683, longitude: -1.496 }}
                    onLocationClick={handleLocationClick}
                    focusedLocation={focusedLocation}
                  />
                  
                  {/* Location list for map legend */}
                  <div>
                    <h4 className="text-sm font-medium mb-3">Locations on Map</h4>
                    <div className="grid gap-2 max-h-64 overflow-y-auto">
                      {discoveryResults.map((location, index) => (
                        <div 
                          key={location.id}
                          className="flex items-center gap-3 p-3 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                          onClick={() => handleLocationClick(location)}
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
                                toggleFavorite(location.id);
                              }}
                              className="text-muted-foreground hover:text-red-500"
                            >
                              <Heart className={`w-4 h-4 ${isFavorite(location.id) ? 'fill-current text-red-500' : ''}`} />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center p-8 text-muted-foreground">
                  <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Search for a location to see it on the map with discovered cultural points of interest.</p>
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
    </div>
  );

  if (isMobile) {
    return <MobileLayout>{pageContent}</MobileLayout>;
  }

  return pageContent;
}