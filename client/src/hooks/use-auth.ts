import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { User as DbUser, Church } from "@shared/schema";

// Transform snake_case Supabase response to camelCase
function transformUser(data: any): DbUser | null {
  if (!data) return null;
  return {
    id: data.id,
    churchId: data.church_id,
    fullName: data.full_name,
    email: data.email,
    role: data.role,
    language: data.language,
    birthdayDay: data.birthday_day,
    birthdayMonth: data.birthday_month,
    profileImageUrl: data.profile_image_url,
    department: data.department,
    createdAt: data.created_at,
  };
}

function transformChurch(data: any): Church | null {
  if (!data) return null;
  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    address: data.address,
    email: data.email,
    phone: data.phone,
    logoUrl: data.logo_url,
    themeColor: data.theme_color,
    fontFamily: data.font_family,
    inviteEnabled: data.invite_enabled,
    createdAt: data.created_at,
  };
}

export function useAuth() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    });

    return () => subscription.unsubscribe();
  }, [queryClient]);

  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['profile', session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', session!.user.id)
        .maybeSingle();
      
      if (error) {
        console.error("Error fetching profile:", error);
        return null;
      }
      
      // If no profile exists, create one automatically
      if (!data && session?.user) {
        const metadata = session.user.user_metadata || {};
        const fullName = metadata.full_name || 'User';
        const language = metadata.language || 'en';
        const inviteChurchId = metadata.church_id;
        const inviteRole = metadata.invite_role;
        
        let churchId = inviteChurchId;
        // Use invite role if provided, otherwise default to guest
        // Only allow valid roles from invite
        const validRoles = ['guest', 'member', 'worker', 'admin'];
        let userRole = inviteRole && validRoles.includes(inviteRole) ? inviteRole : 'guest';
        
        // If not joining via invite, get or create a church
        if (!churchId) {
          const { data: churches } = await supabase
            .from('churches')
            .select('id')
            .limit(1);
          
          churchId = churches?.[0]?.id;
          
          // Create default church if none exists - user becomes pastor
          if (!churchId) {
            const churchNameFromMeta = metadata.church_name || `${fullName}'s Church`;
            const churchAddressFromMeta = metadata.church_address || null;
            const churchPhoneFromMeta = metadata.church_phone || null;
            const churchEmailFromMeta = metadata.church_email || null;
            const slug = 'my-church-' + Date.now();
            const { data: newChurch } = await supabase
              .from('churches')
              .insert({
                name: churchNameFromMeta,
                slug: slug,
                address: churchAddressFromMeta,
                phone: churchPhoneFromMeta,
                email: churchEmailFromMeta,
                invite_enabled: true
              })
              .select('id')
              .single();
            churchId = newChurch?.id;
            userRole = 'pastor'; // Only becomes pastor when creating their own church
          }
          // If joining an existing church without invite, still guest
        }
        
        // Create user profile
        const { data: newProfile, error: createError } = await supabase
          .from('users')
          .insert({
            id: session.user.id,
            church_id: churchId,
            full_name: fullName,
            role: userRole,
            language: language
          })
          .select('*')
          .single();
        
        if (createError) {
          console.error("Error creating profile:", createError);
          return null;
        }
        return transformUser(newProfile);
      }
      
      return transformUser(data);
    },
  });

  const { data: church } = useQuery({
    queryKey: ['church', profile?.churchId],
    enabled: !!profile?.churchId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('churches')
        .select('*')
        .eq('id', profile!.churchId!)
        .maybeSingle();
      
      if (error) {
        console.error("Error fetching church:", error);
        return null;
      }
      return transformChurch(data);
    },
  });

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    setLocation("/");
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setLocation("/login");
  };

  const refreshProfile = () => {
    queryClient.invalidateQueries({ queryKey: ['profile', session?.user?.id] });
  };

  const refreshChurch = async () => {
    await queryClient.invalidateQueries({ queryKey: ['church', profile?.churchId] });
    await queryClient.refetchQueries({ queryKey: ['church', profile?.churchId] });
  };

  return {
    session,
    user: session?.user,
    profile,
    church,
    isLoading: loading || isLoadingProfile,
    signIn,
    signOut,
    refreshProfile,
    refreshChurch,
    isAuthenticated: !!session,
  };
}
