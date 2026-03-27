import { useState } from "react";
import { Home, Mic2, Shield, PlusSquare, User, TrendingUp } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const haptic = (ms: number | number[] = 8) => {
  try { navigator.vibrate(ms); } catch {}
};

export default function Navigation() {
  const [location]     = useLocation();
  const [tapped, setTapped] = useState<string | null>(null);
  const { state }      = useAuth();

  const role = state.status === "authenticated" ? state.user.role : "user";

  const baseItems = [
    { icon: Home,       label: "Feed",      href: "/" },
    { icon: TrendingUp, label: "Trending",  href: "/trending" },
    { icon: Mic2,       label: "Spotlight", href: "/spotlight" },
  ];

  // Artist and admin see the Studio tab
  const studioItem =
    role === "artist" || role === "admin"
      ? [{ icon: PlusSquare, label: "Studio", href: "/artist/dashboard" }]
      : [];

  // Admin additionally gets a dedicated Admin tab (replaces Profile to keep 5 items)
  const adminItem =
    role === "admin"
      ? [{ icon: Shield, label: "Admin", href: "/admin" }]
      : [];

  // Profile always last
  const profileItem = [{ icon: User, label: "Profile", href: "/profile" }];

  const navItems = [...baseItems, ...studioItem, ...adminItem, ...profileItem];

  const handleTap = (href: string) => {
    haptic([10, 5, 15]);
    setTapped(href);
    setTimeout(() => setTapped(null), 420);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 h-16 bg-background/85 backdrop-blur-2xl border-t border-white/5 flex items-center justify-around px-2 z-50 pb-safe">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          location === item.href ||
          (location.startsWith("/artist") && item.href.startsWith("/artist") && location !== "/" && item.href !== "/") ||
          (location === "/trending"       && item.href === "/trending") ||
          (location === "/spotlight"      && item.href === "/spotlight") ||
          (location === "/admin"          && item.href === "/admin");
        const isTapped = tapped === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            data-testid={`nav-${item.label.toLowerCase()}`}
            onClick={() => handleTap(item.href)}
            className="flex flex-col items-center justify-center w-[20%] h-full gap-1 relative select-none"
          >
            {/* Active glow pill behind icon */}
            {isActive && (
              <div
                className="absolute top-2 w-10 h-8 rounded-full bg-primary/15 border border-primary/20"
                style={{ animation: "nav-glow 2.5s ease-in-out infinite" }}
              />
            )}

            {/* Expanding ring on tap */}
            {isTapped && (
              <div
                className="absolute top-2 w-10 h-8 rounded-full border border-primary/60"
                style={{ animation: "glow-ring 0.4s ease-out forwards" }}
              />
            )}

            <Icon
              size={24}
              strokeWidth={isActive ? 2.5 : 1.8}
              className={cn(
                "relative z-10 transition-colors duration-200",
                isActive
                  ? item.label === "Admin" ? "text-amber-400" : "text-primary"
                  : "text-white/40"
              )}
              style={isTapped ? { animation: "nav-bounce 0.4s cubic-bezier(0.36,0.07,0.19,0.97)" } : undefined}
            />

            <span
              className={cn(
                "text-[10px] font-medium tracking-wide relative z-10 transition-colors duration-200",
                isActive
                  ? item.label === "Admin" ? "text-amber-400" : "text-primary"
                  : "text-white/30"
              )}
            >
              {item.label}
            </span>

            {/* Active dot */}
            {isActive && (
              <div className={cn(
                "absolute bottom-1 w-1 h-1 rounded-full",
                item.label === "Admin"
                  ? "bg-amber-400 shadow-[0_0_6px_2px_rgba(251,191,36,0.7)]"
                  : "bg-primary shadow-[0_0_6px_2px_rgba(168,85,247,0.7)]"
              )} />
            )}
          </Link>
        );
      })}
    </div>
  );
}
