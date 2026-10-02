import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import FeedbackToast from "../components/FeedbackToast";
import { useFeedbackToast } from "../hooks/useFeedbackToast";
import { adminDeleteBlog, adminListBlogs, adminUpdateBlog } from "../lib/adminApi";
import type { BlogSummary } from "../lib/blogApi";

const PAGE_SIZE = 20;

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function AdminBlogs() {
  const navigate = useNavigate();
  const { toast, showError, showSuccess, clearToast } = useFeedbackToast();
  const [items, setItems] = useState<BlogSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminListBlogs({ page, limit: PAGE_SIZE, status, q: query });
      setItems(data.items);
      setTotal(data.total);
    } catch (error) {
      showError(error instanceof Error ? error.message : "Unable to load blogs.");
    } finally {
      setLoading(false);
    }
  }, [page, status, query, showError]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleDelete = async (post: BlogSummary) => {
    if (!window.confirm(`Delete “${post.title}”? This also removes its view statistics.`)) return;
    clearToast();
    try {
      await adminDeleteBlog(post.id);
      showSuccess("Blog deleted.");
      await load();
    } catch (error) {
      showError(error instanceof Error ? error.message : "Unable to delete blog.", "Delete failed");
    }
  };

  const handleToggleStatus = async (post: BlogSummary) => {
    clearToast();
    const next = post.status === "published" ? "draft" : "published";
    try {
      await adminUpdateBlog(post.id, { status: next });
      showSuccess(next === "published" ? "Blog published." : "Blog moved to drafts.");
      await load();
    } catch (error) {
      showError(error instanceof Error ? error.message : "Unable to update blog.");
    }
  };

  return (
    <div className="admin-page-inner">
      <FeedbackToast toast={toast} onClose={clearToast} />

      <div className="admin-page-header admin-page-header-row">
        <div>
          <h1 className="admin-page-title">Blogs</h1>
          <p className="admin-page-subtitle">
            Create, edit, and publish articles for the SolarVy blog.
          </p>
        </div>
        <button
          type="button"
          className="admin-btn admin-btn-primary"
          onClick={() => navigate("/admin/blogs/new")}
        >
          + New post
        </button>
      </div>

      <form
        className="admin-visitors-toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setQuery(search.trim());
        }}
      >
        <label className="admin-field admin-date-field admin-visitors-search">
          <span className="admin-label">Search</span>
          <input
            type="search"
            className="admin-input admin-visitors-search-input"
            placeholder="Title, slug, or category"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <label className="admin-field admin-date-field">
          <span className="admin-label">Status</span>
          <select
            className="admin-input admin-date-input"
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value);
            }}
          >
            <option value="">All</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </label>
        <button type="submit" className="admin-btn admin-btn-secondary admin-btn-sm">
          Apply
        </button>
      </form>

      <div className="admin-panel admin-visitors-table-panel">
        {loading ? (
          <p className="admin-empty-text">Loading blogs…</p>
        ) : items.length === 0 ? (
          <div className="admin-empty">
            <p className="admin-empty-title">No blog posts yet</p>
            <p className="admin-empty-text">
              {query || status ? "Try a different filter." : "Create your first article to get started."}
            </p>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table admin-blog-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Category</th>
                  <th>Published</th>
                  <th className="text-end">Views</th>
                  <th className="text-end">Unique</th>
                </tr>
              </thead>
              <tbody>
                {items.map((post) => (
                  <tr key={post.id}>
                    <td>
                      <div className="admin-blog-title-cell">
                        {post.featuredImagePath ? (
                          <img src={post.featuredImagePath} alt="" className="admin-blog-thumb" />
                        ) : (
                          <span className="admin-blog-thumb admin-blog-thumb-empty" />
                        )}
                        <div>
                          <Link to={`/admin/blogs/${post.id}`} className="admin-blog-title-link">
                            {post.title}
                          </Link>
                          <div className="admin-table-path">/blog/{post.slug}</div>
                          <div className="admin-blog-row-actions">
                            <Link to={`/admin/blogs/${post.id}`}>Edit</Link>
                            {post.status === "published" ? (
                              <a href={`/blog/${post.slug}`} target="_blank" rel="noopener noreferrer">
                                View
                              </a>
                            ) : null}
                            <Link to={`/admin/blog-analytics?post=${post.id}`}>Stats</Link>
                            <button type="button" onClick={() => handleToggleStatus(post)}>
                              {post.status === "published" ? "Unpublish" : "Publish"}
                            </button>
                            <button
                              type="button"
                              className="is-danger"
                              onClick={() => handleDelete(post)}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`admin-blog-status is-${post.status}`}>
                        {post.status === "published" ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td>{post.category || "—"}</td>
                    <td>{formatDate(post.publishedAt)}</td>
                    <td className="text-end">{post.views ?? 0}</td>
                    <td className="text-end">{post.uniqueVisitors ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && total > PAGE_SIZE ? (
          <div className="admin-pagination">
            <span>
              {total} posts · Page {page} of {totalPages}
            </span>
            <div className="admin-panel-actions">
              <button
                type="button"
                className="admin-btn admin-btn-secondary admin-btn-sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-secondary admin-btn-sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
