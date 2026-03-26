import { User, Lock, Bell, Play, ChevronRight, LogOut, Moon, Volume2, Wifi, Shield, Home, Music2, Upload } from "lucide-react";
import { useState } from "react";

export function Settings() {
  const [prefs, setPrefs] = useState({
    autoplay: true,
    hifi: true,
    normalize: false,
    dataSaver: false,
    pushNotifs: true,
    newSongs: true,
    activity: false,
    darkMode: true,
  });
  const toggle = (k: keyof typeof prefs) => setPrefs(p => ({...p, [k]: !p[k]}));
  const [tab, setTab] = useState<"account"|"playback"|"notifications"|"security">("account");

  return (
    <div className="h-screen bg-[#08080e] flex flex-col font-['Inter'] overflow-hidden">

      {/* ── Static header ── */}
      <div className="shrink-0">
        <div className="flex justify-between items-center text-white/40 text-[11px] px-5 pt-3 pb-1">
          <span>9:41</span>
          <div className="w-4 h-2 border border-white/40 rounded-sm"><div className="h-full w-3/4 bg-white/40 rounded-sm" /></div>
        </div>
        <div className="px-5 pt-2 pb-3 border-b border-white/5">
          <h1 className="text-2xl font-bold text-white tracking-tight">Settings</h1>
          <p className="text-white/30 text-xs mt-0.5">Manage your account & preferences</p>
        </div>
        {/* Tab nav */}
        <div className="flex gap-1.5 px-4 py-3 overflow-x-auto no-scrollbar border-b border-white/5">
          {[
            {id:"account",icon:<User size={13}/>,label:"Account"},
            {id:"playback",icon:<Play size={13}/>,label:"Playback"},
            {id:"notifications",icon:<Bell size={13}/>,label:"Alerts"},
            {id:"security",icon:<Shield size={13}/>,label:"Security"},
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as any)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-semibold transition-all ${
                tab === t.id ? "bg-[#a855f7]/20 text-[#a855f7] border border-[#a855f7]/30" : "text-white/40 bg-white/5"
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto px-4 pt-3 space-y-4" style={{ paddingBottom: "calc(8px + env(safe-area-inset-bottom, 0px))" }}>

        {tab === "account" && (
          <>
            {/* Profile card */}
            <div className="bg-white/5 border border-white/8 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#a855f7] to-[#ec4899] flex items-center justify-center text-2xl font-bold text-white shrink-0">A</div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold truncate">Alex Johnson</p>
                <p className="text-white/40 text-xs truncate">alex@example.com</p>
                <p className="text-[#a855f7] text-[10px] font-semibold mt-0.5">Free Plan · <span className="underline">Upgrade →</span></p>
              </div>
              <ChevronRight size={18} className="text-white/40" />
            </div>

            {/* Role switch */}
            <div className="bg-[#a855f7]/5 border border-[#a855f7]/20 rounded-2xl p-4">
              <p className="text-[10px] text-white/40 uppercase tracking-wider font-semibold mb-3">Account Role</p>
              <div className="flex gap-2">
                {["Listener", "Artist"].map(r => (
                  <button key={r} className={`flex-1 py-3 rounded-xl text-sm font-bold border transition-all ${r === "Listener" ? "bg-[#a855f7]/20 border-[#a855f7]/50 text-[#a855f7]" : "bg-white/5 border-white/10 text-white/40"}`}>
                    {r === "Listener" ? "👤" : "🎤"} {r}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-white/30 mt-2 leading-relaxed">Switch to Artist to upload tracks and access the creator portal</p>
            </div>

            <Section title="Profile">
              {[{label:"Username",v:"@alexj"},{label:"Display Name",v:"Alex Johnson"},{label:"Bio",v:"Music is life 🎵"}].map(f => (
                <div key={f.label} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-wider font-semibold mb-0.5">{f.label}</p>
                    <p className="text-sm text-white">{f.v}</p>
                  </div>
                  <button className="text-[#a855f7] text-xs font-semibold">Edit</button>
                </div>
              ))}
            </Section>

            <Section title="Danger Zone">
              <button className="w-full flex items-center gap-3 py-3 text-red-400">
                <LogOut size={16} /> <span className="text-sm font-semibold">Sign Out</span>
                <ChevronRight size={16} className="ml-auto" />
              </button>
              <button className="w-full flex items-center gap-3 py-3 text-red-400/60 border-t border-white/5">
                <span className="text-sm">Delete Account</span>
                <ChevronRight size={16} className="ml-auto" />
              </button>
            </Section>
          </>
        )}

        {tab === "playback" && (
          <>
            <Section title="Audio">
              <ToggleRow icon={<Play size={15} className="text-[#a855f7]"/>} label="Autoplay" sub="Continue playing after a song ends" val={prefs.autoplay} onToggle={() => toggle("autoplay")} />
              <ToggleRow icon={<Volume2 size={15} className="text-blue-400"/>} label="Hi-Fi Quality" sub="320kbps (uses more data)" val={prefs.hifi} onToggle={() => toggle("hifi")} />
              <ToggleRow icon={<Volume2 size={15} className="text-green-400"/>} label="Volume Normalize" sub="Consistent volume across tracks" val={prefs.normalize} onToggle={() => toggle("normalize")} />
            </Section>
            <Section title="Data">
              <ToggleRow icon={<Wifi size={15} className="text-orange-400"/>} label="Data Saver" sub="Lower quality on mobile data" val={prefs.dataSaver} onToggle={() => toggle("dataSaver")} />
            </Section>
            <Section title="Theme">
              <ToggleRow icon={<Moon size={15} className="text-indigo-400"/>} label="Dark Mode" sub="Always use dark theme" val={prefs.darkMode} onToggle={() => toggle("darkMode")} />
            </Section>
          </>
        )}

        {tab === "notifications" && (
          <Section title="Push Notifications">
            <ToggleRow icon={<Bell size={15} className="text-[#a855f7]"/>} label="Enable Notifications" sub="Master toggle for all alerts" val={prefs.pushNotifs} onToggle={() => toggle("pushNotifs")} />
            <ToggleRow icon={<Music2 size={15} className="text-green-400"/>} label="New Song Alerts" sub="When artists you follow drop music" val={prefs.newSongs} onToggle={() => toggle("newSongs")} />
            <ToggleRow icon={<User size={15} className="text-blue-400"/>} label="Activity" sub="Likes and comments on your moments" val={prefs.activity} onToggle={() => toggle("activity")} />
          </Section>
        )}

        {tab === "security" && (
          <>
            <Section title="Password & Access">
              <LinkRow icon={<Lock size={15} className="text-[#a855f7]"/>} label="Change Password" sub="Last changed 3 months ago" />
              <LinkRow icon={<Shield size={15} className="text-green-400"/>} label="Two-Factor Auth" sub="Not enabled" badge="Set up" />
              <LinkRow icon={<User size={15} className="text-blue-400"/>} label="Active Sessions" sub="2 devices" />
            </Section>
            <Section title="Privacy">
              <LinkRow icon={<Lock size={15} className="text-orange-400"/>} label="Data & Privacy" sub="Download your data" />
            </Section>
          </>
        )}
      </div>

      {/* ── Bottom nav — always visible ── */}
      <nav className="shrink-0 flex items-center justify-around border-t border-white/5 px-3 bg-black/80 backdrop-blur-xl"
        style={{ paddingTop: "8px", paddingBottom: "calc(8px + env(safe-area-inset-bottom, 0px))" }}>
        {[
          { icon: <Home size={22} />, label: "Home" },
          { icon: <Music2 size={22} />, label: "Moments" },
          { icon: <Upload size={22} />, label: "Upload" },
          { icon: <User size={22} />, label: "Profile" },
          { icon: <Shield size={22} />, label: "Settings", active: true },
        ].map(n => (
          <button key={n.label} className={`flex flex-col items-center gap-0.5 py-1 px-2 ${(n as any).active ? "text-[#a855f7]" : "text-white/35"}`}>
            {n.icon}
            <span className="text-[9px] font-semibold">{n.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold mb-2 px-1">{title}</p>
      <div className="bg-white/5 border border-white/8 rounded-2xl px-4 py-1">{children}</div>
    </div>
  );
}

function ToggleRow({ icon, label, sub, val, onToggle }: { icon: React.ReactNode; label: string; sub: string; val: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-white/5 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white">{label}</p>
        <p className="text-[10px] text-white/40 leading-relaxed">{sub}</p>
      </div>
      <button
        onClick={onToggle}
        className={`w-11 h-6 rounded-full transition-all shrink-0 relative ${val ? "bg-[#a855f7] shadow-[0_0_10px_rgba(168,85,247,0.4)]" : "bg-white/15"}`}
      >
        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${val ? "right-1" : "left-1"}`} />
      </button>
    </div>
  );
}

function LinkRow({ icon, label, sub, badge }: { icon: React.ReactNode; label: string; sub: string; badge?: string }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-white/5 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">{icon}</div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-white">{label}</p>
        <p className="text-[10px] text-white/40">{sub}</p>
      </div>
      {badge ? (
        <span className="text-[10px] font-bold text-[#a855f7] bg-[#a855f7]/10 border border-[#a855f7]/20 px-2 py-0.5 rounded-full">{badge}</span>
      ) : (
        <ChevronRight size={16} className="text-white/25" />
      )}
    </div>
  );
}
