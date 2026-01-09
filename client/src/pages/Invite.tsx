import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Link2, QrCode, UserPlus, Mail, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { DEPARTMENTS } from "@shared/schema";

export default function Invite() {
  const { profile, church } = useAuth();
  const { toast } = useToast();
  const [inviteEnabled, setInviteEnabled] = useState(true);
  const [memberEmail, setMemberEmail] = useState("");
  const [personalLink, setPersonalLink] = useState("");
  
  const [emailInviteAddress, setEmailInviteAddress] = useState("");
  const [emailInviteRole, setEmailInviteRole] = useState("member");
  const [emailInviteDepartment, setEmailInviteDepartment] = useState("");
  const [isSendingInvite, setIsSendingInvite] = useState(false);

  useEffect(() => {
    if (church) {
      setInviteEnabled(church.inviteEnabled ?? true);
    }
  }, [church]);

  const inviteLink = `${window.location.origin}/join/${profile?.churchId || "demo"}`;

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink);
    toast({ title: "Copied!", description: "Invite link copied to clipboard" });
  };

  const handleInviteToggle = async (enabled: boolean) => {
    setInviteEnabled(enabled);
    
    if (profile?.churchId) {
      const { error } = await supabase
        .from('churches')
        .update({ invite_enabled: enabled })
        .eq('id', profile.churchId);
      
      if (error) {
        toast({ 
          title: "Error", 
          description: "Failed to update invite settings", 
          variant: "destructive" 
        });
        setInviteEnabled(!enabled);
      } else {
        toast({ 
          title: enabled ? "Invitations Enabled" : "Invitations Disabled", 
          description: enabled ? "New members can now join your church" : "New members cannot join until you enable invitations"
        });
      }
    }
  };

  const generatePersonalLink = () => {
    if (!memberEmail) {
      toast({
        title: "Email Required",
        description: "Please enter the member's email address",
        variant: "destructive"
      });
      return;
    }
    const encodedEmail = encodeURIComponent(memberEmail);
    const link = `${inviteLink}?email=${encodedEmail}`;
    setPersonalLink(link);
  };

  const copyPersonalLink = () => {
    if (personalLink) {
      navigator.clipboard.writeText(personalLink);
      toast({ title: "Copied!", description: "Personal invite link copied to clipboard" });
    }
  };

  const handleSendEmailInvite = async () => {
    if (!emailInviteAddress) {
      toast({
        title: "Email Required",
        description: "Please enter an email address",
        variant: "destructive"
      });
      return;
    }

    setIsSendingInvite(true);
    
    try {
      const encodedEmail = encodeURIComponent(emailInviteAddress);
      const encodedRole = encodeURIComponent(emailInviteRole);
      const encodedDept = emailInviteDepartment && emailInviteDepartment !== 'none' ? encodeURIComponent(emailInviteDepartment) : "";
      const link = `${inviteLink}?email=${encodedEmail}&role=${encodedRole}${encodedDept ? `&department=${encodedDept}` : ""}`;
      
      await navigator.clipboard.writeText(link);
      
      toast({
        title: "Invite Link Ready",
        description: `Invitation link for ${emailInviteAddress} has been copied. Share it with them to complete registration.`
      });
      
      setEmailInviteAddress("");
      setEmailInviteRole("member");
      setEmailInviteDepartment("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to create invitation",
        variant: "destructive"
      });
    } finally {
      setIsSendingInvite(false);
    }
  };

  const isPastorOrAdmin = profile?.role === 'pastor' || profile?.role === 'admin';
  const canAssignRoles = profile?.role === 'pastor' || profile?.role === 'admin' || profile?.role === 'worker';


  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-display">Invite Members</h1>
        <p className="text-muted-foreground">Invite new members to join your church</p>
      </div>

      <Tabs defaultValue="email" className="space-y-6">
        <TabsList className="bg-secondary/50 p-1 rounded-xl flex-wrap gap-1">
          <TabsTrigger value="email" className="rounded-lg gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm" data-testid="tab-invite-email">
            <Mail className="w-4 h-4" />
            Email Invite
          </TabsTrigger>
          <TabsTrigger value="link" className="rounded-lg gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm" data-testid="tab-invite-link">
            <Link2 className="w-4 h-4" />
            Link
          </TabsTrigger>
          <TabsTrigger value="qrcode" className="rounded-lg gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm" data-testid="tab-invite-qrcode">
            <QrCode className="w-4 h-4" />
            QR Code
          </TabsTrigger>
          <TabsTrigger value="office" className="rounded-lg gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm" data-testid="tab-invite-office">
            <UserPlus className="w-4 h-4" />
            Sign Up from Office
          </TabsTrigger>
        </TabsList>

        <TabsContent value="email">
          <Card className="rounded-2xl border-border/50">
            <CardHeader>
              <CardTitle>Invite Users</CardTitle>
              <CardDescription>Send an invitation to join your church</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 max-w-lg">
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input 
                  type="email"
                  placeholder="Enter email address" 
                  className="rounded-xl"
                  value={emailInviteAddress}
                  onChange={(e) => setEmailInviteAddress(e.target.value)}
                  data-testid="input-email-invite"
                />
              </div>

              <div className="space-y-2">
                <Label>Assign Role</Label>
                <Select value={emailInviteRole} onValueChange={setEmailInviteRole}>
                  <SelectTrigger className="rounded-xl" data-testid="select-invite-role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="guest">Guest</SelectItem>
                    <SelectItem value="member">Member</SelectItem>
                    {canAssignRoles && (
                      <>
                        <SelectItem value="worker">Worker</SelectItem>
                        {isPastorOrAdmin && <SelectItem value="admin">Admin</SelectItem>}
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label>Department</Label>
                  <span className="text-xs text-muted-foreground">Optional</span>
                </div>
                <Select value={emailInviteDepartment} onValueChange={setEmailInviteDepartment}>
                  <SelectTrigger className="rounded-xl" data-testid="select-invite-department">
                    <SelectValue placeholder="Select department (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {DEPARTMENTS.map(dept => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={handleSendEmailInvite}
                className="rounded-xl gap-2 w-full"
                disabled={isSendingInvite || !emailInviteAddress}
                data-testid="button-send-invite"
              >
                {isSendingInvite ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</>
                ) : (
                  <><Mail className="w-4 h-4" /> Send Invitation</>
                )}
              </Button>

              <div className="pt-4 border-t border-border/50 space-y-2">
                <h4 className="font-medium text-sm">How invitations work:</h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Invited users receive a registration link</li>
                  <li>They can set their own password when they first sign up</li>
                  <li>Their assigned role and department will be pre-configured</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="link">
          <Card className="rounded-2xl border-border/50">
            <CardHeader>
              <CardTitle>Invite Link</CardTitle>
              <CardDescription>Share this link to invite new members to your church</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label>Your Invite Link</Label>
                <div className="flex gap-2">
                  <Input 
                    value={inviteLink} 
                    readOnly 
                    className="rounded-xl font-mono text-sm"
                    data-testid="input-invite-link"
                  />
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={copyInviteLink}
                    className="rounded-xl shrink-0"
                    data-testid="button-copy-invite"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  New members who sign up using this link will automatically join your church as guests.
                </p>
              </div>

              {isPastorOrAdmin && (
                <div className="flex items-center justify-between pt-4 border-t border-border/50">
                  <div>
                    <p className="font-medium">Enable Invitations</p>
                    <p className="text-sm text-muted-foreground">Allow new members to join via link</p>
                  </div>
                  <Switch 
                    checked={inviteEnabled} 
                    onCheckedChange={handleInviteToggle}
                    data-testid="switch-enable-invites" 
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="qrcode">
          <Card className="rounded-2xl border-border/50">
            <CardHeader>
              <CardTitle>QR Code</CardTitle>
              <CardDescription>Display this QR code for members to scan and join</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center p-8 bg-secondary/30 rounded-2xl max-w-sm mx-auto">
                <QRCodeSVG 
                  value={inviteLink} 
                  size={220}
                  bgColor="transparent"
                  fgColor="currentColor"
                  className="text-foreground"
                />
                <p className="text-sm text-muted-foreground mt-6">Scan to join {church?.name || "our church"}</p>
                <Button 
                  variant="outline" 
                  className="mt-4 rounded-xl gap-2"
                  onClick={copyInviteLink}
                  data-testid="button-copy-link-qrcode"
                >
                  <Copy className="w-4 h-4" />
                  Copy Link
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-6 text-center">
                Print this QR code and display it in your church office or during services for easy sign-ups.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="office">
          <Card className="rounded-2xl border-border/50">
            <CardHeader>
              <CardTitle>Sign Up from Office</CardTitle>
              <CardDescription>Generate a personalized invite link for a new member</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 max-w-md">
              <div className="space-y-4">
                <Label>Member's Email Address</Label>
                <Input 
                  type="email"
                  placeholder="Enter email address" 
                  className="rounded-xl"
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  data-testid="input-office-email"
                />
                <p className="text-sm text-muted-foreground">
                  Enter the new member's email to generate a personalized invite link. Their email will be pre-filled when they sign up.
                </p>
              </div>

              <Button 
                onClick={generatePersonalLink}
                className="rounded-xl gap-2"
                data-testid="button-generate-link"
              >
                <Link2 className="w-4 h-4" /> Generate Personal Invite Link
              </Button>

              {personalLink && (
                <div className="space-y-4 pt-4 border-t border-border/50">
                  <Label>Personal Invite Link</Label>
                  <div className="flex gap-2">
                    <Input 
                      value={personalLink} 
                      readOnly 
                      className="rounded-xl font-mono text-sm"
                      data-testid="input-personal-link"
                    />
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={copyPersonalLink}
                      className="rounded-xl shrink-0"
                      data-testid="button-copy-personal-link"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Share this link with {memberEmail}. Their email will be pre-filled on the registration page.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </Layout>
  );
}
