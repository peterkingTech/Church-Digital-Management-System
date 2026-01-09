import { useState, useMemo, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { 
  Plus, MessageCircle, Heart, ThumbsUp, Pin, MoreVertical, Send, Users, 
  Megaphone, Building2, Trash2, ChevronDown, ChevronUp, BarChart3, Eye,
  Lock, Unlock, Flag, Share2, X, Crown, Shield, Briefcase, AlertTriangle
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import type { Community, CommunityPost, CommunityComment, CommunityReaction, CommunityPoll, CommunityPollVote, User } from "@shared/schema";

type PostWithDetails = CommunityPost & {
  author?: User;
  comments?: CommentWithAuthor[];
  reactions?: CommunityReaction[];
  poll?: CommunityPoll & { votes?: CommunityPollVote[] };
  viewCount?: number;
  commentsLocked?: boolean;
};

type CommentWithAuthor = CommunityComment & {
  author?: User;
  replies?: CommentWithAuthor[];
};

const REACTION_EMOJIS = ['like', 'love'];

const getReactionIcon = (emoji: string) => {
  switch (emoji) {
    case 'like': return <ThumbsUp className="w-4 h-4" />;
    case 'love': return <Heart className="w-4 h-4" />;
    default: return <ThumbsUp className="w-4 h-4" />;
  }
};

const safeFormatDate = (dateValue: string | Date | null | undefined): string => {
  if (!dateValue) return 'Unknown';
  try {
    const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
    if (isNaN(date.getTime())) return 'Unknown';
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return 'Unknown';
  }
};

const getRoleBadge = (role: string | null | undefined) => {
  if (!role) return null;
  switch (role) {
    case 'pastor':
      return (
        <Badge variant="default" className="bg-amber-600 text-white gap-1">
          <Crown className="w-3 h-3" />
          Pastor
        </Badge>
      );
    case 'admin':
      return (
        <Badge variant="default" className="bg-blue-600 text-white gap-1">
          <Shield className="w-3 h-3" />
          Admin
        </Badge>
      );
    case 'worker':
      return (
        <Badge variant="secondary" className="gap-1">
          <Briefcase className="w-3 h-3" />
          Worker
        </Badge>
      );
    default:
      return null;
  }
};

const truncateText = (text: string | null | undefined, maxLength: number = 200): string => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

export default function CommunityPage() {
  const { profile, church } = useAuth();
  const { toast } = useToast();
  const userRole = profile?.role || 'guest';
  const isAdminOrPastor = userRole === 'pastor' || userRole === 'admin';
  const isGuest = userRole === 'guest';

  const [selectedCommunity, setSelectedCommunity] = useState<string | null>(null);
  const [isCreateCommunityOpen, setIsCreateCommunityOpen] = useState(false);
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<PostWithDetails | null>(null);
  const [newCommunityName, setNewCommunityName] = useState("");
  const [newCommunityDescription, setNewCommunityDescription] = useState("");
  const [newCommunityType, setNewCommunityType] = useState<"announcement" | "open" | "department">("open");
  const [newPostContent, setNewPostContent] = useState("");
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [isPollPost, setIsPollPost] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [allowMultipleVotes, setAllowMultipleVotes] = useState(false);
  const [viewedPosts, setViewedPosts] = useState<Set<string>>(new Set());

  // Load viewed posts from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(`community-viewed-${church?.id}`);
    if (stored) {
      setViewedPosts(new Set(JSON.parse(stored)));
    }
  }, [church?.id]);

  const markPostAsViewed = (postId: string) => {
    setViewedPosts(prev => {
      const newSet = new Set(prev);
      newSet.add(postId);
      localStorage.setItem(`community-viewed-${church?.id}`, JSON.stringify(Array.from(newSet)));
      return newSet;
    });
  };

  const { data: communities = [], isLoading: isLoadingCommunities } = useQuery({
    queryKey: ['communities', church?.id],
    queryFn: async () => {
      if (!church?.id) return [];
      const { data, error } = await supabase
        .from('communities')
        .select('*')
        .eq('church_id', church.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Community[];
    },
    enabled: !!church?.id
  });

  const { data: posts = [], isLoading: isLoadingPosts } = useQuery({
    queryKey: ['community-posts', selectedCommunity],
    queryFn: async () => {
      if (!selectedCommunity) return [];
      const { data, error } = await supabase
        .from('community_posts')
        .select(`
          *,
          author:users!author_id(id, full_name, profile_image_url, role)
        `)
        .eq('community_id', selectedCommunity)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as PostWithDetails[];
    },
    enabled: !!selectedCommunity
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['community-comments', selectedCommunity],
    queryFn: async () => {
      if (!selectedCommunity) return [];
      const postIds = posts.map(p => p.id);
      if (postIds.length === 0) return [];
      const { data, error } = await supabase
        .from('community_comments')
        .select(`
          *,
          author:users!author_id(id, full_name, profile_image_url, role)
        `)
        .in('post_id', postIds)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as CommentWithAuthor[];
    },
    enabled: posts.length > 0
  });

  const { data: reactions = [] } = useQuery({
    queryKey: ['community-reactions', selectedCommunity],
    queryFn: async () => {
      if (!selectedCommunity) return [];
      const postIds = posts.map(p => p.id);
      if (postIds.length === 0) return [];
      const { data, error } = await supabase
        .from('community_reactions')
        .select('*')
        .in('post_id', postIds);
      if (error) throw error;
      return data as CommunityReaction[];
    },
    enabled: posts.length > 0
  });

  const { data: polls = [] } = useQuery({
    queryKey: ['community-polls', selectedCommunity],
    queryFn: async () => {
      if (!selectedCommunity) return [];
      const postIds = posts.map(p => p.id);
      if (postIds.length === 0) return [];
      const { data, error } = await supabase
        .from('community_polls')
        .select(`
          *,
          votes:community_poll_votes(*)
        `)
        .in('post_id', postIds);
      if (error) throw error;
      return data as (CommunityPoll & { votes: CommunityPollVote[] })[];
    },
    enabled: posts.length > 0
  });

  const postsWithDetails = useMemo(() => {
    return posts.map(post => ({
      ...post,
      comments: comments.filter(c => c.postId === post.id),
      reactions: reactions.filter(r => r.postId === post.id),
      poll: polls.find(p => p.postId === post.id)
    }));
  }, [posts, comments, reactions, polls]);

  const selectedCommunityData = communities.find(c => c.id === selectedCommunity);

  const { data: communityMembership } = useQuery({
    queryKey: ['community-membership', selectedCommunity, profile?.id],
    queryFn: async () => {
      if (!selectedCommunity || !profile?.id) return null;
      const { data, error } = await supabase
        .from('community_members')
        .select('*')
        .eq('community_id', selectedCommunity)
        .eq('user_id', profile.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCommunity && !!profile?.id
  });

  const canPost = useMemo(() => {
    if (isGuest) return false;
    if (isAdminOrPastor) return true;
    if (!selectedCommunityData) return false;
    if (selectedCommunityData.type === 'announcement') return false;
    if (selectedCommunityData.type === 'department') {
      return communityMembership !== null && !communityMembership?.isMuted && !communityMembership?.isBanned;
    }
    if (selectedCommunityData.type === 'open') {
      if (userRole === 'worker' && selectedCommunityData.allowWorkerPosts) return true;
      if (userRole === 'member') return true;
    }
    return false;
  }, [isGuest, isAdminOrPastor, selectedCommunityData, userRole, communityMembership]);

  const canComment = !isGuest;
  const canReact = !isGuest;

  // Engagement stats for admins
  const engagementStats = useMemo(() => {
    if (!isAdminOrPastor) return null;
    const totalPosts = posts.length;
    const totalComments = comments.length;
    const totalReactions = reactions.length;
    const totalPollVotes = polls.reduce((acc, p) => acc + (p.votes?.length || 0), 0);
    
    // Most active members
    const authorCounts: Record<string, { name: string; count: number }> = {};
    [...posts, ...comments].forEach(item => {
      const authorId = item.authorId;
      const authorName = item.author?.fullName || 'Unknown';
      if (authorId) {
        if (!authorCounts[authorId]) {
          authorCounts[authorId] = { name: authorName, count: 0 };
        }
        authorCounts[authorId].count++;
      }
    });
    
    const topContributors = Object.entries(authorCounts)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([id, data]) => ({ id, ...data }));

    return { totalPosts, totalComments, totalReactions, totalPollVotes, topContributors };
  }, [isAdminOrPastor, posts, comments, reactions, polls]);

  // Count unread posts
  const unreadCount = useMemo(() => {
    return posts.filter(p => !viewedPosts.has(p.id)).length;
  }, [posts, viewedPosts]);

  const createCommunityMutation = useMutation({
    mutationFn: async () => {
      if (!church?.id || !profile?.id) throw new Error("Not authenticated");
      const { error } = await supabase
        .from('communities')
        .insert({
          church_id: church.id,
          name: newCommunityName,
          description: newCommunityDescription || null,
          type: newCommunityType,
          created_by: profile.id
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communities'] });
      toast({ title: "Community created" });
      setIsCreateCommunityOpen(false);
      setNewCommunityName("");
      setNewCommunityDescription("");
      setNewCommunityType("open");
    },
    onError: (error: any) => {
      toast({ title: "Failed to create community", description: error.message, variant: "destructive" });
    }
  });

  const createPostMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCommunity || !profile?.id) throw new Error("Not authenticated");
      
      const { data: postData, error: postError } = await supabase
        .from('community_posts')
        .insert({
          community_id: selectedCommunity,
          author_id: profile.id,
          content: newPostContent
        })
        .select()
        .single();
      if (postError) throw postError;

      if (isPollPost && pollQuestion && pollOptions.filter(o => o.trim()).length >= 2) {
        const { error: pollError } = await supabase
          .from('community_polls')
          .insert({
            post_id: postData.id,
            question: pollQuestion,
            options: pollOptions.filter(o => o.trim()),
            allow_multiple: allowMultipleVotes
          });
        if (pollError) throw pollError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-posts'] });
      queryClient.invalidateQueries({ queryKey: ['community-polls'] });
      toast({ title: "Post created" });
      setIsCreatePostOpen(false);
      setNewPostContent("");
      setIsPollPost(false);
      setPollQuestion("");
      setPollOptions(["", ""]);
      setAllowMultipleVotes(false);
    },
    onError: (error: any) => {
      toast({ title: "Failed to create post", description: error.message, variant: "destructive" });
    }
  });

  const addCommentMutation = useMutation({
    mutationFn: async ({ postId, content }: { postId: string; content: string }) => {
      if (!profile?.id) throw new Error("Not authenticated");
      const { error } = await supabase
        .from('community_comments')
        .insert({
          post_id: postId,
          author_id: profile.id,
          content
        });
      if (error) throw error;
    },
    onSuccess: (_, { postId }) => {
      queryClient.invalidateQueries({ queryKey: ['community-comments'] });
      setCommentInputs(prev => ({ ...prev, [postId]: "" }));
    },
    onError: (error: any) => {
      toast({ title: "Failed to add comment", description: error.message, variant: "destructive" });
    }
  });

  const toggleReactionMutation = useMutation({
    mutationFn: async ({ postId, emoji }: { postId: string; emoji: string }) => {
      if (!profile?.id) throw new Error("Not authenticated");
      
      const existing = reactions.find(r => r.postId === postId && r.userId === profile.id && r.emoji === emoji);
      if (existing) {
        const { error } = await supabase
          .from('community_reactions')
          .delete()
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('community_reactions')
          .insert({
            post_id: postId,
            user_id: profile.id,
            emoji
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-reactions'] });
    }
  });

  const votePollMutation = useMutation({
    mutationFn: async ({ pollId, optionIndex }: { pollId: string; optionIndex: number }) => {
      if (!profile?.id) throw new Error("Not authenticated");
      const { error } = await supabase
        .from('community_poll_votes')
        .insert({
          poll_id: pollId,
          user_id: profile.id,
          option_index: optionIndex
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-polls'] });
    }
  });

  const pinPostMutation = useMutation({
    mutationFn: async ({ postId, isPinned }: { postId: string; isPinned: boolean }) => {
      const { error } = await supabase
        .from('community_posts')
        .update({ is_pinned: isPinned })
        .eq('id', postId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-posts'] });
      toast({ title: "Post updated" });
    }
  });

  const deletePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase
        .from('community_posts')
        .delete()
        .eq('id', postId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-posts'] });
      toast({ title: "Post deleted" });
      setSelectedPost(null);
    }
  });

  const deleteCommunityMutation = useMutation({
    mutationFn: async (communityId: string) => {
      const { error } = await supabase
        .from('communities')
        .delete()
        .eq('id', communityId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communities'] });
      toast({ title: "Community deleted" });
      setSelectedCommunity(null);
    }
  });

  const lockCommentsMutation = useMutation({
    mutationFn: async ({ postId, locked }: { postId: string; locked: boolean }) => {
      const { error } = await supabase
        .from('community_posts')
        .update({ comments_locked: locked })
        .eq('id', postId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-posts'] });
      toast({ title: "Comments updated" });
    }
  });

  const reportPostMutation = useMutation({
    mutationFn: async ({ postId, reason }: { postId: string; reason: string }) => {
      if (!profile?.id) throw new Error("Not authenticated");
      const { error } = await supabase
        .from('community_post_reports')
        .insert({
          post_id: postId,
          reporter_id: profile.id,
          reason
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Post reported", description: "An admin will review this post" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to report", description: error.message, variant: "destructive" });
    }
  });

  const getCommunityIcon = (type: string) => {
    switch (type) {
      case 'announcement': return <Megaphone className="w-4 h-4" />;
      case 'department': return <Building2 className="w-4 h-4" />;
      default: return <Users className="w-4 h-4" />;
    }
  };

  // Full-screen post view component
  const FullScreenPostView = ({ post }: { post: PostWithDetails }) => {
    const postComments = comments.filter(c => c.postId === post.id);
    const postReactions = reactions.filter(r => r.postId === post.id);
    const postPoll = polls.find(p => p.postId === post.id);

    return (
      <Dialog open={!!selectedPost} onOpenChange={() => setSelectedPost(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] p-0 overflow-hidden">
          <div className="flex flex-col h-full max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 p-4 border-b">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={post.author?.profileImageUrl || undefined} />
                  <AvatarFallback>{post.author?.fullName?.charAt(0) || '?'}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">
                      {post.author?.fullName || 'Former Member'}
                    </span>
                    {getRoleBadge(post.author?.role)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {safeFormatDate(post.createdAt)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {post.isPinned && (
                  <Badge variant="secondary">
                    <Pin className="w-3 h-3 mr-1" />
                    Pinned
                  </Badge>
                )}
                <Button size="icon" variant="ghost" onClick={() => setSelectedPost(null)} data-testid="button-close-fullscreen">
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <ScrollArea className="flex-1">
              <div className="p-4">
                <p className="whitespace-pre-wrap text-base leading-relaxed">{post.content}</p>
                
                {/* Poll */}
                {postPoll && (
                  <div className="mt-4 p-4 border rounded-md bg-muted/30">
                    <div className="flex items-center gap-2 mb-3">
                      <BarChart3 className="w-4 h-4" />
                      <p className="font-medium">{postPoll.question}</p>
                    </div>
                    <div className="space-y-2">
                      {postPoll.options?.map((option, idx) => {
                        const voteCount = postPoll.votes?.filter(v => v.optionIndex === idx).length || 0;
                        const totalVotes = postPoll.votes?.length || 0;
                        const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
                        const hasVoted = postPoll.votes?.some(v => v.userId === profile?.id && v.optionIndex === idx);
                        
                        return (
                          <button
                            key={idx}
                            onClick={() => !isGuest && votePollMutation.mutate({ pollId: postPoll.id, optionIndex: idx })}
                            disabled={isGuest || hasVoted}
                            className={`w-full p-3 text-left rounded-md border relative overflow-hidden transition-colors ${hasVoted ? 'border-primary bg-primary/5' : 'hover-elevate'}`}
                            data-testid={`button-vote-fullscreen-${postPoll.id}-${idx}`}
                          >
                            <div 
                              className="absolute inset-0 bg-primary/10"
                              style={{ width: `${percentage}%` }}
                            />
                            <div className="relative flex justify-between items-center">
                              <span>{option}</span>
                              <span className="text-sm text-muted-foreground font-medium">{voteCount} ({percentage}%)</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">
                      {postPoll.votes?.length || 0} total votes
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-3 mt-4 pt-4 border-t">
                  {REACTION_EMOJIS.map(emoji => {
                    const count = postReactions.filter(r => r.emoji === emoji).length;
                    const hasReacted = postReactions.some(r => r.emoji === emoji && r.userId === profile?.id);
                    return (
                      <Button
                        key={emoji}
                        variant={hasReacted ? "default" : "outline"}
                        onClick={() => canReact && toggleReactionMutation.mutate({ postId: post.id, emoji })}
                        disabled={!canReact}
                        className="gap-2"
                        data-testid={`button-react-fullscreen-${post.id}-${emoji}`}
                      >
                        {getReactionIcon(emoji)}
                        <span>{count}</span>
                      </Button>
                    );
                  })}
                  <div className="flex items-center gap-1 text-muted-foreground ml-auto">
                    <MessageCircle className="w-4 h-4" />
                    <span>{postComments.length} comments</span>
                  </div>
                </div>

                <Separator className="my-4" />

                {/* Comments */}
                <div className="space-y-4">
                  <h4 className="font-semibold">Comments</h4>
                  {postComments.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No comments yet. Be the first to comment!</p>
                  ) : (
                    postComments.map(comment => (
                      <div key={comment.id} className="flex gap-3" data-testid={`comment-fullscreen-${comment.id}`}>
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={comment.author?.profileImageUrl || undefined} />
                          <AvatarFallback>{comment.author?.fullName?.charAt(0) || '?'}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="bg-muted rounded-md p-3">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="text-sm font-medium">{comment.author?.fullName || 'Former Member'}</span>
                              {getRoleBadge(comment.author?.role)}
                              <span className="text-xs text-muted-foreground">{safeFormatDate(comment.createdAt)}</span>
                            </div>
                            <p className="text-sm">{comment.content}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}

                  {/* Add comment */}
                  {post.commentsLocked ? (
                    <div className="flex items-center gap-2 text-muted-foreground text-sm pt-2">
                      <Lock className="w-4 h-4" />
                      <span>Comments are locked on this post</span>
                    </div>
                  ) : canComment ? (
                    <div className="flex gap-3 pt-2">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={profile?.profileImageUrl || undefined} />
                        <AvatarFallback>{profile?.fullName?.charAt(0) || '?'}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 flex gap-2">
                        <Input
                          value={commentInputs[post.id] || ""}
                          onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                          placeholder="Write a comment..."
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && commentInputs[post.id]?.trim()) {
                              addCommentMutation.mutate({ postId: post.id, content: commentInputs[post.id] });
                            }
                          }}
                          data-testid={`input-comment-fullscreen-${post.id}`}
                        />
                        <Button
                          size="icon"
                          onClick={() => commentInputs[post.id]?.trim() && addCommentMutation.mutate({ postId: post.id, content: commentInputs[post.id] })}
                          disabled={!commentInputs[post.id]?.trim()}
                          data-testid={`button-send-comment-fullscreen-${post.id}`}
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  // Post Card Component
  const PostCard = ({ post }: { post: PostWithDetails }) => {
    const isUnread = !viewedPosts.has(post.id);
    
    return (
      <Card 
        className={`cursor-pointer hover-elevate transition-all ${isUnread ? 'ring-2 ring-primary/30' : ''}`}
        onClick={() => {
          setSelectedPost(post);
          markPostAsViewed(post.id);
        }}
        data-testid={`card-post-${post.id}`}
      >
        <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={post.author?.profileImageUrl || undefined} />
              <AvatarFallback>{post.author?.fullName?.charAt(0) || '?'}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">{post.author?.fullName || 'Former Member'}</span>
                {getRoleBadge(post.author?.role)}
                {isUnread && (
                  <Badge variant="default" className="bg-primary text-xs">New</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {safeFormatDate(post.createdAt)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {post.isPinned && (
              <Badge variant="secondary">
                <Pin className="w-3 h-3" />
              </Badge>
            )}
            {(isAdminOrPastor || post.authorId === profile?.id) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button size="icon" variant="ghost" data-testid={`button-post-menu-${post.id}`}>
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                  {isAdminOrPastor && (
                    <>
                      <DropdownMenuItem onClick={() => pinPostMutation.mutate({ postId: post.id, isPinned: !post.isPinned })}>
                        <Pin className="w-4 h-4 mr-2" />
                        {post.isPinned ? 'Unpin' : 'Pin'}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => lockCommentsMutation.mutate({ postId: post.id, locked: !post.commentsLocked })}>
                        {post.commentsLocked ? <Unlock className="w-4 h-4 mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
                        {post.commentsLocked ? 'Unlock Comments' : 'Lock Comments'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  {!isAdminOrPastor && post.authorId !== profile?.id && (
                    <DropdownMenuItem onClick={() => reportPostMutation.mutate({ postId: post.id, reason: 'Inappropriate content' })}>
                      <Flag className="w-4 h-4 mr-2" />
                      Report Post
                    </DropdownMenuItem>
                  )}
                  {(isAdminOrPastor || post.authorId === profile?.id) && (
                    <DropdownMenuItem onClick={() => deletePostMutation.mutate(post.id)} className="text-destructive">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardHeader>
        <CardContent className="pb-2">
          <p className="text-muted-foreground line-clamp-3">{truncateText(post.content, 250)}</p>
          
          {post.poll && (
            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <BarChart3 className="w-4 h-4" />
              <span>Poll: {post.poll.question}</span>
            </div>
          )}
        </CardContent>
        <CardFooter className="pt-0 pb-3">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <ThumbsUp className="w-4 h-4" />
              <span>{post.reactions?.length || 0}</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageCircle className="w-4 h-4" />
              <span>{post.comments?.length || 0}</span>
            </div>
            {post.commentsLocked && (
              <div className="flex items-center gap-1 text-muted-foreground/70">
                <Lock className="w-3 h-3" />
                <span className="text-xs">Locked</span>
              </div>
            )}
          </div>
        </CardFooter>
      </Card>
    );
  };

  return (
    <Layout>
      <div className="flex h-full">
        {/* Sidebar - Communities List */}
        <div className="w-72 border-r bg-muted/30 p-4 flex flex-col">
          <div className="flex items-center justify-between gap-2 mb-4">
            <h2 className="font-semibold">Communities</h2>
            {isAdminOrPastor && (
              <Dialog open={isCreateCommunityOpen} onOpenChange={setIsCreateCommunityOpen}>
                <DialogTrigger asChild>
                  <Button size="icon" variant="ghost" data-testid="button-create-community">
                    <Plus className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Community</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Name</Label>
                      <Input
                        value={newCommunityName}
                        onChange={(e) => setNewCommunityName(e.target.value)}
                        placeholder="Community name"
                        data-testid="input-community-name"
                      />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea
                        value={newCommunityDescription}
                        onChange={(e) => setNewCommunityDescription(e.target.value)}
                        placeholder="Optional description"
                        data-testid="input-community-description"
                      />
                    </div>
                    <div>
                      <Label>Type</Label>
                      <Select value={newCommunityType} onValueChange={(v: any) => setNewCommunityType(v)}>
                        <SelectTrigger data-testid="select-community-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="announcement">Announcement (Admin/Pastor only)</SelectItem>
                          <SelectItem value="open">Open (All can post)</SelectItem>
                          <SelectItem value="department">Department (Members only)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button 
                      onClick={() => createCommunityMutation.mutate()} 
                      disabled={!newCommunityName.trim() || createCommunityMutation.isPending}
                      data-testid="button-submit-community"
                    >
                      Create
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>

          <ScrollArea className="flex-1">
            {isLoadingCommunities ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : communities.length === 0 ? (
              <p className="text-sm text-muted-foreground">No communities yet</p>
            ) : (
              <div className="space-y-1">
                {communities.map(community => (
                  <div
                    key={community.id}
                    onClick={() => setSelectedCommunity(community.id)}
                    className={`flex items-center gap-2 p-2 rounded-md cursor-pointer hover-elevate ${
                      selectedCommunity === community.id ? 'bg-primary/10' : ''
                    }`}
                    data-testid={`community-item-${community.id}`}
                  >
                    {getCommunityIcon(community.type)}
                    <span className="truncate flex-1">{community.name}</span>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Engagement Insights for Admins */}
          {isAdminOrPastor && engagementStats && selectedCommunity && (
            <div className="mt-4 pt-4 border-t">
              <h3 className="text-sm font-medium mb-2">Engagement Insights</h3>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>Posts: {engagementStats.totalPosts}</p>
                <p>Comments: {engagementStats.totalComments}</p>
                <p>Reactions: {engagementStats.totalReactions}</p>
                <p>Poll Votes: {engagementStats.totalPollVotes}</p>
              </div>
              {engagementStats.topContributors.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs font-medium mb-1">Top Contributors</p>
                  {engagementStats.topContributors.slice(0, 3).map((c, idx) => (
                    <p key={c.id} className="text-xs text-muted-foreground">
                      {idx + 1}. {c.name} ({c.count})
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6 overflow-auto">
          {!selectedCommunity ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Users className="w-16 h-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-xl font-semibold">Select a Community</h3>
              <p className="text-muted-foreground">Choose a community from the sidebar to view posts</p>
            </div>
          ) : (
            <>
              {/* Community Header */}
              <div className="flex items-center justify-between gap-4 mb-6">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-bold">{selectedCommunityData?.name}</h2>
                    <Badge variant="outline">
                      {getCommunityIcon(selectedCommunityData?.type || 'open')}
                      <span className="ml-1 capitalize">{selectedCommunityData?.type}</span>
                    </Badge>
                  </div>
                  {selectedCommunityData?.description && (
                    <p className="text-muted-foreground mt-1">{selectedCommunityData.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <Badge variant="default">{unreadCount} new</Badge>
                  )}
                  {canPost && (
                    <Dialog open={isCreatePostOpen} onOpenChange={setIsCreatePostOpen}>
                      <DialogTrigger asChild>
                        <Button data-testid="button-new-post">
                          <Plus className="w-4 h-4 mr-2" />
                          New Post
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Create Post</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <Textarea
                            value={newPostContent}
                            onChange={(e) => setNewPostContent(e.target.value)}
                            placeholder="What's on your mind?"
                            rows={4}
                            data-testid="input-post-content"
                          />
                          
                          {isAdminOrPastor && (
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={isPollPost}
                                onCheckedChange={setIsPollPost}
                                data-testid="switch-add-poll"
                              />
                              <Label>Add a poll</Label>
                            </div>
                          )}

                          {isPollPost && (
                            <div className="space-y-3 p-3 border rounded-md">
                              <div className="flex items-center gap-2">
                                <BarChart3 className="w-4 h-4" />
                                <span className="font-medium">Poll</span>
                              </div>
                              <Input
                                value={pollQuestion}
                                onChange={(e) => setPollQuestion(e.target.value)}
                                placeholder="Ask a question..."
                                data-testid="input-poll-question"
                              />
                              {pollOptions.map((opt, idx) => (
                                <Input
                                  key={idx}
                                  value={opt}
                                  onChange={(e) => {
                                    const newOpts = [...pollOptions];
                                    newOpts[idx] = e.target.value;
                                    setPollOptions(newOpts);
                                  }}
                                  placeholder={`Option ${idx + 1}`}
                                  data-testid={`input-poll-option-${idx}`}
                                />
                              ))}
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setPollOptions([...pollOptions, ""])}
                                data-testid="button-add-poll-option"
                              >
                                Add Option
                              </Button>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={allowMultipleVotes}
                                  onCheckedChange={setAllowMultipleVotes}
                                  data-testid="switch-allow-multiple"
                                />
                                <Label>Allow multiple votes</Label>
                              </div>
                            </div>
                          )}
                        </div>
                        <DialogFooter>
                          <Button 
                            onClick={() => createPostMutation.mutate()} 
                            disabled={!newPostContent.trim() || createPostMutation.isPending}
                            data-testid="button-submit-post"
                          >
                            Post
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                  {isAdminOrPastor && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" data-testid="button-community-menu">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          onClick={() => deleteCommunityMutation.mutate(selectedCommunity)}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Community
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>

              {isGuest && (
                <Card className="mb-4 bg-muted/50">
                  <CardContent className="py-3">
                    <p className="text-sm text-muted-foreground text-center">
                      You are viewing as a guest. You cannot post, comment, or react.
                    </p>
                  </CardContent>
                </Card>
              )}

              {isLoadingPosts ? (
                <p className="text-muted-foreground text-center">Loading posts...</p>
              ) : postsWithDetails.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <p className="text-muted-foreground">No posts yet. Be the first to post!</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {postsWithDetails.map(post => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Full-screen post view */}
      {selectedPost && <FullScreenPostView post={selectedPost} />}
    </Layout>
  );
}
