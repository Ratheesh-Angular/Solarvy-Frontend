# SolarVy SEO launch checklist

Canonical host: `https://www.solarvy.net/`

Complete these steps after deploying the Frontend `dist/` folder to the S3 bucket behind CloudFront.

## 1. Deploy and verify static SEO files

1. Build: `cd Frontend && npm run build`
2. Upload the full `dist/` contents to the S3 origin (include `robots.txt`, `sitemap.xml`, `og-image.png`, `index.html`).
3. Invalidate CloudFront cache for at least:
   - `/robots.txt`
   - `/sitemap.xml`
   - `/og-image.png`
   - `/index.html`
   - `/` (or `/*` if you prefer a full purge)
4. Confirm responses (PowerShell):

```powershell
curl.exe -sI https://www.solarvy.net/robots.txt
# Expect: Content-Type: text/plain (not text/html)

curl.exe -sI https://www.solarvy.net/sitemap.xml
# Expect: Content-Type: application/xml or text/xml (not text/html)

curl.exe -s https://www.solarvy.net/robots.txt
curl.exe -s https://www.solarvy.net/sitemap.xml | Select-Object -First 20
```

If either URL still returns HTML, the new files were not uploaded or CloudFront is still serving a cached SPA fallback.

SPA custom error responses (`404 → /index.html`) are fine. They must not override objects that exist in the bucket.

## 2. CloudFront / Route 53 — apex → www redirect

Goal: `https://solarvy.net/*` → **301** → `https://www.solarvy.net/*`

HTTP→HTTPS already works. Do not change that.

Recommended approach (CloudFront Function on the apex distribution or alternate domain behavior):

1. In AWS Console → CloudFront → open the distribution that serves `solarvy.net` (apex).
2. Add a CloudFront Function (viewer-request) that redirects non-www host to www, preserving path and query string. Example:

```javascript
function handler(event) {
  var request = event.request;
  var host = request.headers.host.value;
  if (host === 'solarvy.net') {
    return {
      statusCode: 301,
      statusDescription: 'Moved Permanently',
      headers: {
        location: { value: 'https://www.solarvy.net' + request.uri + (request.querystring ? '?' + Object.keys(request.querystring).map(function (k) {
          var q = request.querystring[k];
          if (q.multiValue) {
            return q.multiValue.map(function (v) { return k + '=' + v.value; }).join('&');
          }
          return k + (q.value ? '=' + q.value : '');
        }).join('&') : '') }
      }
    };
  }
  return request;
}
```

Simpler variant if you do not need query-string rebuilding: redirect to `https://www.solarvy.net` + `request.uri` and append `?` + raw query only when present via your preferred helper.

3. Attach the function to Viewer Request on the apex behavior.
4. Verify:

```powershell
curl.exe -sI https://solarvy.net/
# Expect: 301 Location: https://www.solarvy.net/
```

5. WAF / bot settings: do not enable challenges that block Googlebot. Current setup does not block Googlebot; keep it that way.

## 3. Google Search Console

1. Open [Google Search Console](https://search.google.com/search-console).
2. Add URL-prefix property: `https://www.solarvy.net/`
   - Optional: also add Domain property `solarvy.net` (covers www + apex).
3. Verify ownership:
   - **HTML tag** (preferred with this codebase): copy the verification meta from GSC, paste into `Frontend/index.html` replacing the commented placeholder, rebuild, redeploy, then click Verify.
   - Or use DNS TXT on the domain.
4. Sitemaps → Add sitemap URL: `https://www.solarvy.net/sitemap.xml`
5. URL Inspection → enter `https://www.solarvy.net/` → Request indexing.
6. Optionally request indexing for key pages: `/how-it-works`, `/start-assessment`, `/sample-results`, `/who-its-for`.
7. Monitor **Page indexing** over the following days/weeks. New sites can take time even after a correct setup.

## 4. Blog pages (prerender, CloudFront rewrite, invalidation)

Blog posts are written in the admin panel (`/admin/blogs`) and appear in the SPA immediately. Crawlers and social previews (WhatsApp, LinkedIn, X, Facebook) read static HTML instead, and that HTML is generated **at build time** — so after publishing, editing, or unpublishing a post, rebuild and redeploy the frontend.

### How the build works

`npm run build` runs `vite build` and then `node scripts/prerender-blogs.mjs`, which:

- fetches all published posts from `${VITE_API_URL}/api/blogs/feed` (value from `.env.production`; override with `PRERENDER_API_URL`)
- writes `dist/blog/index.html` and `dist/blog/<slug>/index.html` with per-page title, description, canonical, OG/Twitter/`article:*` tags, `BlogPosting` JSON-LD, and the article HTML
- rewrites `dist/sitemap.xml` = URLs from `public/sitemap.xml` + `/blog` + every published post (with `lastmod`)

If the API is unreachable it prints a `[prerender-blogs] WARNING` and leaves the normal SPA build untouched (the build does not fail). Check the build log for:

```
[prerender-blogs] Prerendered /blog and N article(s) from https://api.solarvy.net; sitemap.xml updated.
```

Re-run only the prerender step against an existing `dist/`: `npm run prerender:blogs`.

Backend requirement: set `API_URL=https://api.solarvy.net` in the backend `.env` so uploaded blog image URLs are public absolute URLs (they are used as `og:image`).

### CloudFront Function: serve `/blog` and `/blog/<slug>` from their `index.html`

S3 REST origins do not resolve `index.html` inside folders, so `/blog/my-post` must be rewritten to `/blog/my-post/index.html` at the edge. Other SPA routes keep using the existing 404 → `/index.html` fallback.

In AWS Console → CloudFront → Functions, create (or extend the apex-redirect function from section 2) a **viewer-request** function and associate it with the default behavior of the `www.solarvy.net` distribution:

```javascript
function handler(event) {
  var request = event.request;
  var host = request.headers.host ? request.headers.host.value : '';

  // Keep the apex → www redirect from section 2 here if this distribution also serves solarvy.net.
  if (host === 'solarvy.net') {
    var qs = Object.keys(request.querystring).map(function (k) {
      var q = request.querystring[k];
      if (q.multiValue) {
        return q.multiValue.map(function (v) { return k + '=' + v.value; }).join('&');
      }
      return k + (q.value ? '=' + q.value : '');
    }).join('&');
    return {
      statusCode: 301,
      statusDescription: 'Moved Permanently',
      headers: { location: { value: 'https://www.solarvy.net' + request.uri + (qs ? '?' + qs : '') } }
    };
  }

  // Prerendered blog pages: /blog, /blog/, /blog/<slug>, /blog/<slug>/
  var uri = request.uri;
  if (uri === '/blog' || uri === '/blog/' || /^\/blog\/[a-z0-9]+(?:-[a-z0-9]+)*\/?$/.test(uri)) {
    request.uri = uri.replace(/\/?$/, '/index.html');
  }

  return request;
}
```

A post that has not been prerendered yet (published after the last deploy) has no file in S3; the request falls through to the existing SPA fallback and the page still loads normally in the browser.

### Every deploy that includes blog changes

1. `cd Frontend && npm run build` — confirm the `Prerendered /blog and N article(s)` log line.
2. Upload `dist/` to S3. To remove pages of deleted/unpublished posts, sync with delete on the blog prefix:

```powershell
aws s3 sync dist/ s3://YOUR_BUCKET/
aws s3 sync dist/blog/ s3://YOUR_BUCKET/blog/ --delete
```

3. Invalidate CloudFront:

```powershell
aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/blog" "/blog/*" "/sitemap.xml" "/index.html"
```

4. Verify what crawlers see (raw HTML, no JavaScript):

```powershell
curl.exe -s https://www.solarvy.net/blog/YOUR-POST-SLUG | Select-String "<title|og:title|og:image|og:type"
# Expect the post's own title, og:type "article", and the featured image URL

curl.exe -s https://www.solarvy.net/sitemap.xml | Select-String "/blog"
```

5. Optional: check social cards with the [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) or [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/) (use "Scrape again" after edits), and request indexing for new posts in Google Search Console.

## 5. Success criteria

- [ ] `/robots.txt` is `text/plain` and lists the sitemap
- [ ] `/sitemap.xml` is XML with www URLs
- [ ] Homepage HTML includes description, canonical, OG tags
- [ ] `https://solarvy.net` 301s to `https://www.solarvy.net`
- [ ] GSC property verified; sitemap submitted; homepage requested for indexing
- [ ] Googlebot is not blocked by CDN/WAF
- [ ] `/blog/<slug>` raw HTML shows the post title, `og:type=article`, and featured image
- [ ] `/sitemap.xml` lists `/blog` and every published post
