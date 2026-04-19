import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowBigDown,
  ArrowBigUp,
  ImagePlus,
  MessageSquare,
  RefreshCw,
  SendHorizontal,
  ShieldAlert,
  X
} from 'lucide-react';
import authService from '../../services/api/authService';
import communityService from '../../services/api/communityService';
import Navbar from '../../components/Navigation/Navbar';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';

const PLATFORM_OPTIONS = ['Uber', 'Careem', 'Bykea', 'Foodpanda', 'InDrive', 'Other'];
const ISSUE_OPTIONS = [
  'Rate drop',
  'Unfair deduction',
  'Payment delay',
  'Account suspension',
  'Safety concern',
  'Support request',
  'Other'
];

const DEFAULT_FORM = {
  title: '',
  description: '',
  platform: PLATFORM_OPTIONS[0],
  issue: ISSUE_OPTIONS[0],
  image_url: ''
};

function formatDate(value) {
  return new Date(value).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

export default function WorkerCommunityPage() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creatingPost, setCreatingPost] = useState(false);

  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [previewImage, setPreviewImage] = useState('');

  const [sortBy, setSortBy] = useState('new');
  const [platformFilter, setPlatformFilter] = useState('');
  const [issueFilter, setIssueFilter] = useState('');

  const [expandedComments, setExpandedComments] = useState({});
  const [commentsByPost, setCommentsByPost] = useState({});
  const [commentsLoading, setCommentsLoading] = useState({});
  const [commentDrafts, setCommentDrafts] = useState({});
  const [submittingCommentFor, setSubmittingCommentFor] = useState({});

  const hasFilters = useMemo(() => Boolean(platformFilter || issueFilter || sortBy !== 'new'), [platformFilter, issueFilter, sortBy]);

  useEffect(() => {
    initializePage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!user) return;
    loadPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy, platformFilter, issueFilter]);

  async function initializePage() {
    try {
      const profile = await authService.getMe();

      if (profile?.role !== 'worker') {
        toast.error('Worker Community is available for workers only');
        navigate('/dashboard');
        return;
      }

      setUser(profile);
      await loadPosts(profile);
    } catch (error) {
      toast.error(error.message || 'Please login again');
      navigate('/login');
    } finally {
      setLoading(false);
    }
  }

  async function loadPosts(existingUser = user) {
    if (!existingUser) return;

    try {
      setRefreshing(true);
      const result = await communityService.listPosts({
        sort: sortBy,
        platform: platformFilter,
        issue: issueFilter
      });
      setPosts(result.posts || []);
    } catch (error) {
      toast.error(error.message || 'Failed to load community posts');
    } finally {
      setRefreshing(false);
    }
  }

  async function handleCreatePost(event) {
    event.preventDefault();

    if (!formData.title.trim() || !formData.description.trim()) {
      toast.error('Please add a title and description');
      return;
    }

    try {
      setCreatingPost(true);
      const result = await communityService.createPost({
        title: formData.title.trim(),
        description: formData.description.trim(),
        platform: formData.platform,
        issue: formData.issue,
        image_url: formData.image_url
      });

      toast.success(result.message || 'Post submitted');
      setFormData(DEFAULT_FORM);
      setPreviewImage('');
      await loadPosts();
    } catch (error) {
      toast.error(error.message || 'Failed to create post');
    } finally {
      setCreatingPost(false);
    }
  }

  function handleImageSelection(event) {
    const file = event.target.files?.[0];

    if (!file) {
      setFormData((prev) => ({ ...prev, image_url: '' }));
      setPreviewImage('');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Only image files are allowed');
      event.target.value = '';
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be smaller than 2MB');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const imageData = String(reader.result || '');
      setPreviewImage(imageData);
      setFormData((prev) => ({ ...prev, image_url: imageData }));
    };
    reader.readAsDataURL(file);
  }

  async function handleVote(postId, direction) {
    try {
      const result = await communityService.votePost(postId, direction);

      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? {
              ...post,
              upvotes: result.upvotes,
              downvotes: result.downvotes,
              score: result.score,
              user_vote: result.user_vote
            }
            : post
        )
      );
    } catch (error) {
      toast.error(error.message || 'Failed to update vote');
    }
  }

  async function toggleComments(postId) {
    const isOpen = Boolean(expandedComments[postId]);

    setExpandedComments((prev) => ({
      ...prev,
      [postId]: !isOpen
    }));

    if (!isOpen && !commentsByPost[postId]) {
      await loadComments(postId);
    }
  }

  async function loadComments(postId) {
    try {
      setCommentsLoading((prev) => ({ ...prev, [postId]: true }));
      const result = await communityService.listComments(postId);
      setCommentsByPost((prev) => ({ ...prev, [postId]: result.comments || [] }));
    } catch (error) {
      toast.error(error.message || 'Failed to load comments');
    } finally {
      setCommentsLoading((prev) => ({ ...prev, [postId]: false }));
    }
  }

  async function submitComment(postId) {
    const draft = (commentDrafts[postId] || '').trim();

    if (!draft) {
      toast.error('Comment cannot be empty');
      return;
    }

    try {
      setSubmittingCommentFor((prev) => ({ ...prev, [postId]: true }));
      const result = await communityService.addComment(postId, draft);

      setCommentsByPost((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] || []), result.comment]
      }));

      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? { ...post, comment_count: (post.comment_count || 0) + 1 }
            : post
        )
      );

      setCommentDrafts((prev) => ({ ...prev, [postId]: '' }));
      setExpandedComments((prev) => ({ ...prev, [postId]: true }));
    } catch (error) {
      toast.error(error.message || 'Failed to add comment');
    } finally {
      setSubmittingCommentFor((prev) => ({ ...prev, [postId]: false }));
    }
  }

  function statusVariant(status) {
    if (status === 'approved') return 'success';
    if (status === 'rejected') return 'destructive';
    return 'secondary';
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-zinc-600">Loading worker community...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <Navbar user={user} />

      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Worker Community</h1>
            <p className="text-sm text-zinc-500">
              Anonymous worker board for rate intel, platform complaints, and support requests.
            </p>
          </div>
          <Button variant="outline" onClick={() => loadPosts()} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Create Anonymous Post</CardTitle>
                <CardDescription>
                  Posts are visible after advocate moderation. Your identity stays hidden from other workers.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={handleCreatePost}>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-700" htmlFor="title">
                      Title
                    </label>
                    <Input
                      id="title"
                      maxLength={120}
                      placeholder="Example: Careem cut rider rates this week"
                      value={formData.title}
                      onChange={(event) => setFormData((prev) => ({ ...prev, title: event.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-700" htmlFor="description">
                      Description
                    </label>
                    <Textarea
                      id="description"
                      maxLength={1200}
                      placeholder="Share details workers should know..."
                      value={formData.description}
                      onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-700" htmlFor="platform">
                        Platform
                      </label>
                      <select
                        id="platform"
                        className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
                        value={formData.platform}
                        onChange={(event) => setFormData((prev) => ({ ...prev, platform: event.target.value }))}
                      >
                        {PLATFORM_OPTIONS.map((platformOption) => (
                          <option key={platformOption} value={platformOption}>
                            {platformOption}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-700" htmlFor="issue">
                        Issue Type
                      </label>
                      <select
                        id="issue"
                        className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
                        value={formData.issue}
                        onChange={(event) => setFormData((prev) => ({ ...prev, issue: event.target.value }))}
                      >
                        {ISSUE_OPTIONS.map((issueOption) => (
                          <option key={issueOption} value={issueOption}>
                            {issueOption}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-700" htmlFor="image_upload">
                      Attach Image (optional)
                    </label>
                    <div className="rounded-md border border-dashed border-zinc-300 p-4">
                      <label
                        htmlFor="image_upload"
                        className="flex cursor-pointer items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900"
                      >
                        <ImagePlus className="h-4 w-4" />
                        Upload screenshot or evidence
                      </label>
                      <input
                        id="image_upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageSelection}
                      />
                      {previewImage && (
                        <div className="relative mt-3">
                          <img
                            src={previewImage}
                            alt="Post preview"
                            className="max-h-44 w-full rounded-md border border-zinc-200 object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setPreviewImage('');
                              setFormData((prev) => ({ ...prev, image_url: '' }));
                            }}
                            className="absolute right-2 top-2 rounded-full bg-zinc-800/70 p-1 text-white hover:bg-zinc-900"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={creatingPost}>
                    {creatingPost ? 'Submitting...' : 'Submit Post'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Feed Filters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-zinc-700" htmlFor="sortBy">
                    Sort
                  </label>
                  <select
                    id="sortBy"
                    value={sortBy}
                    onChange={(event) => setSortBy(event.target.value)}
                    className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
                  >
                    <option value="new">Newest</option>
                    <option value="top">Top score</option>
                    <option value="controversial">Controversial</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-zinc-700" htmlFor="platformFilter">
                    Platform
                  </label>
                  <select
                    id="platformFilter"
                    value={platformFilter}
                    onChange={(event) => setPlatformFilter(event.target.value)}
                    className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
                  >
                    <option value="">All platforms</option>
                    {PLATFORM_OPTIONS.map((platformOption) => (
                      <option key={platformOption} value={platformOption}>
                        {platformOption}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-zinc-700" htmlFor="issueFilter">
                    Issue Type
                  </label>
                  <select
                    id="issueFilter"
                    value={issueFilter}
                    onChange={(event) => setIssueFilter(event.target.value)}
                    className="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
                  >
                    <option value="">All issues</option>
                    {ISSUE_OPTIONS.map((issueOption) => (
                      <option key={issueOption} value={issueOption}>
                        {issueOption}
                      </option>
                    ))}
                  </select>
                </div>

                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => {
                    setSortBy('new');
                    setPlatformFilter('');
                    setIssueFilter('');
                  }}
                  disabled={!hasFilters}
                >
                  Clear filters
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            {posts.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
                  <ShieldAlert className="h-8 w-8 text-zinc-400" />
                  <p className="text-zinc-700">No posts found for selected filters.</p>
                  <p className="text-sm text-zinc-500">Try another filter or create the first post.</p>
                </CardContent>
              </Card>
            ) : (
              posts.map((post) => {
                const isCommentsOpen = Boolean(expandedComments[post.id]);
                const postComments = commentsByPost[post.id] || [];
                const loadingComments = Boolean(commentsLoading[post.id]);
                const submittingComment = Boolean(submittingCommentFor[post.id]);

                return (
                  <Card key={post.id} className="overflow-hidden">
                    <CardContent className="p-0">
                      <div className="flex">
                        <div className="flex w-16 flex-col items-center gap-1 border-r border-zinc-100 bg-zinc-50 py-4">
                          <Button
                            size="icon"
                            variant={post.user_vote === 'up' ? 'default' : 'ghost'}
                            onClick={() => handleVote(post.id, 'up')}
                          >
                            <ArrowBigUp className="h-5 w-5" />
                          </Button>
                          <span className="text-sm font-semibold text-zinc-800">{post.score}</span>
                          <Button
                            size="icon"
                            variant={post.user_vote === 'down' ? 'destructive' : 'ghost'}
                            onClick={() => handleVote(post.id, 'down')}
                          >
                            <ArrowBigDown className="h-5 w-5" />
                          </Button>
                        </div>

                        <div className="flex-1 p-4">
                          <div className="mb-3 flex flex-wrap items-center gap-2">
                            <Badge variant="outline">{post.platform}</Badge>
                            <Badge variant="secondary">{post.issue}</Badge>
                            <Badge variant={statusVariant(post.status)}>{post.status}</Badge>
                            <span className="text-xs text-zinc-500">{post.author_alias}</span>
                            <span className="text-xs text-zinc-400">{formatDate(post.created_at)}</span>
                          </div>

                          <h3 className="text-lg font-semibold text-zinc-900">{post.title}</h3>
                          <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700">{post.description}</p>

                          {post.image_url && (
                            <img
                              src={post.image_url}
                              alt="Post evidence"
                              className="mt-3 max-h-80 w-full rounded-md border border-zinc-200 object-cover"
                            />
                          )}

                          {post.status === 'rejected' && post.moderation_note && (
                            <p className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">
                              Moderator note: {post.moderation_note}
                            </p>
                          )}

                          <div className="mt-4 flex flex-wrap items-center gap-3">
                            <Button variant="ghost" size="sm" onClick={() => toggleComments(post.id)}>
                              <MessageSquare className="h-4 w-4" />
                              {post.comment_count} comments
                            </Button>

                            {(user?.role === 'advocate' || user?.role === 'analyst') && post.status === 'pending' && (
                              <div className="flex gap-2 border-l border-zinc-200 pl-3">
                                <Button
                                  variant="success"
                                  size="sm"
                                  onClick={() => handleModeration(post.id, 'approved')}
                                >
                                  Approve
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleModeration(post.id, 'rejected')}
                                >
                                  Reject
                                </Button>
                              </div>
                            )}
                          </div>

                          {isCommentsOpen && (
                            <div className="mt-3 space-y-3 rounded-md border border-zinc-200 bg-zinc-50 p-3">
                              {loadingComments ? (
                                <p className="text-sm text-zinc-500">Loading comments...</p>
                              ) : postComments.length === 0 ? (
                                <p className="text-sm text-zinc-500">No comments yet. Start the discussion.</p>
                              ) : (
                                postComments.map((comment) => (
                                  <div key={comment.id} className="rounded-md border border-zinc-200 bg-white p-3">
                                    <div className="mb-1 flex items-center gap-2 text-xs text-zinc-500">
                                      <span className="font-semibold text-zinc-700">{comment.author_alias}</span>
                                      <span>{formatDate(comment.created_at)}</span>
                                    </div>
                                    <p className="whitespace-pre-wrap text-sm text-zinc-800">{comment.content}</p>
                                  </div>
                                ))
                              )}

                              <div className="space-y-2">
                                <Textarea
                                  value={commentDrafts[post.id] || ''}
                                  placeholder="Add your comment"
                                  onChange={(event) =>
                                    setCommentDrafts((prev) => ({
                                      ...prev,
                                      [post.id]: event.target.value
                                    }))
                                  }
                                />
                                <Button
                                  size="sm"
                                  disabled={submittingComment}
                                  onClick={() => submitComment(post.id)}
                                >
                                  <SendHorizontal className="h-4 w-4" />
                                  {submittingComment ? 'Posting...' : 'Post Comment'}
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
