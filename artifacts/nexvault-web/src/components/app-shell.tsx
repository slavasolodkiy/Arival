import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useGetMe, useGetNotifications } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard, Landmark, CreditCard, Send, History, Bell, Settings, LogOut, ChevronRight
} from "lucide-react";
import { ReactNode } from "react";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/accounts", icon: Landmark, label: "Accounts" },
  { href: "/cards", icon: CreditCard, label: "Cards" },
  { href: "/payments", icon: Send, label: "Send Money" },
  { href: "/payments/history", icon: History, label: "History" },
  { href: "/notifications", icon: Bell, label: "Notifications" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { token, logout } = useAuth();
  const { data: user } = useGetMe({ query: { enabled: !!token } });
  const { data: notifications } = useGetNotifications({ unread_only: true }, { query: { enabled: !!token } });

  const unreadCount = notifications?.length ?? 0;
  const initials = user ? `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase() || user.email[0].toUpperCase() : "?";

  return (
    <div className="min-h-screen flex bg-muted/10">
      {/* Sidebar */}
      <aside className="w-60 border-r bg-sidebar flex flex-col fixed inset-y-0">
        {/* Logo */}
        <div className="h-16 flex items-center px-5 border-b border-sidebar-border">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">N</div>
            <span className="font-bold text-lg text-sidebar-foreground tracking-tight">Nexvault</span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map(item => {
            const isActive = location === item.href || (item.href !== "/dashboard" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}>
                <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"}`}>
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {item.label === "Notifications" && unreadCount > 0 && (
                    <Badge variant="secondary" className="h-5 px-1.5 text-xs bg-primary text-primary-foreground">
                      {unreadCount}
                    </Badge>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-sidebar-border">
          {user && (
            <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-xs font-bold text-sidebar-foreground">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-sidebar-foreground truncate">
                  {user.firstName ? `${user.firstName} ${user.lastName ?? ""}` : user.email}
                </p>
                <p className="text-xs text-sidebar-foreground/50 capitalize">{user.accountType}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={logout} className="w-7 h-7 text-sidebar-foreground/40 hover:text-sidebar-foreground">
                <LogOut className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 ml-60 min-h-screen">
        {children}
      </main>
    </div>
  );
}
