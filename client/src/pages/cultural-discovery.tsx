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
import { MapPin, Heart, Search, Loader2, Star, Camera, Music, Palette, BookOpen, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [discoveryResults, setDiscoveryResults] = useState<DiscoveryLocation[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<DiscoveryLocation | null>(null);
  const [mapViewOpen, setMapViewOpen] = useState(false);
  const [currentSearchCenter, setCurrentSearchCenter] = useState<{ latitude: number; longitude: number; searchQuery?: string } | null>(null);

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

  // Fetch saved discoveries
  const { data: savedDiscoveriesData } = useQuery({
    queryKey: ["/api/saved-discoveries"],
  });

  // Discover new locations mutation
  const discoverLocationsMutation = useMutation({
    mutationFn: async (params: { latitude?: number; longitude?: number; searchQuery?: string }) => {
      return await apiRequest("POST", "/api/discover-locations", params);
    },
    onSuccess: (data, variables) => {
      setDiscoveryResults(data.locations || []);
      setCurrentSearchCenter({
        latitude: variables.latitude || 0,
        longitude: variables.longitude || 0,
        searchQuery: variables.searchQuery
      });
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

  const handleDiscoverNearby = () => {
    if (userLocation) {
      discoverLocationsMutation.mutate({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude
      });
    } else {
      toast({
        title: "Location Required",
        description: "Please enable location access to discover nearby places",
        variant: "destructive",
      });
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

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => setLocation('/')}
            className="p-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
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

      {/* Discovery Results */}
      {discoveryResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Discovery</CardTitle>
            <CardDescription>
              {discoveryResults.length} locations found {currentSearchCenter?.searchQuery ? `for "${currentSearchCenter.searchQuery}"` : 'near your location'}
            </CardDescription>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      )}

      {/* Tabs for different views */}
      <Tabs defaultValue="current-results" className="space-y-4">
        <TabsList>
          <TabsTrigger value="current-results">Current Results</TabsTrigger>
          <TabsTrigger value="favorites">Favorites</TabsTrigger>
          <TabsTrigger value="map-view">Map View</TabsTrigger>
        </TabsList>

        <TabsContent value="all-locations">
          <Card>
            <CardHeader>
              <CardTitle>Your Discovered Locations</CardTitle>
              <CardDescription>
                All cultural points of interest you've discovered
              </CardDescription>
            </CardHeader>
            <CardContent>
              {locationsLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {locationsData?.locations?.map((location: DiscoveryLocation) => (
                    <Card key={location.id} className="h-fit">
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
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleFavorite(location.id)}
                            className="text-muted-foreground hover:text-red-500"
                          >
                            <Heart className={`w-4 h-4 ${isFavorite(location.id) ? 'fill-current text-red-500' : ''}`} />
                          </Button>
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
                    <Card key={favorite.id} className="h-fit">
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
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleFavorite(location.id)}
                            className="text-red-500"
                          >
                            <Heart className="w-4 h-4 fill-current" />
                          </Button>
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

        <TabsContent value="saved-discoveries">
          <Card>
            <CardHeader>
              <CardTitle>Saved Discovery Sessions</CardTitle>
              <CardDescription>
                Your saved discovery sessions and collections
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {savedDiscoveriesData?.discoveries?.map((discovery: SavedDiscovery) => (
                  <Card key={discovery.id}>
                    <CardHeader>
                      <CardTitle className="text-lg">{discovery.name}</CardTitle>
                      <CardDescription>
                        {discovery.description || "No description"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="text-sm text-muted-foreground">
                        <strong>Search:</strong> {discovery.searchQuery}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <strong>Interests:</strong> {discovery.userInterests.join(", ") || "None specified"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Saved {new Date(discovery.createdAt).toLocaleDateString()}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}