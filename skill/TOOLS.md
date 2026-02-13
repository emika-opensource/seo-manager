# SEO Manager — API Reference

Base URL: `http://localhost:3000`

## Sites
| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| GET | /api/sites | - | List all sites |
| POST | /api/sites | { name, url, cms } | Add site |
| PUT | /api/sites | { id, ...fields } | Update site |
| DELETE | /api/sites | { id } | Delete site |

## Audits
| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| GET | /api/audits?siteId= | - | List audits |
| GET | /api/audits/:id | - | Audit detail |
| POST | /api/audits | { siteId, score, categories, summary } | Create audit |
| POST | /api/audits/quick-check | { url } | Quick URL analysis (fetches page, checks meta/headings/schema/performance) |

## Issues
| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| GET | /api/issues?category=&severity=&status= | - | List (filterable) |
| GET | /api/issues/summary | - | Counts by category/severity/status |
| POST | /api/issues | { siteId, title, description, category, severity, fix, url } | Create |
| PUT | /api/issues | { id, status, ...fields } | Update |
| DELETE | /api/issues | { id } | Delete |

## Content
| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| GET | /api/content?siteId= | - | List content |
| POST | /api/content | { title, type, targetKeywords, content, metaTitle, metaDescription, slug } | Create |
| PUT | /api/content | { id, ...fields } | Update |
| DELETE | /api/content | { id } | Delete |
| POST | /api/content/analyze | { content, targetKeywords, metaTitle, metaDescription } | SEO analysis |
| GET | /api/content/suggestions | - | Content ideas |

## Keywords
| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| GET | /api/keywords?siteId= | - | List keywords |
| POST | /api/keywords | { keyword, volume, difficulty, currentPosition, intent, clusterId } | Track keyword |
| DELETE | /api/keywords | { id } | Remove |
| GET | /api/keywords/clusters | - | Keyword clusters |

## Links
| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| GET | /api/links?siteId=&type= | - | List links |
| POST | /api/links | { sourceUrl, sourceDomain, targetUrl, type, anchorText, domainAuthority } | Add |
| PUT | /api/links | { id, ...fields } | Update |
| DELETE | /api/links | { id } | Delete |
| GET | /api/links/opportunities | - | Opportunities |
| POST | /api/links/outreach | { sourceUrl, sourceDomain, targetUrl, contactEmail, notes } | Track outreach |

## Other
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/integrations/guides | Setup guides for GA4, GSC, SEMrush, Ahrefs, Moz, WordPress, Shopify, Webflow, Wix, Squarespace |
| GET/PUT | /api/config | Settings (API keys, preferences) |
| GET | /api/analytics | Dashboard overview data |

## Screenshots & File Sharing

### Taking Screenshots
Use Playwright (pre-installed) to capture any website:
```bash
npx playwright screenshot --browser chromium https://example.com /tmp/screenshot.png
```

If Chromium is not installed yet, install it first:
```bash
npx playwright install chromium
```

### Sharing Files & Images with the User
Upload to the Emika API to get a shareable URL:
```bash
# Get your seat token
TOKEN=$(python3 -c "import json; print(json.load(open('/home/node/.openclaw/openclaw.json'))['gateway']['auth']['token'])")

# Upload any file
URL=$(curl -s -X POST "http://162.55.102.58:8080/uploads/seat" \
  -H "X-Seat-Token: $TOKEN" \
  -F "file=@/tmp/screenshot.png" | python3 -c "import sys,json; print(json.load(sys.stdin)['full_url'])")

# Include the URL in your response as markdown image
echo "![Screenshot]($URL)"
```

**IMPORTANT:**
- Do NOT use the `read` tool on image files — it sends the image to the AI model but does NOT display it to the user
- Always upload files and share the URL instead
- The URL format is `https://api.emika.ai/uploads/seats/<filename>`
- Supports: images, PDFs, documents, code files, archives (max 50MB)
