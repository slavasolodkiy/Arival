import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useRegister } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { RegisterRequestAccountType } from "@workspace/api-client-react";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [accountType, setAccountType] = useState<RegisterRequestAccountType>("individual");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const registerMutation = useRegister({
    mutation: {
      onSuccess: (data) => {
        toast({
          title: "Account created",
          description: "Welcome to Nexvault! Please log in to continue."
        });
        setLocation("/login");
      },
      onError: (error: any) => {
        toast({
          variant: "destructive",
          title: "Registration failed",
          description: error?.message || "Please check your inputs and try again."
        });
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    registerMutation.mutate({ 
      data: { email, password, firstName, lastName, accountType } 
    });
  };

  return (
    <div className="min-h-screen flex bg-background">
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-20 xl:px-24 py-12">
        <div className="mx-auto w-full max-w-md">
          <Link href="/" className="font-bold text-xl tracking-tight text-primary flex items-center gap-2 mb-8">
            <div className="w-6 h-6 rounded bg-primary text-primary-foreground flex items-center justify-center text-xs">N</div>
            Nexvault
          </Link>
          
          <h2 className="text-3xl font-semibold tracking-tight text-foreground mb-2">Create an account</h2>
          <p className="text-muted-foreground mb-8">Join Nexvault and start banking globally.</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First name</Label>
                <Input 
                  id="firstName" 
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="h-12 bg-muted/50 border-transparent focus:bg-background" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input 
                  id="lastName" 
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="h-12 bg-muted/50 border-transparent focus:bg-background" 
                />
              </div>
            </div>

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
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="h-12 bg-muted/50 border-transparent focus:bg-background" 
              />
            </div>

            <div className="space-y-3">
              <Label>Account Type</Label>
              <div className="grid grid-cols-2 gap-4">
                <div 
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${accountType === "individual" ? "border-primary bg-primary/5" : "hover:border-border/80"}`}
                  onClick={() => setAccountType("individual")}
                >
                  <div className="font-medium text-sm mb-1">Individual</div>
                  <div className="text-xs text-muted-foreground">For personal use</div>
                </div>
                <div 
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${accountType === "business" ? "border-primary bg-primary/5" : "hover:border-border/80"}`}
                  onClick={() => setAccountType("business")}
                >
                  <div className="font-medium text-sm mb-1">Business</div>
                  <div className="text-xs text-muted-foreground">For companies</div>
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full h-12 text-base rounded-full" disabled={registerMutation.isPending}>
              {registerMutation.isPending ? "Creating account..." : "Create account"}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
