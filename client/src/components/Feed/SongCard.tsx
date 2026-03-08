import { useState, useEffect, useRef } from "react";
import { Heart, MessageCircle, Share2, Bookmark, Plus, Check, Play, Pause, Disc3, Music2 } from "lucide-react";
import { Song } from "@/lib/dummyData";
import { cn } from "@/lib/utils";
import { trackListenBehavior } from "@/lib/tracking";

interface SongCardProps {
  song: Song;
  isActive: boolean;
}

export default function SongCard({ song, isActive }: SongCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isFollowing, setIsFollowing] = useState(song.isFollowingArtist);
  const [currentLyricIndex, setCurrentLyricIndex] = useState(0);
  
  const progressRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  // Tracking state
  const [listenStartTime, setListenStartTime] = useState<number | null>(null);
  const [replays, setReplays] = useState(0);

  // Mock playback
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive && isPlaying) {
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
    
    return () => clearInterval(interval);
  }, [isActive, isPlaying]);

  // Mock lyrics sync
  useEffect(() => {
    if (isActive && isPlaying) {
      const lyricIndex = Math.floor((progress / 100) * song.lyrics.length);
      setCurrentLyricIndex(Math.min(lyricIndex, song.lyrics.length - 1));
    }
  }, [progress, isActive, isPlaying, song.lyrics.length]);

  // Auto-play and Tracking when active
  useEffect(() => {
    if (isActive) {
      setIsPlaying(true);
      setProgress(0);
      setListenStartTime(Date.now());
      setReplays(0);
    } else {
      setIsPlaying(false);
      
      // Finalize tracking when card becomes inactive
      if (listenStartTime) {
        const durationMs = Date.now() - listenStartTime;
        const durationSec = durationMs / 1000;
        
        // Consider it a skip if listened for less than 5 seconds and no replays
        const isSkip = durationSec < 5 && replays === 0;
        
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
          replays,
          liked: isLiked,
          timestamp: new Date().toISOString(),
          timeOfDay
        });

        setListenStartTime(null);
      }
    }
  }, [isActive]);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPlaying(!isPlaying);
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
          isPlaying ? "opacity-0 scale-150 pointer-events-none" : "opacity-100 scale-100"
        )}>
          <Play fill="white" size={48} className="ml-2 text-white" />
        </div>

        {/* Top Mood Badge */}
        <div className="absolute top-12 left-4">
          <div className="glass px-4 py-1.5 rounded-full flex items-center gap-2">
            <Music2 size={14} className="text-primary" />
            <span className="text-xs font-medium text-white/90">{song.mood} Mix</span>
          </div>
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
              <h2 className="text-3xl font-display font-bold text-white drop-shadow-lg leading-tight">
                {song.title}
              </h2>
              
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

            <button className="flex flex-col items-center gap-1 group/btn" onClick={(e) => e.stopPropagation()}>
              <div className="w-12 h-12 rounded-full bg-white/5 backdrop-blur-md flex items-center justify-center group-hover/btn:bg-white/10 transition-colors">
                <Share2 size={26} className="text-white" />
              </div>
              <span className="text-xs font-medium text-white/80">Share</span>
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
    </div>
  );
}