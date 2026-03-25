/**
 * Global singleton Audio Manager
 *
 * Keeps a pool of pre-loaded HTMLAudioElement objects so playback is
 * near-instant when the user swipes to the next song.  Lives outside
 * React's component tree — no React state, no re-render cost.
 *
 * Responsibilities
 *  • preload(key, url)   — start buffering without playing
 *  • play(key)           — play immediately if buffered, else wait
 *  • pause(key)          — pause without touching other elements
 *  • seek(key, t)        — set currentTime
 *  • getElement(key)     — raw element for progress polling
 *  • gc(keepKeys)        — release elements no longer needed
 */

type BufferingCallback = (isBuffering: boolean) => void;

interface ManagedTrack {
  el: HTMLAudioElement;
  url: string;
}

class AudioManager {
  private pool = new Map<string, ManagedTrack>();
  private _activeKey: string | null = null;
  private _bufferingCb: BufferingCallback | null = null;

  // ── Public API ─────────────────────────────────────────────────────────────

  /** Begin loading a track. No-op if already in the pool. */
  preload(key: string, url: string): void {
    if (!url || this.pool.has(key)) return;

    const el = new Audio();
    el.preload = "auto";
    el.crossOrigin = ""; // avoid CORS header requirement
    el.src = url;
    el.load(); // kick off network fetch
    this.pool.set(key, { el, url });
  }

  /**
   * Play the track identified by `key`.
   * - If the track is already buffered (readyState ≥ 3) it starts instantly.
   * - Otherwise we wait for `canplay` (with a 5 s safety timeout).
   * - The previously active track is paused immediately on call.
   */
  async play(key: string): Promise<void> {
    // ── Pause previous track immediately (no gap / overlap) ──
    if (this._activeKey && this._activeKey !== key) {
      const prev = this.pool.get(this._activeKey);
      if (prev && !prev.el.paused) prev.el.pause();
    }
    this._activeKey = key;

    const track = this.pool.get(key);
    if (!track) return;

    const { el } = track;

    // Already has enough data — play right now
    if (el.readyState >= 3) {
      await el.play().catch(() => {});
      return;
    }

    // Signal buffering to the active card
    this._bufferingCb?.(true);

    await new Promise<void>((resolve) => {
      const done = () => {
        el.removeEventListener("canplay", done);
        el.removeEventListener("error", done);
        clearTimeout(timer);
        resolve();
      };
      el.addEventListener("canplay", done, { once: true });
      el.addEventListener("error", done, { once: true });
      // 5 s safety valve — don't block forever
      const timer = setTimeout(done, 5000);
    });

    this._bufferingCb?.(false);

    // Only play if we're still the active key (user may have swiped away)
    if (this._activeKey === key) {
      await el.play().catch(() => {});
    }
  }

  /** Pause without resetting position. */
  pause(key: string): void {
    this.pool.get(key)?.el.pause();
  }

  /** Set playhead position. */
  seek(key: string, seconds: number): void {
    const track = this.pool.get(key);
    if (track) track.el.currentTime = seconds;
  }

  /** Return the raw element for progress/time polling. */
  getElement(key: string): HTMLAudioElement | null {
    return this.pool.get(key)?.el ?? null;
  }

  /** Register a callback that fires when buffering state changes. */
  onBuffering(cb: BufferingCallback): void {
    this._bufferingCb = cb;
  }

  /**
   * Release HTMLAudioElement objects not in `keepKeys`.
   * Call from Feed after activeIndex changes to limit memory usage.
   */
  gc(keepKeys: string[]): void {
    const keep = new Set([...keepKeys, this._activeKey ?? ""]);
    for (const [key, track] of this.pool) {
      if (!keep.has(key)) {
        track.el.pause();
        track.el.src = ""; // release network connection
        this.pool.delete(key);
      }
    }
  }

  get activeKey(): string | null { return this._activeKey; }
}

// Export a single shared instance
export const audioManager = new AudioManager();
