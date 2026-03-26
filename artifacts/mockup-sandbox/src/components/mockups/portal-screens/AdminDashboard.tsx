import { Shield, Check, X, ChevronDown, ChevronUp, Play, Pause, Users, TrendingUp, BarChart2, Clock } from "lucide-react";
import { useState } from "react";

const PENDING = [
  {id:"1",title:"Neon Lights",artist:"DJ Prism",mood:"Electronic",duration:"3:42",tags:["upbeat","synth","danceable"]},
  {id:"2",title:"Soul Cry",artist:"Mira West",mood:"R&B",duration:"4:15",tags:["emotional","soulful","raw"]},
  {id:"3",title:"Thunder Road",artist:"The Riffs",mood:"Rock",duration:"3:58",tags:["energetic","guitar","live"]},
];

export function AdminDashboard() {
  const [view, setView] = useState<"moderation"|"overview">("moderation");
  const [expanded, setExpanded] = useState<string|null>("1");
  const [playing, setPlaying] = useState<string|null>(null);
  const [approved, setApproved] = useState<Set<string>>(new Set());
  const [rejected, setRejected] = useState<Set<string>>(new Set());

  const approve = (id: string) => { setApproved(prev => new Set([...prev, id])); setExpanded(null); };
  const reject = (id: string) => { setRejected(prev => new Set([...prev, id])); setExpanded(null); };

  return (
    <div className="h-screen bg-[#08080e] flex flex-col font-['Inter'] overflow-hidden">

      {/* ── Static header ── */}
      <div className="shrink-0">
        {/* Status bar */}
        <div className="flex justify-between items-center text-white/40 text-[11px] px-5 pt-3 pb-1">
          <span>9:41</span>
          <div className="w-4 h-2 border border-white/40 rounded-sm"><div className="h-full w-3/4 bg-white/40 rounded-sm" /></div>
        </div>

        <div className="px-5 pt-2 pb-3 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center justify-center">
              <Shield size={16} className="text-red-400" />
            </div>
            <div>
              <p className="text-white font-bold text-base">Admin Panel</p>
              <p className="text-white/30 text-xs">Rytham · Content Moderation</p>
            </div>
            <div className="ml-auto px-2.5 py-1 rounded-full bg-yellow-500/20 border border-yellow-500/30">
              <span className="text-[10px] font-bold text-yellow-400">3 Pending</span>
            </div>
          </div>

          <div className="flex gap-1 mt-3 bg-white/5 rounded-xl p-1">
            {[{id:"moderation",label:"Moderation"},{id:"overview",label:"Overview"}].map(v => (
              <button key={v.id} onClick={() => setView(v.id as any)} className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${view === v.id ? "bg-[#a855f7]/20 text-[#a855f7] border border-[#a855f7]/30" : "text-white/40"}`}>{v.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto px-4 pt-3 space-y-3" style={{ paddingBottom: "calc(16px + env(safe-area-inset-bottom, 0px))" }}>

        {view === "moderation" && (
          <>
            {/* Filter tabs */}
            <div className="flex gap-1.5">
              {[["pending","yellow"],["approved","green"],["rejected","red"]].map(([f,c]) => (
                <button key={f} className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${f === "pending" ? `bg-yellow-500/20 text-yellow-400 border border-yellow-500/30` : "text-white/30 bg-white/5"}`}>
                  {f}
                </button>
              ))}
            </div>

            {/* Song cards */}
            {PENDING.filter(s => !approved.has(s.id) && !rejected.has(s.id)).map(song => (
              <div
                key={song.id}
                className={`rounded-2xl border overflow-hidden transition-all ${expanded === song.id ? "border-[#a855f7]/40 shadow-[0_0_15px_rgba(168,85,247,0.1)]" : "border-white/10 bg-white/3"}`}
              >
                <div className="flex items-center gap-2 p-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#a855f7] to-[#6366f1] flex items-center justify-center shrink-0 text-xl">🎵</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{song.title}</p>
                    <p className="text-white/50 text-xs">{song.artist} · <span className="text-white/30">{song.mood}</span></p>
                    <div className="flex gap-1 mt-0.5 flex-wrap">
                      {song.tags.map(t => (
                        <span key={t} className="px-1.5 rounded-full bg-[#a855f7]/10 text-[8px] text-[#a855f7] border border-[#a855f7]/15 leading-4">{t}</span>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => setExpanded(prev => prev === song.id ? null : song.id)} className="text-white/30 p-1">
                    {expanded === song.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>

                {expanded === song.id && (
                  <div className="border-t border-white/5 px-3 pb-3 pt-3 space-y-3">
                    {/* Audio preview */}
                    <div className="bg-black/30 border border-white/8 rounded-xl p-3">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setPlaying(p => p === song.id ? null : song.id)}
                          className="w-9 h-9 rounded-full bg-[#a855f7]/20 border border-[#a855f7]/40 flex items-center justify-center shrink-0"
                        >
                          {playing === song.id ? <Pause size={14} className="text-[#a855f7]" /> : <Play size={14} className="text-[#a855f7] translate-x-0.5" />}
                        </button>
                        <div className="flex-1">
                          <div className="flex gap-[2px] items-end h-8 mb-1">
                            {Array.from({length:30}).map((_,i) => (
                              <div key={i} className={`flex-1 rounded-sm ${i/30 < 0.3 ? "bg-[#a855f7]" : "bg-white/20"}`} style={{height:`${20+Math.random()*60}%`}} />
                            ))}
                          </div>
                          <div className="flex justify-between text-[9px] text-white/30 font-mono">
                            <span>0:52</span><span>{song.duration}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2">
                      <button onClick={() => approve(song.id)} className="flex-1 py-3 bg-green-500/20 text-green-400 border border-green-500/30 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 active:scale-[0.97] transition-all">
                        <Check size={13} /> Approve
                      </button>
                      <button onClick={() => reject(song.id)} className="flex-1 py-3 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 active:scale-[0.97] transition-all">
                        <X size={13} /> Reject
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {approved.size > 0 && (
              <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-3 text-center">
                <p className="text-green-400 text-xs font-semibold">✓ {approved.size} track{approved.size > 1 ? "s" : ""} approved</p>
              </div>
            )}

            {/* UX annotation — inside scroll area */}
            <div className="bg-[#a855f7]/5 border border-[#a855f7]/20 rounded-xl p-2.5 text-[9px] text-white/40 leading-relaxed">
              <span className="text-[#a855f7] font-bold">UX:</span> Expand-on-tap = no clutter. Audio preview = informed decision. Status badge = urgency without opening. Approve/reject = glow feedback. Green/red = zero learning curve.
            </div>
          </>
        )}

        {view === "overview" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {[
                {l:"Daily Active",v:"2,841",i:<Users size={15} className="text-blue-400"/>,c:"bg-blue-500/5 border-blue-500/20"},
                {l:"Total Plays",v:"184K",i:<TrendingUp size={15} className="text-green-400"/>,c:"bg-green-500/5 border-green-500/20"},
                {l:"Skip Rate",v:"12%",i:<BarChart2 size={15} className="text-orange-400"/>,c:"bg-orange-500/5 border-orange-500/20"},
                {l:"Avg Listen",v:"2:31",i:<Clock size={15} className="text-purple-400"/>,c:"bg-purple-500/5 border-purple-500/20"},
              ].map(s => (
                <div key={s.l} className={`rounded-2xl border p-3 ${s.c}`}>
                  <div className="flex items-center justify-between mb-2">{s.i}<span className="text-[9px] text-white/30 uppercase tracking-wider">{s.l}</span></div>
                  <p className="text-2xl font-bold text-white">{s.v}</p>
                </div>
              ))}
            </div>
            <div className="bg-white/5 border border-white/8 rounded-2xl p-4">
              <p className="text-sm font-bold text-white mb-3 flex items-center gap-2"><BarChart2 size={14} className="text-[#a855f7]"/> Daily Activity</p>
              <div className="flex gap-1.5 items-end h-24">
                {[40,65,50,80,60,95,72,55,78,88,64,70,45,90].map((h,i) => (
                  <div key={i} className="flex-1 rounded-sm bg-gradient-to-t from-[#a855f7]/60 to-[#ec4899]/60" style={{height:`${h}%`}} />
                ))}
              </div>
              <div className="flex justify-between text-[8px] text-white/20 mt-1">
                <span>14d ago</span><span>Today</span>
              </div>
            </div>

            {/* UX annotation */}
            <div className="bg-[#a855f7]/5 border border-[#a855f7]/20 rounded-xl p-2.5 text-[9px] text-white/40 leading-relaxed">
              <span className="text-[#a855f7] font-bold">UX:</span> At-a-glance KPIs in 2×2 grid. Bar chart = trend not just number. Color coding per metric = instant pattern recognition.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
