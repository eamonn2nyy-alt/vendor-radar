// Vendor Radar first-party analytics collector (Railway Function scaffold)
// Deploy only after a durable EVENT_SINK_URL/storage adapter is configured.
// Privacy policy: do not store raw IPs, full user-agent strings, emails, names,
// fingerprinting IDs, or sensitive form contents. Revenue must be verified by Stripe.

const ALLOWED_EVENTS = new Set([
  'VRPageView','ML008QualifiedExposure','ScrollDepth','EngagedTime',
  'RadarSectionViewed','ProSectionViewed','RadarFilterClick','OfficialListingClick',
  'ML008QualifiedIntent','ProCheckoutClick','ProSampleClick','ProInterestClick',
  'FreeRadarOpen','SessionEnd','CheckoutSuccessPage'
]);

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST,OPTIONS,GET',
  'Access-Control-Allow-Headers': 'content-type',
  'Cache-Control': 'no-store'
};

function cleanString(v: unknown, max = 200) {
  return typeof v === 'string' ? v.slice(0, max) : null;
}

function sanitize(body: any) {
  const name = cleanString(body?.name, 80);
  if (!name || !ALLOWED_EVENTS.has(name)) return null;
  const p = body?.payload || {};
  return {
    schema_version: 1,
    received_at: new Date().toISOString(),
    event_id: cleanString(body?.event_id, 80),
    session_id: cleanString(body?.session_id, 80),
    name,
    page_type: cleanString(p.page_type, 40),
    path: cleanString(p.path, 160),
    referrer_host: cleanString(p.referrer_host, 160),
    utm_source: cleanString(p.utm_source, 120),
    utm_medium: cleanString(p.utm_medium, 120),
    utm_campaign: cleanString(p.utm_campaign, 160),
    utm_content: cleanString(p.utm_content, 160),
    fbclid: cleanString(p.fbclid, 220),
    opportunity_id: cleanString(p.opportunity_id, 120),
    opportunity_name: cleanString(p.opportunity_name, 200),
    filter: cleanString(p.filter, 80),
    presentation: cleanString(p.presentation, 80),
    action_type: cleanString(p.action_type, 80),
    experiment_id: cleanString(p.experiment_id, 80),
    contract_id: cleanString(p.contract_id, 80),
    percent: Number.isFinite(Number(p.percent)) ? Number(p.percent) : null,
    seconds: Number.isFinite(Number(p.seconds)) ? Number(p.seconds) : null,
    seconds_on_page: Number.isFinite(Number(p.seconds_on_page)) ? Number(p.seconds_on_page) : null,
    device_class: cleanString(body?.device_class, 20),
    viewport_width: Number.isFinite(Number(body?.viewport_width)) ? Number(body.viewport_width) : null,
    language: cleanString(body?.language, 20),
    timezone: cleanString(body?.timezone, 80)
  };
}

async function persist(event: any) {
  // Fail closed until durable storage is configured. This prevents pretending data is stored.
  const sink = Bun.env.EVENT_SINK_URL;
  if (!sink) return { stored: false, reason: 'storage_not_configured' };
  const r = await fetch(sink, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(event)
  });
  if (!r.ok) throw new Error(`sink_${r.status}`);
  return { stored: true };
}

Bun.serve({
  port: Number(Bun.env.PORT || 3000),
  async fetch(req) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (req.method === 'GET' && url.pathname === '/health') {
      return Response.json({ ok: true, storage_configured: Boolean(Bun.env.EVENT_SINK_URL), schema_version: 1 }, { headers: cors });
    }
    if (req.method !== 'POST' || url.pathname !== '/collect') return new Response('Not found', { status: 404, headers: cors });
    let body;
    try { body = await req.json(); } catch { return Response.json({ ok: false, error: 'invalid_json' }, { status: 400, headers: cors }); }
    const event = sanitize(body);
    if (!event) return Response.json({ ok: false, error: 'invalid_event' }, { status: 400, headers: cors });
    try {
      const result = await persist(event);
      return Response.json({ ok: result.stored, ...result }, { status: result.stored ? 202 : 503, headers: cors });
    } catch {
      return Response.json({ ok: false, error: 'storage_failure' }, { status: 503, headers: cors });
    }
  }
});
