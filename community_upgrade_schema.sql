-- Community Upgrade Schema
-- Run this SQL in your Supabase SQL Editor to add new community features

-- Add new columns to community_posts table
ALTER TABLE community_posts 
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS comments_locked BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS author_name_cached TEXT,
ADD COLUMN IF NOT EXISTS author_role_cached TEXT;

-- Create post views tracking table
CREATE TABLE IF NOT EXISTS community_post_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- Create post reports table for moderation
CREATE TABLE IF NOT EXISTS community_post_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
  reporter_id UUID REFERENCES users(id),
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed', 'actioned')),
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on new tables
ALTER TABLE community_post_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_post_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for post views
CREATE POLICY "Post views viewable by post author and admins" ON community_post_views
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM community_posts cp
      JOIN communities c ON c.id = cp.community_id
      JOIN users u ON u.church_id = c.church_id
      WHERE cp.id = community_post_views.post_id
      AND u.id = auth.uid()
      AND (u.role IN ('pastor', 'admin') OR cp.author_id = auth.uid())
    )
  );

CREATE POLICY "Post views insertable by authenticated" ON community_post_views
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- RLS Policies for post reports
CREATE POLICY "Post reports viewable by admins" ON community_post_reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM community_posts cp
      JOIN communities c ON c.id = cp.community_id
      JOIN users u ON u.church_id = c.church_id
      WHERE cp.id = community_post_reports.post_id
      AND u.id = auth.uid()
      AND u.role IN ('pastor', 'admin')
    )
  );

CREATE POLICY "Post reports insertable by authenticated" ON community_post_reports
  FOR INSERT WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Post reports updatable by admins" ON community_post_reports
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM community_posts cp
      JOIN communities c ON c.id = cp.community_id
      JOIN users u ON u.church_id = c.church_id
      WHERE cp.id = community_post_reports.post_id
      AND u.id = auth.uid()
      AND u.role IN ('pastor', 'admin')
    )
  );

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_post_view_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE community_posts
  SET view_count = view_count + 1
  WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-increment view count on new view
DROP TRIGGER IF EXISTS on_post_view ON community_post_views;
CREATE TRIGGER on_post_view
  AFTER INSERT ON community_post_views
  FOR EACH ROW
  EXECUTE FUNCTION increment_post_view_count();
