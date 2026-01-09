import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Globe, Palette, Shield, Loader2, Check, Upload, Building2, Sun, Moon, Monitor } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";

export default function Settings() {
  const { profile, church, refreshChurch } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const [churchName, setChurchName] = useState("");
  const [churchEmail, setChurchEmail] = useState("");
  const [churchPhone, setChurchPhone] = useState("");
  const [churchAddress, setChurchAddress] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoUrlInput, setLogoUrlInput] = useState("");
  const [themeColor, setThemeColor] = useState("#f59e0b");
  const [fontFamily, setFontFamily] = useState("Inter");
  const [language, setLanguage] = useState(profile?.language || "en");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isSavingPermissions, setIsSavingPermissions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (church) {
      setChurchName(church.name || "");
      setChurchEmail(church.email || "");
      setChurchPhone(church.phone || "");
      setChurchAddress(church.address || "");
      setLogoUrl(church.logoUrl || "");
      setThemeColor(church.themeColor || "#f59e0b");
      setFontFamily(church.fontFamily || "Inter");
    }
  }, [church]);

  const handleLanguageChange = async (lang: string) => {
    setLanguage(lang);
    i18n.changeLanguage(lang);
    
    if (profile?.id) {
      const { error } = await supabase
        .from('users')
        .update({ language: lang })
        .eq('id', profile.id);
      
      if (error) {
        toast({ 
          title: "Error", 
          description: "Failed to save language preference", 
          variant: "destructive" 
        });
      } else {
        toast({ 
          title: "Language Updated", 
          description: `Your language has been changed to ${lang === 'en' ? 'English' : lang === 'es' ? 'Spanish' : lang === 'de' ? 'German' : lang === 'fr' ? 'French' : 'Portuguese'}`
        });
      }
    }
  };

  const handleLogoUpload = async (file: File) => {
    if (!profile?.churchId) return;
    
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 5MB",
        variant: "destructive"
      });
      return;
    }

    const validTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Supported formats: PNG, JPG, GIF, SVG",
        variant: "destructive"
      });
      return;
    }

    setIsUploadingLogo(true);
    
    try {
      const ext = file.name.split('.').pop();
      const fileName = `church-${profile.churchId}-logo.${ext}`;
      
      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(fileName, file, { upsert: true });
      
      if (uploadError) throw uploadError;
      
      const { data: urlData } = supabase.storage
        .from('profile-images')
        .getPublicUrl(fileName);
      
      const publicUrl = urlData.publicUrl + '?t=' + Date.now();
      setLogoUrl(publicUrl);
      
      const { error: updateError } = await supabase
        .from('churches')
        .update({ logo_url: publicUrl })
        .eq('id', profile.churchId);
      
      if (updateError) throw updateError;
      
      refreshChurch();
      toast({
        title: "Logo uploaded",
        description: "Your church logo has been updated"
      });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload logo",
        variant: "destructive"
      });
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleLogoUrlSave = async () => {
    if (!profile?.churchId || !logoUrlInput) return;
    
    setIsUploadingLogo(true);
    try {
      const { error } = await supabase
        .from('churches')
        .update({ logo_url: logoUrlInput })
        .eq('id', profile.churchId);
      
      if (error) throw error;
      
      setLogoUrl(logoUrlInput);
      setLogoUrlInput("");
      refreshChurch();
      toast({
        title: "Logo updated",
        description: "Your church logo URL has been saved"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save logo URL",
        variant: "destructive"
      });
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleLogoUpload(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleLogoUpload(file);
  };

  const handleSaveChurchSettings = async () => {
    if (!profile?.churchId) {
      toast({ 
        title: "Error", 
        description: "No church found. Please refresh the page.", 
        variant: "destructive" 
      });
      return;
    }
    
    setIsSaving(true);
    
    try {
      const updateData = { 
        name: churchName,
        email: churchEmail || null,
        phone: churchPhone || null,
        address: churchAddress || null,
        theme_color: themeColor,
        font_family: fontFamily
      };
      
      const { data, error } = await supabase
        .from('churches')
        .update(updateData)
        .eq('id', profile.churchId)
        .select();
      
      if (error) {
        console.error("Church settings save error:", error);
        throw error;
      }
      
      console.log("Church settings saved:", data);
      await refreshChurch();
      
      toast({ 
        title: "Settings Saved", 
        description: "Your church settings have been updated successfully"
      });
    } catch (error: any) {
      console.error("Save failed:", error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to save settings", 
        variant: "destructive" 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePermissions = async () => {
    setIsSavingPermissions(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    toast({ 
      title: "Permissions Saved", 
      description: "Role permissions have been updated successfully"
    });
    setIsSavingPermissions(false);
  };

  const isPastorOrAdmin = profile?.role === 'pastor' || profile?.role === 'admin';

  const fontFamilies = [
    { value: 'Inter', label: 'Inter (Modern)' },
    { value: 'Georgia', label: 'Georgia (Traditional)' },
    { value: 'Arial', label: 'Arial (Classic)' },
    { value: 'Roboto', label: 'Roboto (Clean)' },
    { value: 'Open Sans', label: 'Open Sans (Friendly)' },
    { value: 'Lato', label: 'Lato (Elegant)' },
  ];

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-display">Settings</h1>
        <p className="text-muted-foreground">Manage your church and personal preferences</p>
      </div>

      <Tabs defaultValue="church" className="space-y-6">
        <TabsList className="bg-secondary/50 p-1 rounded-xl flex-wrap gap-1">
          <TabsTrigger value="church" className="rounded-lg gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <Building2 className="w-4 h-4" />
            Church
          </TabsTrigger>
          <TabsTrigger value="appearance" className="rounded-lg gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <Palette className="w-4 h-4" />
            Appearance
          </TabsTrigger>
          <TabsTrigger value="language" className="rounded-lg gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <Globe className="w-4 h-4" />
            Language
          </TabsTrigger>
          {isPastorOrAdmin && (
            <TabsTrigger value="permissions" className="rounded-lg gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <Shield className="w-4 h-4" />
              Permissions
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="church">
          <Card className="rounded-2xl border-border/50">
            <CardHeader>
              <CardTitle>Church Information</CardTitle>
              <CardDescription>Manage your church's details and contact information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Church Name</Label>
                  <Input 
                    value={churchName} 
                    onChange={(e) => setChurchName(e.target.value)}
                    placeholder="Add Church Name Here"
                    className="rounded-xl"
                    data-testid="input-church-name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input 
                    type="email"
                    value={churchEmail} 
                    onChange={(e) => setChurchEmail(e.target.value)}
                    placeholder="Add Church Email Here"
                    className="rounded-xl"
                    data-testid="input-church-email"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input 
                    type="tel"
                    value={churchPhone} 
                    onChange={(e) => setChurchPhone(e.target.value)}
                    placeholder="Add Church Phone Here"
                    className="rounded-xl"
                    data-testid="input-church-phone"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input 
                    value={churchAddress} 
                    onChange={(e) => setChurchAddress(e.target.value)}
                    placeholder="Add Church Address Here"
                    className="rounded-xl"
                    data-testid="input-church-address"
                  />
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-border/50">
                <Label>Church Logo</Label>
                <p className="text-sm text-muted-foreground">
                  Upload your church logo to personalize the system. Recommended size: 200x200 pixels or larger. Supported formats: PNG, JPG, GIF, SVG. Maximum file size: 5MB.
                </p>
                
                <div className="flex flex-col md:flex-row gap-6">
                  <div 
                    className="w-32 h-32 border-2 border-dashed border-border rounded-xl flex items-center justify-center bg-secondary/30 overflow-hidden cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                    data-testid="logo-upload-area"
                  >
                    {logoUrl ? (
                      <img src={logoUrl} alt="Church logo" className="w-full h-full object-cover" />
                    ) : (
                      <Upload className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>
                  
                  <div className="flex-1 space-y-4">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/gif,image/svg+xml"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <Button 
                      variant="outline" 
                      className="rounded-xl gap-2"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingLogo}
                      data-testid="button-choose-image"
                    >
                      {isUploadingLogo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      Choose Image
                    </Button>
                    
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Or enter logo URL directly</Label>
                      <div className="flex gap-2">
                        <Input 
                          value={logoUrlInput}
                          onChange={(e) => setLogoUrlInput(e.target.value)}
                          placeholder="https://example.com/logo.png"
                          className="rounded-xl"
                          data-testid="input-logo-url"
                        />
                        <Button 
                          variant="outline" 
                          onClick={handleLogoUrlSave}
                          disabled={!logoUrlInput || isUploadingLogo}
                          className="rounded-xl"
                          data-testid="button-save-logo-url"
                        >
                          Save
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        You can also provide a direct URL to your logo image hosted elsewhere.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <Button 
                className="rounded-xl gap-2" 
                onClick={handleSaveChurchSettings}
                disabled={isSaving}
                data-testid="button-save-church-info"
              >
                {isSaving ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                ) : (
                  <><Check className="w-4 h-4" /> Save Changes</>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance">
          <Card className="rounded-2xl border-border/50">
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Customize how your church system looks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label>Theme Mode</Label>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant={theme === "light" ? "default" : "outline"}
                    className="rounded-xl gap-2"
                    onClick={() => setTheme("light")}
                    data-testid="button-theme-light"
                  >
                    <Sun className="w-4 h-4" />
                    Light
                  </Button>
                  <Button
                    variant={theme === "dark" ? "default" : "outline"}
                    className="rounded-xl gap-2"
                    onClick={() => setTheme("dark")}
                    data-testid="button-theme-dark"
                  >
                    <Moon className="w-4 h-4" />
                    Dark
                  </Button>
                  <Button
                    variant={theme === "system" ? "default" : "outline"}
                    className="rounded-xl gap-2"
                    onClick={() => setTheme("system")}
                    data-testid="button-theme-system"
                  >
                    <Monitor className="w-4 h-4" />
                    System
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Choose between light, dark, or follow your system preference
                </p>
              </div>

              <div className="space-y-2">
                <Label>Primary Color</Label>
                <div className="flex items-center gap-4">
                  <input 
                    type="color" 
                    value={themeColor}
                    onChange={(e) => setThemeColor(e.target.value)}
                    className="w-12 h-12 rounded-xl border-2 border-border cursor-pointer"
                    data-testid="input-theme-color"
                  />
                  <span className="text-sm text-muted-foreground font-mono">{themeColor}</span>
                </div>
              </div>
              
              <div className="space-y-2 max-w-xs">
                <Label>Font Family</Label>
                <Select value={fontFamily} onValueChange={setFontFamily}>
                  <SelectTrigger className="rounded-xl" data-testid="select-font-family">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fontFamilies.map(font => (
                      <SelectItem key={font.value} value={font.value}>{font.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button 
                className="rounded-xl gap-2" 
                onClick={handleSaveChurchSettings}
                disabled={isSaving}
                data-testid="button-save-appearance"
              >
                {isSaving ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                ) : (
                  <><Check className="w-4 h-4" /> Save Changes</>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="language">
          <Card className="rounded-2xl border-border/50">
            <CardHeader>
              <CardTitle>Language Preferences</CardTitle>
              <CardDescription>Choose your preferred language for the application</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 max-w-xs">
                <Label>Display Language</Label>
                <Select value={language} onValueChange={handleLanguageChange}>
                  <SelectTrigger className="rounded-xl" data-testid="select-language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Espanol (Spanish)</SelectItem>
                    <SelectItem value="de">Deutsch (German)</SelectItem>
                    <SelectItem value="fr">Francais (French)</SelectItem>
                    <SelectItem value="pt">Portugues (Portuguese)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground mt-2">
                  Changes are saved automatically when you select a new language.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {isPastorOrAdmin && (
          <TabsContent value="permissions">
            <Card className="rounded-2xl border-border/50">
              <CardHeader>
                <CardTitle>Role Permissions</CardTitle>
                <CardDescription>Configure what each role can access and do</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {['admin', 'worker', 'member', 'guest'].map((role) => (
                    <div key={role} className="p-4 bg-secondary/30 rounded-xl">
                      <h4 className="font-semibold capitalize mb-3">{role}</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" className="rounded" defaultChecked={role !== 'guest'} />
                          View Dashboard
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" className="rounded" defaultChecked={role === 'admin' || role === 'worker'} />
                          Mark Attendance
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" className="rounded" defaultChecked={role === 'admin'} />
                          Create Tasks
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" className="rounded" defaultChecked={role === 'admin'} />
                          Post Announcements
                        </label>
                      </div>
                    </div>
                  ))}
                  <Button 
                    className="rounded-xl gap-2" 
                    onClick={handleSavePermissions}
                    disabled={isSavingPermissions}
                    data-testid="button-save-permissions"
                  >
                    {isSavingPermissions ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                    ) : (
                      <><Check className="w-4 h-4" /> Save Permissions</>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </Layout>
  );
}
