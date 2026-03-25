import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, ApiSong } from "@/lib/api";
import { Bot, Music2, ChevronRight, Sparkles, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import RythamLogo from "@/components/RythamLogo";

interface AIDJIntroProps {
  onReady: (playlist: ApiSong[], greeting: string, theme: string) => void;
  /** Onboarding prefs for first-time users — used to generate a cold-start personalized session. */
  prefs?: { moods: string[]; genres: string[] } | null;
}

type Phase = "loading" | "analyzing" | "reveal" | "starting";

const ANALYZING_STEPS_NEW = [
  "Locking in your moods & genres…",
  "Finding your perfect match…",
  "Curating your starter playlist…",
  "Your vibe is ready",
];

const ANALYZING_STEPS_RETURN = [
  "Reading your listening history…",
  "Detecting your current vibe…",
  "Curating your personal playlist…",
  "DJ session ready",
];

const MOOD_COLORS: Record<string, string> = {
  chill:       "from-blue-500/30 to-cyan-400/20",
  focus:       "from-violet-500/30 to-indigo-400/20",
  study:       "from-indigo-500/30 to-blue-400/20",
  hype:        "from-orange-500/30 to-red-400/20",
  gym:         "from-red-500/30 to-orange-400/20",
  sad:         "from-slate-500/30 to-blue-600/20",
  "night drive": "from-purple-600/30 to-blue-500/20",
  default:     "from-primary/30 to-accent/20",
};

export default function AIDJIntro({ onReady, prefs }: AIDJIntroProps) {
  const [phase, setPhase]           = useState<Phase>("loading");
  const [stepIndex, setStepIndex]   = useState(0);

  const ANALYZING_STEPS = prefs ? ANALYZING_STEPS_NEW : ANALYZING_STEPS_RETURN;

  const { data: session, isSuccess } = useQuery({
    queryKey: ["ai-dj-session", prefs ? JSON.stringify(prefs) : ""],
    queryFn:  () => api.getAIDJSession(prefs),
    staleTime: Infinity,
  });

  // Animate through analyzing steps once data is in
  useEffect(() => {
    if (!isSuccess) return;
    setPhase("analyzing");
    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step >= ANALYZING_STEPS.length) {
        clearInterval(interval);
        setTimeout(() => setPhase("reveal"), 200);
        return;
      }
      setStepIndex(step);
    }, 480);
    return () => clearInterval(interval);
  }, [isSuccess]);

  const moodKey = session?.dominantMood?.toLowerCase() ?? "default";
  const gradientClass = MOOD_COLORS[moodKey] ?? MOOD_COLORS["default"];

  const handleStart = () => {
    setPhase("starting");
    setTimeout(() => {
      if (session) onReady(session.playlist, session.greeting, session.theme);
    }, 500);
  };

  // Auto-advance after 3s on reveal so it feels like a real DJ set starting
  useEffect(() => {
    if (phase !== "reveal") return;
    const t = setTimeout(handleStart, 3000);
    return () => clearTimeout(t);
  }, [phase]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background",
        "transition-opacity duration-500",
        phase === "starting" ? "opacity-0 pointer-events-none" : "opacity-100"
      )}
    >
      {/* Animated gradient blob in background */}
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-b opacity-60 transition-all duration-1000",
          gradientClass
        )}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,hsl(var(--background))_80%)]" />

      <div className="relative z-10 flex flex-col items-center gap-6 px-8 text-center max-w-sm w-full">

        {/* Brand mark */}
        <RythamLogo size="md" animate={phase === "reveal" || phase === "loading"} className="mb-1" />

        {/* DJ Avatar */}
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center relative overflow-hidden">
            <div className={cn(
              "absolute inset-0 bg-primary/20 rounded-full transition-all duration-500",
              phase === "loading" ? "animate-pulse" : phase === "reveal" ? "animate-ping" : ""
            )} />
            <Bot size={36} className="text-primary relative z-10" />
          </div>
          {/* Orbiting sparkles */}
          {phase === "reveal" && (
            <>
              <Sparkles
                size={14}
                className="absolute -top-1 -right-1 text-accent animate-bounce"
                style={{ animationDelay: "0ms" }}
              />
              <Sparkles
                size={10}
                className="absolute -bottom-1 -left-2 text-primary animate-bounce"
                style={{ animationDelay: "300ms" }}
              />
            </>
          )}
        </div>

        {/* Loading / Analyzing phase */}
        {(phase === "loading" || phase === "analyzing") && (
          <div className="space-y-3 animate-in fade-in duration-300">
            <p className="text-xs uppercase tracking-widest text-primary/70 font-bold">
              AI Personal DJ
            </p>
            <div className="h-10 flex items-center justify-center">
              <p
                key={stepIndex}
                className="text-white/80 text-sm font-medium animate-in fade-in slide-in-from-bottom-2 duration-300"
              >
                {ANALYZING_STEPS[stepIndex]}
              </p>
            </div>
            <div className="flex gap-1.5 justify-center">
              {ANALYZING_STEPS.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-1 rounded-full transition-all duration-300",
                    i <= stepIndex ? "w-4 bg-primary" : "w-1.5 bg-white/20"
                  )}
                />
              ))}
            </div>
          </div>
        )}

        {/* Reveal phase */}
        {(phase === "reveal" || phase === "starting") && session && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
            <div>
              <div className="flex items-center justify-center gap-2 mb-3">
                <Zap size={12} className="text-primary" />
                <p className="text-xs uppercase tracking-widest text-primary font-bold">
                  {session.theme}
                </p>
                <Zap size={12} className="text-primary" />
              </div>
              <h2 className="text-2xl font-display font-bold text-white leading-tight">
                {session.greeting}
              </h2>
              {session.topMoods.length > 0 && (
                <div className="flex flex-wrap gap-2 justify-center mt-3">
                  {session.topMoods.map(m => (
                    <span
                      key={m}
                      className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-primary/15 text-primary border border-primary/20"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Playlist preview — horizontal strip of 5 covers */}
            {session.playlist.length > 0 && (
              <div className="w-full">
                <p className="text-xs text-white/40 mb-2.5 uppercase tracking-wider">Your session playlist</p>
                <div className="flex gap-2 justify-center">
                  {session.playlist.slice(0, 5).map((song, i) => (
                    <div
                      key={song.id}
                      className="relative flex-shrink-0 animate-in fade-in zoom-in-75 duration-300"
                      style={{ animationDelay: `${i * 80}ms` }}
                    >
                      <img
                        src={song.coverUrl}
                        alt={song.title}
                        className="w-12 h-12 rounded-xl object-cover ring-2 ring-black"
                      />
                      {i === 0 && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                          <Music2 size={8} className="text-white" />
                        </div>
                      )}
                    </div>
                  ))}
                  {session.playlist.length > 5 && (
                    <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 text-[10px] font-bold flex-shrink-0">
                      +{session.playlist.length - 5}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* CTA button */}
            <button
              onClick={handleStart}
              data-testid="button-start-dj-session"
              className="w-full flex items-center justify-center gap-2 bg-primary text-white font-bold rounded-2xl py-4 hover:bg-primary/90 active:scale-[0.98] transition-all shadow-lg shadow-primary/25"
            >
              Start Session
              <ChevronRight size={18} />
            </button>
            <p className="text-[10px] text-white/30">Auto-starting in a moment…</p>
          </div>
        )}
      </div>
    </div>
  );
}
