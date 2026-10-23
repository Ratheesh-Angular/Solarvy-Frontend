# SolarVy domain migration: solarvy.net → solarvy.ng

Easy step-by-step guide. Follow the steps **in order**.  
All instructions for this migration are in **this file only**.

Hosting stays the same (S3 + CloudFront + API). Only the **domain name** changes.

| | Old | New |
|---|-----|-----|
| Website | `https://www.solarvy.net` | `https://www.solarvy.ng` |
| Apex | `https://solarvy.net` | `https://solarvy.ng` |
| API | `https://api.solarvy.net` | `https://api.solarvy.ng` |

**Domain registrar:** Domain King (Nigeria)  
**DNS manager:** Amazon Route 53 (**Option A** — this is what you use)  
**Canonical site URL:** `https://www.solarvy.ng`

---

## Before you start

Have ready:

- [ ] Login to **AWS Console**
- [ ] Login to **Domain King** (for `solarvy.ng`)
- [ ] Access to the **project code** (Frontend + Backend)
- [ ] Access to the **API server** (EC2 / SSH) to edit backend `.env`
- [ ] Note how `solarvy.net` is set up today in Route 53 + CloudFront (you will mirror that for `.ng`)

**Do not delete or disconnect `solarvy.net` yet.**  
Keep it so old links can redirect to the new domain later.

**Time:** about 45–90 minutes (plus waiting for DNS / certificate validation).

---

## Overview (big picture)

1. Create a Route 53 hosted zone for `solarvy.ng`
2. Point Domain King nameservers to Route 53
3. Get an HTTPS certificate in ACM for the `.ng` names
4. Attach `solarvy.ng` / `www.solarvy.ng` to CloudFront
5. Create Route 53 DNS records (www, apex, api)
6. Set apex → www redirect on CloudFront
7. Update code + env from `.net` to `.ng`
8. Rebuild frontend, upload to S3, invalidate CloudFront
9. Update backend env / CORS and restart API
10. Test the new domain
11. Redirect old `.net` → new `.ng`
12. Update Google Search Console (and email DNS only if needed)

---

## Step 1 — Create a Route 53 hosted zone for solarvy.ng

1. AWS Console → search **Route 53**
2. Left menu → **Hosted zones** → **Create hosted zone**
3. **Domain name:** `solarvy.ng`
4. **Type:** Public hosted zone
5. Click **Create hosted zone**
6. Open the new hosted zone
7. Find the **NS** record — you will see **4 nameserver values**, for example:
   - `ns-123.awsdns-12.com`
   - `ns-456.awsdns-34.net`
   - `ns-789.awsdns-56.org`
   - `ns-012.awsdns-78.co.uk`
8. Copy all 4 nameservers somewhere safe (Notepad). You need them in Step 2.

Copied values:
ns-1643.awsdns-13.co.uk.
ns-30.awsdns-03.com.
ns-600.awsdns-11.net.
ns-1060.awsdns-04.org.

Do **not** delete the default NS or SOA records Route 53 created.

---

## Step 2 — Point Domain King to Route 53 (nameservers)

DNS for `solarvy.ng` will be managed in AWS, not inside Domain King’s DNS editor.

1. Log in to **Domain King**
2. Open the domain **solarvy.ng**
3. Find **Nameservers** / **DNS / Name Servers** settings
4. Change from Domain King’s default nameservers to the **4 Route 53 nameservers** from Step 1
5. Save

### Wait for nameserver change

- Often works in 15–60 minutes
- Sometimes up to 24–48 hours

### Check (PowerShell)

```powershell
nslookup -type=NS solarvy.ng
```

You should see the **AWS** nameservers (awsdns), not Domain King’s.

Do **not** continue to certificate validation until NS shows AWS. You can still request the certificate in Step 3 while waiting, but validation only succeeds after NS points to Route 53.

---

## Step 3 — Request an HTTPS certificate (ACM)

CloudFront certificates **must** be in region **US East (N. Virginia) `us-east-1`**.

1. AWS Console → search **Certificate Manager**
2. Top right: set region to **N. Virginia (us-east-1)**
3. **Request certificate** → **Public certificate** → Next
4. Add these domain names (one per line / Add another name):
   - `solarvy.ng`
   - `www.solarvy.ng`
   - `api.solarvy.ng`
5. Validation method: **DNS validation** → Request
6. Open the new certificate

### Add validation records in Route 53 (easy way)

1. On the certificate page, look for **Create records in Route 53** (or similar)
2. Select the domains and create the records
3. ACM will add the required **CNAME** validation records into your `solarvy.ng` hosted zone automatically

### If the button is missing (manual way)

1. For each domain on the certificate, copy **CNAME name** and **CNAME value**
2. Route 53 → hosted zone `solarvy.ng` → **Create record**
3. Paste name and value exactly as ACM shows
4. Record type: **CNAME** → Create


### Wait until Issued

1. Refresh the certificate page until status is **Issued**
2. This can take a few minutes to about an hour after NS is correct

**Stop here until status is Issued.** Do not go to Step 4 before that.

---

## Step 4 — Attach the new domain to CloudFront (website)

1. AWS Console → **CloudFront**
2. Open the distribution that already serves **`www.solarvy.net`**
3. **General** tab → **Edit**
4. Under **Alternate domain names (CNAMEs)**, **add** (keep the old `.net` names for now):
   - `www.solarvy.ng`
   - `solarvy.ng`
5. Under **Custom SSL certificate**, select the certificate from Step 3  
   (or a certificate that covers both `.net` and `.ng` if you combined them)
6. Save changes
7. Wait until distribution status is **Deployed** (can take several minutes)

### API hostname (`api.solarvy.ng`)

Do **the same pattern you already use for `api.solarvy.net`**:

**If API is behind CloudFront (or an ALB with ACM):**

1. Open that distribution / listener
2. Add alternate name `api.solarvy.ng`
3. Attach a cert that includes `api.solarvy.ng`
4. Save / deploy

**If API is only EC2 + Nginx (or similar) with a cert on the server:**

1. You will point DNS in Step 5 to that server
2. On the server, issue/renew SSL for `api.solarvy.ng` the same way you did for `api.solarvy.net` (Let’s Encrypt, etc.)

Write down which API setup you use: _______________

---

## Step 5 — Create Route 53 DNS records for solarvy.ng

Open: Route 53 → Hosted zones → **solarvy.ng**

Tip: open the hosted zone for **`solarvy.net`** in another tab and **copy the same record pattern** (alias targets, IP, etc.), only changing the domain to `.ng`.

### 5.1 Website — www

1. **Create record**
2. Record name: `www`
3. Prefer **A – Alias** (recommended):
   - Alias: **Yes**
   - Route traffic to: **Alias to CloudFront distribution**
   - Choose the **same** CloudFront distribution as `www.solarvy.net`
4. Create record

(Alternative: CNAME `www` → `dxxxx.cloudfront.net` — Alias is better when available.)

### 5.2 Website — apex (solarvy.ng, no www)

1. **Create record**
2. Record name: leave **blank** (apex)
3. **A – Alias** → same CloudFront distribution as above
4. Create record

### 5.3 API — api

1. **Create record**
2. Record name: `api`
3. Use the **same target type** as `api.solarvy.net`:
   - If `.net` uses Alias to CloudFront / ALB → do that for `.ng`
   - If `.net` uses an **A** record to an EC2 IP → use the **same IP** for `api.solarvy.ng`
4. Create record

### 5.4 Check DNS (PowerShell)

```powershell
nslookup www.solarvy.ng
nslookup solarvy.ng
nslookup api.solarvy.ng
```

All three should resolve. If not, wait a few more minutes and try again.

---

## Step 6 — Apex → www redirect for solarvy.ng

Goal: `https://solarvy.ng/...` → **301** → `https://www.solarvy.ng/...`

1. CloudFront → left menu → **Functions** (or open your existing viewer-request function used for `.net`)
2. Create a new function **or** edit the existing one so it also handles `solarvy.ng`
3. Example function code:

```javascript
function handler(event) {
  var request = event.request;
  var host = request.headers.host.value;

  if (host === 'solarvy.ng') {
    return {
      statusCode: 301,
      statusDescription: 'Moved Permanently',
      headers: {
        location: {
          value: 'https://www.solarvy.ng' + request.uri
        }
      }
    };
  }

  return request;
}
```

4. **Publish** the function
5. Open your website CloudFront distribution → **Behaviors** → default behavior → **Edit**
6. **Viewer request** → associate this CloudFront Function
7. Save → wait until **Deployed**

### Verify later (after HTTPS works)

```powershell
curl.exe -sI https://solarvy.ng/
```

Expect: `301` and `Location: https://www.solarvy.ng/` (path preserved if you opened a subpath).

---

## Step 7 — Update project code and env (`.net` → `.ng`)

Do this in the codebase before the final production rebuild.

### 7.1 Frontend production env

File: `Frontend/.env.production`

```env
VITE_API_URL=https://api.solarvy.ng
```

### 7.2 Backend env (server + local `Backend/.env`)

```env
FRONTEND_URL=https://www.solarvy.ng,https://solarvy.ng,http://localhost:5173,http://127.0.0.1:5173
API_URL=https://api.solarvy.ng
```

Notes:

- `FRONTEND_URL` must include the live site origins or the browser will get **CORS** errors
- You may temporarily keep `https://www.solarvy.net` and `https://solarvy.net` in `FRONTEND_URL` until `.net` redirects are live
- `API_URL` is used for absolute blog image URLs (`og:image`, etc.)

### 7.3 CORS defaults (recommended)

File: `Backend/src/config/cors.js`

Add these origins to the defaults (keep `.net` for a while if needed):

- `https://solarvy.ng`
- `https://www.solarvy.ng`

### 7.4 Hardcoded site URLs in Frontend

Search the repo for `solarvy.net` and update remaining public URLs to `solarvy.ng`.

Known places:

| File | Change |
|------|--------|
| `Frontend/src/components/PageSeo.tsx` | site origin → `https://www.solarvy.ng` |
| `Frontend/src/lib/blogApi.ts` | `BLOG_SITE_ORIGIN` → `https://www.solarvy.ng` |
| `Frontend/scripts/prerender-blogs.mjs` | `SITE_ORIGIN` → `https://www.solarvy.ng` |
| `Frontend/index.html` | canonical, og:, JSON-LD URLs |
| `Frontend/public/sitemap.xml` | all `<loc>` URLs |
| `Frontend/public/robots.txt` | Sitemap URL |
| `Frontend/src/pages/AdminBlogEditor.tsx` | preview text showing `solarvy.net` |
| `Backend/src/config/chatbotDefaults.js` | text mentioning `solarvy.net` (optional) |
| `Frontend/SEO_LAUNCH_CHECKLIST.md` | docs only (optional) |

---

## Step 8 — Build, upload, invalidate (website)

On your machine (PowerShell):

```powershell
cd Frontend
npm run build
```

1. Upload **everything** inside `Frontend/dist/` to the S3 bucket (same process you use today)
2. CloudFront → your website distribution → **Invalidations** → **Create invalidation**
3. Paths:

```text
/*
```

4. Wait until the invalidation status is **Completed**

---

## Step 9 — Restart the backend API

1. SSH into the API server
2. Edit the server `.env` with the values from Step 7.2
3. Restart the Node process (use whatever you already use), for example:

```bash
pm2 restart all
```

4. Confirm the API process is running and healthy

---

## Step 10 — Test the new domain

### 10.1 Command checks (PowerShell)

```powershell
# Site should load over HTTPS
curl.exe -sI https://www.solarvy.ng/

# Apex should redirect to www
curl.exe -sI https://solarvy.ng/
# Expect: 301 and Location pointing to https://www.solarvy.ng/

# SEO files should not be HTML
curl.exe -sI https://www.solarvy.ng/robots.txt
curl.exe -sI https://www.solarvy.ng/sitemap.xml

# API (adjust path if your health route is different)
curl.exe -sI https://api.solarvy.ng/
```

### 10.2 Browser checks

- [ ] Open `https://www.solarvy.ng` — site loads
- [ ] Padlock / HTTPS is valid (no certificate warning)
- [ ] Start assessment / contact / login — no CORS errors (DevTools → Console / Network)
- [ ] Admin panel works
- [ ] A blog post opens; images load

**Only when this works, go to Step 11.**

---

## Step 11 — Redirect old solarvy.net → solarvy.ng

Keep `.net` DNS and CloudFront alternate names attached.

1. CloudFront → Functions (or your existing viewer-request function on the `.net` distribution)
2. Add a **301** so old hosts move to the new site, preserving the path:

```javascript
function handler(event) {
  var request = event.request;
  var host = request.headers.host.value;

  // New domain: apex → www
  if (host === 'solarvy.ng') {
    return {
      statusCode: 301,
      statusDescription: 'Moved Permanently',
      headers: {
        location: { value: 'https://www.solarvy.ng' + request.uri }
      }
    };
  }

  // Old domain → new domain
  if (host === 'solarvy.net' || host === 'www.solarvy.net') {
    return {
      statusCode: 301,
      statusDescription: 'Moved Permanently',
      headers: {
        location: { value: 'https://www.solarvy.ng' + request.uri }
      }
    };
  }

  return request;
}
```

3. Publish the function and confirm it is associated with **Viewer request**
4. Wait for CloudFront **Deployed**

### About the API on `.net`

- Prefer keeping `api.solarvy.net` working for a while **or**
- Point/redirect it carefully so old clients do not break
- Do not delete `api.solarvy.net` DNS on day one unless nothing still calls it

### Verify redirect

```powershell
curl.exe -sI https://www.solarvy.net/
# Expect: 301 Location: https://www.solarvy.ng/
```

Leave `.net` redirects in place for **several months** if possible (bookmarks + Google).

---

## Step 12 — Google Search Console & SEO

1. Open [Google Search Console](https://search.google.com/search-console)
2. Add URL-prefix property: `https://www.solarvy.ng/`
3. Verify ownership (HTML meta tag in `Frontend/index.html`, or DNS TXT in Route 53)
4. Sitemaps → submit: `https://www.solarvy.ng/sitemap.xml`
5. Request indexing for the homepage and key pages
6. On the old `.net` property, use **Change of address** if Google offers it

---

## Step 13 — Email (only if you use @solarvy.ng)

Website DNS is separate from email DNS.

If mail should use `@solarvy.ng`:

1. Get MX / SPF / DKIM / DMARC values from your email provider
2. Add those records in Route 53 hosted zone `solarvy.ng`
3. Do **not** remove mail records for `.net` until mail is fully migrated

If email stays on `.net` for now, **skip this step**.

---

## Final checklist

- [ ] Route 53 hosted zone exists for `solarvy.ng`
- [ ] Domain King nameservers point to Route 53 (NS check passes)
- [ ] ACM certificate **Issued** for `.ng` (in `us-east-1`)
- [ ] CloudFront has `www.solarvy.ng` + `solarvy.ng`
- [ ] Route 53 records: apex, `www`, `api`
- [ ] `https://www.solarvy.ng` works over HTTPS
- [ ] Apex `solarvy.ng` 301s to www
- [ ] Frontend built with `VITE_API_URL=https://api.solarvy.ng`
- [ ] Backend `FRONTEND_URL` includes `.ng`; API restarted
- [ ] No CORS errors in the browser
- [ ] Old `.net` 301s to `.ng`
- [ ] Search Console updated

---

## If something breaks

| Problem | Likely cause | Fix |
|---------|----------------|-----|
| Certificate stuck on Pending validation | Nameservers not on Route 53 yet, or validation CNAME missing | Fix Domain King NS; use ACM “Create records in Route 53”; wait |
| Browser certificate error | Hostname not on cert, or CloudFront still on old cert | Attach Issued cert covering that hostname; wait for Deployed |
| Site loads but API fails / CORS | Backend still only allows `.net` | Update `FRONTEND_URL` + CORS; restart API |
| www works, apex does not | Missing apex Alias record | Add blank-name A-Alias to CloudFront in Route 53 |
| Old content after deploy | CloudFront cache | Create invalidation `/*` |
| NS still shows Domain King | Nameserver change not saved or not propagated | Re-check Domain King; wait; re-run `nslookup -type=NS solarvy.ng` |

---

## What you are NOT changing

- S3 upload workflow (`npm run build` → upload `dist/`)
- Overall CloudFront + Route 53 architecture
- Database

You are only pointing **solarvy.ng** at the same stack and updating URLs in config/code.

---

## Quick cutover day order

1. Route 53 hosted zone + Domain King nameservers  
2. ACM certificate → wait until **Issued**  
3. CloudFront CNAMEs + cert → wait until **Deployed**  
4. Route 53 records: `www`, apex, `api`  
5. Apex → www CloudFront function  
6. Code/env → `.ng`  
7. Build + upload + invalidate  
8. Restart API  
9. Test `.ng` fully  
10. Turn on `.net` → `.ng` redirects  
11. Search Console  

**Done.**
