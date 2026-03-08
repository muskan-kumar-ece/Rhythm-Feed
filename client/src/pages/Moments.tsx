import { useState } from "react";
import { Heart, MessageCircle, PlayCircle, MoreHorizontal } from "lucide-react";
import { dummyMoments, Moment } from "@/lib/dummyData";
import { cn } from "@/lib/utils";

export default function Moments() {
  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="pt-12 pb-4 px-6 glass sticky top-0 z-40 flex items-center justify-between">
        <h1 className="text-3xl font-display font-bold text-white tracking-tight">Moments</h1>
      </header>

      <main className="p-4 space-y-6">
        {dummyMoments.map((moment) => (
          <MomentCard key={moment.id} moment={moment} />
        ))}
      </main>
    </div>
  );
}

function MomentCard({ moment }: { moment: Moment }) {
  const [isLiked, setIsLiked] = useState(false);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden border border-white/20">
            <img src={moment.user.avatarUrl} alt={moment.user.name} className="w-full h-full object-cover" />
          </div>
          <div>
            <p className="font-medium text-white/90 text-sm">{moment.user.name}</p>
            <p className="text-xs text-white/50">{moment.timestamp}</p>
          </div>
        </div>
        <button className="text-white/50 hover:text-white transition-colors">
          <MoreHorizontal size={20} />
        </button>
      </div>

      {/* Content - Caption */}
      <div className="px-4 pb-4">
        <p className="text-sm text-white/80 leading-relaxed">{moment.caption}</p>
      </div>

      {/* Song Snippet / Lyric Card */}
      <div className="mx-4 mb-4 rounded-xl overflow-hidden relative group cursor-pointer">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-40 group-hover:scale-105 transition-transform duration-700"
          style={{ backgroundImage: `url(${moment.song.coverUrl})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />
        
        <div className="relative p-6 min-h-[160px] flex flex-col justify-between">
          <div className="flex justify-end">
            <div className="glass px-3 py-1 rounded-full text-[10px] font-medium text-white/90">
              {moment.mood}
            </div>
          </div>
          
          <div className="text-center my-4">
            <p className="font-display text-xl font-bold text-white drop-shadow-md italic">
              "{moment.lyricLine}"
            </p>
          </div>

          <div className="flex items-center justify-between mt-2 pt-4 border-t border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center">
                <PlayCircle size={16} className="text-white/80" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white/90">{moment.song.title}</p>
                <p className="text-[10px] text-white/60">{moment.song.artist}</p>
              </div>
            </div>
            <button className="px-4 py-1.5 bg-primary/20 hover:bg-primary/40 text-primary-foreground text-xs font-medium rounded-full transition-colors backdrop-blur-md">
              Play Song
            </button>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 py-3 border-t border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => setIsLiked(!isLiked)}
            className="flex items-center gap-2 group/btn"
          >
            <Heart 
              size={20} 
              className={cn("transition-colors group-hover/btn:scale-110", isLiked ? "fill-primary text-primary" : "text-white/60")} 
            />
            <span className="text-xs font-medium text-white/60">
              {isLiked ? (moment.likes + 1).toLocaleString() : moment.likes.toLocaleString()}
            </span>
          </button>
          
          <button className="flex items-center gap-2 group/btn">
            <MessageCircle size={20} className="text-white/60 transition-transform group-hover/btn:scale-110" />
            <span className="text-xs font-medium text-white/60">{moment.comments}</span>
          </button>
        </div>
      </div>
    </div>
  );
}