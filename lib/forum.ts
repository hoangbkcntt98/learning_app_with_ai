import { prisma } from "./prisma";

export type ForumCommentRecord = {
  id: number;
  postId: number;
  userEmail: string;
  userName: string;
  content: string;
  createdAt: string;
};

export type ForumPostRecord = {
  id: number;
  userEmail: string;
  userName: string;
  subject: string;
  description: string;
  imageDataUrl: string | null;
  createdAt: string;
  comments: ForumCommentRecord[];
};

function toNumberId(value: bigint) {
  return Number(value);
}

function mapComment(comment: {
  id: bigint;
  postId: bigint;
  userEmail: string;
  content: string;
  createdAt: Date;
  user: { name: string };
}): ForumCommentRecord {
  return {
    id: toNumberId(comment.id),
    postId: toNumberId(comment.postId),
    userEmail: comment.userEmail,
    userName: comment.user.name,
    content: comment.content,
    createdAt: comment.createdAt.toISOString(),
  };
}

function mapPost(post: {
  id: bigint;
  userEmail: string;
  subject: string;
  content: string;
  imageBase64: string | null;
  imageMimeType: string | null;
  createdAt: Date;
  user: { name: string };
  comments: Array<{
    id: bigint;
    postId: bigint;
    userEmail: string;
    content: string;
    createdAt: Date;
    user: { name: string };
  }>;
}): ForumPostRecord {
  return {
    id: toNumberId(post.id),
    userEmail: post.userEmail,
    userName: post.user.name,
    subject: post.subject,
    description: post.content,
    imageDataUrl:
      post.imageBase64 && post.imageMimeType
        ? `data:${post.imageMimeType};base64,${post.imageBase64}`
        : null,
    createdAt: post.createdAt.toISOString(),
    comments: post.comments.map(mapComment),
  };
}

export function sanitizeForumComment(comment: ForumCommentRecord) {
  return {
    id: comment.id,
    postId: comment.postId,
    userEmail: comment.userEmail,
    userName: comment.userName,
    content: comment.content,
    createdAt: comment.createdAt,
  };
}

export function sanitizeForumPost(post: ForumPostRecord) {
  return {
    id: post.id,
    userEmail: post.userEmail,
    userName: post.userName,
    subject: post.subject,
    description: post.description,
    imageDataUrl: post.imageDataUrl,
    createdAt: post.createdAt,
    comments: post.comments.map(sanitizeForumComment),
  };
}

export async function listForumPosts(limit = 50): Promise<ForumPostRecord[]> {
  const normalizedLimit = Number.isFinite(limit)
    ? Math.max(1, Math.min(200, Math.trunc(limit)))
    : 50;

  const posts = await prisma.forumPost.findMany({
    orderBy: { createdAt: "desc" },
    take: normalizedLimit,
    include: {
      user: { select: { name: true } },
      comments: {
        orderBy: { createdAt: "asc" },
        include: {
          user: { select: { name: true } },
        },
      },
    },
  });

  return posts.map(mapPost);
}

export async function createForumPost(params: {
  userEmail: string;
  subject: string;
  description: string;
  imageBase64?: string | null;
  imageMimeType?: string | null;
}) {
  const post = await prisma.forumPost.create({
    data: {
      userEmail: params.userEmail,
      subject: params.subject,
      content: params.description,
      imageBase64: params.imageBase64 ?? null,
      imageMimeType: params.imageMimeType ?? null,
    },
    include: {
      user: { select: { name: true } },
      comments: {
        include: {
          user: { select: { name: true } },
        },
      },
    },
  });

  return mapPost(post);
}

export async function createForumComment(params: {
  postId: number;
  userEmail: string;
  content: string;
}) {
  const comment = await prisma.forumComment.create({
    data: {
      postId: BigInt(params.postId),
      userEmail: params.userEmail,
      content: params.content,
    },
    include: {
      user: { select: { name: true } },
    },
  });

  return mapComment(comment);
}
