import { Link } from "wouter";
import { Music2, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background px-6 relative overflow-hidden page-enter">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-primary/8 blur-[100px] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-6">
          <Music2 size={32} className="text-primary/70" />
        </div>

        <h1 className="text-7xl font-display font-bold gradient-text mb-3">404</h1>
        <h2 className="text-xl font-bold text-white mb-2">Page Not Found</h2>
        <p className="text-white/40 text-sm max-w-xs leading-relaxed mb-8">
          This page doesn't exist or was removed. Head back to the feed and keep listening.
        </p>

        <Link
          href="/"
          className="flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-violet-600 to-pink-600 text-white font-semibold text-sm hover:brightness-110 hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all active:scale-[0.97]"
        >
          <Home size={16} />
          Back to Feed
        </Link>
      </div>
    </div>
  );
}
