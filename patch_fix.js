const fs = require('fs');
let js = fs.readFileSync('js/admin.js', 'utf8');

const parseCode = `function parseServiceHowSteps(html) {
  const temp = document.createElement('div');
  temp.innerHTML = html || '';
  const blocks = Array.from(temp.querySelectorAll('.service-step'));

  if (blocks.length) {
    return blocks.map((block, index) => ({
      title: (block.querySelector('h3')?.textContent || \`Step \${index + 1}\`).trim(),
      description: (block.querySelector('p')?.textContent || '').trim(),
      image: block.querySelector('img')?.getAttribute('src') || ''
    }));
  }

  return Array.from(temp.querySelectorAll('p'))
    .map((paragraph, index) => ({
      title: \`Step \${index + 1}\`,
      description: paragraph.textContent.trim(),
      image: ''
    }))
    .filter((step) => step.description);
}`;

js = js.replace(/function parseServiceHowSteps.*?filter\(\(step\) => step\.description\);\n\}/s, parseCode);

const uploadCode = `window.uploadServiceHowStepImage = async function(index) {
  if (!currentServiceHowSteps[index]) {
    showToast('Step not found', 'error');
    return;
  }

  const fileInput = document.getElementById(\`serviceHowStepImageFile\${index}\`);
  if (!fileInput || !fileInput.files.length) {
    showToast('Please select a file first', 'error');
    return;
  }

  const formData = new FormData();
  formData.append('image', fileInput.files[0]);

  const btn = fileInput.parentElement?.querySelector('button');
  if (btn) btn.textContent = 'Uploading...';

  try {
    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    const data = await res.json();
    if (data.success && data.url) {
      currentServiceHowSteps[index].image = data.url;
      renderServiceHowSteps();
      const saved = await persistCurrentServiceImages({
        successMessage: 'Step ' + (index + 1) + ' image uploaded and saved',
        errorMessage: 'Image uploaded but failed to save to service page'
      });
      if (!saved) return;
    } else {
      showToast(data.error || 'Upload failed', 'error');
    }
  } catch (err) {
    showToast('Upload failed', 'error');
  } finally {
    if (btn) btn.textContent = 'Upload';
  }
};`;

js = js.replace(/window\.uploadServiceHowStepImage = async function\(index\).*?if \(btn\) btn\.textContent = 'Upload';\n  \}\n\};/s, uploadCode);

fs.writeFileSync('js/admin.js', js, 'utf8');
