import { useGetNotifications, useMarkAllNotificationsRead } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Check } from "lucide-react";
import { AppShell } from "@/components/app-shell";

const TYPE_COLORS: Record<string, string> = {
  credit: "bg-emerald-50 text-emerald-600",
  debit: "bg-red-50 text-red-600",
  card: "bg-blue-50 text-blue-600",
  payment: "bg-purple-50 text-purple-600",
  kyc: "bg-teal-50 text-teal-600",
  system: "bg-slate-50 text-slate-600",
};

export default function Notifications() {
  const { token } = useAuth();
  const { data: notifications, refetch } = useGetNotifications({}, { query: { enabled: !!token } });
  const { mutate: markAllRead } = useMarkAllNotificationsRead();

  const unreadCount = notifications?.filter(n => !n.read).length ?? 0;

  const handleMarkAllRead = () => {
    markAllRead(undefined, { onSuccess: () => refetch() });
  };

  return (
    <AppShell>
      <div className="p-8 max-w-2xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Notifications</h1>
            {unreadCount > 0 && (
              <p className="text-sm text-muted-foreground mt-1">{unreadCount} unread</p>
            )}
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAllRead} className="gap-2">
              <Check className="w-4 h-4" />
              Mark all read
            </Button>
          )}
        </div>

        {!notifications || notifications.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Bell className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="font-medium">No notifications</p>
            <p className="text-sm mt-1">You will be notified of transactions, card activity, and account updates</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map(notification => (
              <div
                key={notification.id}
                className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${!notification.read ? "bg-primary/5 border-primary/20" : "border-border/50"}`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${TYPE_COLORS[notification.type] ?? "bg-muted text-muted-foreground"}`}>
                  <Bell className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold">{notification.title}</p>
                    {!notification.read && <span className="w-2 h-2 rounded-full bg-primary inline-block" />}
                  </div>
                  <p className="text-sm text-muted-foreground">{notification.body}</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    {new Date(notification.createdAt).toLocaleString("en-GB", {
                      day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
                    })}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs flex-shrink-0">{notification.type}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
