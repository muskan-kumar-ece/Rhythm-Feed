import { useState, useRef, useEffect } from "react";
import SongCard from "@/components/Feed/SongCard";
import { dummySongs } from "@/lib/dummyData";

export default function Feed() {
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (!containerRef.current) return;
    
    // Calculate which card is most visible
    const container = containerRef.current;
    const scrollPosition = container.scrollTop;
    const windowHeight = window.innerHeight;
    
    // Using snap points, the index is roughly scrollPosition / windowHeight
    const index = Math.round(scrollPosition / windowHeight);
    
    if (index !== activeIndex && index >= 0 && index < dummySongs.length) {
      setActiveIndex(index);
    }
  };

  return (
    <div 
      ref={containerRef}
      onScroll={handleScroll}
      className="h-[100dvh] w-full overflow-y-scroll snap-y snap-mandatory no-scrollbar bg-black"
    >
      {dummySongs.map((song, index) => (
        <SongCard 
          key={song.id} 
          song={song} 
          isActive={index === activeIndex} 
        />
      ))}
      
      {/* End of feed indicator */}
      <div className="h-[100dvh] w-full snap-start snap-always bg-black flex flex-col items-center justify-center gap-4 text-white/50">
        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
          <span className="text-2xl font-display">✨</span>
        </div>
        <h3 className="font-display font-medium text-xl text-white/80">You're all caught up</h3>
        <p className="text-sm">We're generating a new feed for your mood...</p>
        
        <button 
          onClick={() => {
            if (containerRef.current) {
              containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }}
          className="mt-8 px-6 py-2 rounded-full border border-white/10 hover:bg-white/5 transition-colors"
        >
          Back to Top
        </button>
      </div>
    </div>
  );
}