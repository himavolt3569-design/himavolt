"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  FileText, Plus, Edit2, Trash2, X, Image as ImageIcon, Check, Loader2, 
  ExternalLink, Eye, EyeOff, Tag, Folder
} from "lucide-react";
import { useToast } from "@/context/ToastContext";
import BlogEditor from "./BlogEditor";

interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  _count?: { posts: number };
}

interface BlogTag {
  id: string;
  name: string;
  slug: string;
  _count?: { posts: number };
}

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  coverImageUrl: string | null;
  videoUrl: string | null;
  published: boolean;
  createdAt: string;
  categoryId: string;
  category: BlogCategory;
  tags: { tag: BlogTag }[];
  author?: { name: string; email: string };
}

export default function AdminBlogTab() {
  const [view, setView] = useState<"list" | "editor" | "categories" | "tags">("list");
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);

  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const { data: posts = [], isLoading: loadingPosts } = useQuery<BlogPost[]>({
    queryKey: ["admin-blog-posts"],
    queryFn: async () => {
      const res = await fetch("/api/admin/blog");
      if (!res.ok) throw new Error("Failed to fetch posts");
      return res.json();
    }
  });

  const { data: categories = [] } = useQuery<BlogCategory[]>({
    queryKey: ["admin-blog-categories"],
    queryFn: async () => {
      const res = await fetch("/api/admin/blog/categories");
      if (!res.ok) throw new Error("Failed to fetch categories");
      return res.json();
    }
  });

  const { data: tags = [] } = useQuery<BlogTag[]>({
    queryKey: ["admin-blog-tags"],
    queryFn: async () => {
      const res = await fetch("/api/admin/blog/tags");
      if (!res.ok) throw new Error("Failed to fetch tags");
      return res.json();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/blog/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete post");
    },
    onSuccess: () => {
      showToast("Post deleted successfully", "success");
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
    },
    onError: () => showToast("Failed to delete post", "error"),
  });

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this post?")) {
      deleteMutation.mutate(id);
    }
  };

  const openEditor = (post?: BlogPost) => {
    setEditingPost(post || null);
    setView("editor");
  };

  const handleEditorClose = () => {
    setEditingPost(null);
    setView("list");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-1)] flex items-center gap-2">
            <FileText className="h-6 w-6 text-[var(--accent)]" />
            Blog Content Management
          </h2>
          <p className="text-sm text-[var(--text-3)] mt-1">
            Publish articles, updates, and resources for your users.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView("categories")}
            className="px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm font-semibold hover:bg-[var(--surface-alt)] transition-colors flex items-center gap-2 text-[var(--text-2)]"
          >
            <Folder className="h-4 w-4" />
            Categories
          </button>
          <button
            onClick={() => setView("tags")}
            className="px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm font-semibold hover:bg-[var(--surface-alt)] transition-colors flex items-center gap-2 text-[var(--text-2)]"
          >
            <Tag className="h-4 w-4" />
            Tags
          </button>
          <button
            onClick={() => openEditor()}
            className="px-4 py-2 bg-[var(--accent)] text-white rounded-xl text-sm font-bold hover:bg-[var(--accent-hover)] transition-colors shadow-lg shadow-[var(--accent)]/20 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Post
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {view === "list" && (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-[var(--surface)] border border-[var(--border-soft)] rounded-3xl overflow-hidden shadow-sm"
          >
            {loadingPosts ? (
              <div className="p-12 flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
              </div>
            ) : posts.length === 0 ? (
              <div className="p-12 text-center text-[var(--text-3)] flex flex-col items-center">
                <FileText className="h-12 w-12 mb-4 opacity-20" />
                <p>No blog posts found.</p>
                <button
                  onClick={() => openEditor()}
                  className="mt-4 text-[var(--accent)] font-semibold hover:underline"
                >
                  Create your first post
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-[var(--surface-alt)]/50 border-b border-[var(--border-soft)] text-[11px] uppercase tracking-wider text-[var(--text-3)] font-bold">
                    <tr>
                      <th className="px-6 py-4">Title</th>
                      <th className="px-6 py-4">Category</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-soft)]">
                    {posts.map((post) => (
                      <tr key={post.id} className="hover:bg-[var(--surface-alt)]/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-[var(--text-1)]">{post.title}</div>
                          <div className="text-[11px] text-[var(--text-3)]">{post.slug}</div>
                        </td>
                        <td className="px-6 py-4 text-[var(--text-2)] font-medium">
                          <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-semibold">
                            {post.category?.name || "Uncategorized"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {post.published ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Published
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                              Draft
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-[var(--text-3)]">
                          {new Date(post.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {post.published && (
                              <a
                                href={`/blog/${post.slug}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-2 text-[var(--text-3)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 rounded-lg transition-colors"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            )}
                            <button
                              onClick={() => openEditor(post)}
                              className="p-2 text-[var(--text-3)] hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(post.id)}
                              className="p-2 text-[var(--text-3)] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}

        {view === "editor" && (
          <motion.div
            key="editor"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <PostEditor
              post={editingPost}
              categories={categories}
              tags={tags}
              onClose={handleEditorClose}
            />
          </motion.div>
        )}

        {view === "categories" && (
          <motion.div
            key="categories"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <CategoryManager onClose={() => setView("list")} categories={categories} />
          </motion.div>
        )}

        {view === "tags" && (
          <motion.div
            key="tags"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <TagManager onClose={() => setView("list")} tags={tags} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── POST EDITOR SUB-COMPONENT ────────────────────────────────────────────────────────

function PostEditor({
  post,
  categories,
  tags,
  onClose
}: {
  post: BlogPost | null;
  categories: BlogCategory[];
  tags: BlogTag[];
  onClose: () => void;
}) {
  const [title, setTitle] = useState(post?.title || "");
  const [slug, setSlug] = useState(post?.slug || "");
  const [excerpt, setExcerpt] = useState(post?.excerpt || "");
  const [content, setContent] = useState(post?.content || "");
  const [categoryId, setCategoryId] = useState(post?.categoryId || "");
  const [selectedTags, setSelectedTags] = useState<string[]>(post?.tags.map(t => t.tag.id) || []);
  const [coverImageUrl, setCoverImageUrl] = useState(post?.coverImageUrl || "");
  const [published, setPublished] = useState(post?.published || false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const { showToast } = useToast();

  const queryClient = useQueryClient();

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!post) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, ""));
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          folder: "blog-covers",
        }),
      });
      if (!res.ok) throw new Error("Failed to get upload URL");
      
      const data = await res.json();
      
      // Upload directly to Supabase using the signed URL
      const uploadRes = await fetch(data.signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      
      if (!uploadRes.ok) throw new Error("Failed to upload to Supabase");

      setCoverImageUrl(data.publicUrl);
    } catch {
      showToast("Failed to upload image", "error");
    } finally {
      setUploadingImage(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title, slug, excerpt, content, categoryId,
        tagIds: selectedTags, coverImageUrl, published
      };
      const method = post ? "PUT" : "POST";
      const url = post ? `/api/admin/blog/${post.id}` : "/api/admin/blog";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to save post");
      }
      return res.json();
    },
    onSuccess: () => {
      showToast(post ? "Post updated" : "Post created", "success");
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
      onClose();
    },
    onError: (err: any) => showToast(err.message, "error"),
  });

  return (
    <div className="bg-[var(--surface)] border border-[var(--border-soft)] rounded-3xl overflow-hidden shadow-sm">
      <div className="p-6 border-b border-[var(--border-soft)] flex items-center justify-between sticky top-0 bg-[var(--surface)] z-20">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 hover:bg-[var(--surface-alt)] rounded-xl transition-colors">
            <X className="h-5 w-5" />
          </button>
          <h3 className="text-xl font-bold text-[var(--text-1)]">
            {post ? "Edit Post" : "Create New Post"}
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setPublished(!published)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors ${
              published 
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-[var(--surface-alt)] text-[var(--text-2)] border border-[var(--border)]"
            }`}
          >
            {published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            {published ? "Published" : "Draft"}
          </button>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !title || !slug || !categoryId || !content}
            className="px-6 py-2 bg-[var(--accent)] text-white rounded-xl text-sm font-bold shadow-lg shadow-[var(--accent)]/20 hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Post
          </button>
        </div>
      </div>

      <div className="p-6 md:p-8 flex flex-col lg:flex-row gap-8">
        <div className="flex-1 space-y-6">
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Post Title"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="w-full text-3xl font-bold bg-transparent border-none outline-none placeholder-[var(--text-3)] text-[var(--text-1)]"
            />
            <div className="flex items-center gap-2 text-sm text-[var(--text-3)]">
              <span>himavolt.com/blog/</span>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="bg-transparent border-b border-[var(--border)] outline-none focus:border-[var(--accent)] flex-1 min-w-[200px]"
              />
            </div>
          </div>

          <div>
            <textarea
              placeholder="Write a brief excerpt (optional)..."
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              rows={2}
              className="w-full p-4 bg-[var(--surface-alt)]/50 border border-[var(--border-soft)] rounded-xl text-sm focus:outline-none focus:border-[var(--accent)] transition-colors resize-none text-[var(--text-1)]"
            />
          </div>

          <div className="min-h-[500px]">
            <BlogEditor content={content} onChange={setContent} />
          </div>
        </div>

        <div className="w-full lg:w-[320px] shrink-0 space-y-6">
          <div className="bg-[var(--surface-alt)]/30 border border-[var(--border-soft)] rounded-2xl p-5 space-y-4">
            <h4 className="font-bold text-[var(--text-1)] text-sm">Cover Image</h4>
            
            {coverImageUrl ? (
              <div className="relative group rounded-xl overflow-hidden aspect-video border border-[var(--border)]">
                <img src={coverImageUrl} alt="Cover" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setCoverImageUrl("")} className="p-2 bg-red-500 text-white rounded-lg shadow-lg">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-[var(--border)] rounded-xl cursor-pointer hover:bg-[var(--surface-alt)] transition-colors">
                {uploadingImage ? (
                  <Loader2 className="h-6 w-6 animate-spin text-[var(--text-3)]" />
                ) : (
                  <>
                    <ImageIcon className="h-6 w-6 text-[var(--text-3)] mb-2" />
                    <span className="text-xs font-semibold text-[var(--text-2)]">Upload Image</span>
                  </>
                )}
                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
              </label>
            )}
          </div>

          <div className="bg-[var(--surface-alt)]/30 border border-[var(--border-soft)] rounded-2xl p-5 space-y-4">
            <h4 className="font-bold text-[var(--text-1)] text-sm">Category</h4>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full p-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-[var(--accent)]"
            >
              <option value="">Select a category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {categories.length === 0 && (
              <p className="text-xs text-[var(--text-3)]">No categories available. Please create one first.</p>
            )}
          </div>

          <div className="bg-[var(--surface-alt)]/30 border border-[var(--border-soft)] rounded-2xl p-5 space-y-4">
            <h4 className="font-bold text-[var(--text-1)] text-sm">Tags</h4>
            <div className="flex flex-wrap gap-2">
              {tags.map((t) => {
                const isSelected = selectedTags.includes(t.id);
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      if (isSelected) setSelectedTags(selectedTags.filter(id => id !== t.id));
                      else setSelectedTags([...selectedTags, t.id]);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      isSelected 
                        ? "bg-[var(--accent)] text-white shadow-sm"
                        : "bg-[var(--surface)] text-[var(--text-2)] border border-[var(--border)] hover:border-[var(--accent)]"
                    }`}
                  >
                    {t.name}
                  </button>
                );
              })}
            </div>
            {tags.length === 0 && (
              <p className="text-xs text-[var(--text-3)]">No tags available. Please create them first.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── CATEGORY MANAGER SUB-COMPONENT ────────────────────────────────────────────────────────

function CategoryManager({ onClose, categories }: { onClose: () => void; categories: BlogCategory[] }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const handleNameChange = (val: string) => {
    setName(val);
    setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, ""));
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/blog/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug, description })
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to create category");
      }
    },
    onSuccess: () => {
      showToast("Category created", "success");
      queryClient.invalidateQueries({ queryKey: ["admin-blog-categories"] });
      setName(""); setSlug(""); setDescription("");
    },
    onError: (err: any) => showToast(err.message, "error"),
  });

  return (
    <div className="bg-[var(--surface)] border border-[var(--border-soft)] rounded-3xl overflow-hidden shadow-sm max-w-4xl mx-auto">
      <div className="p-6 border-b border-[var(--border-soft)] flex items-center justify-between">
        <h3 className="text-xl font-bold text-[var(--text-1)] flex items-center gap-2">
          <Folder className="h-5 w-5 text-[var(--accent)]" />
          Categories
        </h3>
        <button onClick={onClose} className="p-2 hover:bg-[var(--surface-alt)] rounded-xl transition-colors">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="col-span-1 space-y-4 bg-[var(--surface-alt)]/30 border border-[var(--border-soft)] rounded-2xl p-5 h-fit">
          <h4 className="font-bold text-[var(--text-1)]">Add New Category</h4>
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            className="w-full p-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-[var(--accent)]"
          />
          <input
            type="text"
            placeholder="Slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="w-full p-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-[var(--accent)]"
          />
          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full p-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-[var(--accent)] resize-none"
          />
          <button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || !name || !slug}
            className="w-full py-3 bg-[var(--accent)] text-white rounded-xl text-sm font-bold shadow-sm hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
          >
            {createMutation.isPending ? "Saving..." : "Add Category"}
          </button>
        </div>

        <div className="col-span-1 md:col-span-2">
          <table className="w-full text-sm text-left">
            <thead className="bg-[var(--surface-alt)]/50 border-b border-[var(--border-soft)] text-[11px] uppercase tracking-wider text-[var(--text-3)] font-bold">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Posts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-soft)]">
              {categories.length === 0 ? (
                <tr><td colSpan={3} className="px-4 py-6 text-center text-[var(--text-3)]">No categories yet.</td></tr>
              ) : categories.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3 font-semibold text-[var(--text-1)]">{c.name}</td>
                  <td className="px-4 py-3 text-[var(--text-3)]">{c.slug}</td>
                  <td className="px-4 py-3 text-[var(--text-2)]">{c._count?.posts || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── TAG MANAGER SUB-COMPONENT ────────────────────────────────────────────────────────

function TagManager({ onClose, tags }: { onClose: () => void; tags: BlogTag[] }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const handleNameChange = (val: string) => {
    setName(val);
    setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, ""));
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/blog/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug })
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to create tag");
      }
    },
    onSuccess: () => {
      showToast("Tag created", "success");
      queryClient.invalidateQueries({ queryKey: ["admin-blog-tags"] });
      setName(""); setSlug("");
    },
    onError: (err: any) => showToast(err.message, "error"),
  });

  return (
    <div className="bg-[var(--surface)] border border-[var(--border-soft)] rounded-3xl overflow-hidden shadow-sm max-w-4xl mx-auto">
      <div className="p-6 border-b border-[var(--border-soft)] flex items-center justify-between">
        <h3 className="text-xl font-bold text-[var(--text-1)] flex items-center gap-2">
          <Tag className="h-5 w-5 text-[var(--accent)]" />
          Tags
        </h3>
        <button onClick={onClose} className="p-2 hover:bg-[var(--surface-alt)] rounded-xl transition-colors">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="col-span-1 space-y-4 bg-[var(--surface-alt)]/30 border border-[var(--border-soft)] rounded-2xl p-5 h-fit">
          <h4 className="font-bold text-[var(--text-1)]">Add New Tag</h4>
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            className="w-full p-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-[var(--accent)]"
          />
          <input
            type="text"
            placeholder="Slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="w-full p-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-[var(--accent)]"
          />
          <button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || !name || !slug}
            className="w-full py-3 bg-[var(--accent)] text-white rounded-xl text-sm font-bold shadow-sm hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
          >
            {createMutation.isPending ? "Saving..." : "Add Tag"}
          </button>
        </div>

        <div className="col-span-1 md:col-span-2">
          <div className="flex flex-wrap gap-2">
            {tags.length === 0 ? (
              <p className="text-[var(--text-3)] text-sm">No tags yet.</p>
            ) : tags.map((t) => (
              <div key={t.id} className="px-3 py-2 bg-[var(--surface-alt)]/50 border border-[var(--border-soft)] rounded-lg text-sm flex items-center gap-2">
                <span className="font-semibold text-[var(--text-1)]">{t.name}</span>
                <span className="text-xs text-[var(--text-3)] bg-[var(--surface)] px-1.5 py-0.5 rounded-md border border-[var(--border-soft)]">{t._count?.posts || 0}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
