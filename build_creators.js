const fs = require('fs');
const path = require('path');

try {
  let html = fs.readFileSync(path.join(__dirname, 'services.html'), 'utf-8');

  // Replace Title/Meta
  html = html.replace(/<title>.*?<\/title>/, '<title>Our Top Creators & Influencers — WeSocializeU</title>');
  html = html.replace(/<meta name="description" content=".*?">/, `<meta name="description" content="Discover WeSocializeU's robust network of top-tier creators. From micro-influencers to celebrity names, find the perfect voice for your brand.">`);

  // Replace Header
  html = html.replace(/<h1 class="page-header__title">.*?<\/h1>/, '<h1 class="page-header__title">Our Premium Creator Network</h1>');
  html = html.replace(/<span class="current">.*?<\/span>/, '<span class="current">Creators</span>');

  // Replace navbar active links - the user's `generate_service_pages.js` script changed them statically. 
  // We need to set the creators link as active if wanted, but `services.html` doesn't have an active link.
  
  // Replace the service details section with our new creators grid
  const creatorsSection = `
<!-- ═══ CREATORS GRID ══════════════════════════════════════ -->
<section class="creators-section section section--bg-light" style="padding-top: 0;">
  <div class="container" id="creatorsContainer">
      <div class="ugc-loading">Loading Premium Creators...</div>
  </div>
</section>

<style>
.creator-card-img-wrap {
  width: 140px; height: 140px; border-radius: 50%; overflow: hidden; border: 3px solid var(--clr-amber); margin-bottom: 1.5rem; transition: transform 0.3s ease;
}
.ugc-card:hover .creator-card-img-wrap {
  transform: scale(1.05);
}
</style>

<script>
  async function loadCreators() {
    try {
      const res = await fetch('/api/public/creators');
      const creators = await res.json();
      const container = document.getElementById('creatorsContainer');
      
      if (!creators || !creators.length) {
        container.innerHTML = '<div class="ugc-empty">More premium creators coming soon.</div>';
        return;
      }

      const grouped = creators.reduce((acc, curr) => {
        if (!acc[curr.category]) acc[curr.category] = [];
        acc[curr.category].push(curr);
        return acc;
      }, {});

      let html = '';
      for (const [category, list] of Object.entries(grouped)) {
        html += \`
          <div style="margin-top: 3rem; margin-bottom: 2rem;">
            <h2 style="font-size: 2rem; color: var(--clr-text); border-bottom: 2px solid var(--clr-amber); display: inline-block; padding-bottom: 0.5rem; margin-bottom: 2rem;">
              \${escapeHtml(category)}
            </h2>
            <div class="ugc-grid">
              \${list.map(c => \`
                <div class="ugc-card" style="box-shadow: var(--shadow-sm); display: flex; flex-direction: column;">
                  <div class="ugc-card__media" style="padding: 2.5rem 1.5rem; background: #fff; display:flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;">
                    <div class="creator-card-img-wrap">
                      \${c.image_url 
                        ? \`<img src="\${escapeHtml(c.image_url)}" alt="\${escapeHtml(c.name)}" style="width:100%; height:100%; object-fit:cover;">\` 
                        : \`<div style="width:100%; height:100%; background:var(--clr-bg-alt); display:flex; align-items:center; justify-content:center; color:var(--clr-text-muted);">No Image</div>\`
                      }
                    </div>
                    <h3 style="font-size: 1.35rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--clr-text);">\${escapeHtml(c.name)}</h3>
                    <div style="color: var(--clr-amber); font-weight: 600; font-size: 0.95rem; margin-bottom: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px;">
                      \${escapeHtml(c.platform)}
                    </div>
                    <div style="background: rgba(245, 166, 35, 0.1); padding: 0.35rem 1rem; border-radius: 20px; font-size: 0.85rem; font-weight: 500; color: var(--clr-text);">
                      \${escapeHtml(c.followers || '0')} Followers
                    </div>
                  </div>
                  \${c.profile_url ? \`
                  <div style="padding: 1rem; background: #fff; border-top: 1px solid var(--clr-border);">
                    <a href="\${escapeHtml(c.profile_url)}" target="_blank" rel="noopener noreferrer" class="btn-primary" style="width:100%; text-align:center; padding: 0.6rem; font-size: 0.95rem;">View Profile</a>
                  </div>
                  \` : ''}
                </div>
              \`).join('')}
            </div>
          </div>
        \`;
      }
      container.innerHTML = html;
    } catch(err) {
      document.getElementById('creatorsContainer').innerHTML = '<div class="ugc-error">Could not load creators.</div>';
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

  document.addEventListener('DOMContentLoaded', loadCreators);
</script>
`;

  // Remove the old ALL SERVICES content body
  html = html.replace(/<!-- ═══ SERVICE DETAILS ══════════════════════════════════════ -->[\s\S]*?<script>[\s\S]*?<\/script>/, creatorsSection);

  fs.writeFileSync(path.join(__dirname, 'creators.html'), html, 'utf-8');
  console.log('Successfully created creators.html');
} catch(e) {
  console.error("Failed to build creators.html", e);
}
