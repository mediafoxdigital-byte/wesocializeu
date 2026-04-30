const fs = require('fs');

let code = fs.readFileSync('generate_service_pages.js', 'utf8');

const oldCta = `<!-- ═══ CTA ══════════════════════════════════════════════ -->
<section class="service-cta" id="cta-banner" aria-label="Call to action">
  <div class="service-cta__watermark">WSU</div>
  <div class="service-cta__content">
    <h2 class="service-cta__title" id="serviceCtaTitle">${'${escapeHtml(service.cta || \'\')}'}</h2>
    <p class="service-cta__subtitle" id="serviceCtaSubtitle"${'${service.hero_subheading ? \'\' : \' style="display:none;"\'}'}>${'${escapeHtml(service.hero_subheading || \'\')}'}</p>
    <div class="service-cta__actions">
      <a href="/join-as-brand.html" class="service-btn service-btn--primary service-btn--large">Book Free Strategy Call</a>
    </div>
  </div>
</section>`;

const newCta = `<!-- ═══ CTA ══════════════════════════════════════════════ -->
<section class="service-custom-cta" style="background-color: #1f5f5c; border-radius: 20px; margin: 6rem auto; max-width: 1200px; padding: 4rem; position: relative; overflow: hidden; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 3rem;">
  <!-- Wave SVG background -->
  <svg style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0.1; pointer-events: none; z-index: 1;" viewBox="0 0 1200 400" preserveAspectRatio="none">
    <path d="M0,100 C300,200 600,0 1200,100" stroke="#ffffff" stroke-width="2" fill="none" />
    <path d="M0,150 C300,250 600,50 1200,150" stroke="#ffffff" stroke-width="2" fill="none" />
    <path d="M0,200 C300,300 600,100 1200,200" stroke="#ffffff" stroke-width="2" fill="none" />
    <path d="M0,250 C300,350 600,150 1200,250" stroke="#ffffff" stroke-width="2" fill="none" />
    <path d="M0,300 C300,400 600,200 1200,300" stroke="#ffffff" stroke-width="2" fill="none" />
    <path d="M0,350 C300,450 600,250 1200,350" stroke="#ffffff" stroke-width="2" fill="none" />
  </svg>
  
  <div style="flex: 1; min-width: 300px; z-index: 2; display: flex; justify-content: center; align-items: center;">
    <div style="width: 250px; height: 250px; background: rgba(255,255,255,0.05); border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 20px 40px rgba(0,0,0,0.2);">
       <svg width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="#d4ff00" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
         <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
         <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
       </svg>
    </div>
  </div>

  <div style="flex: 2; min-width: 300px; z-index: 2;">
    <h2 style="font-size: clamp(2rem, 4vw, 3rem); font-weight: 800; color: #ffffff; margin-bottom: 1.5rem; line-height: 1.2;">
      Accelerate Your Brand Growth with WeSocializeU
    </h2>
    <p style="font-size: 1.125rem; color: #e2e8f0; margin-bottom: 2.5rem; max-width: 650px; line-height: 1.6;">
      Turn attention into demand and campaigns into revenue. Partner with us to get insights on influencer-led strategies, targeted content production, and proven growth tactics.
    </p>
    
    <div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
      <a href="/join-as-brand.html" style="background-color: #d4ff00; color: #0f172a; padding: 1.2rem 2.5rem; border-radius: 99px; font-weight: 700; text-decoration: none; display: inline-flex; align-items: center; gap: 8px; transition: all 0.3s ease; box-shadow: 0 4px 14px rgba(212, 255, 0, 0.3);" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(212, 255, 0, 0.4)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 14px rgba(212, 255, 0, 0.3)';">
        Join As Brand
      </a>
      <a href="/join-as-creator.html" style="background-color: transparent; color: #ffffff; padding: 1.2rem 2.5rem; border-radius: 99px; font-weight: 600; text-decoration: none; border: 2px solid rgba(255,255,255,0.4); display: inline-flex; align-items: center; gap: 8px; transition: all 0.3s ease;" onmouseover="this.style.borderColor='#ffffff'; this.style.backgroundColor='rgba(255,255,255,0.05)';" onmouseout="this.style.borderColor='rgba(255,255,255,0.4)'; this.style.backgroundColor='transparent';">
        Join As Creator
      </a>
    </div>
  </div>
</section>`;

if (code.includes('id="cta-banner"')) {
    code = code.replace(/<!-- ═══ CTA ══════════════════════════════════════════════ -->[\s\S]*?<\/section>/g, newCta);
    fs.writeFileSync('generate_service_pages.js', code, 'utf8');
    console.log('CTA patched successfully');
} else {
    console.log('Could not find CTA to patch');
}

