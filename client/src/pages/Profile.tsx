import { useState, useCallback } from "react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Upload, Link as LinkIcon, Camera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

export default function Profile() {
  const { profile, church, refreshProfile } = useAuth();
  const { t } = useTranslation();
  const { toast } = useToast();
  
  const [fullName, setFullName] = useState(profile?.fullName || "");
  const [email, setEmail] = useState(profile?.email || "");
  const [imageUrl, setImageUrl] = useState(profile?.profileImageUrl || "");
  const [uploadTab, setUploadTab] = useState<string>("upload");
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await handleFileUpload(files[0]);
    }
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await handleFileUpload(files[0]);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 5MB",
        variant: "destructive"
      });
      return;
    }

    const validTypes = ['image/png', 'image/jpeg', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload PNG, JPG, or GIF images only",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile?.id}-${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('profile-images')
        .upload(fileName, file, { upsert: true });
      
      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('profile-images')
        .getPublicUrl(fileName);

      setImageUrl(publicUrl);
      toast({
        title: "Image uploaded",
        description: "Your profile picture has been uploaded successfully"
      });
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload image",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!profile?.id) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          full_name: fullName,
          email: email,
          profile_image_url: imageUrl
        })
        .eq('id', profile.id);
      
      if (error) throw error;
      
      if (refreshProfile) {
        await refreshProfile();
      }
      
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully"
      });
    } catch (error: any) {
      console.error("Update error:", error);
      toast({
        title: "Update failed",
        description: error.message || "Failed to update profile",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Layout>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground" data-testid="text-profile-title">
          {t('myProfile') || "My Profile"}
        </h1>
        <p className="text-muted-foreground text-sm">Update your personal information and profile picture</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 lg:col-span-1">
          <h3 className="text-lg font-bold text-foreground mb-4">Profile Picture</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Upload a profile picture or provide a URL to an image. Recommended size: 200x200 pixels. 
            Supported formats: PNG, JPG, GIF. Maximum file size: 5MB.
          </p>

          <Tabs value={uploadTab} onValueChange={setUploadTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="upload" className="gap-2">
                <Upload className="w-4 h-4" />
                Upload
              </TabsTrigger>
              <TabsTrigger value="url" className="gap-2">
                <LinkIcon className="w-4 h-4" />
                URL
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-4">
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                  isDragOver 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => document.getElementById('file-input')?.click()}
              >
                <input
                  id="file-input"
                  type="file"
                  accept="image/png,image/jpeg,image/gif"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <Camera className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm font-medium text-foreground">
                  {isDragOver ? 'Drop image here' : 'Click or drag to upload'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">PNG, JPG, GIF up to 5MB</p>
              </div>
              <Button 
                className="w-full" 
                disabled={isUploading}
                onClick={() => document.getElementById('file-input')?.click()}
              >
                {isUploading ? "Uploading..." : "Choose Image"}
              </Button>
            </TabsContent>

            <TabsContent value="url" className="space-y-4">
              <div>
                <Label htmlFor="image-url">Image URL</Label>
                <Input
                  id="image-url"
                  placeholder="https://example.com/image.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  data-testid="input-image-url"
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="mt-6 flex flex-col items-center">
            <Avatar className="w-24 h-24">
              <AvatarImage src={imageUrl || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                {fullName?.substring(0, 2).toUpperCase() || "US"}
              </AvatarFallback>
            </Avatar>
            <p className="text-xs text-muted-foreground mt-2">Preview</p>
          </div>
        </Card>

        <Card className="p-6 lg:col-span-2">
          <h3 className="text-lg font-bold text-foreground mb-4">Personal Information</h3>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="full-name">Full Name *</Label>
              <Input
                id="full-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                data-testid="input-full-name"
              />
            </div>

            <div>
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                data-testid="input-email"
              />
            </div>

            <div>
              <Label>Role</Label>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="capitalize">
                  {profile?.role || "Member"}
                </Badge>
              </div>
            </div>

            <div>
              <Label>Church</Label>
              <p className="text-sm text-foreground mt-1">{church?.name || "Not assigned"}</p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> Changes to your profile will be reflected throughout the system. 
              Your role can only be changed by the Pastor. Profile pictures are stored securely and 
              can be uploaded directly or linked from external sources.
            </p>
          </div>

          <Button 
            className="mt-6 w-full sm:w-auto"
            onClick={handleUpdateProfile}
            disabled={isSaving}
            data-testid="button-update-profile"
          >
            {isSaving ? "Updating..." : "Update Profile"}
          </Button>
        </Card>
      </div>
    </Layout>
  );
}
