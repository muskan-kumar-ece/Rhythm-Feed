import { Check, ArrowRight, Sparkles } from "lucide-react";
import { useState } from "react";

const GENRES = [
  { name: "Hip-Hop", emoji: "🎤" },
  { name: "Pop", emoji: "🎵" },
  { name: "R&B", emoji: "🎸" },
  { name: "Electronic", emoji: "🎧" },
  { name: "Jazz", emoji: "🎷" },
  { name: "Afrobeats", emoji: "🥁" },
  { name: "Indie", emoji: "🎼" },
  { name: "Latin", emoji: "💃" },
  { name: "K-Pop", emoji: "⭐" },
  { name: "Rock", emoji: "🤘" },
  { name: "Classical", emoji: "🎻" },
  { name: "Country", emoji: "🤠" },
];

const MOODS = ["Chill", "Hype", "Focus", "Party", "Sad", "Sleep"];

export function Onboarding() {
  const [selected, setSelected] = useState<Set<string>>(new Set(["Hip-Hop", "R&B", "Electronic"]));
  const [mood, setMood] = useState("Chill");

  const toggle = (g: string) => setSelected(prev => {
    const next = new Set(prev);
    next.has(g) ? next.delete(g) : next.add(g);
    return next;
  });

  return (
    <div className="h-screen bg-[#08080e] flex flex-col font-['Inter'] overflow-hidden">

      {/* ── Static header (does not scroll) ── */}
      <div className="shrink-0 px-5 pt-3 pb-2">
        {/* Status bar */}
        <div className="flex justify-between items-center text-white/40 text-[11px] pb-3">
          <span>9:41</span>
          <div className="w-4 h-2 border border-white/40 rounded-sm">
            <div className="h-full w-3/4 bg-white/40 rounded-sm" />
          </div>
        </div>

        {/* Progress */}
        <div className="flex gap-1.5 mb-4">
          {[1, 2, 3].map(i => (
            <div key={i} className={`h-1 flex-1 rounded-full ${i <= 2 ? "bg-[#a855f7]" : "bg-white/15"}`} />
          ))}
        </div>

        {/* Header text */}
        <div className="flex items-center gap-3 mb-1">
          <div className="w-7 h-7 rounded-lg bg-[#a855f7]/20 flex items-center justify-center">
            <Sparkles size={14} className="text-[#a855f7]" />
          </div>
          <p className="text-[#a855f7] text-[11px] font-bold uppercase tracking-wider">Personalize Your Feed</p>
        </div>
        <h1 className="text-xl font-bold text-white tracking-tight mb-0.5">Pick your genres</h1>
        <p className="text-white/40 text-xs">Choose at least 3 to unlock your personalized feed</p>
      </div>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto px-5 pb-4">

        {/* Genre grid */}
        <div className="grid grid-cols-3 gap-2 mb-4 mt-2">
          {GENRES.map(g => (
            <button
              key={g.name}
              onClick={() => toggle(g.name)}
              className={`rounded-xl py-3 px-2 flex flex-col items-center gap-1 border transition-all text-xs font-semibold ${
                selected.has(g.name)
                  ? "bg-[#a855f7]/20 border-[#a855f7]/60 text-[#a855f7] shadow-[0_0_12px_rgba(168,85,247,0.2)]"
                  : "bg-white/5 border-white/10 text-white/50"
              }`}
            >
              <span className="text-lg">{g.emoji}</span>
              {g.name}
              {selected.has(g.name) && <Check size={9} className="text-[#a855f7]" />}
            </button>
          ))}
        </div>

        {/* Current mood */}
        <div className="mb-4">
          <p className="text-xs text-white/50 uppercase tracking-wider font-semibold mb-2">Current Vibe</p>
          <div className="flex gap-2 flex-wrap">
            {MOODS.map(m => (
              <button
                key={m}
                onClick={() => setMood(m)}
                className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all ${
                  mood === m
                    ? "bg-[#ec4899]/20 border-[#ec4899]/50 text-[#ec4899]"
                    : "bg-white/5 border-white/10 text-white/40"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Selection count */}
        <div className="flex items-center gap-2 mb-4">
          <div className="px-3 py-1.5 rounded-full bg-[#a855f7]/15 border border-[#a855f7]/30">
            <span className="text-xs font-bold text-[#a855f7]">{selected.size} genres selected</span>
          </div>
          {selected.size >= 3 && (
            <span className="text-xs text-green-400 font-medium flex items-center gap-1">
              <Check size={12} /> Ready!
            </span>
          )}
        </div>

        {/* UX annotation */}
        <div className="w-full bg-[#a855f7]/5 border border-[#a855f7]/20 rounded-xl p-3 text-[10px] text-white/40 leading-relaxed">
          <span className="text-[#a855f7] font-bold">UX:</span> Grid = quick scanning. Glow + check = clear feedback. Vibe picker = emotional personalization. Min 3 = nudges engagement without overwhelming.
        </div>
      </div>

      {/* ── Sticky CTA above safe area ── */}
      <div
        className="shrink-0 px-5 pt-3 bg-[#08080e] border-t border-white/5"
        style={{ paddingBottom: "calc(16px + env(safe-area-inset-bottom, 0px))" }}
      >
        <button
          disabled={selected.size < 3}
          className="w-full bg-[#a855f7] text-white font-bold rounded-xl py-4 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(168,85,247,0.35)] disabled:opacity-40 transition-all active:scale-[0.98]"
        >
          Build My Feed <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
