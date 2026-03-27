import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search as SearchIcon, X, TrendingUp, Hash, UserPlus, Play, Music2, Mic2, UserCheck } from "lucide-react";
import { api, ApiSong } from "@/lib/api";
import { cn } from "@/lib/utils";
import RythamLogo from "@/components/RythamLogo";

const MOOD_IMAGES = [
  { mood: "Night Drive", img: "https://images.unsplash.com/photo-1618609378039-b572f369a0c9?q=80&w=500", color: "from-blue-900/80" },
  { mood: "Gym",        img: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=500", color: "from-red-900/80" },
  { mood: "Study",      img: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?q=80&w=500", color: "from-indigo-900/80" },
  { mood: "Chill",      img: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=500", color: "from-teal-900/80" },
  { mood: "Hype",       img: "https://images.unsplash.com/photo-1574169208507-84376144848b?q=80&w=500", color: "from-orange-900/80" },
  { mood: "Focus",      img: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?q=80&w=500", color: "from-violet-900/80" },
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

function SkeletonSearchResults() {
  return (
    <div className="space-y-2 px-4 pt-4 animate-in fade-in duration-200">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
          <div className="w-12 h-12 rounded-xl skeleton shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 rounded-full skeleton w-3/4" />
            <div className="h-2.5 rounded-full skeleton w-1/2" />
          </div>
          <div className="h-5 w-14 rounded-full skeleton shrink-0" />
        </div>
      ))}
    </div>
  );
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
    <div className="min-h-screen bg-background pb-24 page-enter">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="pt-12 pb-4 px-4 sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-3xl font-display font-bold tracking-tight gradient-text-subtle">Discover</h1>
          <RythamLogo size="xs" showMark />
        </div>

        {/* Search input */}
        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35" size={18} />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Songs, artists, moods…"
            className="w-full bg-white/[0.07] border border-white/[0.10] rounded-full py-3 pl-11 pr-10 text-white text-sm placeholder:text-white/35 focus:outline-none focus:border-primary/50 focus:bg-white/[0.10] transition-all duration-200"
            data-testid="input-search"
          />
          {query && (
            <button
              data-testid="button-clear-search"
              onClick={() => setQuery("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white/15 flex items-center justify-center text-white/60 hover:bg-white/25 transition-colors"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* ── Search Results ───────────────────────────────────────────────────── */}
      {debouncedQuery.length >= 2 && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">

          {/* Results header */}
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <p className="section-label">
              {isFetching ? "Searching…" : `${results.length} result${results.length !== 1 ? "s" : ""} for "${debouncedQuery}"`}
            </p>
            {isFetching && (
              <div className="w-3.5 h-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            )}
          </div>

          {/* Skeleton while fetching */}
          {isFetching && <SkeletonSearchResults />}

          {/* Empty state */}
          {!isFetching && results.length === 0 && (
            <div className="empty-state mt-4">
              <div className="empty-state-icon">
                <Music2 size={22} className="text-white/25" />
              </div>
              <p className="text-white/50 text-sm font-medium">No songs found</p>
              <p className="text-white/30 text-xs mt-0.5">Try a different title, artist, or mood</p>
            </div>
          )}

          {/* Results list */}
          {!isFetching && results.length > 0 && (
            <div className="space-y-2 px-4 pb-4">
              {results.map(song => (
                <div
                  key={song.id}
                  data-testid={`card-search-result-${song.id}`}
                  className="card-interactive group"
                >
                  <div className="thumb-md relative">
                    <img src={song.coverUrl} alt={song.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                      <Play size={16} className="text-white fill-white ml-0.5" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white text-sm truncate">{song.title}</h3>
                    <p className="text-xs text-white/45 truncate mt-0.5">{song.artist}</p>
                  </div>
                  <span className="chip-primary shrink-0">{song.mood}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Discovery (no query) ────────────────────────────────────────────── */}
      {debouncedQuery.length < 2 && (
        <div className="px-4 py-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

          {/* Trending Tags */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
                <TrendingUp size={14} className="text-primary" />
              </div>
              <h2 className="text-base font-bold text-white">Trending Tags</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {TRENDING_TAGS.map(tag => (
                <button
                  key={tag}
                  data-testid={`button-tag-${tag}`}
                  onClick={() => handleTagClick(tag)}
                  className="chip"
                >
                  <Hash size={12} className="text-primary" />
                  {tag.replace("#", "")}
                </button>
              ))}
            </div>
          </section>

          {/* Explore Moods */}
          <section>
            <h2 className="text-base font-bold text-white mb-4">Explore Moods</h2>
            <div className="grid grid-cols-2 gap-3">
              {MOOD_IMAGES.map(({ mood, img, color }) => (
                <button
                  key={mood}
                  data-testid={`button-mood-${mood.replace(" ", "-").toLowerCase()}`}
                  onClick={() => handleMoodClick(mood)}
                  className="aspect-[4/3] rounded-2xl relative overflow-hidden group cursor-pointer border border-white/[0.08] active:scale-[0.97] transition-transform duration-150"
                >
                  <img
                    src={img}
                    alt={mood}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  {/* Gradient overlay */}
                  <div className={cn("absolute inset-0 bg-gradient-to-t", color, "to-transparent")} />
                  <div className="absolute inset-0 bg-black/25 group-hover:bg-black/10 transition-colors duration-300" />
                  {/* Label */}
                  <div className="absolute inset-0 p-3.5 flex flex-col justify-end">
                    <h3 className="font-display font-bold text-white text-base drop-shadow-lg leading-tight">{mood}</h3>
                  </div>
                  {/* Play button */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-primary/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100 shadow-xl glow-primary">
                    <Play size={18} className="text-white fill-white ml-0.5" />
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Suggested Artists */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-accent/20 flex items-center justify-center">
                <Mic2 size={14} className="text-accent" />
              </div>
              <h2 className="text-base font-bold text-white">Suggested Artists</h2>
            </div>
            <div className="space-y-2.5">
              {SUGGESTED_ARTISTS.map(user => (
                <div
                  key={user.handle}
                  data-testid={`card-artist-${user.handle}`}
                  className="card-interactive"
                >
                  <div className="w-11 h-11 rounded-full overflow-hidden shrink-0 border border-white/10">
                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white text-sm">{user.name}</h3>
                    <p className="text-xs text-white/40 mt-0.5">{user.handle} · {user.followers} followers</p>
                  </div>
                  <button
                    data-testid={`button-follow-${user.handle}`}
                    onClick={() => toggleFollow(user.handle)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 shrink-0",
                      followed.has(user.handle)
                        ? "bg-primary/20 text-primary border border-primary/30"
                        : "bg-white/8 text-white/70 border border-white/12 hover:bg-white/15 hover:text-white"
                    )}
                  >
                    {followed.has(user.handle) ? (
                      <><UserCheck size={12} /> Following</>
                    ) : (
                      <><UserPlus size={12} /> Follow</>
                    )}
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
