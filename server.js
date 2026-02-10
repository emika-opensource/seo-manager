const express = require('express');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// Data directory
const DATA_DIR = fs.existsSync('/home/node/emika/seo-hub') ? '/home/node/emika/seo-hub' : path.join(__dirname, 'data');
fs.ensureDirSync(DATA_DIR);

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ─── Helpers ───
function loadData(file) {
  const p = path.join(DATA_DIR, file);
  try { return fs.readJsonSync(p); } catch { return []; }
}
function saveData(file, data) {
  fs.writeJsonSync(path.join(DATA_DIR, file), data, { spaces: 2 });
}
function loadConfig() {
  try { return fs.readJsonSync(path.join(DATA_DIR, 'config.json')); } catch { return {}; }
}
function saveConfig(cfg) {
  fs.writeJsonSync(path.join(DATA_DIR, 'config.json'), cfg, { spaces: 2 });
}
function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

// ─── SITES ───
app.get('/api/sites', (req, res) => res.json(loadData('sites.json')));
app.post('/api/sites', (req, res) => {
  const sites = loadData('sites.json');
  const site = {
    id: genId(), name: req.body.name || '', url: req.body.url || '',
    domain: req.body.domain || (req.body.url ? new URL(req.body.url).hostname : ''),
    cms: req.body.cms || 'custom', currentScore: req.body.currentScore || 0,
    previousScore: 0, scoreHistory: [], lastAudit: null,
    integrations: { googleAnalytics: false, searchConsole: false, semrush: false },
    createdAt: new Date().toISOString()
  };
  sites.push(site);
  saveData('sites.json', sites);
  res.json(site);
});
app.put('/api/sites', (req, res) => {
  const sites = loadData('sites.json');
  const idx = sites.findIndex(s => s.id === req.body.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  sites[idx] = { ...sites[idx], ...req.body };
  saveData('sites.json', sites);
  res.json(sites[idx]);
});
app.delete('/api/sites', (req, res) => {
  let sites = loadData('sites.json');
  sites = sites.filter(s => s.id !== req.body.id);
  saveData('sites.json', sites);
  res.json({ ok: true });
});

// ─── AUDITS ───
app.get('/api/audits', (req, res) => {
  let audits = loadData('audits.json');
  if (req.query.siteId) audits = audits.filter(a => a.siteId === req.query.siteId);
  res.json(audits);
});
app.get('/api/audits/:id', (req, res) => {
  const audits = loadData('audits.json');
  const a = audits.find(x => x.id === req.params.id);
  if (!a) return res.status(404).json({ error: 'Not found' });
  res.json(a);
});
app.post('/api/audits', (req, res) => {
  const audits = loadData('audits.json');
  const audit = {
    id: genId(), siteId: req.body.siteId || '', score: req.body.score || 0,
    categories: req.body.categories || {
      technical: { score: 0, issues: [] }, content: { score: 0, issues: [] },
      onPage: { score: 0, issues: [] }, offPage: { score: 0, issues: [] },
      performance: { score: 0, issues: [] }, aeo: { score: 0, issues: [] }
    },
    summary: req.body.summary || '', createdAt: new Date().toISOString()
  };
  audits.push(audit);
  saveData('audits.json', audits);
  // Update site score
  if (audit.siteId) {
    const sites = loadData('sites.json');
    const si = sites.findIndex(s => s.id === audit.siteId);
    if (si !== -1) {
      sites[si].previousScore = sites[si].currentScore;
      sites[si].currentScore = audit.score;
      sites[si].lastAudit = audit.createdAt;
      sites[si].scoreHistory.push({ score: audit.score, date: audit.createdAt });
      saveData('sites.json', sites);
    }
  }
  res.json(audit);
});

// Quick check - actually fetches URL and analyzes
app.post('/api/audits/quick-check', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL required' });
  try {
    const startTime = Date.now();
    const response = await fetch(url, {
      headers: { 'User-Agent': 'EmikaBot/1.0 SEO Checker' },
      timeout: 15000, redirect: 'follow'
    });
    const loadTime = Date.now() - startTime;
    const html = await response.text();
    const issues = [];
    let techScore = 100, contentScore = 100, onPageScore = 100, perfScore = 100, aeoScore = 100, offPageScore = 50;

    // Meta title
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : '';
    if (!title) { issues.push({ cat: 'onPage', sev: 'critical', title: 'Missing page title', fix: 'Add a <title> tag with primary keyword' }); onPageScore -= 20; }
    else if (title.length > 60) { issues.push({ cat: 'onPage', sev: 'medium', title: `Title too long (${title.length} chars)`, fix: 'Keep title under 60 characters' }); onPageScore -= 5; }
    else if (title.length < 20) { issues.push({ cat: 'onPage', sev: 'low', title: `Title too short (${title.length} chars)`, fix: 'Expand title to 30-60 characters with keywords' }); onPageScore -= 3; }

    // Meta description
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) ||
                       html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);
    const desc = descMatch ? descMatch[1].trim() : '';
    if (!desc) { issues.push({ cat: 'onPage', sev: 'high', title: 'Missing meta description', fix: 'Add a meta description tag (120-160 chars) with CTA' }); onPageScore -= 15; }
    else if (desc.length > 160) { issues.push({ cat: 'onPage', sev: 'low', title: `Meta description too long (${desc.length} chars)`, fix: 'Keep under 160 characters' }); onPageScore -= 3; }

    // H1
    const h1s = html.match(/<h1[^>]*>[\s\S]*?<\/h1>/gi) || [];
    if (h1s.length === 0) { issues.push({ cat: 'content', sev: 'high', title: 'Missing H1 heading', fix: 'Add one H1 tag with primary keyword' }); contentScore -= 15; }
    else if (h1s.length > 1) { issues.push({ cat: 'content', sev: 'medium', title: `Multiple H1 tags (${h1s.length})`, fix: 'Use only one H1 per page' }); contentScore -= 5; }

    // H2s
    const h2s = html.match(/<h2[^>]*>[\s\S]*?<\/h2>/gi) || [];
    if (h2s.length === 0) { issues.push({ cat: 'content', sev: 'medium', title: 'No H2 headings found', fix: 'Add H2 headings to structure content' }); contentScore -= 10; }

    // Images without alt
    const imgs = html.match(/<img[^>]*>/gi) || [];
    const noAlt = imgs.filter(i => !i.match(/alt=["'][^"']+["']/i));
    if (noAlt.length > 0) { issues.push({ cat: 'onPage', sev: 'medium', title: `${noAlt.length} images missing alt text`, fix: 'Add descriptive alt attributes to all images' }); onPageScore -= Math.min(15, noAlt.length * 2); }

    // HTTPS
    const isHttps = url.startsWith('https://');
    if (!isHttps) { issues.push({ cat: 'technical', sev: 'critical', title: 'Not using HTTPS', fix: 'Install SSL certificate and redirect HTTP to HTTPS' }); techScore -= 25; }

    // Viewport meta
    const hasViewport = /<meta[^>]*name=["']viewport["']/i.test(html);
    if (!hasViewport) { issues.push({ cat: 'technical', sev: 'high', title: 'Missing viewport meta tag', fix: 'Add <meta name="viewport" content="width=device-width, initial-scale=1">' }); techScore -= 15; }

    // Canonical
    const hasCanonical = /<link[^>]*rel=["']canonical["']/i.test(html);
    if (!hasCanonical) { issues.push({ cat: 'technical', sev: 'medium', title: 'Missing canonical tag', fix: 'Add <link rel="canonical" href="..."> to prevent duplicate content' }); techScore -= 8; }

    // Schema/structured data
    const hasSchema = /application\/ld\+json/i.test(html);
    if (!hasSchema) { issues.push({ cat: 'aeo', sev: 'high', title: 'No structured data (JSON-LD)', fix: 'Add JSON-LD schema markup for your content type (Article, Product, FAQ, etc.)' }); aeoScore -= 20; }

    // Open Graph
    const hasOG = /<meta[^>]*property=["']og:/i.test(html);
    if (!hasOG) { issues.push({ cat: 'onPage', sev: 'low', title: 'Missing Open Graph tags', fix: 'Add og:title, og:description, og:image for social sharing' }); onPageScore -= 5; }

    // FAQ schema for AEO
    const hasFAQ = /FAQPage/i.test(html);
    if (!hasFAQ) { issues.push({ cat: 'aeo', sev: 'medium', title: 'No FAQ schema found', fix: 'Add FAQ structured data to help AI engines cite your content' }); aeoScore -= 10; }

    // Performance
    if (loadTime > 3000) { issues.push({ cat: 'performance', sev: 'high', title: `Slow response time (${loadTime}ms)`, fix: 'Optimize server response time, enable caching, use CDN' }); perfScore -= 20; }
    else if (loadTime > 1500) { issues.push({ cat: 'performance', sev: 'medium', title: `Moderate response time (${loadTime}ms)`, fix: 'Consider server-side caching and CDN' }); perfScore -= 10; }

    // HTML size
    const htmlSize = Buffer.byteLength(html, 'utf8');
    if (htmlSize > 500000) { issues.push({ cat: 'performance', sev: 'medium', title: `Large HTML size (${(htmlSize/1024).toFixed(0)}KB)`, fix: 'Minimize HTML, remove inline scripts/styles' }); perfScore -= 10; }

    // Robots meta
    const noindex = /<meta[^>]*content=["'][^"']*noindex[^"']*["']/i.test(html);
    if (noindex) { issues.push({ cat: 'technical', sev: 'critical', title: 'Page is set to noindex', fix: 'Remove noindex directive if this page should be indexed' }); techScore -= 30; }

    // Internal links
    const links = html.match(/<a[^>]*href=["'][^"']*["']/gi) || [];
    if (links.length < 3) { issues.push({ cat: 'content', sev: 'medium', title: 'Very few links on page', fix: 'Add internal links to related content' }); contentScore -= 8; }

    // Lang attribute
    const hasLang = /<html[^>]*lang=["']/i.test(html);
    if (!hasLang) { issues.push({ cat: 'technical', sev: 'low', title: 'Missing lang attribute on <html>', fix: 'Add lang="en" (or appropriate language) to <html> tag' }); techScore -= 3; }

    // Clamp scores
    const clamp = v => Math.max(0, Math.min(100, v));
    techScore = clamp(techScore); contentScore = clamp(contentScore);
    onPageScore = clamp(onPageScore); perfScore = clamp(perfScore);
    aeoScore = clamp(aeoScore); offPageScore = clamp(offPageScore);

    const overall = Math.round((techScore + contentScore + onPageScore + offPageScore + perfScore + aeoScore) / 6);

    const catIssues = cat => issues.filter(i => i.cat === cat).map(i => ({ title: i.title, severity: i.sev, fix: i.fix }));

    res.json({
      url, score: overall, loadTime, title, description: desc, htmlSize,
      categories: {
        technical: { score: techScore, issues: catIssues('technical') },
        content: { score: contentScore, issues: catIssues('content') },
        onPage: { score: onPageScore, issues: catIssues('onPage') },
        offPage: { score: offPageScore, issues: catIssues('offPage') },
        performance: { score: perfScore, issues: catIssues('performance') },
        aeo: { score: aeoScore, issues: catIssues('aeo') }
      },
      totalIssues: issues.length
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch URL: ' + err.message });
  }
});

// ─── ISSUES ───
app.get('/api/issues/summary', (req, res) => {
  const issues = loadData('issues.json');
  const byCategory = {}, bySeverity = {}, byStatus = {};
  issues.forEach(i => {
    byCategory[i.category] = (byCategory[i.category] || 0) + 1;
    bySeverity[i.severity] = (bySeverity[i.severity] || 0) + 1;
    byStatus[i.status] = (byStatus[i.status] || 0) + 1;
  });
  res.json({ total: issues.length, byCategory, bySeverity, byStatus });
});
app.get('/api/issues', (req, res) => {
  let issues = loadData('issues.json');
  if (req.query.siteId) issues = issues.filter(i => i.siteId === req.query.siteId);
  if (req.query.category) issues = issues.filter(i => i.category === req.query.category);
  if (req.query.severity) issues = issues.filter(i => i.severity === req.query.severity);
  if (req.query.status) issues = issues.filter(i => i.status === req.query.status);
  res.json(issues);
});
app.post('/api/issues', (req, res) => {
  const issues = loadData('issues.json');
  const issue = {
    id: genId(), siteId: req.body.siteId || '', auditId: req.body.auditId || null,
    title: req.body.title || '', description: req.body.description || '',
    category: req.body.category || 'technical', severity: req.body.severity || 'medium',
    status: req.body.status || 'open', fix: req.body.fix || '', impact: req.body.impact || '',
    url: req.body.url || '', priority: req.body.priority || 5,
    assignedTo: req.body.assignedTo || '', fixedAt: null,
    createdAt: new Date().toISOString()
  };
  issues.push(issue);
  saveData('issues.json', issues);
  res.json(issue);
});
app.put('/api/issues', (req, res) => {
  const issues = loadData('issues.json');
  const idx = issues.findIndex(i => i.id === req.body.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  if (req.body.status === 'fixed' && issues[idx].status !== 'fixed') req.body.fixedAt = new Date().toISOString();
  issues[idx] = { ...issues[idx], ...req.body };
  saveData('issues.json', issues);
  res.json(issues[idx]);
});
app.delete('/api/issues', (req, res) => {
  let issues = loadData('issues.json');
  issues = issues.filter(i => i.id !== req.body.id);
  saveData('issues.json', issues);
  res.json({ ok: true });
});

// ─── CONTENT ───
app.get('/api/content', (req, res) => {
  let content = loadData('content.json');
  if (req.query.siteId) content = content.filter(c => c.siteId === req.query.siteId);
  res.json(content);
});
app.post('/api/content', (req, res) => {
  const content = loadData('content.json');
  const item = {
    id: genId(), siteId: req.body.siteId || '', title: req.body.title || '',
    type: req.body.type || 'blog-post', targetKeywords: req.body.targetKeywords || [],
    content: req.body.content || '', metaTitle: req.body.metaTitle || '',
    metaDescription: req.body.metaDescription || '', slug: req.body.slug || '',
    wordCount: req.body.wordCount || 0, readabilityScore: req.body.readabilityScore || 0,
    seoScore: req.body.seoScore || 0, status: req.body.status || 'draft',
    url: req.body.url || '', createdAt: new Date().toISOString()
  };
  content.push(item);
  saveData('content.json', content);
  res.json(item);
});
app.put('/api/content', (req, res) => {
  const content = loadData('content.json');
  const idx = content.findIndex(c => c.id === req.body.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  content[idx] = { ...content[idx], ...req.body };
  saveData('content.json', content);
  res.json(content[idx]);
});
app.delete('/api/content', (req, res) => {
  let content = loadData('content.json');
  content = content.filter(c => c.id !== req.body.id);
  saveData('content.json', content);
  res.json({ ok: true });
});

// Content analysis
app.post('/api/content/analyze', (req, res) => {
  const { content, targetKeywords, metaTitle, metaDescription } = req.body;
  if (!content) return res.json({ seoScore: 0, issues: ['No content provided'] });

  const text = content.replace(/<[^>]*>/g, '').replace(/[#*_`\[\]]/g, '');
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const avgWordsPerSentence = sentences.length ? wordCount / sentences.length : 0;

  let score = 50;
  const feedback = [];

  // Word count
  if (wordCount > 1500) { score += 10; feedback.push({ type: 'good', msg: `Good content length (${wordCount} words)` }); }
  else if (wordCount > 800) { score += 5; feedback.push({ type: 'ok', msg: `Decent length (${wordCount} words), aim for 1500+` }); }
  else { feedback.push({ type: 'bad', msg: `Content too short (${wordCount} words), aim for 1500+` }); score -= 10; }

  // Readability (simple Flesch-like)
  const readability = Math.max(0, Math.min(100, 206.835 - 1.015 * avgWordsPerSentence));

  // Keyword density
  const kwDensities = [];
  if (targetKeywords && targetKeywords.length > 0) {
    targetKeywords.forEach(kw => {
      const keyword = (kw.keyword || kw).toLowerCase();
      const regex = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      const count = (text.match(regex) || []).length;
      const density = wordCount > 0 ? (count / wordCount) * 100 : 0;
      kwDensities.push({ keyword, count, density: Math.round(density * 100) / 100 });
      if (density >= 1 && density <= 3) { score += 5; feedback.push({ type: 'good', msg: `Good keyword density for "${keyword}" (${density.toFixed(1)}%)` }); }
      else if (density > 3) { score -= 5; feedback.push({ type: 'bad', msg: `Keyword stuffing for "${keyword}" (${density.toFixed(1)}%)` }); }
      else if (density > 0) { feedback.push({ type: 'ok', msg: `Low density for "${keyword}" (${density.toFixed(1)}%), aim for 1-3%` }); }
      else { score -= 5; feedback.push({ type: 'bad', msg: `Keyword "${keyword}" not found in content` }); }
    });
  }

  // Headings
  const h1Count = (content.match(/^#\s/gm) || []).length + (content.match(/<h1/gi) || []).length;
  const h2Count = (content.match(/^##\s/gm) || []).length + (content.match(/<h2/gi) || []).length;
  if (h2Count >= 2) { score += 5; feedback.push({ type: 'good', msg: `Good heading structure (${h2Count} H2s)` }); }
  else { feedback.push({ type: 'bad', msg: 'Add more H2 headings for structure' }); score -= 5; }

  // Meta title
  if (metaTitle) {
    if (metaTitle.length <= 60 && metaTitle.length >= 30) { score += 5; feedback.push({ type: 'good', msg: 'Meta title length is optimal' }); }
    else { feedback.push({ type: 'ok', msg: `Meta title is ${metaTitle.length} chars (aim for 30-60)` }); }
  } else { score -= 5; feedback.push({ type: 'bad', msg: 'Missing meta title' }); }

  // Meta description
  if (metaDescription) {
    if (metaDescription.length <= 160 && metaDescription.length >= 120) { score += 5; feedback.push({ type: 'good', msg: 'Meta description length is optimal' }); }
    else { feedback.push({ type: 'ok', msg: `Meta description is ${metaDescription.length} chars (aim for 120-160)` }); }
  } else { score -= 5; feedback.push({ type: 'bad', msg: 'Missing meta description' }); }

  // Links
  const linkCount = (content.match(/\[.*?\]\(.*?\)/g) || []).length + (content.match(/<a\s/gi) || []).length;
  if (linkCount >= 3) { score += 5; feedback.push({ type: 'good', msg: `Good internal/external linking (${linkCount} links)` }); }
  else { feedback.push({ type: 'ok', msg: 'Add more internal and external links' }); }

  score = Math.max(0, Math.min(100, score));

  res.json({ seoScore: score, wordCount, readability: Math.round(readability), avgWordsPerSentence: Math.round(avgWordsPerSentence), keywordDensities: kwDensities, headings: { h1: h1Count, h2: h2Count }, linkCount, feedback });
});

app.get('/api/content/suggestions', (req, res) => {
  res.json([
    { title: 'Ultimate Guide to [Your Primary Keyword]', type: 'pillar-page', reason: 'Pillar content establishes topical authority' },
    { title: 'How to [Solve Common Problem] in 2026', type: 'blog-post', reason: 'How-to content ranks well and gets AI citations' },
    { title: '[Your Product] vs [Competitor]: Complete Comparison', type: 'blog-post', reason: 'Comparison content captures commercial intent keywords' },
    { title: 'FAQ: Everything About [Topic]', type: 'faq', reason: 'FAQ pages with schema markup get featured snippets and AI citations' },
    { title: '[Industry] Statistics and Trends 2026', type: 'blog-post', reason: 'Data-driven content earns backlinks and citations' },
    { title: 'Step-by-Step [Process] Tutorial', type: 'blog-post', reason: 'Tutorial content with HowTo schema ranks for long-tail queries' }
  ]);
});

// ─── KEYWORDS ───
app.get('/api/keywords', (req, res) => {
  let kws = loadData('keywords.json');
  if (req.query.siteId) kws = kws.filter(k => k.siteId === req.query.siteId);
  res.json(kws);
});
app.post('/api/keywords', (req, res) => {
  const kws = loadData('keywords.json');
  const kw = {
    id: genId(), siteId: req.body.siteId || '', keyword: req.body.keyword || '',
    volume: req.body.volume || 0, difficulty: req.body.difficulty || 0,
    currentPosition: req.body.currentPosition || null, previousPosition: req.body.previousPosition || null,
    trend: req.body.trend || 'stable', intent: req.body.intent || 'informational',
    clusterId: req.body.clusterId || null, url: req.body.url || '',
    lastChecked: new Date().toISOString()
  };
  kws.push(kw);
  saveData('keywords.json', kws);
  res.json(kw);
});
app.delete('/api/keywords', (req, res) => {
  let kws = loadData('keywords.json');
  kws = kws.filter(k => k.id !== req.body.id);
  saveData('keywords.json', kws);
  res.json({ ok: true });
});
app.get('/api/keywords/clusters', (req, res) => {
  const kws = loadData('keywords.json');
  const clusters = {};
  kws.forEach(k => {
    const cid = k.clusterId || 'unclustered';
    if (!clusters[cid]) clusters[cid] = { id: cid, keywords: [] };
    clusters[cid].keywords.push(k);
  });
  res.json(Object.values(clusters));
});

// ─── LINKS ───
app.get('/api/links', (req, res) => {
  let links = loadData('links.json');
  if (req.query.siteId) links = links.filter(l => l.siteId === req.query.siteId);
  if (req.query.type) links = links.filter(l => l.type === req.query.type);
  res.json(links);
});
app.post('/api/links', (req, res) => {
  const links = loadData('links.json');
  const link = {
    id: genId(), siteId: req.body.siteId || '', sourceUrl: req.body.sourceUrl || '',
    sourceDomain: req.body.sourceDomain || '', targetUrl: req.body.targetUrl || '',
    type: req.body.type || 'backlink', status: req.body.status || 'active',
    anchorText: req.body.anchorText || '', domainAuthority: req.body.domainAuthority || 0,
    firstSeen: new Date().toISOString(), lastChecked: new Date().toISOString()
  };
  links.push(link);
  saveData('links.json', links);
  res.json(link);
});
app.put('/api/links', (req, res) => {
  const links = loadData('links.json');
  const idx = links.findIndex(l => l.id === req.body.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  links[idx] = { ...links[idx], ...req.body };
  saveData('links.json', links);
  res.json(links[idx]);
});
app.delete('/api/links', (req, res) => {
  let links = loadData('links.json');
  links = links.filter(l => l.id !== req.body.id);
  saveData('links.json', links);
  res.json({ ok: true });
});
app.get('/api/links/opportunities', (req, res) => {
  const links = loadData('links.json');
  res.json(links.filter(l => l.type === 'opportunity'));
});
app.post('/api/links/outreach', (req, res) => {
  const links = loadData('links.json');
  const link = {
    id: genId(), siteId: req.body.siteId || '', sourceUrl: req.body.sourceUrl || '',
    sourceDomain: req.body.sourceDomain || '', targetUrl: req.body.targetUrl || '',
    type: 'opportunity', status: 'pending-outreach',
    anchorText: req.body.anchorText || '', domainAuthority: req.body.domainAuthority || 0,
    contactEmail: req.body.contactEmail || '', outreachDate: new Date().toISOString(),
    notes: req.body.notes || '', firstSeen: new Date().toISOString(), lastChecked: new Date().toISOString()
  };
  links.push(link);
  saveData('links.json', links);
  res.json(link);
});

// ─── INTEGRATIONS ───
app.get('/api/integrations/guides', (req, res) => {
  res.json([
    {
      platform: 'google-analytics', name: 'Google Analytics 4', type: 'analytics',
      setupSteps: ['Create GA4 property at analytics.google.com', 'Set up data stream for your website', 'Add GA4 measurement ID to your site (gtag.js)', 'Configure events: page_view, scroll, click, form_submit', 'Set up conversions for key actions', 'Enable Google Signals for cross-device tracking', 'Link to Google Ads and Search Console'],
      apiEndpoints: ['Google Analytics Data API v1', 'Google Analytics Admin API v1', 'Realtime reporting endpoint'],
      features: ['Real-time traffic monitoring', 'User acquisition reports', 'Engagement metrics', 'Conversion tracking', 'Audience demographics', 'Custom events and dimensions'],
      bestPractices: ['Set up goals/conversions for business KPIs', 'Create custom segments for organic traffic', 'Monitor landing page performance', 'Track Core Web Vitals via web-vitals library', 'Use UTM parameters for campaign tracking']
    },
    {
      platform: 'search-console', name: 'Google Search Console', type: 'analytics',
      setupSteps: ['Go to search.google.com/search-console', 'Add property (URL prefix or Domain)', 'Verify ownership (DNS, HTML file, meta tag, or GA)', 'Submit XML sitemap', 'Review Index Coverage report', 'Check Mobile Usability', 'Set up email alerts'],
      apiEndpoints: ['Search Analytics API (query performance)', 'URL Inspection API', 'Sitemaps API', 'Index Coverage API'],
      features: ['Search performance (queries, clicks, impressions, CTR, position)', 'Index coverage and errors', 'URL inspection tool', 'Sitemap management', 'Mobile usability', 'Core Web Vitals report', 'Manual actions and security issues'],
      bestPractices: ['Monitor weekly for index coverage drops', 'Use URL inspection for new content', 'Analyze query performance for content optimization', 'Fix all mobile usability issues', 'Submit sitemap after major content changes']
    },
    {
      platform: 'semrush', name: 'SEMrush', type: 'seo-tool',
      setupSteps: ['Create account at semrush.com', 'Set up project for your domain', 'Configure Position Tracking for target keywords', 'Run Site Audit', 'Set up Backlink Analytics', 'Configure Brand Monitoring', 'Set up weekly email reports'],
      apiEndpoints: ['Domain Analytics API', 'Keyword Analytics API', 'Backlinks API', 'Site Audit API', 'Position Tracking API'],
      features: ['Keyword research and gap analysis', 'Competitor analysis', 'Site audit with 140+ checks', 'Position tracking', 'Backlink analytics', 'Content analyzer', 'On-page SEO checker'],
      bestPractices: ['Run site audit monthly', 'Track keyword positions weekly', 'Monitor competitor keyword changes', 'Use keyword gap tool for content planning', 'Review toxic backlinks quarterly']
    },
    {
      platform: 'ahrefs', name: 'Ahrefs', type: 'seo-tool',
      setupSteps: ['Create account at ahrefs.com', 'Verify your site in Site Explorer', 'Set up Rank Tracker project', 'Run Site Audit', 'Configure alerts for new/lost backlinks', 'Set up competitor tracking'],
      apiEndpoints: ['Site Explorer API', 'Keywords Explorer API', 'Rank Tracker API', 'Site Audit API'],
      features: ['Site Explorer (backlink profile)', 'Keywords Explorer', 'Content Explorer', 'Rank Tracker', 'Site Audit', 'Domain comparison'],
      bestPractices: ['Monitor Domain Rating trend', 'Track referring domains growth', 'Use Content Gap for keyword opportunities', 'Fix critical Site Audit issues first', 'Analyze top pages by traffic value']
    },
    {
      platform: 'moz', name: 'Moz', type: 'seo-tool',
      setupSteps: ['Create account at moz.com', 'Add your site to campaign', 'Set up rank tracking keywords', 'Run site crawl', 'Configure weekly reports'],
      apiEndpoints: ['Moz Links API', 'Moz URL Metrics API'],
      features: ['Domain Authority (DA)', 'Page Authority', 'Link Explorer', 'Keyword Explorer', 'Site Crawl', 'On-page optimization'],
      bestPractices: ['Track Domain Authority over time', 'Use Link Explorer for backlink analysis', 'Compare DA with competitors', 'Fix critical crawl errors first']
    },
    {
      platform: 'wordpress', name: 'WordPress', type: 'cms',
      setupSteps: ['Install Yoast SEO or RankMath plugin', 'Settings > Permalinks: set to "Post name" (/%postname%/)', 'Yoast: SEO > General > enable XML sitemaps', 'Yoast: SEO > Search Appearance > configure titles/metas', 'Install caching plugin (WP Rocket, W3 Total Cache, or LiteSpeed Cache)', 'Install image optimization plugin (ShortPixel, Imagify)', 'Set up Google Site Kit for Analytics/SC integration'],
      apiEndpoints: ['WP REST API: /wp-json/wp/v2/', 'Yoast REST fields on posts/pages', 'WP-CLI commands: wp yoast index', 'Custom endpoints via register_rest_route()'],
      features: ['Yoast/RankMath SEO analysis per post', 'XML sitemap generation', 'Breadcrumbs', 'Schema markup', 'Redirect management', 'robots.txt editing (Settings > Reading)', '.htaccess control (via plugin or direct)'],
      bestPractices: ['Keep permalink structure as /%postname%/', 'Use categories and tags strategically', 'Optimize images before upload', 'Minimize plugins for speed', 'Use child theme for custom changes', 'Enable GZIP compression in .htaccess', 'Add this to .htaccess: AddOutputFilterByType DEFLATE text/html text/css application/javascript']
    },
    {
      platform: 'shopify', name: 'Shopify', type: 'cms',
      setupSteps: ['Online Store > Preferences > Title and meta description', 'Online Store > Navigation > set up collections/menus', 'Products > edit SEO title/description per product', 'Online Store > Themes > Edit code for schema markup', 'Settings > Domains > set primary domain', 'Install SEO app (SEO Manager, Smart SEO)', 'Submit sitemap: yourdomain.com/sitemap.xml to GSC'],
      apiEndpoints: ['Shopify Admin API (REST/GraphQL)', 'Storefront API', 'Metafields API for custom SEO data', 'Liquid template variables for SEO'],
      features: ['Auto-generated sitemap.xml', 'Auto canonical tags', 'Product structured data (auto)', 'URL handles (slugs)', 'Meta fields for custom data', 'Blog for content marketing', 'Redirect management (URL Redirects)'],
      bestPractices: ['Optimize product titles with keywords', 'Write unique product descriptions (avoid manufacturer copy)', 'Use alt text on all product images', 'Add Product schema with reviews/ratings', 'Create collection pages for category keywords', 'Use blog for informational keywords', 'Custom robots.txt via theme Liquid: robots.txt.liquid']
    },
    {
      platform: 'webflow', name: 'Webflow', type: 'cms',
      setupSteps: ['Project Settings > SEO > set global title/description', 'Pages panel > set per-page SEO title, description, OG image', 'CMS Collections > configure SEO fields', 'Project Settings > Custom Code > add schema/analytics', 'Hosting > 301 Redirects for URL changes', 'Hosting > Sitemap > auto-generated', 'Project Settings > Integrations > add GA/GSC'],
      apiEndpoints: ['Webflow CMS API v2', 'Collections API', 'Items API', 'Webhooks for content changes'],
      features: ['Visual SEO editing per page', 'Auto sitemap generation', 'Auto canonical tags', 'Custom code injection (head/body)', 'CMS-driven dynamic pages', '301 redirect management', 'Open Graph settings per page'],
      bestPractices: ['Use CMS collections for scalable content', 'Set unique SEO titles per collection item', 'Add JSON-LD schema in custom code', 'Use Webflow\'s image optimization (auto WebP)', 'Create 301 redirects for all URL changes', 'Use clean URL slugs with keywords']
    },
    {
      platform: 'wix', name: 'Wix', type: 'cms',
      setupSteps: ['Dashboard > Marketing & SEO > SEO', 'Use SEO Wiz for guided setup', 'Pages > SEO (Google) tab per page', 'Add structured data via Wix SEO panel', 'Settings > SEO > Robots.txt Editor', 'Marketing > SEO Tools > URL Redirect Manager', 'Add Google Analytics via Marketing Integrations'],
      apiEndpoints: ['Wix Velo (Corvid) APIs', 'Wix Data API', 'Wix SEO API (Velo)', 'wix-seo module for dynamic pages'],
      features: ['SEO Wiz guided setup', 'Per-page SEO settings', 'Structured data markup', 'Auto sitemap', 'URL redirect manager', 'Robots.txt editor', 'SEO patterns for dynamic pages'],
      bestPractices: ['Use SEO patterns for dynamic pages (collections)', 'Customize URL slugs (remove auto-generated prefixes)', 'Add schema markup via structured data panel', 'Optimize images in Wix Media Manager', 'Use Velo for advanced SEO needs', 'Monitor Core Web Vitals (Wix sites can be heavy)']
    },
    {
      platform: 'squarespace', name: 'Squarespace', type: 'cms',
      setupSteps: ['Settings > SEO > set site title and description', 'Pages > Settings (gear icon) > SEO tab per page', 'Settings > Advanced > Code Injection for analytics/schema', 'Settings > SEO > enable XML sitemap', 'Settings > URL Mappings for 301 redirects', 'Marketing > SEO Checklist (built-in)', 'Connect Google Workspace/Analytics via Integrations'],
      apiEndpoints: ['Squarespace API v1 (limited)', 'Code Injection (header/footer)', 'URL Mappings for redirects (YAML format)'],
      features: ['Built-in SEO checklist', 'Per-page SEO titles and descriptions', 'Auto sitemap generation', 'SSL included', 'Clean URL structure', 'AMP for blog posts', 'Code injection for custom scripts'],
      bestPractices: ['Customize URL slugs for every page/post', 'Use SEO description on every page', 'Add JSON-LD schema via Code Injection', 'Use 301 redirects in URL Mappings (format: /old-url -> /new-url 301)', 'Optimize images before upload (Squarespace compresses but large files still slow)', 'Enable AMP for blog posts if applicable']
    }
  ]);
});

// ─── CONFIG ───
app.get('/api/config', (req, res) => res.json(loadConfig()));
app.put('/api/config', (req, res) => {
  const cfg = { ...loadConfig(), ...req.body };
  saveConfig(cfg);
  res.json(cfg);
});

// ─── ANALYTICS ───
app.get('/api/analytics', (req, res) => {
  const sites = loadData('sites.json');
  const issues = loadData('issues.json');
  const content = loadData('content.json');
  const keywords = loadData('keywords.json');
  const links = loadData('links.json');

  const site = sites[0] || {};
  res.json({
    currentScore: site.currentScore || 0,
    previousScore: site.previousScore || 0,
    scoreHistory: site.scoreHistory || [],
    issues: {
      total: issues.length,
      open: issues.filter(i => i.status === 'open').length,
      fixed: issues.filter(i => i.status === 'fixed').length,
      inProgress: issues.filter(i => i.status === 'in-progress').length
    },
    content: {
      total: content.length,
      published: content.filter(c => c.status === 'published').length,
      draft: content.filter(c => c.status === 'draft').length
    },
    keywords: {
      total: keywords.length,
      improving: keywords.filter(k => k.trend === 'up').length,
      declining: keywords.filter(k => k.trend === 'down').length
    },
    links: {
      total: links.length,
      active: links.filter(l => l.status === 'active').length,
      lost: links.filter(l => l.status === 'lost').length
    }
  });
});

// SPA fallback
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`SEO Command Center running on port ${PORT}`));
