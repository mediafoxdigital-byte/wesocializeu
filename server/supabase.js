const dotenv = require('dotenv');
const path = require('path');
const crypto = require('crypto');

dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config();

function cleanEnv(value) {
  const text = String(value || '').trim();
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
  const client = getSupabaseClient();
  if (!client) throw supabaseInitError || new Error('Supabase client not configured');

  const bucketName = 'uploads';
  await ensureBucketExists(bucketName);

  const fileName = createStorageFileName(mimetype, originalName);

  const { data, error } = await client.storage
    .from(bucketName)
    .upload(fileName, buffer, {
      contentType: mimetype,
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    console.error('Supabase upload error:', error);
    throw error;
  }

  const { data: publicUrlData } = client.storage.from(bucketName).getPublicUrl(fileName);
  return publicUrlData.publicUrl;
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
