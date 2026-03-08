import { Home, Compass, PlusSquare, BarChart2, User } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

export default function Navigation() {
  const [location] = useLocation();

  const navItems = [
    { icon: Home, label: "Feed", href: "/" },
    { icon: Compass, label: "Discover", href: "/discover" },
    { icon: PlusSquare, label: "Upload", href: "/artist/upload" },
    { icon: BarChart2, label: "Analytics", href: "/artist/dashboard" },
    { icon: User, label: "Profile", href: "/profile" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 h-16 bg-background/80 backdrop-blur-xl border-t border-white/5 flex items-center justify-around px-4 z-50 pb-safe">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = location === item.href || (location.startsWith('/artist') && item.href.startsWith('/artist') && location !== '/' && item.href !== '/');
        
        return (
          <Link key={item.href} href={item.href}>
            <a className={cn(
              "flex flex-col items-center justify-center w-16 h-full gap-1 transition-colors duration-200",
              isActive ? "text-primary" : "text-muted-foreground hover:text-white"
            )}>
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} className={cn("transition-transform duration-200", isActive && "scale-110")} />
              <span className="text-[10px] font-medium tracking-wide">{item.label}</span>
            </a>
          </Link>
        );
      })}
    </div>
  );
}