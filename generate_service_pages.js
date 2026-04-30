const fs = require('fs');
const path = require('path');
const servicePages = require('./service_pages_data');

const ROOT = __dirname;
const indexTemplate = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const TEMPLATE_PATH = path.join(ROOT, 'review-services.html');

const navItems = [
  {
    filename: 'services.html',
    icon: '★',
    title: 'All Services',
    description: 'Full portfolio overview',
    highlight: true
  },
  ...servicePages.map((service) => ({
    filename: service.filename,
    icon: service.icon,
    title: service.title,
    description: service.hero_title
  }))
];

const desktopColumns = [
  {
    heading: 'Brand & Creator Services',
    items: navItems.slice(0, 9)
  },
  {
    heading: 'Growth & Market Services',
    items: navItems.slice(9)
  }
];

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderDesktopDropdown() {
  const columns = desktopColumns.map((column) => {
    const items = column.items.map((item) => {
      const highlightClass = item.highlight ? ' navbar__dropdown-item--highlight' : '';
      return `            <a href="/${item.filename}" class="navbar__dropdown-item${highlightClass}" role="menuitem">
              <span class="navbar__dropdown-icon">${item.icon}</span>
              <span>
                <strong>${escapeHtml(item.title)}</strong>
                <em>${escapeHtml(item.description)}</em>
              </span>
            </a>`;
    }).join('\n');

    return `          <div class="navbar__dropdown-col">
            <span class="navbar__dropdown-heading">${escapeHtml(column.heading)}</span>
${items}
          </div>`;
  }).join('\n\n');

  return `          <div class="navbar__dropdown-grid">
${columns}
          </div>`;
}

function renderMobileServicesMenu() {
  const links = navItems.map((item) => {
    return `        <a href="/${item.filename}" class="navbar__mobile-service-link">${item.icon} ${escapeHtml(item.title)}</a>`;
  }).join('\n');

  return `      <div class="navbar__mobile-services" id="mobileServicesMenu">
${links}
      </div>`;
}

function patchNavigation(html) {
  let output = html;

  // 1. Replace Navbar
  const navStartMarker = '<!-- ═══ NAVBAR ════════════════════════════════════════════ -->';
  const navEndTag = '</nav>';
  
  const indexNavStart = indexTemplate.indexOf(navStartMarker);
  const indexNavEnd = indexTemplate.indexOf(navEndTag, indexNavStart) + navEndTag.length;
  
  if (indexNavStart !== -1 && indexNavEnd !== -1) {
    const standardNav = indexTemplate.slice(indexNavStart, indexNavEnd);
    const currentNavStart = output.indexOf(navStartMarker);
    const currentNavEnd = output.indexOf(navEndTag, currentNavStart) + navEndTag.length;
    
    if (currentNavStart !== -1 && currentNavEnd !== -1) {
      output = output.slice(0, currentNavStart) + standardNav + output.slice(currentNavEnd);
    }
  }

  // 2. Replace Footer
  const footerStartMarker = '<!-- ═══ FOOTER ════════════════════════════════════════════ -->';
  const footerEndTag = '</footer>';
  
  const indexFooterStart = indexTemplate.indexOf(footerStartMarker);
  const indexFooterEnd = indexTemplate.indexOf(footerEndTag, indexFooterStart) + footerEndTag.length;
  
  if (indexFooterStart !== -1 && indexFooterEnd !== -1) {
    const standardFooter = indexTemplate.slice(indexFooterStart, indexFooterEnd);
    const currentFooterStart = output.indexOf(footerStartMarker);
    const currentFooterEnd = output.indexOf(footerEndTag, currentFooterStart) + footerEndTag.length;
    
    if (currentFooterStart !== -1 && currentFooterEnd !== -1) {
      output = output.slice(0, currentFooterStart) + standardFooter + output.slice(currentFooterEnd);
    }
  }

  // 3. Replace Bottom (Scripts, WhatsApp, Toast)
  const bottomStartMarker = '<!-- Scroll to top -->';
  const bodyEndTag = '</body>';
  
  const indexBottomStart = indexTemplate.indexOf(bottomStartMarker);
  const indexBottomEnd = indexTemplate.indexOf(bodyEndTag, indexBottomStart);
  
  if (indexBottomStart !== -1 && indexBottomEnd !== -1) {
    const standardBottom = indexTemplate.slice(indexBottomStart, indexBottomEnd);
    const currentBottomStart = output.indexOf(bottomStartMarker);
    const currentBottomEnd = output.indexOf(bodyEndTag, currentBottomStart);
    
    if (currentBottomStart !== -1 && currentBottomEnd !== -1) {
      output = output.slice(0, currentBottomStart) + standardBottom + output.slice(currentBottomEnd);
    }
  }

  return output;
}

function renderServiceCta(options = {}) {
  const {
    title = 'Ready to turn attention into measurable growth?',
    subtitle = 'Bring us your goal, audience, and timeline. We will shape the creator, content, and performance plan that moves it forward.',
    eyebrow = 'Build the next growth system',
    metric = 'Strategy sprint',
    primaryLabel = 'Book Free Strategy Call',
    secondaryLabel = 'Explore All Services',
    secondaryHref = '/services.html'
  } = options;

  return `<!-- ═══ SERVICE CTA ═══════════════════════════════════════ -->
<section class="service-cta" id="serviceCtaSection" aria-label="Start a service conversation">
  <div class="service-cta__orb service-cta__orb--amber" aria-hidden="true"></div>
  <div class="service-cta__orb service-cta__orb--blue" aria-hidden="true"></div>
  <div class="service-cta__grid">
    <div class="service-cta__visual" aria-hidden="true">
      <div class="service-cta__icon-shell">
        <div class="service-cta__growth-chart">
          <div class="service-cta__chart-bar" style="height: 40%; animation-delay: 0.1s;"></div>
          <div class="service-cta__chart-bar" style="height: 65%; animation-delay: 0.2s;"></div>
          <div class="service-cta__chart-bar" style="height: 50%; animation-delay: 0.3s;"></div>
          <div class="service-cta__chart-bar" style="height: 85%; animation-delay: 0.4s;"></div>
          <div class="service-cta__chart-bar" style="height: 70%; animation-delay: 0.5s;"></div>
          <div class="service-cta__chart-bar" style="height: 95%; animation-delay: 0.6s;"></div>
        </div>
      </div>
      <div class="service-cta__signal-card service-cta__signal-card--top">
        <span>LIVE PIPELINE</span>
        <strong id="serviceCtaStatus">Active Mapped</strong>
      </div>
      <div class="service-cta__signal-card service-cta__signal-card--bottom">
        <span>EST. REACH</span>
        <strong id="serviceCtaMetric">Analyzing...</strong>
      </div>
    </div>
    <div class="service-cta__copy">
      <span class="service-cta__eyebrow">${escapeHtml(eyebrow)}</span>
      <h2 class="service-cta__title" id="serviceCtaTitle">${escapeHtml(title)}</h2>
      <p class="service-cta__subtitle" id="serviceCtaSubtitle">${escapeHtml(subtitle)}</p>
      <div class="service-cta__actions">
        <a href="/join-as-brand.html" class="service-btn service-btn--primary service-btn--large">${escapeHtml(primaryLabel)}</a>
        <a href="${escapeHtml(secondaryHref)}" class="service-cta__link">
          ${escapeHtml(secondaryLabel)}
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </a>
      </div>
    </div>
  </div>
</section>`;
}

function renderServiceShell(service) {
  return `<!-- ═══ SERVICE HERO ═══════════════════════════════════════ -->
<section class="service-hero" aria-label="Service hero">
  <div class="container">
    <div class="service-hero__grid">
      <div class="service-hero__content">
        <div class="service-breadcrumbs">
          <a href="/">Home</a>
          <span>/</span>
          <a href="/services.html">Services</a>
          <span>/</span>
          <span id="serviceBreadcrumbCurrent">${escapeHtml(service.title)}</span>
        </div>

        <div class="service-hero__pill">
          <span class="service-hero__pill-icon" id="serviceIcon">${service.icon}</span>
          <span id="serviceLabel">${escapeHtml(service.title)}</span>
        </div>

        <h1 class="service-hero__title" id="serviceHeroTitle">${escapeHtml(service.hero_title)}</h1>
        <p class="service-hero__subtitle" id="serviceHeroSubheading"${service.hero_subheading ? '' : ' style="display:none;"'}>${escapeHtml(service.hero_subheading || '')}</p>

        <div class="service-hero__actions">
          <a href="/join-as-brand.html" class="service-btn service-btn--primary">Book Free Strategy Call</a>
          <a href="#service-case-studies" class="service-link-inline">
            View Case Studies
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </a>
        </div>

        <div class="service-hero__stats" id="serviceHeroStats"></div>
      </div>

      <div class="service-hero__visual">
        <div class="service-hero__visual-card">
          <div class="service-hero__shape service-hero__shape--one"></div>
          <div class="service-hero__shape service-hero__shape--two"></div>
          <div class="service-hero__floating-badge">
            <div class="service-hero__floating-icon">
              <svg viewBox="0 0 20 16" fill="none" aria-hidden="true">
                <path d="M2 8h16M12.5 2 18 8l-5.5 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <div>
              <span id="serviceHeroFloatingLabel">Live Page</span>
              <strong id="serviceHeroFloatingValue">Live & Verified</strong>
            </div>
          </div>

          <div class="service-hero__visual-copy">
            <span class="service-hero__visual-label" id="serviceHeroVisualLabel">Strategy Snapshot</span>
            <h2 id="serviceHeroVisualTitle">${escapeHtml(service.title)}</h2>
            <p id="serviceHeroVisualBody">${escapeHtml(service.hero_subheading || service.hero_title)}</p>
          </div>

          <div class="service-hero__visual-stat">
            <span id="serviceHeroVisualStatLabel">Core Steps</span>
            <strong id="serviceHeroVisualStatValue">0</strong>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ═══ WHAT WE DO ═══════════════════════════════════════ -->
<section class="service-section service-section--muted" id="serviceWhatWeDoSection">
  <div class="container">
    <div class="service-editorial-wrapper">
      <header class="service-section__header">
        <span class="service-section__eyebrow" id="serviceWhatEyebrow">What We Do</span>
        <h2 class="service-section__title" id="serviceWhatHeading">Our Approach</h2>
      </header>
      <div class="service-editorial-content" id="serviceWhatWeDo"></div>
    </div>
  </div>
</section>

<!-- ═══ HOW WE DO IT ═════════════════════════════════════ -->
<section class="service-section" id="serviceHowWeDoItSection">
  <div class="container">
    <header class="service-section__header service-section__header--center">
      <span class="service-section__eyebrow" id="serviceHowEyebrow">How We Do It</span>
      <h2 class="service-section__title service-section__title--center" id="serviceHowHeading">Bespoke solutions, real impact</h2>
      <p class="service-section__subtitle" id="serviceHowSubtitle">We align our services to your priorities, crafting creator-focused packages that support measurable success across the funnel.</p>
    </header>
    <div id="serviceHowWeDoIt"></div>
  </div>
</section>

<!-- ═══ WHAT MAKES US DIFFERENT ══════════════════════════ -->
<section class="service-section service-section--muted" id="serviceWhatMakesUsDifferentSection">
  <div class="container">
    <header class="service-section__header service-section__header--center">
      <span class="service-section__eyebrow" id="serviceDiffEyebrow">What Makes Us Different</span>
      <h2 class="service-section__title service-section__title--center" id="serviceDiffHeading">Designed as a system, not a one-off deliverable.</h2>
      <p class="service-section__subtitle" id="serviceDiffSubtitle">The same design language stays consistent across pages, but the value props and positioning stay specific to each service.</p>
    </header>
    <div id="serviceWhatMakesUsDifferent"></div>
  </div>
</section>

${renderServiceCta({
  title: `Ready to turn ${service.title} into measurable growth?`,
  subtitle: service.hero_subheading || 'Build a sharper service plan with a team that connects strategy, creator execution, and measurable performance.',
  metric: 'Service plan'
})}


<!-- ═══ CASE STUDIES ═════════════════════════════════════ -->
<section class="service-section service-case-studies" id="service-case-studies">
  <div class="container">
    <header class="service-section__header">
      <span class="service-section__eyebrow">Case Studies</span>
      <h2 class="service-section__title">Success Stories</h2>
      <p class="service-section__subtitle">A shared proof section across all service pages, powered by your live case-study library.</p>
    </header>
    <div class="service-case-grid" id="serviceCaseStudiesGrid">
      <div class="service-placeholder-card">Loading case studies...</div>
    </div>
  </div>
</section>

<!-- ═══ FAQ ══════════════════════════════════════════════ -->
<section class="service-faq" id="serviceFaqSection">
  <div class="container">
    <div class="service-faq__grid">
      <div class="service-faq__intro">
        <span class="service-section__eyebrow">FAQ</span>
        <h2 class="service-section__title" id="serviceFaqTitle">Questions about ${escapeHtml(service.title)}?</h2>
        <p class="service-section__subtitle" id="serviceFaqSubtitle">Answers tailored to this service page, while keeping the same FAQ design system across all service templates.</p>
        <a href="/join-as-brand.html" class="service-btn service-btn--dark">Talk to the Team</a>
      </div>

      <div class="service-faq__list" id="serviceFaqList"></div>
    </div>
  </div>
</section>

<script src="/js/service-page-ui.js" defer></script>
<script src="/js/service-pages.js" defer></script>`;
}

function renderServicesIndexShell() {
  return `<!-- ═══ HERO ════════════════════════════════════════════════ -->
<section class="page-header section" aria-label="Services hero">
  <div class="container">
    <div class="page-header__inner" style="gap: 24px;">
      <span class="section-label">All Services</span>
      <h1 class="page-header__title" style="font-size: clamp(40px, 5vw, 62px); line-height: 1.1; max-width: 900px;">Our Comprehensive Services</h1>
      <p class="body-lg" style="max-width: 780px; margin: 0;">Explore the live service portfolio and open each page to see the latest content managed from the system.</p>
      <div class="page-header__breadcrumbs">
        <span>Home</span>
        <span class="sep">/</span>
        <span class="current">All Services</span>
      </div>
    </div>
  </div>
</section>

<!-- ═══ SERVICES OVERVIEW ════════════════════════════════ -->
<section class="section section--light">
  <div class="container">
      <header class="services-section__header" style="margin-bottom: 48px;">
        <span class="section-label">Explore The Full Portfolio</span>
        <h2 class="h2" style="font-size: clamp(32px, 4vw, 48px); text-align: center;">All Services</h2>
      </header>
      <div class="services-grid" id="servicesOverviewGrid" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));">
        <div class="service-rich-card" style="grid-column: 1 / -1;">
          <div class="service-rich-content">
            <p>Loading services...</p>
          </div>
        </div>
      </div>
  </div>
</section>

${renderServiceCta({
  title: 'Accelerate your brand growth with WeSocializeU',
  subtitle: 'Turn attention into demand and campaigns into revenue with creator-led strategy, content systems, and performance thinking built around your goals.',
  metric: 'Full portfolio',
  primaryLabel: 'Join As Brand',
  secondaryLabel: 'Join As Creator',
  secondaryHref: '/join-as-creator.html'
})}

<script src="/js/service-pages.js" defer></script>`;
}

function buildDocument({ bodyContent, title, metaDescription, bodyAttributes = '' }) {
  const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');
  const contentStart = template.indexOf('<!-- ═══ PAGE HEADER');
  const footerStart = template.indexOf('<!-- ═══ FOOTER');

  let documentHtml = template.slice(0, contentStart) + bodyContent + '\n' + template.slice(footerStart);
  documentHtml = documentHtml.replace('<body>', `<body${bodyAttributes}>`);
  documentHtml = documentHtml.replace(/<title>.*?<\/title>/, `<title>${escapeHtml(title)} — WeSocializeU</title>`);
  documentHtml = documentHtml.replace(
    /<meta name="description" content=".*?">/,
    `<meta name="description" id="pgDesc" content="${escapeHtml(metaDescription)}">`
  );

  return patchNavigation(documentHtml);
}

function updateServicesIndex() {
  const html = buildDocument({
    title: 'All Services',
    metaDescription: 'Explore the live WeSocializeU service portfolio backed by the admin-managed service content model.',
    bodyAttributes: ' data-services-index="true"',
    bodyContent: renderServicesIndexShell()
  });

  fs.writeFileSync(path.join(ROOT, 'services.html'), html, 'utf8');
  console.log('Updated services.html');
}

function writeServicePages() {
  servicePages.forEach((service) => {
    const html = buildDocument({
      title: service.title,
      metaDescription: service.hero_subheading || service.hero_title,
      bodyAttributes: ` data-service-slug="${escapeHtml(service.slug)}"`,
      bodyContent: renderServiceShell(service)
    });

    fs.writeFileSync(path.join(ROOT, service.filename), html, 'utf8');
    console.log(`Created ${service.filename}`);
  });
}

function updateSharedNavigation() {
  const htmlFiles = fs.readdirSync(ROOT).filter((file) => file.endsWith('.html'));

  htmlFiles.forEach((file) => {
    if (file === 'services.html') return;

    const fullPath = path.join(ROOT, file);
    const currentHtml = fs.readFileSync(fullPath, 'utf8');
    const patchedHtml = patchNavigation(currentHtml);

    if (patchedHtml !== currentHtml) {
      fs.writeFileSync(fullPath, patchedHtml, 'utf8');
      console.log(`Patched navigation in ${file}`);
    }
  });
}

try {
  writeServicePages();
  updateServicesIndex();
  updateSharedNavigation();
  console.log('Service pages generated successfully.');
} catch (error) {
  console.error('Failed to generate service pages:', error);
  process.exitCode = 1;
}
