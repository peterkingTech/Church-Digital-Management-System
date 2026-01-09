import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocation, useParams } from "wouter";
import { Loader2, Church, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

export default function Auth() {
  const { signIn, isAuthenticated } = useAuth();
  const [isSignup, setIsSignup] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [birthday, setBirthday] = useState("");
  const [language, setLanguage] = useState("en");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [churchName, setChurchName] = useState("");
  const [churchAddress, setChurchAddress] = useState("");
  const [churchPhone, setChurchPhone] = useState("");
  const [churchEmail, setChurchEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string | null>(null);
  const [inviteDepartment, setInviteDepartment] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const params = useParams<{ churchId?: string }>();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const emailParam = urlParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }
    const modeParam = urlParams.get('mode');
    if (modeParam === 'signin') {
      setIsSignup(false);
    }
    const roleParam = urlParams.get('role');
    if (roleParam) {
      setInviteRole(roleParam);
    }
    const departmentParam = urlParams.get('department');
    if (departmentParam) {
      setInviteDepartment(departmentParam);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);

  const handleSignIn = async (e: React.FormEvent) => {
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

  const handleSignUp = async (e: React.FormEvent) => {
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

    if (!acceptTerms || !acceptPrivacy) {
      toast({
        title: "Accept required policies",
        description: "Please accept the Terms of Service and Privacy Policy",
        variant: "destructive",
      });
      return;
    }

    if (!params.churchId && (!churchName || !churchAddress || !churchPhone)) {
      toast({
        title: "Church information required",
        description: "Please fill in all church details (name, address, phone)",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const fullName = `${firstName} ${lastName}`.trim();
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            language: language,
            church_id: params.churchId || null,
            church_name: params.churchId ? null : churchName,
            church_address: params.churchId ? null : churchAddress,
            church_phone: params.churchId ? null : churchPhone,
            church_email: params.churchId ? null : churchEmail,
            invite_role: inviteRole,
            invite_department: inviteDepartment,
          }
        }
      });

      if (authError) throw authError;

      setIsSuccess(true);
      setTimeout(() => {
        setIsSignup(false);
        setIsSuccess(false);
        setPassword("");
        setConfirmPassword("");
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
        <div className="w-full max-w-md bg-card p-8 rounded-2xl shadow-xl border border-border/50 text-center">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {params.churchId ? "Welcome to the Church!" : "Church Account Created!"}
          </h1>
          <p className="text-muted-foreground mb-4">
            {params.churchId 
              ? "Your account has been created successfully. You've joined as a guest."
              : "Your church account has been created. You are now the pastor/admin."}
          </p>
          <p className="text-sm text-muted-foreground">
            Redirecting you to sign in...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary/30 p-4">
      <div className="w-full max-w-md bg-card p-8 rounded-2xl shadow-xl border border-border/50">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4 text-primary">
            <Church className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {isSignup ? "Create Account" : "Sign In"}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {isSignup
              ? "Create your church or join your organization"
              : "Welcome back, please sign in"}
          </p>
        </div>

        <form onSubmit={isSignup ? handleSignUp : handleSignIn} className="space-y-4">
          {isSignup && (
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="text"
                placeholder="First Name *"
                className="rounded-xl"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                data-testid="input-firstname"
              />
              <Input
                type="text"
                placeholder="Last Name *"
                className="rounded-xl"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                data-testid="input-lastname"
              />
            </div>
          )}

          <Input
            type="email"
            placeholder="Email Address *"
            className="rounded-xl"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            data-testid="input-email"
          />

          <Input
            type="password"
            placeholder="Password *"
            className="rounded-xl"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            data-testid="input-password"
          />

          {isSignup && (
            <Input
              type="password"
              placeholder="Confirm Password *"
              className="rounded-xl"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              data-testid="input-confirm-password"
            />
          )}

          {isSignup && !params.churchId && (
            <>
              <div className="pt-2 text-sm text-muted-foreground font-medium">
                Church Information (Required)
              </div>

              <Input
                type="text"
                placeholder="Church Name *"
                className="rounded-xl"
                value={churchName}
                onChange={(e) => setChurchName(e.target.value)}
                required
                data-testid="input-church-name"
              />

              <Input
                type="text"
                placeholder="Church Address *"
                className="rounded-xl"
                value={churchAddress}
                onChange={(e) => setChurchAddress(e.target.value)}
                required
                data-testid="input-church-address"
              />

              <Input
                type="tel"
                placeholder="Church Phone *"
                className="rounded-xl"
                value={churchPhone}
                onChange={(e) => setChurchPhone(e.target.value)}
                required
                data-testid="input-church-phone"
              />

              <Input
                type="email"
                placeholder="Church Email (Optional)"
                className="rounded-xl"
                value={churchEmail}
                onChange={(e) => setChurchEmail(e.target.value)}
                data-testid="input-church-email"
              />
            </>
          )}

          {isSignup && (
            <>
              <div className="pt-2 text-sm text-muted-foreground font-medium">
                Additional Information (Optional)
              </div>

              <Input
                type="tel"
                placeholder="Phone Number"
                className="rounded-xl"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                data-testid="input-phone"
              />

              <Input
                type="date"
                placeholder="Birthday"
                className="rounded-xl"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                data-testid="input-birthday"
              />

              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="rounded-xl" data-testid="select-language">
                  <SelectValue placeholder="Select Language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="pt">Portuguese</SelectItem>
                </SelectContent>
              </Select>
            </>
          )}

          {isSignup && (
            <div className="space-y-3 pt-2">
              <label className="flex items-start gap-2 text-sm">
                <Checkbox
                  checked={acceptTerms}
                  onCheckedChange={(checked) => setAcceptTerms(checked === true)}
                  data-testid="checkbox-terms"
                />
                <span className="text-muted-foreground">
                  I accept the{" "}
                  <a href="#" className="text-primary hover:underline">
                    Terms of Service
                  </a>{" "}
                  *
                </span>
              </label>

              <label className="flex items-start gap-2 text-sm">
                <Checkbox
                  checked={acceptPrivacy}
                  onCheckedChange={(checked) => setAcceptPrivacy(checked === true)}
                  data-testid="checkbox-privacy"
                />
                <span className="text-muted-foreground">
                  I accept the{" "}
                  <a href="#" className="text-primary hover:underline">
                    Privacy Policy
                  </a>{" "}
                  *
                </span>
              </label>
            </div>
          )}

          <Button
            type="submit"
            className="w-full rounded-xl py-5 font-semibold"
            disabled={isSubmitting}
            data-testid="button-submit"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                {isSignup ? "Creating Account..." : "Signing In..."}
              </>
            ) : isSignup ? (
              "Create Church Account"
            ) : (
              "Sign In"
            )}
          </Button>
        </form>

        <div className="text-center text-sm mt-6">
          {isSignup ? (
            <>
              <span className="text-muted-foreground">Already have an account? </span>
              <button
                type="button"
                onClick={() => setIsSignup(false)}
                className="text-primary font-medium hover:underline"
                data-testid="button-switch-signin"
              >
                Sign in here
              </button>
            </>
          ) : (
            <>
              <span className="text-muted-foreground">Don't have an account? </span>
              <button
                type="button"
                onClick={() => setIsSignup(true)}
                className="text-primary font-medium hover:underline"
                data-testid="button-switch-signup"
              >
                Create one
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
