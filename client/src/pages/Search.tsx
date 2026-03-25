import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search as SearchIcon, X, TrendingUp, Hash, UserPlus, Play, Music2 } from "lucide-react";
import { api, ApiSong } from "@/lib/api";
import { cn } from "@/lib/utils";

const MOOD_IMAGES = [
  { mood: "Night Drive", img: "https://images.unsplash.com/photo-1618609378039-b572f369a0c9?q=80&w=500" },
  { mood: "Gym",        img: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=500" },
  { mood: "Study",      img: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?q=80&w=500" },
  { mood: "Chill",      img: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=500" },
  { mood: "Hype",       img: "https://images.unsplash.com/photo-1574169208507-84376144848b?q=80&w=500" },
  { mood: "Focus",      img: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?q=80&w=500" },
];

const TRENDING_TAGS = ["#synthwave", "#gymhype", "#studymode", "#latenight", "#newreleases"];

const SUGGESTED_ARTISTS = [
  { name: "Neon Vibes",  handle: "@neonvibes",  followers: "12.4K", avatar: "https://i.pravatar.cc/150?u=neon"  },
  { name: "ChillHop",    handle: "@chillhop",   followers: "89K",   avatar: "https://i.pravatar.cc/150?u=chill" },
  { name: "DJ Drift",    handle: "@djdrift",    followers: "3.2K",  avatar: "https://i.pravatar.cc/150?u=drift" },
];

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function Search() {
  const [query, setQuery]         = useState("");
  const [followed, setFollowed]   = useState<Set<string>>(new Set());
  const debouncedQuery            = useDebounce(query.trim(), 300);

  const { data: results = [], isFetching } = useQuery<ApiSong[]>({
    queryKey: ["search", debouncedQuery],
    queryFn:  () => api.searchSongs(debouncedQuery),
    enabled:  debouncedQuery.length >= 2,
    staleTime: 30_000,
  });

  const handleTagClick = (tag: string) => setQuery(tag.replace("#", ""));
  const handleMoodClick = (mood: string) => setQuery(mood);
  const toggleFollow = (handle: string) =>
    setFollowed(prev => {
      const next = new Set(prev);
      next.has(handle) ? next.delete(handle) : next.add(handle);
      return next;
    });

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
            data-testid="input-search"
          />
          {query && (
            <button
              data-testid="button-clear-search"
              onClick={() => setQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Search Results */}
      {debouncedQuery.length >= 2 && (
        <div className="px-4 py-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider">
              Results for "{debouncedQuery}"
            </h2>
            {isFetching && (
              <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            )}
          </div>

          {!isFetching && results.length === 0 && (
            <div className="text-center py-12">
              <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
                <Music2 size={22} className="text-white/30" />
              </div>
              <p className="text-white/50 text-sm">No songs found for "{debouncedQuery}"</p>
              <p className="text-white/30 text-xs mt-1">Try a different title, artist, or mood</p>
            </div>
          )}

          <div className="space-y-2">
            {results.map(song => (
              <div
                key={song.id}
                data-testid={`card-search-result-${song.id}`}
                className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group border border-transparent hover:border-white/10"
              >
                <div className="w-12 h-12 rounded-xl overflow-hidden relative shrink-0">
                  <img src={song.coverUrl} alt={song.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play size={16} className="text-white fill-white ml-0.5" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white text-sm truncate">{song.title}</h3>
                  <p className="text-xs text-white/50 truncate">{song.artist}</p>
                </div>
                <span className="text-[10px] font-medium bg-primary/15 text-primary px-2 py-0.5 rounded-full border border-primary/20 shrink-0">
                  {song.mood}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Discovery content (shown when no query) */}
      {debouncedQuery.length < 2 && (
        <div className="px-4 py-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

          {/* Trending Tags */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={20} className="text-primary" />
              <h2 className="text-lg font-bold text-white">Trending Tags</h2>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {TRENDING_TAGS.map(tag => (
                <button
                  key={tag}
                  data-testid={`button-tag-${tag}`}
                  onClick={() => handleTagClick(tag)}
                  className="flex items-center gap-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full px-4 py-2 text-sm text-white/80 transition-colors"
                >
                  <Hash size={14} className="text-primary" />
                  {tag.replace("#", "")}
                </button>
              ))}
            </div>
          </section>

          {/* Explore Moods */}
          <section>
            <h2 className="text-lg font-bold text-white mb-4">Explore Moods</h2>
            <div className="grid grid-cols-2 gap-3">
              {MOOD_IMAGES.map(({ mood, img }) => (
                <button
                  key={mood}
                  data-testid={`button-mood-${mood.replace(" ", "-").toLowerCase()}`}
                  onClick={() => handleMoodClick(mood)}
                  className="aspect-[4/3] rounded-2xl relative overflow-hidden group cursor-pointer border border-white/5"
                >
                  <img src={img} alt={mood} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors" />
                  <div className="absolute inset-0 p-4 flex flex-col justify-end">
                    <h3 className="font-display font-bold text-white text-lg drop-shadow-lg">{mood}</h3>
                  </div>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100 shadow-xl">
                    <Play size={20} className="text-white fill-white ml-0.5" />
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Suggested Artists */}
          <section>
            <h2 className="text-lg font-bold text-white mb-4">Suggested Artists</h2>
            <div className="space-y-3">
              {SUGGESTED_ARTISTS.map(user => (
                <div
                  key={user.handle}
                  data-testid={`card-artist-${user.handle}`}
                  className="flex items-center justify-between p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors border border-transparent hover:border-white/10"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden">
                      <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white text-sm">{user.name}</h3>
                      <p className="text-xs text-white/50">{user.handle} • {user.followers}</p>
                    </div>
                  </div>
                  <button
                    data-testid={`button-follow-${user.handle}`}
                    onClick={() => toggleFollow(user.handle)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-semibold transition-all",
                      followed.has(user.handle)
                        ? "bg-primary/20 text-primary border border-primary/30"
                        : "bg-white/10 text-white hover:bg-white/20"
                    )}
                  >
                    {followed.has(user.handle) ? "Following" : "Follow"}
                  </button>
                </div>
              ))}
            </div>
          </section>

        </div>
      )}
    </div>
  );
}
