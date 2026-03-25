import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronRight, Music2, Sparkles } from "lucide-react";

interface OnboardingProps {
  onComplete: (prefs: { moods: string[]; genres: string[] }) => void;
}

const UNIQUE_MOODS = [
  { name: "Chill",       emoji: "🌊", color: "from-blue-500/30 to-blue-600/20",     border: "border-blue-400/60",    glow: "shadow-blue-500/30" },
  { name: "Focus",       emoji: "🔷", color: "from-indigo-500/30 to-indigo-600/20", border: "border-indigo-400/60",  glow: "shadow-indigo-500/30" },
  { name: "Night Drive", emoji: "🌙", color: "from-purple-900/50 to-purple-800/30", border: "border-purple-400/60",  glow: "shadow-purple-500/30" },
  { name: "Gym",         emoji: "🔥", color: "from-orange-500/30 to-red-600/20",    border: "border-orange-400/60",  glow: "shadow-orange-500/30" },
  { name: "Study",       emoji: "📚", color: "from-teal-500/30 to-teal-600/20",     border: "border-teal-400/60",    glow: "shadow-teal-500/30" },
  { name: "Sad",         emoji: "💧", color: "from-slate-500/30 to-slate-600/20",   border: "border-slate-400/60",   glow: "shadow-slate-500/30" },
  { name: "Hype",        emoji: "⚡", color: "from-yellow-500/30 to-amber-600/20",  border: "border-yellow-400/60",  glow: "shadow-yellow-500/30" },
  { name: "Cozy",        emoji: "☕", color: "from-amber-700/30 to-orange-800/20",  border: "border-amber-600/60",   glow: "shadow-amber-700/30" },
];

const GENRES = [
  { name: "Electronic", emoji: "💻", color: "from-cyan-500/30 to-cyan-600/20",    border: "border-cyan-400/60" },
  { name: "Hip-Hop",    emoji: "🎤", color: "from-purple-500/30 to-violet-600/20",border: "border-purple-400/60" },
  { name: "Pop",        emoji: "🎵", color: "from-pink-500/30 to-rose-600/20",    border: "border-pink-400/60" },
  { name: "R&B",        emoji: "💫", color: "from-amber-500/30 to-yellow-600/20", border: "border-amber-400/60" },
  { name: "Indie",      emoji: "🎸", color: "from-green-500/30 to-emerald-600/20",border: "border-green-400/60" },
  { name: "Jazz",       emoji: "🎷", color: "from-orange-500/30 to-amber-600/20", border: "border-orange-400/60" },
  { name: "Lo-Fi",      emoji: "📻", color: "from-slate-500/30 to-gray-600/20",   border: "border-slate-400/60" },
  { name: "Rock",       emoji: "🤘", color: "from-red-500/30 to-rose-600/20",     border: "border-red-400/60" },
];

type Step = "moods" | "genres" | "building";

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep]               = useState<Step>("moods");
  const [selectedMoods, setSelectedMoods]   = useState<string[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [buildProgress, setBuildProgress]   = useState(0);

  function toggleMood(name: string) {
    setSelectedMoods(prev =>
      prev.includes(name) ? prev.filter(m => m !== name) : [...prev, name]
    );
  }

  function toggleGenre(name: string) {
    setSelectedGenres(prev =>
      prev.includes(name) ? prev.filter(g => g !== name) : [...prev, name]
    );
  }

  function handleMoodsNext() {
    if (selectedMoods.length === 0) return;
    setStep("genres");
  }

  function handleBuildVibe() {
    if (selectedGenres.length === 0) return;
    setStep("building");

    // Animate progress bar then fire onComplete
    let p = 0;
    const interval = setInterval(() => {
      p += Math.random() * 22 + 8;
      if (p >= 100) {
        p = 100;
        clearInterval(interval);
        setTimeout(() => {
          onComplete({ moods: selectedMoods, genres: selectedGenres });
        }, 400);
      }
      setBuildProgress(Math.min(p, 100));
    }, 180);
  }

  // ── Building screen ─────────────────────────────────────────────────────────
  if (step === "building") {
    return (
      <div className="fixed inset-0 z-50 bg-[hsl(240,10%,4%)] flex flex-col items-center justify-center gap-8 px-6">
        <div className="relative">
          <div className="w-24 h-24 rounded-full border-2 border-primary/30 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full border-2 border-primary/50 flex items-center justify-center animate-spin" style={{ animationDuration: "3s" }}>
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Music2 size={28} className="text-primary" />
              </div>
            </div>
          </div>
          <div className="absolute -top-1 -right-1">
            <Sparkles size={18} className="text-accent animate-pulse" />
          </div>
        </div>

        <div className="text-center">
          <p className="text-white/60 text-sm font-medium uppercase tracking-widest mb-2">AI DJ</p>
          <h2 className="text-white text-2xl font-display font-bold mb-1">Building your vibe</h2>
          <p className="text-white/40 text-sm">
            {selectedMoods.slice(0, 2).join(" · ")} · {selectedGenres.slice(0, 2).join(" · ")}
          </p>
        </div>

        <div className="w-64 space-y-2">
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-200"
              style={{ width: `${buildProgress}%` }}
            />
          </div>
          <p className="text-center text-white/30 text-xs">
            {buildProgress < 40 ? "Analyzing your taste…" : buildProgress < 75 ? "Curating your playlist…" : "Almost ready…"}
          </p>
        </div>

        <div className="flex gap-2 flex-wrap justify-center max-w-xs">
          {[...selectedMoods, ...selectedGenres].map(tag => (
            <span key={tag} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/50 text-xs">
              {tag}
            </span>
          ))}
        </div>
      </div>
    );
  }

  // ── Shared layout ───────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 bg-[hsl(240,10%,4%)] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="pt-14 pb-2 px-6 flex-shrink-0">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-2 h-2 rounded-full bg-primary" />
          <div className="w-2 h-2 rounded-full bg-white/20" />
          <div className="w-2 h-2 rounded-full bg-white/10" />
          <span className="ml-auto text-white/30 text-xs">Step {step === "moods" ? 1 : 2} of 2</span>
        </div>

        {step === "moods" ? (
          <>
            <h1 className="text-white text-3xl font-display font-bold leading-tight mb-1">
              What's your vibe?
            </h1>
            <p className="text-white/40 text-sm">Pick the moods you love most</p>
          </>
        ) : (
          <>
            <h1 className="text-white text-3xl font-display font-bold leading-tight mb-1">
              Your sound
            </h1>
            <p className="text-white/40 text-sm">
              Which genres do you listen to?
            </p>
          </>
        )}
      </div>

      {/* Cards grid */}
      <div className="flex-1 overflow-y-auto px-4 py-3 no-scrollbar">
        <div className="grid grid-cols-2 gap-3 pb-28">
          {step === "moods"
            ? UNIQUE_MOODS.map(mood => {
                const isSelected = selectedMoods.includes(mood.name);
                return (
                  <button
                    key={mood.name}
                    data-testid={`mood-card-${mood.name}`}
                    onClick={() => toggleMood(mood.name)}
                    className={cn(
                      "relative h-28 rounded-2xl border bg-gradient-to-br p-4 text-left transition-all duration-200 active:scale-95",
                      mood.color,
                      isSelected
                        ? `${mood.border} shadow-lg ${mood.glow} scale-[1.02]`
                        : "border-white/10 hover:border-white/20"
                    )}
                  >
                    {isSelected && (
                      <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-white flex items-center justify-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-black" />
                      </div>
                    )}
                    <span className="block text-2xl mb-2">{mood.emoji}</span>
                    <span className={cn(
                      "block text-sm font-bold font-display leading-tight",
                      isSelected ? "text-white" : "text-white/70"
                    )}>
                      {mood.name}
                    </span>
                  </button>
                );
              })
            : GENRES.map(genre => {
                const isSelected = selectedGenres.includes(genre.name);
                return (
                  <button
                    key={genre.name}
                    data-testid={`genre-card-${genre.name}`}
                    onClick={() => toggleGenre(genre.name)}
                    className={cn(
                      "relative h-28 rounded-2xl border bg-gradient-to-br p-4 text-left transition-all duration-200 active:scale-95",
                      genre.color,
                      isSelected
                        ? `${genre.border} shadow-lg scale-[1.02]`
                        : "border-white/10 hover:border-white/20"
                    )}
                  >
                    {isSelected && (
                      <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-white flex items-center justify-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-black" />
                      </div>
                    )}
                    <span className="block text-2xl mb-2">{genre.emoji}</span>
                    <span className={cn(
                      "block text-sm font-bold font-display leading-tight",
                      isSelected ? "text-white" : "text-white/70"
                    )}>
                      {genre.name}
                    </span>
                  </button>
                );
              })
          }
        </div>
      </div>

      {/* CTA — fixed at bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[hsl(240,10%,4%)] via-[hsl(240,10%,4%)/95] to-transparent pt-8">
        {step === "moods" ? (
          <button
            data-testid="btn-moods-next"
            onClick={handleMoodsNext}
            disabled={selectedMoods.length === 0}
            className={cn(
              "w-full h-14 rounded-2xl font-display font-bold text-base transition-all duration-300 flex items-center justify-center gap-2",
              selectedMoods.length > 0
                ? "bg-primary text-white shadow-lg shadow-primary/30 active:scale-[0.98]"
                : "bg-white/5 text-white/30 cursor-not-allowed"
            )}
          >
            {selectedMoods.length > 0 ? (
              <>
                Next — pick your genres
                <ChevronRight size={18} />
              </>
            ) : (
              "Pick at least one mood"
            )}
          </button>
        ) : (
          <button
            data-testid="btn-build-vibe"
            onClick={handleBuildVibe}
            disabled={selectedGenres.length === 0}
            className={cn(
              "w-full h-14 rounded-2xl font-display font-bold text-base transition-all duration-300 flex items-center justify-center gap-2",
              selectedGenres.length > 0
                ? "bg-gradient-to-r from-primary to-accent text-white shadow-lg shadow-primary/30 active:scale-[0.98]"
                : "bg-white/5 text-white/30 cursor-not-allowed"
            )}
          >
            {selectedGenres.length > 0 ? (
              <>
                <Sparkles size={18} />
                Build My Vibe
              </>
            ) : (
              "Pick at least one genre"
            )}
          </button>
        )}

        {step === "genres" && (
          <button
            onClick={() => setStep("moods")}
            className="w-full mt-3 text-white/30 text-sm text-center"
          >
            ← Back
          </button>
        )}
      </div>
    </div>
  );
}
