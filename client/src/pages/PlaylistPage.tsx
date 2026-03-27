import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Play, ListMusic, Music2, Pencil, Trash2, Loader2, Check, X } from "lucide-react";
import { api, ApiPlaylistDetail, ApiSong } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function PlaylistPage() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: playlist, isLoading } = useQuery({
    queryKey: ["playlist", params.id],
    queryFn: () => api.getPlaylist(params.id),
    enabled: !!params.id,
  });

  const updateMutation = useMutation({
    mutationFn: (data: { name?: string; description?: string }) =>
      api.updatePlaylist(params.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playlist", params.id] });
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
      setEditMode(false);
      toast({ description: "Playlist updated" });
    },
    onError: () => toast({ description: "Failed to update", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deletePlaylist(params.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
      toast({ description: "Playlist deleted" });
      setLocation("/profile");
    },
    onError: () => toast({ description: "Failed to delete", variant: "destructive" }),
  });

  const removeSongMutation = useMutation({
    mutationFn: (songId: string) => api.removeSongFromPlaylist(params.id, songId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playlist", params.id] });
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
      toast({ description: "Song removed" });
    },
    onError: () => toast({ description: "Failed to remove song", variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#08080e] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="min-h-screen bg-[#08080e] flex flex-col items-center justify-center gap-4 p-8">
        <ListMusic size={48} className="text-white/20" />
        <p className="text-white/50 text-center">Playlist not found</p>
        <button
          onClick={() => setLocation("/profile")}
          className="text-primary font-semibold text-sm"
        >
          Go back
        </button>
      </div>
    );
  }

  const coverUrl = playlist.coverUrl ?? playlist.songs[0]?.coverUrl ?? null;

  const handleSaveEdit = () => {
    if (!editName.trim()) { toast({ description: "Name is required", variant: "destructive" }); return; }
    updateMutation.mutate({ name: editName.trim(), description: editDesc.trim() });
  };

  const startEdit = () => {
    setEditName(playlist.name);
    setEditDesc(playlist.description ?? "");
    setEditMode(true);
  };

  return (
    <div className="min-h-screen bg-[#08080e] pb-24 overflow-y-auto">
      {/* Header Banner */}
      <div className="relative h-64 overflow-hidden">
        {coverUrl ? (
          <img src={coverUrl} alt={playlist.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/30 via-primary/10 to-black flex items-center justify-center">
            <ListMusic size={80} className="text-primary/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#08080e] via-[#08080e]/60 to-transparent" />

        {/* Back button */}
        <button
          data-testid="button-back-playlist"
          onClick={() => setLocation("/profile")}
          className="absolute top-4 left-4 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center border border-white/10 z-10"
        >
          <ArrowLeft size={20} className="text-white" />
        </button>

        {/* Edit + Delete */}
        <div className="absolute top-4 right-4 flex gap-2 z-10">
          <button
            data-testid="button-edit-playlist"
            onClick={startEdit}
            className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center border border-white/10"
          >
            <Pencil size={16} className="text-white" />
          </button>
          <button
            data-testid="button-delete-playlist"
            onClick={() => setConfirmDelete(true)}
            className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center border border-white/10"
          >
            <Trash2 size={16} className="text-red-400" />
          </button>
        </div>

        {/* Title area */}
        <div className="absolute bottom-4 left-5 right-5">
          <div className="flex items-center gap-2 mb-1">
            <ListMusic size={14} className="text-primary" />
            <span className="text-xs text-primary font-semibold uppercase tracking-widest">Playlist</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-white leading-tight">{playlist.name}</h1>
          {playlist.description && (
            <p className="text-sm text-white/50 mt-1 line-clamp-2">{playlist.description}</p>
          )}
          <p className="text-xs text-white/30 mt-2">{playlist.songs.length} songs</p>
        </div>
      </div>

      {/* Songs List */}
      <div className="px-4 pt-2">
        {playlist.songs.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Music2 size={48} className="text-white/10" />
            <p className="text-white/30 text-sm">No songs yet</p>
            <p className="text-white/20 text-xs">Add songs from the feed using the playlist button</p>
          </div>
        ) : (
          <div className="space-y-1">
            {playlist.songs.map((song, idx) => (
              <SongRow
                key={song.id}
                song={song}
                index={idx + 1}
                onRemove={() => removeSongMutation.mutate(song.id)}
                removing={removeSongMutation.isPending && removeSongMutation.variables === song.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editMode && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end">
          <div
            className="w-full bg-[#0e0e1a] border-t border-white/10 rounded-t-3xl p-6 animate-in slide-in-from-bottom duration-300"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">Edit Playlist</h3>
              <button onClick={() => setEditMode(false)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                <X size={16} className="text-white/60" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-white/50 font-semibold uppercase tracking-wider mb-2 block">Name</label>
                <input
                  data-testid="input-edit-playlist-name"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  placeholder="Playlist name"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-white/50 font-semibold uppercase tracking-wider mb-2 block">Description (optional)</label>
                <input
                  data-testid="input-edit-playlist-desc"
                  value={editDesc}
                  onChange={e => setEditDesc(e.target.value)}
                  placeholder="Describe your playlist..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 text-sm"
                />
              </div>
              <button
                data-testid="button-save-playlist-edit"
                onClick={handleSaveEdit}
                disabled={updateMutation.isPending}
                className="w-full py-3.5 rounded-2xl bg-primary font-bold text-white text-sm disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {updateMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {confirmDelete && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          onClick={() => setConfirmDelete(false)}
        >
          <div
            className="w-full max-w-sm bg-[#0e0e1a] border border-white/10 rounded-3xl p-6 animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex flex-col items-center gap-3 mb-6">
              <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center">
                <Trash2 size={24} className="text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-white">Delete Playlist?</h3>
              <p className="text-sm text-white/50 text-center">
                "{playlist.name}" will be permanently deleted. This cannot be undone.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/70 font-semibold text-sm"
              >
                Cancel
              </button>
              <button
                data-testid="button-confirm-delete-playlist"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="flex-1 py-3 rounded-2xl bg-red-500/20 border border-red-500/30 text-red-400 font-semibold text-sm disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {deleteMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SongRow({
  song,
  index,
  onRemove,
  removing,
}: {
  song: ApiSong;
  index: number;
  onRemove: () => void;
  removing: boolean;
}) {
  return (
    <div
      data-testid={`row-playlist-song-${song.id}`}
      className="flex items-center gap-3 px-2 py-3 rounded-2xl hover:bg-white/5 transition-colors group"
    >
      <span className="text-xs text-white/20 font-mono w-5 text-center flex-shrink-0">{index}</span>
      <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 relative">
        <img src={song.coverUrl} alt={song.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity">
          <Play size={16} className="text-white fill-white" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">{song.title}</p>
        <p className="text-xs text-white/40 truncate">{song.artist}</p>
      </div>
      <button
        data-testid={`button-remove-playlist-song-${song.id}`}
        onClick={onRemove}
        disabled={removing}
        className="w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-500/10 transition-all text-red-400 disabled:opacity-40"
      >
        {removing ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
      </button>
    </div>
  );
}
