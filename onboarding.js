const form = document.getElementById('profile-form');
const preview = document.getElementById('profile-preview');
const previewTitle = document.getElementById('preview-title');
const previewStatus = document.getElementById('preview-status');

function splitList(value) {
  return String(value || '').split(',').map(item => item.trim()).filter(Boolean);
}

function escapeHtml(value = '') {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function buildProfile() {
  const preferredDays = [...document.querySelectorAll('input[name="days"]:checked')].map(input => input.value);
  const feeValue = document.getElementById('max_booth_fee').value;
  return {
    profile_id: 'preview-' + Date.now(),
    created_at: new Date().toISOString(),
    email: document.getElementById('email').value.trim(),
    business_name: document.getElementById('business_name').value.trim() || null,
    vendor_categories: splitList(document.getElementById('categories').value),
    base_city: document.getElementById('base_city').value.trim() || null,
    base_state: 'FL',
    travel_radius_miles: Number(document.getElementById('travel_radius').value || 0),
    max_booth_fee: feeValue === '' ? null : Number(feeValue),
    preferred_days: preferredDays,
    preferred_event_types: splitList(document.getElementById('preferred_event_types').value),
    excluded_event_types: splitList(document.getElementById('excluded_event_types').value),
    notes: document.getElementById('notes').value.trim() || null
  };
}

function renderProfile(profile) {
  previewTitle.textContent = profile.business_name || 'Your business';
  preview.innerHTML = `
    <dl class="profile-dl">
      <div><dt>Products</dt><dd>${escapeHtml(profile.vendor_categories.join(', '))}</dd></div>
      <div><dt>Home base</dt><dd>${escapeHtml(profile.base_city || 'Not set')}, FL</dd></div>
      <div><dt>Travel</dt><dd>Up to ${escapeHtml(profile.travel_radius_miles)} miles</dd></div>
      <div><dt>Booth cap</dt><dd>${profile.max_booth_fee == null ? 'No cap set' : '$' + escapeHtml(profile.max_booth_fee)}</dd></div>
      <div><dt>Preferred days</dt><dd>${profile.preferred_days.length ? escapeHtml(profile.preferred_days.join(', ')) : 'Any day'}</dd></div>
      <div><dt>Event types</dt><dd>${profile.preferred_event_types.length ? escapeHtml(profile.preferred_event_types.join(', ')) : 'No preference set'}</dd></div>
    </dl>
    <div class="match-explainer">
      <strong>Radar will use this to:</strong>
      <ul>
        <li>surface strongest Apply Now matches</li>
        <li>flag deadlines and unknown fees</li>
        <li>filter opportunities outside your stated constraints</li>
        <li>keep recurring markets on a Watch List when useful</li>
      </ul>
    </div>`;
  previewStatus.textContent = 'Profile preview built';
}

form.addEventListener('submit', event => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const profile = buildProfile();
  localStorage.setItem('vendorRadarProfilePreview', JSON.stringify(profile));
  renderProfile(profile);
});

try {
  const saved = JSON.parse(localStorage.getItem('vendorRadarProfilePreview'));
  if (saved && saved.email && Array.isArray(saved.vendor_categories)) renderProfile(saved);
} catch (error) {
  console.warn('Could not restore Vendor Radar profile preview', error);
}
