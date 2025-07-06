import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
// import { Toaster } from "@/components/ui/toaster";
// import { TooltipProvider } from "@/components/ui/tooltip";
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
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <>
          <Route path="/" component={Landing} />
          <Route path="/auth" component={LoginPage} />
          <Route path="/register" component={RegisterPage} />
        </>
      ) : (
        <>
          <Route path="/" component={Home} />
          <Route path="/notes" component={Notes} />
          <Route path="/micro-courses" component={MicroCourses} />
          <Route path="/cultural-discovery" component={CulturalDiscovery} />
          <Route path="/success" component={Success} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
    </QueryClientProvider>
  );
}

export default App;