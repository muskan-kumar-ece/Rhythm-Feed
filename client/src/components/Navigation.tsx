import { useState } from "react";
import { Home, Search, Sparkles, TrendingUp, Mic2, PlusSquare, Shield, User } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const haptic = (ms: number | number[] = 8) => {
  try { navigator.vibrate(ms); } catch {}
};

export default function Navigation() {
  const [location]  = useLocation();
  const [tapped, setTapped] = useState<string | null>(null);
  const { state }   = useAuth();

  const role = state.status === "authenticated" ? state.user.role : "user";

  const baseItems = [
    { icon: Home,       label: "Feed",      href: "/" },
    { icon: Search,     label: "Search",    href: "/search" },
    { icon: Sparkles,   label: "Moments",   href: "/moments" },
    { icon: TrendingUp, label: "Trending",  href: "/trending" },
    { icon: Mic2,       label: "Spotlight", href: "/spotlight" },
  ];

  const studioItem =
    role === "artist" || role === "admin"
      ? [{ icon: PlusSquare, label: "Studio", href: "/artist/dashboard" }]
      : [];

  const adminItem =
    role === "admin"
      ? [{ icon: Shield, label: "Admin", href: "/admin" }]
      : [];

  const profileItem = [{ icon: User, label: "Profile", href: "/profile" }];

  const navItems = [...baseItems, ...studioItem, ...adminItem, ...profileItem];

  // Adapt icon + label sizing based on tab count
  const count = navItems.length;
  const iconSize   = count >= 8 ? 18 : count >= 7 ? 20 : 22;
  const labelClass = count >= 7 ? "text-[9px]" : "text-[10px]";

  const handleTap = (href: string) => {
    haptic([10, 5, 15]);
    setTapped(href);
    setTimeout(() => setTapped(null), 420);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 h-16 bg-background/85 backdrop-blur-2xl border-t border-white/5 flex items-center z-50 pb-safe overflow-x-auto no-scrollbar">
      {navItems.map((item) => {
        const Icon = item.icon;

        const isActive =
          (item.href === "/" && location === "/") ||
          (item.href !== "/" && location.startsWith(item.href)) ||
          (location.startsWith("/artist") && item.href.startsWith("/artist"));

        const isTapped  = tapped === item.href;
        const isAdmin   = item.label === "Admin";

        return (
          <Link
            key={item.href}
            href={item.href}
            data-testid={`nav-${item.label.toLowerCase()}`}
            onClick={() => handleTap(item.href)}
            className="flex flex-col items-center justify-center flex-1 min-w-0 h-full gap-0.5 relative select-none"
          >
            {/* Active glow pill */}
            {isActive && (
              <div
                className={cn(
                  "absolute top-2 w-9 h-7 rounded-full border",
                  isAdmin
                    ? "bg-amber-400/10 border-amber-400/20"
                    : "bg-primary/15 border-primary/20"
                )}
                style={{ animation: "nav-glow 2.5s ease-in-out infinite" }}
              />
            )}

            {/* Tap ring */}
            {isTapped && (
              <div
                className="absolute top-2 w-9 h-7 rounded-full border border-primary/60"
                style={{ animation: "glow-ring 0.4s ease-out forwards" }}
              />
            )}

            <Icon
              size={iconSize}
              strokeWidth={isActive ? 2.5 : 1.8}
              className={cn(
                "relative z-10 transition-colors duration-200",
                isActive
                  ? isAdmin ? "text-amber-400" : "text-primary"
                  : "text-white/40"
              )}
              style={isTapped ? { animation: "nav-bounce 0.4s cubic-bezier(0.36,0.07,0.19,0.97)" } : undefined}
            />

            <span
              className={cn(
                labelClass,
                "font-medium tracking-wide relative z-10 transition-colors duration-200 truncate w-full text-center px-0.5",
                isActive
                  ? isAdmin ? "text-amber-400" : "text-primary"
                  : "text-white/30"
              )}
            >
              {item.label}
            </span>

            {/* Active dot */}
            {isActive && (
              <div className={cn(
                "absolute bottom-1 w-1 h-1 rounded-full",
                isAdmin
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
