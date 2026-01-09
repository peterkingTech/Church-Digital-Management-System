-- Community & Meeting System Schema
-- Run this SQL in your Supabase SQL Editor to create the required tables

-- Communities table
CREATE TABLE IF NOT EXISTS communities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  church_id UUID REFERENCES churches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'open' CHECK (type IN ('announcement', 'open', 'department')),
  department_id TEXT,
  cover_image_url TEXT,
  allow_worker_posts BOOLEAN DEFAULT true,
  allow_worker_comments BOOLEAN DEFAULT true,
  require_post_approval BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Community Posts table
CREATE TABLE IF NOT EXISTS community_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
  author_id UUID REFERENCES users(id),
  content TEXT,
  media_urls TEXT[],
  media_types TEXT[],
  is_pinned BOOLEAN DEFAULT false,
  is_approved BOOLEAN DEFAULT true,
  approved_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Community Comments table
CREATE TABLE IF NOT EXISTS community_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
  author_id UUID REFERENCES users(id),
  parent_comment_id UUID,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Community Reactions table
CREATE TABLE IF NOT EXISTS community_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES community_comments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id, emoji),
  UNIQUE(comment_id, user_id, emoji)
);

-- Community Polls table
CREATE TABLE IF NOT EXISTS community_polls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options TEXT[] NOT NULL,
  allow_multiple BOOLEAN DEFAULT false,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Community Poll Votes table
CREATE TABLE IF NOT EXISTS community_poll_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID REFERENCES community_polls(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  option_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(poll_id, user_id, option_index)
);

-- Community Members table (for department/restricted communities)
CREATE TABLE IF NOT EXISTS community_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  role TEXT DEFAULT 'member' CHECK (role IN ('member', 'moderator', 'admin')),
  is_muted BOOLEAN DEFAULT false,
  is_banned BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(community_id, user_id)
);

-- Zoom Links table (reusable links)
CREATE TABLE IF NOT EXISTS zoom_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  church_id UUID REFERENCES churches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  meeting_type TEXT DEFAULT 'custom' CHECK (meeting_type IN ('main_church', 'prayer', 'counseling', 'custom')),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Meetings table
CREATE TABLE IF NOT EXISTS meetings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  church_id UUID REFERENCES churches(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  meeting_type TEXT NOT NULL DEFAULT 'custom' CHECK (meeting_type IN ('prayer', 'church_service', 'special_event', 'counseling', 'custom')),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  zoom_link_id UUID REFERENCES zoom_links(id),
  custom_zoom_url TEXT,
  visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'members_only', 'staff_only', 'private')),
  is_recurring BOOLEAN DEFAULT false,
  recurrence_rule TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE zoom_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;

-- Communities RLS Policies
CREATE POLICY "Communities viewable by church members" ON communities
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.church_id = communities.church_id)
  );

CREATE POLICY "Communities creatable by admins and pastors" ON communities
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.church_id = communities.church_id AND users.role IN ('pastor', 'admin'))
  );

CREATE POLICY "Communities updatable by admins and pastors" ON communities
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.church_id = communities.church_id AND users.role IN ('pastor', 'admin'))
  );

CREATE POLICY "Communities deletable by admins and pastors" ON communities
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.church_id = communities.church_id AND users.role IN ('pastor', 'admin'))
  );

-- Community Posts RLS Policies
CREATE POLICY "Posts viewable by church members" ON community_posts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM communities c
      JOIN users u ON u.church_id = c.church_id
      WHERE c.id = community_posts.community_id AND u.id = auth.uid()
    )
  );

CREATE POLICY "Posts creatable by authorized users" ON community_posts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM communities c
      JOIN users u ON u.church_id = c.church_id
      WHERE c.id = community_posts.community_id 
      AND u.id = auth.uid()
      AND (
        u.role IN ('pastor', 'admin')
        OR (c.type = 'open' AND u.role = 'worker' AND c.allow_worker_posts = true)
        OR (c.type = 'open' AND u.role = 'member')
        OR (c.type = 'department' AND EXISTS (
          SELECT 1 FROM community_members cm
          WHERE cm.community_id = c.id
          AND cm.user_id = auth.uid()
          AND cm.is_banned = false
          AND cm.is_muted = false
        ))
      )
    )
  );

CREATE POLICY "Posts updatable by author or admin" ON community_posts
  FOR UPDATE USING (
    author_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM communities c
      JOIN users u ON u.church_id = c.church_id
      WHERE c.id = community_posts.community_id AND u.id = auth.uid() AND u.role IN ('pastor', 'admin')
    )
  );

CREATE POLICY "Posts deletable by author or admin" ON community_posts
  FOR DELETE USING (
    author_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM communities c
      JOIN users u ON u.church_id = c.church_id
      WHERE c.id = community_posts.community_id AND u.id = auth.uid() AND u.role IN ('pastor', 'admin')
    )
  );

-- Community Comments RLS Policies
CREATE POLICY "Comments viewable by church members" ON community_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM community_posts p
      JOIN communities c ON c.id = p.community_id
      JOIN users u ON u.church_id = c.church_id
      WHERE p.id = community_comments.post_id AND u.id = auth.uid()
    )
  );

CREATE POLICY "Comments creatable by non-guests" ON community_comments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM community_posts p
      JOIN communities c ON c.id = p.community_id
      JOIN users u ON u.church_id = c.church_id
      WHERE p.id = community_comments.post_id 
      AND u.id = auth.uid()
      AND u.role != 'guest'
    )
  );

CREATE POLICY "Comments deletable by author or admin" ON community_comments
  FOR DELETE USING (
    author_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM community_posts p
      JOIN communities c ON c.id = p.community_id
      JOIN users u ON u.church_id = c.church_id
      WHERE p.id = community_comments.post_id AND u.id = auth.uid() AND u.role IN ('pastor', 'admin')
    )
  );

-- Community Reactions RLS Policies
CREATE POLICY "Reactions viewable by church members" ON community_reactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM community_posts p
      JOIN communities c ON c.id = p.community_id
      JOIN users u ON u.church_id = c.church_id
      WHERE p.id = community_reactions.post_id AND u.id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM community_comments cm
      JOIN community_posts p ON p.id = cm.post_id
      JOIN communities c ON c.id = p.community_id
      JOIN users u ON u.church_id = c.church_id
      WHERE cm.id = community_reactions.comment_id AND u.id = auth.uid()
    )
  );

CREATE POLICY "Reactions creatable by non-guests" ON community_reactions
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role != 'guest'
    )
  );

CREATE POLICY "Reactions deletable by owner" ON community_reactions
  FOR DELETE USING (user_id = auth.uid());

-- Community Polls RLS Policies
CREATE POLICY "Polls viewable by church members" ON community_polls
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM community_posts p
      JOIN communities c ON c.id = p.community_id
      JOIN users u ON u.church_id = c.church_id
      WHERE p.id = community_polls.post_id AND u.id = auth.uid()
    )
  );

CREATE POLICY "Polls creatable by admins" ON community_polls
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM community_posts p
      JOIN communities c ON c.id = p.community_id
      JOIN users u ON u.church_id = c.church_id
      WHERE p.id = community_polls.post_id AND u.id = auth.uid() AND u.role IN ('pastor', 'admin')
    )
  );

-- Poll Votes RLS Policies
CREATE POLICY "Votes viewable by church members" ON community_poll_votes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM community_polls pl
      JOIN community_posts p ON p.id = pl.post_id
      JOIN communities c ON c.id = p.community_id
      JOIN users u ON u.church_id = c.church_id
      WHERE pl.id = community_poll_votes.poll_id AND u.id = auth.uid()
    )
  );

CREATE POLICY "Votes creatable by non-guests" ON community_poll_votes
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role != 'guest'
    )
  );

-- Community Members RLS Policies
CREATE POLICY "Members viewable by church members" ON community_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM communities c
      JOIN users u ON u.church_id = c.church_id
      WHERE c.id = community_members.community_id AND u.id = auth.uid()
    )
  );

CREATE POLICY "Members manageable by admins" ON community_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM communities c
      JOIN users u ON u.church_id = c.church_id
      WHERE c.id = community_members.community_id AND u.id = auth.uid() AND u.role IN ('pastor', 'admin')
    )
  );

-- Zoom Links RLS Policies
CREATE POLICY "Zoom links viewable by church members" ON zoom_links
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.church_id = zoom_links.church_id)
  );

CREATE POLICY "Zoom links manageable by admins" ON zoom_links
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.church_id = zoom_links.church_id AND users.role IN ('pastor', 'admin'))
  );

-- Meetings RLS Policies
CREATE POLICY "Public meetings viewable by all church members" ON meetings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.church_id = meetings.church_id
      AND (
        meetings.visibility = 'public'
        OR meetings.visibility = 'members_only'
        OR (meetings.visibility = 'staff_only' AND users.role IN ('pastor', 'admin', 'worker'))
        OR (meetings.visibility = 'private' AND (meetings.created_by = auth.uid() OR users.role IN ('pastor', 'admin')))
      )
    )
    AND (
      meetings.meeting_type != 'counseling' 
      OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('pastor', 'admin', 'worker', 'member'))
    )
  );

CREATE POLICY "Meetings creatable by admins" ON meetings
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.church_id = meetings.church_id AND users.role IN ('pastor', 'admin'))
  );

CREATE POLICY "Meetings updatable by admins" ON meetings
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.church_id = meetings.church_id AND users.role IN ('pastor', 'admin'))
  );

CREATE POLICY "Meetings deletable by admins" ON meetings
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.church_id = meetings.church_id AND users.role IN ('pastor', 'admin'))
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_community_posts_community ON community_posts(community_id);
CREATE INDEX IF NOT EXISTS idx_community_comments_post ON community_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_community_reactions_post ON community_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_community_poll_votes_poll ON community_poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_meetings_church ON meetings(church_id);
CREATE INDEX IF NOT EXISTS idx_meetings_start_time ON meetings(start_time);
