/**
 * Share Token API
 * Stores and retrieves share tokens for the viral sharing loop
 *
 * POST /api/share - Create a new share token
 * GET /api/share?token=xxx - Retrieve share data by token
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ntmsclblmncklbxlttlw.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50bXNjbGJsbW5ja2xieGx0dGx3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3MDUyNzUsImV4cCI6MjEwMzI4MTI3NX0.BVm-mcQsxJQAKHBgLEhnNRTL0Yazrys9uXaSifFucQU';

async function supabaseRequest(endpoint, options = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
    method: options.method || 'GET',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': options.prefer || 'return=representation'
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Supabase error: ${response.status} - ${error}`);
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

// Generate secure random token
function generateToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 22; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // GET - Retrieve share data by token
    if (req.method === 'GET') {
      const { token } = req.query;

      if (!token || token.length < 10) {
        return res.status(400).json({ error: 'Invalid token' });
      }

      // Query Supabase for the share
      const data = await supabaseRequest(`future_type_shares?share_token=eq.${encodeURIComponent(token)}&is_active=eq.true&select=share_token,future_type,type_emoji,type_code,type_description,top_traits,show_first_name,first_name,generation,created_at`);

      if (!data || data.length === 0) {
        return res.status(404).json({ error: 'Share not found or expired' });
      }

      const share = data[0];

      // Increment open count (fire and forget)
      supabaseRequest(`future_type_shares?share_token=eq.${encodeURIComponent(token)}`, {
        method: 'PATCH',
        body: { open_count: share.open_count + 1 }
      }).catch(() => {});

      // Return only public-safe data
      return res.status(200).json({
        futureType: share.future_type,
        typeEmoji: share.type_emoji,
        typeCode: share.type_code,
        typeDescription: share.type_description,
        topTraits: share.top_traits,
        firstName: share.show_first_name ? share.first_name : null,
        generation: share.generation,
        isValid: true
      });
    }

    // POST - Create a new share token
    if (req.method === 'POST') {
      const body = req.body || {};

      // Validate required fields
      if (!body.futureType || !body.topTraits) {
        return res.status(400).json({ error: 'Missing required fields: futureType, topTraits' });
      }

      const token = generateToken();

      const shareData = {
        share_token: token,
        future_type: body.futureType,
        type_emoji: body.typeEmoji || '🧭',
        type_code: body.typeCode || '',
        type_description: body.typeDescription || '',
        top_traits: body.topTraits,
        show_first_name: body.showFirstName || false,
        first_name: body.showFirstName ? (body.firstName || null) : null,
        generation: body.generation || 0,
        parent_share_token: body.parentShareToken || null,
        is_active: true,
        share_count: 0,
        open_count: 0,
        test_start_count: 0,
        test_complete_count: 0
      };

      // If creator is authenticated, link to their user ID
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        // Could extract user ID from JWT and add creator_user_id
        // For now, shares are anonymous
      }

      const result = await supabaseRequest('future_type_shares', {
        method: 'POST',
        body: shareData
      });

      if (result && result[0]) {
        return res.status(201).json({
          token: result[0].share_token,
          shareUrl: `${req.headers.origin || 'https://jasmine-scholarship-hub.vercel.app'}/t/${result[0].share_token}`,
          createdAt: result[0].created_at
        });
      }

      return res.status(500).json({ error: 'Failed to create share' });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Share API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
