(() => {
  const META_PIXEL_ID = '1469756301700626';
  const debug = new URLSearchParams(window.location.search).get('debug_analytics') === '1';
  const startedAt = Date.now();
  const fired = new Set();

  const pageType = (() => {
    const path = window.location.pathname;
    if (path.endsWith('/sample-pro.html')) return 'sample_pro';
    if (path.endsWith('/onboarding.html')) return 'checkout_success';
    return 'free_radar';
  })();

  const currentParams = new URLSearchParams(window.location.search);
  const incomingAttribution = {
    utm_source: currentParams.get('utm_source'),
    utm_medium: currentParams.get('utm_medium'),
    utm_campaign: currentParams.get('utm_campaign'),
    utm_content: currentParams.get('utm_content'),
    fbclid: currentParams.get('fbclid')
  };

  const hasAttribution = Object.values(incomingAttribution).some(Boolean);
  if (hasAttribution) {
    try { sessionStorage.setItem('vr_attribution', JSON.stringify(incomingAttribution)); } catch (_) {}
  }

  function getAttribution() {
    if (hasAttribution) return incomingAttribution;
    try { return JSON.parse(sessionStorage.getItem('vr_attribution') || '{}'); } catch (_) { return {}; }
  }

  function context(extra = {}) {
    return {
      page_type: pageType,
      path: window.location.pathname,
      referrer_host: (() => { try { return document.referrer ? new URL(document.referrer).hostname : null; } catch (_) { return null; } })(),
      ...getAttribution(),
      ...extra
    };
  }

  function initMetaPixel() {
    if (!META_PIXEL_ID || window.fbq) return;
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', META_PIXEL_ID);
    window.fbq('track', 'PageView');
    window.fbq('trackCustom', 'VRPageView', context());
  }

  function track(name, details = {}) {
    const payload = context(details);
    if (META_PIXEL_ID && typeof window.fbq === 'function') window.fbq('trackCustom', name, payload);
    window.dispatchEvent(new CustomEvent('vendor-radar:analytics', { detail: { name, payload, collector_active: Boolean(META_PIXEL_ID) } }));
    if (debug) console.info('[Vendor Radar analytics]', name, payload);
  }

  function trackOnce(key, name, details = {}) {
    if (fired.has(key)) return;
    fired.add(key);
    track(name, details);
  }

  function ml008VariantForCard(card) {
    if (!card) return 'unknown';
    const deadlineLine = card.querySelector('.deadline-line')?.textContent?.trim() || '';
    return /closes|deadline|applications open|open ·/i.test(deadlineLine) ? 'challenger_deadline' : 'control_generic';
  }

  window.VendorRadarAnalytics = { track, collector: META_PIXEL_ID ? 'meta_pixel' : 'pending', enabled: Boolean(META_PIXEL_ID) };
  initMetaPixel();

  if (pageType === 'checkout_success') {
    track('CheckoutSuccessPage');
    if (typeof window.fbq === 'function') window.fbq('track', 'Purchase', { currency: 'USD', value: 9.00 });
  }

  if (pageType === 'free_radar') {
    track('ML008QualifiedExposure', { experiment_id: 'ML-008', contract_id: 'EC-ML008-001', presentation: 'mixed_existing_surface' });
  }

  // Passive engagement signals: no visible page changes.
  [25, 50, 75, 90].forEach(percent => {
    window.addEventListener('scroll', () => {
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const depth = Math.round((window.scrollY / max) * 100);
      if (depth >= percent) trackOnce(`scroll-${percent}`, 'ScrollDepth', { percent });
    }, { passive: true });
  });

  [10, 30, 60].forEach(seconds => {
    window.setTimeout(() => trackOnce(`engaged-${seconds}`, 'EngagedTime', { seconds }), seconds * 1000);
  });

  if ('IntersectionObserver' in window) {
    const observeOnce = (selector, key, eventName) => {
      const el = document.querySelector(selector);
      if (!el) return;
      const observer = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= 0.35)) {
          trackOnce(key, eventName);
          observer.disconnect();
        }
      }, { threshold: [0.35] });
      observer.observe(el);
    };
    observeOnce('#radar', 'radar-exposure', 'RadarSectionViewed');
    observeOnce('#pro', 'pro-exposure', 'ProSectionViewed');
  }

  document.addEventListener('click', event => {
    const filterButton = event.target.closest('[data-radar-filter]');
    if (filterButton) {
      track('RadarFilterClick', { filter: filterButton.dataset.radarFilter || 'unknown' });
      return;
    }

    const link = event.target.closest('a');
    if (!link) return;
    const href = link.getAttribute('href') || '';

    if (link.classList.contains('source-link')) {
      const card = link.closest('.opportunity-card');
      const opportunityId = card?.dataset?.opportunityId || null;
      const opportunityName = card?.querySelector('h3')?.textContent?.trim() || null;
      const presentation = ml008VariantForCard(card);
      track('OfficialListingClick', { opportunity_id: opportunityId, opportunity_name: opportunityName });
      track('ML008QualifiedIntent', { experiment_id: 'ML-008', contract_id: 'EC-ML008-001', presentation, action_type: 'application_source_click', opportunity_id: opportunityId, opportunity_name: opportunityName });
      return;
    }

    if (href.includes('buy.stripe.com')) {
      track('ProCheckoutClick');
      if (typeof window.fbq === 'function') window.fbq('track', 'InitiateCheckout', { currency: 'USD', value: 9.00 });
      return;
    }
    if (href.includes('sample-pro.html')) { track('ProSampleClick'); return; }
    if (href === '#pro') { track('ProInterestClick'); return; }
    if (href === '#radar' || href.endsWith('index.html#radar')) track('FreeRadarOpen');
  });

  window.addEventListener('pagehide', () => {
    track('SessionEnd', { seconds_on_page: Math.round((Date.now() - startedAt) / 1000) });
  });
})();
