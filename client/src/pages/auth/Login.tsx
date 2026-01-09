import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const { signIn, isAuthenticated } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  if (isAuthenticated) {
    setLocation("/");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await signIn(email, password);
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary/30 p-4">
      <div className="w-full max-w-md bg-card p-8 rounded-3xl shadow-xl border border-border/50">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-primary">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8"><path d="M3 21h18"/><path d="M5 21V7l8-4 8 4v14"/><path d="M10 9a3 3 0 0 0-6 0"/></svg>
          </div>
          <h1 className="text-3xl font-bold font-display text-foreground">Welcome Back</h1>
          <p className="text-muted-foreground mt-2">Sign in to manage your church</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium ml-1">Email Address</label>
            <Input 
              type="email" 
              placeholder="pastor@church.com" 
              className="rounded-xl px-4 py-6" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
             <label className="text-sm font-medium ml-1">Password</label>
             <Input 
               type="password" 
               placeholder="••••••••" 
               className="rounded-xl px-4 py-6"
               value={password}
               onChange={(e) => setPassword(e.target.value)}
               required
             />
          </div>

          <Button 
            type="submit" 
            className="w-full btn-primary rounded-xl py-6 text-lg font-semibold"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Signing in...</>
            ) : "Sign In"}
          </Button>

          <div className="text-center text-sm text-muted-foreground mt-4">
             Don't have an account? <a href="#" className="text-primary hover:underline">Contact support</a>
          </div>
        </form>
      </div>
    </div>
  );
}
