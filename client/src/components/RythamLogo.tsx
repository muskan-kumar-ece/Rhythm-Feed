import { cn } from "@/lib/utils";

interface RythamLogoProps {
  size?:      "xs" | "sm" | "md" | "lg" | "xl";
  showMark?:  boolean;
  className?: string;
  /** When true, the waveform bars animate and text gets shimmer */
  animate?:   boolean;
}

const SIZES = {
  xs: { px: 14, text: "text-sm",   gap: "gap-1.5", tracking: "tracking-[-0.03em]" },
  sm: { px: 18, text: "text-base", gap: "gap-2",   tracking: "tracking-[-0.03em]" },
  md: { px: 22, text: "text-xl",   gap: "gap-2.5", tracking: "tracking-[-0.04em]" },
  lg: { px: 28, text: "text-2xl",  gap: "gap-3",   tracking: "tracking-[-0.04em]" },
  xl: { px: 36, text: "text-3xl",  gap: "gap-3.5", tracking: "tracking-[-0.05em]" },
};

export default function RythamLogo({
  size      = "md",
  showMark  = true,
  className,
  animate   = false,
}: RythamLogoProps) {
  const s = SIZES[size];

  return (
    <div className={cn("flex items-center", s.gap, className)}>
      {showMark && (
        <svg
          width={s.px}
          height={Math.round(s.px * 0.82)}
          viewBox="0 0 22 18"
          fill="none"
          aria-hidden="true"
          className="shrink-0"
        >
          <defs>
            <linearGradient id="rytham-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%"   stopColor="#c084fc" />
              <stop offset="100%" stopColor="#f472b6" />
            </linearGradient>
          </defs>
          {/* 5-bar waveform mark — tallest bar is centre, symmetric fade */}
          <rect
            x="0" y="5" width="3" height="8" rx="1.5"
            fill="url(#rytham-grad)" opacity="0.55"
            style={animate ? { animation: "equalizer 0.9s ease-in-out infinite alternate", animationDelay: "0ms" } : undefined}
          />
          <rect
            x="4.75" y="3" width="3" height="12" rx="1.5"
            fill="url(#rytham-grad)" opacity="0.75"
            style={animate ? { animation: "equalizer 0.7s ease-in-out infinite alternate", animationDelay: "80ms" } : undefined}
          />
          <rect
            x="9.5" y="0" width="3" height="18" rx="1.5"
            fill="url(#rytham-grad)"
            style={animate ? { animation: "equalizer 0.55s ease-in-out infinite alternate", animationDelay: "0ms" } : undefined}
          />
          <rect
            x="14.25" y="3" width="3" height="12" rx="1.5"
            fill="url(#rytham-grad)" opacity="0.75"
            style={animate ? { animation: "equalizer 0.7s ease-in-out infinite alternate", animationDelay: "120ms" } : undefined}
          />
          <rect
            x="19" y="5" width="3" height="8" rx="1.5"
            fill="url(#rytham-grad)" opacity="0.55"
            style={animate ? { animation: "equalizer 0.9s ease-in-out infinite alternate", animationDelay: "40ms" } : undefined}
          />
        </svg>
      )}

      <span
        className={cn(
          "font-display font-bold leading-none select-none",
          s.text,
          s.tracking,
        )}
        style={{
          background:           "linear-gradient(135deg, #ffffff 0%, #f3e8ff 55%, #c084fc 78%, #f472b6 100%)",
          backgroundSize:       animate ? "200% 100%" : "100% 100%",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor:  "transparent",
          backgroundClip:       "text",
          animation:            animate ? "logo-shimmer 4s ease-in-out infinite" : undefined,
        }}
      >
        Rytham
      </span>
    </div>
  );
}
