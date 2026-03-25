import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import SongCard from "@/components/Feed/SongCard";
import AIDJIntro from "@/components/Feed/AIDJIntro";
import { ApiSong, api } from "@/lib/api";
import { generateFeedSegment, generateMoodFeedSegment, setSongsPool } from "@/lib/recommendation";
import { getSessionContext, getSessionTopMood } from "@/lib/session";
import { Bot, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const MOODS = ["For You", "Focus", "Night Drive", "Gym", "Study", "Chill", "Sad", "Hype"];

// Show the AI DJ intro once per browser session (not every tab switch)
const DJ_INTRO_KEY = "vibescroll_dj_intro_shown";

export default function Feed() {
  const [activeIndex, setActiveIndex]     = useState(0);
  const containerRef                      = useRef<HTMLDivElement>(null);
  const [selectedMood, setSelectedMood]   = useState("For You");
  const [feedItems, setFeedItems]         = useState<ApiSong[]>([]);
  const [showGreeting, setShowGreeting]   = useState(true);
  const [djGreeting, setDjGreeting]       = useState<string | null>(null);
  const [djTheme, setDjTheme]             = useState<string | null>(null);

  // Show AI DJ intro on first session visit; skip on subsequent navigations back to feed
  const [showDJIntro, setShowDJIntro] = useState(
    () => !sessionStorage.getItem(DJ_INTRO_KEY)
  );

  // ── Session awareness ────────────────────────────────────────────────────────
  const [sessionVersion, setSessionVersion] = useState(0);
  const sessionCountRef                     = useRef(0);
  const queryClient                         = useQueryClient();

  const handleSessionEvent = useCallback(() => {
    sessionCountRef.current += 1;
    if (sessionCountRef.current % 3 === 0) {
      queryClient.invalidateQueries({ queryKey: ["ranked-songs"] });
      setSessionVersion(v => v + 1);
    }
  }, [queryClient]);

  // ── Ranked songs query ───────────────────────────────────────────────────────
  const { data: allSongs, isLoading } = useQuery({
    queryKey: ["ranked-songs", sessionVersion],
    queryFn: () => api.getRankedSongs(getSessionContext()),
    staleTime: 2 * 60 * 1000,
  });

  // Seed the recommendation engine once songs are loaded.
  // If the DJ intro is still showing (or just dismissed via onDJReady),
  // we do NOT overwrite feedItems here — the DJ playlist takes precedence.
  useEffect(() => {
    if (!allSongs || allSongs.length === 0) return;
    setSongsPool(allSongs);

    // Only set feedItems from the ranked pool when the DJ intro has already been
    // dismissed (i.e., the user has seen the intro and the playlist has been set).
    if (!showDJIntro && feedItems.length === 0) {
      if (selectedMood === "For You") {
        setFeedItems(generateFeedSegment() as ApiSong[]);
      } else {
        setFeedItems(generateMoodFeedSegment(selectedMood) as ApiSong[]);
      }
    }
  }, [allSongs]);

  // Initialize or reset feed when mood changes
  useEffect(() => {
    if (!allSongs || allSongs.length === 0) return;
    setActiveIndex(0);
    if (containerRef.current) containerRef.current.scrollTop = 0;

    if (selectedMood === "For You") {
      setFeedItems(generateFeedSegment() as ApiSong[]);
    } else {
      setFeedItems(generateMoodFeedSegment(selectedMood) as ApiSong[]);
    }

    if (selectedMood === "For You" && feedItems.length === 0) {
      const timer = setTimeout(() => setShowGreeting(false), 3500);
      return () => clearTimeout(timer);
    }
  }, [selectedMood]);

  // ── AI DJ Intro handler ─────────────────────────────────────────────────────
  const handleDJReady = useCallback((playlist: ApiSong[], greeting: string, theme: string) => {
    sessionStorage.setItem(DJ_INTRO_KEY, "1");
    setDjGreeting(greeting);
    setDjTheme(theme);
    setShowDJIntro(false);

    // Use the DJ-curated playlist as the first page of the feed
    if (allSongs && allSongs.length > 0) {
      setSongsPool(allSongs);
    }
    const djFeed = [...playlist];
    // Append more songs so infinite scroll still works
    const rest = generateFeedSegment() as ApiSong[];
    setFeedItems([...djFeed, ...rest]);

    // Show the greeting banner briefly
    setShowGreeting(true);
    setTimeout(() => setShowGreeting(false), 4000);
  }, [allSongs]);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const index = Math.round(container.scrollTop / window.innerHeight);

    if (index !== activeIndex && index >= 0 && index < feedItems.length) {
      setActiveIndex(index);
      if (showGreeting) setShowGreeting(false);
    }

    if (index >= feedItems.length - 2) {
      if (selectedMood === "For You") {
        setFeedItems(prev => [...prev, ...generateFeedSegment()]);
      } else {
        setFeedItems(prev => [...prev, ...generateMoodFeedSegment(selectedMood)]);
      }
    }
  }, [activeIndex, feedItems.length, selectedMood, showGreeting]);

  // ── Greeting text ────────────────────────────────────────────────────────────
  const hour = new Date().getHours();
  let timeOfDay = "Night";
  if (hour >= 5 && hour < 12) timeOfDay = "Morning";
  else if (hour >= 12 && hour < 17) timeOfDay = "Afternoon";
  else if (hour >= 17 && hour < 21) timeOfDay = "Evening";

  const sessionTopMood  = getSessionTopMood();
  const sessionCtxNow   = getSessionContext();
  const greetingMessage = djGreeting
    ? djGreeting
    : sessionTopMood
      ? `Your ${sessionTopMood} session is curated. Feed adapting in real-time.`
      : `Good ${timeOfDay}! Here are songs perfect for your current vibe.`;

  const djLabel = djTheme
    ? djTheme
    : sessionTopMood ? "Session DJ — Live" : "AI Personal DJ";

  // ── Render ──────────────────────────────────────────────────────────────────
  if (showDJIntro) {
    return <AIDJIntro onReady={handleDJReady} />;
  }

  if (isLoading || feedItems.length === 0) {
    return (
      <div className="h-[100dvh] w-full bg-black flex flex-col items-center justify-center gap-4 text-white/50">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm">Loading your feed...</p>
      </div>
    );
  }

  return (
    <div className="relative h-[100dvh] w-full bg-black">

      {/* Top Mood Navigation */}
      <div className="absolute top-0 left-0 right-0 z-50 pt-12 pb-4 px-4 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
        <div className="flex items-center gap-6 text-lg font-display font-semibold justify-center pointer-events-auto overflow-x-auto no-scrollbar mask-image-fade-x pb-2">
          {MOODS.map(mood => (
            <button
              key={mood}
              onClick={() => setSelectedMood(mood)}
              className={cn(
                "whitespace-nowrap transition-all duration-300 relative",
                selectedMood === mood
                  ? "text-white scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                  : "text-white/40 hover:text-white/70"
              )}
            >
              {mood}
              {selectedMood === mood && (
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,1)]" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* AI DJ Greeting Overlay */}
      <div className={cn(
        "absolute top-32 left-4 right-4 z-40 transition-all duration-1000 pointer-events-none flex flex-col items-center",
        showGreeting ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-8"
      )}>
        <div className="bg-black/60 backdrop-blur-xl border border-white/10 p-4 rounded-3xl shadow-2xl flex items-center gap-4 max-w-sm w-full mx-auto">
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0 border border-primary/50 relative overflow-hidden">
            <div className="absolute inset-0 bg-primary/20 animate-pulse" />
            <Bot size={24} className="text-primary relative z-10" />
          </div>
          <div>
            <p className="text-primary text-xs font-bold uppercase tracking-wider mb-0.5">
              {djLabel}
            </p>
            <p className="text-white text-sm font-medium leading-tight">
              {greetingMessage}
            </p>
          </div>
        </div>
      </div>

      {/* Now Vibing indicator */}
      {sessionCtxNow && sessionCtxNow.sessionMoods.length > 0 && (
        <div className="absolute top-28 right-4 z-50 pointer-events-none">
          <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md border border-primary/30 rounded-full px-3 py-1.5">
            <Sparkles size={11} className="text-primary animate-pulse" />
            <span className="text-[10px] font-bold text-primary/90 tracking-wide uppercase">
              {sessionCtxNow.sessionMoods[0]}
            </span>
            {sessionCtxNow.sessionMoods[1] && (
              <span className="text-[10px] text-white/40">· {sessionCtxNow.sessionMoods[1]}</span>
            )}
          </div>
        </div>
      )}

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full w-full overflow-y-scroll snap-y snap-mandatory no-scrollbar"
      >
        {feedItems.map((song, index) => {
          const isNear = Math.abs(index - activeIndex) <= 2;
          if (!isNear) {
            return <div key={song.id} className="h-[100dvh] w-full snap-start snap-always bg-black" />;
          }
          return (
            <SongCard
              key={song.id}
              song={song}
              isActive={index === activeIndex}
              shouldPreload={index === activeIndex + 1}
              onSessionEvent={handleSessionEvent}
            />
          );
        })}
      </div>
    </div>
  );
}
