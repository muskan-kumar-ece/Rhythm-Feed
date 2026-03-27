import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import AuthGuard from "@/components/AuthGuard";
import RoleGuard from "@/components/RoleGuard";
import NotFound from "@/pages/not-found";
import Feed from "@/pages/Feed";
import ArtistPortal from "@/pages/ArtistPortal";
import Moments from "@/pages/Moments";
import Profile from "@/pages/Profile";
import Search from "@/pages/Search";
import Trending from "@/pages/Trending";
import AdminDashboard from "@/pages/AdminDashboard";
import Spotlight from "@/pages/Spotlight";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import Settings from "@/pages/Settings";
import PlaylistPage from "@/pages/PlaylistPage";
import Navigation from "@/components/Navigation";

const AUTH_ROUTES = ["/login", "/signup"];

function AppRoutes() {
  const [location] = useLocation();
  const isAuthRoute = AUTH_ROUTES.some(r => location.startsWith(r));

  return (
    <main className="flex-1 w-full max-w-md mx-auto relative bg-black shadow-2xl overflow-hidden shadow-white/5 border-x border-white/5">
      <Switch>
        {/* Public auth routes */}
        <Route path="/login"  component={Login} />
        <Route path="/signup" component={Signup} />

        {/* Public app routes — any authenticated user */}
        <Route path="/"        component={Feed} />
        <Route path="/search"  component={Search} />
        <Route path="/trending" component={Trending} />
        <Route path="/moments" component={Moments} />
        <Route path="/profile" component={Profile} />
        <Route path="/settings" component={Settings} />
        <Route path="/spotlight" component={Spotlight} />
        <Route path="/playlist/:id" component={PlaylistPage} />

        {/* Artist-only routes */}
        <Route path="/artist/:tab?">
          <RoleGuard roles={["artist", "admin"]}>
            <ArtistPortal />
          </RoleGuard>
        </Route>

        {/* Admin-only routes */}
        <Route path="/admin">
          <RoleGuard roles={["admin"]}>
            <AdminDashboard />
          </RoleGuard>
        </Route>

        <Route component={NotFound} />
      </Switch>

      {!isAuthRoute && <Navigation />}
    </main>
  );
}

function Router() {
  return (
    <div className="flex flex-col min-h-[100dvh] bg-background text-foreground overflow-hidden">
      <AuthGuard>
        <AppRoutes />
      </AuthGuard>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Router />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
