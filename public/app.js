// ─── SEO Command Center — Frontend App ───
const $ = (s, p) => (p || document).querySelector(s);
const $$ = (s, p) => [...(p || document).querySelectorAll(s)];
const app = $('#app');

// ─── API ───
const api = {
  async get(url) { const r = await fetch(url); return r.json(); },
  async post(url, data) { const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); return r.json(); },
  async put(url, data) { const r = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); return r.json(); },
  async del(url, data) { const r = await fetch(url, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); return r.json(); }
};

// ─── Helpers ───
function scoreColor(s) { if (s >= 90) return 'excellent'; if (s >= 70) return 'good'; if (s >= 50) return 'fair'; if (s >= 30) return 'poor'; return 'bad'; }
function scoreGauge(score, size = 180) {
  const r = (size - 20) / 2, c = Math.PI * 2 * r, offset = c - (score / 100) * c, cx = size / 2, cy = size / 2;
  const col = scoreColor(score);
  return `<div class="score-gauge" style="width:${size}px;height:${size}px">
    <svg viewBox="0 0 ${size} ${size}"><circle class="track" cx="${cx}" cy="${cy}" r="${r}"/><circle class="fill stroke-${col}" cx="${cx}" cy="${cy}" r="${r}" stroke-dasharray="${c}" stroke-dashoffset="${offset}"/></svg>
    <div class="score-text"><div class="score-number score-${col}">${score}</div><div class="score-label">SEO Score</div></div></div>`;
}
function badge(text, cls) { return `<span class="badge badge-${cls || text}">${text}</span>`; }
function severityBadge(s) { return badge(s, s); }
function statusBadge(s) { return badge(s.replace('-', ' '), s); }
function intentBadge(i) { return badge(i, i); }
function progressBar(pct, color) { return `<div class="progress-bar"><div class="progress-fill" style="width:${Math.min(100, Math.max(0, pct))}%;background:var(--${color || 'green'})"></div></div>`; }
function timeAgo(d) {
  if (!d) return '-';
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60) return 'just now'; if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago'; return Math.floor(s / 86400) + 'd ago';
}
function fmtDate(d) { return d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'; }
function escHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

// ─── Chart ───
function lineChart(points, w = 600, h = 180) {
  if (!points.length) return '<div class="text-dim text-sm">No data yet</div>';
  const pad = 30, gw = w - pad * 2, gh = h - pad * 2;
  const max = Math.max(...points.map(p => p.y), 100), min = Math.min(...points.map(p => p.y), 0);
  const range = max - min || 1;
  const pts = points.map((p, i) => ({ x: pad + (i / (points.length - 1 || 1)) * gw, y: pad + gh - ((p.y - min) / range) * gh }));
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const area = line + ` L${pts[pts.length - 1].x},${pad + gh} L${pts[0].x},${pad + gh} Z`;
  let gridLines = '', labels = '';
  for (let i = 0; i <= 4; i++) {
    const y = pad + (i / 4) * gh, val = Math.round(max - (i / 4) * range);
    gridLines += `<line x1="${pad}" y1="${y}" x2="${w - pad}" y2="${y}" class="chart-grid-line"/>`;
    labels += `<text x="${pad - 6}" y="${y + 4}" class="chart-label" text-anchor="end">${val}</text>`;
  }
  points.forEach((p, i) => {
    if (i % Math.max(1, Math.floor(points.length / 6)) === 0 || i === points.length - 1) {
      labels += `<text x="${pts[i].x}" y="${h - 4}" class="chart-label" text-anchor="middle">${p.label || ''}</text>`;
    }
  });
  const dots = pts.map(p => `<circle cx="${p.x}" cy="${p.y}" r="3.5" class="chart-dot"/>`).join('');
  return `<div class="chart-container"><svg class="chart-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
    <defs><linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--green)"/><stop offset="100%" stop-color="transparent"/></linearGradient></defs>
    ${gridLines}${labels}<path d="${area}" class="chart-area"/><path d="${line}" class="chart-line"/>${dots}</svg></div>`;
}

function barChart(items, h = 120) {
  const max = Math.max(...items.map(i => i.value), 1);
  return `<div class="bar-chart" style="height:${h}px">${items.map(i =>
    `<div class="bar-col"><div class="bar-value">${i.value}</div><div class="bar" style="height:${(i.value / max) * (h - 36)}px;background:${i.color || 'var(--green)'}"></div><div class="bar-label">${i.label}</div></div>`
  ).join('')}</div>`;
}

// ─── SERP Preview ───
function serpPreview(title, url, desc) {
  return `<div class="serp-preview">
    <div class="serp-title">${escHtml(title || 'Page Title')}</div>
    <div class="serp-url">${escHtml(url || 'https://example.com/page')}</div>
    <div class="serp-desc">${escHtml(desc || 'Add a meta description to see how your page will appear in search results.')}</div>
  </div>`;
}

// ─── Modal ───
function showModal(title, content, actions) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `<div class="modal"><div class="modal-title">${title}</div><div class="modal-body">${content}</div><div class="modal-actions">${actions || ''}</div></div>`;
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
  return overlay;
}
function closeModal() { const m = $('.modal-overlay'); if (m) m.remove(); }

// ─── Router ───
function getRoute() {
  const h = location.hash.slice(1) || 'dashboard';
  const parts = h.split('/');
  return { page: parts[0], id: parts[1] };
}

function navigate() {
  const { page, id } = getRoute();
  $$('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.page === page));
  const routes = { dashboard: renderDashboard, audits: renderAudits, audit: () => renderAuditDetail(id), issues: renderIssues, content: id ? () => renderContentEditor(id) : renderContent, keywords: renderKeywords, links: renderLinks, integrations: renderIntegrations, settings: renderSettings };
  (routes[page] || renderDashboard)();
}

window.addEventListener('hashchange', navigate);
window.addEventListener('load', navigate);

// ─── DASHBOARD ───
async function renderDashboard() {
  const [analytics, issues, sites] = await Promise.all([
    api.get('/api/analytics'), api.get('/api/issues'), api.get('/api/sites')
  ]);
  const site = sites[0];
  const score = analytics.currentScore || 0;
  const prevScore = analytics.previousScore || 0;
  const diff = score - prevScore;

  const chartPoints = (analytics.scoreHistory || []).slice(-12).map(h => ({
    y: h.score, label: new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }));

  const openIssues = issues.filter(i => i.status === 'open');
  const recentIssues = openIssues.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);

  app.innerHTML = `
    <h1 class="page-title">Dashboard</h1>
    <p class="page-subtitle">${site ? `Monitoring ${site.domain}` : 'Add a site to get started'}</p>
    <div class="grid-4 mb-24">
      <div class="stat-card">
        <div class="stat-label">SEO Score</div>
        <div class="stat-value score-${scoreColor(score)}">${score}</div>
        <div class="stat-change ${diff >= 0 ? 'up' : 'down'}">${diff >= 0 ? '+' : ''}${diff} from last audit</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Open Issues</div>
        <div class="stat-value">${analytics.issues?.open || 0}</div>
        <div class="stat-change">${analytics.issues?.total || 0} total</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Tracked Keywords</div>
        <div class="stat-value">${analytics.keywords?.total || 0}</div>
        <div class="stat-change up">${analytics.keywords?.improving || 0} improving</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Backlinks</div>
        <div class="stat-value">${analytics.links?.total || 0}</div>
        <div class="stat-change">${analytics.links?.active || 0} active</div>
      </div>
    </div>
    <div class="grid-2 mb-24">
      <div class="card">
        <div class="card-header"><h3>SEO Score</h3></div>
        <div style="text-align:center">${scoreGauge(score)}</div>
      </div>
      <div class="card">
        <div class="card-header"><h3>Score History</h3></div>
        ${lineChart(chartPoints)}
      </div>
    </div>
    <div class="grid-2 mb-24">
      <div class="card">
        <div class="card-header"><h3>Issues by Severity</h3></div>
        ${barChart([
          { label: 'Critical', value: issues.filter(i => i.severity === 'critical').length, color: 'var(--red)' },
          { label: 'High', value: issues.filter(i => i.severity === 'high').length, color: 'var(--orange)' },
          { label: 'Medium', value: issues.filter(i => i.severity === 'medium').length, color: 'var(--yellow)' },
          { label: 'Low', value: issues.filter(i => i.severity === 'low').length, color: 'var(--blue)' }
        ])}
      </div>
      <div class="card">
        <div class="card-header"><h3>Recent Issues</h3></div>
        ${recentIssues.length ? recentIssues.map(i => `
          <div class="audit-issue">
            <div class="severity-bar ${i.severity}"></div>
            <div style="flex:1"><div class="fw-600">${escHtml(i.title)}</div><div class="text-dim text-sm">${i.category} &middot; ${timeAgo(i.createdAt)}</div></div>
            ${severityBadge(i.severity)}
          </div>
        `).join('') : '<div class="text-dim text-sm">No open issues</div>'}
      </div>
    </div>`;
}

// ─── AUDITS ───
async function renderAudits() {
  const [audits, sites] = await Promise.all([api.get('/api/audits'), api.get('/api/sites')]);
  const site = sites[0];
  app.innerHTML = `
    <div class="flex-between mb-20">
      <div><h1 class="page-title">Audits</h1><p class="page-subtitle">Site audit history and quick checks</p></div>
      <div class="btn-group">
        ${site ? `<button class="btn btn-primary" onclick="runNewAudit('${site.id}','${site.url}')">Run Full Audit</button>` : ''}
      </div>
    </div>
    <div class="quick-check-bar">
      <input class="form-input" id="quickCheckUrl" placeholder="Enter URL for quick SEO check..." value="${site?.url || ''}">
      <button class="btn btn-secondary" onclick="runQuickCheck()">Quick Check</button>
    </div>
    <div id="quickCheckResult"></div>
    <div class="card mt-16">
      <div class="card-header"><h3>Audit History</h3></div>
      ${audits.length ? `<table><thead><tr><th>Date</th><th>Score</th><th>Issues</th><th>Summary</th><th></th></tr></thead><tbody>
        ${audits.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(a => {
          const totalIssues = Object.values(a.categories || {}).reduce((s, c) => s + (c.issues?.length || 0), 0);
          return `<tr class="clickable" onclick="location.hash='audit/${a.id}'">
            <td>${fmtDate(a.createdAt)}</td>
            <td><span class="fw-600 score-${scoreColor(a.score)}">${a.score}</span></td>
            <td>${totalIssues}</td>
            <td class="text-dim">${escHtml((a.summary || '').slice(0, 60))}</td>
            <td><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></td>
          </tr>`;
        }).join('')}
      </tbody></table>` : '<div class="empty-state"><p>No audits yet. Run a quick check or full audit to get started.</p></div>'}
    </div>`;
}

window.runQuickCheck = async function() {
  const url = $('#quickCheckUrl')?.value?.trim();
  if (!url) return;
  const el = $('#quickCheckResult');
  el.innerHTML = '<div class="card mt-16"><p class="text-dim">Analyzing...</p></div>';
  try {
    const r = await api.post('/api/audits/quick-check', { url });
    if (r.error) { el.innerHTML = `<div class="card mt-16"><p class="text-red">${escHtml(r.error)}</p></div>`; return; }
    const cats = ['technical', 'content', 'onPage', 'offPage', 'performance', 'aeo'];
    const catNames = { technical: 'Technical', content: 'Content', onPage: 'On-Page', offPage: 'Off-Page', performance: 'Performance', aeo: 'AEO/GEO' };
    el.innerHTML = `<div class="card mt-16">
      <div class="flex-between mb-16"><h3>Quick Check Results</h3><span class="fw-600 score-${scoreColor(r.score)}">Score: ${r.score}/100</span></div>
      <div class="grid-2 mb-16">${cats.map(c => {
        const cat = r.categories[c];
        const col = scoreColor(cat.score);
        return `<div class="cat-score"><span class="cat-score-label">${catNames[c]}</span><div class="cat-score-bar">${progressBar(cat.score, col === 'excellent' ? 'green' : col === 'good' ? 'green' : col === 'fair' ? 'yellow' : 'red')}</div><span class="cat-score-value score-${col}">${cat.score}</span></div>`;
      }).join('')}</div>
      <h3>Issues Found (${r.totalIssues})</h3>
      ${cats.map(c => r.categories[c].issues.map(i => `
        <div class="audit-issue"><div class="severity-bar ${i.severity}"></div><div style="flex:1"><div class="fw-600">${escHtml(i.title)}</div><div class="text-dim text-sm">${escHtml(i.fix)}</div></div>${severityBadge(i.severity)}</div>
      `).join('')).join('')}
      <div class="mt-16"><button class="btn btn-primary" onclick="saveQuickCheckAsAudit(${JSON.stringify(r).replace(/"/g, '&quot;')})">Save as Audit</button></div>
    </div>`;
  } catch (e) { el.innerHTML = `<div class="card mt-16"><p class="text-red">Error: ${e.message}</p></div>`; }
};

window.saveQuickCheckAsAudit = async function(result) {
  const sites = await api.get('/api/sites');
  let site = sites.find(s => result.url.includes(s.domain));
  if (!site) {
    try { const u = new URL(result.url); site = await api.post('/api/sites', { name: u.hostname, url: u.origin, domain: u.hostname }); } catch {}
  }
  await api.post('/api/audits', {
    siteId: site?.id || '', score: result.score, categories: result.categories,
    summary: `Quick check: ${result.totalIssues} issues found. Score: ${result.score}/100`
  });
  // Create issues from audit
  for (const cat of Object.keys(result.categories)) {
    for (const issue of result.categories[cat].issues || []) {
      await api.post('/api/issues', {
        siteId: site?.id || '', title: issue.title, category: cat === 'onPage' ? 'on-page' : cat === 'offPage' ? 'off-page' : cat,
        severity: issue.severity, fix: issue.fix, status: 'open', url: result.url,
        impact: `Affects ${cat} SEO score`, priority: issue.severity === 'critical' ? 10 : issue.severity === 'high' ? 7 : issue.severity === 'medium' ? 5 : 3
      });
    }
  }
  location.hash = 'audits';
  navigate();
};

window.runNewAudit = async function(siteId, url) {
  if (url) { $('#quickCheckUrl').value = url; await runQuickCheck(); }
};

// ─── AUDIT DETAIL ───
async function renderAuditDetail(id) {
  const audit = await api.get(`/api/audits/${id}`);
  if (audit.error) { app.innerHTML = '<p class="text-red">Audit not found</p>'; return; }
  const catNames = { technical: 'Technical', content: 'Content', onPage: 'On-Page', offPage: 'Off-Page', performance: 'Performance', aeo: 'AEO/GEO' };
  app.innerHTML = `
    <div class="flex-between mb-20">
      <div><h1 class="page-title">Audit Detail</h1><p class="page-subtitle">${fmtDate(audit.createdAt)}</p></div>
      <a href="#audits" class="btn btn-secondary">Back to Audits</a>
    </div>
    <div class="card mb-20" style="text-align:center">${scoreGauge(audit.score, 160)}<p class="text-dim mt-8">${escHtml(audit.summary || '')}</p></div>
    <div class="card">
      <h3 class="mb-16">Category Breakdown</h3>
      ${Object.entries(audit.categories || {}).map(([key, cat]) => {
        const col = scoreColor(cat.score);
        return `<div class="audit-category">
          <div class="audit-cat-header" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'">
            <h4>${catNames[key] || key}</h4>
            <div class="flex gap-12" style="align-items:center">
              <div style="width:120px">${progressBar(cat.score, col === 'excellent' || col === 'good' ? 'green' : col === 'fair' ? 'yellow' : 'red')}</div>
              <span class="fw-600 score-${col}">${cat.score}</span>
            </div>
          </div>
          <div class="audit-cat-issues">
            ${(cat.issues || []).length ? cat.issues.map(i => `
              <div class="audit-issue"><div class="severity-bar ${i.severity}"></div><div style="flex:1"><div class="fw-600">${escHtml(i.title)}</div><div class="text-dim text-sm">${escHtml(i.fix || '')}</div></div>${severityBadge(i.severity)}</div>
            `).join('') : '<p class="text-dim text-sm" style="padding:8px 0">No issues in this category</p>'}
          </div>
        </div>`;
      }).join('')}
    </div>`;
}

// ─── ISSUES ───
async function renderIssues() {
  const [issues, summary] = await Promise.all([api.get('/api/issues'), api.get('/api/issues/summary')]);
  let filterCat = '', filterSev = '', filterStatus = '';

  function render() {
    let filtered = issues;
    if (filterCat) filtered = filtered.filter(i => i.category === filterCat);
    if (filterSev) filtered = filtered.filter(i => i.severity === filterSev);
    if (filterStatus) filtered = filtered.filter(i => i.status === filterStatus);

    app.innerHTML = `
      <div class="flex-between mb-20">
        <div><h1 class="page-title">Issues</h1><p class="page-subtitle">${summary.total} total issues</p></div>
        <button class="btn btn-primary" onclick="showAddIssueModal()">Add Issue</button>
      </div>
      <div class="filter-bar">
        <span class="text-dim text-sm">Filter:</span>
        ${['', 'technical', 'content', 'on-page', 'off-page', 'performance', 'aeo'].map(c =>
          `<div class="filter-pill ${filterCat === c ? 'active' : ''}" data-filter-cat="${c}">${c || 'All Categories'}</div>`
        ).join('')}
      </div>
      <div class="filter-bar mb-16">
        ${['', 'critical', 'high', 'medium', 'low'].map(s =>
          `<div class="filter-pill ${filterSev === s ? 'active' : ''}" data-filter-sev="${s}">${s || 'All Severities'}</div>`
        ).join('')}
        <span style="margin-left:8px"></span>
        ${['', 'open', 'in-progress', 'fixed', 'deferred'].map(s =>
          `<div class="filter-pill ${filterStatus === s ? 'active' : ''}" data-filter-status="${s}">${s ? s.replace('-', ' ') : 'All Statuses'}</div>`
        ).join('')}
      </div>
      <div class="card">
        <div class="table-wrap"><table><thead><tr><th></th><th>Title</th><th>Category</th><th>Severity</th><th>Status</th><th>Priority</th><th>Created</th><th></th></tr></thead><tbody>
          ${filtered.sort((a, b) => (b.priority || 0) - (a.priority || 0)).map(i => `
            <tr>
              <td><div class="severity-bar ${i.severity}"></div></td>
              <td><div class="fw-600">${escHtml(i.title)}</div><div class="text-dim text-sm">${escHtml((i.description || '').slice(0, 60))}</div></td>
              <td>${badge(i.category, 'green')}</td>
              <td>${severityBadge(i.severity)}</td>
              <td>${statusBadge(i.status)}</td>
              <td>${i.priority || '-'}</td>
              <td class="text-dim">${timeAgo(i.createdAt)}</td>
              <td>
                <select class="form-select" style="width:auto;min-width:110px;padding:4px 28px 4px 8px;font-size:11px" onchange="updateIssueStatus('${i.id}',this.value)">
                  ${['open', 'in-progress', 'fixed', 'deferred', 'wont-fix'].map(s => `<option value="${s}" ${i.status === s ? 'selected' : ''}>${s.replace('-', ' ')}</option>`).join('')}
                </select>
              </td>
            </tr>
          `).join('')}
        </tbody></table></div>
      </div>`;

    $$('[data-filter-cat]').forEach(el => el.onclick = () => { filterCat = el.dataset.filterCat; render(); });
    $$('[data-filter-sev]').forEach(el => el.onclick = () => { filterSev = el.dataset.filterSev; render(); });
    $$('[data-filter-status]').forEach(el => el.onclick = () => { filterStatus = el.dataset.filterStatus; render(); });
  }
  render();
}

window.updateIssueStatus = async function(id, status) {
  await api.put('/api/issues', { id, status });
  renderIssues();
};

window.showAddIssueModal = function() {
  showModal('Add Issue', `
    <div class="form-group"><label class="form-label">Title</label><input class="form-input" id="issueTitle"></div>
    <div class="form-group"><label class="form-label">Description</label><textarea class="form-textarea" id="issueDesc" rows="3"></textarea></div>
    <div class="grid-2">
      <div class="form-group"><label class="form-label">Category</label><select class="form-select" id="issueCat"><option>technical</option><option>content</option><option>on-page</option><option>off-page</option><option>performance</option><option>aeo</option><option>accessibility</option></select></div>
      <div class="form-group"><label class="form-label">Severity</label><select class="form-select" id="issueSev"><option>medium</option><option>critical</option><option>high</option><option>low</option></select></div>
    </div>
    <div class="form-group"><label class="form-label">Recommended Fix</label><textarea class="form-textarea" id="issueFix" rows="2"></textarea></div>
    <div class="form-group"><label class="form-label">URL</label><input class="form-input" id="issueUrl"></div>
  `, `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveNewIssue()">Save</button>`);
};

window.saveNewIssue = async function() {
  const sites = await api.get('/api/sites');
  await api.post('/api/issues', {
    siteId: sites[0]?.id || '', title: $('#issueTitle').value, description: $('#issueDesc').value,
    category: $('#issueCat').value, severity: $('#issueSev').value, fix: $('#issueFix').value,
    url: $('#issueUrl').value, priority: $('#issueSev').value === 'critical' ? 10 : $('#issueSev').value === 'high' ? 7 : 5
  });
  closeModal();
  renderIssues();
};

// ─── CONTENT ───
async function renderContent() {
  const [content, suggestions] = await Promise.all([api.get('/api/content'), api.get('/api/content/suggestions')]);
  app.innerHTML = `
    <div class="flex-between mb-20">
      <div><h1 class="page-title">Content Studio</h1><p class="page-subtitle">Create SEO-optimized content</p></div>
      <button class="btn btn-primary" onclick="createNewContent()">New Content</button>
    </div>
    ${content.length ? `<div class="card mb-20"><div class="table-wrap"><table><thead><tr><th>Title</th><th>Type</th><th>SEO Score</th><th>Keywords</th><th>Status</th><th>Words</th><th>Date</th></tr></thead><tbody>
      ${content.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(c => `
        <tr class="clickable" onclick="location.hash='content/${c.id}'">
          <td class="fw-600">${escHtml(c.title || 'Untitled')}</td>
          <td>${badge(c.type, 'green')}</td>
          <td><span class="fw-600 score-${scoreColor(c.seoScore || 0)}">${c.seoScore || 0}</span></td>
          <td class="text-dim">${(c.targetKeywords || []).map(k => k.keyword || k).slice(0, 2).join(', ')}</td>
          <td>${statusBadge(c.status)}</td>
          <td>${c.wordCount || 0}</td>
          <td class="text-dim">${timeAgo(c.createdAt)}</td>
        </tr>
      `).join('')}
    </tbody></table></div></div>` : ''}
    <div class="card">
      <div class="card-header"><h3>Content Ideas</h3></div>
      ${suggestions.map(s => `<div class="audit-issue"><div style="flex:1"><div class="fw-600">${escHtml(s.title)}</div><div class="text-dim text-sm">${escHtml(s.reason)}</div></div>${badge(s.type, 'green')}</div>`).join('')}
    </div>`;
}

window.createNewContent = async function() {
  const c = await api.post('/api/content', { title: 'Untitled', type: 'blog-post', status: 'draft' });
  location.hash = `content/${c.id}`;
};

// ─── CONTENT EDITOR ───
async function renderContentEditor(id) {
  const items = await api.get('/api/content');
  const content = items.find(c => c.id === id);
  if (!content) { location.hash = 'content'; return; }

  let analysisTimeout;
  function render() {
    app.innerHTML = `
      <div class="flex-between mb-20">
        <div><h1 class="page-title">Content Editor</h1><p class="page-subtitle">${escHtml(content.title || 'Untitled')}</p></div>
        <div class="btn-group">
          <a href="#content" class="btn btn-secondary">Back</a>
          <select class="form-select" style="width:auto" id="contentStatus" onchange="updateContentField('status',this.value)">
            ${['draft', 'review', 'approved', 'published'].map(s => `<option ${content.status === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
          <button class="btn btn-primary" onclick="saveContent()">Save</button>
        </div>
      </div>
      <div class="editor-layout">
        <div class="editor-main">
          <div class="card mb-16">
            <div class="form-group"><label class="form-label">Title</label><input class="form-input" id="cTitle" value="${escHtml(content.title || '')}" oninput="updateContentField('title',this.value)"></div>
            <div class="grid-2">
              <div class="form-group"><label class="form-label">Type</label><select class="form-select" id="cType" onchange="updateContentField('type',this.value)">
                ${['blog-post', 'landing-page', 'meta-description', 'title-tag', 'schema-markup', 'faq', 'pillar-page', 'cluster-article'].map(t => `<option ${content.type === t ? 'selected' : ''}>${t}</option>`).join('')}
              </select></div>
              <div class="form-group"><label class="form-label">Slug</label><input class="form-input" id="cSlug" value="${escHtml(content.slug || '')}" oninput="updateContentField('slug',this.value)"></div>
            </div>
            <div class="form-group"><label class="form-label">Target Keywords (comma separated)</label><input class="form-input" id="cKeywords" value="${(content.targetKeywords || []).map(k => k.keyword || k).join(', ')}" oninput="onContentChange()"></div>
          </div>
          <div class="card">
            <div class="form-group"><label class="form-label">Content (Markdown)</label><textarea class="form-textarea" id="cContent" rows="20" style="min-height:400px;font-family:monospace;font-size:13px" oninput="onContentChange()">${escHtml(content.content || '')}</textarea></div>
          </div>
        </div>
        <div class="editor-sidebar">
          <div class="card">
            <h3>Meta Title</h3>
            <input class="form-input" id="cMetaTitle" value="${escHtml(content.metaTitle || '')}" oninput="onContentChange()" maxlength="70" placeholder="SEO title (max 60 chars)">
            <div class="char-count" id="metaTitleCount">${(content.metaTitle || '').length}/60</div>
          </div>
          <div class="card">
            <h3>Meta Description</h3>
            <textarea class="form-textarea" id="cMetaDesc" rows="3" oninput="onContentChange()" maxlength="200" placeholder="SEO description (max 160 chars)">${escHtml(content.metaDescription || '')}</textarea>
            <div class="char-count" id="metaDescCount">${(content.metaDescription || '').length}/160</div>
          </div>
          <div class="card">
            <h3>SERP Preview</h3>
            <div id="serpPreviewBox">${serpPreview(content.metaTitle, content.url || 'https://example.com/' + (content.slug || ''), content.metaDescription)}</div>
          </div>
          <div class="card">
            <h3>SEO Score</h3>
            <div id="seoScoreBox" style="text-align:center">${scoreGauge(content.seoScore || 0, 120)}</div>
            <div id="seoFeedback"></div>
          </div>
          <div class="card">
            <h3>Analysis</h3>
            <div id="analysisBox"><p class="text-dim text-sm">Edit content to see analysis</p></div>
          </div>
        </div>
      </div>`;
    onContentChange();
  }

  window.updateContentField = function(field, value) { content[field] = value; };

  window.onContentChange = function() {
    clearTimeout(analysisTimeout);
    // Update char counts
    const mt = $('#cMetaTitle')?.value || '';
    const md = $('#cMetaDesc')?.value || '';
    const mtCount = $('#metaTitleCount');
    const mdCount = $('#metaDescCount');
    if (mtCount) { mtCount.textContent = `${mt.length}/60`; mtCount.className = 'char-count' + (mt.length > 60 ? ' over' : mt.length > 50 ? ' warn' : ''); }
    if (mdCount) { mdCount.textContent = `${md.length}/160`; mdCount.className = 'char-count' + (md.length > 160 ? ' over' : md.length > 140 ? ' warn' : ''); }
    // SERP preview
    const serpBox = $('#serpPreviewBox');
    if (serpBox) serpBox.innerHTML = serpPreview(mt, 'https://example.com/' + ($('#cSlug')?.value || ''), md);
    // Debounced analysis
    analysisTimeout = setTimeout(runAnalysis, 500);
  };

  async function runAnalysis() {
    const text = $('#cContent')?.value || '';
    const kwStr = $('#cKeywords')?.value || '';
    const keywords = kwStr.split(',').map(k => k.trim()).filter(Boolean).map(k => ({ keyword: k }));
    const mt = $('#cMetaTitle')?.value || '';
    const md = $('#cMetaDesc')?.value || '';
    try {
      const r = await api.post('/api/content/analyze', { content: text, targetKeywords: keywords, metaTitle: mt, metaDescription: md });
      const scoreBox = $('#seoScoreBox');
      if (scoreBox) scoreBox.innerHTML = scoreGauge(r.seoScore, 120);
      const fb = $('#seoFeedback');
      if (fb && r.feedback) {
        fb.innerHTML = `<ul class="seo-feedback mt-8">${r.feedback.map(f =>
          `<li><div class="fb-icon fb-${f.type}">${f.type === 'good' ? '&#10003;' : f.type === 'ok' ? '!' : '&#10005;'}</div><span>${escHtml(f.msg)}</span></li>`
        ).join('')}</ul>`;
      }
      const ab = $('#analysisBox');
      if (ab) {
        ab.innerHTML = `
          <div class="mb-16"><div class="text-dim text-sm mb-16">Word count: <strong>${r.wordCount}</strong></div>
          <div class="text-dim text-sm mb-16">Readability: <strong>${r.readability}</strong>/100</div>
          <div class="text-dim text-sm mb-16">Headings: H1(${r.headings?.h1 || 0}) H2(${r.headings?.h2 || 0})</div>
          <div class="text-dim text-sm">Links: ${r.linkCount || 0}</div></div>
          ${(r.keywordDensities || []).map(kd => `
            <div class="density-meter">
              <div class="density-label"><span>${escHtml(kd.keyword)}</span><span>${kd.density}% (${kd.count}x)</span></div>
              <div class="density-bar"><div class="density-fill" style="width:${Math.min(100, kd.density * 20)}%;background:${kd.density >= 1 && kd.density <= 3 ? 'var(--green)' : kd.density > 3 ? 'var(--red)' : 'var(--orange)'}"></div><div class="density-optimal"></div></div>
            </div>
          `).join('')}`;
      }
      content.seoScore = r.seoScore;
      content.wordCount = r.wordCount;
      content.readabilityScore = r.readability;
    } catch {}
  }

  window.saveContent = async function() {
    content.title = $('#cTitle')?.value || '';
    content.content = $('#cContent')?.value || '';
    content.metaTitle = $('#cMetaTitle')?.value || '';
    content.metaDescription = $('#cMetaDesc')?.value || '';
    content.slug = $('#cSlug')?.value || '';
    content.type = $('#cType')?.value || 'blog-post';
    const kwStr = $('#cKeywords')?.value || '';
    content.targetKeywords = kwStr.split(',').map(k => k.trim()).filter(Boolean).map(k => ({ keyword: k }));
    await api.put('/api/content', content);
    // Flash save confirmation
    const btn = app.querySelector('.btn-primary');
    if (btn) { const orig = btn.textContent; btn.textContent = 'Saved!'; setTimeout(() => btn.textContent = orig, 1500); }
  };

  render();
}

// ─── KEYWORDS ───
async function renderKeywords() {
  const [keywords, clusters] = await Promise.all([api.get('/api/keywords'), api.get('/api/keywords/clusters')]);
  let sortCol = 'keyword', sortDir = 1, activeTab = 'list';

  function render() {
    const sorted = [...keywords].sort((a, b) => {
      let av = a[sortCol], bv = b[sortCol];
      if (typeof av === 'string') return sortDir * av.localeCompare(bv);
      return sortDir * ((av || 0) - (bv || 0));
    });

    app.innerHTML = `
      <div class="flex-between mb-20">
        <div><h1 class="page-title">Keywords</h1><p class="page-subtitle">${keywords.length} tracked keywords</p></div>
        <button class="btn btn-primary" onclick="showAddKeywordModal()">Track Keyword</button>
      </div>
      <div class="tabs">
        <div class="tab ${activeTab === 'list' ? 'active' : ''}" onclick="kwTab('list')">Keywords</div>
        <div class="tab ${activeTab === 'clusters' ? 'active' : ''}" onclick="kwTab('clusters')">Clusters</div>
      </div>
      ${activeTab === 'list' ? `
        <div class="card"><div class="table-wrap"><table><thead><tr>
          <th class="sortable" onclick="kwSort('keyword')">Keyword</th>
          <th class="sortable" onclick="kwSort('volume')">Volume</th>
          <th class="sortable" onclick="kwSort('difficulty')">Difficulty</th>
          <th class="sortable" onclick="kwSort('currentPosition')">Position</th>
          <th>Change</th><th>Intent</th><th>URL</th>
          <th></th>
        </tr></thead><tbody>
          ${sorted.map(k => {
            const change = k.previousPosition && k.currentPosition ? k.previousPosition - k.currentPosition : 0;
            return `<tr>
              <td class="fw-600">${escHtml(k.keyword)}</td>
              <td>${k.volume?.toLocaleString() || '-'}</td>
              <td>${k.difficulty != null ? `<span class="score-${scoreColor(100 - k.difficulty)}">${k.difficulty}</span>` : '-'}</td>
              <td class="fw-600">${k.currentPosition || '-'}</td>
              <td>${change > 0 ? `<span class="trend-up">+${change}</span>` : change < 0 ? `<span class="trend-down">${change}</span>` : '<span class="trend-stable">-</span>'}</td>
              <td>${k.intent ? intentBadge(k.intent) : '-'}</td>
              <td class="text-dim text-sm">${k.url ? escHtml(k.url.slice(0, 30)) : '-'}</td>
              <td><button class="btn btn-danger btn-sm" onclick="deleteKeyword('${k.id}')">Del</button></td>
            </tr>`;
          }).join('')}
        </tbody></table></div></div>
      ` : `
        <div class="grid-2">${clusters.map(cl => `
          <div class="card"><h3>${escHtml(cl.id)}</h3>
            ${cl.keywords.map(k => `<div class="audit-issue"><div style="flex:1"><span class="fw-600">${escHtml(k.keyword)}</span></div><span class="text-dim">${k.currentPosition ? '#' + k.currentPosition : '-'}</span></div>`).join('')}
          </div>
        `).join('')}</div>
      `}`;
  }

  window.kwSort = function(col) { if (sortCol === col) sortDir *= -1; else { sortCol = col; sortDir = 1; } render(); };
  window.kwTab = function(tab) { activeTab = tab; render(); };
  window.deleteKeyword = async function(id) { await api.del('/api/keywords', { id }); const idx = keywords.findIndex(k => k.id === id); if (idx > -1) keywords.splice(idx, 1); render(); };

  window.showAddKeywordModal = function() {
    showModal('Track Keyword', `
      <div class="form-group"><label class="form-label">Keyword</label><input class="form-input" id="kwKeyword"></div>
      <div class="grid-2">
        <div class="form-group"><label class="form-label">Volume</label><input class="form-input" id="kwVolume" type="number"></div>
        <div class="form-group"><label class="form-label">Difficulty (0-100)</label><input class="form-input" id="kwDifficulty" type="number"></div>
      </div>
      <div class="grid-2">
        <div class="form-group"><label class="form-label">Current Position</label><input class="form-input" id="kwPosition" type="number"></div>
        <div class="form-group"><label class="form-label">Intent</label><select class="form-select" id="kwIntent"><option>informational</option><option>commercial</option><option>transactional</option><option>navigational</option></select></div>
      </div>
      <div class="form-group"><label class="form-label">Cluster ID</label><input class="form-input" id="kwCluster" placeholder="Optional"></div>
    `, `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveKeyword()">Add</button>`);
  };

  window.saveKeyword = async function() {
    const sites = await api.get('/api/sites');
    const kw = await api.post('/api/keywords', {
      siteId: sites[0]?.id || '', keyword: $('#kwKeyword').value,
      volume: parseInt($('#kwVolume').value) || 0, difficulty: parseInt($('#kwDifficulty').value) || 0,
      currentPosition: parseInt($('#kwPosition').value) || null, intent: $('#kwIntent').value,
      clusterId: $('#kwCluster').value || null
    });
    keywords.push(kw);
    closeModal();
    render();
  };

  render();
}

// ─── LINKS ───
async function renderLinks() {
  const links = await api.get('/api/links');
  let activeTab = 'backlinks';

  function render() {
    const filtered = activeTab === 'all' ? links :
      activeTab === 'backlinks' ? links.filter(l => l.type === 'backlink') :
      activeTab === 'broken' ? links.filter(l => l.type === 'broken') :
      activeTab === 'opportunities' ? links.filter(l => l.type === 'opportunity') :
      activeTab === 'internal' ? links.filter(l => l.type === 'internal') : links;

    app.innerHTML = `
      <div class="flex-between mb-20">
        <div><h1 class="page-title">Links</h1><p class="page-subtitle">${links.length} tracked links</p></div>
        <button class="btn btn-primary" onclick="showAddLinkModal()">Add Link</button>
      </div>
      <div class="tabs">
        ${['backlinks', 'internal', 'broken', 'opportunities', 'all'].map(t =>
          `<div class="tab ${activeTab === t ? 'active' : ''}" onclick="linkTab('${t}')">${t.charAt(0).toUpperCase() + t.slice(1)}</div>`
        ).join('')}
      </div>
      <div class="card"><div class="table-wrap"><table><thead><tr>
        <th>Source</th><th>Target</th><th>Anchor</th><th>DA</th><th>Status</th><th>Type</th><th>First Seen</th><th></th>
      </tr></thead><tbody>
        ${filtered.map(l => `
          <tr>
            <td><div class="fw-600">${escHtml(l.sourceDomain || '')}</div><div class="text-dim text-sm">${escHtml((l.sourceUrl || '').slice(0, 40))}</div></td>
            <td class="text-dim text-sm">${escHtml((l.targetUrl || '').slice(0, 40))}</td>
            <td>${escHtml(l.anchorText || '-')}</td>
            <td><span class="fw-600 score-${scoreColor(l.domainAuthority || 0)}">${l.domainAuthority || '-'}</span></td>
            <td>${statusBadge(l.status || 'active')}</td>
            <td>${badge(l.type, 'green')}</td>
            <td class="text-dim">${fmtDate(l.firstSeen)}</td>
            <td><button class="btn btn-danger btn-sm" onclick="deleteLink('${l.id}')">Del</button></td>
          </tr>
        `).join('')}
      </tbody></table></div></div>`;
  }

  window.linkTab = function(tab) { activeTab = tab; render(); };
  window.deleteLink = async function(id) { await api.del('/api/links', { id }); const idx = links.findIndex(l => l.id === id); if (idx > -1) links.splice(idx, 1); render(); };

  window.showAddLinkModal = function() {
    showModal('Add Link', `
      <div class="form-group"><label class="form-label">Source URL</label><input class="form-input" id="linkSource"></div>
      <div class="form-group"><label class="form-label">Source Domain</label><input class="form-input" id="linkDomain"></div>
      <div class="form-group"><label class="form-label">Target URL</label><input class="form-input" id="linkTarget"></div>
      <div class="grid-2">
        <div class="form-group"><label class="form-label">Type</label><select class="form-select" id="linkType"><option>backlink</option><option>internal</option><option>broken</option><option>opportunity</option></select></div>
        <div class="form-group"><label class="form-label">Domain Authority</label><input class="form-input" id="linkDA" type="number"></div>
      </div>
      <div class="form-group"><label class="form-label">Anchor Text</label><input class="form-input" id="linkAnchor"></div>
    `, `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveLink()">Add</button>`);
  };

  window.saveLink = async function() {
    const sites = await api.get('/api/sites');
    const l = await api.post('/api/links', {
      siteId: sites[0]?.id || '', sourceUrl: $('#linkSource').value, sourceDomain: $('#linkDomain').value,
      targetUrl: $('#linkTarget').value, type: $('#linkType').value,
      domainAuthority: parseInt($('#linkDA').value) || 0, anchorText: $('#linkAnchor').value
    });
    links.push(l);
    closeModal();
    render();
  };

  render();
}

// ─── INTEGRATIONS ───
async function renderIntegrations() {
  const guides = await api.get('/api/integrations/guides');
  const colors = {
    'google-analytics': '#F59E0B', 'search-console': '#3B82F6', semrush: '#FF6422',
    ahrefs: '#3B82F6', moz: '#3B82F6', wordpress: '#21759B', shopify: '#96BF48',
    webflow: '#4353FF', wix: '#0C6EFC', squarespace: '#222'
  };
  let selectedGuide = null;

  function render() {
    if (selectedGuide) {
      const g = guides.find(x => x.platform === selectedGuide);
      app.innerHTML = `
        <div class="flex-between mb-20">
          <div><h1 class="page-title">${g.name}</h1><p class="page-subtitle">${g.type}</p></div>
          <button class="btn btn-secondary" onclick="selectedGuide=null;renderIntegrations()">Back</button>
        </div>
        <div class="grid-2">
          <div class="card">
            <h3>Setup Steps</h3>
            <div class="guide-steps">${g.setupSteps.map(s => `<div class="guide-step">${escHtml(s)}</div>`).join('')}</div>
          </div>
          <div>
            <div class="card mb-16">
              <h3>Features</h3>
              <ul style="list-style:none">${g.features.map(f => `<li style="padding:4px 0;font-size:13px">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style="vertical-align:-2px;margin-right:6px"><circle cx="7" cy="7" r="6" stroke="var(--green)" stroke-width="1.5"/><path d="M4.5 7l2 2 3.5-3.5" stroke="var(--green)" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                ${escHtml(f)}</li>`).join('')}</ul>
            </div>
            ${g.apiEndpoints?.length ? `<div class="card mb-16"><h3>API Endpoints</h3><ul style="list-style:none">${g.apiEndpoints.map(e => `<li style="padding:3px 0;font-size:12px;color:var(--text-dim);font-family:monospace">${escHtml(e)}</li>`).join('')}</ul></div>` : ''}
            <div class="card"><h3>Best Practices</h3><ul style="list-style:none">${g.bestPractices.map(b => `<li style="padding:4px 0;font-size:13px;color:var(--text-dim)">${escHtml(b)}</li>`).join('')}</ul></div>
          </div>
        </div>`;
      return;
    }

    app.innerHTML = `
      <h1 class="page-title">Integrations</h1>
      <p class="page-subtitle">Connect your SEO tools and CMS platforms</p>
      <h3 class="mb-16">Analytics & SEO Tools</h3>
      <div class="grid-3 mb-24">${guides.filter(g => g.type !== 'cms').map(g => `
        <div class="integration-card" onclick="selectedGuide='${g.platform}';renderIntegrations()">
          <div class="icon" style="background:${colors[g.platform] || 'var(--green)'}20;color:${colors[g.platform] || 'var(--green)'}">${g.name.slice(0, 2).toUpperCase()}</div>
          <div class="ic-name">${g.name}</div>
          <div class="ic-type">${g.type}</div>
        </div>
      `).join('')}</div>
      <h3 class="mb-16">CMS Platforms</h3>
      <div class="grid-3">${guides.filter(g => g.type === 'cms').map(g => `
        <div class="integration-card" onclick="selectedGuide='${g.platform}';renderIntegrations()">
          <div class="icon" style="background:${colors[g.platform] || 'var(--green)'}20;color:${colors[g.platform] || 'var(--green)'}">${g.name.slice(0, 2).toUpperCase()}</div>
          <div class="ic-name">${g.name}</div>
          <div class="ic-type">${g.type}</div>
        </div>
      `).join('')}</div>`;
  }

  window.selectedGuide = selectedGuide;
  render();
}

// ─── SETTINGS ───
async function renderSettings() {
  const [config, sites] = await Promise.all([api.get('/api/config'), api.get('/api/sites')]);
  const site = sites[0];

  app.innerHTML = `
    <h1 class="page-title">Settings</h1>
    <p class="page-subtitle">Configure your SEO Command Center</p>
    <div class="grid-2">
      <div class="card">
        <h3>Site Configuration</h3>
        <div class="form-group"><label class="form-label">Site Name</label><input class="form-input" id="cfgName" value="${escHtml(site?.name || '')}"></div>
        <div class="form-group"><label class="form-label">Site URL</label><input class="form-input" id="cfgUrl" value="${escHtml(site?.url || '')}"></div>
        <div class="form-group"><label class="form-label">CMS Platform</label>
          <select class="form-select" id="cfgCms">
            ${['custom', 'wordpress', 'shopify', 'webflow', 'wix', 'squarespace'].map(c => `<option ${(site?.cms || 'custom') === c ? 'selected' : ''}>${c}</option>`).join('')}
          </select>
        </div>
        <button class="btn btn-primary" onclick="saveSiteSettings()">Save Site</button>
      </div>
      <div class="card">
        <h3>API Keys</h3>
        <div class="form-group"><label class="form-label">Google Analytics Property ID</label><input class="form-input" id="cfgGA" value="${escHtml(config.googleAnalyticsId || '')}"></div>
        <div class="form-group"><label class="form-label">Google Search Console Property</label><input class="form-input" id="cfgGSC" value="${escHtml(config.searchConsoleProperty || '')}"></div>
        <div class="form-group"><label class="form-label">SEMrush API Key</label><input class="form-input" id="cfgSemrush" value="${escHtml(config.semrushApiKey || '')}" type="password"></div>
        <div class="form-group"><label class="form-label">Ahrefs API Key</label><input class="form-input" id="cfgAhrefs" value="${escHtml(config.ahrefsApiKey || '')}" type="password"></div>
        <button class="btn btn-primary" onclick="saveApiKeys()">Save Keys</button>
      </div>
    </div>
    <div class="card mt-16">
      <h3>Danger Zone</h3>
      <p class="text-dim text-sm mb-16">These actions cannot be undone.</p>
      <button class="btn btn-danger" onclick="if(confirm('Delete all data?')){clearAllData()}">Reset All Data</button>
    </div>`;
}

window.saveSiteSettings = async function() {
  const sites = await api.get('/api/sites');
  const name = $('#cfgName').value, url = $('#cfgUrl').value, cms = $('#cfgCms').value;
  let domain = ''; try { domain = new URL(url).hostname; } catch {}
  if (sites[0]) {
    await api.put('/api/sites', { id: sites[0].id, name, url, domain, cms });
  } else {
    await api.post('/api/sites', { name, url, domain, cms });
  }
  renderSettings();
};

window.saveApiKeys = async function() {
  await api.put('/api/config', {
    googleAnalyticsId: $('#cfgGA').value, searchConsoleProperty: $('#cfgGSC').value,
    semrushApiKey: $('#cfgSemrush').value, ahrefsApiKey: $('#cfgAhrefs').value
  });
  const btn = app.querySelectorAll('.btn-primary')[1];
  if (btn) { const o = btn.textContent; btn.textContent = 'Saved!'; setTimeout(() => btn.textContent = o, 1500); }
};

window.clearAllData = async function() {
  for (const ep of ['sites', 'audits', 'issues', 'content', 'keywords', 'links']) {
    const items = await api.get(`/api/${ep}`);
    for (const item of items) await api.del(`/api/${ep}`, { id: item.id });
  }
  await api.put('/api/config', {});
  location.hash = 'dashboard';
  navigate();
};
