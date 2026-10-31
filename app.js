const grid = document.getElementById('opportunity-grid');
const updated = document.getElementById('last-updated');
const heroCount = document.getElementById('hero-count');
const resultsSummary = document.getElementById('results-summary');
const filterButtons = [...document.querySelectorAll('[data-radar-filter]')];

const dateFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const monthFmt = new Intl.DateTimeFormat('en-US', { month: 'short' });
const PUBLIC_FEEDS = ['./public-data/opportunities.json', './public-data/recurring-opportunities.json'];

let allOpportunities = [];
let activeFilter = 'all';

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

// Public feed data is treated as untrusted input even though we curate it.
// Only ordinary HTTPS destinations are allowed into clickable opportunity links.
function safeExternalUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(String(value), window.location.href);
    return url.protocol === 'https:' ? url.href : null;
  } catch (_) {
    return null;
  }
}

function daysUntil(value) {
  const target = parseLocalDate(value);
  if (!target) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.ceil((target - today) / 86400000);
}

function deadlineCopy(item) {
  const days = item.application_deadline ? daysUntil(item.application_deadline) : null;
  if (item.deadline_display) {
    return { text: item.deadline_display, hot: days != null && days >= 0 && days <= 7 };
  }
  if (!item.application_deadline) {
    return item.recurring
      ? { text: 'Applications open · recurring', hot: false }
      : { text: 'Open · deadline not listed', hot: false };
  }
  if (days == null) return { text: `Deadline ${safeDate(item.application_deadline)}`, hot: false };
  if (days < 0) return { text: 'Deadline passed — recheck source', hot: true };
  if (days === 0) return { text: 'Closes today', hot: true };
  if (days === 1) return { text: 'Closes tomorrow', hot: true };
  if (days <= 7) return { text: `Closes in ${days} days`, hot: true };
  return { text: `Deadline ${safeDate(item.application_deadline)}`, hot: false };
}

function nextActionTime(item) {
  const actionDate = parseLocalDate(item.application_deadline || item.event_start_date);
  return actionDate ? actionDate.getTime() : Number.MAX_SAFE_INTEGER;
}

function categoryLabel(item) {
  const labels = {
    markets: 'Market',
    festivals: 'Festival',
    'business-expos': 'Business / Expo',
    specialty: 'Specialty'
  };
  return labels[item.browse_category] || 'Opportunity';
}

function renderOpportunity(item) {
  const eventDate = parseLocalDate(item.event_start_date);
  const month = eventDate ? monthFmt.format(eventDate).toUpperCase() : 'OPEN';
  const day = eventDate ? eventDate.getDate() : '•';
  const link = safeExternalUrl(item.application_url || item.official_event_url);
  const deadline = deadlineCopy(item);
  const recurring = item.recurring ? '<span class="chip">↻ Recurring</span>' : '';
  const deadlineChip = deadline.hot ? `<span class="chip hot">${escapeHtml(deadline.text)}</span>` : '';

  return `
    <article class="opportunity-card" data-opportunity-id="${escapeHtml(item.id || '')}">
      <div class="card-top">
        <div class="date-badge"><span>${escapeHtml(month)}</span><strong>${escapeHtml(day)}</strong></div>
        <span class="verified-badge">✓ Verified</span>
      </div>

      <div class="opportunity-kind">${escapeHtml(categoryLabel(item))}</div>
      <h3>${escapeHtml(item.event_name)}</h3>

      <div class="card-chips">
        <span class="chip">📍 ${escapeHtml(item.city || 'Tampa Bay')}</span>
        <span class="chip">💵 ${escapeHtml(money(item.booth_fee_min, item.booth_fee_max, item.fee_display))}</span>
        ${recurring}
        ${deadlineChip}
      </div>

      <div class="deadline-line"><strong>${escapeHtml(deadline.text)}</strong></div>
      <div class="card-spacer"></div>
      ${link ? `<a class="source-link" href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer"><span>View official application</span><span>→</span></a>` : ''}
    </article>
  `;
}

function filteredOpportunities() {
  if (activeFilter === 'all') return allOpportunities;
  return allOpportunities.filter(item => item.browse_category === activeFilter);
}

function renderRadar() {
  const visible = filteredOpportunities();
  if (resultsSummary) {
    resultsSummary.textContent = `${visible.length} verified ${visible.length === 1 ? 'opportunity' : 'opportunities'}`;
  }

  if (!visible.length) {
    grid.innerHTML = '<article class="empty-state"><div class="empty-icon">◎</div><h3>No current matches in this category.</h3><p>Try another filter — Radar keeps scanning.</p></article>';
    return;
  }

  grid.innerHTML = visible.map(renderOpportunity).join('');
}

filterButtons.forEach(button => {
  button.addEventListener('click', () => {
    activeFilter = button.dataset.radarFilter || 'all';
    filterButtons.forEach(item => item.classList.toggle('active', item === button));
    renderRadar();
  });
});

async function loadFeed(path) {
  try {
    const response = await fetch(path, { cache: 'no-store', credentials: 'same-origin' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) throw new Error('Unexpected feed content type');
    return await response.json();
  } catch (error) {
    console.warn(`Vendor Radar feed ${path} could not be loaded:`, error);
    return null;
  }
}

async function loadRadar() {
  try {
    const feeds = (await Promise.all(PUBLIC_FEEDS.map(loadFeed))).filter(Boolean);
    if (!feeds.length) throw new Error('No public feeds available');

    const mergedById = new Map();
    feeds.forEach(feed => {
      (Array.isArray(feed.opportunities) ? feed.opportunities : []).forEach(item => {
        if (item?.id) mergedById.set(item.id, item);
      });
    });

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    allOpportunities = [...mergedById.values()]
      .filter(item => {
        if (item.public_eligible === false || item.application_status === 'closed') return false;
        if (!item.application_deadline) return true;
        const deadline = parseLocalDate(item.application_deadline);
        return !deadline || deadline >= today;
      })
      .sort((a, b) => nextActionTime(a) - nextActionTime(b));

    if (heroCount) heroCount.textContent = allOpportunities.length || '—';

    const newestGeneratedAt = feeds
      .map(feed => new Date(feed.generated_at || 0))
      .filter(dt => !Number.isNaN(dt.getTime()))
      .sort((a, b) => b - a)[0];

    if (newestGeneratedAt) updated.textContent = `Verified ${dateFmt.format(newestGeneratedAt)}`;

    renderRadar();
  } catch (error) {
    console.error('Vendor Radar feeds could not be loaded:', error);
    updated.textContent = 'Feed temporarily unavailable';
  }
}

loadRadar();
