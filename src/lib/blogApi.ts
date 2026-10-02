import { apiGet, apiPost } from "./api";

export const BLOG_SITE_ORIGIN = "https://www.solarvy.net";

export type BlogSummary = {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  featuredImagePath: string;
  featuredImageAlt: string;
  category: string;
  tags: string[];
  authorName: string;
  status: "draft" | "published";
  publishedAt: string | null;
  metaTitle: string;
  metaDescription: string;
  ogImagePath: string;
  readingTimeMinutes: number;
  createdAt: string;
  updatedAt: string;
  views?: number;
  uniqueVisitors?: number;
};

export type BlogPost = BlogSummary & { contentHtml: string };

export type BlogLink = { id: number; slug: string; title: string };

export type BlogCategory = { name: string; count: number };

export type BlogListResult = {
  items: BlogSummary[];
  page: number;
  limit: number;
  total: number;
  categories: BlogCategory[];
};

export type BlogDetailResult = {
  blog: BlogPost;
  related: BlogSummary[];
  previous: BlogLink | null;
  next: BlogLink | null;
};

type Envelope<T> = { success: boolean; message?: string; data?: T };

function toQuery(params: Record<string, string | number | undefined>) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === "") return;
    q.set(key, String(value));
  });
  const s = q.toString();
  return s ? `?${s}` : "";
}

export async function fetchBlogs(params: {
  page?: number;
  limit?: number;
  category?: string;
  q?: string;
} = {}) {
  const res = await apiGet<Envelope<BlogListResult>>(`/blogs${toQuery(params)}`);
  return res.data!;
}

export async function fetchPopularBlogs(limit = 5) {
  const res = await apiGet<Envelope<{ items: BlogSummary[] }>>(
    `/blogs/popular${toQuery({ limit })}`,
  );
  return res.data?.items ?? [];
}

export async function fetchBlogBySlug(slug: string) {
  const res = await apiGet<Envelope<BlogDetailResult>>(
    `/blogs/${encodeURIComponent(slug)}`,
  );
  return res.data!;
}

export async function recordBlogView(slug: string, referrer: string) {
  try {
    await apiPost(`/blogs/${encodeURIComponent(slug)}/view`, { referrer });
  } catch {
    // View tracking must never break the article page.
  }
}

export function formatBlogDate(value: string | null | undefined) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function blogUrl(slug: string) {
  return `${BLOG_SITE_ORIGIN}/blog/${slug}`;
}
