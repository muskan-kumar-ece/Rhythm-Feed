import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, MessageCircle, PlayCircle, MoreHorizontal, Plus, Quote, TrendingUp, Disc3, Flame, Music2 } from "lucide-react";
import { ApiMoment, ApiSong, api } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function Moments() {
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [activeMoment, setActiveMoment]           = useState<ApiMoment | null>(null);
  const [newComment, setNewComment]               = useState("");
  const [activeSection, setActiveSection]         = useState<"forYou" | "trending">("forYou");

  const { data: moments, isLoading } = useQuery({
    queryKey: ["moments"],
    queryFn:  () => api.getMoments(),
  });

  const { data: trendingMoments } = useQuery({
    queryKey: ["moments-trending"],
    queryFn:  () => api.getTrendingMoments(),
  });

  const { data: discoverSongs } = useQuery({
    queryKey: ["moments-discover-songs"],
    queryFn:  () => api.getSongsFromMoments(),
  });

  // Sort "For You" feed by engagement score (likes*2 + comments) with some recency
  const sortedMoments = [...(moments ?? [])].sort((a, b) => {
    const scoreA = a.likes * 2 + a.comments;
    const scoreB = b.likes * 2 + b.comments;
    return scoreB - scoreA;
  });

  const displayMoments = activeSection === "trending"
    ? (trendingMoments ?? [])
    : sortedMoments;

  const handleCommentClick = (moment: ApiMoment) => {
    setActiveMoment(moment);
    setShowCommentsModal(true);
  };

  return (
    <div className="min-h-screen bg-background pb-20 relative">

      {/* Header */}
      <header className="pt-12 pb-4 px-6 sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-display font-bold text-white tracking-tight">Moments</h1>
          <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
            <Quote size={18} className="text-primary" />
          </div>
        </div>

        {/* Section tabs */}
        <div className="flex gap-1 bg-white/5 rounded-2xl p-1">
          <button
            onClick={() => setActiveSection("forYou")}
            data-testid="tab-for-you"
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all",
              activeSection === "forYou"
                ? "bg-primary/20 text-primary border border-primary/30"
                : "text-white/50 hover:text-white/70"
            )}
          >
            <Music2 size={14} />
            For You
          </button>
          <button
            onClick={() => setActiveSection("trending")}
            data-testid="tab-trending"
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all",
              activeSection === "trending"
                ? "bg-primary/20 text-primary border border-primary/30"
                : "text-white/50 hover:text-white/70"
            )}
          >
            <Flame size={14} />
            Trending
          </button>
        </div>
      </header>

      <main className="p-4 space-y-6">

        {/* ── Discover Songs from Moments ────────────────────────────── */}
        {discoverSongs && discoverSongs.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={14} className="text-accent" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-white/60">Discover via Moments</h2>
            </div>
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
              {discoverSongs.map(song => (
                <DiscoverSongPill key={song.id} song={song} />
              ))}
            </div>
          </section>
        )}

        {/* ── Section label for trending ───────────────────────────── */}
        {activeSection === "trending" && (
          <div className="flex items-center gap-2">
            <Flame size={14} className="text-orange-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-orange-400/80">
              Top moments this week
            </span>
          </div>
        )}

        {/* ── Moments feed ─────────────────────────────────────────── */}
        {isLoading && (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {displayMoments.map((moment, i) => (
          <MomentCard
            key={`${moment.id}-${i}`}
            moment={moment}
            onCommentClick={() => handleCommentClick(moment)}
            isTrending={activeSection === "trending" && i < 3}
            rank={activeSection === "trending" ? i + 1 : undefined}
          />
        ))}

        {!isLoading && displayMoments.length === 0 && (
          <div className="text-center py-16 text-white/30">
            <Quote size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No moments yet.</p>
            <p className="text-xs mt-1">Create one from the music feed!</p>
          </div>
        )}

        {displayMoments.length > 0 && (
          <div className="text-center py-10 text-white/30 text-xs">You've caught up!</div>
        )}
      </main>

      {/* Comments Modal */}
      {showCommentsModal && activeMoment && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col justify-end animate-in fade-in duration-300 pb-16"
          onClick={() => setShowCommentsModal(false)}
        >
          <div
            className="bg-background border-t border-white/10 rounded-t-3xl h-[70vh] max-w-md w-full mx-auto flex flex-col shadow-2xl animate-in slide-in-from-bottom-1/2 duration-300"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b border-white/10 flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur z-10 rounded-t-3xl">
              <h3 className="font-display font-bold text-white">
                Comments <span className="text-white/50 text-sm font-normal ml-1">{activeMoment.comments.toLocaleString()}</span>
              </h3>
              <button onClick={() => setShowCommentsModal(false)} className="p-2 rounded-full hover:bg-white/10 text-white/70">
                <Plus className="rotate-45" size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
              <div className="flex gap-3">
                <img src="https://i.pravatar.cc/150?u=u1" alt="User" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-white/90">User123</span>
                    <span className="text-xs text-white/40">1h</span>
                  </div>
                  <p className="text-sm text-white/80">Such a vibe ✨</p>
                  <div className="flex items-center gap-4 mt-2">
                    <button className="text-xs text-white/50 hover:text-white/80 flex items-center gap-1"><Heart size={12} /> 12</button>
                    <button className="text-xs text-white/50 hover:text-white/80">Reply</button>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <img src="https://i.pravatar.cc/150?u=u2" alt="User" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-white/90">MusicLover</span>
                    <span className="text-xs text-white/40">3h</span>
                  </div>
                  <p className="text-sm text-white/80">I was literally just listening to this!</p>
                  <div className="flex items-center gap-4 mt-2">
                    <button className="text-xs text-white/50 hover:text-white/80 flex items-center gap-1"><Heart size={12} /> 8</button>
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
                  onChange={e => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:border-primary text-white pr-10"
                  data-testid="input-comment"
                />
                <button
                  disabled={!newComment.trim()}
                  onClick={() => setNewComment("")}
                  className="absolute right-2 p-1.5 rounded-full bg-primary text-white disabled:opacity-30"
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

// ── Discover Song Pill ──────────────────────────────────────────────────────

function DiscoverSongPill({ song }: { song: ApiSong }) {
  const [isPlaying, setIsPlaying] = useState(false);
  return (
    <button
      onClick={() => setIsPlaying(p => !p)}
      data-testid={`card-discover-song-${song.id}`}
      className="flex-shrink-0 flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-3 transition-colors group"
    >
      <div className="w-12 h-12 rounded-xl overflow-hidden relative flex-shrink-0">
        <img src={song.coverUrl} alt={song.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          {isPlaying
            ? <div className="flex items-end gap-0.5 h-3">
                <div className="w-0.5 bg-white h-full animate-[equalizer_0.8s_ease-in-out_infinite]" />
                <div className="w-0.5 bg-white h-full animate-[equalizer_0.8s_ease-in-out_infinite_0.2s]" />
                <div className="w-0.5 bg-white h-full animate-[equalizer_0.8s_ease-in-out_infinite_0.4s]" />
              </div>
            : <PlayCircle size={16} className="text-white" />
          }
        </div>
      </div>
      <div className="text-left min-w-0">
        <p className="text-sm font-semibold text-white truncate max-w-[90px]">{song.title}</p>
        <p className="text-[10px] text-white/50 truncate max-w-[90px]">{song.artist}</p>
        <div className="flex items-center gap-1 mt-1">
          <Disc3 size={9} className="text-primary" />
          <span className="text-[9px] text-primary font-bold uppercase">via moments</span>
        </div>
      </div>
    </button>
  );
}

// ── Moment Card ─────────────────────────────────────────────────────────────

function MomentCard({
  moment,
  onCommentClick,
  isTrending = false,
  rank,
}: {
  moment: ApiMoment;
  onCommentClick: () => void;
  isTrending?: boolean;
  rank?: number;
}) {
  const [isLiked, setIsLiked]     = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const engagementScore = moment.likes * 2 + moment.comments;

  const handleLike = () => {
    if (isLiked) {
      setIsLiked(false);
      api.unlikeMoment(moment.id).catch(() => setIsLiked(true));
    } else {
      setIsLiked(true);
      api.likeMoment(moment.id).catch(() => setIsLiked(false));
    }
  };

  const timeAgo = new Date(moment.createdAt).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });

  return (
    <div
      data-testid={`card-moment-${moment.id}`}
      className={cn(
        "rounded-3xl border overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 shadow-lg",
        isTrending
          ? "border-orange-500/30 bg-orange-500/5"
          : "border-white/10 bg-white/5"
      )}
    >
      {/* Trending badge */}
      {isTrending && rank && (
        <div className="px-4 pt-3 flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-orange-500/20 border border-orange-500/30 rounded-full px-2.5 py-1">
            <Flame size={11} className="text-orange-400" />
            <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">
              #{rank} Trending
            </span>
          </div>
          {engagementScore > 0 && (
            <span className="text-[10px] text-white/30">{engagementScore} engagement</span>
          )}
        </div>
      )}

      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/10 p-0.5">
            <img src={moment.user.avatarUrl} alt={moment.user.displayName} className="w-full h-full rounded-full object-cover" />
          </div>
          <div>
            <p className="font-semibold text-white/90 text-sm">{moment.user.displayName}</p>
            <p className="text-[10px] text-white/50">{timeAgo}</p>
          </div>
        </div>
        <button className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-white/50">
          <MoreHorizontal size={20} />
        </button>
      </div>

      {/* Caption */}
      <div className="px-5 pb-4">
        <p className="text-sm text-white/90 leading-relaxed">{moment.caption}</p>
      </div>

      {/* Lyric Card */}
      <div
        className="mx-4 mb-4 rounded-2xl overflow-hidden relative group cursor-pointer border border-white/5"
        onClick={() => setIsPlaying(p => !p)}
      >
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30 group-hover:scale-105 transition-transform duration-1000"
          style={{ backgroundImage: `url(${moment.song.coverUrl})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30" />

        <div className="relative p-6 min-h-[180px] flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <Quote className="text-primary/40 w-8 h-8 -ml-1 -mt-1" />
            <div className="glass px-3 py-1 rounded-full text-[10px] font-bold text-white uppercase tracking-wider border border-white/10">
              {moment.mood}
            </div>
          </div>

          <div className="text-center my-4">
            <p className="font-display text-2xl font-bold text-white drop-shadow-lg italic leading-tight">
              "{moment.lyricLine}"
            </p>
          </div>

          <div className="flex items-center justify-between mt-2 pt-4 border-t border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden relative border border-white/10">
                <img src={moment.song.coverUrl} alt="cover" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  {isPlaying ? (
                    <div className="flex items-end gap-0.5 h-3">
                      <div className="w-0.5 bg-white h-full animate-[equalizer_0.8s_ease-in-out_infinite]" />
                      <div className="w-0.5 bg-white h-full animate-[equalizer_0.8s_ease-in-out_infinite_0.2s]" />
                      <div className="w-0.5 bg-white h-full animate-[equalizer_0.8s_ease-in-out_infinite_0.4s]" />
                    </div>
                  ) : (
                    <PlayCircle size={16} className="text-white fill-white/20" />
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm font-bold text-white">{moment.song.title}</p>
                <p className="text-[10px] text-white/60">{moment.song.artist}</p>
              </div>
            </div>
            <button
              className={cn(
                "px-4 py-2 text-xs font-bold rounded-full transition-all backdrop-blur-md",
                isPlaying ? "bg-primary text-white shadow-[0_0_15px_rgba(var(--primary),0.5)]" : "bg-white/10 hover:bg-white/20 text-white"
              )}
            >
              {isPlaying ? "Playing" : "Play"}
            </button>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-5 py-4 border-t border-white/5 flex items-center justify-between bg-black/20">
        <div className="flex items-center gap-6">
          <button onClick={handleLike} className="flex items-center gap-2 group/btn" data-testid={`button-like-moment-${moment.id}`}>
            <div className={cn("p-1.5 rounded-full transition-colors", isLiked ? "bg-primary/20" : "bg-transparent group-hover/btn:bg-white/5")}>
              <Heart size={20} className={cn("transition-transform group-hover/btn:scale-110", isLiked ? "fill-primary text-primary" : "text-white/70")} />
            </div>
            <span className={cn("text-xs font-bold", isLiked ? "text-primary" : "text-white/70")}>
              {isLiked ? (moment.likes + 1).toLocaleString() : moment.likes.toLocaleString()}
            </span>
          </button>

          <button onClick={onCommentClick} className="flex items-center gap-2 group/btn" data-testid={`button-comment-moment-${moment.id}`}>
            <div className="p-1.5 rounded-full group-hover/btn:bg-white/5 transition-colors">
              <MessageCircle size={20} className="text-white/70 group-hover/btn:scale-110 transition-transform" />
            </div>
            <span className="text-xs font-bold text-white/70">{moment.comments}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
