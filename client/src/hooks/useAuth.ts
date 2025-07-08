import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { useEffect } from "react";
import { queryClient, getQueryFn } from "@/lib/queryClient";

export function useAuth() {
  const { data: user, isLoading, refetch, error } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }), // Return null instead of throwing on 401
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchInterval: false,
    staleTime: 5 * 60 * 1000, // 5 minutes - keep user authenticated longer
    gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache longer
  });

  // Listen for auth success from OAuth callback
  useEffect(() => {
    const handleAuthSuccess = () => {
      // Refetch user data after OAuth success
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      refetch();
    };

    // Check URL for auth success parameter
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('auth') === 'success') {
      handleAuthSuccess();
      // Clean up the URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // Listen for storage events (for multiple tab support)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth_change') {
        handleAuthSuccess();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [refetch]);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    refetch,
    error,
  };
}