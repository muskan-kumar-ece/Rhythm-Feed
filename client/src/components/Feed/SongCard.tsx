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
  
  // Share to moment & comments state
  const [showShareModal, setShowShareModal] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [newComment, setNewComment] = useState("");
  
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

  // Double tap to like logic
  const [lastTapTime, setLastTapTime] = useState(0);

  const handleContainerClick = (e: React.MouseEvent) => {
    if (showShareModal || showCommentsModal) return;
    
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300; // ms
    
    if (now - lastTapTime < DOUBLE_TAP_DELAY) {
      // Double tap detected
      if (!isLiked) {
        setIsLiked(true);
        // Trigger animation
        setShowHeartAnimation(true);
        setTimeout(() => setShowHeartAnimation(false), 1000);
      }
    } else {
      // Single tap (play/pause) - wait a tiny bit to make sure it's not a double tap
      setTimeout(() => {
        if (Date.now() - now >= DOUBLE_TAP_DELAY) {
          togglePlay(e);
        }
      }, DOUBLE_TAP_DELAY);
    }
    
    setLastTapTime(now);
  };

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
      <div className="relative flex-1 flex flex-col justify-end pb-24 px-4 z-10" onClick={handleContainerClick}>
        
        {/* Play/Pause Indicator (Fades out) */}
        <div className={cn(
          "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/40 backdrop-blur-md rounded-full p-6 transition-all duration-300",
          isPlaying ? "opacity-0 scale-150 pointer-events-none" : "opacity-100 scale-100",
          (showShareModal || showCommentsModal || showHeartAnimation) && "hidden"
        )}>
          <Play fill="white" size={48} className="ml-2 text-white" />
        </div>

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
          {[...Array(12)].map((_, i) => (
            <div 
              key={i} 
              className="w-1.5 bg-primary/80 rounded-t-sm"
              style={{
                height: isPlaying ? `${Math.max(10, Math.random() * 100)}%` : '10%',
                animation: isPlaying ? `equalizer ${0.5 + Math.random() * 0.5}s ease-in-out infinite alternate` : 'none',
                animationDelay: `${i * 0.1}s`
              }}
            />
          ))}
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
              <span className="text-xs font-medium text-white/80 drop-shadow-md">
                {isLiked ? (song.likes + 1).toLocaleString() : song.likes.toLocaleString()}
              </span>
            </button>

            <button 
              onClick={handleCommentClick}
              className="flex flex-col items-center gap-1 group/btn"
            >
              <div className="w-12 h-12 rounded-full bg-white/5 backdrop-blur-md flex items-center justify-center group-hover/btn:bg-white/10 transition-colors">
                <MessageCircle size={26} className="text-white" />
              </div>
              <span className="text-xs font-medium text-white/80 drop-shadow-md">{song.comments.toLocaleString()}</span>
            </button>

            <button 
              onClick={(e) => { e.stopPropagation(); setIsSaved(!isSaved); }}
              className="flex flex-col items-center gap-1 group/btn"
            >
              <div className="w-12 h-12 rounded-full bg-white/5 backdrop-blur-md flex items-center justify-center group-hover/btn:bg-white/10 transition-colors">
                <Bookmark size={26} className={cn("transition-colors", isSaved ? "fill-primary text-primary" : "text-white")} />
              </div>
              <span className="text-xs font-medium text-white/80 drop-shadow-md">{song.saves.toLocaleString()}</span>
            </button>

            <button 
              onClick={handleShareClick}
              className="flex flex-col items-center gap-1 group/btn"
            >
              <div className="w-12 h-12 rounded-full bg-primary/20 backdrop-blur-md flex items-center justify-center border border-primary/50 group-hover/btn:bg-primary/40 transition-colors">
                <Quote size={24} className="text-primary-foreground" />
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
              className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm focus:outline-none focus:border-primary mb-6 resize-none h-24 text-white"
            />

            <div className="flex gap-4">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowShareModal(false);
                  setIsPlaying(true);
                }}
                className="flex-1 py-3 rounded-full border border-white/20 text-white font-medium text-sm hover:bg-white/5"
              >
                Cancel
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
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
              <h3 className="font-display font-bold text-white">Comments <span className="text-white/50 text-sm font-normal ml-1">{song.comments.toLocaleString()}</span></h3>
              <button 
                onClick={() => setShowCommentsModal(false)}
                className="p-2 rounded-full hover:bg-white/10 text-white/70 transition-colors"
              >
                <Plus className="rotate-45" size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
              {/* Dummy Comments */}
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
                    <button className="text-xs text-white/50 hover:text-white/80 flex items-center gap-1">
                      <Heart size={12} /> 124
                    </button>
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
                    <button className="text-xs text-white/50 hover:text-white/80 flex items-center gap-1">
                      <Heart size={12} /> 89
                    </button>
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
                    <button className="text-xs text-white/50 hover:text-white/80 flex items-center gap-1">
                      <Heart size={12} /> 42
                    </button>
                    <button className="text-xs text-white/50 hover:text-white/80">Reply</button>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-white/10 bg-background sticky bottom-0">
              <div className="flex items-center gap-2 relative">
                <input 
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:border-primary text-white pr-10 transition-colors"
                />
                <button 
                  disabled={!newComment.trim()}
                  onClick={() => setNewComment("")}
                  className="absolute right-2 p-1.5 rounded-full bg-primary text-primary-foreground disabled:opacity-50 disabled:bg-white/10 disabled:text-white/30 transition-all"
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