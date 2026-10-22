(() => {
  const META_PIXEL_ID = '1469756301700626';
  const debug = new URLSearchParams(window.location.search).get('debug_analytics') === '1';

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
    utm_content: currentParams.get('utm_content')
  };

  const hasAttribution = Object.values(incomingAttribution).some(Boolean);
  if (hasAttribution) {
    try {
      sessionStorage.setItem('vr_attribution', JSON.stringify(incomingAttribution));
    } catch (_) {}
  }

  function getAttribution() {
    if (hasAttribution) return incomingAttribution;
    try {
      return JSON.parse(sessionStorage.getItem('vr_attribution') || '{}');
    } catch (_) {
      return {};
    }
  }

  function context(extra = {}) {
    return {
      page_type: pageType,
      path: window.location.pathname,
      ...getAttribution(),
      ...extra
    };
  }

  function initMetaPixel() {
    if (!META_PIXEL_ID || window.fbq) return;

    !function(f,b,e,v,n,t,s){
      if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;
      s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)
    }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

    window.fbq('init', META_PIXEL_ID);
    window.fbq('track', 'PageView');
    window.fbq('trackCustom', 'VRPageView', context());
  }

  function track(name, details = {}) {
    const payload = context(details);

    if (META_PIXEL_ID && typeof window.fbq === 'function') {
      window.fbq('trackCustom', name, payload);
    }

    window.dispatchEvent(new CustomEvent('vendor-radar:analytics', {
      detail: { name, payload, collector_active: Boolean(META_PIXEL_ID) }
    }));

    if (debug) console.info('[Vendor Radar analytics]', name, payload);
  }

  window.VendorRadarAnalytics = {
    track,
    collector: META_PIXEL_ID ? 'meta_pixel' : 'pending',
    enabled: Boolean(META_PIXEL_ID)
  };

  initMetaPixel();

  if (pageType === 'checkout_success') {
    track('CheckoutSuccessPage');
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
      track('OfficialListingClick', {
        opportunity_id: card?.dataset?.opportunityId || null,
        opportunity_name: card?.querySelector('h3')?.textContent?.trim() || null
      });
      return;
    }

    if (href.includes('buy.stripe.com')) {
      track('ProCheckoutClick');
      return;
    }

    if (href.includes('sample-pro.html')) {
      track('ProSampleClick');
      return;
    }

    if (href === '#pro') {
      track('ProInterestClick');
      return;
    }

    if (href === '#radar' || href.endsWith('index.html#radar')) {
      track('FreeRadarOpen');
    }
  });
})();
