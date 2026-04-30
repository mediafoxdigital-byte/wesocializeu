const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const crypto = require('crypto');

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;

let supabase = null;

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
} else {
  console.warn('[SUPABASE] Missing environment variables for storage. Uploads will fail.');
}

async function uploadToSupabaseStorage(buffer, mimetype, originalName) {
  if (!supabase) throw new Error('Supabase client not configured');

  // We are going to use the 'uploads' bucket by default.
  const bucketName = 'uploads';
  const ext = originalName ? (originalName.match(/\.[^.]+$/) || [''])[0].toLowerCase() : '';
  const fileName = `${Date.now()}-${crypto.randomUUID()}${ext || (mimetype.startsWith('video/') ? '.mp4' : '.jpg')}`;

  const { data, error } = await supabase.storage
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

  const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(fileName);
  return publicUrlData.publicUrl;
}

module.exports = {
  supabase,
  uploadToSupabaseStorage
};
