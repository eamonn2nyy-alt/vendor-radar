const grid = document.getElementById('opportunity-grid');
const updated = document.getElementById('last-updated');

const dateFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

function safeDate(value) {
  if (!value) return 'Not listed';
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? 'Not listed' : dateFmt.format(date);
}

function money(min, max) {
  if (min == null && max == null) return 'Not listed';
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

function renderOpportunity(item) {
  const categories = Array.isArray(item.vendor_categories) && item.vendor_categories.length
    ? item.vendor_categories.slice(0, 3).join(', ')
    : 'See application';
  const link = item.application_url || item.official_event_url;
  const score = Number.isInteger(item.radar_score) ? `${item.radar_score}/100` : 'Scoring pending';

  return `
    <article class="opportunity-card">
      <div class="score">RADAR ${escapeHtml(score)}</div>
      <h3>${escapeHtml(item.event_name)}</h3>
      <div class="meta">
        <div><strong>Where:</strong> ${escapeHtml(item.city || 'Tampa Bay')}</div>
        <div><strong>Event:</strong> ${escapeHtml(safeDate(item.event_start_date))}</div>
        <div><strong>Deadline:</strong> ${escapeHtml(safeDate(item.application_deadline))}</div>
        <div><strong>Booth fee:</strong> ${escapeHtml(money(item.booth_fee_min, item.booth_fee_max))}</div>
        <div><strong>Vendor fit:</strong> ${escapeHtml(categories)}</div>
        <div><strong>Status:</strong> ${escapeHtml((item.verification_status || 'unknown').replaceAll('_', ' '))}</div>
      </div>
      ${link ? `<a class="source-link" href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">View official source →</a>` : ''}
    </article>
  `;
}

async function loadRadar() {
  try {
    const response = await fetch('./public-data/opportunities.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const opportunities = Array.isArray(data.opportunities) ? data.opportunities : [];

    if (data.generated_at) {
      const dt = new Date(data.generated_at);
      if (!Number.isNaN(dt.getTime())) updated.textContent = `Last updated ${dateFmt.format(dt)}`;
    }

    if (!opportunities.length) return;
    grid.innerHTML = opportunities
      .filter(item => item.public_eligible !== false)
      .slice(0, 5)
      .map(renderOpportunity)
      .join('');
  } catch (error) {
    console.error('Vendor Radar feed could not be loaded:', error);
    updated.textContent = 'Feed temporarily unavailable';
  }
}

loadRadar();
