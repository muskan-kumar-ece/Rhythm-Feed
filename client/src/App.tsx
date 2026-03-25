import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Feed from "@/pages/Feed";
import ArtistPortal from "@/pages/ArtistPortal";
import Moments from "@/pages/Moments";
import Profile from "@/pages/Profile";
import Search from "@/pages/Search";
import Trending from "@/pages/Trending";
import AdminDashboard from "@/pages/AdminDashboard";
import Spotlight from "@/pages/Spotlight";
import Navigation from "@/components/Navigation";

function Router() {
  return (
    <div className="flex flex-col min-h-[100dvh] bg-background text-foreground overflow-hidden">
      <main className="flex-1 w-full max-w-md mx-auto relative bg-black shadow-2xl overflow-hidden shadow-white/5 border-x border-white/5">
        <Switch>
          <Route path="/" component={Feed} />
          <Route path="/search" component={Search} />
          <Route path="/trending" component={Trending} />
          <Route path="/artist/:tab?" component={ArtistPortal} />
          <Route path="/moments" component={Moments} />
          <Route path="/profile" component={Profile} />
          <Route path="/spotlight" component={Spotlight} />
          <Route path="/admin" component={AdminDashboard} />
          
          <Route component={NotFound} />
        </Switch>
        
        <Navigation />
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
