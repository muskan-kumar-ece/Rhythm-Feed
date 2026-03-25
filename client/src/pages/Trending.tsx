import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, Zap, MessageSquareQuote, Search, RefreshCw, Play, Flame, ArrowUpRight, Clock } from "lucide-react";
import { api, type ApiSong, type ApiTrendingMomentSong } from "@/lib/api";
import { cn } from "@/lib/utils";
import RythamLogo from "@/components/RythamLogo";

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function SongRow({
  song,
  rank,
  badge,
  extra,
}: {
  song: ApiSong;
  rank: number;
  badge?: React.ReactNode;
  extra?: React.ReactNode;
}) {
  const [pressed, setPressed] = useState(false);

  return (
    <button
      data-testid={`song-row-${song.id}`}
      onClick={() => setPressed(p => !p)}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 transition-colors",
        pressed ? "bg-white/10" : "hover:bg-white/5"
      )}
    >
      <span className={cn(
        "w-6 text-right text-sm font-bold shrink-0",
        rank <= 3 ? "text-yellow-400" : "text-white/30"
      )}>{rank}</span>

      <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 shadow-lg">
        <img src={song.coverUrl} alt={song.title} className="w-full h-full object-cover" />
      </div>

      <div className="flex-1 text-left min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-white truncate">{song.title}</p>
          {badge}
        </div>
        <p className="text-xs text-white/50 truncate">{song.artist}</p>
        {extra}
      </div>

      <div className="flex flex-col items-end gap-1 shrink-0">
        <div className="flex items-center gap-1 text-xs text-white/40">
          <Play size={10} />
          <span>{(song.features?.popularity?.recent24h?.plays ?? 0).toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-pink-400">
          <Flame size={10} />
          <span>{(song.likes ?? 0).toLocaleString()}</span>
        </div>
      </div>
    </button>
  );
}

function MomentSongRow({ song, rank }: { song: ApiTrendingMomentSong; rank: number }) {
  return (
    <button
      data-testid={`moment-song-row-${song.id}`}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors"
    >
      <span className={cn(
        "w-6 text-right text-sm font-bold shrink-0",
        rank <= 3 ? "text-yellow-400" : "text-white/30"
      )}>{rank}</span>

      <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 shadow-lg">
        <img src={song.coverUrl} alt={song.title} className="w-full h-full object-cover" />
      </div>

      <div className="flex-1 text-left min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-white truncate">{song.title}</p>
          <span className="shrink-0 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-purple-500/30 text-purple-300 border border-purple-500/30">
            {song.momentCount} moments
          </span>
        </div>
        <p className="text-xs text-white/50 truncate">{song.artist}</p>
        {song.topLyricLine && (
          <p className="text-xs text-white/30 truncate italic mt-0.5">"{song.topLyricLine}"</p>
        )}
      </div>

      <div className="flex flex-col items-end gap-1 shrink-0">
        <MessageSquareQuote size={14} className="text-purple-400" />
        <span className="text-xs text-white/40">{song.momentCount}</span>
      </div>
    </button>
  );
}

function SectionHeader({ icon, title, color, lastUpdated }: {
  icon: React.ReactNode;
  title: string;
  color: string;
  lastUpdated?: number;
}) {
  return (
    <div className={cn("px-4 py-3 flex items-center justify-between border-b border-white/5", color)}>
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm font-bold text-white">{title}</span>
      </div>
      {lastUpdated && (
        <div className="flex items-center gap-1 text-[10px] text-white/30">
          <Clock size={10} />
          <span>Updated {relativeTime(new Date(lastUpdated).toISOString())}</span>
        </div>
      )}
    </div>
  );
}

export default function Trending() {
  const [search, setSearch] = useState("");
  const [tick, setTick] = useState(Date.now());

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const { data: viral, isLoading: viralLoading, dataUpdatedAt: viralUpdated } = useQuery({
    queryKey: ["trending-viral", tick],
    queryFn: () => api.getTrendingViral(),
    staleTime: 28_000,
  });

  const { data: fastest, isLoading: fastestLoading, dataUpdatedAt: fastestUpdated } = useQuery({
    queryKey: ["trending-fastest", tick],
    queryFn: () => api.getTrendingFastest(),
    staleTime: 28_000,
  });

  const { data: momentSongs, isLoading: momentsLoading, dataUpdatedAt: momentsUpdated } = useQuery({
    queryKey: ["trending-moments", tick],
    queryFn: () => api.getTrendingMomentSongs(),
    staleTime: 28_000,
  });

  const filterSong = (s: ApiSong) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q);
  };

  const filteredViral    = (viral    ?? []).filter(filterSong);
  const filteredFastest  = (fastest  ?? []).filter(filterSong);
  const filteredMoments  = (momentSongs ?? []).filter(filterSong);

  const isLoading = viralLoading && fastestLoading && momentsLoading;

  return (
    <div className="h-[100dvh] w-full bg-background flex flex-col overflow-hidden page-enter">

      {/* Header */}
      <div className="pt-12 pb-3 px-4 bg-background/90 backdrop-blur-xl border-b border-white/5 shrink-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp size={18} className="text-primary" />
            <h1 className="text-xl font-display font-bold tracking-tight gradient-text-subtle">Trending</h1>
          </div>
          <div className="flex items-center gap-2">
            <RythamLogo size="xs" showMark />
            <div className="flex items-center gap-1 text-[10px] text-white/30">
              <RefreshCw size={10} className={isLoading ? "animate-spin" : ""} />
              <span>Live</span>
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse ml-1" />
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search trending songs..."
            data-testid="input-trending-search"
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pb-20">

        {/* Section 1: Viral */}
        <div className="mt-3">
          <SectionHeader
            icon={<Flame size={15} className="text-orange-400" />}
            title="🔥 Going Viral"
            color="bg-orange-500/5"
            lastUpdated={viralUpdated}
          />
          {viralLoading ? (
            <div className="p-8 flex justify-center">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredViral.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-white/30">No results</p>
          ) : (
            filteredViral.map((song, i) => (
              <SongRow
                key={song.id}
                song={song}
                rank={i + 1}
                badge={i < 3 ? (
                  <span className="shrink-0 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-orange-500/20 text-orange-300 border border-orange-500/30">
                    VIRAL
                  </span>
                ) : undefined}
              />
            ))
          )}
        </div>

        {/* Section 2: Fastest Growing */}
        <div className="mt-4">
          <SectionHeader
            icon={<ArrowUpRight size={15} className="text-green-400" />}
            title="📈 Fastest Growing"
            color="bg-green-500/5"
            lastUpdated={fastestUpdated}
          />
          {fastestLoading ? (
            <div className="p-8 flex justify-center">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredFastest.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-white/30">No results</p>
          ) : (
            filteredFastest.map((song, i) => (
              <SongRow
                key={song.id}
                song={song}
                rank={i + 1}
                badge={i < 3 ? (
                  <span className="shrink-0 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-green-500/20 text-green-300 border border-green-500/30">
                    <Zap size={8} className="inline -mt-0.5" /> HOT
                  </span>
                ) : undefined}
                extra={
                  <div className="flex items-center gap-1 mt-0.5">
                    <div className="flex items-center gap-0.5">
                      {[...Array(5)].map((_, j) => (
                        <div
                          key={j}
                          className={cn(
                            "h-1.5 w-1 rounded-sm",
                            j < (5 - i) ? "bg-green-400" : "bg-white/10"
                          )}
                        />
                      ))}
                    </div>
                    <span className="text-[9px] text-green-400">
                      +{Math.max(5, 85 - i * 8)}% growth
                    </span>
                  </div>
                }
              />
            ))
          )}
        </div>

        {/* Section 3: Trending in Moments */}
        <div className="mt-4 mb-4">
          <SectionHeader
            icon={<MessageSquareQuote size={15} className="text-purple-400" />}
            title="💬 Trending in Moments"
            color="bg-purple-500/5"
            lastUpdated={momentsUpdated}
          />
          {momentsLoading ? (
            <div className="p-8 flex justify-center">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredMoments.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <MessageSquareQuote size={32} className="text-white/10 mx-auto mb-2" />
              <p className="text-xs text-white/30">No songs have Moments yet</p>
              <p className="text-xs text-white/20 mt-1">Create Moments from the feed to see them here</p>
            </div>
          ) : (
            filteredMoments.map((song, i) => (
              <MomentSongRow key={song.id} song={song} rank={i + 1} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
