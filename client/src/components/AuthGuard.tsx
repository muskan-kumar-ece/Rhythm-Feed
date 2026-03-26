import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

const PUBLIC_ROUTES = ["/login", "/signup"];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { state } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (state.status === "loading") return;
    const isPublic = PUBLIC_ROUTES.some(r => location.startsWith(r));
    if (state.status === "unauthenticated" && !isPublic) {
      setLocation("/login");
    }
    if (state.status === "authenticated" && isPublic) {
      setLocation("/");
    }
  }, [state.status, location, setLocation]);

  if (state.status === "loading") {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="text-primary animate-spin" />
          <p className="text-white/30 text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  const isPublic = PUBLIC_ROUTES.some(r => location.startsWith(r));
  if (state.status === "unauthenticated" && !isPublic) return null;

  return <>{children}</>;
}
