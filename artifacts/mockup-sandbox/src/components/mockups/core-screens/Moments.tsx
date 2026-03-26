import { Heart, MessageCircle, Plus, TrendingUp, Flame, Quote, Music2, Home, Upload, User, Settings, Play } from "lucide-react";
import { useState } from "react";

const MOMENTS = [
  {
    id: 1, user: "jayx", avatar: "🎤", time: "2m",
    lyric: "\"Dancing like we own the light, never letting go tonight\"",
    song: "Midnight Bloom", artist: "Aria Nova",
    likes: 847, comments: 63, color: "from-[#a855f7] to-[#6366f1]",
  },
  {
    id: 2, user: "elo.music", avatar: "🎧", time: "18m",
    lyric: "\"Every heartbeat counts, every second shouts\"",
    song: "Echo Chamber", artist: "The Vibe Co.",
    likes: 3201, comments: 218, color: "from-[#ec4899] to-[#a855f7]",
    trending: true,
  },
  {
    id: 3, user: "sol_wave", avatar: "🌊", time: "1h",
    lyric: "\"I am the storm and the calm, I am the song\"",
    song: "Sovereign", artist: "Luna Drift",
    likes: 512, comments: 44, color: "from-[#06b6d4] to-[#3b82f6]",
  },
];

export function Moments() {
  const [tab, setTab] = useState<"forYou"|"trending">("forYou");
  const [liked, setLiked] = useState<Set<number>>(new Set());

  return (
    <div className="h-screen bg-[#08080e] flex flex-col font-['Inter'] overflow-hidden">
      {/* Status bar */}
      <div className="shrink-0 flex justify-between items-center text-white/40 text-[11px] px-5 pt-3 pb-1">
        <span>9:41</span>
        <div className="w-4 h-2 border border-white/40 rounded-sm"><div className="h-full w-3/4 bg-white/40 rounded-sm" /></div>
      </div>

      {/* Header */}
      <div className="shrink-0 px-5 pt-2 pb-3 bg-[#08080e] border-b border-white/5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Moments</h1>
            <p className="text-white/30 text-xs">Music that moved people</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
            <Quote size={16} className="text-[#a855f7]" />
          </div>
        </div>
        {/* Tab switcher */}
        <div className="flex gap-1 bg-white/5 rounded-xl p-1">
          <TabBtn label="For You" icon={<Music2 size={13} />} active={tab === "forYou"} onClick={() => setTab("forYou")} />
          <TabBtn label="Trending" icon={<Flame size={13} />} active={tab === "trending"} onClick={() => setTab("trending")} />
        </div>
      </div>

      {/* Discover strip */}
      <div className="px-5 pt-4 pb-2">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp size={13} className="text-[#ec4899]" />
          <p className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Discover via Moments</p>
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {["Midnight Bloom", "Echo Chamber", "Sovereign", "Glass Heart"].map(s => (
            <div key={s} className="shrink-0 flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#a855f7] to-[#ec4899] flex items-center justify-center">
                <Play size={10} className="text-white translate-x-0.5" />
              </div>
              <span className="text-xs text-white/70 font-medium whitespace-nowrap">{s}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Moments list */}
      <div className="flex-1 overflow-y-auto px-4 space-y-4" style={{ paddingBottom: "calc(8px + env(safe-area-inset-bottom, 0px))" }}>
        {MOMENTS.map((m, i) => (
          <div key={m.id} className="rounded-2xl border border-white/8 overflow-hidden bg-white/3">
            {/* Lyric card */}
            <div className={`relative h-44 bg-gradient-to-br ${m.color} flex flex-col items-center justify-center p-5 text-center`}>
              <div className="absolute inset-0 bg-black/30" />
              {m.trending && (
                <div className="absolute top-3 left-3 flex items-center gap-1 bg-black/40 backdrop-blur-sm rounded-full px-2.5 py-1">
                  <Flame size={10} className="text-orange-400" />
                  <span className="text-[9px] font-bold text-orange-300 uppercase tracking-wide">#{i} Trending</span>
                </div>
              )}
              <Quote size={20} className="text-white/40 mb-2 relative z-10" />
              <p className="text-white font-semibold text-sm leading-relaxed relative z-10 italic">{m.lyric}</p>
            </div>

            {/* Meta row */}
            <div className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm">{m.avatar}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white">@{m.user}</p>
                  <p className="text-[10px] text-white/40">{m.time} ago · {m.song} by {m.artist}</p>
                </div>
              </div>

              {/* Action row */}
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setLiked(prev => { const n = new Set(prev); n.has(m.id) ? n.delete(m.id) : n.add(m.id); return n; })}
                  className="flex items-center gap-1.5 text-xs text-white/50"
                >
                  <Heart size={15} fill={liked.has(m.id) ? "#ec4899" : "none"} className={liked.has(m.id) ? "text-[#ec4899]" : ""} />
                  <span className={liked.has(m.id) ? "text-[#ec4899]" : ""}>{m.likes + (liked.has(m.id) ? 1 : 0)}</span>
                </button>
                <button className="flex items-center gap-1.5 text-xs text-white/50">
                  <MessageCircle size={15} /> {m.comments}
                </button>
                <div className="ml-auto">
                  <div className="px-2.5 py-1 rounded-lg bg-[#a855f7]/15 border border-[#a855f7]/30">
                    <span className="text-[9px] font-bold text-[#a855f7]">▶ Play Song</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom nav */}
      <nav className="shrink-0 relative flex items-center justify-around border-t border-white/5 px-3 bg-black/80 backdrop-blur-xl"
        style={{ paddingTop: "8px", paddingBottom: "calc(8px + env(safe-area-inset-bottom, 0px))" }}>
        {/* FAB — sits above nav, right-aligned */}
        <button className="absolute -top-8 right-4 w-14 h-14 rounded-full bg-[#a855f7] shadow-[0_0_20px_rgba(168,85,247,0.5)] flex items-center justify-center z-10">
          <Plus size={24} className="text-white" />
        </button>
        {[
          { icon: <Home size={22} />, label: "Home" },
          { icon: <Music2 size={22} />, label: "Moments", active: true },
          { icon: <Upload size={22} />, label: "Upload" },
          { icon: <User size={22} />, label: "Profile" },
          { icon: <Settings size={22} />, label: "More" },
        ].map(n => (
          <button key={n.label} className={`flex flex-col items-center gap-0.5 py-1 px-2 ${n.active ? "text-[#a855f7]" : "text-white/35"}`}>
            {n.icon}
            <span className="text-[9px] font-semibold">{n.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

function TabBtn({ label, icon, active, onClick }: { label: string; icon: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
        active ? "bg-[#a855f7]/20 text-[#a855f7] border border-[#a855f7]/30" : "text-white/40"
      }`}
    >
      {icon} {label}
    </button>
  );
}
