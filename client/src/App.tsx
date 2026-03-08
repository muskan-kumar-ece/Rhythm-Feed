import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Feed from "@/pages/Feed";
import ArtistPortal from "@/pages/ArtistPortal";
import Navigation from "@/components/Navigation";

function Router() {
  return (
    <div className="flex flex-col min-h-[100dvh] bg-background text-foreground overflow-hidden">
      <main className="flex-1 w-full max-w-md mx-auto relative bg-black shadow-2xl overflow-hidden shadow-white/5 border-x border-white/5">
        <Switch>
          <Route path="/" component={Feed} />
          <Route path="/artist/:tab?" component={ArtistPortal} />
          
          {/* Fallback mock routes */}
          <Route path="/discover">
            <div className="p-8 pt-20 text-center"><h2 className="text-2xl font-display font-bold">Discover</h2><p className="text-muted-foreground mt-2">Find your next obsession.</p></div>
          </Route>
          <Route path="/profile">
            <div className="p-8 pt-20 text-center"><h2 className="text-2xl font-display font-bold">Profile</h2><p className="text-muted-foreground mt-2">Your saved sounds.</p></div>
          </Route>
          
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
