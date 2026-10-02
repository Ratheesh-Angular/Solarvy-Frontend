/**
 * Build-time prerender for the blog.
 *
 * Runs after `vite build`. Fetches every published post from the API and writes:
 *   dist/blog/index.html          – blog listing with its own meta tags
 *   dist/blog/<slug>/index.html   – per-article meta, OG/Twitter, JSON-LD and article HTML
 *   dist/sitemap.xml              – static URLs from public/sitemap.xml + /blog + each post
 *
 * Crawlers and social scrapers get real HTML; React replaces #root on load.
 * If the API is unreachable, the plain SPA build is left untouched (build does not fail).
 *
 * API base: PRERENDER_API_URL, else VITE_API_URL from the Vite env files for the build mode.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";

const SITE_ORIGIN = "https://www.solarvy.net";
const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/og-image.png`;
const FETCH_TIMEOUT_MS = 20_000;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(root, "dist");

function log(message) {
  console.log(`[prerender-blogs] ${message}`);
}

function warn(message) {
  console.warn(`[prerender-blogs] WARNING: ${message}`);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function jsonLdScript(data) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return `<script type="application/ld+json" data-prerender>${json}</script>`;
}

function resolveApiBase(mode) {
  const env = loadEnv(mode, root, "");
  const raw = (process.env.PRERENDER_API_URL || env.VITE_API_URL || "").trim();
  return raw.replace(/\/+$/, "");
}

function absoluteUrl(value, apiBase) {
  const v = String(value || "").trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  if (v.startsWith("/")) return `${apiBase}${v}`;
  return "";
}

function formatDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function isoDate(value) {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

async function fetchFeed(apiBase) {
  const res = await fetch(`${apiBase}/api/blogs/feed`, {
    headers: { Accept: "application/json", "User-Agent": "solarvy-prerender" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`GET /api/blogs/feed responded ${res.status}`);
  const body = await res.json();
  const items = body?.data?.items;
  if (!Array.isArray(items)) throw new Error("Unexpected feed response shape");
  return items;
}

/** Remove the site-wide default SEO tags from the SPA template so each page has one set. */
function stripDefaultSeo(html) {
  return html
    .replace(/<title>[\s\S]*?<\/title>\s*/i, "")
    .replace(/<meta\s+name="description"[\s\S]*?\/?>\s*/i, "")
    .replace(/<link\s+rel="canonical"[^>]*>\s*/i, "")
    .replace(/<meta\s+property="og:[^"]*"[^>]*>\s*/gi, "")
    .replace(/<meta\s+name="twitter:[^"]*"[^>]*>\s*/gi, "");
}

const PRERENDER_STYLE = `<style data-prerender>
.blog-prerender{max-width:760px;margin:0 auto;padding:32px 20px;font-family:Poppins,system-ui,sans-serif;color:#1a2259;line-height:1.7}
.blog-prerender img{max-width:100%;height:auto;border-radius:12px}
.blog-prerender a{color:#174c90}
</style>`;

function headTags({
  title,
  description,
  canonical,
  ogType = "website",
  image = DEFAULT_OG_IMAGE,
  imageAlt = "",
  article,
  jsonLd,
}) {
  const t = escapeHtml(title);
  const d = escapeHtml(description);
  const tags = [
    `<title data-prerender>${t}</title>`,
    `<meta data-prerender name="description" content="${d}" />`,
    `<link data-prerender rel="canonical" href="${escapeHtml(canonical)}" />`,
    `<meta data-prerender name="robots" content="index, follow" />`,
    `<meta data-prerender property="og:type" content="${ogType}" />`,
    `<meta data-prerender property="og:site_name" content="SolarVy" />`,
    `<meta data-prerender property="og:title" content="${t}" />`,
    `<meta data-prerender property="og:description" content="${d}" />`,
    `<meta data-prerender property="og:url" content="${escapeHtml(canonical)}" />`,
    `<meta data-prerender property="og:image" content="${escapeHtml(image)}" />`,
    `<meta data-prerender property="og:locale" content="en_US" />`,
  ];
  if (imageAlt) {
    tags.push(`<meta data-prerender property="og:image:alt" content="${escapeHtml(imageAlt)}" />`);
  }
  if (article) {
    if (article.publishedTime) {
      tags.push(
        `<meta data-prerender property="article:published_time" content="${escapeHtml(article.publishedTime)}" />`,
      );
    }
    if (article.modifiedTime) {
      tags.push(
        `<meta data-prerender property="article:modified_time" content="${escapeHtml(article.modifiedTime)}" />`,
      );
    }
    if (article.author) {
      tags.push(`<meta data-prerender property="article:author" content="${escapeHtml(article.author)}" />`);
    }
    if (article.section) {
      tags.push(`<meta data-prerender property="article:section" content="${escapeHtml(article.section)}" />`);
    }
    for (const tag of article.tags || []) {
      tags.push(`<meta data-prerender property="article:tag" content="${escapeHtml(tag)}" />`);
    }
  }
  tags.push(
    `<meta data-prerender name="twitter:card" content="summary_large_image" />`,
    `<meta data-prerender name="twitter:title" content="${t}" />`,
    `<meta data-prerender name="twitter:description" content="${d}" />`,
    `<meta data-prerender name="twitter:image" content="${escapeHtml(image)}" />`,
  );
  if (jsonLd) tags.push(jsonLdScript(jsonLd));
  tags.push(PRERENDER_STYLE);
  return tags.map((line) => `    ${line}`).join("\n");
}

function renderPage(template, head, bodyHtml) {
  const withHead = stripDefaultSeo(template).replace(/\s*<\/head>/i, `\n${head}\n  </head>`);
  return withHead.replace(
    /<div id="root"><\/div>/i,
    `<div id="root"><div class="blog-prerender">${bodyHtml}</div></div>`,
  );
}

function renderArticle(template, blog, apiBase) {
  const url = `${SITE_ORIGIN}/blog/${blog.slug}`;
  const title = blog.metaTitle || `${blog.title} | SolarVy Blog`;
  const description = blog.metaDescription || blog.excerpt || "";
  const featured = absoluteUrl(blog.featuredImagePath, apiBase);
  const shareImage = absoluteUrl(blog.ogImagePath, apiBase) || featured || DEFAULT_OG_IMAGE;
  const tags = Array.isArray(blog.tags) ? blog.tags : [];
  const author = blog.authorName || "SolarVy Team";

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: blog.title,
      description,
      image: shareImage ? [shareImage] : undefined,
      datePublished: blog.publishedAt || undefined,
      dateModified: blog.updatedAt || undefined,
      author: { "@type": "Organization", name: author },
      publisher: {
        "@type": "Organization",
        name: "SolarVy",
        url: SITE_ORIGIN,
        logo: { "@type": "ImageObject", url: DEFAULT_OG_IMAGE },
      },
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
      articleSection: blog.category || undefined,
      keywords: tags.length ? tags.join(", ") : undefined,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_ORIGIN}/` },
        { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_ORIGIN}/blog` },
        { "@type": "ListItem", position: 3, name: blog.title, item: url },
      ],
    },
  ];

  const head = headTags({
    title,
    description,
    canonical: url,
    ogType: "article",
    image: shareImage,
    imageAlt: blog.featuredImageAlt || blog.title,
    article: {
      publishedTime: blog.publishedAt,
      modifiedTime: blog.updatedAt,
      author,
      section: blog.category,
      tags,
    },
    jsonLd,
  });

  const meta = [
    blog.category ? escapeHtml(blog.category) : "",
    escapeHtml(author),
    formatDate(blog.publishedAt),
    blog.readingTimeMinutes ? `${blog.readingTimeMinutes} min read` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  // contentHtml is sanitized server-side on save (sanitize-html allowlist).
  const body = `
<nav aria-label="Breadcrumb"><a href="/">Home</a> / <a href="/blog">Blog</a></nav>
<article>
  <h1>${escapeHtml(blog.title)}</h1>
  <p>${meta}</p>
  ${featured ? `<img src="${escapeHtml(featured)}" alt="${escapeHtml(blog.featuredImageAlt || blog.title)}" />` : ""}
  ${blog.excerpt ? `<p><strong>${escapeHtml(blog.excerpt)}</strong></p>` : ""}
  ${blog.contentHtml || ""}
</article>
<p><a href="/blog">&larr; All articles</a> · <a href="/start-assessment">Start your free solar assessment</a></p>`;

  return renderPage(template, head, body);
}

function renderListing(template, blogs, apiBase) {
  const url = `${SITE_ORIGIN}/blog`;
  const description =
    "Practical guides on solar sizing, battery storage, diesel reduction, savings, and choosing the right installer — from the SolarVy team.";
  const head = headTags({
    title: "Solar Energy Blog | SolarVy",
    description,
    canonical: url,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Blog",
      name: "SolarVy Blog",
      url,
      publisher: { "@type": "Organization", name: "SolarVy", url: SITE_ORIGIN },
      blogPost: blogs.slice(0, 20).map((b) => ({
        "@type": "BlogPosting",
        headline: b.title,
        url: `${SITE_ORIGIN}/blog/${b.slug}`,
        datePublished: b.publishedAt || undefined,
        image: absoluteUrl(b.featuredImagePath, apiBase) || undefined,
      })),
    },
  });

  const items = blogs
    .map(
      (b) => `
  <li>
    <h2><a href="/blog/${escapeHtml(b.slug)}">${escapeHtml(b.title)}</a></h2>
    <p>${[b.category ? escapeHtml(b.category) : "", formatDate(b.publishedAt)].filter(Boolean).join(" · ")}</p>
    ${b.excerpt ? `<p>${escapeHtml(b.excerpt)}</p>` : ""}
  </li>`,
    )
    .join("");

  const body = `
<nav aria-label="Breadcrumb"><a href="/">Home</a> / Blog</nav>
<h1>SolarVy Blog</h1>
<p>${escapeHtml(description)}</p>
<ul>${items}
</ul>`;

  return renderPage(template, head, body);
}

async function buildSitemap(blogs) {
  let source;
  try {
    source = await readFile(path.join(root, "public", "sitemap.xml"), "utf8");
  } catch {
    source = await readFile(path.join(distDir, "sitemap.xml"), "utf8");
  }

  const staticEntries = (source.match(/<url>[\s\S]*?<\/url>/g) || []).filter((entry) => {
    const loc = entry.match(/<loc>([\s\S]*?)<\/loc>/)?.[1]?.trim() || "";
    return !/\/blog(\/|$)/.test(loc);
  });

  const latest = blogs.reduce((max, b) => {
    const d = isoDate(b.updatedAt || b.publishedAt);
    return d > max ? d : max;
  }, "");

  const blogEntries = [
    `  <url>
    <loc>${SITE_ORIGIN}/blog</loc>${latest ? `\n    <lastmod>${latest}</lastmod>` : ""}
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`,
    ...blogs.map((b) => {
      const lastmod = isoDate(b.updatedAt || b.publishedAt);
      return `  <url>
    <loc>${SITE_ORIGIN}/blog/${escapeHtml(b.slug)}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ""}
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`;
    }),
  ];

  const entries = [...staticEntries.map((e) => `  ${e.trim()}`), ...blogEntries];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("\n")}
</urlset>
`;
}

async function main() {
  const mode = process.env.PRERENDER_MODE || process.env.NODE_ENV || "production";
  const apiBase = resolveApiBase(mode);
  if (!apiBase) {
    warn("VITE_API_URL is not set; skipping blog prerender (SPA build left unchanged).");
    return;
  }

  let template;
  try {
    template = await readFile(path.join(distDir, "index.html"), "utf8");
  } catch {
    warn("dist/index.html not found; run `vite build` first. Skipping blog prerender.");
    return;
  }

  let feed;
  try {
    feed = await fetchFeed(apiBase);
  } catch (error) {
    warn(
      `Could not fetch ${apiBase}/api/blogs/feed (${error instanceof Error ? error.message : error}). ` +
        "Skipping blog prerender (SPA build left unchanged).",
    );
    return;
  }

  const blogs = feed.filter((b) => {
    if (b && typeof b.slug === "string" && SLUG_RE.test(b.slug)) return true;
    warn(`Skipping post with invalid slug: ${JSON.stringify(b?.slug)}`);
    return false;
  });

  await mkdir(path.join(distDir, "blog"), { recursive: true });
  await writeFile(path.join(distDir, "blog", "index.html"), renderListing(template, blogs, apiBase), "utf8");

  for (const blog of blogs) {
    const dir = path.join(distDir, "blog", blog.slug);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "index.html"), renderArticle(template, blog, apiBase), "utf8");
  }

  await writeFile(path.join(distDir, "sitemap.xml"), await buildSitemap(blogs), "utf8");

  log(`Prerendered /blog and ${blogs.length} article(s) from ${apiBase}; sitemap.xml updated.`);
}

main().catch((error) => {
  warn(`Unexpected error: ${error instanceof Error ? error.stack : error}. SPA build left unchanged.`);
});
