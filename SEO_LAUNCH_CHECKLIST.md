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

## 4. Success criteria

- [ ] `/robots.txt` is `text/plain` and lists the sitemap
- [ ] `/sitemap.xml` is XML with www URLs
- [ ] Homepage HTML includes description, canonical, OG tags
- [ ] `https://solarvy.net` 301s to `https://www.solarvy.net`
- [ ] GSC property verified; sitemap submitted; homepage requested for indexing
- [ ] Googlebot is not blocked by CDN/WAF
