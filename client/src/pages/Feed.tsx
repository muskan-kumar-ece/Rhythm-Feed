import { useState, useRef, useEffect, useCallback } from "react";
import SongCard from "@/components/Feed/SongCard";
import { Song } from "@/lib/dummyData";
import { generateFeedSegment } from "@/lib/recommendation";

export default function Feed() {
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // State for infinite feed
  const [feedItems, setFeedItems] = useState<Song[]>([]);

  // Initialize feed
  useEffect(() => {
    setFeedItems(generateFeedSegment());
  }, []);

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
      setFeedItems(prev => [...prev, ...generateFeedSegment()]);
    }
  }, [activeIndex, feedItems.length]);

  if (feedItems.length === 0) {
    return <div className="h-[100dvh] w-full bg-black flex items-center justify-center text-white/50">Loading feed...</div>;
  }

  return (
    <div 
      ref={containerRef}
      onScroll={handleScroll}
      className="h-[100dvh] w-full overflow-y-scroll snap-y snap-mandatory no-scrollbar bg-black"
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
  );
}