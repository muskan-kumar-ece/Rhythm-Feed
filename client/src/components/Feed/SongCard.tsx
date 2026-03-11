import { useState, useEffect, useRef } from "react";
import { Heart, MessageCircle, Share2, Bookmark, Plus, Check, Play, Pause, Disc3, Music2, Quote, RotateCcw } from "lucide-react";
import { Song } from "@/lib/dummyData";
import { cn } from "@/lib/utils";
import { trackListenBehavior } from "@/lib/tracking";

interface SongCardProps {
  song: Song;
  isActive: boolean;
  shouldPreload?: boolean;
}

export default function SongCard({ song, isActive, shouldPreload = false }: SongCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isFollowing, setIsFollowing] = useState(song.isFollowingArtist);
  const [currentLyricIndex, setCurrentLyricIndex] = useState(0);
  
  // Audio state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Initialize audio when url is provided or when preloading
  useEffect(() => {
    if (song.audioUrl && (isActive || shouldPreload)) {
      if (!audioRef.current) {
        audioRef.current = new Audio(song.audioUrl);
        audioRef.current.preload = "auto";
        audioRef.current.loop = false; // We handle loop manually for replay tracking
      } else if (audioRef.current.src !== song.audioUrl) {
        audioRef.current.src = song.audioUrl;
      }
    }
    
    return () => {
      if (audioRef.current && !isActive && !shouldPreload) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [song.audioUrl, isActive, shouldPreload]);
  
  // Share to moment state
  const [showShareModal, setShowShareModal] = useState(false);
  
  const progressRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  // Tracking state
  const [listenStartTime, setListenStartTime] = useState<number | null>(null);
  const [totalListenTimeMs, setTotalListenTimeMs] = useState(0);
  const [lastResumeTime, setLastResumeTime] = useState<number | null>(null);
  const [replays, setReplays] = useState(0);
  const [pauseCount, setPauseCount] = useState(0);

  // Mock playback logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isActive && isPlaying) {
      // Handle resuming logic for tracking
      if (!lastResumeTime) {
        setLastResumeTime(Date.now());
      }

      if (audioRef.current) {
        audioRef.current.play().catch(e => console.error("Audio playback failed:", e));
        
        // Update progress and lyrics based on real audio time
        interval = setInterval(() => {
          if (audioRef.current) {
            const currentTime = audioRef.current.currentTime;
            const duration = audioRef.current.duration || 1; // prevent div by zero
            
            setProgress((currentTime / duration) * 100);
            
            if (currentTime >= duration && duration > 1) {
              // Handle loop / replay
              setReplays(r => r + 1);
              audioRef.current.currentTime = 0;
              audioRef.current.play().catch(e => console.error(e));
            }
            
            // Sync lyrics based on real time
            const lyricIndex = song.lyrics.findIndex((lyric, idx) => {
              const nextLyric = song.lyrics[idx + 1];
              return currentTime >= lyric.time && (!nextLyric || currentTime < nextLyric.time);
            });
            
            if (lyricIndex !== -1) {
              setCurrentLyricIndex(lyricIndex);
            }
          }
        }, 100);
      } else {
        // Fallback for dummy tracks without audio
        interval = setInterval(() => {
          setProgress(p => {
            if (p >= 100) {
              setReplays(r => r + 1);
              return 0; // Loop mockup
            }
            return p + 0.5;
          });
        }, 50);
      }
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      // Handle pausing logic for tracking
      if (lastResumeTime) {
         setTotalListenTimeMs(prev => prev + (Date.now() - lastResumeTime));
         setLastResumeTime(null);
      }
    }
    
    return () => clearInterval(interval);
  }, [isActive, isPlaying, song.lyrics]);

  // Mock lyrics sync for fallback
  useEffect(() => {
    if (!audioRef.current && isActive && isPlaying) {
      const lyricIndex = Math.floor((progress / 100) * song.lyrics.length);
      setCurrentLyricIndex(Math.min(lyricIndex, Math.max(0, song.lyrics.length - 1)));
    }
  }, [progress, isActive, isPlaying, song.lyrics.length]);

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
      if (audioRef.current) {
         audioRef.current.currentTime = 0;
      }
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
        const skipTimeSeconds = isSkip && audioRef.current ? parseFloat(audioRef.current.currentTime.toFixed(1)) : null;
        
        const hour = new Date().getHours();
        let timeOfDay = "Night";
        if (hour >= 5 && hour < 12) timeOfDay = "Morning";
        else if (hour >= 12 && hour < 17) timeOfDay = "Afternoon";
        else if (hour >= 17 && hour < 21) timeOfDay = "Evening";

        trackListenBehavior({
          songId: song.id,
          songTitle: song.title,
          durationSeconds: parseFloat(durationSec.toFixed(1)),
          skipped: isSkip,
          skipTimeSeconds,
          replays,
          pauseCount,
          liked: isLiked,
          timestamp: new Date().toISOString(),
          timeOfDay
        });

        setListenStartTime(null);
        setLastResumeTime(null);
      }
    }
  }, [isActive]);

  const togglePlay = (e: React.MouseEvent) => {
    if (showShareModal) return;
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

  const restartSong = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(console.error);
    }
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
      <div className="relative flex-1 flex flex-col justify-end pb-24 px-4 z-10" onClick={togglePlay}>
        
        {/* Play/Pause Indicator (Fades out) */}
        <div className={cn(
          "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/40 backdrop-blur-md rounded-full p-6 transition-all duration-300",
          isPlaying ? "opacity-0 scale-150 pointer-events-none" : "opacity-100 scale-100",
          showShareModal && "hidden"
        )}>
          <Play fill="white" size={48} className="ml-2 text-white" />
        </div>

        <div className="flex items-end justify-between w-full">
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
                      onClick={(e) => { e.stopPropagation(); setIsFollowing(!isFollowing); }}
                      className={cn(
                        "px-2 py-0.5 rounded-full text-xs font-semibold transition-colors",
                        isFollowing ? "bg-white/10 text-white/70" : "bg-primary text-primary-foreground"
                      )}
                    >
                      {isFollowing ? 'Following' : 'Follow'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex flex-col items-center gap-6 pb-2">
            <button 
              onClick={(e) => { e.stopPropagation(); setIsLiked(!isLiked); }}
              className="flex flex-col items-center gap-1 group/btn"
            >
              <div className="w-12 h-12 rounded-full bg-white/5 backdrop-blur-md flex items-center justify-center group-hover/btn:bg-white/10 transition-colors">
                <Heart size={26} className={cn("transition-colors", isLiked ? "fill-destructive text-destructive" : "text-white")} />
              </div>
              <span className="text-xs font-medium text-white/80">
                {isLiked ? (song.likes + 1).toLocaleString() : song.likes.toLocaleString()}
              </span>
            </button>

            <button className="flex flex-col items-center gap-1 group/btn" onClick={(e) => e.stopPropagation()}>
              <div className="w-12 h-12 rounded-full bg-white/5 backdrop-blur-md flex items-center justify-center group-hover/btn:bg-white/10 transition-colors">
                <MessageCircle size={26} className="text-white" />
              </div>
              <span className="text-xs font-medium text-white/80">{song.comments}</span>
            </button>

            <button 
              onClick={(e) => { e.stopPropagation(); setIsSaved(!isSaved); }}
              className="flex flex-col items-center gap-1 group/btn"
            >
              <div className="w-12 h-12 rounded-full bg-white/5 backdrop-blur-md flex items-center justify-center group-hover/btn:bg-white/10 transition-colors">
                <Bookmark size={26} className={cn("transition-colors", isSaved ? "fill-primary text-primary" : "text-white")} />
              </div>
              <span className="text-xs font-medium text-white/80">{song.saves}</span>
            </button>

            <button 
              onClick={handleShareClick}
              className="flex flex-col items-center gap-1 group/btn"
            >
              <div className="w-12 h-12 rounded-full bg-primary/20 backdrop-blur-md flex items-center justify-center border border-primary/50 group-hover/btn:bg-primary/40 transition-colors">
                <Quote size={24} className="text-primary-foreground" />
              </div>
              <span className="text-xs font-medium text-primary">Moment</span>
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

      {/* Share to Moment Modal Overlay */}
      {showShareModal && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col justify-end animate-in fade-in duration-300 pb-16">
          <div className="bg-background border-t border-white/10 rounded-t-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-1/2 duration-300">
            <h3 className="text-2xl font-display font-bold text-white mb-2">Create a Moment</h3>
            <p className="text-sm text-white/50 mb-6">Share this song with the current lyric and mood.</p>
            
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-medium bg-primary/20 text-primary px-2 py-1 rounded">{song.mood}</span>
              </div>
              <p className="font-display text-xl font-bold text-white text-center italic mb-4">
                "{song.lyrics[currentLyricIndex]?.text || song.lyrics[0]?.text || ''}"
              </p>
              <div className="flex items-center gap-3 pt-4 border-t border-white/10">
                 <div className="w-8 h-8 rounded bg-white/10 overflow-hidden">
                    <img src={song.coverUrl} alt="cover" className="w-full h-full object-cover" />
                 </div>
                 <div>
                   <p className="text-xs font-semibold text-white">{song.title}</p>
                   <p className="text-[10px] text-white/50">{song.artist}</p>
                 </div>
              </div>
            </div>

            <textarea 
              placeholder="Add a caption..."
              className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm focus:outline-none focus:border-primary mb-6 resize-none h-24"
            />

            <div className="flex gap-4">
              <button 
                onClick={() => {
                  setShowShareModal(false);
                  setIsPlaying(true);
                }}
                className="flex-1 py-3 rounded-full border border-white/20 text-white font-medium text-sm hover:bg-white/5"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  // In a real app, this would dispatch to the Moments feed
                  setShowShareModal(false);
                  setIsPlaying(true);
                  // Optional: Show a toast notification here
                }}
                className="flex-1 py-3 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90"
              >
                Post Moment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}