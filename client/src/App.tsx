import React, { useState, useEffect, Component } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Home from "@/pages/home";
import Landing from "@/pages/landing";
import AuthPage from "@/pages/auth-page";
import LoginPage from "@/pages/login-page";
import RegisterPage from "@/pages/register-page";
import Success from "@/pages/success";
import Notes from "@/pages/notes";
import MicroCourses from "./pages/micro-courses";
import CulturalDiscovery from "@/pages/cultural-discovery";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading, error } = useAuth();

  // Show loading for a maximum of 3 seconds to prevent infinite loading
  const [hasTimedOut, setHasTimedOut] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setHasTimedOut(true);
    }, 3000);
    
    return () => clearTimeout(timer);
  }, []);

  // Only show loading if we're actually loading and haven't timed out
  if (isLoading && !hasTimedOut && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Always render something - never return undefined
  return (
    <Switch>
      <Route path="/auth">
        {!isAuthenticated ? <AuthPage /> : <Home />}
      </Route>
      <Route path="/login">
        {!isAuthenticated ? <LoginPage /> : <Home />}
      </Route>
      <Route path="/register">
        {!isAuthenticated ? <RegisterPage /> : <Home />}
      </Route>
      <Route path="/notes">
        {isAuthenticated ? <Notes /> : <Landing />}
      </Route>
      <Route path="/micro-courses">
        {isAuthenticated ? <MicroCourses /> : <Landing />}
      </Route>
      <Route path="/cultural-discovery">
        {isAuthenticated ? <CulturalDiscovery /> : <Landing />}
      </Route>
      <Route path="/success">
        {isAuthenticated ? <Success /> : <Landing />}
      </Route>
      <Route path="/">
        {isAuthenticated ? <Home /> : <Landing />}
      </Route>
    </Switch>
  );
}

// Error Boundary Component
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Something went wrong</h1>
            <p className="text-gray-600 mb-4">Please refresh the page to try again.</p>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-primary hover:bg-primary/90 text-black font-bold py-2 px-4 rounded"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;