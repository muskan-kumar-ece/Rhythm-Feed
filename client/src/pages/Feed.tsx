import { useState, useRef, useEffect, useCallback } from "react";
import SongCard from "@/components/Feed/SongCard";
import { Song } from "@/lib/dummyData";
import { generateFeedSegment, generateMoodFeedSegment } from "@/lib/recommendation";
import { Sparkles, Activity, Map, Disc } from "lucide-react";
import { cn } from "@/lib/utils";

const MOODS = ["For You", "Focus", "Night Drive", "Gym", "Study", "Chill", "Sad", "Hype"];

export default function Feed() {
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedMood, setSelectedMood] = useState("For You");
  
  // State for infinite feed
  const [feedItems, setFeedItems] = useState<Song[]>([]);

  // Initialize or reset feed when mood changes
  useEffect(() => {
    setActiveIndex(0);
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
    
    if (selectedMood === "For You") {
      setFeedItems(generateFeedSegment());
    } else {
      setFeedItems(generateMoodFeedSegment(selectedMood));
    }
  }, [selectedMood]);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    const scrollPosition = container.scrollTop;
    const windowHeight = window.innerHeight;
    
    // Using snap points, the index is roughly scrollPosition / windowHeight
    const index = Math.round(scrollPosition / windowHeight);
    
    if (index !== activeIndex && index >= 0 && index < feedItems.length) {
      setActiveIndex(index);
    }
    
    // Infinite loading: append more curated items when reaching the end
    if (index >= feedItems.length - 2) {
      if (selectedMood === "For You") {
        setFeedItems(prev => [...prev, ...generateFeedSegment()]);
      } else {
        setFeedItems(prev => [...prev, ...generateMoodFeedSegment(selectedMood)]);
      }
    }
  }, [activeIndex, feedItems.length, selectedMood]);

  if (feedItems.length === 0) {
    return <div className="h-[100dvh] w-full bg-black flex items-center justify-center text-white/50">Loading feed...</div>;
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
                selectedMood === mood ? "text-white scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" : "text-white/40 hover:text-white/70"
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

      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full w-full overflow-y-scroll snap-y snap-mandatory no-scrollbar"
      >
        {feedItems.map((song, index) => {
          // Performance optimization: only fully render components near the active index
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
            />
          );
        })}
      </div>
    </div>
  );
}