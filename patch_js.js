const fs = require('fs');
let js = fs.readFileSync('js/service-pages.js', 'utf8');

const whatwedo = `function renderWhatWeDo(contentHtml, highlights, metrics) {
  const content = document.getElementById('serviceWhatWeDo');
  const section = document.getElementById('serviceWhatWeDoSection');
  
  if (content) {
    if (contentHtml && contentHtml.trim() !== '') {
      content.innerHTML = '<div class="service-editorial-text">' + contentHtml + '</div>';
      if (section) section.style.display = '';
    } else {
      content.innerHTML = '<p class="service-editorial-text">Details coming soon.</p>';
      if (section) section.style.display = '';
    }
  }
}

function renderHowWeDoIt`;

js = js.replace(/function renderWhatWeDo.*?function renderHowWeDoIt/s, whatwedo);

const howwedo = `function renderHowWeDoIt(steps, fallbackHtml) {
  const section = document.getElementById('serviceHowWeDoItSection');
  const grid = document.getElementById('serviceHowWeDoIt');
  if (!grid) return;

  if (steps.length) {
    grid.innerHTML = '<div class="service-timeline">' + steps.map((step, index) => {
      return '<div class="service-timeline-row">' +
        '<div class="service-timeline-num">' + String(index + 1).padStart(2, '0') + '</div>' +
        '<div class="service-timeline-content">' +
          '<h3>' + escapeHtml(step.title) + '</h3>' +
          (step.description ? '<p>' + escapeHtml(step.description) + '</p>' : '') +
        '</div>' +
      '</div>';
    }).join('') + '</div>';
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

function renderWhatMakesUsDifferent`;

js = js.replace(/function renderHowWeDoIt.*?function renderWhatMakesUsDifferent/s, howwedo);

const whatmakesdifferent = `function renderWhatMakesUsDifferent(items, fallbackHtml) {
  const section = document.getElementById('serviceWhatMakesUsDifferentSection');
  const grid = document.getElementById('serviceWhatMakesUsDifferent');
  if (!grid) return;

  if (items.length) {
    grid.innerHTML = '<div class="service-editorial-list">' + items.map((item, index) => {
      const card = buildNarrativeCard(item, DIFFERENTIATOR_CARD_TITLES, index, 'Differentiator');
      return '<div class="service-editorial-item">' +
        '<div class="service-editorial-item-accent"></div>' +
        '<h3>' + escapeHtml(card.title) + '</h3>' +
        '<p>' + escapeHtml(card.body) + '</p>' +
      '</div>';
    }).join('') + '</div>';
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

function buildNarrativeCard`;

js = js.replace(/function renderWhatMakesUsDifferent.*?function buildNarrativeCard/s, whatmakesdifferent);

fs.writeFileSync('js/service-pages.js', js);
console.log('Updated js/service-pages.js successfully');
