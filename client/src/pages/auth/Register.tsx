import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { Loader2, Church, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

export default function Register() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const params = useParams<{ churchId: string }>();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const emailParam = urlParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your passwords match",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      if (authData.user) {
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            church_id: params.churchId,
            full_name: fullName,
            role: 'guest',
            language: 'en'
          });

        if (profileError) {
          console.error("Profile creation error:", profileError);
        }
      }

      setIsSuccess(true);
      
      setTimeout(() => {
        setLocation("/login");
      }, 3000);

    } catch (error: any) {
      toast({
        title: "Registration failed",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary/30 p-4">
        <div className="w-full max-w-md bg-card p-8 rounded-3xl shadow-xl border border-border/50 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Welcome to the Church!</h1>
          <p className="text-muted-foreground mb-4">
            Your account has been created successfully. You've joined as a guest.
          </p>
          <p className="text-sm text-muted-foreground">
            Redirecting you to login...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary/30 p-4">
      <div className="w-full max-w-md bg-card p-8 rounded-3xl shadow-xl border border-border/50">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-primary">
            <Church className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold font-display text-foreground">Join Our Church</h1>
          <p className="text-muted-foreground mt-2">Create your account to become a member</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium ml-1">Full Name</label>
            <Input 
              type="text" 
              placeholder="John Smith" 
              className="rounded-xl px-4 py-6" 
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              data-testid="input-fullname"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium ml-1">Email Address</label>
            <Input 
              type="email" 
              placeholder="john@example.com" 
              className="rounded-xl px-4 py-6" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              data-testid="input-email"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium ml-1">Password</label>
            <Input 
              type="password" 
              placeholder="At least 6 characters" 
              className="rounded-xl px-4 py-6"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              data-testid="input-password"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium ml-1">Confirm Password</label>
            <Input 
              type="password" 
              placeholder="Confirm your password" 
              className="rounded-xl px-4 py-6"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              data-testid="input-confirm-password"
            />
          </div>

          <Button 
            type="submit" 
            className="w-full btn-primary rounded-xl py-6 text-lg font-semibold"
            disabled={isSubmitting}
            data-testid="button-register"
          >
            {isSubmitting ? (
              <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Creating Account...</>
            ) : "Create Account"}
          </Button>

          <div className="text-center text-sm text-muted-foreground mt-4">
            Already have an account? <a href="/login" className="text-primary hover:underline">Sign in</a>
          </div>
        </form>

        <div className="mt-8 pt-6 border-t border-border text-center text-xs text-muted-foreground">
          <p>By creating an account, you agree to join this church community.</p>
          <p className="mt-2">Powered by AMEN TECH</p>
        </div>
      </div>
    </div>
  );
}
