import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Heart, MessageCircle, Share2, Bookmark, Plus, Check, Play, Pause, Disc3, Music2, Quote, RotateCcw, CheckCircle2, ChevronLeft, ChevronRight as ChevronRightIcon, MessageSquareQuote, TrendingUp, X, UserCheck, UserPlus, Loader2 } from "lucide-react";
import { ApiSong, ApiMoment, ApiUser, api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { trackListenBehavior } from "@/lib/tracking";
import { recordSessionPlay } from "@/lib/session";
import { audioManager } from "@/lib/audioManager";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

// Pre-computed particles for the like burst — 8 particles at 45° intervals
const LIKE_PARTICLES = [...Array(8)].map((_, i) => {
  const angle = (i / 8) * 2 * Math.PI;
  const dist = 32 + (i % 3) * 10;
  return {
    tx:    `${Math.cos(angle) * dist}px`,
    ty:    `${Math.sin(angle) * dist}px`,
    color: ["#f87171","#fb923c","#a78bfa","#f472b6","#60a5fa","#34d399","#facc15","#f87171"][i],
  };
});

interface SongCardProps {
  song: ApiSong;
  isActive: boolean;
  shouldPreload?: boolean;
  /** Called after a song interaction is committed — Feed uses this to track session progress. */
  onSessionEvent?: () => void;
  /** When provided, the song calls this instead of looping at end — used by Continuous DJ mode. */
  onSongEnd?: () => void;
  /** Show the "Trending in Moments" badge on this card. */
  isTrendingInMoments?: boolean;
}

export default function SongCard({ song, isActive, shouldPreload = false, onSessionEvent, onSongEnd, isTrendingInMoments = false }: SongCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isFollowing, setIsFollowing] = useState(song.isFollowingArtist ?? false);
  
  const { toast } = useToast();

  // Fetch initial like/save/follow state from API
  useEffect(() => {
    const baseSongId = song.id.split("-rank-")[0].split("-rapid-")[0].split("-discover")[0].split("-new")[0].split("-mood-")[0];
    api.isLiked(baseSongId).then(r => setIsLiked(r.liked)).catch(() => {});
    api.isSaved(baseSongId).then(r => setIsSaved(r.saved)).catch(() => {});
    api.isFollowingArtist(song.artist).then(r => setIsFollowing(r.following)).catch(() => {});
  }, [song.id]);

  const [currentLyricIndex, setCurrentLyricIndex] = useState(0);
  
  // ── Audio key — stable identifier for this song in the global pool ────────
  // Use audioUrl as the key so the same track is never loaded twice
  const audioKey = song.audioUrl || `song-${song.id.split("-")[0]}`;

  // ── Buffering indicator ────────────────────────────────────────────────────
  const [isBuffering, setIsBuffering] = useState(false);

  // Register buffering callback when this card is active
  useEffect(() => {
    if (!isActive) return;
    audioManager.onBuffering(setIsBuffering);
    return () => audioManager.onBuffering(() => {});
  }, [isActive]);

  // ── Preload into global pool as soon as card is near-active ───────────────
  useEffect(() => {
    if (song.audioUrl && (isActive || shouldPreload)) {
      audioManager.preload(audioKey, song.audioUrl);
    }
  }, [song.audioUrl, isActive, shouldPreload, audioKey]);
  
  // Moments panel state
  const [showMomentsPanel, setShowMomentsPanel] = useState(false);
  const baseSongIdForMoments = song.id.split("-rank-")[0].split("-rapid-")[0].split("-discover")[0].split("-new")[0].split("-mood-")[0];
  const { data: songMoments = [] } = useQuery({
    queryKey: ["song-moments", baseSongIdForMoments],
    queryFn: () => api.getSongMoments(baseSongIdForMoments),
    enabled: showMomentsPanel,
    staleTime: 60_000,
  });

  // Share to moment & comments state
  const [showShareModal, setShowShareModal] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [localComments, setLocalComments] = useState<{ id: number; text: string }[]>([]);
  const [localCommentCount, setLocalCommentCount] = useState<number | null>(null);
  // Moment creation
  const [momentCaption, setMomentCaption]     = useState("");
  const [momentLyricIdx, setMomentLyricIdx]   = useState(0);
  const [momentMood, setMomentMood]           = useState(song.mood);
  const [isPostingMoment, setIsPostingMoment] = useState(false);
  const [momentPosted, setMomentPosted]       = useState(false);
  const queryClient = useQueryClient();
  
  // Like animation state
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);
  
  const progressRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  // Tracking state
  const [listenStartTime, setListenStartTime] = useState<number | null>(null);
  const [totalListenTimeMs, setTotalListenTimeMs] = useState(0);
  const [lastResumeTime, setLastResumeTime] = useState<number | null>(null);
  const [replays, setReplays] = useState(0);
  const [pauseCount, setPauseCount] = useState(0);

  // ── Micro-interaction states ───────────────────────────────────────────────
  const [likeAnimating, setLikeAnimating]   = useState(false);
  const [saveAnimating, setSaveAnimating]   = useState(false);
  const [shareAnimating, setShareAnimating] = useState(false);
  const [followAnimating, setFollowAnimating] = useState(false);
  const [showLikeCounter, setShowLikeCounter] = useState(false);

  // Stable visualizer bars — computed once per card mount to avoid Math.random() re-renders
  const visualizerBars = useMemo(() =>
    [...Array(12)].map(() => ({
      height: Math.max(10, Math.random() * 100),
      duration: 0.5 + Math.random() * 0.5,
    })), []);

  // ── Playback engine — uses global AudioManager ────────────────────────────
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isActive && isPlaying) {
      if (!lastResumeTime) setLastResumeTime(Date.now());

      const el = audioManager.getElement(audioKey);

      if (song.audioUrl) {
        // Kick off play (instant if pre-buffered, otherwise awaits canplay)
        audioManager.play(audioKey).catch(() => {});

        // Poll every 100 ms for progress + lyrics + end detection
        interval = setInterval(() => {
          const el = audioManager.getElement(audioKey);
          if (!el) return;

          const currentTime = el.currentTime;
          const duration    = el.duration || 1;

          setProgress((currentTime / duration) * 100);

          // End of track
          if (duration > 1 && currentTime >= duration - 0.15) {
            if (onSongEnd) {
              onSongEnd();
            } else {
              setReplays(r => r + 1);
              audioManager.seek(audioKey, 0);
              audioManager.play(audioKey).catch(() => {});
            }
          }

          // Lyric sync
          const lyricIndex = song.lyrics.findIndex((lyric, idx) => {
            const next = song.lyrics[idx + 1];
            return currentTime >= lyric.time && (!next || currentTime < next.time);
          });
          if (lyricIndex !== -1) setCurrentLyricIndex(lyricIndex);
        }, 100);
      } else {
        // Fallback for songs without an audio URL
        interval = setInterval(() => {
          setProgress(p => {
            if (p >= 100) { setReplays(r => r + 1); return 0; }
            return p + 0.5;
          });
        }, 50);
      }
    } else {
      // Pause
      if (song.audioUrl) audioManager.pause(audioKey);
      if (lastResumeTime) {
        setTotalListenTimeMs(prev => prev + (Date.now() - lastResumeTime));
        setLastResumeTime(null);
      }
    }

    return () => clearInterval(interval);
  }, [isActive, isPlaying, audioKey, song.audioUrl, song.lyrics]);

  // Fallback lyrics sync (only when no real audio element)
  useEffect(() => {
    if (!song.audioUrl && isActive && isPlaying) {
      const lyricIndex = Math.floor((progress / 100) * song.lyrics.length);
      setCurrentLyricIndex(Math.min(lyricIndex, Math.max(0, song.lyrics.length - 1)));
    }
  }, [progress, isActive, isPlaying, song.audioUrl, song.lyrics.length]);

  // Auto-play and Tracking when active
  useEffect(() => {
    if (isActive) {
      setIsPlaying(true);
      setProgress(0);
      setListenStartTime(Date.now());
      setLastResumeTime(Date.now());
      setTotalListenTimeMs(0);
      setReplays(0);
      setPauseCount(0);
      // Reset playhead so every activation starts from the beginning
      audioManager.seek(audioKey, 0);
    } else {
      setIsPlaying(false);
      setShowShareModal(false);
      
      // Finalize tracking when card becomes inactive
      if (listenStartTime) {
        // Calculate final listen time
        let finalListenMs = totalListenTimeMs;
        if (lastResumeTime) {
           finalListenMs += (Date.now() - lastResumeTime);
        }
        
        const durationSec = finalListenMs / 1000;
        
        // Consider it a skip if listened for less than 5 seconds and no replays
        const isSkip = durationSec < 5 && replays === 0;
        
        // Calculate skip time if it was a skip
        const _el = audioManager.getElement(audioKey);
        const skipTimeSeconds = isSkip && _el ? parseFloat(_el.currentTime.toFixed(1)) : null;
        
        const hour = new Date().getHours();
        let timeOfDay = "Night";
        if (hour >= 5 && hour < 12) timeOfDay = "Morning";
        else if (hour >= 12 && hour < 17) timeOfDay = "Afternoon";
        else if (hour >= 17 && hour < 21) timeOfDay = "Evening";

        const durationRounded = parseFloat(durationSec.toFixed(1));
        trackListenBehavior({
          songId: song.id,
          songTitle: song.title,
          durationSeconds: durationRounded,
          skipped: isSkip,
          skipTimeSeconds,
          replays,
          pauseCount,
          liked: isLiked,
          timestamp: new Date().toISOString(),
          timeOfDay
        });

        // Update session context tracker for real-time feed personalisation
        recordSessionPlay({
          songId:      song.id,
          title:       song.title,
          artist:      song.artist,
          moods:       song.features.mood,
          genres:      song.features.genre,
          energy:      song.features.energy,
          liked:       isLiked,
          skipped:     isSkip,
          replays,
          durationSec: durationRounded,
        });
        // Notify Feed.tsx that a session event occurred (used for adaptive re-ranking)
        onSessionEvent?.();

        // Also persist to the real backend
        const baseSongId = song.id.split("-rank-")[0].split("-rapid-")[0].split("-discover")[0].split("-new")[0].split("-mood-")[0];
        api.logBehavior({
          songId: baseSongId,
          durationSeconds: durationRounded,
          skipped: isSkip,
          liked: isLiked,
          replays,
        }).catch(() => {});

        setListenStartTime(null);
        setLastResumeTime(null);
      }
    }
  }, [isActive]);

  // ── Haptic feedback utility ───────────────────────────────────────────────
  const haptic = useCallback((pattern: number | number[] = 10) => {
    try { navigator.vibrate(pattern); } catch {}
  }, []);

  // ── Double-tap to like — timer-based, no audio flicker ───────────────────
  // First tap sets a 280 ms timer; if a second tap arrives it's cancelled and
  // the like fires.  Play state never changes on a double-tap's first tap.
  const tapTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapTimeRef = useRef(0);

  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    if (showShareModal || showCommentsModal || showMomentsPanel) return;

    const now = Date.now();
    const WINDOW = 280;

    if (now - lastTapTimeRef.current < WINDOW && tapTimerRef.current) {
      // ── Double tap ─────────────────────────────────────────────────────
      clearTimeout(tapTimerRef.current);
      tapTimerRef.current = null;
      lastTapTimeRef.current = 0;

      if (!isLiked) {
        haptic([30, 20, 60]);
        setIsLiked(true);
        setLikeAnimating(true);
        setShowLikeCounter(true);
        setShowHeartAnimation(true);
        setTimeout(() => setLikeAnimating(false),  600);
        setTimeout(() => setShowLikeCounter(false), 900);
        setTimeout(() => setShowHeartAnimation(false), 1000);
        const baseSongId = song.id
          .split("-rank-")[0].split("-rapid-")[0]
          .split("-discover")[0].split("-new")[0].split("-mood-")[0];
        api.likeSong(baseSongId)
          .then(() => queryClient.invalidateQueries({ queryKey: ["liked-songs"] }))
          .catch(() => setIsLiked(false));
      }
    } else {
      // ── First tap — wait before toggling play ─────────────────────────
      lastTapTimeRef.current = now;
      tapTimerRef.current = setTimeout(() => {
        tapTimerRef.current = null;
        haptic(8);
        if (isPlaying) setPauseCount(p => p + 1);
        setIsPlaying(p => !p);
      }, WINDOW);
    }
  }, [showShareModal, showCommentsModal, showMomentsPanel, isLiked, isPlaying, song.id, haptic, queryClient]);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Track pause event
    if (isPlaying) {
      setPauseCount(p => p + 1);
    }
    
    setIsPlaying(!isPlaying);
  };

  const handleShareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowShareModal(true);
    setIsPlaying(false); // Pause while sharing
  };

  const handleCommentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowCommentsModal(true);
  };

  const restartSong = (e: React.MouseEvent) => {
    e.stopPropagation();
    audioManager.seek(audioKey, 0);
    audioManager.play(audioKey).catch(() => {});
    setProgress(0);
    setIsPlaying(true);
  };

  return (
    <div className="relative w-full h-[100dvh] snap-start snap-always bg-black overflow-hidden flex flex-col group">
      {/* Background Cover with Blur */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-40 scale-110 transition-transform duration-[20s] ease-linear"
        style={{ 
          backgroundImage: `url(${song.coverUrl})`,
          transform: isPlaying ? 'scale(1.15)' : 'scale(1.1)' 
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/90" />

      {/* Main Content Area */}
      <div className="relative flex-1 flex flex-col justify-end pb-24 px-4 z-10" onClick={handleContainerClick}>
        
        {/* Play/Pause Indicator (Fades out) */}
        <div className={cn(
          "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/40 backdrop-blur-md rounded-full p-6 transition-all duration-300",
          isPlaying ? "opacity-0 scale-150 pointer-events-none" : "opacity-100 scale-100",
          (showShareModal || showCommentsModal || showHeartAnimation) && "hidden"
        )}>
          <Play fill="white" size={48} className="ml-2 text-white" />
        </div>

        {/* Buffering Indicator — shown while audio is loading */}
        {isBuffering && isActive && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-black/50 backdrop-blur-xl border border-white/15 flex items-center justify-center">
              <Loader2 size={26} className="text-primary animate-spin" />
            </div>
            <span className="text-xs text-white/60 font-medium tracking-wide">Loading…</span>
          </div>
        )}

        {/* Double Tap Heart Animation */}
        <div className={cn(
          "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-all duration-700 ease-out z-50",
          showHeartAnimation ? "opacity-100 scale-150 translate-y-[-60%]" : "opacity-0 scale-50"
        )}>
          <Heart fill="url(#heart-gradient)" stroke="none" size={120} className="drop-shadow-[0_0_30px_rgba(255,0,100,0.8)]" />
          <svg width="0" height="0">
            <linearGradient id="heart-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop stopColor="#ff007f" offset="0%" />
              <stop stopColor="#ff00ff" offset="100%" />
            </linearGradient>
          </svg>
        </div>

        {/* Audio Visualizer (Shows when playing) */}
        <div className={cn(
          "absolute bottom-48 left-4 right-16 h-12 flex items-end gap-1 opacity-0 transition-opacity duration-500",
          isPlaying && "opacity-100"
        )}>
          {visualizerBars.map((bar, i) => (
            <div 
              key={i} 
              className="w-1.5 bg-primary/80 rounded-t-sm"
              style={{
                height: isPlaying ? `${bar.height}%` : '10%',
                animation: isPlaying ? `equalizer ${bar.duration}s ease-in-out infinite alternate` : 'none',
                animationDelay: `${i * 0.1}s`,
                transition: 'height 0.3s ease',
              }}
            />
          ))}
        </div>

        <div
          className={cn(
            "flex items-end justify-between w-full transition-all duration-500 ease-out",
            isActive ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          )}
        >
          {/* Left: Info & Lyrics */}
          <div className="flex-1 pr-12 space-y-6">
            
            {/* Animated Lyrics */}
            <div className="h-24 relative overflow-hidden mask-image-fade-y">
              <div 
                className="absolute w-full transition-transform duration-500 ease-out"
                style={{ transform: `translateY(-${currentLyricIndex * 2}rem)` }}
              >
                {song.lyrics.map((lyric, idx) => (
                  <p 
                    key={idx}
                    className={cn(
                      "text-xl h-8 font-display font-bold transition-all duration-300",
                      idx === currentLyricIndex 
                        ? "text-white opacity-100 scale-100 origin-left" 
                        : "text-white/40 opacity-50 scale-95 origin-left"
                    )}
                  >
                    {lyric.text}
                  </p>
                ))}
              </div>
            </div>

            {/* Song Info */}
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <h2 className="text-3xl font-display font-bold text-white drop-shadow-lg leading-tight">
                  {song.title}
                </h2>
                <button 
                  onClick={restartSong}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-md opacity-0 group-hover:opacity-100"
                  aria-label="Replay song"
                >
                  <RotateCcw size={18} className="text-white" />
                </button>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/20">
                  <img src={song.coverUrl} alt={song.artist} className="w-full h-full object-cover" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-medium text-white/90">{song.artist}</span>
                    <button
                      data-testid="button-follow"
                      onClick={(e) => {
                        e.stopPropagation();
                        const newFollowing = !isFollowing;
                        haptic(newFollowing ? [20, 10, 40] : 15);
                        setIsFollowing(newFollowing);
                        if (newFollowing) {
                          setFollowAnimating(true);
                          setTimeout(() => setFollowAnimating(false), 600);
                          api.followArtist(song.artist)
                            .then(() => toast({ description: `Following ${song.artist}` }))
                            .catch(() => { setIsFollowing(false); toast({ description: "Follow failed", variant: "destructive" }); });
                        } else {
                          api.unfollowArtist(song.artist)
                            .then(() => toast({ description: `Unfollowed ${song.artist}` }))
                            .catch(() => { setIsFollowing(true); toast({ description: "Action failed", variant: "destructive" }); });
                        }
                      }}
                      className={cn(
                        "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all active:scale-90",
                        isFollowing
                          ? "bg-white/10 text-white/70 border border-white/20"
                          : "bg-primary text-primary-foreground",
                        followAnimating && "shadow-[0_0_20px_6px_rgba(168,85,247,0.5)]"
                      )}
                      style={followAnimating ? { animation: "follow-flash 0.5s ease-out" } : undefined}
                    >
                      {isFollowing
                        ? <><UserCheck size={11} /> Following</>
                        : <><UserPlus size={11} /> Follow</>
                      }
                    </button>
                  </div>
                </div>
              </div>

              {/* Trending in Moments badge + See Moments button */}
              {isTrendingInMoments && (
                <button
                  data-testid="badge-trending-moments"
                  onClick={(e) => { e.stopPropagation(); setShowMomentsPanel(true); setIsPlaying(false); }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/40 hover:bg-purple-500/30 transition-colors self-start"
                >
                  <TrendingUp size={11} className="text-purple-400" />
                  <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wide">Trending in Moments</span>
                  <MessageSquareQuote size={11} className="text-purple-400" />
                </button>
              )}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex flex-col items-center gap-6 pb-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                const baseSongId = song.id.split("-rank-")[0].split("-rapid-")[0].split("-discover")[0].split("-new")[0].split("-mood-")[0];
                if (isLiked) {
                  haptic(12);
                  setIsLiked(false);
                  api.unlikeSong(baseSongId)
                    .then(() => queryClient.invalidateQueries({ queryKey: ["liked-songs"] }))
                    .catch(() => setIsLiked(true));
                } else {
                  haptic([30, 20, 60]);
                  setIsLiked(true);
                  setLikeAnimating(true);
                  setShowLikeCounter(true);
                  setShowHeartAnimation(true);
                  setTimeout(() => setLikeAnimating(false), 600);
                  setTimeout(() => setShowLikeCounter(false), 900);
                  setTimeout(() => setShowHeartAnimation(false), 1000);
                  api.likeSong(baseSongId)
                    .then(() => queryClient.invalidateQueries({ queryKey: ["liked-songs"] }))
                    .catch(() => setIsLiked(false));
                }
              }}
              className="flex flex-col items-center gap-1 group/btn active:scale-90 transition-transform"
              data-testid="button-like"
            >
              <div className="w-12 h-12 rounded-full bg-white/5 backdrop-blur-md flex items-center justify-center group-hover/btn:bg-white/10 transition-colors relative">
                {/* Ripple ring on like */}
                {likeAnimating && (
                  <div
                    className="absolute inset-0 rounded-full border-2 border-red-400"
                    style={{ animation: "ripple-out 0.5s ease-out forwards" }}
                  />
                )}
                {/* Particle burst */}
                {likeAnimating && LIKE_PARTICLES.map((p, i) => (
                  <div
                    key={i}
                    className="absolute w-2 h-2 rounded-full pointer-events-none"
                    style={{
                      top: "50%", left: "50%",
                      marginTop: -4, marginLeft: -4,
                      background: p.color,
                      "--tx": p.tx, "--ty": p.ty,
                      animation: `particle-burst ${0.35 + i * 0.04}s ease-out forwards`,
                      animationDelay: `${i * 0.02}s`,
                    } as React.CSSProperties}
                  />
                ))}
                <Heart
                  size={26}
                  className={cn("transition-colors", isLiked ? "fill-red-400 text-red-400" : "text-white")}
                  style={likeAnimating ? { animation: "like-pop 0.55s cubic-bezier(0.36,0.07,0.19,0.97)" } : undefined}
                />
              </div>
              <div className="relative h-4">
                <span className="text-xs font-medium text-white/80 drop-shadow-md">
                  {isLiked ? (song.likes + 1).toLocaleString() : song.likes.toLocaleString()}
                </span>
                {/* +1 floating counter */}
                {showLikeCounter && (
                  <span
                    className="absolute -top-1 left-1/2 -translate-x-1/2 text-xs font-bold text-red-400 pointer-events-none whitespace-nowrap"
                    style={{ animation: "float-counter 0.85s ease-out forwards" }}
                  >
                    +1
                  </span>
                )}
              </div>
            </button>

            <button
              onClick={(e) => { haptic(8); handleCommentClick(e); }}
              className="flex flex-col items-center gap-1 group/btn active:scale-90 transition-transform"
            >
              <div className="w-12 h-12 rounded-full bg-white/5 backdrop-blur-md flex items-center justify-center group-hover/btn:bg-white/10 transition-colors">
                <MessageCircle size={26} className="text-white" />
              </div>
              <span className="text-xs font-medium text-white/80 drop-shadow-md">{song.comments.toLocaleString()}</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                const baseSongId = song.id.split("-rank-")[0].split("-rapid-")[0].split("-discover")[0].split("-new")[0].split("-mood-")[0];
                if (isSaved) {
                  haptic(12);
                  setIsSaved(false);
                  api.unsaveSong(baseSongId)
                    .then(() => { queryClient.invalidateQueries({ queryKey: ["saved-songs"] }); toast({ description: "Removed from saved" }); })
                    .catch(() => setIsSaved(true));
                } else {
                  haptic([20, 10, 30]);
                  setIsSaved(true);
                  setSaveAnimating(true);
                  setTimeout(() => setSaveAnimating(false), 500);
                  api.saveSong(baseSongId)
                    .then(() => { queryClient.invalidateQueries({ queryKey: ["saved-songs"] }); toast({ description: "Saved to your library" }); })
                    .catch(() => setIsSaved(false));
                }
              }}
              className="flex flex-col items-center gap-1 group/btn active:scale-90 transition-transform"
              data-testid="button-save"
            >
              <div className="w-12 h-12 rounded-full bg-white/5 backdrop-blur-md flex items-center justify-center group-hover/btn:bg-white/10 transition-colors relative overflow-hidden">
                {saveAnimating && (
                  <div
                    className="absolute inset-0 rounded-full bg-primary/30"
                    style={{ animation: "ripple-out 0.45s ease-out forwards" }}
                  />
                )}
                <Bookmark
                  size={26}
                  className={cn("transition-colors", isSaved ? "fill-primary text-primary" : "text-white")}
                  style={saveAnimating ? { animation: "save-stamp 0.45s cubic-bezier(0.36,0.07,0.19,0.97)" } : undefined}
                />
              </div>
              <span className="text-xs font-medium text-white/80 drop-shadow-md">{song.saves.toLocaleString()}</span>
            </button>

            <button
              onClick={(e) => { haptic([15, 10, 20]); setShareAnimating(true); setTimeout(() => setShareAnimating(false), 500); handleShareClick(e); }}
              className="flex flex-col items-center gap-1 group/btn active:scale-90 transition-transform"
            >
              <div className="w-12 h-12 rounded-full bg-primary/20 backdrop-blur-md flex items-center justify-center border border-primary/50 group-hover/btn:bg-primary/40 transition-colors relative">
                {shareAnimating && (
                  <div
                    className="absolute inset-0 rounded-full bg-primary/40"
                    style={{ animation: "ripple-out 0.4s ease-out forwards" }}
                  />
                )}
                <Quote
                  size={24}
                  className="text-primary-foreground"
                  style={shareAnimating ? { animation: "share-pop 0.45s cubic-bezier(0.36,0.07,0.19,0.97)" } : undefined}
                />
              </div>
              <span className="text-xs font-medium text-primary drop-shadow-md">Moment</span>
            </button>

            {/* Rotating Record */}
            <div className="mt-4 w-12 h-12 rounded-full border-2 border-white/20 overflow-hidden relative" onClick={(e) => e.stopPropagation()}>
              <img 
                src={song.coverUrl} 
                alt="Record" 
                className={cn(
                  "w-full h-full object-cover",
                  isPlaying && "animate-[spin_4s_linear_infinite]"
                )} 
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-3 h-3 bg-black rounded-full border border-white/30" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="absolute bottom-16 left-0 right-0 h-1 bg-white/20 z-20">
        <div 
          className="h-full bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)] transition-all duration-75 ease-linear relative"
          style={{ width: `${progress}%` }}
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      {/* Create Moment Modal */}
      {showShareModal && (
        <div
          className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col justify-end animate-in fade-in duration-300 pb-16"
          onClick={(e) => { e.stopPropagation(); if (!isPostingMoment) { setShowShareModal(false); setIsPlaying(true); setMomentPosted(false); } }}
        >
          <div
            className="bg-background border-t border-white/10 rounded-t-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-1/2 duration-300 max-h-[80vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {momentPosted ? (
              /* ── Success state ──────────────────────────────── */
              <div className="flex flex-col items-center gap-4 py-6 animate-in zoom-in-75 duration-300">
                <CheckCircle2 size={48} className="text-primary" />
                <h3 className="text-xl font-display font-bold text-white">Moment Posted!</h3>
                <p className="text-sm text-white/50 text-center">Your moment is now live in the Moments feed.</p>
                <button
                  onClick={() => { setShowShareModal(false); setMomentPosted(false); setMomentCaption(""); setIsPlaying(true); }}
                  className="w-full py-3 rounded-full bg-primary text-white font-semibold text-sm"
                >
                  Back to Feed
                </button>
              </div>
            ) : (
              /* ── Create form ────────────────────────────────── */
              <>
                <h3 className="text-2xl font-display font-bold text-white mb-1">Create a Moment</h3>
                <p className="text-sm text-white/50 mb-5">Pick a lyric, add a caption, share with the world.</p>

                {/* Lyric picker */}
                {song.lyrics.length > 0 && (
                  <div className="mb-5">
                    <p className="text-xs uppercase tracking-wider text-white/40 mb-2.5">Choose Lyric</p>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setMomentLyricIdx(i => Math.max(0, i - 1))}
                        disabled={momentLyricIdx === 0}
                        className="p-2 rounded-full bg-white/5 hover:bg-white/10 disabled:opacity-30 transition"
                      >
                        <ChevronLeft size={16} className="text-white" />
                      </button>
                      <div className="flex-1 bg-white/5 border border-primary/30 rounded-xl p-4 text-center">
                        <p className="font-display text-base font-bold text-white italic leading-snug">
                          "{song.lyrics[momentLyricIdx]?.text}"
                        </p>
                        <p className="text-[10px] text-white/30 mt-2">
                          {momentLyricIdx + 1} / {song.lyrics.length}
                        </p>
                      </div>
                      <button
                        onClick={() => setMomentLyricIdx(i => Math.min(song.lyrics.length - 1, i + 1))}
                        disabled={momentLyricIdx === song.lyrics.length - 1}
                        className="p-2 rounded-full bg-white/5 hover:bg-white/10 disabled:opacity-30 transition"
                      >
                        <ChevronRightIcon size={16} className="text-white" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Mood picker */}
                <div className="mb-5">
                  <p className="text-xs uppercase tracking-wider text-white/40 mb-2.5">Mood</p>
                  <div className="flex flex-wrap gap-2">
                    {["Chill", "Hype", "Sad", "Focus", "Night Drive", "Gym", "Study"].map(m => (
                      <button
                        key={m}
                        onClick={() => setMomentMood(m)}
                        className={cn(
                          "text-xs font-semibold px-3 py-1.5 rounded-full transition-colors",
                          momentMood === m
                            ? "bg-primary text-white"
                            : "bg-white/5 text-white/60 hover:bg-white/10"
                        )}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Caption */}
                <textarea
                  value={momentCaption}
                  onChange={e => setMomentCaption(e.target.value)}
                  placeholder="What does this lyric mean to you?"
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm focus:outline-none focus:border-primary mb-5 resize-none h-20 text-white placeholder:text-white/30"
                  data-testid="input-moment-caption"
                />

                {/* Song info strip */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 mb-5">
                  <img src={song.coverUrl} alt="cover" className="w-10 h-10 rounded-lg object-cover" />
                  <div>
                    <p className="text-xs font-semibold text-white">{song.title}</p>
                    <p className="text-[10px] text-white/50">{song.artist}</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowShareModal(false); setIsPlaying(true); }}
                    className="flex-1 py-3 rounded-full border border-white/20 text-white font-medium text-sm hover:bg-white/5"
                    data-testid="button-cancel-moment"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={isPostingMoment}
                    data-testid="button-post-moment"
                    onClick={async () => {
                      const baseSongId = song.id.split("-rank-")[0].split("-rapid-")[0].split("-discover")[0].split("-new")[0].split("-mood-")[0];
                      const lyricLine = song.lyrics[momentLyricIdx]?.text || song.title;
                      setIsPostingMoment(true);
                      try {
                        await api.createMoment({
                          songId: baseSongId,
                          lyricLine,
                          mood: momentMood,
                          caption: momentCaption || `Vibing to "${song.title}"`,
                        });
                        queryClient.invalidateQueries({ queryKey: ["moments"] });
                        queryClient.invalidateQueries({ queryKey: ["moments-trending"] });
                        setMomentPosted(true);
                      } catch {
                        toast({ title: "Couldn't post", description: "Something went wrong. Try again.", variant: "destructive" });
                      } finally {
                        setIsPostingMoment(false);
                      }
                    }}
                    className="flex-1 py-3 rounded-full bg-primary text-white font-semibold text-sm hover:bg-primary/90 disabled:opacity-50 transition-all"
                  >
                    {isPostingMoment ? "Posting…" : "Post Moment"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Moments Panel */}
      {showMomentsPanel && (
        <div
          className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col justify-end animate-in fade-in duration-300 pb-16"
          onClick={(e) => { e.stopPropagation(); setShowMomentsPanel(false); setIsPlaying(true); }}
        >
          <div
            className="bg-background border-t border-white/10 rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom-1/2 duration-300 max-h-[75vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2">
                <MessageSquareQuote size={16} className="text-purple-400" />
                <h3 className="text-base font-display font-bold text-white">Moments for this Song</h3>
                {songMoments.length > 0 && <span className="text-xs text-white/40">{songMoments.length}</span>}
              </div>
              <button
                onClick={() => { setShowMomentsPanel(false); setIsPlaying(true); }}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
              >
                <X size={16} className="text-white/70" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 py-2">
              {songMoments.length === 0 ? (
                <div className="py-12 flex flex-col items-center gap-3 text-center px-6">
                  <MessageSquareQuote size={36} className="text-white/10" />
                  <p className="text-sm text-white/40">No Moments yet for this song</p>
                  <p className="text-xs text-white/25">Tap the Moment button to be the first</p>
                </div>
              ) : (
                songMoments.map((moment: ApiMoment & { user: ApiUser }) => (
                  <div
                    key={moment.id}
                    data-testid={`moment-item-${moment.id}`}
                    className="px-5 py-4 border-b border-white/5 last:border-0"
                  >
                    <div className="flex items-start gap-3">
                      <img
                        src={moment.user.avatarUrl}
                        alt={moment.user.displayName}
                        className="w-9 h-9 rounded-full object-cover border border-white/10 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-sm font-semibold text-white">{moment.user.displayName}</span>
                          <span className="text-xs text-white/30">@{moment.user.username}</span>
                        </div>
                        <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl px-3 py-2 mb-2">
                          <p className="text-sm text-purple-200 italic">"{moment.lyricLine}"</p>
                        </div>
                        {moment.caption && (
                          <p className="text-xs text-white/60 mb-2">{moment.caption}</p>
                        )}
                        <div className="flex items-center gap-3">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-white/40 capitalize">{moment.mood}</span>
                          <div className="flex items-center gap-1 text-xs text-white/30">
                            <Heart size={11} />
                            <span>{moment.likes}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Comments Modal Overlay */}
      {showCommentsModal && (
        <div 
          className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col justify-end animate-in fade-in duration-300 pb-16"
          onClick={(e) => {
            e.stopPropagation();
            setShowCommentsModal(false);
          }}
        >
          <div 
            className="bg-background border-t border-white/10 rounded-t-3xl h-[70vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom-1/2 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-white/10 flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur z-10 rounded-t-3xl">
              <h3 className="font-display font-bold text-white">
                Comments <span className="text-white/50 text-sm font-normal ml-1">{(localCommentCount ?? song.comments).toLocaleString()}</span>
              </h3>
              <button
                onClick={() => setShowCommentsModal(false)}
                className="p-2 rounded-full hover:bg-white/10 text-white/70 transition-colors"
              >
                <Plus className="rotate-45" size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-white/20 overflow-hidden flex-shrink-0">
                  <img src="https://i.pravatar.cc/150?u=a1" alt="User" className="w-full h-full object-cover" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-white/90">Alex</span>
                    <span className="text-xs text-white/40">2h</span>
                  </div>
                  <p className="text-sm text-white/80">This beat drop is absolutely insane 🔥</p>
                  <div className="flex items-center gap-4 mt-2">
                    <button className="text-xs text-white/50 hover:text-white/80 flex items-center gap-1"><Heart size={12} /> 124</button>
                    <button className="text-xs text-white/50 hover:text-white/80">Reply</button>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-white/20 overflow-hidden flex-shrink-0">
                  <img src="https://i.pravatar.cc/150?u=b2" alt="User" className="w-full h-full object-cover" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-white/90">Sarah</span>
                    <span className="text-xs text-white/40">5h</span>
                  </div>
                  <p className="text-sm text-white/80">Been listening to this on repeat all day.</p>
                  <div className="flex items-center gap-4 mt-2">
                    <button className="text-xs text-white/50 hover:text-white/80 flex items-center gap-1"><Heart size={12} /> 89</button>
                    <button className="text-xs text-white/50 hover:text-white/80">Reply</button>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-white/20 overflow-hidden flex-shrink-0">
                  <img src="https://i.pravatar.cc/150?u=c3" alt="User" className="w-full h-full object-cover" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-white/90">Mike</span>
                    <span className="text-xs text-white/40">1d</span>
                  </div>
                  <p className="text-sm text-white/80">Does anyone know what synth they used for the lead?</p>
                  <div className="flex items-center gap-4 mt-2">
                    <button className="text-xs text-white/50 hover:text-white/80 flex items-center gap-1"><Heart size={12} /> 42</button>
                    <button className="text-xs text-white/50 hover:text-white/80">Reply</button>
                  </div>
                </div>
              </div>
              {/* User's own comments */}
              {localComments.map(c => (
                <div key={c.id} className="flex gap-3 animate-in slide-in-from-bottom-2 duration-300">
                  <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 ring-1 ring-primary/50">
                    <img src="https://i.pravatar.cc/150?u=vibescroller" alt="You" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-white/90">vibescroller</span>
                      <span className="text-xs text-white/40">just now</span>
                    </div>
                    <p className="text-sm text-white/90">{c.text}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <button className="text-xs text-white/50 hover:text-white/80 flex items-center gap-1"><Heart size={12} /> 0</button>
                      <button className="text-xs text-white/50 hover:text-white/80">Reply</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-white/10 bg-background sticky bottom-0">
              <div className="flex items-center gap-2 relative">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newComment.trim()) {
                      setLocalComments(prev => [...prev, { id: Date.now(), text: newComment.trim() }]);
                      setLocalCommentCount(c => (c ?? song.comments) + 1);
                      setNewComment("");
                    }
                  }}
                  placeholder="Add a comment..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:border-primary text-white pr-10 transition-colors"
                  data-testid="input-comment-feed"
                  autoFocus
                />
                <button
                  disabled={!newComment.trim()}
                  onClick={() => {
                    if (!newComment.trim()) return;
                    setLocalComments(prev => [...prev, { id: Date.now(), text: newComment.trim() }]);
                    setLocalCommentCount(c => (c ?? song.comments) + 1);
                    setNewComment("");
                  }}
                  className="absolute right-2 p-1.5 rounded-full bg-primary text-primary-foreground disabled:opacity-50 disabled:bg-white/10 disabled:text-white/30 transition-all"
                  data-testid="button-submit-comment-feed"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}