import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Heart, MessageCircle, PlayCircle, MoreHorizontal, Plus, Quote } from "lucide-react";
import { ApiMoment, api } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function Moments() {
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [activeMoment, setActiveMoment] = useState<ApiMoment | null>(null);
  const [newComment, setNewComment] = useState("");

  const { data: moments, isLoading } = useQuery({
    queryKey: ["moments"],
    queryFn: () => api.getMoments(),
  });

  const handleCommentClick = (moment: ApiMoment) => {
    setActiveMoment(moment);
    setShowCommentsModal(true);
  };

  return (
    <div className="min-h-screen bg-background pb-20 relative">
      {/* Header */}
      <header className="pt-12 pb-4 px-6 sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-white/5 flex items-center justify-between">
        <h1 className="text-3xl font-display font-bold text-white tracking-tight">Moments</h1>
        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
          <Quote size={18} className="text-primary" />
        </div>
      </header>

      {/* Feed */}
      <main className="p-4 space-y-6">
        {isLoading && (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {(moments || []).map((moment) => (
          <MomentCard 
            key={moment.id} 
            moment={moment} 
            onCommentClick={() => handleCommentClick(moment)} 
          />
        ))}
        <div className="text-center py-10 text-white/40 text-sm">
          You've caught up!
        </div>
      </main>

      {/* Comments Modal Overlay */}
      {showCommentsModal && activeMoment && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col justify-end animate-in fade-in duration-300 pb-16"
          onClick={(e) => {
            e.stopPropagation();
            setShowCommentsModal(false);
          }}
        >
          <div 
            className="bg-background border-t border-white/10 rounded-t-3xl h-[70vh] max-w-md w-full mx-auto flex flex-col shadow-2xl animate-in slide-in-from-bottom-1/2 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-white/10 flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur z-10 rounded-t-3xl">
              <h3 className="font-display font-bold text-white">Comments <span className="text-white/50 text-sm font-normal ml-1">{activeMoment.comments.toLocaleString()}</span></h3>
              <button 
                onClick={() => setShowCommentsModal(false)}
                className="p-2 rounded-full hover:bg-white/10 text-white/70 transition-colors"
              >
                <Plus className="rotate-45" size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
              {/* Dummy Comments based on the moment */}
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-white/20 overflow-hidden flex-shrink-0">
                  <img src="https://i.pravatar.cc/150?u=u1" alt="User" className="w-full h-full object-cover" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-white/90">User123</span>
                    <span className="text-xs text-white/40">1h</span>
                  </div>
                  <p className="text-sm text-white/80">Such a vibe ✨</p>
                  <div className="flex items-center gap-4 mt-2">
                    <button className="text-xs text-white/50 hover:text-white/80 flex items-center gap-1">
                      <Heart size={12} /> 12
                    </button>
                    <button className="text-xs text-white/50 hover:text-white/80">Reply</button>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-white/20 overflow-hidden flex-shrink-0">
                  <img src="https://i.pravatar.cc/150?u=u2" alt="User" className="w-full h-full object-cover" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-white/90">MusicLover</span>
                    <span className="text-xs text-white/40">3h</span>
                  </div>
                  <p className="text-sm text-white/80">I was literally just listening to this!</p>
                  <div className="flex items-center gap-4 mt-2">
                    <button className="text-xs text-white/50 hover:text-white/80 flex items-center gap-1">
                      <Heart size={12} /> 8
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

function MomentCard({ moment, onCommentClick }: { moment: ApiMoment, onCommentClick: () => void }) {
  const [isLiked, setIsLiked] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

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
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit" 
  });

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 shadow-lg">
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/10 p-0.5">
            <img src={moment.user.avatarUrl} alt={moment.user.displayName} className="w-full h-full rounded-full object-cover" />
          </div>
          <div>
            <p className="font-semibold text-white/90 text-sm">{moment.user.displayName}</p>
            <p className="text-[10px] text-white/50 font-medium">{timeAgo}</p>
          </div>
        </div>
        <button className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors">
          <MoreHorizontal size={20} />
        </button>
      </div>

      {/* Content - Caption */}
      <div className="px-5 pb-4">
        <p className="text-sm text-white/90 leading-relaxed font-medium">{moment.caption}</p>
      </div>

      {/* Song Snippet / Lyric Card */}
      <div className="mx-4 mb-4 rounded-2xl overflow-hidden relative group cursor-pointer border border-white/5 shadow-inner" onClick={() => setIsPlaying(!isPlaying)}>
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
                <p className="text-[10px] text-white/60 font-medium">{moment.song.artist}</p>
              </div>
            </div>
            <button 
              className={cn(
                "px-4 py-2 text-xs font-bold rounded-full transition-all duration-300 backdrop-blur-md",
                isPlaying ? "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(var(--primary),0.5)]" : "bg-white/10 hover:bg-white/20 text-white"
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
          <button 
            onClick={handleLike}
            className="flex items-center gap-2 group/btn"
          >
            <div className={cn("p-1.5 rounded-full transition-colors", isLiked ? "bg-primary/20" : "bg-transparent group-hover/btn:bg-white/5")}>
              <Heart 
                size={20} 
                className={cn("transition-transform group-hover/btn:scale-110", isLiked ? "fill-primary text-primary" : "text-white/70")} 
              />
            </div>
            <span className={cn("text-xs font-bold", isLiked ? "text-primary" : "text-white/70")}>
              {isLiked ? (moment.likes + 1).toLocaleString() : moment.likes.toLocaleString()}
            </span>
          </button>
          
          <button 
            onClick={onCommentClick}
            className="flex items-center gap-2 group/btn"
          >
            <div className="p-1.5 rounded-full bg-transparent group-hover/btn:bg-white/5 transition-colors">
              <MessageCircle size={20} className="text-white/70 transition-transform group-hover/btn:scale-110" />
            </div>
            <span className="text-xs font-bold text-white/70">{moment.comments}</span>
          </button>
        </div>
      </div>
    </div>
  );
}