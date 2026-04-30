'use strict';

const SERVICE_PAGE_UI = window.SERVICE_PAGE_UI || {};

(function initServicePages() {
  const serviceSlug = document.body.dataset.serviceSlug;
  const isServicesIndex = document.body.dataset.servicesIndex === 'true';

  if (serviceSlug) {
    loadServicePage(serviceSlug);
  }

  if (isServicesIndex) {
    loadServicesIndex();
  }
})();

async function loadServicePage(slug) {
  try {
    const res = await fetch(`/api/services/${encodeURIComponent(slug)}`);
    if (!res.ok) throw new Error('Failed to load service');
    const service = await res.json();
    const ui = SERVICE_PAGE_UI[slug] || {};

    applyServiceTheme(service);

    const whatParagraphs = extractParagraphs(service.what_we_do || '');
    const savedStepItems = normalizeServiceStepItems(service.how_steps || service.how_steps_json);
    const stepItems = savedStepItems.length ? savedStepItems : extractSteps(service.how_we_do_it || '');
    const diffItems = extractHighlights(service.what_makes_us_different || '');
    const useCases = extractHighlights(service.use_cases || '');
    const supportHighlights = ui.highlights && ui.highlights.length ? ui.highlights : [];
    const metricCards = ui.heroStats && ui.heroStats.length ? ui.heroStats : [];

    setText('serviceIcon', service.icon || '★');
    setText('serviceLabel', service.title || '');
    setText('serviceHeroTitle', service.hero_title || '');
    toggleText('serviceHeroSubheading', service.hero_subheading || '');
    setText('serviceBreadcrumbCurrent', service.title || '');
    setText('serviceWhatHeading', 'Our Approach');
    setText('serviceHowHeading', 'Bespoke solutions, real impact');
    setText('serviceHowSubtitle', 'We align our services to your priorities, crafting creator-focused packages that support measurable success across the funnel.');
    setText('serviceDiffHeading', service.diff_heading || ui.diffHeading || 'Designed as a system, not a one-off deliverable.');
    setText('serviceDiffSubtitle', service.diff_subtitle || ui.diffSubtitle || 'The same design language stays consistent across pages, but the value props and positioning stay specific to each service.');
    setText('serviceUseCasesSubtitle', service.use_cases_subtitle || ui.useCasesSubtitle || 'Clear moments where this service becomes a growth lever for the brand.');

    renderHeroStats(metricCards.slice(0, 3));
    renderServiceHeroVisual(service, ui, metricCards, stepItems);
    renderWhatWeDo(service.what_we_do || '', service, supportHighlights);
    renderHowWeDoIt(stepItems, service.how_we_do_it || '', service);
    renderWhatMakesUsDifferent(diffItems, service.what_makes_us_different || '');
    renderFaqs(service, whatParagraphs, stepItems, diffItems, useCases, ui);
    renderServiceCta(service, stepItems);
    document.getElementById('serviceUseCasesSection')?.remove();

    setText('serviceFaqTitle', `Questions about ${service.title || 'this service'}?`);
    setText('serviceFaqSubtitle', service.faq_subtitle || ui.faqSubtitle || service.hero_subheading || 'We adapt the same service-page system to each offering, while keeping the answers specific to the service you are viewing.');
    document.title = `${service.title} — WeSocializeU`;
    const metaDesc = document.getElementById('pgDesc');
    if (metaDesc) {
      metaDesc.setAttribute('content', buildMetaDescription(service));
    }

    loadCaseStudies();
  } catch (error) {
    renderServiceError();
  }
}

async function loadServicesIndex() {
  const grid = document.getElementById('servicesOverviewGrid');
  if (!grid) return;

  try {
    const res = await fetch('/api/services');
    if (!res.ok) throw new Error('Failed to load services');
    const services = await res.json();

    grid.innerHTML = services.map((service, index) => `
      <a href="/${escapeHtml(service.slug)}.html" class="service-card${index % 2 === 1 ? ' service-card--blue' : ''}" style="text-decoration:none;">
        <div class="service-card__icon" style="font-size:1.8rem;color:var(--clr-blue);">${escapeHtml(service.icon || '★')}</div>
        <h3 class="service-card__title">${escapeHtml(service.title || '')}</h3>
        <p class="service-card__body">${escapeHtml(service.hero_title || service.hero_subheading || '')}</p>
        <span class="service-card__link">
          Explore Service
          <svg viewBox="0 0 10 4" fill="currentColor"><path d="M0 2h8m-3-2 3 2-3 2"/></svg>
        </span>
      </a>
    `).join('');
  } catch (error) {
    grid.innerHTML = `
      <div class="service-rich-card" style="max-width:960px;grid-column:1 / -1;">
        <div class="service-rich-content">
          <p>Unable to load services right now.</p>
        </div>
      </div>
    `;
  }
}

async function loadCaseStudies() {
  const grid = document.getElementById('serviceCaseStudiesGrid');
  if (!grid) return;
  ensureCaseStudiesFooter(grid);

  try {
    const res = await fetch('/api/case-studies');
    if (!res.ok) throw new Error('Failed to load case studies');
    const items = (await res.json()).slice(0, 5);

    if (!items.length) {
      grid.innerHTML = `<div class="service-placeholder-card">Case studies will appear here once they are added from the system.</div>`;
      return;
    }

    const classesByIndex = [
      'service-case-card service-case-card--featured',
      'service-case-card service-case-card--stack',
      'service-case-card service-case-card--stack',
      'service-case-card service-case-card--wide',
      'service-case-card service-case-card--stack'
    ];

    grid.innerHTML = items.map((item, index) => {
      const href = item.link_url && item.link_url.trim()
        ? item.link_url.trim()
        : `/case-study.html?id=${item.id}`;
      const excerpt = item.excerpt || item.body || '';

      return `
        <a href="${escapeHtml(href)}" class="${classesByIndex[index] || 'service-case-card'}">
          ${item.image_url ? `<img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.title || 'Case study')}" class="service-case-card__image" loading="lazy">` : ''}
          <div class="service-case-card__overlay"></div>
          <div class="service-case-card__content">
            <span class="service-case-card__eyebrow">Case Study</span>
            <h3>${escapeHtml(item.title || 'Case Study')}</h3>
            ${excerpt ? `<p>${escapeHtml(trimWords(stripHtml(excerpt), index === 0 ? 26 : 14))}</p>` : ''}
          </div>
        </a>
      `;
    }).join('');
  } catch (error) {
    grid.innerHTML = `<div class="service-placeholder-card">Unable to load case studies right now.</div>`;
  }
}

function ensureCaseStudiesFooter(grid) {
  if (!grid || !grid.parentElement) return;
  const sectionBody = grid.parentElement;
  let footer = sectionBody.querySelector('.service-case-studies__footer');
  if (!footer) {
    footer = document.createElement('div');
    footer.className = 'service-case-studies__footer';
    footer.innerHTML = `
      <a href="/case-studies.html" class="service-case-studies__cta">
        <span>View All Case Studies</span>
        <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </a>
    `;
    sectionBody.appendChild(footer);
  }
}

function renderHeroStats(stats) {
  const container = document.getElementById('serviceHeroStats');
  if (!container) return;

  container.innerHTML = stats.map((stat) => `
    <div class="service-hero__stat">
      <strong>${escapeHtml(stat.value)}</strong>
      <span>${escapeHtml(stat.label)}</span>
    </div>
  `).join('');
}

function renderServiceHeroVisual(service, ui, metrics, steps) {
  const visual = document.querySelector('.service-hero__visual');
  if (!visual) return;

  const imageItems = normalizeHeroGalleryImages(service.hero_gallery_images);
  const defaultImageItems = buildHeroImageCards(service);
  const fallbackItems = buildHeroFallbackCards(service, ui, metrics, steps);
  const items = imageItems.length
    ? imageItems.map((url, index) => ({
        type: 'image',
        url,
        alt: `${service.title || 'Service'} hero image ${index + 1}`
      }))
    : defaultImageItems.length
      ? defaultImageItems
      : fallbackItems;

  if (!items.length) return;

  const minimumCardCount = Math.max(6, items.length * 2);
  const repeatedItems = Array.from({ length: minimumCardCount }, (_, index) => items[index % items.length]);
  const mediaCards = repeatedItems.map(renderServiceHeroMediaCard).join('');

  visual.innerHTML = `
    <div class="service-hero__media-shell" aria-label="${escapeHtml(service.title || 'Service')} showcase">
      <div class="service-hero__media-line"></div>
      <div class="service-hero__media-viewport">
        <div class="service-hero__media-track">
          <div class="service-hero__media-sequence">
            ${mediaCards}
          </div>
          <div class="service-hero__media-sequence" aria-hidden="true">
            ${mediaCards}
          </div>
        </div>
      </div>
    </div>
  `;
}

function normalizeHeroGalleryImages(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean).slice(0, 5);
  }

  if (typeof value !== 'string' || !value.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(Boolean).slice(0, 5) : [];
  } catch {
    return value.split('\n').map((item) => item.trim()).filter(Boolean).slice(0, 5);
  }
}

function buildHeroImageCards(service) {
  const imageMap = {
    'influencer-marketing': [
      '/assets/service-hero/influencer-creator-collab.svg',
      '/assets/service-hero/influencer-campaign-dashboard.svg',
      '/assets/service-hero/influencer-brand-launch.svg'
    ],
    default: [
      '/assets/service-hero/influencer-creator-collab.svg',
      '/assets/service-hero/influencer-campaign-dashboard.svg',
      '/assets/service-hero/influencer-brand-launch.svg'
    ]
  };

  const urls = imageMap[service.slug] || imageMap.default;
  return urls.map((url, index) => ({
    type: 'image',
    url,
    alt: `${service.title || 'Service'} visual ${index + 1}`
  }));
}

function buildHeroFallbackCards(service, ui, metrics, steps) {
  const safeMetrics = Array.isArray(metrics) ? metrics.filter((item) => item && item.value && item.label) : [];
  const cards = safeMetrics.slice(0, 3).map((metric, index) => ({
    type: 'placeholder',
    eyebrow: metric.label,
    title: metric.value,
    body: index === 0
      ? service.title || 'WeSocializeU'
      : (service.hero_subheading || service.hero_title || '').slice(0, 90),
    tone: index % 3
  }));

  if (!cards.length) {
    cards.push(
      {
        type: 'placeholder',
        eyebrow: ui.visualLabel || 'Creator System',
        title: service.title || 'Service Page',
        body: trimWords(stripHtml(service.hero_subheading || service.hero_title || ''), 14),
        tone: 0
      },
      {
        type: 'placeholder',
        eyebrow: 'Execution',
        title: steps.length ? `${steps.length} Steps` : 'Live',
        body: ui.floatingValue || 'Live & Verified',
        tone: 1
      },
      {
        type: 'placeholder',
        eyebrow: 'Built For',
        title: trimWords(service.hero_title || service.title || 'Growth', 5),
        body: 'Upload hero images automatically to replace these placeholders.',
        tone: 2
      }
    );
  }

  return cards;
}

function renderServiceHeroMediaCard(item) {
  if (item.type === 'image') {
    return `
      <article class="service-hero__media-card">
        <img src="${escapeHtml(item.url)}" alt="${escapeHtml(item.alt || 'Service hero image')}" loading="lazy">
      </article>
    `;
  }

  return `
    <article class="service-hero__media-card service-hero__media-card--placeholder service-hero__media-card--tone-${item.tone || 0}">
      <span class="service-hero__media-eyebrow">${escapeHtml(item.eyebrow || 'WeSocializeU')}</span>
      <h3>${escapeHtml(item.title || 'Service')}</h3>
      <p>${escapeHtml(item.body || 'Upload hero images automatically to customize this service page.')}</p>
    </article>
  `;
}

function renderWhatWeDo(contentHtml, service = {}, fallbackHighlights = []) {
  const content = document.getElementById('serviceWhatWeDo');
  const section = document.getElementById('serviceWhatWeDoSection');
  if (!content) return;

  const approachItems = buildApproachItems(contentHtml, service, fallbackHighlights);

  if (approachItems.length) {
    content.innerHTML = `
      <div class="service-approach-list">
        ${approachItems.map((item) => `
          <article class="service-approach-item">
            <h3>${escapeHtml(item.title)}</h3>
            <p>${escapeHtml(item.body)}</p>
          </article>
        `).join('')}
      </div>
    `;
    if (section) section.style.display = '';
    bindServiceApproachMotion(section);
  } else {
    content.innerHTML = '';
    if (section) section.style.display = 'none';
  }
}

function bindServiceApproachMotion(section) {
  if (!section || section.dataset.approachMotionBound === 'true') {
    updateServiceApproachMotion(section);
    return;
  }

  section.dataset.approachMotionBound = 'true';
  let ticking = false;
  const update = () => {
    ticking = false;
    updateServiceApproachMotion(section);
  };
  const requestUpdate = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  };

  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate);
  requestUpdate();
}

function updateServiceApproachMotion(section) {
  if (!section) return;

  const header = section.querySelector('.service-section__header');
  const items = Array.from(section.querySelectorAll('.service-approach-item'));
  if (!header || items.length < 2 || window.matchMedia('(max-width: 1100px)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    if (header) header.style.transform = '';
    return;
  }

  const firstHeading = items[0].querySelector('h3');
  const lastHeading = items[items.length - 1].querySelector('h3');
  if (!firstHeading || !lastHeading) return;

  const scrollY = window.scrollY || window.pageYOffset || 0;
  const stickyTop = parseFloat(getComputedStyle(header).top) || 0;
  const firstTop = firstHeading.getBoundingClientRect().top + scrollY;
  const lastTop = lastHeading.getBoundingClientRect().top + scrollY;
  const range = Math.max(1, lastTop - firstTop);
  const progress = Math.min(1, Math.max(0, (scrollY + stickyTop - firstTop) / range));
  const maxShift = Math.min(range, Math.max(0, section.offsetHeight - header.offsetHeight - 120));

  header.style.transform = `translate3d(0, ${Math.round(progress * maxShift)}px, 0)`;
}

function buildApproachItems(contentHtml, service = {}, fallbackHighlights = []) {
  const temp = document.createElement('div');
  temp.innerHTML = contentHtml || '';

  const structured = [];
  let currentItem = null;

  Array.from(temp.children).forEach((child) => {
    const tagName = child.tagName.toLowerCase();
    const text = cleanText(child.textContent || '');
    if (!text) return;

    if (/^h[1-6]$/.test(tagName)) {
      if (currentItem && currentItem.body) structured.push(currentItem);
      currentItem = { title: text, body: '' };
      return;
    }

    if (tagName === 'p' || tagName === 'li') {
      if (currentItem && !currentItem.body) {
        currentItem.body = text;
        structured.push(currentItem);
        currentItem = null;
        return;
      }

      structured.push({
        title: getApproachTitle(structured.length, text),
        body: text
      });
    }

    if (tagName === 'ul' || tagName === 'ol') {
      const listItems = Array.from(child.querySelectorAll('li'))
        .map((item) => cleanText(item.textContent || ''))
        .filter(Boolean);

      if (currentItem && !currentItem.body && listItems.length) {
        currentItem.body = listItems.shift();
        structured.push(currentItem);
        currentItem = null;
      }

      listItems.forEach((listText) => {
        structured.push({
          title: getApproachTitle(structured.length, listText),
          body: listText
        });
      });
    }
  });

  if (currentItem && currentItem.body) structured.push(currentItem);
  if (structured.length) return structured;

  const paragraphItems = extractParagraphs(contentHtml).map((body, index) => ({
    title: getApproachTitle(index, body),
    body
  }));
  if (paragraphItems.length) return paragraphItems;

  const highlightItems = fallbackHighlights
    .map((body, index) => ({
      title: getApproachTitle(index, body),
      body: cleanText(body)
    }))
    .filter((item) => item.body);
  if (highlightItems.length) return highlightItems;

  const fallbackBody = cleanText(service.hero_subheading || service.hero_title || '');
  return fallbackBody ? [{ title: 'Approach Overview', body: fallbackBody }] : [];
}

function getApproachTitle(index, body) {
  const titles = [
    'Amplify Marketing Effectiveness',
    'Achieve Milestones',
    'Top Collaborations',
    'Expert Team',
    'Proven Strategies',
    'Scale What Works'
  ];

  return titles[index] || trimWords(body, 5);
}

function renderHowWeDoIt(steps, fallbackHtml, service = {}) {
  const section = document.getElementById('serviceHowWeDoItSection');
  const grid = document.getElementById('serviceHowWeDoIt');
  if (!grid) return;

  if (steps.length) {
    const imageUrl = service.how_image_url || '/assets/service-sections/how-we-do-it-default.svg';
    grid.innerHTML = `
      <div class="service-solutions-layout" data-service-solutions>
        <div class="service-solutions-list" role="list">
          ${steps.map((step, index) => `
            <article class="service-solution-item${index === 0 ? ' is-active' : ''}" role="listitem">
              <button type="button" class="service-solution-item__trigger" aria-expanded="${index === 0 ? 'true' : 'false'}" data-image="${escapeHtml(step.image || service.how_image_url || '/assets/service-sections/how-we-do-it-default.svg')}" data-image-alt="${escapeHtml(`${cleanStepTitle(step.title) || 'Step'} visual`)}}">
                <span class="service-solution-item__icon" aria-hidden="true">${getSolutionIcon(index)}</span>
                <span class="service-solution-item__title">${escapeHtml(cleanStepTitle(step.title))}</span>
              </button>
              ${step.description ? `<p class="service-solution-item__body">${escapeHtml(step.description)}</p>` : ''}
            </article>
          `).join('')}
        </div>
        <aside class="service-solutions-visual" aria-label="${escapeHtml(service.title || 'Service')} execution visual">
          <div class="service-solutions-visual__card">
            <img src="${escapeHtml(steps[0]?.image || imageUrl)}" alt="${escapeHtml(`${service.title || 'Service'} how we do it visual`)}" loading="lazy" id="serviceSolutionsVisualImg">
          </div>
        </aside>
      </div>
    `;
    if (section) section.style.display = '';
    bindServiceSolutions(grid);
    return;
  }

  if (fallbackHtml && fallbackHtml.trim()) {
    grid.innerHTML = '<div class="service-editorial-text">' + fallbackHtml + '</div>';
    if (section) section.style.display = '';
  } else if (section) {
    section.style.display = 'none';
  }
}

function bindServiceSolutions(container) {
  const items = Array.from(container.querySelectorAll('.service-solution-item'));
  const visualImg = container.querySelector('#serviceSolutionsVisualImg');
  items.forEach((item) => {
    const trigger = item.querySelector('.service-solution-item__trigger');
    if (!trigger) return;

    trigger.addEventListener('click', () => {
      items.forEach((otherItem) => {
        const otherTrigger = otherItem.querySelector('.service-solution-item__trigger');
        const isActive = otherItem === item;
        otherItem.classList.toggle('is-active', isActive);
        if (otherTrigger) otherTrigger.setAttribute('aria-expanded', String(isActive));
      });
      if (visualImg && trigger.dataset.image) {
        swapServiceSolutionImage(visualImg, trigger.dataset.image, trigger.dataset.imageAlt);
      }
    });
  });
}

function swapServiceSolutionImage(visualImg, nextSrc, nextAlt) {
  const resolvedNextSrc = nextSrc ? new URL(nextSrc, window.location.href).href : '';
  if (!resolvedNextSrc || visualImg.src === resolvedNextSrc) {
    if (nextAlt) visualImg.alt = nextAlt;
    return;
  }

  const card = visualImg.closest('.service-solutions-visual__card');
  if (card) card.classList.add('is-image-transitioning');

  const preload = new Image();
  preload.onload = () => {
    visualImg.src = resolvedNextSrc;
    if (nextAlt) visualImg.alt = nextAlt;
    requestAnimationFrame(() => {
      if (card) card.classList.remove('is-image-transitioning');
    });
  };
  preload.onerror = () => {
    visualImg.src = resolvedNextSrc;
    if (nextAlt) visualImg.alt = nextAlt;
    if (card) card.classList.remove('is-image-transitioning');
  };
  preload.src = resolvedNextSrc;
}

function cleanStepTitle(title) {
  return cleanText(title).replace(/^\d+[\).\s-]+/, '');
}

function getSolutionIcon(index) {
  const icons = ['✦', '✱', '◉', '◎', '▥', '✓'];
  return icons[index % icons.length];
}

function renderWhatMakesUsDifferent(items, fallbackHtml) {
  const section = document.getElementById('serviceWhatMakesUsDifferentSection');
  const grid = document.getElementById('serviceWhatMakesUsDifferent');
  if (!grid) return;
  const DIFFERENTIATOR_CARD_TITLES = ['Brand Advantage', 'Market Positioning', 'Authenticity Layer', 'Cultural Impact'];

  if (items.length) {
    const cards = items.map((item, index) => buildNarrativeCard(item, DIFFERENTIATOR_CARD_TITLES, index, 'Differentiator'));
    grid.innerHTML = `
      <div class="service-diff-layout service-diff-layout--uniform">
        <div class="service-diff-grid-premium service-diff-grid-premium--uniform">
          ${cards.map((card, index) => `
            <article class="service-diff-card-premium service-diff-card-premium--uniform">
              <div class="service-diff-card-premium__top">
                <span class="service-diff-card-premium__index">${String(index + 1).padStart(2, '0')}</span>
                <span class="service-diff-card-premium__kicker">Differentiator</span>
              </div>
              <h3>${escapeHtml(card.title)}</h3>
              <p>${escapeHtml(card.body)}</p>
            </article>
          `).join('')}
        </div>
      </div>
    `;
    if (section) section.style.display = '';
    return;
  }

  if (fallbackHtml && fallbackHtml.trim()) {
    grid.innerHTML = '<div class="service-editorial-text">' + fallbackHtml + '</div>';
    if (section) section.style.display = '';
  } else if (section) {
    section.style.display = 'none';
  }
}

function renderUseCases(title, items, fallbackHtml, ui) {
  const section = document.getElementById('serviceUseCasesSection');
  const label = document.getElementById('serviceUseCasesLabel');
  const heading = document.getElementById('serviceUseCasesHeading');
  const grid = document.getElementById('serviceUseCases');
  if (!grid) return;

  const normalizedItems = Array.isArray(items) ? items.filter(Boolean) : [];
  const fallbackItems = extractHighlights(fallbackHtml || '');
  const cardData = (normalizedItems.length ? normalizedItems : fallbackItems).map((item, index) =>
    buildNarrativeCard(
      item,
      (ui && Array.isArray(ui.useCaseTitles) && ui.useCaseTitles.length ? ui.useCaseTitles : ['Launch Moment', 'Growth Trigger', 'Market Expansion', 'Retention Play']),
      index,
      'Use Case'
    )
  );

  if (label) label.textContent = title || 'Use Cases';
  if (heading) heading.textContent = title || 'Use Cases';

  if (cardData.length) {
    const featured = cardData[0];
    const secondaryCards = cardData.slice(1);

    const featuredHtml = `
      <article class="service-use-case-spotlight">
        <div class="service-use-case-card__top">
          <span class="service-use-case-card__index">01</span>
          <span class="service-use-case-card__eyebrow">Primary Opportunity</span>
        </div>
        <h3>${escapeHtml(featured.title)}</h3>
        <p>${escapeHtml(featured.body)}</p>
        <div class="service-use-case-card__footer">
          <span>Use Case Focus</span>
          <strong>${escapeHtml(buildUseCaseFooter(featured))}</strong>
        </div>
      </article>
    `;

    const secondaryHtml = secondaryCards.length
      ? secondaryCards.map((card, index) => `
          <article class="service-use-case-card">
            <div class="service-use-case-card__top">
              <span class="service-use-case-card__index">${String(index + 2).padStart(2, '0')}</span>
              <span class="service-use-case-card__eyebrow">Growth Scenario</span>
            </div>
            <h3>${escapeHtml(card.title)}</h3>
            <p>${escapeHtml(card.body)}</p>
          </article>
        `).join('')
      : `
          <article class="service-use-case-card service-use-case-card--compact">
            <div class="service-use-case-card__top">
              <span class="service-use-case-card__index">02</span>
              <span class="service-use-case-card__eyebrow">Delivery Lens</span>
            </div>
            <h3>Custom Execution</h3>
            <p>The service structure adapts to the brand stage, campaign window, and market context rather than forcing a fixed template.</p>
          </article>
        `;

    grid.innerHTML = `
      <div class="service-use-case-showcase">
        ${featuredHtml}
        <div class="service-use-case-rail">
          ${secondaryHtml}
        </div>
      </div>
    `;
    if (section) section.style.display = '';
    return;
  }

  grid.innerHTML = '';
  if (section) section.style.display = 'none';
}

function renderFaqs(service, whatParagraphs, stepItems, diffItems, useCases, ui) {
  const list = document.getElementById('serviceFaqList');
  if (!list) return;

  const customFaqs = ui && Array.isArray(ui.faqs) ? ui.faqs.filter((item) => item && item.question && item.answer) : [];
  const generatedFaqs = [];

  if (service && service.title) {
    const primarySummary = whatParagraphs && whatParagraphs.length
      ? trimWords(whatParagraphs[0], 28)
      : `This service is designed around the specific goals, audience, and execution needs of the brand.`;

    generatedFaqs.push({
      question: `What does ${service.title} include?`,
      answer: primarySummary
    });
  }

  if (stepItems && stepItems.length) {
    generatedFaqs.push({
      question: `How is ${service.title || 'this service'} delivered?`,
      answer: `The execution model typically covers ${joinListForSentence(stepItems.map((step) => step.title))}.`
    });
  }

  if (diffItems && diffItems.length) {
    generatedFaqs.push({
      question: `What makes ${service.title || 'this service'} different?`,
      answer: `The main differentiators are ${joinListForSentence(diffItems.slice(0, 3))}.`
    });
  }

  if (useCases && useCases.length) {
    generatedFaqs.push({
      question: `When should a brand use ${service.title || 'this service'}?`,
      answer: `This service is especially useful for ${joinListForSentence(useCases.slice(0, 4))}.`
    });
  }

  const faqs = uniqueFaqs(customFaqs.length ? customFaqs : generatedFaqs).slice(0, 4);

  if (!faqs.length) {
    list.innerHTML = '';
    return;
  }

  list.innerHTML = faqs.map((faq, index) => `
    <div class="faq-item${index === 0 ? ' open' : ''}" role="listitem">
      <button class="faq-item__trigger" aria-expanded="${index === 0 ? 'true' : 'false'}" type="button">
        <span class="faq-item__question">${escapeHtml(faq.question)}</span>
        <svg class="faq-item__chevron" viewBox="0 0 12 8" fill="none" aria-hidden="true">
          <path d="M1 1l5 5 5-5" stroke="#F5A623" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
      <div class="faq-item__answer">
        <div class="faq-item__answer-inner">${escapeHtml(faq.answer)}</div>
      </div>
    </div>
  `).join('');

  bindFaqInteractions(list);
}

function renderServiceCta(service = {}, stepItems = []) {
  const section = document.getElementById('serviceCtaSection');
  if (!section) return;

  const title = service.cta || `Ready to turn ${service.title || 'your next service'} into measurable growth?`;
  const subtitle = service.cta_subtitle || service.hero_subheading || 'Bring us your goal, audience, and timeline. We will shape a creator-led plan that connects strategy, content, and performance.';
  const metric = stepItems.length ? `${stepItems.length}-Step Plan` : 'Live Strategy';

  setText('serviceCtaTitle', title);
  toggleText('serviceCtaSubtitle', subtitle);
  setText('serviceCtaMetric', metric);
  setText('serviceCtaStatus', 'Active Mapped');
}

function buildNarrativeCard(text, fallbackTitles, index, fallbackPrefix) {
  const clean = cleanText(text);
  const separatorMatch = clean.match(/^([^:.-]{10,80})\s*[:.-]\s+(.+)$/);

  if (separatorMatch) {
    return {
      title: cleanText(separatorMatch[1]),
      body: cleanText(separatorMatch[2])
    };
  }

  return {
    title: fallbackTitles[index] || `${fallbackPrefix} ${index + 1}`,
    body: clean
  };
}

function applyServiceTheme(service) {
  const themes = [
    { accent: '#F5A623', accentSoft: 'rgba(245, 166, 35, 0.16)', accentAlt: '#175DB2', ink: '#644000' },
    { accent: '#175DB2', accentSoft: 'rgba(23, 93, 178, 0.14)', accentAlt: '#F5A623', ink: '#0F3D75' },
    { accent: '#0C7C59', accentSoft: 'rgba(12, 124, 89, 0.14)', accentAlt: '#F5A623', ink: '#0B5D43' },
    { accent: '#B45309', accentSoft: 'rgba(180, 83, 9, 0.14)', accentAlt: '#0C7C59', ink: '#7C2D12' }
  ];

  const theme = themes[((service.sort_order || 1) - 1) % themes.length];
  document.body.style.setProperty('--service-accent', theme.accent);
  document.body.style.setProperty('--service-accent-soft', theme.accentSoft);
  document.body.style.setProperty('--service-accent-alt', theme.accentAlt);
  document.body.style.setProperty('--service-accent-ink', theme.ink);
}

function extractParagraphs(html) {
  const temp = document.createElement('div');
  temp.innerHTML = html || '';

  const paragraphs = Array.from(temp.querySelectorAll('p'))
    .map((node) => cleanText(node.textContent))
    .filter(Boolean);

  if (paragraphs.length) return paragraphs;

  const text = cleanText(temp.textContent || '');
  return text ? [text] : [];
}

function extractHighlights(html) {
  const temp = document.createElement('div');
  temp.innerHTML = html || '';

  const listItems = Array.from(temp.querySelectorAll('li'))
    .map((node) => cleanText(node.textContent))
    .filter(Boolean);

  if (listItems.length) return listItems;

  const paragraphs = Array.from(temp.querySelectorAll('p'))
    .map((node) => cleanText(node.textContent))
    .filter(Boolean);

  return paragraphs;
}

function extractSteps(html) {
  const temp = document.createElement('div');
  temp.innerHTML = html || '';

  const blocks = Array.from(temp.querySelectorAll('.service-step'));
  if (blocks.length) {
    return blocks.map((block, index) => {
      const title = cleanText(block.querySelector('h3')?.textContent || `Step ${index + 1}`);
      const description = cleanText(block.querySelector('p')?.textContent || '');
      const image = block.querySelector('img')?.getAttribute('src') || '';
      return { title, description, image };
    });
  }

  const paragraphs = extractParagraphs(html);
  return paragraphs.map((text, index) => ({
    title: `Step ${index + 1}`,
    description: text,
    image: ''
  }));
}

function normalizeServiceStepItems(value) {
  let steps = [];
  if (Array.isArray(value)) {
    steps = value;
  } else if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      steps = Array.isArray(parsed) ? parsed : [];
    } catch {
      steps = [];
    }
  }

  return steps
    .map((step, index) => ({
      title: cleanText(step?.title || `Step ${index + 1}`),
      description: cleanText(step?.description || ''),
      image: String(step?.image || '').trim()
    }))
    .filter((step) => step.title || step.description || step.image);
}

function joinListForSentence(items) {
  const normalized = items.map((item) => item.replace(/\.$/, '').toLowerCase());
  if (normalized.length === 1) return normalized[0];
  if (normalized.length === 2) return `${normalized[0]} and ${normalized[1]}`;
  return `${normalized.slice(0, -1).join(', ')}, and ${normalized[normalized.length - 1]}`;
}

function uniqueList(items) {
  const seen = new Set();
  return items.filter((item) => {
    const normalized = item.toLowerCase();
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

function uniqueFaqs(items) {
  const seen = new Set();
  return items.filter((item) => {
    const question = cleanText(item.question);
    const answer = cleanText(item.answer);
    const key = `${question.toLowerCase()}|${answer.toLowerCase()}`;

    if (!question || !answer || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function bindFaqInteractions(container) {
  Array.from(container.querySelectorAll('.faq-item__trigger')).forEach((trigger) => {
    trigger.addEventListener('click', () => {
      const item = trigger.closest('.faq-item');
      if (!item) return;

      const isOpen = item.classList.contains('open');
      Array.from(container.querySelectorAll('.faq-item')).forEach((faqItem) => {
        faqItem.classList.remove('open');
        const faqTrigger = faqItem.querySelector('.faq-item__trigger');
        if (faqTrigger) faqTrigger.setAttribute('aria-expanded', 'false');
      });

      if (!isOpen) {
        item.classList.add('open');
        trigger.setAttribute('aria-expanded', 'true');
      }
    });
  });
}

function trimWords(text, limit) {
  const words = cleanText(text).split(/\s+/).filter(Boolean);
  if (words.length <= limit) return words.join(' ');
  return `${words.slice(0, limit).join(' ')}…`;
}

function buildUseCaseFooter(card) {
  const source = `${card.title} ${card.body}`.toLowerCase();

  if (source.includes('launch')) return 'Product or campaign rollout';
  if (source.includes('awareness')) return 'Reach and category visibility';
  if (source.includes('engagement') || source.includes('social proof')) return 'Community traction and trust';
  if (source.includes('market') || source.includes('audience')) return 'Expansion into new segments';
  if (source.includes('retention')) return 'Repeat attention and brand recall';

  return trimWords(card.body || card.title, 6);
}

function cleanText(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function buildMetaDescription(service) {
  const raw = service.hero_subheading || stripHtml(service.what_we_do || '');
  return raw.replace(/\s+/g, ' ').trim().slice(0, 180);
}

function stripHtml(html) {
  const temp = document.createElement('div');
  temp.innerHTML = html;
  return temp.textContent || temp.innerText || '';
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function toggleText(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  if (value && value.trim()) {
    el.textContent = value;
    el.style.display = '';
  } else {
    el.style.display = 'none';
  }
}

function setSectionHtml(sectionId, contentId, value) {
  const section = document.getElementById(sectionId);
  const content = document.getElementById(contentId);
  if (!content) return;

  if (value && value.trim()) {
    content.innerHTML = value;
    if (section) section.style.display = '';
    return;
  }

  content.innerHTML = '';
  if (section) section.style.display = 'none';
}

function renderServiceError() {
  setText('serviceHeroTitle', 'Service page unavailable');
  toggleText('serviceHeroSubheading', 'The requested service content could not be loaded.');
  setText('serviceHeroVisualTitle', 'Service page unavailable');
  setText('serviceHeroVisualBody', 'Please try again later.');
  setText('serviceHeroVisualStatValue', '0');
  setText('serviceHeroVisualStatLabel', 'Unavailable');

  renderHeroStats([
    { value: '0', label: 'Core Steps' },
    { value: '0', label: 'Coverage' },
    { value: '0', label: 'Strategic Edges' }
  ]);

  renderWhatWeDo('<p>Please try again later.</p>', ['Live content could not be loaded.'], [
    { value: '0', label: 'Core Steps' },
    { value: '0', label: 'Coverage' },
    { value: '0', label: 'Strategic Edges' },
    { value: '0', label: 'Execution Model' }
  ]);

  renderHowWeDoIt([], '<p>Please try again later.</p>');
  renderWhatMakesUsDifferent([], '<p>Please try again later.</p>');

  const useCasesSection = document.getElementById('serviceUseCasesSection');
  if (useCasesSection) useCasesSection.style.display = 'none';

  const caseStudiesGrid = document.getElementById('serviceCaseStudiesGrid');
  if (caseStudiesGrid) {
    caseStudiesGrid.innerHTML = `<div class="service-placeholder-card">Unable to load case studies right now.</div>`;
  }

  const faqList = document.getElementById('serviceFaqList');
  if (faqList) {
    faqList.innerHTML = `
      <div class="faq-item open" role="listitem">
        <button class="faq-item__trigger" aria-expanded="true">
          <span class="faq-item__question">Why is this service page unavailable?</span>
          <svg class="faq-item__chevron" viewBox="0 0 12 8" fill="none" aria-hidden="true">
            <path d="M1 1l5 5 5-5" stroke="#F5A623" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
        <div class="faq-item__answer">
          <div class="faq-item__answer-inner">The live service content could not be loaded from the API. Please try again later or contact the team directly.</div>
        </div>
      </div>
    `;
  }

  setText('serviceCtaTitle', 'Talk to the team');
  toggleText('serviceCtaSubtitle', 'We can still help you map the right service mix.');
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
