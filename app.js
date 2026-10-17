const grid = document.getElementById('opportunity-grid');
const updated = document.getElementById('last-updated');
const heroCount = document.getElementById('hero-count');

const dateFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const monthFmt = new Intl.DateTimeFormat('en-US', { month: 'short' });

function parseLocalDate(value) {
  if (!value) return null;
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function safeDate(value) {
  const date = parseLocalDate(value);
  return date ? dateFmt.format(date) : 'Not listed';
}

function money(min, max, display) {
  if (display) return display;
  if (min == null && max == null) return 'Fee not listed';
  if (min != null && max != null && min !== max) return `$${min}–$${max}`;
  return `$${min ?? max}`;
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function daysUntil(value) {
  const target = parseLocalDate(value);
  if (!target) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.ceil((target - today) / 86400000);
}

function deadlineCopy(item) {
  if (!item.application_deadline) return { text: 'Open · deadline not listed', hot: false };
  const days = daysUntil(item.application_deadline);
  if (days == null) return { text: `Deadline ${safeDate(item.application_deadline)}`, hot: false };
  if (days < 0) return { text: 'Deadline passed — recheck source', hot: true };
  if (days === 0) return { text: 'Closes today', hot: true };
  if (days === 1) return { text: 'Closes tomorrow', hot: true };
  if (days <= 7) return { text: `Closes in ${days} days`, hot: true };
  return { text: `Deadline ${safeDate(item.application_deadline)}`, hot: false };
}

function renderOpportunity(item) {
  const eventDate = parseLocalDate(item.event_start_date);
  const month = eventDate ? monthFmt.format(eventDate).toUpperCase() : 'OPEN';
  const day = eventDate ? eventDate.getDate() : '•';
  const link = item.application_url || item.official_event_url;
  const deadline = deadlineCopy(item);
  const recurring = item.recurring ? '<span class="chip">↻ Recurring</span>' : '';
  const deadlineChip = deadline.hot ? `<span class="chip hot">${escapeHtml(deadline.text)}</span>` : '';

  return `
    <article class="opportunity-card" data-opportunity-id="${escapeHtml(item.id || '')}">
      <div class="card-top">
        <div class="date-badge"><span>${escapeHtml(month)}</span><strong>${escapeHtml(day)}</strong></div>
        <span class="verified-badge">✓ Verified</span>
      </div>

      <h3>${escapeHtml(item.event_name)}</h3>

      <div class="card-chips">
        <span class="chip">📍 ${escapeHtml(item.city || 'Tampa Bay')}</span>
        <span class="chip">💵 ${escapeHtml(money(item.booth_fee_min, item.booth_fee_max, item.fee_display))}</span>
        ${recurring}
        ${deadlineChip}
      </div>

      <div class="deadline-line"><strong>${escapeHtml(deadline.text)}</strong></div>
      <div class="card-spacer"></div>
      ${link ? `<a class="source-link" href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer"><span>View official listing</span><span>→</span></a>` : ''}
    </article>
  `;
}

async function loadRadar() {
  try {
    const response = await fetch('./public-data/opportunities.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const opportunities = Array.isArray(data.opportunities)
      ? data.opportunities.filter(item => item.public_eligible !== false).slice(0, 5)
      : [];

    if (heroCount) heroCount.textContent = opportunities.length || '—';

    if (data.generated_at) {
      const dt = new Date(data.generated_at);
      if (!Number.isNaN(dt.getTime())) updated.textContent = `Updated ${dateFmt.format(dt)}`;
    }

    if (!opportunities.length) return;
    grid.innerHTML = opportunities.map(renderOpportunity).join('');
  } catch (error) {
    console.error('Vendor Radar feed could not be loaded:', error);
    updated.textContent = 'Feed temporarily unavailable';
  }
}

loadRadar();
