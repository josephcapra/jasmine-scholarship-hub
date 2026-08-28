// Vercel Serverless Function: Supabase storage for Jasmine's documents
// POST /api/jasmine/storage - upload file
// GET /api/jasmine/storage?action=list - list files
// GET /api/jasmine/storage?action=get&path=... - get file URL
// DELETE /api/jasmine/storage?path=... - delete file

import { createClient } from '@supabase/supabase-js';

const SUPA_URL = 'https://xjorndkpofhyhihgaesu.supabase.co';
const SUPA_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const BUCKET_NAME = 'jasmine-docs';
const MAX_SIZE_MB = 10; // Max 10MB per file
const TOTAL_QUOTA_MB = 1024; // 1GB total

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req, res) {
  const ALLOWED_ORIGIN = process.env.NODE_ENV === 'production' ? 'https://jasmine-scholarship-hub.vercel.app' : '*';
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!SUPA_SERVICE_KEY) {
    return res.status(500).json({ error: 'Storage not configured' });
  }

  const supabase = createClient(SUPA_URL, SUPA_SERVICE_KEY);

  try {
    const { action, path, folder } = req.query;

    if (req.method === 'GET') {
      if (action === 'list') {
        // List files in a folder
        const targetFolder = folder || '';
        const { data, error } = await supabase.storage
          .from(BUCKET_NAME)
          .list(targetFolder, { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });

        if (error) throw error;

        // Get signed URLs for each file
        const filesWithUrls = await Promise.all(
          (data || []).filter(f => f.name).map(async (file) => {
            const filePath = targetFolder ? `${targetFolder}/${file.name}` : file.name;
            const { data: urlData } = await supabase.storage
              .from(BUCKET_NAME)
              .createSignedUrl(filePath, 3600); // 1 hour

            return {
              name: file.name,
              path: filePath,
              size: file.metadata?.size || 0,
              type: file.metadata?.mimetype || 'application/octet-stream',
              created: file.created_at,
              url: urlData?.signedUrl
            };
          })
        );

        return res.status(200).json({ success: true, files: filesWithUrls });

      } else if (action === 'get' && path) {
        // Get signed URL for a file
        const { data, error } = await supabase.storage
          .from(BUCKET_NAME)
          .createSignedUrl(path, 3600);

        if (error) throw error;
        return res.status(200).json({ success: true, url: data.signedUrl });

      } else if (action === 'quota') {
        // Check storage quota
        const { data, error } = await supabase.storage.from(BUCKET_NAME).list('', { limit: 1000 });
        if (error) throw error;

        let totalBytes = 0;
        for (const file of data || []) {
          if (file.metadata?.size) totalBytes += file.metadata.size;
        }

        return res.status(200).json({
          success: true,
          usedMB: Math.round(totalBytes / 1024 / 1024 * 100) / 100,
          quotaMB: TOTAL_QUOTA_MB,
          percentUsed: Math.round(totalBytes / (TOTAL_QUOTA_MB * 1024 * 1024) * 100)
        });
      }

      return res.status(400).json({ error: 'Invalid action' });

    } else if (req.method === 'POST') {
      // Upload file
      let body = req.body;
      if (typeof body === 'string') body = JSON.parse(body);

      const { fileName, fileData, fileType, folder: uploadFolder } = body;

      if (!fileName || !fileData) {
        return res.status(400).json({ error: 'fileName and fileData required' });
      }

      // Decode base64
      const buffer = Buffer.from(fileData, 'base64');
      const sizeMB = buffer.length / 1024 / 1024;

      if (sizeMB > MAX_SIZE_MB) {
        return res.status(400).json({ error: `File too large. Max ${MAX_SIZE_MB}MB` });
      }

      // Create path
      const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = uploadFolder ? `${uploadFolder}/${safeName}` : safeName;

      // Upload
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, buffer, {
          contentType: fileType || 'application/octet-stream',
          upsert: true
        });

      if (error) throw error;

      // Get signed URL
      const { data: urlData } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(filePath, 3600);

      return res.status(200).json({
        success: true,
        path: filePath,
        url: urlData?.signedUrl,
        sizeMB: Math.round(sizeMB * 100) / 100
      });

    } else if (req.method === 'DELETE') {
      if (!path) {
        return res.status(400).json({ error: 'path required' });
      }

      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([path]);

      if (error) throw error;
      return res.status(200).json({ success: true, deleted: path });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Storage error:', error);
    return res.status(500).json({ error: 'Storage operation failed', details: error.message });
  }
}
