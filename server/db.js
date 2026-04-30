'use strict';
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const dotenv = require('dotenv');
const servicePages = require('../service_pages_data');
dotenv.config();

const DB_PATH = path.join(__dirname, 'wesocializeu.db');
const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS leads (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    name      TEXT    NOT NULL,
    email     TEXT    NOT NULL,
    phone     TEXT,
    service   TEXT,
    message   TEXT,
    status    TEXT    NOT NULL DEFAULT 'new',
    created_at TEXT   NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS admins (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS ugc_videos (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    badge         TEXT,
    thumbnail_url TEXT,
    video_url     TEXT,
    title         TEXT    NOT NULL,
    category      TEXT    DEFAULT 'UGC',
    likes_count   INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    visit_url     TEXT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS creators (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    category      TEXT NOT NULL DEFAULT 'Top Creators',
    platform      TEXT NOT NULL DEFAULT 'Instagram',
    followers     TEXT,
    image_url     TEXT,
    profile_url   TEXT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS creator_categories (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS creator_leads (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    email         TEXT NOT NULL,
    phone         TEXT,
    dob           TEXT,
    gender        TEXT,
    pincode       TEXT,
    category      TEXT,
    language      TEXT,
    has_instagram TEXT,
    has_youtube   TEXT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS creator_platforms (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS blogs (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    title         TEXT NOT NULL,
    image_url     TEXT,
    excerpt       TEXT,
    link_url      TEXT,
    date_text     TEXT,
    is_featured   INTEGER DEFAULT 0,
    order_idx     INTEGER DEFAULT 99,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS case_studies (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    title         TEXT NOT NULL,
    image_url     TEXT,
    link_url      TEXT,
    is_wide       INTEGER DEFAULT 0,
    order_idx     INTEGER DEFAULT 99,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS service_pages (
    id                       INTEGER PRIMARY KEY AUTOINCREMENT,
    slug                     TEXT NOT NULL UNIQUE,
    title                    TEXT NOT NULL,
    icon                     TEXT,
    hero_title               TEXT NOT NULL,
    hero_subheading          TEXT,
    hero_gallery_images      TEXT DEFAULT '[]',
    how_image_url            TEXT DEFAULT '',
    what_heading             TEXT DEFAULT '',
    how_heading              TEXT DEFAULT '',
    how_subtitle             TEXT DEFAULT '',
    diff_heading             TEXT DEFAULT '',
    diff_subtitle            TEXT DEFAULT '',
    use_cases_subtitle       TEXT DEFAULT '',
    faq_subtitle             TEXT DEFAULT '',
    cta_subtitle             TEXT DEFAULT '',
    what_we_do               TEXT DEFAULT '',
    how_we_do_it             TEXT DEFAULT '',
    what_makes_us_different  TEXT DEFAULT '',
    use_cases_title          TEXT DEFAULT '',
    use_cases                TEXT DEFAULT '',
    cta                      TEXT DEFAULT '',
    sort_order               INTEGER DEFAULT 99,
    is_active                INTEGER DEFAULT 1,
    created_at               TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

function ensureColumn(tableName, columnName, columnDef) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  if (!columns.some((column) => column.name === columnName)) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDef}`);
  }
}

ensureColumn('blogs', 'body', 'TEXT DEFAULT \'\'');
ensureColumn('leads', 'company', 'TEXT DEFAULT \'\'');
ensureColumn('leads', 'website', 'TEXT DEFAULT \'\'');
ensureColumn('creator_leads', 'instagram_url', 'TEXT DEFAULT \'\'');
ensureColumn('creator_leads', 'youtube_url', 'TEXT DEFAULT \'\'');
ensureColumn('case_studies', 'excerpt', 'TEXT DEFAULT \'\'');
ensureColumn('case_studies', 'body', 'TEXT DEFAULT \'\'');
ensureColumn('service_pages', 'is_customized', 'INTEGER NOT NULL DEFAULT 0');
ensureColumn('service_pages', 'hero_gallery_images', 'TEXT DEFAULT \'[]\'');
ensureColumn('service_pages', 'how_image_url', 'TEXT DEFAULT \'\'');
ensureColumn('service_pages', 'how_steps_json', 'TEXT DEFAULT \'[]\'');
ensureColumn('service_pages', 'what_heading', 'TEXT DEFAULT \'\'');
ensureColumn('service_pages', 'how_heading', 'TEXT DEFAULT \'\'');
ensureColumn('service_pages', 'how_subtitle', 'TEXT DEFAULT \'\'');
ensureColumn('service_pages', 'diff_heading', 'TEXT DEFAULT \'\'');
ensureColumn('service_pages', 'diff_subtitle', 'TEXT DEFAULT \'\'');
ensureColumn('service_pages', 'use_cases_subtitle', 'TEXT DEFAULT \'\'');
ensureColumn('service_pages', 'faq_subtitle', 'TEXT DEFAULT \'\'');
ensureColumn('service_pages', 'cta_subtitle', 'TEXT DEFAULT \'\'');

// Seed basic categories and platforms
try {
  db.prepare("INSERT OR IGNORE INTO creator_categories (name) VALUES ('Top Creators'), ('Rising Stars'), ('Micro Influencers')").run();
  db.prepare("INSERT OR IGNORE INTO creator_platforms (name) VALUES ('Instagram'), ('YouTube'), ('TikTok'), ('Twitter/X')").run();
} catch (e) {
  console.log('[DB] Seeding categories failed', e);
}

try {
  db.prepare(`
    UPDATE service_pages
    SET is_customized = 0
    WHERE is_customized IS NULL
  `).run();

  const upsertService = db.prepare(`
    INSERT INTO service_pages (
      slug, title, icon, hero_title, hero_subheading, what_we_do, how_we_do_it,
      what_makes_us_different, use_cases_title, use_cases, cta, sort_order, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    ON CONFLICT(slug) DO UPDATE SET
      title = excluded.title,
      icon = excluded.icon,
      hero_title = excluded.hero_title,
      hero_subheading = excluded.hero_subheading,
      what_we_do = excluded.what_we_do,
      how_we_do_it = excluded.how_we_do_it,
      what_makes_us_different = excluded.what_makes_us_different,
      use_cases_title = excluded.use_cases_title,
      use_cases = excluded.use_cases,
      cta = excluded.cta,
      sort_order = excluded.sort_order,
      is_active = excluded.is_active
    WHERE service_pages.is_customized = 0
  `);

  servicePages.forEach((service) => {
    upsertService.run(
      service.slug,
      service.title,
      service.icon,
      service.hero_title,
      service.hero_subheading || '',
      service.what_we_do || '',
      service.how_we_do_it || '',
      service.what_makes_us_different || '',
      service.use_cases_title || '',
      service.use_cases || '',
      service.cta || '',
      service.sort_order || 99
    );
  });
} catch (e) {
  console.log('[DB] Seeding service pages failed', e);
}

// Seed or rotate the configured admin user.
const configuredAdminUsername = process.env.ADMIN_USERNAME || 'admin';
const configuredAdminPassword = process.env.ADMIN_PASSWORD;
const seedAdminPassword = configuredAdminPassword || 'WeSocialize@2026';
const existingAdmin = db.prepare('SELECT id, password_hash FROM admins WHERE username = ?').get(configuredAdminUsername);
if (!existingAdmin) {
  const hash = bcrypt.hashSync(seedAdminPassword, 12);
  db.prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)').run(
    configuredAdminUsername,
    hash
  );
  console.log('[DB] Admin user created.');
} else if (configuredAdminPassword && !bcrypt.compareSync(configuredAdminPassword, existingAdmin.password_hash)) {
  const hash = bcrypt.hashSync(configuredAdminPassword, 12);
  db.prepare('UPDATE admins SET password_hash = ? WHERE id = ?').run(hash, existingAdmin.id);
  console.log('[DB] Admin password updated from environment.');
}

module.exports = db;
