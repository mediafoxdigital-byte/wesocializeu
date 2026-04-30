const fs = require('fs');

let html = fs.readFileSync('admin/dashboard.html', 'utf8');

// Replace the entire serviceModal block
const startModal = html.indexOf('<div class="adm-modal-backdrop" id="serviceModal"');
const endModalStr = '</div>\n</div>\n</div>\n\n<!-- Video Form Modal -->';
const endModal = html.indexOf(endModalStr, startModal) + '</div>\n</div>\n</div>'.length;

const newModal = `<div class="adm-modal-backdrop" id="serviceModal" role="dialog" aria-modal="true">
  <div class="adm-modal adm-modal--wide">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px">
      <h2 class="adm-modal__title" id="serviceModalTitle" style="margin:0;font-size:20px">Edit Service Images</h2>
      <button type="button" onclick="closeServiceModal()" style="background:none;border:none;color:#64748b;cursor:pointer"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="22"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button>
    </div>
    <form id="serviceForm">
      <input type="hidden" id="serviceIdInput">
      <!-- Hidden essential fields to maintain data integrity if needed, though we will adjust JS to only patch images or just keep them hidden -->
      <div style="display:none;">
        <input type="text" id="serviceIconInput">
        <input type="text" id="serviceTitleInput">
        <input type="number" id="serviceSortOrderInput">
        <input type="text" id="serviceHeroTitleInput">
        <input type="checkbox" id="serviceActiveInput">
        <textarea id="serviceHeroSubheadingInput"></textarea>
        <input type="text" id="serviceDiffHeadingInput">
        <textarea id="serviceDiffSubtitleInput"></textarea>
        <textarea id="serviceUseCasesSubtitleInput"></textarea>
        <textarea id="serviceFaqSubtitleInput"></textarea>
        <textarea id="serviceCtaSubtitleInput"></textarea>
        <div id="serviceDiffEditor"></div>
        <input type="text" id="serviceUseCasesTitleInput">
        <input type="text" id="serviceCtaInput">
        <div id="serviceUseCasesEditor"></div>
      </div>

      <div style="margin-bottom:18px; padding:16px; border-radius:14px; border:1px solid var(--clr-border); background:var(--clr-bg);">
        <label class="adm-label" style="margin-bottom:12px; font-weight:600; font-size:15px; display:flex; align-items:center; gap:6px;">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
          Hero Scroll Images
        </label>
        <p style="margin:0 0 14px; font-size:13px; line-height:1.6; color:#64748b;">
          Upload the images shown in the right-side scrolling hero rail. You can add multiple images and remove any image below.
        </p>
        <div style="position:relative; width:100%; margin-bottom:14px;">
          <input type="file" class="adm-input" id="serviceHeroImageFile" accept="image/*" style="background:#fff; padding-right:108px;">
          <button type="button" class="adm-btn-primary" id="serviceHeroUploadBtn" onclick="uploadServiceHeroImage()" style="position:absolute; right:4px; top:4px; bottom:4px; min-width:98px; padding:0 16px;">Upload</button>
        </div>
        <div id="serviceHeroImagesList" style="display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:12px;"></div>
      </div>

      <div style="margin-bottom:18px; padding:16px; border-radius:14px; border:1px solid var(--clr-border); background:var(--clr-bg);">
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
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:20px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.06)">
        <button type="button" class="adm-btn-cancel" onclick="closeServiceModal()">Cancel</button>
        <button type="submit" class="adm-btn-primary" style="width:auto;padding:11px 32px">Save Images</button>
      </div>
    </form>
  </div>
</div>`;

html = html.substring(0, startModal) + newModal + html.substring(endModal);
fs.writeFileSync('admin/dashboard.html', html, 'utf8');

