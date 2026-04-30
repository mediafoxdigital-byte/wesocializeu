const fs = require('fs');

let css = fs.readFileSync('css/main.css', 'utf8');

// Strip out the old random metric styles we won't use to keep file clean 
// Actually, it doesn't hurt to leave them, but adding the new styles at the bottom is easier

const newStyles = `
/* ═══ BOXLESS EDITORIAL DESIGN ═════════════════════ */

.service-editorial-wrapper {
  max-width: 900px;
  margin: 0 auto;
}

.service-editorial-content {
  margin-top: 24px;
}

.service-editorial-text p {
  font-family: var(--font-body);
  font-size: clamp(18px, 1.5vw, 22px);
  line-height: 1.8;
  color: var(--clr-body);
  margin-bottom: 24px;
}

.service-editorial-text p:first-child {
  font-family: var(--font-heading);
  font-size: clamp(24px, 2vw, 32px);
  font-weight: 600;
  color: var(--clr-dark);
  line-height: 1.4;
  margin-bottom: 40px;
  letter-spacing: -0.02em;
}

/* Timeline Rows for How We Do It */
.service-timeline {
  display: flex;
  flex-direction: column;
  max-width: 900px;
  margin: 0 auto;
}

.service-timeline-row {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 48px 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  position: relative;
}

.service-timeline-row:first-child {
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

.service-timeline-row:hover .service-timeline-num {
  color: rgba(245, 166, 35, 0.3);
  transform: translateX(10px);
}

@media (min-width: 768px) {
  .service-timeline-row {
    flex-direction: row;
    align-items: flex-start;
    gap: 48px;
  }
}

.service-timeline-num {
  font-family: var(--font-heading);
  font-size: 80px;
  font-weight: 800;
  color: rgba(245, 166, 35, 0.1);
  line-height: 0.8;
  transition: all 0.4s ease;
  min-width: 100px;
}

.service-timeline-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
}

.service-timeline-content h3 {
  font-family: var(--font-heading);
  font-size: 24px;
  font-weight: 700;
  color: var(--clr-dark);
}

.service-timeline-content p {
  font-size: 17px;
  line-height: 1.6;
  color: var(--clr-body);
}

/* Editorial List for What Makes Us Different */
.service-editorial-list {
  display: grid;
  grid-template-columns: 1fr;
  gap: 48px 32px;
}

@media (min-width: 768px) {
  .service-editorial-list {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.service-editorial-item {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.service-editorial-item-accent {
  width: 48px;
  height: 3px;
  background: var(--clr-amber);
  border-radius: 2px;
  margin-bottom: 8px;
}

.service-editorial-item h3 {
  font-family: var(--font-heading);
  font-size: 22px;
  font-weight: 700;
  color: var(--clr-dark);
}

.service-editorial-item p {
  font-size: 16px;
  line-height: 1.6;
  color: var(--clr-body);
}
`;

fs.writeFileSync('css/main.css', css + '\n\n' + newStyles);
console.log('Appended premium CSS styles successfully');
