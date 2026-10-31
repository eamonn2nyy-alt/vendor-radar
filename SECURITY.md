# Vendor Radar Security Policy

Vendor Radar is intentionally designed to minimize sensitive-data exposure.

## Current security boundary

- The public site is static and must be served over HTTPS.
- Public opportunity-feed fields are treated as untrusted input and escaped before rendering.
- Clickable opportunity destinations are restricted to HTTPS URLs.
- External links opened in a new tab use `noopener noreferrer`.
- Payment-card handling is delegated to Stripe-hosted checkout. Vendor Radar must not collect or store card numbers.
- First-party analytics is limited to anonymous product-behavior telemetry. Do not add keystroke logging, form contents, fingerprinting, precise location, passwords, payment data, or unnecessary personally identifiable information.
- No secret, private API key, credential, webhook signing secret, or privileged token may be committed to this public repository or shipped to browser JavaScript.
- Checkout-success telemetry is not authoritative proof of purchase; payment-provider records remain authoritative.

## Change rules

Any new third-party script, form, authentication feature, personalized account feature, payment integration, or backend endpoint requires a security review before deployment. Prefer least privilege, data minimization, explicit allowlists, server-side validation, and fail-closed behavior.

## Deployment hardening

GitHub Pages HTTPS must remain enforced. Mixed HTTP content is prohibited. When Vendor Radar moves behind a host/proxy that supports response headers, deploy a tested Content Security Policy and modern security headers at the HTTP response layer rather than relying only on HTML metadata.

## Automated checks

GitHub CodeQL scans JavaScript changes on pushes and pull requests to `main` and on a weekly schedule.

## Reporting

Do not publish exploitable vulnerability details in a public issue. Repository maintainers should remediate suspected security problems before disclosing technical details publicly.
