import { useGetMe } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, Shield, Bell, LogOut } from "lucide-react";
import { AppShell } from "@/components/app-shell";

export default function Settings() {
  const { token, logout } = useAuth();
  const { data: user } = useGetMe({ query: { enabled: !!token } });

  return (
    <AppShell>
      <div className="p-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your account and preferences</p>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="w-4 h-4" /> Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {user ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Name</span>
                    <span className="font-medium">{user.firstName} {user.lastName}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Email</span>
                    <span className="font-medium">{user.email}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Account type</span>
                    <Badge variant="outline" className="capitalize">{user.accountType}</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Member since</span>
                    <span className="font-medium">{new Date(user.createdAt).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</span>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Loading...</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="w-4 h-4" /> KYC & Verification
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Identity verification</span>
                <Badge variant={user?.kycStatus === "approved" ? "default" : "secondary"} className="capitalize">
                  {user?.kycStatus ?? "pending"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="w-4 h-4" /> Notifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Notification preferences will be available soon.</p>
            </CardContent>
          </Card>

          <Card className="border-destructive/30">
            <CardContent className="pt-4">
              <Button variant="destructive" onClick={logout} className="w-full gap-2">
                <LogOut className="w-4 h-4" />
                Sign out
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
