const fs = require('fs');
let html = fs.readFileSync('admin/dashboard.html', 'utf8');

// We replace the "How We Do It Image" section with a dynamic steps editor.
const oldSection = `<div style="margin-bottom:18px; padding:16px; border-radius:14px; border:1px solid var(--clr-border); background:var(--clr-bg);">
        <label class="adm-label" style="margin-bottom:12px; font-weight:600; font-size:15px; display:flex; align-items:center; gap:6px;">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7h2l2-3h10l2 3h2v13H3V7zm9 10a4 4 0 100-8 4 4 0 000 8z"/></svg>
          How We Do It Image
        </label>
        <p style="margin:0 0 14px; font-size:13px; line-height:1.6; color:#64748b;">
          Upload one image for the right-side visual in the How We Do It section. Uploading a new image replaces the existing one.
        </p>
        <div style="position:relative; width:100%; margin-bottom:14px;">
          <input type="file" class="adm-input" id="serviceHowImageFile" accept="image/*" style="background:#fff; padding-right:108px;">
          <button type="button" class="adm-btn-primary" id="serviceHowImageUploadBtn" onclick="uploadServiceHowImage()" style="position:absolute; right:4px; top:4px; bottom:4px; min-width:98px; padding:0 16px;">Upload</button>
        </div>
        <div id="serviceHowImagePreview"></div>
      </div>`;

const newSection = `<div style="margin-bottom:18px; padding:16px; border-radius:14px; border:1px solid var(--clr-border); background:var(--clr-bg);">
        <label class="adm-label" style="margin-bottom:12px; font-weight:600; font-size:15px; display:flex; align-items:center; gap:6px;">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7h2l2-3h10l2 3h2v13H3V7zm9 10a4 4 0 100-8 4 4 0 000 8z"/></svg>
          How We Do It Steps & Images
        </label>
        <p style="margin:0 0 14px; font-size:13px; line-height:1.6; color:#64748b;">
          Each step text button can have its own image (max 1 image per step). You can edit the text and upload the image below.
        </p>
        <div id="serviceHowStepsContainer"></div>
      </div>`;

if (html.includes('How We Do It Image')) {
    html = html.replace(oldSection, newSection);
    fs.writeFileSync('admin/dashboard.html', html, 'utf8');
} else {
    console.log("Could not find How We Do It Image section in dashboard");
}

let js = fs.readFileSync('js/admin.js', 'utf8');

// Parse the steps when opening the modal
const parseStepsCode = `
  currentServiceHowSteps = [];
  if (service.how_we_do_it) {
    const temp = document.createElement('div');
    temp.innerHTML = service.how_we_do_it;
    const blocks = Array.from(temp.querySelectorAll('.service-step'));
    if (blocks.length) {
      currentServiceHowSteps = blocks.map((block, index) => {
        const title = block.querySelector('h3')?.textContent || \`Step \${index + 1}\`;
        const description = block.querySelector('p')?.textContent || '';
        const image = block.querySelector('img')?.getAttribute('src') || '';
        return { title, description, image };
      });
    }
  }
  renderServiceHowSteps();
`;

js = js.replace(/currentServiceHowHtml = service\.how_we_do_it \|\| '';\n  currentServiceHowImageUrl = service\.how_image_url \|\| '';/, parseStepsCode);

// Add state and render functions for steps
const newFunctions = `
let currentServiceHowSteps = [];

window.renderServiceHowSteps = function() {
  const container = document.getElementById('serviceHowStepsContainer');
  if (!container) return;

  if (!currentServiceHowSteps.length) {
    container.innerHTML = '<p style="color:#94a3b8;font-size:13px;text-align:center;">No steps found. The default content will be shown if left empty.</p>';
    return;
  }

  container.innerHTML = currentServiceHowSteps.map((step, index) => \`
    <div style="border:1px solid #e2e8f0; padding:12px; border-radius:8px; margin-bottom:12px; background:#f8fafc;">
      <div style="margin-bottom:8px;">
        <label class="adm-label" style="font-size:12px;">Step Title</label>
        <input type="text" class="adm-input step-title-input" value="\${escapeHtml(step.title)}" data-index="\${index}">
      </div>
      <div style="margin-bottom:8px;">
        <label class="adm-label" style="font-size:12px;">Step Description</label>
        <textarea class="adm-input step-desc-input" style="min-height:60px;" data-index="\${index}">\${escapeHtml(step.description)}</textarea>
      </div>
      <div>
        <label class="adm-label" style="font-size:12px;">Step Image (Limit 1)</label>
        \${step.image ? 
          \`<div style="display:flex;align-items:center;gap:12px;margin-top:4px;">
            <img src="\${escapeHtml(step.image)}" style="height:60px; border-radius:6px; object-fit:cover; border:1px solid #cbd5e1;">
            <button type="button" class="adm-btn-danger" style="padding:4px 8px; font-size:12px;" onclick="removeStepImage(\${index})">Remove Image</button>
           </div>\`
          :
          \`<div style="display:flex; gap:8px; align-items:center;">
             <input type="file" id="stepImageFile_\${index}" accept="image/*" class="adm-input" style="padding:4px; font-size:12px; background:#fff; flex:1;">
             <button type="button" class="adm-btn-primary" style="padding:4px 12px; font-size:12px; height:auto;" onclick="uploadStepImage(\${index})">Upload</button>
           </div>\`
        }
      </div>
    </div>
  \`).join('');

  // Bind events
  container.querySelectorAll('.step-title-input').forEach(input => {
    input.addEventListener('change', (e) => {
      currentServiceHowSteps[e.target.dataset.index].title = e.target.value;
    });
  });
  container.querySelectorAll('.step-desc-input').forEach(input => {
    input.addEventListener('change', (e) => {
      currentServiceHowSteps[e.target.dataset.index].description = e.target.value;
    });
  });
};

window.uploadStepImage = async function(index) {
  const fileInput = document.getElementById(\`stepImageFile_\${index}\`);
  if (!fileInput || !fileInput.files[0]) {
    showToast('Please select an image first', 'error');
    return;
  }

  const formData = new FormData();
  formData.append('image', fileInput.files[0]);

  try {
    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    const data = await res.json();
    if (data.success && data.url) {
      currentServiceHowSteps[index].image = data.url;
      renderServiceHowSteps();
      showToast('Step image uploaded', 'success');
    } else {
      showToast(data.error || 'Upload failed', 'error');
    }
  } catch (err) {
    showToast('Upload failed', 'error');
  }
};

window.removeStepImage = function(index) {
  currentServiceHowSteps[index].image = '';
  renderServiceHowSteps();
};
\n`;

// Insert the new functions before window.renderServiceHowImage (we can remove the old ones or just add these)
js = js.replace(/window\.renderServiceHowImage = function\(\) \{/, newFunctions + "\nwindow.renderServiceHowImage = function() {");

// Update how_we_do_it when saving
const saveCode = `
    const builtHowHtml = currentServiceHowSteps.map(step => 
      \`<div class="service-step"><h3>\${escapeHtml(step.title)}</h3>\${step.description ? \`<p>\${escapeHtml(step.description)}</p>\` : ''}\${step.image ? \`<img src="\${escapeHtml(step.image)}" style="display:none;">\` : ''}</div>\`
    ).join('');
    how_we_do_it: builtHowHtml,
`;
js = js.replace(/how_we_do_it: currentServiceHowHtml,/, saveCode);

fs.writeFileSync('js/admin.js', js, 'utf8');
