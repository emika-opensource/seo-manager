# SEO Manager — Audit Report

**Date:** 2026-02-11
**Auditor:** AI Subagent
**Verdict:** Solid foundation, but time-to-first-value is gated behind a 10-question interrogation and zero automation.

---

## 1. First-Run Experience

**Rating: 4/10 — Too slow to value.**

What happens when a new user opens the dashboard:

1. They see a dashboard with **all zeros** — score 0, 0 issues, 0 keywords, 0 backlinks. No onboarding wizard, no welcome modal, no guided tour.
2. The subtitle says "Add a site to get started" but there's **no button on the dashboard** to add a site. User must navigate to Settings to add one.
3. BOOTSTRAP.md asks **10 questions** before doing anything. That's a wall. Most users will bounce after question 3.
4. After the AI gathers answers and runs a quick-check, the user gets their first value. That's **5-10 minutes minimum** of back-and-forth chat before seeing anything useful.
5. The quick-check URL audit is actually the killer feature — instant, tangible value — but it's buried in the Audits page, not front and center.

**Steps to first value:** Navigate to Settings → Add site URL → Go to Audits → Enter URL again → Click Quick Check → See results. That's **6+ steps** across 3 pages.

**Should be:** Paste URL → See results. One step.

## 2. UI/UX Issues

**Rating: 6/10 — Clean but passive.**

### Good
- Dark theme is polished and professional
- Score gauges, charts, severity badges are well-designed
- Content editor with live SERP preview and keyword density is genuinely useful
- Responsive breakpoints exist

### Problems
- **Empty states are dead ends.** Dashboard shows zeros with no CTA. Issues page shows "No open issues" with no guidance. Keywords shows empty table. No "here's what to do next" anywhere.
- **No loading indicators.** API calls have no spinners or skeleton screens. Quick check shows "Analyzing..." text but that's the only loading state in the entire app.
- **Mobile sidebar has no hamburger button.** CSS hides sidebar on mobile with `transform: translateX(-100%)` and adds `.open` class, but there's no toggle button in the HTML. Mobile is completely broken — user can't navigate.
- **"Run Full Audit" button does the same thing as Quick Check.** `runNewAudit()` just calls `runQuickCheck()`. Misleading label.
- **No confirmation on destructive actions.** Delete keyword/link buttons have no confirmation dialog. "Reset All Data" has a `confirm()` but individual deletes don't.
- **Integrations page is read-only guides**, not actual integrations. User might expect to connect their GA4/GSC accounts. The page should be labeled "Setup Guides" not "Integrations."
- **No toast/notification system.** Save actions flash button text to "Saved!" for 1.5s — easy to miss.
- **Settings page requires entering site URL, then entering it again on Audits page.** Redundant.
- **Content suggestions are hardcoded placeholders** with `[Your Primary Keyword]` brackets. Useless without customization.

## 3. Feature Completeness

**Rating: 5/10 — Wide but shallow.**

| Feature | Status | Notes |
|---------|--------|-------|
| Quick URL Check | ✅ Working | Actually fetches and analyzes HTML. Best feature. |
| Site Management | ✅ Working | CRUD operations work |
| Issue Tracker | ✅ Working | Filters, status updates, manual creation |
| Content Editor | ✅ Working | Real-time analysis, SERP preview, keyword density |
| Content Analysis | ✅ Working | Server-side scoring with useful feedback |
| Keywords | ⚠️ Manual only | No auto-fetching from any API. All data manually entered. |
| Links/Backlinks | ⚠️ Manual only | No crawling or discovery. All manually entered. |
| Score History | ⚠️ Requires multiple audits | Chart is empty until 2+ audits exist |
| Integration Guides | ✅ Working | Comprehensive static guides |
| Actual Integrations | ❌ None | No GA4, GSC, SEMrush, or Ahrefs API connections |
| Content Suggestions | ❌ Hardcoded | Static array of template suggestions |
| Link Opportunities | ❌ Empty | Just filters existing links by type |
| Keyword Research | ❌ Missing | No keyword suggestion/discovery feature |
| Competitor Analysis | ❌ Missing | Mentioned in SKILL.md but not implemented |
| Scheduled Audits | ❌ Missing | No recurring audit capability |
| Export/Reports | ❌ Missing | No PDF/CSV export |

**multer** is in package.json dependencies but never used anywhere — dead dependency.

## 4. Error Handling

**Rating: 4/10 — Fragile.**

- **Server-side:** Minimal. `loadData` silently returns `[]` on any error. `new URL()` in site creation can throw but isn't wrapped in try/catch. Quick-check has a try/catch but other endpoints don't.
- **Client-side:** Most `api.post/put` calls have no error handling. `saveContent`, `saveKeyword`, `saveLink` all assume success. Network failures silently fail.
- **No input validation on server.** POST `/api/sites` accepts empty name/URL. POST `/api/issues` accepts empty title. No URL format validation.
- **No rate limiting.** Quick-check endpoint fetches arbitrary URLs — could be abused for SSRF if exposed publicly.
- **Empty states exist but are uninformative.** "No audits yet" is better than a blank page, but doesn't guide the user.
- **`clearAllData` deletes items one by one** via individual API calls in a loop. No bulk delete endpoint. Slow and fragile for large datasets.

## 5. Code Quality

**Rating: 6/10 — Clean but has issues.**

### Good
- Single-file frontend is surprisingly readable and well-organized
- Consistent code style, logical grouping by feature
- Helper functions are reusable (scoreGauge, badges, charts)
- Data layer is simple and works (JSON files)

### Problems
- **All functions pollute `window` scope.** Every handler is `window.functionName = async function()`. No module system, no encapsulation.
- **XSS via `JSON.stringify` in onclick handler.** `saveQuickCheckAsAudit` passes full JSON into an onclick attribute: `onclick="saveQuickCheckAsAudit(${JSON.stringify(r).replace(/"/g, '&quot;')})"`. If audit data contains crafted strings, this is exploitable.
- **No CSRF protection.** DELETE operations use request body (not URL params), which is unconventional and unsupported by some HTTP clients/proxies.
- **DELETE with request body is non-standard.** Many proxies strip DELETE bodies. Should use URL params or POST.
- **`node-fetch` v2 is used** — v3 is ESM-only which is fine, but v2 is unmaintained.
- **No request size limits per endpoint.** Global 10MB JSON limit but no per-route validation.
- **SSRF risk:** `/api/audits/quick-check` fetches any URL the user provides. Could probe internal network (e.g., `http://169.254.169.254/` for cloud metadata).
- **File-based storage** won't survive concurrent writes. Race conditions possible with simultaneous requests.
- **`genId()`** uses `Date.now()` + random — not cryptographically secure but adequate for this use case.

## 6. BOOTSTRAP.md Quality

**Rating: 5/10 — Thorough but counterproductive.**

The 10-question interview is comprehensive but **kills time-to-first-value**. It asks about competitors, target audience, geography, content capacity — information that's useful but not needed to deliver initial value.

**What it does well:**
- Clear structure of what happens after onboarding
- Sets expectations about ongoing support
- Covers the right topics

**What's wrong:**
- Asks 10 questions before doing anything. Should be 2-3 max, then iterate.
- Doesn't tell the AI to run the quick-check immediately after getting the URL (question 1)
- Could front-load value: get URL → run audit → show results → then ask follow-up questions
- No mention of pointing the user to the dashboard or explaining the UI

**Recommended structure:**
1. Ask for URL (that's it)
2. Run quick-check immediately, save as audit, create issues
3. Show results, explain top 3 issues
4. Then ask follow-up questions (CMS, goals, keywords) as needed

## 7. SKILL.md Quality

**Rating: 8/10 — Genuinely excellent.**

This is the strongest part of the project. It's a comprehensive SEO knowledge base that would make the AI agent legitimately useful.

**Strengths:**
- Covers technical SEO, on-page, off-page, AEO/GEO, content strategy thoroughly
- CMS-specific guidance for 5 platforms with actionable detail
- Anti-spam stance (explicitly warns against PBNs, paid links)
- API reference is complete and accurate
- AEO/GEO section is forward-looking and differentiating

**Weaknesses:**
- Could reference the dashboard UI more ("tell the user to check the Issues tab")
- Doesn't mention the limitations (manual keyword entry, no real integrations)
- Should have a "quick wins" section — the top 5 things to fix on any site

## 8. Specific Improvements (Ranked by Impact)

### Critical — Time-to-First-Value

1. **Add a URL input bar directly on the Dashboard empty state.** When no site exists, show a big "Paste your website URL to get started" input with a "Run Audit" button. One step to first value. This is the single highest-impact change.

2. **Restructure BOOTSTRAP.md to front-load value.** Ask for URL first, run audit immediately, show results, then ask follow-up questions. Cut initial questions from 10 to 1.

3. **Auto-create site from quick-check.** When a quick-check runs and no site exists, auto-create the site entry. Don't make the user go to Settings first.

4. **Fix mobile navigation.** Add a hamburger menu button. Currently mobile users can't access any page. Completely broken.

### High Impact — User Experience

5. **Add empty state CTAs on every page.** Issues: "Run an audit to discover issues." Keywords: "Add your first keyword to start tracking." Links: "Add a backlink to start monitoring." Every empty page should tell the user what to do.

6. **Add a loading spinner component.** Show it during API calls, especially the quick-check which takes 1-15 seconds.

7. **Replace "Integrations" label with "Setup Guides"** or add a banner clarifying these are instructions, not OAuth connections.

8. **Add confirmation dialogs to all delete actions**, not just "Reset All Data."

9. **Make content suggestions dynamic.** Use the site's domain/keywords to customize suggestions instead of `[Your Primary Keyword]` placeholders.

### Medium Impact — Feature Gaps

10. **Add a "Re-audit" button on the dashboard** that runs quick-check on the saved site URL. One click to refresh the score.

11. **Add export to CSV/PDF** for audit results and issue lists. Users need to share these with teams.

12. **Add a site selector** if multiple sites are supported (the data model allows it but the UI always uses `sites[0]`).

13. **Remove multer from dependencies** — unused dead weight.

14. **Add server-side URL validation** on the quick-check endpoint. Reject private/internal IPs to prevent SSRF.

### Low Impact — Code Quality

15. **Fix the XSS vector** in `saveQuickCheckAsAudit` onclick handler. Store data in a variable instead of serializing into HTML attributes.

16. **Switch DELETE endpoints to use query params** instead of request body for better proxy compatibility.

17. **Add basic request validation middleware** — reject empty titles, invalid URLs, etc.

18. **Add error handling to all client-side API calls** with user-visible error messages.

19. **Consider migrating to SQLite** instead of JSON files to handle concurrent access properly.

20. **Add a simple toast notification system** for save/delete/error feedback instead of button text flashing.

---

## Summary

The SEO Manager has a **solid technical foundation** and an **excellent knowledge base** (SKILL.md). The quick-check audit feature is genuinely useful and provides real value. The Content Studio with live analysis is well-built.

The critical problem is **time-to-first-value is way too high**. A new user faces a blank dashboard, a 10-question interview, and multi-page navigation before seeing anything useful. The fix is straightforward: put a URL input on the dashboard, run the audit immediately, and show results. That single change transforms the experience from "blank canvas with questions" to "paste URL, get insights in 10 seconds."

Secondary issues are the manual-only keyword/link tracking (users expect some automation) and the misleading "Integrations" section (guides, not connections). These are less urgent but set incorrect expectations.

**Bottom line:** 2-3 hours of work on items #1-4 would dramatically improve the first-run experience. The rest is polish.
