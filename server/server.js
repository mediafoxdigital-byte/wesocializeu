'use strict';
const express    = require('express');
const helmet     = require('helmet');
const cors       = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit  = require('express-rate-limit');
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const dotenv     = require('dotenv');
const path       = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config();
const fs         = require('fs');
const crypto     = require('crypto');
const dns        = require('dns').promises;
const net        = require('net');
const multer     = require('multer');
const axios      = require('axios');
const nodemailer = require('nodemailer');
const cheerio    = require('cheerio');
const db         = require('./db');

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const ALLOWED_UPLOAD_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-m4v',
  'application/mp4'
]);
const ALLOWED_UPLOAD_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.mp4', '.mov', '.webm', '.m4v']);
const IMAGE_UPLOAD_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const IMAGE_UPLOAD_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const VIDEO_UPLOAD_MIME_TYPES = new Set(['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v', 'application/mp4']);
const VIDEO_UPLOAD_EXTENSIONS = new Set(['.mp4', '.mov', '.webm', '.m4v']);
const UPLOAD_MIME_EXTENSIONS = new Map([
  ['image/jpeg', new Set(['.jpg', '.jpeg'])],
  ['image/png', new Set(['.png'])],
  ['image/webp', new Set(['.webp'])],
  ['image/gif', new Set(['.gif'])],
  ['video/mp4', new Set(['.mp4', '.m4v'])],
  ['application/mp4', new Set(['.mp4', '.m4v'])],
  ['video/quicktime', new Set(['.mov'])],
  ['video/webm', new Set(['.webm'])],
  ['video/x-m4v', new Set(['.m4v', '.mp4'])]
]);
const REMOTE_IMAGE_EXTENSIONS = new Map([
  ['image/jpeg', '.jpg'],
  ['image/jpg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['image/avif', '.avif'],
  ['image/gif', '.gif']
]);
const SENSITIVE_PATH_PREFIXES = ['/server', '/node_modules'];
const SENSITIVE_PATHS = new Set([
  '/generate_service_pages.js',
  '/service_pages_data.js',
  '/package.json',
  '/package-lock.json'
]);
const SENSITIVE_PATH_PATTERNS = [
  /^\/(?:patch_[^/]*|build_creators|create_ugc_page)\.js$/i,
  /\.db(?:$|-)/i,
  /\.sqlite(?:$|-)/i,
  /\.env$/i
];
const SAFE_HTML_TAGS = new Set(['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'h2', 'h3', 'h4', 'blockquote', 'a', 'div', 'img']);
function isUploadMetadataAllowed(file, allowedMimeTypes, allowedExtensions) {
  const mime = String(file.mimetype || '').toLowerCase();
  const ext = path.extname(file.originalname || file.filename || '').toLowerCase();
  const extensionsForMime = UPLOAD_MIME_EXTENSIONS.get(mime);
  return Boolean(
    allowedMimeTypes.has(mime) &&
    allowedExtensions.has(ext) &&
    extensionsForMime &&
    extensionsForMime.has(ext)
  );
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) { cb(null, uploadDir) },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const finalExt = ALLOWED_UPLOAD_EXTENSIONS.has(ext) ? ext : (file.mimetype.startsWith('video/') ? '.mp4' : '.jpg');
    cb(null, `${Date.now()}-${crypto.randomUUID()}${finalExt}`);
  }
});
const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter(req, file, cb) {
    if (!isUploadMetadataAllowed(file, ALLOWED_UPLOAD_MIME_TYPES, ALLOWED_UPLOAD_EXTENSIONS)) {
      return cb(new Error('File type not supported. Please upload JPG, PNG, WEBP, GIF, MP4, MOV, WEBM, or M4V.'));
    }
    cb(null, true);
  }
});

const app = express();
app.disable('x-powered-by');
app.set('json escape', true);
const trustProxySetting = process.env.TRUST_PROXY;
app.set('trust proxy', trustProxySetting
  ? (trustProxySetting === 'true' ? true : Math.max(0, parseInt(trustProxySetting, 10) || 0))
  : false);
const PORT     = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_change_me';
const JWT_EXPIRY = '8h';
const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 8 * 60 * 60 * 1000,
  path: '/'
};
const CSRF_COOKIE_OPTIONS = {
  httpOnly: false,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 8 * 60 * 60 * 1000,
  path: '/'
};
const DEFAULT_ADMIN_PASSWORD = 'WeSocialize@2026';

if (process.env.NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET || JWT_SECRET === 'fallback_secret_change_me') {
    console.error('[SECURITY WARNING] JWT_SECRET must be set to a strong value in production.');
  }
  if (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD === DEFAULT_ADMIN_PASSWORD) {
    console.error('[SECURITY WARNING] ADMIN_PASSWORD must be changed before running in production.');
  }
} else {
  if (JWT_SECRET === 'fallback_secret_change_me') {
    console.warn('[SECURITY] JWT_SECRET is using the fallback value. Set a strong secret before deployment.');
  }
  if ((process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD) === DEFAULT_ADMIN_PASSWORD) {
    console.warn('[SECURITY] ADMIN_PASSWORD is using the default value. Change it before deployment.');
  }
}

// ─── Security Middleware ────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://fonts.gstatic.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
    },
  },
}));
app.use(cors({
  origin: [
    /^http:\/\/localhost:\d+$/,
    /^https:\/\/.*\.vercel\.app$/,
    'https://wesocializeu.com'
  ],
  credentials: true
}));
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

app.use((err, req, res, next) => {
  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body too large' });
  }
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }
  return next(err);
});

// ─── Rate Limiters ─────────────────────────────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts. Please wait 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'Rate limit exceeded.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const publicFormLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many submissions. Please wait before trying again.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const proxyImageLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  message: 'Rate limit exceeded.',
  standardHeaders: true,
  legacyHeaders: false,
});

function cleanText(value, maxLength = 500) {
  return String(value || '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function parseInteger(value, fallback = 0, min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function sanitizeUrl(value, options = {}) {
  const {
    allowRelative = true,
    allowAnchor = true,
    allowTelMailto = true
  } = options;

  const raw = String(value || '').trim();
  if (!raw) return '';
  if (allowAnchor && raw.startsWith('#')) return raw.slice(0, 200);
  if (allowRelative && raw.startsWith('/')) {
    if (raw.startsWith('//') || raw.includes('\\')) return '';
    return raw.slice(0, 500);
  }

  try {
    const parsed = new URL(raw);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      if (allowTelMailto && ['tel:', 'mailto:'].includes(parsed.protocol)) {
        return raw.slice(0, 500);
      }
      return '';
    }
    parsed.username = '';
    parsed.password = '';
    return parsed.toString().slice(0, 500);
  } catch {
    return '';
  }
}

function sanitizeUrlArray(value, maxItems = 12) {
  let rawItems = [];

  if (Array.isArray(value)) {
    rawItems = value;
  } else if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      rawItems = Array.isArray(parsed) ? parsed : [];
    } catch {
      rawItems = value.split('\n');
    }
  }

  return rawItems
    .map((item) => sanitizeUrl(item, { allowRelative: true, allowAnchor: false, allowTelMailto: false }))
    .filter(Boolean)
    .slice(0, maxItems);
}

function normalizeEmailAddress(value) {
  const email = String(value || '').trim().toLowerCase();
  const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!email || email.length > 254 || !emailRx.test(email)) {
    throw new Error('Enter a valid email address.');
  }
  return email;
}

function normalizePhoneNumber(value, required = true) {
  const raw = String(value || '').trim();
  if (!raw) {
    if (required) throw new Error('Enter a valid phone number.');
    return '';
  }

  if (!/^\+?[0-9][0-9\s().-]{8,24}$/.test(raw)) {
    throw new Error('Enter a valid phone number.');
  }

  const digits = raw.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15) {
    throw new Error('Phone number must contain 10 to 15 digits.');
  }

  return `${raw.startsWith('+') ? '+' : ''}${digits}`;
}

function normalizeHostname(hostname) {
  return String(hostname || '')
    .trim()
    .toLowerCase()
    .replace(/^\[/, '')
    .replace(/\]$/, '')
    .replace(/\.$/, '');
}

function hostMatches(hostname, allowedHosts) {
  const host = normalizeHostname(hostname);
  return allowedHosts.some((allowedHost) => host === allowedHost || host.endsWith(`.${allowedHost}`));
}

function normalizePublicWebUrl(value, options = {}) {
  const {
    required = false,
    label = 'URL',
    allowedHosts = null
  } = options;

  let raw = String(value || '').trim();
  if (!raw) {
    if (required) throw new Error(`${label} is required.`);
    return '';
  }

  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;

  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`Enter a valid ${label.toLowerCase()}.`);
  }

  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
    throw new Error(`Enter a valid ${label.toLowerCase()}.`);
  }

  const hostname = normalizeHostname(parsed.hostname);
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    (net.isIP(hostname) && isPrivateIp(hostname)) ||
    (!net.isIP(hostname) && !hostname.includes('.'))
  ) {
    throw new Error(`Enter a real public ${label.toLowerCase()}.`);
  }

  if (allowedHosts && !hostMatches(hostname, allowedHosts)) {
    throw new Error(`${label} must be a valid ${allowedHosts.join(' or ')} link.`);
  }

  parsed.username = '';
  parsed.password = '';
  return parsed.toString().slice(0, 500);
}

function normalizeRequiredText(value, label, maxLength = 200, minLength = 2) {
  const text = cleanText(value, maxLength);
  if (text.length < minLength) throw new Error(`${label} is required.`);
  return text;
}

function isUploadedVideo(file) {
  if (!file) return false;
  return isUploadMetadataAllowed(file, VIDEO_UPLOAD_MIME_TYPES, VIDEO_UPLOAD_EXTENSIONS) && hasVideoFileSignature(file);
}

function isUploadedImage(file) {
  if (!file) return false;
  return isUploadMetadataAllowed(file, IMAGE_UPLOAD_MIME_TYPES, IMAGE_UPLOAD_EXTENSIONS) && hasImageFileSignature(file);
}

function readFileHeader(file, length = 64) {
  if (!file || !file.path) return Buffer.alloc(0);
  let fd;
  try {
    fd = fs.openSync(file.path, 'r');
    const buffer = Buffer.alloc(length);
    const bytesRead = fs.readSync(fd, buffer, 0, length, 0);
    return buffer.subarray(0, bytesRead);
  } catch {
    return Buffer.alloc(0);
  } finally {
    if (typeof fd === 'number') fs.closeSync(fd);
  }
}

function hasImageBufferSignature(buffer, mime) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) return false;
  const normalizedMime = String(mime || '').toLowerCase();
  if (normalizedMime === 'image/jpeg' || normalizedMime === 'image/jpg') {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (normalizedMime === 'image/png') {
    return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  if (normalizedMime === 'image/webp') {
    return buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
  }
  if (normalizedMime === 'image/gif') {
    return buffer.toString('ascii', 0, 4) === 'GIF8';
  }
  if (normalizedMime === 'image/avif') {
    return buffer.length >= 12 && buffer.toString('ascii', 4, 8) === 'ftyp' && ['avif', 'avis', 'mif1', 'msf1'].includes(buffer.toString('ascii', 8, 12));
  }
  return false;
}

function hasImageFileSignature(file) {
  return hasImageBufferSignature(readFileHeader(file), file.mimetype);
}

function hasVideoBufferSignature(buffer, mime) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 8) return false;
  const normalizedMime = String(mime || '').toLowerCase();
  if (normalizedMime === 'video/webm') {
    return buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3;
  }
  return VIDEO_UPLOAD_MIME_TYPES.has(normalizedMime) && buffer.toString('ascii', 4, 8) === 'ftyp';
}

function hasVideoFileSignature(file) {
  return hasVideoBufferSignature(readFileHeader(file), file.mimetype);
}

function removeUploadedFile(file) {
  if (!file || !file.path) return;
  const resolvedPath = path.resolve(file.path);
  if (!resolvedPath.startsWith(path.resolve(uploadDir) + path.sep)) return;
  try {
    fs.unlinkSync(resolvedPath);
  } catch {
    // Ignore cleanup failures; the upload request should still return the validation error.
  }
}

function sanitizeRichHtml(html) {
  if (!html || !String(html).trim()) return '';

  const $ = cheerio.load(`<div id="root">${String(html)}</div>`, { decodeEntities: false });
  const root = $('#root');

  root.find('*').each((_, node) => {
    const tag = (node.tagName || '').toLowerCase();
    const $node = $(node);

    if (['script', 'style', 'iframe', 'object', 'embed', 'noscript'].includes(tag)) {
      $node.remove();
      return;
    }

    if (!SAFE_HTML_TAGS.has(tag)) {
      $node.replaceWith($node.contents());
      return;
    }

    const attrs = Object.keys(node.attribs || {});
    attrs.forEach((attr) => {
      if (tag === 'a' && ['href', 'target', 'rel'].includes(attr)) return;
      if (tag === 'img' && ['src', 'alt', 'loading'].includes(attr)) return;
      if (tag === 'div' && attr === 'class') return;
      $node.removeAttr(attr);
    });

    if (tag === 'a') {
      const safeHref = sanitizeUrl($node.attr('href'), { allowRelative: true, allowAnchor: true, allowTelMailto: true });
      if (!safeHref) {
        $node.replaceWith($node.text());
        return;
      }
      $node.attr('href', safeHref);
      if ($node.attr('target') === '_blank') {
        $node.attr('target', '_blank');
        $node.attr('rel', 'noopener noreferrer');
      } else {
        $node.removeAttr('target');
        $node.removeAttr('rel');
      }
    }

    if (tag === 'div') {
      const className = cleanText($node.attr('class') || '', 40);
      if (className === 'service-step') {
        $node.attr('class', 'service-step');
      } else {
        $node.removeAttr('class');
      }
    }

    if (tag === 'img') {
      const safeSrc = sanitizeUrl($node.attr('src'), { allowRelative: true, allowAnchor: false, allowTelMailto: false });
      if (!safeSrc) {
        $node.remove();
        return;
      }
      $node.attr('src', safeSrc);
      $node.attr('alt', cleanText($node.attr('alt') || '', 160));
      $node.attr('loading', 'lazy');
    }
  });

  return root.html().replace(/\n{3,}/g, '\n\n').trim();
}

function sanitizeVideoRecord(video) {
  return {
    ...video,
    badge: cleanText(video.badge, 50),
    thumbnail_url: sanitizeUrl(video.thumbnail_url, { allowRelative: true, allowAnchor: false, allowTelMailto: false }),
    video_url: sanitizeUrl(video.video_url, { allowRelative: true, allowAnchor: false, allowTelMailto: false }),
    title: cleanText(video.title, 200),
    category: cleanText(video.category, 80),
    likes_count: parseInteger(video.likes_count, 0, 0, 100000000),
    comments_count: parseInteger(video.comments_count, 0, 0, 100000000),
    visit_url: sanitizeUrl(video.visit_url, { allowRelative: true, allowAnchor: true, allowTelMailto: true })
  };
}

function sanitizeCreatorRecord(creator) {
  return {
    ...creator,
    name: cleanText(creator.name, 120),
    category: cleanText(creator.category, 80),
    platform: cleanText(creator.platform, 80),
    followers: cleanText(creator.followers, 80),
    image_url: sanitizeUrl(creator.image_url, { allowRelative: true, allowAnchor: false, allowTelMailto: false }),
    profile_url: sanitizeUrl(creator.profile_url, { allowRelative: false, allowAnchor: false, allowTelMailto: false })
  };
}

function sanitizeBlogRecord(blog) {
  return {
    ...blog,
    title: cleanText(blog.title, 200),
    image_url: sanitizeUrl(blog.image_url, { allowRelative: true, allowAnchor: false, allowTelMailto: false }),
    excerpt: cleanText(blog.excerpt, 500),
    body: sanitizeRichHtml(blog.body),
    link_url: sanitizeUrl(blog.link_url, { allowRelative: true, allowAnchor: true, allowTelMailto: true }),
    date_text: cleanText(blog.date_text, 60),
    is_featured: blog.is_featured ? 1 : 0,
    order_idx: parseInteger(blog.order_idx, 99, 1, 9999)
  };
}

function sanitizeCaseStudyRecord(caseStudy) {
  return {
    ...caseStudy,
    title: cleanText(caseStudy.title, 200),
    image_url: sanitizeUrl(caseStudy.image_url, { allowRelative: true, allowAnchor: false, allowTelMailto: false }),
    excerpt: cleanText(caseStudy.excerpt, 500),
    body: sanitizeRichHtml(caseStudy.body),
    link_url: sanitizeUrl(caseStudy.link_url, { allowRelative: true, allowAnchor: true, allowTelMailto: true }),
    is_wide: caseStudy.is_wide ? 1 : 0,
    order_idx: parseInteger(caseStudy.order_idx, 99, 1, 9999)
  };
}

function sanitizeServiceRecord(service) {
  const safeHowHtml = sanitizeRichHtml(service.how_we_do_it);
  const requestHowSteps = Array.isArray(service.how_steps) ? normalizeServiceHowSteps(service.how_steps) : [];
  const savedHowSteps = parseServiceHowStepsJson(service.how_steps_json);
  const legacyHowSteps = requestHowSteps.length || savedHowSteps.length ? [] : extractServiceHowStepsFromHtml(safeHowHtml);
  const howSteps = requestHowSteps.length ? requestHowSteps : (savedHowSteps.length ? savedHowSteps : legacyHowSteps);

  return {
    ...service,
    slug: cleanText(service.slug, 120),
    title: cleanText(service.title, 200),
    icon: cleanText(service.icon, 8),
    hero_title: cleanText(service.hero_title, 220),
    hero_subheading: cleanText(service.hero_subheading, 500),
    hero_gallery_images: sanitizeUrlArray(service.hero_gallery_images, 5),
    how_image_url: sanitizeUrl(service.how_image_url, { allowRelative: true, allowAnchor: false, allowTelMailto: false }),
    what_heading: cleanText(service.what_heading, 220),
    how_heading: cleanText(service.how_heading, 220),
    how_subtitle: cleanText(service.how_subtitle, 500),
    diff_heading: cleanText(service.diff_heading, 220),
    diff_subtitle: cleanText(service.diff_subtitle, 500),
    use_cases_subtitle: cleanText(service.use_cases_subtitle, 500),
    faq_subtitle: cleanText(service.faq_subtitle, 500),
    cta_subtitle: cleanText(service.cta_subtitle, 500),
    what_we_do: sanitizeRichHtml(service.what_we_do),
    how_we_do_it: howSteps.length ? buildServiceHowHtmlFromSteps(howSteps) : safeHowHtml,
    how_steps_json: JSON.stringify(howSteps),
    how_steps: howSteps,
    what_makes_us_different: sanitizeRichHtml(service.what_makes_us_different),
    use_cases_title: cleanText(service.use_cases_title, 80),
    use_cases: sanitizeRichHtml(service.use_cases),
    cta: cleanText(service.cta, 180),
    sort_order: parseInteger(service.sort_order, 99, 1, 9999),
    is_active: service.is_active ? 1 : 0
  };
}

function parseServiceHowStepsJson(value) {
  if (Array.isArray(value)) return normalizeServiceHowSteps(value);
  if (typeof value !== 'string' || !value.trim()) return [];

  try {
    const parsed = JSON.parse(value);
    return normalizeServiceHowSteps(parsed);
  } catch {
    return [];
  }
}

function extractServiceHowStepsFromHtml(html) {
  if (!html || !String(html).trim()) return [];

  const $ = cheerio.load(`<div id="root">${String(html)}</div>`, { decodeEntities: false });
  const blocks = Array.from($('#root .service-step'));
  if (!blocks.length) return [];

  return blocks
    .map((block, index) => {
      const $block = $(block);
      return {
        title: cleanText($block.find('h3').first().text() || `Step ${index + 1}`, 220),
        description: cleanText($block.find('p').first().text() || '', 1000),
        image: sanitizeUrl($block.find('img').first().attr('src'), { allowRelative: true, allowAnchor: false, allowTelMailto: false })
      };
    })
    .filter((step) => step.title || step.description || step.image);
}

function normalizeServiceHowSteps(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((step) => ({
      title: cleanText(step?.title, 220),
      description: cleanText(step?.description, 1000),
      image: sanitizeUrl(step?.image, { allowRelative: true, allowAnchor: false, allowTelMailto: false })
    }))
    .filter((step) => step.title || step.description || step.image);
}

function buildServiceHowHtmlFromSteps(steps) {
  return steps
    .map((step) => {
      const title = escapeHtml(step.title || 'Step');
      const description = escapeHtml(step.description || '');
      const image = sanitizeUrl(step.image, { allowRelative: true, allowAnchor: false, allowTelMailto: false });
      const imageAlt = escapeHtml(cleanText(step.title || 'Step', 160));

      return [
        '<div class="service-step">',
        `  <h3>${title}</h3>`,
        description ? `  <p>${description}</p>` : '',
        image ? `  <img src="${escapeHtml(image)}" alt="${imageAlt} image" loading="lazy">` : '',
        '</div>'
      ].filter(Boolean).join('\n');
    })
    .join('\n');
}

function isPrivateIp(address) {
  const normalizedAddress = normalizeHostname(address);
  if (normalizedAddress.includes(':ffff:')) return true;

  if (net.isIP(normalizedAddress) === 4) {
    const octets = normalizedAddress.split('.').map(Number);
    const [a, b, c] = octets;
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && (b === 0 || b === 168)) return true;
    if (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) return true;
    if (a === 203 && b === 0 && c === 113) return true;
    if (a >= 224) return true;
    return false;
  }

  return (
    normalizedAddress === '::' ||
    normalizedAddress === '::1' ||
    normalizedAddress.startsWith('fc') ||
    normalizedAddress.startsWith('fd') ||
    normalizedAddress.startsWith('fe80:') ||
    normalizedAddress.startsWith('ff') ||
    normalizedAddress.startsWith('2001:db8:')
  );
}

async function assertSafeExternalUrl(rawUrl) {
  const parsed = new URL(rawUrl);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Only http and https URLs are allowed.');
  }
  if (parsed.username || parsed.password) {
    throw new Error('Authenticated URLs are not allowed.');
  }

  const hostname = normalizeHostname(parsed.hostname);
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname === '0'
  ) {
    throw new Error('Private hosts are not allowed.');
  }

  if (net.isIP(hostname) && isPrivateIp(hostname)) {
    throw new Error('Private hosts are not allowed.');
  }

  const lookups = await dns.lookup(hostname, { all: true });
  if (!lookups.length || lookups.some((entry) => isPrivateIp(entry.address))) {
    throw new Error('Private hosts are not allowed.');
  }

  parsed.username = '';
  parsed.password = '';
  return parsed.toString();
}

async function safeAxiosGet(rawUrl, options = {}, redirectLimit = 3) {
  const safeUrl = await assertSafeExternalUrl(rawUrl);
  const response = await axios.get(safeUrl, {
    ...options,
    maxRedirects: 0,
    validateStatus: (status) => status >= 200 && status < 400
  });

  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.location;
    if (!location || redirectLimit <= 0) {
      throw new Error('Remote URL redirected too many times.');
    }

    const nextUrl = new URL(location, safeUrl).toString();
    return safeAxiosGet(nextUrl, options, redirectLimit - 1);
  }

  return response;
}

function decodeScriptUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    return JSON.parse(`"${raw.replace(/"/g, '\\"')}"`);
  } catch {
    return raw
      .replace(/\\u0026/g, '&')
      .replace(/\\\//g, '/')
      .replace(/&amp;/g, '&');
  }
}

function isLikelyPlatformIcon(url) {
  const lower = String(url || '').toLowerCase();
  return (
    lower.includes('favicon') ||
    lower.includes('apple-touch-icon') ||
    lower.includes('glyph-logo') ||
    lower.includes('/static/images/ico/') ||
    lower.includes('static.cdninstagram.com')
  );
}

function addImageCandidate(candidates, value, baseUrl) {
  const raw = String(value || '').replace(/&amp;/g, '&').trim();
  if (!raw || raw.startsWith('data:')) return;

  try {
    const absoluteUrl = new URL(raw, baseUrl).toString();
    if (isLikelyPlatformIcon(absoluteUrl) || candidates.includes(absoluteUrl)) return;
    candidates.push(absoluteUrl);
  } catch {
    // Ignore malformed candidates and keep trying the rest.
  }
}

function collectProfileImageCandidates($, html, pageUrl, isInstagram) {
  const candidates = [];

  if (isInstagram) {
    const source = String(html || '');
    [
      /"profile_pic_url_hd"\s*:\s*"([^"]+)"/g,
      /"profile_pic_url"\s*:\s*"([^"]+)"/g,
      /"hd_profile_pic_url_info"\s*:\s*\{[^}]*"url"\s*:\s*"([^"]+)"/g
    ].forEach((pattern) => {
      let match;
      while ((match = pattern.exec(source))) {
        addImageCandidate(candidates, decodeScriptUrl(match[1]), pageUrl);
      }
    });
  }

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).html() || '{}');
      const images = [
        data.image,
        data.thumbnailUrl,
        data.logo,
        data.author && data.author.image
      ].flat().filter(Boolean);
      images.forEach((image) => addImageCandidate(candidates, typeof image === 'string' ? image : image.url, pageUrl));
    } catch {
      // Invalid JSON-LD is common on profile pages.
    }
  });

  [
    'meta[property="og:image:secure_url"]',
    'meta[property="og:image"]',
    'meta[name="twitter:image"]',
    'link[rel="image_src"]'
  ].forEach((selector) => {
    $(selector).each((_, el) => {
      addImageCandidate(candidates, $(el).attr('content') || $(el).attr('href'), pageUrl);
    });
  });

  return candidates;
}

function extractInstagramUsername(pageUrl) {
  try {
    const parsed = new URL(pageUrl);
    if (!/(^|\.)instagram\.com$/i.test(parsed.hostname)) return '';

    const username = (parsed.pathname.split('/').filter(Boolean)[0] || '').replace(/^@/, '');
    const blockedPaths = new Set(['p', 'reel', 'reels', 'stories', 'explore', 'accounts', 'direct']);
    if (!username || blockedPaths.has(username.toLowerCase())) return '';

    return username.slice(0, 80);
  } catch {
    return '';
  }
}

async function collectInstagramWebProfileImageCandidates(username, referer) {
  const candidates = [];
  if (!username) return candidates;

  const apiUrl = `https://i.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`;
  const response = await safeAxiosGet(apiUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json,text/plain,*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'X-IG-App-ID': '936619743392459',
      'Referer': referer
    },
    timeout: 12000
  });

  const user = response.data && response.data.data && response.data.data.user;
  [
    user && user.hd_profile_pic_url_info && user.hd_profile_pic_url_info.url,
    user && user.profile_pic_url_hd,
    user && user.profile_pic_url
  ].forEach((imageUrl) => addImageCandidate(candidates, imageUrl, referer));

  return candidates;
}

async function persistRemoteProfileImage(rawImageUrl, referer, prefix = 'profile-fetch') {
  const imgRes = await safeAxiosGet(rawImageUrl, {
    responseType: 'arraybuffer',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      'Referer': referer
    },
    timeout: 12000,
    maxContentLength: 10 * 1024 * 1024
  });

  const contentType = String(imgRes.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
  const ext = REMOTE_IMAGE_EXTENSIONS.get(contentType);
  const buffer = Buffer.from(imgRes.data || []);

  if (!ext || buffer.length < 1024 || !hasImageBufferSignature(buffer.subarray(0, 64), contentType)) {
    throw new Error('Remote profile image was not a valid image file.');
  }

  const filename = `${prefix}-${Date.now()}-${crypto.randomUUID()}${ext}`;
  fs.writeFileSync(path.join(uploadDir, filename), buffer);
  return `/uploads/${filename}`;
}

// ─── Static Files ───────────────────────────────────────────────────────────
app.use((req, res, next) => {
  let requestPath;
  try {
    requestPath = decodeURIComponent(req.path || '/');
  } catch {
    return res.status(400).json({ error: 'Invalid request path' });
  }
  if (
    requestPath.includes('..') ||
    SENSITIVE_PATHS.has(requestPath) ||
    SENSITIVE_PATH_PATTERNS.some((pattern) => pattern.test(requestPath)) ||
    SENSITIVE_PATH_PREFIXES.some((prefix) => requestPath === prefix || requestPath.startsWith(`${prefix}/`))
  ) {
    return res.status(404).json({ error: 'Not found' });
  }
  next();
});

function requireAdminPageAuth(req, res, next) {
  const token = req.cookies.wsu_token;
  if (!token) return res.redirect('/admin/login.html');
  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.clearCookie('wsu_token');
    res.clearCookie('wsu_csrf');
    return res.redirect('/admin/login.html');
  }
}

app.get('/admin/dashboard.html', requireAdminPageAuth, (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.sendFile(path.join(__dirname, '..', 'admin', 'dashboard.html'));
});

app.use(express.static(path.join(__dirname, '..'), {
  index: 'index.html',
  dotfiles: 'ignore',
  setHeaders(res, filePath) {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

// ─── Auth Middleware ────────────────────────────────────────────────────────
function getAdminPayload(req) {
  const token = req.cookies.wsu_token;
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function requireAuth(req, res, next) {
  const admin = getAdminPayload(req);
  if (!admin) {
    res.clearCookie('wsu_token');
    res.clearCookie('wsu_csrf');
    return res.status(401).json({ error: 'Session expired' });
  }
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const csrfHeader = req.get('x-csrf-token') || '';
    if (!admin.csrf || csrfHeader !== admin.csrf) {
      return res.status(403).json({ error: 'Security token expired. Refresh the admin page and try again.' });
    }
  }
  req.admin = admin;
  next();
}

function requireSameOriginForStateChanges(req, res, next) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();

  const origin = req.get('origin');
  if (!origin) return next();

  try {
    const actual = new URL(origin);
    const expected = new URL(`${req.protocol}://${req.get('host')}`);
    if (actual.protocol !== expected.protocol || actual.host !== expected.host) {
      return res.status(403).json({ error: 'Cross-origin request blocked' });
    }
  } catch {
    return res.status(403).json({ error: 'Invalid request origin' });
  }

  next();
}

// Custom strict origin check removed in favor of robust CORS middleware

function rejectBotTrap(req, res, next) {
  const trap = cleanText(req.body && req.body._gotcha, 120);
  if (trap) return res.status(400).json({ error: 'Invalid submission.' });
  next();
}

// ─── Mailer Configuration ───────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  }
});

async function sendConfirmationEmail(toEmail, type, name) {
  if (!process.env.SMTP_USER || process.env.SMTP_USER === 'your_email@gmail.com') return;
  const safeName = escapeHtml(name);
  const subject = type === 'brand' 
    ? 'Thanks for reaching out! — WeSocializeU'
    : 'Welcome to the network! — WeSocializeU';

  const html = type === 'brand'
    ? `<div style="font-family:sans-serif;max-width:600px;margin:30px auto;border:1px solid #e2e8f0;border-radius:12px;padding:30px;color:#334155;">
         <h2 style="color:#F5A623;margin-top:0;">Request Received!</h2>
         <p>Hi ${safeName},</p>
         <p>Thanks for reaching out to WeSocializeU! Our brand partnerships team is reviewing your details.</p>
         <p>We'll be in touch within 24 hours to schedule a call to discuss how our creator network can drive scale for your brand.</p>
         <br/>
         <p>Best,<br/><strong>The WeSocializeU Team</strong></p>
       </div>`
    : `<div style="font-family:sans-serif;max-width:600px;margin:30px auto;border:1px solid #e2e8f0;border-radius:12px;padding:30px;color:#334155;">
         <h2 style="color:#F5A623;margin-top:0;">Welcome to the Network!</h2>
         <p>Hi ${safeName},</p>
         <p>We've successfully received your creator application.</p>
         <p>Our talent team is reviewing your profile. Once approved, we'll start matching you with exclusive brand campaigns aligned with your audience.</p>
         <p>We normally process applications within 48 hours.</p>
         <br/>
         <p>Keep creating,<br/><strong>The WeSocializeU Team</strong></p>
       </div>`;

  try {
    await transporter.sendMail({
      from: `"WeSocializeU" <${process.env.SMTP_USER}>`,
      to: toEmail,
      subject,
      html
    });
  } catch (err) {
    console.error('Email send err:', err.message);
  }
}

// ─── API Routes ─────────────────────────────────────────────────────────────

// POST /api/login
app.post('/api/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  try {
    const admin = await db.findAdminByUsername(username.trim());
    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = bcrypt.compareSync(password, admin.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const csrf = crypto.randomBytes(32).toString('hex');
    const token = jwt.sign({ id: admin.id, username: admin.username, csrf }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
    res.cookie('wsu_token', token, AUTH_COOKIE_OPTIONS);
    res.cookie('wsu_csrf', csrf, CSRF_COOKIE_OPTIONS);

    return res.json({ success: true, username: admin.username });
  } catch (err) {
    console.error('Login DB error:', err.message);
    return res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/logout
app.post('/api/logout', (req, res) => {
  res.clearCookie('wsu_token', { path: '/' });
  res.clearCookie('wsu_csrf', { path: '/' });
  return res.json({ success: true });
});

// POST /api/leads  — public (contact form submissions)
app.post('/api/leads', publicFormLimiter, rejectBotTrap, async (req, res) => {
  try {
    const isBrandApplication = cleanText(req.body.type, 40) === 'brand';
    const name = normalizeRequiredText(req.body.name, 'Full name', 120);
    const email = normalizeEmailAddress(req.body.email);
    const phone = normalizePhoneNumber(req.body.phone, isBrandApplication);
    const company = isBrandApplication ? normalizeRequiredText(req.body.company, 'Company name', 160) : cleanText(req.body.company, 160);
    const website = normalizePublicWebUrl(req.body.website, { label: 'website link' });
    const service = cleanText(req.body.service, 200);
    const message = cleanText(req.body.message, 2000);

    const id = await db.createLead({ name, email, phone, service, message, company, website });

    sendConfirmationEmail(email, 'brand', name);
    return res.status(201).json({ success: true, id });
  } catch (err) {
    return res.status(400).json({ error: err.message || 'Invalid lead details' });
  }
});

function extractLegacyUrl(value) {
  const match = String(value || '').match(/https?:\/\/[^\s)]+|(?:www\.)?[a-z0-9.-]+\.[a-z]{2,}[^\s)]*/i);
  return match ? match[0] : '';
}

async function handleCreatorApplication(req, res) {
  try {
    const wantsInstagram = /^yes/i.test(cleanText(req.body.has_instagram, 20));
    const wantsYoutube = /^yes/i.test(cleanText(req.body.has_youtube, 20));
    const rawInstagramUrl = req.body.instagram_url || extractLegacyUrl(req.body.has_instagram);
    const rawYoutubeUrl = req.body.youtube_url || extractLegacyUrl(req.body.has_youtube);

    const name = normalizeRequiredText(req.body.name, 'Full name', 120);
    const email = normalizeEmailAddress(req.body.email);
    const phone = normalizePhoneNumber(req.body.phone, true);
    const category = normalizeRequiredText(req.body.category, 'Category', 80);
    const language = cleanText(req.body.language, 80);
    const instagramUrl = normalizePublicWebUrl(rawInstagramUrl, {
      required: wantsInstagram,
      label: 'Instagram link',
      allowedHosts: ['instagram.com']
    });
    const youtubeUrl = normalizePublicWebUrl(rawYoutubeUrl, {
      required: wantsYoutube,
      label: 'YouTube link',
      allowedHosts: ['youtube.com', 'youtu.be']
    });

    if (!instagramUrl && !youtubeUrl) {
      return res.status(400).json({ error: 'Add at least one valid Instagram or YouTube link.' });
    }

    const id = await db.createCreatorLead({
      name, email, phone,
      dob: cleanText(req.body.dob, 30),
      gender: cleanText(req.body.gender, 30),
      pincode: cleanText(req.body.pincode, 20),
      category,
      language,
      has_instagram: instagramUrl ? 'Yes' : 'No',
      has_youtube: youtubeUrl ? 'Yes' : 'No',
      instagram_url: instagramUrl,
      youtube_url: youtubeUrl
    });

    sendConfirmationEmail(email, 'creator', name);
    return res.status(201).json({ success: true, id });
  } catch (err) {
    return res.status(400).json({ error: err.message || 'Invalid creator application details' });
  }
}

app.post('/api/creator-applications', publicFormLimiter, rejectBotTrap, handleCreatorApplication);

// Backward compatibility for the public creator sign-up form. If an admin cookie
// is present, pass through to the authenticated creator-library route below.
app.post('/api/creators', (req, res, next) => {
  if (req.cookies.wsu_token) {
    if (getAdminPayload(req)) return next();
    res.clearCookie('wsu_token');
    return res.status(401).json({ error: 'Session expired' });
  }
  return publicFormLimiter(req, res, () => rejectBotTrap(req, res, () => handleCreatorApplication(req, res)));
});

// GET /api/leads — admin only
app.get('/api/leads', requireAuth, async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 20);
  const status = req.query.status || null;
  const search = req.query.search ? cleanText(req.query.search, 120) : '';

  try {
    return res.json(await db.listLeads({ page, limit, status, search }));
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// PATCH /api/leads/:id  — update status
app.patch('/api/leads/:id', requireAuth, async (req, res) => {
  const { status } = req.body;
  const allowed = ['new', 'contacted', 'converted', 'closed'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  try {
    await db.updateLeadStatus(req.params.id, status);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update lead' });
  }
});

// DELETE /api/leads/:id
app.delete('/api/leads/:id', requireAuth, async (req, res) => {
  try {
    await db.deleteLead(req.params.id);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete lead' });
  }
});

// GET /api/creators/leads — admin only
app.get('/api/creators/leads', requireAuth, async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 20);
  const search = cleanText(req.query.search, 120);

  try {
    res.json(await db.listCreatorLeads({ page, limit, search }));
  } catch (err) { res.status(500).json({ error: 'Failed to fetch creator leads' }); }
});

// DELETE /api/creators/leads/:id
app.delete('/api/creators/leads/:id', requireAuth, async (req, res) => {
  try {
    await db.deleteCreatorLead(req.params.id);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete creator lead' });
  }
});

// GET /api/stats
app.get('/api/stats', requireAuth, async (req, res) => {
  try {
    return res.json(await db.getStats());
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// GET /api/auth/check — verify session for admin pages
app.get('/api/auth/check', requireAuth, (req, res) => {
  return res.json({ authenticated: true, username: req.admin.username });
});

// GET /api/public/videos — serve videos directly to frontend
app.get('/api/public/videos', async (req, res) => {
  try {
    const videos = (await db.listVideos()).map(sanitizeVideoRecord);
    res.json(videos);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch videos' });
  }
});

// GET /api/videos (Admin)
app.get('/api/videos', requireAuth, async (req, res) => {
  try {
    const videos = (await db.listVideos()).map(sanitizeVideoRecord);
    res.json(videos);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch videos' });
  }
});

// POST /api/videos (Admin)
app.post('/api/videos', requireAuth, async (req, res) => {
  const v = sanitizeVideoRecord(req.body);
  if (!v.title) return res.status(400).json({ error: 'Title required' });
  if (!v.thumbnail_url && !v.video_url) return res.status(400).json({ error: 'Upload a thumbnail or video before saving' });
  try {
    const id = await db.createVideo({
      badge: v.badge,
      thumbnail_url: v.thumbnail_url,
      video_url: v.video_url,
      title: v.title,
      category: v.category || 'UGC',
      likes_count: v.likes_count || 0,
      comments_count: v.comments_count || 0,
      visit_url: v.visit_url
    });
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create video' });
  }
});

// PUT /api/videos/:id (Admin)
app.put('/api/videos/:id', requireAuth, async (req, res) => {
  const v = sanitizeVideoRecord(req.body);
  if (!v.title) return res.status(400).json({ error: 'Title required' });
  if (!v.thumbnail_url && !v.video_url) return res.status(400).json({ error: 'Upload a thumbnail or video before saving' });
  try {
    await db.updateVideo(req.params.id, {
      badge: v.badge,
      thumbnail_url: v.thumbnail_url,
      video_url: v.video_url,
      title: v.title,
      category: v.category,
      likes_count: v.likes_count,
      comments_count: v.comments_count,
      visit_url: v.visit_url
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Update failed' });
  }
});

// DELETE /api/videos/:id (Admin)
app.delete('/api/videos/:id', requireAuth, async (req, res) => {
  try {
    await db.deleteVideo(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Delete failed' });
  }
});

// ─── Creators API  ──────────────────────────────────────────────────────────

// GET /api/public/creators — serve creators directly to frontend
app.get('/api/public/creators', async (req, res) => {
  try {
    const creators = (await db.listCreators()).map(sanitizeCreatorRecord);
    res.json(creators);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch creators' });
  }
});

// GET /api/creators (Admin)
app.get('/api/creators', requireAuth, async (req, res) => {
  try {
    const creators = (await db.listCreators()).map(sanitizeCreatorRecord);
    res.json(creators);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch creators' });
  }
});

// POST /api/creators (Admin)
app.post('/api/creators', requireAuth, async (req, res) => {
  const c = sanitizeCreatorRecord(req.body);
  if (!c.name) return res.status(400).json({ error: 'Name required' });
  try {
    const id = await db.createCreator({
      name: c.name,
      category: c.category || 'Top Creators',
      platform: c.platform || 'Instagram',
      followers: c.followers || '',
      image_url: c.image_url || '',
      profile_url: c.profile_url || ''
    });
    res.json({ success: true, id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create creator' });
  }
});

// PUT /api/creators/:id (Admin)
app.put('/api/creators/:id', requireAuth, async (req, res) => {
  const c = sanitizeCreatorRecord(req.body);
  if (!c.name) return res.status(400).json({ error: 'Name required' });
  try {
    await db.updateCreator(req.params.id, {
      name: c.name,
      category: c.category,
      platform: c.platform,
      followers: c.followers,
      image_url: c.image_url,
      profile_url: c.profile_url
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Update failed' });
  }
});

// DELETE /api/creators/:id (Admin)
app.delete('/api/creators/:id', requireAuth, async (req, res) => {
  try {
    await db.deleteCreator(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Delete failed' });
  }
});

// ─── Categories & Platforms API ─────────────────────────────────────────────

app.get('/api/categories', requireAuth, async (req, res) => {
  try {
    const cats = await db.listCategories();
    res.json(cats);
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

app.post('/api/categories', requireAuth, async (req, res) => {
  try {
    const name = cleanText(req.body.name, 80);
    if (!name) return res.status(400).json({ error: 'Name required' });
    const id = await db.createCategory(name);
    res.json({ success: true, id });
  } catch (err) { res.status(500).json({ error: 'Failed or duplicate' }); }
});

app.delete('/api/categories/:id', requireAuth, async (req, res) => {
  try {
    await db.deleteCategory(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

app.get('/api/platforms', requireAuth, async (req, res) => {
  try {
    const plats = await db.listPlatforms();
    res.json(plats);
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

app.post('/api/platforms', requireAuth, async (req, res) => {
  try {
    const name = cleanText(req.body.name, 80);
    if (!name) return res.status(400).json({ error: 'Name required' });
    const id = await db.createPlatform(name);
    res.json({ success: true, id });
  } catch (err) { res.status(500).json({ error: 'Failed or duplicate' }); }
});

app.delete('/api/platforms/:id', requireAuth, async (req, res) => {
  try {
    await db.deletePlatform(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// ─── Utilities API ──────────────────────────────────────────────────────────

app.post('/api/upload', requireAuth, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  if (!isUploadedImage(req.file)) {
    removeUploadedFile(req.file);
    return res.status(400).json({ error: 'Please upload a JPG, PNG, WEBP, or GIF image.' });
  }

  const imageUrl = `/uploads/${req.file.filename}`;
  res.json({ success: true, url: imageUrl });
});

app.post('/api/upload-video', requireAuth, upload.single('video'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No video uploaded' });
  if (!isUploadedVideo(req.file)) {
    removeUploadedFile(req.file);
    return res.status(400).json({ error: 'Please upload an MP4, MOV, WEBM, or M4V video.' });
  }

  res.json({ success: true, url: `/uploads/${req.file.filename}` });
});

app.post('/api/scrape-profile', requireAuth, async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL required' });
  try {
    const safeUrl = await assertSafeExternalUrl(url);
    const isInstagram = /instagram\.com/i.test(safeUrl);

    const headers = {
      'User-Agent': isInstagram 
        ? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        : 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    };

    let imageCandidates = [];
    let lastError = null;

    if (isInstagram) {
      try {
        imageCandidates = await collectInstagramWebProfileImageCandidates(extractInstagramUsername(safeUrl), safeUrl);
      } catch (igApiErr) {
        lastError = igApiErr;
      }
    }

    if (!imageCandidates.length) {
      const response = await safeAxiosGet(safeUrl, {
        headers,
        timeout: 10000
      });

      const html = String(response.data || '');
      const $ = cheerio.load(html);
      imageCandidates = collectProfileImageCandidates($, html, safeUrl, isInstagram);
    }

    for (const imageUrl of imageCandidates) {
      try {
        const localUrl = await persistRemoteProfileImage(imageUrl, safeUrl, isInstagram ? 'ig-profile' : 'profile');
        return res.json({ success: true, url: localUrl });
      } catch (downloadErr) {
        lastError = downloadErr;
      }
    }

    if (lastError) console.warn('Profile image candidates failed:', lastError.message);
    res.status(404).json({ error: 'Profile image not found. The account might be private, protected, or blocking image downloads.' });
  } catch (err) {
    console.error('Scrape error:', err.message);
    res.status(500).json({ error: 'Failed to fetch. Platform may be blocking automated requests.' });
  }
});

// GET /api/proxy-image?url=...
// Proxies external images to bypass hotlink protection/CORS
app.get('/api/proxy-image', proxyImageLimiter, async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).send('URL required');
  
  try {
    const response = await safeAxiosGet(url, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.instagram.com/'
      },
      timeout: 10000,
      maxContentLength: 10 * 1024 * 1024
    });

    const contentType = String(response.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
    const imageBuffer = Buffer.from(response.data || []);
    if (!REMOTE_IMAGE_EXTENSIONS.has(contentType) || !hasImageBufferSignature(imageBuffer.subarray(0, 64), contentType)) {
      return res.status(400).send('URL did not return a supported image');
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24h
    res.send(imageBuffer);
  } catch (err) {
    if (/Private hosts|Only http|Authenticated URLs|redirected too many times/i.test(err.message || '')) {
      return res.status(400).send('URL is not allowed');
    }
    console.error('Proxy error:', err.message);
    return res.status(500).send('Failed to proxy image');
  }
});

// ─── Blogs API ──────────────────────────────────────────────────────────────
app.get('/api/blogs', async (req, res) => {
  try {
    const blogs = (await db.listBlogs()).map(sanitizeBlogRecord);
    res.json(blogs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/blogs/:id', async (req, res) => {
  try {
    const blog = await db.getBlogById(req.params.id);
    if (!blog) return res.status(404).json({ error: 'Not found' });
    res.json(sanitizeBlogRecord(blog));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/blogs', requireAuth, async (req, res) => {
  const payload = sanitizeBlogRecord(req.body);
  if (!payload.title) return res.status(400).json({ error: 'Title required' });
  try {
    const id = await db.createBlog({
      title: payload.title,
      image_url: payload.image_url,
      excerpt: payload.excerpt,
      body: payload.body,
      link_url: payload.link_url,
      date_text: payload.date_text,
      is_featured: payload.is_featured,
      order_idx: payload.order_idx
    });

    res.json({ success: true, id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/blogs/:id', requireAuth, async (req, res) => {
  const payload = sanitizeBlogRecord(req.body);
  const id = req.params.id;
  if (!payload.title) return res.status(400).json({ error: 'Title required' });
  
  try {
    const updated = await db.updateBlog(id, {
      title: payload.title,
      image_url: payload.image_url,
      excerpt: payload.excerpt,
      body: payload.body,
      link_url: payload.link_url,
      date_text: payload.date_text,
      is_featured: payload.is_featured,
      order_idx: payload.order_idx
    });
    if (!updated) return res.status(404).json({ error: 'Not found' });

    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/blogs/:id', requireAuth, async (req, res) => {
  try {
    await db.deleteBlog(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Case Studies API ───────────────────────────────────────────────────────
app.get('/api/case-studies', async (req, res) => {
  try {
    const cs = (await db.listCaseStudies()).map(sanitizeCaseStudyRecord);
    res.json(cs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/case-studies/:id', async (req, res) => {
  try {
    const cs = await db.getCaseStudyById(req.params.id);
    if (!cs) return res.status(404).json({ error: 'Not found' });
    res.json(sanitizeCaseStudyRecord(cs));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/case-studies', requireAuth, async (req, res) => {
  const payload = sanitizeCaseStudyRecord(req.body);
  if (!payload.title) return res.status(400).json({ error: 'Title required' });
  try {
    const id = await db.createCaseStudy({
      title: payload.title,
      image_url: payload.image_url,
      link_url: payload.link_url,
      is_wide: payload.is_wide,
      order_idx: payload.order_idx,
      excerpt: payload.excerpt,
      body: payload.body
    });

    res.json({ success: true, id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/case-studies/:id', requireAuth, async (req, res) => {
  const payload = sanitizeCaseStudyRecord(req.body);
  const id = req.params.id;
  if (!payload.title) return res.status(400).json({ error: 'Title required' });
  
  try {
    const updated = await db.updateCaseStudy(id, {
      title: payload.title,
      image_url: payload.image_url,
      link_url: payload.link_url,
      is_wide: payload.is_wide,
      order_idx: payload.order_idx,
      excerpt: payload.excerpt,
      body: payload.body
    });
    if (!updated) return res.status(404).json({ error: 'Not found' });

    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/case-studies/:id', requireAuth, async (req, res) => {
  try {
    await db.deleteCaseStudy(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Service Pages API ──────────────────────────────────────────────────────
app.get('/api/services', async (req, res) => {
  try {
    const services = (await db.listPublicServices()).map(sanitizeServiceRecord);
    res.json(services);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/services/:slug', async (req, res) => {
  try {
    const service = await db.getPublicServiceBySlug(req.params.slug);

    if (!service) return res.status(404).json({ error: 'Not found' });
    res.json(sanitizeServiceRecord(service));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/services', requireAuth, async (req, res) => {
  try {
    const services = (await db.listAdminServices()).map(sanitizeServiceRecord);
    res.json(services);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/services/:id', requireAuth, async (req, res) => {
  const rawBody = { ...req.body };
  const normalizedHowSteps = normalizeServiceHowSteps(rawBody.how_steps);
  if (normalizedHowSteps.length) {
    rawBody.how_we_do_it = buildServiceHowHtmlFromSteps(normalizedHowSteps);
  }

  const payload = sanitizeServiceRecord(rawBody);

  if (!payload.title || !payload.hero_title) {
    return res.status(400).json({ error: 'Title and hero title are required' });
  }

  try {
    const updatedService = await db.updateService(req.params.id, {
      title: payload.title,
      icon: payload.icon,
      hero_title: payload.hero_title,
      hero_subheading: payload.hero_subheading,
      hero_gallery_images: JSON.stringify(payload.hero_gallery_images || []),
      how_image_url: payload.how_image_url,
      how_heading: payload.how_heading,
      how_subtitle: payload.how_subtitle,
      diff_heading: payload.diff_heading,
      diff_subtitle: payload.diff_subtitle,
      use_cases_subtitle: payload.use_cases_subtitle,
      faq_subtitle: payload.faq_subtitle,
      cta_subtitle: payload.cta_subtitle,
      how_steps_json: payload.how_steps_json,
      how_we_do_it: payload.how_we_do_it,
      what_makes_us_different: payload.what_makes_us_different,
      use_cases_title: payload.use_cases_title,
      use_cases: payload.use_cases,
      cta: payload.cta,
      sort_order: payload.sort_order,
      is_active: payload.is_active
    });
    if (!updatedService) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true, service: sanitizeServiceRecord(updatedService) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ error: 'Unexpected upload field. Please refresh the admin page and try again.' });
    }
    return res.status(400).json({ error: cleanText(err.message, 200) || 'Upload failed' });
  }
  if (err && /(Only JPG|File type not supported)/i.test(err.message || '')) {
    return res.status(400).json({ error: cleanText(err.message, 200) || 'File type not supported.' });
  }
  return next(err);
});


// ─── Catch-all ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ─── Start Server ───────────────────────────────────────────────────────────
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n🚀 WeSocializeU server running at http://localhost:${PORT}`);
    console.log(`   Admin panel: http://localhost:${PORT}/admin/login.html`);
    console.log(`   Homepage:    http://localhost:${PORT}/\n`);
  });
}

module.exports = app;
