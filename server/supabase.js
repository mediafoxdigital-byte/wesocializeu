const dotenv = require('dotenv');
const path = require('path');
const crypto = require('crypto');

dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config();

function cleanEnv(value) {
  const text = String(value || '').trim().replace(/^['"]|['"]$/g, '');
  return text && !/^your_|^replace_/i.test(text) ? text : '';
}

const supabaseUrl = cleanEnv(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL);
const supabaseKey = cleanEnv(
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY
);

let supabase = null;
let supabaseInitError = null;

function getSupabaseClient() {
  if (supabase) return supabase;
  if (supabaseInitError) return null;

  if (!supabaseUrl || !supabaseKey) {
    supabaseInitError = new Error('Missing SUPABASE_URL or Supabase API key for storage uploads.');
    console.warn('[SUPABASE] Missing environment variables for storage. Uploads will fail.');
    return null;
  }

  try {
    const { createClient } = require('@supabase/supabase-js');
    supabase = createClient(supabaseUrl, supabaseKey);
    return supabase;
  } catch (err) {
    supabaseInitError = err;
    console.warn('[SUPABASE] Storage client unavailable:', err.message);
    return null;
  }
}

async function ensureBucketExists(bucketName) {
  const client = getSupabaseClient();
  if (!client) throw supabaseInitError || new Error('Supabase client not configured');

  const { data: buckets, error } = await client.storage.listBuckets();
  if (error) {
    console.error('Error listing storage buckets:', error);
    return;
  }
  
  if (!buckets.find(b => b.name === bucketName)) {
    const { error: createError } = await client.storage.createBucket(bucketName, { public: true });
    if (createError) {
      console.error('Error creating storage bucket:', createError);
      throw createError;
    }
  } else {
    // Force bucket to be public if it already exists
    const { error: updateError } = await client.storage.updateBucket(bucketName, { public: true });
    if (updateError) {
      console.error('Error updating storage bucket:', updateError);
    }
  }
}

async function uploadToSupabaseStorage(buffer, mimetype, originalName) {
  if (!supabaseUrl || !supabaseKey) {
    throw supabaseInitError || new Error('Missing SUPABASE_URL or Supabase API key for storage uploads.');
  }

  const bucketName = 'uploads';
  const fileName = createStorageFileName(mimetype, originalName);

  try {
    return await uploadDirectlyToStorage(bucketName, fileName, buffer, mimetype);
  } catch (directError) {
    if (!/bucket/i.test(String(directError.message || ''))) {
      throw directError;
    }

    await ensureBucketExists(bucketName);
    return uploadDirectlyToStorage(bucketName, fileName, buffer, mimetype);
  }
}

async function uploadDirectlyToStorage(bucketName, fileName, buffer, mimetype) {
  const uploadUrl = `${supabaseUrl.replace(/\/+$/, '')}/storage/v1/object/${encodeURIComponent(bucketName)}/${encodeURIComponent(fileName)}`;
  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': mimetype,
      'Cache-Control': '3600',
      'x-upsert': 'false'
    },
    body: buffer
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    const message = parseStorageErrorMessage(errorBody) || `${response.status} ${response.statusText}`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return `${supabaseUrl.replace(/\/+$/, '')}/storage/v1/object/public/${encodeURIComponent(bucketName)}/${encodeURIComponent(fileName)}`;
}

function parseStorageErrorMessage(errorBody) {
  if (!errorBody) return '';
  try {
    const parsed = JSON.parse(errorBody);
    return parsed.message || parsed.error || parsed.msg || '';
  } catch {
    return String(errorBody || '').slice(0, 200);
  }
}

function createStorageFileName(mimetype, originalName) {
  const ext = originalName ? (originalName.match(/\.[^.]+$/) || [''])[0].toLowerCase() : '';
  return `${Date.now()}-${crypto.randomUUID()}${ext || (mimetype.startsWith('video/') ? '.mp4' : '.jpg')}`;
}

module.exports = {
  get supabase() {
    return getSupabaseClient();
  },
  uploadToSupabaseStorage
};
