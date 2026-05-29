'use strict';

// ── Utilities ─────────────────────────────────────────────
function qs(sel, root = document) { return root.querySelector(sel); }
function qsa(sel, root = document) { return [...root.querySelectorAll(sel)]; }

function readCookie(name) {
  return document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`))
    ?.split('=')
    .slice(1)
    .join('=') || '';
}

const nativeFetch = window.fetch.bind(window);
window.fetch = function(input, init = {}) {
  const requestUrl = typeof input === 'string' ? input : input?.url || '';
  const method = String(init.method || (typeof input !== 'string' && input?.method) || 'GET').toUpperCase();
  const isApiRequest = requestUrl.startsWith('/api/') || requestUrl.startsWith(`${window.location.origin}/api/`);
  const isMutation = !['GET', 'HEAD', 'OPTIONS'].includes(method);

  if (isApiRequest && isMutation && !requestUrl.includes('/api/login')) {
    const csrfToken = decodeURIComponent(readCookie('wsu_csrf'));
    if (csrfToken) {
      const headers = new Headers(init.headers || (typeof input !== 'string' ? input.headers : undefined) || {});
      headers.set('X-CSRF-Token', csrfToken);
      init = { ...init, headers };
    }
  }

  return nativeFetch(input, init);
};

function showToast(msg, type = '') {
  const toast = document.getElementById('admToast');
  if (!toast) return;
  toast.textContent = msg;
  toast.className = 'adm-toast' + (type ? ` adm-toast--${type}` : '');
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

const ADMIN_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const ADMIN_IMAGE_MAX_MESSAGE = 'Upload image of less than 5MB.';

function validateAdminImageFile(file) {
  if (!file) {
    showToast('Please select a file first', 'error');
    return false;
  }
  if (file.size > ADMIN_IMAGE_MAX_BYTES) {
    showToast(ADMIN_IMAGE_MAX_MESSAGE, 'error');
    return false;
  }
  if (!String(file.type || '').startsWith('image/')) {
    showToast('Please select an image file', 'error');
    return false;
  }
  return true;
}

async function uploadAdminImageFile(file) {
  if (!validateAdminImageFile(file)) return null;

  const prepareRes = await fetch('/api/upload/signed-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: file.name || 'image.jpg',
      fileType: file.type || 'image/jpeg',
      size: file.size
    })
  });
  const prepareData = await prepareRes.json().catch(() => ({}));
  if (!prepareRes.ok || !prepareData.success || !prepareData.signedUrl || !prepareData.publicUrl) {
    throw new Error(prepareData.error || 'Failed to prepare upload');
  }

  const uploadBody = new FormData();
  uploadBody.append('cacheControl', '3600');
  uploadBody.append('', file);

  const uploadRes = await fetch(prepareData.signedUrl, {
    method: 'PUT',
    headers: { 'x-upsert': 'false' },
    body: uploadBody
  });
  if (!uploadRes.ok) {
    const errorText = await uploadRes.text().catch(() => '');
    throw new Error(errorText || 'Failed to upload to storage');
  }

  return prepareData.publicUrl;
}

function initAdminMobileShell() {
  const sidebar = document.getElementById('admSidebar');
  const toggle = document.getElementById('admSidebarToggle');
  const backdrop = document.getElementById('admSidebarBackdrop');
  if (!sidebar || !toggle || !backdrop) return;

  function setSidebarOpen(isOpen) {
    sidebar.classList.toggle('open', isOpen);
    backdrop.classList.toggle('open', isOpen);
    document.body.classList.toggle('adm-sidebar-open', isOpen);
    toggle.setAttribute('aria-expanded', String(isOpen));
    toggle.setAttribute('aria-label', isOpen ? 'Close admin menu' : 'Open admin menu');
  }

  toggle.addEventListener('click', () => setSidebarOpen(!sidebar.classList.contains('open')));
  backdrop.addEventListener('click', () => setSidebarOpen(false));

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setSidebarOpen(false);
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 900) setSidebarOpen(false);
  });

  qsa('.adm-nav__item').forEach((item) => {
    item.addEventListener('click', () => setSidebarOpen(false));
  });
}

// ── Auth guard ────────────────────────────────────────────
async function checkAuth() {
  try {
    const res = await fetch('/api/auth/check');
    if (!res.ok) throw new Error();
    const data = await res.json();
    const usernameEl = document.getElementById('sidebarUsername');
    if (usernameEl) usernameEl.textContent = data.username;
    return true;
  } catch {
    window.location.href = '/admin/login.html';
    return false;
  }
}

// ── Login page ────────────────────────────────────────────
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = loginForm.querySelector('.adm-btn-primary');
    const errorEl = document.getElementById('loginError');
    const username = document.getElementById('adminUsername').value.trim();
    const password = document.getElementById('adminPassword').value;

    btn.innerHTML = '<span class="adm-spinner"></span> Signing in…';
    btn.disabled = true;
    if (errorEl) errorEl.classList.remove('show');

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok) {
        window.location.href = '/admin/dashboard.html';
      } else {
        if (errorEl) {
          errorEl.textContent = data.error || 'Invalid credentials';
          errorEl.classList.add('show');
        }
        btn.textContent = 'Sign In';
        btn.disabled = false;
      }
    } catch {
      if (errorEl) {
        errorEl.textContent = 'Network error. Please try again.';
        errorEl.classList.add('show');
      }
      btn.textContent = 'Sign In';
      btn.disabled = false;
    }
  });
}

// ── Dashboard ─────────────────────────────────────────────
if (document.getElementById('dashboardPage')) {
  initDashboard();
}

async function initDashboard() {
  const authed = await checkAuth();
  if (!authed) return;
  initAdminMobileShell();

  // Sidebar nav
  qsa('.adm-nav__item[data-page]').forEach(item => {
    item.addEventListener('click', () => {
      qsa('.adm-nav__item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      const page = item.dataset.page;
      showPage(page);
    });
  });

  // Logout
  document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/admin/login.html';
  });

  // Load initial data
  await loadStats();
  await loadRecentLeads();
  await loadLeads();
  await loadScheduleMeetings();
  await loadCreatorLeads();
  await loadVideos();
  await loadCreators();
  await loadAdminSettings();
  await loadBlogs();
  await loadCaseStudies();
  await loadServicesAdmin();
  showPage('overview');

  // Wire creator-apps tab to reload on each visit
  const creatorAppsNavItem = document.querySelector('[data-page="creator-apps"]');
  if (creatorAppsNavItem) {
    creatorAppsNavItem.addEventListener('click', () => { loadCreatorLeads(1); });
  }
}

window.refreshDashboardData = async function() {
  await loadStats();
  await loadRecentLeads();
  await loadLeads(currentPage, qs('#leadsSearch')?.value || '', qs('#leadsStatusFilter')?.value || '');
  await loadScheduleMeetings(scheduleMeetingsPage, qs('#scheduleMeetingsSearch')?.value || '', qs('#scheduleMeetingsStatusFilter')?.value || '', qs('#scheduleMeetingsAudienceFilter')?.value || '');
  await loadCreatorLeads(1);
  await loadVideos();
  await loadCreators();
  await loadBlogs();
  await loadCaseStudies();
  await loadServicesAdmin();
  showToast('Dashboard refreshed', 'success');
};

// ── Stats ─────────────────────────────────────────────────
async function loadStats() {
  try {
    const res = await fetch('/api/stats');
    if (!res.ok) return;
    const data = await res.json();

    setText('statTotal',        data.total);
    setText('statToday',        data.today);
    setText('statBrandTotal',   data.brandTotal   ?? data.total);
    setText('statCreatorTotal', data.creatorTotal ?? 0);
    setText('statScheduleTotal', data.scheduleTotal ?? 0);

    renderChart(data.chart);
  } catch (e) { console.error(e); }
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ── Chart ────────────────────────────────────────────────
function renderChart(chartData) {
  const canvas = document.getElementById('leadsChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;

  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, rect.width, rect.height);

  // Fill in missing days
  const days = [];
  const counts = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayStr = d.toISOString().split('T')[0];
    days.push(d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }));
    const found = chartData.find(r => r.day === dayStr);
    counts.push(found ? found.count : 0);
  }

  const width = rect.width;
  const height = rect.height;
  const pad = { top: 18, right: 18, bottom: 34, left: 38 };
  const chartWidth = Math.max(1, width - pad.left - pad.right);
  const chartHeight = Math.max(1, height - pad.top - pad.bottom);
  const maxValue = Math.max(1, ...counts);
  const points = counts.map((value, index) => ({
    x: pad.left + (chartWidth * index) / Math.max(1, counts.length - 1),
    y: pad.top + chartHeight - (value / maxValue) * chartHeight,
    value
  }));

  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.16)';
  ctx.fillStyle = '#94A3B8';
  ctx.font = '12px sans-serif';

  for (let i = 0; i <= 3; i++) {
    const y = pad.top + (chartHeight * i) / 3;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(width - pad.right, y);
    ctx.stroke();
    const label = Math.round(maxValue - (maxValue * i) / 3);
    ctx.fillText(String(label), 8, y + 4);
  }

  ctx.beginPath();
  points.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.lineTo(points[points.length - 1].x, pad.top + chartHeight);
  ctx.lineTo(points[0].x, pad.top + chartHeight);
  ctx.closePath();
  const gradient = ctx.createLinearGradient(0, pad.top, 0, pad.top + chartHeight);
  gradient.addColorStop(0, 'rgba(245, 166, 35, 0.22)');
  gradient.addColorStop(1, 'rgba(245, 166, 35, 0.02)');
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.beginPath();
  points.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#F5A623';
  ctx.stroke();

  points.forEach((point, index) => {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#F5A623';
    ctx.fill();
    ctx.fillStyle = '#94A3B8';
    ctx.textAlign = index === 0 ? 'left' : (index === points.length - 1 ? 'right' : 'center');
    ctx.fillText(days[index].split(',')[0], point.x, height - 10);
  });
  ctx.textAlign = 'left';
}

// ── Leads table ───────────────────────────────────────────
let allLeads = [];
let currentPage = 1;
const pageSize = 15;
let deleteTargetId = null;

async function loadRecentLeads() {
  try {
    const res = await fetch('/api/leads?page=1&limit=5');
    if (!res.ok) return;
    const data = await res.json();
    renderRecentLeadsTable(data.leads || []);
    const badge = document.getElementById('navLeadsBadge');
    if (badge) badge.textContent = data.total || 0;
  } catch (e) { console.error(e); }
}

async function loadLeads(page = 1, search = '', status = '') {
  currentPage = page;
  const params = new URLSearchParams({ page, limit: pageSize });
  if (search) params.set('search', search);
  if (status) params.set('status', status);

  try {
    const res = await fetch(`/api/leads?${params}`);
    if (!res.ok) return;
    const data = await res.json();
    allLeads = data.leads;
    renderLeadsTable(data.leads);
    renderPagination(data.total, page);
    const badge = document.getElementById('navLeadsBadge');
    if (badge) badge.textContent = data.total || 0;
  } catch (e) { console.error(e); }
}

function renderRecentLeadsTable(leads) {
  const tbody = document.getElementById('recentLeadsTableBody');
  if (!tbody) return;

  if (!leads.length) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="adm-empty"><p>No leads found.</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = leads.map((lead) => `
    <tr>
      <td>
        <div class="name-cell">${escHtml(lead.name)}</div>
        <div class="email-cell">${escHtml(lead.email)}</div>
        ${lead.company ? `<div class="email-cell">${escHtml(lead.company)}</div>` : ''}
      </td>
      <td>${escHtml(lead.phone || '—')}</td>
      <td class="service-cell">${escHtml(lead.service || '—')}</td>
      <td style="max-width: 250px; white-space: pre-wrap; font-size: 13px; color: var(--clr-muted); line-height: 1.4;">${renderLeadDetails(lead)}</td>
      <td>${formatDate(lead.created_at)}</td>
      <td><span class="status-badge status-badge--${lead.status}">${String(lead.status || 'new').toUpperCase()}</span></td>
      <td>
        <div class="adm-row-actions">
          <button class="adm-icon-btn adm-icon-btn--danger" title="Delete" onclick="confirmDelete(${lead.id})">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function renderLeadsTable(leads) {
  const tbody = document.getElementById('leadsTableBody');
  if (!tbody) return;

  if (!leads.length) {
    tbody.innerHTML = `<tr><td colspan="7">
      <div class="adm-empty">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0H4"/></svg>
        <p>No leads found.</p>
      </div>
    </td></tr>`;
    return;
  }

  tbody.innerHTML = leads.map(lead => `
    <tr data-id="${lead.id}">
      <td>
        <div class="name-cell">${escHtml(lead.name)}</div>
        <div class="email-cell">${escHtml(lead.email)}</div>
        ${lead.company ? `<div class="email-cell">${escHtml(lead.company)}</div>` : ''}
      </td>
      <td>${escHtml(lead.phone || '—')}</td>
      <td class="service-cell">${escHtml(lead.service || '—')}</td>
      <td style="max-width: 250px; white-space: pre-wrap; font-size: 13px; color: var(--clr-muted); line-height: 1.4;">${renderLeadDetails(lead)}</td>
      <td>${formatDate(lead.created_at)}</td>
      <td>
        <select class="status-badge status-badge--${lead.status} status-select" data-id="${lead.id}" onchange="updateStatus(${lead.id}, this)">
          <option value="new"       ${lead.status === 'new'       ? 'selected' : ''}>NEW</option>
          <option value="contacted" ${lead.status === 'contacted' ? 'selected' : ''}>CONTACTED</option>
          <option value="converted" ${lead.status === 'converted' ? 'selected' : ''}>CONVERTED</option>
          <option value="closed"    ${lead.status === 'closed'    ? 'selected' : ''}>CLOSED</option>
        </select>
      </td>
      <td>
        <div class="adm-row-actions">
          <button class="adm-icon-btn adm-icon-btn--danger" title="Delete" onclick="confirmDelete(${lead.id})">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function renderPagination(total, page) {
  const el = document.getElementById('pagination');
  if (!el) return;
  const totalPages = Math.ceil(total / pageSize);
  const startItem = Math.min((page - 1) * pageSize + 1, total);
  const endItem   = Math.min(page * pageSize, total);

  const searchVal  = qs('#leadsSearch')?.value  || '';
  const statusVal  = qs('#leadsStatusFilter')?.value || '';

  const pages = [];
  for (let i = 1; i <= totalPages; i++) pages.push(i);

  el.innerHTML = `
    <span class="adm-pagination__info">Showing ${startItem}–${endItem} of ${total} leads</span>
    <div class="adm-pagination__buttons">
      ${pages.map(p => `<button class="adm-page-btn ${p === page ? 'active' : ''}"
        onclick="loadLeads(${p}, decodeURIComponent('${encodeURIComponent(searchVal)}'), decodeURIComponent('${encodeURIComponent(statusVal)}'))">${p}</button>`).join('')}
    </div>
  `;
}

function escHtml(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function safeAdminUrl(value) {
  try {
    const parsed = new URL(String(value || ''), window.location.origin);
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : '';
  } catch {
    return '';
  }
}

function extractUrlFromText(value) {
  const match = String(value || '').match(/https?:\/\/[^\s)]+/i);
  return match ? match[0] : '';
}

function renderLink(url, label = 'Open link') {
  const safeUrl = safeAdminUrl(url);
  if (!safeUrl) return '';
  return `<a href="${escHtml(safeUrl)}" target="_blank" rel="noopener noreferrer">${escHtml(label)}</a>`;
}

function renderLeadDetails(lead) {
  const rows = [];
  if (lead.website) rows.push(`Website: ${renderLink(lead.website, lead.website)}`);
  if (lead.message) rows.push(escHtml(lead.message));
  return rows.length ? rows.join('\n') : '—';
}

function formatDate(str) {
  if (!str) return '—';
  const d = new Date(str);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ── Update lead status ────────────────────────────────────
window.updateStatus = async function(id, selectEl) {
  const status = selectEl.value;
  selectEl.className = `status-badge status-badge--${status} status-select`;
  try {
    const res = await fetch(`/api/leads/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (res.ok) showToast('Status updated', 'success');
    else showToast('Update failed', 'error');
  } catch { showToast('Network error', 'error'); }
};

// ── Delete lead ────────────────────────────────────────────
window.confirmDelete = function(id) {
  deleteTargetId = id;
  const modal = document.getElementById('deleteModal');
  if (modal) modal.classList.add('open');
};

document.getElementById('deleteConfirmBtn')?.addEventListener('click', async () => {
  if (!deleteTargetId) return;
  const modal = document.getElementById('deleteModal');
  try {
    const res = await fetch(`/api/leads/${deleteTargetId}`, { method: 'DELETE' });
    if (res.ok) {
      showToast('Lead deleted', 'success');
      if (modal) modal.classList.remove('open');
      deleteTargetId = null;
      await loadLeads(currentPage, qs('#leadsSearch')?.value || '', qs('#leadsStatusFilter')?.value || '');
      await loadRecentLeads();
      await loadStats();
    } else {
      showToast('Delete failed', 'error');
    }
  } catch { showToast('Network error', 'error'); }
});
document.getElementById('deleteCancelBtn')?.addEventListener('click', () => {
  deleteTargetId = null;
  document.getElementById('deleteModal')?.classList.remove('open');
});

// ── Filter / search leads ─────────────────────────────────
let searchDebounce;
document.getElementById('leadsSearch')?.addEventListener('input', (e) => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    loadLeads(1, e.target.value, qs('#leadsStatusFilter')?.value || '');
  }, 350);
});
document.getElementById('leadsStatusFilter')?.addEventListener('change', (e) => {
  loadLeads(1, qs('#leadsSearch')?.value || '', e.target.value);
});

// ── Export CSV ────────────────────────────────────────────
document.getElementById('exportCSVBtn')?.addEventListener('click', () => {
  if (!allLeads.length) { showToast('No data to export', ''); return; }
  const headers = ['ID', 'Name', 'Email', 'Phone', 'Company', 'Website', 'Service', 'Message', 'Status', 'Date'];
  const csvCell = (value) => {
    const raw = String(value ?? '');
    const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  const rows = allLeads.map(l => [
    l.id,
    csvCell(l.name),
    csvCell(l.email),
    csvCell(l.phone || ''),
    csvCell(l.company || ''),
    csvCell(l.website || ''),
    csvCell(l.service || ''),
    csvCell(l.message || ''),
    csvCell(l.status || ''),
    csvCell(l.created_at || '')
  ]);
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `wsu-leads-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Exported!', 'success');
});

// ── Schedule Meetings ────────────────────────────────────
let allScheduleMeetings = [];
let scheduleMeetingsPage = 1;
const scheduleMeetingsPageSize = 15;

async function loadScheduleMeetings(page = 1, search = '', status = '', audienceType = '') {
  scheduleMeetingsPage = page;
  const params = new URLSearchParams({ page, limit: scheduleMeetingsPageSize });
  if (search) params.set('search', search);
  if (status) params.set('status', status);
  if (audienceType) params.set('audience_type', audienceType);

  try {
    const res = await fetch(`/api/schedule-meetings?${params}`);
    if (!res.ok) return;
    const data = await res.json();
    allScheduleMeetings = data.data || [];
    renderScheduleMeetingsTable(allScheduleMeetings);
    renderScheduleMeetingsPagination(data.total || 0, page);
    const badge = document.getElementById('navScheduleMeetingsBadge');
    if (badge) badge.textContent = data.total || 0;
  } catch (e) { console.error(e); }
}

function renderScheduleMeetingsTable(meetings) {
  const tbody = document.getElementById('scheduleMeetingsTableBody');
  if (!tbody) return;

  if (!meetings.length) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="adm-empty"><p>No scheduled meetings found.</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = meetings.map((meeting) => {
    const status = meeting.status || 'new';
    const audienceType = meeting.audience_type === 'creator' ? 'Creator' : 'Brand';
    return `
      <tr data-id="${meeting.id}">
        <td><span class="adm-nav__badge" style="background:${meeting.audience_type === 'creator' ? '#4f46e5' : '#059669'}">${audienceType}</span></td>
        <td>
          <div class="name-cell">${escHtml(meeting.name)}</div>
          <div class="email-cell">${escHtml(meeting.email)}</div>
        </td>
        <td>${escHtml(meeting.phone || '—')}</td>
        <td class="service-cell">${escHtml(meeting.service || '—')}</td>
        <td style="max-width:260px;white-space:pre-wrap;font-size:13px;color:var(--adm-muted);line-height:1.4;">${meeting.message ? escHtml(meeting.message) : '—'}</td>
        <td>${formatDate(meeting.created_at)}</td>
        <td>
          <select class="status-badge status-badge--${status} status-select" data-id="${meeting.id}" onchange="updateScheduleMeetingStatus(${meeting.id}, this)">
            <option value="new" ${status === 'new' ? 'selected' : ''}>NEW</option>
            <option value="contacted" ${status === 'contacted' ? 'selected' : ''}>CONTACTED</option>
            <option value="converted" ${status === 'converted' ? 'selected' : ''}>CONVERTED</option>
            <option value="closed" ${status === 'closed' ? 'selected' : ''}>CLOSED</option>
          </select>
        </td>
        <td>
          <div class="adm-row-actions">
            <button class="adm-icon-btn adm-icon-btn--danger" title="Delete" onclick="deleteScheduleMeeting(${meeting.id})">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function renderScheduleMeetingsPagination(total, page) {
  const el = document.getElementById('scheduleMeetingsPagination');
  if (!el) return;
  const totalPages = Math.ceil(total / scheduleMeetingsPageSize);
  const startItem = total ? Math.min((page - 1) * scheduleMeetingsPageSize + 1, total) : 0;
  const endItem = Math.min(page * scheduleMeetingsPageSize, total);
  const searchVal = qs('#scheduleMeetingsSearch')?.value || '';
  const statusVal = qs('#scheduleMeetingsStatusFilter')?.value || '';
  const audienceVal = qs('#scheduleMeetingsAudienceFilter')?.value || '';

  if (!totalPages) {
    el.innerHTML = `<span class="adm-pagination__info">No scheduled meetings</span>`;
    return;
  }

  el.innerHTML = `
    <span class="adm-pagination__info">Showing ${startItem}–${endItem} of ${total} scheduled meetings</span>
    <div class="adm-pagination__buttons">
      ${Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => `
        <button class="adm-page-btn ${pageNumber === page ? 'active' : ''}" onclick="loadScheduleMeetings(${pageNumber}, decodeURIComponent('${encodeURIComponent(searchVal)}'), decodeURIComponent('${encodeURIComponent(statusVal)}'), decodeURIComponent('${encodeURIComponent(audienceVal)}'))">${pageNumber}</button>
      `).join('')}
    </div>
  `;
}

window.updateScheduleMeetingStatus = async function(id, selectEl) {
  const status = selectEl.value;
  selectEl.className = `status-badge status-badge--${status} status-select`;
  try {
    const res = await fetch(`/api/schedule-meetings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (res.ok) {
      showToast('Scheduled meeting updated', 'success');
      await loadStats();
    } else {
      showToast('Update failed', 'error');
    }
  } catch { showToast('Network error', 'error'); }
};

window.deleteScheduleMeeting = async function(id) {
  if (!confirm('Delete this scheduled meeting?')) return;
  try {
    const res = await fetch(`/api/schedule-meetings/${id}`, { method: 'DELETE' });
    if (res.ok) {
      showToast('Scheduled meeting deleted', 'success');
      await loadScheduleMeetings(scheduleMeetingsPage, qs('#scheduleMeetingsSearch')?.value || '', qs('#scheduleMeetingsStatusFilter')?.value || '', qs('#scheduleMeetingsAudienceFilter')?.value || '');
      await loadStats();
    } else {
      showToast('Delete failed', 'error');
    }
  } catch { showToast('Network error', 'error'); }
};

window.exportScheduleMeetingsCSV = function() {
  if (!allScheduleMeetings.length) { showToast('No schedule meetings to export', ''); return; }
  const headers = ['ID', 'Type', 'Name', 'Email', 'Phone', 'Service', 'Message', 'Status', 'Date'];
  const csvCell = (value) => {
    const raw = String(value ?? '');
    const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  const rows = allScheduleMeetings.map((meeting) => [
    meeting.id,
    csvCell(meeting.audience_type || ''),
    csvCell(meeting.name),
    csvCell(meeting.email),
    csvCell(meeting.phone || ''),
    csvCell(meeting.service || ''),
    csvCell(meeting.message || ''),
    csvCell(meeting.status || ''),
    csvCell(meeting.created_at || '')
  ]);
  const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `wsu-schedule-meetings-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Schedule meetings exported', 'success');
};

let scheduleMeetingsSearchDebounce;
document.getElementById('scheduleMeetingsSearch')?.addEventListener('input', (event) => {
  clearTimeout(scheduleMeetingsSearchDebounce);
  scheduleMeetingsSearchDebounce = setTimeout(() => {
    loadScheduleMeetings(1, event.target.value, qs('#scheduleMeetingsStatusFilter')?.value || '', qs('#scheduleMeetingsAudienceFilter')?.value || '');
  }, 350);
});

document.getElementById('scheduleMeetingsStatusFilter')?.addEventListener('change', (event) => {
  loadScheduleMeetings(1, qs('#scheduleMeetingsSearch')?.value || '', event.target.value, qs('#scheduleMeetingsAudienceFilter')?.value || '');
});

document.getElementById('scheduleMeetingsAudienceFilter')?.addEventListener('change', (event) => {
  loadScheduleMeetings(1, qs('#scheduleMeetingsSearch')?.value || '', qs('#scheduleMeetingsStatusFilter')?.value || '', event.target.value);
});

// ── Creator Applications ─────────────────────────────────
async function loadCreatorLeads(page = 1, search = '') {
  try {
    const params = new URLSearchParams({ page, limit: 10 });
    if (search) params.set('search', search);
    const res = await fetch(`/api/creators/leads?${params}`);
    if (!res.ok) return;
    const data = await res.json();
    renderCreatorLeadsTable(data.data || []);
    renderCreatorLeadsPagination(data.pagination || null, search);
  } catch (e) { console.error(e); }
}

function renderCreatorLeadsTable(leads) {
  const tbody = document.getElementById('creatorLeadsTbody');
  if (!tbody) return;

  if (!leads.length) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="adm-empty"><p>No creator applications found.</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = leads.map((lead) => `
    <tr>
      <td>
        <div class="name-cell">${escHtml(lead.name)}</div>
        <div class="email-cell">${escHtml(lead.email)}</div>
        <div class="email-cell">${escHtml(lead.phone || '—')}</div>
      </td>
      <td>
        <div>${renderCreatorPlatform('Instagram', lead.instagram_url || extractUrlFromText(lead.has_instagram), lead.has_instagram)}</div>
        <div>${renderCreatorPlatform('YouTube', lead.youtube_url || extractUrlFromText(lead.has_youtube), lead.has_youtube)}</div>
      </td>
      <td>
        <div>${escHtml(lead.category || '—')}</div>
        <div class="email-cell">${escHtml(lead.language || '—')}</div>
      </td>
      <td>${formatDate(lead.created_at)}</td>
      <td>
        <div class="adm-row-actions">
          <button class="adm-icon-btn adm-icon-btn--danger" title="Delete" onclick="deleteCreatorLead(${lead.id})">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function renderCreatorPlatform(label, url, legacyValue) {
  const safeUrl = safeAdminUrl(url);
  if (safeUrl) return `${label}: ${renderLink(safeUrl, safeUrl)}`;
  return `${label}: ${legacyValue && legacyValue !== 'No' ? escHtml(legacyValue) : '—'}`;
}

function renderCreatorLeadsPagination(pagination, search = '') {
  const el = document.getElementById('creatorLeadsPagination');
  if (!el || !pagination) return;

  const totalPages = pagination.totalPages || 1;
  const page = pagination.page || 1;

  el.innerHTML = `
    <span class="adm-pagination__info">Showing page ${page} of ${totalPages}</span>
    <div class="adm-pagination__buttons">
      ${Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => `
        <button class="adm-page-btn ${pageNumber === page ? 'active' : ''}" onclick="loadCreatorLeads(${pageNumber}, decodeURIComponent('${encodeURIComponent(search)}'))">${pageNumber}</button>
      `).join('')}
    </div>
  `;
}

let creatorAppsSearchDebounce;
document.getElementById('creatorAppsSearch')?.addEventListener('input', (event) => {
  clearTimeout(creatorAppsSearchDebounce);
  creatorAppsSearchDebounce = setTimeout(() => loadCreatorLeads(1, event.target.value.trim()), 300);
});

window.deleteCreatorLead = async function(id) {
  if (!confirm('Delete this creator application?')) return;
  try {
    const res = await fetch(`/api/creators/leads/${id}`, { method: 'DELETE' });
    if (res.ok) {
      showToast('Creator application deleted', 'success');
      loadCreatorLeads(1);
      loadStats();
    } else {
      showToast('Delete failed', 'error');
    }
  } catch {
    showToast('Network error', 'error');
  }
};

// ── Page navigation ───────────────────────────────────────
function showPage(page) {
  qsa('.adm-page').forEach(p => p.style.display = 'none');
  const target = document.getElementById(`page-${page}`);
  if (target) target.style.display = 'block';
  const titleEl = document.getElementById('pageTitle');
  const titles = {
    overview: 'Overview',
    leads: 'Leads Management',
    'schedule-meetings': 'Schedule Meetings',
    'creator-apps': 'Creator Applications',
    videos: 'UGC Videos',
    creators: 'Creators',
    blogs: 'Blog Posts',
    'case-studies': 'Case Studies',
    services: 'Service Pages'
  };
  if (titleEl) titleEl.textContent = titles[page] || page;
  // Refresh on navigate
  if (page === 'blogs') loadBlogs();
  if (page === 'case-studies') loadCaseStudies();
  if (page === 'services') loadServicesAdmin();
  if (page === 'schedule-meetings') loadScheduleMeetings(1);
  if (page === 'creator-apps') loadCreatorLeads(1);
}

// ── Videos Management ──────────────────────────────────────
let allVideos = [];

async function loadVideos() {
  try {
    const res = await fetch('/api/videos');
    if (!res.ok) return;
    allVideos = await res.json();
    renderVideosTable(allVideos);
  } catch (e) { console.error('Failed to load videos', e); }
}

function renderVideosTable(videos) {
  const tbody = document.getElementById('videosTableBody');
  if (!tbody) return;

  if (!videos.length) {
    tbody.innerHTML = `<tr><td colspan="4">
      <div class="adm-empty"><p>No UGC videos found.</p></div>
    </td></tr>`;
    return;
  }

  tbody.innerHTML = videos.map(v => {
    const hasThumb = Boolean(v.thumbnail_url);
    const hasVideo = Boolean(v.video_url);
    return `
    <tr>
      <td>
        <div style="width:72px;height:72px;border-radius:14px;background:linear-gradient(135deg,#111827,#1A5FB4);overflow:hidden;position:relative;display:grid;place-items:center;color:#fff;font-weight:900;">
          ${hasThumb ? `<img src="${escHtml(v.thumbnail_url)}" alt="${escHtml(v.title || 'UGC video')} thumbnail" style="width:100%;height:100%;object-fit:cover;" onerror="this.remove();">` : `<span style="font-size:13px;letter-spacing:.08em;">UGC</span>`}
          ${hasVideo ? `<span style="position:absolute;right:6px;bottom:6px;width:22px;height:22px;border-radius:999px;background:rgba(245,166,35,.95);display:grid;place-items:center;color:#111827;font-size:11px;">▶</span>` : ''}
        </div>
      </td>
      <td>
        <strong>${escHtml(v.title)}</strong>
        <div style="font-size:12px;color:#64748b;margin-top:4px;">${hasVideo ? 'Video attached' : (hasThumb ? 'Thumbnail only' : 'Needs media')}</div>
        ${v.visit_url ? `<a href="${escHtml(v.visit_url)}" target="_blank" rel="noopener" style="display:inline-flex;margin-top:6px;font-size:12px;font-weight:700;color:#F5A623;">Visit link ↗</a>` : ''}
      </td>
      <td><span class="adm-nav__badge" style="background:#4f46e5">${escHtml(v.category || 'UGC')}</span></td>
      <td>
        <div class="adm-row-actions">
          <button class="adm-icon-btn" onclick="editVideo(${v.id})" title="Edit">✏️</button>
          <button class="adm-icon-btn adm-icon-btn--danger" onclick="deleteVideo(${v.id})" title="Delete">🗑️</button>
        </div>
      </td>
    </tr>
  `;
  }).join('');
}

function setUgcMediaPreview(type, url) {
  const isThumb = type === 'thumb';
  const previewWrap = document.getElementById(isThumb ? 'thumbPreviewWrap' : 'videoPreviewWrap');
  const pathLabel = document.getElementById(isThumb ? 'thumbPathLabel' : 'videoPathLabel');
  const previewEl = document.getElementById(isThumb ? 'thumbPreviewImg' : 'videoPreviewEl');
  const input = document.getElementById(isThumb ? 'videoThumbnail' : 'videoUrl');

  if (input) input.value = url || '';
  if (pathLabel) {
    pathLabel.textContent = url || '';
    pathLabel.style.display = url ? 'block' : 'none';
  }
  if (previewEl) {
    if (url) {
      previewEl.src = url;
    } else {
      previewEl.removeAttribute('src');
      if (previewEl.load) previewEl.load();
    }
  }
  if (previewWrap) previewWrap.style.display = url ? 'block' : 'none';
}

window.openVideoModal = function() {
  document.getElementById('videoForm')?.reset();
  document.getElementById('videoIdInput').value = '';
  document.getElementById('videoVisitUrl').value = '';
  setUgcMediaPreview('thumb', '');
  setUgcMediaPreview('video', '');
  const thumbFile = document.getElementById('videoThumbFile');
  const videoFile = document.getElementById('videoFile');
  if (thumbFile) thumbFile.value = '';
  if (videoFile) {
    videoFile.value = '';
    videoFile.setAttribute('accept', 'video/*,.mp4,.mov,.webm,.m4v');
  }
  document.getElementById('videoModalTitle').textContent = 'Add New UGC Video';
  document.getElementById('videoModal').classList.add('open');
};

window.closeVideoModal = () => document.getElementById('videoModal').classList.remove('open');

window.editVideo = function(id) {
  const v = allVideos.find(x => x.id === id);
  if (!v) return;

  document.getElementById('videoIdInput').value = v.id;
  document.getElementById('videoTitle').value = v.title || '';
  document.getElementById('videoCategory').value = v.category || 'UGC';
  document.getElementById('videoVisitUrl').value = v.visit_url || '';
  setUgcMediaPreview('thumb', v.thumbnail_url || '');
  setUgcMediaPreview('video', v.video_url || '');
  const thumbFile = document.getElementById('videoThumbFile');
  const videoFile = document.getElementById('videoFile');
  if (thumbFile) thumbFile.value = '';
  if (videoFile) {
    videoFile.value = '';
    videoFile.setAttribute('accept', 'video/*,.mp4,.mov,.webm,.m4v');
  }

  document.getElementById('videoModalTitle').textContent = 'Edit UGC Video';
  document.getElementById('videoModal').classList.add('open');
};

window.uploadUgcMedia = async function(type) {
  const fileInput = document.getElementById(type === 'thumb' ? 'videoThumbFile' : 'videoFile');
  if (!fileInput.files.length) {
    showToast('Please select a file first', 'error'); return;
  }
  const file = fileInput.files[0];
  const fileName = (file.name || '').toLowerCase();
  const isVideoFile = file.type.startsWith('video/') || /\.(mp4|mov|webm|m4v)$/i.test(fileName);
  if (type === 'thumb' && !validateAdminImageFile(file)) {
    return;
  }
  if (type === 'video' && !isVideoFile) {
    showToast('Please select an MP4, MOV, WEBM, or M4V video', 'error');
    return;
  }

  const btn = document.getElementById(type === 'thumb' ? 'thumbUploadBtn' : 'videoUploadBtn');
  const originalText = btn ? btn.textContent : '';
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Uploading...';
  }
  try {
    if (type === 'thumb') {
      const url = await uploadAdminImageFile(file);
      if (!url) return;
      setUgcMediaPreview('thumb', url);
      fileInput.value = '';
      showToast('Uploaded successfully', 'success');
      return;
    }

    const formData = new FormData();
    formData.append('video', file);
    const uploadUrl = type === 'video' ? '/api/upload-video' : '/api/upload';
    let res = await fetch(uploadUrl, { method: 'POST', body: formData });
    let data = await res.json().catch(() => ({}));

    if (type === 'video' && res.status === 404) {
      const fallbackFormData = new FormData();
      fallbackFormData.append('image', file);
      res = await fetch('/api/upload', { method: 'POST', body: fallbackFormData });
      data = await res.json().catch(() => ({}));
    }

    if (data.success) {
      if (type === 'thumb') {
        setUgcMediaPreview('thumb', data.url);
      } else {
        setUgcMediaPreview('video', data.url);
      }
      fileInput.value = '';
      showToast('Uploaded successfully', 'success');
    } else {
      showToast(data.error || (res.status === 404 ? 'Upload API not found. Restart the Node server.' : 'Upload failed'), 'error');
    }
  } catch (err) {
    showToast(err.message || 'Upload failed', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  }
};

document.getElementById('videoForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('videoIdInput').value;
  const payload = {
    title: document.getElementById('videoTitle').value.trim(),
    category: document.getElementById('videoCategory').value.trim() || 'UGC',
    thumbnail_url: document.getElementById('videoThumbnail').value.trim(),
    video_url: document.getElementById('videoUrl').value.trim(),
    badge: '', 
    likes_count: 0,
    comments_count: 0,
    visit_url: document.getElementById('videoVisitUrl').value.trim()
  };
  if (!payload.title) {
    showToast('Video title is required', 'error');
    return;
  }
  if (!payload.thumbnail_url && !payload.video_url) {
    showToast('Upload a thumbnail or video before saving', 'error');
    return;
  }

  const url = id ? `/api/videos/${id}` : '/api/videos';
  const method = id ? 'PUT' : 'POST';
  const submitBtn = e.submitter;
  if (submitBtn) submitBtn.disabled = true;
  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      showToast(id ? 'Video updated' : 'Video added', 'success');
      closeVideoModal();
      loadVideos();
    } else {
      showToast(data.error || 'Error saving video info', 'error');
    }
  } catch {
    showToast('Error saving video info', 'error');
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
});

window.deleteVideo = async function(id) {
  if (!confirm('Are you sure you want to delete this video?')) return;
  const res = await fetch(`/api/videos/${id}`, { method: 'DELETE' });
  if (res.ok) {
    showToast('Video deleted', 'success');
    loadVideos();
  } else {
    showToast('Could not delete video', 'error');
  }
};

// ── Creators Management ──────────────────────────────────────
let allCreators = [];

async function loadCreators() {
  try {
    const res = await fetch('/api/creators');
    if (!res.ok) return;
    allCreators = await res.json();
    renderCreatorsTable(allCreators);
  } catch (e) { console.error('Failed to load creators', e); }
}

function renderCreatorsTable(creators) {
  const tbody = document.getElementById('creatorsTableBody');
  if (!tbody) return;

  if (!creators.length) {
    tbody.innerHTML = `<tr><td colspan="4">
      <div class="adm-empty"><p>No creators found.</p></div>
    </td></tr>`;
    return;
  }

  tbody.innerHTML = creators.map(c => `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="width:40px;height:40px;border-radius:50%;background:#1E293B;overflow:hidden;flex-shrink:0;">
            ${c.image_url ? `<img src="${escHtml(c.image_url)}" style="width:100%;height:100%;object-fit:cover;">` : ''}
          </div>
          <div>
            <strong>${escHtml(c.name)}</strong>
          </div>
        </div>
      </td>
      <td>
        <span class="adm-nav__badge">${escHtml(c.category)}</span>
      </td>
      <td>
        ${escHtml(c.platform)} <br>
        <small style="color:#94a3b8">${escHtml(c.followers || '0')} followers</small>
      </td>
      <td>
        <div class="adm-row-actions">
          <button class="adm-icon-btn" onclick="editCreator(${c.id})" title="Edit">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
          </button>
          <button class="adm-icon-btn adm-icon-btn--danger" onclick="confirmDeleteCreator(${c.id})" title="Delete">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

window.openCreatorModal = function() {
  document.getElementById('creatorForm')?.reset();
  document.getElementById('creatorIdInput').value = '';
  document.getElementById('creatorImage').value = '';
  updateCreatorPreview('');
  document.getElementById('creatorModalTitle').textContent = 'Add New Creator';
  const mdl = document.getElementById('creatorModal');
  if(mdl) mdl.classList.add('open');
};

window.closeCreatorModal = function() {
  const mdl = document.getElementById('creatorModal');
  if(mdl) mdl.classList.remove('open');
};

window.editCreator = function(id) {
  const c = allCreators.find(x => x.id === id);
  if (!c) return;

  document.getElementById('creatorIdInput').value = c.id;
  document.getElementById('creatorName').value = c.name;
  document.getElementById('creatorCategory').value = c.category || 'Top Creators';
  document.getElementById('creatorPlatform').value = c.platform || 'Instagram';
  document.getElementById('creatorFollowers').value = c.followers || '';
  document.getElementById('creatorImage').value = c.image_url || '';
  document.getElementById('creatorProfile').value = c.profile_url || '';

  updateCreatorPreview(c.image_url || '');

  document.getElementById('creatorModalTitle').textContent = 'Edit Creator';
  const mdl = document.getElementById('creatorModal');
  if(mdl) mdl.classList.add('open');
};
document.getElementById('creatorForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('creatorIdInput').value;
  
  const payload = {
    name: document.getElementById('creatorName').value,
    category: document.getElementById('creatorCategory').value,
    platform: document.getElementById('creatorPlatform').value,
    followers: document.getElementById('creatorFollowers').value,
    image_url: document.getElementById('creatorImage').value,
    profile_url: document.getElementById('creatorProfile').value,
  };

  const method = id ? 'PUT' : 'POST';
  const url = id ? '/api/creators/' + id : '/api/creators';

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      showToast(id ? 'Creator updated' : 'Creator added', 'success');
      closeCreatorModal();
      loadCreators();
    } else {
      showToast('Error saving creator', 'error');
    }
  } catch {
    showToast('Network error', 'error');
  }
});

window.confirmDeleteCreator = function(id) {
  if(confirm("Are you sure you want to delete this creator?")) {
    fetch('/api/creators/' + id, { method: 'DELETE' })
      .then(res => {
        if(res.ok) {
          showToast('Creator deleted', 'success');
          loadCreators();
        } else {
           showToast('Delete failed', 'error');
        }
      })
      .catch(() => showToast('Error', 'error'));
  }
};

// ── Image Uploads & Scraping ─────────────────────────────────
window.switchImageMode = function(mode) {
  document.getElementById('imgSectionUrl').style.display = (mode === 'url') ? 'block' : 'none';
  document.getElementById('imgSectionUpload').style.display = (mode === 'upload') ? 'flex' : 'none';
  document.getElementById('imgSectionScrape').style.display = (mode === 'scrape') ? 'flex' : 'none';
  
  // reset visual buttons
  ['Url', 'Upload', 'Scrape'].forEach(m => {
    const btn = document.getElementById('imgBtn' + m);
    if (!btn) return;
    if (m.toLowerCase() === mode) {
      btn.style.background = '#fff';
      btn.style.color = 'var(--clr-text)';
      btn.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
    } else {
      btn.style.background = 'transparent';
      btn.style.color = '#64748b';
      btn.style.boxShadow = 'none';
    }
  });
};

window.updateCreatorPreview = function(url) {
  const wrap = document.getElementById('creatorImgPreviewWrap');
  const img = document.getElementById('creatorImgPreview');
  if (!wrap || !img) return;

  const safeUrl = (url || '').trim();
  img.onload = null;
  img.onerror = null;
  wrap.style.display = 'none';

  if (!safeUrl) {
    img.removeAttribute('src');
    return;
  }

  img.onload = () => {
    wrap.style.display = 'block';
  };
  img.onerror = () => {
    wrap.style.display = 'none';
    img.removeAttribute('src');
  };
  img.src = safeUrl;
};

window.uploadCreatorImage = async function() {
  const fileInput = document.getElementById('creatorImageFile');
  if (!fileInput.files.length) {
    showToast('Please select a file first', 'error'); return;
  }

  const btn = document.getElementById('creatorUploadBtn');
  btn.textContent = 'Uploading...';
  try {
    const url = await uploadAdminImageFile(fileInput.files[0]);
    if (!url) return;
    document.getElementById('creatorImage').value = url;
    updateCreatorPreview(url);
    showToast('Image uploaded', 'success');
    switchImageMode('url');
  } catch (err) {
    showToast(err.message || 'Upload failed', 'error');
  } finally {
    btn.textContent = 'Upload';
  }
};

window.scrapeProfileImage = async function() {
  const url = document.getElementById('creatorProfile').value;
  if (!url) {
    showToast('Please enter Profile URL first', 'error'); return;
  }
  const btn = document.getElementById('creatorScrapeBtn');
  const stat = document.getElementById('scrapeStatus');
  btn.textContent = 'Fetching...';
  stat.textContent = '';
  
  try {
    const res = await fetch('/api/scrape-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      document.getElementById('creatorImage').value = data.url;
      updateCreatorPreview(data.url);
      stat.textContent = 'Found and saved locally.';
      stat.style.color = 'green';
      setTimeout(() => switchImageMode('url'), 1000);
    } else {
      stat.textContent = (res.status === 404 && data.error === 'Not found')
        ? 'Scrape API not found. Restart the Node server.'
        : (data.error || 'Blocked by platform.');
      stat.style.color = 'red';
    }
  } catch (err) {
    stat.textContent = 'Error scraping.';
    stat.style.color = 'red';
  } finally {
    btn.textContent = 'Fetch from Profile URL';
  }
};

// ── Categories & Platforms Management ─────────────────────────────────
let allCatList = [];
let allPlatList = [];

window.loadAdminSettings = async function() {
  try {
    const [cRes, pRes] = await Promise.all([ fetch('/api/categories'), fetch('/api/platforms') ]);
    allCatList = await cRes.json();
    allPlatList = await pRes.json();
    
    // Populate Modal Dropdowns
    const catSel = document.getElementById('creatorCategory');
    if (catSel) catSel.innerHTML = allCatList.map(c => `<option value="${escHtml(c.name)}">${escHtml(c.name)}</option>`).join('');
    
    const platSel = document.getElementById('creatorPlatform');
    if (platSel) platSel.innerHTML = allPlatList.map(p => `<option value="${escHtml(p.name)}">${escHtml(p.name)}</option>`).join('');
  } catch(e) {}
};

window.openCategoriesModal = function() {
  renderCategoriesTable();
  document.getElementById('categoriesModal').classList.add('open');
};
window.openPlatformsModal = function() {
  renderPlatformsTable();
  document.getElementById('platformsModal').classList.add('open');
};

function renderCategoriesTable() {
  const tb = document.getElementById('categoriesTableBody');
  if(!tb) return;
  tb.innerHTML = allCatList.map(c => `
    <tr>
      <td>${escHtml(c.name)}</td>
      <td style="text-align:right;">
        <button class="adm-icon-btn adm-icon-btn--danger" onclick="deleteCategory(${c.id})"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
      </td>
    </tr>
  `).join('');
}

function renderPlatformsTable() {
  const tb = document.getElementById('platformsTableBody');
  if(!tb) return;
  tb.innerHTML = allPlatList.map(p => `
    <tr>
      <td>${escHtml(p.name)}</td>
      <td style="text-align:right;">
         <button class="adm-icon-btn adm-icon-btn--danger" onclick="deletePlatform(${p.id})"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
      </td>
    </tr>
  `).join('');
}

window.addCategory = async function() {
  const name = document.getElementById('newCategoryName').value.trim();
  if(!name) return;
  const res = await fetch('/api/categories', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({name}) });
  if (res.ok) { document.getElementById('newCategoryName').value = ''; await loadAdminSettings(); renderCategoriesTable(); }
};
window.deleteCategory = async function(id) {
  if(!confirm("Delete category?")) return;
  const res = await fetch('/api/categories/' + id, { method: 'DELETE' });
  if (res.ok) { await loadAdminSettings(); renderCategoriesTable(); }
};

window.addPlatform = async function() {
  const name = document.getElementById('newPlatformName').value.trim();
  if(!name) return;
  const res = await fetch('/api/platforms', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({name}) });
  if (res.ok) { document.getElementById('newPlatformName').value = ''; await loadAdminSettings(); renderPlatformsTable(); }
};
window.deletePlatform = async function(id) {
  if(!confirm("Delete platform?")) return;
  const res = await fetch('/api/platforms/' + id, { method: 'DELETE' });
  if (res.ok) { await loadAdminSettings(); renderPlatformsTable(); }
};

// ── Blogs Logic ────────────────────────────────────────────────────────
let allBlogs = [];
async function loadBlogs() {
  try {
    const res = await fetch('/api/blogs');
    if (!res.ok) return;
    allBlogs = await res.json();
    renderBlogsTable();
  } catch (e) {}
}

function renderBlogsTable() {
  const tbody = document.getElementById('blogsTableBody');
  if (!tbody) return;
  if (!allBlogs.length) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="adm-empty"><p>No blogs found.</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = allBlogs.map(b => `
    <tr>
      <td><span style="font-size:18px;font-weight:bold;color:#475569;">${b.order_idx}</span></td>
      <td>
        <div style="width:60px;height:40px;border-radius:4px;background:#e2e8f0;overflow:hidden;">
          ${b.image_url ? `<img src="${escHtml(b.image_url)}" style="width:100%;height:100%;object-fit:cover;">` : ''}
        </div>
      </td>
      <td><strong>${escHtml(b.title)}</strong></td>
      <td>${escHtml(b.date_text || '')}</td>
      <td>
        <div class="adm-row-actions">
          <button class="adm-icon-btn" onclick="editBlog(${b.id})" title="Edit">✏️</button>
          <button class="adm-icon-btn adm-icon-btn--danger" onclick="deleteBlog(${b.id})" title="Delete">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
}

window.openBlogModal = function() {
  document.getElementById('blogForm').reset();
  document.getElementById('blogEditor').innerHTML = '';
  document.getElementById('blogIdInput').value = '';
  document.getElementById('blogImage').value = '';
  // Default date to today
  const today = new Date();
  document.getElementById('blogDate').value = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const bp = document.getElementById('blogImagePreview'); if(bp) bp.style.display='none';
  
  // Slot system logic
  document.getElementById('blogOrder').value = allBlogs.length + 1;
  document.getElementById('blogOrder').max = allBlogs.length + 1;

  document.getElementById('blogModalTitle').textContent = 'Add New Blog';
  document.getElementById('blogModal').classList.add('open');
};

window.closeBlogModal = () => document.getElementById('blogModal').classList.remove('open');

window.editBlog = function(id) {
  const b = allBlogs.find(x => x.id === id);
  if (!b) return;
  document.getElementById('blogIdInput').value = b.id;
  document.getElementById('blogTitle').value = b.title || '';
  document.getElementById('blogDate').value = b.date_text || '';
  document.getElementById('blogExcerpt').value = b.excerpt || '';
  document.getElementById('blogOrder').value = b.order_idx || 1;
  document.getElementById('blogOrder').max = allBlogs.length;
  document.getElementById('blogImage').value = b.image_url || '';
  document.getElementById('blogEditor').innerHTML = b.body || '';
  
  const bp = document.getElementById('blogImagePreview');
  const img = document.getElementById('blogImagePreviewImg');
  if (b.image_url) {
    img.src = b.image_url;
    bp.style.display = 'block';
  } else {
    bp.style.display = 'none';
  }

  updateWordCount('blogEditor','blogWordCount');
  document.getElementById('blogModalTitle').textContent = 'Edit Blog Post';
  document.getElementById('blogModal').classList.add('open');
};

window.uploadBlogImage = async function() {
  const fileInput = document.getElementById('blogImageFile');
  if (!fileInput || !fileInput.files.length) {
    showToast('Please select a file first', 'error'); return;
  }

  const btn = document.getElementById('blogUploadBtn');
  btn.textContent = 'Uploading...';
  try {
    const url = await uploadAdminImageFile(fileInput.files[0]);
    if (!url) return;
    document.getElementById('blogImage').value = url;
    const bp = document.getElementById('blogImagePreview');
    const img = document.getElementById('blogImagePreviewImg');
    img.src = url;
    bp.style.display = 'block';
    showToast('Image uploaded', 'success');
  } catch (err) {
    showToast(err.message || 'Upload failed', 'error');
  } finally {
    btn.textContent = 'Upload';
  }
};

document.getElementById('blogForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('blogIdInput').value;
  const payload = {
    title: document.getElementById('blogTitle').value,
    date_text: document.getElementById('blogDate').value,
    excerpt: document.getElementById('blogExcerpt').value,
    order_idx: parseInt(document.getElementById('blogOrder').value) || 1,
    is_featured: 0, // removed option from UI
    image_url: document.getElementById('blogImage').value,
    body: document.getElementById('blogEditor').innerHTML
  };
  const url = id ? `/api/blogs/${id}` : '/api/blogs';
  const method = id ? 'PUT' : 'POST';
  const res = await fetch(url, { method, headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
  if (res.ok) {
    showToast(id ? 'Blog Updated' : 'Blog Added', 'success');
    closeBlogModal();
    loadBlogs();
  } else showToast('Error saving info', 'error');
});

window.deleteBlog = async function(id) {
  if(!confirm("Permantely delete this blog post?")) return;
  const res = await fetch(`/api/blogs/${id}`, { method: 'DELETE' });
  if (res.ok) loadBlogs();
};

// ── Case Studies Logic ──────────────────────────────────────────────────
let allCaseStudies = [];
async function loadCaseStudies() {
  try {
    const res = await fetch('/api/case-studies');
    if (!res.ok) return;
    allCaseStudies = await res.json();
    renderCaseStudiesTable();
  } catch(e) {}
}

function renderCaseStudiesTable() {
  const tbody = document.getElementById('caseStudiesTableBody');
  if (!tbody) return;
  if (!allCaseStudies.length) {
    tbody.innerHTML = `<tr><td colspan="4"><div class="adm-empty"><p>No case studies found.</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = allCaseStudies.map(cs => `
    <tr>
      <td><span style="font-size:18px;font-weight:bold;color:#475569;">${cs.order_idx}</span></td>
      <td>
        <div style="width:60px;height:40px;border-radius:4px;background:#e2e8f0;overflow:hidden;">
          ${cs.image_url ? `<img src="${escHtml(cs.image_url)}" style="width:100%;height:100%;object-fit:cover;">` : ''}
        </div>
      </td>
      <td><strong>${escHtml(cs.title)}</strong></td>
      <td>
        <div class="adm-row-actions">
          <button class="adm-icon-btn" onclick="editCaseStudy(${cs.id})" title="Edit">✏️</button>
          <button class="adm-icon-btn adm-icon-btn--danger" onclick="deleteCaseStudy(${cs.id})" title="Delete">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
}

window.openCaseStudyModal = function() {
  document.getElementById('caseStudyForm').reset();
  document.getElementById('csIdInput').value = '';
  document.getElementById('csEditor').innerHTML = '';
  document.getElementById('csExcerpt').value = '';
  document.getElementById('csImage').value = '';
  const cp = document.getElementById('csImagePreview'); if(cp) cp.style.display='none';
  
  // Set default order to end of list
  document.getElementById('csOrder').value = allCaseStudies.length + 1;
  document.getElementById('csOrder').max = allCaseStudies.length + 1;

  document.getElementById('caseStudyModalTitle').textContent = 'Add Case Study';
  document.getElementById('caseStudyModal').classList.add('open');
};
window.closeCaseStudyModal = () => document.getElementById('caseStudyModal').classList.remove('open');

window.editCaseStudy = function(id) {
  const cs = allCaseStudies.find(x => x.id === id);
  if (!cs) return;
  document.getElementById('csIdInput').value = cs.id;
  document.getElementById('csTitle').value = cs.title || '';
  document.getElementById('csOrder').value = cs.order_idx || 1;
  document.getElementById('csOrder').max = allCaseStudies.length;
  document.getElementById('csImage').value = cs.image_url || '';
  document.getElementById('csExcerpt').value = cs.excerpt || '';
  document.getElementById('csEditor').innerHTML = cs.body || '';
  
  const cp = document.getElementById('csImagePreview');
  const img = document.getElementById('csImagePreviewImg');
  if (cs.image_url) {
    img.src = cs.image_url;
    cp.style.display = 'block';
  } else {
    cp.style.display = 'none';
  }

  updateWordCount('csEditor','csWordCount');
  document.getElementById('caseStudyModalTitle').textContent = 'Edit Case Study';
  document.getElementById('caseStudyModal').classList.add('open');
};

window.uploadCaseStudyImage = async function() {
  const fileInput = document.getElementById('csImageFile');
  if (!fileInput || !fileInput.files.length) {
    showToast('Please select a file first', 'error'); return;
  }

  const btn = document.getElementById('csUploadBtn');
  btn.textContent = 'Uploading...';
  try {
    const url = await uploadAdminImageFile(fileInput.files[0]);
    if (!url) return;
    document.getElementById('csImage').value = url;
    const cp = document.getElementById('csImagePreview');
    const img = document.getElementById('csImagePreviewImg');
    img.src = url;
    cp.style.display = 'block';
    showToast('Image uploaded', 'success');
  } catch (err) {
    showToast(err.message || 'Upload failed', 'error');
  } finally {
    btn.textContent = 'Upload';
  }
};

document.getElementById('caseStudyForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('csIdInput').value;
  const payload = {
    title: document.getElementById('csTitle').value,
    order_idx: parseInt(document.getElementById('csOrder').value) || 1,
    is_wide: 0, // removed layout logic
    image_url: document.getElementById('csImage').value,
    excerpt: document.getElementById('csExcerpt').value,
    body: document.getElementById('csEditor').innerHTML
  };
  const url = id ? `/api/case-studies/${id}` : '/api/case-studies';
  const method = id ? 'PUT' : 'POST';
  const res = await fetch(url, { method, headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
  if (res.ok) {
    showToast(id ? 'Updated' : 'Added', 'success');
    closeCaseStudyModal();
    loadCaseStudies();
  } else showToast('Error saving info', 'error');
});

window.deleteCaseStudy = async function(id) {
  if(!confirm("Permantely delete?")) return;
  const res = await fetch(`/api/case-studies/${id}`, { method: 'DELETE' });
  if (res.ok) loadCaseStudies();
};

// ── Service Pages Logic ─────────────────────────────────────────────────
let allServicesAdmin = [];
let currentServiceRecord = null;
let currentServiceHeroImages = [];
let currentServiceHowImageUrl = '';
let currentServiceHowSteps = [];

function normalizeServiceImageArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean).slice(0, 5);
  if (typeof value !== 'string' || !value.trim()) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(Boolean).slice(0, 5) : [];
  } catch {
    return value.split('\n').map((item) => item.trim()).filter(Boolean).slice(0, 5);
  }
}

function normalizeServiceHowStepArray(value) {
  let steps = [];
  if (Array.isArray(value)) {
    steps = value;
  } else if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      steps = Array.isArray(parsed) ? parsed : [];
    } catch {
      steps = [];
    }
  }

  return steps
    .map((step, index) => ({
      title: String(step?.title || `Step ${index + 1}`).trim(),
      description: String(step?.description || '').trim(),
      image: String(step?.image || '').trim()
    }))
    .filter((step) => step.title || step.description || step.image);
}

function parseServiceHowSteps(html) {
  const temp = document.createElement('div');
  temp.innerHTML = html || '';
  const blocks = Array.from(temp.querySelectorAll('.service-step'));

  if (blocks.length) {
    return blocks.map((block, index) => ({
      title: (block.querySelector('h3')?.textContent || `Step ${index + 1}`).trim(),
      description: (block.querySelector('p')?.textContent || '').trim(),
      image: block.querySelector('img')?.getAttribute('src') || ''
    }));
  }

  return Array.from(temp.querySelectorAll('p'))
    .map((paragraph, index) => ({
      title: `Step ${index + 1}`,
      description: paragraph.textContent.trim(),
      image: ''
    }))
    .filter((step) => step.description);
}

function buildServiceHowHtml() {
  return currentServiceHowSteps.map((step) => `
    <div class="service-step">
      <h3>${escHtml(step.title)}</h3>
      ${step.description ? `<p>${escHtml(step.description)}</p>` : ''}
      ${step.image ? `<img src="${escHtml(step.image)}" alt="${escHtml(step.title)} image" loading="lazy">` : ''}
    </div>
  `).join('');
}

async function loadServicesAdmin() {
  try {
    const res = await fetch('/api/admin/services');
    if (!res.ok) return;
    allServicesAdmin = await res.json();
    renderServicesTable();
  } catch (e) {
    console.error(e);
  }
}

function renderServicesTable() {
  const tbody = document.getElementById('servicesTableBody');
  if (!tbody) return;

  if (!allServicesAdmin.length) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="adm-empty"><p>No service pages found.</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = allServicesAdmin.map((service) => `
    <tr>
      <td><span style="font-size:18px;font-weight:bold;color:#475569;">${service.sort_order}</span></td>
      <td>
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="font-size:20px;">${escHtml(service.icon || '★')}</div>
          <div>
            <strong>${escHtml(service.title)}</strong>
            <div class="email-cell">${escHtml(service.hero_title || '')}</div>
          </div>
        </div>
      </td>
      <td><code>/${escHtml(service.slug)}.html</code></td>
      <td>${service.is_active ? '<span class="adm-nav__badge" style="background:#059669">Active</span>' : '<span class="adm-nav__badge" style="background:#64748b">Hidden</span>'}</td>
      <td>
        <div class="adm-row-actions">
          <a class="adm-icon-btn" href="/${escHtml(service.slug)}.html" target="_blank" rel="noopener" title="Preview">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
          </a>
          <button class="adm-icon-btn" onclick="openServiceModal(${service.id})" title="Edit">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

window.openServiceModal = function(id) {
  const service = allServicesAdmin.find((item) => item.id === id);
  if (!service) return;

  currentServiceRecord = { ...service };
  currentServiceHeroImages = normalizeServiceImageArray(service.hero_gallery_images);
  currentServiceHowImageUrl = service.how_image_url || '';
  currentServiceHowSteps = normalizeServiceHowStepArray(service.how_steps || service.how_steps_json);
  if (!currentServiceHowSteps.length) {
    currentServiceHowSteps = parseServiceHowSteps(service.how_we_do_it || '');
  }
  if (currentServiceHowImageUrl && currentServiceHowSteps.length && !currentServiceHowSteps.some((step) => step.image)) {
    currentServiceHowSteps[0].image = currentServiceHowImageUrl;
  }
  document.getElementById('serviceIdInput').value = service.id;
  document.getElementById('serviceModalName').textContent = service.title || 'Service Page';
  document.getElementById('serviceSlugDisplay').textContent = `/${service.slug}.html`;
  renderServiceHeroImages();
  renderServiceHowSteps();

  document.getElementById('serviceModalTitle').textContent = `Edit ${service.title}`;
  document.getElementById('serviceModal').classList.add('open');
};

window.closeServiceModal = function() {
  currentServiceRecord = null;
  currentServiceHeroImages = [];
  currentServiceHowImageUrl = '';
  currentServiceHowSteps = [];
  const fileInput = document.getElementById('serviceHeroImageFile');
  if (fileInput) fileInput.value = '';
  document.querySelectorAll('[id^="serviceHowStepImageFile"]').forEach((input) => {
    input.value = '';
  });
  document.getElementById('serviceModal').classList.remove('open');
};

window.renderServiceHeroImages = function() {
  const container = document.getElementById('serviceHeroImagesList');
  if (!container) return;

  if (!currentServiceHeroImages.length) {
    container.innerHTML = `
      <div style="grid-column:1 / -1; padding:18px; border:1px dashed rgba(148,163,184,0.4); border-radius:12px; text-align:center; font-size:13px; color:#94a3b8;">
        No hero images uploaded yet. You can upload up to 5.
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div style="grid-column:1 / -1; font-size:12px; color:#64748b; font-weight:700; letter-spacing:.02em;">
      ${currentServiceHeroImages.length}/5 hero images
    </div>
    ${currentServiceHeroImages.map((url, index) => `
      <div style="position:relative; overflow:hidden; border-radius:14px; border:1px solid rgba(148,163,184,0.28); background:#fff; box-shadow:0 10px 24px -20px rgba(15,23,42,0.35);">
        <img src="${escHtml(url)}" alt="Hero image ${index + 1}" style="display:block; width:100%; aspect-ratio:0.78; object-fit:cover;">
        <button type="button" onclick="removeServiceHeroImage(${index})" style="position:absolute; top:8px; right:8px; width:28px; height:28px; border:none; border-radius:999px; background:rgba(15,23,42,0.78); color:#fff; cursor:pointer; font-size:16px; line-height:1;">×</button>
      </div>
    `).join('')}
  `;
};

window.uploadServiceHeroImage = async function() {
  if (currentServiceHeroImages.length >= 5) {
    showToast('Maximum 5 images allowed.', 'error');
    return;
  }
  const fileInput = document.getElementById('serviceHeroImageFile');
  if (!fileInput || !fileInput.files.length) {
    showToast('Please select a file first', 'error');
    return;
  }

  const remainingSlots = 5 - currentServiceHeroImages.length;
  const selectedCount = fileInput.files.length;
  const files = Array.from(fileInput.files).slice(0, remainingSlots);
  if (!files.length) {
    showToast('Maximum 5 images allowed.', 'error');
    return;
  }
  if (files.some((file) => !validateAdminImageFile(file))) {
    return;
  }

  const btn = document.getElementById('serviceHeroUploadBtn');
  if (btn) btn.textContent = 'Uploading...';

  try {
    let uploadedCount = 0;
    let stoppedByError = false;
    for (const file of files) {
      const url = await uploadAdminImageFile(file);
      if (!url) {
        stoppedByError = true;
        break;
      }
      currentServiceHeroImages.push(url);
      uploadedCount += 1;
    }
    fileInput.value = '';
    renderServiceHeroImages();
    if (stoppedByError && uploadedCount) {
      showToast(`${uploadedCount} hero image${uploadedCount === 1 ? '' : 's'} uploaded before one upload failed.`, 'error');
    } else if (!stoppedByError && selectedCount > remainingSlots) {
      showToast(`${uploadedCount} hero image${uploadedCount === 1 ? '' : 's'} uploaded. Extra files were skipped because the limit is 5.`, 'success');
    } else if (!stoppedByError && uploadedCount) {
      showToast(`${uploadedCount} hero image${uploadedCount === 1 ? '' : 's'} uploaded`, 'success');
    }
  } catch (err) {
    showToast('Upload failed', 'error');
  } finally {
    if (btn) btn.textContent = 'Upload';
  }
};

window.removeServiceHeroImage = function(index) {
  currentServiceHeroImages = currentServiceHeroImages.filter((_, itemIndex) => itemIndex !== index);
  renderServiceHeroImages();
};

window.renderServiceHowSteps = function() {
  const container = document.getElementById('serviceHowStepsContainer');
  if (!container) return;

  if (!currentServiceHowSteps.length) {
    container.innerHTML = `
      <div style="padding:18px; border:1px dashed rgba(148,163,184,0.4); border-radius:12px; text-align:center; font-size:13px; color:#94a3b8;">
        No How We Do It text blocks found for this service.
      </div>
    `;
    return;
  }

  container.innerHTML = currentServiceHowSteps.map((step, index) => `
    <div style="display:grid; grid-template-columns:minmax(0,1fr) minmax(170px,220px); gap:14px; align-items:start; padding:14px; border:1px solid rgba(148,163,184,0.24); border-radius:12px; background:#fff;">
      <div>
        <div style="font-size:12px; font-weight:800; color:#F5A623; margin-bottom:6px;">STEP ${String(index + 1).padStart(2, '0')}</div>
        <div style="font-size:15px; font-weight:800; color:#1f2937; margin-bottom:6px;">${escHtml(step.title)}</div>
        <div style="font-size:13px; line-height:1.55; color:#64748b;">${escHtml(step.description || 'No description added.')}</div>
        <div style="display:flex; gap:8px; align-items:center; margin-top:12px;">
          <input type="file" id="serviceHowStepImageFile${index}" accept="image/*" class="adm-input" style="background:#fff; padding:8px; min-height:auto;">
          <button type="button" class="adm-btn-primary" onclick="uploadServiceHowStepImage(${index})" style="width:auto; padding:9px 14px;">Upload</button>
        </div>
      </div>
      <div>
        ${step.image ? `
          <div style="position:relative; overflow:hidden; border-radius:12px; border:1px solid rgba(148,163,184,0.28); background:#f8fafc;">
            <img src="${escHtml(step.image)}" alt="${escHtml(step.title)} image" style="display:block; width:100%; aspect-ratio:0.78; object-fit:cover;">
            <button type="button" onclick="removeServiceHowStepImage(${index})" style="position:absolute; top:8px; right:8px; width:28px; height:28px; border:none; border-radius:999px; background:rgba(15,23,42,0.78); color:#fff; cursor:pointer; font-size:16px; line-height:1;">×</button>
          </div>
        ` : `
          <div style="display:flex; align-items:center; justify-content:center; min-height:170px; border:1px dashed rgba(148,163,184,0.5); border-radius:12px; color:#94a3b8; font-size:13px; text-align:center; padding:14px;">
            One image allowed
          </div>
        `}
      </div>
    </div>
  `).join('');
};

window.uploadServiceHowStepImage = async function(index) {
  if (!currentServiceHowSteps[index]) {
    showToast('Step not found', 'error');
    return;
  }

  const fileInput = document.getElementById(`serviceHowStepImageFile${index}`);
  if (!fileInput || !fileInput.files.length) {
    showToast('Please select a file first', 'error');
    return;
  }
  if (!validateAdminImageFile(fileInput.files[0])) return;

  const btn = fileInput.parentElement?.querySelector('button');
  if (btn) btn.textContent = 'Uploading...';

  try {
    const url = await uploadAdminImageFile(fileInput.files[0]);
    if (url) {
      currentServiceHowSteps[index].image = url;
      renderServiceHowSteps();
      const saved = await persistCurrentServiceImages({
        successMessage: 'Step ' + (index + 1) + ' image uploaded and saved',
        errorMessage: 'Image uploaded but failed to save to service page'
      });
      if (!saved) return;
    } else {
      showToast('Upload failed', 'error');
    }
  } catch (err) {
    showToast(err.message || 'Upload failed', 'error');
  } finally {
    if (btn) btn.textContent = 'Upload';
  }
};

window.removeServiceHowStepImage = function(index) {
  currentServiceHowSteps[index].image = '';
  renderServiceHowSteps();
};

function buildCurrentServicePayload() {
  if (!currentServiceRecord) return null;
  return {
    icon: currentServiceRecord.icon || '',
    title: currentServiceRecord.title || '',
    sort_order: parseInt(currentServiceRecord.sort_order, 10) || 99,
    hero_title: currentServiceRecord.hero_title || '',
    hero_subheading: currentServiceRecord.hero_subheading || '',
    hero_gallery_images: currentServiceHeroImages,
    how_image_url: currentServiceHowSteps.find((step) => step.image)?.image || '',
    what_heading: currentServiceRecord.what_heading || '',
    how_heading: currentServiceRecord.how_heading || '',
    how_subtitle: currentServiceRecord.how_subtitle || '',
    diff_heading: currentServiceRecord.diff_heading || '',
    diff_subtitle: currentServiceRecord.diff_subtitle || '',
    use_cases_subtitle: currentServiceRecord.use_cases_subtitle || '',
    faq_subtitle: currentServiceRecord.faq_subtitle || '',
    cta_subtitle: currentServiceRecord.cta_subtitle || '',
    what_we_do: currentServiceRecord.what_we_do || '',
    how_steps: currentServiceHowSteps.map((step) => ({
      title: step.title || '',
      description: step.description || '',
      image: step.image || ''
    })),
    how_we_do_it: buildServiceHowHtml() || currentServiceRecord.how_we_do_it || '',
    what_makes_us_different: currentServiceRecord.what_makes_us_different || '',
    use_cases_title: currentServiceRecord.use_cases_title || '',
    use_cases: currentServiceRecord.use_cases || '',
    cta: currentServiceRecord.cta || '',
    is_active: currentServiceRecord.is_active ? 1 : 0
  };
}

async function persistCurrentServiceImages(messages = {}) {
  const id = document.getElementById('serviceIdInput')?.value;
  const payload = buildCurrentServicePayload();
  if (!id || !payload) return false;

  try {
    const res = await fetch(`/api/admin/services/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      showToast(data.error || messages.errorMessage || 'Failed to save service page', 'error');
      return false;
    }
    const updatedService = data.service || {
      ...currentServiceRecord,
      ...payload,
      id: currentServiceRecord?.id,
      slug: currentServiceRecord?.slug,
      hero_gallery_images: [...currentServiceHeroImages],
      how_steps: payload.how_steps,
      how_steps_json: JSON.stringify(payload.how_steps)
    };
    currentServiceRecord = { ...updatedService };
    allServicesAdmin = allServicesAdmin.map((service) => (
      String(service.id) === String(id) ? { ...service, ...updatedService } : service
    ));
    if (messages.successMessage) showToast(messages.successMessage, 'success');
    return true;
  } catch {
    showToast(messages.errorMessage || 'Network error', 'error');
    return false;
  }
}

document.getElementById('serviceForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const saved = await persistCurrentServiceImages({
    successMessage: 'Service page updated',
    errorMessage: 'Failed to save service page'
  });
  if (!saved) return;

  closeServiceModal();
  loadServicesAdmin();
});


// ── Rich text editor helpers ──────────────────────────────────────────────────
window.rte = function(editorId, cmd) {
  document.getElementById(editorId).focus();
  document.execCommand(cmd, false, null);
};

window.rteBlock = function(editorId, tag) {
  document.getElementById(editorId).focus();
  document.execCommand('formatBlock', false, '<' + tag + '>');
};

window.updateWordCount = function(editorId, countId) {
  const text = document.getElementById(editorId).innerText || '';
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const el = document.getElementById(countId);
  if (el) el.textContent = words + (words === 1 ? ' word' : ' words');
};

window.previewBlogImage = function(url) {
  const wrap = document.getElementById('blogImagePreview');
  const img  = document.getElementById('blogImagePreviewImg');
  if (url && url.startsWith('http')) { img.src = url; wrap.style.display = 'block'; }
  else { wrap.style.display = 'none'; }
};

window.previewCsImage = function(url) {
  const wrap = document.getElementById('csImagePreview');
  const img  = document.getElementById('csImagePreviewImg');
  if (url && url.startsWith('http')) { img.src = url; wrap.style.display = 'block'; }
  else { wrap.style.display = 'none'; }
};

// legacy stubs (no-ops now)
window.insertBlogFormat = () => {};
window.insertCsFormat   = () => {};
window.updateBlogWordCount = () => {};
window.updateCsWordCount   = () => {};


// Auto-load on page start
if (document.getElementById('page-blogs')) {
  loadBlogs();
  loadCaseStudies();
}
