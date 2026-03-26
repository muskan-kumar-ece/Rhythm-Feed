import { Music2, Heart, Settings, Share2, TrendingUp, Play, CheckCircle, MoreHorizontal, Home, Upload, User } from "lucide-react";
import { useState } from "react";

const SONGS = [
  {id:1,title:"Midnight Bloom",plays:"4.1K",duration:"3:47",trending:true},
  {id:2,title:"Velvet Sky",plays:"2.8K",duration:"3:22",trending:false},
  {id:3,title:"Echoes of You",plays:"1.2K",duration:"4:05",trending:false},
];

const MOMENTS = [
  {id:1,color:"from-[#a855f7] to-[#6366f1]",likes:847},
  {id:2,color:"from-[#ec4899] to-[#a855f7]",likes:312},
  {id:3,color:"from-[#06b6d4] to-[#3b82f6]",likes:568},
  {id:4,color:"from-[#f59e0b] to-[#ef4444]",likes:1240},
  {id:5,color:"from-[#10b981] to-[#3b82f6]",likes:210},
  {id:6,color:"from-[#8b5cf6] to-[#ec4899]",likes:389},
];

export function Profile() {
  const [tab, setTab] = useState<"songs"|"moments"|"about">("moments");
  const [following, setFollowing] = useState(false);

  return (
    <div className="min-h-screen bg-[#08080e] flex flex-col font-['Inter']">
      <div className="flex justify-between items-center text-white/40 text-[11px] px-5 pt-3 pb-1">
        <span>9:41</span>
        <div className="w-4 h-2 border border-white/40 rounded-sm"><div className="h-full w-3/4 bg-white/40 rounded-sm" /></div>
      </div>

      {/* Header actions */}
      <div className="flex items-center justify-between px-5 pb-3">
        <button className="text-white/50"><MoreHorizontal size={20} /></button>
        <p className="text-white font-bold text-base">Profile</p>
        <button className="text-white/50"><Share2 size={18} /></button>
      </div>

      {/* Profile hero */}
      <div className="relative">
        {/* Cover art strip */}
        <div className="h-24 bg-gradient-to-r from-[#a855f7]/40 to-[#ec4899]/30 relative overflow-hidden">
          <div className="absolute inset-0" style={{background:"radial-gradient(ellipse at 20% 50%, #a855f7 0%, transparent 60%), radial-gradient(ellipse at 80% 50%, #ec4899 0%, transparent 60%)", opacity:0.4}} />
        </div>

        {/* Avatar */}
        <div className="px-5 pb-4">
          <div className="flex items-end justify-between -mt-8 mb-3">
            <div className="relative">
              <div className="w-20 h-20 rounded-full border-4 border-[#08080e] bg-gradient-to-br from-[#a855f7] to-[#ec4899] flex items-center justify-center text-3xl font-bold text-white shadow-[0_0_20px_rgba(168,85,247,0.3)]">A</div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#a855f7] border-2 border-[#08080e] flex items-center justify-center">
                <CheckCircle size={12} className="text-white" />
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 items-center">
              <button
                onClick={() => setFollowing(f => !f)}
                className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${
                  following
                    ? "bg-white/10 border border-white/20 text-white"
                    : "bg-[#a855f7] text-white shadow-[0_0_15px_rgba(168,85,247,0.35)]"
                }`}
              >
                {following ? "Following" : "Follow"}
              </button>
              <button className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                <Settings size={16} className="text-white/50" />
              </button>
            </div>
          </div>

          {/* Name + bio */}
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-0.5">
              <h2 className="text-xl font-bold text-white">Aria Nova</h2>
              <div className="px-2 py-0.5 rounded-full bg-[#a855f7]/15 border border-[#a855f7]/30">
                <span className="text-[9px] font-bold text-[#a855f7] uppercase">Artist</span>
              </div>
            </div>
            <p className="text-white/40 text-sm mb-1">@arianова · Indie Pop · London</p>
            <p className="text-white/60 text-xs leading-relaxed">Making music from the heart 🎵 DMs open for collabs</p>
          </div>

          {/* Stats row */}
          <div className="flex gap-0 border border-white/8 rounded-2xl overflow-hidden">
            {[{v:"3",l:"Tracks"},{v:"12.4K",l:"Followers"},{v:"2.1K",l:"Following"},{v:"4.8K",l:"Likes"}].map((s,i,arr) => (
              <div key={s.l} className={`flex-1 py-3 text-center ${i < arr.length-1 ? "border-r border-white/8" : ""} bg-white/3`}>
                <p className="text-sm font-bold text-white">{s.v}</p>
                <p className="text-[9px] text-white/40">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-white/5 px-5">
        {[
          {id:"moments",label:"Moments"},
          {id:"songs",label:"Tracks"},
          {id:"about",label:"About"},
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`flex-1 py-3 text-sm font-semibold transition-all border-b-2 ${
              tab === t.id ? "text-[#a855f7] border-[#a855f7]" : "text-white/40 border-transparent"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto pb-24">

        {tab === "moments" && (
          <div className="grid grid-cols-3 gap-0.5 p-0.5">
            {MOMENTS.map(m => (
              <div key={m.id} className={`aspect-square bg-gradient-to-br ${m.color} relative flex items-end p-2`}>
                <div className="absolute inset-0 bg-black/20" />
                <span className="text-[10px] text-white font-semibold z-10 flex items-center gap-0.5">
                  <Heart size={9} fill="white" /> {m.likes >= 1000 ? `${(m.likes/1000).toFixed(1)}K` : m.likes}
                </span>
              </div>
            ))}
          </div>
        )}

        {tab === "songs" && (
          <div className="px-4 pt-3 space-y-2">
            {SONGS.map((s,i) => (
              <div key={s.id} className="flex items-center gap-3 bg-white/4 border border-white/8 rounded-2xl p-3">
                <div className="w-5 text-center text-xs text-white/30 font-mono">{i+1}</div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#a855f7] to-[#ec4899] flex items-center justify-center shrink-0">
                  <Music2 size={20} className="text-white/60" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-white text-sm font-semibold truncate">{s.title}</p>
                    {s.trending && <TrendingUp size={10} className="text-[#ec4899] shrink-0" />}
                  </div>
                  <p className="text-white/40 text-xs">{s.plays} plays · {s.duration}</p>
                </div>
                <button className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                  <Play size={14} className="text-white/60 translate-x-0.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {tab === "about" && (
          <div className="px-5 pt-4 space-y-4">
            <div className="bg-white/4 border border-white/8 rounded-2xl p-4 space-y-3">
              {[
                {label:"Based in","v":"London, UK"},
                {label:"Genre","v":"Indie Pop · R&B · Electronic"},
                {label:"Influences","v":"Billie Eilish, SZA, Bon Iver"},
                {label:"On Rytham since","v":"March 2025"},
                {label:"Role","v":"Verified Artist"},
              ].map(r => (
                <div key={r.label} className="flex justify-between items-start border-b border-white/5 last:border-0 pb-2 last:pb-0">
                  <span className="text-xs text-white/40 font-semibold uppercase tracking-wider">{r.label}</span>
                  <span className="text-xs text-white text-right max-w-[55%]">{r.v}</span>
                </div>
              ))}
            </div>
            <button className="w-full flex items-center gap-3 bg-white/4 border border-white/8 rounded-xl px-4 py-3">
              <Share2 size={15} className="text-[#a855f7]" />
              <span className="text-sm text-white/60 font-medium">Share Profile</span>
            </button>
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div className="flex items-center justify-around border-t border-white/5 px-3 py-2 bg-black/80 backdrop-blur-xl">
        {[
          { icon: <Home size={22} />, label: "Home" },
          { icon: <Music2 size={22} />, label: "Moments" },
          { icon: <Upload size={22} />, label: "Upload" },
          { icon: <User size={22} />, label: "Profile", active: true },
          { icon: <Settings size={22} />, label: "More" },
        ].map(n => (
          <button key={n.label} className={`flex flex-col items-center gap-0.5 py-1 px-2 ${n.active ? "text-[#a855f7]" : "text-white/35"}`}>
            {n.icon}
            <span className="text-[9px] font-semibold">{n.label}</span>
          </button>
        ))}
      </div>

      {/* UX annotation */}
      <div className="mx-4 mb-3 bg-[#a855f7]/5 border border-[#a855f7]/20 rounded-xl p-2.5 text-[9px] text-white/40 leading-relaxed">
        <span className="text-[#a855f7] font-bold">UX:</span> Cover strip + large avatar = visual identity anchor. Stats row = social proof at a glance. Moments grid = Instagram-style discovery. Song list with play count = credibility. Tabs = progressive disclosure. Follow button CTA color changes on state.
      </div>
    </div>
  );
}
