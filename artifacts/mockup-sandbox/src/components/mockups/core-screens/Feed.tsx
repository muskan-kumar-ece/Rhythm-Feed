import { Heart, MessageCircle, Share2, Bookmark, Play, Pause, TrendingUp, Sparkles, Home, Music2, Upload, User, Settings } from "lucide-react";
import { useState } from "react";

export function Feed() {
  const [playing, setPlaying] = useState(true);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);

  return (
    <div className="h-screen bg-[#08080e] flex flex-col relative overflow-hidden font-['Inter']">
      {/* Full-screen album cover (blurred bg) */}
      <div
        className="absolute inset-0 z-0"
        style={{
          background: "linear-gradient(135deg, #1a0a2e 0%, #0d0d1a 50%, #0a1a1a 100%)"
        }}
      />
      {/* Album art simulation */}
      <div className="absolute inset-0 z-0 flex items-center justify-center opacity-20">
        <div className="w-full h-full" style={{background: "radial-gradient(ellipse at 30% 40%, #a855f7 0%, transparent 60%), radial-gradient(ellipse at 70% 60%, #ec4899 0%, transparent 60%)"}} />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/20 z-0" />

      {/* Status bar */}
      <div className="relative z-20 flex justify-between items-center text-white/60 text-[11px] px-5 pt-3 pb-2">
        <span>9:41</span>
        <div className="w-4 h-2 border border-white/40 rounded-sm"><div className="h-full w-3/4 bg-white/40 rounded-sm" /></div>
      </div>

      {/* Feed toggle + AI badge */}
      <div className="relative z-20 flex items-center justify-between px-5 py-2">
        <div className="flex gap-1 bg-black/40 backdrop-blur-md rounded-2xl p-1">
          <button className="px-4 py-2 rounded-xl bg-[#a855f7]/20 border border-[#a855f7]/40 text-[#a855f7] text-xs font-bold flex items-center gap-1.5">
            <Sparkles size={11} /> For You
          </button>
          <button className="px-4 py-2 rounded-xl text-white/50 text-xs font-semibold">
            Following
          </button>
        </div>
        <div className="px-2.5 py-1.5 rounded-full bg-[#a855f7]/15 border border-[#a855f7]/30">
          <span className="text-[10px] font-bold text-[#a855f7] flex items-center gap-1">
            <TrendingUp size={9} /> AI DJ
          </span>
        </div>
      </div>

      {/* Center Album Art */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-5">
        <div className="relative mb-6">
          <div className="absolute inset-0 scale-110 rounded-3xl bg-[#a855f7]/20 blur-2xl" />
          <div
            className="w-48 h-48 rounded-3xl border border-white/20 shadow-2xl relative z-10 flex items-center justify-center overflow-hidden"
            style={{background: "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)"}}
          >
            <Music2 size={60} className="text-white/40" />
          </div>
          {/* Vinyl ring */}
          <div className={`absolute inset-0 rounded-full border-4 border-white/10 scale-75 ${playing ? "animate-spin" : ""}`} style={{animationDuration:"8s"}} />
        </div>

        {/* Song info */}
        <div className="text-center mb-4">
          <div className="px-3 py-1 rounded-full bg-[#a855f7]/15 border border-[#a855f7]/25 inline-flex items-center gap-1.5 mb-3">
            <Sparkles size={9} className="text-[#a855f7]" />
            <span className="text-[9px] font-bold text-[#a855f7] uppercase tracking-wide">For You</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight leading-tight mb-1">Midnight Bloom</h2>
          <p className="text-white/60 text-sm font-medium">Aria Nova · <span className="text-white/40">Indie Pop</span></p>
        </div>

        {/* Equalizer / Lyrics snippet */}
        <div className="bg-black/40 backdrop-blur-md rounded-2xl px-4 py-3 border border-white/10 w-full max-w-xs text-center mb-4">
          <p className="text-white/50 text-xs italic leading-relaxed">"I found the stars in your eyes tonight,<br />dancing like we own the light…"</p>
          <div className="flex gap-1 justify-center mt-2">
            {[3,5,8,5,7,4,6,3,7,5,8,4].map((h,i) => (
              <div key={i} className="w-1 rounded-full bg-[#a855f7]" style={{height:`${h * 3}px`, opacity: playing ? 1 : 0.4}} />
            ))}
          </div>
        </div>
      </div>

      {/* Right action bar */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-6">
        <ActionBtn icon={<Heart size={26} fill={liked ? "#ec4899" : "none"} className={liked ? "text-[#ec4899]" : "text-white"} />} label={liked ? "4.2K" : "4.1K"} onClick={() => setLiked(v => !v)} />
        <ActionBtn icon={<MessageCircle size={26} className="text-white" />} label="328" />
        <ActionBtn icon={<Share2 size={26} className="text-white" />} label="Moment" />
        <ActionBtn icon={<Bookmark size={24} fill={saved ? "#a855f7" : "none"} className={saved ? "text-[#a855f7]" : "text-white"} />} label="Save" onClick={() => setSaved(v => !v)} />
      </div>

      {/* Progress bar */}
      <div className="relative z-20 px-5 mb-2">
        <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-[#a855f7] to-[#ec4899] rounded-full w-[38%] shadow-[0_0_8px_rgba(168,85,247,0.6)]" />
        </div>
        <div className="flex justify-between text-[10px] text-white/40 mt-1">
          <span>1:23</span>
          <span>3:47</span>
        </div>
      </div>

      {/* Playback controls row */}
      <div className="relative z-20 flex items-center justify-center gap-8 px-5 mb-3">
        <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
          <span className="text-white/60 text-lg">⏮</span>
        </div>
        <button
          onClick={() => setPlaying(v => !v)}
          className="w-14 h-14 rounded-full bg-[#a855f7] flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.5)]"
        >
          {playing ? <Pause size={24} className="text-white" /> : <Play size={24} className="text-white translate-x-0.5" />}
        </button>
        <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
          <span className="text-white/60 text-lg">⏭</span>
        </div>
      </div>

      {/* Bottom nav */}
      <div className="relative z-20 flex items-center justify-around border-t border-white/5 px-3 py-2 bg-black/60 backdrop-blur-xl mb-0">
        {[
          { icon: <Home size={22} />, label: "Home", active: true },
          { icon: <Music2 size={22} />, label: "Moments" },
          { icon: <Upload size={22} />, label: "Upload" },
          { icon: <User size={22} />, label: "Profile" },
          { icon: <Settings size={22} />, label: "More" },
        ].map(n => (
          <button key={n.label} className={`flex flex-col items-center gap-0.5 py-1 px-2 ${n.active ? "text-[#a855f7]" : "text-white/35"}`}>
            {n.icon}
            <span className="text-[9px] font-semibold">{n.label}</span>
          </button>
        ))}
      </div>

      {/* UX annotation */}
      <div className="relative z-20 mx-4 mt-1 mb-3 bg-[#a855f7]/5 border border-[#a855f7]/20 rounded-xl p-2.5 text-[9px] text-white/40 leading-relaxed">
        <span className="text-[#a855f7] font-bold">UX:</span> Full-screen immersion. Right bar = thumb-reach actions. Lyrics snippet = emotional hook. "For You" AI badge = trust signal. Progress bar at bottom = natural reading flow. Play/pause center = muscle memory.
      </div>
    </div>
  );
}

function ActionBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1">
      {icon}
      <span className="text-white/70 text-[10px] font-semibold">{label}</span>
    </button>
  );
}
