import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import PageSeo from "../components/PageSeo";
import BlogHero from "../components/BlogHero";
import Breadcrumbs from "../components/Breadcrumbs";
import {
  BLOG_SITE_ORIGIN,
  fetchBlogs,
  fetchPopularBlogs,
  formatBlogDate,
  type BlogCategory,
  type BlogSummary,
} from "../lib/blogApi";
import "../css/blog.css";

const PAGE_SIZE = 9;

function BlogCard({ post }: { post: BlogSummary }) {
  return (
    <article className="blog-card">
      <Link
        to={`/blog/${post.slug}`}
        state={{ from: "/blog" }}
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
        <h2 className="blog-card-title">
          <Link to={`/blog/${post.slug}`} state={{ from: "/blog" }}>
            {post.title}
          </Link>
        </h2>
        {post.excerpt ? <p className="blog-card-excerpt">{post.excerpt}</p> : null}
        <div className="blog-meta">
          <span>{formatBlogDate(post.publishedAt)}</span>
          <span aria-hidden="true">•</span>
          <span>{post.readingTimeMinutes} min read</span>
        </div>
      </div>
    </article>
  );
}

function BlogCardSkeleton() {
  return (
    <div className="blog-card blog-card-skeleton" aria-hidden="true">
      <div className="blog-card-media" />
      <div className="blog-card-body">
        <div className="blog-skel-line w-25" />
        <div className="blog-skel-line w-100" />
        <div className="blog-skel-line w-75" />
      </div>
    </div>
  );
}

export default function BlogList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const category = searchParams.get("category") || "";
  const q = searchParams.get("q") || "";

  const [searchInput, setSearchInput] = useState(q);
  const [items, setItems] = useState<BlogSummary[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [total, setTotal] = useState(0);
  const [popular, setPopular] = useState<BlogSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setSearchInput(q);
  }, [q]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    fetchBlogs({ page, limit: PAGE_SIZE, category, q })
      .then((data) => {
        if (cancelled) return;
        setItems(data.items);
        setCategories(data.categories);
        setTotal(data.total);
      })
      .catch(() => {
        if (!cancelled) setError("We couldn't load articles right now. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, category, q]);

  useEffect(() => {
    fetchPopularBlogs(4)
      .then(setPopular)
      .catch(() => setPopular([]));
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const updateParams = (next: { page?: number; category?: string; q?: string }) => {
    const params = new URLSearchParams(searchParams);
    const apply = (key: string, value: string | number | undefined) => {
      if (value === undefined) return;
      if (value === "" || value === 1) params.delete(key);
      else params.set(key, String(value));
    };
    apply("category", next.category);
    apply("q", next.q);
    apply("page", next.page);
    setSearchParams(params);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams({ q: searchInput.trim(), page: 1 });
  };

  const popularVisible = useMemo(
    () => popular.filter((p) => (p.views ?? 0) > 0),
    [popular],
  );

  const seoTitle = category ? `${category} Articles | SolarVy Blog` : "Solar Energy Blog | SolarVy";
  const canonicalPath = "/blog";

  return (
    <div className="blog-page">
      <PageSeo
        title={seoTitle}
        description="Practical guides on solar sizing, battery storage, diesel reduction, savings, and choosing the right installer — from the SolarVy team."
        path={canonicalPath}
        noindex={Boolean(q) || page > 1}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Blog",
          name: "SolarVy Blog",
          url: `${BLOG_SITE_ORIGIN}/blog`,
          publisher: { "@type": "Organization", name: "SolarVy", url: BLOG_SITE_ORIGIN },
        }}
      />
      <div className="full-body-color">
        <BlogHero
          title="SolarVy Blog"
          subtitle="Clear, practical guidance on solar, batteries, and energy savings — so you can make confident decisions before you spend."
        >
          <form className="blog-search" role="search" onSubmit={onSearch}>
            <i className="bi bi-search" aria-hidden="true"></i>
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search articles..."
              aria-label="Search articles"
            />
            <button type="submit">Search</button>
          </form>
        </BlogHero>

        <div className="blog-container">
          <Breadcrumbs className="blog-breadcrumbs" />

          {categories.length > 0 ? (
            <div className="blog-filters" role="tablist" aria-label="Filter by category">
              <button
                type="button"
                className={`blog-filter${!category ? " is-active" : ""}`}
                onClick={() => updateParams({ category: "", page: 1 })}
              >
                All
              </button>
              {categories.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  className={`blog-filter${category.toLowerCase() === c.name.toLowerCase() ? " is-active" : ""}`}
                  onClick={() => updateParams({ category: c.name, page: 1 })}
                >
                  {c.name} <span className="blog-filter-count">{c.count}</span>
                </button>
              ))}
            </div>
          ) : null}

          {q ? (
            <p className="blog-results-note">
              {loading ? "Searching..." : `${total} result${total === 1 ? "" : "s"} for “${q}”`}
              <button type="button" className="blog-link-btn" onClick={() => updateParams({ q: "", page: 1 })}>
                Clear search
              </button>
            </p>
          ) : null}

          <div className="blog-layout">
            <section className="blog-main" aria-label="Articles">
              {error ? <div className="blog-alert">{error}</div> : null}

              {loading ? (
                <div className="blog-grid">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <BlogCardSkeleton key={i} />
                  ))}
                </div>
              ) : items.length === 0 && !error ? (
                <div className="blog-empty">
                  <i className="bi bi-journal-text" aria-hidden="true"></i>
                  <h2>No articles found</h2>
                  <p>
                    {q || category
                      ? "Try a different search or category."
                      : "New articles are on the way. Check back soon."}
                  </p>
                </div>
              ) : (
                <div className="blog-grid">
                  {items.map((post) => (
                    <BlogCard key={post.id} post={post} />
                  ))}
                </div>
              )}

              {!loading && totalPages > 1 ? (
                <nav className="blog-pagination" aria-label="Pagination">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => updateParams({ page: page - 1 })}
                  >
                    <i className="bi bi-chevron-left" aria-hidden="true"></i> Previous
                  </button>
                  <span>
                    Page {page} of {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => updateParams({ page: page + 1 })}
                  >
                    Next <i className="bi bi-chevron-right" aria-hidden="true"></i>
                  </button>
                </nav>
              ) : null}
            </section>

            <aside className="blog-sidebar">
              {popularVisible.length > 0 ? (
                <div className="blog-side-card">
                  <h2 className="blog-side-title">Popular articles</h2>
                  <ol className="blog-popular-list">
                    {popularVisible.map((p, i) => (
                      <li key={p.id}>
                        <span className="blog-popular-rank">{i + 1}</span>
                        <div>
                          <Link to={`/blog/${p.slug}`} state={{ from: "/blog" }}>
                            {p.title}
                          </Link>
                          <span className="blog-meta">{p.readingTimeMinutes} min read</span>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}

              <div className="blog-side-card blog-cta-card">
                <h2 className="blog-side-title">Size your solar system</h2>
                <p>
                  Get a free estimate of system size, battery storage, savings,
                  and payback in minutes.
                </p>
                <Link to="/start-assessment" className="blog-cta-btn">
                  Start Assessment <i className="bi bi-arrow-up-right" aria-hidden="true"></i>
                </Link>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
