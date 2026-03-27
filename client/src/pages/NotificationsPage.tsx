import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { api, type ApiNotification } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Heart, MessageCircle, UserPlus, Bell, CheckCheck, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

const TYPE_ICON = {
  like: Heart,
  comment: MessageCircle,
  follow: UserPlus,
};

const TYPE_COLOR = {
  like: "text-pink-400 bg-pink-500/10",
  comment: "text-violet-400 bg-violet-500/10",
  follow: "text-blue-400 bg-blue-500/10",
};

function NotifItem({ notif, onRead }: { notif: ApiNotification; onRead: (id: string) => void }) {
  const [, navigate] = useLocation();

  const Icon = TYPE_ICON[notif.type] ?? Bell;
  const colorClass = TYPE_COLOR[notif.type] ?? "text-white/50 bg-white/5";

  const handleClick = () => {
    if (!notif.isRead) onRead(notif.id);
    if (notif.entityType === "song" && notif.entityId) navigate(`/song/${notif.entityId}`);
    else if (notif.entityType === "moment" && notif.entityId) navigate(`/moment/${notif.entityId}`);
    else if (notif.entityType === "profile" && notif.entityId) navigate(`/profile`);
  };

  const timeAgo = (() => {
    try { return formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true }); }
    catch { return "recently"; }
  })();

  return (
    <button
      data-testid={`notification-item-${notif.id}`}
      onClick={handleClick}
      className={cn(
        "w-full flex items-start gap-3 px-4 py-3.5 transition-colors active:scale-[0.98] text-left",
        notif.isRead
          ? "bg-transparent hover:bg-white/3"
          : "bg-primary/5 border-l-2 border-primary hover:bg-primary/8"
      )}
    >
      {/* Sender avatar */}
      <div className="relative shrink-0">
        {notif.sender.avatarUrl ? (
          <img
            src={notif.sender.avatarUrl}
            alt={notif.sender.displayName}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
            {notif.sender.displayName[0]?.toUpperCase()}
          </div>
        )}
        {/* Type icon badge */}
        <span className={cn("absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center", colorClass)}>
          <Icon size={10} strokeWidth={2.5} />
        </span>
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm leading-snug",
          notif.isRead ? "text-white/60" : "text-white/90 font-medium"
        )}>
          {notif.message}
        </p>
        <p className="text-xs text-white/30 mt-0.5">{timeAgo}</p>
      </div>

      {/* Unread dot */}
      {!notif.isRead && (
        <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0 shadow-[0_0_6px_2px_rgba(168,85,247,0.5)]" />
      )}
    </button>
  );
}

export default function NotificationsPage() {
  const { state } = useAuth();
  const isAuthed = state.status === "authenticated";
  const qc = useQueryClient();

  const { data: notifs = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["notifications"],
    queryFn: api.getNotifications,
    enabled: isAuthed,
    refetchInterval: 30_000,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => api.markNotificationRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: api.markAllNotificationsRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
  });

  const unreadCount = notifs.filter(n => !n.isRead).length;

  return (
    <div className="flex flex-col min-h-screen bg-[#08080e] pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#08080e]/90 backdrop-blur-xl border-b border-white/5 px-4 pt-12 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell size={20} className="text-primary" />
            <h1 className="text-lg font-bold text-white">Notifications</h1>
            {unreadCount > 0 && (
              <span
                data-testid="notifications-unread-badge"
                className="px-2 py-0.5 bg-primary/20 text-primary text-xs font-bold rounded-full"
              >
                {unreadCount}
              </span>
            )}
          </div>

          {unreadCount > 0 && (
            <button
              data-testid="button-mark-all-read"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
              className="flex items-center gap-1.5 text-xs text-white/50 hover:text-primary transition-colors py-1 px-2 rounded-lg hover:bg-primary/10"
            >
              <CheckCheck size={14} />
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      {isLoading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      )}

      {isError && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-white/40">
          <Bell size={40} className="opacity-30" />
          <p className="text-sm">Failed to load notifications</p>
          <button
            data-testid="button-retry-notifications"
            onClick={() => refetch()}
            className="flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            <RefreshCw size={12} />
            Retry
          </button>
        </div>
      )}

      {!isLoading && !isError && notifs.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-white/40 px-6">
          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
            <Bell size={28} className="opacity-40" />
          </div>
          <div className="text-center">
            <p className="text-base font-medium text-white/60">No notifications yet</p>
            <p className="text-sm text-white/30 mt-1">When someone likes, comments, or follows you — you'll see it here</p>
          </div>
        </div>
      )}

      {!isLoading && !isError && notifs.length > 0 && (
        <div className="divide-y divide-white/5">
          {notifs.map((n) => (
            <NotifItem
              key={n.id}
              notif={n}
              onRead={(id) => markRead.mutate(id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
