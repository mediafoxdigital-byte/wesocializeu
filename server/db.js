'use strict';

const path = require('path');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const servicePages = require('../service_pages_data');
const fallbackContent = require('./fallback-content');

dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config();

const DB_PATH = path.join(__dirname, 'wesocializeu.db');
const DEFAULT_ADMIN_PASSWORD = 'WeSocialize@2026';
const configuredAdminUsername = process.env.ADMIN_USERNAME || 'admin';
const configuredAdminPassword = process.env.ADMIN_PASSWORD;
const seedAdminPassword = configuredAdminPassword || DEFAULT_ADMIN_PASSWORD;
const supabaseUrl = cleanEnv(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL);
const supabaseKey = cleanEnv(
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY
);

const adapter = supabaseUrl && supabaseKey
  ? createSupabaseAdapter(supabaseUrl, supabaseKey)
  : createSqliteAdapter();

let initializationError = null;
const ready = seedInitialData()
  .catch((err) => {
    initializationError = err;
    console.error(`[DB] ${adapter.mode} initialization failed:`, err.message);
  });

function cleanEnv(value) {
  const text = String(value || '').trim();
  return text && !/^your_|^replace_/i.test(text) ? text : '';
}

function assertIdentifier(value) {
  const name = String(value || '');
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
    throw new Error(`Invalid SQL identifier: ${name}`);
  }
  return name;
}

function selectedColumns(columns) {
  if (!columns || columns === '*') return '*';
  if (Array.isArray(columns)) return columns.map(assertIdentifier).join(', ');
  return String(columns)
    .split(',')
    .map((column) => assertIdentifier(column.trim()))
    .join(', ');
}

function sqlWhere(options = {}) {
  const params = [];
  const parts = [];

  (options.filters || []).forEach((filter) => {
    const column = assertIdentifier(filter.column);
    if (filter.op === 'eq') {
      parts.push(`${column} = ?`);
      params.push(filter.value);
    } else if (filter.op === 'gte') {
      parts.push(`${column} >= ?`);
      params.push(filter.value);
    } else if (filter.op === 'ilike') {
      parts.push(`LOWER(CAST(${column} AS TEXT)) LIKE LOWER(?)`);
      params.push(filter.value);
    } else if (filter.op === 'is' && filter.value === null) {
      parts.push(`${column} IS NULL`);
    } else {
      throw new Error(`Unsupported filter operator: ${filter.op}`);
    }
  });

  if (options.or && options.or.length) {
    const orParts = options.or.map((filter) => {
      const column = assertIdentifier(filter.column);
      if (filter.op !== 'ilike') throw new Error(`Unsupported OR operator: ${filter.op}`);
      params.push(filter.value);
      return `LOWER(CAST(${column} AS TEXT)) LIKE LOWER(?)`;
    });
    parts.push(`(${orParts.join(' OR ')})`);
  }

  return {
    sql: parts.length ? ` WHERE ${parts.join(' AND ')}` : '',
    params
  };
}

function sqlOrder(order = []) {
  if (!order.length) return '';
  return ` ORDER BY ${order.map((item) => {
    const direction = item.ascending === false ? 'DESC' : 'ASC';
    return `${assertIdentifier(item.column)} ${direction}`;
  }).join(', ')}`;
}

function normalizePayload(payload) {
  return Object.fromEntries(
    Object.entries(payload || {}).filter(([, value]) => value !== undefined)
  );
}

function createSqliteAdapter() {
  const Database = require('better-sqlite3');
  const db = new Database(DB_PATH);

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

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

  [
    ['blogs', 'body', 'TEXT DEFAULT \'\''],
    ['leads', 'company', 'TEXT DEFAULT \'\''],
    ['leads', 'website', 'TEXT DEFAULT \'\''],
    ['creator_leads', 'instagram_url', 'TEXT DEFAULT \'\''],
    ['creator_leads', 'youtube_url', 'TEXT DEFAULT \'\''],
    ['case_studies', 'excerpt', 'TEXT DEFAULT \'\''],
    ['case_studies', 'body', 'TEXT DEFAULT \'\''],
    ['service_pages', 'is_customized', 'INTEGER NOT NULL DEFAULT 0'],
    ['service_pages', 'hero_gallery_images', 'TEXT DEFAULT \'[]\''],
    ['service_pages', 'how_image_url', 'TEXT DEFAULT \'\''],
    ['service_pages', 'how_steps_json', 'TEXT DEFAULT \'[]\''],
    ['service_pages', 'what_heading', 'TEXT DEFAULT \'\''],
    ['service_pages', 'how_heading', 'TEXT DEFAULT \'\''],
    ['service_pages', 'how_subtitle', 'TEXT DEFAULT \'\''],
    ['service_pages', 'diff_heading', 'TEXT DEFAULT \'\''],
    ['service_pages', 'diff_subtitle', 'TEXT DEFAULT \'\''],
    ['service_pages', 'use_cases_subtitle', 'TEXT DEFAULT \'\''],
    ['service_pages', 'faq_subtitle', 'TEXT DEFAULT \'\''],
    ['service_pages', 'cta_subtitle', 'TEXT DEFAULT \'\'']
  ].forEach(([tableName, columnName, columnDef]) => {
    const columns = db.prepare(`PRAGMA table_info(${assertIdentifier(tableName)})`).all();
    if (!columns.some((column) => column.name === columnName)) {
      db.exec(`ALTER TABLE ${assertIdentifier(tableName)} ADD COLUMN ${assertIdentifier(columnName)} ${columnDef}`);
    }
  });

  return {
    mode: 'sqlite',

    async select(table, options = {}) {
      const tableName = assertIdentifier(table);
      const columns = selectedColumns(options.columns);
      const where = sqlWhere(options);
      const order = sqlOrder(options.order || []);
      const limit = Number.isFinite(options.limit) ? ' LIMIT ?' : '';
      const offset = Number.isFinite(options.offset) ? ' OFFSET ?' : '';
      const params = where.params.slice();

      if (limit) params.push(options.limit);
      if (offset) params.push(options.offset);

      const data = db.prepare(`SELECT ${columns} FROM ${tableName}${where.sql}${order}${limit}${offset}`).all(...params);
      const count = options.count
        ? db.prepare(`SELECT COUNT(*) as c FROM ${tableName}${where.sql}`).get(...where.params).c
        : null;

      return { data, count };
    },

    async single(table, options = {}) {
      const result = await this.select(table, { ...options, limit: 1, offset: 0 });
      return result.data[0] || null;
    },

    async insert(table, payload) {
      const tableName = assertIdentifier(table);
      const record = normalizePayload(payload);
      const columns = Object.keys(record).map(assertIdentifier);
      const placeholders = columns.map(() => '?').join(', ');
      const values = Object.keys(record).map((key) => record[key]);
      const info = db.prepare(`INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`).run(...values);
      return { id: Number(info.lastInsertRowid), ...record };
    },

    async updateWhere(table, payload, options = {}) {
      const tableName = assertIdentifier(table);
      const record = normalizePayload(payload);
      const columns = Object.keys(record);
      if (!columns.length) return [];

      const setSql = columns.map((column) => `${assertIdentifier(column)} = ?`).join(', ');
      const where = sqlWhere(options);
      db.prepare(`UPDATE ${tableName} SET ${setSql}${where.sql}`).run(
        ...columns.map((column) => record[column]),
        ...where.params
      );
      return (await this.select(table, options)).data;
    },

    async updateById(table, id, payload) {
      await this.updateWhere(table, payload, { filters: [{ column: 'id', op: 'eq', value: id }] });
      return this.single(table, { filters: [{ column: 'id', op: 'eq', value: id }] });
    },

    async deleteWhere(table, options = {}) {
      const tableName = assertIdentifier(table);
      const where = sqlWhere(options);
      db.prepare(`DELETE FROM ${tableName}${where.sql}`).run(...where.params);
    },

    async deleteById(table, id) {
      await this.deleteWhere(table, { filters: [{ column: 'id', op: 'eq', value: id }] });
    }
  };
}

function createSupabaseAdapter(rawUrl, key) {
  const restUrl = `${rawUrl.replace(/\/+$/, '')}/rest/v1`;

  async function request(table, options = {}) {
    const tableName = assertIdentifier(table);
    const params = options.params ? `?${options.params.toString()}` : '';
    const response = await fetch(`${restUrl}/${tableName}${params}`, {
      method: options.method || 'GET',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {})
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text ? { message: text } : null;
    }

    if (!response.ok) {
      const message = data && (data.message || data.error || data.hint);
      throw new Error(`Supabase ${response.status}: ${message || response.statusText}`);
    }

    return { data, headers: response.headers };
  }

  function addFilters(params, options = {}) {
    (options.filters || []).forEach((filter) => {
      const column = assertIdentifier(filter.column);
      if (filter.op === 'eq') {
        params.append(column, `eq.${filter.value}`);
      } else if (filter.op === 'gte') {
        params.append(column, `gte.${filter.value}`);
      } else if (filter.op === 'ilike') {
        params.append(column, `ilike.${String(filter.value).replace(/%/g, '*')}`);
      } else if (filter.op === 'is' && filter.value === null) {
        params.append(column, 'is.null');
      } else {
        throw new Error(`Unsupported filter operator: ${filter.op}`);
      }
    });

    if (options.or && options.or.length) {
      const parts = options.or.map((filter) => {
        if (filter.op !== 'ilike') throw new Error(`Unsupported OR operator: ${filter.op}`);
        return `${assertIdentifier(filter.column)}.ilike.${String(filter.value).replace(/%/g, '*')}`;
      });
      params.set('or', `(${parts.join(',')})`);
    }
  }

  function addOrdering(params, order = []) {
    if (!order.length) return;
    params.set('order', order.map((item) => (
      `${assertIdentifier(item.column)}.${item.ascending === false ? 'desc' : 'asc'}`
    )).join(','));
  }

  function parseCount(headers) {
    const range = headers.get('content-range') || '';
    const match = range.match(/\/(\d+|\*)$/);
    return match && match[1] !== '*' ? Number(match[1]) : null;
  }

  return {
    mode: 'supabase',

    async select(table, options = {}) {
      const params = new URLSearchParams();
      params.set('select', selectedColumns(options.columns).replace(/\s+/g, ''));
      addFilters(params, options);
      addOrdering(params, options.order || []);
      if (Number.isFinite(options.limit)) params.set('limit', String(options.limit));
      if (Number.isFinite(options.offset)) params.set('offset', String(options.offset));

      const response = await request(table, {
        params,
        headers: options.count ? { Prefer: 'count=exact' } : {}
      });

      return {
        data: Array.isArray(response.data) ? response.data : [],
        count: options.count ? parseCount(response.headers) : null
      };
    },

    async single(table, options = {}) {
      const result = await this.select(table, { ...options, limit: 1, offset: 0 });
      return result.data[0] || null;
    },

    async insert(table, payload) {
      const response = await request(table, {
        method: 'POST',
        body: normalizePayload(payload),
        headers: { Prefer: 'return=representation' }
      });
      return Array.isArray(response.data) ? response.data[0] : response.data;
    },

    async updateWhere(table, payload, options = {}) {
      const params = new URLSearchParams();
      addFilters(params, options);
      const response = await request(table, {
        method: 'PATCH',
        params,
        body: normalizePayload(payload),
        headers: { Prefer: 'return=representation' }
      });
      return Array.isArray(response.data) ? response.data : [];
    },

    async updateById(table, id, payload) {
      const rows = await this.updateWhere(table, payload, { filters: [{ column: 'id', op: 'eq', value: id }] });
      return rows[0] || this.single(table, { filters: [{ column: 'id', op: 'eq', value: id }] });
    },

    async deleteWhere(table, options = {}) {
      const params = new URLSearchParams();
      addFilters(params, options);
      await request(table, {
        method: 'DELETE',
        params,
        headers: { Prefer: 'return=minimal' }
      });
    },

    async deleteById(table, id) {
      await this.deleteWhere(table, { filters: [{ column: 'id', op: 'eq', value: id }] });
    }
  };
}

async function seedInitialData() {
  await seedLookup('creator_categories', ['Top Creators', 'Rising Stars', 'Micro Influencers']);
  await seedLookup('creator_platforms', ['Instagram', 'YouTube', 'TikTok', 'Twitter/X']);
  await seedServices();
  await seedAdmin();
  console.log(`[DB] Using ${adapter.mode}${adapter.mode === 'supabase' ? ` at ${supabaseUrl}` : ` at ${DB_PATH}`}.`);
}

async function seedLookup(table, names) {
  for (const name of names) {
    try {
      const existing = await adapter.single(table, { filters: [{ column: 'name', op: 'eq', value: name }] });
      if (!existing) await adapter.insert(table, { name });
    } catch (err) {
      console.warn(`[DB] Could not seed ${table}:`, err.message);
      return;
    }
  }
}

async function seedServices() {
  try {
    await adapter.updateWhere('service_pages', { is_customized: 0 }, {
      filters: [{ column: 'is_customized', op: 'is', value: null }]
    });
  } catch {
    // Older Supabase tables may not allow "is null" through this generic adapter.
  }

  for (const service of servicePages) {
    const payload = {
      slug: service.slug,
      title: service.title,
      icon: service.icon,
      hero_title: service.hero_title,
      hero_subheading: service.hero_subheading || '',
      what_we_do: service.what_we_do || '',
      how_we_do_it: service.how_we_do_it || '',
      what_makes_us_different: service.what_makes_us_different || '',
      use_cases_title: service.use_cases_title || '',
      use_cases: service.use_cases || '',
      cta: service.cta || '',
      sort_order: service.sort_order || 99,
      is_active: 1
    };

    try {
      const existing = await adapter.single('service_pages', {
        filters: [{ column: 'slug', op: 'eq', value: service.slug }]
      });

      if (!existing) {
        await adapter.insert('service_pages', payload);
      } else if (!Number(existing.is_customized || 0)) {
        await adapter.updateById('service_pages', existing.id, payload);
      }
    } catch (err) {
      console.warn('[DB] Could not seed service pages:', err.message);
      return;
    }
  }
}

async function seedAdmin() {
  try {
    const existingAdmin = await findAdminByUsernameInternal(configuredAdminUsername);
    if (!existingAdmin) {
      const hash = bcrypt.hashSync(seedAdminPassword, 12);
      await adapter.insert('admins', {
        username: configuredAdminUsername,
        password_hash: hash
      });
      console.log('[DB] Admin user created.');
      return;
    }

    if (configuredAdminPassword && !bcrypt.compareSync(configuredAdminPassword, existingAdmin.password_hash)) {
      const hash = bcrypt.hashSync(configuredAdminPassword, 12);
      await adapter.updateById('admins', existingAdmin.id, { password_hash: hash });
      console.log('[DB] Admin password updated from environment.');
    }
  } catch (err) {
    if (adapter.mode === 'supabase') {
      console.warn('[DB] Could not seed admin user:', err.message);
      return;
    }
    throw err;
  }
}

async function ensureReady() {
  await ready;
  if (initializationError) throw initializationError;
}

async function findAdminByUsernameInternal(username) {
  return adapter.single('admins', {
    filters: [{ column: 'username', op: 'eq', value: username }]
  });
}

function dateKey(value) {
  const match = String(value || '').match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : '';
}

function utcDateKey(daysAgo = 0) {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

function likeSearch(value) {
  return `%${String(value || '').trim()}%`;
}

function fallbackServiceRows() {
  return servicePages
    .map((service, index) => ({
      id: index + 1,
      slug: service.slug,
      title: service.title,
      icon: service.icon || '',
      hero_title: service.hero_title,
      hero_subheading: service.hero_subheading || '',
      hero_gallery_images: '[]',
      how_image_url: '',
      what_heading: '',
      how_heading: '',
      how_subtitle: '',
      diff_heading: '',
      diff_subtitle: '',
      use_cases_subtitle: '',
      faq_subtitle: '',
      cta_subtitle: '',
      what_we_do: service.what_we_do || '',
      how_we_do_it: service.how_we_do_it || '',
      how_steps_json: '[]',
      what_makes_us_different: service.what_makes_us_different || '',
      use_cases_title: service.use_cases_title || '',
      use_cases: service.use_cases || '',
      cta: service.cta || '',
      sort_order: service.sort_order || index + 1,
      is_active: 1,
      is_customized: 0,
      created_at: ''
    }))
    .sort((a, b) => Number(a.sort_order || 99) - Number(b.sort_order || 99) || Number(a.id) - Number(b.id));
}

function useFallbackRows(rows, fallbackRows, label) {
  if (Array.isArray(rows) && rows.length) return rows;
  if (adapter.mode !== 'supabase') return rows;
  if (label) console.warn(`[DB] Supabase returned no ${label}; using bundled fallback content.`);
  return fallbackRows;
}

async function selectRowsWithFallback(table, options, fallbackRows, label) {
  try {
    const rows = (await adapter.select(table, options)).data;
    return useFallbackRows(rows, fallbackRows, label);
  } catch (err) {
    if (adapter.mode !== 'supabase') throw err;
    console.warn(`[DB] Could not fetch ${label || table} from Supabase:`, err.message);
    return fallbackRows;
  }
}

async function singleWithFallback(table, options, fallbackRows, predicate, label) {
  try {
    const row = await adapter.single(table, options);
    if (row || adapter.mode !== 'supabase') return row;
  } catch (err) {
    if (adapter.mode !== 'supabase') throw err;
    console.warn(`[DB] Could not fetch ${label || table} from Supabase:`, err.message);
  }
  return fallbackRows.find(predicate) || null;
}

async function countRows(table, options = {}) {
  return (await adapter.select(table, { ...options, columns: 'id', count: true, limit: 1, offset: 0 })).count || 0;
}

async function compactOrdered(table, order = [{ column: 'order_idx', ascending: true }, { column: 'id', ascending: true }]) {
  const rows = (await adapter.select(table, { columns: 'id', order })).data;
  for (let index = 0; index < rows.length; index += 1) {
    await adapter.updateById(table, rows[index].id, { order_idx: index + 1 });
  }
}

async function createOrdered(table, payload) {
  const existing = (await adapter.select(table, {
    columns: 'id, order_idx',
    order: [{ column: 'order_idx', ascending: true }, { column: 'id', ascending: false }]
  })).data;
  const requestedSlot = Math.min(existing.length + 1, Math.max(1, parseInt(payload.order_idx, 10) || existing.length + 1));

  for (const row of existing.filter((item) => Number(item.order_idx) >= requestedSlot)) {
    await adapter.updateById(table, row.id, { order_idx: Number(row.order_idx || 0) + 1 });
  }

  const created = await adapter.insert(table, { ...payload, order_idx: requestedSlot });
  await compactOrdered(table, [{ column: 'order_idx', ascending: true }, { column: 'id', ascending: false }]);
  return created;
}

async function updateOrdered(table, id, payload) {
  const oldRow = await adapter.single(table, {
    columns: 'id, order_idx',
    filters: [{ column: 'id', op: 'eq', value: id }]
  });
  if (!oldRow) return null;

  const count = await countRows(table);
  const oldIdx = Number(oldRow.order_idx || count);
  const newIdx = Math.min(count, Math.max(1, parseInt(payload.order_idx, 10) || oldIdx));

  if (newIdx !== oldIdx) {
    const rows = (await adapter.select(table, { columns: 'id, order_idx' })).data;
    for (const row of rows) {
      const current = Number(row.order_idx || 0);
      if (newIdx < oldIdx && current >= newIdx && current < oldIdx) {
        await adapter.updateById(table, row.id, { order_idx: current + 1 });
      } else if (newIdx > oldIdx && current > oldIdx && current <= newIdx) {
        await adapter.updateById(table, row.id, { order_idx: current - 1 });
      }
    }
  }

  const updated = await adapter.updateById(table, id, { ...payload, order_idx: newIdx });
  await compactOrdered(table, [{ column: 'order_idx', ascending: true }, { column: 'id', ascending: false }]);
  return updated;
}

async function deleteOrdered(table, id) {
  await adapter.deleteById(table, id);
  await compactOrdered(table);
}

module.exports = {
  ready,
  mode: adapter.mode,

  async findAdminByUsername(username) {
    await ensureReady();
    return findAdminByUsernameInternal(username);
  },

  async createLead(payload) {
    await ensureReady();
    const row = await adapter.insert('leads', payload);
    return row.id;
  },

  async listLeads({ page = 1, limit = 20, status = '', search = '' } = {}) {
    await ensureReady();
    const filters = [];
    if (status) filters.push({ column: 'status', op: 'eq', value: status });
    const or = search
      ? ['name', 'email', 'phone', 'company', 'website'].map((column) => ({ column, op: 'ilike', value: likeSearch(search) }))
      : [];
    const offset = (page - 1) * limit;
    const result = await adapter.select('leads', {
      filters,
      or,
      order: [{ column: 'created_at', ascending: false }],
      limit,
      offset,
      count: true
    });
    return { leads: result.data, total: result.count || 0, page, limit };
  },

  async updateLeadStatus(id, status) {
    await ensureReady();
    await adapter.updateById('leads', id, { status });
  },

  async deleteLead(id) {
    await ensureReady();
    await adapter.deleteById('leads', id);
  },

  async createCreatorLead(payload) {
    await ensureReady();
    const row = await adapter.insert('creator_leads', payload);
    return row.id;
  },

  async listCreatorLeads({ page = 1, limit = 20, search = '' } = {}) {
    await ensureReady();
    const offset = (page - 1) * limit;
    const or = search
      ? ['name', 'email', 'phone', 'category'].map((column) => ({ column, op: 'ilike', value: likeSearch(search) }))
      : [];
    const result = await adapter.select('creator_leads', {
      or,
      order: [{ column: 'id', ascending: false }],
      limit,
      offset,
      count: true
    });
    return {
      data: result.data,
      pagination: {
        total: result.count || 0,
        page,
        limit,
        totalPages: Math.ceil((result.count || 0) / limit)
      }
    };
  },

  async deleteCreatorLead(id) {
    await ensureReady();
    await adapter.deleteById('creator_leads', id);
  },

  async getStats() {
    await ensureReady();
    const todayKey = utcDateKey(0);
    const firstChartDay = utcDateKey(6);
    const [
      brandTotal,
      creatorTotal,
      newLeads,
      converted,
      brandToday,
      creatorToday,
      recentBrand,
      recentCreator
    ] = await Promise.all([
      countRows('leads'),
      countRows('creator_leads'),
      countRows('leads', { filters: [{ column: 'status', op: 'eq', value: 'new' }] }),
      countRows('leads', { filters: [{ column: 'status', op: 'eq', value: 'converted' }] }),
      countRows('leads', { filters: [{ column: 'created_at', op: 'gte', value: todayKey }] }),
      countRows('creator_leads', { filters: [{ column: 'created_at', op: 'gte', value: todayKey }] }),
      adapter.select('leads', { columns: 'created_at', filters: [{ column: 'created_at', op: 'gte', value: firstChartDay }] }),
      adapter.select('creator_leads', { columns: 'created_at', filters: [{ column: 'created_at', op: 'gte', value: firstChartDay }] })
    ]);

    const chartCounts = new Map();
    [...recentBrand.data, ...recentCreator.data].forEach((row) => {
      const key = dateKey(row.created_at);
      if (key) chartCounts.set(key, (chartCounts.get(key) || 0) + 1);
    });

    return {
      total: brandTotal + creatorTotal,
      today: brandToday + creatorToday,
      newLeads,
      converted,
      brandTotal,
      creatorTotal,
      chart: Array.from(chartCounts.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([day, count]) => ({ day, count }))
    };
  },

  async listVideos() {
    await ensureReady();
    return selectRowsWithFallback(
      'ugc_videos',
      { order: [{ column: 'id', ascending: false }] },
      fallbackContent.videos,
      'UGC videos'
    );
  },

  async createVideo(payload) {
    await ensureReady();
    const row = await adapter.insert('ugc_videos', payload);
    return row.id;
  },

  async updateVideo(id, payload) {
    await ensureReady();
    await adapter.updateById('ugc_videos', id, payload);
  },

  async deleteVideo(id) {
    await ensureReady();
    await adapter.deleteById('ugc_videos', id);
  },

  async listCreators() {
    await ensureReady();
    return selectRowsWithFallback(
      'creators',
      { order: [{ column: 'id', ascending: false }] },
      fallbackContent.creators,
      'creators'
    );
  },

  async createCreator(payload) {
    await ensureReady();
    const row = await adapter.insert('creators', payload);
    return row.id;
  },

  async updateCreator(id, payload) {
    await ensureReady();
    await adapter.updateById('creators', id, payload);
  },

  async deleteCreator(id) {
    await ensureReady();
    await adapter.deleteById('creators', id);
  },

  async listCategories() {
    await ensureReady();
    return (await adapter.select('creator_categories', { order: [{ column: 'id', ascending: true }] })).data;
  },

  async createCategory(name) {
    await ensureReady();
    const row = await adapter.insert('creator_categories', { name });
    return row.id;
  },

  async deleteCategory(id) {
    await ensureReady();
    await adapter.deleteById('creator_categories', id);
  },

  async listPlatforms() {
    await ensureReady();
    return (await adapter.select('creator_platforms', { order: [{ column: 'id', ascending: true }] })).data;
  },

  async createPlatform(name) {
    await ensureReady();
    const row = await adapter.insert('creator_platforms', { name });
    return row.id;
  },

  async deletePlatform(id) {
    await ensureReady();
    await adapter.deleteById('creator_platforms', id);
  },

  async listBlogs() {
    await ensureReady();
    return selectRowsWithFallback(
      'blogs',
      { order: [{ column: 'order_idx', ascending: true }] },
      fallbackContent.blogs,
      'blogs'
    );
  },

  async getBlogById(id) {
    await ensureReady();
    return singleWithFallback(
      'blogs',
      { filters: [{ column: 'id', op: 'eq', value: id }] },
      fallbackContent.blogs,
      (blog) => String(blog.id) === String(id),
      'blog'
    );
  },

  async createBlog(payload) {
    await ensureReady();
    const row = await createOrdered('blogs', payload);
    return row.id;
  },

  async updateBlog(id, payload) {
    await ensureReady();
    return updateOrdered('blogs', id, payload);
  },

  async deleteBlog(id) {
    await ensureReady();
    await deleteOrdered('blogs', id);
  },

  async listCaseStudies() {
    await ensureReady();
    return selectRowsWithFallback(
      'case_studies',
      { order: [{ column: 'order_idx', ascending: true }] },
      fallbackContent.caseStudies,
      'case studies'
    );
  },

  async getCaseStudyById(id) {
    await ensureReady();
    return singleWithFallback(
      'case_studies',
      { filters: [{ column: 'id', op: 'eq', value: id }] },
      fallbackContent.caseStudies,
      (caseStudy) => String(caseStudy.id) === String(id),
      'case study'
    );
  },

  async createCaseStudy(payload) {
    await ensureReady();
    const row = await createOrdered('case_studies', payload);
    return row.id;
  },

  async updateCaseStudy(id, payload) {
    await ensureReady();
    return updateOrdered('case_studies', id, payload);
  },

  async deleteCaseStudy(id) {
    await ensureReady();
    await deleteOrdered('case_studies', id);
  },

  async listPublicServices() {
    await ensureReady();
    return selectRowsWithFallback(
      'service_pages',
      {
        columns: 'id, slug, title, icon, hero_title, hero_subheading, cta, sort_order',
        filters: [{ column: 'is_active', op: 'eq', value: 1 }],
        order: [{ column: 'sort_order', ascending: true }, { column: 'id', ascending: true }]
      },
      fallbackServiceRows().map(({ id, slug, title, icon, hero_title, hero_subheading, cta, sort_order }) => ({
        id, slug, title, icon, hero_title, hero_subheading, cta, sort_order
      })),
      'public services'
    );
  },

  async getPublicServiceBySlug(slug) {
    await ensureReady();
    return singleWithFallback(
      'service_pages',
      {
        filters: [
          { column: 'slug', op: 'eq', value: slug },
          { column: 'is_active', op: 'eq', value: 1 }
        ]
      },
      fallbackServiceRows(),
      (service) => service.slug === slug,
      'public service'
    );
  },

  async listAdminServices() {
    await ensureReady();
    return (await adapter.select('service_pages', {
      order: [{ column: 'sort_order', ascending: true }, { column: 'id', ascending: true }]
    })).data;
  },

  async updateService(id, payload) {
    await ensureReady();
    return adapter.updateById('service_pages', id, { ...payload, is_customized: 1 });
  }
};
