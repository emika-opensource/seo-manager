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


## Browser & Screenshots (Playwright)

Playwright and Chromium are pre-installed. Use them for browsing websites, taking screenshots, scraping content, and testing.

```bash
# Quick screenshot
npx playwright screenshot --full-page https://example.com screenshot.png

# In Node.js
const { chromium } = require("playwright");
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto("https://example.com");
await page.screenshot({ path: "screenshot.png", fullPage: true });
await browser.close();
```

Do NOT install Puppeteer or download Chromium — Playwright is already here and ready to use.
