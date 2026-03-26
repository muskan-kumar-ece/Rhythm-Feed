import { Upload, Music2, BarChart2, FileAudio, Image as ImageIcon, Tag, TrendingUp, Play, CheckCircle, Clock, Home, Settings, User } from "lucide-react";
import { useState } from "react";

export function ArtistPortal() {
  const [tab, setTab] = useState<"tracks"|"upload"|"analytics">("upload");
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  const startUpload = () => {
    setUploading(true); setProgress(0);
    const t = setInterval(() => setProgress(p => { if (p >= 100) { clearInterval(t); return 100; } return p + 8; }), 200);
  };

  return (
    <div className="min-h-screen bg-[#08080e] flex flex-col font-['Inter']">
      <div className="flex justify-between items-center text-white/40 text-[11px] px-5 pt-3 pb-1">
        <span>9:41</span>
        <div className="w-4 h-2 border border-white/40 rounded-sm"><div className="h-full w-3/4 bg-white/40 rounded-sm" /></div>
      </div>

      {/* Header */}
      <div className="px-5 pt-2 pb-4 border-b border-white/5">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#a855f7] to-[#ec4899] flex items-center justify-center text-lg font-bold text-white">A</div>
          <div>
            <p className="text-white font-bold text-base">Aria Nova</p>
            <p className="text-[#a855f7] text-xs flex items-center gap-1">✓ Verified Artist</p>
          </div>
        </div>
        {/* Stats strip */}
        <div className="flex gap-2 mt-3">
          {[{v:"4.1K",l:"Plays"},{v:"892",l:"Likes"},{v:"3",l:"Tracks"}].map(s => (
            <div key={s.l} className="flex-1 bg-white/5 border border-white/8 rounded-xl p-2.5 text-center">
              <p className="text-sm font-bold text-white">{s.v}</p>
              <p className="text-[9px] text-white/40">{s.l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-3 bg-[#0d0d18]">
        {[
          {id:"tracks",icon:<Music2 size={13}/>,label:"My Tracks"},
          {id:"upload",icon:<Upload size={13}/>,label:"Upload"},
          {id:"analytics",icon:<BarChart2 size={13}/>,label:"Analytics"},
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[11px] font-semibold transition-all ${
              tab === t.id ? "bg-[#a855f7]/20 text-[#a855f7] border border-[#a855f7]/30" : "text-white/40 bg-white/5"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-24 space-y-4 pt-2">

        {tab === "upload" && (
          <>
            {/* Drop zone */}
            <div className="border-2 border-dashed border-[#a855f7]/30 rounded-2xl p-6 flex flex-col items-center gap-3 bg-[#a855f7]/5 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#a855f7]/15 border border-[#a855f7]/30 flex items-center justify-center">
                <FileAudio size={28} className="text-[#a855f7]" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">Drop audio here</p>
                <p className="text-white/40 text-xs mt-0.5">MP3, WAV, FLAC · Max 100MB</p>
              </div>
              <button className="px-5 py-2 rounded-xl bg-[#a855f7]/20 border border-[#a855f7]/40 text-[#a855f7] text-xs font-bold">Browse Files</button>
            </div>

            {/* Cover image */}
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#a855f7] to-[#ec4899] flex items-center justify-center shrink-0">
                <ImageIcon size={20} className="text-white/70" />
              </div>
              <div className="flex-1">
                <p className="text-white text-sm font-semibold">Cover Image</p>
                <p className="text-white/40 text-xs">JPG, PNG · 3000×3000px recommended</p>
              </div>
              <span className="text-[#a855f7] text-xs font-bold">Add</span>
            </div>

            {/* Metadata fields */}
            <div className="space-y-3">
              {[
                {label:"Track Title",placeholder:"Enter title…"},
                {label:"Artist Name",placeholder:"Your artist name"},
              ].map(f => (
                <div key={f.label} className="flex flex-col gap-1">
                  <label className="text-xs text-white/50 uppercase tracking-wider font-semibold">{f.label}</label>
                  <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white/30">{f.placeholder}</div>
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                {["Genre","Mood"].map(l => (
                  <div key={l}>
                    <label className="text-xs text-white/50 uppercase tracking-wider font-semibold block mb-1">{l}</label>
                    <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-sm text-white/30 flex items-center justify-between">
                      <span>{l === "Genre" ? "Pop" : "Chill"}</span>
                      <span className="text-white/20">▾</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI tags preview */}
            <div className="bg-[#a855f7]/5 border border-[#a855f7]/15 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <Tag size={12} className="text-[#a855f7]" />
                <p className="text-[10px] font-bold text-[#a855f7] uppercase tracking-wider">AI Tags (auto-generated)</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {["dreamy","melancholic","cinematic","lush","bedroom pop"].map(tag => (
                  <span key={tag} className="px-2.5 py-1 rounded-full bg-[#a855f7]/10 border border-[#a855f7]/20 text-[10px] text-[#a855f7]">{tag}</span>
                ))}
              </div>
            </div>

            {/* Progress bar */}
            {uploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-white/50">
                  <span>{progress < 40 ? "Uploading audio…" : progress < 75 ? "Running AI analysis…" : progress < 100 ? "Saving…" : "Done ✓"}</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#a855f7] to-[#ec4899] rounded-full transition-all duration-200" style={{width:`${progress}%`}} />
                </div>
              </div>
            )}

            <button
              onClick={startUpload}
              className="w-full bg-[#a855f7] text-white font-bold rounded-xl py-4 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(168,85,247,0.35)]"
            >
              <Upload size={18} /> Upload Track
            </button>
          </>
        )}

        {tab === "tracks" && (
          <div className="space-y-3">
            {[
              {title:"Midnight Bloom",status:"approved",plays:"4.1K",mood:"Indie Pop"},
              {title:"Glass Heart",status:"review",plays:"—",mood:"R&B"},
              {title:"Velvet Sky",status:"approved",plays:"2.8K",mood:"Electronic"},
            ].map(s => (
              <div key={s.title} className="bg-white/5 border border-white/8 rounded-2xl p-3 flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#a855f7] to-[#6366f1] flex items-center justify-center shrink-0">
                  <Music2 size={20} className="text-white/60" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm truncate">{s.title}</p>
                  <p className="text-white/40 text-xs">{s.mood} · {s.plays} plays</p>
                </div>
                <div className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase ${
                  s.status === "approved" ? "bg-green-500/15 text-green-400" : "bg-yellow-500/15 text-yellow-400"
                }`}>
                  {s.status === "approved" ? "Live" : "Review"}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "analytics" && (
          <div className="space-y-4">
            <div className="bg-white/5 border border-white/8 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={14} className="text-[#a855f7]" />
                <p className="text-sm font-bold text-white">Last 7 Days</p>
              </div>
              <div className="flex gap-1 items-end h-20">
                {[20,45,30,70,55,90,65].map((h,i) => (
                  <div key={i} className="flex-1 bg-gradient-to-t from-[#a855f7] to-[#ec4899] rounded-sm opacity-80" style={{height:`${h}%`}} />
                ))}
              </div>
              <div className="flex justify-between text-[9px] text-white/30 mt-1">
                {["M","T","W","T","F","S","S"].map((d,i) => <span key={i}>{d}</span>)}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                {label:"Total Plays",v:"4.1K",icon:<Play size={16} className="text-green-400"/>},
                {label:"Listeners",v:"892",icon:<User size={16} className="text-blue-400"/>},
                {label:"Completion",v:"78%",icon:<CheckCircle size={16} className="text-emerald-400"/>},
                {label:"Avg Time",v:"2:31",icon:<Clock size={16} className="text-orange-400"/>},
              ].map(s => (
                <div key={s.label} className="bg-white/5 border border-white/8 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">{s.icon}<p className="text-[10px] text-white/40">{s.label}</p></div>
                  <p className="text-xl font-bold text-white">{s.v}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div className="flex items-center justify-around border-t border-white/5 px-3 py-2 bg-black/80 backdrop-blur-xl">
        {[
          { icon: <Home size={22} />, label: "Home" },
          { icon: <Music2 size={22} />, label: "Moments" },
          { icon: <Upload size={22} />, label: "Upload", active: true },
          { icon: <User size={22} />, label: "Profile" },
          { icon: <Settings size={22} />, label: "More" },
        ].map(n => (
          <button key={n.label} className={`flex flex-col items-center gap-0.5 py-1 px-2 ${n.active ? "text-[#a855f7]" : "text-white/35"}`}>
            {n.icon}
            <span className="text-[9px] font-semibold">{n.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
