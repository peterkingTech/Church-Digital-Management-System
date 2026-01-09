
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { createClient } from "@supabase/supabase-js";

// Create Supabase admin client with service role key
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // The Church Digital Management System uses Supabase Client on the frontend.
  // Backend routes are minimal as data logic is handled via Supabase RLS and Client.

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'CDMS' });
  });

  // Admin endpoint to create users with specific roles
  // This endpoint requires authentication via Bearer token
  app.post('/api/admin/create-user', async (req, res) => {
    try {
      if (!supabaseAdmin) {
        return res.status(500).json({ error: 'Supabase admin client not configured' });
      }

      // Verify the requesting user is authenticated and authorized
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: Missing or invalid authorization header' });
      }

      const token = authHeader.substring(7);
      
      // Verify the JWT token and get the user
      const { data: { user: authUser }, error: tokenError } = await supabaseAdmin.auth.getUser(token);
      
      if (tokenError || !authUser) {
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
      }

      // Get the requesting user's profile to check their role
      const { data: requestingUser, error: reqProfileError } = await supabaseAdmin
        .from('users')
        .select('id, role, church_id')
        .eq('id', authUser.id)
        .single();

      if (reqProfileError || !requestingUser) {
        return res.status(401).json({ error: 'Unauthorized: User profile not found' });
      }

      // Only pastor or admin can create users
      if (requestingUser.role !== 'pastor' && requestingUser.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden: Only pastors and admins can create users' });
      }

      const { email, password, fullName, role, churchId, department } = req.body;

      // Validate required fields
      if (!email || !password || !fullName || !role || !churchId) {
        return res.status(400).json({ error: 'Missing required fields: email, password, fullName, role, churchId' });
      }

      // Ensure the user can only create users for their own church
      if (churchId !== requestingUser.church_id) {
        return res.status(403).json({ error: 'Forbidden: Cannot create users for other churches' });
      }

      // Validate role - admins cannot create pastors, only pastors can
      const validRoles = ['pastor', 'admin', 'worker', 'member', 'guest'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
      }

      // Admins cannot create pastor users
      if (requestingUser.role === 'admin' && role === 'pastor') {
        return res.status(403).json({ error: 'Forbidden: Only pastors can create other pastors' });
      }

      // Create auth user with Supabase Admin API
      const { data: newAuthData, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          full_name: fullName,
          church_id: churchId,
          invite_role: role,
          invite_department: department || null
        }
      });

      if (createAuthError) {
        console.error('Auth creation error:', createAuthError);
        return res.status(400).json({ error: createAuthError.message });
      }

      if (!newAuthData.user) {
        return res.status(500).json({ error: 'Failed to create user' });
      }

      // Create user profile in users table
      const { data: profileData, error: createProfileError } = await supabaseAdmin
        .from('users')
        .insert({
          id: newAuthData.user.id,
          church_id: churchId,
          full_name: fullName,
          email: email,
          role: role,
          department: department || null,
          language: 'en'
        })
        .select('*')
        .single();

      if (createProfileError) {
        console.error('Profile creation error:', createProfileError);
        // Try to delete the auth user if profile creation fails
        await supabaseAdmin.auth.admin.deleteUser(newAuthData.user.id);
        return res.status(400).json({ error: createProfileError.message });
      }

      res.json({ 
        success: true, 
        user: {
          id: profileData.id,
          email: profileData.email,
          fullName: profileData.full_name,
          role: profileData.role,
          churchId: profileData.church_id
        }
      });
    } catch (error: any) {
      console.error('Create user error:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  });

  return httpServer;
}
