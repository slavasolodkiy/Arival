import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useLogin } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [, setLocation] = useLocation();
  const { setToken } = useAuth();
  const { toast } = useToast();
  
  const loginMutation = useLogin({
    mutation: {
      onSuccess: (data) => {
        setToken(data.accessToken);
        const kycStatus = data.user?.kycStatus;
        if (kycStatus === "pending" || kycStatus === "in_progress") {
          setLocation("/onboarding");
        } else {
          setLocation("/dashboard");
        }
      },
      onError: (error: any) => {
        toast({
          variant: "destructive",
          title: "Login failed",
          description: error?.message || "Please check your credentials and try again."
        });
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ data: { email, password } });
  };

  return (
    <div className="min-h-screen flex bg-background">
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <Link href="/" className="font-bold text-xl tracking-tight text-primary flex items-center gap-2 mb-8">
            <div className="w-6 h-6 rounded bg-primary text-primary-foreground flex items-center justify-center text-xs">N</div>
            Nexvault
          </Link>
          
          <h2 className="text-3xl font-semibold tracking-tight text-foreground mb-2">Welcome back</h2>
          <p className="text-muted-foreground mb-8">Enter your details to access your account.</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input 
                id="email" 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 bg-muted/50 border-transparent focus:bg-background" 
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <a href="#" className="text-sm font-medium text-primary hover:underline">Forgot password?</a>
              </div>
              <Input 
                id="password" 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12 bg-muted/50 border-transparent focus:bg-background" 
              />
            </div>

            <Button type="submit" className="w-full h-12 text-base rounded-full" disabled={loginMutation.isPending}>
              {loginMutation.isPending ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link href="/register" className="font-medium text-primary hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
      <div className="hidden lg:block relative w-0 flex-1 bg-secondary">
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-12">
          <h2 className="text-4xl font-bold text-white mb-6">Banking, refined.</h2>
          <p className="text-lg text-white/70 max-w-md">Experience borderless finance with tools engineered for the modern global citizen.</p>
        </div>
      </div>
    </div>
  );
}
