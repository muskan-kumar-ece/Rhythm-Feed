import { useState } from "react";
import { Search as SearchIcon, X, TrendingUp, Hash, UserPlus, Play } from "lucide-react";
import { dummySongs } from "@/lib/dummyData";

export default function Search() {
  const [query, setQuery] = useState("");
  
  const trendingTags = ["#synthwave", "#gymhype", "#studymode", "#latenight", "#newreleases"];
  
  const suggestedUsers = [
    { name: "Neon Vibes", handle: "@neonvibes", followers: "12.4K", avatar: "https://i.pravatar.cc/150?u=neon" },
    { name: "ChillHop", handle: "@chillhop", followers: "89K", avatar: "https://i.pravatar.cc/150?u=chill" },
    { name: "DJ Drift", handle: "@djdrift", followers: "3.2K", avatar: "https://i.pravatar.cc/150?u=drift" }
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Search Header */}
      <div className="pt-12 pb-4 px-4 sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-white/5">
        <h1 className="text-3xl font-display font-bold text-white mb-4">Discover</h1>
        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={20} />
          <input 
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search songs, artists, or moods..."
            className="w-full bg-white/10 border border-white/10 rounded-full py-3 pl-12 pr-10 text-white placeholder:text-white/40 focus:outline-none focus:border-primary transition-all focus:bg-white/15"
          />
          {query && (
            <button 
              onClick={() => setQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="px-4 py-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Trending Tags */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={20} className="text-primary" />
            <h2 className="text-lg font-bold text-white">Trending Tags</h2>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {trendingTags.map(tag => (
              <button key={tag} className="flex items-center gap-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full px-4 py-2 text-sm text-white/80 transition-colors">
                <Hash size={14} className="text-primary" />
                {tag.replace('#', '')}
              </button>
            ))}
          </div>
        </section>

        {/* Explore Moods (Visual grid) */}
        <section>
          <h2 className="text-lg font-bold text-white mb-4">Explore Moods</h2>
          <div className="grid grid-cols-2 gap-3">
            {['Night Drive', 'Gym', 'Study', 'Chill', 'Hype', 'Focus'].map((mood, i) => {
              const dummySong = dummySongs.find(s => s.features.mood.includes(mood)) || dummySongs[i % dummySongs.length];
              
              return (
                <div key={mood} className="aspect-[4/3] rounded-2xl relative overflow-hidden group cursor-pointer border border-white/5">
                  <img src={dummySong.coverUrl} alt={mood} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors" />
                  <div className="absolute inset-0 p-4 flex flex-col justify-end">
                    <h3 className="font-display font-bold text-white text-lg drop-shadow-lg">{mood}</h3>
                  </div>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100 shadow-xl">
                     <Play size={20} className="text-white fill-white ml-0.5" />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Suggested Artists */}
        <section>
          <h2 className="text-lg font-bold text-white mb-4">Suggested Artists</h2>
          <div className="space-y-3">
            {suggestedUsers.map(user => (
              <div key={user.handle} className="flex items-center justify-between p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors border border-transparent hover:border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden">
                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-sm">{user.name}</h3>
                    <p className="text-xs text-white/50">{user.handle} • {user.followers}</p>
                  </div>
                </div>
                <button className="px-3 py-1.5 rounded-full bg-white/10 text-white text-xs font-semibold hover:bg-white/20 transition-colors">
                  Follow
                </button>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}