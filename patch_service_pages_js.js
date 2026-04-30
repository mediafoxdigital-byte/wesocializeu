const fs = require('fs');

let js = fs.readFileSync('js/service-pages.js', 'utf8');

// 1. update extractSteps
js = js.replace(
  /const description = cleanText\(block\.querySelector\('p'\)\?\.textContent \|\| ''\);/,
  "const description = cleanText(block.querySelector('p')?.textContent || '');\n      const image = block.querySelector('img')?.getAttribute('src') || '';"
);

js = js.replace(
  /return \{ title, description \};/,
  "return { title, description, image };"
);

js = js.replace(
  /return paragraphs\.map\(\(text, index\) => \(\{\n    title: `Step \$\{index \+ 1\}`,\n    description: text\n  \}\)\);/,
  "return paragraphs.map((text, index) => ({\n    title: `Step ${index + 1}`,\n    description: text,\n    image: ''\n  }));"
);

// 2. update renderHowWeDoIt
js = js.replace(
  /<button type="button" class="service-solution-item__trigger" aria-expanded="\$\{index === 0 \? 'true' : 'false'\}">/,
  '<button type="button" class="service-solution-item__trigger" aria-expanded="${index === 0 ? \'true\' : \'false\'}" data-image="${escapeHtml(step.image || service.how_image_url || \'/assets/service-sections/how-we-do-it-default.svg\')}">'
);

js = js.replace(
  /<img src="\$\{escapeHtml\(imageUrl\)\}" alt="\$\{escapeHtml\(`\$\{service\.title \|\| 'Service'\} how we do it visual`\)\}" loading="lazy">/,
  '<img src="${escapeHtml(steps[0]?.image || imageUrl)}" alt="${escapeHtml(`${service.title || \'Service\'} how we do it visual`)}" loading="lazy" id="serviceSolutionsVisualImg">'
);

// 3. update bindServiceSolutions
js = js.replace(
  /const items = Array\.from\(container\.querySelectorAll\('\.service-solution-item'\)\);/,
  "const items = Array.from(container.querySelectorAll('.service-solution-item'));\n  const visualImg = container.querySelector('#serviceSolutionsVisualImg');"
);

js = js.replace(
  /if \(otherTrigger\) otherTrigger\.setAttribute\('aria-expanded', String\(isActive\)\);\n      \}\);\n    \}\);/,
  "if (otherTrigger) otherTrigger.setAttribute('aria-expanded', String(isActive));\n      });\n      if (visualImg && trigger.dataset.image) {\n        visualImg.src = trigger.dataset.image;\n      }\n    });"
);

fs.writeFileSync('js/service-pages.js', js, 'utf8');

