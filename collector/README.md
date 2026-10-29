# Vendor Radar first-party analytics collector

Status: scaffolded, not deployed. Railway currently refuses new resources on the connected Free plan (`Free plan resource provision limit exceeded`). Do not claim first-party persistence until `/health` reports `storage_configured: true` and a test event is read back from the durable sink.

## Purpose
Own the behavioral event ledger from landing-page arrival through product engagement and commercial intent, while Meta/Windsor remain parallel acquisition telemetry. Stripe remains authoritative for actual revenue.

## Privacy boundary
Collect useful product analytics, not invasive identity data. Do not persist raw IP addresses, full user-agent strings, names, emails, form contents, cross-site fingerprints, or sensitive data. Use a random first-party session ID only. Coarse device class, viewport width, browser language and timezone are acceptable for UX analysis.

## Funnel contract
Acquisition: ad impression/click (Meta/Windsor) -> landing page.
Product: page view -> engagement -> Radar exposure -> filter use -> official listing/application click.
Commercial: Pro exposure -> Pro interest/sample -> checkout click.
Revenue: Stripe-confirmed successful payment. A public success-page visit is supporting telemetry only and MUST NOT be treated as authoritative revenue.

## Event schema
Each event should include: schema_version, event_id, session_id, event name, timestamp, page/path, attribution (UTMs/fbclid/referrer host), experiment/contract IDs when relevant, event-specific fields, and coarse device context.

## Measurement integrity
The existing richer client instrumentation began at commit `06c06653c10f0ec475c446d6a1377d87ff55c724`. A future first-party persistence boundary must be recorded separately when storage is actually live. Never reconstruct pre-boundary events.

## Deployment gate
1. Provision a collector runtime and durable append-only storage without new unapproved spend.
2. Configure `EVENT_SINK_URL` on the collector.
3. Expose HTTPS `/collect` and `/health`.
4. Verify storage with synthetic test event and readback.
5. Only then wire `analytics.js` to POST/sendBeacon to the collector URL.
6. Record the exact first-party-live timestamp/commit as a new measurement boundary.
7. Monitor collector health in the Vendor Radar workflow.
