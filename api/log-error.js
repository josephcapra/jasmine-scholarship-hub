/**
 * Error Logging Endpoint
 * Receives client-side errors for server-side logging
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://jasmine-scholarship-hub.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { message, stack, context, url, userAgent, timestamp } = req.body;

    // Log to Vercel's built-in logging (appears in dashboard)
    console.error(JSON.stringify({
      level: 'error',
      message,
      stack,
      context,
      clientUrl: url,
      userAgent,
      timestamp,
      serverTime: new Date().toISOString()
    }));

    return res.status(200).json({ logged: true });

  } catch (error) {
    console.error('Error logging failed:', error);
    return res.status(500).json({ error: 'Logging failed' });
  }
}
