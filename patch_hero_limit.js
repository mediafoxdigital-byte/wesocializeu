const fs = require('fs');
let code = fs.readFileSync('js/admin.js', 'utf8');

// Replace uploadServiceHeroImage to add limit
code = code.replace(/window\.uploadServiceHeroImage = async function\(\) {/g, "window.uploadServiceHeroImage = async function() {\n  if (currentServiceHeroImages.length >= 5) {\n    showToast('Maximum 5 images allowed.', 'error');\n    return;\n  }");

fs.writeFileSync('js/admin.js', code, 'utf8');
