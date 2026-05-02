const dotenv = require('dotenv');
const crypto = require('crypto');

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;

let supabase = null;
let supabaseInitError = null;

function getSupabaseClient() {
  if (supabase) return supabase;
  if (supabaseInitError) return null;

  if (!supabaseUrl || !supabaseKey) {
    supabaseInitError = new Error('Missing environment variables for Supabase storage.');
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
    console.error('Error listing buckets:', error);
    return;
  }
  
  if (!buckets.find(b => b.name === bucketName)) {
    const { error: createError } = await client.storage.createBucket(bucketName, { public: true });
    if (createError) {
      console.error('Error creating bucket:', createError);
    }
  } else {
    // Force bucket to be public if it already exists
    await client.storage.updateBucket(bucketName, { public: true });
  }
}

async function uploadToSupabaseStorage(buffer, mimetype, originalName) {
  const client = getSupabaseClient();
  if (!client) throw supabaseInitError || new Error('Supabase client not configured');

  const bucketName = 'uploads';
  await ensureBucketExists(bucketName);

  const ext = originalName ? (originalName.match(/\.[^.]+$/) || [''])[0].toLowerCase() : '';
  const fileName = `${Date.now()}-${crypto.randomUUID()}${ext || (mimetype.startsWith('video/') ? '.mp4' : '.jpg')}`;

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

module.exports = {
  get supabase() {
    return getSupabaseClient();
  },
  uploadToSupabaseStorage
};
