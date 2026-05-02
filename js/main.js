/* ═══════════════════════════════════════════════════════════
   WeSocializeU — Main JavaScript
═══════════════════════════════════════════════════════════ */

'use strict';

// ── Utilities ─────────────────────────────────────────────
function qs(sel, root = document) { return root.querySelector(sel); }
function qsa(sel, root = document) { return [...root.querySelectorAll(sel)]; }

function showToast(msg, type = '') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.className = 'toast' + (type ? ` toast--${type}` : '');
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3200);
}

// ── Navbar ────────────────────────────────────────────────
(function initNavbar() {
  const navbar = qs('.navbar');
  const hamburger = qs('.navbar__hamburger');
  const mobileMenu = qs('.navbar__mobile-menu');

  if (!navbar) return;

  // Scroll shadow
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 10);
  }, { passive: true });

  function closeMobileMenu() {
    if (!hamburger || !mobileMenu) return;
    hamburger.classList.remove('open');
    mobileMenu.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('nav-open');
  }

  // Hamburger
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      const isOpen = mobileMenu.classList.toggle('open');
      hamburger.classList.toggle('open', isOpen);
      hamburger.setAttribute('aria-expanded', String(isOpen));
      document.body.classList.toggle('nav-open', isOpen);
    });
    // Close on link click
    qsa('.navbar__mobile-link[href]').forEach(link => {
      link.addEventListener('click', () => {
        closeMobileMenu();
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMobileMenu();
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 768) closeMobileMenu();
    });
  }

  // ── Services Mega Dropdown (desktop) ──────────────────────
  const dropdownWrap = qs('.navbar__dropdown-wrap');
  const dropdownBtn  = qs('#servicesDropdownBtn');
  const dropdown     = qs('#servicesDropdown');

  if (dropdownWrap && dropdownBtn && dropdown) {
    let closeTimer = null;

    function openDropdown() {
      clearTimeout(closeTimer);
      dropdownWrap.classList.add('open');
      dropdownBtn.setAttribute('aria-expanded', 'true');
    }

    function closeDropdown(delay = 0) {
      clearTimeout(closeTimer);
      if (delay === 0) {
        dropdownWrap.classList.remove('open');
        dropdownBtn.setAttribute('aria-expanded', 'false');
      } else {
        closeTimer = setTimeout(() => {
          dropdownWrap.classList.remove('open');
          dropdownBtn.setAttribute('aria-expanded', 'false');
        }, delay);
      }
    }

    // ── Hover: open on mouseenter, close on mouseleave (with delay)
    // The delay prevents flickering if the mouse briefly leaves the wrap
    dropdownWrap.addEventListener('mouseenter', () => openDropdown());
    dropdownWrap.addEventListener('mouseleave', () => closeDropdown(200));

    // ── Click: toggle for keyboard/touch users
    dropdownBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (dropdownWrap.classList.contains('open')) {
        closeDropdown(0);
      } else {
        openDropdown();
      }
    });

    // ── Close when clicking outside
    document.addEventListener('click', (e) => {
      if (!dropdownWrap.contains(e.target)) closeDropdown(0);
    });

    // ── Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeDropdown(0);
        dropdownBtn.focus();
      }
    });

    // ── Close when a dropdown item or CTA is clicked
    qsa('.navbar__dropdown-item, .navbar__dropdown-cta').forEach(item => {
      item.addEventListener('click', () => closeDropdown(0));
    });
  }

  // ── Mobile Services Accordion ──────────────────────────────
  const mobileServicesBtn  = qs('#mobileServicesBtn');
  const mobileServicesMenu = qs('#mobileServicesMenu');

  if (mobileServicesBtn && mobileServicesMenu) {
    mobileServicesBtn.addEventListener('click', () => {
      const isOpen = mobileServicesMenu.classList.toggle('open');
      mobileServicesBtn.classList.toggle('open', isOpen);
      mobileServicesBtn.setAttribute('aria-expanded', isOpen);
    });

    // Close mobile menu when a service link is tapped
    qsa('.navbar__mobile-service-link').forEach(link => {
      link.addEventListener('click', () => {
        closeMobileMenu();
        mobileServicesMenu.classList.remove('open');
        mobileServicesBtn.classList.remove('open');
        mobileServicesBtn.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // Active link highlight
  const links = qsa('.navbar__link');
  const currentPath = window.location.pathname;
  links.forEach(link => {
    const href = link.getAttribute('href');
    if (!href) return;
    const isHome = (href === '/' || href === '/index.html') && (currentPath === '/' || currentPath === '/index.html');
    const isOther = href !== '/' && href !== '/index.html' && currentPath.includes(href);
    if (isHome || isOther) link.classList.add('active');
  });
})();

// ── Scroll Animations ─────────────────────────────────────
(function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  qsa('.animate-in').forEach(el => observer.observe(el));
})();

// ── Scroll-to-top ─────────────────────────────────────────
(function initScrollTop() {
  const btn = qs('.scroll-top');
  if (!btn) return;
  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 400);
  }, { passive: true });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
})();

// ── Services chip selector ────────────────────────────────
(function initChips() {
  const chips = qsa('.services-chip');
  chips.forEach(chip => {
    chip.addEventListener('click', () => chip.classList.toggle('selected'));
  });
})();

// ── Contact Form ──────────────────────────────────────────
(function initContactForm() {
  const form = qs('#contactForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('.contact-form__submit');
    const successEl = form.querySelector('.contact-form__success');
    const originalText = btn.textContent;

    // Collect selected services
    const selectedServices = qsa('.services-chip.selected').map(c => c.dataset.service).join(', ');

    const payload = {
      name:    form.querySelector('#lead_name').value.trim(),
      email:   form.querySelector('#lead_email').value.trim(),
      phone:   form.querySelector('#lead_phone').value.trim(),
      audience_type: form.querySelector('#meeting_audience_type')?.value || '',
      service: selectedServices || form.querySelector('#lead_service')?.value || '',
      message: '',
      _gotcha: form.querySelector('[name="_gotcha"]')?.value || ''
    };

    if (!payload.name || !payload.email) {
      showToast('Please fill in your name and email.', 'error');
      return;
    }

    if (!payload.audience_type) {
      showToast('Please select whether you are a creator or a brand.', 'error');
      return;
    }

    btn.textContent = 'Sending…';
    btn.disabled = true;

    try {
      const res = await fetch('/api/schedule-meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        form.style.display = 'none';
        if (successEl) successEl.style.display = 'block';
        showToast('Thank you! We\'ll be in touch within 24 hours.', 'success');
      } else {
        const err = await res.json();
        showToast(err.error || 'Submission failed. Please try again.', 'error');
        btn.textContent = originalText;
        btn.disabled = false;
      }
    } catch {
      showToast('Network error. Please try again.', 'error');
      btn.textContent = originalText;
      btn.disabled = false;
    }
  });
})();

// ── FAQ Accordion ─────────────────────────────────────────
(function initFAQ() {
  const items = qsa('.faq-item');
  items.forEach(item => {
    const trigger = item.querySelector('.faq-item__trigger');
    if (!trigger) return;
    trigger.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      // Close all others
      items.forEach(i => i.classList.remove('open'));
      if (!isOpen) item.classList.add('open');
    });
  });
})();

// ── Testimonials Tabs ─────────────────────────────────────
(function initTestimonials() {
  const tabs = qsa('.testimonial-tab');
  const panels = qsa('.testimonial-panel');

  if (!tabs.length) return;

  function activate(index) {
    tabs.forEach((t, i) => t.classList.toggle('active', i === index));
    panels.forEach((p, i) => {
      p.style.display = i === index ? 'block' : 'none';
      if (i === index) {
        p.style.animation = 'fadeIn 0.35s ease forwards';
      }
    });
  }

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => activate(i));
  });

  activate(0);

  // Auto-rotate
  let current = 0;
  const autoPlay = setInterval(() => {
    current = (current + 1) % tabs.length;
    activate(current);
  }, 6000);
  tabs.forEach(tab => tab.addEventListener('click', () => clearInterval(autoPlay)));
})();

// ── Number counter animation ──────────────────────────────
(function initCounters() {
  const counters = qsa('[data-count]');
  if (!counters.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseFloat(el.dataset.count);
      const suffix = el.dataset.suffix || '';
      const prefix = el.dataset.prefix || '';
      const duration = 1800;
      const start = performance.now();
      const isDecimal = String(target).includes('.');

      function update(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3); // ease-out cubic
        const value = target * ease;
        el.textContent = prefix + (isDecimal ? value.toFixed(1) : Math.round(value)) + suffix;
        if (progress < 1) requestAnimationFrame(update);
      }
      requestAnimationFrame(update);
      observer.unobserve(el);
    });
  }, { threshold: 0.3 });

  counters.forEach(el => observer.observe(el));
})();

// ── Smooth scroll for anchor links ───────────────────────
document.addEventListener('click', e => {
  const link = e.target.closest('a[href^="#"]');
  if (!link) return;
  const id = link.getAttribute('href').slice(1);
  const target = document.getElementById(id);
  if (target) {
    e.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
});

// ── Dynamic Blogs ──────────────────────────────────────────
(async function loadAndRenderBlogs() {
  try {
    const res = await fetch('/api/blogs');
    if (!res.ok) return;
    const blogs = await res.json();

    // take first 6 by order_idx
    const top6 = blogs.slice(0, 6);
    if (!top6.length) return;

    const gridTop = document.getElementById('blogsGridTop');
    const row2    = document.getElementById('blogsRow2');
    const escH = s => (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

    // Row 1: first card is featured (spans 2 rows), next 2 are small
    if (gridTop) {
      const [feat, sm1, sm2] = top6;
      let html = '';
      if (feat) {
        html += `
          <div class="blog-card blog-card--featured" style="grid-row:1/3">
            ${feat.image_url ? `<img class="blog-card__img" src="${escH(feat.image_url)}" alt="${escH(feat.title)}" loading="lazy">` : ''}
            <div class="blog-card__gradient"></div>
            <div class="blog-card__content">
              <h3 class="blog-card__title">${escH(feat.title)}</h3>
              <div class="blog-card__meta">
                <a href="/blog.html?id=${feat.id}" class="blog-card__read">Read More
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="12"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
                </a>
                <span class="blog-card__date">${escH(feat.date_text || '')}</span>
              </div>
            </div>
          </div>`;
      }
      for (const sm of [sm1, sm2].filter(Boolean)) {
        html += `
          <div class="blog-card blog-card--sm">
            ${sm.image_url ? `<img class="blog-card__img" src="${escH(sm.image_url)}" alt="${escH(sm.title)}" loading="lazy">` : ''}
            <div class="blog-card__gradient"></div>
            <div class="blog-card__content blog-card__content--sm">
              <h3 class="blog-card__title blog-card__title--sm">${escH(sm.title)}</h3>
              <a href="/blog.html?id=${sm.id}" class="blog-card__read" style="font-size:11px">Read
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="10"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
              </a>
            </div>
          </div>`;
      }
      gridTop.innerHTML = html;
    }

    // Row 2: cards 4-6
    if (row2) {
      const bottom = top6.slice(3);
      const escH = s => (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
      row2.innerHTML = bottom.map(b => `
        <div class="blog-card blog-card--small">
          ${b.image_url ? `<img class="blog-card__img" src="${escH(b.image_url)}" alt="${escH(b.title)}" loading="lazy">` : ''}
          <div class="blog-card__gradient"></div>
          <div class="blog-card__content" style="gap:12px">
            <h3 class="blog-card__title blog-card__title--small">${escH(b.title)}</h3>
            ${b.excerpt ? `<p class="blog-card__excerpt">${escH(b.excerpt)}</p>` : ''}
            <a href="/blog.html?id=${b.id}" class="blog-card__read" style="font-size:14px">Read →
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="12"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
            </a>
          </div>
        </div>`).join('');
    }

    if (blogs.length > 6) { const cta = document.getElementById('blogsCtaRow'); if(cta) cta.style.display=''; }

  } catch(e) { console.error('Blog load error:', e); }
})();

// ── Dynamic Case Studies Image Grid ───────────────────────
(async function loadAndRenderCaseStudies() {
  try {
    const res = await fetch('/api/case-studies');
    if (!res.ok) return;
    const items = await res.json();
    const top5 = items.slice(0, 5);
    if (!top5.length) return;

    const container = document.getElementById('caseStudiesImageGrid');
    if (!container) return;

    const escH = s => (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

    // Layout: row1 = 3 equal columns; row2 = wide left (2/3) + small right (1/3)
    // Slots 1-3 → top row; Slot 4 → bottom-wide (2col); Slot 5 → bottom-small
    const [s1, s2, s3, s4, s5] = top5;

    const cardImg = (item) => item.image_url
      ? `<img src="${escH(item.image_url)}" alt="${escH(item.title)}" loading="lazy" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;">`
      : '';

    const overlay = `<div style="position:absolute;inset:0;background:linear-gradient(180deg,transparent 40%,rgba(0,0,0,0.75) 100%);"></div>`;

    const titleBar = (item) => `
      <div style="position:absolute;bottom:0;left:0;right:0;padding:20px;color:#fff;z-index:2;">
        <p style="font-size:14px;font-weight:600;line-height:1.4;margin:0;text-shadow:0 1px 4px rgba(0,0,0,0.6);">${escH(item.title)}</p>
      </div>`;

    let html = `<div style="display:grid;grid-template-columns:1fr 1fr 1fr;grid-template-rows:260px 300px;gap:16px;max-width:1136px;margin-inline:auto;">`;

    if (s1) html += `<a href="/case-study.html?id=${s1.id}" style="grid-column:1;grid-row:1;position:relative;border-radius:16px;overflow:hidden;display:block;background:#1E293B;">${cardImg(s1)}${overlay}${titleBar(s1)}</a>`;
    if (s2) html += `<a href="/case-study.html?id=${s2.id}" style="grid-column:2;grid-row:1;position:relative;border-radius:16px;overflow:hidden;display:block;background:#1E293B;">${cardImg(s2)}${overlay}${titleBar(s2)}</a>`;
    if (s3) html += `<a href="/case-study.html?id=${s3.id}" style="grid-column:3;grid-row:1;position:relative;border-radius:16px;overflow:hidden;display:block;background:#1E293B;">${cardImg(s3)}${overlay}${titleBar(s3)}</a>`;
    if (s4) html += `<a href="/case-study.html?id=${s4.id}" style="grid-column:1/3;grid-row:2;position:relative;border-radius:16px;overflow:hidden;display:block;background:#1E293B;">${cardImg(s4)}${overlay}${titleBar(s4)}</a>`;
    if (s5) html += `<a href="/case-study.html?id=${s5.id}" style="grid-column:3;grid-row:2;position:relative;border-radius:16px;overflow:hidden;display:block;background:#1E293B;">${cardImg(s5)}${overlay}${titleBar(s5)}</a>`;

    html += `</div>`;
    container.innerHTML = html;

  } catch(e) { console.error('Case study load error:', e); }
})();
