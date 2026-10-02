import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import PageSeo from "../components/PageSeo";
import BlogHero from "../components/BlogHero";
import {
  BLOG_SITE_ORIGIN,
  blogUrl,
  fetchBlogBySlug,
  formatBlogDate,
  recordBlogView,
  type BlogDetailResult,
} from "../lib/blogApi";
import "../css/breadcrumbs.css";
import "../css/blog.css";

type LoadState = "loading" | "ready" | "not-found" | "error";

function ShareButtons({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const links = [
    {
      label: "Share on X",
      icon: "bi-twitter-x",
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    },
    {
      label: "Share on LinkedIn",
      icon: "bi-linkedin",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    },
    {
      label: "Share on Facebook",
      icon: "bi-facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    },
    {
      label: "Share on WhatsApp",
      icon: "bi-whatsapp",
      href: `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`,
    },
  ];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="blog-share" aria-label="Share this article">
      <span className="blog-share-label">Share</span>
      {links.map((l) => (
        <a
          key={l.label}
          href={l.href}
          target="_blank"
          rel="noopener noreferrer"
          className="blog-share-btn"
          aria-label={l.label}
          title={l.label}
        >
          <i className={`bi ${l.icon}`} aria-hidden="true"></i>
        </a>
      ))}
      <button
        type="button"
        className="blog-share-btn"
        onClick={copy}
        aria-label="Copy link"
        title={copied ? "Copied!" : "Copy link"}
      >
        <i className={`bi ${copied ? "bi-check2" : "bi-link-45deg"}`} aria-hidden="true"></i>
      </button>
      {copied ? <span className="blog-share-copied" role="status">Link copied</span> : null}
    </div>
  );
}

export default function BlogDetail() {
  const { slug = "" } = useParams();
  const location = useLocation();
  const [result, setResult] = useState<{
    slug: string;
    state: Exclude<LoadState, "loading">;
    data: BlogDetailResult | null;
  } | null>(null);
  const trackedSlugRef = useRef<string | null>(null);

  const state: LoadState = result?.slug === slug ? result.state : "loading";
  const data = result?.slug === slug ? result.data : null;

  useEffect(() => {
    let cancelled = false;
    fetchBlogBySlug(slug)
      .then((detail) => {
        if (!cancelled) setResult({ slug, state: "ready", data: detail });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "";
        setResult({
          slug,
          state: /not found/i.test(message) ? "not-found" : "error",
          data: null,
        });
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (state !== "ready" || !data || trackedSlugRef.current === data.blog.slug) return;
    trackedSlugRef.current = data.blog.slug;
    const from = (location.state as { from?: string } | null)?.from;
    const referrer = from ? `${window.location.origin}${from}` : document.referrer;
    void recordBlogView(data.blog.slug, referrer);
  }, [state, data, location.state]);

  if (state === "loading") {
    return (
      <div className="blog-page">
        <div className="full-body-color">
          <BlogHero title={<span className="blog-skel-line blog-skel-hero" />} />
          <div className="blog-container blog-article-wrap">
            <div className="blog-skel-block" />
            <div className="blog-skel-line w-100" />
            <div className="blog-skel-line w-100" />
            <div className="blog-skel-line w-75" />
          </div>
        </div>
      </div>
    );
  }

  if (state === "not-found" || state === "error" || !data) {
    const notFound = state === "not-found";
    return (
      <div className="blog-page">
        <PageSeo
          title={notFound ? "Article not found | SolarVy Blog" : "SolarVy Blog"}
          description="This article could not be found."
          path={`/blog/${slug}`}
          noindex
        />
        <div className="full-body-color">
          <BlogHero title={notFound ? "Article not found" : "Something went wrong"} />
          <div className="blog-container">
            <div className="blog-empty">
              <i className="bi bi-journal-x" aria-hidden="true"></i>
              <h2>{notFound ? "We couldn't find that article" : "We couldn't load this article"}</h2>
              <p>
                {notFound
                  ? "It may have been moved or unpublished."
                  : "Please check your connection and try again."}
              </p>
              <Link to="/blog" className="blog-cta-btn">
                Browse all articles
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { blog, related, previous, next } = data;
  const url = blogUrl(blog.slug);
  const seoTitle = blog.metaTitle || `${blog.title} | SolarVy Blog`;
  const seoDescription = blog.metaDescription || blog.excerpt;
  const shareImage = blog.ogImagePath || blog.featuredImagePath || undefined;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: blog.title,
      description: seoDescription,
      image: shareImage ? [shareImage] : undefined,
      datePublished: blog.publishedAt,
      dateModified: blog.updatedAt,
      author: { "@type": "Organization", name: blog.authorName || "SolarVy Team" },
      publisher: {
        "@type": "Organization",
        name: "SolarVy",
        url: BLOG_SITE_ORIGIN,
        logo: { "@type": "ImageObject", url: `${BLOG_SITE_ORIGIN}/og-image.png` },
      },
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
      articleSection: blog.category || undefined,
      keywords: blog.tags.length ? blog.tags.join(", ") : undefined,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${BLOG_SITE_ORIGIN}/` },
        { "@type": "ListItem", position: 2, name: "Blog", item: `${BLOG_SITE_ORIGIN}/blog` },
        { "@type": "ListItem", position: 3, name: blog.title, item: url },
      ],
    },
  ];

  return (
    <div className="blog-page">
      <PageSeo
        title={seoTitle}
        description={seoDescription}
        path={`/blog/${blog.slug}`}
        ogType="article"
        ogImage={shareImage}
        ogImageAlt={blog.featuredImageAlt || blog.title}
        publishedTime={blog.publishedAt}
        modifiedTime={blog.updatedAt}
        author={blog.authorName}
        section={blog.category}
        tags={blog.tags}
        jsonLd={jsonLd}
      />
      <div className="full-body-color">
        <BlogHero title={blog.title} className="blog-hero-article">
          <div className="blog-hero-meta">
            {blog.category ? (
              <Link
                to={`/blog?category=${encodeURIComponent(blog.category)}`}
                className="blog-chip blog-chip-light"
              >
                {blog.category}
              </Link>
            ) : null}
            <span>
              <i className="bi bi-person" aria-hidden="true"></i> {blog.authorName}
            </span>
            <span>
              <i className="bi bi-calendar3" aria-hidden="true"></i>{" "}
              <time dateTime={blog.publishedAt ?? undefined}>{formatBlogDate(blog.publishedAt)}</time>
            </span>
            <span>
              <i className="bi bi-clock" aria-hidden="true"></i> {blog.readingTimeMinutes} min read
            </span>
          </div>
        </BlogHero>

        <div className="blog-container blog-article-wrap">
          <nav aria-label="Breadcrumb" className="solar-breadcrumbs blog-breadcrumbs">
            <ol className="solar-breadcrumbs-list">
              <li className="solar-breadcrumbs-item">
                <Link className="solar-breadcrumbs-link" to="/">Home</Link>
              </li>
              <li className="solar-breadcrumbs-separator" aria-hidden="true">›</li>
              <li className="solar-breadcrumbs-item">
                <Link className="solar-breadcrumbs-link" to="/blog">Blog</Link>
              </li>
              <li className="solar-breadcrumbs-separator" aria-hidden="true">›</li>
              <li className="solar-breadcrumbs-item">
                <span className="solar-breadcrumbs-current" aria-current="page">
                  {blog.title}
                </span>
              </li>
            </ol>
          </nav>

          <article className="blog-article">
            {blog.featuredImagePath ? (
              <figure className="blog-featured">
                <img
                  src={blog.featuredImagePath}
                  alt={blog.featuredImageAlt || blog.title}
                  fetchPriority="high"
                />
              </figure>
            ) : null}

            {blog.excerpt ? <p className="blog-lead">{blog.excerpt}</p> : null}

            <div
              className="blog-content"
              dangerouslySetInnerHTML={{ __html: blog.contentHtml }}
            />

            {blog.tags.length > 0 ? (
              <div className="blog-tags" aria-label="Tags">
                {blog.tags.map((t) => (
                  <Link key={t} to={`/blog?q=${encodeURIComponent(t)}`} className="blog-tag">
                    #{t}
                  </Link>
                ))}
              </div>
            ) : null}

            <ShareButtons url={url} title={blog.title} />
          </article>

          <div className="blog-cta-banner">
            <div>
              <h2>Ready to see what solar can do for you?</h2>
              <p>
                Get a free, tailored estimate of system size, battery storage,
                savings, and payback in minutes.
              </p>
            </div>
            <Link to="/start-assessment" className="blog-cta-btn">
              Start Assessment <i className="bi bi-arrow-up-right" aria-hidden="true"></i>
            </Link>
          </div>

          {previous || next ? (
            <nav className="blog-adjacent" aria-label="More articles">
              {previous ? (
                <Link to={`/blog/${previous.slug}`} state={{ from: `/blog/${blog.slug}` }} className="blog-adjacent-link">
                  <span className="blog-adjacent-label">
                    <i className="bi bi-arrow-left" aria-hidden="true"></i> Previous article
                  </span>
                  <span className="blog-adjacent-title">{previous.title}</span>
                </Link>
              ) : (
                <span />
              )}
              {next ? (
                <Link
                  to={`/blog/${next.slug}`}
                  state={{ from: `/blog/${blog.slug}` }}
                  className="blog-adjacent-link blog-adjacent-next"
                >
                  <span className="blog-adjacent-label">
                    Next article <i className="bi bi-arrow-right" aria-hidden="true"></i>
                  </span>
                  <span className="blog-adjacent-title">{next.title}</span>
                </Link>
              ) : null}
            </nav>
          ) : null}

          {related.length > 0 ? (
            <section className="blog-related" aria-labelledby="blog-related-title">
              <h2 id="blog-related-title" className="blog-section-title">
                Related articles
              </h2>
              <div className="blog-grid blog-grid-3">
                {related.map((post) => (
                  <article key={post.id} className="blog-card">
                    <Link
                      to={`/blog/${post.slug}`}
                      state={{ from: `/blog/${blog.slug}` }}
                      className="blog-card-media"
                      aria-label={post.title}
                    >
                      {post.featuredImagePath ? (
                        <img
                          src={post.featuredImagePath}
                          alt={post.featuredImageAlt || post.title}
                          loading="lazy"
                        />
                      ) : (
                        <div className="blog-card-placeholder" aria-hidden="true">
                          <i className="bi bi-sun"></i>
                        </div>
                      )}
                    </Link>
                    <div className="blog-card-body">
                      {post.category ? <span className="blog-chip">{post.category}</span> : null}
                      <h3 className="blog-card-title">
                        <Link to={`/blog/${post.slug}`} state={{ from: `/blog/${blog.slug}` }}>
                          {post.title}
                        </Link>
                      </h3>
                      <div className="blog-meta">
                        <span>{formatBlogDate(post.publishedAt)}</span>
                        <span aria-hidden="true">•</span>
                        <span>{post.readingTimeMinutes} min read</span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
