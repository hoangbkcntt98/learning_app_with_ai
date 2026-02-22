"use client";

import Image from "next/image";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type ForumComment = {
  id: number;
  postId: number;
  userEmail: string;
  userName: string;
  content: string;
  createdAt: string;
};

type ForumPost = {
  id: number;
  userEmail: string;
  userName: string;
  subject: string;
  description: string;
  imageDataUrl: string | null;
  createdAt: string;
  comments: ForumComment[];
};

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

export function ForumClient({ currentUserEmail }: { currentUserEmail: string }) {
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [newSubject, setNewSubject] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newImage, setNewImage] = useState<File | null>(null);
  const [commentInputs, setCommentInputs] = useState<Record<number, string>>({});
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);
  const [submittingCommentPostId, setSubmittingCommentPostId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const imagePreviewUrl = useMemo(
    () => (newImage ? URL.createObjectURL(newImage) : null),
    [newImage],
  );

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  useEffect(() => {
    async function loadPosts() {
      setError("");
      setIsLoadingPosts(true);
      try {
        const response = await fetch("/api/forum/posts?limit=100");
        if (!response.ok) {
          const body = (await response.json()) as { error?: string };
          setError(body.error ?? "Failed to load forum posts.");
          return;
        }

        const body = (await response.json()) as { posts?: ForumPost[] };
        setPosts(body.posts ?? []);
      } catch {
        setError("Failed to load forum posts.");
      } finally {
        setIsLoadingPosts(false);
      }
    }

    loadPosts();
  }, []);

  async function handleCreatePost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const subject = newSubject.trim();
    const description = newDescription.trim();
    if (!subject || !description || isSubmittingPost) {
      return;
    }

    setError("");
    setStatus("");
    setIsSubmittingPost(true);
    try {
      const formData = new FormData();
      formData.append("subject", subject);
      formData.append("description", description);
      if (newImage) {
        formData.append("image", newImage);
      }

      const response = await fetch("/api/forum/posts", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setError(body.error ?? "Failed to create post.");
        return;
      }

      const body = (await response.json()) as { post: ForumPost };
      setPosts((prev) => [body.post, ...prev]);
      setNewSubject("");
      setNewDescription("");
      setNewImage(null);
      if (imageInputRef.current) {
        imageInputRef.current.value = "";
      }
      setStatus("Post created.");
    } catch {
      setError("Failed to create post.");
    } finally {
      setIsSubmittingPost(false);
    }
  }

  async function handleCreateComment(postId: number) {
    const content = (commentInputs[postId] ?? "").trim();
    if (!content || submittingCommentPostId !== null) {
      return;
    }

    setError("");
    setStatus("");
    setSubmittingCommentPostId(postId);
    try {
      const response = await fetch(`/api/forum/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setError(body.error ?? "Failed to create comment.");
        return;
      }

      const body = (await response.json()) as { comment: ForumComment };
      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? { ...post, comments: [...post.comments, body.comment] }
            : post,
        ),
      );
      setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
      setStatus("Comment posted.");
    } catch {
      setError("Failed to create comment.");
    } finally {
      setSubmittingCommentPostId(null);
    }
  }

  return (
    <div className="mt-6">
      <section className="rounded-xl border border-black/10 p-4">
        <h2 className="text-lg font-semibold">Create post</h2>
        <form onSubmit={handleCreatePost} className="mt-3 space-y-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-black/70">Subject</span>
            <input
              value={newSubject}
              onChange={(event) => setNewSubject(event.target.value)}
              placeholder="Post subject"
              maxLength={140}
              className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm"
              disabled={isSubmittingPost || isLoadingPosts}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-black/70">Description</span>
            <textarea
              value={newDescription}
              onChange={(event) => setNewDescription(event.target.value)}
              placeholder="Share details..."
              maxLength={4000}
              className="min-h-28 w-full rounded-lg border border-black/20 px-3 py-2 text-sm"
              disabled={isSubmittingPost || isLoadingPosts}
            />
          </label>

          <div>
            <label className="mb-1 block text-sm font-medium text-black/70">Image (optional)</label>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
              disabled={isSubmittingPost || isLoadingPosts}
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                setNewImage(file);
              }}
              className="text-xs"
            />
          </div>

          {newImage ? (
            <div className="space-y-2">
              <p className="text-xs text-black/60">
                Selected: <strong>{newImage.name}</strong> ({Math.ceil(newImage.size / 1024)} KB)
              </p>
              {imagePreviewUrl ? (
                <div className="w-fit">
                  <Image
                    src={imagePreviewUrl}
                    alt="Post image preview"
                    width={360}
                    height={240}
                    unoptimized
                    className="max-h-52 w-auto rounded-lg border border-black/15"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setNewImage(null);
                      if (imageInputRef.current) {
                        imageInputRef.current.value = "";
                      }
                    }}
                    className="mt-2 rounded-md border border-black/20 px-2 py-1 text-xs"
                  >
                    Remove image
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={!newSubject.trim() || !newDescription.trim() || isSubmittingPost || isLoadingPosts}
            className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {isSubmittingPost ? "Posting..." : "Post"}
          </button>
        </form>
      </section>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      {status ? <p className="mt-3 text-sm text-green-700">{status}</p> : null}

      <section className="mt-6 space-y-4">
        {isLoadingPosts ? <p className="text-sm text-black/70">Loading forum...</p> : null}
        {!isLoadingPosts && posts.length === 0 ? (
          <p className="text-sm text-black/70">No posts yet. Be the first to post.</p>
        ) : null}

        {posts.map((post) => (
          <article key={post.id} className="rounded-xl border border-black/10 p-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-black/60">
              <strong className="text-sm text-black/85">{post.userName}</strong>
              <span>({post.userEmail})</span>
              <span>•</span>
              <span>{formatTime(post.createdAt)}</span>
            </div>
            <h3 className="mt-3 text-lg font-semibold">{post.subject}</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm">{post.description}</p>
            {post.imageDataUrl ? (
              <div className="mt-3">
                <Image
                  src={post.imageDataUrl}
                  alt={`Post image for ${post.subject}`}
                  width={500}
                  height={320}
                  unoptimized
                  className="max-h-80 w-auto rounded-lg border border-black/15"
                />
              </div>
            ) : null}

            <div className="mt-4 rounded-lg border border-black/10 bg-black/[0.02] p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-black/60">
                Comments ({post.comments.length})
              </p>

              <div className="mt-2 space-y-2">
                {post.comments.length === 0 ? (
                  <p className="text-sm text-black/60">No comments yet.</p>
                ) : (
                  post.comments.map((comment) => {
                    const isCurrentUser = comment.userEmail === currentUserEmail;
                    return (
                      <div
                        key={comment.id}
                        className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-lg border p-2 ${
                            isCurrentUser
                              ? "border-blue-200 bg-blue-50 text-right"
                              : "border-black/10 bg-white text-left"
                          }`}
                        >
                          <div
                            className={`flex flex-wrap items-center gap-2 text-xs text-black/60 ${
                              isCurrentUser ? "justify-end" : "justify-start"
                            }`}
                          >
                            <strong className="text-sm text-black/85">{comment.userName}</strong>
                            <span>•</span>
                            <span>{formatTime(comment.createdAt)}</span>
                          </div>
                          <p className="mt-1 whitespace-pre-wrap text-sm">{comment.content}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="mt-3 flex gap-2">
                <input
                  value={commentInputs[post.id] ?? ""}
                  onChange={(event) =>
                    setCommentInputs((prev) => ({ ...prev, [post.id]: event.target.value }))
                  }
                  placeholder="Write a comment..."
                  maxLength={1000}
                  className="w-full rounded-lg border border-black/20 px-3 py-2 text-sm"
                  disabled={submittingCommentPostId !== null}
                />
                <button
                  type="button"
                  onClick={() => handleCreateComment(post.id)}
                  disabled={!((commentInputs[post.id] ?? "").trim()) || submittingCommentPostId !== null}
                  className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  {submittingCommentPostId === post.id ? "Sending..." : "Comment"}
                </button>
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
