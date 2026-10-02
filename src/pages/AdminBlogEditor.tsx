import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import FeedbackToast from "../components/FeedbackToast";
import BlogRichEditor from "../components/BlogRichEditor";
import { useFeedbackToast } from "../hooks/useFeedbackToast";
import {
  adminCreateBlog,
  adminGetBlog,
  adminListBlogs,
  adminUpdateBlog,
  adminUploadBlogImage,
  type AdminBlogPayload,
} from "../lib/adminApi";
import { BLOG_SITE_ORIGIN, type BlogPost } from "../lib/blogApi";
import "../css/blog.css";

type FormState = {
  title: string;
  slug: string;
  excerpt: string;
  contentHtml: string;
  featuredImagePath: string;
  featuredImageAlt: string;
  category: string;
  tags: string;
  authorName: string;
  metaTitle: string;
  metaDescription: string;
  ogImagePath: string;
};

const META_TITLE_MAX = 60;
const META_DESCRIPTION_MAX = 160;

const emptyForm = (): FormState => ({
  title: "",
  slug: "",
  excerpt: "",
  contentHtml: "",
  featuredImagePath: "",
  featuredImageAlt: "",
  category: "",
  tags: "",
  authorName: "SolarVy Team",
  metaTitle: "",
  metaDescription: "",
  ogImagePath: "",
});

function toForm(blog: BlogPost): FormState {
  return {
    title: blog.title,
    slug: blog.slug,
    excerpt: blog.excerpt,
    contentHtml: blog.contentHtml,
    featuredImagePath: blog.featuredImagePath,
    featuredImageAlt: blog.featuredImageAlt,
    category: blog.category,
    tags: blog.tags.join(", "),
    authorName: blog.authorName,
    metaTitle: blog.metaTitle,
    metaDescription: blog.metaDescription,
    ogImagePath: blog.ogImagePath,
  };
}

function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 180);
}

function toPayload(form: FormState): AdminBlogPayload {
  return {
    title: form.title.trim(),
    slug: form.slug.trim() || slugify(form.title),
    excerpt: form.excerpt.trim(),
    contentHtml: form.contentHtml,
    featuredImagePath: form.featuredImagePath,
    featuredImageAlt: form.featuredImageAlt.trim(),
    category: form.category.trim(),
    tags: form.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    authorName: form.authorName.trim(),
    metaTitle: form.metaTitle.trim(),
    metaDescription: form.metaDescription.trim(),
    ogImagePath: form.ogImagePath,
  };
}

function CharCounter({ value, max }: { value: string; max: number }) {
  const len = value.trim().length;
  const tone = len === 0 ? "" : len > max ? " is-over" : len >= max * 0.6 ? " is-good" : "";
  return (
    <span className={`admin-blog-counter${tone}`}>
      {len}/{max}
    </span>
  );
}

function ImagePicker({
  label,
  hint,
  value,
  onChange,
  onError,
  disabled,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (url: string) => void;
  onError: (message: string) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await adminUploadBlogImage(file);
      onChange(url);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Image upload failed.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="admin-field">
      <span className="admin-label">{label}</span>
      {value ? (
        <div className="admin-blog-image-preview">
          <img src={value} alt="" />
          <div className="admin-blog-image-actions">
            <button
              type="button"
              className="admin-btn admin-btn-secondary admin-btn-sm"
              onClick={() => inputRef.current?.click()}
              disabled={disabled || uploading}
            >
              {uploading ? "Uploading…" : "Replace"}
            </button>
            <button
              type="button"
              className="admin-btn admin-btn-ghost admin-btn-sm"
              onClick={() => onChange("")}
              disabled={disabled || uploading}
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="admin-blog-dropzone"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || uploading}
        >
          <i className="bi bi-cloud-arrow-up" aria-hidden="true"></i>
          <span>{uploading ? "Uploading…" : "Upload image"}</span>
          <small>JPG, PNG, WebP or GIF · max 5MB</small>
        </button>
      )}
      {hint ? <small className="admin-muted">{hint}</small> : null}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        hidden
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}

export default function AdminBlogEditor() {
  const { id } = useParams();
  const isNew = !id || id === "new";
  const blogId = isNew ? null : Number(id);
  const navigate = useNavigate();
  const { toast, showError, showSuccess, clearToast } = useFeedbackToast();

  const [form, setForm] = useState<FormState>(emptyForm);
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [editorKey, setEditorKey] = useState(0);
  const [categorySuggestions, setCategorySuggestions] = useState<string[]>([]);

  useEffect(() => {
    if (isNew || !blogId) return;
    let cancelled = false;
    setLoading(true);
    adminGetBlog(blogId)
      .then((blog) => {
        if (cancelled) return;
        setForm(toForm(blog));
        setStatus(blog.status);
        setPublishedAt(blog.publishedAt);
        setEditorKey((k) => k + 1);
        setDirty(false);
      })
      .catch((error) => {
        if (!cancelled) showError(error instanceof Error ? error.message : "Unable to load blog.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isNew, blogId, showError]);

  useEffect(() => {
    adminListBlogs({ limit: 50 })
      .then((data) => {
        const set = new Set(data.items.map((b) => b.category).filter(Boolean));
        setCategorySuggestions([...set].sort());
      })
      .catch(() => setCategorySuggestions([]));
  }, []);

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setDirty(true);
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "title" && !slugTouched) next.slug = slugify(String(value));
      return next;
    });
  };

  const save = async (nextStatus: "draft" | "published") => {
    const payload = toPayload(form);
    if (!payload.title) {
      showError("Title is required.");
      return;
    }
    if (nextStatus === "published" && !form.contentHtml.trim()) {
      showError("Add some content before publishing.");
      return;
    }
    if (form.featuredImagePath && !payload.featuredImageAlt) {
      showError("Add alt text for the featured image (used by screen readers and search engines).");
      return;
    }

    setSaving(true);
    clearToast();
    try {
      const saved = isNew
        ? await adminCreateBlog({ ...payload, status: nextStatus })
        : await adminUpdateBlog(blogId!, { ...payload, status: nextStatus });
      setForm(toForm(saved));
      setStatus(saved.status);
      setPublishedAt(saved.publishedAt);
      setSlugTouched(true);
      setDirty(false);
      showSuccess(
        nextStatus === "published"
          ? status === "published"
            ? "Changes are live."
            : "Article published."
          : "Draft saved.",
        "Saved",
      );
      if (isNew) navigate(`/admin/blogs/${saved.id}`, { replace: true });
    } catch (error) {
      showError(error instanceof Error ? error.message : "Unable to save blog.", "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const previewTitle = form.metaTitle.trim() || (form.title.trim() ? `${form.title.trim()} | SolarVy Blog` : "Article title | SolarVy Blog");
  const previewDescription =
    form.metaDescription.trim() || form.excerpt.trim() || "Your meta description or excerpt will appear here.";
  const previewSlug = form.slug.trim() || slugify(form.title) || "your-article";
  const previewImage = form.ogImagePath || form.featuredImagePath;
  const publicUrl = `${BLOG_SITE_ORIGIN}/blog/${previewSlug}`;

  const seoChecks = useMemo(() => {
    const titleLen = (form.metaTitle.trim() || form.title.trim()).length;
    const descLen = (form.metaDescription.trim() || form.excerpt.trim()).length;
    return [
      { ok: titleLen > 0 && titleLen <= META_TITLE_MAX, label: `SEO title is 1–${META_TITLE_MAX} characters` },
      { ok: descLen >= 70 && descLen <= META_DESCRIPTION_MAX, label: `Description is 70–${META_DESCRIPTION_MAX} characters` },
      { ok: Boolean(form.featuredImagePath), label: "Featured image is set" },
      { ok: !form.featuredImagePath || Boolean(form.featuredImageAlt.trim()), label: "Featured image has alt text" },
      { ok: Boolean(form.category.trim()), label: "Category is set" },
      { ok: /<h2/i.test(form.contentHtml), label: "Content uses at least one H2 heading" },
    ];
  }, [form]);

  if (loading) {
    return (
      <div className="admin-page-inner">
        <p className="admin-muted">Loading article…</p>
      </div>
    );
  }

  return (
    <div className="admin-page-inner admin-blog-editor-page">
      <FeedbackToast toast={toast} onClose={clearToast} />

      <div className="admin-page-header admin-page-header-row">
        <div>
          <Link to="/admin/blogs" className="admin-blog-back">
            ← All posts
          </Link>
          <h1 className="admin-page-title">{isNew ? "New post" : "Edit post"}</h1>
          <p className="admin-page-subtitle">
            <span className={`admin-blog-status is-${status}`}>
              {status === "published" ? "Published" : "Draft"}
            </span>
            {publishedAt ? (
              <span className="admin-muted"> · First published {new Date(publishedAt).toLocaleDateString()}</span>
            ) : null}
            {dirty ? <span className="admin-muted"> · Unsaved changes</span> : null}
          </p>
        </div>
        <div className="admin-panel-actions">
          {status === "published" && !isNew ? (
            <a
              href={`/blog/${form.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="admin-btn admin-btn-ghost"
            >
              View live
            </a>
          ) : null}
          {status === "published" ? (
            <button type="button" className="admin-btn admin-btn-secondary" disabled={saving} onClick={() => save("draft")}>
              Unpublish
            </button>
          ) : (
            <button type="button" className="admin-btn admin-btn-secondary" disabled={saving} onClick={() => save("draft")}>
              {saving ? "Saving…" : "Save draft"}
            </button>
          )}
          <button type="button" className="admin-btn admin-btn-primary" disabled={saving} onClick={() => save("published")}>
            {saving ? "Saving…" : status === "published" ? "Update" : "Publish"}
          </button>
        </div>
      </div>

      <div className="admin-blog-editor-grid">
        <div className="admin-blog-editor-main">
          <div className="admin-panel">
            <label className="admin-field">
              <span className="admin-label">Title</span>
              <input
                type="text"
                className="admin-input admin-blog-title-input"
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
                placeholder="e.g. How to size a solar system for your home"
                maxLength={300}
                disabled={saving}
              />
            </label>
            <label className="admin-field">
              <span className="admin-label">URL slug</span>
              <div className="admin-blog-slug">
                <span className="admin-blog-slug-prefix">/blog/</span>
                <input
                  type="text"
                  className="admin-input"
                  value={form.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    update("slug", slugify(e.target.value));
                  }}
                  placeholder="auto-generated-from-title"
                  disabled={saving}
                />
              </div>
              {status === "published" ? (
                <small className="admin-muted">
                  Changing the slug of a published post breaks existing links and shares.
                </small>
              ) : null}
            </label>
            <label className="admin-field">
              <span className="admin-label">
                Excerpt <CharCounter value={form.excerpt} max={220} />
              </span>
              <textarea
                className="admin-prompt-textarea admin-blog-excerpt"
                rows={3}
                value={form.excerpt}
                onChange={(e) => update("excerpt", e.target.value)}
                placeholder="A short summary shown on the blog listing and as the lead paragraph."
                maxLength={600}
                disabled={saving}
              />
            </label>
          </div>

          <div className="admin-panel">
            <span className="admin-label">Content</span>
            <BlogRichEditor
              key={editorKey}
              initialHtml={form.contentHtml}
              onChange={(html) => update("contentHtml", html)}
              onError={(msg) => showError(msg, "Upload failed")}
              disabled={saving}
            />
          </div>

          <div className="admin-panel">
            <h2 className="admin-panel-title">SEO &amp; social sharing</h2>
            <label className="admin-field">
              <span className="admin-label">
                SEO title <CharCounter value={form.metaTitle || form.title} max={META_TITLE_MAX} />
              </span>
              <input
                type="text"
                className="admin-input"
                value={form.metaTitle}
                onChange={(e) => update("metaTitle", e.target.value)}
                placeholder={form.title ? `${form.title} | SolarVy Blog` : "Defaults to the post title"}
                maxLength={300}
                disabled={saving}
              />
            </label>
            <label className="admin-field">
              <span className="admin-label">
                Meta description{" "}
                <CharCounter value={form.metaDescription || form.excerpt} max={META_DESCRIPTION_MAX} />
              </span>
              <textarea
                className="admin-prompt-textarea admin-blog-excerpt"
                rows={3}
                value={form.metaDescription}
                onChange={(e) => update("metaDescription", e.target.value)}
                placeholder="Defaults to the excerpt. Aim for 70–160 characters."
                maxLength={500}
                disabled={saving}
              />
            </label>
            <ImagePicker
              label="Social share image (optional)"
              hint="Overrides the featured image for Facebook, LinkedIn, X, and WhatsApp previews. Ideal size 1200×630."
              value={form.ogImagePath}
              onChange={(url) => update("ogImagePath", url)}
              onError={(msg) => showError(msg, "Upload failed")}
              disabled={saving}
            />

            <div className="admin-blog-previews">
              <div>
                <span className="admin-label">Google preview</span>
                <div className="admin-blog-serp">
                  <div className="admin-blog-serp-url">solarvy.net › blog › {previewSlug}</div>
                  <div className="admin-blog-serp-title">{previewTitle}</div>
                  <div className="admin-blog-serp-desc">{previewDescription}</div>
                </div>
              </div>
              <div>
                <span className="admin-label">Social card preview</span>
                <div className="admin-blog-social">
                  <div className="admin-blog-social-image">
                    {previewImage ? <img src={previewImage} alt="" /> : <span>No image</span>}
                  </div>
                  <div className="admin-blog-social-body">
                    <div className="admin-blog-social-domain">SOLARVY.NET</div>
                    <div className="admin-blog-social-title">{previewTitle}</div>
                    <div className="admin-blog-social-desc">{previewDescription}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <aside className="admin-blog-editor-side">
          <div className="admin-panel">
            <h2 className="admin-panel-title">Featured image</h2>
            <ImagePicker
              label="Image"
              hint="Shown on the listing card and at the top of the article. 16:9 works best."
              value={form.featuredImagePath}
              onChange={(url) => update("featuredImagePath", url)}
              onError={(msg) => showError(msg, "Upload failed")}
              disabled={saving}
            />
            <label className="admin-field">
              <span className="admin-label">Alt text</span>
              <input
                type="text"
                className="admin-input"
                value={form.featuredImageAlt}
                onChange={(e) => update("featuredImageAlt", e.target.value)}
                placeholder="Describe the image"
                maxLength={300}
                disabled={saving}
              />
            </label>
          </div>

          <div className="admin-panel">
            <h2 className="admin-panel-title">Details</h2>
            <label className="admin-field">
              <span className="admin-label">Category</span>
              <input
                type="text"
                className="admin-input"
                list="admin-blog-categories"
                value={form.category}
                onChange={(e) => update("category", e.target.value)}
                placeholder="e.g. Guides"
                maxLength={120}
                disabled={saving}
              />
              <datalist id="admin-blog-categories">
                {categorySuggestions.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </label>
            <label className="admin-field">
              <span className="admin-label">Tags</span>
              <input
                type="text"
                className="admin-input"
                value={form.tags}
                onChange={(e) => update("tags", e.target.value)}
                placeholder="solar, batteries, savings"
                disabled={saving}
              />
              <small className="admin-muted">Separate tags with commas.</small>
            </label>
            <label className="admin-field">
              <span className="admin-label">Author</span>
              <input
                type="text"
                className="admin-input"
                value={form.authorName}
                onChange={(e) => update("authorName", e.target.value)}
                maxLength={160}
                disabled={saving}
              />
            </label>
          </div>

          <div className="admin-panel">
            <h2 className="admin-panel-title">SEO checklist</h2>
            <ul className="admin-blog-checklist">
              {seoChecks.map((check) => (
                <li key={check.label} className={check.ok ? "is-ok" : ""}>
                  <i className={`bi ${check.ok ? "bi-check-circle-fill" : "bi-circle"}`} aria-hidden="true"></i>
                  {check.label}
                </li>
              ))}
            </ul>
            <small className="admin-muted">
              Public URL: <span className="admin-code">{publicUrl}</span>
            </small>
            <small className="admin-muted admin-blog-note">
              Social previews and search-engine HTML refresh on the next website deploy.
            </small>
          </div>
        </aside>
      </div>
    </div>
  );
}
