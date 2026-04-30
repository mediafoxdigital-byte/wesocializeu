const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const navStart = html.indexOf('<!-- ═══ NAVBAR');
const navEnd = html.indexOf('</nav>') + 6;
const footerStart = html.indexOf('<!-- ═══ FOOTER');
const endOfFile = html.length;

const headAndNav = html.substring(0, navEnd);
const footer = html.substring(footerStart, endOfFile);

const ugcContent = `
<!-- ═══ PAGE HEADER ════════════════════════════════════════ -->
<section class="page-header section" aria-label="Page header">
  <div class="container">
    <div class="page-header__inner">
      <div class="page-header__top">
        <h1 class="page-header__title">Get Viral Videos for your Brand</h1>
      </div>
      <div class="page-header__breadcrumbs">
        <span>Home</span> <span class="sep">/</span> <span class="current">Get Viral Videos for your Brand</span>
      </div>
    </div>
  </div>
</section>

<!-- ═══ UGC VIDEOS GRID ══════════════════════════════════════ -->
<section class="ugc-section section section--bg-light" style="padding-top: 0;">
  <div class="container">
    <div class="ugc-grid" id="ugcVideosGrid">
        <div class="ugc-loading">Loading Premium Videos...</div>
    </div>
  </div>
</section>

<script>
  async function loadUgcVideos() {
    try {
      const res = await fetch('/api/public/videos');
      const videos = await res.json();
      const grid = document.getElementById('ugcVideosGrid');
      
      if (!videos || !videos.length) {
        grid.innerHTML = '<div class="ugc-empty">More premium videos coming soon.</div>';
        return;
      }
      
      grid.innerHTML = videos.map(v => \`
        <div class="ugc-card">
          <div class="ugc-card__media">
            <div class="ugc-card__badge">\${escapeHtml(v.badge || 'PRO')}</div>
            <div class="ugc-card__stats">
               <span class="ugc-stat">💬 \${v.comments_count || 0}</span>
               <span class="ugc-stat">❤️ \${v.likes_count || 0}</span>
            </div>
            \${v.thumbnail_url 
              ? \`<img src="\${escapeHtml(v.thumbnail_url)}" alt="\${escapeHtml(v.title)}" class="ugc-card__img" loading="lazy">\` 
              : \`<div class="ugc-card__img-placeholder" style="width:100%;height:100%;background:#1E293B;"></div>\`
            }
            \${v.video_url ? \`
            <a href="\${escapeHtml(v.video_url)}" target="_blank" rel="noopener noreferrer" class="ugc-card__play">
              <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M8 5v14l11-7z"/></svg>
            </a>
            \` : ''}
          </div>
          <div class="ugc-card__body">
            <h3 class="ugc-card__title">\${escapeHtml(v.title)}</h3>
            <div class="ugc-card__category">\${escapeHtml(v.category || 'UGC')}</div>
            <div class="ugc-card__actions">
              <a href="\${v.visit_url ? escapeHtml(v.visit_url) : '/#contact-form'}" class="btn-primary ugc-card__btn" \${v.visit_url ? 'target="_blank" rel="noopener noreferrer"' : ''}>Visit Now</a>
            </div>
          </div>
        </div>
      \`).join('');
    } catch(err) {
      document.getElementById('ugcVideosGrid').innerHTML = '<div class="ugc-error">Could not load videos.</div>';
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"'\`=\\/]/g, function (s) {
      return {
        '&': '&amp;', '<': '&lt;', '>': '&gt;',
        '"': '&quot;', "'": '&#39;', '/': '&#x2F;', '\`': '&#x60;', '=': '&#x3D;'
      }[s];
    });
  }

  document.addEventListener('DOMContentLoaded', loadUgcVideos);
</script>
`;

// Also replace `<title>` and remove active class from home
let finalHtml = headAndNav.replace('<title>WeSocializeU — Influencer Marketing & UGC Agency</title>', '<title>Viral UGC Videos — WeSocializeU</title>');
finalHtml = finalHtml.replace('class="navbar__link active"', 'class="navbar__link"');
// mark ugc videos active
finalHtml = finalHtml.replace('<a href="#ugc-videos" class="navbar__link" role="listitem">UGC Videos</a>', '<a href="/ugc-videos.html" class="navbar__link active" role="listitem">UGC Videos</a>');
// fix all anchor links pointing to home # anchors
finalHtml = finalHtml.replace(/href="#services"/g, 'href="/#services"');
finalHtml = finalHtml.replace(/href="#creators"/g, 'href="/#creators"');
finalHtml = finalHtml.replace(/href="#join-brand"/g, 'href="/#join-brand"');
finalHtml = finalHtml.replace(/href="#join-creator"/g, 'href="/#join-creator"');
finalHtml = finalHtml.replace(/href="#contact-form"/g, 'href="/#contact-form"');

fs.writeFileSync('ugc-videos.html', finalHtml + ugcContent + footer);
console.log('Done creating ugc-videos.html');
