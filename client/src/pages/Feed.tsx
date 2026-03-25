import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import SongCard from "@/components/Feed/SongCard";
import AIDJIntro from "@/components/Feed/AIDJIntro";
import Onboarding from "@/components/Onboarding";
import { ApiSong, api } from "@/lib/api";
import { audioManager } from "@/lib/audioManager";
import {
  generateFeedSegment,
  generateMoodFeedSegment,
  generateColdStartFeedSegment,
  setSongsPool,
} from "@/lib/recommendation";
import {
  getSessionContext,
  getSessionTopMood,
  getOnboardingPrefs,
  saveOnboardingPrefs,
  buildColdStartContext,
  type OnboardingPrefs,
} from "@/lib/session";
import { Bot, Sparkles, RadioTower } from "lucide-react";
import { cn } from "@/lib/utils";
import RythamLogo from "@/components/RythamLogo";

const MOODS = ["For You", "Focus", "Night Drive", "Gym", "Study", "Chill", "Sad", "Hype"];

// Show the AI DJ intro once per browser session (not every tab switch)
const DJ_INTRO_KEY = "rytham_dj_intro_shown";

export default function Feed() {
  const [activeIndex, setActiveIndex]   = useState(0);
  const containerRef                    = useRef<HTMLDivElement>(null);
  const [selectedMood, setSelectedMood] = useState("For You");
  const [feedItems, setFeedItems]       = useState<ApiSong[]>([]);
  const [showGreeting, setShowGreeting] = useState(true);
  const [djGreeting, setDjGreeting]     = useState<string | null>(null);
  const [djTheme, setDjTheme]           = useState<string | null>(null);

  // ── Onboarding state ─────────────────────────────────────────────────────────
  const [onboardingPrefs, setOnboardingPrefs] = useState<OnboardingPrefs | null>(
    () => getOnboardingPrefs()
  );
  const [showOnboarding, setShowOnboarding] = useState(
    () => !getOnboardingPrefs()
  );

  // Show AI DJ intro if: onboarding is done AND intro hasn't been shown this session
  const [showDJIntro, setShowDJIntro] = useState(
    () => !showOnboarding && !sessionStorage.getItem(DJ_INTRO_KEY)
  );

  // When onboarding completes, save prefs and transition to AI DJ intro
  const handleOnboardingComplete = useCallback((prefs: { moods: string[]; genres: string[] }) => {
    saveOnboardingPrefs(prefs);
    const full: OnboardingPrefs = { ...prefs, completedAt: Date.now() };
    setOnboardingPrefs(full);
    setShowOnboarding(false);
    setShowDJIntro(true); // Always show DJ intro right after onboarding
  }, []);

  // ── Continuous DJ Mode ───────────────────────────────────────────────────────
  const [isDJMode, setIsDJMode] = useState(false);
  const [djSelectingMsg, setDjSelectingMsg] = useState<string | null>(null);

  // Trending-in-Moments song IDs for badge display
  const { data: momentTrendingSongs = [] } = useQuery({
    queryKey: ["trending-moment-songs-feed"],
    queryFn: () => api.getTrendingMomentSongs(),
    staleTime: 5 * 60_000,
  });
  const momentTrendingIds = new Set(momentTrendingSongs.map(s => {
    const base = s.id.split("-rank-")[0].split("-rapid-")[0].split("-discover")[0].split("-new")[0].split("-mood-")[0];
    return base;
  }));

  // ── Audio GC — release elements that are more than 3 cards away ──────────
  useEffect(() => {
    if (feedItems.length === 0) return;
    // Keep active, next 2, and previous 1 in the pool; release everything else
    const keepKeys = feedItems
      .slice(Math.max(0, activeIndex - 1), activeIndex + 3)
      .map(s => s.audioUrl)
      .filter(Boolean);
    audioManager.gc(keepKeys);
  }, [activeIndex, feedItems]);

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

  // ── DJ Mode auto-advance ──────────────────────────────────────────────────
  const handleSongEnd = useCallback(() => {
    if (!containerRef.current) return;
    const nextIndex = activeIndex + 1;

    // Expand feed if needed
    if (nextIndex >= feedItems.length - 1) {
      setFeedItems(prev => [...prev, ...generateFeedSegment()]);
    }

    // Brief "selecting" indicator
    setDjSelectingMsg("AI DJ selecting your next track…");
    setTimeout(() => setDjSelectingMsg(null), 900);

    // Smooth scroll to next song
    setTimeout(() => {
      if (!containerRef.current) return;
      containerRef.current.scrollTo({ top: (activeIndex + 1) * window.innerHeight, behavior: "smooth" });
    }, 300);
  }, [activeIndex, feedItems.length]);

  // ── Ranked songs query ───────────────────────────────────────────────────────
  const { data: allSongs, isLoading } = useQuery({
    queryKey: ["ranked-songs", sessionVersion],
    queryFn: () => {
      const sessionCtx = getSessionContext();
      // First-time users: use cold-start context based on onboarding prefs so
      // the ranking engine immediately weights songs to their stated preferences.
      const effectiveCtx = sessionCtx ?? (onboardingPrefs ? buildColdStartContext(onboardingPrefs) : null);
      return api.getRankedSongs(effectiveCtx);
    },
    staleTime: 2 * 60 * 1000,
  });

  // Seed the recommendation engine once songs are loaded.
  useEffect(() => {
    if (!allSongs || allSongs.length === 0) return;
    setSongsPool(allSongs);

    if (!showDJIntro && !showOnboarding && feedItems.length === 0) {
      if (selectedMood === "For You") {
        setFeedItems(generateFeedSegment() as ApiSong[]);
      } else {
        setFeedItems(generateMoodFeedSegment(selectedMood) as ApiSong[]);
      }
    }
  }, [allSongs]);

  // Reset feed when mood filter changes
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

    if (allSongs && allSongs.length > 0) {
      setSongsPool(allSongs);
    }

    // For cold-start users: append a preference-matched segment after the DJ playlist
    // For returning users: use the standard segment generator
    const extraSongs = onboardingPrefs
      ? generateColdStartFeedSegment(onboardingPrefs) as ApiSong[]
      : generateFeedSegment() as ApiSong[];

    setFeedItems([...playlist, ...extraSongs]);

    setShowGreeting(true);
    setTimeout(() => setShowGreeting(false), 5000);
  }, [allSongs, onboardingPrefs]);

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

  // ── Greeting text ─────────────────────────────────────────────────────────────
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

  // ── Render ───────────────────────────────────────────────────────────────────

  // Step 1: Onboarding (first-ever visit)
  if (showOnboarding) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  // Step 2: AI DJ intro (once per browser session)
  if (showDJIntro) {
    return <AIDJIntro onReady={handleDJReady} prefs={onboardingPrefs} />;
  }

  // Step 3: Loading
  if (isLoading || feedItems.length === 0) {
    return (
      <div className="h-[100dvh] w-full bg-[hsl(240,12%,3%)] flex flex-col items-center justify-center gap-8 relative overflow-hidden">
        {/* Blurred mosaic background */}
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-4 opacity-15 blur-2xl scale-110 pointer-events-none">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="bg-cover bg-center"
              style={{ backgroundImage: `url(https://picsum.photos/seed/${i + 20}/200/200)` }} />
          ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-black/90 pointer-events-none" />
        {/* Ambient bottom glow */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-80 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center gap-6">
          {/* Logo mark large */}
          <div className="relative flex items-center justify-center">
            <div className="absolute w-20 h-20 rounded-full bg-primary/10 blur-xl animate-pulse" />
            <RythamLogo size="xl" animate className="relative z-10" />
          </div>

          <p className="text-white/40 text-sm font-medium tracking-widest uppercase">
            Curating your feed
          </p>

          {/* Animated equalizer bars */}
          <div className="flex items-end gap-1 h-5">
            {[0.5, 0.8, 1, 0.7, 0.4, 0.9, 0.6].map((h, i) => (
              <div key={i} className="w-1 bg-primary/70 rounded-full"
                style={{
                  height: `${h * 100}%`,
                  animation: `equalizer ${0.35 + i * 0.08}s ease-in-out infinite alternate`,
                  animationDelay: `${i * 0.06}s`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Step 4: Feed
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

        {/* DJ Mode Toggle */}
        <div className="flex justify-end mt-1 pointer-events-auto">
          <button
            data-testid="button-dj-mode"
            onClick={() => setIsDJMode(d => !d)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide transition-all duration-300 border",
              isDJMode
                ? "bg-primary/30 border-primary/60 text-primary shadow-[0_0_12px_rgba(var(--primary),0.4)]"
                : "bg-white/5 border-white/10 text-white/40 hover:text-white/70"
            )}
          >
            <RadioTower size={11} className={isDJMode ? "animate-pulse" : ""} />
            <span>DJ Mode {isDJMode ? "ON" : "OFF"}</span>
          </button>
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

      {/* DJ Mode Selecting Overlay */}
      {isDJMode && djSelectingMsg && (
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 z-50 flex justify-center pointer-events-none">
          <div className="flex items-center gap-2 bg-black/70 backdrop-blur-xl border border-primary/40 rounded-full px-5 py-2.5 shadow-xl animate-in zoom-in-75 duration-200">
            <RadioTower size={14} className="text-primary animate-pulse" />
            <span className="text-sm font-semibold text-white">{djSelectingMsg}</span>
          </div>
        </div>
      )}

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
            return (
              <div
                key={song.id}
                className="h-[100dvh] w-full snap-start snap-always bg-black relative overflow-hidden"
              >
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-25 scale-110 blur-2xl"
                  style={{ backgroundImage: `url(${song.coverUrl})` }}
                />
                <div className="absolute inset-0 bg-black/60" />
              </div>
            );
          }
          const baseSongId = song.id.split("-rank-")[0].split("-rapid-")[0].split("-discover")[0].split("-new")[0].split("-mood-")[0];
          return (
            <SongCard
              key={song.id}
              song={song}
              isActive={index === activeIndex}
              shouldPreload={index > activeIndex && index <= activeIndex + 2}
              onSessionEvent={handleSessionEvent}
              onSongEnd={isDJMode && index === activeIndex ? handleSongEnd : undefined}
              isTrendingInMoments={momentTrendingIds.has(baseSongId)}
            />
          );
        })}
      </div>
    </div>
  );
}
